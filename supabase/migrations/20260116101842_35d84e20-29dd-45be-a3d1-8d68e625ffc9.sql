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