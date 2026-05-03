
-- Create ticket_batches table (lotes)
CREATE TABLE public.ticket_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add batch_id to ticket_types
ALTER TABLE public.ticket_types ADD COLUMN batch_id UUID REFERENCES public.ticket_batches(id) ON DELETE SET NULL;

-- Create individual tickets table (each QR code is one record)
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_sale_id UUID NOT NULL REFERENCES public.ticket_sales(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  qr_code TEXT NOT NULL UNIQUE,
  is_validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add establishment_id to ticket_sales for easier querying
ALTER TABLE public.ticket_sales ADD COLUMN establishment_id UUID REFERENCES public.establishments(id);

-- Add fee columns to ticket_sales
ALTER TABLE public.ticket_sales ADD COLUMN fee_amount NUMERIC DEFAULT 0;
ALTER TABLE public.ticket_sales ADD COLUMN subtotal NUMERIC DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_batches
CREATE POLICY "Anyone can view active batches" ON public.ticket_batches
  FOR SELECT USING (is_active = true);

CREATE POLICY "Members can manage establishment batches" ON public.ticket_batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_batches.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );

CREATE POLICY "Master admins can manage all batches" ON public.ticket_batches
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for tickets
CREATE POLICY "Users can view own tickets" ON public.tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can view establishment tickets" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = tickets.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );

CREATE POLICY "Members can update establishment tickets" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = tickets.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );

CREATE POLICY "Master admins can manage all tickets" ON public.tickets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Update ticket_sales RLS to allow members to view
CREATE POLICY "Members can view establishment ticket sales" ON public.ticket_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_sales.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );

CREATE POLICY "Members can update establishment ticket sales" ON public.ticket_sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_sales.event_id
      AND is_establishment_member(auth.uid(), e.establishment_id)
    )
  );

-- Enable realtime for tickets table (for real-time validation updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
