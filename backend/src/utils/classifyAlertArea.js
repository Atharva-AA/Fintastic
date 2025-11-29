export function classifyAlertArea(decisionOrPayload, transaction) {
  let decision = decisionOrPayload;
  let tx = transaction;

  if (
    transaction === undefined &&
    decisionOrPayload &&
    typeof decisionOrPayload === 'object' &&
    ('decision' in decisionOrPayload || 'transaction' in decisionOrPayload)
  ) {
    decision = decisionOrPayload.decision;
    tx = decisionOrPayload.transaction;
  }

  const fallback = {
    scope: 'overall',
    areaKey: 'overall_risk',
    page: 'dashboard',
    title: 'Overall financial behavior',
  };

  if (!decision || !tx || !tx.type) return fallback;

  const type = tx.type.toLowerCase();
  const rawCategory = tx.category || 'general';
  const category = rawCategory.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  const flags = decision.behavioralFlags || {};

  // 1. GOAL impact always wins
  if (flags.goalImpact || flags.milestone) {
    return {
      scope: 'goal',
      areaKey: `goal_${category}`,
      page: 'goals',
      title: 'Goal-related financial behavior',
    };
  }

  // 2. Behavioral anomalies (always expense)
  if (type === 'expense') {
    const anomaly = ['microLeak', 'behaviorDrift', 'spendingBurst'].find(
      (k) => flags[k]
    );

    if (anomaly) {
      return {
        scope: 'expense',
        areaKey: `behavior_${anomaly}_${category}`,
        page: 'expenses',
        title: 'Behavioral spending pattern detected',
      };
    }
  }

  // 3. Natural type mapping (NO POSITIVE override)
  if (type === 'expense') {
    return {
      scope: 'expense',
      areaKey: `expense_${category}`,
      page: 'expenses',
      title: `Expense alert – ${rawCategory}`,
    };
  }

  if (type === 'income') {
    return {
      scope: 'income',
      areaKey: `income_${category}`,
      page: 'income',
      title: 'Income pattern detected',
    };
  }

  if (type === 'saving') {
    return {
      scope: 'saving',
      areaKey: `saving_${category}`,
      page: 'savings',
      title: 'Saving behavior detected',
    };
  }

  if (type === 'investment') {
    return {
      scope: 'investment',
      areaKey: `investment_${category}`,
      page: 'investments',
      title: 'Investment behavior detected',
    };
  }

  return fallback;
}
