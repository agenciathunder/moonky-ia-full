import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { LandingSettings } from "@/hooks/useLandingSettings";

interface Props {
  settings: LandingSettings;
}

const LandingHero = ({ settings }: Props) => {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container relative z-10 px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 md:mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs sm:text-sm font-medium text-primary">
              {settings.hero_badge_text}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4 md:mb-6 px-2">
            {settings.hero_title}
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 px-2">
            {settings.hero_subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Link to={settings.hero_cta_link}>
              <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-primary hover:bg-primary-dark shadow-glow hover:shadow-hover transition-all">
                {settings.hero_cta_text}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            {settings.hero_secondary_btn_visible && (
              <Link to={settings.hero_secondary_btn_link}>
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6">
                  {settings.hero_secondary_btn_text}
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-8 md:mt-12 flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
              <span>{settings.hero_trust1}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
              <span>{settings.hero_trust2}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
              <span>{settings.hero_trust3}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
