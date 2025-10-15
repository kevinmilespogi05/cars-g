-- Update the verification request trigger to create requests for all pending users
CREATE OR REPLACE FUNCTION create_verification_request()
RETURNS TRIGGER AS $$
DECLARE
    request_id UUID;
    existing_request_count INTEGER;
BEGIN
    -- Only create verification request if both ID images are provided and status is pending
    -- AND no existing verification request exists for this user
    IF NEW.verification_status = 'pending' 
       AND NEW.id_front_image_url IS NOT NULL 
       AND NEW.id_back_image_url IS NOT NULL 
       AND (OLD IS NULL OR OLD.verification_status != 'pending' OR OLD.id_front_image_url IS NULL OR OLD.id_back_image_url IS NULL) THEN
        
        -- Check if verification request already exists for this user
        SELECT COUNT(*) INTO existing_request_count
        FROM public.user_verification_requests
        WHERE user_id = NEW.id;
        
        -- Only create if no existing request
        IF existing_request_count = 0 THEN
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
            ) RETURNING id INTO request_id;
            
            -- Log that a new request was created
            RAISE NOTICE 'New verification request created with ID: %', request_id;
        ELSE
            RAISE NOTICE 'Verification request already exists for user: %', NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_verification_request ON public.profiles;
CREATE TRIGGER trigger_create_verification_request
    AFTER INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_verification_request();

-- Backfill verification requests for existing pending users
INSERT INTO public.user_verification_requests (
    user_id,
    id_front_image_url,
    id_back_image_url,
    status,
    created_at
)
SELECT
    id,
    id_front_image_url,
    id_back_image_url,
    'pending',
    created_at
FROM public.profiles p
WHERE verification_status = 'pending'
AND NOT EXISTS (
    SELECT 1 FROM public.user_verification_requests vr
    WHERE vr.user_id = p.id
);