import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { clearFeesCache } from "@/utils/ticketUtils";
import { 
  DollarSign, 
  Settings, 
  TrendingUp, 
  FileText, 
  CreditCard, 
  Percent, 
  Save,
  Download,
  Ticket,
  ShoppingBag,
  PiggyBank,
  Building2,
  History,
  AlertCircle,
  Banknote
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface PlatformFees {
  id: string;
  gateway_credit_percentage: number;
  gateway_credit_fixed: number;
  gateway_pix_percentage: number;
  gateway_pix_fixed: number;
  customer_product_percentage: number;
  customer_product_fixed: number;
  customer_ticket_percentage: number;
  customer_ticket_minimum: number;
  gateway_credit_1x_percentage: number;
  gateway_credit_1x_fixed: number;
  gateway_credit_2x_percentage: number;
  gateway_credit_2x_fixed: number;
  gateway_credit_3x_percentage: number;
  gateway_credit_3x_fixed: number;
  gateway_credit_4x_percentage: number;
  gateway_credit_4x_fixed: number;
  gateway_credit_5x_percentage: number;
  gateway_credit_5x_fixed: number;
  gateway_credit_6x_percentage: number;
  gateway_credit_6x_fixed: number;
  gateway_credit_7x_percentage: number;
  gateway_credit_7x_fixed: number;
  gateway_credit_8x_percentage: number;
  gateway_credit_8x_fixed: number;
  gateway_credit_9x_percentage: number;
  gateway_credit_9x_fixed: number;
  gateway_credit_10x_percentage: number;
  gateway_credit_10x_fixed: number;
  gateway_credit_11x_percentage: number;
  gateway_credit_11x_fixed: number;
  gateway_credit_12x_percentage: number;
  gateway_credit_12x_fixed: number;
  customer_pix_percentage: number;
  customer_pix_fixed: number;
  customer_credit_1x_percentage: number;
  customer_credit_1x_fixed: number;
  customer_credit_2x_percentage: number;
  customer_credit_2x_fixed: number;
  customer_credit_3x_percentage: number;
  customer_credit_3x_fixed: number;
  customer_credit_4x_percentage: number;
  customer_credit_4x_fixed: number;
  customer_credit_5x_percentage: number;
  customer_credit_5x_fixed: number;
  customer_credit_6x_percentage: number;
  customer_credit_6x_fixed: number;
  customer_credit_7x_percentage: number;
  customer_credit_7x_fixed: number;
  customer_credit_8x_percentage: number;
  customer_credit_8x_fixed: number;
  customer_credit_9x_percentage: number;
  customer_credit_9x_fixed: number;
  customer_credit_10x_percentage: number;
  customer_credit_10x_fixed: number;
  customer_credit_11x_percentage: number;
  customer_credit_11x_fixed: number;
  customer_credit_12x_percentage: number;
  customer_credit_12x_fixed: number;
  updated_at: string;
}

interface FeeLog {
  id: string;
  field_changed: string;
  old_value: number;
  new_value: number;
  changed_at: string;
}

interface Establishment {
  id: string;
  name: string;
  slug: string;
}

interface FinancialSummary {
  totalProductSales: number;
  totalTicketSales: number;
  totalGatewayCost: number;
  moonkyProductRevenue: number;
  moonkyTicketRevenue: number;
  totalMoonkyRevenue: number;
  netProfit: number;
  establishmentPayout: number;
}

const COLORS = ['hsl(241, 84%, 57%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

const INSTALLMENTS = [
  { key: '1x', label: 'À Vista (1x)' },
  { key: '2x', label: '2x' },
  { key: '3x', label: '3x' },
  { key: '4x', label: '4x' },
  { key: '5x', label: '5x' },
  { key: '6x', label: '6x' },
  { key: '7x', label: '7x' },
  { key: '8x', label: '8x' },
  { key: '9x', label: '9x' },
  { key: '10x', label: '10x' },
  { key: '11x', label: '11x' },
  { key: '12x', label: '12x' },
];

export default function MasterFinance() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [fees, setFees] = useState<PlatformFees | null>(null);
  const [feeLogs, setFeeLogs] = useState<FeeLog[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEstablishment, setSelectedEstablishment] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalProductSales: 0,
    totalTicketSales: 0,
    totalGatewayCost: 0,
    moonkyProductRevenue: 0,
    moonkyTicketRevenue: 0,
    totalMoonkyRevenue: 0,
    netProfit: 0,
    establishmentPayout: 0
  });

  const [formData, setFormData] = useState({
    // Gateway fees
    gateway_pix_percentage: 0,
    gateway_pix_fixed: 0,
    gateway_credit_1x_percentage: 5.99,
    gateway_credit_1x_fixed: 0.99,
    gateway_credit_2x_percentage: 6.49,
    gateway_credit_2x_fixed: 0.99,
    gateway_credit_3x_percentage: 6.99,
    gateway_credit_3x_fixed: 0.99,
    gateway_credit_4x_percentage: 7.49,
    gateway_credit_4x_fixed: 0.99,
    gateway_credit_5x_percentage: 7.99,
    gateway_credit_5x_fixed: 0.99,
    gateway_credit_6x_percentage: 8.49,
    gateway_credit_6x_fixed: 0.99,
    gateway_credit_7x_percentage: 8.99,
    gateway_credit_7x_fixed: 0.99,
    gateway_credit_8x_percentage: 9.49,
    gateway_credit_8x_fixed: 0.99,
    gateway_credit_9x_percentage: 9.99,
    gateway_credit_9x_fixed: 0.99,
    gateway_credit_10x_percentage: 10.49,
    gateway_credit_10x_fixed: 0.99,
    gateway_credit_11x_percentage: 10.99,
    gateway_credit_11x_fixed: 0.99,
    gateway_credit_12x_percentage: 11.49,
    gateway_credit_12x_fixed: 0.99,
    // Customer fees
    customer_pix_percentage: 0,
    customer_pix_fixed: 0,
    customer_credit_1x_percentage: 5.99,
    customer_credit_1x_fixed: 0.99,
    customer_credit_2x_percentage: 6.49,
    customer_credit_2x_fixed: 0.99,
    customer_credit_3x_percentage: 6.99,
    customer_credit_3x_fixed: 0.99,
    customer_credit_4x_percentage: 7.49,
    customer_credit_4x_fixed: 0.99,
    customer_credit_5x_percentage: 7.99,
    customer_credit_5x_fixed: 0.99,
    customer_credit_6x_percentage: 8.49,
    customer_credit_6x_fixed: 0.99,
    customer_credit_7x_percentage: 8.99,
    customer_credit_7x_fixed: 0.99,
    customer_credit_8x_percentage: 9.49,
    customer_credit_8x_fixed: 0.99,
    customer_credit_9x_percentage: 9.99,
    customer_credit_9x_fixed: 0.99,
    customer_credit_10x_percentage: 10.49,
    customer_credit_10x_fixed: 0.99,
    customer_credit_11x_percentage: 10.99,
    customer_credit_11x_fixed: 0.99,
    customer_credit_12x_percentage: 11.49,
    customer_credit_12x_fixed: 0.99,
    // Ticket fees (kept for backwards compatibility)
    customer_ticket_percentage: 10,
    customer_ticket_minimum: 2.50,
    customer_product_percentage: 0,
    customer_product_fixed: 0,
  });

  useEffect(() => {
    fetchData();
  }, [selectedEstablishment]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchFees(),
      fetchFeeLogs(),
      fetchEstablishments(),
      fetchFinancialSummary()
    ]);
    setLoading(false);
  };

  const fetchFees = async () => {
    const { data, error } = await supabase
      .from("platform_fees")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching fees:", error);
      return;
    }

    if (data) {
      setFees(data as PlatformFees);
      setFormData({
        gateway_pix_percentage: data.gateway_pix_percentage,
        gateway_pix_fixed: data.gateway_pix_fixed,
        gateway_credit_1x_percentage: data.gateway_credit_1x_percentage ?? 5.99,
        gateway_credit_1x_fixed: data.gateway_credit_1x_fixed ?? 0.99,
        gateway_credit_2x_percentage: data.gateway_credit_2x_percentage ?? 6.49,
        gateway_credit_2x_fixed: data.gateway_credit_2x_fixed ?? 0.99,
        gateway_credit_3x_percentage: data.gateway_credit_3x_percentage ?? 6.99,
        gateway_credit_3x_fixed: data.gateway_credit_3x_fixed ?? 0.99,
        gateway_credit_4x_percentage: data.gateway_credit_4x_percentage ?? 7.49,
        gateway_credit_4x_fixed: data.gateway_credit_4x_fixed ?? 0.99,
        gateway_credit_5x_percentage: data.gateway_credit_5x_percentage ?? 7.99,
        gateway_credit_5x_fixed: data.gateway_credit_5x_fixed ?? 0.99,
        gateway_credit_6x_percentage: data.gateway_credit_6x_percentage ?? 8.49,
        gateway_credit_6x_fixed: data.gateway_credit_6x_fixed ?? 0.99,
        gateway_credit_7x_percentage: data.gateway_credit_7x_percentage ?? 8.99,
        gateway_credit_7x_fixed: data.gateway_credit_7x_fixed ?? 0.99,
        gateway_credit_8x_percentage: data.gateway_credit_8x_percentage ?? 9.49,
        gateway_credit_8x_fixed: data.gateway_credit_8x_fixed ?? 0.99,
        gateway_credit_9x_percentage: data.gateway_credit_9x_percentage ?? 9.99,
        gateway_credit_9x_fixed: data.gateway_credit_9x_fixed ?? 0.99,
        gateway_credit_10x_percentage: data.gateway_credit_10x_percentage ?? 10.49,
        gateway_credit_10x_fixed: data.gateway_credit_10x_fixed ?? 0.99,
        gateway_credit_11x_percentage: data.gateway_credit_11x_percentage ?? 10.99,
        gateway_credit_11x_fixed: data.gateway_credit_11x_fixed ?? 0.99,
        gateway_credit_12x_percentage: data.gateway_credit_12x_percentage ?? 11.49,
        gateway_credit_12x_fixed: data.gateway_credit_12x_fixed ?? 0.99,
        // Customer fees
        customer_pix_percentage: data.customer_pix_percentage ?? 0,
        customer_pix_fixed: data.customer_pix_fixed ?? 0,
        customer_credit_1x_percentage: data.customer_credit_1x_percentage ?? 5.99,
        customer_credit_1x_fixed: data.customer_credit_1x_fixed ?? 0.99,
        customer_credit_2x_percentage: data.customer_credit_2x_percentage ?? 6.49,
        customer_credit_2x_fixed: data.customer_credit_2x_fixed ?? 0.99,
        customer_credit_3x_percentage: data.customer_credit_3x_percentage ?? 6.99,
        customer_credit_3x_fixed: data.customer_credit_3x_fixed ?? 0.99,
        customer_credit_4x_percentage: data.customer_credit_4x_percentage ?? 7.49,
        customer_credit_4x_fixed: data.customer_credit_4x_fixed ?? 0.99,
        customer_credit_5x_percentage: data.customer_credit_5x_percentage ?? 7.99,
        customer_credit_5x_fixed: data.customer_credit_5x_fixed ?? 0.99,
        customer_credit_6x_percentage: data.customer_credit_6x_percentage ?? 8.49,
        customer_credit_6x_fixed: data.customer_credit_6x_fixed ?? 0.99,
        customer_credit_7x_percentage: data.customer_credit_7x_percentage ?? 8.99,
        customer_credit_7x_fixed: data.customer_credit_7x_fixed ?? 0.99,
        customer_credit_8x_percentage: data.customer_credit_8x_percentage ?? 9.49,
        customer_credit_8x_fixed: data.customer_credit_8x_fixed ?? 0.99,
        customer_credit_9x_percentage: data.customer_credit_9x_percentage ?? 9.99,
        customer_credit_9x_fixed: data.customer_credit_9x_fixed ?? 0.99,
        customer_credit_10x_percentage: data.customer_credit_10x_percentage ?? 10.49,
        customer_credit_10x_fixed: data.customer_credit_10x_fixed ?? 0.99,
        customer_credit_11x_percentage: data.customer_credit_11x_percentage ?? 10.99,
        customer_credit_11x_fixed: data.customer_credit_11x_fixed ?? 0.99,
        customer_credit_12x_percentage: data.customer_credit_12x_percentage ?? 11.49,
        customer_credit_12x_fixed: data.customer_credit_12x_fixed ?? 0.99,
        // Ticket fees
        customer_ticket_percentage: data.customer_ticket_percentage,
        customer_ticket_minimum: data.customer_ticket_minimum,
        customer_product_percentage: data.customer_product_percentage,
        customer_product_fixed: data.customer_product_fixed,
      });
    }
  };

  const fetchFeeLogs = async () => {
    const { data, error } = await supabase
      .from("platform_fee_logs")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setFeeLogs(data);
    }
  };

  const fetchEstablishments = async () => {
    const { data, error } = await supabase
      .from("establishments")
      .select("id, name, slug")
      .order("name");

    if (!error && data) {
      setEstablishments(data);
    }
  };

  const fetchFinancialSummary = async () => {
    let ordersQuery = supabase
      .from("orders")
      .select("total, payment_method, status, establishment_id")
      .eq("status", "delivered");
    
    if (selectedEstablishment !== "all") {
      ordersQuery = ordersQuery.eq("establishment_id", selectedEstablishment);
    }

    const { data: orders } = await ordersQuery;

    let ticketsQuery = supabase
      .from("ticket_sales")
      .select("total_price, subtotal, fee_amount, payment_status, establishment_id")
      .in("payment_status", ["paid", "completed"]);

    if (selectedEstablishment !== "all") {
      ticketsQuery = ticketsQuery.eq("establishment_id", selectedEstablishment);
    }

    const { data: tickets } = await ticketsQuery;

    const totalProductSales = orders?.reduce((acc, o) => acc + (o.total || 0), 0) || 0;
    const totalTicketSales = tickets?.reduce((acc, t) => acc + (t.subtotal || 0), 0) || 0;
    const moonkyTicketRevenue = tickets?.reduce((acc, t) => acc + (t.fee_amount || 0), 0) || 0;

    let totalGatewayCost = 0;
    if (orders && fees) {
      orders.forEach(order => {
        if (order.payment_method === "credit_card" || order.payment_method === "card") {
          totalGatewayCost += (order.total * (fees.gateway_credit_1x_percentage / 100)) + fees.gateway_credit_1x_fixed;
        } else if (order.payment_method === "pix") {
          totalGatewayCost += (order.total * (fees.gateway_pix_percentage / 100)) + fees.gateway_pix_fixed;
        }
      });
    }

    let moonkyProductRevenue = 0;
    if (orders && fees) {
      orders.forEach(order => {
        let customerFee = 0;
        let gatewayCost = 0;
        if (order.payment_method === "credit_card" || order.payment_method === "card") {
          customerFee = (order.total * (fees.customer_credit_1x_percentage / 100)) + fees.customer_credit_1x_fixed;
          gatewayCost = (order.total * (fees.gateway_credit_1x_percentage / 100)) + fees.gateway_credit_1x_fixed;
        } else if (order.payment_method === "pix") {
          customerFee = (order.total * (fees.customer_pix_percentage / 100)) + fees.customer_pix_fixed;
          gatewayCost = (order.total * (fees.gateway_pix_percentage / 100)) + fees.gateway_pix_fixed;
        }
        moonkyProductRevenue += customerFee - gatewayCost;
      });
    }

    const totalMoonkyRevenue = moonkyProductRevenue + moonkyTicketRevenue;
    const netProfit = totalMoonkyRevenue;
    const establishmentPayout = totalProductSales - totalGatewayCost + totalTicketSales;

    setSummary({
      totalProductSales,
      totalTicketSales,
      totalGatewayCost,
      moonkyProductRevenue,
      moonkyTicketRevenue,
      totalMoonkyRevenue,
      netProfit,
      establishmentPayout
    });
  };

  const handleSaveFees = async () => {
    if (!fees) return;

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const fieldsToCheck = [
      { key: 'gateway_pix_percentage', label: 'Gateway Pix (%)' },
      { key: 'gateway_pix_fixed', label: 'Gateway Pix Fixa' },
      { key: 'customer_pix_percentage', label: 'Cliente Pix (%)' },
      { key: 'customer_pix_fixed', label: 'Cliente Pix Fixa' },
      { key: 'customer_ticket_percentage', label: 'Taxa Ingresso (%)' },
      { key: 'customer_ticket_minimum', label: 'Taxa Ingresso Mínima' },
      ...INSTALLMENTS.map(inst => [
        { key: `gateway_credit_${inst.key}_percentage`, label: `Gateway Cartão ${inst.label} (%)` },
        { key: `gateway_credit_${inst.key}_fixed`, label: `Gateway Cartão ${inst.label} Fixo` },
        { key: `customer_credit_${inst.key}_percentage`, label: `Cliente Cartão ${inst.label} (%)` },
        { key: `customer_credit_${inst.key}_fixed`, label: `Cliente Cartão ${inst.label} Fixo` }
      ]).flat()
    ];

    const logs: { field_changed: string; old_value: number; new_value: number; changed_by: string }[] = [];
    
    fieldsToCheck.forEach(field => {
      const oldValue = (fees as any)[field.key] as number;
      const newValue = (formData as any)[field.key];
      if (oldValue !== newValue && userId) {
        logs.push({
          field_changed: field.label,
          old_value: oldValue ?? 0,
          new_value: newValue,
          changed_by: userId
        });
      }
    });

    if (logs.length > 0) {
      await supabase.from("platform_fee_logs").insert(logs);
    }

    const { error } = await supabase
      .from("platform_fees")
      .update({
        ...formData,
        gateway_credit_percentage: formData.gateway_credit_1x_percentage,
        gateway_credit_fixed: formData.gateway_credit_1x_fixed
      })
      .eq("id", fees.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } else {
      // Clear the cached fees so all clients fetch fresh values
      clearFeesCache();
      
      toast({
        title: "Configurações salvas",
        description: "As taxas foram atualizadas com sucesso e propagadas para toda a plataforma."
      });
      fetchData();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const pieData = [
    { name: 'Produtos', value: summary.moonkyProductRevenue },
    { name: 'Ingressos', value: summary.moonkyTicketRevenue }
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'Produtos', vendas: summary.totalProductSales, receita: summary.moonkyProductRevenue },
    { name: 'Ingressos', vendas: summary.totalTicketSales, receita: summary.moonkyTicketRevenue },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="admin-icon-lg">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Master Finance</h2>
              <p className="text-sm text-muted-foreground hidden sm:block">Gestão financeira centralizada da plataforma</p>
            </div>
          </div>
          <Select value={selectedEstablishment} onValueChange={setSelectedEstablishment}>
            <SelectTrigger className="w-full sm:w-[220px] bg-card">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar estabelecimento" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos</SelectItem>
              {establishments.map(est => (
                <SelectItem key={est.id} value={est.id}>{est.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full grid grid-cols-4 h-auto gap-1 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="dashboard" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">Taxas</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">Relatórios</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">Auditoria</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="admin-stat-card">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="admin-stat-label">Vendas Produtos</p>
                  <p className="admin-stat-value text-lg md:text-2xl">{formatCurrency(summary.totalProductSales)}</p>
                </div>
                <div className="admin-icon-sm bg-blue-500">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="admin-stat-label">Vendas Ingressos</p>
                  <p className="admin-stat-value text-lg md:text-2xl">{formatCurrency(summary.totalTicketSales)}</p>
                </div>
                <div className="admin-icon-sm bg-purple-500">
                  <Ticket className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="admin-stat-label">Custo Gateway</p>
                  <p className="admin-stat-value text-lg md:text-2xl text-destructive">{formatCurrency(summary.totalGatewayCost)}</p>
                </div>
                <div className="admin-icon-sm bg-destructive">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="admin-stat-label">Lucro Moonky</p>
                  <p className="admin-stat-value text-lg md:text-2xl text-emerald-500">{formatCurrency(summary.netProfit)}</p>
                </div>
                <div className="admin-icon-sm bg-emerald-500">
                  <PiggyBank className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="admin-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Receita Produtos</p>
                    <p className="text-2xl font-bold text-blue-500">{formatCurrency(summary.moonkyProductRevenue)}</p>
                  </div>
                  <ShoppingBag className="w-8 h-8 text-blue-500/30" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Taxa cliente - Custo gateway</p>
              </CardContent>
            </Card>

            <Card className="admin-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Comissão Ingressos</p>
                    <p className="text-2xl font-bold text-purple-500">{formatCurrency(summary.moonkyTicketRevenue)}</p>
                  </div>
                  <Ticket className="w-8 h-8 text-purple-500/30" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">10% ou mínimo R$ 2,50</p>
              </CardContent>
            </Card>

            <Card className="admin-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Repasse Estabelecimentos</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.establishmentPayout)}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Valor líquido após taxas</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="admin-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Receita Moonky por Tipo</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">Sem dados para exibir</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="admin-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Comparativo Vendas x Receita</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={12} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="vendas" name="Vendas" fill="hsl(241, 84%, 57%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="receita" name="Receita Moonky" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fee Configuration Tab */}
        <TabsContent value="config" className="space-y-6 mt-4">
          {/* Gateway Fees Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-destructive rounded-full" />
              <h3 className="text-lg font-semibold">Taxas do Gateway (Custo)</h3>
              <Badge variant="destructive" className="text-xs">Custos pagos ao gateway</Badge>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Gateway Pix */}
              <Card className="admin-card">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="admin-icon-sm bg-emerald-500">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Pix</CardTitle>
                      <CardDescription className="text-xs">Taxa cobrada pelo gateway em transações Pix</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Taxa (%)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          className="pr-8 h-10"
                          value={formData.gateway_pix_percentage}
                          onChange={(e) => setFormData({ ...formData, gateway_pix_percentage: parseFloat(e.target.value) || 0 })}
                        />
                        <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Taxa Fixa (R$)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          className="pr-8 h-10"
                          value={formData.gateway_pix_fixed}
                          onChange={(e) => setFormData({ ...formData, gateway_pix_fixed: parseFloat(e.target.value) || 0 })}
                        />
                        <DollarSign className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gateway Credit Card */}
              <Card className="admin-card">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="admin-icon-sm bg-destructive">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Cartão de Crédito</CardTitle>
                      <CardDescription className="text-xs">Taxa por parcelamento</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[350px] pr-4">
                    <Accordion type="single" collapsible className="w-full space-y-2">
                      {INSTALLMENTS.map((inst) => (
                        <AccordionItem key={`gateway-${inst.key}`} value={inst.key} className="border rounded-lg px-3">
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{inst.label}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {(formData as any)[`gateway_credit_${inst.key}_percentage`]}% + R$ {(formData as any)[`gateway_credit_${inst.key}_fixed`]?.toFixed(2)}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs">Taxa (%)</Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="pr-8 h-9 text-sm"
                                    value={(formData as any)[`gateway_credit_${inst.key}_percentage`]}
                                    onChange={(e) => setFormData({ 
                                      ...formData, 
                                      [`gateway_credit_${inst.key}_percentage`]: parseFloat(e.target.value) || 0 
                                    })}
                                  />
                                  <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Taxa Fixa (R$)</Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="pr-8 h-9 text-sm"
                                    value={(formData as any)[`gateway_credit_${inst.key}_fixed`]}
                                    onChange={(e) => setFormData({ 
                                      ...formData, 
                                      [`gateway_credit_${inst.key}_fixed`]: parseFloat(e.target.value) || 0 
                                    })}
                                  />
                                  <DollarSign className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Customer Fees Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-emerald-500 rounded-full" />
              <h3 className="text-lg font-semibold">Taxas Cobradas do Cliente (Receita)</h3>
              <Badge className="text-xs bg-emerald-500">Receita Moonky</Badge>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Customer Pix */}
              <Card className="admin-card">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="admin-icon-sm bg-emerald-500">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Pix</CardTitle>
                      <CardDescription className="text-xs">Taxa cobrada do cliente em transações Pix</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Taxa (%)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          className="pr-8 h-10"
                          value={formData.customer_pix_percentage}
                          onChange={(e) => setFormData({ ...formData, customer_pix_percentage: parseFloat(e.target.value) || 0 })}
                        />
                        <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Taxa Fixa (R$)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          className="pr-8 h-10"
                          value={formData.customer_pix_fixed}
                          onChange={(e) => setFormData({ ...formData, customer_pix_fixed: parseFloat(e.target.value) || 0 })}
                        />
                        <DollarSign className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Lucro = {formData.customer_pix_percentage}% + R$ {formData.customer_pix_fixed.toFixed(2)} - {formData.gateway_pix_percentage}% - R$ {formData.gateway_pix_fixed.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              {/* Customer Credit Card */}
              <Card className="admin-card">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="admin-icon-sm bg-emerald-500">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Cartão de Crédito</CardTitle>
                      <CardDescription className="text-xs">Taxa por parcelamento cobrada do cliente</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[350px] pr-4">
                    <Accordion type="single" collapsible className="w-full space-y-2">
                      {INSTALLMENTS.map((inst) => {
                        const customerPerc = (formData as any)[`customer_credit_${inst.key}_percentage`] || 0;
                        const customerFixed = (formData as any)[`customer_credit_${inst.key}_fixed`] || 0;
                        const gatewayPerc = (formData as any)[`gateway_credit_${inst.key}_percentage`] || 0;
                        const gatewayFixed = (formData as any)[`gateway_credit_${inst.key}_fixed`] || 0;
                        const profitPerc = customerPerc - gatewayPerc;
                        const profitFixed = customerFixed - gatewayFixed;
                        
                        return (
                          <AccordionItem key={`customer-${inst.key}`} value={inst.key} className="border rounded-lg px-3">
                            <AccordionTrigger className="hover:no-underline py-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{inst.label}</span>
                                <Badge variant="outline" className="text-xs">
                                  {customerPerc}% + R$ {customerFixed?.toFixed(2)}
                                </Badge>
                                <Badge className={`text-xs ${profitPerc >= 0 ? 'bg-emerald-500' : 'bg-destructive'}`}>
                                  Lucro: {profitPerc >= 0 ? '+' : ''}{profitPerc.toFixed(2)}% {profitFixed >= 0 ? '+' : ''} R$ {profitFixed.toFixed(2)}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs">Taxa (%)</Label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="pr-8 h-9 text-sm"
                                      value={(formData as any)[`customer_credit_${inst.key}_percentage`]}
                                      onChange={(e) => setFormData({ 
                                        ...formData, 
                                        [`customer_credit_${inst.key}_percentage`]: parseFloat(e.target.value) || 0 
                                      })}
                                    />
                                    <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Taxa Fixa (R$)</Label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="pr-8 h-9 text-sm"
                                      value={(formData as any)[`customer_credit_${inst.key}_fixed`]}
                                      onChange={(e) => setFormData({ 
                                        ...formData, 
                                        [`customer_credit_${inst.key}_fixed`]: parseFloat(e.target.value) || 0 
                                      })}
                                    />
                                    <DollarSign className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Ticket Fees Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-purple-500 rounded-full" />
              <h3 className="text-lg font-semibold">Taxas de Ingressos</h3>
              <Badge className="text-xs bg-purple-500">Comissão Moonky</Badge>
            </div>
            
            <Card className="admin-card max-w-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="admin-icon-sm bg-purple-500">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Comissão por Ingresso</CardTitle>
                    <CardDescription className="text-xs">Valor retido pela Moonky por ingresso vendido</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Comissão (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        className="pr-8 h-10"
                        value={formData.customer_ticket_percentage}
                        onChange={(e) => setFormData({ ...formData, customer_ticket_percentage: parseFloat(e.target.value) || 0 })}
                      />
                      <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Valor Mínimo (R$)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        className="pr-8 h-10"
                        value={formData.customer_ticket_minimum}
                        onChange={(e) => setFormData({ ...formData, customer_ticket_minimum: parseFloat(e.target.value) || 0 })}
                      />
                      <DollarSign className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Será cobrado o maior valor entre {formData.customer_ticket_percentage}% do ingresso ou R$ {formData.customer_ticket_minimum.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveFees} disabled={saving} size="lg" className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card className="admin-card">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="admin-icon-sm">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Relatório Consolidado</CardTitle>
                    <CardDescription className="text-xs">Visão geral das transações</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {/* Mobile Layout - Cards */}
              <div className="block md:hidden space-y-3">
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-sm">Vendas Brutas</span>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {formatCurrency(summary.totalProductSales + summary.totalTicketSales)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Produtos</span>
                      <span className="font-medium">{formatCurrency(summary.totalProductSales)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Ingressos</span>
                      <span className="font-medium">{formatCurrency(summary.totalTicketSales)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-sm">Custo Gateway</span>
                    <Badge variant="destructive" className="text-xs font-semibold">
                      {formatCurrency(summary.totalGatewayCost)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Produtos</span>
                      <span className="font-medium text-destructive">{formatCurrency(summary.totalGatewayCost)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Ingressos</span>
                      <span className="font-medium">-</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-sm">Receita Moonky</span>
                    <Badge className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600">
                      {formatCurrency(summary.totalMoonkyRevenue)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Produtos</span>
                      <span className="font-medium text-emerald-500">{formatCurrency(summary.moonkyProductRevenue)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Ingressos</span>
                      <span className="font-medium text-emerald-500">{formatCurrency(summary.moonkyTicketRevenue)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-sm">Repasse Estabelecimentos</span>
                    <Badge className="text-xs font-bold bg-primary">
                      {formatCurrency(summary.establishmentPayout)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Produtos</span>
                      <span className="font-medium">{formatCurrency(summary.totalProductSales - summary.totalGatewayCost)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Ingressos</span>
                      <span className="font-medium">{formatCurrency(summary.totalTicketSales)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout - Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Métrica</TableHead>
                      <TableHead className="text-right">Produtos</TableHead>
                      <TableHead className="text-right">Ingressos</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Vendas Brutas</TableCell>
                      <TableCell className="text-right">{formatCurrency(summary.totalProductSales)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(summary.totalTicketSales)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(summary.totalProductSales + summary.totalTicketSales)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Custo Gateway</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(summary.totalGatewayCost)}</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">{formatCurrency(summary.totalGatewayCost)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Receita Moonky</TableCell>
                      <TableCell className="text-right text-emerald-500">{formatCurrency(summary.moonkyProductRevenue)}</TableCell>
                      <TableCell className="text-right text-emerald-500">{formatCurrency(summary.moonkyTicketRevenue)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-500">{formatCurrency(summary.totalMoonkyRevenue)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold">Repasse Estabelecimentos</TableCell>
                      <TableCell className="text-right">{formatCurrency(summary.totalProductSales - summary.totalGatewayCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(summary.totalTicketSales)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(summary.establishmentPayout)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-6 mt-4">
          <Card className="admin-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="admin-icon-sm">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Histórico de Alterações</CardTitle>
                  <CardDescription className="text-xs">Registro de todas as modificações nas taxas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {feeLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">Nenhuma alteração registrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feeLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                        <div className="admin-icon-sm bg-muted">
                          <Settings className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{log.field_changed}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="text-destructive">{log.old_value?.toFixed(2)}</span>
                            <span>→</span>
                            <span className="text-emerald-500">{log.new_value?.toFixed(2)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.changed_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}