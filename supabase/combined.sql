-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    avatar_url TEXT,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create brands table
CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admins can manage brands" ON public.brands FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create product_categories table
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.product_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2),
    is_on_sale BOOLEAN DEFAULT false,
    image_url TEXT,
    brand_id UUID REFERENCES public.brands(id),
    category_id UUID REFERENCES public.product_categories(id),
    stock INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create banners table
CREATE TABLE public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    link_type TEXT DEFAULT 'none',
    link_id TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active banners" ON public.banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage banners" ON public.banners FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create store_settings table
CREATE TABLE public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT DEFAULT 'Moonky',
    store_description TEXT,
    store_logo_url TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    opening_hours JSONB,
    primary_color TEXT DEFAULT '#3834ED',
    secondary_color TEXT,
    default_theme TEXT DEFAULT 'system',
    minimum_order_value DECIMAL(10,2),
    delivery_fee DECIMAL(10,2) DEFAULT 5.00,
    free_delivery_threshold DECIMAL(10,2) DEFAULT 100.00,
    delivery_cep TEXT,
    delivery_city TEXT,
    delivery_state TEXT,
    instagram_url TEXT,
    facebook_url TEXT,
    tiktok_url TEXT,
    show_age_restriction BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view store settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage store settings" ON public.store_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    total DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT,
    delivery_address JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Create order_items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    product_image TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can insert own order items" ON public.order_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create favorites table
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, product_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Create coupons table
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT DEFAULT 'percentage',
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_order_value DECIMAL(10,2),
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default store settings
INSERT INTO public.store_settings (store_name, show_age_restriction) 
VALUES ('Moonky', true);

-- Insert some sample categories
INSERT INTO public.product_categories (name) VALUES 
  ('Cervejas'),
  ('Vinhos'),
  ('Destilados'),
  ('Refrigerantes'),
  ('Águas'),
  ('Energéticos');

-- Insert sample brands
INSERT INTO public.brands (name) VALUES 
  ('Heineken'),
  ('Budweiser'),
  ('Corona'),
  ('Absolut'),
  ('Red Bull');
-- Add RLS policy for user_roles table
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
-- Create storage buckets for banners and products
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos', 'brand-logos', true) ON CONFLICT (id) DO NOTHING;

-- Create policies for banners bucket
CREATE POLICY "Anyone can view banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Admins can manage banners" ON storage.objects FOR ALL USING (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'));

-- Create policies for products bucket
CREATE POLICY "Anyone can view products images" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Admins can manage products images" ON storage.objects FOR ALL USING (bucket_id = 'products' AND has_role(auth.uid(), 'admin'));

-- Create policies for brand-logos bucket
CREATE POLICY "Anyone can view brand logos" ON storage.objects FOR SELECT USING (bucket_id = 'brand-logos');
CREATE POLICY "Admins can manage brand logos" ON storage.objects FOR ALL USING (bucket_id = 'brand-logos' AND has_role(auth.uid(), 'admin'));
-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ticket_types table
CREATE TABLE public.ticket_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ticket_sales table for tracking purchases
CREATE TABLE public.ticket_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create storage bucket for events
INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_sales ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Admins can manage events"
ON public.events FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active events"
ON public.events FOR SELECT
USING (is_active = true);

-- Ticket types policies
CREATE POLICY "Admins can manage ticket types"
ON public.ticket_types FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active ticket types"
ON public.ticket_types FOR SELECT
USING (is_active = true);

-- Ticket sales policies
CREATE POLICY "Admins can view all ticket sales"
ON public.ticket_sales FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own ticket sales"
ON public.ticket_sales FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ticket sales"
ON public.ticket_sales FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Storage policies for events bucket
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

CREATE POLICY "Admins can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'events' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update event images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'events' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete event images"
ON storage.objects FOR DELETE
USING (bucket_id = 'events' AND has_role(auth.uid(), 'admin'));

-- Create storage bucket for store logo
INSERT INTO storage.buckets (id, name, public) VALUES ('store-assets', 'store-assets', true);

-- Storage policies for store-assets bucket
CREATE POLICY "Anyone can view store assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

CREATE POLICY "Admins can upload store assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update store assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'store-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete store assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'store-assets' AND has_role(auth.uid(), 'admin'));
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
-- Limpar dados existentes (mas manter estrutura de auth/roles)
TRUNCATE TABLE public.ticket_sales CASCADE;
TRUNCATE TABLE public.ticket_types CASCADE;
TRUNCATE TABLE public.events CASCADE;
TRUNCATE TABLE public.order_items CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.favorites CASCADE;
TRUNCATE TABLE public.product_images CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.product_categories CASCADE;
TRUNCATE TABLE public.brands CASCADE;
TRUNCATE TABLE public.banners CASCADE;
TRUNCATE TABLE public.coupons CASCADE;
TRUNCATE TABLE public.store_settings CASCADE;

-- Criar tabela de estabelecimentos
CREATE TABLE public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar establishment_id em todas as tabelas que precisam de isolamento
ALTER TABLE public.products ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.product_categories ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.brands ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.banners ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.coupons ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;

-- Criar tabela de configurações por estabelecimento
CREATE TABLE public.establishment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL UNIQUE REFERENCES public.establishments(id) ON DELETE CASCADE,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  opening_hours JSONB,
  primary_color TEXT DEFAULT '#3834ED',
  secondary_color TEXT,
  default_theme TEXT DEFAULT 'system',
  minimum_order_value NUMERIC,
  delivery_fee NUMERIC DEFAULT 5.00,
  free_delivery_threshold NUMERIC DEFAULT 100.00,
  delivery_cep TEXT,
  delivery_city TEXT,
  delivery_state TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  tiktok_url TEXT,
  show_age_restriction BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para vincular usuários a estabelecimentos (staff/employees)
CREATE TABLE public.establishment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin', -- admin, manager, staff
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(establishment_id, user_id)
);

