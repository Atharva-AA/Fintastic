import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getGoalsInsight } from '../services/aiInsightsService';
import { getDashboardData } from '../services/dashboardService';
import InsightCard from '../components/InsightCard';

/**
 * Goals Page - AI-Powered Financial Goals & Future Planning
 * Smart goal tracking, timeline visualization, and AI guidance
 */
export default function Goals() {
  const [showAddGoal, setShowAddGoal] = useState(false);

  // AI Insights state
  const [goalsReport, setGoalsReport] = useState<any>(null);

  useEffect(() => {
    const fetchGoalsInsight = async () => {
      try {
        let userId = document.body.dataset.userId;
        if (!userId) {
          const dashboardData = await getDashboardData().catch(() => null);
          userId = dashboardData?.userId;
          if (!userId) {
            setGoalsReport(null);
            return;
          }
        }
        const response = await getGoalsInsight(userId);
        if (response.success && response.report) {
          setGoalsReport(response.report);
        } else {
          setGoalsReport(null);
        }
      } catch (err) {
        setGoalsReport(null);
      }
    };
    fetchGoalsInsight();
  }, []);

  // Active Goals Data
  const goals = [
    {
      name: 'Emergency Buffer',
      target: '₹25,000 – ₹35,000',
      progress: 40,
      priority: 'Must-have',
      priorityColor: 'bg-pastel-green',
      timeline: '6–8 months',
      monthlyContribution: '₹3,000 – ₹4,000',
    },
    {
      name: 'Laptop Upgrade',
      target: '₹60,000 – ₹80,000',
      progress: 25,
      priority: 'Good-to-have',
      priorityColor: 'bg-pastel-blue',
      timeline: '12–14 months',
      monthlyContribution: '₹4,000 – ₹5,500',
    },
    {
      name: 'Solo Trip',
      target: '₹30,000 – ₹45,000',
      progress: 10,
      priority: 'Optional',
      priorityColor: 'bg-pastel-tan',
      timeline: '18–24 months',
      monthlyContribution: '₹1,500 – ₹2,000',
    },
  ];

  // AI Planning Intelligence Insights
  const aiInsights = [
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
            clipRule="evenodd"
          />
        </svg>
      ),
      text: 'If you increase savings by ₹500/month, Laptop goal moves 4 months earlier',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
      text: 'Emergency Buffer should be prioritised before travel',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      text: 'Based on your income style, flexible contributions will work better',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path
            fillRule="evenodd"
            d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
            clipRule="evenodd"
          />
        </svg>
      ),
      text: 'You are currently on-track for 2 out of 3 goals',
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-pastel-beige dark:bg-gray-900">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-text mb-2">
                Your Financial Goals
              </h1>
              <p className="text-sm text-text/50">
                Turn your intentions into a timeline
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/80 border border-pastel-tan/20 text-sm text-text">
              Next 24 months view
            </div>
          </div>

          {/* Goal Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Active Goals</p>
              <p className="text-3xl font-semibold text-text mb-1">3 Goals</p>
              <p className="text-xs text-text/40">Across 6 – 48 months</p>
            </div>

            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">
                Required Monthly Focus
              </p>
              <p className="text-3xl font-semibold text-text mb-1">
                ₹3,000 – ₹4,500
              </p>
              <p className="text-xs text-text/40">Across all goals</p>
            </div>

            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Most Important Goal</p>
              <p className="text-3xl font-semibold text-text mb-1">
                Emergency Buffer
              </p>
              <p className="text-xs text-text/40">High Priority</p>
            </div>
          </div>

          {/* Goal Timeline - Hero Section */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <h2 className="text-xl font-semibold text-text mb-6">
              Goal Timeline
            </h2>

            <div className="space-y-6">
              {goals.map((goal, index) => (
                <div
                  key={index}
                  className="bg-pastel-beige/50 rounded-2xl p-6 border border-pastel-tan/20 hover:shadow-soft transition-all duration-300"
                >
                  {/* Goal Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-text">
                          {goal.name}
                        </h3>
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${goal.priorityColor} text-text/70`}
                        >
                          {goal.priority}
                        </span>
                      </div>
                      <p className="text-sm text-text/60">
                        Target: {goal.target}
                      </p>
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

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text/60">Progress</span>
                      <span className="text-sm font-medium text-text">
                        {goal.progress}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-pastel-tan/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${goal.priorityColor} transition-all duration-700`}
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Goal Details */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-pastel-tan/20">
                    <div>
                      <p className="text-xs text-text/50 mb-1">Timeline</p>
                      <p className="text-sm text-text font-medium">
                        {goal.timeline}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text/50 mb-1">
                        Monthly Contribution
                      </p>
                      <p className="text-sm text-text font-medium">
                        {goal.monthlyContribution}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text/50 mb-1">Status</p>
                      <p className="text-sm text-text font-medium">
                        {goal.progress >= 50 ? 'On track' : 'In progress'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline Visualization */}
            <div className="mt-8 pt-6 border-t border-pastel-tan/20">
              <h3 className="text-sm font-semibold text-text mb-4">
                Timeline Overview
              </h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-0 top-6 w-full h-0.5 bg-pastel-tan/30"></div>

                {/* Timeline markers */}
                <div className="relative flex justify-between">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-pastel-green mb-2 relative z-10"></div>
                    <span className="text-xs text-text/60">Now</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-pastel-blue mb-2 relative z-10"></div>
                    <span className="text-xs text-text/60">6 months</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-pastel-orange mb-2 relative z-10"></div>
                    <span className="text-xs text-text/60">12 months</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-pastel-tan mb-2 relative z-10"></div>
                    <span className="text-xs text-text/60">24 months</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Planning Intelligence - Hero Intelligence Section */}
          {goalsReport && (
            <div>
              <h2 className="text-xl font-semibold text-text mb-4">
                Fintastic AI Suggestions
              </h2>
              <InsightCard report={goalsReport} />
            </div>
          )}

          {/* Add New Goal */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            {!showAddGoal ? (
              <button
                onClick={() => setShowAddGoal(true)}
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
                <span className="text-sm font-medium">Add new goal</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text">
                    Add New Goal
                  </h3>
                  <button
                    onClick={() => setShowAddGoal(false)}
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
                  <div className="md:col-span-2">
                    <label className="block text-sm text-text/60 mb-2">
                      Goal Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Emergency Fund, New Laptop"
                      className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text/60 mb-2">
                      Goal Type
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                      <option>Must-have</option>
                      <option>Good-to-have</option>
                      <option>Optional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-text/60 mb-2">
                      Target Range
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                      <option>₹5,000 – ₹15,000</option>
                      <option>₹15,000 – ₹40,000</option>
                      <option>₹40,000 – ₹1,00,000</option>
                      <option>₹1,00,000 – ₹5,00,000</option>
                      <option>₹5,00,000+</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-text/60 mb-2">
                      Desired Timeline
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                      <option>3–6 months</option>
                      <option>6–12 months</option>
                      <option>1–2 years</option>
                      <option>2+ years</option>
                    </select>
                  </div>
                </div>

                {/* AI Auto-suggestion */}
                <div className="bg-pastel-blue/10 rounded-2xl p-4 border border-pastel-tan/20">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-text/60 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-xs text-text/50 mb-1">
                        AI Recommendation
                      </p>
                      <p className="text-sm text-text">
                        Recommended monthly contribution: ₹2,000 – ₹3,500
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button className="flex-1 px-4 py-3 rounded-xl bg-pastel-green/40 text-text font-medium hover:bg-pastel-green/50 transition-colors">
                    Add Goal
                  </button>
                  <button
                    onClick={() => setShowAddGoal(false)}
                    className="px-4 py-3 rounded-xl border border-pastel-tan/30 text-text hover:bg-pastel-orange/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Risk / Reality Bar */}
          <div className="bg-pastel-orange/10 rounded-2xl p-4 border border-pastel-tan/20">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-text/60 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm text-text mb-1">
                  You can safely manage 2 active goals at your current income
                </p>
                <p className="text-xs text-text/50">
                  Adding another may stretch your budget
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Coach Button */}
      <Link
        to="/ai"
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary via-primary to-pastel-blue text-white shadow-soft-lg hover:shadow-soft-lg hover:scale-110 transition-all duration-300 flex items-center justify-center group z-50 overflow-hidden"
        title="Ask Fintastic about your goals"
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
          Ask Fintastic about your goals
          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-text/95 rotate-45"></span>
        </span>
      </Link>
    </Layout>
  );
}
