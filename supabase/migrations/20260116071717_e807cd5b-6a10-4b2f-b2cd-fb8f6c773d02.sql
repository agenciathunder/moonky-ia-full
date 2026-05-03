-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ticket_types table
CREATE TABLE public.ticket_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ticket_sales table for tracking purchases
CREATE TABLE public.ticket_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create storage bucket for events
INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_sales ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Admins can manage events"
ON public.events FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active events"
ON public.events FOR SELECT
USING (is_active = true);

-- Ticket types policies
CREATE POLICY "Admins can manage ticket types"
ON public.ticket_types FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active ticket types"
ON public.ticket_types FOR SELECT
USING (is_active = true);

-- Ticket sales policies
CREATE POLICY "Admins can view all ticket sales"
ON public.ticket_sales FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own ticket sales"
ON public.ticket_sales FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ticket sales"
ON public.ticket_sales FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Storage policies for events bucket
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

CREATE POLICY "Admins can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'events' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update event images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'events' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete event images"
ON storage.objects FOR DELETE
USING (bucket_id = 'events' AND has_role(auth.uid(), 'admin'));

-- Create storage bucket for store logo
INSERT INTO storage.buckets (id, name, public) VALUES ('store-assets', 'store-assets', true);

-- Storage policies for store-assets bucket
CREATE POLICY "Anyone can view store assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

CREATE POLICY "Admins can upload store assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update store assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'store-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete store assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'store-assets' AND has_role(auth.uid(), 'admin'));