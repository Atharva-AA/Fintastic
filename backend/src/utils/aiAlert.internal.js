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
   GENERATE AND STORE AI INSIGHT
============================================*/

async function generateAndStoreAiInsight(alert, stats, behaviorProfile = {}) {
  try {
    console.log(`🤖 [AI Insight] Generating insight for alert: ${alert._id}`);
    
    const response = await axios.post(`${AI_SERVICE_URL}/ai/insights`, {
      userId: alert.userId.toString(),
      alert: {
        id: alert._id.toString(),
        level: alert.level,
        scope: alert.scope,
        title: alert.title,
        reasons: alert.meta?.lastReasons || []
      },
      stats: stats || {},
      behaviorProfile: behaviorProfile || {},
      dataConfidence: "high" // Assuming high confidence for real transaction data
    }, {
      timeout: 10000 // 10 second timeout
    });

    if (response.data?.success && response.data?.insight) {
      const insight = response.data.insight;
      
      // Update alert with AI insight
      alert.aiInsight = {
        title: insight.title,
        ai_noticing: insight.ai_noticing,
        positive: insight.positive,
        improvement: insight.improvement,
        action: insight.action,
        generatedAt: new Date()
      };
      
      await alert.save();
      
      console.log(`✅ [AI Insight] Stored insight for alert: ${alert._id}`);
      return insight;
    } else {
      console.warn(`⚠️ [AI Insight] AI service returned unsuccessful response`);
      return null;
    }
  } catch (error) {
    console.error(`❌ [AI Insight] Failed to generate insight:`, error.message);
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
  stats
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
      lastType: transaction.type,
      lastScope: areaInfo.scope,
      lastAreaKey: areaInfo.areaKey,
      behavioralFlags: decision.behavioralFlags || {},
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
    generateAndStoreAiInsight(newAlert, stats).catch(err => {
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
    generateAndStoreAiInsight(existing, stats).catch(err => {
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
