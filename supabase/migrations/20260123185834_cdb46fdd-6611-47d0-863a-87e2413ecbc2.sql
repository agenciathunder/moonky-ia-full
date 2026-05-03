-- Add PIX payment details to withdrawal requests
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS pix_key_type TEXT,
ADD COLUMN IF NOT EXISTS document TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT;