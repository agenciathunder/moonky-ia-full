import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { supabase } from "@/integrations/supabase/client";
import moonkyLogo from "@/assets/moonky-logo.png";
import { getSubdomainSlug } from "@/utils/subdomain";

type CachedBranding = {
  name?: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  default_theme?: string | null;
  updated_at?: number;
};

const cacheKeyForSlug = (slug: string) => `moonky-establishment-cache:${slug}`;

// Local helpers (kept lightweight to avoid importing DynamicThemeStyles)
const hexToHSL = (hex: string): string => {
  hex = hex.replace(/^#/, "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const adjustLightness = (hsl: string, amount: number): string => {
  const parts = hsl.split(" ");
  const h = parts[0];
  const s = parts[1];
  const l = parseInt(parts[2]);
  const newL = Math.max(0, Math.min(100, l + amount));
  return `${h} ${s} ${newL}%`;
};

const readCachedBranding = (slug: string): CachedBranding | null => {
  try {
    const raw = localStorage.getItem(cacheKeyForSlug(slug));
    if (!raw) return null;
    return JSON.parse(raw) as CachedBranding;
  } catch {
    return null;
  }
};

// Suspended store screen component
function SuspendedStoreScreen({ ctaLink }: { ctaLink?: string | null }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(99, 91, 255, 0.15) 0%, transparent 60%)"
        }}
      />
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        <img src={moonkyLogo} alt="Moonky" className="h-12 w-auto mb-12 opacity-90" />
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-medium tracking-widest uppercase text-zinc-500">
            Temporariamente indisponível
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-100 mb-3">Loja fora do ar</h1>
        <p className="text-sm text-zinc-500 leading-relaxed mb-10">
          Esta loja está temporariamente suspensa devido a pendências no pagamento do plano. 
          Regularize sua situação para voltar a ficar online.
        </p>
        {ctaLink && (
          <Button 
            className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => window.open(ctaLink, '_blank')}
          >
            Regularizar pagamento
          </Button>
        )}
      </div>
      <div className="absolute bottom-6 text-xs text-zinc-700">Powered by Moonky</div>
    </div>
  );
}

// Cancelled store screen component
function CancelledStoreScreen() {
  const whatsappNumber = "5521966555534";
  const whatsappMessage = encodeURIComponent("Olá! Gostaria de falar sobre minha loja que foi cancelada.");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(239, 68, 68, 0.1) 0%, transparent 60%)"
        }}
      />
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        <img src={moonkyLogo} alt="Moonky" className="h-12 w-auto mb-12 opacity-90" />
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium tracking-widest uppercase text-zinc-500">
            Loja cancelada
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-100 mb-3">Loja indisponível</h1>
        <p className="text-sm text-zinc-500 leading-relaxed mb-10">
          Esta loja foi cancelada. Entre em contato com nosso suporte para mais informações.
        </p>
        <Button 
          className="h-10 px-6 bg-green-600 hover:bg-green-700 text-white"
          onClick={() => window.open(whatsappUrl, '_blank')}
        >
          Falar com suporte
        </Button>
      </div>
      <div className="absolute bottom-6 text-xs text-zinc-700">Powered by Moonky</div>
    </div>
  );
}

