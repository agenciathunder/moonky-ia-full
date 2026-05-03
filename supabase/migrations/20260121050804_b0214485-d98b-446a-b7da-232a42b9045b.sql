-- Add original_email column to profiles for display purposes
-- The email column will contain the isolated email (with slug), original_email stores what user typed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS original_email text;