-- Adicionar establishment_id no profiles para saber o estabelecimento principal do usuário
ALTER TABLE public.profiles ADD COLUMN establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_members ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário é membro de um estabelecimento
CREATE OR REPLACE FUNCTION public.is_establishment_member(_user_id UUID, _establishment_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.establishment_members
    WHERE user_id = _user_id AND establishment_id = _establishment_id
  )
$$;

-- Função para verificar se usuário é owner do estabelecimento
CREATE OR REPLACE FUNCTION public.is_establishment_owner(_user_id UUID, _establishment_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.establishments
    WHERE id = _establishment_id AND owner_id = _user_id
  )
$$;

-- Função para obter establishment_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_establishment_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT establishment_id FROM public.establishment_members WHERE user_id = _user_id LIMIT 1
$$;

-- RLS para establishments
CREATE POLICY "Anyone can view active establishments" ON public.establishments
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all establishments" ON public.establishments
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can update own establishment" ON public.establishments
FOR UPDATE USING (owner_id = auth.uid());

-- RLS para establishment_settings
CREATE POLICY "Anyone can view establishment settings" ON public.establishment_settings
FOR SELECT USING (true);

CREATE POLICY "Admins can manage all settings" ON public.establishment_settings
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can manage own establishment settings" ON public.establishment_settings
FOR ALL USING (is_establishment_member(auth.uid(), establishment_id));

-- RLS para establishment_members
CREATE POLICY "Admins can manage all members" ON public.establishment_members
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view own establishment members" ON public.establishment_members
FOR SELECT USING (is_establishment_member(auth.uid(), establishment_id));

CREATE POLICY "Owners can manage establishment members" ON public.establishment_members
FOR ALL USING (is_establishment_owner(auth.uid(), establishment_id));

-- Atualizar RLS das tabelas existentes para usar establishment_id

-- Products: apenas membros do estabelecimento podem gerenciar
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Members can manage establishment products" ON public.products
FOR ALL USING (is_establishment_member(auth.uid(), establishment_id));

CREATE POLICY "Anyone can view active establishment products" ON public.products
FOR SELECT USING (active = true AND establishment_id IS NOT NULL);

CREATE POLICY "Master admins can manage all products" ON public.products
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Categories: apenas membros do estabelecimento podem gerenciar
DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.product_categories;

CREATE POLICY "Members can manage establishment categories" ON public.product_categories
FOR ALL USING (is_establishment_member(auth.uid(), establishment_id));

CREATE POLICY "Anyone can view establishment categories" ON public.product_categories
FOR SELECT USING (establishment_id IS NOT NULL);

CREATE POLICY "Master admins can manage all categories" ON public.product_categories
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Brands: apenas membros do estabelecimento podem gerenciar
DROP POLICY IF EXISTS "Admins can manage brands" ON public.brands;
DROP POLICY IF EXISTS "Anyone can view brands" ON public.brands;

CREATE POLICY "Members can manage establishment brands" ON public.brands
FOR ALL USING (is_establishment_member(auth.uid(), establishment_id));

CREATE POLICY "Anyone can view establishment brands" ON public.brands
FOR SELECT USING (establishment_id IS NOT NULL);

CREATE POLICY "Master admins can manage all brands" ON public.brands
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Orders: membros podem ver pedidos do estabelecimento, clientes seus próprios
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;

CREATE POLICY "Members can manage establishment orders" ON public.orders
FOR ALL USING (is_establishment_member(auth.uid(), establishment_id));

CREATE POLICY "Users can insert orders" ON public.orders
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own orders" ON public.orders
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Master admins can manage all orders" ON public.orders
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Banners: apenas membros do estabelecimento podem gerenciar
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
DROP POLICY IF EXISTS "Anyone can view active banners" ON public.banners;

