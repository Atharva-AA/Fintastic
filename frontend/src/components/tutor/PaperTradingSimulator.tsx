import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  getMarketData,
  placeTrade,
  getPortfolio,
  getOrders,
  type MarketData,
  type TradeOrder,
  type Portfolio,
  type Order,
} from '../../api/tutor.api';

export default function PaperTradingSimulator() {
  const [symbol, setSymbol] = useState('AAPL');
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeForm, setTradeForm] = useState({
    quantity: 1,
    orderType: 'buy' as 'buy' | 'sell',
  });

  useEffect(() => {
    fetchMarketData();
    fetchPortfolio();
    fetchOrders();
  }, [symbol]);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const data = await getMarketData(symbol);
      setMarketData(data);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const data = await getPortfolio();
      setPortfolio(data);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleTrade = async () => {
    if (!marketData || tradeForm.quantity <= 0) return;

    try {
      setTradeLoading(true);
      const order: TradeOrder = {
        symbol: symbol.toUpperCase(),
        quantity: tradeForm.quantity,
        orderType: tradeForm.orderType,
        price: marketData.price,
      };

      const result = await placeTrade(order);
      if (result.success) {
        alert(result.message);
        await Promise.all([fetchPortfolio(), fetchOrders()]);
        setTradeForm({ quantity: 1, orderType: 'buy' });
      } else {
        alert(result.message || 'Trade failed');
      }
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Trade failed');
    } finally {
      setTradeLoading(false);
    }
  };

  const chartData =
    marketData?.chartData.map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      price: d.price,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Stock Search */}
      <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text dark:text-white mb-2">
              Stock Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && fetchMarketData()}
              className="w-full px-4 py-2 rounded-xl border border-pastel-tan/30 dark:border-gray-700 bg-white dark:bg-gray-900 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-pastel-green/30 dark:focus:ring-green-600/30"
              placeholder="AAPL, MSFT, GOOGL..."
            />
          </div>
          <button
            onClick={fetchMarketData}
            disabled={loading}
            className="px-6 py-2 bg-pastel-green/40 dark:bg-green-700/40 text-text dark:text-white rounded-xl font-medium hover:bg-pastel-green/50 dark:hover:bg-green-700/50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      {marketData && (
        <>
          {/* Price Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
              <p className="text-sm text-text/60 dark:text-gray-400 mb-1">
                Current Price
              </p>
              <p className="text-2xl font-bold text-text dark:text-white">
                ${marketData.price.toFixed(2)}
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
              <p className="text-sm text-text/60 dark:text-gray-400 mb-1">
                Change
              </p>
              <p
                className={`text-2xl font-bold ${marketData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {marketData.change >= 0 ? '+' : ''}
                {marketData.change.toFixed(2)} (
                {marketData.changePercent.toFixed(2)}%)
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
              <p className="text-sm text-text/60 dark:text-gray-400 mb-1">
                Company
              </p>
              <p className="text-lg font-semibold text-text dark:text-white">
                {marketData.info.name}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-text dark:text-white mb-4">
              Price Chart
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  className="dark:stroke-gray-700"
                />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  className="dark:stroke-gray-400"
                />
                <YAxis stroke="#6b7280" className="dark:stroke-gray-400" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  className="dark:bg-gray-800 dark:border-gray-700"
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Trading Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Placement */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-text dark:text-white mb-4">
                Place Order
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-2">
                    Order Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setTradeForm({ ...tradeForm, orderType: 'buy' })
                      }
                      className={`flex-1 px-4 py-2 rounded-xl font-medium transition-colors ${
                        tradeForm.orderType === 'buy'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-text dark:text-white'
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() =>
                        setTradeForm({ ...tradeForm, orderType: 'sell' })
                      }
                      className={`flex-1 px-4 py-2 rounded-xl font-medium transition-colors ${
                        tradeForm.orderType === 'sell'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-text dark:text-white'
                      }`}
                    >
                      Sell
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tradeForm.quantity}
                    onChange={(e) =>
                      setTradeForm({
                        ...tradeForm,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-4 py-2 rounded-xl border border-pastel-tan/30 dark:border-gray-700 bg-white dark:bg-gray-900 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-pastel-green/30 dark:focus:ring-green-600/30"
                  />
                </div>
                <div className="bg-pastel-beige/50 dark:bg-gray-700/50 rounded-xl p-4">
                  <p className="text-sm text-text/60 dark:text-gray-400 mb-1">
                    Estimated Cost
                  </p>
                  <p className="text-lg font-semibold text-text dark:text-white">
                    ${(marketData.price * tradeForm.quantity).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={handleTrade}
                  disabled={tradeLoading || tradeForm.quantity <= 0}
                  className={`w-full px-6 py-3 rounded-xl font-semibold text-white transition-colors ${
                    tradeForm.orderType === 'buy'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  } disabled:opacity-50`}
                >
                  {tradeLoading
                    ? 'Processing...'
                    : `${tradeForm.orderType === 'buy' ? 'Buy' : 'Sell'} ${tradeForm.quantity} Shares`}
                </button>
              </div>
            </div>

            {/* Portfolio Summary */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-text dark:text-white mb-4">
                Portfolio
              </h2>
              {portfolio ? (
                <div className="space-y-4">
                  <div className="bg-pastel-green/20 dark:bg-green-900/30 rounded-xl p-4">
                    <p className="text-sm text-text/60 dark:text-gray-400 mb-1">
                      Total Value
                    </p>
                    <p className="text-2xl font-bold text-text dark:text-white">
                      ${portfolio.totalValue.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text/60 dark:text-gray-400 mb-1">
                      Cash Balance
                    </p>
                    <p className="text-lg font-semibold text-text dark:text-white">
                      ${portfolio.cashBalance.toFixed(2)}
                    </p>
                  </div>
                  {portfolio.holdings.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-text dark:text-white mb-2">
                        Holdings
                      </p>
                      <div className="space-y-2">
                        {portfolio.holdings.map((holding, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-2 bg-pastel-beige/50 dark:bg-gray-700/50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-text dark:text-white">
                                {holding.symbol}
                              </p>
                              <p className="text-xs text-text/60 dark:text-gray-400">
                                {holding.quantity} shares @ $
                                {holding.avgPrice.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-text dark:text-white">
                                ${holding.value.toFixed(2)}
                              </p>
                              <p
                                className={`text-xs ${holding.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {holding.pnl >= 0 ? '+' : ''}
                                {holding.pnl.toFixed(2)} (
                                {holding.pnlPercent.toFixed(2)}%)
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-text/60 dark:text-gray-400">
                  No portfolio data available
                </p>
              )}
            </div>
          </div>

          {/* Order History */}
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-text dark:text-white mb-4">
              Order History
            </h2>
            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-pastel-tan/20 dark:border-gray-700">
                      <th className="text-left py-2 px-4 text-sm font-medium text-text dark:text-white">
                        Symbol
                      </th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-text dark:text-white">
                        Type
                      </th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-text dark:text-white">
                        Quantity
                      </th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-text dark:text-white">
                        Price
                      </th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-text dark:text-white">
                        Status
                      </th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-text dark:text-white">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order._id}
                        className="border-b border-pastel-tan/10 dark:border-gray-700/50"
                      >
                        <td className="py-2 px-4 text-sm text-text dark:text-white">
                          {order.symbol}
                        </td>
                        <td className="py-2 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              order.orderType === 'buy'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {order.orderType.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-sm text-text dark:text-white">
                          {order.quantity}
                        </td>
                        <td className="py-2 px-4 text-sm text-text dark:text-white">
                          ${order.price.toFixed(2)}
                        </td>
                        <td className="py-2 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              order.status === 'executed'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : order.status === 'pending'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-sm text-text/60 dark:text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-text/60 dark:text-gray-400">No orders yet</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
