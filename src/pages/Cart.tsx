import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Tag, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Progress } from "@/components/ui/progress";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCouponContext } from "@/contexts/CouponContext";
import { useToast } from "@/hooks/use-toast";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";
import { useAuth } from "@/contexts/AuthContext";

const Cart = () => {
  const { items, updateQuantity, removeItem, getTotalItems, getTotalPrice } = useCart();
  const isMobile = useIsMobile();
  const { settings } = useStoreSettings();
  const { toast } = useToast();
  const slug = useStoreSlug();
  const navigate = useNavigate();
  const { establishment, settings: estSettings } = useEstablishment();
  const { user } = useAuth();
  const [couponInput, setCouponInput] = useState("");
  const { 
    isValidating, 
    appliedCoupon, 
    couponDiscount, 
    applyCoupon, 
    removeCoupon,
    recalculateDiscount 
  } = useCouponContext();

  const primaryColor = estSettings?.primary_color || "#3834ED";
  const storeSlug = slug || establishment?.slug;
  const basePath = buildStorePath(storeSlug, '');
  const authPath = buildStorePath(storeSlug, '/auth');

  // Handle checkout navigation - redirect to auth if not logged in
  const handleCheckout = () => {
    if (!user) {
      // Save return URL to come back after login
      sessionStorage.setItem('auth_return_url', `${basePath}/checkout`);
      toast({
        title: "Login necessário",
        description: "Faça login ou crie uma conta para continuar.",
      });
      navigate(authPath);
      return;
    }
    navigate(`${basePath}/checkout`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const minimumOrder = settings?.minimum_order_value || 30;
  const baseDeliveryFee = settings?.delivery_fee || 0;
  const freeDeliveryThreshold = settings?.free_delivery_threshold;
  const subtotal = getTotalPrice();
  
  // Calculate delivery fee based on free delivery threshold
  const deliveryFee = freeDeliveryThreshold && subtotal >= freeDeliveryThreshold ? 0 : baseDeliveryFee;
  
  // Recalculate discount when subtotal changes
  const currentDiscount = appliedCoupon ? recalculateDiscount(subtotal) : 0;
  const total = subtotal + deliveryFee - currentDiscount;
  const remainingForMinimum = Math.max(0, minimumOrder - subtotal);
  const minimumReached = subtotal >= minimumOrder;
  const progressPercentage = Math.min((subtotal / minimumOrder) * 100, 100);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    
    const result = await applyCoupon(couponInput, subtotal);
    
    if (result.valid) {
      toast({
        title: "Cupom aplicado! 🎉",
        description: appliedCoupon?.discount_type === "percentage" 
          ? `${appliedCoupon?.discount_value}% de desconto`
          : `${formatPrice(result.discount || 0)} de desconto`,
      });
      setCouponInput("");
    } else {
      toast({
        title: "Cupom inválido",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast({ title: "Cupom removido" });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <DynamicThemeStyles />
        <Header onSearchChange={() => {}} cartCount={getTotalItems()} />
        
        <main className="container mx-auto px-4 py-8">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-smooth">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a loja
          </button>

          <div className="text-center py-16 px-4 animate-fade-in">
            <div className="max-w-sm mx-auto">
              <ShoppingBag className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-50" />
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                Seu carrinho está vazio
              </h2>
              <p className="text-muted-foreground mb-8 text-sm sm:text-base">
                Adicione alguns produtos incríveis ao seu carrinho e aproveite nossas ofertas
              </p>
              <Link to={basePath || '/'}>
                <Button size="lg" className="w-full sm:w-auto" style={{ backgroundColor: primaryColor }}>
                  Continuar Comprando
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <DynamicThemeStyles />
      <Header onSearchChange={() => {}} cartCount={getTotalItems()} />
      
      <main className="container mx-auto px-4 py-4 sm:py-8 pb-32 lg:pb-8 overflow-x-hidden">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-smooth text-sm">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Continuar comprando</span>
          <span className="sm:hidden">Voltar</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                Meu Carrinho
              </h1>
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'itens'}
              </Badge>
            </div>

            {/* Minimum Order Banner */}
            <Card className={`border-2 ${minimumReached ? 'border-green-500 bg-green-500/5' : 'border-amber-500 bg-amber-500/5'}`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  {minimumReached ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    {minimumReached ? (
                      <>
                        <p className="font-semibold text-green-700 dark:text-green-400 text-sm sm:text-base">
                          Pedido mínimo atingido! 🎉
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          Você já pode finalizar sua compra
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm sm:text-base">
                          Faltam {formatPrice(remainingForMinimum)} para o pedido mínimo
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          Pedido mínimo: {formatPrice(minimumOrder)}
                        </p>
                      </>
                    )}
                    <div className="mt-2">
                      <Progress 
                        value={progressPercentage} 
                        className={`h-2 ${minimumReached ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`}
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{formatPrice(subtotal)}</span>
                        <span className="text-[10px] text-muted-foreground">{formatPrice(minimumOrder)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {items.map((item) => (
              <Card key={item.cartKey} className="shadow-card hover:shadow-lg transition-shadow animate-fade-in">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex gap-3 sm:gap-4">
                    <Link to={`/product/${item.id}`} className="shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg hover:scale-105 transition-transform"
                      />
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2 mb-1">
                        <Link to={`/product/${item.id}`} className="hover:text-primary transition-smooth flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base lg:text-lg line-clamp-2">{item.name}</h3>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0"
                          onClick={() => removeItem(item.cartKey)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                        {item.brand} • {item.category}
                      </p>

                      {/* Selected Specifications */}
                      {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {Object.entries(item.selectedVariants).map(([key, value]) => (
                            value && (
                              <Badge key={key} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                {key}: {value}
                              </Badge>
                            )
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-background"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold min-w-[2rem] sm:min-w-[2.5rem] text-center text-sm sm:text-base">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                            className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-background"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <span className="font-bold text-base sm:text-lg" style={{ color: primaryColor }}>
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary - Desktop only */}
          <div className="hidden lg:block space-y-3 sm:space-y-4">
            {/* Promo Code */}
            <Card className="shadow-card lg:order-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-primary" />
                  <h3 className="font-medium text-sm sm:text-base">Cupom de Desconto</h3>
                </div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div>
                      <code className="font-mono text-sm font-semibold text-green-600">
                        {appliedCoupon.code}
                      </code>
                      <p className="text-xs text-green-600">
                        -{appliedCoupon.discount_type === "percentage" 
                          ? `${appliedCoupon.discount_value}%` 
                          : formatPrice(appliedCoupon.discount_value)}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRemoveCoupon}
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite seu cupom"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      className="flex-1 px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring uppercase"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="shrink-0"
                      onClick={handleApplyCoupon}
                      disabled={isValidating || !couponInput.trim()}
                    >
                      {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card lg:order-1 sticky top-4">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Resumo do Pedido</h2>
                
                <div className="space-y-3 text-sm sm:text-base">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal ({getTotalItems()} {getTotalItems() === 1 ? 'item' : 'itens'})</span>
                    <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa de entrega</span>
                    <span className="font-medium text-foreground">{formatPrice(deliveryFee)}</span>
                  </div>

                  {currentDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto cupom</span>
                      <span className="font-medium">-{formatPrice(currentDiscount)}</span>
                    </div>
                  )}
                  
                  <Separator className="my-3" />
                  
                  <div className="flex justify-between text-base sm:text-lg font-bold">
                    <span>Total</span>
                    <span style={{ color: primaryColor }}>{formatPrice(total)}</span>
                  </div>
                </div>

                {minimumReached ? (
                  <Button 
                    size="lg" 
                    className="w-full text-base mt-6" 
                    style={{ backgroundColor: primaryColor }}
                    onClick={handleCheckout}
                  >
                    Finalizar Pedido
                  </Button>
                ) : (
                  <div className="mt-6">
                    <Button size="lg" className="w-full text-base" disabled>
                      Finalizar Pedido
                    </Button>
                    <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2">
                      Adicione mais {formatPrice(remainingForMinimum)} ao carrinho
                    </p>
                  </div>
                )}

                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    🚚 Frete grátis para pedidos acima de R$ 99
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile Fixed Bottom Summary */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50 lg:hidden">
            <div className="container mx-auto px-3 py-2">
              {/* Cupom compacto */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded mb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-green-600" />
                    <code className="font-mono text-xs font-semibold text-green-600">
                      {appliedCoupon.code}
                    </code>
                    <span className="text-xs text-green-600">
                      (-{formatPrice(currentDiscount)})
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRemoveCoupon}
                    className="text-destructive hover:text-destructive h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Cupom"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 px-2 py-1.5 border border-input rounded text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring uppercase"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="shrink-0 h-8 text-xs px-3"
                    onClick={handleApplyCoupon}
                    disabled={isValidating || !couponInput.trim()}
                  >
                    {isValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aplicar"}
                  </Button>
                </div>
              )}
              
              {/* Indicador de pedido mínimo mobile */}
              {!minimumReached && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    Faltam {formatPrice(remainingForMinimum)} para o mínimo de {formatPrice(minimumOrder)}
                  </p>
                </div>
              )}
              
              {/* Total e botão */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground">Total ({getTotalItems()} itens)</p>
                  <p className="text-lg font-bold" style={{ color: primaryColor }}>{formatPrice(total)}</p>
                </div>
                {minimumReached ? (
                  <Button 
                    size="sm" 
                    className="h-12 px-6 flex-shrink-0" 
                    style={{ backgroundColor: primaryColor }}
                    onClick={handleCheckout}
                  >
                    Finalizar
                  </Button>
                ) : (
                  <Button size="sm" className="h-12 px-6" disabled>
                    Finalizar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;