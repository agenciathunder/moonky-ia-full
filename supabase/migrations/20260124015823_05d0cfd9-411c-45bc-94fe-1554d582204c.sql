-- Add seller_id column to orders table to track which user made the sale
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id);

-- Create index for faster queries by seller
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_establishment_payment ON public.orders(establishment_id, payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);