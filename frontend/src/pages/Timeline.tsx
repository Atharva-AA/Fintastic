import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

/**
 * Timeline Page - Activity Timeline
 * Complete financial event feed showing all activities
 */

interface TimelineEvent {
  id: number;
  title: string;
  range?: string;
  type: 'Income' | 'Expense' | 'Goal' | 'Investment' | 'AI';
  category: string;
  timestamp: string;
  icon: JSX.Element;
}

export default function Timeline() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Income', 'Expense', 'Goals', 'Investments', 'AI'];

  // Timeline events grouped by date
  const timelineData = {
    Today: [
      {
        id: 1,
        title: 'Expense added',
        category: 'Food',
        range: '₹1,000 – ₹3,000',
        type: 'Expense' as const,
        timestamp: '2:30 PM',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
      {
        id: 2,
        title: 'AI suggested reducing Swiggy by ₹300/week',
        category: 'Spending Insight',
        type: 'AI' as const,
        timestamp: '11:45 AM',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ),
      },
    ],
    Yesterday: [
      {
        id: 3,
        title: 'Freelance income added',
        category: 'Freelance',
        range: '₹10,000 – ₹25,000',
        type: 'Income' as const,
        timestamp: '4:15 PM',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        id: 4,
        title: '10% moved to Emergency Fund',
        category: 'Savings',
        range: '₹1,000 – ₹2,500',
        type: 'Goal' as const,
        timestamp: '4:20 PM',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        ),
      },
    ],
    'Last Week': [
      {
        id: 5,
        title: 'New goal created',
        category: 'Laptop',
        range: '₹60,000 – ₹80,000',
        type: 'Goal' as const,
        timestamp: 'Nov 17',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        ),
      },
      {
        id: 6,
        title: 'Investment added',
        category: 'Mutual Fund',
        range: '₹50,000 – ₹1,00,000',
        type: 'Investment' as const,
        timestamp: 'Nov 16',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
      },
    ],
  };

  // Filter events
  const getFilteredEvents = () => {
    if (activeFilter === 'All') return timelineData;

    const filtered: typeof timelineData = { Today: [], Yesterday: [], 'Last Week': [] };
    
    Object.entries(timelineData).forEach(([period, events]) => {
      filtered[period as keyof typeof timelineData] = events.filter(
        (event) => event.type === activeFilter || (activeFilter === 'Goals' && event.type === 'Goal')
      );
    });

    return filtered;
  };

  const filteredData = getFilteredEvents();

  // Type color mapping
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Income':
        return 'bg-pastel-green';
      case 'Expense':
        return 'bg-pastel-orange';
      case 'Goal':
        return 'bg-pastel-blue';
      case 'Investment':
        return 'bg-pastel-tan';
      case 'AI':
        return 'bg-pastel-green';
      default:
        return 'bg-pastel-tan';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-pastel-beige">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-text mb-2">
                Activity Timeline
              </h1>
              <p className="text-sm text-text/50">
                Your complete financial story
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                  activeFilter === filter
                    ? 'bg-pastel-green/40 text-text font-medium shadow-soft'
                    : 'bg-white/80 text-text/60 hover:bg-pastel-orange/20 border border-pastel-tan/20'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Timeline Feed */}
          <div className="space-y-6">
            {Object.entries(filteredData).map(([period, events]) => {
              if (events.length === 0) return null;
              
              return (
                <div key={period}>
                  <h2 className="text-lg font-semibold text-text mb-4">{period}</h2>
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="bg-white/80 rounded-2xl p-4 shadow-soft border border-pastel-tan/20 hover:shadow-soft-lg transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${getTypeColor(event.type)} flex items-center justify-center text-text/70`}>
                            {event.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-1">
                              <h3 className="text-base font-medium text-text">
                                {event.title}
                              </h3>
                              <span className="text-xs text-text/40 flex-shrink-0">
                                {event.timestamp}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-sm text-text/60">{event.category}</span>
                              {event.range && (
                                <>
                                  <span className="text-text/30">•</span>
                                  <span className="text-sm text-text/60">{event.range}</span>
                                </>
                              )}
                              <span className="text-text/30">•</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(event.type)} text-text/70`}>
                                {event.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating AI Coach Button */}
      <Link
        to="/ai"
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary via-primary to-pastel-blue text-white shadow-soft-lg hover:shadow-soft-lg hover:scale-110 transition-all duration-300 flex items-center justify-center group z-50 overflow-hidden"
        title="Ask Fintastic AI"
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
          Ask Fintastic AI
          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-text/95 rotate-45"></span>
        </span>
      </Link>
    </Layout>
  );
}
