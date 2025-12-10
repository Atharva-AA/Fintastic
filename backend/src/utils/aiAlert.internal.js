import AiAlert from "../models/AiAlert.js";
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";

/* ============================================
   DECIDE: create / update / skip alert
============================================*/

export async function shouldCreateOrUpdateAlert(userId, areaInfo, decision) {

  const now = new Date();

  const existing = await AiAlert.findOne({
    userId,
    scope: areaInfo.scope,
    areaKey: areaInfo.areaKey,
    status: "active"
  });

  /* ----------------------------------
     1. No existing alert → CREATE
  ---------------------------------- */
  if (!existing) {
    return { mode: "create", existing: null };
  }

  if (
    existing.level === "CRITICAL" &&
    decision.level === "CRITICAL" &&
    existing.lastTriggeredAt &&
    now - existing.lastTriggeredAt < 24 * 60 * 60 * 1000
  ) {
    console.log("⏳ Skipping duplicate CRITICAL alert within 24h");
    return existing;
  }

  console.log(
    "🧠 Checking alert:",
    areaInfo.areaKey,
    "existing:",
    !!existing,
    "existingRisk:",
    existing?.lastRiskScore,
    "newRisk:",
    decision.riskScore
  );

  /* ----------------------------------
     2. COOLDOWN — avoid spamming
  ---------------------------------- */
  if (existing.coolDownUntil && existing.coolDownUntil > now) {
    console.log("➡️ Decision: SKIP (cooldown active)");
    return { mode: "skip", existing };
  }

  /* ----------------------------------
     3. Reinforcement behaviour
  ---------------------------------- */

  const triggerCount  = existing.triggerCount || 1;
  const resolvedCount = existing.resolvedCount || 0;
  const ignoredCount  = existing.ignoredCount || 0;

  const ignoreRatio  = ignoredCount / triggerCount;
  const resolveRatio = resolvedCount / triggerCount;

  // If user keeps ignoring → be LESS sensitive
  if (ignoreRatio > 0.6) {
    const delta = 30;
    if (decision.riskScore < (existing.lastRiskScore || 0) + delta) {
      return { mode: "skip", existing };
    }
  }

  // If user usually fixes → be MORE sensitive
  if (resolveRatio > 0.5) {
    const delta = 5;
    if (decision.riskScore > (existing.lastRiskScore || 0) + delta) {
      return { mode: "update", existing };
    }
  }

  /* ----------------------------------
     4. STRICT CHANGE DETECTION
  ---------------------------------- */
  if (
    existing.level === decision.level &&
    Math.abs(decision.riskScore - (existing.lastRiskScore || 0)) < 10
  ) {
    console.log("➡️ Decision: SKIP (minimal risk change)");
    return { mode: "skip", existing };
  }

  const existingReasons = existing.meta?.lastReasons || [];
  const newReasons = decision.reasons || [];
  if (
    JSON.stringify([...existingReasons].sort()) ===
    JSON.stringify([...newReasons].sort())
  ) {
    console.log("➡️ Decision: SKIP (same reasons)");
    return { mode: "skip", existing };
  }

  if (decision.riskScore > (existing.lastRiskScore || 0) + 20) {
    console.log("➡️ Decision: UPDATE (risk increased)");
    return { mode: "update", existing };
  }

  if (decision.riskScore < (existing.lastRiskScore || 0) - 20) {
    console.log("➡️ Decision: UPDATE (risk decreased)");
    return { mode: "update", existing };
  }

  console.log("➡️ Decision: SKIP (no meaningful change)");
  return { mode: "skip", existing };
}


/* ============================================
   GENERATE AND STORE AI INSIGHT (PAGE-SPECIFIC)
============================================*/

