import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StoreSettings {
  id: string;
  store_name: string;
  store_description: string | null;
  store_logo_url: string | null;
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

let cachedSettings: StoreSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (cachedSettings && Date.now() - cacheTimestamp < CACHE_DURATION) {
        setSettings(cachedSettings);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("store_settings")
          .select("*")
          .maybeSingle();

        if (error) throw error;

        if (data) {
          cachedSettings = data;
          cacheTimestamp = Date.now();
          setSettings(data);
        }
      } catch (err: any) {
        console.error("Error fetching store settings:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const refreshSettings = async () => {
    setLoading(true);
    cachedSettings = null;
    cacheTimestamp = 0;
    
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        cachedSettings = data;
        cacheTimestamp = Date.now();
        setSettings(data);
      }
    } catch (err: any) {
      console.error("Error refreshing store settings:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, error, refreshSettings };
}
