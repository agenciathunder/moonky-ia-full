-- Add cost price, featured and multiple images support to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alcohol_content TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS volume TEXT;

-- Create product_images table for multiple images
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage product images" 
ON public.product_images FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view product images" 
ON public.product_images FOR SELECT 
USING (true);