CREATE POLICY "Members can manage establishment banners" ON public.banners
FOR ALL USING (is_establishment_member(auth.uid(), establishment_id));

CREATE POLICY "Anyone can view active establishment banners" ON public.banners
FOR SELECT USING (is_active = true AND establishment_id IS NOT NULL);

CREATE POLICY "Master admins can manage all banners" ON public.banners
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Coupons: apenas membros do estabelecimento podem gerenciar
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

CREATE POLICY "Members can manage establishment coupons" ON public.coupons
FOR ALL USING (is_establishment_member(auth.uid(), establishment_id));

CREATE POLICY "Anyone can view active establishment coupons" ON public.coupons
FOR SELECT USING (is_active = true AND establishment_id IS NOT NULL);

CREATE POLICY "Master admins can manage all coupons" ON public.coupons
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Events: apenas membros do estabelecimento podem gerenciar
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;

CREATE POLICY "Members can manage establishment events" ON public.events
FOR ALL USING (is_establishment_member(auth.uid(), establishment_id));

CREATE POLICY "Anyone can view active establishment events" ON public.events
FOR SELECT USING (is_active = true AND establishment_id IS NOT NULL);

CREATE POLICY "Master admins can manage all events" ON public.events
FOR ALL USING (has_role(auth.uid(), 'admin'));
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
-- Create bucket for establishment logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('establishment-logos', 'establishment-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for establishment-logos bucket
CREATE POLICY "Anyone can view establishment logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'establishment-logos');

CREATE POLICY "Admins can upload establishment logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'establishment-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update establishment logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'establishment-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete establishment logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'establishment-logos' AND public.has_role(auth.uid(), 'admin'));

-- Add policies to allow establishment members to manage store-assets
CREATE POLICY "Members can upload store assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-assets' AND 
  EXISTS (
    SELECT 1 FROM public.establishments e
    JOIN public.establishment_members em ON em.establishment_id = e.id
    WHERE em.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update store assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'store-assets' AND 
  EXISTS (
    SELECT 1 FROM public.establishments e
    JOIN public.establishment_members em ON em.establishment_id = e.id
    WHERE em.user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete store assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'store-assets' AND 
  EXISTS (
    SELECT 1 FROM public.establishments e
    JOIN public.establishment_members em ON em.establishment_id = e.id
    WHERE em.user_id = auth.uid()
  )
);
-- Add policies to allow establishment members to manage products images
CREATE POLICY "Members can upload products images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'products' AND 
  EXISTS (
    SELECT 1 FROM public.establishment_members em
    WHERE em.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update products images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'products' AND 
  EXISTS (
    SELECT 1 FROM public.establishment_members em
    WHERE em.user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete products images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'products' AND 
  EXISTS (
    SELECT 1 FROM public.establishment_members em
    WHERE em.user_id = auth.uid()
  )
);

-- Add policies to allow establishment members to manage banners images
CREATE POLICY "Members can upload banners images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banners' AND 
  EXISTS (
    SELECT 1 FROM public.establishment_members em
    WHERE em.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update banners images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'banners' AND 
  EXISTS (
    SELECT 1 FROM public.establishment_members em
    WHERE em.user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete banners images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'banners' AND 
  EXISTS (
    SELECT 1 FROM public.establishment_members em
    WHERE em.user_id = auth.uid()
  )
);

-- Add policies to allow establishment members to manage brand logos
CREATE POLICY "Members can upload brand logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-logos' AND 
  EXISTS (
    SELECT 1 FROM public.establishment_members em
    WHERE em.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update brand logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-logos' AND 
  EXISTS (
    SELECT 1 FROM public.establishment_members em
    WHERE em.user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete brand logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-logos' AND 
  EXISTS (
    SELECT 1 FROM public.establishment_members em
    WHERE em.user_id = auth.uid()
  )
);
-- Drop existing policies first to recreate them properly
DROP POLICY IF EXISTS "Anyone can view establishment logos" ON storage.objects;
DROP POLICY IF EXISTS "Establishment members can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Establishment members can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Establishment members can delete logos" ON storage.objects;

-- Create storage policies for establishment-logos bucket
-- Allow anyone to view establishment logos
CREATE POLICY "Anyone can view establishment logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'establishment-logos');

-- Allow authenticated users to upload logos (establishment members)
CREATE POLICY "Authenticated users can upload establishment logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'establishment-logos' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to update logos
CREATE POLICY "Authenticated users can update establishment logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'establishment-logos' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete establishment logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'establishment-logos' AND
  auth.uid() IS NOT NULL
);
-- Add cash_amount field to orders table for calculating change
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cash_amount numeric NULL;
-- Add new feature columns to plans table for admin panel features
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS has_overview boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_products boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_brands boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_categories boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_banners boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_coupons boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_orders boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_customers boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_settings boolean DEFAULT true;

-- Update existing plans to have all features enabled by default
UPDATE public.plans SET 
  has_overview = true,
  has_products = true,
  has_brands = true,
  has_categories = true,
  has_banners = true,
  has_coupons = true,
  has_orders = true,
  has_customers = true,
  has_settings = true
WHERE has_overview IS NULL;
-- Allow master admins to view all profiles
CREATE POLICY "Master admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow master admins to manage all profiles
CREATE POLICY "Master admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));
-- Add original_email column to profiles for display purposes
-- The email column will contain the isolated email (with slug), original_email stores what user typed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS original_email text;
-- Add new columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS map_image_url text,
ADD COLUMN IF NOT EXISTS youtube_url text;

-- Fix RLS policies for events bucket storage
-- First, let's ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Members can manage event images" ON storage.objects;

-- Create proper storage policies for events bucket
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'events' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update event images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'events' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete event images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'events' 
  AND auth.role() = 'authenticated'
);

-- Create ticket_batches table (lotes)
CREATE TABLE public.ticket_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add batch_id to ticket_types
ALTER TABLE public.ticket_types ADD COLUMN batch_id UUID REFERENCES public.ticket_batches(id) ON DELETE SET NULL;

-- Create individual tickets table (each QR code is one record)
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_sale_id UUID NOT NULL REFERENCES public.ticket_sales(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  qr_code TEXT NOT NULL UNIQUE,
  is_validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add establishment_id to ticket_sales for easier querying
ALTER TABLE public.ticket_sales ADD COLUMN establishment_id UUID REFERENCES public.establishments(id);

-- Add fee columns to ticket_sales
ALTER TABLE public.ticket_sales ADD COLUMN fee_amount NUMERIC DEFAULT 0;
ALTER TABLE public.ticket_sales ADD COLUMN subtotal NUMERIC DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_batches
CREATE POLICY "Anyone can view active batches" ON public.ticket_batches
  FOR SELECT USING (is_active = true);

CREATE POLICY "Members can manage establishment batches" ON public.ticket_batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_batches.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );

CREATE POLICY "Master admins can manage all batches" ON public.ticket_batches
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for tickets
CREATE POLICY "Users can view own tickets" ON public.tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can view establishment tickets" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = tickets.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );

CREATE POLICY "Members can update establishment tickets" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = tickets.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );

CREATE POLICY "Master admins can manage all tickets" ON public.tickets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Update ticket_sales RLS to allow members to view
CREATE POLICY "Members can view establishment ticket sales" ON public.ticket_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_sales.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );

CREATE POLICY "Members can update establishment ticket sales" ON public.ticket_sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_sales.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );

