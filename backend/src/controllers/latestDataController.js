import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import { getUserStatsInternal } from '../utils/getUserStats.internal.js';
import { getActiveAlerts } from '../utils/alert.utils.js';
import { getBehaviorProfile } from '../utils/behavior.utils.js';

/**
 * Get latest comprehensive financial data for AI/chat agent
 * Consolidates: stats, goals, alerts, behavior, transactions, income, expenses, savings, investments
 */
export const getLatestFinancialData = async (req, res) => {
  try {
    // Support internal access (from AI service) or authenticated user
    let userId;
    
    if (req.headers['x-internal-access'] === 'true') {
      // Internal access - get userId from query param
      userId = req.query.userId;
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'userId query parameter required for internal access' 
        });
      }
    } else {
      // Authenticated user access
      userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Unauthorized - authentication required' 
        });
      }
    }

    // Fetch all data in parallel
    const [stats, goals, alerts, behaviorProfile, recentTransactions] = await Promise.all([
      getUserStatsInternal(userId),
      Goal.find({ userId }).lean(),
      getActiveAlerts(userId),
      getBehaviorProfile(userId),
      Transaction.find({ userId })
        .sort({ occurredAt: -1 })
        .limit(30)
        .lean()
    ]);

    // Calculate income breakdown
    const incomes = recentTransactions.filter(tx => tx.type === 'income');
    const expenses = recentTransactions.filter(tx => tx.type === 'expense');
    const savings = recentTransactions.filter(tx => tx.type === 'saving');
    const investments = recentTransactions.filter(tx => tx.type === 'investment');

    const incomeBreakdown = {
      total: incomes.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      count: incomes.length,
      byCategory: {},
      recent: incomes.slice(0, 5).map(tx => ({
        amount: tx.amount,
        category: tx.category,
        date: tx.occurredAt || tx.createdAt,
        note: tx.note
      }))
    };

    incomes.forEach(tx => {
      const cat = tx.category || 'Other';
      incomeBreakdown.byCategory[cat] = (incomeBreakdown.byCategory[cat] || 0) + (tx.amount || 0);
    });

    const expenseBreakdown = {
      total: expenses.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      count: expenses.length,
      byCategory: {},
      recent: expenses.slice(0, 5).map(tx => ({
        amount: tx.amount,
        category: tx.category,
        date: tx.occurredAt || tx.createdAt,
        note: tx.note
      }))
    };

    expenses.forEach(tx => {
      const cat = tx.category || 'Other';
      expenseBreakdown.byCategory[cat] = (expenseBreakdown.byCategory[cat] || 0) + (tx.amount || 0);
    });

    const savingsBreakdown = {
      total: savings.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      count: savings.length,
      byCategory: {},
      recent: savings.slice(0, 5).map(tx => ({
        amount: tx.amount,
        category: tx.category,
        date: tx.occurredAt || tx.createdAt,
        note: tx.note
      }))
    };

    savings.forEach(tx => {
      const cat = tx.category || 'Other';
      savingsBreakdown.byCategory[cat] = (savingsBreakdown.byCategory[cat] || 0) + (tx.amount || 0);
    });

    const investmentBreakdown = {
      total: investments.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      count: investments.length,
      byCategory: {},
      recent: investments.slice(0, 5).map(tx => ({
        amount: tx.amount,
        category: tx.category,
        date: tx.occurredAt || tx.createdAt,
        note: tx.note
      }))
    };

    investments.forEach(tx => {
      const cat = tx.category || 'Other';
      investmentBreakdown.byCategory[cat] = (investmentBreakdown.byCategory[cat] || 0) + (tx.amount || 0);
    });

    // Format goals
    const formattedGoals = goals.map(goal => ({
      id: goal._id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount || 0,
      progress: goal.targetAmount > 0 
        ? Math.round(((goal.currentAmount || 0) / goal.targetAmount) * 100) 
        : 0,
      deadline: goal.deadline,
      priority: goal.priority,
      status: (goal.currentAmount || 0) >= goal.targetAmount ? 'completed' : 'active'
    }));

    // Format alerts
    const formattedAlerts = alerts.map(alert => ({
      id: alert._id,
      scope: alert.scope,
      areaKey: alert.areaKey,
      level: alert.level,
      title: alert.title,
      page: alert.page,
      lastTriggeredAt: alert.lastTriggeredAt,
      meta: alert.meta || {}
    }));

    // Response
    res.json({
      success: true,
      data: {
        stats: {
          monthlyIncome: stats.monthlyIncome || 0,
          monthlyExpense: stats.monthlyExpense || 0,
          savingsRate: stats.savingsRate || 0,
          investmentRate: stats.investmentRate || 0,
          netWorth: stats.netWorth || 0,
          liquidSavings: stats.liquidSavings || 0,
          investedAmount: stats.investedAmount || 0,
          expenseTrend: stats.expenseTrend || 'stable',
          incomeTrend: stats.incomeTrend || 'stable',
          categoryPercents: stats.categoryPercents || {},
          goalStats: stats.goalStats || []
        },
        income: incomeBreakdown,
        expenses: expenseBreakdown,
        savings: savingsBreakdown,
        investments: investmentBreakdown,
        goals: formattedGoals,
        alerts: formattedAlerts,
        behaviorProfile: behaviorProfile || {
          disciplineScore: 50,
          impulseScore: 50,
          consistencyIndex: 50,
          riskIndex: 50,
          savingStreak: 0
        },
        recentTransactions: recentTransactions.slice(0, 10).map(tx => ({
          id: tx._id,
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          note: tx.note,
          date: tx.occurredAt || tx.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('getLatestFinancialData error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest financial data',
      error: error.message
    });
  }
};

