/**
 * DATA CONFIDENCE LOGIC
 * 
 * Determines how reliable the financial stats are.
 * Used by AI to decide how strong conclusions can be.
 */

export function getDataConfidence(stats) {
  if (!stats) return 'low';

  const txCount = stats.totalTransactions || 0;
  const daysTracked = stats.daysTracked || 0;

  // Too few transactions
  if (txCount < 10) return 'low';
  
  // Too few days tracked
  if (daysTracked < 7) return 'low';

  // If there is literally no income and no expense, it's too early
  if ((stats.monthlyIncome || 0) === 0 && (stats.monthlyExpense || 0) === 0) {
    return 'low';
  }

  // If mostly from onboarding, confidence is low
  if (stats.mostlyFromOnboarding) return 'low';

  // Good data - enough transactions and days
  if (txCount >= 20 && daysTracked >= 14) return 'high';

  // Medium confidence - some data but not enough
  return 'medium';
}

