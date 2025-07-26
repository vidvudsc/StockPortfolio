import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StockPrice } from '@/types/portfolio';

// Global state to share prices across components
let globalPrices: Record<string, StockPrice> = {};
let globalLoading = false;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const MIN_FETCH_INTERVAL = 30 * 1000; // 30 seconds minimum between fetches

// Array to store listeners
const listeners: ((prices: Record<string, StockPrice>, loading: boolean, error: string | null) => void)[] = [];

const notifyListeners = (prices: Record<string, StockPrice>, loading: boolean, error: string | null) => {
  listeners.forEach(listener => listener(prices, loading, error));
};

const fetchPricesFromAPI = async (symbols: string[]) => {
  if (symbols.length === 0) return;
  
  // Avoid too frequent API calls
  const now = Date.now();
  if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
    console.log('Skipping fetch - too soon since last request');
    return;
  }
  
  if (globalLoading) {
    console.log('Fetch already in progress, skipping');
    return;
  }

  try {
    globalLoading = true;
    lastFetchTime = now;
    notifyListeners(globalPrices, true, null);
    
    console.log('Fetching prices for symbols:', symbols);
    
    // Call our Edge Function to get stock prices
    const { data, error: functionError } = await supabase.functions.invoke('stock-prices', {
      body: { symbols: symbols.join(',') }
    });

    if (functionError) {
      throw functionError;
    }

    // Transform the response to our StockPrice format
    const newPrices: Record<string, StockPrice> = { ...globalPrices };
    
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
      
      console.log(`Successfully fetched ${data.prices.length} prices`);
    } else {
      console.warn('No prices returned from API - likely rate limited');
    }

    globalPrices = newPrices;
    notifyListeners(globalPrices, false, null);
    
  } catch (err) {
    console.error('Error fetching stock prices:', err);
    
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const error = errorMessage.includes('rate limit') ? null : 'Failed to fetch stock prices';
    notifyListeners(globalPrices, false, error);
  } finally {
    globalLoading = false;
  }
};

export const useSupabaseStockPrices = () => {
  const [prices, setPrices] = useState<Record<string, StockPrice>>(globalPrices);
  const [loading, setLoading] = useState(globalLoading);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to global state changes
  useEffect(() => {
    const listener = (newPrices: Record<string, StockPrice>, newLoading: boolean, newError: string | null) => {
      setPrices(newPrices);
      setLoading(newLoading);
      setError(newError);
    };
    
    listeners.push(listener);
    
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const fetchStockPrices = useCallback(async (symbols: string[]) => {
    // Filter out symbols we already have recent data for
    const symbolsToFetch = symbols.filter(symbol => {
      const existingPrice = globalPrices[symbol.toUpperCase()];
      if (!existingPrice) return true;
      
      const lastUpdated = new Date(existingPrice.lastUpdated).getTime();
      const now = Date.now();
      return now - lastUpdated > CACHE_DURATION;
    });
    
    if (symbolsToFetch.length > 0) {
      console.log(`Need to fetch ${symbolsToFetch.length} symbols:`, symbolsToFetch);
      await fetchPricesFromAPI(symbolsToFetch);
    } else {
      console.log('All symbols have recent cached data');
    }
  }, []);

  const getPrice = useCallback((symbol: string): StockPrice | null => {
    return prices[symbol.toUpperCase()] || null;
  }, [prices]);

  // Auto-refresh prices every 15 minutes, but only if we have symbols
  useEffect(() => {
    const interval = setInterval(() => {
      const symbols = Object.keys(globalPrices);
      if (symbols.length > 0) {
        console.log('Auto-refreshing stock prices for', symbols.length, 'symbols');
        fetchStockPrices(symbols);
      }
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [fetchStockPrices]);

  return {
    prices,
    loading,
    error,
    getPrice,
    fetchStockPrices,
  };
};