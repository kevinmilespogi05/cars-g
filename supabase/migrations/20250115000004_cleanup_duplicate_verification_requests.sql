-- Clean up duplicate verification requests
-- This migration removes duplicate verification requests and keeps only the most recent one per user

-- First, identify and remove duplicate verification requests
-- Keep only the most recent verification request per user
WITH ranked_requests AS (
    SELECT 
        id,
        user_id,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM public.user_verification_requests
)
DELETE FROM public.user_verification_requests 
WHERE id IN (
    SELECT id 
    FROM ranked_requests 
    WHERE rn > 1
);

-- Log how many duplicates were removed
DO $$
DECLARE
    removed_count INTEGER;
BEGIN
    -- This will be 0 since we just deleted them, but we can check the current count
    SELECT COUNT(*) INTO removed_count 
    FROM public.user_verification_requests;
    
    RAISE NOTICE 'Verification requests after cleanup: %', removed_count;
END $$;

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.user_verification_requests 
ADD CONSTRAINT unique_user_verification_request 
UNIQUE (user_id);

-- Update the trigger to be more robust against duplicates
CREATE OR REPLACE FUNCTION create_verification_request()
RETURNS TRIGGER AS $$
DECLARE
    request_id UUID;
BEGIN
    -- Only create verification request if both ID images are provided and status is pending
    -- AND no existing verification request exists for this user
    IF NEW.verification_status = 'pending' 
       AND NEW.id_front_image_url IS NOT NULL 
       AND NEW.id_back_image_url IS NOT NULL 
       AND (OLD IS NULL OR OLD.verification_status != 'pending' OR OLD.id_front_image_url IS NULL OR OLD.id_back_image_url IS NULL) THEN
        
        -- Use INSERT ... ON CONFLICT to prevent duplicates
        INSERT INTO public.user_verification_requests (
            user_id,
            id_front_image_url,
            id_back_image_url,
            status
        ) VALUES (
            NEW.id,
            NEW.id_front_image_url,
            NEW.id_back_image_url,
            'pending'
        ) 
        ON CONFLICT (user_id) 
        DO UPDATE SET
            id_front_image_url = EXCLUDED.id_front_image_url,
            id_back_image_url = EXCLUDED.id_back_image_url,
            status = CASE 
                WHEN user_verification_requests.status = 'pending' THEN 'pending'
                ELSE user_verification_requests.status
            END,
            updated_at = NOW()
        RETURNING id INTO request_id;
        
        -- Log that a new request was created or updated
        RAISE NOTICE 'Verification request created/updated with ID: %', request_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
