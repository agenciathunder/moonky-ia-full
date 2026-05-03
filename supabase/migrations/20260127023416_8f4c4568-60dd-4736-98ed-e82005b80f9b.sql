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