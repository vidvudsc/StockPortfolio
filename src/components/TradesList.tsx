import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trade } from '@/types/portfolio';
import { useStockPrices } from '@/hooks/useStockPrices';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';

interface TradesListProps {
  trades: Trade[];
  title?: string;
}

const TradesList = ({ trades, title = "All Trades" }: TradesListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState<string>('all');
  const { getPrice } = useStockPrices();

  const uniqueBuyers = Array.from(new Set(trades.map(trade => trade.buyer)));

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trade.asset.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuyer = selectedBuyer === 'all' || trade.buyer === selectedBuyer;
    return matchesSearch && matchesBuyer;
  });

  const sortedTrades = [...filteredTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <Badge variant="secondary">{filteredTrades.length} trades</Badge>
        </CardTitle>
        <div className="flex space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by symbol or asset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedBuyer} onValueChange={setSelectedBuyer}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by buyer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buyers</SelectItem>
              {uniqueBuyers.map(buyer => (
                <SelectItem key={buyer} value={buyer}>{buyer}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedTrades.map((trade) => {
            const currentPrice = getPrice(trade.symbol);
            const currentValue = currentPrice ? trade.quantity * currentPrice.price : trade.total;
            const gainLoss = currentValue - trade.trueTotal;
            const gainLossPercent = ((currentValue - trade.trueTotal) / trade.trueTotal) * 100;
            const isPositive = gainLoss >= 0;

            return (
              <div key={trade.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="font-medium">{trade.symbol}</h3>
                      <p className="text-sm text-muted-foreground">{trade.asset}</p>
                    </div>
                    <Badge variant="outline">{trade.buyer}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">€{currentValue.toFixed(2)}</p>
                    <div className="flex items-center space-x-1">
                      {isPositive ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                      <span className={`text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
                        {isPositive ? '+' : ''}€{gainLoss.toFixed(2)} ({gainLossPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(trade.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-medium">{trade.quantity.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Buy Price</p>
                    <p className="font-medium">€{trade.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Price</p>
                    <p className="font-medium">
                      €{currentPrice?.price.toFixed(2) || 'N/A'}
                      {currentPrice && (
                        <span className={`ml-1 text-xs ${currentPrice.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ({currentPrice.changePercent >= 0 ? '+' : ''}{currentPrice.changePercent.toFixed(2)}%)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TradesList;