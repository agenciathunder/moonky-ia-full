import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceInvoice from "@/components/ServiceInvoice";
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Tag, 
  User, 
  Phone, 
  Percent, 
  DollarSign,
  CreditCard,
  Banknote,
  QrCode,
  Check,
  Package,
  Calendar
} from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  type: 'product' | 'ticket';
  eventName?: string;
}

interface PDVProps {
  establishmentId?: string | null;
  plan?: Record<string, any> | null;
}

export const PDV = ({ establishmentId, plan }: PDVProps) => {
  const hasEvents = !plan || plan.has_events !== false;
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState("products");
  const [establishmentData, setEstablishmentData] = useState<any>(null);
  
  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  
  // Discount
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  
  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Invoice
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [establishmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let productsQuery = supabase
        .from("products")
        .select("*, product_categories(name)")
        .eq("active", true)
        .order("name");

      let eventsQuery = supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .gte("event_date", new Date().toISOString().split('T')[0])
        .order("event_date");

      if (establishmentId) {
        productsQuery = productsQuery.eq("establishment_id", establishmentId);
        eventsQuery = eventsQuery.eq("establishment_id", establishmentId);
        
        // Load establishment data for invoice
        const { data: estabData } = await supabase
          .from("establishments")
          .select("*, establishment_settings(*)")
          .eq("id", establishmentId)
          .single();
        
        if (estabData) {
          setEstablishmentData(estabData);
        }
      }

      const [productsRes, eventsRes] = await Promise.all([productsQuery, eventsQuery]);
      
      if (productsRes.data) setProducts(productsRes.data);
      if (eventsRes.data) {
        setEvents(eventsRes.data);
        // Load ticket types for all events
        const eventIds = eventsRes.data.map(e => e.id);
        if (eventIds.length > 0) {
          const { data: tickets } = await supabase
            .from("ticket_types")
            .select("*")
            .in("event_id", eventIds)
            .eq("is_active", true);
          if (tickets) setTicketTypes(tickets);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const filteredEvents = useMemo(() => {
    if (!searchTerm) return events;
    return events.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [events, searchTerm]);

  const addToCart = (item: any, type: 'product' | 'ticket', eventName?: string) => {
    const price = type === 'product' 
      ? (item.is_on_sale && item.sale_price ? item.sale_price : item.price)
      : item.price;
    
    const existingItem = cart.find(c => c.id === item.id && c.type === type);
    
    if (existingItem) {
      setCart(cart.map(c => 
        c.id === item.id && c.type === type
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, {
        id: item.id,
        name: item.name,
        price,
        quantity: 1,
        image_url: item.image_url || null,
        type,
        eventName
      }]);
    }
  };

  const updateQuantity = (id: string, type: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id && item.type === type) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string, type: string) => {
    setCart(cart.filter(item => !(item.id === id && item.type === type)));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const calculateDiscount = () => {
    let discount = 0;
    
    // Manual discount
    if (discountValue) {
      const value = parseFloat(discountValue);
      if (discountType === "percentage") {
        discount = (subtotal * value) / 100;
      } else {
        discount = value;
      }
    }
    
    // Coupon discount
    if (appliedCoupon) {
      if (appliedCoupon.discount_type === "percentage") {
        discount += (subtotal * appliedCoupon.discount_value) / 100;
      } else {
        discount += appliedCoupon.discount_value;
      }
    }
    
    return Math.min(discount, subtotal);
  };
  
  const discount = calculateDiscount();
  const total = subtotal - discount;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    try {
      let query = supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true);
      
      if (establishmentId) {
        query = query.eq("establishment_id", establishmentId);
      }
      
      const { data: coupons, error } = await query;
      const coupon = coupons?.[0] || null;
      
      if (error) throw error;
      
      if (!coupon) {
        toast({ title: "Cupom inválido", variant: "destructive" });
        return;
      }
      
      if (coupon.minimum_order_value && subtotal < coupon.minimum_order_value) {
        toast({ 
          title: "Pedido mínimo não atingido", 
          description: `Mínimo de R$ ${coupon.minimum_order_value.toFixed(2)}`,
          variant: "destructive" 
        });
        return;
      }
      
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast({ title: "Cupom esgotado", variant: "destructive" });
        return;
      }
      
      setAppliedCoupon(coupon);
      toast({ title: "Cupom aplicado!" });
    } catch (error) {
      console.error("Error applying coupon:", error);
      toast({ title: "Erro ao aplicar cupom", variant: "destructive" });
    }
  };

  // Calculate change
  const cashAmountValue = cashAmount ? parseFloat(cashAmount.replace(',', '.')) : 0;
  const changeValue = paymentMethod === 'cash' && cashAmountValue > total ? cashAmountValue - total : 0;
  const isCashPaymentValid = paymentMethod !== 'cash' || cashAmountValue >= total;

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      credit: 'Cartão de Crédito',
      debit: 'Cartão de Débito',
      pix: 'PIX'
    };
    return labels[method] || method;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: "Carrinho vazio", variant: "destructive" });
      return;
    }
    
    if (!isCashPaymentValid) {
      toast({ 
        title: "Valor insuficiente", 
        description: "O valor em dinheiro deve ser maior ou igual ao total.",
        variant: "destructive" 
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Get current user (seller)
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create order for products
      const productItems = cart.filter(c => c.type === 'product');
      const ticketItems = cart.filter(c => c.type === 'ticket');
      let orderId = "";
      
      if (productItems.length > 0) {
        const orderData = {
          subtotal,
          total,
          discount,
          status: 'delivered',
          payment_method: `PDV - ${getPaymentMethodLabel(paymentMethod)}`,
          notes: customerName ? `Cliente: ${customerName}${customerPhone ? ` - ${customerPhone}` : ''}` : null,
          establishment_id: establishmentId,
          seller_id: user?.id || null,
          cash_amount: paymentMethod === 'cash' ? cashAmountValue : null
        };
        
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert([orderData])
          .select()
          .single();
        
        if (orderError) throw orderError;
        orderId = order.id;
        
        // Create order items
        const orderItems = productItems.map(item => ({
          order_id: order.id,
          product_id: item.id,
          product_name: item.name,
          product_image: item.image_url,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        }));
        
        await supabase.from("order_items").insert(orderItems);
        
        // Update product stock - simple decrement
        for (const item of productItems) {
          const product = products.find(p => p.id === item.id);
          if (product && product.stock !== null) {
            await supabase
              .from("products")
              .update({ stock: Math.max(0, product.stock - item.quantity) })
              .eq("id", item.id);
          }
        }
      }
      
      // Handle ticket sales - simple increment
      for (const ticket of ticketItems) {
        const ticketType = ticketTypes.find(t => t.id === ticket.id);
        if (ticketType) {
          await supabase
            .from("ticket_types")
            .update({ quantity_sold: ticketType.quantity_sold + ticket.quantity })
            .eq("id", ticket.id);
        }
      }
      
      // Update coupon usage
      if (appliedCoupon) {
        await supabase
          .from("coupons")
          .update({ current_uses: (appliedCoupon.current_uses || 0) + 1 })
          .eq("id", appliedCoupon.id);
      }
      
      // Prepare invoice data
      const settings = establishmentData?.establishment_settings;
      const newInvoiceData = {
        invoiceNumber: orderId ? orderId.slice(0, 8).toUpperCase() : Date.now().toString().slice(-8),
        date: new Date().toISOString(),
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity
        })),
        subtotal,
        discount,
        total,
        paymentMethod: getPaymentMethodLabel(paymentMethod),
        cashAmount: paymentMethod === 'cash' ? cashAmountValue : null,
        change: changeValue,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        establishment: {
          name: establishmentData?.name || "Estabelecimento",
          whatsapp: settings?.whatsapp || undefined,
          email: settings?.email || establishmentData?.email || undefined,
          address: settings?.address || undefined
        }
      };
      
      setInvoiceData(newInvoiceData);
      
      toast({ title: "Venda realizada com sucesso!" });
      
      // Reset cart but keep checkout open to show invoice
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscountValue("");
      setCouponCode("");
      setCashAmount("");
      setAppliedCoupon(null);
      setIsCheckoutOpen(false);
      
      // Show invoice modal
      setShowInvoice(true);
      
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({ title: "Erro ao processar venda", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscountValue("");
    setCouponCode("");
    setCashAmount("");
    setAppliedCoupon(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-3 md:gap-4 px-2 sm:px-0">
      {/* Products/Events Grid - Full width on mobile/tablet portrait, left side on tablet landscape/desktop */}
      <div className="flex-1 flex flex-col min-h-0 md:min-h-full">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos ou eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 md:h-11"
          />
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mb-3 w-full sm:w-auto">
            <TabsTrigger value="products" className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-sm">
              <Package className="w-4 h-4" />
              Produtos
            </TabsTrigger>
            {hasEvents && (
            <TabsTrigger value="events" className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              Eventos
            </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="products" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full pr-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-4">
                {filteredProducts.map((product) => (
                  <Card 
                    key={product.id}
                    className="cursor-pointer hover:border-primary hover:shadow-md active:scale-[0.98] transition-all overflow-hidden border border-border/40 bg-card"
                    onClick={() => addToCart(product, 'product')}
                  >
                    <div className="aspect-square bg-muted relative">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      {product.is_on_sale && (
                        <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5">
                          Oferta
                        </Badge>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {product.is_on_sale && product.sale_price ? (
                          <>
                            <span className="text-xs text-muted-foreground line-through">
                              R$ {product.price.toFixed(2)}
                            </span>
                            <span className="text-sm font-bold text-destructive">
                              R$ {product.sale_price.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold">
                            R$ {product.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {product.stock !== null && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Estoque: {product.stock}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    Nenhum produto encontrado
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="events" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full pr-2">
              <div className="space-y-3 pb-4">
                {filteredEvents.map((event) => {
                  const eventTickets = ticketTypes.filter(t => t.event_id === event.id);
                  return (
                    <Card key={event.id} className="p-4 border border-border/40 bg-card">
                      <div className="flex gap-4">
                        {event.image_url && (
                          <img 
                            src={event.image_url} 
                            alt={event.name}
                            className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base truncate">{event.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.event_date).toLocaleDateString('pt-BR')} às {event.event_time}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {eventTickets.map((ticket) => (
                              <Button
                                key={ticket.id}
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 px-3"
                                onClick={() => addToCart(ticket, 'ticket', event.name)}
                                disabled={ticket.quantity_sold >= ticket.quantity_available}
                              >
                                {ticket.name} - R$ {ticket.price.toFixed(2)}
                                {ticket.quantity_sold >= ticket.quantity_available && " (Esgotado)"}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {filteredEvents.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum evento disponível
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Cart - Fixed bottom on mobile, sidebar on tablet/desktop */}
      <Card className="w-full md:w-80 lg:w-96 flex flex-col border border-border/40 bg-card md:h-full 
                       fixed bottom-0 left-0 right-0 z-50 md:relative md:z-auto
                       max-h-[55vh] md:max-h-none rounded-t-xl md:rounded-lg shadow-2xl md:shadow-sm">
        {/* Cart Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <h3 className="font-semibold">Carrinho</h3>
            {cart.length > 0 && (
              <Badge variant="secondary">{cart.length}</Badge>
            )}
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart} className="h-8 w-8 p-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Customer Info */}
        <div className={`p-4 border-b space-y-3 ${cart.length === 0 ? 'hidden md:block' : ''}`}>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome do cliente (opcional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="WhatsApp (opcional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>
        
        {/* Cart Items */}
        <ScrollArea className="flex-1 p-4 min-h-0 max-h-[20vh] md:max-h-none">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Carrinho vazio</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex gap-3 items-center">
                  <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {item.type === 'ticket' ? (
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.eventName && (
                      <p className="text-xs text-muted-foreground truncate">{item.eventName}</p>
                    )}
                    <p className="text-sm font-bold">R$ {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, item.type, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, item.type, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFromCart(item.id, item.type)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Discounts & Coupon */}
        {cart.length > 0 && (
          <div className="p-4 border-t space-y-3 hidden md:block">
            {/* Coupon */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código do cupom"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="pl-10 h-10"
                  disabled={!!appliedCoupon}
                />
              </div>
              {appliedCoupon ? (
                <Button variant="outline" className="h-10" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              ) : (
                <Button className="h-10" onClick={applyCoupon}>Aplicar</Button>
              )}
            </div>
            
            {appliedCoupon && (
              <Badge variant="secondary" className="w-full justify-center">
                Cupom {appliedCoupon.code}: {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : `R$ ${appliedCoupon.discount_value}`} OFF
              </Badge>
            )}
            
            {/* Manual Discount */}
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Desconto"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                min="0"
                className="h-10"
              />
              <Button
                variant={discountType === "percentage" ? "default" : "outline"}
                size="icon"
                className="h-10 w-10"
                onClick={() => setDiscountType("percentage")}
              >
                <Percent className="w-4 h-4" />
              </Button>
              <Button
                variant={discountType === "fixed" ? "default" : "outline"}
                size="icon"
                className="h-10 w-10"
                onClick={() => setDiscountType("fixed")}
              >
                <DollarSign className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Totals & Checkout */}
        <div className="p-4 border-t space-y-3 bg-card">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Desconto</span>
                <span>-R$ {discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
          </div>
          
          <Button 
            className="w-full h-11" 
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
          >
            Finalizar Venda
          </Button>
        </div>
      </Card>
      
      {/* Spacer for mobile fixed cart */}
      <div className="h-[180px] md:hidden" />
      
      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Venda</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Itens ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Desconto</span>
                  <span>-R$ {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Customer Info Summary */}
            {(customerName || customerPhone) && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">Cliente</p>
                {customerName && <p className="text-sm">{customerName}</p>}
                {customerPhone && <p className="text-sm text-muted-foreground">{customerPhone}</p>}
              </div>
            )}
            
            {/* Payment Method */}
            <div>
              <Label className="mb-3 block">Forma de Pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Dinheiro', icon: Banknote },
                  { id: 'credit', label: 'Crédito', icon: CreditCard },
                  { id: 'debit', label: 'Débito', icon: CreditCard },
                  { id: 'pix', label: 'PIX', icon: QrCode },
                ].map(method => (
                  <Button
                    key={method.id}
                    variant={paymentMethod === method.id ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    <method.icon className="w-4 h-4 mr-2" />
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Cash Amount for Change */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <Label>Valor em Dinheiro *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ex: 100,00"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {cashAmountValue > 0 && cashAmountValue >= total && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-sm text-green-600 font-medium">Troco:</span>
                    <span className="text-lg font-bold text-green-600">
                      R$ {changeValue.toFixed(2)}
                    </span>
                  </div>
                )}
                {cashAmountValue > 0 && cashAmountValue < total && (
                  <p className="text-sm text-destructive">
                    Valor insuficiente. O total é R$ {total.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCheckout} 
              disabled={isProcessing || !isCashPaymentValid}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar Venda
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
};