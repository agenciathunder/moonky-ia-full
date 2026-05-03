import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { 
  Building2, Plus, Pencil, Loader2, Users, Package, 
  ShoppingCart, DollarSign, Eye, Trash2, LayoutDashboard,
  CreditCard, Ticket, Calendar, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, ArrowUpRight, ArrowDownRight, UsersRound, Wallet, Receipt,
  Activity, Globe
} from "lucide-react";
import { SidebarProvider, SidebarTrigger, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import moonkyLogo from "@/assets/moonky-logo.png";
import UserManagement from "@/components/admin/UserManagement";
import { WithdrawalManagement } from "@/components/admin/WithdrawalManagement";
import MasterFinance from "@/components/admin/MasterFinance";
import PaymentControl from "@/components/admin/PaymentControl";
import LogsAnalytics from "@/components/admin/LogsAnalytics";
import LandingPageBuilder from "@/components/admin/LandingPageBuilder";
import { PlatformLogo } from "@/components/PlatformLogo";

interface Establishment {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  plan_id: string | null;
  cnpj_cpf: string | null;
  email: string | null;
  status: string | null;
  due_date: string | null;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_cycle: string;
  is_active: boolean;
  has_virtual_store: boolean;
  has_catalog_only: boolean;
  has_pdv: boolean;
  has_events: boolean;
  has_financial: boolean;
  has_service_notes: boolean;
  has_reports: boolean;
  has_overview: boolean;
  has_products: boolean;
  has_brands: boolean;
  has_categories: boolean;
  has_banners: boolean;
  has_coupons: boolean;
  has_orders: boolean;
  has_customers: boolean;
  has_settings: boolean;
  has_wallet: boolean;
  max_products: number;
  max_categories: number;
  max_brands: number;
  // Landing page fields
  show_on_landing: boolean;
  promo_price: number | null;
  promo_period: string | null;
  is_featured: boolean;
  landing_features: string[];
  cta_text: string | null;
  cta_link: string | null;
}

const AdminMaster = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Establishment dialog
  const [isEstDialogOpen, setIsEstDialogOpen] = useState(false);
  const [editingEstablishment, setEditingEstablishment] = useState<Establishment | null>(null);
  const [estForm, setEstForm] = useState({
    name: "",
    slug: "",
    description: "",
    logo_url: "",
    email: "",
    password: "",
    cnpj_cpf: "",
    plan_id: "",
    status: "active",
    due_date: ""
  });

  // Plan dialog
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: 0,
    billing_cycle: "monthly",
    is_active: true,
    has_virtual_store: true,
    has_catalog_only: false,
    has_pdv: false,
    has_events: false,
    has_financial: false,
    has_service_notes: false,
    has_reports: false,
    has_overview: true,
    has_products: true,
    has_brands: true,
    has_categories: true,
    has_banners: true,
    has_coupons: true,
    has_orders: true,
    has_customers: true,
    has_settings: true,
    has_wallet: false,
    max_products: 50,
    max_categories: 10,
    max_brands: 10,
    // Landing page fields
    show_on_landing: false,
    promo_price: null as number | null,
    promo_period: "",
    is_featured: false,
    landing_features: [] as string[],
    cta_text: "",
    cta_link: ""
  });

  // Stats
  const [stats, setStats] = useState({
    totalEstablishments: 0,
    activeEstablishments: 0,
    totalUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    ticketRevenue: 0,
    ticketSalesTotal: 0,
    totalOrders: 0
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({ 
        title: "Acesso negado", 
        description: "Apenas administradores master podem acessar.", 
        variant: "destructive" 
      });
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load establishments with plan info
      const { data: estData } = await supabase
        .from("establishments")
        .select("*, plans:plan_id(price)")
        .order("created_at", { ascending: false });
      
      if (estData) setEstablishments(estData as Establishment[]);

      // Load plans
      const { data: plansData } = await supabase
        .from("plans")
        .select("*")
        .order("price", { ascending: true });
      
      if (plansData) setPlans(plansData as Plan[]);

      // Load stats - fetch all data in parallel
      const [ordersRes, profilesRes, ticketSalesRes] = await Promise.all([
        supabase.from("orders").select("total, payment_method, status"),
        supabase.from("profiles").select("id, establishment_id"),
        supabase.from("ticket_sales").select("total_price, payment_status, quantity, fee_amount, subtotal")
      ]);

      // Calculate active establishments (status = 'active')
      const activeEstablishments = estData?.filter(e => e.status === 'active') || [];
      const activeEstCount = activeEstablishments.length;

      // Calculate monthly revenue from subscriptions (sum of each active establishment's plan price)
      const monthlyRevenue = activeEstablishments.reduce((sum, est: any) => {
        const planPrice = est.plans?.price ? Number(est.plans.price) : 0;
        return sum + planPrice;
      }, 0);
      
      // Calculate total store sales (only from delivered orders)
      const deliveredOrders = ordersRes.data?.filter(o => (o as any).status === 'delivered') || [];
      const totalRevenue = deliveredOrders.reduce((sum, order) => {
        return sum + (Number(order.total) || 0);
      }, 0);

      // Calculate ticket sales metrics from completed ticket sales
      const paidTickets = ticketSalesRes.data?.filter(t => 
        t.payment_status === 'paid' || t.payment_status === 'completed'
      ) || [];
      
      // Total ticket sales revenue (subtotal - what establishments earned)
      const ticketSalesTotal = paidTickets.reduce((sum, ticket) => {
        return sum + (Number(ticket.subtotal) || 0);
      }, 0);
      
      // Commission revenue (fee_amount - what Moonky earns)
      const ticketRevenue = paidTickets.reduce((sum, ticket) => {
        return sum + (Number(ticket.fee_amount) || 0);
      }, 0);

      // Calculate total users across all establishments
      const totalUsers = profilesRes.data?.length || 0;

      setStats({
        totalEstablishments: estData?.length || 0,
        activeEstablishments: activeEstCount,
        totalUsers,
        totalRevenue,
        monthlyRevenue,
        ticketRevenue,
        ticketSalesTotal,
        totalOrders: ordersRes.data?.length || 0
      });

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // Establishment handlers
  const handleSaveEstablishment = async () => {
    if (!estForm.name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    const slug = estForm.slug.trim() || generateSlug(estForm.name);

    try {
      if (editingEstablishment) {
        // Update existing establishment
        const { error } = await supabase
          .from("establishments")
          .update({
            name: estForm.name,
            slug,
            description: estForm.description || null,
            logo_url: estForm.logo_url || null,
            email: estForm.email || null,
            cnpj_cpf: estForm.cnpj_cpf || null,
            plan_id: estForm.plan_id || null,
            status: estForm.status,
            due_date: estForm.due_date || null,
            is_active: estForm.status === 'active'
          })
          .eq("id", editingEstablishment.id);

        if (error) throw error;

        // Update password if provided
        if (estForm.password && estForm.password.trim()) {
          const { data: pwdData, error: pwdError } = await supabase.functions.invoke("update-establishment-password", {
            body: {
              establishment_id: editingEstablishment.id,
              new_password: estForm.password
            }
          });

          if (pwdError) throw pwdError;
          if (pwdData?.error) throw new Error(pwdData.error);
          
          toast({ title: "Estabelecimento e senha atualizados!" });
        } else {
          toast({ title: "Estabelecimento atualizado!" });
        }
      } else {
        // Create new establishment via edge function
        if (!estForm.email || !estForm.password) {
          toast({ title: "Erro", description: "Email e senha são obrigatórios para novo estabelecimento", variant: "destructive" });
          return;
        }

        const { data, error } = await supabase.functions.invoke("create-establishment", {
          body: {
            name: estForm.name,
            slug,
            description: estForm.description || null,
            logo_url: estForm.logo_url || null,
            email: estForm.email,
            password: estForm.password,
            cnpj_cpf: estForm.cnpj_cpf || null,
            plan_id: estForm.plan_id || null,
            status: estForm.status,
            due_date: estForm.due_date || null
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast({ title: "Estabelecimento criado com sucesso!" });
      }

      setIsEstDialogOpen(false);
      resetEstForm();
      loadData();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const resetEstForm = () => {
    setEstForm({
      name: "",
      slug: "",
      description: "",
      logo_url: "",
      email: "",
      password: "",
      cnpj_cpf: "",
      plan_id: "",
      status: "active",
      due_date: ""
    });
    setEditingEstablishment(null);
  };

  const openEditEstDialog = (est: Establishment) => {
    setEditingEstablishment(est);
    setEstForm({
      name: est.name,
      slug: est.slug,
      description: est.description || "",
      logo_url: est.logo_url || "",
      email: est.email || "",
      password: "",
      cnpj_cpf: est.cnpj_cpf || "",
      plan_id: est.plan_id || "",
      status: est.status || "active",
      due_date: est.due_date || ""
    });
    setIsEstDialogOpen(true);
  };

  const handleDeleteEstablishment = async (est: Establishment) => {
    try {
      const { error } = await supabase.rpc("delete_establishment_cascade", {
        _establishment_id: est.id,
      });

      if (error) throw error;

      toast({ 
        title: "Estabelecimento excluído", 
        description: `${est.name} foi removido permanentemente.` 
      });
      loadData();
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Erro ao excluir", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  // Plan handlers
  const handleSavePlan = async () => {
    if (!planForm.name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    try {
      if (editingPlan) {
        const { error } = await supabase
          .from("plans")
          .update(planForm)
          .eq("id", editingPlan.id);

        if (error) throw error;
        toast({ title: "Plano atualizado!" });
      } else {
        const { error } = await supabase
          .from("plans")
          .insert(planForm);

        if (error) throw error;
        toast({ title: "Plano criado!" });
      }

      setIsPlanDialogOpen(false);
      resetPlanForm();
      loadData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      name: "",
      description: "",
      price: 0,
      billing_cycle: "monthly",
      is_active: true,
      has_virtual_store: true,
      has_catalog_only: false,
      has_pdv: false,
      has_events: false,
      has_financial: false,
      has_service_notes: false,
      has_reports: false,
      has_overview: true,
      has_products: true,
      has_brands: true,
      has_categories: true,
      has_banners: true,
      has_coupons: true,
      has_orders: true,
      has_customers: true,
      has_settings: true,
      has_wallet: false,
      max_products: 50,
      max_categories: 10,
      max_brands: 10,
      show_on_landing: false,
      promo_price: null,
      promo_period: "",
      is_featured: false,
      landing_features: [],
      cta_text: "",
      cta_link: ""
    });
    setEditingPlan(null);
  };

  const openEditPlanDialog = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      billing_cycle: plan.billing_cycle,
      is_active: plan.is_active,
      has_virtual_store: plan.has_virtual_store,
      has_catalog_only: plan.has_catalog_only,
      has_pdv: plan.has_pdv,
      has_events: plan.has_events,
      has_financial: plan.has_financial,
      has_service_notes: plan.has_service_notes,
      has_reports: plan.has_reports,
      has_overview: plan.has_overview ?? true,
      has_products: plan.has_products ?? true,
      has_brands: plan.has_brands ?? true,
      has_categories: plan.has_categories ?? true,
      has_banners: plan.has_banners ?? true,
      has_coupons: plan.has_coupons ?? true,
      has_orders: plan.has_orders ?? true,
      has_customers: plan.has_customers ?? true,
      has_settings: plan.has_settings ?? true,
      has_wallet: plan.has_wallet ?? false,
      max_products: plan.max_products,
      max_categories: plan.max_categories,
      max_brands: plan.max_brands,
      show_on_landing: plan.show_on_landing ?? false,
      promo_price: plan.promo_price,
      promo_period: plan.promo_period || "",
      is_featured: plan.is_featured ?? false,
      landing_features: plan.landing_features || [],
      cta_text: plan.cta_text || "",
      cta_link: plan.cta_link || ""
    });
    setIsPlanDialogOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium"><CheckCircle2 className="w-3 h-3 mr-1" />Ativo</Badge>;
      case 'suspended':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium"><AlertCircle className="w-3 h-3 mr-1" />Suspenso</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-medium"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="secondary" className="font-medium">Indefinido</Badge>;
    }
  };

  const getPlanName = (planId: string | null) => {
    if (!planId) return "Sem plano";
    const plan = plans.find(p => p.id === planId);
    return plan?.name || "Desconhecido";
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "establishments", label: "Estabelecimentos", icon: Building2 },
    { id: "finance", label: "Financeiro", icon: DollarSign },
    { id: "payments", label: "Mensalidades", icon: Receipt },
    { id: "withdrawals", label: "Saques", icon: Wallet },
    { id: "users", label: "Usuários", icon: UsersRound },
    { id: "plans", label: "Planos", icon: CreditCard },
    { id: "landing-builder", label: "Landing Page", icon: Globe },
    { id: "logs", label: "Logs & Analytics", icon: Activity },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/20">
        <Sidebar className="border-r border-border/40 bg-card">
          <SidebarContent className="pt-4">
            {/* Logo */}
            <div className="px-4 mb-6 flex items-center justify-start">
              <PlatformLogo className="h-8 w-auto" />
            </div>
            <SidebarMenu className="px-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    isActive={activeTab === item.id}
                    className={`rounded-lg transition-all ${
                      activeTab === item.id 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border/40 bg-card/80 backdrop-blur-sm flex items-center px-4 md:px-6 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              <h2 className="text-base md:text-lg font-semibold text-foreground">
                {menuItems.find(m => m.id === activeTab)?.label}
              </h2>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {!loading && activeTab === "dashboard" && (
              <div className="space-y-4 md:space-y-6">
                {/* Main Stats - Full width on mobile */}
                <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-card/50 border-border/40">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Estabelecimentos</CardTitle>
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.totalEstablishments}</div>
                      <p className="text-[11px] md:text-xs text-muted-foreground mt-1">Cadastrados na plataforma</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border/40">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Estabelecimentos Ativos</CardTitle>
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl md:text-3xl font-bold text-emerald-600">{stats.activeEstablishments}</div>
                      <p className="text-[11px] md:text-xs text-muted-foreground mt-1">Com assinatura ativa</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border/40">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Usuários</CardTitle>
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.totalUsers}</div>
                      <p className="text-[11px] md:text-xs text-muted-foreground mt-1">Total em todas as lojas</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border/40">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Vendas Lojas</CardTitle>
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl md:text-3xl font-bold text-foreground">
                        R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[11px] md:text-xs text-muted-foreground mt-1">{stats.totalOrders} pedidos (Online + PDV)</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Revenue Cards */}
                <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
                  <Card className="bg-card/50 border-border/40">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Faturamento Mensalidades</CardTitle>
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl md:text-3xl font-bold text-foreground">
                        R$ {stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[11px] md:text-xs text-muted-foreground mt-1">Soma dos planos ativos ({stats.activeEstablishments} assinaturas)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border/40">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Faturamento Ingressos</CardTitle>
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Ticket className="h-4 w-4 text-emerald-500" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl md:text-3xl font-bold text-foreground">
                        R$ {stats.ticketSalesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[11px] md:text-xs text-muted-foreground mt-1">Vendas totais de ingressos (todos eventos)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border/40">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Comissão Ingressos</CardTitle>
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Wallet className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl md:text-3xl font-bold text-foreground">
                        R$ {stats.ticketRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[11px] md:text-xs text-muted-foreground mt-1">10% ou mín. R$2,50/ingresso (receita Moonky)</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Establishments */}
                <Card className="bg-card/50 border-border/40">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Estabelecimentos Recentes</CardTitle>
                      <CardDescription>Últimos cadastrados na plataforma</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("establishments")} className="text-xs">
                      Ver todos
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {establishments.slice(0, 5).map((est) => (
                        <div key={est.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {est.logo_url ? (
                              <img src={est.logo_url} alt={est.name} className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{est.name}</p>
                              <p className="text-xs text-muted-foreground">{getPlanName(est.plan_id)}</p>
                            </div>
                          </div>
                          {getStatusBadge(est.status)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!loading && activeTab === "finance" && (
              <MasterFinance />
            )}

            {!loading && activeTab === "payments" && (
              <PaymentControl 
                establishments={establishments} 
                plans={plans} 
                onRefresh={loadData} 
              />
            )}

            {!loading && activeTab === "withdrawals" && (
              <WithdrawalManagement />
            )}

            {!loading && activeTab === "establishments" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h3 className="text-base font-semibold">Gerenciar Estabelecimentos</h3>
                  <Button 
                    onClick={() => { resetEstForm(); setIsEstDialogOpen(true); }} 
                    size="sm"
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Novo
                  </Button>
                </div>

                {/* Desktop Table */}
                <Card className="bg-card/50 border-border/40 hidden md:block">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Estabelecimento</TableHead>
                          <TableHead>CNPJ/CPF</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {establishments.map((est) => (
                          <TableRow key={est.id}>
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
                            <TableCell className="text-muted-foreground">
                              {est.cnpj_cpf || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getPlanName(est.plan_id)}</Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(est.status)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {est.due_date ? format(new Date(est.due_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(`/loja/${est.slug}`, '_blank')}
                                  title="Ver loja"
                                  className="h-8 w-8"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => openEditEstDialog(est)}
                                  title="Editar"
                                  className="h-8 w-8"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      title="Excluir"
                                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir estabelecimento?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. O estabelecimento <strong>{est.name}</strong> será 
                                        removido permanentemente, incluindo todos os produtos, pedidos, banners e configurações. 
                                        A URL da loja deixará de funcionar.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteEstablishment(est)}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        Excluir permanentemente
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {establishments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              Nenhum estabelecimento cadastrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {establishments.length === 0 ? (
                    <Card className="bg-card/50 border-border/40">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        Nenhum estabelecimento cadastrado
                      </CardContent>
                    </Card>
                  ) : (
                    establishments.map((est) => (
                      <Card key={est.id} className="bg-card/50 border-border/40">
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
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm truncate">{est.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{est.email || "-"}</p>
                                </div>
                                {getStatusBadge(est.status)}
                              </div>
                              
                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Plano</p>
                                  <p className="font-medium">{getPlanName(est.plan_id)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Vencimento</p>
                                  <p className="font-medium">
                                    {est.due_date ? format(new Date(est.due_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                                  </p>
                                </div>
                                {est.cnpj_cpf && (
                                  <div className="col-span-2">
                                    <p className="text-muted-foreground">CNPJ/CPF</p>
                                    <p className="font-medium">{est.cnpj_cpf}</p>
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 flex items-center gap-1 border-t border-border/40 pt-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`/loja/${est.slug}`, '_blank')}
                                  className="h-8 flex-1 text-xs"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  Ver Loja
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => openEditEstDialog(est)}
                                  className="h-8 flex-1 text-xs"
                                >
                                  <Pencil className="w-3.5 h-3.5 mr-1" />
                                  Editar
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="max-w-[90vw] rounded-lg">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir estabelecimento?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. O estabelecimento <strong>{est.name}</strong> será 
                                        removido permanentemente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                                      <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteEstablishment(est)}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Establishment Dialog */}
                <Dialog open={isEstDialogOpen} onOpenChange={setIsEstDialogOpen}>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingEstablishment ? "Editar Estabelecimento" : "Novo Estabelecimento"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label>Nome *</Label>
                          <Input 
                            value={estForm.name} 
                            onChange={(e) => {
                              setEstForm({
                                ...estForm, 
                                name: e.target.value,
                                slug: estForm.slug || generateSlug(e.target.value)
                              });
                            }} 
                            placeholder="Nome do estabelecimento"
                          />
                        </div>
                        <div className={editingEstablishment ? "col-span-2" : ""}>
                          <Label>Email *</Label>
                          <Input 
                            type="email"
                            value={estForm.email} 
                            onChange={(e) => setEstForm({...estForm, email: e.target.value})} 
                            placeholder="email@exemplo.com"
                            disabled={!!editingEstablishment}
                          />
                        </div>
                        <div className={editingEstablishment ? "col-span-2" : ""}>
                          <Label>{editingEstablishment ? "Nova Senha (deixe vazio para manter)" : "Senha *"}</Label>
                          <Input 
                            type="password"
                            value={estForm.password} 
                            onChange={(e) => setEstForm({...estForm, password: e.target.value})} 
                            placeholder={editingEstablishment ? "••••••••" : "Senha de acesso"}
                          />
                          {editingEstablishment && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Preencha apenas se quiser alterar a senha atual
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>CNPJ/CPF</Label>
                          <Input 
                            value={estForm.cnpj_cpf} 
                            onChange={(e) => setEstForm({...estForm, cnpj_cpf: e.target.value})} 
                            placeholder="00.000.000/0000-00"
                          />
                        </div>
                        <div>
                          <Label>Slug (URL)</Label>
                          <Input 
                            value={estForm.slug} 
                            onChange={(e) => setEstForm({...estForm, slug: e.target.value})} 
                            placeholder="nome-da-loja"
                          />
                        </div>
                        <div>
                          <Label>Plano</Label>
                          <Select value={estForm.plan_id} onValueChange={(v) => setEstForm({...estForm, plan_id: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um plano" />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.name} - R${plan.price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Select value={estForm.status} onValueChange={(v) => setEstForm({...estForm, status: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Ativo</SelectItem>
                              <SelectItem value="suspended">Suspenso</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Vencimento</Label>
                          <Input 
                            type="date"
                            value={estForm.due_date} 
                            onChange={(e) => setEstForm({...estForm, due_date: e.target.value})} 
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea 
                          value={estForm.description} 
                          onChange={(e) => setEstForm({...estForm, description: e.target.value})} 
                          placeholder="Descrição breve"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Logo</Label>
                        <ImageUpload 
                          currentImageUrl={estForm.logo_url} 
                          onImageUploaded={(url) => setEstForm({...estForm, logo_url: url})} 
                          bucketName="establishment-logos" 
                        />
                      </div>
                      <Button onClick={handleSaveEstablishment} className="w-full">
                        {editingEstablishment ? "Salvar Alterações" : "Criar Estabelecimento"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {!loading && activeTab === "plans" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-base font-semibold">Gerenciar Planos</h3>
                  <Button onClick={() => { resetPlanForm(); setIsPlanDialogOpen(true); }} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Plano
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => (
                    <Card key={plan.id} className={`bg-card/50 border-border/40 ${!plan.is_active ? "opacity-60" : ""}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{plan.name}</CardTitle>
                          <Button variant="ghost" size="icon" onClick={() => openEditPlanDialog(plan)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-2xl font-bold text-foreground">
                          R$ {Number(plan.price).toFixed(2)}
                          <span className="text-sm font-normal text-muted-foreground">/mês</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            {plan.has_virtual_store ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/50" />}
                            <span className={plan.has_virtual_store ? "text-foreground" : "text-muted-foreground"}>Loja Virtual</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {plan.has_pdv ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/50" />}
                            <span className={plan.has_pdv ? "text-foreground" : "text-muted-foreground"}>PDV/Caixa</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {plan.has_events ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/50" />}
                            <span className={plan.has_events ? "text-foreground" : "text-muted-foreground"}>Eventos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {plan.has_financial ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/50" />}
                            <span className={plan.has_financial ? "text-foreground" : "text-muted-foreground"}>Financeiro</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {plan.has_reports ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/50" />}
                            <span className={plan.has_reports ? "text-foreground" : "text-muted-foreground"}>Relatórios</span>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-border/40 text-xs text-muted-foreground space-y-1">
                          <p>Até {plan.max_products} produtos</p>
                          <p>Até {plan.max_categories} categorias</p>
                          <p>Até {plan.max_brands} marcas</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Plan Dialog */}
                <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPlan ? "Editar Plano" : "Novo Plano"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label>Nome *</Label>
                          <Input 
                            value={planForm.name} 
                            onChange={(e) => setPlanForm({...planForm, name: e.target.value})} 
                            placeholder="Nome do plano"
                          />
                        </div>
                        <div>
                          <Label>Preço (R$)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={planForm.price} 
                            onChange={(e) => setPlanForm({...planForm, price: parseFloat(e.target.value) || 0})} 
                          />
                        </div>
                        <div>
                          <Label>Ciclo</Label>
                          <Select value={planForm.billing_cycle} onValueChange={(v) => setPlanForm({...planForm, billing_cycle: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Mensal</SelectItem>
                              <SelectItem value="yearly">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea 
                          value={planForm.description} 
                          onChange={(e) => setPlanForm({...planForm, description: e.target.value})} 
                          placeholder="Descrição do plano"
                          rows={2}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label>Tipo de Loja</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Loja Virtual</span>
                            <Switch 
                              checked={planForm.has_virtual_store} 
                              onCheckedChange={(v) => setPlanForm({...planForm, has_virtual_store: v, has_catalog_only: !v})} 
                            />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Apenas Catálogo</span>
                            <Switch 
                              checked={planForm.has_catalog_only} 
                              onCheckedChange={(v) => setPlanForm({...planForm, has_catalog_only: v, has_virtual_store: !v})} 
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {planForm.has_catalog_only 
                            ? "Catálogo: exibe produtos sem opção de compra online" 
                            : "Loja Virtual: vendas online com carrinho e checkout"
                          }
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label>Funcionalidades do Painel Admin</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Visão Geral</span>
                            <Switch checked={planForm.has_overview} onCheckedChange={(v) => setPlanForm({...planForm, has_overview: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Caixa (PDV)</span>
                            <Switch checked={planForm.has_pdv} onCheckedChange={(v) => setPlanForm({...planForm, has_pdv: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Produtos</span>
                            <Switch checked={planForm.has_products} onCheckedChange={(v) => setPlanForm({...planForm, has_products: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Marcas</span>
                            <Switch checked={planForm.has_brands} onCheckedChange={(v) => setPlanForm({...planForm, has_brands: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Categorias</span>
                            <Switch checked={planForm.has_categories} onCheckedChange={(v) => setPlanForm({...planForm, has_categories: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Eventos</span>
                            <Switch checked={planForm.has_events} onCheckedChange={(v) => setPlanForm({...planForm, has_events: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Banners</span>
                            <Switch checked={planForm.has_banners} onCheckedChange={(v) => setPlanForm({...planForm, has_banners: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Cupons</span>
                            <Switch checked={planForm.has_coupons} onCheckedChange={(v) => setPlanForm({...planForm, has_coupons: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Pedidos</span>
                            <Switch checked={planForm.has_orders} onCheckedChange={(v) => setPlanForm({...planForm, has_orders: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Clientes</span>
                            <Switch checked={planForm.has_customers} onCheckedChange={(v) => setPlanForm({...planForm, has_customers: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Configurações</span>
                            <Switch checked={planForm.has_settings} onCheckedChange={(v) => setPlanForm({...planForm, has_settings: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Carteira</span>
                            <Switch 
                              checked={planForm.has_wallet} 
                              onCheckedChange={(v) => setPlanForm({...planForm, has_wallet: v})} 
                              disabled={!planForm.has_virtual_store}
                            />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-primary/10 border border-primary/20">
                            <span className="text-sm font-medium">Plano Ativo</span>
                            <Switch checked={planForm.is_active} onCheckedChange={(v) => setPlanForm({...planForm, is_active: v})} />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Carteira só está disponível para planos com Loja Virtual ativa.
                        </p>
                      </div>

                      {/* Funcionalidades Avançadas */}
                      <div className="space-y-3">
                        <Label>Funcionalidades Avançadas</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Financeiro</span>
                            <Switch checked={planForm.has_financial} onCheckedChange={(v) => setPlanForm({...planForm, has_financial: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Relatórios</span>
                            <Switch checked={planForm.has_reports} onCheckedChange={(v) => setPlanForm({...planForm, has_reports: v})} />
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">Nota de Serviço</span>
                            <Switch checked={planForm.has_service_notes} onCheckedChange={(v) => setPlanForm({...planForm, has_service_notes: v})} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Max Produtos</Label>
                          <Input 
                            type="number"
                            value={planForm.max_products} 
                            onChange={(e) => setPlanForm({...planForm, max_products: parseInt(e.target.value) || 0})} 
                          />
                        </div>
                        <div>
                          <Label>Max Categorias</Label>
                          <Input 
                            type="number"
                            value={planForm.max_categories} 
                            onChange={(e) => setPlanForm({...planForm, max_categories: parseInt(e.target.value) || 0})} 
                          />
                        </div>
                        <div>
                          <Label>Max Marcas</Label>
                          <Input 
                            type="number"
                            value={planForm.max_brands} 
                            onChange={(e) => setPlanForm({...planForm, max_brands: parseInt(e.target.value) || 0})} 
                          />
                        </div>
                      </div>

                      {/* Landing Page Section */}
                      <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold">Exibir na Landing Page</Label>
                          <Switch 
                            checked={planForm.show_on_landing} 
                            onCheckedChange={(v) => setPlanForm({...planForm, show_on_landing: v})} 
                          />
                        </div>
                        
                        {planForm.show_on_landing && (
                          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Destacar como "Mais Popular"</span>
                              <Switch 
                                checked={planForm.is_featured} 
                                onCheckedChange={(v) => setPlanForm({...planForm, is_featured: v})} 
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Preço Promocional (R$)</Label>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  placeholder="Ex: 49.99"
                                  value={planForm.promo_price ?? ""} 
                                  onChange={(e) => setPlanForm({...planForm, promo_price: e.target.value ? parseFloat(e.target.value) : null})} 
                                />
                              </div>
                              <div>
                                <Label>Período da Promoção</Label>
                                <Input 
                                  placeholder="Ex: nos 3 primeiros meses"
                                  value={planForm.promo_period} 
                                  onChange={(e) => setPlanForm({...planForm, promo_period: e.target.value})} 
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label>Texto do Botão (CTA)</Label>
                                <Input 
                                  placeholder="Ex: Começar agora"
                                  value={planForm.cta_text} 
                                  onChange={(e) => setPlanForm({...planForm, cta_text: e.target.value})} 
                                />
                              </div>
                              <div>
                                <Label>Link Externo do Botão</Label>
                                <Input 
                                  type="url"
                                  placeholder="https://exemplo.com/assinar"
                                  value={planForm.cta_link} 
                                  onChange={(e) => setPlanForm({...planForm, cta_link: e.target.value})} 
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label>Recursos (um por linha)</Label>
                              <Textarea 
                                placeholder="Loja virtual completa&#10;Gestão de pedidos&#10;Suporte por email"
                                rows={5}
                                value={planForm.landing_features.join("\n")} 
                                onChange={(e) => setPlanForm({
                                  ...planForm, 
                                  landing_features: e.target.value.split("\n").filter(f => f.trim())
                                })} 
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Cada linha será exibida como um item na lista de recursos do plano.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button onClick={handleSavePlan} className="w-full">
                        {editingPlan ? "Salvar Alterações" : "Criar Plano"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {activeTab === "users" && <UserManagement />}

            {activeTab === "logs" && <LogsAnalytics />}

            {activeTab === "landing-builder" && <LandingPageBuilder />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminMaster;
