import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, Package, Clock, CheckCircle2, Truck, XCircle, ChevronRight, ShoppingBag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  order_items: { id: string }[];
}

const Orders = () => {
  const navigate = useNavigate();
  const slug = useStoreSlug();
  const { user } = useAuth();
  const { establishment, settings } = useEstablishment();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const primaryColor = settings?.primary_color || "#3834ED";

  // Build store-specific paths
  const storeSlug = slug || establishment?.slug;
  const basePath = buildStorePath(storeSlug, '');
  const authPath = buildStorePath(storeSlug, '/auth');

  useEffect(() => {
    if (user) {
      fetchOrders();

      const channel = supabase
        .channel('user-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, total, created_at, order_items(id)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (date: string): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { bg: "bg-yellow-500/10", text: "text-yellow-600", icon: Clock, label: "Novo" },
      confirmed: { bg: "bg-blue-500/10", text: "text-blue-600", icon: CheckCircle2, label: "Confirmado" },
      preparing: { bg: "bg-orange-500/10", text: "text-orange-600", icon: Package, label: "Em produção" },
      ready: { bg: "bg-emerald-500/10", text: "text-emerald-600", icon: CheckCircle2, label: "Pronto" },
      delivering: { bg: "bg-purple-500/10", text: "text-purple-600", icon: Truck, label: "Saiu para entrega" },
      delivered: { bg: "bg-green-500/10", text: "text-green-600", icon: CheckCircle2, label: "Entregue" },
      cancelled: { bg: "bg-red-500/10", text: "text-red-600", icon: XCircle, label: "Cancelado" }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pb-24">
        <DynamicThemeStyles />
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Faça login</h2>
        <p className="text-muted-foreground text-center mb-6">
          Entre para ver seus pedidos
        </p>
        <Button 
          onClick={() => navigate(authPath)} 
          className="h-12 px-8"
          style={{ backgroundColor: primaryColor }}
        >
          Entrar
        </Button>
        <BottomNavigation />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <DynamicThemeStyles />
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent mx-auto mb-4"
            style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
          ></div>
          <p className="text-sm text-muted-foreground">Carregando pedidos...</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <DynamicThemeStyles />
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 touch-manipulation">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">Meus Pedidos</h1>
          <div className="w-10" />
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhum pedido</h2>
          <p className="text-muted-foreground text-center mb-6">
            Você ainda não fez nenhum pedido
          </p>
          <Button 
            onClick={() => navigate(basePath || '/')} 
            className="h-12 px-8"
            style={{ backgroundColor: primaryColor }}
          >
            Fazer primeiro pedido
          </Button>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <button
                key={order.id}
                onClick={() => navigate(`${basePath}/orders/${order.id}`)}
                className="w-full bg-card rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">Pedido #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${statusConfig.bg}`}>
                    <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.text}`} />
                    <span className={`text-xs font-medium ${statusConfig.text}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: primaryColor }}>{formatPrice(order.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};

export default Orders;
