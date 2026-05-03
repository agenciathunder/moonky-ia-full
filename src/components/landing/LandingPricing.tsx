import { useEffect, useState } from "react";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { LandingSettings } from "@/hooks/useLandingSettings";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  promo_period: string | null;
  is_featured: boolean;
  landing_features: string[];
  cta_text: string | null;
  cta_link: string | null;
}

interface Props {
  settings: LandingSettings;
}

const LandingPricing = ({ settings }: Props) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from("plans")
          .select("id, name, description, price, promo_price, promo_period, is_featured, landing_features, cta_text, cta_link")
          .eq("is_active", true)
          .eq("show_on_landing", true)
          .order("price", { ascending: true });

        if (error) throw error;
        setPlans((data || []) as Plan[]);
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  if (loading) {
    return (
      <section id="pricing" className="py-16 md:py-24 lg:py-32 bg-background">
        <div className="container px-4 sm:px-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (plans.length === 0) return null;

  return (
    <section id="pricing" className="py-16 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <span className="inline-block text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider mb-3 md:mb-4">
              {settings.pricing_badge}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 md:mb-6 px-2">
              {settings.pricing_title}
            </h2>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs sm:text-sm font-medium text-primary">
                {settings.pricing_promo_text}
              </span>
            </div>
          </div>

          <div className={`grid gap-6 md:gap-8 max-w-4xl mx-auto ${
            plans.length === 1 ? "md:grid-cols-1 max-w-md" : 
            plans.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"
          }`}>
            {plans.map((plan) => {
              const displayPrice = plan.promo_price ?? plan.price;
              const hasPromo = plan.promo_price !== null && plan.promo_price < plan.price;
              const features = plan.landing_features || [];

              return (
                <div key={plan.id} className={`relative p-5 sm:p-6 md:p-8 rounded-2xl border-2 transition-all ${
                  plan.is_featured ? "border-primary bg-card shadow-glow" : "border-border bg-card hover:border-primary/30"
                }`}>
                  {plan.is_featured && (
                    <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-1 px-3 sm:px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-semibold whitespace-nowrap">
                        Mais popular
                      </div>
                    </div>
                  )}
                  <div className="mb-4 md:mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="mb-4 md:mb-6">
                    {hasPromo && (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-base sm:text-lg text-muted-foreground line-through">R${plan.price.toFixed(2).replace('.', ',')}</span>
                        <span className="text-xs font-medium text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">
                          {Math.round((1 - displayPrice / plan.price) * 100)}% OFF
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <span className="text-4xl sm:text-5xl font-bold text-foreground">{Math.floor(displayPrice)}</span>
                      <span className="text-xl sm:text-2xl font-bold text-foreground">,{(displayPrice % 1).toFixed(2).slice(2)}</span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                    {plan.promo_period && <p className="text-xs sm:text-sm text-primary font-medium mt-1">{plan.promo_period}</p>}
                  </div>
                  {features.length > 0 && (
                    <ul className="space-y-2 sm:space-y-3 mb-6 md:mb-8">
                      {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 sm:gap-3">
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm sm:text-base text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {plan.cta_link ? (
                    <a href={plan.cta_link} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className={`w-full py-5 sm:py-6 text-sm sm:text-base font-semibold ${
                        plan.is_featured ? "bg-primary hover:bg-primary-dark" : "bg-secondary text-secondary-foreground hover:bg-secondary-light"
                      }`}>
                        {plan.cta_text || `Assinar ${plan.name}`}
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                      </Button>
                    </a>
                  ) : (
                    <Button className={`w-full py-5 sm:py-6 text-sm sm:text-base font-semibold ${
                      plan.is_featured ? "bg-primary hover:bg-primary-dark" : "bg-secondary text-secondary-foreground hover:bg-secondary-light"
                    }`}>
                      {plan.cta_text || `Assinar ${plan.name}`}
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 md:mt-12 text-center px-4">
            <p className="text-xs sm:text-sm text-muted-foreground flex flex-wrap justify-center gap-2 sm:gap-4">
              <span>Cancele quando quiser</span>
              <span className="hidden sm:inline">•</span>
              <span>Pagamento seguro</span>
              <span className="hidden sm:inline">•</span>
              <span>Seus dados protegidos</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingPricing;
