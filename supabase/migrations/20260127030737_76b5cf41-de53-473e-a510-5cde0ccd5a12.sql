-- Allow customers to upload/update/delete their own profile avatars in store-assets bucket
-- The path must follow: avatars/<user_id>/<filename>

CREATE POLICY "Users can upload own avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can update own avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete own avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);