async function generateAndStoreAiInsight(alert, stats, behaviorProfile = {}, goals = [], recentTransactions = []) {
  try {
    // Detect page from alert scope
    let page = "dashboard";
    const scope = alert.scope?.toLowerCase();
    
    if (scope === "income") {
      page = "income";
    } else if (scope === "expense") {
      page = "expense";
    } else if (scope === "saving") {
      page = "savings";
    } else if (scope === "investment") {
      page = "investment";
    } else if (scope === "goal") {
      page = "goals";
    } else {
      page = "dashboard";
    }

    console.log(`🤖 [AI Insight] Generating ${page} report for alert: ${alert._id}`);
    
    // Fetch recent transactions if not provided
    if (!recentTransactions || recentTransactions.length === 0) {
      try {
        const Transaction = (await import('../models/Transaction.js')).default;
        
        // Fetch last 20 transactions, filtered by type if page-specific
        const query = { userId: alert.userId };
        
        // Page-specific filtering
        if (page === 'income') {
          query.type = 'income';
        } else if (page === 'expense') {
          query.type = 'expense';
        } else if (page === 'savings') {
          query.type = 'saving';
        } else if (page === 'investment') {
          query.type = 'investment';
        }
        // For goals and dashboard, fetch all types
        
        recentTransactions = await Transaction.find(query)
          .sort({ occurredAt: -1, createdAt: -1 })
          .limit(20)
          .select('type category subtype amount note occurredAt')
          .lean();
        
        console.log(`📊 [AI Insight] Fetched ${recentTransactions.length} recent transactions for context`);
      } catch (txError) {
        console.warn(`⚠️ [AI Insight] Failed to fetch transactions:`, txError.message);
        recentTransactions = [];
      }
    }

    // Prepare goal metadata for prediction (goals page only)
    let goalMetadata = {};
    if (page === 'goals' && alert.meta?.goalId && goals.length > 0) {
      const targetGoal = goals.find(g => g._id?.toString() === alert.meta.goalId?.toString());
      if (targetGoal) {
        goalMetadata = {
          needsPrediction: true,
          goalId: targetGoal._id,
          goalName: targetGoal.name,
          targetAmount: targetGoal.targetAmount,
          currentAmount: targetGoal.currentAmount || 0,
          deadline: targetGoal.deadline,
          priority: targetGoal.priority
        };
      }
    }
    
    const response = await axios.post(`${AI_SERVICE_URL}/ai/insights`, {
      userId: alert.userId.toString(),
      alert: {
        id: alert._id.toString(),
        level: alert.level,
        scope: alert.scope,
        title: alert.title,
        reasons: alert.meta?.lastReasons || [],
        metadata: {
          ...alert.meta,
          ...goalMetadata
        }
      },
      stats: stats || {},
      goals: goals || [],
      behaviorProfile: behaviorProfile || {},
      recentTransactions: recentTransactions || [],
      page: page,
      dataConfidence: "high"
    }, {
      timeout: 30000 // 30 second timeout for AI generation
    });

    if (response.data?.success) {
      // Check if we got the new 5-report format
      if (response.data.fullInsights && response.data.fullInsights.reports) {
        // New unified 5-report format
        alert.fullInsights = {
          classifiedType: response.data.fullInsights.classifiedType || page || "general",
          updatedAt: new Date(response.data.fullInsights.updatedAt || Date.now()),
          reports: response.data.fullInsights.reports
        };
        
        // Also update pageReports for backward compatibility
        if (!alert.pageReports) {
          alert.pageReports = {};
        }
        
        // Update the specific page report
        const pageReport = response.data.fullInsights.reports[page] || response.data.fullInsights.reports.dashboard || response.data.fullInsights.reports.income;
        if (pageReport) {
          alert.pageReports[page] = {
            updatedAt: new Date(),
            title: pageReport.title || alert.title,
            positives: pageReport.positive || "",
            negatives: pageReport.warning || "",
            action: pageReport.actionStep || ""
          };
        }
        
        await alert.save();
        console.log(`📊 Full 5-report insights stored for alert: ${alert._id}`);
        return response.data.fullInsights;
      } else if (response.data?.insight) {
        // Legacy single insight format (backward compatibility)
        const insight = response.data.insight;
        
        // Initialize pageReports if it doesn't exist
        if (!alert.pageReports) {
          alert.pageReports = {};
        }
        
        // Save to pageReports
        alert.pageReports[page] = {
          updatedAt: new Date(),
          title: insight.title || alert.title,
          positives: insight.positive || "",
          negatives: insight.improvement || "",
          action: insight.action || ""
        };
        
        // Also update legacy aiInsight for backward compatibility
        alert.aiInsight = {
          title: insight.title,
          ai_noticing: insight.ai_noticing || "",
          positive: insight.positive,
          improvement: insight.improvement,
          action: insight.action,
          generatedAt: new Date()
        };
        
        await alert.save();
        
        console.log(`📊 Page report updated: ${page}`);
        console.log(`✅ [AI Insight] Stored ${page} report for alert: ${alert._id}`);
        return insight;
      } else {
        console.warn(`⚠️ [AI Insight] AI service returned unsuccessful response`);
        return null;
      }
    } else {
      console.warn(`⚠️ [AI Insight] AI service returned unsuccessful response`);
      return null;
    }
  } catch (error) {
    console.error(`❌ [AI Insight] Failed to generate ${page} report:`, error.message);
    // Don't throw - insight generation failure shouldn't break alert creation
    return null;
  }
}


