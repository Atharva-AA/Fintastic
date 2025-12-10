import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Sidebar Component
 * Reusable navigation sidebar for all pages
 */
export default function Sidebar() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Navigation items
  const navItems = [
    {
      path: '/dashboard',
      label: 'Overview',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      path: '/income',
      label: 'My Money',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      path: '/expenses',
      label: 'Spending',
      icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
      path: '/goals',
      label: 'Goals & Plans',
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    },
    {
      path: '/investments',
      label: 'Investments',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    },
    {
      path: '/ai',
      label: 'Fintastic Coach',
      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
    },
    {
      path: '/finance-tutor',
      label: 'Finance Tutor',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    },
    {
      path: '/timeline',
      label: 'Activity Timeline',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      path: '/profile',
      label: 'Profile & Settings',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    },
    {
      path: '/',
      label: 'Log out',
      icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${
          isSidebarOpen ? 'w-64' : 'w-20 lg:w-20'
        } bg-pastel-cream dark:bg-gray-800 border-r border-pastel-tan/30 dark:border-gray-700 transition-all duration-300 flex-shrink-0 fixed lg:static h-screen z-40`}
      >
        <div className="h-full flex flex-col p-6">
          {/* Profile Card */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pastel-blue to-pastel-green dark:from-blue-600 dark:to-green-600 flex items-center justify-center text-xl font-semibold text-text/70 dark:text-white/70 flex-shrink-0">
                KC
              </div>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text dark:text-white text-sm truncate">
                    Keshav
                  </p>
                  <p className="text-xs text-text/50 dark:text-gray-400 truncate">
                    Finance Profile
                  </p>
                </div>
              )}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden lg:flex ml-auto p-1.5 rounded-lg hover:bg-pastel-orange/20 transition-colors flex-shrink-0"
                title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <svg
                  className="w-4 h-4 text-text/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={isSidebarOpen ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <div className="mb-4">
            <button
              onClick={toggleDarkMode}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                isSidebarOpen ? 'justify-between' : 'justify-center'
              } ${
                isDarkMode
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
              title={
                isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'
              }
            >
              {isDarkMode ? (
                <>
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                  {isSidebarOpen && <span className="text-sm">Dark Mode</span>}
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  {isSidebarOpen && <span className="text-sm">Light Mode</span>}
                </>
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-pastel-green/40 dark:bg-green-700/40 text-text dark:text-white font-semibold shadow-soft'
                      : 'text-text/60 dark:text-gray-300 hover:bg-pastel-orange/20 dark:hover:bg-gray-700 hover:text-text dark:hover:text-white'
                  } ${!isSidebarOpen ? 'justify-center' : ''}`}
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.icon}
                    />
                  </svg>
                  {isSidebarOpen && (
                    <span className="text-sm truncate flex-1">
                      {item.label}
                    </span>
                  )}
                  {isActive && isSidebarOpen && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-pastel-green flex-shrink-0"></span>
                  )}
                  {isActive && !isSidebarOpen && (
                    <span className="absolute right-2 w-2 h-2 rounded-full bg-pastel-green"></span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
