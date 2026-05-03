import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Clock, CheckCircle2, XCircle, Loader2, Building2, Bell } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WithdrawalRequest {
  id: string;
  establishment_id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
  recipient_name: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  document: string | null;
  bank_name: string | null;
  establishment?: {
    name: string;
    slug: string;
  };
}

export const WithdrawalManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'completed' | 'cancelled'>('completed');
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newRequestsCount, setNewRequestsCount] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    pendingAmount: 0,
    completed: 0,
    completedAmount: 0
  });

  useEffect(() => {
    loadWithdrawals();

    // Subscribe to real-time changes for withdrawals
    const channel = supabase
      .channel('master-withdrawals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawal_requests'
        },
        (payload) => {
          console.log('Withdrawal update:', payload);
          
          // If it's a new pending request, show notification
          if (payload.eventType === 'INSERT' && (payload.new as any).status === 'pending') {
            setNewRequestsCount(prev => prev + 1);
            toast({
              title: "Novo saque solicitado!",
              description: `R$ ${Number((payload.new as any).amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            });
          }
          
          loadWithdrawals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*, establishment:establishments(name, slug)")
        .order("requested_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setWithdrawals(data);

        // Calculate stats
        const pending = data.filter(w => w.status === 'pending');
        const completed = data.filter(w => w.status === 'completed');

        setStats({
          pending: pending.length,
          pendingAmount: pending.reduce((sum, w) => sum + Number(w.amount), 0),
          completed: completed.length,
          completedAmount: completed.reduce((sum, w) => sum + Number(w.amount), 0)
        });
      }
    } catch (error) {
      console.error("Error loading withdrawals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedWithdrawal) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: actionType,
          processed_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq("id", selectedWithdrawal.id);

      if (error) throw error;

      toast({ 
        title: actionType === 'completed' ? "Saque confirmado!" : "Saque cancelado",
        description: `Saque de R$ ${Number(selectedWithdrawal.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi ${actionType === 'completed' ? 'confirmado' : 'cancelado'}.`
      });

      setIsActionDialogOpen(false);
      setSelectedWithdrawal(null);
      setNotes("");
      setNewRequestsCount(0);
      // Real-time will update the data
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openActionDialog = (withdrawal: WithdrawalRequest, action: 'completed' | 'cancelled') => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setNotes("");
    setIsActionDialogOpen(true);
  };

  const openDetailDialog = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setIsDetailDialogOpen(true);
  };

  const getPixKeyTypeLabel = (type: string | null) => {
    switch (type) {
      case 'cpf': return 'CPF';
      case 'cnpj': return 'CNPJ';
      case 'email': return 'E-mail';
      case 'phone': return 'Telefone';
      case 'random': return 'Chave Aleatória';
      default: return type || '-';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Concluído</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="admin-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs md:text-sm text-muted-foreground font-medium">Saques Pendentes</span>
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center relative">
              <Clock className="h-4 w-4 text-amber-500" />
              {newRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {newRequestsCount}
                </span>
              )}
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-muted-foreground mt-1">
            R$ {stats.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="admin-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs md:text-sm text-muted-foreground font-medium">Saques Realizados</span>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-emerald-600">{stats.completed}</p>
          <p className="text-xs text-muted-foreground mt-1">
            R$ {stats.completedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {/* Pending Withdrawals Alert */}
      {stats.pending > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {stats.pending} saque{stats.pending > 1 ? 's' : ''} aguardando processamento
                </p>
                <p className="text-sm text-muted-foreground">
                  Total de R$ {stats.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawals List */}
      <Card className="admin-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Solicitações de Saque</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {withdrawals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma solicitação de saque</p>
            ) : (
              withdrawals.map((w) => (
                <div 
                  key={w.id} 
                  className="p-4 rounded-lg bg-muted/30 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => openDetailDialog(w)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{w.establishment?.name || "Estabelecimento"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(w.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">
                      R$ {Number(w.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {getStatusBadge(w.status)}
                  </div>
                  {w.status === 'pending' && (
                    <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        size="sm" 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => openActionDialog(w, 'completed')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Confirmar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-600 hover:bg-red-50"
                        onClick={() => openActionDialog(w, 'cancelled')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estabelecimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead>Processado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma solicitação de saque
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((w) => (
                    <TableRow 
                      key={w.id} 
                      className={`cursor-pointer hover:bg-muted/50 ${w.status === 'pending' ? 'bg-amber-500/5' : ''}`}
                      onClick={() => openDetailDialog(w)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium">{w.establishment?.name || "Estabelecimento"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        R$ {Number(w.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{getStatusBadge(w.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(w.requested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {w.processed_at 
                          ? format(new Date(w.processed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {w.status === 'pending' ? (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => openActionDialog(w, 'completed')}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-red-500/30 text-red-600 hover:bg-red-50"
                              onClick={() => openActionDialog(w, 'cancelled')}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">{w.notes || "-"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'completed' ? 'Confirmar Saque' : 'Cancelar Saque'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'completed' 
                ? 'Confirme que a transferência foi realizada com sucesso.'
                : 'Informe o motivo do cancelamento do saque.'
              }
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Estabelecimento</p>
                <p className="font-medium">{selectedWithdrawal.establishment?.name}</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  R$ {Number(selectedWithdrawal.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder={actionType === 'completed' 
                    ? "Ex: Transferência realizada via PIX"
                    : "Ex: Dados bancários incorretos"
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              Voltar
            </Button>
            <Button 
              onClick={handleAction} 
              disabled={submitting}
              className={actionType === 'completed' 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {actionType === 'completed' ? 'Confirmar' : 'Cancelar Saque'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Saque</DialogTitle>
            <DialogDescription>
              Informações completas para realizar a transferência.
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4 py-4">
              {/* Amount */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">Valor do saque</p>
                <p className="text-3xl font-bold text-primary">
                  R$ {Number(selectedWithdrawal.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Establishment */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Estabelecimento</p>
                <p className="font-semibold text-lg">{selectedWithdrawal.establishment?.name || "-"}</p>
              </div>

              {/* PIX Details */}
              <div className="grid gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Beneficiário</p>
                  <p className="font-medium text-foreground">{selectedWithdrawal.recipient_name || "Não informado"}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CPF/CNPJ</p>
                  <p className="font-medium text-foreground font-mono">{selectedWithdrawal.document || "Não informado"}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tipo de Chave</p>
                    <p className="font-medium text-foreground">{getPixKeyTypeLabel(selectedWithdrawal.pix_key_type)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Banco</p>
                    <p className="font-medium text-foreground">{selectedWithdrawal.bank_name || "Não informado"}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">Chave PIX</p>
                  <p className="font-semibold text-emerald-700 font-mono text-lg break-all">{selectedWithdrawal.pix_key || "Não informado"}</p>
                </div>
              </div>

              {/* Status and Dates */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getStatusBadge(selectedWithdrawal.status)}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Solicitado em</p>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedWithdrawal.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {selectedWithdrawal.notes && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
                  <p className="text-sm">{selectedWithdrawal.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Fechar
            </Button>
            {selectedWithdrawal?.status === 'pending' && (
              <>
                <Button 
                  variant="outline"
                  className="border-red-500/30 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    openActionDialog(selectedWithdrawal, 'cancelled');
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    openActionDialog(selectedWithdrawal, 'completed');
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Confirmar Saque
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
