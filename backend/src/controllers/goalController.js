import Goal from "../models/Goal.js";
import Transaction from "../models/Transaction.js";
import BehaviorProfile from "../models/BehaviorProfile.js";
import AiInsight from "../models/AiInsight.js";
import { getUserStatsInternal } from "../utils/getUserStats.internal.js";
import { getUserHistoryInternal } from "../utils/getUserHistory.internal.js";
import { resolveAlerts } from "../utils/resolveAlerts.internal.js";
import { runFinancialCoachEngine } from "../utils/financialCoachEngine.js";
import axios from "axios";

/*
=====================================
 CREATE GOAL (Manual or Onboarding)
=====================================
*/

export const createGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, targetAmount, currentAmount = 0, priority, deadline } =
      req.body;

    /* ---------------- VALIDATION ---------------- */

    if (!name || !targetAmount) {
      return res.status(400).json({
        message: "Goal name and target amount are required",
      });
    }

    const target = Number(targetAmount);
    if (isNaN(target) || target <= 0) {
      return res.status(400).json({
        message: "Invalid target amount",
      });
    }

    const allowedPriorities = ["must_have", "good_to_have"];
    const finalPriority = allowedPriorities.includes(priority)
      ? priority
      : "good_to_have";

    /* ---------------- SAVE IN MONGO ---------------- */

    const goal = await Goal.create({
      userId,
      name: name.trim(),
      targetAmount: target,
      currentAmount: Number(currentAmount) || 0,
      priority: finalPriority,
      deadline: deadline || null,
    });

    /* ---------------- SAVE IN CHROMA ---------------- */

    const memoryContent = `
User created a new financial goal:

Goal: ${goal.name}
Target Amount: ₹${goal.targetAmount}
Priority: ${goal.priority}
Deadline: ${goal.deadline ? goal.deadline : "Not set"}
This goal is very important to the user and should be considered in future financial decisions.
`;

    await sendToMemory({
      userId,
      type: "goal_profile",
      content: memoryContent,
      metadata: {
        goalId: goal._id.toString(),
        targetAmount: goal.targetAmount,
        priority: goal.priority,
        deadline: goal.deadline || null,
        source: "manual"
      },
    });

    /* ---------------- RESPONSE ---------------- */

    res.status(201).json({
      message: "Goal created successfully",
      data: goal,
    });
  } catch (error) {
    console.error("Create goal error:", error);
    res.status(500).json({ message: "Server error" });
  }
};





/*
=====================================
 GET GOAL STATUS (LIVE)
=====================================
*/

