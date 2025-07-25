import { useState, useEffect } from 'react';
import { Trade } from '@/types/portfolio';
import { tradesData as initialTrades } from '@/data/trades';

export const useTrades = () => {
  const [trades, setTrades] = useState<Trade[]>(() => {
    // Try to load from localStorage first
    const savedTrades = localStorage.getItem('family-portfolio-trades');
    if (savedTrades) {
      try {
        return JSON.parse(savedTrades);
      } catch (error) {
        console.error('Error parsing saved trades:', error);
        return initialTrades;
      }
    }
    return initialTrades;
  });

  // Save to localStorage whenever trades change
  useEffect(() => {
    localStorage.setItem('family-portfolio-trades', JSON.stringify(trades));
  }, [trades]);

  const addTrade = (newTrade: Omit<Trade, 'id'>) => {
    const maxId = Math.max(...trades.map(t => t.id), 0);
    const trade: Trade = {
      ...newTrade,
      id: maxId + 1,
    };
    setTrades(prev => [...prev, trade]);
    return trade;
  };

  const updateTrade = (id: number, updatedTrade: Partial<Trade>) => {
    setTrades(prev => prev.map(trade => 
      trade.id === id ? { ...trade, ...updatedTrade } : trade
    ));
  };

  const deleteTrade = (id: number) => {
    setTrades(prev => prev.filter(trade => trade.id !== id));
  };

  const getTradesByBuyer = (buyer: string) => {
    return trades.filter(trade => trade.buyer.toLowerCase() === buyer.toLowerCase());
  };

  return {
    trades,
    addTrade,
    updateTrade,
    deleteTrade,
    getTradesByBuyer,
  };
};