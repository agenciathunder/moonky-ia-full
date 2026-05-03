import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, Package, MapPin, CreditCard, 
  Clock, CheckCircle2, Truck, XCircle, AlertCircle, FileText, MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import ServiceInvoice from "@/components/ServiceInvoice";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_id: string;
  product_name: string;
  product_image: string | null;
  specifications: Record<string, string> | null;
  products?: {
    name: string;
    image_url: string | null;
    brands: { name: string } | null;
    product_categories: { name: string } | null;
  } | null;
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number | null;
  discount: number | null;
  cash_amount: number | null;
  payment_method: string | null;
  delivery_address: any;
  notes: string | null;
  order_observations: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

const OrderDetails = () => {
  const { id } = useParams<{ id?: string }>();
  const slug = useStoreSlug();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings, establishment } = useEstablishment();
  const primaryColor = settings?.primary_color || "#3834ED";
  const ordersPath = buildStorePath(slug, '/orders');
  const authPath = buildStorePath(slug, '/auth');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  useEffect(() => {
    if (user && id) {
      fetchOrderDetails();

      // Subscribe to realtime updates for this specific order
      const channel = supabase
        .channel(`order-details-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${id}`
          },
          (payload) => {
            console.log('Order updated:', payload);
            // Update order state with new data
            setOrder(prev => prev ? { ...prev, ...payload.new } : null);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, id]);

  const fetchOrderDetails = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('id', id)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (orderError) throw orderError;
      
      if (!orderData) {
        setOrder(null);
        setLoading(false);
        return;
      }

      const productIds = orderData.order_items.map((item: any) => item.product_id);
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, image_url, brands(name), product_categories(name)')
        .in('id', productIds);

      const productsMap = new Map(productsData?.map((p: any) => [p.id, p]) || []);
      const orderWithProducts = {
        ...orderData,
        order_items: orderData.order_items.map((item: any) => ({
          ...item,
          products: productsMap.get(item.product_id) || null
        }))
      };

      setOrder(orderWithProducts as any);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do pedido.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!order || order.status !== 'pending') return;
    
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Pedido cancelado",
        description: "Seu pedido foi cancelado com sucesso.",
      });
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o pedido.",
        variant: "destructive"
      });
    } finally {
      setCancelling(false);
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
      pending: { 
        bg: "bg-yellow-500/10", 
        text: "text-yellow-600", 
        icon: Clock, 
        label: "Novo" 
      },
      confirmed: { 
        bg: "bg-blue-500/10", 
        text: "text-blue-600", 
        icon: CheckCircle2, 
        label: "Confirmado" 
      },
      preparing: { 
        bg: "bg-orange-500/10", 
        text: "text-orange-600", 
        icon: Package, 
        label: "Em produção" 
      },
      ready: { 
        bg: "bg-emerald-500/10", 
        text: "text-emerald-600", 
        icon: CheckCircle2, 
        label: "Pronto" 
      },
      delivering: { 
        bg: "bg-purple-500/10", 
        text: "text-purple-600", 
        icon: Truck, 
        label: "Saiu para entrega" 
      },
      delivered: { 
        bg: "bg-green-500/10", 
        text: "text-green-600", 
        icon: CheckCircle2, 
        label: "Entregue" 
      },
      cancelled: { 
        bg: "bg-red-500/10", 
        text: "text-red-600", 
        icon: XCircle, 
        label: "Cancelado" 
      }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pb-24">
        <DynamicThemeStyles />
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">Faça login para ver os detalhes.</p>
        <Button 
          onClick={() => navigate(authPath)} 
          className="mt-4 h-12 px-8"
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
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pb-24">
        <DynamicThemeStyles />
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Pedido não encontrado</h2>
        <p className="text-muted-foreground text-center mb-6">
          O pedido solicitado não existe ou foi removido.
        </p>
        <Button 
          onClick={() => navigate(ordersPath)} 
          className="h-12 px-8"
          style={{ backgroundColor: primaryColor }}
        >
          Ver meus pedidos
        </Button>
        <BottomNavigation />
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-background pb-24">
      <DynamicThemeStyles />
      {/* Header Mobile */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(ordersPath)} className="p-2 -ml-2 touch-manipulation">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">Pedido #{order.id.slice(0, 8)}</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Status Card */}
        <div className={`${statusConfig.bg} rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 ${statusConfig.bg} rounded-full`}>
              <StatusIcon className={`h-6 w-6 ${statusConfig.text}`} />
            </div>
            <div className="flex-1">
              <p className={`font-semibold text-lg ${statusConfig.text}`}>
                {statusConfig.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(order.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Itens do Pedido */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Package className="h-4 w-4" />
            Itens ({order.order_items.length})
          </h3>
          <div className="space-y-3">
            {order.order_items.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                    {(item.product_image || item.products?.image_url) ? (
                      <img
                        src={item.product_image || item.products?.image_url || ""}
                        alt={item.product_name || item.products?.name || "Produto"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.product_name || item.products?.name || `Produto`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity}x {formatPrice(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">
                    {formatPrice(item.total_price)}
                  </p>
                </div>
                {item.specifications && Object.keys(item.specifications).length > 0 && (
                  <div className="ml-[68px] flex flex-wrap gap-1">
                    {Object.entries(item.specifications).map(([key, value]) => (
                      <span key={key} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Endereço de Entrega */}
        {order.delivery_address && (
          <div className="bg-card rounded-xl border p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-green-600" />
              Endereço de Entrega
            </h3>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
              {/* Rua e Número */}
              {(order.delivery_address.street || order.delivery_address.address) && (
                <p className="font-medium text-sm">
                  {order.delivery_address.street || order.delivery_address.address}
                  {order.delivery_address.number && `, Nº ${order.delivery_address.number}`}
                </p>
              )}
              
              {/* Complemento */}
              {order.delivery_address.complement && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Complemento:</span> {order.delivery_address.complement}
                </p>
              )}
              
              {/* Bairro */}
              {order.delivery_address.neighborhood && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Bairro:</span> {order.delivery_address.neighborhood}
                </p>
              )}
              
              {/* Cidade e Estado */}
              {(order.delivery_address.city || order.delivery_address.state) && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Cidade:</span> {order.delivery_address.city}
                  {order.delivery_address.state && ` - ${order.delivery_address.state}`}
                </p>
              )}
              
              {/* CEP */}
              {order.delivery_address.cep && (
                <p className="text-sm">
                  <span className="text-muted-foreground">CEP:</span> {order.delivery_address.cep}
                </p>
              )}

              {/* Referência */}
              {order.delivery_address.reference && (
                <p className="text-sm italic text-muted-foreground">
                  Referência: {order.delivery_address.reference}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Observações do Pedido */}
        {order.order_observations && (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-amber-600" />
              Observações do Pedido
            </h3>
            <p className="text-sm">{order.order_observations}</p>
          </div>
        )}

        {/* Pagamento */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-purple-600" />
            Pagamento
          </h3>
          <p className="text-sm text-muted-foreground">
            {order.payment_method || 'Pagamento na entrega'}
          </p>
        </div>

        {/* Observações */}
        {order.notes && (
          <div className="bg-card rounded-xl border p-4">
            <h3 className="font-semibold mb-2">Observações</h3>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </div>
        )}

        {/* Resumo de Valores */}
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(order.subtotal || order.order_items.reduce((s, i) => s + i.total_price, 0))}</span>
          </div>
          {(order.delivery_fee ?? 0) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Entrega</span>
              <span>{formatPrice(order.delivery_fee!)}</span>
            </div>
          )}
          {(order.discount ?? 0) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Desconto</span>
              <span className="text-green-600">-{formatPrice(order.discount!)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex items-center justify-between">
            <span className="text-muted-foreground">Total do Pedido</span>
            <span className="text-2xl font-bold text-primary">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>

        {/* Botão Baixar/Imprimir Nota - esconder para pedidos cancelados */}
        {order.status !== 'cancelled' && (
          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={() => {
              if (establishment && settings) {
                setInvoiceData({
                  invoiceNumber: order.id.slice(0, 8).toUpperCase(),
                  date: order.created_at,
                  orderObservations: order.order_observations,
                  items: order.order_items.map(item => ({
                    name: item.product_name || item.products?.name || 'Produto',
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    totalPrice: item.total_price,
                    specifications: item.specifications
                  })),
                  subtotal: order.subtotal || order.order_items.reduce((sum, item) => sum + item.total_price, 0),
                  discount: order.discount || 0,
                  deliveryFee: order.delivery_fee || 0,
                  total: order.total,
                  paymentMethod: order.payment_method || 'Não informado',
                  cashAmount: order.cash_amount,
                  establishment: {
                    name: establishment.name,
                    whatsapp: settings.whatsapp,
                    email: settings.email,
                    address: settings.address
                  }
                });
                setShowInvoice(true);
              }
            }}
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Baixar / Imprimir Nota do Pedido
          </Button>
        )}

        {/* Botão Cancelar - apenas para pedidos pendentes */}
        {order.status === 'pending' && (
          <Button 
            variant="destructive" 
            className="w-full h-12"
            onClick={cancelOrder}
            disabled={cancelling}
          >
            {cancelling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Cancelando...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar Pedido
              </>
            )}
          </Button>
        )}

        {/* Botão Ajuda */}
        <Button 
          variant="outline" 
          className="w-full h-12"
          onClick={() => toast({ title: "Em breve", description: "Funcionalidade de suporte em desenvolvimento." })}
        >
          Precisa de ajuda com este pedido?
        </Button>
      </div>

      {/* Service Invoice Modal */}
      {invoiceData && (
        <ServiceInvoice
          isOpen={showInvoice}
          onClose={() => setShowInvoice(false)}
          data={invoiceData}
        />
      )}

      <BottomNavigation />
    </div>
  );
};

export default OrderDetails;
