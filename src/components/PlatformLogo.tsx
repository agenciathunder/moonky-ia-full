import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import moonkyLogo from "@/assets/moonky-logo.png";

interface PlatformLogoProps {
  className?: string;
}

export const PlatformLogo = ({ className = "h-8 w-auto" }: PlatformLogoProps) => {
  const [logoUrl, setLogoUrl] = useState<string>(moonkyLogo);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const { data } = await supabase
          .from("landing_page_settings" as any)
          .select("logo_url")
          .eq("id", "default")
          .single();

        if (data && (data as any).logo_url) {
          setLogoUrl((data as any).logo_url);
        }
      } catch {
        // fallback to default
      }
    };
    fetchLogo();
  }, []);

  return <img src={logoUrl} alt="Moonky" className={`object-contain ${className}`} />;
};
