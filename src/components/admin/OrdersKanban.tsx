import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  ChefHat, 
  Package, 
  Truck, 
  CheckCircle2, 
  XCircle,
  Search,
  ChevronRight,
  ChevronLeft,
  User,
  MapPin,
  Phone,
  RefreshCw,
  Loader2,
  FileText
} from "lucide-react";
import ServiceInvoice from "@/components/ServiceInvoice";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number | null;
  discount: number | null;
  created_at: string;
  notes: string | null;
  order_observations: string | null;
  payment_method: string | null;
  cash_amount: number | null;
  delivery_address: any;
  user_id: string | null;
  order_items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    product_image: string | null;
    specifications: any;
  }[];
  profile?: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

interface OrdersKanbanProps {
  establishmentId: string | null;
}

const columns = [
  { id: "pending", label: "Novos", icon: Clock, description: "Aguardando" },
  { id: "confirmed", label: "Confirmados", icon: ChefHat, description: "Em preparação" },
  { id: "preparing", label: "Produção", icon: Package, description: "Sendo preparados" },
  { id: "ready", label: "Prontos", icon: CheckCircle2, description: "Para entrega" },
  { id: "delivering", label: "Entrega", icon: Truck, description: "Em trânsito" },
  { id: "delivered", label: "Entregues", icon: CheckCircle2, description: "Finalizados" },
  { id: "cancelled", label: "Cancelados", icon: XCircle, description: "Cancelados" },
];

const statusFlow: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivering", "delivered", "cancelled"],
  delivering: ["delivered", "cancelled"],
  delivered: ["cancelled"],
  cancelled: [],
};

