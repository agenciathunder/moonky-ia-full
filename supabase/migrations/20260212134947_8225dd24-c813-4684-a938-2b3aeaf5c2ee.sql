-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view active establishments" ON public.establishments;

-- Create new policy that allows viewing all establishments (needed for suspended/cancelled screens)
CREATE POLICY "Anyone can view establishments by slug" 
ON public.establishments 
FOR SELECT 
USING (true);