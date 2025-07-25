import Header from '@/components/Header';
import TradesList from '@/components/TradesList';
import { tradesData } from '@/data/trades';

const Trades = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">All Family Trades</h1>
          <p className="text-muted-foreground">Complete history of all family investment trades</p>
        </div>
        <TradesList trades={tradesData} />
      </div>
    </div>
  );
};

export default Trades;