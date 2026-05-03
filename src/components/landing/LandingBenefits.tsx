import { Zap } from "lucide-react";
import type { LandingSettings } from "@/hooks/useLandingSettings";

interface Props {
  settings: LandingSettings;
}

const LandingBenefits = ({ settings }: Props) => {
  const cards = settings.benefits_cards || [];

  return (
    <section id="features" className="py-16 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <span className="inline-block text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider mb-3 md:mb-4">
              {settings.benefits_badge}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 md:mb-6 px-2">
              {settings.benefits_title}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
              {settings.benefits_subtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {cards.map((card, index) => (
              <div key={index} className="group relative p-5 sm:p-6 md:p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-hover">
                <div className="absolute inset-0 rounded-2xl bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
                <div className="relative">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-primary/20 transition-colors overflow-hidden">
                    {card.icon_url ? (
                      <img src={card.icon_url} alt={card.title} className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 object-contain" />
                    ) : (
                      <Zap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary" />
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3">{card.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingBenefits;
