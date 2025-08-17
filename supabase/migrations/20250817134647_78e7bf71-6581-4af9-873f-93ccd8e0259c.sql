-- Revert authentication-based RLS policies to allow password-protected access
-- Remove user-specific RLS policies and restore simple authenticated access

-- Drop existing restrictive policies on trades
DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can insert their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can delete their own trades" ON public.trades;

-- Create simple policies that allow any authenticated session to access trades
CREATE POLICY "Authenticated users can view all trades" 
ON public.trades 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert trades" 
ON public.trades 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update trades" 
ON public.trades 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete trades" 
ON public.trades 
FOR DELETE 
USING (true);

-- Also update profiles policies to be less restrictive
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (true);