/**
 * Utility functions for dark mode class names
 * These can be used to ensure consistent dark mode styling
 */

export const darkModeClasses = {
  // Backgrounds
  bgMain: 'bg-pastel-beige dark:bg-gray-900',
  bgCard: 'bg-white/80 dark:bg-gray-800/80',
  bgCardSolid: 'bg-white dark:bg-gray-800',

  // Text
  textMain: 'text-text dark:text-white',
  textMuted: 'text-text/60 dark:text-gray-400',
  textMutedLight: 'text-text/50 dark:text-gray-500',

  // Borders
  borderDefault: 'border-pastel-tan/20 dark:border-gray-700',
  borderLight: 'border-pastel-tan/30 dark:border-gray-600',

  // Buttons
  buttonPrimary:
    'bg-pastel-green/40 dark:bg-green-700/40 text-text dark:text-white',
  buttonSecondary:
    'bg-white/80 dark:bg-gray-700 text-text dark:text-white hover:bg-pastel-orange/20 dark:hover:bg-gray-600',
};
