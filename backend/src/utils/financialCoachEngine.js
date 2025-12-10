import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import { getUserStatsInternal } from './getUserStats.internal.js';
import { getUserHistoryInternal } from './getUserHistory.internal.js';
import { createOrUpdateAiAlert } from './aiAlert.internal.js';
import { classifyAlertArea } from './classifyAlertArea.js';
import { sendToMemory } from './memory.utils.js';
import { updateFinancialReport } from './updateFinancialReport.js';
import { sendFinancialCoachEmail } from './sendFinancialCoachEmail.js';
import { getBehaviorProfile } from './behavior.utils.js';
import { analyzeIncomeForAlert } from './incomeAlert.utils.js';

/**
 * ============================================
 * FINANCIAL COACH ENGINE - CORE BRAIN
 * ============================================
 *
 * This is the heart of Fintastic's financial intelligence.
 * Every transaction is analyzed using multiple factors:
 * - Transaction size vs averages
 * - Trends (7-day, 30-day)
 * - Category patterns
 * - Goal impact
 * - Behavioral patterns
 * - Time-based patterns
 * - Risk assessment
 *
 * Small amounts CAN be very serious (e.g., consistent small overspending)
 * Large amounts CAN be positive (e.g., large savings/investment)
 */
export async function runFinancialCoachEngine({
  userId,
  transaction,
  stats,
  goals,
  history,
  behaviorProfile,
}) {
  try {
    console.log('🧠 [Financial Coach] Analyzing transaction:', transaction._id);
    console.log(
      `   Amount: ₹${transaction.amount}, Type: ${transaction.type}, Category: ${transaction.category}`
    );

    // Get comprehensive data if not provided
    if (!stats) {
      stats = await getUserStatsInternal(userId);
      console.log(
        `   Stats loaded: Income ₹${stats?.monthlyIncome || 0}, Expense ₹${
          stats?.monthlyExpense || 0
        }`
      );
    }
    if (!history) history = await getUserHistoryInternal(userId);
    if (!goals) goals = await Goal.find({ userId });
    if (!behaviorProfile)
      behaviorProfile = (await getBehaviorProfile(userId)) || {};

    const now = new Date();
    const transactionDate =
      transaction.occurredAt || transaction.createdAt || now;
    const transactionAmount = transaction.amount || 0;
    const transactionType = transaction.type;
    const transactionCategory = transaction.category || 'Other';
    const hour = transactionDate.getHours();
    const dayOfWeek = transactionDate.getDay();
    const dayOfMonth = transactionDate.getDate();

    // ============================================
    // A. DEEP ANALYSIS FACTORS
    // ============================================

    // 1. Transaction size vs averages
    const avgTransaction30Days = stats.avgTransaction || 0;
    const sizeRatio =
      avgTransaction30Days > 0 ? transactionAmount / avgTransaction30Days : 0;

    // 2. Last 7-day trend
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last7DaysExpenses =
      history.recentExpenses?.filter(
        (tx) => new Date(tx.occurredAt || tx.createdAt) >= sevenDaysAgo
      ) || [];
    const last7DaysTotal = last7DaysExpenses.reduce(
      (sum, tx) => sum + (tx.amount || 0),
      0
    );
    const avg7Days =
      last7DaysExpenses.length > 0
        ? last7DaysTotal / last7DaysExpenses.length
        : 0;

    // 3. Last 30-day trend
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last30DaysExpenses =
      history.recentExpenses?.filter(
        (tx) => new Date(tx.occurredAt || tx.createdAt) >= thirtyDaysAgo
      ) || [];
    const last30DaysTotal = last30DaysExpenses.reduce(
      (sum, tx) => sum + (tx.amount || 0),
      0
    );
    const avg30Days =
      last30DaysExpenses.length > 0
        ? last30DaysTotal / last30DaysExpenses.length
        : 0;

    const changeFromLastWeek =
      avg7Days > 0 ? ((transactionAmount - avg7Days) / avg7Days) * 100 : 0;
    const changeFromLastMonth =
      avg30Days > 0 ? ((transactionAmount - avg30Days) / avg30Days) * 100 : 0;

    // 4. Category dominance
    const categoryPercents = stats.categoryPercents || {};
    const categoryPercent = categoryPercents[transactionCategory] || 0;
    const categoryDominance = categoryPercent > 20; // More than 20% of expenses

    // 5. Goal proximity and danger
    let goalImpact = false;
    let nearGoal = false;
    let goalDanger = false;
    let affectedGoals = [];

    for (const goal of goals) {
      const progress =
        goal.targetAmount > 0
          ? ((goal.currentAmount || 0) / goal.targetAmount) * 100
          : 0;

      if (progress >= 90 && progress < 100) {
        nearGoal = true;
        affectedGoals.push(goal);
      }

      // Check if this transaction threatens the goal
      if (transactionType === 'expense') {
        const remaining = goal.targetAmount - (goal.currentAmount || 0);
        const monthlyNeeded =
          remaining /
          Math.max(
            1,
            Math.ceil(
              (new Date(goal.deadline) - now) / (1000 * 60 * 60 * 24 * 30)
            )
          );

        if (transactionAmount > monthlyNeeded * 0.3) {
          goalDanger = true;
          goalImpact = true;
          affectedGoals.push(goal);
        }
      }

      // Check if this transaction helps the goal
      if (
        (transactionType === 'saving' || transactionType === 'investment') &&
        goal.category === transactionCategory
      ) {
        goalImpact = true;
        affectedGoals.push(goal);
      }
    }

    // 6. Savings streak
    const savingStreak = behaviorProfile.savingStreak || 0;
    const streakBroken = transactionType === 'expense' && savingStreak > 0;

    // 7. Broken habits
    let habitBroken = false;
    if (transactionType === 'expense') {
      // Check if this is a new category or unusual amount
      const categoryHistory =
        history.recentExpenses?.filter(
          (tx) => tx.category === transactionCategory
        ) || [];

      if (categoryHistory.length === 0) {
        habitBroken = true; // New spending category
      } else {
        const categoryAvg =
          categoryHistory.reduce((sum, tx) => sum + (tx.amount || 0), 0) /
          categoryHistory.length;
        if (transactionAmount > categoryAvg * 2) {
          habitBroken = true; // Unusually large for this category
        }
      }
    }

    // 8. Income stability
    const incomeTrend = stats.incomeTrend || 'stable';
    const incomeStability = incomeTrend === 'stable' || incomeTrend === 'up';

    // 9. Weekday vs weekend pattern
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isWeekday = !isWeekend;
    const weekendSpending = isWeekend && transactionType === 'expense';

    // 10. Time-of-month pattern
    const isEarlyMonth = dayOfMonth <= 10;
    const isMidMonth = dayOfMonth > 10 && dayOfMonth <= 20;
    const isLateMonth = dayOfMonth > 20;
    const lateMonthSpending =
      isLateMonth &&
      transactionType === 'expense' &&
      stats.monthlyExpense > stats.monthlyIncome * 0.8;

    // 11. Risk vs current profile
    const riskIndex = behaviorProfile.riskIndex || 50;
    const isHighRisk = riskIndex > 70;
    const isLowRisk = riskIndex < 30;

    // 12. Irregular income safety
    const hasIrregularIncome =
      incomeTrend === 'down' || incomeStability === false;
    const irregularIncomeRisk =
      hasIrregularIncome &&
      transactionType === 'expense' &&
      transactionAmount > stats.monthlyIncome * 0.1;

    // 13. Near-milestone (90% of goal)
    const milestone = nearGoal;

    // 14. Overconfidence (spending after income)
    const recentIncome =
      history.recentIncome?.filter(
        (tx) =>
          new Date(tx.occurredAt || tx.createdAt) >=
          new Date(now.getTime() - 24 * 60 * 60 * 1000)
      ) || [];
    const overconfidence =
      recentIncome.length > 0 &&
      transactionType === 'expense' &&
      transactionAmount > avgTransaction30Days * 1.5;

    // 15. Emotional buying (night + category)
    const isNight = hour >= 20 || hour <= 2;
    const emotionalCategories = ['Shopping', 'Entertainment', 'Food', 'Dining'];
    const emotionalBuying =
      isNight &&
      emotionalCategories.includes(transactionCategory) &&
      transactionType === 'expense';

    // ============================================
    // A. ADVANCED MICRO-FACTOR ANALYSIS
    // ============================================
    // Track micro behavioral changes, addiction, improvement, drift

    // Fetch recent transactions for micro-analysis
    const thirtyDaysAgoForMicro = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    );
    const recentTransactionsForMicro = await Transaction.find({
      userId,
      createdAt: { $gte: thirtyDaysAgoForMicro },
    })
      .sort({ createdAt: -1 })
      .lean();

    const recentExpensesForMicro = recentTransactionsForMicro.filter(
      (tx) => tx.type === 'expense'
    );
    const recentIncomeForMicro = recentTransactionsForMicro.filter(
      (tx) => tx.type === 'income'
    );
    const recentSavingsForMicro = recentTransactionsForMicro.filter(
      (tx) => tx.type === 'saving' || tx.type === 'investment'
    );

    // A. Behavioral Drift (recent behavior changing?)
    const last10Expenses = recentExpensesForMicro.slice(0, 10);
    const avgLast10 =
      last10Expenses.length > 0
        ? last10Expenses.reduce((s, v) => s + (v.amount || 0), 0) /
          last10Expenses.length
        : 0;
    const behaviorDrift =
      avgTransaction30Days > 0 && avgLast10 > avgTransaction30Days * 1.4;

    // B. Micro-leak (small but repeated)
    const sameCategoryCount7Days =
      recentExpensesForMicro.filter(
        (tx) =>
          tx.category === transactionCategory &&
          new Date(tx.createdAt || tx.occurredAt) >= sevenDaysAgo &&
          (tx.amount || 0) < avgTransaction30Days * 0.5
      ).length || 0;
    const microLeak = sameCategoryCount7Days >= 4;

    // C. Improvement trend
    const recentSavingsSlice = recentSavingsForMicro.slice(0, 5);
    const improvementTrend = recentSavingsSlice.length >= 3;

    // D. Recovery (after bad spending)
    // Find last expense with high risk (we'll use amount > avg * 2 as proxy for "bad")
    const lastBadAlert = recentExpensesForMicro.find(
      (tx) => (tx.amount || 0) > (avgTransaction30Days || 0) * 2
    );
    const recovery = lastBadAlert && transactionType === 'saving';

    // E. Overspeed spending (too many transactions in short time)
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const transactions12h =
      recentExpensesForMicro.filter(
        (tx) => new Date(tx.createdAt || tx.occurredAt) > twelveHoursAgo
      ).length || 0;
    const spendingBurst = transactions12h >= 5;

    console.log('🧬 Advanced AI behavior analysis applied');

    // ============================================
    // B. CALCULATE LEVEL AND REASONS
    // ============================================

    let level = 'LOW';
    let reasons = [];
    const insights = [];
    let riskScore = 0;
    let positivityScore = 0;

    console.log(
      `   Analysis: sizeRatio=${sizeRatio.toFixed(
        2
      )}, avgTransaction=${avgTransaction30Days}, changeFromLastWeek=${changeFromLastWeek.toFixed(
        1
      )}%`
    );

    // POSITIVE SIGNALS
    if (transactionType === 'saving' || transactionType === 'investment') {
      positivityScore += 30;
      if (transactionAmount > avgTransaction30Days * 2) {
        positivityScore += 20;
        reasons.push(
          `Large ${transactionType} of ₹${transactionAmount} - excellent discipline`
        );
      }
      if (goalImpact) {
        positivityScore += 15;
        reasons.push(`This ${transactionType} directly supports your goals`);
      }
      if (savingStreak > 0) {
        positivityScore += 10;
        reasons.push(`Maintaining your ${savingStreak}-day savings streak`);
      }
    }

    // CRITICAL SIGNALS
    if (transactionType === 'expense') {
      // Critical: Goal danger
      if (goalDanger) {
        riskScore += 40;
        level = 'CRITICAL';
        reasons.push(
          `This expense threatens your goal: ${
            affectedGoals[0]?.name || 'Unknown'
          }`
        );
      }

      // Critical: Irregular income risk
      if (irregularIncomeRisk) {
        riskScore += 35;
        if (level !== 'CRITICAL') level = 'CRITICAL';
        reasons.push(
          `Large expense (₹${transactionAmount}) during unstable income period`
        );
      }

      // Critical: Late month overspending
      if (lateMonthSpending) {
        riskScore += 30;
        if (level !== 'CRITICAL') level = 'CRITICAL';
        reasons.push(`Late-month spending when budget is already tight`);
      }

      // Critical: Emotional buying
      if (emotionalBuying) {
        riskScore += 25;
        if (level !== 'CRITICAL') level = 'CRITICAL';
        reasons.push(
          `Late-night ${transactionCategory} purchase - potential impulse buy`
        );
      }

      // High: Size ratio (lowered threshold for irregular expenses)
      if (sizeRatio > 2) {
        riskScore += 20;
        if (level === 'LOW') level = 'HIGH';
        reasons.push(
          `Transaction is ${sizeRatio.toFixed(
            1
          )}x your average - unusually large`
        );
      }

      // High: Very irregular expense (even if avg is low)
      if (
        avgTransaction30Days > 0 &&
        transactionAmount > avgTransaction30Days * 5
      ) {
        riskScore += 30;
        level = 'CRITICAL';
        reasons.push(
          `This expense (₹${transactionAmount.toLocaleString(
            'en-IN'
          )}) is extremely irregular - ${(
            transactionAmount / avgTransaction30Days
          ).toFixed(1)}x your average`
        );
      }

      // High: Large absolute amount even if no history
      if (avgTransaction30Days === 0 && transactionAmount > 5000) {
        riskScore += 25;
        if (level === 'LOW') level = 'HIGH';
        reasons.push(
          `Large expense detected: ₹${transactionAmount.toLocaleString(
            'en-IN'
          )} - this is significant`
        );
      }

      // High: Category dominance
      if (categoryDominance && transactionAmount > avgTransaction30Days) {
        riskScore += 15;
        if (level === 'LOW') level = 'HIGH';
        reasons.push(
          `${transactionCategory} already represents ${categoryPercent.toFixed(
            1
          )}% of expenses`
        );
      }

      // High: Overconfidence
      if (overconfidence) {
        riskScore += 15;
        if (level === 'LOW') level = 'HIGH';
        reasons.push(
          `Large spending immediately after income - potential overconfidence`
        );
      }

      // High: Habit broken
      if (habitBroken) {
        riskScore += 12;
        if (level === 'LOW') level = 'HIGH';
        reasons.push(`Unusual spending pattern detected - habit change`);
      }

      // Medium: Weekend spending
      if (weekendSpending && transactionAmount > avgTransaction30Days * 1.5) {
        riskScore += 8;
        reasons.push(`Weekend spending above average`);
      }

      // Medium: Change from last week
      if (changeFromLastWeek > 50) {
        riskScore += 10;
        reasons.push(
          `Spending ${changeFromLastWeek.toFixed(
            1
          )}% higher than last week's average`
        );
      }

      // Advanced: Behavioral drift
      if (behaviorDrift) {
        riskScore += 15;
        reasons.push('Spending pattern changing rapidly (behavioral drift)');
      }

      // Advanced: Micro-leak
      if (microLeak) {
        riskScore += 18;
        reasons.push('Repeated small expenses detected (hidden money leak)');
      }

      // Advanced: Spending burst
      if (spendingBurst) {
        riskScore += 15;
        reasons.push('High spending frequency in short time (loss of control)');
      }
    }

    // Advanced: Improvement trend (positive)
    if (improvementTrend) {
      positivityScore += 15;
      reasons.push('Recent pattern shows improving financial discipline');
    }

    // Advanced: Recovery (positive)
    if (recovery) {
      positivityScore += 20;
      reasons.push('Recovery behavior detected after risky spending');
    }

    // POSITIVE LEVEL
    if (positivityScore > 35 && riskScore < 20) {
      level = 'POSITIVE';
    }

    // Ensure HIGH level for significant risk scores even if other conditions don't trigger
    if (riskScore >= 25 && level === 'LOW') {
      level = 'HIGH';
      reasons.push('Significant risk detected based on transaction analysis');
    }

    console.log(
      `   Final Level: ${level}, Risk Score: ${riskScore}, Positivity Score: ${positivityScore}`
    );

    // ============================================
    // B.5. SMART INCOME ANALYSIS
    // ============================================

    // Only analyze income transactions with smart filtering
    if (transactionType === 'income') {
      console.log('💰 [Financial Coach] Running smart income analysis...');

      const incomeAnalysis = await analyzeIncomeForAlert(
        userId,
        transaction,
        stats,
        goals
      );

      if (incomeAnalysis.shouldAlert) {
        // Override level and scores with income analysis
        level = incomeAnalysis.level;
        riskScore = incomeAnalysis.riskScore;
        positivityScore = incomeAnalysis.positivityScore;
        reasons = incomeAnalysis.reasons;

        console.log(`💰 [Financial Coach] Income alert triggered!`);
        console.log(`   Level: ${level}, Reasons: ${reasons.join(', ')}`);
      } else {
        console.log(
          `💰 [Financial Coach] Income alert skipped (routine/predictable)`
        );
      }
    }
    // ============================================
    // C. CREATE / UPDATE AI ALERT (Smart + Behavioral)
    // ============================================

    // IMPORTANT:
    // This is NOT email alert — this is internal AI system alert
    // Used for: dashboard insights, memory, learning, tracking

    const shouldCreateAlert =
      level === 'CRITICAL' ||
      level === 'HIGH' ||
      level === 'POSITIVE' ||
      habitBroken ||
      goalImpact ||
      milestone ||
      microLeak ||
      behaviorDrift ||
      spendingBurst ||
      improvementTrend ||
      recovery ||
      Math.abs(changeFromLastWeek) > 40 ||
      savingStreak >= 3 ||
      riskScore >= 20 ||
      positivityScore >= 25;

    let alert = null;

    if (shouldCreateAlert) {
      const decision = {
        trigger: true,
        level,
        riskScore,
        positivityScore,
        reasons,
        behavioralFlags: {
          habitBroken,
          goalImpact,
          milestone,
          microLeak,
          behaviorDrift,
          spendingBurst,
          improvementTrend,
          recovery,
        },
      };

      const areaInfo = classifyAlertArea({
        decision,
        transaction,
        stats,
        goals,
      });

      alert = await createOrUpdateAiAlert({
        userId,
        areaInfo,
        decision,
        transaction,
        stats,
        goals: affectedGoals,
        history,
      });

      console.log(
        `✅ [Financial Coach] AI event stored (${level}) | Flags →`,
        decision.behavioralFlags
      );
    } else {
      console.log(
        'ℹ️ [Financial Coach] Transaction is normal – no AI alert created'
      );
    }

    // ============================================
    // D. DECIDE IF SHOULD STORE MEMORY / UPDATE REPORT
    // ============================================
    // Only store meaningful transactions, not all transactions

    const shouldStoreMemory =
      shouldCreateAlert ||
      habitBroken ||
      goalImpact ||
      milestone ||
      microLeak ||
      behaviorDrift ||
      spendingBurst ||
      improvementTrend ||
      recovery ||
      Math.abs(changeFromLastWeek) > 40 ||
      savingStreak >= 3 ||
      riskScore >= 20 ||
      positivityScore >= 25;

    // ============================================
    // E. UPDATE FINANCIAL REPORT (only for meaningful transactions)
    // ============================================

    if (shouldStoreMemory) {
      try {
        const report = await updateFinancialReport(userId, 'transaction');
        console.log(
          `✅ [Financial Coach] Report updated. Health Score: ${
            report?.financialHealthScore || 'N/A'
          }`
        );
      } catch (reportError) {
        console.error(
          '❌ [Financial Coach] Report update failed:',
          reportError.message
        );
        // Don't throw - continue with other operations
      }
    }

    // ============================================
    // F. STORE IN CHROMA MEMORY (only for meaningful transactions)
    // ============================================

    const memoryType =
      level === 'POSITIVE'
        ? 'positive_behavior'
        : level === 'CRITICAL' || level === 'HIGH'
        ? 'spending_alert'
        : 'daily_activity';

    if (shouldStoreMemory) {
      const dateStr = transactionDate.toISOString().split('T')[0];
      const memoryContent = `
On ${dateStr}, user ${
        transactionType === 'expense'
          ? 'spent'
          : transactionType === 'income'
          ? 'earned'
          : 'saved'
      } ₹${transactionAmount} in ${transactionCategory}.

${
  level === 'CRITICAL'
    ? '⚠️ CRITICAL'
    : level === 'HIGH'
    ? '⚠️ HIGH'
    : level === 'POSITIVE'
    ? '🌟 POSITIVE'
    : ''
} ${level !== 'LOW' ? 'ALERT' : 'ACTIVITY'}

${
  reasons.length > 0
    ? `Reasons:\n${reasons.map((r) => `- ${r}`).join('\n')}`
    : ''
}

${
  goalImpact
    ? `Impact on goals: ${affectedGoals.map((g) => g.name).join(', ')}`
    : ''
}
${
  nearGoal
    ? `Near milestone: ${affectedGoals
        .map(
          (g) =>
            `${g.name} (${Math.round(
              ((g.currentAmount || 0) / g.targetAmount) * 100
            )}%)`
        )
        .join(', ')}`
    : ''
}
${habitBroken ? 'Habit pattern broken' : ''}

Current Stats:
- Monthly Income: ₹${stats.monthlyIncome || 0}
- Monthly Expense: ₹${stats.monthlyExpense || 0}
- Savings Rate: ${stats.savingsRate || 0}%
- Net Worth: ₹${stats.netWorth || 0}
    `.trim();

      await sendToMemory({
        userId,
        content: memoryContent,
        type: memoryType,
        metadata: {
          transactionId: transaction._id.toString(),
          level,
          riskScore,
          positivityScore,
          category: transactionCategory,
          transactionType,
          goalImpact,
          nearGoal,
          habitBroken,
          milestone,
          behaviorDrift,
          microLeak,
          spendingBurst,
          improvementTrend,
          recovery,
          changeFromLastWeek: changeFromLastWeek.toFixed(1),
          changeFromLastMonth: changeFromLastMonth.toFixed(1),
          source: 'financial_coach',
          createdAt: transactionDate.toISOString(),
        },
      });
    }

    // ============================================
    // F. SEND EMAIL IF NEEDED
    // ============================================

    // Check transaction count - don't send emails for first 1-2 transactions
    const totalTransactionCount = stats.totalTransactions || 0;
    const hasEnoughTransactions = totalTransactionCount >= 3; // Require at least 3 transactions

    // Email should be sent for significant events (but only if enough transactions)
    const shouldSendEmail =
      hasEnoughTransactions &&
      (level === 'CRITICAL' ||
        level === 'HIGH' ||
        level === 'POSITIVE' ||
        milestone ||
        goalDanger ||
        habitBroken ||
        riskScore >= 20 || // Also send for high risk scores
        positivityScore >= 30); // Or high positivity scores

    console.log(
      `📧 [Financial Coach] Email check: shouldSend=${shouldSendEmail}`
    );
    console.log(`   Transaction count: ${totalTransactionCount} (need >= 3)`);
    console.log(
      `   Level: ${level}, Risk Score: ${riskScore}, Positivity Score: ${positivityScore}`
    );
    console.log(
      `   Milestone: ${milestone}, Goal Danger: ${goalDanger}, Habit Broken: ${habitBroken}`
    );

    // Send email even if alert creation had issues (use transaction data directly)
    if (shouldSendEmail) {
      try {
        console.log(
          `📧 [Financial Coach] Attempting to send ${level} email...`
        );
        await sendFinancialCoachEmail({
          userId,
          transaction,
          alert: alert || {
            title: `${level} Alert`,
            level,
            scope: transactionType,
          },
          level,
          reasons,
          stats,
          goals: affectedGoals,
          insights: {
            changeFromLastWeek,
            changeFromLastMonth,
            goalImpact,
            nearGoal,
            habitBroken,
            milestone,
          },
        });
        console.log(
          `✅ [Financial Coach] Email sent successfully for ${level} alert`
        );
      } catch (emailError) {
        console.error(
          '❌ [Financial Coach] Email send failed:',
          emailError.message
        );
        console.error('   Error stack:', emailError.stack);
        // Don't throw - email failure shouldn't break the flow
      }
    } else {
      console.log(
        `⏭️ [Financial Coach] Email not sent (level=${level}, thresholds not met)`
      );
    }

    // ============================================
    // G. RETURN ANALYSIS RESULT
    // ============================================

    console.log('✅ Financial Coach Engine is the only alert brain now');

    return {
      level,
      reasons,
      insights,
      changeFromLastWeek: changeFromLastWeek.toFixed(1),
      changeFromLastMonth: changeFromLastMonth.toFixed(1),
      goalImpact,
      nearGoal,
      habitBroken,
      milestone,
      riskScore,
      positivityScore,
      alert,
      emailSent: shouldSendEmail,
    };
  } catch (error) {
    console.error('❌ [Financial Coach] Error:', error);
    return {
      level: 'LOW',
      reasons: [],
      insights: [],
      error: error.message,
    };
  }
}

/*
THIS SYSTEM TURNS FINTASTIC INTO A FINANCIAL COACH:

1. Every money action is interpreted
2. Patterns are compared with history
3. Goals are protected
4. Emails notify important signals
5. Memory is built in Chroma
6. Financial report updated live
7. Alerts auto resolve
8. AI truly "knows" the user
*/
