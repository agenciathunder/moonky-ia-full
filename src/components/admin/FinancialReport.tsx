import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TrendingUp, TrendingDown, DollarSign, Plus, Download, CalendarIcon, Loader2, ArrowUpCircle, ArrowDownCircle, Ticket, ShoppingCart, Calculator, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNumberVisibility } from "@/contexts/NumberVisibilityContext";
import "@/styles/admin.css";
interface FinancialReportProps {
  establishmentId: string | null;
}
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  source?: 'order' | 'ticket' | 'pdv' | 'manual';
  notes?: string;
}
interface ExpenseRecord {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
  notes: string | null;
}
interface EntryRecord {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  entry_date: string;
  notes: string | null;
}
export const FinancialReport = ({
  establishmentId
}: FinancialReportProps) => {
  const {
    toast
  } = useToast();
  const { mask } = useNumberVisibility();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [manualEntries, setManualEntries] = useState<EntryRecord[]>([]);

  // Totals
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [profit, setProfit] = useState(0);

  // Dialogs
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryRecord | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);

  // Forms
  const [entryForm, setEntryForm] = useState({
    description: "",
    amount: "",
    category: "",
    notes: "",
    date: new Date()
  });
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "",
    notes: "",
    date: new Date()
  });
  const [savingEntry, setSavingEntry] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  useEffect(() => {
    if (establishmentId) {
      loadFinancialData();
    }
  }, [establishmentId]);
  const loadFinancialData = async () => {
    if (!establishmentId) return;
    setLoading(true);
    try {
      // Fetch orders (delivered)
      const {
        data: ordersData
      } = await supabase.from('orders').select('id, total, created_at, payment_method, status').eq('establishment_id', establishmentId).eq('status', 'delivered');

      // Fetch ticket sales (completed)
      const {
        data: ticketSalesData
      } = await supabase.from('ticket_sales').select('id, subtotal, created_at, payment_status').eq('establishment_id', establishmentId).eq('payment_status', 'completed');

      // Fetch manual entries
      const {
        data: entriesData
      } = await supabase.from('manual_entries').select('*').eq('establishment_id', establishmentId).order('entry_date', {
        ascending: false
      });

      // Fetch expenses
      const {
        data: expensesData
      } = await supabase.from('expenses').select('*').eq('establishment_id', establishmentId).order('expense_date', {
        ascending: false
      });

      // Process transactions
      const allTransactions: Transaction[] = [];

      // Add orders as income
      ordersData?.forEach(order => {
        const isPdv = order.payment_method?.startsWith('PDV -');
        allTransactions.push({
          id: order.id,
          type: 'income',
          category: isPdv ? 'Venda PDV' : 'Venda Online - Produto',
          description: `Pedido #${order.id.substring(0, 8)}`,
          amount: Number(order.total),
          date: order.created_at || '',
          source: isPdv ? 'pdv' : 'order'
        });
      });

      // Add ticket sales as income
      ticketSalesData?.forEach(sale => {
        allTransactions.push({
          id: sale.id,
          type: 'income',
          category: 'Venda Online - Ingresso',
          description: `Ingresso #${sale.id.substring(0, 8)}`,
          amount: Number(sale.subtotal || 0),
          date: sale.created_at || '',
          source: 'ticket'
        });
      });

      // Add manual entries as income
      entriesData?.forEach(entry => {
        allTransactions.push({
          id: entry.id,
          type: 'income',
          category: entry.category || 'Entrada Manual',
          description: entry.description,
          amount: Number(entry.amount),
          date: entry.entry_date,
          source: 'manual',
          notes: entry.notes || undefined
        });
      });

      // Add expenses
      expensesData?.forEach(expense => {
        allTransactions.push({
          id: expense.id,
          type: 'expense',
          category: expense.category || 'Despesa',
          description: expense.description,
          amount: Number(expense.amount),
          date: expense.expense_date,
          notes: expense.notes || undefined
        });
      });

      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate totals
      const incomeTotal = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expenseTotal = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      setTransactions(allTransactions);
      setManualEntries(entriesData || []);
      setExpenses(expensesData || []);
      setTotalIncome(incomeTotal);
      setTotalExpenses(expenseTotal);
      setProfit(incomeTotal - expenseTotal);
    } catch (error) {
      console.error("Error loading financial data:", error);
      toast({
        title: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSaveEntry = async () => {
    if (!establishmentId || !entryForm.description || !entryForm.amount) {
      toast({
        title: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    setSavingEntry(true);
    try {
      const entryData = {
        establishment_id: establishmentId,
        description: entryForm.description,
        amount: parseFloat(entryForm.amount),
        category: entryForm.category || null,
        notes: entryForm.notes || null,
        entry_date: format(entryForm.date, 'yyyy-MM-dd')
      };
      if (editingEntry) {
        await supabase.from('manual_entries').update(entryData).eq('id', editingEntry.id);
        toast({
          title: "Entrada atualizada com sucesso"
        });
      } else {
        await supabase.from('manual_entries').insert([entryData]);
        toast({
          title: "Entrada adicionada com sucesso"
        });
      }
      setIsEntryDialogOpen(false);
      setEntryForm({
        description: "",
        amount: "",
        category: "",
        notes: "",
        date: new Date()
      });
      setEditingEntry(null);
      loadFinancialData();
    } catch (error) {
      console.error("Error saving entry:", error);
      toast({
        title: "Erro ao salvar entrada",
        variant: "destructive"
      });
    } finally {
      setSavingEntry(false);
    }
  };
  const handleSaveExpense = async () => {
    if (!establishmentId || !expenseForm.description || !expenseForm.amount) {
      toast({
        title: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    setSavingExpense(true);
    try {
      const expenseData = {
        establishment_id: establishmentId,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category || null,
        notes: expenseForm.notes || null,
        expense_date: format(expenseForm.date, 'yyyy-MM-dd')
      };
      if (editingExpense) {
        await supabase.from('expenses').update(expenseData).eq('id', editingExpense.id);
        toast({
          title: "Despesa atualizada com sucesso"
        });
      } else {
        await supabase.from('expenses').insert([expenseData]);
        toast({
          title: "Despesa adicionada com sucesso"
        });
      }
      setIsExpenseDialogOpen(false);
      setExpenseForm({
        description: "",
        amount: "",
        category: "",
        notes: "",
        date: new Date()
      });
      setEditingExpense(null);
      loadFinancialData();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast({
        title: "Erro ao salvar despesa",
        variant: "destructive"
      });
    } finally {
      setSavingExpense(false);
    }
  };
  const handleDeleteEntry = async (id: string) => {
    try {
      await supabase.from('manual_entries').delete().eq('id', id);
      toast({
        title: "Entrada removida"
      });
      loadFinancialData();
    } catch (error) {
      toast({
        title: "Erro ao remover entrada",
        variant: "destructive"
      });
    }
  };
  const handleDeleteExpense = async (id: string) => {
    try {
      await supabase.from('expenses').delete().eq('id', id);
      toast({
        title: "Despesa removida"
      });
      loadFinancialData();
    } catch (error) {
      toast({
        title: "Erro ao remover despesa",
        variant: "destructive"
      });
    }
  };
  const exportReport = async () => {
    if (!establishmentId) return;
    
    try {
      toast({ title: "Gerando relatório..." });
      
      // Fetch PDV orders with seller info and order items (delivered only)
      const { data: pdvOrders } = await supabase
        .from('orders')
        .select(`
          id, total, subtotal, discount, created_at, payment_method, status, seller_id, notes,
          order_items (
            product_name, quantity, unit_price, total_price
          )
        `)
        .eq('establishment_id', establishmentId)
        .eq('status', 'delivered')
        .like('payment_method', 'PDV -%')
        .order('created_at', { ascending: false });
      
      // Fetch seller profiles
      const sellerIds = [...new Set((pdvOrders || []).map(o => o.seller_id).filter(Boolean))];
      const { data: sellerProfiles } = sellerIds.length > 0 
        ? await supabase.from('profiles').select('id, full_name, email').in('id', sellerIds)
        : { data: [] };
      
      const sellerMap = new Map((sellerProfiles || []).map(p => [p.id, p.full_name || p.email || 'Desconhecido']));
      
      // Fetch all products for deposit/consignment report
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, name, price, cost_price, stock')
        .eq('establishment_id', establishmentId);
      
      const reportDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      
      // Calculate totals by payment method
      const totalByPayment = {
        cash: 0,
        credit: 0,
        debit: 0,
        pix: 0
      };
      
      (pdvOrders || []).forEach(order => {
        const method = order.payment_method?.toLowerCase() || '';
        if (method.includes('dinheiro')) totalByPayment.cash += Number(order.total);
        else if (method.includes('crédito') || method.includes('credito')) totalByPayment.credit += Number(order.total);
        else if (method.includes('débito') || method.includes('debito')) totalByPayment.debit += Number(order.total);
        else if (method.includes('pix')) totalByPayment.pix += Number(order.total);
      });
      
      const totalGeral = Object.values(totalByPayment).reduce((a, b) => a + b, 0);
      
      // Group orders by seller
      const ordersBySeller = new Map<string, typeof pdvOrders>();
      (pdvOrders || []).forEach(order => {
        const sellerId = order.seller_id || 'sem_vendedor';
        const sellerOrders = ordersBySeller.get(sellerId) || [];
        sellerOrders.push(order);
        ordersBySeller.set(sellerId, sellerOrders);
      });
      
      // Calculate product sales for deposit report
      const productSales = new Map<string, { name: string, quantity: number, unitPrice: number, totalValue: number, costPrice: number }>();
      (pdvOrders || []).forEach(order => {
        (order.order_items || []).forEach((item: any) => {
          const existing = productSales.get(item.product_name) || { 
            name: item.product_name, 
            quantity: 0, 
            unitPrice: item.unit_price, 
            totalValue: 0,
            costPrice: allProducts?.find(p => p.name === item.product_name)?.cost_price || 0
          };
          existing.quantity += item.quantity;
          existing.totalValue += item.total_price;
          productSales.set(item.product_name, existing);
        });
      });
      
      // Build CSV content
      let csvContent = "\uFEFF"; // BOM for Excel UTF-8
      csvContent += "RELATÓRIO FINANCEIRO - PDV\n";
      csvContent += `Data de exportação: ${reportDate}\n\n`;
      
      // === GERAL ===
      csvContent += "═══════════════════════════════════════\n";
      csvContent += "RESUMO GERAL DO ESTABELECIMENTO\n";
      csvContent += "═══════════════════════════════════════\n\n";
      csvContent += `Total Vendido;${formatCurrencyRaw(totalGeral)}\n`;
      csvContent += `Dinheiro;${formatCurrencyRaw(totalByPayment.cash)}\n`;
      csvContent += `Cartão Crédito;${formatCurrencyRaw(totalByPayment.credit)}\n`;
      csvContent += `Cartão Débito;${formatCurrencyRaw(totalByPayment.debit)}\n`;
      csvContent += `PIX;${formatCurrencyRaw(totalByPayment.pix)}\n`;
      csvContent += `\nTotal a Prestar Contas (Dinheiro);${formatCurrencyRaw(totalByPayment.cash)}\n`;
      csvContent += `Conciliado Automaticamente (Pix + Cartão);${formatCurrencyRaw(totalByPayment.pix + totalByPayment.credit + totalByPayment.debit)}\n\n`;
      
      // === POR VENDEDOR ===
      csvContent += "═══════════════════════════════════════\n";
      csvContent += "RELATÓRIO POR VENDEDOR / PONTO DE VENDA\n";
      csvContent += "═══════════════════════════════════════\n\n";
      
      ordersBySeller.forEach((orders, sellerId) => {
        const sellerName = sellerId === 'sem_vendedor' ? 'Vendedor não identificado' : sellerMap.get(sellerId) || 'Desconhecido';
        
        const sellerTotals = { cash: 0, credit: 0, debit: 0, pix: 0 };
        orders.forEach(order => {
          const method = order.payment_method?.toLowerCase() || '';
          if (method.includes('dinheiro')) sellerTotals.cash += Number(order.total);
          else if (method.includes('crédito') || method.includes('credito')) sellerTotals.credit += Number(order.total);
          else if (method.includes('débito') || method.includes('debito')) sellerTotals.debit += Number(order.total);
          else if (method.includes('pix')) sellerTotals.pix += Number(order.total);
        });
        
        const sellerTotal = Object.values(sellerTotals).reduce((a, b) => a + b, 0);
        
        csvContent += `--- ${sellerName} ---\n`;
        csvContent += `Total Vendido;${formatCurrencyRaw(sellerTotal)}\n`;
        csvContent += `Dinheiro;${formatCurrencyRaw(sellerTotals.cash)}\n`;
        csvContent += `Cartão Crédito;${formatCurrencyRaw(sellerTotals.credit)}\n`;
        csvContent += `Cartão Débito;${formatCurrencyRaw(sellerTotals.debit)}\n`;
        csvContent += `PIX;${formatCurrencyRaw(sellerTotals.pix)}\n`;
        csvContent += `DINHEIRO A APRESENTAR;${formatCurrencyRaw(sellerTotals.cash)}\n`;
        csvContent += `Quantidade de Vendas;${orders.length}\n\n`;
      });
      
      // === DEPÓSITO / CONSIGNAÇÃO ===
      csvContent += "═══════════════════════════════════════\n";
      csvContent += "RELATÓRIO DE DEPÓSITO / CONSIGNAÇÃO\n";
      csvContent += "═══════════════════════════════════════\n\n";
      csvContent += "Produto;Qtd Vendida;Valor Unitário;Total Vendido;Custo Unit.;A Pagar Fornecedor\n";
      
      let totalDevido = 0;
      productSales.forEach(product => {
        const devidoFornecedor = product.costPrice * product.quantity;
        totalDevido += devidoFornecedor;
        csvContent += `${product.name};${product.quantity};${formatCurrencyRaw(product.unitPrice)};${formatCurrencyRaw(product.totalValue)};${formatCurrencyRaw(product.costPrice)};${formatCurrencyRaw(devidoFornecedor)}\n`;
      });
      
      csvContent += `\nTOTAL DEVIDO AO FORNECEDOR;;;;;${formatCurrencyRaw(totalDevido)}\n`;
      csvContent += `LUCRO BRUTO (Vendas - Custo);;;;;${formatCurrencyRaw(totalGeral - totalDevido)}\n\n`;
      
      // === TRANSAÇÕES DETALHADAS ===
      csvContent += "═══════════════════════════════════════\n";
      csvContent += "LISTA DE VENDAS DETALHADAS\n";
      csvContent += "═══════════════════════════════════════\n\n";
      csvContent += "Data/Hora;Vendedor;Forma Pagamento;Valor;Cliente\n";
      
      (pdvOrders || []).forEach(order => {
        const sellerName = order.seller_id ? (sellerMap.get(order.seller_id) || 'Desconhecido') : 'N/A';
        const paymentLabel = getPaymentLabel(order.payment_method);
        const dateTime = format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
        const clientNote = order.notes || '-';
        csvContent += `${dateTime};${sellerName};${paymentLabel};${formatCurrencyRaw(Number(order.total))};${clientNote}\n`;
      });
      
      // Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-pdv-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      
      toast({ title: "Relatório exportado com sucesso" });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({ title: "Erro ao exportar relatório", variant: "destructive" });
    }
  };
  
  const getPaymentLabel = (method: string | null): string => {
    const m = method?.toLowerCase() || '';
    if (m.includes('cash') || m === 'dinheiro') return 'Dinheiro';
    if (m.includes('credit') || m === 'credito') return 'Cartão Crédito';
    if (m.includes('debit') || m === 'debito') return 'Cartão Débito';
    if (m.includes('pix')) return 'PIX';
    return method || 'N/A';
  };
  const formatCurrencyRaw = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };
  const formatCurrency = (value: number) => mask(formatCurrencyRaw(value));
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", {
        locale: ptBR
      });
    } catch {
      return dateString;
    }
  };
  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'ticket':
        return <Ticket className="w-4 h-4" />;
      case 'order':
        return <ShoppingCart className="w-4 h-4" />;
      case 'pdv':
        return <Calculator className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="admin-stat-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="admin-icon bg-secondary">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total de Entradas</p>
                <p className="text-xl sm:text-2xl font-semibold text-emerald-600">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-stat-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="admin-icon bg-secondary">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total de Saídas</p>
                <p className="text-xl sm:text-2xl font-semibold text-red-600">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-stat-card sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={cn("admin-icon", profit >= 0 ? "bg-emerald-500" : "bg-red-500")}>
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Lucro</p>
                <p className={cn("text-xl sm:text-2xl font-semibold", profit >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {formatCurrency(profit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
        <Button className="w-full sm:w-auto" onClick={() => {
        setEditingEntry(null);
        setEntryForm({
          description: "",
          amount: "",
          category: "",
          notes: "",
          date: new Date()
        });
        setIsEntryDialogOpen(true);
      }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Entrada
        </Button>
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => {
        setEditingExpense(null);
        setExpenseForm({
          description: "",
          amount: "",
          category: "",
          notes: "",
          date: new Date()
        });
        setIsExpenseDialogOpen(true);
      }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={exportReport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Transactions Tabs */}
      <Tabs defaultValue="all" className="space-y-3 sm:space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="all" className="text-xs sm:text-sm">Todas</TabsTrigger>
          <TabsTrigger value="income" className="text-xs sm:text-sm">Entradas</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs sm:text-sm">Saídas</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <TransactionTable transactions={transactions} formatCurrency={formatCurrency} formatDate={formatDate} getSourceIcon={getSourceIcon} onEditEntry={entry => {
          setEditingEntry(entry as any);
          setEntryForm({
            description: entry.description,
            amount: String(entry.amount),
            category: entry.category || "",
            notes: entry.notes || "",
            date: new Date(entry.date)
          });
          setIsEntryDialogOpen(true);
        }} onEditExpense={expense => {
          setEditingExpense(expense as any);
          setExpenseForm({
            description: expense.description,
            amount: String(expense.amount),
            category: expense.category || "",
            notes: expense.notes || "",
            date: new Date(expense.date)
          });
          setIsExpenseDialogOpen(true);
        }} onDeleteEntry={handleDeleteEntry} onDeleteExpense={handleDeleteExpense} />
        </TabsContent>

        <TabsContent value="income">
          <TransactionTable transactions={transactions.filter(t => t.type === 'income')} formatCurrency={formatCurrency} formatDate={formatDate} getSourceIcon={getSourceIcon} onEditEntry={entry => {
          setEditingEntry(entry as any);
          setEntryForm({
            description: entry.description,
            amount: String(entry.amount),
            category: entry.category || "",
            notes: entry.notes || "",
            date: new Date(entry.date)
          });
          setIsEntryDialogOpen(true);
        }} onEditExpense={() => {}} onDeleteEntry={handleDeleteEntry} onDeleteExpense={() => {}} />
        </TabsContent>

        <TabsContent value="expenses">
          <TransactionTable transactions={transactions.filter(t => t.type === 'expense')} formatCurrency={formatCurrency} formatDate={formatDate} getSourceIcon={getSourceIcon} onEditEntry={() => {}} onEditExpense={expense => {
          setEditingExpense(expense as any);
          setExpenseForm({
            description: expense.description,
            amount: String(expense.amount),
            category: expense.category || "",
            notes: expense.notes || "",
            date: new Date(expense.date)
          });
          setIsExpenseDialogOpen(true);
        }} onDeleteEntry={() => {}} onDeleteExpense={handleDeleteExpense} />
        </TabsContent>
      </Tabs>

      {/* Entry Dialog */}
      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Editar Entrada" : "Nova Entrada"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={entryForm.description} onChange={e => setEntryForm({
              ...entryForm,
              description: e.target.value
            })} placeholder="Ex: Venda avulsa" />
            </div>
            <div>
              <Label>Valor *</Label>
              <Input type="number" step="0.01" value={entryForm.amount} onChange={e => setEntryForm({
              ...entryForm,
              amount: e.target.value
            })} placeholder="0,00" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={entryForm.category} onChange={e => setEntryForm({
              ...entryForm,
              category: e.target.value
            })} placeholder="Ex: Venda avulsa, Serviço" />
            </div>
            <div>
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(entryForm.date, "dd/MM/yyyy", {
                    locale: ptBR
                  })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={entryForm.date} onSelect={date => date && setEntryForm({
                  ...entryForm,
                  date
                })} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={entryForm.notes} onChange={e => setEntryForm({
              ...entryForm,
              notes: e.target.value
            })} placeholder="Notas adicionais..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEntryDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEntry} disabled={savingEntry}>
              {savingEntry && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={expenseForm.description} onChange={e => setExpenseForm({
              ...expenseForm,
              description: e.target.value
            })} placeholder="Ex: Aluguel, Material" />
            </div>
            <div>
              <Label>Valor *</Label>
              <Input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({
              ...expenseForm,
              amount: e.target.value
            })} placeholder="0,00" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={expenseForm.category} onChange={e => setExpenseForm({
              ...expenseForm,
              category: e.target.value
            })} placeholder="Ex: Fornecedor, Operacional" />
            </div>
            <div>
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(expenseForm.date, "dd/MM/yyyy", {
                    locale: ptBR
                  })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={expenseForm.date} onSelect={date => date && setExpenseForm({
                  ...expenseForm,
                  date
                })} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={expenseForm.notes} onChange={e => setExpenseForm({
              ...expenseForm,
              notes: e.target.value
            })} placeholder="Notas adicionais..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveExpense} disabled={savingExpense}>
              {savingExpense && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};

// Transaction Table Component
interface TransactionTableProps {
  transactions: Transaction[];
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  getSourceIcon: (source?: string) => JSX.Element;
  onEditEntry: (entry: Transaction) => void;
  onEditExpense: (expense: Transaction) => void;
  onDeleteEntry: (id: string) => void;
  onDeleteExpense: (id: string) => void;
}
const TransactionTable = ({
  transactions,
  formatCurrency,
  formatDate,
  getSourceIcon,
  onEditEntry,
  onEditExpense,
  onDeleteEntry,
  onDeleteExpense
}: TransactionTableProps) => {
  if (transactions.length === 0) {
    return <Card className="admin-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          Nenhuma transação encontrada
        </CardContent>
      </Card>;
  }
  return <>
      {/* Mobile & Tablet Cards */}
      <div className="grid gap-2 sm:gap-3 lg:hidden">
        {transactions.map(t => <Card key={t.id} className="admin-card">
            <div className="flex items-start gap-3 p-3 sm:p-4">
              <div className={cn("p-2 rounded-full flex-shrink-0", t.type === 'income' ? "bg-emerald-500" : "bg-red-500")}>
                {t.type === 'income' ? <ArrowUpCircle className="w-4 h-4 text-white" /> : <ArrowDownCircle className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate text-sm sm:text-base">{t.description}</p>
                  {t.source && <div className="text-muted-foreground flex-shrink-0">
                      {getSourceIcon(t.source)}
                    </div>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{t.category}</p>
                <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={cn("font-semibold text-sm sm:text-base", t.type === 'income' ? "text-emerald-600" : "text-red-600")}>
                  {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                </p>
                {t.source === 'manual' && t.type === 'income' && <div className="flex gap-1 mt-1.5 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onEditEntry(t)}>
                      <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" onClick={() => onDeleteEntry(t.id)}>
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>}
                {t.type === 'expense' && <div className="flex gap-1 mt-1.5 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onEditExpense(t)}>
                      <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" onClick={() => onDeleteExpense(t.id)}>
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>}
              </div>
            </div>
          </Card>)}
      </div>

      {/* Desktop Table */}
      <Card className="admin-card hidden lg:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead className="text-right w-[130px]">Valor</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(t => <TableRow key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {t.type === 'income' ? <Badge className="bg-emerald-500 text-white border-0">Entrada</Badge> : <Badge className="bg-red-500 text-white border-0">Saída</Badge>}
                    {t.source && <span className="text-muted-foreground">{getSourceIcon(t.source)}</span>}
                  </div>
                </TableCell>
                <TableCell>{t.category}</TableCell>
                <TableCell className="font-medium">{t.description}</TableCell>
                <TableCell>{formatDate(t.date)}</TableCell>
                <TableCell className={cn("text-right font-semibold", t.type === 'income' ? "text-emerald-600" : "text-red-600")}>
                  {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {t.source === 'manual' && t.type === 'income' && <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditEntry(t)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDeleteEntry(t.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>}
                  {t.type === 'expense' && <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditExpense(t)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDeleteExpense(t.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>}
                  {t.source !== 'manual' && t.type === 'income' && <span className="text-muted-foreground text-sm">-</span>}
                </TableCell>
              </TableRow>)}
          </TableBody>
        </Table>
      </Card>
    </>;
};