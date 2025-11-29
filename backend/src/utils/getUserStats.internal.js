import Transaction from "../models/Transaction.js";
import Goal from "../models/Goal.js";
import mongoose from "mongoose";
import { getStandardizedStats } from "./statsEngine.js";

/*
====================================================
 INTERNAL USER STATS (for AI engine – not routes)
====================================================
Uses standardized stats engine (excludes onboarding)
Adds additional fields for AI analysis
*/

export const getUserStatsInternal = async (userId) => {
  try {
    // Convert userId to ObjectId if it's a string
    let userIdObj = userId;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
    }

    // Get standardized stats (excludes onboarding)
    const standardizedStats = await getStandardizedStats(userIdObj);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get transactions for additional calculations (exclude onboarding)
    const transactions = await Transaction.find({
      userId: userIdObj,
      createdAt: { $gte: startOfMonth, $lt: endOfMonth },
      source: { $ne: 'onboarding' }, // Exclude onboarding
    });

    // Use standardized stats as base
    const monthlyIncome = standardizedStats.monthlyIncome;
    const monthlyExpense = standardizedStats.monthlyExpense;
    const avgTransaction = standardizedStats.avgTransaction;
    const savingsRate = standardizedStats.savingsRate;

    // Calculate weekly expenses (for trends)
    let weeklyExpense = 0;
    let lastWeekExpense = 0;
    const categorySpent = {};

    transactions.forEach((t) => {
      const date = new Date(t.createdAt || t.occurredAt || t.updatedAt || now);

      if (date >= startOfWeek && t.type === "expense") {
        weeklyExpense += t.amount;
      }

      if (date >= startOfLastWeek && date < startOfWeek && t.type === "expense") {
        lastWeekExpense += t.amount;
      }

      if (t.type === "expense") {
        const key = t.category.toLowerCase();
        if (!categorySpent[key]) categorySpent[key] = 0;
        categorySpent[key] += t.amount;
      }
    });

    /* ==============================
       2. CATEGORY % 
    =============================== */

    const categoryPercents = {};
    Object.keys(categorySpent).forEach((cat) => {
      categoryPercents[cat] =
        monthlyExpense > 0
          ? Number(((categorySpent[cat] / monthlyExpense) * 100).toFixed(2))
          : 0;
    });

    /* ==============================
       3. SAVINGS & INVESTMENTS (exclude onboarding)
    =============================== */

    const savingAgg = await Transaction.aggregate([
      {
        $match: {
          userId: userIdObj,
          type: "saving",
          source: { $ne: "onboarding" }, // Exclude onboarding
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const investmentAgg = await Transaction.aggregate([
      {
        $match: {
          userId: userIdObj,
          type: "investment",
          source: { $ne: "onboarding" }, // Exclude onboarding
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const liquidSavings = savingAgg[0]?.total || 0;
    const investedAmount = investmentAgg[0]?.total || 0;
    const netWorth = liquidSavings + investedAmount;

    // Use standardized investment rate
    const investmentRate = standardizedStats.investmentRate;

    /* ==============================
       4. GOALS
    =============================== */

    const goals = await Goal.find({ userId: userIdObj });

    const goalStats = goals.map((goal) => {
      const progress =
        goal.targetAmount > 0
          ? Number(((goal.currentAmount / goal.targetAmount) * 100).toFixed(2))
          : 0;

      return {
        goalId: goal._id,
        name: goal.name,
        priority: goal.priority,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        progress,
        deadline: goal.deadline,
        remaining: goal.targetAmount - goal.currentAmount,
        status:
          progress >= 100
            ? "completed"
            : progress >= 75
            ? "almost"
            : progress >= 40
            ? "in_progress"
            : "low",
      };
    });

    const completedGoals = goalStats.filter(
      (g) => g.status === "completed"
    ).length;

    /* ==============================
       5. TRENDS
    =============================== */

    const expenseTrend =
      weeklyExpense > lastWeekExpense ? "increasing" : "stable";

    const incomeTrend =
      monthlyIncome > monthlyExpense ? "stable" : "decreasing";

    /* ==============================
       6. POSITIVE SIGNALS ✅
    =============================== */

    const positiveSignals = [];

    if (savingsRate >= 20)
      positiveSignals.push("Great savings habit");

    if (investmentRate >= 25)
      positiveSignals.push("Strong investment discipline");

    if (completedGoals > 0)
      positiveSignals.push("You have completed financial goals");

    if (monthlyIncome > monthlyExpense && savingsRate > 15)
      positiveSignals.push("You are in control of your finances this month");

    /* ==============================
       7. NEGATIVE SIGNALS ⚠️
    =============================== */

    const negativeSignals = [];

    if (monthlyExpense > monthlyIncome)
      negativeSignals.push("Spending is higher than income");

    if (savingsRate < 10)
      negativeSignals.push("Very low savings");

    if (liquidSavings < monthlyExpense)
      negativeSignals.push("Less than one month of emergency savings");

    if (expenseTrend === "increasing")
      negativeSignals.push("Expenses trending up");

    /* ==============================
       FINAL OBJECT
    =============================== */

    return {
      avgTransaction,
      monthlyIncome,
      monthlyExpense,
      weeklyExpense,
      lastWeekExpense,

      categorySpent,
      categoryPercents,

      liquidSavings,
      investedAmount,
      netWorth,

      savingsRate,
      investmentRate,

      expenseTrend,
      incomeTrend,

      goalStats,
      completedGoals,

      positiveSignals,
      negativeSignals,
    };

  } catch (error) {
    console.error("getUserStatsInternal error:", error);
    return null;
  }
};




