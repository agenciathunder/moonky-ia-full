import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  minimum_order_value: number | null;
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: Coupon;
  discount?: number;
}

interface CouponContextType {
  isValidating: boolean;
  appliedCoupon: Coupon | null;
  couponDiscount: number;
  validateCoupon: (code: string, subtotal: number) => Promise<CouponValidationResult>;
  applyCoupon: (code: string, subtotal: number) => Promise<CouponValidationResult>;
  removeCoupon: () => void;
  recordCouponUse: (orderId: string) => Promise<void>;
  recalculateDiscount: (subtotal: number) => number;
}

const CouponContext = createContext<CouponContextType | undefined>(undefined);

export function CouponProvider({ children }: { children: ReactNode }) {
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const { user } = useAuth();
  const location = useLocation();
  const previousSlugRef = useRef<string | null>(null);

  // Clear coupon when switching stores
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    let currentSlug: string | null = null;
    
    if (pathParts[0] === 'loja' && pathParts[1]) {
      currentSlug = pathParts[1];
    }
    
    if (currentSlug !== previousSlugRef.current && previousSlugRef.current !== null) {
      // Clear coupon when changing stores
      setAppliedCoupon(null);
      setCouponDiscount(0);
    }
    previousSlugRef.current = currentSlug;
  }, [location.pathname]);

  const validateCoupon = async (
    code: string, 
    subtotal: number
  ): Promise<CouponValidationResult> => {
    if (!code.trim()) {
      return { valid: false, error: "Digite um código de cupom" };
    }

    setIsValidating(true);

    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!coupon) {
        return { valid: false, error: "Cupom não encontrado" };
      }

      if (coupon.valid_until) {
        const expireDate = new Date(coupon.valid_until);
        expireDate.setHours(23, 59, 59, 999);
        if (expireDate < new Date()) {
          return { valid: false, error: "Cupom expirado" };
        }
      }

      if (coupon.valid_from) {
        const startDate = new Date(coupon.valid_from);
        startDate.setHours(0, 0, 0, 0);
        if (startDate > new Date()) {
          return { valid: false, error: "Cupom ainda não está válido" };
        }
      }

      if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
        return { valid: false, error: "Cupom esgotado" };
      }

      if (coupon.minimum_order_value && subtotal < coupon.minimum_order_value) {
        const formatted = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(coupon.minimum_order_value);
        return { 
          valid: false, 
          error: `Pedido mínimo de ${formatted} para este cupom` 
        };
      }

      const discount = coupon.discount_type === "percentage"
        ? (subtotal * coupon.discount_value) / 100
        : coupon.discount_value;

      return {
        valid: true,
        coupon,
        discount: Math.min(discount, subtotal),
      };
    } catch (error: any) {
      console.error("Error validating coupon:", error);
      return { valid: false, error: "Erro ao validar cupom" };
    } finally {
      setIsValidating(false);
    }
  };

  const applyCoupon = async (code: string, subtotal: number) => {
    const result = await validateCoupon(code, subtotal);
    
    if (result.valid && result.coupon && result.discount !== undefined) {
      setAppliedCoupon(result.coupon);
      setCouponDiscount(result.discount);
    }
    
    return result;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
  };

  const recordCouponUse = async (orderId: string) => {
    if (!appliedCoupon || !user) return;

    try {
      await supabase
        .from("coupons")
        .update({ 
          current_uses: appliedCoupon.current_uses + 1 
        })
        .eq("id", appliedCoupon.id);
      
      removeCoupon();
    } catch (error) {
      console.error("Error recording coupon use:", error);
    }
  };

  const recalculateDiscount = (subtotal: number) => {
    if (!appliedCoupon) return 0;
    
    if (appliedCoupon.minimum_order_value && subtotal < appliedCoupon.minimum_order_value) {
      return 0;
    }
    
    const discount = appliedCoupon.discount_type === "percentage"
      ? (subtotal * appliedCoupon.discount_value) / 100
      : appliedCoupon.discount_value;
    
    return Math.min(discount, subtotal);
  };

  return (
    <CouponContext.Provider value={{
      isValidating,
      appliedCoupon,
      couponDiscount,
      validateCoupon,
      applyCoupon,
      removeCoupon,
      recordCouponUse,
      recalculateDiscount,
    }}>
      {children}
    </CouponContext.Provider>
  );
}

export function useCouponContext() {
  const context = useContext(CouponContext);
  if (context === undefined) {
    throw new Error("useCouponContext must be used within a CouponProvider");
  }
  return context;
}
