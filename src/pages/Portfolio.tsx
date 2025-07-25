import { useParams } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import TradesList from '@/components/TradesList';
import AddTradeModal from '@/components/AddTradeModal';
import PortfolioAllocationChart from '@/components/charts/PortfolioAllocationChart';
import GainLossChart from '@/components/charts/GainLossChart';
import HoldingsPerformanceChart from '@/components/charts/HoldingsPerformanceChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSupabaseTrades } from '@/hooks/useSupabaseTrades';
import { useSupabaseStockPrices } from '@/hooks/useSupabaseStockPrices';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart } from 'lucide-react';

const Portfolio = () => {
  const { owner } = useParams<{ owner: string }>();
  const { trades, addTrade, loading: tradesLoading } = useSupabaseTrades();
  const { getPrice, fetchStockPrices } = useSupabaseStockPrices();
  
  // Get trades for this owner
  const ownerTrades = trades.filter(trade => 
    trade.buyer.toLowerCase() === owner?.toLowerCase()
  );

  // Fetch stock prices for this portfolio's symbols
  useEffect(() => {
    if (ownerTrades.length > 0) {
      const symbols = [...new Set(ownerTrades.map(trade => trade.symbol))];
      fetchStockPrices(symbols);
    }
  }, [ownerTrades, fetchStockPrices]);

  const ownerName = owner?.charAt(0).toUpperCase() + owner?.slice(1) || '';
  
  const portfolioData = useMemo(() => {
    const userTrades = trades.filter(trade => 
      trade.buyer.toLowerCase() === owner?.toLowerCase()
    );

    const totalInvested = userTrades.reduce((sum, trade) => sum + trade.trueTotal, 0);
    
    const totalValue = userTrades.reduce((sum, trade) => {
      const currentPrice = getPrice(trade.symbol);
      return sum + (currentPrice ? trade.quantity * currentPrice.price : trade.trueTotal);
    }, 0);

    const gainLoss = totalValue - totalInvested;
    const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

    // Calculate holdings
    const holdings = new Map();
    userTrades.forEach(trade => {
      const key = trade.symbol;
      if (!holdings.has(key)) {
        holdings.set(key, {
          symbol: trade.symbol,
          asset: trade.asset,
          totalQuantity: 0,
          totalInvested: 0,
          currentValue: 0,
          gainLoss: 0,
          gainLossPercent: 0,
        });
      }
      
      const holding = holdings.get(key);
      holding.totalQuantity += trade.quantity;
      holding.totalInvested += trade.trueTotal;
      
      const currentPrice = getPrice(trade.symbol);
      if (currentPrice) {
        holding.currentValue = holding.totalQuantity * currentPrice.price;
        holding.gainLoss = holding.currentValue - holding.totalInvested;
        holding.gainLossPercent = holding.totalInvested > 0 ? (holding.gainLoss / holding.totalInvested) * 100 : 0;
      } else {
        holding.currentValue = holding.totalInvested;
      }
    });

    return {
      trades: userTrades,
      totalInvested,
      totalValue,
      gainLoss,
      gainLossPercent,
      holdings: Array.from(holdings.values()).sort((a, b) => b.currentValue - a.currentValue),
    };
  }, [owner, getPrice, trades]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (portfolioData.trades.length === 0) return { allocation: [], gainLoss: [], performance: [] };

    // Portfolio allocation data
    const allocation = portfolioData.holdings.map(holding => ({
      name: holding.symbol,
      value: holding.currentValue,
      color: '', // Will be assigned in component
    }));

    // Gain/Loss over time (simplified - using trade dates)
    const sortedTrades = [...portfolioData.trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cumulativeInvested = 0;
    let cumulativeValue = 0;
    
    const gainLoss = sortedTrades.map(trade => {
      cumulativeInvested += trade.trueTotal;
      const currentPrice = getPrice(trade.symbol);
      if (currentPrice) {
        cumulativeValue = portfolioData.holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
      } else {
        cumulativeValue = cumulativeInvested;
      }
      
      return {
        date: trade.date,
        value: cumulativeValue,
        invested: cumulativeInvested,
        gainLoss: cumulativeValue - cumulativeInvested,
      };
    });

    // Performance data
    const performance = portfolioData.holdings.map(holding => ({
      symbol: holding.symbol,
      gainLossPercent: holding.gainLossPercent,
      currentValue: holding.currentValue,
    }));

    return { allocation, gainLoss, performance };
  }, [portfolioData, getPrice]);

  if (!owner || portfolioData.trades.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Portfolio not found</h1>
            <p className="text-muted-foreground">The portfolio for "{ownerName}" doesn't exist or has no trades.</p>
          </div>
        </div>
      </div>
    );
  }

  const isPositive = portfolioData.gainLoss >= 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{ownerName}'s Portfolio</h1>
            <p className="text-muted-foreground">Detailed portfolio analysis and performance metrics</p>
          </div>
          <AddTradeModal onAddTrade={(trade) => addTrade({ ...trade, buyer: ownerName })} />
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{portfolioData.totalValue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{portfolioData.totalInvested.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gain/Loss</CardTitle>
              {isPositive ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {isPositive ? '+' : ''}€{portfolioData.gainLoss.toFixed(2)}
              </div>
              <p className={`text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {isPositive ? '+' : ''}{portfolioData.gainLossPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Holdings</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{portfolioData.holdings.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <PortfolioAllocationChart data={chartData.allocation} />
          <HoldingsPerformanceChart data={chartData.performance} />
        </div>
        
        <div className="mb-8">
          <GainLossChart data={chartData.gainLoss} />
        </div>

        {/* Holdings Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Current Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolioData.holdings.map((holding) => {
                const isHoldingPositive = holding.gainLoss >= 0;
                const currentPrice = getPrice(holding.symbol);
                
                return (
                  <div key={holding.symbol} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{holding.symbol}</h3>
                        <p className="text-sm text-muted-foreground">{holding.asset}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">€{holding.currentValue.toFixed(2)}</p>
                        <div className="flex items-center space-x-1">
                          {isHoldingPositive ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                          <span className={`text-sm ${isHoldingPositive ? 'text-success' : 'text-destructive'}`}>
                            {isHoldingPositive ? '+' : ''}€{holding.gainLoss.toFixed(2)} ({holding.gainLossPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Quantity</p>
                        <p className="font-medium">{holding.totalQuantity.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg. Cost</p>
                        <p className="font-medium">€{(holding.totalInvested / holding.totalQuantity).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Price</p>
                        <p className="font-medium">
                          €{currentPrice?.price.toFixed(2) || 'N/A'}
                          {currentPrice && (
                            <Badge variant={currentPrice.changePercent >= 0 ? "default" : "destructive"} className="ml-2 text-xs">
                              {currentPrice.changePercent >= 0 ? '+' : ''}{currentPrice.changePercent.toFixed(2)}%
                            </Badge>
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

        {/* Trade History */}
        <TradesList trades={portfolioData.trades} title={`${ownerName}'s Trade History`} />
      </div>
    </div>
  );
};

export default Portfolio;