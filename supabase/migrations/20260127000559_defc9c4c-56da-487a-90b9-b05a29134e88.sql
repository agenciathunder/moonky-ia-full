-- Platform fees configuration table
CREATE TABLE public.platform_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Gateway costs (products only - cost to Moonky)
  gateway_credit_percentage numeric NOT NULL DEFAULT 5.99,
  gateway_credit_fixed numeric NOT NULL DEFAULT 0.99,
  gateway_pix_percentage numeric NOT NULL DEFAULT 0,
  gateway_pix_fixed numeric NOT NULL DEFAULT 0,
  -- Customer fees for products (revenue for Moonky)
  customer_product_percentage numeric NOT NULL DEFAULT 0,
  customer_product_fixed numeric NOT NULL DEFAULT 0,
  -- Customer fees for tickets (revenue for Moonky)
  customer_ticket_percentage numeric NOT NULL DEFAULT 10,
  customer_ticket_minimum numeric NOT NULL DEFAULT 2.50,
  -- Metadata
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fee change audit logs
CREATE TABLE public.platform_fee_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_changed text NOT NULL,
  old_value numeric,
  new_value numeric,
  changed_by uuid NOT NULL,
  changed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_fee_logs ENABLE ROW LEVEL SECURITY;

-- Only Master Admins can manage platform fees
CREATE POLICY "Master admins can manage platform fees"
  ON public.platform_fees FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Master admins can view fee logs"
  ON public.platform_fee_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Master admins can insert fee logs"
  ON public.platform_fee_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default configuration
INSERT INTO public.platform_fees (
  gateway_credit_percentage,
  gateway_credit_fixed,
  gateway_pix_percentage,
  gateway_pix_fixed,
  customer_product_percentage,
  customer_product_fixed,
  customer_ticket_percentage,
  customer_ticket_minimum
) VALUES (
  5.99, 0.99, 0, 0, 0, 0, 10, 2.50
);

-- Create updated_at trigger
CREATE TRIGGER update_platform_fees_updated_at
  BEFORE UPDATE ON public.platform_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();