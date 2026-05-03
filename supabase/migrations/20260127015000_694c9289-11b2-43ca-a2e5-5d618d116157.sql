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
