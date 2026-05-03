import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { Calendar, MapPin, Clock, ChevronRight, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Autoplay from "embla-carousel-autoplay";

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  event_time: string;
  location: string | null;
  image_url: string | null;
  is_active: boolean;
}

interface EventCardProps {
  event: Event;
  slug?: string;
}

const EventCard = ({ event, slug }: EventCardProps) => {
  const formatEventDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return {
      day: format(date, "dd", { locale: ptBR }),
      month: format(date, "MMM", { locale: ptBR }).toUpperCase(),
    };
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  const dateInfo = formatEventDate(event.event_date);
  
  // Use store-specific route if slug is available
  const eventLink = buildStorePath(slug, `/events/${event.id}`);

  return (
    <Link to={eventLink} className="group block h-full">
      <Card className={cn(
        "relative overflow-hidden border border-border h-full",
        "hover:shadow-lg hover:border-primary/30 transition-all duration-300"
      )}>
        {/* Event Image */}
        <div className="relative h-32 sm:h-36 overflow-hidden">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-primary/30" />
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Date Badge */}
          <div className="absolute top-2 left-2 bg-white dark:bg-card rounded-lg px-2 py-1 shadow-md">
            <span className="text-lg font-bold text-primary leading-none">{dateInfo.day}</span>
            <span className="text-[10px] font-medium text-muted-foreground ml-1">{dateInfo.month}</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {event.name}
          </h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="w-3 h-3" />
            <span>{formatTime(event.event_time)}</span>
            {event.location && (
              <>
                <span className="mx-1">•</span>
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{event.location}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              <Ticket className="w-2.5 h-2.5 mr-1" />
              Ingressos
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </Card>
    </Link>
  );
};

interface EventsSectionProps {
  establishmentId?: string;
}

const EventsSection = ({ establishmentId }: EventsSectionProps) => {
  const slug = useStoreSlug();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchEvents();
  }, [establishmentId]);

  const fetchEvents = async () => {
    const now = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from("events")
      .select("*")
      .eq("is_active", true)
      .gte("event_date", now)
      .order("event_date", { ascending: true })
      .limit(5);

    if (establishmentId) {
      query = query.eq("establishment_id", establishmentId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return null;
  }

  // Link for "Ver todos" - use store-specific route if slug is available
  const eventsListLink = buildStorePath(slug, '/events');

  return (
    <div className="space-y-3">
      {/* Mobile Carousel */}
      {isMobile && events.length > 1 ? (
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[
            Autoplay({
              delay: 4000,
              stopOnInteraction: true,
              stopOnMouseEnter: true,
            }),
          ]}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {events.map((event) => (
              <CarouselItem key={event.id} className="pl-2 basis-[85%]">
                <EventCard event={event} slug={slug} />
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Dots indicator */}
          <div className="flex justify-center mt-3 gap-1.5">
            {events.map((_, index) => (
              <div
                key={index}
                className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30"
              />
            ))}
          </div>
        </Carousel>
      ) : (
        /* Desktop Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} slug={slug} />
          ))}
        </div>
      )}
      
      {/* Ver todos */}
      <div className="text-center">
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link to={eventsListLink}>
            <Calendar className="w-4 h-4" />
            Ver todos os eventos
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default EventsSection;
