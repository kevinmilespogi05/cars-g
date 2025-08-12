-- Create admin user with admin role
-- This migration creates an admin account for database management

-- First, create the auth user (you'll need to set the password manually)
-- Note: You'll need to create the auth user through Supabase Auth UI or API first
-- Then update the profile with admin role

-- Create a function to safely create admin user
CREATE OR REPLACE FUNCTION public.create_admin_user(
    admin_email TEXT,
    admin_username TEXT,
    admin_full_name TEXT DEFAULT 'Admin User'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if user already exists in auth.users
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = admin_email;
    
    IF admin_user_id IS NULL THEN
        RETURN 'User not found in auth.users. Please create the user through Supabase Auth first.';
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
        
        RETURN 'Admin user profile updated successfully. User ID: ' || admin_user_id;
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
        
        RETURN 'Admin user created successfully. User ID: ' || admin_user_id;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_admin_user(TEXT, TEXT, TEXT) TO authenticated;

-- Create a default admin user (you can modify these values)
-- IMPORTANT: You must first create the auth user through Supabase Auth UI
-- Then run: SELECT public.create_admin_user('admin@example.com', 'admin', 'Admin User'); 