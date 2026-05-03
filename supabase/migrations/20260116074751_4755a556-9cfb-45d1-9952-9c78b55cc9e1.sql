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