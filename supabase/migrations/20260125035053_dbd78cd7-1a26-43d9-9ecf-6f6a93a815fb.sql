-- Add new columns to plans table for landing page display
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS show_on_landing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS promo_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS promo_period text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS landing_features text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS cta_text text DEFAULT NULL;