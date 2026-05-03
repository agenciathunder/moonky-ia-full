-- Create product_variants table for customizable product options (size, color, etc.)
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  options text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view product variants"
ON public.product_variants FOR SELECT
USING (true);

CREATE POLICY "Members can manage establishment product variants"
ON public.product_variants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM products p 
    WHERE p.id = product_variants.product_id 
    AND is_establishment_member(auth.uid(), p.establishment_id)
  )
);

CREATE POLICY "Master admins can manage all variants"
ON public.product_variants FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Rename specific columns to generic names in products table
COMMENT ON COLUMN public.products.volume IS 'Generic attribute 1 - can be volume, size, weight, etc.';
COMMENT ON COLUMN public.products.alcohol_content IS 'Generic attribute 2 - can be alcohol content, material, etc.';