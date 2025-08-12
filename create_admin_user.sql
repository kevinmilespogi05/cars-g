-- Create Admin User Script
-- Run this in your Supabase SQL Editor

-- Step 1: First, you need to create the auth user through Supabase Auth UI
-- Go to Authentication > Users in your Supabase dashboard
-- Click "Add User" and create a user with:
-- Email: admin@yourdomain.com (or your preferred email)
-- Password: (set a secure password)

-- Step 2: After creating the auth user, replace 'admin@yourdomain.com' with the actual email
-- and run this script to create the admin profile

-- Create admin user profile
-- Replace 'admin@yourdomain.com' with the email you used to create the auth user
DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'admin@yourdomain.com'; -- CHANGE THIS TO YOUR ADMIN EMAIL
    admin_username TEXT := 'admin';
    admin_full_name TEXT := 'Admin User';
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = admin_email;
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in auth.users. Please create the user through Supabase Auth first.', admin_email;
    END IF;
    
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = admin_user_id) THEN
        -- Update existing profile to admin role
        UPDATE public.profiles 
        SET 
            role = 'admin',
            username = admin_username,
            full_name = admin_full_name,
            updated_at = timezone('utc'::text, now())
        WHERE id = admin_user_id;
        
        RAISE NOTICE 'Admin user profile updated successfully. User ID: %', admin_user_id;
    ELSE
        -- Create new admin profile
        INSERT INTO public.profiles (
            id,
            username,
            email,
            full_name,
            role,
            points,
            is_banned,
            created_at,
            updated_at
        ) VALUES (
            admin_user_id,
            admin_username,
            admin_email,
            admin_full_name,
            'admin',
            0,
            false,
            timezone('utc'::text, now()),
            timezone('utc'::text, now())
        );
        
        RAISE NOTICE 'Admin user created successfully. User ID: %', admin_user_id;
    END IF;
END $$;

-- Verify the admin user was created
SELECT 
    id,
    username,
    email,
    full_name,
    role,
    points,
    is_banned,
    created_at
FROM public.profiles 
WHERE role = 'admin'
ORDER BY created_at DESC; 