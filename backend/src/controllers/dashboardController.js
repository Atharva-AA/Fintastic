import axios from 'axios';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import FinancialReport from '../models/FinancialReport.js';
import AiAlert from '../models/AiAlert.js';
import GmailToken from '../models/GmailToken.js';

const CHROMA_SEARCH_URL =
  process.env.CHROMA_SEARCH_URL || 'http://localhost:8001/search-memory';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DASHBOARD_DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ALLOWED_MEMORY_TYPES = new Set([
  'daily_activity',
  'behavior_pattern',
  'decision_history',
]);

const getStartOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);
const getStartOfNextMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 1);

const getDayLabel = (date) => DAY_NAMES[date.getDay()];

const deriveTrend = (changePercent) => {
  if (changePercent > 10) return 'up';
  if (changePercent < -10) return 'down';
  return 'stable';
};

const sentenceExtractor = (content) => {
  if (!content) return [];
  return content
    .split(/[\n•\-]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 8)
    .map((line) => (line.endsWith('.') ? line : `${line}.`));
};

const fetchAiSuggestions = async (userId) => {
  try {
    const { data } = await axios.post(CHROMA_SEARCH_URL, {
      userId: userId.toString(),
      query:
        'financial coaching actionable insight recommendation suggestion improvement',
      topK: 8, // Increased to get more results
    });

    const matches = data?.matches || [];

    const suggestions = matches
      .filter((match) => ALLOWED_MEMORY_TYPES.has(match.metadata?.type))
      .flatMap((match) => sentenceExtractor(match.content))
      .slice(0, 5);

    if (suggestions.length) {
      console.log(
        `✅ Found ${suggestions.length} AI suggestions for dashboard`
      );
      return suggestions;
    }
  } catch (error) {
    console.log('⚠️ Chroma suggestions unavailable (non critical)');
  }

  return [
    'Shift ₹1,000 into your emergency fund this week.',
    'Review discretionary spends before the weekend.',
    'Invest ₹1,500 into your SIP to stay on track.',
    'Track one big goal today to build momentum.',
  ];
};

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const now = new Date();
    const startOfMonth = getStartOfMonth(now);
    const startOfNextMonth = getStartOfNextMonth(now);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Monthly transactions
    const monthlyTransactions = await Transaction.find({
      userId,
      occurredAt: { $gte: startOfMonth, $lt: startOfNextMonth },
    }).select('type amount occurredAt category');

    let totalIncomeThisMonth = 0;
    let totalSpentThisMonth = 0;
    let lastIncomeDate = null;
    const currentCategoryTotals = {};

    monthlyTransactions.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncomeThisMonth += tx.amount;
        if (!lastIncomeDate || tx.occurredAt > lastIncomeDate) {
          lastIncomeDate = tx.occurredAt;
        }
      }
      if (tx.type === 'expense') {
        totalSpentThisMonth += tx.amount;
        currentCategoryTotals[tx.category] =
          (currentCategoryTotals[tx.category] || 0) + tx.amount;
      }
    });

    const remainingBudget = totalIncomeThisMonth - totalSpentThisMonth;

    // Weekly spending graph (last 7 days expenses)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const weeklyExpenses = await Transaction.find({
      userId,
      type: 'expense',
      occurredAt: { $gte: sevenDaysAgo, $lte: now },
    }).select('amount occurredAt');

    const weeklyMap = DASHBOARD_DAY_ORDER.reduce((acc, day) => {
      acc[day] = 0;
      return acc;
    }, {});

    weeklyExpenses.forEach((tx) => {
      const dayLabel = getDayLabel(tx.occurredAt);
      if (weeklyMap[dayLabel] !== undefined) {
        weeklyMap[dayLabel] += tx.amount;
      }
    });

    const weeklySpendingGraph = DASHBOARD_DAY_ORDER.map((day) => ({
      day,
      amount: Math.round(weeklyMap[day] || 0),
    }));

    // AI suggestions
    const aiSuggestions = await fetchAiSuggestions(userId);

    // Top categories with previous month trend
    const previousMonthExpenses = await Transaction.find({
      userId,
      type: 'expense',
      occurredAt: { $gte: startOfPrevMonth, $lt: startOfMonth },
    }).select('amount category');

    const previousCategoryTotals = {};
    previousMonthExpenses.forEach((tx) => {
      previousCategoryTotals[tx.category] =
        (previousCategoryTotals[tx.category] || 0) + tx.amount;
    });

    const sortedCategories = Object.entries(currentCategoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([category, amount]) => {
        const previousAmount = previousCategoryTotals[category] || 0;
        let changePercent = 0;
        if (previousAmount > 0) {
          changePercent = ((amount - previousAmount) / previousAmount) * 100;
        } else if (amount > 0) {
          changePercent = 100;
        }

        return {
          category,
          amount: Math.round(amount),
          changePercent: Math.round(changePercent * 10) / 10,
          trend: deriveTrend(changePercent),
        };
      });

    // Goals
    const goals = await Goal.find({ userId }).select(
      'name targetAmount currentAmount'
    );
    const formattedGoals = goals.map((goal) => {
      const current = goal.currentAmount || 0;
      const target = goal.targetAmount || 1;
      const percent = Math.min(100, Math.round((current / target) * 100));
      return {
        name: goal.name,
        percentComplete: percent,
        currentAmount: current,
        targetAmount: goal.targetAmount,
      };
    });

    const reportDoc = await FinancialReport.findOne({ userId });
    const report = reportDoc
      ? {
          summary: reportDoc.summary,
          financialHealthScore: reportDoc.financialHealthScore,
          strengths: reportDoc.strengths || [],
          risks: reportDoc.risks || [],
          suggestions: reportDoc.suggestions || [],
          keyPoints: reportDoc.keyPoints || reportDoc.strengths || [], // Fallback for compatibility
          recommendations:
            reportDoc.recommendations || reportDoc.suggestions || [], // Fallback for compatibility
          weeklyTrend: reportDoc.weeklyTrend,
          goalHealth: reportDoc.goalHealth,
          savingDiscipline: reportDoc.savingDiscipline,
          incomeStability: reportDoc.incomeStability,
          lastUpdated: reportDoc.lastUpdatedAt || reportDoc.updatedAt,
          source: reportDoc.source,
        }
      : null;

    // Check if Gmail is connected
    let gmailToken = await GmailToken.findOne({ userId });
    let isGmailConnected = !!gmailToken;
    
    // Fallback: If no GmailToken record but user has pending Gmail transactions,
    // assume Gmail is connected and create the record
    if (!isGmailConnected) {
      const GmailPendingTransaction = (await import('../models/GmailPendingTransaction.js')).default;
      const pendingCount = await GmailPendingTransaction.countDocuments({ userId });
      if (pendingCount > 0) {
        // User has pending transactions, so Gmail must be connected
        // Create GmailToken record for backward compatibility
        gmailToken = await GmailToken.create({
          userId,
          connectedAt: new Date(),
        });
        isGmailConnected = true;
        console.log(`✅ Created GmailToken record for user ${userId} (had ${pendingCount} pending transactions)`);
      }
    }

    res.json({
      success: true,
      userId: userId.toString(),
      summary: {
        totalSpentThisMonth: Math.round(totalSpentThisMonth),
        totalIncomeThisMonth: Math.round(totalIncomeThisMonth),
        transactionCount: monthlyTransactions.length,
        lastIncomeDate,
        remainingBudget: Math.round(remainingBudget),
      },
      weeklySpendingGraph,
      aiSuggestions,
      topCategories: sortedCategories,
      goals: formattedGoals,
      report,
      isGmailConnected,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message,
    });
  }
};

