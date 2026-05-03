import { useEffect } from "react";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { useTheme } from "@/components/ThemeProvider";

// Helper function to convert hex to HSL
const hexToHSL = (hex: string): string => {
  // Remove the hash if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
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
  
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);
  
  return `${hDeg} ${sPercent}% ${lPercent}%`;
};

// Adjust lightness of HSL
const adjustLightness = (hsl: string, amount: number): string => {
  const parts = hsl.split(' ');
  const h = parts[0];
  const s = parts[1];
  const l = parseInt(parts[2]);
  const newL = Math.max(0, Math.min(100, l + amount));
  return `${h} ${s} ${newL}%`;
};

export const DynamicThemeStyles = () => {
  const { settings } = useEstablishment();
  const { setTheme, theme } = useTheme();

  // Apply default theme from establishment settings on first load only
  useEffect(() => {
    if (settings?.default_theme) {
      const storedTheme = localStorage.getItem('moonky-theme');
      // Only set theme from settings if user hasn't manually changed it
      if (!storedTheme) {
        setTheme(settings.default_theme as 'light' | 'dark' | 'system');
      }
    }
  }, [settings?.default_theme]);

  // Apply dynamic colors from establishment settings
  useEffect(() => {
    if (settings?.primary_color) {
      const primaryHSL = hexToHSL(settings.primary_color);
      const primaryLight = adjustLightness(primaryHSL, 10);
      const primaryDark = adjustLightness(primaryHSL, -10);
      
      document.documentElement.style.setProperty('--primary', primaryHSL);
      document.documentElement.style.setProperty('--primary-light', primaryLight);
      document.documentElement.style.setProperty('--primary-dark', primaryDark);
      document.documentElement.style.setProperty('--ring', primaryHSL);
      document.documentElement.style.setProperty('--sidebar-primary', primaryHSL);
      document.documentElement.style.setProperty('--sidebar-ring', primaryHSL);
      
      // Update gradient
      const gradientPrimary = `linear-gradient(135deg, hsl(${primaryHSL}) 0%, hsl(${primaryLight}) 100%)`;
      document.documentElement.style.setProperty('--gradient-primary', gradientPrimary);
      
      // Update glow shadow
      const shadowGlow = `0 0 0 3px hsl(${primaryHSL} / 0.2)`;
      document.documentElement.style.setProperty('--shadow-glow', shadowGlow);
    }
    
    if (settings?.secondary_color) {
      const secondaryHSL = hexToHSL(settings.secondary_color);
      // Only apply if user explicitly set a secondary color different from default
      document.documentElement.style.setProperty('--accent', secondaryHSL);
    }
    
    return () => {
      // Cleanup - reset to default CSS values
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--primary-light');
      document.documentElement.style.removeProperty('--primary-dark');
      document.documentElement.style.removeProperty('--ring');
      document.documentElement.style.removeProperty('--sidebar-primary');
      document.documentElement.style.removeProperty('--sidebar-ring');
      document.documentElement.style.removeProperty('--gradient-primary');
      document.documentElement.style.removeProperty('--shadow-glow');
      document.documentElement.style.removeProperty('--accent');
    };
  }, [settings?.primary_color, settings?.secondary_color]);

  return null; // This component doesn't render anything
};
