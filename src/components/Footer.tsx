import { Link } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { MapPin, Phone, Mail, Clock, Facebook, Instagram, ChevronDown, ChevronUp } from "lucide-react";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { useState, useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const dayNames: { [key: string]: string } = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const Footer = () => {
  const slug = useStoreSlug();
  const { establishment, settings } = useEstablishment();
  const storeName = establishment?.name || "Loja";
  const storeDescription = establishment?.description || "Delivery com os melhores preços e entrega rápida.";
  const basePath = buildStorePath(slug, '');
  const [hoursOpen, setHoursOpen] = useState(false);

  // Get current time in Brazil timezone (America/Sao_Paulo)
  const getBrazilTime = () => {
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    return brazilTime;
  };

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const getCurrentDayKey = () => {
    const brazilTime = getBrazilTime();
    const jsDay = brazilTime.getDay();
    // Convert JS day (0=Sun) to our keys
    const mapping = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return mapping[jsDay];
  };

  // Get previous day key
  const getPreviousDayKey = () => {
    const brazilTime = getBrazilTime();
    const jsDay = brazilTime.getDay();
    const prevDay = jsDay === 0 ? 6 : jsDay - 1;
    const mapping = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return mapping[prevDay];
  };

  // Check if currently open based on opening hours
  const storeStatus = useMemo(() => {
    const openingHours = settings?.opening_hours;
    if (!openingHours) return { isOpen: true, message: "Aberto" };

    const brazilTime = getBrazilTime();
    const currentDayKey = getCurrentDayKey();
    const previousDayKey = getPreviousDayKey();
    const dayHours = openingHours[currentDayKey];
    const previousDayHours = openingHours[previousDayKey];
    
    const currentTime = brazilTime.getHours() * 60 + brazilTime.getMinutes();

    // First check if we're still in yesterday's extended hours (past midnight)
    if (previousDayHours && previousDayHours.isOpen !== false) {
      const [prevOpenHour, prevOpenMin] = (previousDayHours.open || "08:00").split(":").map(Number);
      const [prevCloseHour, prevCloseMin] = (previousDayHours.close || "22:00").split(":").map(Number);
      const prevOpenTime = prevOpenHour * 60 + prevOpenMin;
      const prevCloseTime = prevCloseHour * 60 + prevCloseMin;

      // If close time is less than open time, it means it crosses midnight
      if (prevCloseTime < prevOpenTime && currentTime < prevCloseTime) {
        return { isOpen: true, message: `Aberto • Fecha às ${previousDayHours.close}` };
      }
    }

    if (!dayHours) return { isOpen: true, message: "Aberto" };
    
    // Check if day is marked as closed
    if (dayHours.isOpen === false) {
      return { isOpen: false, message: "Fechado hoje" };
    }

    // Check current time against opening hours
    const [openHour, openMin] = (dayHours.open || "08:00").split(":").map(Number);
    const [closeHour, closeMin] = (dayHours.close || "22:00").split(":").map(Number);
    
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    // Handle hours that cross midnight (e.g., 18:00 - 03:00)
    if (closeTime < openTime) {
      // Close time is after midnight
      if (currentTime >= openTime || currentTime < closeTime) {
        return { isOpen: true, message: `Aberto • Fecha às ${dayHours.close}` };
      } else if (currentTime < openTime) {
        return { isOpen: false, message: `Fechado • Abre às ${dayHours.open}` };
      }
    } else {
      // Normal hours (e.g., 08:00 - 22:00)
      if (currentTime >= openTime && currentTime < closeTime) {
        return { isOpen: true, message: `Aberto • Fecha às ${dayHours.close}` };
      } else if (currentTime < openTime) {
        return { isOpen: false, message: `Fechado • Abre às ${dayHours.open}` };
      }
    }
    
    return { isOpen: false, message: "Fechado" };
  }, [settings?.opening_hours]);

  // Format hours for display
  const formatHours = (dayKey: string) => {
    const openingHours = settings?.opening_hours;
    if (!openingHours || !openingHours[dayKey]) return "08:00 - 22:00";
    
    const dayHours = openingHours[dayKey];
    if (dayHours.isOpen === false) return "Fechado";
    
    return `${dayHours.open || "08:00"} - ${dayHours.close || "22:00"}`;
  };

  const currentDayKey = getCurrentDayKey();

  return (
    <footer className="bg-card border-t border-border mt-auto mb-16 md:mb-0">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {/* About */}
          <div>
            {establishment?.logo_url && (
              <img
                src={establishment.logo_url}
                alt={storeName}
                className="h-12 md:h-16 w-auto mb-3 md:mb-4 object-contain"
              />
            )}
            <h3 className="font-bold text-base md:text-lg mb-2 md:mb-4 text-foreground">{storeName}</h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-4">{storeDescription}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-base md:text-lg mb-2 md:mb-4 text-foreground">Links Rápidos</h3>
            <ul className="space-y-1.5 md:space-y-2">
              <li>
                <Link
                  to={basePath || "/"}
                  className="text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Início
                </Link>
              </li>
              <li>
                <Link
                  to={`${basePath}/offers`}
                  className="text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Ofertas
                </Link>
              </li>
              <li>
                <Link
                  to={`${basePath}/orders`}
                  className="text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Meus Pedidos
                </Link>
              </li>
              <li>
                <Link
                  to={`${basePath}/profile`}
                  className="text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Minha Conta
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-base md:text-lg mb-2 md:mb-4 text-foreground">Contato</h3>
            <ul className="space-y-2 md:space-y-3">
              {settings?.address && (
                <li className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{settings.address}</span>
                </li>
              )}
              {settings?.phone && (
                <li className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0 text-primary" />
                  <span>{settings.phone}</span>
                </li>
              )}
              {settings?.whatsapp && (
                <li className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <WhatsAppIcon size={16} className="flex-shrink-0 text-primary md:w-4 md:h-4 w-3.5 h-3.5" />
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {settings.whatsapp}
                  </a>
                </li>
              )}
              {settings?.email && (
                <li className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0 text-primary" />
                  <a href={`mailto:${settings.email}`} className="hover:text-primary transition-colors">
                    {settings.email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Social & Hours */}
          <div>
            <h3 className="font-bold text-base md:text-lg mb-2 md:mb-4 text-foreground">Redes Sociais</h3>
            <div className="flex gap-2 md:gap-3 mb-4 md:mb-6">
              {settings?.facebook_url && (
                <a
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Facebook className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
              {settings?.instagram_url && (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Instagram className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
              {settings?.whatsapp && (
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <WhatsAppIcon size={20} className="md:w-5 md:h-5 w-4 h-4" />
                </a>
              )}
            </div>

            {/* Opening Hours Section */}
            <Collapsible open={hoursOpen} onOpenChange={setHoursOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs md:text-sm w-full group">
                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                <span className={`font-medium ${storeStatus.isOpen ? 'text-emerald-500' : 'text-destructive'}`}>
                  {storeStatus.message}
                </span>
                {hoursOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground ml-auto" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground ml-auto" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                  {dayOrder.map((dayKey) => {
                    const isToday = dayKey === currentDayKey;
                    const hours = formatHours(dayKey);
                    const isClosed = hours === "Fechado";
                    
                    return (
                      <div
                        key={dayKey}
                        className={`flex items-center justify-between text-xs ${
                          isToday ? 'font-semibold text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          {dayNames[dayKey]}
                        </span>
                        <span className={isClosed ? 'text-destructive' : ''}>
                          {hours}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <div className="border-t border-border mt-6 md:mt-8 pt-6 md:pt-8 text-center space-y-2 md:space-y-3">
          <p className="text-xs md:text-sm text-muted-foreground">© 2026 {storeName}. Todos os direitos reservados.</p>
          {settings?.show_age_restriction && (
            <p className="text-[10px] md:text-xs text-muted-foreground">Proibida a venda para menores de 18 anos.</p>
          )}
          <p className="text-[10px] md:text-xs text-muted-foreground">
            Desenvolvido com <span className="text-purple-500">💜</span> por{" "}
            <a
              href="https://moonky.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-primary transition-colors"
            >
              Moonky
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;