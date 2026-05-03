import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle2, XCircle, Loader2, CreditCard, TrendingUp, Ticket, ShoppingBag } from "lucide-react";
import { useNumberVisibility } from "@/contexts/NumberVisibilityContext";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WalletManagementProps {
  establishmentId: string | null;
}

interface SaleTransaction {
  id: string;
  type: 'ticket' | 'order';
  amount: number;
  description: string;
  payment_method: string | null;
  created_at: string;
  available_at: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
}

export const WalletManagement = ({ establishmentId }: WalletManagementProps) => {
  const { toast } = useToast();
  const { mask } = useNumberVisibility();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [document, setDocument] = useState("");
  const [bankName, setBankName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Wallet stats
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);

  useEffect(() => {
    if (establishmentId) {
      loadWalletData();
      
      // Subscribe to real-time changes
      const withdrawalsChannel = supabase
        .channel('wallet-withdrawals')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'withdrawal_requests',
            filter: `establishment_id=eq.${establishmentId}`
          },
          () => {
            loadWalletData();
          }
        )
        .subscribe();

      const ordersChannel = supabase
        .channel('wallet-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `establishment_id=eq.${establishmentId}`
          },
          () => {
            loadWalletData();
          }
        )
        .subscribe();

      const ticketsChannel = supabase
        .channel('wallet-tickets')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ticket_sales',
            filter: `establishment_id=eq.${establishmentId}`
          },
          () => {
            loadWalletData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(withdrawalsChannel);
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(ticketsChannel);
      };
    }
  }, [establishmentId]);

  const loadWalletData = async () => {
    if (!establishmentId) return;
    
    setLoading(true);
    try {
      const now = new Date();

      // Load completed orders (only delivered - online sales only)
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, total, payment_method, created_at, user_id, status")
        .eq("establishment_id", establishmentId)
        .not("user_id", "is", null) // Only online orders have user_id
        .eq("status", "delivered"); // Only count delivered orders

      // Load ticket sales - use subtotal (net amount without Moonky fee)
      const { data: ticketSalesData } = await supabase
        .from("ticket_sales")
        .select("id, subtotal, created_at, payment_status")
        .eq("establishment_id", establishmentId)
        .eq("payment_status", "completed");

      // Load withdrawals
      const { data: withdrawalsData } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("requested_at", { ascending: false });

      // Process transactions from orders and ticket sales
      const allTransactions: SaleTransaction[] = [];

      // Add orders as transactions
      if (ordersData) {
        ordersData.forEach(order => {
          const isCreditCard = order.payment_method?.toLowerCase().includes('cartão') || 
                              order.payment_method?.toLowerCase().includes('credito') ||
                              order.payment_method?.toLowerCase().includes('crédito');
          const createdAt = new Date(order.created_at);
          const availableAt = isCreditCard ? addDays(createdAt, 14) : createdAt;

          allTransactions.push({
            id: order.id,
            type: 'order',
            amount: Number(order.total),
            description: `Pedido #${order.id.slice(0, 8)}`,
            payment_method: order.payment_method,
            created_at: order.created_at,
            available_at: availableAt.toISOString()
          });
        });
      }

      // Add ticket sales as transactions (using subtotal - net amount without fee)
      if (ticketSalesData) {
        ticketSalesData.forEach(sale => {
          // Ticket sales are always PIX/immediate for now
          // Use subtotal which is the net amount the establishment receives
          allTransactions.push({
            id: sale.id,
            type: 'ticket',
            amount: Number(sale.subtotal) || 0,
            description: `Venda de ingresso #${sale.id.slice(0, 8)}`,
            payment_method: 'PIX',
            created_at: sale.created_at!,
            available_at: sale.created_at!
          });
        });
      }

      // Sort by date
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);

      // Calculate balances
      let available = 0;
      let pending = 0;

      allTransactions.forEach(t => {
        if (new Date(t.available_at) <= now) {
          available += t.amount;
        } else {
          pending += t.amount;
        }
      });

      // Subtract completed and pending withdrawals from available
      const completedWithdrawals = withdrawalsData
        ?.filter(w => w.status === 'completed')
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      
      const pendingWithdrawals = withdrawalsData
        ?.filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      setAvailableBalance(available - completedWithdrawals - pendingWithdrawals);
      setPendingBalance(pending);
      setTotalWithdrawn(completedWithdrawals);

      if (withdrawalsData) {
        setWithdrawals(withdrawalsData);
      }
    } catch (error) {
      console.error("Error loading wallet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount.replace(",", "."));
    
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Erro", description: "Valor inválido", variant: "destructive" });
      return;
    }

    if (amount > availableBalance) {
      toast({ title: "Erro", description: "Saldo insuficiente", variant: "destructive" });
      return;
    }

    if (!recipientName.trim()) {
      toast({ title: "Erro", description: "Nome do beneficiário é obrigatório", variant: "destructive" });
      return;
    }

    if (!pixKey.trim()) {
      toast({ title: "Erro", description: "Chave PIX é obrigatória", variant: "destructive" });
      return;
    }

    if (!document.trim()) {
      toast({ title: "Erro", description: "CPF/CNPJ é obrigatório", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          establishment_id: establishmentId,
          amount,
          status: "pending",
          recipient_name: recipientName.trim(),
          pix_key: pixKey.trim(),
          pix_key_type: pixKeyType,
          document: document.trim(),
          bank_name: bankName.trim() || null
        });

      if (error) throw error;

      toast({ 
        title: "Saque solicitado!", 
        description: "Seu saque será processado em até 2 horas." 
      });
      
      setIsWithdrawDialogOpen(false);
      setWithdrawAmount("");
      setRecipientName("");
      setPixKey("");
      setPixKeyType("cpf");
      setDocument("");
      setBankName("");
      // Real-time will update the data
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'ticket':
        return <Ticket className="w-4 h-4 text-purple-500" />;
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
      default:
        return <Wallet className="w-4 h-4 text-primary" />;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'Não informado';
    if (method.toLowerCase().includes('pix')) return 'PIX';
    if (method.toLowerCase().includes('cartão') || method.toLowerCase().includes('credito') || method.toLowerCase().includes('crédito')) return 'Cartão';
    if (method.toLowerCase().includes('dinheiro')) return 'Dinheiro';
    return method;
  };

  const fmtCurrency = (value: number, prefix = '') => {
    const formatted = `${prefix}R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    return mask(formatted);
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
      {/* Balance Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="admin-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs md:text-sm text-muted-foreground font-medium">Saldo Disponível</span>
            <div className="admin-icon">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            {fmtCurrency(availableBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Disponível para saque</p>
        </Card>

        <Card className="admin-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs md:text-sm text-muted-foreground font-medium">A Receber (D+14)</span>
            <div className="admin-icon">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-amber-600">
            {fmtCurrency(pendingBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Vendas em cartão de crédito</p>
        </Card>

        <Card className="admin-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs md:text-sm text-muted-foreground font-medium">Total Sacado</span>
            <div className="admin-icon">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            {fmtCurrency(totalWithdrawn)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total já transferido</p>
        </Card>

        <Card className="admin-card p-4 md:p-5 flex flex-col justify-center">
          <Button 
            onClick={() => setIsWithdrawDialogOpen(true)}
            disabled={availableBalance <= 0}
            className="w-full"
          >
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Solicitar Saque
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">Cai em até 2 horas</p>
        </Card>
      </div>

      {/* Withdrawal History */}
      <Card className="admin-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Histórico de Saques</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {withdrawals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum saque realizado</p>
            ) : (
              withdrawals.map((w) => (
                <div key={w.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {fmtCurrency(Number(w.amount))}
                    </span>
                    {getStatusBadge(w.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Solicitado em {format(new Date(w.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {w.notes && (
                    <p className="text-xs text-muted-foreground">{w.notes}</p>
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
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead>Processado em</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum saque realizado
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-semibold">
                        {fmtCurrency(Number(w.amount))}
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
                      <TableCell className="text-muted-foreground">{w.notes || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Transactions History */}
      <Card className="admin-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Extrato de Vendas Online</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma venda online registrada</p>
            ) : (
              transactions.slice(0, 20).map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  {getTransactionIcon(t.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR })} • {getPaymentMethodLabel(t.payment_method)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">
                      + {fmtCurrency(t.amount)}
                    </p>
                    {new Date(t.available_at) > new Date() && (
                      <p className="text-xs text-amber-600">
                        Disponível {format(new Date(t.available_at), "dd/MM", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Disponível em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma venda online registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.slice(0, 50).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(t.type)}
                          <span>{t.type === 'ticket' ? 'Ingresso' : 'Produto'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getPaymentMethodLabel(t.payment_method)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-600">
                        + {fmtCurrency(t.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(t.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {new Date(t.available_at) > new Date() ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            {format(new Date(t.available_at), "dd/MM/yyyy", { locale: ptBR })}
                          </Badge>
                        ) : (
                          <span className="text-emerald-600 text-sm">Disponível</span>
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

      {/* Withdrawal Dialog */}
      <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Saque</DialogTitle>
            <DialogDescription>
              O saque será processado em até 2 horas após a solicitação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Saldo disponível</p>
              <p className="text-2xl font-bold text-foreground">
                {fmtCurrency(availableBalance)}
              </p>
            </div>

            <div>
              <Label htmlFor="recipient_name">Nome do beneficiário *</Label>
              <Input
                id="recipient_name"
                type="text"
                placeholder="Nome completo ou razão social"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="document">CPF/CNPJ *</Label>
              <Input
                id="document"
                type="text"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Label htmlFor="pix_key_type">Tipo de chave</Label>
                <Select value={pixKeyType} onValueChange={setPixKeyType}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="random">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="pix_key">Chave PIX *</Label>
                <Input
                  id="pix_key"
                  type="text"
                  placeholder="Sua chave PIX"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bank_name">Banco (opcional)</Label>
              <Input
                id="bank_name"
                type="text"
                placeholder="Ex: Nubank, Itaú, Bradesco..."
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="amount">Valor do saque *</Label>
              <Input
                id="amount"
                type="text"
                placeholder="0,00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsWithdrawDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRequestWithdrawal} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Saque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
