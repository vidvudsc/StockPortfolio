-- Remove overly permissive RLS policies that allow anonymous access
DROP POLICY IF EXISTS "Allow all operations on trades" ON public.trades;
DROP POLICY IF EXISTS "Allow all operations on stock_prices" ON public.stock_prices;
DROP POLICY IF EXISTS "Allow all operations on exchange_rates" ON public.exchange_rates;

-- Create secure RLS policies for trades table (requires authentication)
CREATE POLICY "Authenticated users can view all trades" 
ON public.trades 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert trades" 
ON public.trades 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update trades" 
ON public.trades 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete trades" 
ON public.trades 
FOR DELETE 
TO authenticated 
USING (true);

-- Create secure RLS policies for stock_prices table (read-only for authenticated users)
CREATE POLICY "Authenticated users can view stock prices" 
ON public.stock_prices 
FOR SELECT 
TO authenticated 
USING (true);

-- Create secure RLS policies for exchange_rates table (read-only for authenticated users)
CREATE POLICY "Authenticated users can view exchange rates" 
ON public.exchange_rates 
FOR SELECT 
TO authenticated 
USING (true);