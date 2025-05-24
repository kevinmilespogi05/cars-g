-- Drop existing insert policy
DROP POLICY IF EXISTS "Authenticated users can insert points history" ON public.points_history;

-- Create new policy that allows admins to insert points for any user
CREATE POLICY "Admins can insert points history"
    ON public.points_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Create policy that allows users to insert their own points history
CREATE POLICY "Users can insert their own points history"
    ON public.points_history FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
    ); 