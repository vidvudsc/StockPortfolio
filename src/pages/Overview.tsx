import { useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import PortfolioCard from '@/components/PortfolioCard';
import { useSupabaseTrades } from '@/hooks/useSupabaseTrades';
import { useSupabaseStockPrices } from '@/hooks/useSupabaseStockPrices';
import { Portfolio, PortfolioSummary } from '@/types/portfolio';
import { TrendingUp, DollarSign, Users, Activity } from 'lucide-react';

const Overview = () => {
  const { trades, loading: tradesLoading } = useSupabaseTrades();
  const { getPrice, fetchStockPrices } = useSupabaseStockPrices();

  // Fetch stock prices for all unique symbols
  useEffect(() => {
    if (trades.length > 0) {
      const symbols = [...new Set(trades.map(trade => trade.symbol))];
      fetchStockPrices(symbols);
    }
  }, [trades, fetchStockPrices]);

  const portfolioData = useMemo((): PortfolioSummary => {
    const portfolioMap = new Map<string, Portfolio>();

    // Group trades by buyer
    trades.forEach(trade => {
      if (!portfolioMap.has(trade.buyer)) {
        portfolioMap.set(trade.buyer, {
          owner: trade.buyer,
          trades: [],
          totalValue: 0,
          totalInvested: 0,
          gainLoss: 0,
          gainLossPercent: 0,
        });
      }
      portfolioMap.get(trade.buyer)!.trades.push(trade);
    });

    // Calculate portfolio values
    const portfolios = Array.from(portfolioMap.values()).map(portfolio => {
      const totalInvested = portfolio.trades.reduce((sum, trade) => sum + trade.total, 0);
      
      const totalValue = portfolio.trades.reduce((sum, trade) => {
        const currentPrice = getPrice(trade.symbol);
        return sum + (currentPrice ? trade.quantity * currentPrice.price : trade.total);
      }, 0);

      const gainLoss = totalValue - totalInvested;
      const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

      return {
        ...portfolio,
        totalValue,
        totalInvested,
        gainLoss,
        gainLossPercent,
      };
    });

    const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
    const totalInvested = portfolios.reduce((sum, p) => sum + p.totalInvested, 0);
    const totalGainLoss = totalValue - totalInvested;
    const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return {
      totalValue,
      totalInvested,
      totalGainLoss,
      totalGainLossPercent,
      portfolios: portfolios.sort((a, b) => b.totalValue - a.totalValue),
    };
  }, [getPrice, trades]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Family Portfolio Overview</h1>
          <p className="text-muted-foreground">Track your family's investment performance in real-time</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
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
              <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${portfolioData.totalGainLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                {portfolioData.totalGainLoss >= 0 ? '+' : ''}€{portfolioData.totalGainLoss.toFixed(2)}
              </div>
              <p className={`text-xs ${portfolioData.totalGainLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                {portfolioData.totalGainLoss >= 0 ? '+' : ''}{portfolioData.totalGainLossPercent.toFixed(2)}% from invested
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trades.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Individual Portfolios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {portfolioData.portfolios.map((portfolio) => (
            <PortfolioCard key={portfolio.owner} portfolio={portfolio} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Overview;