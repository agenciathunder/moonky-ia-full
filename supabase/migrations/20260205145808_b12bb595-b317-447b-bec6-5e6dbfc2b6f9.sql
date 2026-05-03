-- Add display_order column to product_categories
ALTER TABLE public.product_categories 
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Update existing categories with sequential order based on creation date
WITH ordered_categories AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY establishment_id ORDER BY created_at) - 1 as new_order
  FROM public.product_categories
)
UPDATE public.product_categories pc
SET display_order = oc.new_order
FROM ordered_categories oc
WHERE pc.id = oc.id;