import { XCircle } from "lucide-react";
import type { LandingSettings } from "@/hooks/useLandingSettings";

interface Props {
  settings: LandingSettings;
}

const LandingPainPoints = ({ settings }: Props) => {
  const cards = settings.painpoints_cards || [];

  return (
    <section className="py-16 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <span className="inline-block text-xs sm:text-sm font-semibold text-destructive uppercase tracking-wider mb-3 md:mb-4">
              {settings.painpoints_badge}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 md:mb-6 px-2">
              {settings.painpoints_title}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
              {settings.painpoints_subtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {cards.map((card, index) => (
              <div key={index} className="group p-4 sm:p-5 md:p-6 rounded-xl bg-background border border-border hover:border-destructive/30 transition-all hover:shadow-hover">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-destructive/20 transition-colors overflow-hidden">
                  {card.icon_url ? (
                    <img src={card.icon_url} alt={card.title} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                  ) : (
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 sm:mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 md:mt-16 p-6 sm:p-8 rounded-2xl bg-gradient-primary text-primary-foreground text-center">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 md:mb-4">
              {settings.painpoints_solution_title}
            </h3>
            <p className="text-base sm:text-lg md:text-xl opacity-90">
              {settings.painpoints_solution_subtitle}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingPainPoints;
