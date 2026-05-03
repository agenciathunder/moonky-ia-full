
-- Add specifications column to order_items to store selected product variants
ALTER TABLE public.order_items ADD COLUMN specifications jsonb DEFAULT NULL;

-- Add order_notes column to orders for customer observations
-- (orders.notes already exists but is used for PDV customer info, so we add a dedicated field)
ALTER TABLE public.orders ADD COLUMN order_observations text DEFAULT NULL;
