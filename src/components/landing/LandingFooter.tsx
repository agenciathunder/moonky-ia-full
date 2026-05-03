import { Link } from "react-router-dom";
import { Instagram, Facebook, Linkedin } from "lucide-react";
import moonkyLogo from "@/assets/moonky-logo.png";
import type { LandingSettings } from "@/hooks/useLandingSettings";

interface Props {
  settings: LandingSettings;
}

const LandingFooter = ({ settings }: Props) => {
  const logoSrc = settings.logo_url || moonkyLogo;

  return (
    <footer className="bg-card border-t border-border">
      <div className="container px-4 sm:px-6 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="sm:col-span-2">
              <img src={logoSrc} alt="Moonky" className="h-7 sm:h-8 mb-3 md:mb-4 object-contain" />
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                {settings.footer_description}
              </p>
              <div className="flex gap-3">
                <a href={settings.footer_instagram_url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors" aria-label="Instagram">
                  <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a href={settings.footer_facebook_url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors" aria-label="Facebook">
                  <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a href={settings.footer_linkedin_url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors" aria-label="LinkedIn">
                  <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm sm:text-base">Produto</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Funcionalidades</a></li>
                <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Preços</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm sm:text-base">Suporte</h4>
              <ul className="space-y-2">
                <li><a href={settings.footer_help_url} className="text-sm text-muted-foreground hover:text-primary transition-colors">Central de Ajuda</a></li>
                <li><a href={settings.footer_contact_url} className="text-sm text-muted-foreground hover:text-primary transition-colors">Contato</a></li>
                <li><a href={settings.footer_terms_url} className="text-sm text-muted-foreground hover:text-primary transition-colors">Termos de Uso</a></li>
                <li><a href={settings.footer_privacy_url} className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacidade</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-muted-foreground">
              © {new Date().getFullYear()} Moonky. Todos os direitos reservados.
            </p>
            <Link to="/auth" className="text-xs sm:text-sm text-primary hover:underline">
              Acessar painel administrativo →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
