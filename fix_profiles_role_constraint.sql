-- Allow 'patrol' role in profiles.role check constraint
-- Run this in your Supabase SQL Editor

-- 1) Drop the existing check constraint (name provided by error: profiles_role_check)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2) Recreate the check constraint including the new role 'patrol'
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'patrol'));

-- 3) Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role';

-- Optional: See distinct roles currently present
SELECT DISTINCT role FROM public.profiles ORDER BY role;


