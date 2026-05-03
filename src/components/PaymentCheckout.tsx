import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CreditCard, ArrowLeft, ArrowRight, 
  CheckCircle, Copy, Loader2, Lock, Ticket, QrCode, ShoppingBag, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { ConfettiEffect } from "./ConfettiEffect";

interface PaymentItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface PaymentCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  items: PaymentItem[];
  subtotal: number;
  serviceFee?: number;
  serviceFeeLabel?: string;
  total: number;
  onPaymentComplete: (paymentMethod: string, paymentData: any) => Promise<void>;
  type: 'ticket' | 'product';
  establishmentSlug?: string;
}

type PaymentMethod = 'pix' | 'card';
type CheckoutStep = 'payment-method' | 'cpf' | 'payment' | 'processing' | 'success';

interface CardData {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatCardNumber = (value: string) => {
  const v = value.replace(/\D/g, '').slice(0, 16);
  const parts = [];
  for (let i = 0; i < v.length; i += 4) {
    parts.push(v.slice(i, i + 4));
  }
  return parts.join(' ');
};

const formatExpiry = (value: string) => {
  const v = value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 2) {
    return v.slice(0, 2) + '/' + v.slice(2);
  }
  return v;
};

const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0000-00
    return digits.slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
};

const validateCpfCnpj = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 || digits.length === 14;
};

