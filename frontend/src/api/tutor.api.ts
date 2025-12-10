import api from './base';

export type Video = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  url: string;
  category?: string;
};

export type MarketData = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  chartData: Array<{ date: string; price: number }>;
  info: {
    name: string;
    sector?: string;
    marketCap?: string;
  };
};

export type TradeOrder = {
  symbol: string;
  quantity: number;
  orderType: 'buy' | 'sell';
  price?: number;
};

export type Portfolio = {
  userId: string;
  holdings: Array<{
    symbol: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    value: number;
    pnl: number;
    pnlPercent: number;
  }>;
  cashBalance: number;
  totalValue: number;
  lastUpdated: string;
};

export type Order = {
  _id: string;
  userId: string;
  symbol: string;
  quantity: number;
  price: number;
  orderType: 'buy' | 'sell';
  status: 'pending' | 'executed' | 'cancelled';
  executedAt?: string;
  orderId?: string;
  createdAt: string;
};

export type SIPCalculation = {
  monthlyAmount: number;
  rate: number;
  years: number;
  totalInvested: number;
  estimatedReturns: number;
  totalValue: number;
  projection: Array<{ month: number; invested: number; value: number }>;
};

export const getVideos = async (): Promise<Video[]> => {
  const response = await api.get('/api/tutor/videos');
  return response.data;
};

export const getMarketData = async (symbol: string): Promise<MarketData> => {
  const response = await api.get(
    `/api/tutor/market-data/${symbol.toUpperCase()}`
  );
  return response.data;
};

export const placeTrade = async (
  order: TradeOrder
): Promise<{ success: boolean; message: string; order?: Order }> => {
  const response = await api.post('/api/tutor/trade', order);
  return response.data;
};

export const getPortfolio = async (): Promise<Portfolio> => {
  const response = await api.get('/api/tutor/portfolio');
  return response.data;
};

export const getOrders = async (): Promise<Order[]> => {
  const response = await api.get('/api/tutor/orders');
  return response.data;
};

export const calculateSIP = async (data: {
  monthlyAmount: number;
  rate: number;
  years: number;
}): Promise<SIPCalculation> => {
  const response = await api.post('/api/tutor/calculate-sip', data);
  return response.data;
};
