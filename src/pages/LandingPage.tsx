import { useLandingSettings } from "@/hooks/useLandingSettings";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingPainPoints from "@/components/landing/LandingPainPoints";
import LandingBenefits from "@/components/landing/LandingBenefits";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  const { settings, loading } = useLandingSettings();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar settings={settings} />
      <main className="pt-16">
        {/* Full-width Banner */}
        {settings.banner_enabled && settings.banner_image_url && (
          <section className="relative w-full">
            <div className="relative w-full overflow-hidden" style={{ maxHeight: "500px" }}>
              {/* Desktop banner */}
              <img
                src={settings.banner_image_url}
                alt={settings.banner_title || "Banner"}
                className={`w-full h-auto object-cover ${settings.banner_mobile_image_url ? 'hidden sm:block' : ''}`}
              />
              {/* Mobile banner */}
              {settings.banner_mobile_image_url && (
                <img
                  src={settings.banner_mobile_image_url}
                  alt={settings.banner_title || "Banner mobile"}
                  className="w-full h-auto object-cover block sm:hidden"
                />
              )}
              {(settings.banner_title || settings.banner_description || settings.banner_button_text) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end">
                  <div className="container px-4 sm:px-6 pb-8 md:pb-12">
                    {settings.banner_title && (
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                        {settings.banner_title}
                      </h2>
                    )}
                    {settings.banner_description && (
                      <p className="text-sm sm:text-base md:text-lg text-white/80 max-w-2xl mb-4">
                        {settings.banner_description}
                      </p>
                    )}
                    {settings.banner_button_text && settings.banner_button_link && (
                      <Link to={settings.banner_button_link}>
                        <Button size="lg" className="gap-2">
                          {settings.banner_button_text}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {settings.hero_visible && <LandingHero settings={settings} />}
        {settings.painpoints_visible && <LandingPainPoints settings={settings} />}
        {settings.benefits_visible && <LandingBenefits settings={settings} />}
        {settings.features_visible && <LandingFeatures settings={settings} />}
        {settings.pricing_visible && <LandingPricing settings={settings} />}
        {settings.cta_visible && <LandingCTA settings={settings} />}
      </main>
      {settings.footer_visible && <LandingFooter settings={settings} />}
    </div>
  );
};

export default LandingPage;