export default function StoreRouteGate({ children }: { children: ReactNode }) {
  const { slug: paramSlug } = useParams<{ slug?: string }>();
  const slug = paramSlug || getSubdomainSlug();
  const { establishment, settings, loading, error } = useEstablishment();

  const [cached, setCached] = useState<CachedBranding | null>(null);
  const [planCtaLink, setPlanCtaLink] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setCached(readCachedBranding(slug));
  }, [slug]);

  // Fetch plan cta_link for suspended stores
  useEffect(() => {
    if (!establishment?.plan_id || (establishment.status !== 'suspended' && establishment.status !== 'suspenso')) {
      setPlanCtaLink(null);
      return;
    }
    const fetchCtaLink = async () => {
      const { data } = await supabase
        .from('plans')
        .select('cta_link')
        .eq('id', establishment.plan_id!)
        .maybeSingle();
      setPlanCtaLink(data?.cta_link || null);
    };
    fetchCtaLink();
  }, [establishment?.plan_id, establishment?.status]);

  // Cache establishment branding for faster subsequent loads
  useEffect(() => {
    if (!slug || !establishment || !settings) return;
    const branding: CachedBranding = {
      name: establishment.name,
      logo_url: establishment.logo_url,
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      default_theme: settings.default_theme,
      updated_at: Date.now(),
    };
    try {
      localStorage.setItem(cacheKeyForSlug(slug), JSON.stringify(branding));
    } catch {}
  }, [slug, establishment, settings]);

  const loaderTheme = useMemo(() => {
    const primaryColor = settings?.primary_color || cached?.primary_color;
    if (!primaryColor) return null;
    const primaryHSL = hexToHSL(primaryColor);
    const primaryLight = adjustLightness(primaryHSL, 10);
    return {
      primaryHSL,
      background: `linear-gradient(135deg, hsl(${primaryHSL}) 0%, hsl(${primaryLight}) 100%)`,
    };
  }, [settings?.primary_color, cached?.primary_color]);

  // Apply store tokens as soon as settings arrive (before paint)
  useLayoutEffect(() => {
    if (!settings?.primary_color) return;
    const primaryHSL = hexToHSL(settings.primary_color);
    const primaryLight = adjustLightness(primaryHSL, 10);
    const primaryDark = adjustLightness(primaryHSL, -10);

    document.documentElement.style.setProperty("--primary", primaryHSL);
    document.documentElement.style.setProperty("--primary-light", primaryLight);
    document.documentElement.style.setProperty("--primary-dark", primaryDark);
    document.documentElement.style.setProperty("--ring", primaryHSL);
    document.documentElement.style.setProperty("--sidebar-primary", primaryHSL);
    document.documentElement.style.setProperty("--sidebar-ring", primaryHSL);
    document.documentElement.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, hsl(${primaryHSL}) 0%, hsl(${primaryLight}) 100%)`
    );
    document.documentElement.style.setProperty("--shadow-glow", `0 0 0 3px hsl(${primaryHSL} / 0.2)`);
  }, [settings?.primary_color]);

  // Only gate store routes
  if (!slug) return <>{children}</>;

  // Check if establishment is suspended
  const isSuspended = establishment?.status === 'suspended' || establishment?.status === 'suspenso';
  if (isSuspended) {
    return <SuspendedStoreScreen ctaLink={planCtaLink} />;
  }

  // Check if establishment is cancelled
  const isCancelled = establishment?.status === 'cancelled' || establishment?.status === 'cancelado';
  if (isCancelled) {
    return <CancelledStoreScreen />;
  }

  const isCorrectStore = establishment?.slug === slug;
  const hasTheme = Boolean(settings?.primary_color);
  const isReady = isCorrectStore && hasTheme;

  if (!isReady) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={loaderTheme?.background ? { background: loaderTheme.background } : undefined}
      >
        <div
          className={
            loaderTheme?.background
              ? "flex flex-col items-center gap-4"
              : "flex flex-col items-center gap-4 bg-background/95 backdrop-blur-sm px-6 py-6 rounded-2xl border shadow-elegant"
          }
        >
          {(establishment?.logo_url || cached?.logo_url) ? (
            <img
              src={establishment?.logo_url || cached?.logo_url || ''}
              alt={establishment?.name || cached?.name ? `Carregando ${establishment?.name || cached?.name}` : "Carregando loja"}
              className="h-16 w-auto object-contain"
            />
          ) : null}

          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-border" />
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
              style={{
                borderTopColor: loaderTheme?.primaryHSL
                  ? `hsl(${loaderTheme.primaryHSL})`
                  : "hsl(var(--foreground))",
              }}
            />
          </div>

          <p
            className={loaderTheme?.background ? "text-primary-foreground text-sm opacity-90" : "text-sm text-muted-foreground"}
          >
            Carregando loja...
          </p>

          {!loading && !isCorrectStore && (
            <div className="text-center space-y-3">
              {error ? (
                <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Loja não encontrada.</p>
              )}
              <Button asChild variant="outline" className="h-10">
                <Link to="/lojas">Ver lojas</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
