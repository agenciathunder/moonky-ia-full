import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { LandingSettings } from "@/hooks/useLandingSettings";

interface Props {
  settings: LandingSettings;
}

const LandingCTA = ({ settings }: Props) => {
  return (
    <section className="py-16 md:py-24 lg:py-32 bg-gradient-primary">
      <div className="container px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 md:mb-6 px-2">
            {settings.cta_title}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8 md:mb-10 px-2">
            {settings.cta_subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Link to={settings.cta_button_link}>
              <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg">
                {settings.cta_button_text}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
          </div>
          <div className="mt-8 md:mt-10 inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20">
            <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-primary-foreground"></span>
            </span>
            <span className="text-xs sm:text-sm font-medium text-primary-foreground">
              {settings.cta_social_proof}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingCTA;