export function OrdersKanban({ establishmentId }: OrdersKanbanProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeColumnMobile, setActiveColumnMobile] = useState(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [establishmentData, setEstablishmentData] = useState<any>(null);

  // Fetch establishment data for invoice
  useEffect(() => {
    if (establishmentId) {
      fetchEstablishmentData();
    }
  }, [establishmentId]);

  const fetchEstablishmentData = async () => {
    const { data: establishment } = await supabase
      .from('establishments')
      .select('name, slug')
      .eq('id', establishmentId)
      .maybeSingle();
    
    const { data: settings } = await supabase
      .from('establishment_settings')
      .select('whatsapp, email, address')
      .eq('establishment_id', establishmentId)
      .maybeSingle();

    if (establishment) {
      setEstablishmentData({
        name: establishment.name,
        whatsapp: settings?.whatsapp,
        email: settings?.email,
        address: settings?.address
      });
    }
  };

  useEffect(() => {
    if (establishmentId) {
      fetchOrders();
      
      const channel = supabase
        .channel('admin-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `establishment_id=eq.${establishmentId}`
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
  }, [establishmentId]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            product_image,
            specifications
          )
        `)
        .eq('establishment_id', establishmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const ordersWithProfiles = await Promise.all(
        (data || []).map(async (order) => {
          if (order.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, phone, email')
              .eq('id', order.user_id)
              .maybeSingle();
            return { ...order, profile };
          }
          return { ...order, profile: null };
        })
      );
      
      setOrders(ordersWithProfiles);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Erro ao carregar pedidos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      toast({
        title: "Status atualizado!",
        description: `Pedido movido para ${columns.find(c => c.id === newStatus)?.label}`
      });
      
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Erro ao atualizar status",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) return `Hoje, ${formatTime(dateString)}`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + formatTime(dateString);
  };

  const getOrdersByStatus = (status: string) => {
    return orders.filter(o => {
      const matchesStatus = o.status === status || (status === 'pending' && !o.status);
      const matchesSearch = !searchTerm || 
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.profile?.phone?.includes(searchTerm);
      return matchesStatus && matchesSearch;
    });
  };

  // Removed - no longer using border-l colors

  const OrderCard = ({ order }: { order: Order }) => {
    const nextStatuses = statusFlow[order.status || 'pending'] || [];
    const isUpdating = updating === order.id;
    
    return (
      <Card 
        className="p-3 mb-2 cursor-pointer hover:shadow-sm transition-all border border-border/40 bg-card"
        onClick={() => setSelectedOrder(order)}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</p>
            <p className="font-semibold">{formatPrice(order.total)}</p>
          </div>
          <span className="text-xs text-muted-foreground">{formatTime(order.created_at)}</span>
        </div>
        
        {order.profile && (
          <div className="flex items-center gap-2 mb-2 text-sm">
            <User className="w-3 h-3 text-muted-foreground" />
            <span className="truncate text-sm">{order.profile.full_name || 'Cliente'}</span>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mb-3">
          {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'itens'}
        </p>
        
        {nextStatuses.length > 0 && (
          <div className="flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
            {nextStatuses.slice(0, 2).map(status => {
              const col = columns.find(c => c.id === status);
              const isCancelled = status === 'cancelled';
              
              return (
                <Button
                  key={status}
                  size="sm"
                  variant={isCancelled ? "outline" : "default"}
                  className={cn(
                    "text-xs h-7 flex-1",
                    isCancelled && "text-destructive border-destructive/30 hover:bg-destructive/10"
                  )}
                  onClick={() => updateOrderStatus(order.id, status)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    col?.label
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </Card>
    );
  };

  const KanbanColumn = ({ column, index }: { column: typeof columns[0]; index: number }) => {
    const columnOrders = getOrdersByStatus(column.id);
    const Icon = column.icon;
    const isPending = column.id === 'pending';
    const isDelivered = column.id === 'delivered';
    const isCancelled = column.id === 'cancelled';
    
    const isConfirmed = column.id === 'confirmed';
    const isPreparing = column.id === 'preparing';
    const isReady = column.id === 'ready';
    const isDelivering = column.id === 'delivering';
    
    return (
      <div className="flex-shrink-0 w-full md:w-64 lg:w-72">
        <div className={cn(
          "rounded-t-lg p-3 flex items-center justify-between",
          isPending && "bg-amber-500/10",
          isConfirmed && "bg-blue-500/10",
          isPreparing && "bg-violet-500/10",
          isReady && "bg-emerald-500/10",
          isDelivering && "bg-cyan-500/10",
          isDelivered && "bg-green-500/10",
          isCancelled && "bg-red-500/10"
        )}>
          <div className="flex items-center gap-2">
            <Icon className={cn(
              "w-4 h-4",
              isPending && "text-amber-600",
              isConfirmed && "text-blue-600",
              isPreparing && "text-violet-600",
              isReady && "text-emerald-600",
              isDelivering && "text-cyan-600",
              isDelivered && "text-green-600",
              isCancelled && "text-red-600"
            )} />
            <span className="font-medium text-sm">{column.label}</span>
          </div>
          <Badge variant="secondary" className="bg-background/80 text-foreground text-xs">
            {columnOrders.length}
          </Badge>
        </div>
        
        <div className="bg-muted/30 rounded-b-lg min-h-[300px] md:min-h-[calc(100vh-280px)]">
          <ScrollArea className="h-[300px] md:h-[calc(100vh-280px)]">
            <div className="p-2">
              {columnOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Nenhum pedido</p>
                </div>
              ) : (
                columnOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  // Helper to parse PDV customer info from notes
  const parsePdvCustomerInfo = (notes: string | null) => {
    if (!notes) return null;
    const match = notes.match(/^Cliente: ([^-]+)(?:\s*-\s*(.+))?$/);
    if (match) {
      return {
        name: match[1]?.trim() || null,
        phone: match[2]?.trim() || null
      };
    }
    return null;
  };

  const OrderDetail = () => {
    if (!selectedOrder) return null;
    const nextStatuses = statusFlow[selectedOrder.status || 'pending'] || [];
    const isPdvOrder = selectedOrder.payment_method?.startsWith('PDV -');
    const pdvCustomer = isPdvOrder ? parsePdvCustomerInfo(selectedOrder.notes) : null;
    
    return (
      <div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={() => setSelectedOrder(null)}
      >
        <Card 
          className="w-full max-w-lg max-h-[90vh] overflow-auto border border-border/40 bg-card"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b sticky top-0 bg-card z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground font-mono">
                  {isPdvOrder && <span className="text-primary font-semibold">PDV • </span>}
                  Pedido #{selectedOrder.id.slice(0, 8)}
                </p>
                <h3 className="text-xl font-bold">{formatPrice(selectedOrder.total)}</h3>
              </div>
              <Badge variant="secondary" className={cn(
                "border-0",
                selectedOrder.status === 'delivered' && "bg-emerald-500/10 text-emerald-600",
                selectedOrder.status === 'pending' && "bg-amber-500/10 text-amber-600",
                selectedOrder.status === 'cancelled' && "bg-red-500/10 text-red-600",
                !['delivered', 'pending', 'cancelled'].includes(selectedOrder.status || '') && "bg-primary/10 text-primary"
              )}>
                {columns.find(c => c.id === (selectedOrder.status || 'pending'))?.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{formatDate(selectedOrder.created_at)}</p>
          </div>
          
          <div className="p-4 space-y-4">
            {/* ITENS DO PEDIDO - Primeiro, acima de tudo */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Itens do Pedido ({selectedOrder.order_items?.length || 0})</h4>
              <div className="space-y-2">
                {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                  selectedOrder.order_items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity}x {formatPrice(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold text-sm">
                        {formatPrice(item.quantity * item.unit_price)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhum item encontrado</p>
                )}
              </div>
            </div>

            {/* Observações do Cliente */}
            {selectedOrder.order_observations && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  📝 Observações do Cliente
                </h4>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-sm whitespace-pre-line">{selectedOrder.order_observations}</p>
                </div>
              </div>
            )}

            {/* CLIENTE PDV (extraído das notes) */}
            {isPdvOrder && pdvCustomer && (pdvCustomer.name || pdvCustomer.phone) && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Cliente PDV</h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  {pdvCustomer.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{pdvCustomer.name}</span>
                    </div>
                  )}
                  {pdvCustomer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <a 
                        href={`https://wa.me/55${pdvCustomer.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline"
                      >
                        {pdvCustomer.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CLIENTE (pedido online) */}
            {!isPdvOrder && selectedOrder.profile && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Cliente</h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedOrder.profile.full_name || 'Não informado'}</span>
                  </div>
                  {selectedOrder.profile.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <a 
                        href={`https://wa.me/55${selectedOrder.profile.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline"
                      >
                        {selectedOrder.profile.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* ENDEREÇO DE ENTREGA */}
            {selectedOrder.delivery_address && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Endereço de Entrega
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  {(() => {
                    const addr = selectedOrder.delivery_address;
                    if (typeof addr === 'object') {
                      return (
                        <>
                          {(addr.street || addr.address) && (
                            <p className="font-medium text-sm">
                              {addr.street || addr.address}
                              {addr.number && `, ${addr.number}`}
                            </p>
                          )}
                          
                          {addr.complement && (
                            <p className="text-sm text-muted-foreground">
                              Complemento: {addr.complement}
                            </p>
                          )}
                          
                          {addr.neighborhood && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Bairro:</span> {addr.neighborhood}
                            </p>
                          )}
                          
                          {(addr.city || addr.state) && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Cidade:</span> {addr.city}
                              {addr.state && ` - ${addr.state}`}
                            </p>
                          )}
                          
                          {addr.cep && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">CEP:</span> {addr.cep}
                            </p>
                          )}

                          {addr.reference && (
                            <p className="text-sm text-muted-foreground italic">
                              Referência: {addr.reference}
                            </p>
                          )}
                        </>
                      );
                    }
                    return <p className="text-sm">{String(addr)}</p>;
                  })()}
                </div>
              </div>
            )}

            {selectedOrder.payment_method && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Pagamento</h4>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">{selectedOrder.payment_method}</p>
                  {selectedOrder.payment_method === "Dinheiro na Entrega" && selectedOrder.cash_amount && (
                    <div className="mt-2 p-2 bg-amber-500/10 rounded text-sm">
                      <p>Valor informado: {formatPrice(selectedOrder.cash_amount)}</p>
                      <p className="font-medium">Troco: {formatPrice(selectedOrder.cash_amount - selectedOrder.total)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.delivery_fee != null && selectedOrder.delivery_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entrega</span>
                  <span>{formatPrice(selectedOrder.delivery_fee)}</span>
                </div>
              )}
              {selectedOrder.discount != null && selectedOrder.discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Desconto</span>
                  <span>-{formatPrice(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total</span>
                <span>{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Botão para gerar nota */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (establishmentData) {
                  setInvoiceData({
                    invoiceNumber: selectedOrder.id.slice(0, 8).toUpperCase(),
                    date: selectedOrder.created_at,
                    items: (selectedOrder.order_items || []).map(item => ({
                      name: item.product_name,
                      quantity: item.quantity,
                      unitPrice: item.unit_price,
                      totalPrice: item.quantity * item.unit_price
                    })),
                    subtotal: selectedOrder.subtotal,
                    discount: selectedOrder.discount || 0,
                    deliveryFee: selectedOrder.delivery_fee || 0,
                    total: selectedOrder.total,
                    paymentMethod: selectedOrder.payment_method || 'Não informado',
                    cashAmount: selectedOrder.cash_amount,
                    change: selectedOrder.cash_amount ? selectedOrder.cash_amount - selectedOrder.total : undefined,
                    customerName: selectedOrder.profile?.full_name || undefined,
                    customerPhone: selectedOrder.profile?.phone || undefined,
                    establishment: establishmentData
                  });
                  setShowInvoice(true);
                }
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Baixar / Imprimir Nota
            </Button>
            
            {nextStatuses.length > 0 && (
              <div className="flex gap-2 pt-2">
                {nextStatuses.map(status => {
                  const col = columns.find(c => c.id === status);
                  const isCancelled = status === 'cancelled';
                  
                  return (
                    <Button
                      key={status}
                      variant={isCancelled ? "outline" : "default"}
                      className={cn(
                        "flex-1",
                        isCancelled && "text-destructive border-destructive/30"
                      )}
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, status);
                        setSelectedOrder(null);
                      }}
                    >
                      {col?.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pedido ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>
      
      {/* Mobile column navigation */}
      <div className="md:hidden flex items-center justify-between bg-muted/50 rounded-lg p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setActiveColumnMobile(Math.max(0, activeColumnMobile - 1))}
          disabled={activeColumnMobile === 0}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="font-medium text-sm">{columns[activeColumnMobile].label}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setActiveColumnMobile(Math.min(columns.length - 1, activeColumnMobile + 1))}
          disabled={activeColumnMobile === columns.length - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Mobile view */}
      <div className="md:hidden">
        <KanbanColumn column={columns[activeColumnMobile]} index={activeColumnMobile} />
      </div>
      
      {/* Desktop view */}
      <div className="hidden md:flex gap-3 overflow-x-auto pb-4">
        {columns.map((column, index) => (
          <KanbanColumn key={column.id} column={column} index={index} />
        ))}
      </div>
      
      <OrderDetail />

      {/* Service Invoice Modal */}
      {invoiceData && (
        <ServiceInvoice
          isOpen={showInvoice}
          onClose={() => setShowInvoice(false)}
          data={invoiceData}
        />
      )}
    </div>
  );
}