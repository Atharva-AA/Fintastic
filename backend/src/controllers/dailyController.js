import axios from 'axios';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import BehaviorProfile from '../models/BehaviorProfile.js';
import { getUserStatsInternal } from '../utils/getUserStats.internal.js'; // adjust path if needed

export const getDailyMentorData = async (req, res) => {
  try {
    const { userId } = req.params;

    // -------------------------
    // 1. USER INFO
    // -------------------------
    const user = await User.findById(userId).select('name email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // -------------------------
    // 2. TODAY RANGE
    // -------------------------
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // -------------------------
    // 3. TODAY TRANSACTIONS
    // -------------------------
    const txs = await Transaction.find({
      userId,
      occurredAt: { $gte: start, $lte: end },
    });

    let income = 0;
    let expense = 0;
    let saving = 0;
    let investment = 0;

    const categoryMap = {};

    txs.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') expense += t.amount;
      if (t.type === 'saving') saving += t.amount;
      if (t.type === 'investment') investment += t.amount;

      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

    const topCategory =
      Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    // -------------------------
    // 4. USER STATS (SAFE FIX)
    // -------------------------
    let stats = await getUserStatsInternal(userId);

    if (!stats) {
      stats = {
        savingsRate: 0,
        investmentRate: 0,
        netWorth: 0,
      };
    }

    // -------------------------
    // 5. USER GOALS
    // -------------------------
    const goals = await Goal.find({ userId }).select(
      'name targetAmount currentAmount deadline'
    );

    const formattedGoals = goals.map((g) => ({
      name: g.name,
      target: g.targetAmount,
      current: g.currentAmount || 0,
      remaining: g.targetAmount - (g.currentAmount || 0),
      deadline: g.deadline,
    }));

    // -------------------------
    // 6. MEMORY FROM CHROMA (Split into behavior patterns)
    // -------------------------
    let behaviorPatterns = [];

    try {
      // Fetch behavior patterns specifically
      const behaviorRes = await axios.post(
        'http://localhost:8001/search-memory',
        {
          userId: userId.toString(),
          query: 'behavior pattern spending habit investment routine',
          topK: 5,
        }
      );

      if (behaviorRes.data?.matches?.length) {
        behaviorPatterns = behaviorRes.data.matches
          .filter(
            (m) =>
              m.metadata?.type === 'behavior_pattern' ||
              m.metadata?.type === 'daily_activity'
          )
          .map((m) => m.content);
      }
    } catch (err) {
      console.log('⚠️ Chroma behavior patterns fetch failed (non critical)');
    }

    // -------------------------
    // 7. RISK TRENDS (Past 7 Days)
    // -------------------------
    let riskTrends = {};

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentTxs = await Transaction.find({
        userId,
        occurredAt: { $gte: sevenDaysAgo },
      });

      let totalExpense = 0;
      let expenseCount = 0;
      let totalSaving = 0;
      let savingCount = 0;

      recentTxs.forEach((t) => {
        if (t.type === 'expense') {
          totalExpense += t.amount;
          expenseCount++;
        }
        if (t.type === 'saving') {
          totalSaving += t.amount;
          savingCount++;
        }
      });

      const avgExpense = expenseCount > 0 ? totalExpense / expenseCount : 0;
      const todayExpense = expense;
      const expenseChange =
        avgExpense > 0 ? ((todayExpense - avgExpense) / avgExpense) * 100 : 0;

      // Calculate savings trend
      const avgSaving = savingCount > 0 ? totalSaving / savingCount : 0;
      let savingsTrend = 'stable';
      if (saving > avgSaving * 1.2) {
        savingsTrend = 'improving';
      } else if (saving < avgSaving * 0.8) {
        savingsTrend = 'declining';
      }

      riskTrends = {
        avgExpense: Math.round(avgExpense),
        expenseChange: Math.round(expenseChange * 10) / 10,
        savingsTrend,
        avgSaving: Math.round(avgSaving),
      };
    } catch (err) {
      console.log('⚠️ Risk trends calculation failed (non critical)');
    }

    // -------------------------
    // 8. FETCH BEHAVIOR PROFILE
    // -------------------------
    let behaviorProfile = null;
    try {
      const profile = await BehaviorProfile.findOne({ userId }).lean();
      if (profile) {
        behaviorProfile = {
          disciplineScore: profile.disciplineScore || 50,
          impulseScore: profile.impulseScore || 50,
          consistencyIndex: profile.consistencyIndex || 50,
          riskIndex: profile.riskIndex || 50,
          savingStreak: profile.savingStreak || 0,
        };
      }
    } catch (err) {
      console.log('⚠️ BehaviorProfile fetch failed (non critical)');
    }

    // -------------------------
    // 9. FINAL RESPONSE
    // -------------------------
    res.json({
      success: true,

      user: {
        userId,
        name: user.name,
        email: user.email,
      },

      today: {
        date: new Date().toISOString().split('T')[0],
        income,
        expense,
        saving,
        investment,
        topCategory,
        transactionCount: txs.length,
      },

      stats: {
        savingsRate: stats.savingsRate || 0,
        investmentRate: stats.investmentRate || 0,
        netWorth: stats.netWorth || 0,
      },

      goals: formattedGoals,

      behaviorPatterns: behaviorPatterns,
      riskTrends: riskTrends,
      behaviorProfile: behaviorProfile,
      memoryHighlights: behaviorPatterns, // Keep for backward compatibility
    });
  } catch (err) {
    console.error('Daily mentor error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
