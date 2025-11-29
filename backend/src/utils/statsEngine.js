import Transaction from '../models/Transaction.js';

/**
 * STANDARDIZED STATS ENGINE
 * 
 * Single source of truth for financial statistics.
 * ONLY uses real transactions - never mixes onboarding data.
 * 
 * This ensures:
 * - Accurate monthly calculations
 * - No pollution from onboarding estimates
 * - Consistent stats across all controllers
 */
export async function getStandardizedStats(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Get ONLY real transactions from current month
  // Exclude onboarding transactions by checking source
  const tx = await Transaction.find({
    userId,
    occurredAt: { $gte: startOfMonth, $lt: startOfNextMonth },
    source: { $ne: 'onboarding' }, // Exclude onboarding transactions
  }).lean();

  const totalTransactions = tx.length;

  // Unique days with at least one transaction
  const dayKeysSet = new Set(
    tx.map((t) => new Date(t.occurredAt || t.createdAt).toISOString().slice(0, 10))
  );
  const daysTracked = dayKeysSet.size;

  let income = 0;
  let expense = 0;
  let saving = 0;
  let investment = 0;
  let sumAbsTx = 0;

  for (const t of tx) {
    sumAbsTx += Math.abs(t.amount || 0);

    if (t.type === 'income') income += t.amount || 0;
    if (t.type === 'expense') expense += t.amount || 0;
    if (t.type === 'saving') saving += t.amount || 0;
    if (t.type === 'investment') investment += t.amount || 0;
  }

  const avgTransaction = totalTransactions > 0
    ? sumAbsTx / totalTransactions
    : 0;

  const monthlyIncome = income;
  const monthlyExpense = expense;
  const monthlySaving = saving;
  const monthlyInvestment = investment;

  const savingsRate =
    monthlyIncome > 0 ? (monthlySaving / monthlyIncome) * 100 : 0;
  const investmentRate =
    monthlyIncome > 0 ? (monthlyInvestment / monthlyIncome) * 100 : 0;
  const expenseRatio =
    monthlyIncome > 0 ? (monthlyExpense / monthlyIncome) * 100 : 100;
  const netFlow = monthlyIncome - monthlyExpense;

  // Clamp extreme values to avoid explosions
  const clampPercent = (v) => {
    if (!isFinite(v) || v < 0) return 0;
    if (v > 500) return 500;
    return Math.round(v * 10) / 10;
  };

  // Check if mostly from onboarding (fallback if no real transactions)
  const onboardingTx = await Transaction.countDocuments({
    userId,
    source: 'onboarding',
  });
  const mostlyFromOnboarding = totalTransactions === 0 && onboardingTx > 0;

  return {
    totalTransactions,
    daysTracked,
    monthlyIncome: Math.round(monthlyIncome),
    monthlyExpense: Math.round(monthlyExpense),
    monthlySaving: Math.round(monthlySaving),
    monthlyInvestment: Math.round(monthlyInvestment),
    savingsRate: clampPercent(savingsRate),
    investmentRate: clampPercent(investmentRate),
    expenseRatio: clampPercent(expenseRatio),
    netFlow: Math.round(netFlow),
    avgTransaction: Math.round(avgTransaction * 100) / 100,
    mostlyFromOnboarding,
  };
}

