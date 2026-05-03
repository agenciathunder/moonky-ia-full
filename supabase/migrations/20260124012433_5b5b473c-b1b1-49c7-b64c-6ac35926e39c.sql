
-- Allow establishment members to view profiles of users registered in their establishment
CREATE POLICY "Establishment members can view registered customers"
ON public.profiles
FOR SELECT
USING (
  -- Allow if the profile has establishment_id matching the user's establishment
  is_establishment_member(auth.uid(), establishment_id)
);
