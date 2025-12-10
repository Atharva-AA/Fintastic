/**
 * Classifies an alert into a specific financial area (scope) and determines
 * which page it should appear on. Enhanced to properly distinguish between
 * income, expense, saving, and investment scopes with goal prediction support.
 * 
 * @param {Object} payload - Transaction and decision data
 * @returns {Object} Classification with scope, areaKey, page, and title
 */
export function classifyAlertArea(payload) {
  // Handle both object payload and separate parameters
  let decision = payload;
  let tx = null;
  let goals = [];

  if (payload && typeof payload === 'object') {
    if ('decision' in payload) {
      decision = payload.decision;
      tx = payload.transaction;
      goals = payload.goals || [];
    } else if ('type' in payload) {
      // payload is the transaction itself
      tx = payload;
      decision = payload.decision || {};
      goals = payload.goals || [];
    } else {
      // payload is the decision, need transaction separately
      decision = payload;
    }
  }

  const fallback = {
    scope: 'overall',
    areaKey: 'overall_risk',
    page: 'dashboard',
    title: 'Overall financial behavior',
    metadata: {}
  };

  if (!decision || !tx || !tx.type) return fallback;

  const type = tx.type.toLowerCase();
  const rawCategory = tx.category || 'general';
  const category = rawCategory.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const amount = tx.amount || 0;

  const flags = decision.behavioralFlags || {};

  // ============================================
  // PRIORITY 1: GOAL IMPACT (Goals Page)
  // ============================================
  if (flags.goalImpact || flags.milestone) {
    // Find affected goal for better context
    let affectedGoal = null;
    if (goals && goals.length > 0) {
      affectedGoal = goals.find(g => {
        const goalNameLower = (g.name || '').toLowerCase();
        const categoryLower = category.toLowerCase();
        return goalNameLower.includes(categoryLower) || categoryLower.includes(goalNameLower);
      }) || goals[0]; // Fallback to first goal
    }

    return {
      scope: 'goal',
      areaKey: affectedGoal ? `goal_${affectedGoal._id}` : `goal_${category}`,
      page: 'goals',
      title: affectedGoal ? `${affectedGoal.name} Goal Progress` : 'Goal-related financial behavior',
      metadata: {
        goalId: affectedGoal?._id,
        goalName: affectedGoal?.name,
        needsPrediction: true, // Signal to AI to generate prediction
        milestone: flags.milestone || false
      }
    };
  }

  // ============================================
  // PRIORITY 2: BEHAVIORAL ANOMALIES (Type-Specific Pages)
  // ============================================
  if (type === 'expense') {
    const anomaly = ['microLeak', 'behaviorDrift', 'spendingBurst'].find(
      (k) => flags[k]
    );

    if (anomaly) {
      return {
        scope: 'expense',
        areaKey: `behavior_${anomaly}_${category}`,
        page: 'expenses',
        title: `Behavioral spending pattern: ${rawCategory}`,
        metadata: {
          anomalyType: anomaly,
          category: rawCategory,
          amount: amount
        }
      };
    }
  }

  // ============================================
  // PRIORITY 3: NATURAL TYPE MAPPING
  // ============================================
  
  // EXPENSE ALERTS
  if (type === 'expense') {
    return {
      scope: 'expense',
      areaKey: `expense_${category}`,
      page: 'expenses',
      title: `Expense alert – ${rawCategory}`,
      metadata: {
        category: rawCategory,
        amount: amount,
        isRecurring: tx.subtype === 'recurring' || tx.subtype === 'subscription'
      }
    };
  }

  // INCOME ALERTS
  if (type === 'income') {
    // Detect gig/freelance income for special handling
    const gigCategories = ['freelance', 'gig', 'contractor', 'self-employed', 'consulting', 'commission', 'tips', 'side hustle'];
    const isGigIncome = gigCategories.some(gig => 
      category.includes(gig) || rawCategory.toLowerCase().includes(gig)
    );

    return {
      scope: 'income',
      areaKey: `income_${category}`,
      page: 'income',
      title: isGigIncome ? `Gig income: ${rawCategory}` : `Income pattern: ${rawCategory}`,
      metadata: {
        category: rawCategory,
        amount: amount,
        isGigIncome: isGigIncome,
        isRecurring: tx.subtype === 'recurring' || tx.subtype === 'salary'
      }
    };
  }

  // SAVING ALERTS
  if (type === 'saving') {
    // Check if saving is linked to a goal
    let linkedGoal = null;
    if (goals && goals.length > 0) {
      linkedGoal = goals.find(g => {
        const goalNameLower = (g.name || '').toLowerCase();
        const categoryLower = category.toLowerCase();
        return goalNameLower.includes(categoryLower) || categoryLower.includes(goalNameLower);
      });
    }

    return {
      scope: 'saving',
      areaKey: `saving_${category}`,
      page: 'savings',
      title: linkedGoal ? `Saving for ${linkedGoal.name}` : `Saving behavior: ${rawCategory}`,
      metadata: {
        category: rawCategory,
        amount: amount,
        linkedGoalId: linkedGoal?._id,
        linkedGoalName: linkedGoal?.name,
        isEmergencyFund: category.includes('emergency') || rawCategory.toLowerCase().includes('emergency')
      }
    };
  }

  // INVESTMENT ALERTS
  if (type === 'investment') {
    // Detect investment type
    const investmentTypes = {
      stocks: ['stock', 'equity', 'share'],
      mutualFunds: ['mutual', 'fund', 'sip'],
      crypto: ['crypto', 'bitcoin', 'ethereum'],
      gold: ['gold', 'silver'],
      realEstate: ['property', 'real estate', 'land']
    };

    let investmentType = 'general';
    for (const [type, keywords] of Object.entries(investmentTypes)) {
      if (keywords.some(keyword => category.includes(keyword) || rawCategory.toLowerCase().includes(keyword))) {
        investmentType = type;
        break;
      }
    }

    return {
      scope: 'investment',
      areaKey: `investment_${category}`,
      page: 'investments',
      title: `Investment: ${rawCategory}`,
      metadata: {
        category: rawCategory,
        amount: amount,
        investmentType: investmentType,
        isRecurring: tx.subtype === 'recurring' || tx.subtype === 'sip'
      }
    };
  }

  // Fallback for unknown types
  return fallback;
}
