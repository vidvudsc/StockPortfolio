import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StockHeatMapProps {
  data: {
    symbol: string;
    asset: string;
    gainLossPercent: number;
    currentValue: number;
  }[];
}

const StockHeatMap = ({ data }: StockHeatMapProps) => {
  const getHeatMapColor = (gainLossPercent: number) => {
    if (gainLossPercent >= 20) return 'bg-success/80 text-success-foreground';
    if (gainLossPercent >= 10) return 'bg-success/60 text-success-foreground';
    if (gainLossPercent >= 5) return 'bg-success/40 text-success-foreground';
    if (gainLossPercent > 0) return 'bg-success/20 text-success-foreground';
    if (gainLossPercent === 0) return 'bg-muted text-muted-foreground';
    if (gainLossPercent >= -5) return 'bg-destructive/20 text-destructive-foreground';
    if (gainLossPercent >= -10) return 'bg-destructive/40 text-destructive-foreground';
    if (gainLossPercent >= -20) return 'bg-destructive/60 text-destructive-foreground';
    return 'bg-destructive/80 text-destructive-foreground';
  };

  const getIntensity = (gainLossPercent: number) => {
    const absPercent = Math.abs(gainLossPercent);
    if (absPercent >= 20) return 1;
    if (absPercent >= 10) return 0.8;
    if (absPercent >= 5) return 0.6;
    if (absPercent > 0) return 0.4;
    return 0.2;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Performance Heat Map</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No stock data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Performance Heat Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {data.map((stock) => {
            const isPositive = stock.gainLossPercent >= 0;
            return (
              <div
                key={stock.symbol}
                className={`${getHeatMapColor(stock.gainLossPercent)} rounded-lg p-3 transition-all hover:scale-105 cursor-pointer border`}
                style={{
                  opacity: Math.max(0.3, getIntensity(stock.gainLossPercent))
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm truncate">{stock.symbol}</span>
                  {isPositive ? 
                    <TrendingUp className="h-3 w-3 flex-shrink-0" /> : 
                    <TrendingDown className="h-3 w-3 flex-shrink-0" />
                  }
                </div>
                <div className="text-xs font-medium">
                  {isPositive ? '+' : ''}{stock.gainLossPercent.toFixed(1)}%
                </div>
                <div className="text-xs opacity-75 mt-1">
                  €{stock.currentValue.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-destructive/60 rounded"></div>
            <span>Loss</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-muted rounded"></div>
            <span>Neutral</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-success/60 rounded"></div>
            <span>Gain</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockHeatMap;