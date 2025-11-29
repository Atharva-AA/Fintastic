import Transaction from "../models/Transaction.js";
import Goal from "../models/Goal.js";

/*
====================================================
 INTERNAL USER HISTORY (for AI engine + agent brain)
====================================================
*/

export const getUserHistoryInternal = async (userId) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await Transaction.find({
      userId,
      occurredAt: { $gte: sixMonthsAgo },
    }).sort({ occurredAt: -1 });

    const goals = await Goal.find({ userId });

    if (!transactions.length) {
      return {
        totalTransactions: 0,
        message: "No data yet",
        history: {}
      };
    }

    /* ==============================
       1. CATEGORY + INVESTMENT DATA
    =============================== */

    const categoryMap = {};
    const investmentTypes = {};
    let savingFrequency = 0;
    let investmentFrequency = 0;

    // Also track monthly income
    const monthlyMap = {};
    const monthlyIncomeMap = {};

    transactions.forEach((t) => {

      const date = new Date(t.occurredAt);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          income: 0,
          expense: 0,
          saving: 0,
          investment: 0,
        };
      }

      if (!monthlyIncomeMap[monthKey]) {
        monthlyIncomeMap[monthKey] = 0;
      }

      monthlyMap[monthKey][t.type] += t.amount;

      if (t.type === "income") {
        monthlyIncomeMap[monthKey] += t.amount;
      }

      const cat = t.category.toLowerCase();

      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat]++;

      if (t.type === "investment") {
        if (!investmentTypes[cat]) investmentTypes[cat] = 0;
        investmentTypes[cat] += t.amount;
        investmentFrequency++;
      }

      if (t.type === "saving") {
        savingFrequency++;
      }

    });

    const sortedCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1]);

    const topCategories = sortedCategories
      .slice(0, 5)
      .map(([cat]) => cat);

    /* ==============================
       2. GOAL MOVEMENT
    =============================== */

    const goalProgressTrend = goals.map((goal) => {
      const progress =
        goal.targetAmount > 0
          ? Number(((goal.currentAmount / goal.targetAmount) * 100).toFixed(2))
          : 0;

      return {
        name: goal.name,
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
       3. MONTH-TO-MONTH TREND
    =============================== */

    const monthlyTrend = Object.keys(monthlyMap)
      .sort()
      .map((month) => ({
        month,
        ...monthlyMap[month],
      }));

    /* ==============================
       4. INCOME CHANGE & TREND
    =============================== */

    const incomeMonths = Object.keys(monthlyIncomeMap).sort();

    let incomeChangePercent = 0;
    let incomeTrend = "stable";
    let incomeStability = "unknown";

    if (incomeMonths.length >= 2) {
      const currentMonth = monthlyIncomeMap[incomeMonths[incomeMonths.length - 1]];
      const lastMonth = monthlyIncomeMap[incomeMonths[incomeMonths.length - 2]];

      if (lastMonth > 0) {
        incomeChangePercent = Number(((currentMonth - lastMonth) / lastMonth * 100).toFixed(2));

        if (incomeChangePercent >= 10) incomeTrend = "increasing";
        else if (incomeChangePercent <= -10) incomeTrend = "decreasing";
        else incomeTrend = "stable";
      }
    }

    // Calculate stability (least variation = stable)
    const incomeValues = Object.values(monthlyIncomeMap);

    if (incomeValues.length >= 3) {
      let max = Math.max(...incomeValues);
      let min = Math.min(...incomeValues);

      if (min > 0) {
        const diffPercent = ((max - min) / min) * 100;

        if (diffPercent <= 20) incomeStability = "stable";
        else if (diffPercent <= 60) incomeStability = "moderate";
        else incomeStability = "unstable";
      }
    }

    /* ==============================
       5. CONSISTENCY
    =============================== */

    const consistency = {
      savesRegularly: savingFrequency >= 6,
      investsRegularly: investmentFrequency >= 6,
      incomeStable: incomeStability === "stable",
      multiCategorySpender: topCategories.length >= 5,
    };

    /* ==============================
       FINAL OBJECT
    =============================== */

    return {
      totalTransactions: transactions.length,

      topCategories,
      rawCategoryCounts: categoryMap,

      investmentTypes,
      savingFrequency,
      investmentFrequency,

      monthlyTrend,
      monthlyIncome: monthlyIncomeMap,

      incomeChangePercent,
      incomeTrend,
      incomeStability,

      goalProgressTrend,
      consistency,
    };

  } catch (error) {
    console.error("getUserHistoryInternal error:", error);
    return null;
  }
};