-- Enable realtime for tickets table (for real-time validation updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
-- Add RLS policy for establishment members to manage ticket_types
CREATE POLICY "Members can manage establishment ticket types" ON public.ticket_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_types.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );

-- Also add INSERT policy with CHECK
CREATE POLICY "Members can insert ticket types for their events" ON public.ticket_types
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_types.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );
-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet_transactions table for tracking all money movements
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sale', 'withdrawal', 'refund', 'fee')),
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id UUID, -- order_id, withdrawal_id, etc.
  available_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), -- for credit card D+14
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for withdrawal_requests
CREATE POLICY "Master admins can manage all withdrawals" 
ON public.withdrawal_requests 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own establishment withdrawals" 
ON public.withdrawal_requests 
FOR SELECT 
USING (is_establishment_member(auth.uid(), establishment_id));

CREATE POLICY "Members can insert withdrawal requests" 
ON public.withdrawal_requests 
FOR INSERT 
WITH CHECK (is_establishment_member(auth.uid(), establishment_id));

-- RLS policies for wallet_transactions
CREATE POLICY "Master admins can manage all transactions" 
ON public.wallet_transactions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own establishment transactions" 
ON public.wallet_transactions 
FOR SELECT 
USING (is_establishment_member(auth.uid(), establishment_id));

