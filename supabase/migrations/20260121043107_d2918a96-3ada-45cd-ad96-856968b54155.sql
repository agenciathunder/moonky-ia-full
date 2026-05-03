-- Add new feature columns to plans table for admin panel features
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS has_overview boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_products boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_brands boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_categories boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_banners boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_coupons boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_orders boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_customers boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_settings boolean DEFAULT true;

-- Update existing plans to have all features enabled by default
UPDATE public.plans SET 
  has_overview = true,
  has_products = true,
  has_brands = true,
  has_categories = true,
  has_banners = true,
  has_coupons = true,
  has_orders = true,
  has_customers = true,
  has_settings = true
WHERE has_overview IS NULL;