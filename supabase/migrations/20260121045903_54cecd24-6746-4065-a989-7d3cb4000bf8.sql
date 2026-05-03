-- Allow master admins to view all profiles
CREATE POLICY "Master admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow master admins to manage all profiles
CREATE POLICY "Master admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));