-- Add triggers for updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add has_wallet to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS has_wallet BOOLEAN DEFAULT false;
-- Allow establishment members to view profiles of customers who bought tickets for their events
CREATE POLICY "Establishment members can view ticket buyers profiles"
ON public.profiles
FOR SELECT
USING (
  -- Allow if the profile belongs to someone who bought tickets for an event of the user's establishment
  EXISTS (
    SELECT 1 FROM tickets t
    JOIN events e ON e.id = t.event_id
    WHERE t.user_id = profiles.id
    AND is_establishment_member(auth.uid(), e.establishment_id)
  )
  OR
  -- Or if they bought products from an order in the user's establishment
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = profiles.id
    AND is_establishment_member(auth.uid(), o.establishment_id)
  )
);
-- Add PIX payment details to withdrawal requests
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS pix_key_type TEXT,
ADD COLUMN IF NOT EXISTS document TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT;
-- Add address fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS number text,
ADD COLUMN IF NOT EXISTS neighborhood text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text;
-- Create expenses table for financial report
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create manual entries table for additional income
CREATE TABLE public.manual_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for expenses
CREATE POLICY "Users can view expenses of their establishment" 
ON public.expenses FOR SELECT 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create expenses for their establishment" 
ON public.expenses FOR INSERT 
WITH CHECK (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update expenses of their establishment" 
ON public.expenses FOR UPDATE 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete expenses of their establishment" 
ON public.expenses FOR DELETE 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for manual_entries
CREATE POLICY "Users can view entries of their establishment" 
ON public.manual_entries FOR SELECT 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create entries for their establishment" 
ON public.manual_entries FOR INSERT 
WITH CHECK (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update entries of their establishment" 
ON public.manual_entries FOR UPDATE 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete entries of their establishment" 
ON public.manual_entries FOR DELETE 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manual_entries_updated_at
BEFORE UPDATE ON public.manual_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow establishment members to view profiles of users registered in their establishment
CREATE POLICY "Establishment members can view registered customers"
ON public.profiles
FOR SELECT
USING (
  -- Allow if the profile has establishment_id matching the user's establishment
  is_establishment_member(auth.uid(), establishment_id)
);
-- Add seller_id column to orders table to track which user made the sale
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id);

-- Create index for faster queries by seller
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_establishment_payment ON public.orders(establishment_id, payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
-- Add new columns to plans table for landing page display
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS show_on_landing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS promo_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS promo_period text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS landing_features text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS cta_text text DEFAULT NULL;
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
-- Add customer fee columns for PIX and credit card installments
ALTER TABLE public.platform_fees
ADD COLUMN IF NOT EXISTS customer_pix_percentage numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_pix_fixed numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_credit_1x_percentage numeric NOT NULL DEFAULT 5.99,
ADD COLUMN IF NOT EXISTS customer_credit_1x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS customer_credit_2x_percentage numeric NOT NULL DEFAULT 6.49,
ADD COLUMN IF NOT EXISTS customer_credit_2x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS customer_credit_3x_percentage numeric NOT NULL DEFAULT 6.99,
ADD COLUMN IF NOT EXISTS customer_credit_3x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS customer_credit_4x_percentage numeric NOT NULL DEFAULT 7.49,
ADD COLUMN IF NOT EXISTS customer_credit_4x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS customer_credit_5x_percentage numeric NOT NULL DEFAULT 7.99,
ADD COLUMN IF NOT EXISTS customer_credit_5x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS customer_credit_6x_percentage numeric NOT NULL DEFAULT 8.49,
ADD COLUMN IF NOT EXISTS customer_credit_6x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS customer_credit_7x_percentage numeric NOT NULL DEFAULT 8.99,
ADD COLUMN IF NOT EXISTS customer_credit_7x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS customer_credit_8x_percentage numeric NOT NULL DEFAULT 9.49,
ADD COLUMN IF NOT EXISTS customer_credit_8x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS customer_credit_9x_percentage numeric NOT NULL DEFAULT 9.99,
ADD COLUMN IF NOT EXISTS customer_credit_9x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS customer_credit_10x_percentage numeric NOT NULL DEFAULT 10.49,
ADD COLUMN IF NOT EXISTS customer_credit_10x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS customer_credit_11x_percentage numeric NOT NULL DEFAULT 10.99,
ADD COLUMN IF NOT EXISTS customer_credit_11x_fixed numeric NOT NULL DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS customer_credit_12x_percentage numeric NOT NULL DEFAULT 11.49,
ADD COLUMN IF NOT EXISTS customer_credit_12x_fixed numeric NOT NULL DEFAULT 0.99;
-- Activity Logs Table - Stores all user activities (immutable)
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  user_role text, -- admin, moderator, user, employee
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL,
  establishment_name text,
  action text NOT NULL, -- login, logout, create, update, delete, view, sale, withdrawal, etc.
  resource_type text, -- event, product, ticket, plan, user, order, wallet, etc.
  resource_id uuid,
  resource_name text,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  device_type text, -- desktop, mobile, tablet
  browser text,
  os text,
  location_city text,
  location_state text,
  location_country text,
  result text DEFAULT 'success', -- success, error, blocked
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Sessions Table - Track user sessions
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email text,
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL,
  session_token text UNIQUE NOT NULL,
  device_type text,
  browser text,
  os text,
  ip_address text,
  location_city text,
  location_state text,
  is_active boolean DEFAULT true,
  started_at timestamptz DEFAULT now() NOT NULL,
  last_activity_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz
);

-- Security Alerts Table - Track suspicious activities
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL,
  alert_type text NOT NULL, -- invalid_login, suspicious_access, multiple_sessions, critical_action
  severity text DEFAULT 'medium', -- low, medium, high, critical
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  location text,
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_note text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Logs Access Audit - Track who accessed the logs (immutable)
CREATE TABLE public.logs_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  user_email text,
  action text NOT NULL, -- view_logs, export_logs, filter_logs
  filters_applied jsonb DEFAULT '{}',
  records_accessed integer DEFAULT 0,
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_access_audit ENABLE ROW LEVEL SECURITY;

-- Enable realtime for sessions and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- RLS Policies for activity_logs (only master admins can view)
CREATE POLICY "Master admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Any authenticated user can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policies - logs are immutable

-- RLS Policies for user_sessions
CREATE POLICY "Master admins can view all sessions"
  ON public.user_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Any authenticated user can insert sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Master admins can manage all sessions"
  ON public.user_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for security_alerts
CREATE POLICY "Master admins can manage security alerts"
  ON public.security_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert security alerts"
  ON public.security_alerts FOR INSERT
  WITH CHECK (true);

-- RLS Policies for logs_access_audit
CREATE POLICY "Master admins can view logs access audit"
  ON public.logs_access_audit FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admins can insert logs access audit"
  ON public.logs_access_audit FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for efficient querying
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_establishment_id ON public.activity_logs(establishment_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_resource_type ON public.activity_logs(resource_type);
CREATE INDEX idx_activity_logs_result ON public.activity_logs(result);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity_at DESC);

CREATE INDEX idx_security_alerts_user_id ON public.security_alerts(user_id);
CREATE INDEX idx_security_alerts_alert_type ON public.security_alerts(alert_type);
CREATE INDEX idx_security_alerts_created_at ON public.security_alerts(created_at DESC);
CREATE INDEX idx_security_alerts_is_resolved ON public.security_alerts(is_resolved);
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
-- Allow establishment members to see items from orders of their establishment
DROP POLICY IF EXISTS "Members can view establishment order items" ON public.order_items;

CREATE POLICY "Members can view establishment order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND is_establishment_member(auth.uid(), o.establishment_id)
  )
);
-- Add RLS policy for establishment members to insert product images
CREATE POLICY "Members can insert product images for their products"
ON public.product_images
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
    AND is_establishment_member(auth.uid(), p.establishment_id)
  )
);

