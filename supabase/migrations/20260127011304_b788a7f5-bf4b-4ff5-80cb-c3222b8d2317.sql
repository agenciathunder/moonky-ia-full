-- Add sales_count column to products for tracking best sellers
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sales_count integer DEFAULT 0;

-- Create index for faster sorting by sales
CREATE INDEX IF NOT EXISTS idx_products_sales_count ON public.products(sales_count DESC);

-- Create function to update sales_count when order items are added
CREATE OR REPLACE FUNCTION public.update_product_sales_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the sales count for the product
  UPDATE public.products 
  SET sales_count = COALESCE(sales_count, 0) + NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update sales count
DROP TRIGGER IF EXISTS trigger_update_sales_count ON public.order_items;
CREATE TRIGGER trigger_update_sales_count
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_product_sales_count();