export const getGoalStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const goals = await Goal.find({ userId });

    if (!goals.length) {
      return res.json({ goals: [], message: "No goals found" });
    }

    const results = [];

    for (let goal of goals) {
      // Total savings + investment
      const savings = await Transaction.aggregate([
        {
          $match: {
            userId,
            type: { $in: ["saving", "investment"] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const totalSaved = savings[0]?.total || 0;

      const remaining = goal.targetAmount - totalSaved;
      const percentComplete =
        (totalSaved / goal.targetAmount) * 100;

      const deadline = goal.deadline
        ? new Date(goal.deadline)
        : null;

      let monthsLeft = null;
      let monthlyRequired = null;

      if (deadline) {
        const now = new Date();
        const diffTime = deadline - now;
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));

        monthsLeft = diffMonths > 0 ? diffMonths : 1;
        monthlyRequired = remaining / monthsLeft;
      }

      // Status level
      let status = "ON_TRACK";
      if (percentComplete < 25) status = "BEHIND";
      if (remaining <= 0) status = "COMPLETED";

      results.push({
        goalId: goal._id,
        name: goal.name,
        targetAmount: goal.targetAmount,
        savedAmount: totalSaved,
        remaining,
        percentComplete: Math.min(percentComplete, 100).toFixed(2),
        priority: goal.priority,
        monthsLeft,
        monthlyRequired: monthlyRequired
          ? Math.ceil(monthlyRequired)
          : null,
        status,
      });
    }

    res.json({
      goals: results,
    });

  } catch (error) {
    console.error("Goal Status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/*
=====================================
   ADD CONTRIBUTION TO GOAL
=====================================
*/

export const contributeToGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { goalId, amount, note } = req.body;

    if (!goalId || !amount) {
      return res.status(400).json({
        message: "goalId and amount are required",
      });
    }

    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "Invalid amount",
      });
    }

    /* -------------------------
       1. Find goal
    ------------------------- */
    const goal = await Goal.findOne({ _id: goalId, userId });

    if (!goal) {
      return res.status(404).json({
        message: "Goal not found",
      });
    }

    /* -------------------------
       2. Update goal amount
    ------------------------- */
    goal.currentAmount += numericAmount;

    const goalProgress = Math.min(
      Math.round((goal.currentAmount / goal.targetAmount) * 100),
      100
    );

    await goal.save();

    /* -------------------------
       3. Create a saving transaction
    ------------------------- */
    const transaction = await Transaction.create({
      userId,
      type: "saving",
      category: goal.name,
      subtype: "goal_contribution",
      amount: numericAmount,
      source: "goal",
      note: note || `Contribution to ${goal.name}`,
    });

    /* -------------------------
       4. User intelligence
    ------------------------- */
    const stats = await getUserStatsInternal(userId);
    const history = await getUserHistoryInternal(userId);
    const goals = await Goal.find({ userId });

    let behaviorProfileDoc = null;
    let behaviorProfile = null;
    try {
      behaviorProfileDoc = await BehaviorProfile.findOne({ userId }).lean();
      if (behaviorProfileDoc) {
        behaviorProfile = {
          disciplineScore: behaviorProfileDoc.disciplineScore || 50,
          impulseScore: behaviorProfileDoc.impulseScore || 50,
          consistencyIndex: behaviorProfileDoc.consistencyIndex || 50,
          riskIndex: behaviorProfileDoc.riskIndex || 50,
          savingStreak: behaviorProfileDoc.savingStreak || 0,
        };
      }
    } catch (e) {
      console.log("BehaviorProfile fetch failed (safe continue)");
    }

    const userProfile = {
      behaviorProfile,
    };

    /* -------------------------
       5. Extend for AI
    ------------------------- */
    const enrichedTransaction = {
      ...transaction.toObject(),
      goalId: goal._id,
      goalName: goal.name,
      goalProgress,
      goalTarget: goal.targetAmount,
    };

    /* -------------------------
       6. FINANCIAL COACH ENGINE (ONLY DECISION SYSTEM)
    ------------------------- */
    let coachAnalysis = null;
    try {
      coachAnalysis = await runFinancialCoachEngine({
        userId,
        transaction,
        stats,
        goals,
        history,
        behaviorProfile,
      });
      console.log(
        '✅ [Goal Contribution] Financial coach analysis completed:',
        coachAnalysis?.level,
        coachAnalysis?.alert ? 'Alert created' : 'No alert (LOW level)'
      );
    } catch (coachError) {
      console.error(
        '⚠️ [Goal Contribution] Financial coach error (non-critical):',
        coachError.message
      );
      // Continue even if coach engine fails
    }

    // Financial Coach Engine is the ONLY decision system
    // It handles: alert creation, memory storage, financial report updates
    const alert = coachAnalysis?.alert;
    const decision = coachAnalysis ? {
      level: coachAnalysis.level,
      reasons: coachAnalysis.reasons || [],
      riskScore: coachAnalysis.riskScore || 0,
      positivityScore: coachAnalysis.positivityScore || 0,
      trigger: !!alert
    } : null;

    await resolveAlerts({ userId, stats, goals });

    // AI insights are automatically generated by Financial Coach Engine
    // Check if alert already has AI insight (might be populated already)
    let storedInsight = null;
    if (alert && alert.aiInsight) {
      console.log('✅ [Goal Contribution] Alert already has AI insight:', alert.aiInsight.title);
      storedInsight = {
        title: alert.aiInsight.title,
        aiNoticing: alert.aiInsight.ai_noticing,
            suggestions: {
          positive: alert.aiInsight.positive,
          improvement: alert.aiInsight.improvement,
          action: alert.aiInsight.action
        }
      };
    } else if (alert) {
      console.log('⏳ [Goal Contribution] AI insight generation in progress (async)');
    }

    return res.status(200).json({
      message: "Contribution added successfully",
      goal: {
        id: goal._id,
        name: goal.name,
        currentAmount: goal.currentAmount,
        targetAmount: goal.targetAmount,
        progress: goalProgress + "%",
        completed: goalProgress >= 100,
      },
      transaction,
      decision,
      alert,
      insight: storedInsight,
    });
  } catch (error) {
    console.error("Goal contribution error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
