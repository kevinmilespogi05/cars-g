-- Add foreign key relationship between user_stats and profiles
ALTER TABLE public.user_stats
ADD CONSTRAINT fk_user_stats_profile
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id); 