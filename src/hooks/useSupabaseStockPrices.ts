import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StockPrice } from '@/types/portfolio';
import { toast } from 'sonner';

export const useSupabaseStockPrices = () => {
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStockPrices = async (symbols: string[]) => {
    if (symbols.length === 0) return;

    try {
      setLoading(true);
      
      // Call our Edge Function to get stock prices
      const { data, error: functionError } = await supabase.functions.invoke('stock-prices', {
        body: { symbols: symbols.join(',') }
      });

      if (functionError) {
        throw functionError;
      }

      // Transform the response to our StockPrice format
      const newPrices: Record<string, StockPrice> = {};
      
      if (data.prices && Array.isArray(data.prices)) {
        data.prices.forEach((priceData: any) => {
          newPrices[priceData.symbol] = {
            symbol: priceData.symbol,
            price: priceData.price,
            change: priceData.change,
            changePercent: priceData.changePercent,
            lastUpdated: priceData.lastUpdated
          };
        });
      }

      setPrices(prev => ({ ...prev, ...newPrices }));
      setError(null);
    } catch (err) {
      console.error('Error fetching stock prices:', err);
      setError('Failed to fetch stock prices');
      toast.error('Failed to fetch current stock prices');
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (symbol: string): StockPrice | null => {
    return prices[symbol.toUpperCase()] || null;
  };

  // Auto-refresh prices every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const symbols = Object.keys(prices);
      if (symbols.length > 0) {
        fetchStockPrices(symbols);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [prices]);

  return {
    prices,
    loading,
    error,
    getPrice,
    fetchStockPrices,
  };
};