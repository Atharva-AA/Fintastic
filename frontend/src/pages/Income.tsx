import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  getIncomeIntelligence,
  addIncomeEntry,
} from '../services/incomeService';
import { getDashboardData } from '../services/dashboardService';

const formatCurrency = (value?: number) => {
  if (!value || Number.isNaN(value)) return '₹0';
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
};

const stabilityClassMap: Record<string, string> = {
  high: 'text-emerald-600',
  medium: 'text-amber-600',
  low: 'text-rose-600',
};

const stabilityDotMap: Record<string, string> = {
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-rose-500',
};

type IncomeInsight = {
  type?: 'alert' | 'summary';
  title?: string;
  ai_noticing?: string;
  positive?: string | null;
  improvement?: string | null;
  action?: string | null;
  reasonSummary?: string[];
  level?: string;
  scope?: string;
  createdAt?: string;
  text?: string;
};

export default function Income() {
  const [intelligence, setIntelligence] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchIncomeData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Cookie-based auth - cookies are sent automatically by axios
      const data = await getIncomeIntelligence();
      setIntelligence(data || {});
    } catch (err: any) {
      // If it's a 401, the axios interceptor will handle redirect
      // Only show error for other types of failures
      if (err?.response?.status !== 401) {
        setError('Unable to load income intelligence. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeData();
  }, []);

  const handleAddIncome = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setSubmitError('Enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setSubmitError('Add a short description for this income.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Cookie-based auth - cookies are sent automatically by axios
      await addIncomeEntry({
        amount: numericAmount,
        text: description.trim(),
      });

      alert('Income added successfully');
      setAmount('');
      setDescription('');
      setShowAddIncome(false);
      await fetchIncomeData();
      // Refresh dashboard data (also uses cookie-based auth)
      await getDashboardData().catch(() => null);
    } catch (err: any) {
      // If it's a 401, the axios interceptor will handle redirect
      if (err?.response?.status !== 401) {
        setSubmitError('Unable to add income. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthlyIncomeValue = Number(intelligence?.monthlyIncome || 0);
  const monthlyIncomeNote = monthlyIncomeValue
    ? 'Based on your recent income patterns'
    : 'Start adding income to unlock AI patterns';

  const reliableSource =
    intelligence?.mostReliableSource || 'Not enough data yet';
  const stabilityLabel = (
    intelligence?.incomeStability || 'Unknown'
  ).toString();
  const stabilityKey = stabilityLabel.toLowerCase();
  const stabilityTextClass = stabilityClassMap[stabilityKey] || 'text-text';
  const stabilityDotClass = stabilityDotMap[stabilityKey] || 'bg-pastel-tan';

  const rawInsights: any[] = intelligence?.aiIncomeInsights || [];
  const aiInsights: IncomeInsight[] = rawInsights.map((entry) =>
    typeof entry === 'string'
      ? {
          type: 'summary',
          title: 'Income update',
          ai_noticing: entry,
        }
      : entry
  );
  const incomeSources: any[] = intelligence?.incomeSources || [];

  const formatInsightDate = (dateValue?: string) => {
    if (!dateValue) return null;
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-pastel-beige">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          <div className="mb-2">
            <h1 className="text-2xl md:text-3xl font-semibold text-text mb-2">
              My Money (Income Intelligence)
            </h1>
            <p className="text-sm text-text/50">
              Understand, predict, and optimize how you earn
            </p>
          </div>

          {isLoading ? (
            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/60">
                Loading income intelligence...
              </p>
            </div>
          ) : error ? (
            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-rose-200">
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
                  <p className="text-sm text-text/50 mb-2">
                    Estimated Monthly Income
                  </p>
                  <p className="text-3xl font-semibold text-text mb-1">
                    {monthlyIncomeValue
                      ? formatCurrency(monthlyIncomeValue)
                      : '₹0'}
                  </p>
                  <p className="text-xs text-text/40">{monthlyIncomeNote}</p>
                </div>

                <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
                  <p className="text-sm text-text/50 mb-2">
                    Most Reliable Source
                  </p>
                  <p className="text-3xl font-semibold text-text mb-1">
                    {reliableSource}
                  </p>
                  <p className="text-xs text-text/40">
                    Top-performing source this month
                  </p>
                </div>

                <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
                  <p className="text-sm text-text/50 mb-2">Income Stability</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-3xl font-semibold ${stabilityTextClass}`}
                    >
                      {stabilityLabel}
                    </span>
                    <span
                      className={`w-3 h-3 rounded-full ${stabilityDotClass}`}
                    ></span>
                  </div>
                  <p className="text-xs text-text/40">
                    Based on consistency & frequency
                  </p>
                </div>
              </div>

              {/* AI coach */}
              <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
                <h2 className="text-xl font-semibold text-text mb-4">
                  AI Income Coach is noticing
                </h2>
                {aiInsights.length === 0 ? (
                  <p className="text-sm text-text/60">
                    AI is still learning your income pattern.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {aiInsights.map((insight, idx) => {
                      const {
                        title: insightTitle = 'Income insight',
                        ai_noticing: noticing = 'Insight available',
                        positive,
                        improvement,
                        action,
                        reasonSummary = [],
                        level,
                        createdAt,
                      } = insight || {};
                      const insightDate = formatInsightDate(createdAt);

                      return (
                        <li
                          key={`${insightTitle}-${idx}`}
                          className="bg-pastel-beige/60 rounded-2xl p-4 border border-pastel-tan/20 text-sm text-text"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-base font-semibold text-text">
                              {insightTitle}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-text/60">
                              {level && (
                                <span className="px-2 py-0.5 rounded-full bg-white/70 border border-pastel-tan/40 text-[11px] uppercase tracking-wide">
                                  {level}
                                </span>
                              )}
                              {insightDate && <span>{insightDate}</span>}
                            </div>
                          </div>
                          <p className="text-sm text-text/80">{noticing}</p>

                          {reasonSummary.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {reasonSummary.map((reason, reasonIdx) => (
                                <p
                                  key={`${reason}-${reasonIdx}`}
                                  className="text-xs text-text/70"
                                >
                                  • {reason}
                                </p>
                              ))}
                            </div>
                          )}

                          {positive && (
                            <p className="text-xs text-emerald-600 mt-2">
                              <span className="font-semibold">Positive:</span>{' '}
                              {positive}
                            </p>
                          )}

                          {improvement && (
                            <p className="text-xs text-amber-700 mt-1">
                              <span className="font-semibold">Improvement:</span>{' '}
                              {improvement}
                            </p>
                          )}

                          {action && (
                            <p className="text-xs text-text mt-1">
                              <span className="font-semibold">Action:</span>{' '}
                              {action}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Income sources */}
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-text mb-4">
                  Your Income Sources
                </h2>
                {incomeSources.length === 0 ? (
                  <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
                    <p className="text-sm text-text/60">
                      No income sources detected yet. Start adding income to
                      help Fintastic map your earning pattern.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {incomeSources.map((source, index) => (
                      <div
                        key={
                          source?.id || `${source?.name || 'source'}-${index}`
                        }
                        className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 hover:shadow-soft-lg transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg font-semibold text-text">
                            {source?.name || source?.label || 'Income Source'}
                          </h3>
                          <span
                            className={`text-xs px-3 py-1 rounded-full ${
                              source?.type === 'Primary'
                                ? 'bg-pastel-green/30 text-text'
                                : 'bg-pastel-tan/30 text-text/70'
                            }`}
                          >
                            {source?.type || 'Secondary'}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-text/50 mb-1">
                              Monthly average range
                            </p>
                            <p className="text-lg font-semibold text-text">
                              {source?.monthlyRange ||
                                formatCurrency(source?.averageAmount)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-text/50 mb-1">
                              Best earning days
                            </p>
                            <p className="text-sm text-text">
                              {source?.bestDays ||
                                source?.bestWindow ||
                                'Not enough data'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-text/50 mb-1">Pattern</p>
                            <p className="text-sm text-text">
                              {source?.pattern ||
                                source?.insight ||
                                'Stable pattern'}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-pastel-tan/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  source?.stability === 'High'
                                    ? 'bg-emerald-500'
                                    : source?.stability === 'Low'
                                      ? 'bg-rose-500'
                                      : 'bg-amber-500'
                                }`}
                              ></span>
                              <p className="text-xs text-text/50">
                                Stability: {source?.stability || 'Unknown'}
                              </p>
                            </div>
                            <p className="text-xs text-text/60 italic">
                              {source?.recommendation ||
                                'Keep this stream active'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add income */}
              <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
                {!showAddIncome ? (
                  <button
                    onClick={() => setShowAddIncome(true)}
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
                    <span className="text-sm font-medium">Add income</span>
                  </button>
                ) : (
                  <form className="space-y-4" onSubmit={handleAddIncome}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-text">
                        Add Income
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddIncome(false);
                          setSubmitError(null);
                        }}
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
                          Amount
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30"
                          placeholder="Enter amount"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-text/60 mb-2">
                          Description
                        </label>
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30"
                          placeholder="e.g. Got new toy"
                        />
                      </div>
                    </div>

                    {submitError && (
                      <p className="text-xs text-rose-600">{submitError}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-3 rounded-xl bg-pastel-green/40 text-text font-medium hover:bg-pastel-green/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmitting ? 'Adding…' : 'Add income'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddIncome(false);
                          setSubmitError(null);
                        }}
                        className="px-4 py-3 rounded-xl border border-pastel-tan/30 text-text hover:bg-pastel-orange/20 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}

          <Link
            to="/ai"
            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary via-primary to-pastel-blue text-white shadow-soft-lg hover:shadow-soft-lg hover:scale-110 transition-all duration-300 flex items-center justify-center group z-50 overflow-hidden"
            title="Talk to your finance coach"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-pastel-blue/50 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-pastel-blue rounded-full"></div>
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
            <span className="hidden md:block absolute right-full mr-4 px-4 py-2 bg-text/95 backdrop-blur-sm text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-soft-lg pointer-events-none">
              Talk to your finance coach
              <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-text/95 rotate-45"></span>
            </span>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
