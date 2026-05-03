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