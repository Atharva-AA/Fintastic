import AiAlert from '../models/AiAlert.js';
import Transaction from '../models/Transaction.js';
import { getUserStatsInternal } from './getUserStats.internal.js';
import { sendToMemory } from './memory.utils.js';
import { sendFinancialCoachEmail } from './sendFinancialCoachEmail.js';
import { updateFinancialReport } from './updateFinancialReport.js';

export async function resolveAlerts({ userId, stats = null, goals = [] }) {
  const latestStats = stats || (await getUserStatsInternal(userId));
  if (!latestStats) return;

  const activeAlerts = await AiAlert.find({
    userId,
    status: 'active',
  });

  const now = new Date();
  const updates = [];
  const goalStats =
    latestStats.goalStats ||
    goals.map((g) => ({
      goalId: g._id,
      progress:
        g.targetAmount > 0
          ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100)
          : 0,
      status:
        g.targetAmount > 0 && (g.currentAmount || 0) >= g.targetAmount
          ? 'completed'
          : 'active',
    }));

  // Get recent transactions for improvement detection
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentTransactions = await Transaction.find({
    userId,
    createdAt: { $gte: sevenDaysAgo }
  }).sort({ createdAt: -1 }).lean();

  const recentExpenses = recentTransactions.filter(tx => tx.type === 'expense');
  const recentSavings = recentTransactions.filter(tx => tx.type === 'saving' || tx.type === 'investment');
  const recentIncome = recentTransactions.filter(tx => tx.type === 'income');
  const recentGoalContributions = recentTransactions.filter(tx => 
    (tx.type === 'saving' || tx.type === 'investment') && tx.note?.toLowerCase().includes('goal')
  );

  for (const alert of activeAlerts) {
    const area = alert.areaKey;

    // ========== IMPROVEMENT-BASED RESOLUTION ==========
    
    // Overspending: 5 consistent low expenses
    if (area.startsWith('overspending_')) {
      const cat = area.replace('overspending_', '');
      const catExpenses = recentExpenses.filter(tx => tx.category === cat);
      
      if (catExpenses.length >= 5) {
        const avgAmount = catExpenses.reduce((sum, tx) => sum + (tx.amount || 0), 0) / catExpenses.length;
        const previousAvg = alert.meta?.lastAmount || 0;
        
        if (avgAmount < previousAvg * 0.7) {
          updates.push({ alert, reason: 'behavior_improved', improvementType: 'consistent_low_expenses' });
          continue;
        }
      }
      
      // Also check category percent
      const catPercent = Number(latestStats.categoryPercents?.[cat] || 0);
      if (catPercent < 15) {
        updates.push({ alert, reason: 'metrics_improved' });
        continue;
      }
    }

    // Low saving: 3 savings in a row
    if (area === 'low_savings_rate') {
      if (recentSavings.length >= 3) {
        const last3Savings = recentSavings.slice(0, 3);
        const allRecent = last3Savings.every(tx => 
          new Date(tx.createdAt) >= new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
        );
        
        if (allRecent) {
          updates.push({ alert, reason: 'behavior_improved', improvementType: 'savings_streak' });
          continue;
        }
      }
      
      // Also check savings rate
      if (latestStats.savingsRate >= 20) {
      updates.push({ alert, reason: 'metrics_improved' });
        continue;
      }
    }

    // Goal danger: 2 goal contributions
    if (area.startsWith('goal_delay_') || area.includes('goal')) {
      if (recentGoalContributions.length >= 2) {
        updates.push({ alert, reason: 'behavior_improved', improvementType: 'goal_contributions' });
        continue;
      }
      
      // Also check goal completion
      if (goalStats?.length) {
        const goalId = area.replace('goal_delay_', '').replace('goal_', '');
      const goal = goalStats.find((g) => g.goalId?.toString() === goalId);
      if (goal && (goal.status === 'completed' || goal.progress >= 90)) {
        updates.push({ alert, reason: 'goal_completed' });
          continue;
      }
    }
  }

    // Income instability: 3 stable incomes
    if (area.includes('income') || area.includes('instability')) {
      if (recentIncome.length >= 3) {
        const incomeAmounts = recentIncome.map(tx => tx.amount || 0);
        const avg = incomeAmounts.reduce((sum, amt) => sum + amt, 0) / incomeAmounts.length;
        const variance = incomeAmounts.reduce((sum, amt) => sum + Math.abs(amt - avg), 0) / incomeAmounts.length;
        const stability = variance / avg;
        
        if (stability < 0.2) { // Low variance = stable
          updates.push({ alert, reason: 'behavior_improved', improvementType: 'stable_income' });
          continue;
        }
      }
    }
  }

  for (const { alert, reason, improvementType } of updates) {
    alert.status = 'resolved';
    alert.resolvedAt = now;
    alert.resolvedBy = 'system';
    alert.resolutionReason = reason;
    alert.resolvedCount = (alert.resolvedCount || 0) + 1;
    await alert.save();

    // Store improvement in Chroma
    if (reason === 'behavior_improved') {
      const improvementContent = `
BEHAVIOR IMPROVEMENT DETECTED

Alert: ${alert.title}
Area: ${alert.scope}
Improvement Type: ${improvementType || 'general'}

The user has shown consistent positive behavior:
${improvementType === 'consistent_low_expenses' ? '- 5 consecutive low expense transactions' : ''}
${improvementType === 'savings_streak' ? '- 3 savings/investments in a row' : ''}
${improvementType === 'goal_contributions' ? '- 2 goal contributions made' : ''}
${improvementType === 'stable_income' ? '- 3 stable income transactions' : ''}

This improvement resolved the alert automatically.
The user is making progress toward better financial health.
      `.trim();

      await sendToMemory({
        userId: userId.toString(),
        content: improvementContent,
        type: 'behavior_improvement',
        metadata: {
          alertId: alert._id.toString(),
          improvementType: improvementType || 'general',
          resolvedAt: now.toISOString(),
          source: 'auto_resolution'
        }
      });

      // Send positive email for improvements
      try {
        await sendFinancialCoachEmail({
          userId,
          transaction: null, // No specific transaction
          alert,
          level: 'POSITIVE',
          reasons: [
            `You've shown consistent improvement in ${alert.scope}`,
            `Your ${improvementType || 'positive behavior'} resolved the alert`,
            'Keep up the excellent work!'
          ],
          stats: latestStats,
          goals: [],
          insights: {
            improvementType,
            behavior_improved: true
          }
        });
      } catch (emailError) {
        console.error('Email error on improvement:', emailError);
      }
    }

    // Update financial report when alerts resolve
    await updateFinancialReport(userId, 'alert');
  }

  return { resolvedCount: updates.length };
}
