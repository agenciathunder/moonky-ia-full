import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import moonkyLogo from "@/assets/moonky-logo.png";
import type { LandingSettings } from "@/hooks/useLandingSettings";

interface Props {
  settings: LandingSettings;
}

const LandingNavbar = ({ settings }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const logoSrc = settings.logo_url || moonkyLogo;

  const navLinks = [
    { href: "#features", label: "Funcionalidades" },
    { href: "#pricing", label: "Preços" }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="flex items-center shrink-0">
            <img src={logoSrc} alt="Moonky" className="h-7 sm:h-8 object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center">
            <Link to={settings.navbar_cta_link}>
              <Button size="sm" className="bg-primary hover:bg-primary-dark">
                {settings.navbar_cta_text}
              </Button>
            </Link>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-foreground -mr-2" aria-label="Menu">
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
                  {link.label}
                </a>
              ))}
              <div className="pt-3 border-t border-border">
                <Link to={settings.navbar_cta_link} onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-primary hover:bg-primary-dark">
                    {settings.navbar_cta_text}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default LandingNavbar;
