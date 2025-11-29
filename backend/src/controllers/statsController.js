import Transaction from "../models/Transaction.js";
import Goal from "../models/Goal.js";

export const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const transactions = await Transaction.find({ userId });

    if (transactions.length === 0) {
      return res.json({ message: "No transactions found", stats: {} });
    }

    /* ==============================
       1. BASIC TOTALS
    =============================== */

    const allAmounts = transactions.map((t) => t.amount);
    const avgTransaction =
      allAmounts.reduce((a, b) => a + b, 0) / allAmounts.length;

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    let weeklyExpense = 0;
    let lastWeekExpense = 0;

    const categorySpent = {};

    transactions.forEach((t) => {
      const date = new Date(t.occurredAt);

      // Monthly totals
      if (date >= startOfMonth) {
        if (t.type === "income") monthlyIncome += t.amount;
        if (t.type === "expense") monthlyExpense += t.amount;
      }

      // Weekly expense
      if (date >= startOfWeek && t.type === "expense") {
        weeklyExpense += t.amount;
      }

      if (
        date >= startOfLastWeek &&
        date < startOfWeek &&
        t.type === "expense"
      ) {
        lastWeekExpense += t.amount;
      }

      // Category spending
      if (t.type === "expense") {
        const key = t.category.toLowerCase();
        if (!categorySpent[key]) categorySpent[key] = 0;
        categorySpent[key] += t.amount;
      }
    });

    /* ==============================
       2. CATEGORY PERCENTAGE
    =============================== */

    const categoryPercents = {};
    Object.keys(categorySpent).forEach((cat) => {
      categoryPercents[cat] =
        monthlyExpense > 0
          ? Number(((categorySpent[cat] / monthlyExpense) * 100).toFixed(2))
          : 0;
    });

    /* ==============================
       3. SAVINGS & INVESTMENTS
    =============================== */

    const savingAgg = await Transaction.aggregate([
      { $match: { userId, type: "saving" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const investmentAgg = await Transaction.aggregate([
      { $match: { userId, type: "investment" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const liquidSavings = savingAgg[0]?.total || 0;
    const investedAmount = investmentAgg[0]?.total || 0;

    const netWorth = liquidSavings + investedAmount;

    // Calculate monthly savings (income - expenses) for savings rate
    const monthlySavings = monthlyIncome - monthlyExpense;
    const savingsRate =
      monthlyIncome > 0
        ? Number(((monthlySavings / monthlyIncome) * 100).toFixed(2))
        : 0;

    const investmentRate =
      monthlyIncome > 0
        ? Number(((investedAmount / monthlyIncome) * 100).toFixed(2))
        : 0;

    /* ==============================
       4. GOAL PROGRESS
    =============================== */

    const goals = await Goal.find({ userId });

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

    const completedGoals = goalStats.filter((g) => g.status === "completed")
      .length;

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

    if (savingsRate >= 20) {
      positiveSignals.push("Great savings habit");
    }

    if (investmentRate >= 25) {
      positiveSignals.push("Strong investment discipline");
    }

    if (completedGoals > 0) {
      positiveSignals.push("You have completed financial goals");
    }

    if (monthlyIncome > monthlyExpense && savingsRate > 15) {
      positiveSignals.push("You are financially in control this month");
    }

    /* ==============================
       7. NEGATIVE SIGNALS ⚠️
    =============================== */

    const negativeSignals = [];

    if (monthlyExpense > monthlyIncome) {
      negativeSignals.push("Spending exceeds income");
    }

    if (savingsRate < 10) {
      negativeSignals.push("Very low savings rate");
    }

    if (liquidSavings < monthlyExpense) {
      negativeSignals.push("Less than 1-month emergency fund");
    }

    if (expenseTrend === "increasing") {
      negativeSignals.push("Expenses rising week to week");
    }

    /* ==============================
       FINAL OBJECT (FOR AI)
    =============================== */

    const stats = {
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
      negativeSignals
    };

    res.json({ stats });

  } catch (error) {
    console.error("getUserStats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



/*
================================
 GET USER HISTORY (AI BEHAVIOR ENGINE)
================================
*/

export const getUserHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    // Last 6 months window
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await Transaction.find({
      userId,
      occurredAt: { $gte: sixMonthsAgo },
    }).sort({ occurredAt: -1 });

    const goals = await Goal.find({ userId });

    if (!transactions.length) {
      return res.json({
        totalTransactions: 0,
        message: "No data yet",
        history: {}
      });
    }

    /* ==============================
       1. CATEGORY BEHAVIOR
    =============================== */

    const categoryMap = {};
    const monthlyMap = {};
    const investmentTypes = {};
    let savingFrequency = 0;
    let investmentFrequency = 0;

    transactions.forEach((t) => {
      const monthKey =
        new Date(t.occurredAt).getFullYear() + "-" +
        (new Date(t.occurredAt).getMonth() + 1);

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          income: 0,
          expense: 0,
          saving: 0,
          investment: 0,
        };
      }

      // Track types by month
      monthlyMap[monthKey][t.type] += t.amount;

      // Count category usage
      const cat = t.category.toLowerCase();
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat]++;

      // Investment tracking
      if (t.type === "investment") {
        if (!investmentTypes[cat]) investmentTypes[cat] = 0;
        investmentTypes[cat] += t.amount;
        investmentFrequency++;
      }

      if (t.type === "saving") {
        savingFrequency++;
      }
    });

    // Sort top spending categories
    const sortedCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1]);

    const topCategories = sortedCategories.slice(0, 5).map(([cat]) => cat);

    /* ==============================
       2. GOAL PROGRESS HISTORY
    =============================== */

    const goalProgressTrend = goals.map((goal) => {
      const progress =
        goal.targetAmount > 0
          ? Number(((goal.currentAmount / goal.targetAmount) * 100).toFixed(2))
          : 0;

      return {
        name: goal.name,
        priority: goal.priority,
        currentAmount: goal.currentAmount,
        targetAmount: goal.targetAmount,
        progress,
        status:
          progress >= 100
            ? "completed"
            : progress >= 70
            ? "nearly_there"
            : progress >= 30
            ? "progressing"
            : "slow",
      };
    });

    /* ==============================
       3. MONTH TO MONTH TREND
    =============================== */

    const monthlyTrend = Object.entries(monthlyMap)
      .sort(([a], [b]) => new Date(a) - new Date(b));

    /* ==============================
       4. CONSISTENCY ANALYSIS
    =============================== */

    const consistency = {
      savesRegularly: savingFrequency >= 6,          // saved at least 6 times
      investsRegularly: investmentFrequency >= 6,     // invested at least 6 times
      multiCategorySpender: topCategories.length >= 5,
    };

    /* ==============================
       5. FINAL HISTORY OBJECT
    =============================== */

    const history = {
      totalTransactions: transactions.length,

      topCategories,
      rawCategoryCounts: categoryMap,

      investmentTypes,
      savingFrequency,
      investmentFrequency,

      monthlyTrend,
      goalProgressTrend,

      consistency,
    };

    res.json({ history });

  } catch (error) {
    console.error("getUserHistory error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
