import { LayoutGrid, Store, Package, CalendarDays, Users } from "lucide-react";
import type { LandingSettings } from "@/hooks/useLandingSettings";

const segments = [
  { icon: Store, name: "Restaurantes" },
  { icon: Store, name: "Bares" },
  { icon: Package, name: "Hortifruti" },
  { icon: Store, name: "Petshop" },
  { icon: Package, name: "Depósitos" },
  { icon: CalendarDays, name: "Eventos" },
  { icon: Users, name: "Comércios" }
];

interface Props {
  settings: LandingSettings;
}

const LandingFeatures = ({ settings }: Props) => {
  const cards = settings.features_cards || [];

  return (
    <section className="py-16 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <span className="inline-block text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider mb-3 md:mb-4">
              {settings.features_badge}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 md:mb-6 px-2">
              {settings.features_title}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
              {settings.features_subtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10 md:mb-16">
            {cards.map((card, index) => (
              <div key={index} className={`group p-4 sm:p-5 md:p-6 rounded-xl border transition-all hover:shadow-hover ${
                card.highlight ? "bg-gradient-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/30"
              }`}>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-3 md:mb-4 ${
                  card.highlight ? "bg-primary-foreground/20" : "bg-primary/10 group-hover:bg-primary/20"
                } transition-colors overflow-hidden`}>
                  {card.icon_url ? (
                    <img src={card.icon_url} alt={card.title} className={`w-5 h-5 sm:w-6 sm:h-6 object-contain ${card.highlight ? "brightness-0 invert" : ""}`} />
                  ) : (
                    <LayoutGrid className={`w-5 h-5 sm:w-6 sm:h-6 ${card.highlight ? "text-primary-foreground" : "text-primary"}`} />
                  )}
                </div>
                <h3 className={`text-base sm:text-lg font-semibold mb-1 sm:mb-2 ${card.highlight ? "text-primary-foreground" : "text-foreground"}`}>
                  {card.title}
                </h3>
                <p className={`text-sm ${card.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {card.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-4 md:mb-6 uppercase tracking-wider">Funciona para</p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 px-2">
              {segments.map((segment, index) => (
                <div key={index} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-background border border-border">
                  <segment.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">{segment.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;
