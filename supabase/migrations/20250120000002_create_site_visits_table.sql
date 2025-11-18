-- Create site_visits table for tracking unique website visitors
CREATE TABLE IF NOT EXISTS public.site_visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_id TEXT NOT NULL UNIQUE,
    first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    visit_count INTEGER DEFAULT 1 NOT NULL,
    ip_hash TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view visit count" ON public.site_visits;
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
DROP POLICY IF EXISTS "Service role can update visits" ON public.site_visits;

-- Allow anyone to view the visit count (for public display)
CREATE POLICY "Anyone can view visit count"
    ON public.site_visits FOR SELECT
    USING (true);

-- Allow anyone to insert new visits (for tracking unauthenticated visitors)
CREATE POLICY "Anyone can insert visits"
    ON public.site_visits FOR INSERT
    WITH CHECK (true);

-- Allow service role to update visits (for backend API)
CREATE POLICY "Service role can update visits"
    ON public.site_visits FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor_id ON public.site_visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_first_visit_at ON public.site_visits(first_visit_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_last_visit_at ON public.site_visits(last_visit_at DESC);

-- Create function to get total unique visitor count
CREATE OR REPLACE FUNCTION get_unique_visitor_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*)::INTEGER FROM public.site_visits);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.site_visits TO anon, authenticated;
GRANT INSERT ON public.site_visits TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_unique_visitor_count() TO anon, authenticated;