export const PaymentCheckout = ({
  isOpen,
  onClose,
  items,
  subtotal,
  serviceFee = 0,
  serviceFeeLabel,
  total,
  onPaymentComplete,
  type,
  establishmentSlug
}: PaymentCheckoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<CheckoutStep>('payment-method');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pixCode, setPixCode] = useState<string>('');
  const [cpfCnpj, setCpfCnpj] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [purchaseCompleted, setPurchaseCompleted] = useState(false);
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });

  // Reset state when dialog opens (only if purchase was not just completed)
  useEffect(() => {
    if (isOpen && !purchaseCompleted) {
      setStep('payment-method');
      setPaymentMethod(null);
      setProcessing(false);
      setPixCode('');
      setCpfCnpj('');
      setShowConfetti(false);
      setCardData({ number: '', name: '', expiry: '', cvv: '' });
    }
  }, [isOpen]);

  // Reset purchaseCompleted flag when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPurchaseCompleted(false);
    }
  }, [isOpen]);

  // Generate mock PIX code for test mode
  const generatePixCode = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `00020126580014BR.GOV.BCB.PIX0136${random}${timestamp}52040000530398654${total.toFixed(2).replace('.', '')}5802BR5925ESTABELECIMENTO TESTE6009SAO PAULO62070503***6304`;
  };

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === 'pix') {
      setPixCode(generatePixCode());
    }
    setStep('cpf');
  };

  const handleCopyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    toast({ title: "Código PIX copiado!" });
  };

  const validateCardData = () => {
    const { number, name, expiry, cvv } = cardData;
    if (number.replace(/\D/g, '').length < 16) {
      toast({ title: "Número do cartão inválido", variant: "destructive" });
      return false;
    }
    if (name.trim().length < 3) {
      toast({ title: "Nome do titular inválido", variant: "destructive" });
      return false;
    }
    if (expiry.length < 5) {
      toast({ title: "Validade inválida", variant: "destructive" });
      return false;
    }
    if (cvv.length < 3) {
      toast({ title: "CVV inválido", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateCpfCnpjField = () => {
    if (!validateCpfCnpj(cpfCnpj)) {
      toast({ title: "CPF/CNPJ inválido", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleContinueToCpf = () => {
    setStep('cpf');
  };

  const handleContinueToPayment = () => {
    if (!validateCpfCnpjField()) return;
    setStep('payment');
  };

  const handleConfirmPayment = async () => {
    if (paymentMethod === 'card' && !validateCardData()) {
      return;
    }

    setStep('processing');
    setProcessing(true);

    try {
      // Simulate payment processing (test mode)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const paymentData = {
        method: paymentMethod,
        status: 'completed',
        transactionId: `TEST_${Date.now()}`,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        ...(paymentMethod === 'pix' ? { pixCode } : { 
          cardLast4: cardData.number.replace(/\D/g, '').slice(-4) 
        })
      };

      await onPaymentComplete(paymentMethod!, paymentData);
      setPurchaseCompleted(true);
      setShowConfetti(true);
      setStep('success');
    } catch (error: any) {
      console.error('Payment error:', error);

      // Auth required: parent will redirect and close the modal
      if (error?.message === '__AUTH_REQUIRED__') {
        onClose();
        return;
      }

      toast({
        title: "Erro na compra",
        description: error?.message || "Não foi possível processar a compra. Tente novamente.",
        variant: "destructive"
      });
      setStep('cpf');
    } finally {
      setProcessing(false);
    }
  };

  const handleGoToTickets = () => {
    onClose();
    if (establishmentSlug) {
      navigate(`/loja/${establishmentSlug}/tickets`);
    }
  };

  const handleGoToOrders = () => {
    onClose();
    if (establishmentSlug) {
      navigate(`/loja/${establishmentSlug}/orders`);
    }
  };

  const handleClose = () => {
    if (!processing) {
      onClose();
    }
  };

  const goBack = () => {
    if (step === 'cpf') {
      setStep('payment-method');
      setPaymentMethod(null);
    } else if (step === 'payment') {
      setStep('cpf');
    }
  };

  const stepIndicator = () => {
    const steps = [
      { key: 'payment-method', label: 'Método' },
      { key: 'cpf', label: 'Dados' },
      { key: 'payment', label: 'Pagamento' },
      { key: 'success', label: 'Confirmação' }
    ];

    const getCurrentIndex = () => {
      if (step === 'processing') return 2;
      const idx = steps.findIndex(s => s.key === step);
      return idx >= 0 ? idx : 0;
    };

    const currentIndex = getCurrentIndex();

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, index) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              index <= currentIndex 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {index < currentIndex || step === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-6 h-0.5 transition-colors",
                index < currentIndex ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {step !== 'success' && step !== 'processing' && stepIndicator()}

        {/* Step 1: Payment Method Selection */}
        {step === 'payment-method' && (
          <>
            <DialogHeader>
              <DialogTitle>Forma de Pagamento</DialogTitle>
              <DialogDescription>
                Escolha como deseja pagar
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4">
              {/* Summary preview */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg mb-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
                {type === 'ticket' && serviceFee > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Taxa de Serviço</span>
                        {serviceFeeLabel && (
                          <span className="text-xs text-muted-foreground/70">{serviceFeeLabel}</span>
                        )}
                      </div>
                      <span>{formatCurrency(serviceFee)}</span>
                    </div>
                  </>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <Card 
                className={cn(
                  "p-4 cursor-pointer transition-all hover:border-primary",
                  "border-2 hover:shadow-md"
                )}
                onClick={() => handleSelectPaymentMethod('pix')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">PIX</h3>
                    <p className="text-sm text-muted-foreground">
                      Pagamento instantâneo via QR Code
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>

              <Card 
                className={cn(
                  "p-4 cursor-pointer transition-all hover:border-primary",
                  "border-2 hover:shadow-md"
                )}
                onClick={() => handleSelectPaymentMethod('card')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Cartão de Crédito</h3>
                    <p className="text-sm text-muted-foreground">
                      Pague com cartão de crédito
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: CPF/CNPJ */}
        {step === 'cpf' && (
          <>
            <DialogHeader>
              <DialogTitle>Seus Dados</DialogTitle>
              <DialogDescription>
                Informe seu CPF ou CNPJ para continuar
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                {paymentMethod === 'pix' ? (
                  <QrCode className="w-5 h-5 text-green-600" />
                ) : (
                  <CreditCard className="w-5 h-5 text-blue-600" />
                )}
                <span className="text-sm font-medium">
                  {paymentMethod === 'pix' ? 'Pagamento via PIX' : 'Pagamento via Cartão'}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpfCnpj" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  CPF ou CNPJ
                </Label>
                <Input
                  id="cpfCnpj"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                  maxLength={18}
                />
                <p className="text-xs text-muted-foreground">
                  Necessário para emissão da nota fiscal
                </p>
              </div>

              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-center text-sm font-medium text-primary">
                  Total: {formatCurrency(total)}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={goBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button onClick={handleContinueToPayment} className="flex-1 gap-2">
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* PIX Payment */}
        {step === 'payment' && paymentMethod === 'pix' && (
          <>
            <DialogHeader>
              <DialogTitle>Pagar com PIX</DialogTitle>
              <DialogDescription>
                Escaneie o QR Code ou copie o código
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-4 bg-white rounded-xl">
                <QRCodeSVG 
                  value={pixCode} 
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>

              <div className="w-full space-y-2">
                <Label className="text-xs text-muted-foreground">Código PIX</Label>
                <div className="flex gap-2">
                  <Input 
                    value={pixCode.slice(0, 30) + '...'} 
                    readOnly 
                    className="text-xs font-mono"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyPixCode}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>Ambiente de teste - Pagamento simulado</span>
              </div>

              <div className="w-full p-3 bg-primary/10 rounded-lg">
                <p className="text-center text-sm font-medium text-primary">
                  Total: {formatCurrency(total)}
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button 
                onClick={handleConfirmPayment} 
                className="w-full gap-2"
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Confirmar Pagamento
              </Button>
              <Button 
                variant="ghost" 
                onClick={goBack}
                className="w-full gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Trocar forma de pagamento
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Card Payment */}
        {step === 'payment' && paymentMethod === 'card' && (
          <>
            <DialogHeader>
              <DialogTitle>Dados do Cartão</DialogTitle>
              <DialogDescription>
                Preencha os dados do seu cartão de crédito
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Número do Cartão</Label>
                <Input
                  id="cardNumber"
                  placeholder="0000 0000 0000 0000"
                  value={cardData.number}
                  onChange={(e) => setCardData(prev => ({
                    ...prev,
                    number: formatCardNumber(e.target.value)
                  }))}
                  maxLength={19}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardName">Nome no Cartão</Label>
                <Input
                  id="cardName"
                  placeholder="NOME COMO NO CARTÃO"
                  value={cardData.name}
                  onChange={(e) => setCardData(prev => ({
                    ...prev,
                    name: e.target.value.toUpperCase()
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cardExpiry">Validade</Label>
                  <Input
                    id="cardExpiry"
                    placeholder="MM/AA"
                    value={cardData.expiry}
                    onChange={(e) => setCardData(prev => ({
                      ...prev,
                      expiry: formatExpiry(e.target.value)
                    }))}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardCvv">CVV</Label>
                  <Input
                    id="cardCvv"
                    placeholder="000"
                    type="password"
                    value={cardData.cvv}
                    onChange={(e) => setCardData(prev => ({
                      ...prev,
                      cvv: e.target.value.replace(/\D/g, '').slice(0, 4)
                    }))}
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>Ambiente de teste - Dados não serão cobrados</span>
              </div>

              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-center text-sm font-medium text-primary">
                  Total: {formatCurrency(total)}
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button 
                onClick={handleConfirmPayment} 
                className="w-full gap-2"
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                Pagar {formatCurrency(total)}
              </Button>
              <Button 
                variant="ghost" 
                onClick={goBack}
                className="w-full gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-semibold mb-2">Processando pagamento...</h3>
            <p className="text-sm text-muted-foreground text-center">
              Aguarde enquanto confirmamos seu pagamento
            </p>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <>
            {showConfetti && <ConfettiEffect />}
            <div className="text-center py-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center animate-scale-in">
                <CheckCircle className="w-12 h-12 text-emerald-600" />
              </div>
              <DialogTitle className="text-2xl mb-3">Compra Concluída com Sucesso!</DialogTitle>
              <DialogDescription className="text-base leading-relaxed">
                {type === 'ticket' 
                  ? (
                    <>
                      Seus ingressos já estão disponíveis.
                      <br />
                      Acesse{' '}
                      <span className="font-semibold text-primary">"Meus Ingressos"</span>
                      {' '}para visualizar seus QR Codes.
                    </>
                  )
                  : (
                    <>
                      Seu pedido foi confirmado com sucesso.
                      <br />
                      Acompanhe o status em{' '}
                      <span className="font-semibold text-primary">"Meus Pedidos"</span>.
                    </>
                  )
                }
              </DialogDescription>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {type === 'ticket' ? (
                <Button className="w-full gap-2" onClick={handleGoToTickets}>
                  <Ticket className="w-4 h-4" />
                  Acessar Meus Ingressos
                </Button>
              ) : (
                <Button className="w-full gap-2" onClick={handleGoToOrders}>
                  <ShoppingBag className="w-4 h-4" />
                  Ver Meus Pedidos
                </Button>
              )}
              <Button 
                variant="outline"
                className="w-full" 
                onClick={onClose}
              >
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
