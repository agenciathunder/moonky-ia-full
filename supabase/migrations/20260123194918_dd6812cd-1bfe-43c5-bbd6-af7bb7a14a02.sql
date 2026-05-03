-- Add address fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS number text,
ADD COLUMN IF NOT EXISTS neighborhood text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text;