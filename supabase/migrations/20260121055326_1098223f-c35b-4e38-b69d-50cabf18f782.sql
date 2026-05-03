-- Add new columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS map_image_url text,
ADD COLUMN IF NOT EXISTS youtube_url text;

-- Fix RLS policies for events bucket storage
-- First, let's ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Members can manage event images" ON storage.objects;

-- Create proper storage policies for events bucket
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'events' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update event images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'events' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete event images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'events' 
  AND auth.role() = 'authenticated'
);