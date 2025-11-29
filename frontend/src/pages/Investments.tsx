import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

/**
 * Investments Page - AI-Powered Wealth Planning
 * Smart investment tracking, portfolio analysis, and AI guidance
 */
export default function Investments() {
  const [showAddInvestment, setShowAddInvestment] = useState(false);

  // Current Investment Portfolio
  const investments = [
    {
      name: 'Mutual Funds / SIPs',
      invested: '₹1,00,000 – ₹5,00,000',
      type: 'Long-term growth',
      liquidity: 'Medium',
      status: 'Active',
      statusColor: 'bg-pastel-green',
    },
    {
      name: 'Stocks',
      invested: '₹50,000 – ₹1,00,000',
      type: 'Growth + high risk',
      liquidity: 'High',
      status: 'Active',
      statusColor: 'bg-pastel-green',
    },
    {
      name: 'Crypto',
      invested: '₹10,000 – ₹50,000',
      type: 'Experimental',
      liquidity: 'High',
      status: 'Caution',
      statusColor: 'bg-pastel-orange',
    },
    {
      name: 'FD / RD',
      invested: '₹50,000 – ₹1,00,000',
      type: 'Safe + stable',
      liquidity: 'Low',
      status: 'Safe',
      statusColor: 'bg-pastel-blue',
    },
  ];

  // AI Portfolio Insights
  const aiInsights = [
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      text: 'You are currently more growth-focused than 63% of similar users',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      text: 'If markets decline by 10%, your expected impact is low–moderate',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      text: 'You have a healthy mix of liquidity and growth',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      ),
      text: 'Increasing SIP by ₹500/month could significantly boost your 3-year outcome',
    },
  ];

  // Smart Strategy Tips
  const strategyTips = [
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      text: 'Keep 50–60% in safe / balanced instruments until emergency fund is complete',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
      ),
      text: 'You are in the best phase to start compounding (age + flexibility advantage)',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
      text: 'Avoid locking long-term investments until income stabilizes further',
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-pastel-beige">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-text mb-2">
                Investments & Wealth Planning
              </h1>
              <p className="text-sm text-text/50">
                Where your money grows over time
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/80 border border-pastel-tan/20 text-sm text-text">
              Long-term perspective
            </div>
          </div>

          {/* Investment Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Total Invested</p>
              <p className="text-3xl font-semibold text-text mb-1">
                ₹1,50,000 – ₹2,00,000
              </p>
              <p className="text-xs text-text/40">Across all assets</p>
            </div>

            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Risk Level</p>
              <p className="text-3xl font-semibold text-text mb-1">Balanced</p>
              <p className="text-xs text-text/40">Based on your choices</p>
            </div>

            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Recommended Monthly Range</p>
              <p className="text-3xl font-semibold text-text mb-1">
                ₹2,500 – ₹4,000
              </p>
              <p className="text-xs text-text/40">Based on income patterns</p>
            </div>
          </div>

          {/* Current Investment Portfolio */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <h2 className="text-xl font-semibold text-text mb-6">Current Portfolio</h2>
            
            <div className="space-y-4">
              {investments.map((investment, index) => (
                <div
                  key={index}
                  className="bg-pastel-beige/50 rounded-2xl p-6 border border-pastel-tan/20 hover:shadow-soft transition-all duration-300"
                >
                  {/* Investment Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-text">
                          {investment.name}
                        </h3>
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${investment.statusColor} text-text/70`}
                        >
                          {investment.status}
                        </span>
                      </div>
                      <p className="text-sm text-text/60">Invested: {investment.invested}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-xs rounded-lg border border-pastel-tan/30 text-text hover:bg-pastel-orange/20 transition-colors">
                        Edit
                      </button>
                      <button className="px-3 py-1.5 text-xs rounded-lg border border-pastel-tan/30 text-text/60 hover:bg-pastel-orange/20 transition-colors">
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Investment Details */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-pastel-tan/20">
                    <div>
                      <p className="text-xs text-text/50 mb-1">Type</p>
                      <p className="text-sm text-text font-medium">{investment.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text/50 mb-1">Liquidity</p>
                      <p className="text-sm text-text font-medium">{investment.liquidity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text/50 mb-1">Status</p>
                      <p className="text-sm text-text font-medium">{investment.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Portfolio Insights - Hero Intelligence Section */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <h2 className="text-xl font-semibold text-text mb-4">
              Fintastic AI Analysis
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

          {/* Add New Investment */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            {!showAddInvestment ? (
              <button
                onClick={() => setShowAddInvestment(true)}
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
                <span className="text-sm font-medium">Add new investment</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text">
                    Add New Investment
                  </h3>
                  <button
                    onClick={() => setShowAddInvestment(false)}
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
                      Investment Type
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                      <option>Mutual Funds / SIP</option>
                      <option>Stocks</option>
                      <option>Crypto</option>
                      <option>FD / RD</option>
                      <option>PPF / NPS</option>
                      <option>Real Estate</option>
                      <option>Business</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-text/60 mb-2">
                      Total Invested Range
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                      <option>₹0 – ₹10,000</option>
                      <option>₹10,000 – ₹50,000</option>
                      <option>₹50,000 – ₹1,00,000</option>
                      <option>₹1,00,000 – ₹5,00,000</option>
                      <option>₹5,00,000+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-text/60 mb-2">
                      Investment Style
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                      <option>Safe</option>
                      <option>Balanced</option>
                      <option>Aggressive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-text/60 mb-2">
                      Duration
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                      <option>&lt; 1 year</option>
                      <option>1–3 years</option>
                      <option>3–5 years</option>
                      <option>5+ years</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button className="flex-1 px-4 py-3 rounded-xl bg-pastel-green/40 text-text font-medium hover:bg-pastel-green/50 transition-colors">
                    Add Investment
                  </button>
                  <button
                    onClick={() => setShowAddInvestment(false)}
                    className="px-4 py-3 rounded-xl border border-pastel-tan/30 text-text hover:bg-pastel-orange/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Smart Strategy For You */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <h2 className="text-xl font-semibold text-text mb-4">
              Smart Strategy For You
            </h2>
            <div className="space-y-3">
              {strategyTips.map((tip, index) => (
                <div
                  key={index}
                  className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20 flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-pastel-blue/40 flex items-center justify-center mt-0.5 text-text">
                    {tip.icon}
                  </div>
                  <p className="text-sm text-text flex-1">{tip.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Coach Button */}
      <Link
        to="/ai"
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary via-primary to-pastel-blue text-white shadow-soft-lg hover:shadow-soft-lg hover:scale-110 transition-all duration-300 flex items-center justify-center group z-50 overflow-hidden"
        title="Ask Fintastic about investments"
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
          Ask Fintastic about investments
          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-text/95 rotate-45"></span>
        </span>
      </Link>
    </Layout>
  );
}
