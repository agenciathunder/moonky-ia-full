import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import EventsSection from "./EventsSection";

interface EventsSectionWrapperProps {
  establishmentId?: string;
}

const EventsSectionWrapper = ({ establishmentId }: EventsSectionWrapperProps) => {
  const [hasEvents, setHasEvents] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkForEvents();
  }, [establishmentId]);

  const checkForEvents = async () => {
    const now = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("event_date", now);

    if (establishmentId) {
      query = query.eq("establishment_id", establishmentId);
    }

    const { count, error } = await query;

    if (!error && count && count > 0) {
      setHasEvents(true);
    } else {
      setHasEvents(false);
    }
    setLoading(false);
  };

  // Don't render anything if loading or no events
  if (loading || !hasEvents) {
    return null;
  }

  return (
    <section>
      <h3 className="text-base font-semibold text-primary flex items-center gap-1.5 mb-3">
        <Calendar className="h-4 w-4" />
        Eventos
      </h3>
      <EventsSection establishmentId={establishmentId} />
    </section>
  );
};

export default EventsSectionWrapper;
