-- Add cash_amount field to orders table for calculating change
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cash_amount numeric NULL;