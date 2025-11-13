-- Migration: Add 'superadmin' to role check constraint
-- Description: Updates the profiles table role check constraint to include 'superadmin'

-- Drop the existing check constraint on profiles.role if it exists
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add a new check constraint that includes 'superadmin'
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('user', 'admin', 'patrol', 'superadmin'));

-- ============================================================================
-- Migration completed: Superadmin role added to role check constraint
-- ============================================================================
