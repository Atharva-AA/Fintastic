import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { calculateSIP, type SIPCalculation } from '../../api/tutor.api';

export default function SIPCalculator() {
  const [formData, setFormData] = useState({
    monthlyAmount: 5000,
    rate: 12,
    years: 10,
  });
  const [calculation, setCalculation] = useState<SIPCalculation | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    if (
      formData.monthlyAmount <= 0 ||
      formData.rate <= 0 ||
      formData.years <= 0
    ) {
      alert('Please enter valid values');
      return;
    }

    try {
      setLoading(true);
      const result = await calculateSIP(formData);
      setCalculation(result);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const chartData =
    calculation?.projection.map((p) => ({
      month: `Year ${Math.floor(p.month / 12) + 1}`,
      invested: p.invested,
      value: p.value,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-text dark:text-white mb-6">
          SIP Calculator
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-2">
              Monthly SIP Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              value={formData.monthlyAmount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  monthlyAmount: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-2 rounded-xl border border-pastel-tan/30 dark:border-gray-700 bg-white dark:bg-gray-900 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-pastel-green/30 dark:focus:ring-green-600/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-2">
              Expected Annual Return (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.rate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  rate: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-2 rounded-xl border border-pastel-tan/30 dark:border-gray-700 bg-white dark:bg-gray-900 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-pastel-green/30 dark:focus:ring-green-600/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-2">
              Investment Period (Years)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={formData.years}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  years: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-2 rounded-xl border border-pastel-tan/30 dark:border-gray-700 bg-white dark:bg-gray-900 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-pastel-green/30 dark:focus:ring-green-600/30"
            />
          </div>
        </div>
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="mt-6 w-full md:w-auto px-8 py-3 bg-pastel-green/40 dark:bg-green-700/40 text-text dark:text-white rounded-xl font-semibold hover:bg-pastel-green/50 dark:hover:bg-green-700/50 transition-colors disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Calculate SIP'}
        </button>
      </div>

      {calculation && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
              <p className="text-sm text-text/60 dark:text-gray-400 mb-2">
                Total Invested
              </p>
              <p className="text-2xl font-bold text-text dark:text-white">
                ₹{calculation.totalInvested.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
              <p className="text-sm text-text/60 dark:text-gray-400 mb-2">
                Estimated Returns
              </p>
              <p className="text-2xl font-bold text-green-600">
                ₹{calculation.estimatedReturns.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
              <p className="text-sm text-text/60 dark:text-gray-400 mb-2">
                Total Value
              </p>
              <p className="text-2xl font-bold text-pastel-green dark:text-green-400">
                ₹{calculation.totalValue.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-text dark:text-white mb-4">
              SIP Growth Projection
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  className="dark:stroke-gray-700"
                />
                <XAxis
                  dataKey="month"
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
                  formatter={(value: number) =>
                    `₹${value.toLocaleString('en-IN')}`
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Total Invested"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Total Value"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Card */}
          <div className="bg-gradient-to-br from-pastel-green/20 to-pastel-blue/20 dark:from-green-900/30 dark:to-blue-900/30 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-text dark:text-white mb-4">
              Investment Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-text/70 dark:text-gray-300">
                  Monthly Investment
                </span>
                <span className="font-semibold text-text dark:text-white">
                  ₹{formData.monthlyAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text/70 dark:text-gray-300">
                  Investment Period
                </span>
                <span className="font-semibold text-text dark:text-white">
                  {formData.years} years
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text/70 dark:text-gray-300">
                  Expected Return Rate
                </span>
                <span className="font-semibold text-text dark:text-white">
                  {formData.rate}% p.a.
                </span>
              </div>
              <div className="border-t border-pastel-tan/30 dark:border-gray-700 my-3"></div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-text dark:text-white">
                  Total Returns
                </span>
                <span className="text-lg font-bold text-green-600">
                  ₹{calculation.estimatedReturns.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-text dark:text-white">
                  Final Amount
                </span>
                <span className="text-lg font-bold text-pastel-green dark:text-green-400">
                  ₹{calculation.totalValue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
