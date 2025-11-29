import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

/*
Onboarding baseline:
- NOT real financial behaviour.
- Used only for expectations & AI hints.
- Never mixed into monthly stats calculations.
*/

/**
 * Get onboarding baseline data as a separate reference point
 * This is for comparison and expectations only, NOT for stats
 */
export async function getOnboardingBaseline(userId) {
  const user = await User.findById(userId).lean();
  
  if (!user) {
    return {
      hasBaseline: false,
      expectedMonthlyIncomeMin: 0,
      expectedMonthlyIncomeMax: 0,
      estimatedSavingsPotentialMin: 0,
      estimatedSavingsPotentialMax: 0,
      riskLevel: 'medium',
      jobType: 'unknown',
      confidence: 0,
    };
  }

  // Get onboarding transactions to calculate baseline
  const onboardingTx = await Transaction.find({
    userId,
    source: 'onboarding',
  }).lean();

  if (onboardingTx.length === 0) {
    return {
      hasBaseline: false,
      expectedMonthlyIncomeMin: 0,
      expectedMonthlyIncomeMax: 0,
      estimatedSavingsPotentialMin: 0,
      estimatedSavingsPotentialMax: 0,
      riskLevel: user.riskLevel || 'medium',
      jobType: user.occupation?.[0] || 'unknown',
      confidence: 0,
    };
  }

  // Calculate baseline from onboarding transactions
  const onboardingIncome = onboardingTx
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  
  const onboardingExpense = onboardingTx
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  
  const onboardingSaving = onboardingTx
    .filter(tx => tx.type === 'saving')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  
  const onboardingInvestment = onboardingTx
    .filter(tx => tx.type === 'investment')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // Estimate ranges (baseline ± 20% for min/max)
  const expectedMonthlyIncomeMin = Math.round(onboardingIncome * 0.8);
  const expectedMonthlyIncomeMax = Math.round(onboardingIncome * 1.2);
  
  const estimatedSavingsPotentialMin = Math.round(onboardingSaving * 0.8);
  const estimatedSavingsPotentialMax = Math.round(onboardingSaving * 1.2);

  // Calculate confidence based on how complete onboarding is
  let confidence = 0.5; // Base confidence
  if (onboardingIncome > 0) confidence += 0.1;
  if (onboardingExpense > 0) confidence += 0.1;
  if (onboardingSaving > 0 || onboardingInvestment > 0) confidence += 0.1;
  if (user.riskLevel) confidence += 0.1;
  if (user.occupation && user.occupation.length > 0) confidence += 0.1;

  return {
    hasBaseline: true,
    expectedMonthlyIncomeMin,
    expectedMonthlyIncomeMax,
    estimatedSavingsPotentialMin,
    estimatedSavingsPotentialMax,
    riskLevel: user.riskLevel || 'medium',
    jobType: user.occupation?.[0] || 'unknown',
    confidence: Math.min(1.0, confidence),
    onboardingIncome,
    onboardingExpense,
    onboardingSaving,
    onboardingInvestment,
  };
}

