-- Create trades table to replace localStorage
CREATE TABLE public.trades (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  symbol TEXT NOT NULL,
  asset TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity DECIMAL(10,4) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  true_total DECIMAL(10,2) NOT NULL,
  buyer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock prices cache table
CREATE TABLE public.stock_prices (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  price_usd DECIMAL(10,4) NOT NULL,
  price_eur DECIMAL(10,4) NOT NULL,
  change_amount DECIMAL(10,4),
  change_percent DECIMAL(6,2),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exchange rates table
CREATE TABLE public.exchange_rates (
  id SERIAL PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency)
);

-- Enable RLS on all tables
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a family app with password protection)
CREATE POLICY "Allow all operations on trades" ON public.trades FOR ALL USING (true);
CREATE POLICY "Allow all operations on stock_prices" ON public.stock_prices FOR ALL USING (true);
CREATE POLICY "Allow all operations on exchange_rates" ON public.exchange_rates FOR ALL USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial exchange rate for USD to EUR
INSERT INTO public.exchange_rates (from_currency, to_currency, rate) 
VALUES ('USD', 'EUR', 0.92) 
ON CONFLICT (from_currency, to_currency) 
DO UPDATE SET rate = EXCLUDED.rate, last_updated = now();