/* ============================================
   CREATE OR UPDATE ALERT
============================================*/

export async function createOrUpdateAiAlert({
  userId,
  areaInfo,
  decision,
  transaction,
  stats,
  goals = [],
  history = {}
}) {

  const now = new Date();

  const { mode, existing } = await shouldCreateOrUpdateAlert(
    userId,
    areaInfo,
    decision
  );

  if (mode === "skip") return existing;

  /* ----------------------------------
     Calculate cooldown days
  ---------------------------------- */

  let coolDownDays = 1;

  if (decision.level === "HIGH")     coolDownDays = 3;
  if (decision.level === "CRITICAL") coolDownDays = 7;

  const coolDownUntil = new Date(
    now.getTime() + coolDownDays * 24 * 60 * 60 * 1000
  );

  /* ----------------------------------
     Data to insert/update
  ---------------------------------- */

  const updateData = {
    level: decision.level,
    lastRiskScore: decision.riskScore,
    lastPositivityScore: decision.positivityScore,
    lastTransactionId: transaction._id,
    lastTriggeredAt: now,
    title: areaInfo.title,
    page: areaInfo.page,
    coolDownUntil,

    meta: {
      ...(existing?.meta || {}),

      lastReasons: decision.reasons,
      lastCategory: transaction.category,
      lastAmount: transaction.amount,

      statsSnapshot: {
        monthlyIncome: stats.monthlyIncome,
        monthlyExpense: stats.monthlyExpense,
        savingsRate: stats.savingsRate,
        investmentRate: stats.investmentRate,
        netWorth: stats.netWorth,
      }
    }
  };

  /* ----------------------------------
     CREATE MODE
  ---------------------------------- */

  if (mode === "create") {

    const newAlert = await AiAlert.create({
      userId,
      scope: areaInfo.scope,
      areaKey: areaInfo.areaKey,
      status: "active",
      triggerCount: 1,
      ...updateData
    });

    // Generate and store AI insight asynchronously (don't block alert creation)
    const recentTransactions = history.recentExpenses?.slice(0, 10) || [];
    generateAndStoreAiInsight(newAlert, stats, {}, goals, recentTransactions).catch(err => {
      console.error(`❌ [AI Insight] Background insight generation failed:`, err.message);
    });

    return newAlert;
  }

  /* ----------------------------------
     UPDATE MODE
  ---------------------------------- */

  if (mode === "update" && existing) {

    existing.triggerCount += 1;

    Object.assign(existing, updateData);

    await existing.save();

    // Generate and store AI insight asynchronously (don't block alert update)
    const recentTransactions = history.recentExpenses?.slice(0, 10) || [];
    generateAndStoreAiInsight(existing, stats, {}, goals, recentTransactions).catch(err => {
      console.error(`❌ [AI Insight] Background insight generation failed:`, err.message);
    });

    return existing;
  }

  return existing;
}


/* ============================================
   OPTIONAL: Mark alert as ignored
   (can be used by a cron job)
============================================*/

export async function markAlertAsIgnored(alertId) {
  const alert = await AiAlert.findById(alertId);

  if (!alert || alert.status !== "active") return null;

  alert.ignoredCount = (alert.ignoredCount || 0) + 1;
  await alert.save();

  return alert;
}
