-- Add installment fee columns for credit card payments (à vista to 12x)
ALTER TABLE public.platform_fees
ADD COLUMN IF NOT EXISTS gateway_credit_1x_percentage numeric NOT NULL DEFAULT 5.99,
ADD COLUMN IF NOT EXISTS gateway_credit_1x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS gateway_credit_2x_percentage numeric NOT NULL DEFAULT 6.49,
ADD COLUMN IF NOT EXISTS gateway_credit_2x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS gateway_credit_3x_percentage numeric NOT NULL DEFAULT 6.99,
ADD COLUMN IF NOT EXISTS gateway_credit_3x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS gateway_credit_4x_percentage numeric NOT NULL DEFAULT 7.49,
ADD COLUMN IF NOT EXISTS gateway_credit_4x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS gateway_credit_5x_percentage numeric NOT NULL DEFAULT 7.99,
ADD COLUMN IF NOT EXISTS gateway_credit_5x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS gateway_credit_6x_percentage numeric NOT NULL DEFAULT 8.49,
ADD COLUMN IF NOT EXISTS gateway_credit_6x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS gateway_credit_7x_percentage numeric NOT NULL DEFAULT 8.99,
ADD COLUMN IF NOT EXISTS gateway_credit_7x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS gateway_credit_8x_percentage numeric NOT NULL DEFAULT 9.49,
ADD COLUMN IF NOT EXISTS gateway_credit_8x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS gateway_credit_9x_percentage numeric NOT NULL DEFAULT 9.99,
ADD COLUMN IF NOT EXISTS gateway_credit_9x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS gateway_credit_10x_percentage numeric NOT NULL DEFAULT 10.49,
ADD COLUMN IF NOT EXISTS gateway_credit_10x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS gateway_credit_11x_percentage numeric NOT NULL DEFAULT 10.99,
ADD COLUMN IF NOT EXISTS gateway_credit_11x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS gateway_credit_12x_percentage numeric NOT NULL DEFAULT 11.49,
ADD COLUMN IF NOT EXISTS gateway_credit_12x_fixed numeric NOT NULL DEFAULT 0.99;

-- Update existing rows to use the old credit card values for 1x (à vista)
UPDATE public.platform_fees
SET 
  gateway_credit_1x_percentage = gateway_credit_percentage,
  gateway_credit_1x_fixed = gateway_credit_fixed
WHERE gateway_credit_1x_percentage = 5.99;