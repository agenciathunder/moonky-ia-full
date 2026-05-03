import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Clock, ChevronRight, Sparkles, Music, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNavigation from "@/components/BottomNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  event_time: string;
  location: string | null;
  image_url: string | null;
  is_active: boolean;
  establishment_id: string | null;
}

interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketCounts, setTicketCounts] = useState<Record<string, { min: number; max: number; available: number }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "this-week">("all");
  const { getTotalItems } = useCart();
  const { establishment } = useEstablishment();

  useEffect(() => {
    if (establishment?.id) {
      fetchEvents();
    }
  }, [establishment?.id]);

  const fetchEvents = async () => {
    if (!establishment?.id) return;
    
    setLoading(true);
    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .eq("is_active", true)
      .eq("establishment_id", establishment.id)
      .order("event_date", { ascending: true });

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      setLoading(false);
      return;
    }

    setEvents(eventsData || []);

    // Fetch ticket types for price range
    const { data: ticketsData } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("is_active", true);

    if (ticketsData) {
      const counts: Record<string, { min: number; max: number; available: number }> = {};
      ticketsData.forEach((ticket: TicketType) => {
        if (!counts[ticket.event_id]) {
          counts[ticket.event_id] = { min: ticket.price, max: ticket.price, available: 0 };
        }
        counts[ticket.event_id].min = Math.min(counts[ticket.event_id].min, ticket.price);
        counts[ticket.event_id].max = Math.max(counts[ticket.event_id].max, ticket.price);
        counts[ticket.event_id].available += (ticket.quantity_available - ticket.quantity_sold);
      });
      setTicketCounts(counts);
    }

    setLoading(false);
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
      month: format(date, "MMM", { locale: ptBR }).toUpperCase(),
      weekday: format(date, "EEEE", { locale: ptBR }),
      full: format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR }),
    };
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  const filteredEvents = events.filter((event) => {
    const eventDate = parseISO(event.event_date);
    const now = new Date();
    
    if (filter === "upcoming") {
      return isAfter(eventDate, now);
    }
    if (filter === "this-week") {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return isAfter(eventDate, now) && eventDate <= nextWeek;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <DynamicThemeStyles />
      <Header onSearchChange={() => {}} cartCount={getTotalItems()} />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-primary pt-8 pb-16 md:pt-12 md:pb-24">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary-light/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-primary-light/15 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-bounce-gentle" />
          
          {/* Floating Icons */}
          <Music className="absolute top-20 right-[10%] w-8 h-8 text-white/10 animate-float" />
          <Sparkles className="absolute bottom-20 left-[15%] w-6 h-6 text-white/10 animate-float delay-500" />
          <Star className="absolute top-1/3 right-[20%] w-5 h-5 text-white/10 animate-float delay-700" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4 bg-white/10 text-white border-white/20 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              Eventos Exclusivos
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              Próximos <span className="text-primary-foreground/80">Eventos</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8">
              Descubra os melhores eventos e garanta seu ingresso agora
            </p>
            
            {/* Stats */}
            <div className="flex justify-center gap-8 md:gap-12 mt-8">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">{events.length}</div>
                <div className="text-sm text-white/60">Eventos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">
                  {Object.values(ticketCounts).reduce((sum, t) => sum + t.available, 0)}
                </div>
                <div className="text-sm text-white/60">Ingressos Disponíveis</div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-12 md:h-20 fill-background">
            <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" />
          </svg>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 -mt-6 md:-mt-10 relative z-20">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-3 md:p-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {[
              { value: "all", label: "Todos" },
              { value: "upcoming", label: "Próximos" },
              { value: "this-week", label: "Esta Semana" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as typeof filter)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
                  filter === option.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border">
                <Skeleton className="h-48 md:h-56 w-full" />
                <div className="p-5">
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
              <Calendar className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground">Volte em breve para conferir novos eventos!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredEvents.map((event, index) => {
              const dateInfo = formatEventDate(event.event_date);
              const ticketInfo = ticketCounts[event.id];
              const isUpcoming = isAfter(parseISO(event.event_date), new Date());
              
              return (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className={cn(
                    "group bg-card rounded-2xl overflow-hidden border border-border",
                    "hover:shadow-xl hover:border-primary/30 transition-all duration-300",
                    "transform hover:-translate-y-1",
                    "animate-in fade-in slide-in-from-bottom-4",
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Image */}
                  <div className="relative h-48 md:h-56 overflow-hidden">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Music className="w-16 h-16 text-primary/30" />
                      </div>
                    )}
                    
                    {/* Date Badge */}
                    <div className="absolute top-4 left-4 bg-white dark:bg-card rounded-xl p-2 shadow-lg text-center min-w-[60px]">
                      <div className="text-2xl font-bold text-primary leading-none">{dateInfo.day}</div>
                      <div className="text-xs font-medium text-muted-foreground uppercase">{dateInfo.month}</div>
                    </div>
                    
                    {/* Status Badge */}
                    {isUpcoming && ticketInfo && ticketInfo.available > 0 && (
                      <Badge className="absolute top-4 right-4 bg-emerald-500 text-white border-0">
                        <Users className="w-3 h-3 mr-1" />
                        {ticketInfo.available} ingressos
                      </Badge>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Price Preview */}
                    {ticketInfo && (
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="text-white text-sm font-medium">
                          A partir de <span className="text-lg font-bold">{formatCurrency(ticketInfo.min)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {event.name}
                    </h3>
                    
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{dateInfo.weekday}, {formatTime(event.event_time)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* CTA */}
                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">Ver detalhes</span>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <Footer />
      <BottomNavigation />
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .delay-500 { animation-delay: 0.5s; }
        .delay-700 { animation-delay: 0.7s; }
        .delay-1000 { animation-delay: 1s; }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Events;
