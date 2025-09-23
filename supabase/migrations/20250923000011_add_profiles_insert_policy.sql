-- Allow authenticated users to create their own profile row

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if present to avoid duplicates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert their own profile'
  ) THEN
    DROP POLICY "Users can insert their own profile" ON public.profiles;
  END IF;
END $$;

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


