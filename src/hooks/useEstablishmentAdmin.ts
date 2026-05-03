import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PlanFeatures {
  has_virtual_store: boolean;
  has_catalog_only: boolean;
  has_pdv: boolean;
  has_events: boolean;
  has_overview: boolean;
  has_products: boolean;
  has_brands: boolean;
  has_categories: boolean;
  has_banners: boolean;
  has_coupons: boolean;
  has_orders: boolean;
  has_customers: boolean;
  has_settings: boolean;
}

interface EstablishmentMembership {
  establishment_id: string;
  role: string;
  establishment: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    is_active: boolean;
    status: string | null;
    plan_id: string | null;
  };
  plan: PlanFeatures | null;
}

export const useEstablishmentAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [membership, setMembership] = useState<EstablishmentMembership | null>(null);
  const [isEstablishmentAdmin, setIsEstablishmentAdmin] = useState<boolean>(false);
  const [isEstablishmentMember, setIsEstablishmentMember] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    const checkMembership = async () => {
      if (!user) {
        setMembership(null);
        setIsEstablishmentAdmin(false);
        setIsEstablishmentMember(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('establishment_members')
          .select(`
            establishment_id,
            role,
            establishment:establishments (
              id,
              name,
              slug,
              logo_url,
              is_active,
              status,
              plan_id
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking establishment membership:', error);
          setMembership(null);
          setIsEstablishmentAdmin(false);
          setIsEstablishmentMember(false);
        } else if (data) {
          const establishment = Array.isArray(data.establishment) 
            ? data.establishment[0] 
            : data.establishment;
          
          // Fetch plan features if establishment has a plan
          let planFeatures: PlanFeatures | null = null;
          if (establishment?.plan_id) {
            const { data: planData } = await supabase
              .from('plans')
              .select(`
                has_virtual_store,
                has_catalog_only,
                has_pdv,
                has_events,
                has_overview,
                has_products,
                has_brands,
                has_categories,
                has_banners,
                has_coupons,
                has_orders,
                has_customers,
                has_settings
              `)
              .eq('id', establishment.plan_id)
              .maybeSingle();
            
            if (planData) {
              planFeatures = planData as PlanFeatures;
            }
          }

          const transformedData: EstablishmentMembership = {
            establishment_id: data.establishment_id,
            role: data.role,
            establishment,
            plan: planFeatures
          };
          setMembership(transformedData);
          
          // Admin or manager have full access
          const isAdmin = data.role === 'admin' || data.role === 'manager';
          setIsEstablishmentAdmin(isAdmin);
          
          // Employee also has access (but limited)
          const isMember = isAdmin || data.role === 'employee';
          setIsEstablishmentMember(isMember);
        } else {
          setMembership(null);
          setIsEstablishmentAdmin(false);
          setIsEstablishmentMember(false);
        }
      } catch (error) {
        console.error('Error in checkMembership:', error);
        setMembership(null);
        setIsEstablishmentAdmin(false);
        setIsEstablishmentMember(false);
      } finally {
        setLoading(false);
      }
    };

    checkMembership();
  }, [user, authLoading]);

  const isSuspended = membership?.establishment?.status === 'suspenso';
  const isEmployee = membership?.role === 'employee';

  return { 
    membership, 
    isEstablishmentAdmin, 
    isEstablishmentMember,
    isEmployee,
    loading,
    establishmentId: membership?.establishment_id || null,
    plan: membership?.plan || null,
    isCatalogOnly: membership?.plan?.has_catalog_only === true,
    isSuspended,
    role: membership?.role || null
  };
};
