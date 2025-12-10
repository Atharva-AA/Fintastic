import { useState } from 'react';
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout Component
 * Provides consistent layout with sidebar for all pages
 */
export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-pastel-beige dark:bg-gray-900 flex transition-colors duration-200">
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white/80 backdrop-blur-sm shadow-soft border border-pastel-tan/20 hover:bg-pastel-orange/20 transition-colors"
        >
          <svg
            className="w-6 h-6 text-text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
