import { useState, useEffect } from 'react';
import { StockPrice } from '@/types/portfolio';

// Mock stock prices with realistic data
const mockPrices: Record<string, StockPrice> = {
  'NVDA': { symbol: 'NVDA', price: 147.32, change: 2.15, changePercent: 1.48, lastUpdated: new Date().toISOString() },
  'AAXN': { symbol: 'AAXN', price: 682.45, change: -12.30, changePercent: -1.77, lastUpdated: new Date().toISOString() },
  'MSTR': { symbol: 'MSTR', price: 389.75, change: 15.22, changePercent: 4.06, lastUpdated: new Date().toISOString() },
  'CSPX': { symbol: 'CSPX', price: 628.91, change: 3.45, changePercent: 0.55, lastUpdated: new Date().toISOString() },
  'COST': { symbol: 'COST', price: 952.18, change: -8.92, changePercent: -0.93, lastUpdated: new Date().toISOString() },
  'EQQQ': { symbol: 'EQQQ', price: 1189.35, change: 18.75, changePercent: 1.60, lastUpdated: new Date().toISOString() },
  'NCC': { symbol: 'NCC', price: 15.84, change: 0.32, changePercent: 2.17, lastUpdated: new Date().toISOString() },
  'MJPY': { symbol: 'MJPY', price: 18.92, change: 0.15, changePercent: 0.80, lastUpdated: new Date().toISOString() },
  'PLTR': { symbol: 'PLTR', price: 84.67, change: 2.89, changePercent: 3.53, lastUpdated: new Date().toISOString() },
  'TSLA': { symbol: 'TSLA', price: 385.29, change: -15.84, changePercent: -3.95, lastUpdated: new Date().toISOString() },
  'IAU': { symbol: 'IAU', price: 245.67, change: 1.23, changePercent: 0.50, lastUpdated: new Date().toISOString() },
  'META': { symbol: 'META', price: 642.88, change: 12.45, changePercent: 1.97, lastUpdated: new Date().toISOString() },
  'GOOGL': { symbol: 'GOOGL', price: 195.43, change: -2.87, changePercent: -1.45, lastUpdated: new Date().toISOString() },
  'HOOD': { symbol: 'HOOD', price: 58.92, change: 1.15, changePercent: 1.99, lastUpdated: new Date().toISOString() },
  'AMZN': { symbol: 'AMZN', price: 172.84, change: 3.92, changePercent: 2.32, lastUpdated: new Date().toISOString() },
  'CRWD': { symbol: 'CRWD', price: 318.75, change: -8.45, changePercent: -2.58, lastUpdated: new Date().toISOString() },
  'SNOW': { symbol: 'SNOW', price: 142.96, change: 5.32, changePercent: 3.87, lastUpdated: new Date().toISOString() },
  'MSFT': { symbol: 'MSFT', price: 438.91, change: 8.15, changePercent: 1.89, lastUpdated: new Date().toISOString() },
  'QQQ': { symbol: 'QQQ', price: 1098.45, change: 15.30, changePercent: 1.41, lastUpdated: new Date().toISOString() },
  'HSAI': { symbol: 'HSAI', price: 17.23, change: 0.84, changePercent: 5.13, lastUpdated: new Date().toISOString() },
  'CRCL': { symbol: 'CRCL', price: 203.45, change: 7.92, changePercent: 4.05, lastUpdated: new Date().toISOString() },
};

export const useStockPrices = () => {
  const [prices, setPrices] = useState<Record<string, StockPrice>>(mockPrices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(currentPrices => {
        const updatedPrices = { ...currentPrices };
        
        Object.keys(updatedPrices).forEach(symbol => {
          // Simulate small price movements
          const volatility = Math.random() * 0.02 - 0.01; // -1% to +1%
          const currentPrice = updatedPrices[symbol].price;
          const newPrice = currentPrice * (1 + volatility);
          const change = newPrice - currentPrice;
          const changePercent = (change / currentPrice) * 100;
          
          updatedPrices[symbol] = {
            ...updatedPrices[symbol],
            price: Number(newPrice.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            lastUpdated: new Date().toISOString(),
          };
        });
        
        return updatedPrices;
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getPrice = (symbol: string): StockPrice | null => {
    return prices[symbol] || null;
  };

  return {
    prices,
    loading,
    error,
    getPrice,
  };
};