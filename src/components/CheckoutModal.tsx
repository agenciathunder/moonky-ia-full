import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildStorePath, getSubdomainSlug } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { 
  X, CreditCard, MapPin, Check, 
  Banknote, ShoppingBag, Tag, Loader2, User, Phone, DollarSign, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { useCouponContext } from "@/contexts/CouponContext";
import ServiceInvoice from "@/components/ServiceInvoice";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CheckoutModal = ({ isOpen, onClose }: CheckoutModalProps) => {
  // NOTE: This modal is rendered from CartFloatingBar (outside <Routes>),
  // so useParams() can be empty. Always prefer establishment context / URL parsing.
  const slug = useStoreSlug();
  const location = useLocation();
  const { items, getTotalItems, getTotalPrice, placeOrder, clearCart } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings, establishment, currentSlug } = useEstablishment();

  const inferredSlug = getSubdomainSlug() 
    || (location.pathname.startsWith("/loja/")
      ? location.pathname.split("/").filter(Boolean)[1]
      : undefined);

  const storeSlug = slug || currentSlug || establishment?.slug || inferredSlug;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [changeAmount, setChangeAmount] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [orderObservations, setOrderObservations] = useState("");
  
  // Invoice
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    cep: "",
    city: "",
    address: "",
    neighborhood: "",
    number: "",
    complement: "",
    state: ""
  });
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [savedAddress, setSavedAddress] = useState<typeof formData | null>(null);
  const [hasSavedAddressFromProfile, setHasSavedAddressFromProfile] = useState(false);

  const {
    isValidating,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    recordCouponUse,
    recalculateDiscount,
  } = useCouponContext();

  // Fetch address from CEP
  const fetchAddressFromCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          city: data.localidade || "",
          neighborhood: data.bairro || prev.neighborhood,
          address: data.logradouro || prev.address,
          state: data.uf || ""
        }));
      }
    } catch (error) {
      console.error('Error fetching CEP:', error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    // Format CEP as user types (00000-000)
    const cleanValue = value.replace(/\D/g, '');
    let formattedCep = cleanValue;
    if (cleanValue.length > 5) {
      formattedCep = `${cleanValue.slice(0, 5)}-${cleanValue.slice(5, 8)}`;
    }
    setFormData(prev => ({ ...prev, cep: formattedCep }));
    
    // Auto-fetch when CEP is complete
    if (cleanValue.length === 8) {
      fetchAddressFromCep(cleanValue);
    }
  };

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, phone, address')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          const addr = data.address as any;
          const loadedAddress = {
            name: data.full_name || "",
            whatsapp: data.phone || "",
            cep: addr?.cep || "",
            city: addr?.city || "",
            state: addr?.state || "",
            address: addr?.street || addr?.address || "",
            neighborhood: addr?.neighborhood || "",
            number: addr?.number || "",
            complement: addr?.complement || "",
          };
          
          setFormData(loadedAddress);
          
          // If address has the essential fields, consider it saved from profile
          if (loadedAddress.cep && loadedAddress.address && loadedAddress.number && loadedAddress.neighborhood) {
            setSavedAddress(loadedAddress);
            setHasSavedAddressFromProfile(true);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    if (isOpen) {
      loadUserProfile();
    }
  }, [user, isOpen]);

  // Function to save address
  const handleSaveAddress = () => {
    const missingFields = [];
    if (!formData.cep.trim()) missingFields.push("CEP");
    if (!formData.address.trim()) missingFields.push("Rua");
    if (!formData.number.trim()) missingFields.push("Número");
    if (!formData.neighborhood.trim()) missingFields.push("Bairro");
    
    if (missingFields.length > 0) {
      toast({
        title: "Endereço incompleto",
        description: `Preencha: ${missingFields.join(", ")}`,
        variant: "destructive"
      });
      return;
    }
    
    setSavedAddress({ ...formData });
    toast({
      title: "Endereço salvo! ✓",
      description: "Endereço confirmado para entrega"
    });
  };

  // Function to edit address
  const handleEditAddress = () => {
    setSavedAddress(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const baseDeliveryFee = settings?.delivery_fee || 0;
  const freeDeliveryThreshold = settings?.free_delivery_threshold;
  const subtotal = getTotalPrice();
  
  const deliveryFee = freeDeliveryThreshold && subtotal >= freeDeliveryThreshold 
    ? 0 
    : baseDeliveryFee;
  
  const currentDiscount = appliedCoupon ? recalculateDiscount(subtotal) : 0;
  const total = subtotal + deliveryFee - currentDiscount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    const result = await applyCoupon(couponCode, subtotal);
    
    if (result.valid) {
      toast({
        title: "Cupom aplicado! 🎉",
        description: result.coupon?.discount_type === "percentage" 
          ? `${result.coupon?.discount_value}% de desconto`
          : formatPrice(result.discount || 0) + " de desconto",
      });
      setCouponCode("");
      setShowCouponInput(false);
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

  const handlePlaceOrder = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para finalizar seu pedido.",
        variant: "destructive"
      });
      // Save return URL so user comes back after login (must be store-specific)
      const returnUrl = window.location.pathname;
      if (storeSlug && returnUrl.startsWith(buildStorePath(storeSlug, ''))) {
        sessionStorage.setItem('auth_return_url', returnUrl);
      } else if (storeSlug) {
        sessionStorage.setItem('auth_return_url', buildStorePath(storeSlug, '/cart'));
      }
      onClose();
      if (storeSlug) {
        navigate(buildStorePath(storeSlug, '/auth'));
      } else {
        // Should not happen on store routes, but avoid sending user to admin login.
        navigate("/lojas");
      }
      return;
    }

    const missingFields = [];
    if (!formData.name.trim()) missingFields.push("Nome");
    if (!formData.whatsapp.trim()) missingFields.push("WhatsApp");

    if (missingFields.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: `Preencha: ${missingFields.join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    if (!savedAddress) {
      toast({
        title: "Endereço não confirmado",
        description: "Clique em 'Salvar Endereço' antes de continuar.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const paymentLabels: Record<string, string> = {
        pix: "PIX",
        cartao: "Cartão na Entrega",
        dinheiro: "Dinheiro na Entrega"
      };

      const orderData = {
        address: {
          ...savedAddress,
          fullAddress: `${savedAddress.address}, ${savedAddress.number}${savedAddress.complement ? ` - ${savedAddress.complement}` : ''}, ${savedAddress.neighborhood}, ${savedAddress.city} - ${savedAddress.state}, ${savedAddress.cep}`
        },
        paymentMethod: paymentLabels[paymentMethod] || "PIX",
        deliveryTime: "20-30 min",
        deliveryFee,
        couponDiscount: currentDiscount,
        appliedCoupon: appliedCoupon ? {
          code: appliedCoupon.code,
          discount_type: appliedCoupon.discount_type,
          discount_value: appliedCoupon.discount_value,
        } : null,
        notes: "",
        orderObservations: orderObservations.trim() || null,
        cashAmount: paymentMethod === "dinheiro" && changeAmount 
          ? parseFloat(changeAmount.replace(',', '.')) 
          : null,
        customerName: formData.name,
        customerWhatsapp: formData.whatsapp,
        establishment_id: establishment?.id
      };

      // Save profile data for next orders
      await supabase
        .from('profiles')
        .update({
          full_name: formData.name,
          phone: formData.whatsapp,
          address: JSON.stringify({
            street: savedAddress.address,
            number: savedAddress.number,
            neighborhood: savedAddress.neighborhood,
            complement: savedAddress.complement,
            city: savedAddress.city,
            state: savedAddress.state,
            cep: savedAddress.cep
          })
        })
        .eq('id', user.id);

      const result = await placeOrder(orderData);
      
      if (result.success) {
        if (appliedCoupon && result.orderId) {
          await recordCouponUse(result.orderId);
        }
        
        // Prepare invoice data
        const cashAmountValue = paymentMethod === "dinheiro" && changeAmount 
          ? parseFloat(changeAmount.replace(',', '.')) 
          : null;
        const changeValue = cashAmountValue && cashAmountValue > total 
          ? cashAmountValue - total 
          : 0;
        
        const newInvoiceData = {
          invoiceNumber: result.orderId?.slice(0, 8).toUpperCase() || Date.now().toString().slice(-8),
          date: new Date().toISOString(),
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
            specifications: item.selectedVariants || null
          })),
          subtotal,
          discount: currentDiscount,
          deliveryFee,
          total,
          paymentMethod: paymentLabels[paymentMethod] || "PIX",
          cashAmount: cashAmountValue,
          change: changeValue,
          customerName: formData.name,
          customerPhone: formData.whatsapp,
          establishment: {
            name: establishment?.name || "Estabelecimento",
            whatsapp: settings?.whatsapp || undefined,
            email: settings?.email || undefined,
            address: settings?.address || undefined
          },
          orderObservations: orderObservations.trim() || null
        };
        
        setInvoiceData(newInvoiceData);
        
        toast({
          title: "Pedido realizado! 🎉",
          description: `Pedido #${result.orderId?.slice(0, 8)} enviado com sucesso!`,
        });
        
        onClose();
        // Show invoice modal after a short delay
        setTimeout(() => setShowInvoice(true), 300);
      } else {
        toast({
          title: "Erro no pedido",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const cashAmountValue = changeAmount ? parseFloat(changeAmount.replace(',', '.')) : 0;
  const isCashPaymentValid = paymentMethod !== "dinheiro" || (cashAmountValue >= total);
  
  const hasFormData = 
    formData.cep.trim() && 
    formData.address.trim() && 
    formData.neighborhood.trim() && 
    formData.number.trim();
    
  const hasRequiredFields = 
    formData.name.trim() && 
    formData.whatsapp.trim() && 
    savedAddress !== null &&
    isCashPaymentValid;

  if (items.length === 0) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
          <div className="flex flex-col items-center justify-center h-full px-4">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Carrinho vazio</h2>
            <p className="text-muted-foreground text-center mb-6">
              Adicione produtos antes de finalizar
            </p>
            <Button onClick={onClose} className="h-12 px-8">
              Continuar comprando
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-3xl p-0 overflow-hidden" hideCloseButton>
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-4 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">
                Finalizar Pedido
              </SheetTitle>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Resumo do Pedido */}
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'itens'}
                </span>
                <span className="font-bold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {items.slice(0, 4).map((item) => (
                  <img 
                    key={item.id}
                    src={item.image} 
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                ))}
                {items.length > 4 && (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                    +{items.length - 4}
                  </div>
                )}
              </div>
            </div>

            {/* Dados do Cliente */}
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-primary" />
                Seus Dados
              </h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nome completo *</Label>
                  <Input 
                    placeholder="Seu nome" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    WhatsApp *
                  </Label>
                  <Input 
                    placeholder="(00) 00000-0000" 
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    className="h-11"
                    type="tel"
                  />
                </div>
              </div>
            </div>

            {/* Endereço de Entrega */}
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-green-600" />
                Endereço de Entrega
              </h3>
              
              {savedAddress ? (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">{savedAddress.address}, {savedAddress.number}</p>
                  <p className="text-sm text-muted-foreground">
                    {savedAddress.neighborhood}, {savedAddress.city} - {savedAddress.state}
                  </p>
                  <p className="text-sm text-muted-foreground">CEP: {savedAddress.cep}</p>
                  {savedAddress.complement && (
                    <p className="text-sm text-muted-foreground">{savedAddress.complement}</p>
                  )}
                  <button 
                    onClick={handleEditAddress}
                    className="text-xs text-primary font-medium mt-2"
                  >
                    Editar endereço
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative">
                      <Label className="text-xs">CEP *</Label>
                      <Input 
                        value={formData.cep || ""}
                        onChange={(e) => handleCepChange(e.target.value)}
                        className="h-10 text-sm"
                        placeholder="00000-000"
                        maxLength={9}
                      />
                      {isLoadingCep && (
                        <Loader2 className="absolute right-2 top-6 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Cidade</Label>
                      <Input 
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="h-10 text-sm"
                        placeholder="Cidade"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">UF</Label>
                      <Input 
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                        className="h-10 text-sm"
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Bairro *</Label>
                    <Input 
                      placeholder="Bairro" 
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                      className="h-10"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Rua *</Label>
                      <Input 
                        placeholder="Nome da rua" 
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nº *</Label>
                      <Input 
                        placeholder="123" 
                        value={formData.number}
                        onChange={(e) => setFormData({...formData, number: e.target.value})}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Complemento</Label>
                    <Input 
                      placeholder="Apto, bloco (opcional)" 
                      value={formData.complement}
                      onChange={(e) => setFormData({...formData, complement: e.target.value})}
                      className="h-10"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveAddress}
                    className="w-full"
                    disabled={!hasFormData}
                  >
                    Salvar Endereço
                  </Button>
                </div>
              )}
            </div>

            {/* Observações do Pedido */}
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Observações do Pedido
              </h3>
              <Textarea
                placeholder="Ex: Remover cebola, ponto de referência, quem procurar na hora..."
                value={orderObservations}
                onChange={(e) => setOrderObservations(e.target.value)}
                className="min-h-[70px] text-sm"
                maxLength={500}
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{orderObservations.length}/500</p>
            </div>

            {/* Forma de Pagamento */}
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-purple-600" />
                Forma de Pagamento
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod("pix")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === "pix" 
                      ? "border-primary bg-primary/10" 
                      : "border-border"
                  }`}
                >
                  <DollarSign className={`h-5 w-5 ${paymentMethod === "pix" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-medium ${paymentMethod === "pix" ? "text-primary" : ""}`}>PIX</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("cartao")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === "cartao" 
                      ? "border-primary bg-primary/10" 
                      : "border-border"
                  }`}
                >
                  <CreditCard className={`h-5 w-5 ${paymentMethod === "cartao" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-medium ${paymentMethod === "cartao" ? "text-primary" : ""}`}>Cartão</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("dinheiro")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === "dinheiro" 
                      ? "border-primary bg-primary/10" 
                      : "border-border"
                  }`}
                >
                  <Banknote className={`h-5 w-5 ${paymentMethod === "dinheiro" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-medium ${paymentMethod === "dinheiro" ? "text-primary" : ""}`}>Dinheiro</span>
                </button>
              </div>
              
            {/* Campo de Valor em Dinheiro para Troco */}
              {paymentMethod === "dinheiro" && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs">Vai pagar com quanto? *</Label>
                  <Input 
                    placeholder="Ex: 100,00" 
                    value={changeAmount}
                    onChange={(e) => setChangeAmount(e.target.value)}
                    className="h-10"
                    type="text"
                  />
                  {changeAmount && parseFloat(changeAmount.replace(',', '.')) >= total && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 flex justify-between items-center">
                      <span className="text-xs text-green-600 font-medium">Troco:</span>
                      <span className="text-sm font-bold text-green-600">
                        {formatPrice(parseFloat(changeAmount.replace(',', '.')) - total)}
                      </span>
                    </div>
                  )}
                  {changeAmount && parseFloat(changeAmount.replace(',', '.')) < total && (
                    <p className="text-xs text-destructive">
                      Valor insuficiente. O total é {formatPrice(total)}
                    </p>
                  )}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                {paymentMethod === "pix" && "Você receberá o código PIX após confirmar"}
                {paymentMethod === "cartao" && "Pague com cartão na entrega"}
                {paymentMethod === "dinheiro" && "Pague em dinheiro na entrega"}
              </p>
            </div>

            {/* Cupom */}
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Tag className="h-4 w-4 text-orange-600" />
                  Cupom
                </h3>
                {!appliedCoupon && !showCouponInput && (
                  <button 
                    onClick={() => setShowCouponInput(true)}
                    className="text-sm text-primary font-medium"
                  >
                    Adicionar
                  </button>
                )}
              </div>

              {appliedCoupon && (
                <div className="mt-3 flex items-center justify-between p-3 bg-green-500/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700">{appliedCoupon.code}</p>
                      <p className="text-xs text-green-600">-{formatPrice(currentDiscount)}</p>
                    </div>
                  </div>
                  <button onClick={handleRemoveCoupon} className="p-1 text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {showCouponInput && !appliedCoupon && (
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Código do cupom"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    className="h-10"
                  />
                  <Button 
                    onClick={handleApplyCoupon} 
                    disabled={isValidating || !couponCode.trim()}
                    className="h-10 px-4"
                    size="sm"
                  >
                    {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Bottom */}
          <div className="flex-shrink-0 border-t bg-background px-4 py-4">
            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrega</span>
                <span>{deliveryFee === 0 ? "Grátis" : formatPrice(deliveryFee)}</span>
              </div>
              {currentDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto</span>
                  <span>-{formatPrice(currentDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            
            <Button 
              className="w-full h-14 text-base font-semibold"
              onClick={handlePlaceOrder}
              disabled={isProcessing || !hasRequiredFields}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Enviando pedido...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Confirmar Pedido • {formatPrice(total)}
                </>
              )}
            </Button>
            
            {!hasRequiredFields && (
              <p className="text-xs text-destructive text-center mt-2">
                {!isCashPaymentValid 
                  ? "Informe um valor em dinheiro válido para calcular o troco"
                  : "Preencha todos os campos obrigatórios"}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
      
      {/* Service Invoice Modal */}
      {invoiceData && (
        <ServiceInvoice
          isOpen={showInvoice}
          onClose={() => setShowInvoice(false)}
          data={invoiceData}
        />
      )}
    </Sheet>
  );
};

export default CheckoutModal;
