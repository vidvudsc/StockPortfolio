-- Remove unnecessary columns from trades table
ALTER TABLE public.trades DROP COLUMN IF EXISTS true_total;
ALTER TABLE public.trades DROP COLUMN IF EXISTS currency;

-- Update exchange_rates table to be more flexible and accurate
-- Add more currency pairs and better tracking
ALTER TABLE public.exchange_rates 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'api',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for better performance on exchange rates lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies 
ON public.exchange_rates(from_currency, to_currency);

-- Create index for better performance on exchange rates by date
CREATE INDEX IF NOT EXISTS idx_exchange_rates_updated 
ON public.exchange_rates(last_updated DESC);