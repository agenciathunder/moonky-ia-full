import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { getSubdomainSlug } from '@/utils/subdomain';
export interface Establishment {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  status: string | null;
  created_at: string;
  plan_id: string | null;
}

export interface EstablishmentSettings {
  id: string;
  establishment_id: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  opening_hours: any;
  primary_color: string | null;
  secondary_color: string | null;
  default_theme: string | null;
  minimum_order_value: number | null;
  delivery_fee: number | null;
  free_delivery_threshold: number | null;
  delivery_cep: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  show_age_restriction: boolean | null;
}

export interface EstablishmentPlan {
  has_virtual_store: boolean;
  has_catalog_only: boolean;
}

interface EstablishmentContextType {
  establishment: Establishment | null;
  settings: EstablishmentSettings | null;
  plan: EstablishmentPlan | null;
  loading: boolean;
  error: string | null;
  currentSlug: string | null;
  isCatalogOnly: boolean;
  refreshEstablishment: () => Promise<void>;
}

const EstablishmentContext = createContext<EstablishmentContextType | undefined>(undefined);

export const useEstablishment = () => {
  const context = useContext(EstablishmentContext);
  if (!context) {
    throw new Error('useEstablishment must be used within EstablishmentProvider');
  }
  return context;
};

interface EstablishmentProviderProps {
  children: ReactNode;
}

export const EstablishmentProvider = ({ children }: EstablishmentProviderProps) => {
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [plan, setPlan] = useState<EstablishmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const location = useLocation();
  const previousSlugRef = useRef<string | null>(null);

  // Extract slug from subdomain first, then URL path: /loja/:slug
  const getSlugFromPath = (): string | null => {
    // Priority 1: Subdomain-based slug (e.g. primolltec.moonky.com.br)
    const subdomainSlug = getSubdomainSlug();
    if (subdomainSlug) {
      return subdomainSlug;
    }

    const pathParts = location.pathname.split('/').filter(Boolean);
    
    // Priority 2: /loja/:slug pattern
    if (pathParts[0] === 'loja' && pathParts[1]) {
      return pathParts[1];
    }
    
    // For admin routes, return null to use user's establishment
    if (pathParts[0] === 'admin') {
      return null;
    }
    
    return null;
  };

  const fetchEstablishment = async () => {
    const slug = getSlugFromPath();
    
    // IMPORTANT: Clear previous data when slug changes to prevent data leakage between stores
    if (slug !== previousSlugRef.current) {
      setEstablishment(null);
      setSettings(null);
      setPlan(null);
      setError(null);
      previousSlugRef.current = slug;
    }
    
    setCurrentSlug(slug);
    setLoading(true);
    setError(null);

    try {
      let establishmentData: Establishment | null = null;

      if (slug) {
        // Fetch by slug for store pages - each store loads independently
        const { data, error: fetchError } = await supabase
          .from('establishments')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (fetchError) throw fetchError;
        establishmentData = data;
      } else {
        // For admin or other pages, try to get user's establishment
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: memberData, error: memberError } = await supabase
            .from('establishment_members')
            .select('establishment_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!memberError && memberData) {
            const { data, error: fetchError } = await supabase
              .from('establishments')
              .select('*')
              .eq('id', memberData.establishment_id)
              .maybeSingle();

            if (fetchError) throw fetchError;
            establishmentData = data;
          }
        }
      }

      setEstablishment(establishmentData);

      // Fetch settings and plan if establishment found
      if (establishmentData) {
        // Fetch settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('establishment_settings')
          .select('*')
          .eq('establishment_id', establishmentData.id)
          .maybeSingle();

        if (!settingsError) {
          setSettings(settingsData);
        } else {
          setSettings(null);
        }

        // Fetch plan if establishment has one
        if (establishmentData.plan_id) {
          const { data: planData, error: planError } = await supabase
            .from('plans')
            .select('has_virtual_store, has_catalog_only')
            .eq('id', establishmentData.plan_id)
            .maybeSingle();

          if (!planError && planData) {
            setPlan(planData as EstablishmentPlan);
          } else {
            setPlan(null);
          }
        } else {
          setPlan(null);
        }
      } else {
        setSettings(null);
        setPlan(null);
      }
    } catch (err: any) {
      console.error('Error fetching establishment:', err);
      setError(err.message);
      setEstablishment(null);
      setSettings(null);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstablishment();
  }, [location.pathname]);

  const refreshEstablishment = async () => {
    await fetchEstablishment();
  };

  // Determine if store is catalog-only mode
  const isCatalogOnly = plan?.has_catalog_only === true;

  // Update document meta tags when establishment data changes
  useDocumentMeta({
    title: currentSlug && establishment 
      ? `${establishment.name} | MOONKY` 
      : undefined,
    description: currentSlug && establishment?.description 
      ? establishment.description 
      : undefined,
    ogTitle: currentSlug && establishment 
      ? `${establishment.name} | MOONKY` 
      : undefined,
    ogDescription: currentSlug && establishment?.description 
      ? establishment.description 
      : undefined,
    ogImage: currentSlug && establishment?.logo_url 
      ? establishment.logo_url 
      : undefined,
  });

  return (
    <EstablishmentContext.Provider value={{ 
      establishment, 
      settings, 
      plan,
      loading, 
      error, 
      currentSlug,
      isCatalogOnly,
      refreshEstablishment 
    }}>
      {children}
    </EstablishmentContext.Provider>
  );
};