-- Make Current User Admin
-- Run this in your Supabase SQL Editor

-- Option 1: Make a specific user admin by email
-- Replace 'your-email@example.com' with your actual email
UPDATE public.profiles 
SET role = 'admin', updated_at = timezone('utc'::text, now())
WHERE email = 'your-email@example.com';

-- Option 2: Make the most recent user admin (if you just created your account)
UPDATE public.profiles 
SET role = 'admin', updated_at = timezone('utc'::text, now())
WHERE id = (
    SELECT id FROM public.profiles 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- Option 3: Make all users admin (temporary for testing)
-- WARNING: Only use this for development/testing
-- UPDATE public.profiles SET role = 'admin';

-- Verify the change
SELECT id, username, email, role, created_at 
FROM public.profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;
