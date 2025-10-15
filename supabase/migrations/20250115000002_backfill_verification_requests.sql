-- Backfill verification requests for existing users with pending verification status
-- This migration handles users who were created before the trigger was properly set up

-- Insert verification requests for users who have pending verification status and ID images
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
FROM public.profiles 
WHERE verification_status = 'pending'
  AND id_front_image_url IS NOT NULL 
  AND id_back_image_url IS NOT NULL
  AND id NOT IN (
    SELECT user_id FROM public.user_verification_requests
  );

-- Log how many requests were backfilled
DO $$
DECLARE
    backfilled_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backfilled_count 
    FROM public.user_verification_requests 
    WHERE created_at >= NOW() - INTERVAL '1 minute';
    
    RAISE NOTICE 'Backfilled % verification requests', backfilled_count;
END $$;