-- Add RLS policy for establishment members to delete product images
CREATE POLICY "Members can delete product images for their products"
ON public.product_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
    AND is_establishment_member(auth.uid(), p.establishment_id)
  )
);

-- Add RLS policy for establishment members to update product images
CREATE POLICY "Members can update product images for their products"
ON public.product_images
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
    AND is_establishment_member(auth.uid(), p.establishment_id)
  )
);
-- Allow customers to upload/update/delete their own profile avatars in store-assets bucket
-- The path must follow: avatars/<user_id>/<filename>

CREATE POLICY "Users can upload own avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can update own avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete own avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
-- Adicionar coluna para link externo do botão CTA do plano
ALTER TABLE public.plans 
ADD COLUMN cta_link text DEFAULT NULL;
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
-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view active establishments" ON public.establishments;

-- Create new policy that allows viewing all establishments (needed for suspended/cancelled screens)
CREATE POLICY "Anyone can view establishments by slug" 
ON public.establishments 
FOR SELECT 
USING (true);

CREATE OR REPLACE FUNCTION public.delete_establishment_cascade(_establishment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete tickets (depends on ticket_sales and events)
  DELETE FROM public.tickets WHERE event_id IN (SELECT id FROM public.events WHERE establishment_id = _establishment_id);
  
  -- Delete ticket_sales
  DELETE FROM public.ticket_sales WHERE establishment_id = _establishment_id;
  DELETE FROM public.ticket_sales WHERE event_id IN (SELECT id FROM public.events WHERE establishment_id = _establishment_id);

  -- Delete ticket_types (depends on ticket_batches and events)
  DELETE FROM public.ticket_types WHERE event_id IN (SELECT id FROM public.events WHERE establishment_id = _establishment_id);

  -- Delete ticket_batches
  DELETE FROM public.ticket_batches WHERE event_id IN (SELECT id FROM public.events WHERE establishment_id = _establishment_id);

  -- Delete events
  DELETE FROM public.events WHERE establishment_id = _establishment_id;

  -- Delete order_items (depends on orders and products)
  DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE establishment_id = _establishment_id);
  DELETE FROM public.order_items WHERE product_id IN (SELECT id FROM public.products WHERE establishment_id = _establishment_id);

  -- Delete orders
  DELETE FROM public.orders WHERE establishment_id = _establishment_id;

  -- Delete product_images
  DELETE FROM public.product_images WHERE product_id IN (SELECT id FROM public.products WHERE establishment_id = _establishment_id);

  -- Delete product_variants
  DELETE FROM public.product_variants WHERE product_id IN (SELECT id FROM public.products WHERE establishment_id = _establishment_id);

  -- Delete favorites referencing products
  DELETE FROM public.favorites WHERE product_id IN (SELECT id FROM public.products WHERE establishment_id = _establishment_id);

  -- Delete products
  DELETE FROM public.products WHERE establishment_id = _establishment_id;

  -- Delete brands
  DELETE FROM public.brands WHERE establishment_id = _establishment_id;

  -- Delete product_categories
  DELETE FROM public.product_categories WHERE establishment_id = _establishment_id;

  -- Delete banners
  DELETE FROM public.banners WHERE establishment_id = _establishment_id;

  -- Delete coupons
  DELETE FROM public.coupons WHERE establishment_id = _establishment_id;

  -- Delete wallet_transactions
  DELETE FROM public.wallet_transactions WHERE establishment_id = _establishment_id;

  -- Delete withdrawal_requests
  DELETE FROM public.withdrawal_requests WHERE establishment_id = _establishment_id;

  -- Delete expenses
  DELETE FROM public.expenses WHERE establishment_id = _establishment_id;

  -- Delete manual_entries
  DELETE FROM public.manual_entries WHERE establishment_id = _establishment_id;

  -- Delete establishment_settings
  DELETE FROM public.establishment_settings WHERE establishment_id = _establishment_id;

  -- Delete establishment_members
  DELETE FROM public.establishment_members WHERE establishment_id = _establishment_id;

  -- Delete activity_logs
  DELETE FROM public.activity_logs WHERE establishment_id = _establishment_id;

  -- Delete user_sessions
  DELETE FROM public.user_sessions WHERE establishment_id = _establishment_id;

  -- Delete security_alerts
  DELETE FROM public.security_alerts WHERE establishment_id = _establishment_id;

  -- Delete profiles linked to establishment
  UPDATE public.profiles SET establishment_id = NULL WHERE establishment_id = _establishment_id;

  -- Finally delete the establishment
  DELETE FROM public.establishments WHERE id = _establishment_id;
