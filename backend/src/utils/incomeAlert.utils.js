import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';

/**
 * Analyze income transaction and determine if alert is needed
 * Smart filtering: only alert for significant events
 * 
 * @param {string} userId - User ID
 * @param {Object} transaction - Income transaction
 * @param {Object} stats - User financial stats
 * @param {Array} goals - User goals
 * @returns {Object} { shouldAlert, level, reasons, title, riskScore, positivityScore }
 */
export async function analyzeIncomeForAlert(userId, transaction, stats, goals = []) {
  const category = transaction.category || 'Other';
  const amount = transaction.amount || 0;
  const now = new Date();
  
  // Get historical income for this category (last 6 months)
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  const historicalIncome = await Transaction.find({
    userId,
    type: 'income',
    category,
    occurredAt: { $gte: sixMonthsAgo },
    _id: { $ne: transaction._id } // Exclude current transaction
  }).lean();

  const reasons = [];
  let level = 'POSITIVE';
  let riskScore = 0;
  let positivityScore = 0;
  let title = '';

  // ==========================================
  // 1. NEW INCOME SOURCE DETECTION
  // ==========================================
  if (historicalIncome.length === 0) {
    // First occurrence of this income source
    reasons.push(`New income source detected: ${category}`);
    reasons.push('Diversifying income streams improves financial stability');
    
    level = 'POSITIVE';
    positivityScore = 60;
    title = `New Income Source: ${category}`;
    
    console.log(`💰 [Income Alert] NEW SOURCE: ${category} - ₹${amount}`);
    
    return {
      shouldAlert: true,
      level,
      reasons,
      title,
      riskScore,
      positivityScore
    };
  }

  // ==========================================
  // 2. UNUSUAL AMOUNT DETECTION
  // ==========================================
  const amounts = historicalIncome.map(tx => tx.amount || 0);
  const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  const variance = ((amount - average) / average) * 100;

  // Bonus/Raise Detection (30% higher than average)
  if (variance >= 30) {
    const extraAmount = amount - average;
    reasons.push(`Income ${Math.round(variance)}% higher than usual - possible bonus or raise`);
    
    // Check if extra income can help achieve goals
    const activeGoals = goals.filter(g => {
      const remaining = (g.targetAmount || 0) - (g.currentAmount || 0);
      return remaining > 0 && remaining <= extraAmount * 2; // Within 2x of extra income
    });
    
    if (activeGoals.length > 0) {
      const goalName = activeGoals[0].name;
      reasons.push(`Extra ₹${Math.round(extraAmount)} can accelerate your ${goalName} goal`);
    }
    
    level = 'POSITIVE';
    positivityScore = 70;
    title = `Bonus/Raise Detected: ${category}`;
    
    console.log(`💰 [Income Alert] BONUS: ${category} - ₹${amount} (${variance.toFixed(1)}% higher)`);
    
    return {
      shouldAlert: true,
      level,
      reasons,
      title,
      riskScore,
      positivityScore
    };
  }

  // Income Drop Detection (30% lower than average)
  if (variance <= -30) {
    const dropAmount = average - amount;
    reasons.push(`Income dropped by ₹${Math.round(dropAmount)} vs average`);
    reasons.push('May impact your ability to meet monthly expenses');
    
    level = 'HIGH';
    riskScore = 60;
    title = `Income Drop Alert: ${category}`;
    
    console.log(`💰 [Income Alert] DROP: ${category} - ₹${amount} (${variance.toFixed(1)}% lower)`);
    
    return {
      shouldAlert: true,
      level,
      reasons,
      title,
      riskScore,
      positivityScore
    };
  }

  // ==========================================
  // 3. GOAL IMPACT DETECTION
  // ==========================================
  // Check if this income can complete a goal this month
  const completableGoals = goals.filter(g => {
    const remaining = (g.targetAmount || 0) - (g.currentAmount || 0);
    return remaining > 0 && remaining <= amount;
  });

  if (completableGoals.length > 0) {
    const goalName = completableGoals[0].name;
    const remaining = (completableGoals[0].targetAmount || 0) - (completableGoals[0].currentAmount || 0);
    
    reasons.push(`This income can complete your ${goalName} goal!`);
    reasons.push(`Only ₹${Math.round(remaining)} needed to reach your target`);
    
    level = 'POSITIVE';
    positivityScore = 80;
    title = `Goal Completion Opportunity: ${goalName}`;
    
    console.log(`💰 [Income Alert] GOAL IMPACT: Can complete ${goalName}`);
    
    return {
      shouldAlert: true,
      level,
      reasons,
      title,
      riskScore,
      positivityScore
    };
  }

  // ==========================================
  // 4. ROUTINE INCOME - SKIP
  // ==========================================
  // If amount is within ±10% of average and frequency is regular, skip
  if (Math.abs(variance) <= 10 && historicalIncome.length >= 2) {
    console.log(`💰 [Income Alert] SKIP: Routine income - ${category} ₹${amount} (variance: ${variance.toFixed(1)}%)`);
    
    return {
      shouldAlert: false,
      level: null,
      reasons: [],
      title: '',
      riskScore: 0,
      positivityScore: 0
    };
  }

  // Default: Skip if no significant event detected
  console.log(`💰 [Income Alert] SKIP: No significant event - ${category} ₹${amount}`);
  
  return {
    shouldAlert: false,
    level: null,
    reasons: [],
    title: '',
    riskScore: 0,
    positivityScore: 0
  };
}
