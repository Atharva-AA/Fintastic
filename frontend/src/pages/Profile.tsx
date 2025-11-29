import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

/**
 * Profile Page - Your Financial Identity
 * Complete view of financial profile, behavior patterns, and report generation
 */
export default function Profile() {
  const [reportOptions, setReportOptions] = useState({
    income: true,
    spending: true,
    investments: true,
    goals: true,
    aiInsights: true,
  });

  // Activity Timeline
  const activityHistory = [
    { event: 'Onboarding completed', date: 'Nov 20, 2025' },
    { event: 'First goals set', date: 'Nov 21, 2025' },
    { event: 'Last data update', date: 'Today' },
    { event: 'Last AI review', date: '2 hours ago' },
  ];

  // Financial Behavior Patterns
  const behaviorPatterns = [
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      ),
      text: 'You tend to spend more on weekends',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
        </svg>
      ),
      text: 'Your income peaks between 1st–5th',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
      ),
      text: 'You respond well to saving reminders',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      text: 'Impulse risk exists in food & subscriptions',
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
                Your Financial Identity
              </h1>
              <p className="text-sm text-text/50">
                A complete view of your money life
              </p>
            </div>
            <div className="text-xs text-text/40">
              Last updated: Today
            </div>
          </div>

          {/* Personal Snapshot Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Profile Type</p>
              <p className="text-2xl font-semibold text-text">Gig Worker</p>
            </div>

            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Income Style</p>
              <p className="text-2xl font-semibold text-text">Semi-stable</p>
            </div>

            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Risk Profile</p>
              <p className="text-2xl font-semibold text-text">Balanced</p>
            </div>

            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Financial Phase</p>
              <p className="text-2xl font-semibold text-text">Building</p>
            </div>
          </div>

          {/* Financial Overview */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <h2 className="text-xl font-semibold text-text mb-6">Financial Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* What you own */}
              <div>
                <h3 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pastel-green"></span>
                  What you own
                </h3>
                <div className="space-y-3">
                  <div className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20">
                    <p className="text-xs text-text/50 mb-1">Savings</p>
                    <p className="text-base font-medium text-text">₹50,000 – ₹1,00,000</p>
                  </div>
                  <div className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20">
                    <p className="text-xs text-text/50 mb-1">Investments</p>
                    <p className="text-base font-medium text-text">₹1,00,000 – ₹3,00,000</p>
                  </div>
                  <div className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20">
                    <p className="text-xs text-text/50 mb-1">Emergency fund</p>
                    <p className="text-base font-medium text-text">40% built</p>
                  </div>
                </div>
              </div>

              {/* What you owe */}
              <div>
                <h3 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pastel-orange"></span>
                  What you owe
                </h3>
                <div className="space-y-3">
                  <div className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20">
                    <p className="text-xs text-text/50 mb-1">Active obligations</p>
                    <p className="text-base font-medium text-text">None</p>
                  </div>
                  <div className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20">
                    <p className="text-xs text-text/50 mb-1">Monthly fixed expense range</p>
                    <p className="text-base font-medium text-text">₹8,000 – ₹12,000</p>
                  </div>
                  <div className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20">
                    <p className="text-xs text-text/50 mb-1">Credit exposure</p>
                    <p className="text-base font-medium text-text">Low</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Direction */}
            <div className="mt-6 pt-6 border-t border-pastel-tan/20 text-center">
              <p className="text-sm text-text/60">
                Your net direction is currently:{' '}
                <span className="font-semibold text-text">Positive & improving</span>
              </p>
            </div>
          </div>

          {/* Financial Behavior Profile */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <h2 className="text-xl font-semibold text-text mb-4">
              Financial Behavior Profile
            </h2>
            <div className="space-y-3">
              {behaviorPatterns.map((pattern, index) => (
                <div
                  key={index}
                  className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20 flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-pastel-blue/40 flex items-center justify-center mt-0.5 text-text">
                    {pattern.icon}
                  </div>
                  <p className="text-sm text-text flex-1">{pattern.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Report Generator */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <h2 className="text-xl font-semibold text-text mb-2">
              Generate your financial report
            </h2>
            <p className="text-sm text-text/50 mb-6">
              A complete, shareable summary of your finances
            </p>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportOptions.income}
                  onChange={(e) =>
                    setReportOptions({ ...reportOptions, income: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-pastel-tan/30 text-pastel-green focus:ring-pastel-green/30"
                />
                <span className="text-sm text-text">Include income summary</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportOptions.spending}
                  onChange={(e) =>
                    setReportOptions({ ...reportOptions, spending: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-pastel-tan/30 text-pastel-green focus:ring-pastel-green/30"
                />
                <span className="text-sm text-text">Include spending analysis</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportOptions.investments}
                  onChange={(e) =>
                    setReportOptions({ ...reportOptions, investments: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-pastel-tan/30 text-pastel-green focus:ring-pastel-green/30"
                />
                <span className="text-sm text-text">Include investment portfolio</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportOptions.goals}
                  onChange={(e) =>
                    setReportOptions({ ...reportOptions, goals: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-pastel-tan/30 text-pastel-green focus:ring-pastel-green/30"
                />
                <span className="text-sm text-text">Include goals & timelines</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportOptions.aiInsights}
                  onChange={(e) =>
                    setReportOptions({ ...reportOptions, aiInsights: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-pastel-tan/30 text-pastel-green focus:ring-pastel-green/30"
                />
                <span className="text-sm text-text">Include AI insights</span>
              </label>
            </div>

            <button
              disabled
              className="w-full px-6 py-3 rounded-xl bg-pastel-green/40 text-text font-medium opacity-50 cursor-not-allowed mb-3"
            >
              Generate Financial Report
            </button>
            <p className="text-xs text-text/50 text-center">
              You'll be able to download this as a PDF in the next version.
            </p>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <h2 className="text-xl font-semibold text-text mb-4">
              Recent Activity
            </h2>
            <div className="space-y-3">
              {activityHistory.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-2xl bg-pastel-beige/50 border border-pastel-tan/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-pastel-green"></span>
                    <p className="text-sm text-text">{activity.event}</p>
                  </div>
                  <p className="text-xs text-text/50">{activity.date}</p>
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
        title="Ask Fintastic about your profile"
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
          Ask Fintastic about your profile
          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-text/95 rotate-45"></span>
        </span>
      </Link>
    </Layout>
  );
}
