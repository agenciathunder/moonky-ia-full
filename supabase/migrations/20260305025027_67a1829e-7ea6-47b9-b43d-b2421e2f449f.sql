
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
