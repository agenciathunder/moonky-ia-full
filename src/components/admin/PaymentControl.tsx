import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, CheckCircle2, AlertTriangle, XCircle, Clock, 
  Calendar, Loader2, Check, Ban
} from "lucide-react";
import { format, differenceInDays, addMonths, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Establishment {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  email: string | null;
  status: string | null;
  due_date: string | null;
  plan_id: string | null;
}

interface Plan {
  id: string;
  name: string;
  price: number;
}

interface PaymentControlProps {
  establishments: Establishment[];
  plans: Plan[];
  onRefresh: () => void;
}

type DueDateStatus = 'ok' | 'warning_7' | 'warning_2' | 'expired' | 'no_date';

const PaymentControl = ({ establishments, plans, onRefresh }: PaymentControlProps) => {
  const { toast } = useToast();
  const [selectedEst, setSelectedEst] = useState<Establishment | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'expired' | 'warning' | 'ok'>('all');

  const getPlanName = (planId: string | null) => {
    if (!planId) return "Sem plano";
    const plan = plans.find(p => p.id === planId);
    return plan?.name || "Desconhecido";
  };

  const getDueDateStatus = (dueDate: string | null): DueDateStatus => {
    if (!dueDate) return 'no_date';
    
    const due = parseISO(dueDate);
    if (!isValid(due)) return 'no_date';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysUntilDue = differenceInDays(due, today);
    
    if (daysUntilDue < 0) return 'expired';
    if (daysUntilDue <= 2) return 'warning_2';
    if (daysUntilDue <= 7) return 'warning_7';
    return 'ok';
  };

  const getDaysMessage = (dueDate: string | null): string => {
    if (!dueDate) return "Sem vencimento definido";
    
    const due = parseISO(dueDate);
    if (!isValid(due)) return "Data inválida";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysUntilDue = differenceInDays(due, today);
    
    if (daysUntilDue < 0) return `Vencido há ${Math.abs(daysUntilDue)} dia${Math.abs(daysUntilDue) !== 1 ? 's' : ''}`;
    if (daysUntilDue === 0) return "Vence hoje";
    if (daysUntilDue === 1) return "Vence amanhã";
    return `Faltam ${daysUntilDue} dias`;
  };

  const getStatusBadge = (status: DueDateStatus) => {
    switch (status) {
      case 'ok':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Em dia
          </Badge>
        );
      case 'warning_7':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">
            <Clock className="w-3 h-3 mr-1" />
            Atenção
          </Badge>
        );
      case 'warning_2':
        return (
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 font-medium">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Urgente
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-medium">
            <XCircle className="w-3 h-3 mr-1" />
            Vencido
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="font-medium">
            <Calendar className="w-3 h-3 mr-1" />
            Sem data
          </Badge>
        );
    }
  };

  const sortedEstablishments = useMemo(() => {
    const withStatus = establishments.map(est => ({
      ...est,
      dueDateStatus: getDueDateStatus(est.due_date)
    }));

    // Sort by urgency: expired > warning_2 > warning_7 > no_date > ok
    const priorityOrder: Record<DueDateStatus, number> = {
      'expired': 0,
      'warning_2': 1,
      'warning_7': 2,
      'no_date': 3,
      'ok': 4
    };

    return withStatus.sort((a, b) => priorityOrder[a.dueDateStatus] - priorityOrder[b.dueDateStatus]);
  }, [establishments]);

  const filteredEstablishments = useMemo(() => {
    if (filter === 'all') return sortedEstablishments;
    if (filter === 'expired') return sortedEstablishments.filter(e => e.dueDateStatus === 'expired');
    if (filter === 'warning') return sortedEstablishments.filter(e => e.dueDateStatus === 'warning_7' || e.dueDateStatus === 'warning_2');
    if (filter === 'ok') return sortedEstablishments.filter(e => e.dueDateStatus === 'ok');
    return sortedEstablishments;
  }, [sortedEstablishments, filter]);

  const stats = useMemo(() => {
    const expired = sortedEstablishments.filter(e => e.dueDateStatus === 'expired').length;
    const warning = sortedEstablishments.filter(e => e.dueDateStatus === 'warning_7' || e.dueDateStatus === 'warning_2').length;
    const ok = sortedEstablishments.filter(e => e.dueDateStatus === 'ok').length;
    return { expired, warning, ok };
  }, [sortedEstablishments]);

  const openPaymentDialog = (est: Establishment) => {
    setSelectedEst(est);
    // Default to adding 1 month from today or from current due date
    const baseDate = est.due_date ? parseISO(est.due_date) : new Date();
    const newDate = addMonths(isValid(baseDate) ? baseDate : new Date(), 1);
    setNewDueDate(format(newDate, "yyyy-MM-dd"));
    setIsPaymentDialogOpen(true);
  };

  const handleMarkAsPaid = async () => {
    if (!selectedEst || !newDueDate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("establishments")
        .update({ 
          due_date: newDueDate,
          status: 'active',
          is_active: true
        })
        .eq("id", selectedEst.id);

      if (error) throw error;

      toast({ 
        title: "Pagamento registrado", 
        description: `Novo vencimento: ${format(parseISO(newDueDate), "dd/MM/yyyy", { locale: ptBR })}` 
      });
      setIsPaymentDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsUnpaid = async (est: Establishment) => {
    try {
      const { error } = await supabase
        .from("establishments")
        .update({ 
          status: 'suspended',
          is_active: false
        })
        .eq("id", est.id);

      if (error) throw error;

      toast({ 
        title: "Estabelecimento suspenso", 
        description: `${est.name} foi marcado como inadimplente.`,
        variant: "destructive"
      });
      onRefresh();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card 
          className={`bg-card/50 border-border/40 cursor-pointer transition-all hover:border-red-500/50 ${filter === 'expired' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setFilter(filter === 'expired' ? 'all' : 'expired')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Vencidos</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl md:text-3xl font-bold text-red-600">{stats.expired}</div>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-1">Pagamento em atraso</p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-card/50 border-border/40 cursor-pointer transition-all hover:border-amber-500/50 ${filter === 'warning' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">A Vencer</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl md:text-3xl font-bold text-amber-600">{stats.warning}</div>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-1">Próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-card/50 border-border/40 cursor-pointer transition-all hover:border-emerald-500/50 ${filter === 'ok' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setFilter(filter === 'ok' ? 'all' : 'ok')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Em Dia</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl md:text-3xl font-bold text-emerald-600">{stats.ok}</div>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-1">Pagamentos regulares</p>
          </CardContent>
        </Card>
      </div>

      {filter !== 'all' && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Filtro: {filter === 'expired' ? 'Vencidos' : filter === 'warning' ? 'A Vencer' : 'Em Dia'}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setFilter('all')} className="h-6 text-xs">
            Limpar
          </Button>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="bg-card/50 border-border/40 hidden md:block">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Controle de Mensalidades</CardTitle>
          <CardDescription>Gerencie os vencimentos e pagamentos dos estabelecimentos</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estabelecimento</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEstablishments.map((est) => {
                const status = est.dueDateStatus;
                return (
                  <TableRow key={est.id} className={status === 'expired' ? 'bg-red-500/5' : status === 'warning_2' ? 'bg-orange-500/5' : status === 'warning_7' ? 'bg-amber-500/5' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {est.logo_url ? (
                          <img src={est.logo_url} alt={est.name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{est.name}</p>
                          <p className="text-xs text-muted-foreground">{est.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPlanName(est.plan_id)}</Badge>
                    </TableCell>
                    <TableCell>
                      {est.due_date ? format(parseISO(est.due_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(status)}
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${
                        status === 'expired' ? 'text-red-600' : 
                        status === 'warning_2' ? 'text-orange-600' : 
                        status === 'warning_7' ? 'text-amber-600' : 
                        'text-muted-foreground'
                      }`}>
                        {getDaysMessage(est.due_date)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPaymentDialog(est)}
                          className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Pagou
                        </Button>
                        {est.status !== 'suspended' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsUnpaid(est)}
                            className="border-red-500/30 text-red-600 hover:bg-red-500 hover:text-white"
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Suspender
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredEstablishments.map((est) => {
          const status = est.dueDateStatus;
          return (
            <Card key={est.id} className={`bg-card/50 border-border/40 ${
              status === 'expired' ? 'border-red-500/50' : 
              status === 'warning_2' ? 'border-orange-500/50' : 
              status === 'warning_7' ? 'border-amber-500/50' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {est.logo_url ? (
                    <img src={est.logo_url} alt={est.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold truncate">{est.name}</p>
                      {getStatusBadge(status)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{est.email}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">{getPlanName(est.plan_id)}</Badge>
                      {est.due_date && (
                        <span className="text-xs text-muted-foreground">
                          Venc: {format(parseISO(est.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-medium mb-3 ${
                      status === 'expired' ? 'text-red-600' : 
                      status === 'warning_2' ? 'text-orange-600' : 
                      status === 'warning_7' ? 'text-amber-600' : 
                      'text-muted-foreground'
                    }`}>
                      {getDaysMessage(est.due_date)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPaymentDialog(est)}
                        className="flex-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Pagou
                      </Button>
                      {est.status !== 'suspended' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsUnpaid(est)}
                          className="flex-1 border-red-500/30 text-red-600 hover:bg-red-500 hover:text-white"
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Suspender
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Confirme o pagamento e defina a nova data de vencimento para {selectedEst?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-due-date">Nova Data de Vencimento</Label>
              <Input
                id="new-due-date"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Sugestão: {newDueDate && format(parseISO(newDueDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentControl;
