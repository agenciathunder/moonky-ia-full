import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PlanExpirationBannerProps {
  establishmentId: string | null;
}

export const PlanExpirationBanner = ({ establishmentId }: PlanExpirationBannerProps) => {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [ctaLink, setCtaLink] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!establishmentId) return;

    const fetchData = async () => {
      const { data: est } = await supabase
        .from("establishments")
        .select("due_date, plan_id")
        .eq("id", establishmentId)
        .maybeSingle();

      if (!est?.due_date) return;

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const due = new Date(est.due_date + "T00:00:00");
      const diffMs = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 3) {
        setDaysRemaining(null);
        return;
      }

      setDaysRemaining(diffDays);

      if (est.plan_id) {
        const { data: plan } = await supabase
          .from("plans")
          .select("cta_link")
          .eq("id", est.plan_id)
          .maybeSingle();
        if (plan?.cta_link) setCtaLink(plan.cta_link);
      }
    };

    fetchData();
  }, [establishmentId]);

  if (daysRemaining === null || dismissed) return null;

  const isExpired = daysRemaining <= 0;

  return (
    <div className="w-full bg-red-600 text-white px-3 py-2 md:px-6 md:py-2.5 flex items-center justify-between gap-2 z-50">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p className="text-xs md:text-sm leading-tight min-w-0">
          {isExpired ? (
            <>Plano <strong>vencido</strong>. Regularize para evitar interrupções.</>
          ) : (
            <>Plano expira em <strong>{daysRemaining} {daysRemaining === 1 ? "dia" : "dias"}</strong>. Regularize o pagamento.</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {ctaLink && (
          <a href={ctaLink} target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              className="text-xs h-7 px-2.5 md:h-8 md:px-3 bg-white text-red-600 hover:bg-white/90 font-semibold whitespace-nowrap"
            >
              Regularizar
            </Button>
          </a>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-0.5 rounded opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
