import { useState } from 'react';
import Layout from '../components/Layout';
import VideoLectures from '../components/tutor/VideoLectures';
import PaperTradingSimulator from '../components/tutor/PaperTradingSimulator';
import SIPCalculator from '../components/tutor/SIPCalculator';

export default function FinanceTutor() {
  const [activeTab, setActiveTab] = useState<'videos' | 'trading' | 'sip'>('videos');

  const tabs = [
    { id: 'videos' as const, label: 'Videos', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' },
    { id: 'trading' as const, label: 'Paper Trading Lab', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'sip' as const, label: 'SIP Calculator', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-pastel-beige dark:bg-gray-900">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {/* Hero Section */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-text dark:text-white mb-2">
              Finance Tutor
            </h1>
            <p className="text-text/70 dark:text-gray-300 text-lg">
              Learn finance with expert videos, practice trading, and plan investments
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-pastel-green/40 dark:bg-green-700/40 text-text dark:text-white font-semibold shadow-soft'
                    : 'bg-white/80 dark:bg-gray-800/80 text-text/60 dark:text-gray-300 hover:bg-pastel-orange/20 dark:hover:bg-gray-700 border border-pastel-tan/20 dark:border-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'videos' && <VideoLectures />}
            {activeTab === 'trading' && <PaperTradingSimulator />}
            {activeTab === 'sip' && <SIPCalculator />}
          </div>
        </div>
      </div>
    </Layout>
  );
}

