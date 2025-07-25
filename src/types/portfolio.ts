export interface Trade {
  id: number;
  date: string;
  symbol: string;
  asset: string;
  action: 'Buy' | 'Sell';
  quantity: number;
  price: number;
  total: number;
  trueTotal: number;
  buyer: string;
}

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface Portfolio {
  owner: string;
  trades: Trade[];
  totalValue: number;
  totalInvested: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  portfolios: Portfolio[];
}