import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trade } from '@/types/portfolio';
import { toast } from 'sonner';

// Database trade type (matches current database schema)
interface DatabaseTrade {
  id: number;
  date: string;
  symbol: string;
  asset: string;
  action: string;
  quantity: number;
  price: number;
  total: number;
  buyer: string;
  created_at?: string;
  updated_at?: string;
}

// Transform database trade to Trade type
const transformDbToTrade = (dbTrade: DatabaseTrade): Trade => ({
  id: dbTrade.id,
  date: dbTrade.date,
  symbol: dbTrade.symbol,
  asset: dbTrade.asset,
  action: dbTrade.action as 'Buy' | 'Sell',
  quantity: dbTrade.quantity,
  price: dbTrade.price,
  total: dbTrade.total,
  buyer: dbTrade.buyer,
});

// Transform Trade to database format
const transformTradeToDb = (trade: Omit<Trade, 'id'>): Omit<DatabaseTrade, 'id' | 'created_at' | 'updated_at'> => ({
  date: trade.date,
  symbol: trade.symbol,
  asset: trade.asset,
  action: trade.action,
  quantity: trade.quantity,
  price: trade.price,
  total: trade.total,
  buyer: trade.buyer,
});

export const useSupabaseTrades = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrades = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('trades')
        .select('*')
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      const transformedTrades = (data || []).map(transformDbToTrade);
      setTrades(transformedTrades);
      setError(null);
    } catch (err) {
      console.error('Error loading trades:', err);
      setError('Failed to load trades from database');
      toast.error('Failed to load trades from database');
    } finally {
      setLoading(false);
    }
  };

  const addTrade = async (newTrade: Omit<Trade, 'id'>) => {
    try {
      const dbTrade = transformTradeToDb(newTrade);
      const { data, error: insertError } = await supabase
        .from('trades')
        .insert([dbTrade])
        .select()
        .single();

      if (insertError) throw insertError;

      const transformedTrade = transformDbToTrade(data);
      setTrades(prev => [transformedTrade, ...prev]);
      toast.success('Trade added successfully');
      return transformedTrade;
    } catch (err) {
      console.error('Error adding trade:', err);
      toast.error('Failed to add trade');
      throw err;
    }
  };

  const updateTrade = async (id: number, updatedTrade: Partial<Trade>) => {
    try {
      const dbUpdates: any = {};
      if (updatedTrade.date !== undefined) dbUpdates.date = updatedTrade.date;
      if (updatedTrade.symbol !== undefined) dbUpdates.symbol = updatedTrade.symbol;
      if (updatedTrade.asset !== undefined) dbUpdates.asset = updatedTrade.asset;
      if (updatedTrade.action !== undefined) dbUpdates.action = updatedTrade.action;
      if (updatedTrade.quantity !== undefined) dbUpdates.quantity = updatedTrade.quantity;
      if (updatedTrade.price !== undefined) dbUpdates.price = updatedTrade.price;
      if (updatedTrade.total !== undefined) dbUpdates.total = updatedTrade.total;
      if (updatedTrade.buyer !== undefined) dbUpdates.buyer = updatedTrade.buyer;

      const { data, error: updateError } = await supabase
        .from('trades')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const transformedTrade = transformDbToTrade(data);
      setTrades(prev => prev.map(trade => trade.id === id ? transformedTrade : trade));
      toast.success('Trade updated successfully');
    } catch (err) {
      console.error('Error updating trade:', err);
      toast.error('Failed to update trade');
      throw err;
    }
  };

  const deleteTrade = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('trades')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTrades(prev => prev.filter(trade => trade.id !== id));
      toast.success('Trade deleted successfully');
    } catch (err) {
      console.error('Error deleting trade:', err);
      toast.error('Failed to delete trade');
      throw err;
    }
  };

  const getTradesByBuyer = (buyer: string) => {
    return trades.filter(trade => trade.buyer.toLowerCase() === buyer.toLowerCase());
  };

  useEffect(() => {
    loadTrades();
  }, []);

  return {
    trades,
    loading,
    error,
    addTrade,
    updateTrade,
    deleteTrade,
    getTradesByBuyer,
  };
};