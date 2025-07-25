import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Portfolio } from '@/types/portfolio';

interface PortfolioCardProps {
  portfolio: Portfolio;
}

const PortfolioCard = ({ portfolio }: PortfolioCardProps) => {
  const navigate = useNavigate();
  const isPositive = portfolio.gainLoss >= 0;
  
  const handleClick = () => {
    navigate(`/portfolio/${portfolio.owner.toLowerCase()}`);
  };
  
  return (
    <Card className="transition-all hover:shadow-lg cursor-pointer" onClick={handleClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{portfolio.owner}</CardTitle>
        <Badge variant={isPositive ? "default" : "destructive"} className="flex items-center space-x-1">
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{isPositive ? '+' : ''}{portfolio.gainLossPercent.toFixed(2)}%</span>
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Current Value</span>
            <span className="font-medium">€{portfolio.totalValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Invested</span>
            <span className="font-medium">€{portfolio.totalInvested.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Gain/Loss</span>
            <span className={`font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}€{portfolio.gainLoss.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Trades</span>
            <span className="font-medium">{portfolio.trades.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioCard;