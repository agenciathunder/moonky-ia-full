-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create plans table for subscription management
CREATE TABLE public.plans (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    price decimal NOT NULL DEFAULT 0,
    billing_cycle text NOT NULL DEFAULT 'monthly',
    is_active boolean DEFAULT true,
    features jsonb DEFAULT '{}',
    -- Feature flags
    has_virtual_store boolean DEFAULT true,
    has_catalog_only boolean DEFAULT false,
    has_pdv boolean DEFAULT false,
    has_events boolean DEFAULT false,
    has_financial boolean DEFAULT false,
    has_service_notes boolean DEFAULT false,
    has_reports boolean DEFAULT false,
    max_products integer DEFAULT 50,
    max_categories integer DEFAULT 10,
    max_brands integer DEFAULT 10,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "Anyone can view active plans" ON public.plans
FOR SELECT USING (is_active = true);

-- Only master admins can manage plans
CREATE POLICY "Master admins can manage plans" ON public.plans
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add plan_id and additional fields to establishments
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id),
ADD COLUMN IF NOT EXISTS cnpj_cpf text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS due_date date;

-- Add index for status lookup
CREATE INDEX IF NOT EXISTS idx_establishments_status ON public.establishments(status);

-- Insert default plans
INSERT INTO public.plans (name, description, price, has_virtual_store, has_catalog_only, has_pdv, has_events, has_financial, has_service_notes, has_reports, max_products, max_categories, max_brands) VALUES
('Starter', 'Ideal para pequenos negócios que estão começando', 49.99, true, false, false, false, false, false, false, 50, 5, 5),
('Pro', 'Para quem quer controle total e escala', 217.90, true, false, true, true, true, true, true, 500, 50, 50);

-- Update timestamp trigger for plans
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();