/**
 * Get AI insights grouped by type for dashboard display
 * Falls back to alert metadata if AI insight not yet generated
 * GET /api/dashboard/insights
 */
export const getDashboardInsights = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Fetch all active alerts (with or without AI insights)
    const alerts = await AiAlert.find({
      userId,
      status: 'active',
      level: { $in: ['CRITICAL', 'HIGH', 'POSITIVE'] } // Only significant alerts
    })
    .sort({ lastTriggeredAt: -1 })
    .limit(20)
    .lean();

    console.log(`📊 [Dashboard Insights] Found ${alerts.length} active alerts`);
    
    const alertsWithAI = alerts.filter(a => a.aiInsight).length;
    const alertsWithoutAI = alerts.length - alertsWithAI;
    console.log(`   ${alertsWithAI} with AI insights, ${alertsWithoutAI} using fallback`);

    // Group alerts by type based on scope and level
    const groupedInsights = {
      expense: [],
      income: [],
      saving: [],
      investment: [],
      goals: [],
      overall: []
    };

    alerts.forEach(alert => {
      // Use AI insight if available, otherwise create fallback from alert metadata
      const insight = {
        _id: alert._id,
        type: alert.scope,
        level: alert.level,
        category: alert.meta?.lastCategory,
        relatedAmount: alert.meta?.lastAmount,
        createdAt: alert.lastTriggeredAt,
        hasAiInsight: !!alert.aiInsight,
        insight: alert.aiInsight || {
          // Fallback: Use alert metadata when AI insight not yet generated
          title: alert.title || `${alert.level} Alert`,
          ai_noticing: alert.meta?.lastReasons?.join('. ') || 'Alert triggered based on your recent activity.',
          positive: null,
          improvement: null,
          action: 'Check your dashboard for more details.',
          generatedAt: null
        }
      };

      // Categorize based on scope and level
      if (alert.scope === 'goal') {
        groupedInsights.goals.push(insight);
      } else if (alert.level === 'POSITIVE') {
        // Positive alerts go to saving/investment based on category
        if (alert.meta?.lastCategory === 'saving' || alert.scope === 'saving') {
          groupedInsights.saving.push(insight);
        } else if (alert.meta?.lastCategory === 'investment' || alert.scope === 'investment') {
          groupedInsights.investment.push(insight);
        } else if (alert.meta?.lastCategory === 'income' || alert.scope === 'income') {
          groupedInsights.income.push(insight);
        } else {
          groupedInsights.overall.push(insight);
        }
      } else {
        // Negative alerts (CRITICAL, HIGH)
        if (alert.scope === 'expense') {
          groupedInsights.expense.push(insight);
        } else if (alert.scope === 'income') {
          groupedInsights.income.push(insight);
        } else {
          groupedInsights.overall.push(insight);
        }
      }
    });

    res.json({
      success: true,
      insights: groupedInsights,
      total: alerts.length,
      withAiInsights: alertsWithAI,
      withFallback: alertsWithoutAI
    });

  } catch (error) {
    console.error('❌ [Dashboard Insights] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard insights',
      error: error.message
    });
  }
};


