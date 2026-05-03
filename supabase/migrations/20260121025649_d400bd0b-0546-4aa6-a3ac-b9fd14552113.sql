-- Drop existing policies first to recreate them properly
DROP POLICY IF EXISTS "Anyone can view establishment logos" ON storage.objects;
DROP POLICY IF EXISTS "Establishment members can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Establishment members can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Establishment members can delete logos" ON storage.objects;

-- Create storage policies for establishment-logos bucket
-- Allow anyone to view establishment logos
CREATE POLICY "Anyone can view establishment logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'establishment-logos');

-- Allow authenticated users to upload logos (establishment members)
CREATE POLICY "Authenticated users can upload establishment logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'establishment-logos' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to update logos
CREATE POLICY "Authenticated users can update establishment logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'establishment-logos' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete establishment logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'establishment-logos' AND
  auth.uid() IS NOT NULL
);