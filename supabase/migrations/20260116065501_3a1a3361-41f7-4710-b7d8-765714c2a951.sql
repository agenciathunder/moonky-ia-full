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