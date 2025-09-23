-- Add first_name and last_name to profiles, and backfill from full_name

-- Add columns if not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
    END IF;
END $$;

-- Backfill from full_name when available (simple split on first space)
UPDATE public.profiles
SET 
    first_name = COALESCE(first_name, NULLIF(split_part(full_name, ' ', 1), '')),
    last_name = COALESCE(last_name, NULLIF(
        CASE 
            WHEN full_name IS NULL THEN NULL
            WHEN position(' ' in full_name) = 0 THEN NULL
            ELSE substr(full_name, position(' ' in full_name) + 1)
        END, ''
    ))
WHERE full_name IS NOT NULL;

-- Optionally maintain full_name as a convenience field if both are present
UPDATE public.profiles
SET full_name = trim(
    CONCAT_WS(' ', COALESCE(first_name, ''), COALESCE(last_name, ''))
)
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;


