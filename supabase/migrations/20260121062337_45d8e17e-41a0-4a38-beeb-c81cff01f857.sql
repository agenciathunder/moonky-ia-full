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