-- SQL commands to update Supabase storage URLs to Cloudinary URLs
-- Run these commands in your Supabase SQL editor

-- 1. Update profiles table - Replace Supabase URLs with Cloudinary URLs
-- You'll need to replace the Cloudinary URLs with your actual uploaded images

-- For the user with email 'redniwesley1@gmail.com' (kevin12):
UPDATE public.profiles 
SET 
  id_front_image_url = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/cars-g/id-verification/id-front-1760508796264.jpeg',
  id_back_image_url = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/cars-g/id-verification/id-back-1760508796264.jpeg'
WHERE email = 'redniwesley1@gmail.com';

-- 2. Update user_verification_requests table - Replace Supabase URLs with Cloudinary URLs
-- For verification request ID: dcc9c8fb-979a-48a9-a999-bc7bc9e584b9
UPDATE public.user_verification_requests 
SET 
  id_front_image_url = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/cars-g/id-verification/id-front-1760508796264.jpeg',
  id_back_image_url = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/cars-g/id-verification/id-back-1760508796264.jpeg'
WHERE id = 'dcc9c8fb-979a-48a9-a999-bc7bc9e584b9';

-- For verification request ID: 395aaa80-ae49-4480-8ca5-72fda56654a7
UPDATE public.user_verification_requests 
SET 
  id_front_image_url = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/cars-g/id-verification/id-front-1760508796264.jpeg',
  id_back_image_url = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/cars-g/id-verification/id-back-1760508796264.jpeg'
WHERE id = '395aaa80-ae49-4480-8ca5-72fda56654a7';

-- 3. Alternative: If you want to clear all old Supabase URLs and let users re-upload
-- (Uncomment these if you prefer to clear the old URLs)

-- UPDATE public.profiles 
-- SET id_front_image_url = NULL, id_back_image_url = NULL
-- WHERE id_front_image_url LIKE '%supabase.co%' OR id_back_image_url LIKE '%supabase.co%';

-- UPDATE public.user_verification_requests 
-- SET id_front_image_url = NULL, id_back_image_url = NULL
-- WHERE id_front_image_url LIKE '%supabase.co%' OR id_back_image_url LIKE '%supabase.co%';

-- 4. Verify the updates
SELECT id, username, email, id_front_image_url, id_back_image_url 
FROM public.profiles 
WHERE id_front_image_url IS NOT NULL OR id_back_image_url IS NOT NULL;

SELECT id, user_id, id_front_image_url, id_back_image_url 
FROM public.user_verification_requests 
WHERE id_front_image_url IS NOT NULL OR id_back_image_url IS NOT NULL;
