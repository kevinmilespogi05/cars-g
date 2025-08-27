-- Create Patrol User Script
-- Run this in your Supabase SQL Editor

-- Step 1: First, create the auth user via Supabase Auth dashboard
-- Authentication > Users > Add User
-- Example:
--   Email: patrol.demo@example.com
--   Password: choose a secure password

-- Step 2: After creating the auth user, set the email below
DO $$
DECLARE
    patrol_user_id UUID;
    patrol_email TEXT := 'patrol.demo@example.com'; -- CHANGE THIS TO THE PATROL EMAIL YOU CREATED
    patrol_username TEXT := 'patrol demo';
    patrol_full_name TEXT := 'Patrol Demo';
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO patrol_user_id 
    FROM auth.users 
    WHERE email = patrol_email;
    
    IF patrol_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in auth.users. Please create the user through Supabase Auth first.', patrol_email;
    END IF;
    
    -- If profile exists, update role to patrol; else create it
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = patrol_user_id) THEN
        UPDATE public.profiles 
        SET 
            role = 'patrol',
            username = patrol_username,
            full_name = patrol_full_name,
            updated_at = timezone('utc'::text, now())
        WHERE id = patrol_user_id;
        RAISE NOTICE 'Patrol user profile updated successfully. User ID: %', patrol_user_id;
    ELSE
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
            patrol_user_id,
            patrol_username,
            patrol_email,
            patrol_full_name,
            'patrol',
            0,
            false,
            timezone('utc'::text, now()),
            timezone('utc'::text, now())
        );
        RAISE NOTICE 'Patrol user created successfully. User ID: %', patrol_user_id;
    END IF;
END $$;

-- Verify the patrol user
SELECT id, username, email, full_name, role, created_at
FROM public.profiles
WHERE role = 'patrol'
ORDER BY created_at DESC;