END;
$$;

CREATE TABLE public.landing_page_settings (
  id text PRIMARY KEY DEFAULT 'default',
  -- Logo
  logo_url text DEFAULT NULL,
  
  -- Banner
  banner_enabled boolean DEFAULT false,
  banner_image_url text DEFAULT NULL,
  banner_title text DEFAULT NULL,
  banner_description text DEFAULT NULL,
  banner_button_text text DEFAULT NULL,
  banner_button_link text DEFAULT NULL,
  
  -- Hero section
  hero_visible boolean DEFAULT true,
  hero_badge_text text DEFAULT 'Oferta por tempo limitado — Economize até 60%',
  hero_title text DEFAULT 'Transforme seu negócio em uma máquina de vendas organizada — em minutos',
  hero_subtitle text DEFAULT 'Crie sua loja virtual, catálogo ou cardápio digital personalizado. Controle pedidos, vendas e financeiro em um único sistema simples e poderoso.',
  hero_cta_text text DEFAULT 'Acessar minha conta',
  hero_cta_link text DEFAULT '/auth',
  hero_secondary_btn_text text DEFAULT 'Ver demonstração',
  hero_secondary_btn_link text DEFAULT '#',
  hero_secondary_btn_visible boolean DEFAULT true,
  hero_trust1 text DEFAULT 'Setup em 5 minutos',
  hero_trust2 text DEFAULT 'Sem conhecimento técnico',
  hero_trust3 text DEFAULT 'Suporte humanizado',
  
  -- Pain Points section
  painpoints_visible boolean DEFAULT true,
  painpoints_badge text DEFAULT 'Você se identifica?',
  painpoints_title text DEFAULT 'As dores que estão travando seu crescimento',
  painpoints_subtitle text DEFAULT 'Se você passa por alguma dessas situações, está perdendo dinheiro e tempo todos os dias.',
  painpoints_solution_title text DEFAULT 'Você não precisa de vários sistemas.',
  painpoints_solution_subtitle text DEFAULT 'Precisa de um só que resolva tudo.',
  
  -- Benefits section
  benefits_visible boolean DEFAULT true,
  benefits_badge text DEFAULT 'Resultados reais',
  benefits_title text DEFAULT 'O que o Moonky faz pelo seu negócio',
  benefits_subtitle text DEFAULT 'Focamos em resultados práticos que você vai sentir no dia a dia e no caixa.',
  
  -- Features section
  features_visible boolean DEFAULT true,
  features_badge text DEFAULT 'Funcionalidades',
  features_title text DEFAULT 'Tudo que você precisa em um só lugar',
  features_subtitle text DEFAULT 'Ferramentas profissionais para gerenciar seu negócio de ponta a ponta.',
  
  -- Pricing section
  pricing_visible boolean DEFAULT true,
  pricing_badge text DEFAULT 'Planos e preços',
  pricing_title text DEFAULT 'Escolha o plano ideal para seu negócio',
  pricing_promo_text text DEFAULT 'Oferta por tempo limitado — Economize até 60%',
  
  -- CTA section
  cta_visible boolean DEFAULT true,
  cta_title text DEFAULT 'Pare de perder vendas por falta de controle',
  cta_subtitle text DEFAULT 'Em poucos minutos, seu negócio pode estar vendendo de forma organizada e profissional.',
  cta_button_text text DEFAULT 'Acessar minha conta',
  cta_button_link text DEFAULT '/auth',
  cta_social_proof text DEFAULT '+100 empresários já utilizam o Moonky',
  
  -- Footer
  footer_visible boolean DEFAULT true,
  footer_description text DEFAULT 'Sistema completo de gestão, pedidos e vendas para estabelecimentos comerciais. Simples, profissional e escalável.',
  footer_instagram_url text DEFAULT '#',
  footer_facebook_url text DEFAULT '#',
  footer_linkedin_url text DEFAULT '#',
  footer_help_url text DEFAULT '#',
  footer_contact_url text DEFAULT '#',
  footer_terms_url text DEFAULT '#',
  footer_privacy_url text DEFAULT '#',
  
  -- Navbar
  navbar_cta_text text DEFAULT 'Entrar',
  navbar_cta_link text DEFAULT '/auth',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default row
INSERT INTO public.landing_page_settings (id) VALUES ('default');

-- Allow public read access (landing page is public)
ALTER TABLE public.landing_page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read landing settings"
  ON public.landing_page_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update landing settings"
  ON public.landing_page_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert landing settings"
  ON public.landing_page_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.landing_page_settings ADD COLUMN banner_mobile_image_url text;
ALTER TABLE public.landing_page_settings
ADD COLUMN IF NOT EXISTS painpoints_cards jsonb DEFAULT '[{"icon_url":null,"title":"Perda de vendas","description":"Por falta de organização e controle dos pedidos"},{"icon_url":null,"title":"Pedidos no papel","description":"Anotações confusas, erros e pedidos perdidos no WhatsApp"},{"icon_url":null,"title":"Sem controle financeiro","description":"Não sabe quanto entra, quanto sai, nem quanto lucra"},{"icon_url":null,"title":"Tempo desperdiçado","description":"Gerenciando estoque, pedidos e atendimento manualmente"},{"icon_url":null,"title":"Sistemas caros e complexos","description":"Vários sistemas que não conversam entre si"},{"icon_url":null,"title":"Sem visão do negócio","description":"Tomando decisões no escuro, sem dados concretos"}]'::jsonb,
ADD COLUMN IF NOT EXISTS benefits_cards jsonb DEFAULT '[{"icon_url":null,"title":"Loja criada em minutos","description":"Seu catálogo, cardápio ou loja virtual pronta para vender rapidamente"},{"icon_url":null,"title":"100% personalizável","description":"Adapte cores, logo e layout para combinar com sua marca"},{"icon_url":null,"title":"Mais vendas, menos erros","description":"Organização que converte visitantes em clientes fiéis"},{"icon_url":null,"title":"Tudo em um painel","description":"Controle completo do negócio em um único lugar"},{"icon_url":null,"title":"Economia de tempo","description":"Automatize tarefas repetitivas e foque no que importa"},{"icon_url":null,"title":"Visual profissional","description":"Transmita confiança e credibilidade aos seus clientes"}]'::jsonb,
ADD COLUMN IF NOT EXISTS features_cards jsonb DEFAULT '[{"icon_url":null,"title":"Controle Geral do Negócio","description":"Tudo centralizado em um único painel. Visão completa de pedidos, vendas, estoque e clientes.","highlight":true},{"icon_url":null,"title":"PDV Integrado","description":"Venda presencial e online no mesmo sistema. Aceite diversos meios de pagamento.","highlight":false},{"icon_url":null,"title":"Pedidos em Kanban","description":"Visual, organizado e fácil de acompanhar. Ideal para cozinha, balcão ou equipe.","highlight":false},{"icon_url":null,"title":"Eventos","description":"Venda de ingressos, reserva de mesas, camarotes. Controle total de eventos especiais.","highlight":false},{"icon_url":null,"title":"Financeiro Completo","description":"Entradas e saídas, relatórios claros, visão real do lucro. Saiba exatamente como está seu caixa.","highlight":false},{"icon_url":null,"title":"Nota de Serviço","description":"Emissão de nota de forma simples. Mais profissionalismo e segurança para seu negócio.","highlight":false}]'::jsonb;
UPDATE public.establishments SET slug = 'forbin' WHERE id = '4fd77c75-16f7-4ec2-b4e6-77d2b9650c74' AND slug = '/forbin';

-- Add specifications column to order_items to store selected product variants
ALTER TABLE public.order_items ADD COLUMN specifications jsonb DEFAULT NULL;

-- Add order_notes column to orders for customer observations
-- (orders.notes already exists but is used for PDV customer info, so we add a dedicated field)
ALTER TABLE public.orders ADD COLUMN order_observations text DEFAULT NULL;
