-- Fix announcements table foreign key relationship
-- This script adds the proper foreign key constraint between announcements and profiles

-- First, check if the announcements table exists and has the author_id column
DO $$ 
BEGIN
    -- Check if the announcements table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
        -- Check if author_id column exists
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'author_id') THEN
            -- Check if foreign key constraint already exists
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema = 'public' 
                AND tc.table_name = 'announcements'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'author_id'
            ) THEN
                -- Add foreign key constraint
                ALTER TABLE public.announcements 
                ADD CONSTRAINT announcements_author_id_fkey 
                FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;
                
                RAISE NOTICE 'Added foreign key constraint announcements_author_id_fkey';
            ELSE
                RAISE NOTICE 'Foreign key constraint already exists';
            END IF;
        ELSE
            RAISE NOTICE 'author_id column does not exist in announcements table';
        END IF;
    ELSE
        RAISE NOTICE 'announcements table does not exist';
    END IF;
END $$;
