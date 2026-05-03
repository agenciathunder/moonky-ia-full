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