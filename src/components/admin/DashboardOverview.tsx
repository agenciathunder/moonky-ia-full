import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  Ticket,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Store,
  CreditCard,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { useNumberVisibility } from "@/contexts/NumberVisibilityContext";

interface DashboardOverviewProps {
  establishmentId: string | null;
  isMasterAdmin: boolean;
  onNavigateToOrders: () => void;
  plan?: Record<string, any> | null;
}

interface DashboardStats {
  totalRevenue: number;
  onlineRevenue: number;
  pdvRevenue: number;
  ticketRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  hasTickets: boolean;
  revenueByDay: { date: string; value: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  lowStockProducts: { id: string; name: string; stock: number; image_url: string | null }[];
  ordersByStatus: { status: string; count: number }[];
  recentOrders: { id: string; total: number; status: string; created_at: string }[];
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))', '#f59e0b', '#ef4444', '#8b5cf6'];

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  out_for_delivery: 'Em Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado'
};

export const DashboardOverview = ({ 
  establishmentId, 
  isMasterAdmin,
  onNavigateToOrders,
  plan
}: DashboardOverviewProps) => {
  const { mask } = useNumberVisibility();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    onlineRevenue: 0,
    pdvRevenue: 0,
    ticketRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    hasTickets: false,
    revenueByDay: [],
    topProducts: [],
    lowStockProducts: [],
    ordersByStatus: [],
    recentOrders: []
  });

  useEffect(() => {
    loadDashboardData();
  }, [establishmentId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      let ordersQuery = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!isMasterAdmin && establishmentId) {
        ordersQuery = ordersQuery.eq("establishment_id", establishmentId);
      }
      
      const { data: ordersData } = await ordersQuery;
      const orders = ordersData || [];

      let productsQuery = supabase
        .from("products")
        .select("*")
        .order("stock", { ascending: true });
      
      if (!isMasterAdmin && establishmentId) {
        productsQuery = productsQuery.eq("establishment_id", establishmentId);
      }
      
      const { data: productsData } = await productsQuery;
      const products = productsData || [];

      let orderItemsQuery = supabase
        .from("order_items")
        .select("product_id, product_name, quantity, total_price, order_id");
      
      const { data: orderItemsData } = await orderItemsQuery;
      const orderItems = orderItemsData || [];

      let customersCount = 0;
      if (!isMasterAdmin && establishmentId) {
        const { data: orderUsers } = await supabase
          .from("orders")
          .select("user_id")
          .eq("establishment_id", establishmentId);
        
        if (orderUsers) {
          const uniqueUsers = new Set(orderUsers.map(o => o.user_id).filter(Boolean));
          customersCount = uniqueUsers.size;
        }
      } else {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: 'exact', head: true });
        customersCount = count || 0;
      }

      let ticketsQuery = supabase.from("ticket_sales").select("*");
      if (!isMasterAdmin && establishmentId) {
        const { data: events } = await supabase
          .from("events")
          .select("id")
          .eq("establishment_id", establishmentId);
        
        if (events && events.length > 0) {
          const eventIds = events.map(e => e.id);
          ticketsQuery = ticketsQuery.in("event_id", eventIds);
        }
      }
      const { data: ticketsData } = await ticketsQuery;
      const tickets = ticketsData || [];

      // Only count revenue from delivered orders (not cancelled or pending)
      const deliveredOrders = orders.filter(o => o.status === 'delivered');
      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      // PDV orders have payment_method starting with "PDV -"
      const pdvOrders = deliveredOrders.filter(o => o.payment_method?.startsWith('PDV -'));
      const onlineOrders = deliveredOrders.filter(o => !o.payment_method?.startsWith('PDV -'));
      const onlineRevenue = onlineOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const pdvRevenue = pdvOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      // Use subtotal (establishment net revenue) - excludes Moonky platform fees
      const paidTickets = tickets.filter(t => t.payment_status === 'paid' || t.payment_status === 'completed');
      const ticketRevenue = paidTickets.reduce((sum, t) => sum + (Number(t.subtotal) || 0), 0);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const revenueByDay = last7Days.map(date => {
        const dayOrders = orders.filter(o => o.created_at?.startsWith(date));
        const value = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        return { 
          date: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
          value 
        };
      });

      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      orderItems.forEach(item => {
        const key = item.product_id || item.product_name;
        if (!productSales[key]) {
          productSales[key] = { name: item.product_name, quantity: 0, revenue: 0 };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.total_price;
      });
      const topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      const lowStockProducts = products
        .filter(p => (p.stock || 0) <= 10 && p.active)
        .slice(0, 5);

      const statusCount: Record<string, number> = {};
      orders.forEach(o => {
        const status = o.status || 'pending';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      const ordersByStatus = Object.entries(statusCount).map(([status, count]) => ({
        status: statusLabels[status] || status,
        count
      }));

      const recentOrders = orders.slice(0, 5);

      setStats({
        totalRevenue,
        onlineRevenue,
        pdvRevenue,
        ticketRevenue,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalCustomers: customersCount,
        hasTickets: tickets.length > 0,
        revenueByDay,
        topProducts,
        lowStockProducts,
        ordersByStatus,
        recentOrders
      });

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
    return mask(formatted);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = stats.recentOrders.filter(o => o.status === 'pending').length;

  // Check plan features - master admin sees everything
  const hasEvents = isMasterAdmin || !plan || plan.has_events !== false;
  const hasPdv = isMasterAdmin || !plan || plan.has_pdv !== false;
  const hasOrders = isMasterAdmin || !plan || plan.has_orders !== false;
  const hasProducts = isMasterAdmin || !plan || plan.has_products !== false;
  const hasCustomers = isMasterAdmin || !plan || plan.has_customers !== false;

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
      {/* Quick Access - Orders */}
      <Card className="border border-border/40 bg-card">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="admin-icon-lg">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold">Acesso Rápido aos Pedidos</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {stats.totalOrders} pedidos • {pendingCount > 0 && (
                    <span className="text-amber-600">{pendingCount} pendentes</span>
                  )}
                </p>
              </div>
            </div>
            <Button onClick={onNavigateToOrders} className="w-full sm:w-auto">
              Ver Pedidos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Cards - responsive grid */}
      <div className={cn("grid gap-3 sm:gap-4 grid-cols-2", {
        "lg:grid-cols-4": hasEvents && hasPdv,
        "lg:grid-cols-3": (hasEvents && !hasPdv) || (!hasEvents && hasPdv),
        "lg:grid-cols-2": !hasEvents && !hasPdv,
      })}>
        <Card className="border border-border/40 bg-card">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm text-muted-foreground">Receita Total</span>
              <div className="admin-icon-sm">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-semibold">
              {formatCurrency(stats.totalRevenue + (hasEvents ? stats.ticketRevenue : 0))}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm text-muted-foreground">Receita Online</span>
              <div className="admin-icon-sm">
                <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-semibold">
              {formatCurrency(stats.onlineRevenue)}
            </p>
          </CardContent>
        </Card>

        {hasPdv && (
        <Card className="border border-border/40 bg-card">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm text-muted-foreground">Receita PDV</span>
              <div className="admin-icon-sm">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-semibold">
              {formatCurrency(stats.pdvRevenue)}
            </p>
          </CardContent>
        </Card>
        )}

        {hasEvents && (
        <Card className="border border-border/40 bg-card">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm text-muted-foreground">Ingressos</span>
              <div className="admin-icon-sm">
                <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-semibold">
              {formatCurrency(stats.ticketRevenue)}
            </p>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Secondary Stats - responsive grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-3">
        <Card className="border border-border/40 bg-card">
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="admin-icon shrink-0">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm text-muted-foreground">Pedidos</p>
              <p className="text-lg sm:text-xl font-semibold">{mask(String(stats.totalOrders))}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card">
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="admin-icon shrink-0">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm text-muted-foreground">Produtos</p>
              <p className="text-lg sm:text-xl font-semibold">{mask(String(stats.totalProducts))}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card">
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="admin-icon shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm text-muted-foreground">Clientes</p>
              <p className="text-lg sm:text-xl font-semibold">{mask(String(stats.totalCustomers))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="border border-border/40 bg-card">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base font-medium">Receita - Últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-2 sm:px-6">
            <div className="h-[180px] sm:h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueByDay}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card className="border border-border/40 bg-card">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base font-medium">Pedidos por Status</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-2 sm:px-6">
            <div className="h-[180px] sm:h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.ordersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                  >
                    {stats.ordersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mt-2">
              {stats.ordersByStatus.map((item, index) => (
                <div key={item.status} className="flex items-center gap-1.5 sm:gap-2 text-xs">
                  <div 
                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.status}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Section */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Top Products */}
        <Card className="border border-border/40 bg-card">
          <CardHeader className="pb-3 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base font-medium">Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 sm:px-6">
            {stats.topProducts.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">Nenhuma venda ainda</p>
            ) : (
              stats.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground w-4 sm:w-5">#{index + 1}</span>
                    <span className="text-xs sm:text-sm truncate">{product.name}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs sm:text-sm font-medium">{product.quantity} un</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="border border-border/40 bg-card">
          <CardHeader className="pb-3 px-3 sm:px-6">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm sm:text-base font-medium">Estoque Baixo</CardTitle>
              {stats.lowStockProducts.length > 0 && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-0 text-[10px] sm:text-xs">
                  {stats.lowStockProducts.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-3 sm:px-6">
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">Estoque em dia</p>
            ) : (
              stats.lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <Package className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-xs sm:text-sm truncate">{product.name}</span>
                  </div>
                  <Badge variant="secondary" className={cn(
                    "border-0 text-[10px] sm:text-xs shrink-0 ml-2",
                    product.stock <= 5 ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
                  )}>
                    {product.stock} un
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="border border-border/40 bg-card">
        <CardHeader className="pb-3 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-base font-medium">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {stats.recentOrders.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">Nenhum pedido ainda</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {stats.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">#{order.id.slice(0, 8)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-medium">{formatCurrency(order.total)}</p>
                    <Badge variant="secondary" className={cn(
                      "text-[10px] sm:text-xs border-0",
                      order.status === 'delivered' && "bg-emerald-500/10 text-emerald-600",
                      order.status === 'pending' && "bg-amber-500/10 text-amber-600",
                      order.status === 'cancelled' && "bg-red-500/10 text-red-600",
                      !['delivered', 'pending', 'cancelled'].includes(order.status) && "bg-primary/10 text-primary"
                    )}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};