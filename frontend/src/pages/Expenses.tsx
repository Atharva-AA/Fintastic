import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

/**
 * Expenses Page - AI-Powered Spending Intelligence
 * Smart expense tracking, categorization, and insights
 */
export default function Expenses() {
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Money Map Data (Donut chart percentages)
  const moneyMap = [
    { category: 'Needs', percentage: 54, color: 'bg-pastel-green', status: 'Healthy', statusColor: 'bg-pastel-green' },
    { category: 'Wants', percentage: 26, color: 'bg-pastel-orange', status: 'Slightly high', statusColor: 'bg-pastel-orange' },
    { category: 'Goals', percentage: 12, color: 'bg-pastel-blue', status: 'On track', statusColor: 'bg-pastel-green' },
    { category: 'Obligations', percentage: 8, color: 'bg-pastel-tan', status: 'Under control', statusColor: 'bg-pastel-green' },
  ];

  // Category Insight Cards
  const categoryInsights = [
    {
      name: 'Food & Groceries',
      average: '₹5,000 – ₹8,000 / month',
      pattern: 'Peak days: Fri – Sun',
      risk: 'Medium',
      riskColor: 'bg-pastel-orange',
      aiTip: 'Weekend planning will reduce this by ~15%',
    },
    {
      name: 'Transport',
      average: '₹2,000 – ₹4,000 / month',
      pattern: 'Stable spending',
      risk: 'Low',
      riskColor: 'bg-pastel-green',
      aiTip: 'Monthly pass saves money',
    },
    {
      name: 'Shopping / Online',
      average: '₹3,000 – ₹6,000 / month',
      pattern: 'Irregular',
      risk: 'High',
      riskColor: 'bg-pastel-tan',
      aiTip: 'Impulse-heavy, set weekly limit',
    },
    {
      name: 'Subscriptions',
      average: '₹1,000 – ₹2,000 / month',
      pattern: 'Fixed monthly',
      risk: 'Low',
      riskColor: 'bg-pastel-green',
      aiTip: 'Review unused subscriptions',
    },
  ];

  // AI Spending Coach Insights
  const aiInsights = [
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      text: '42% of your "Wants" spending happens after 9 PM',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      text: 'Subscriptions you rarely use: Netflix, Spotify',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      ),
      text: 'If you reduce food delivery by ₹300/week → Save ~₹1,200/month',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
        </svg>
      ),
      text: 'Safe daily spend range: ₹500–₹700',
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-pastel-beige">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Quick Warnings Bar */}
          <div className="bg-pastel-orange/20 rounded-2xl p-4 border border-pastel-tan/20 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-text/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-text/70">Overspending risk in Food</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-text/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-text/70">Next big bill expected in 5 days</span>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-text mb-2">
                Spending Intelligence
              </h1>
              <p className="text-sm text-text/50">
                Understand where your money actually goes
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/80 border border-pastel-tan/20 text-sm text-text">
              This month
            </div>
          </div>

          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Estimated Monthly Spending</p>
              <p className="text-3xl font-semibold text-text mb-1">
                ₹18,000 – ₹26,000
              </p>
              <p className="text-xs text-text/40">Based on recent patterns</p>
            </div>

            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Highest Spend Area</p>
              <p className="text-3xl font-semibold text-text mb-1">Food</p>
              <p className="text-xs text-text/40">Followed by Transport</p>
            </div>

            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Overspending Risk</p>
              <p className="text-3xl font-semibold text-text mb-1">Medium</p>
              <p className="text-xs text-text/40">Based on current pace</p>
            </div>
          </div>

          {/* Money Map - Hero Visual */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <h2 className="text-xl font-semibold text-text mb-6">Money Map</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Donut Chart Representation */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-64 h-64">
                  {/* Simple donut chart using stacked circles */}
                  <div className="absolute inset-0 rounded-full bg-pastel-green opacity-20"></div>
                  <div className="absolute inset-8 rounded-full bg-pastel-orange opacity-20"></div>
                  <div className="absolute inset-16 rounded-full bg-pastel-blue opacity-20"></div>
                  <div className="absolute inset-24 rounded-full bg-pastel-tan opacity-20"></div>
                  <div className="absolute inset-28 rounded-full bg-white"></div>
                  
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <p className="text-sm text-text/50">Total Spend</p>
                    <p className="text-2xl font-semibold text-text">100%</p>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="w-full mt-8 space-y-3">
                  {moneyMap.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-text">{item.category}</span>
                        <span className="text-sm text-text/60">{item.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-pastel-tan/20 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all duration-700`}
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Status Indicators */}
              <div className="flex flex-col justify-center space-y-4">
                <h3 className="text-lg font-semibold text-text mb-2">Category Health</h3>
                {moneyMap.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 rounded-2xl bg-pastel-beige/50 border border-pastel-tan/20">
                    <span className={`w-3 h-3 rounded-full ${item.statusColor} flex-shrink-0`}></span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text">{item.category}</p>
                      <p className="text-xs text-text/50">{item.status}</p>
                    </div>
                    <span className="text-sm text-text/60">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Smart Category Insight Cards */}
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-text mb-4">
              Category Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryInsights.map((category, index) => (
                <div
                  key={index}
                  className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 hover:shadow-soft-lg transition-all duration-300"
                >
                  <h3 className="text-base font-semibold text-text mb-3">
                    {category.name}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-text/50 mt-0.5">•</span>
                      <p className="text-sm text-text/70">{category.average}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-text/50 mt-0.5">•</span>
                      <p className="text-sm text-text/70">{category.pattern}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text/50">•</span>
                      <span className="text-xs text-text/50">Risk:</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${category.riskColor} text-text/70`}>
                        {category.risk}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-pastel-tan/20">
                    <p className="text-xs text-text/60 italic">
                      AI Tip: {category.aiTip}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Spending Coach - Hero Intelligence Section */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <h2 className="text-xl font-semibold text-text mb-4">
              Fintastic AI is analyzing your spending
            </h2>
            <div className="space-y-3">
              {aiInsights.map((insight, index) => (
                <div
                  key={index}
                  className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20 flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-pastel-green/40 flex items-center justify-center mt-0.5 text-text">
                    {insight.icon}
                  </div>
                  <p className="text-sm text-text flex-1">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Expense */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            {!showAddExpense ? (
              <button
                onClick={() => setShowAddExpense(true)}
                className="w-full flex items-center justify-center gap-2 py-4 text-text/60 hover:text-text transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-sm font-medium">Add new expense</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text">
                    Add New Expense
                  </h3>
                  <button
                    onClick={() => setShowAddExpense(false)}
                    className="p-1 rounded-lg hover:bg-pastel-orange/20 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-text/60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text/60 mb-2">
                      Expense Type
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                      <option>Fixed</option>
                      <option>Variable</option>
                      <option>One-time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-text/60 mb-2">
                      Category
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                      <option>Food</option>
                      <option>Rent</option>
                      <option>Transport</option>
                      <option>Subscriptions</option>
                      <option>Shopping</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-text/60 mb-2">
                      Estimated Range
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                      <option>₹0 – ₹1,000</option>
                      <option>₹1,000 – ₹3,000</option>
                      <option>₹3,000 – ₹5,000</option>
                      <option>₹5,000 – ₹10,000</option>
                      <option>₹10,000+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-text/60 mb-2">
                      Duration
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                      <option>One-time</option>
                      <option>Monthly</option>
                      <option>Short-term (1–6m)</option>
                      <option>Long-term</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button className="flex-1 px-4 py-3 rounded-xl bg-pastel-green/40 text-text font-medium hover:bg-pastel-green/50 transition-colors">
                    Add Expense
                  </button>
                  <button
                    onClick={() => setShowAddExpense(false)}
                    className="px-4 py-3 rounded-xl border border-pastel-tan/30 text-text hover:bg-pastel-orange/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating AI Coach Button */}
      <Link
        to="/ai"
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary via-primary to-pastel-blue text-white shadow-soft-lg hover:shadow-soft-lg hover:scale-110 transition-all duration-300 flex items-center justify-center group z-50 overflow-hidden"
        title="Ask Fintastic about spending"
      >
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-pastel-blue/50 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-pastel-blue rounded-full"></div>

        {/* Icon */}
        <svg
          className="w-6 h-6 md:w-7 md:h-7 relative z-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>

        {/* Tooltip */}
        <span className="hidden md:block absolute right-full mr-4 px-4 py-2 bg-text/95 backdrop-blur-sm text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-soft-lg pointer-events-none">
          Ask Fintastic about spending
          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-text/95 rotate-45"></span>
        </span>
      </Link>
    </Layout>
  );
}
