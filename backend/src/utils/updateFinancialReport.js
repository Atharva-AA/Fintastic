import axios from "axios";
import FinancialReport from "../models/FinancialReport.js";
import { getUserStatsInternal } from "./getUserStats.internal.js";
import { getBehaviorProfile } from "./behavior.utils.js";
import { getActiveAlerts } from "./alert.utils.js";
import Transaction from "../models/Transaction.js";
import Goal from "../models/Goal.js";
import { detectGigWorker } from "./detectGigWorker.js";

const AI_URL =
  process.env.AI_URL || "http://localhost:8001/ai/update-report";

export async function updateFinancialReport(userId, source = "system") {
  try {
    console.log(`📊 [Financial Report] Updating for user ${userId}, source: ${source}`);
    
    const last = await FinancialReport.findOne({ userId });
    // For transactions, always update (no cooldown). For other sources, use cooldown.
    if (
      source !== 'transaction' &&
      last &&
      Date.now() - new Date(last.lastUpdatedAt).getTime() <
        10 * 60 * 1000
    ) {
      console.log(`⏭️ [Financial Report] Skipping update (cooldown), returning cached`);
      return last;
    }

    const stats = await getUserStatsInternal(userId);
    const behaviorProfile = await getBehaviorProfile(userId);
    const activeAlerts = await getActiveAlerts(userId);

    // Fetch ONLY real transactions (exclude onboarding)
    const allTransactions = await Transaction.find({ 
      userId,
      source: { $ne: 'onboarding' } // Exclude onboarding transactions
    })
      .sort({ occurredAt: -1 })
      .limit(20)
      .lean();

    const goals = await Goal.find({ userId }).lean();
    
    // Check if we have real transactions
    const hasRealTransactions = allTransactions.length > 0;
    console.log(`📊 [Financial Report] Found ${allTransactions.length} real transactions (onboarding excluded)`);

    // Detect if user is a gig worker
    const gigWorkerInfo = await detectGigWorker(userId, allTransactions);
    console.log(`📊 [Financial Report] Gig worker detection: ${gigWorkerInfo.isGigWorker} (source: ${gigWorkerInfo.source})`);

    const payload = {
      userId,
      stats,
      behaviorProfile,
      activeAlerts,
      goals,
      recentTransactions: allTransactions, // Use filtered transactions
      hasRealTransactions: hasRealTransactions, // Explicit flag
      isGigWorker: gigWorkerInfo.isGigWorker, // Gig worker flag
      gigWorkerIndicators: gigWorkerInfo.indicators, // What indicates gig work
    };

    let data;
    try {
      const response = await axios.post(AI_URL, payload);
      data = response.data;
    } catch (aiError) {
      console.error(`❌ [Financial Report] AI service error:`, aiError.message);
      // Continue with fallback data if AI service fails
      data = {
        summary: "Financial report update in progress. Check back soon.",
        strengths: [],
        risks: [],
        suggestions: []
      };
    }

    if (!data || !data.summary) {
      console.warn(`⚠️ [Financial Report] No summary from AI, using fallback`);
      data = {
        summary: "Financial analysis is being processed.",
        strengths: stats.savingsRate > 10 ? ["Good savings rate"] : [],
        risks: stats.monthlyExpense > stats.monthlyIncome ? ["Expenses exceed income"] : [],
        suggestions: ["Continue tracking your transactions"]
      };
    }

    // Calculate financial health score (0-100)
    let healthScore = 50; // Base score
    
    // Savings rate contribution (0-25 points)
    if (stats.savingsRate >= 20) healthScore += 25;
    else if (stats.savingsRate >= 15) healthScore += 20;
    else if (stats.savingsRate >= 10) healthScore += 15;
    else if (stats.savingsRate >= 5) healthScore += 10;
    else if (stats.savingsRate > 0) healthScore += 5;
    
    // Expense vs income (0-20 points)
    if (stats.monthlyExpense < stats.monthlyIncome * 0.7) healthScore += 20;
    else if (stats.monthlyExpense < stats.monthlyIncome * 0.85) healthScore += 15;
    else if (stats.monthlyExpense < stats.monthlyIncome) healthScore += 10;
    else if (stats.monthlyExpense < stats.monthlyIncome * 1.1) healthScore += 5;
    
    // Investment rate (0-15 points)
    if (stats.investmentRate >= 15) healthScore += 15;
    else if (stats.investmentRate >= 10) healthScore += 12;
    else if (stats.investmentRate >= 5) healthScore += 8;
    else if (stats.investmentRate > 0) healthScore += 4;
    
    // Goal progress (0-15 points)
    const goalStats = stats.goalStats || [];
    if (goalStats.length > 0) {
      const avgProgress = goalStats.reduce((sum, g) => sum + (g.progress || 0), 0) / goalStats.length;
      if (avgProgress >= 75) healthScore += 15;
      else if (avgProgress >= 50) healthScore += 12;
      else if (avgProgress >= 25) healthScore += 8;
      else healthScore += 4;
    }
    
    // Alerts penalty (0-15 points deducted)
    const criticalAlerts = activeAlerts.filter(a => a.level === 'CRITICAL').length;
    const highAlerts = activeAlerts.filter(a => a.level === 'HIGH').length;
    healthScore -= (criticalAlerts * 5) + (highAlerts * 2);
    
    // Behavior profile (0-10 points)
    if (behaviorProfile) {
      const discipline = behaviorProfile.disciplineScore || 50;
      const consistency = behaviorProfile.consistencyIndex || 50;
      const avgBehavior = (discipline + consistency) / 2;
      healthScore += (avgBehavior - 50) / 5; // Scale to 0-10
    }
    
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // Calculate weekly trend
    const lastWeekExpense = stats.weeklyExpense || 0;
    const lastLastWeekExpense = stats.lastWeekExpense || 0;
    let weeklyTrend = 'stable';
    if (lastLastWeekExpense > 0) {
      const change = ((lastWeekExpense - lastLastWeekExpense) / lastLastWeekExpense) * 100;
      if (change < -10) weeklyTrend = 'improving';
      else if (change > 10) weeklyTrend = 'risky';
    }

    // Calculate goal health
    let goalHealth = 'good';
    if (goalStats.length > 0) {
      const avgProgress = goalStats.reduce((sum, g) => sum + (g.progress || 0), 0) / goalStats.length;
      const onTrackGoals = goalStats.filter(g => {
        const deadline = g.deadline ? new Date(g.deadline) : null;
        if (!deadline) return true;
        const monthsRemaining = (deadline - new Date()) / (1000 * 60 * 60 * 24 * 30);
        const neededProgress = monthsRemaining > 0 ? 100 / (monthsRemaining / (goalStats.length || 1)) : 100;
        return (g.progress || 0) >= neededProgress;
      }).length;
      
      if (avgProgress >= 75 && onTrackGoals === goalStats.length) goalHealth = 'excellent';
      else if (avgProgress >= 50 && onTrackGoals >= goalStats.length * 0.7) goalHealth = 'good';
      else if (avgProgress >= 25) goalHealth = 'at_risk';
      else goalHealth = 'critical';
    }

    // Calculate saving discipline
    let savingDiscipline = 'good';
    const savingsRate = stats.savingsRate || 0;
    if (savingsRate >= 20) savingDiscipline = 'excellent';
    else if (savingsRate >= 15) savingDiscipline = 'good';
    else if (savingsRate >= 10) savingDiscipline = 'needs_improvement';
    else savingDiscipline = 'poor';

    // Calculate income stability
    let incomeStability = 'moderate';
    const incomeTrend = stats.incomeTrend || 'stable';
    if (incomeTrend === 'stable' || incomeTrend === 'up') incomeStability = 'stable';
    else if (incomeTrend === 'down') incomeStability = 'unstable';

    const statsSnapshot = {
      monthlyIncome: stats?.monthlyIncome ?? 0,
      monthlyExpense: stats?.monthlyExpense ?? 0,
      savingsRate: stats?.savingsRate ?? 0,
      investmentRate: stats?.investmentRate ?? 0,
      netWorth: stats?.netWorth ?? 0,
    };

    const updated = await FinancialReport.findOneAndUpdate(
      { userId },
      {
        financialHealthScore: healthScore,
        summary: data.summary,
        strengths: data.strengths || data.key_points || [],
        risks: data.risks || [],
        suggestions: data.suggestions || data.recommendations || [],
        keyPoints: data.key_points || data.strengths || [],
        recommendations: data.recommendations || data.suggestions || [],
        statsSnapshot,
        weeklyTrend,
        goalHealth,
        savingDiscipline,
        incomeStability,
        source,
        lastUpdatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ [Financial Report] Updated successfully. Health Score: ${healthScore}, Source: ${source}`);
    return updated;
  } catch (err) {
    console.error("❌ [Financial Report] Update failed:", err.message);
    console.error(err.stack);
    return null;
  }
}