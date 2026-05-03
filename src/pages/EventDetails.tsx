import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { buildStorePath, getSubdomainSlug } from "@/utils/subdomain";
import { 
  Calendar, MapPin, Clock, ArrowLeft, Ticket, Users, 
  Minus, Plus, ShoppingCart, CreditCard, Share2, Heart,
  CheckCircle, AlertCircle, Sparkles, Star, ChevronDown,
  Map, Play, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentCheckout } from "@/components/PaymentCheckout";

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  event_time: string;
  location: string | null;
  image_url: string | null;
  map_image_url: string | null;
  youtube_url: string | null;
  is_active: boolean;
  establishment_id: string | null;
}

interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  is_active: boolean;
  batch_id: string | null;
  batch?: {
    id: string;
    name: string;
  } | null;
}

interface TicketBatch {
  id: string;
  name: string;
  isSoldOut: boolean;
}

interface SelectedTicket {
  ticketType: TicketType;
  quantity: number;
}

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  const { toast } = useToast();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [batches, setBatches] = useState<TicketBatch[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPaymentCheckout, setShowPaymentCheckout] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [openSection, setOpenSection] = useState<string>("tickets");
  const [ticketFeePercentage, setTicketFeePercentage] = useState<number>(10);
  const [ticketFeeMinimum, setTicketFeeMinimum] = useState<number>(2.50);

  // Helper to extract YouTube video ID
  const getYouTubeVideoId = (url: string | null): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [id]);

  const fetchEventDetails = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    
    const [eventResult, ticketsResult, batchesResult, feesResult] = await Promise.all([
      supabase.from("events").select("*").eq("id", id).maybeSingle(),
      supabase.from("ticket_types").select("*, batch:ticket_batches(id, name)").eq("event_id", id).eq("is_active", true).order("price", { ascending: true }),
      supabase.from("ticket_batches").select("*").eq("event_id", id).eq("is_active", true).order("display_order"),
      supabase.from("platform_fees").select("customer_ticket_percentage, customer_ticket_minimum").eq("is_active", true).maybeSingle()
    ]);

    if (eventResult.error) {
      console.error("Error fetching event:", eventResult.error);
      toast({ title: "Erro ao carregar evento", variant: "destructive" });
      navigate("/events");
      if (!options?.silent) setLoading(false);
      return;
    }

    // Set dynamic fee rates from platform_fees
    if (feesResult.data) {
      setTicketFeePercentage(feesResult.data.customer_ticket_percentage ?? 10);
      setTicketFeeMinimum(feesResult.data.customer_ticket_minimum ?? 2.50);
    }

    const tickets = ticketsResult.data || [];
    setEvent(eventResult.data);
    setTicketTypes(tickets);
    
    // Calculate which batches are sold out
    const batchesData = batchesResult.data || [];
    const processedBatches = batchesData.map(batch => {
      const batchTickets = tickets.filter(t => t.batch_id === batch.id);
      const allSoldOut = batchTickets.length > 0 && batchTickets.every(t => t.quantity_sold >= t.quantity_available);
      return {
        id: batch.id,
        name: batch.name,
        isSoldOut: allSoldOut
      };
    });
    setBatches(processedBatches);

    if (!options?.silent) setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatEventDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return {
      day: format(date, "dd", { locale: ptBR }),
      month: format(date, "MMMM", { locale: ptBR }),
      year: format(date, "yyyy", { locale: ptBR }),
      weekday: format(date, "EEEE", { locale: ptBR }),
      full: format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR }),
    };
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  const getAvailableQuantity = (ticket: TicketType) => {
    return ticket.quantity_available - ticket.quantity_sold;
  };

  // Check if ticket is free (price = 0)
  const isFreeTicket = (ticket: TicketType) => {
    return ticket.price === 0;
  };

  // Get max quantity allowed for a ticket (free tickets = 1, paid = 10)
  const getMaxQuantityAllowed = (ticket: TicketType) => {
    return isFreeTicket(ticket) ? 1 : 10;
  };

  const updateTicketQuantity = (ticketId: string, delta: number) => {
    setSelectedTickets((prev) => {
      const current = prev[ticketId] || 0;
      const ticket = ticketTypes.find((t) => t.id === ticketId);
      if (!ticket) return prev;
      
      const available = getAvailableQuantity(ticket);
      const maxAllowed = getMaxQuantityAllowed(ticket);
      const newQuantity = Math.max(0, Math.min(current + delta, available, maxAllowed));
      
      if (newQuantity === 0) {
        const { [ticketId]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [ticketId]: newQuantity };
    });
  };

  const getSubtotal = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      const ticket = ticketTypes.find((t) => t.id === ticketId);
      return total + (ticket ? ticket.price * quantity : 0);
    }, 0);
  };

  const getTotalFee = () => {
    // If percentage is 0, no fee is charged
    if (ticketFeePercentage === 0 && ticketFeeMinimum === 0) return 0;
    
    return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      const ticket = ticketTypes.find((t) => t.id === ticketId);
      if (!ticket || ticket.price === 0) return total;
      
      // Use dynamic fee from platform_fees
      const subtotal = ticket.price * quantity;
      const percentageFee = subtotal * (ticketFeePercentage / 100);
      const minimumFee = ticketFeeMinimum * quantity;
      return total + Math.max(percentageFee, minimumFee);
    }, 0);
  };

  const getTotalPrice = () => {
    return getSubtotal() + getTotalFee();
  };

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const getStoreSlugFromPath = () => window.location.pathname.split("/")[2] || "";

  const requireAuthenticatedUser = async () => {
    const slug = getStoreSlugFromPath();
    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;

    if (!sessionUser) {
      // Store current URL for redirect after login
      sessionStorage.setItem("auth_return_url", window.location.pathname);

      // Close any checkout UI to avoid looping errors
      setShowPaymentCheckout(false);
      setShowConfirmDialog(false);

      toast({
        title: "Login necessário",
        description: "Faça login para concluir a compra",
      });

      navigate(buildStorePath(slug, '/auth'));
      return null;
    }

    return { userId: sessionUser.id, slug };
  };

  const handlePurchase = async () => {
    // Double-check session (AuthContext may be stale on expired sessions)
    const auth = await requireAuthenticatedUser();
    if (!auth) return;
    
    if (getTotalTickets() === 0) {
      toast({
        title: "Selecione ingressos",
        description: "Adicione pelo menos um ingresso ao carrinho",
        variant: "destructive",
      });
      return;
    }
    
    // Check if all selected tickets are free
    const hasPaidTickets = Object.entries(selectedTickets).some(([ticketId]) => {
      const ticket = ticketTypes.find(t => t.id === ticketId);
      return ticket && ticket.price > 0;
    });

    if (hasPaidTickets) {
      // Open payment checkout for paid tickets
      setShowPaymentCheckout(true);
    } else {
      // For free tickets, show simple confirmation dialog
      setShowConfirmDialog(true);
    }
  };

  const confirmPurchase = async () => {
    const auth = await requireAuthenticatedUser();
    if (!auth) return;
    if (!event || !id) {
      toast({
        title: "Erro na compra",
        description: "Sessão expirada ou dados não encontrados. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);
    
    try {
      // Check if user already has free tickets for this event
      const freeTicketTypes = Object.keys(selectedTickets).filter(ticketId => {
        const ticket = ticketTypes.find(t => t.id === ticketId);
        return ticket && ticket.price === 0;
      });

      if (freeTicketTypes.length > 0) {
        // Check existing free tickets for this user and event
        const { data: existingTickets, error: checkError } = await supabase
          .from('tickets')
          .select('ticket_type_id')
          .eq('user_id', auth.userId)
          .eq('event_id', id)
          .in('ticket_type_id', freeTicketTypes);

        if (checkError) throw checkError;

        if (existingTickets && existingTickets.length > 0) {
          const existingFreeTypes = existingTickets.map(t => t.ticket_type_id);
          const alreadyHasFree = freeTicketTypes.some(typeId => existingFreeTypes.includes(typeId));
          
          if (alreadyHasFree) {
            toast({
              title: "Ingresso gratuito já resgatado",
              description: "Você já possui um ingresso gratuito para este evento. Limite de 1 por pessoa.",
              variant: "destructive",
            });
            setPurchasing(false);
            return;
          }
        }
      }

      // Process each selected ticket type
      for (const [ticketId, quantity] of Object.entries(selectedTickets)) {
        const ticket = ticketTypes.find((t) => t.id === ticketId);
        if (!ticket) continue;
        
        // Update quantity sold
        const { error: updateError } = await supabase
          .from("ticket_types")
          .update({ quantity_sold: ticket.quantity_sold + quantity })
          .eq("id", ticketId);
        
        if (updateError) throw updateError;

        // Calculate prices using dynamic fees
        const subtotalValue = ticket.price * quantity;
        let feeValue = 0;
        if (ticket.price > 0 && (ticketFeePercentage > 0 || ticketFeeMinimum > 0)) {
          const percentageFee = subtotalValue * (ticketFeePercentage / 100);
          const minimumFee = ticketFeeMinimum * quantity;
          feeValue = Math.max(percentageFee, minimumFee);
        }
        const totalValue = subtotalValue + feeValue;

        // Create ticket sale record for financial tracking
        const { data: saleData, error: saleError } = await supabase
          .from("ticket_sales")
          .insert({
            user_id: auth.userId,
            event_id: id,
            ticket_type_id: ticketId,
            quantity: quantity,
            unit_price: ticket.price,
            subtotal: subtotalValue,
            fee_amount: feeValue,
            total_price: totalValue,
            payment_status: 'completed',
            establishment_id: event.establishment_id
          })
          .select()
          .single();
        
        if (saleError) {
          console.error("Ticket sale error:", saleError);
          throw saleError;
        }

        // Create individual tickets with unique QR codes for each purchased
        const { createIndividualTickets } = await import('@/utils/ticketUtils');
        const ticketsResult = await createIndividualTickets(
          saleData.id,
          ticketId,
          id,
          auth.userId,
          quantity
        );
        
        if (!ticketsResult.success) {
          throw new Error(ticketsResult.error || 'Erro ao criar ingressos');
        }
      }
      
      // Show success
      setPurchaseSuccess(true);
      setSelectedTickets({});
      
      // Refresh data
      await fetchEventDetails({ silent: true });
      
      toast({
        title: "Compra realizada!",
        description: "Seus ingressos foram reservados com sucesso.",
      });
    } catch (error: any) {
      console.error("Error purchasing tickets:", error);
      toast({
        title: "Erro na compra",
        description: error?.message || "Não foi possível completar a compra. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  // Handle payment from PaymentCheckout component
  const handlePaymentComplete = async (paymentMethod: string, paymentData: any) => {
    const auth = await requireAuthenticatedUser();
    if (!auth) throw new Error("__AUTH_REQUIRED__");
    if (!event || !id) throw new Error("Dados não encontrados. Tente novamente.");

    // Process each selected ticket type
    for (const [ticketId, quantity] of Object.entries(selectedTickets)) {
      const ticket = ticketTypes.find((t) => t.id === ticketId);
      if (!ticket) continue;
      
      // Update quantity sold
      const { error: updateError } = await supabase
        .from("ticket_types")
        .update({ quantity_sold: ticket.quantity_sold + quantity })
        .eq("id", ticketId);
      
      if (updateError) throw updateError;

      // Calculate prices using dynamic fees
      const subtotalValue = ticket.price * quantity;
      let feeValue = 0;
      if (ticket.price > 0 && (ticketFeePercentage > 0 || ticketFeeMinimum > 0)) {
        const percentageFee = subtotalValue * (ticketFeePercentage / 100);
        const minimumFee = ticketFeeMinimum * quantity;
        feeValue = Math.max(percentageFee, minimumFee);
      }
      const totalValue = subtotalValue + feeValue;

      // Create ticket sale record for financial tracking
      const { data: saleData, error: saleError } = await supabase
        .from("ticket_sales")
        .insert({
          user_id: auth.userId,
          event_id: id,
          ticket_type_id: ticketId,
          quantity: quantity,
          unit_price: ticket.price,
          subtotal: subtotalValue,
          fee_amount: feeValue,
          total_price: totalValue,
          payment_status: 'completed',
          establishment_id: event.establishment_id
        })
        .select()
        .single();
      
      if (saleError) {
        console.error("Ticket sale error:", saleError);
        throw saleError;
      }

      // Create individual tickets with unique QR codes for each purchased
      const { createIndividualTickets } = await import('@/utils/ticketUtils');
      const ticketsResult = await createIndividualTickets(
        saleData.id,
        ticketId,
        id,
        auth.userId,
        quantity
      );
      
      if (!ticketsResult.success) {
        throw new Error(ticketsResult.error || 'Erro ao criar ingressos');
      }
    }
    
    // Clear selected tickets and refresh
    setSelectedTickets({});
    await fetchEventDetails({ silent: true });
  };

  // Prepare items for PaymentCheckout
  const getPaymentItems = () => {
    return Object.entries(selectedTickets).map(([ticketId, quantity]) => {
      const ticket = ticketTypes.find(t => t.id === ticketId);
      return {
        id: ticketId,
        name: ticket?.name || 'Ingresso',
        quantity,
        unitPrice: ticket?.price || 0,
        totalPrice: (ticket?.price || 0) * quantity
      };
    });
  };

  const handleShare = async () => {
    if (navigator.share && event) {
      try {
        await navigator.share({
          title: event.name,
          text: `Confira o evento: ${event.name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copiado!" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSearchChange={() => {}} cartCount={getTotalItems()} />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-64 md:h-96 w-full rounded-2xl mb-6" />
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSearchChange={() => {}} cartCount={getTotalItems()} />
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Evento não encontrado</h1>
          <p className="text-muted-foreground mb-6">O evento que você está procurando não existe ou foi removido.</p>
          <Button asChild>
            <Link to="/events">Ver todos os eventos</Link>
          </Button>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const dateInfo = formatEventDate(event.event_date);
  const isEventPast = isBefore(parseISO(event.event_date), new Date());
  const totalAvailable = ticketTypes.reduce((sum, t) => sum + getAvailableQuantity(t), 0);

  return (
    <div className="min-h-screen bg-background pb-32">
      <DynamicThemeStyles />
      <Header onSearchChange={() => {}} cartCount={getTotalItems()} />
      
      {/* Hero Image */}
      <div className="relative h-56 md:h-[400px] overflow-hidden">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary via-primary/80 to-primary-dark flex items-center justify-center">
            <Ticket className="w-24 h-24 text-white/30" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        
        {/* Back Button - Minimalist */}
        <button
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              // Fallback to establishment home or events page
              const detectedSlug = getSubdomainSlug() || window.location.pathname.split('/')[2];
              navigate(detectedSlug ? buildStorePath(detectedSlug, '') : '/events');
            }
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        {/* Status Badge */}
        {isEventPast ? (
          <Badge variant="secondary" className="absolute bottom-4 right-4 bg-muted text-muted-foreground">
            Evento encerrado
          </Badge>
        ) : totalAvailable === 0 ? (
          <Badge variant="destructive" className="absolute bottom-4 right-4">
            Esgotado
          </Badge>
        ) : totalAvailable <= 50 ? (
          <Badge className="absolute bottom-4 right-4 bg-amber-500 text-white border-0">
            <Sparkles className="w-3 h-3 mr-1" />
            Últimas vagas
          </Badge>
        ) : null}
      </div>

      <div className="container mx-auto px-4 pt-4">
        {/* Event Info */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-foreground mb-4">
            {event.name}
          </h1>
          
          {/* Date, Time, Location - Horizontal grid on mobile */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-4 text-muted-foreground mb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-medium text-foreground">{dateInfo.day}/{dateInfo.month}</div>
                <div className="text-[10px] sm:text-xs capitalize truncate">{dateInfo.weekday}</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-medium text-foreground">{formatTime(event.event_time)}</div>
                <div className="text-[10px] sm:text-xs">Horário</div>
              </div>
            </div>
            
            {event.location ? (
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0 max-w-full overflow-hidden">
                  <div className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[80px] sm:max-w-none">{event.location}</div>
                  <div className="text-[10px] sm:text-xs">Local</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-foreground">A definir</div>
                  <div className="text-[10px] sm:text-xs">Local</div>
                </div>
              </div>
            )}
          </div>

          {event.description && (
            <Collapsible open={openSection === "about"} onOpenChange={() => setOpenSection(openSection === "about" ? "" : "about")}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-y border-border">
                <span className="font-semibold text-foreground">Sobre o evento</span>
                <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", openSection === "about" && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="py-4">
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Tickets Section */}
        <Collapsible open={openSection === "tickets"} onOpenChange={() => setOpenSection(openSection === "tickets" ? "" : "tickets")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-y border-border">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Ingressos</span>
            </div>
            <div className="flex items-center gap-2">
              {totalAvailable > 0 && (
                <Badge variant="outline" className="text-xs">
                  {totalAvailable} disponíveis
                </Badge>
              )}
              <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", openSection === "tickets" && "rotate-180")} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="py-4">
            <div className="space-y-4">
              {/* Batch indicators */}
              {batches.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {batches.map(batch => (
                    <Badge 
                      key={batch.id} 
                      variant={batch.isSoldOut ? "secondary" : "outline"}
                      className={cn(
                        "text-xs",
                        batch.isSoldOut && "bg-muted/80 text-muted-foreground line-through"
                      )}
                    >
                      {batch.name}
                      {batch.isSoldOut && " — Esgotado"}
                    </Badge>
                  ))}
                </div>
              )}

              {ticketTypes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum tipo de ingresso disponível</p>
                </div>
              ) : (
                ticketTypes.map((ticket) => {
                  const available = getAvailableQuantity(ticket);
                  const selected = selectedTickets[ticket.id] || 0;
                  const isSoldOut = available === 0;
                  const isPopular = ticket.quantity_sold > 0 && ticket.quantity_sold >= (ticket.quantity_available * 0.5);
                  const batchInfo = ticket.batch;
                  const batchSoldOut = batchInfo ? batches.find(b => b.id === batchInfo.id)?.isSoldOut : false;
                  
                  return (
                    <Card
                      key={ticket.id}
                      className={cn(
                        "p-4 border transition-all duration-200",
                        selected > 0 ? "border-primary bg-primary/5" : "border-border",
                        (isSoldOut || batchSoldOut) && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-foreground">{ticket.name}</h3>
                            {batchInfo && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {batchInfo.name}
                              </span>
                            )}
                            {isPopular && !isSoldOut && !batchSoldOut && (
                              <span className="text-xs text-primary font-medium">
                                Popular
                              </span>
                            )}
                          </div>
                          {ticket.description && (
                            <p className="text-sm text-muted-foreground mb-2">{ticket.description}</p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xl font-bold text-primary">
                              {ticket.price === 0 ? "Grátis" : formatCurrency(ticket.price)}
                            </span>
                            {ticket.price === 0 && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                Limite: 1 por pessoa
                              </span>
                            )}
                            {!isSoldOut && !batchSoldOut && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {available} restantes
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          {isSoldOut || batchSoldOut ? (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground">
                              Esgotado
                            </Badge>
                          ) : isEventPast ? (
                            <Badge variant="secondary">Encerrado</Badge>
                          ) : (
                            <div className="flex items-center gap-2 bg-secondary rounded-full p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => updateTicketQuantity(ticket.id, -1)}
                                disabled={selected === 0}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-6 text-center font-semibold">{selected}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => updateTicketQuantity(ticket.id, 1)}
                                disabled={selected >= Math.min(available, getMaxQuantityAllowed(ticket))}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Map Section - Below Tickets */}
        {event.map_image_url && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Map className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Mapa do Evento</h3>
                <p className="text-xs text-muted-foreground">Layout do local e setores</p>
              </div>
            </div>
            <Card className="overflow-hidden border-0 bg-card/50">
              <img
                src={event.map_image_url}
                alt="Mapa do evento"
                className="w-full h-auto object-contain max-h-[400px] sm:max-h-[500px] md:max-h-[600px]"
              />
            </Card>
          </div>
        )}

        {/* Video Section - Below Map */}
        {event.youtube_url && getYouTubeVideoId(event.youtube_url) && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Play className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Vídeo do Evento</h3>
                <p className="text-xs text-muted-foreground">Assista ao vídeo promocional</p>
              </div>
            </div>
            <Card className="overflow-hidden border-0 bg-card/50">
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${getYouTubeVideoId(event.youtube_url)}`}
                  title="Vídeo do evento"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Fixed Bottom Purchase Bar */}
      {!isEventPast && totalAvailable > 0 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 z-40">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">
                {getTotalTickets() > 0 ? `${getTotalTickets()} ingresso(s)` : "Selecione ingressos"}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(getTotalPrice())}
              </div>
            </div>
            <Button
              size="lg"
              className="px-8 rounded-full"
              onClick={handlePurchase}
              disabled={getTotalTickets() === 0}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Comprar
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          {purchaseSuccess ? (
            <>
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <DialogTitle className="text-2xl mb-2">Compra Confirmada!</DialogTitle>
                <DialogDescription>
                  Seus ingressos foram reservados com sucesso. Apresente este comprovante na entrada do evento.
                </DialogDescription>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setPurchaseSuccess(false);
                    const detectedSlug = getSubdomainSlug() || window.location.pathname.split('/')[2];
                    navigate(detectedSlug ? buildStorePath(detectedSlug, '/tickets') : '/tickets');
                  }}
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  Meus Ingressos
                </Button>
                <Button 
                  variant="outline"
                  className="w-full" 
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setPurchaseSuccess(false);
                  }}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirmar Compra</DialogTitle>
                <DialogDescription>
                  Revise seus ingressos antes de confirmar
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-3">
                {Object.entries(selectedTickets).map(([ticketId, quantity]) => {
                  const ticket = ticketTypes.find((t) => t.id === ticketId);
                  if (!ticket) return null;
                  
                  return (
                    <div key={ticketId} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{ticket.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {quantity}x {formatCurrency(ticket.price)}
                        </div>
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(ticket.price * quantity)}
                      </div>
                    </div>
                  );
                })}
                
                <Separator />
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(getSubtotal())}</span>
                </div>
                
                {getTotalFee() > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Taxa de serviço</span>
                    <span>{formatCurrency(getTotalFee())}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(getTotalPrice())}</span>
                </div>
              </div>
              
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button 
                  className="w-full" 
                  onClick={confirmPurchase}
                  disabled={purchasing}
                >
                  {purchasing ? (
                    <>Processando...</>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Confirmar Compra
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={purchasing}
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Checkout for paid tickets */}
      <PaymentCheckout
        isOpen={showPaymentCheckout}
        onClose={() => setShowPaymentCheckout(false)}
        items={getPaymentItems()}
        subtotal={getSubtotal()}
        serviceFee={getTotalFee()}
        serviceFeeLabel={ticketFeePercentage > 0 || ticketFeeMinimum > 0 
          ? `${ticketFeePercentage}%${ticketFeeMinimum > 0 ? ` ou mínimo R$${ticketFeeMinimum.toFixed(2)}` : ''}`
          : undefined
        }
        total={getTotalPrice()}
        onPaymentComplete={handlePaymentComplete}
        type="ticket"
        establishmentSlug={window.location.pathname.split('/')[2]}
      />

      <Footer />
      <BottomNavigation />
    </div>
  );
};

export default EventDetails;
