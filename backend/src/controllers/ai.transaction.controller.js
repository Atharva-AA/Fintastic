import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';
import BehaviorProfile from '../models/BehaviorProfile.js';
import AiInsight from '../models/AiInsight.js';
import { parseTransaction } from '../utils/parseTransaction.utils.js';

import { getUserStatsInternal } from '../utils/getUserStats.internal.js';
import { getUserHistoryInternal } from '../utils/getUserHistory.internal.js';
import { updateBehaviorProfile } from '../utils/updateBehaviorProfile.js';
import { resolveAlerts } from '../utils/resolveAlerts.internal.js';
import { runFinancialCoachEngine } from '../utils/financialCoachEngine.js';
import { getStandardizedStats } from '../utils/statsEngine.js';
import { getDataConfidence } from '../utils/dataConfidence.js';
import { detectGigWorker } from '../utils/detectGigWorker.js';

import axios from 'axios';

/* =====================================
   ✅ ADD TRANSACTION (AI)
===================================== */

export const addTransactionAgent = async (req, res) => {
  try {
    console.log('🔥 [addTransactionAgent] REQUEST RECEIVED');
    console.log(
      '🔥 [addTransactionAgent] Headers:',
      JSON.stringify(req.headers, null, 2)
    );
    console.log(
      '🔥 [addTransactionAgent] Body:',
      JSON.stringify(req.body, null, 2)
    );

    const { userId, type, category, amount, note } = req.body;

    // Convert userId to ObjectId if it's a string
    let userIdObj = userId;
    if (typeof userId === 'string') {
      const mongoose = await import('mongoose');
      if (mongoose.default.Types.ObjectId.isValid(userId)) {
        userIdObj = new mongoose.default.Types.ObjectId(userId);
      }
    }

    console.log('🔥 [addTransactionAgent] Extracted values:');
    console.log('  - userId:', userId);
    console.log('  - type:', type);
    console.log('  - category:', category);
    console.log('  - amount:', amount);
    console.log('  - note:', note);

    if (!userId || !type || !category || !amount) {
      console.error('❌ [addTransactionAgent] Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'userId, type, category, amount required',
        error: 'Missing required fields',
      });
    }

    // Validate transaction type
    const validTypes = ['income', 'expense', 'saving', 'investment'];
    if (!validTypes.includes(type)) {
      console.error('❌ [addTransactionAgent] Invalid transaction type:', type);
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        error: 'Invalid transaction type',
      });
    }

    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!['income', 'expense', 'saving', 'investment'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type' });
    }

    /* ---------------------------
       1. SAVE IN DB
    ----------------------------*/
    /* ---------------------------------
   ✅ 1. FIND EXISTING CATEGORY
----------------------------------*/

    let subtype = 'one-time';

    const existing = await Transaction.findOne({
      userId: userIdObj,
      category: { $regex: new RegExp(category, 'i') },
    }).sort({ createdAt: -1 });

    if (existing && existing.subtype) {
      subtype = existing.subtype;
      console.log(
        `♻️ [Subtype] Reusing subtype from existing category: ${subtype}`
      );
    } else {
      console.log(
        '🤖 [Subtype] No existing record — calling parseTransaction to detect subtype'
      );

      try {
        const aiParsed = await parseTransaction(
          note || `${type} in ${category}`,
          numericAmount
        );

        // parseTransaction returns { success: true, data: { type, category, subtype, note } }
        // OR in case of error fallback: { type, category, subtype, note }
        if (aiParsed?.data?.subtype) {
          subtype = aiParsed.data.subtype;
          console.log(
            `🤖 [Subtype] parseTransaction detected subtype: ${subtype}`
          );
        } else if (aiParsed?.subtype) {
          // Fallback in case response structure is different or error fallback
          subtype = aiParsed.subtype;
          console.log(
            `🤖 [Subtype] parseTransaction detected subtype (fallback): ${subtype}`
          );
        } else {
          console.log(
            '⚠️ [Subtype] parseTransaction did not return subtype, using one-time'
          );
        }
      } catch (err) {
        console.warn(
          '⚠️ [Subtype] parseTransaction failed, defaulting to one-time:',
          err.message
        );
      }
    }

    console.log('💾 [addTransactionAgent] Creating transaction in MongoDB...');
    console.log('💾 [addTransactionAgent] Transaction data:', {
      userId,
      type,
      category,
      subtype,
      amount: numericAmount,
      source: 'ai',
      note: note || 'Added by AI',
    });

    const saved = await Transaction.create({
      userId: userIdObj,
      type,
      category,
      subtype,
      amount: numericAmount,
      source: 'ai',
      note: note || 'Added by AI',
    });

    console.log('✅ [addTransactionAgent] Transaction saved successfully!');
    console.log('✅ [addTransactionAgent] Saved transaction ID:', saved._id);
    console.log(
      '✅ [addTransactionAgent] Saved transaction:',
      JSON.stringify(saved, null, 2)
    );

    /* ---------------------------
       2. UPDATE BEHAVIOR PROFILE
    ----------------------------*/
    console.log(
      '🔥 [addTransactionAgent] Updating BehaviorProfile for user:',
      userIdObj
    );
    console.log(
      '🔥 [addTransactionAgent] UserId type:',
      typeof userIdObj,
      'Value:',
      userIdObj
    );

    // Calculate behavior changes based on transaction type
    const behaviorChanges = {};

    if (type === 'saving' || type === 'investment') {
      // Positive financial behavior
      behaviorChanges.disciplineScore = 2;
      behaviorChanges.consistencyIndex = 1;
      if (type === 'saving') {
        behaviorChanges.impulseScore = -1; // Reduce impulse when saving
      }
    } else if (type === 'expense') {
      // Expense might indicate impulse spending
      if (numericAmount > 1000) {
        behaviorChanges.impulseScore = 1; // Large expense might indicate impulse
      }
    } else if (type === 'income') {
      // Income increases consistency
      behaviorChanges.consistencyIndex = 1;
    }

    // Always update behavior profile (will create if doesn't exist)
    // Even with empty changes, this ensures the profile is created
    try {
      // Pass userId directly (can be ObjectId or string, function handles both)
      const result = await updateBehaviorProfile(userIdObj, behaviorChanges);
      if (result) {
        console.log(
          '✅ [addTransactionAgent] BehaviorProfile updated successfully'
        );
      } else {
        console.error(
          '❌ [addTransactionAgent] BehaviorProfile update returned null'
        );
      }
    } catch (err) {
      console.error(
        '⚠️ [addTransactionAgent] Failed to update BehaviorProfile:',
        err.message
      );
      console.error('⚠️ [addTransactionAgent] Error stack:', err.stack);
      // Don't fail the transaction if behavior update fails
    }

    /* ---------------------------
       3. GOAL CONTRIBUTION (if saving/investment)
       Based on goalController.js contributeToGoal logic
    ----------------------------*/
    let goalUpdated = null;
    if (['saving', 'investment'].includes(type)) {
      try {
        const goals = await Goal.find({ userId: userIdObj });

        if (goals && goals.length > 0) {
          // Find goals that match the category name (case-insensitive)
          const matchingGoals = goals.filter((goal) => {
            const remaining = goal.targetAmount - (goal.currentAmount || 0);
            const categoryLower = category.toLowerCase();
            const goalNameLower = goal.name.toLowerCase();

            return (
              remaining > 0 &&
              (goalNameLower.includes(categoryLower) ||
                categoryLower.includes(goalNameLower))
            );
          });

          // If no matching goal by name, use priority-based selection
          let targetGoal = matchingGoals[0];

          if (!targetGoal && goals.length > 0) {
            // Find highest priority goal that's not completed
            const activeGoals = goals.filter((g) => {
              const remaining = g.targetAmount - (g.currentAmount || 0);
              return remaining > 0;
            });

            if (activeGoals.length > 0) {
              // Prioritize must_have goals, then good_to_have
              targetGoal =
                activeGoals.find((g) => g.priority === 'must_have') ||
                activeGoals[0];
            }
          }

          if (targetGoal) {
            // Update goal amount (same logic as contributeToGoal)
            const remaining =
              targetGoal.targetAmount - (targetGoal.currentAmount || 0);

            // Add the full transaction amount to goal (or remaining if less)
            const contributionAmount = Math.min(numericAmount, remaining);

            targetGoal.currentAmount += contributionAmount;
            await targetGoal.save();

            // Calculate progress (same as contributeToGoal)
            const goalProgress = Math.min(
              Math.round(
                (targetGoal.currentAmount / targetGoal.targetAmount) * 100
              ),
              100
            );

            // Calculate values before contribution for motivational message
            const beforeAmount = targetGoal.currentAmount - contributionAmount;
            const beforeProgress = Math.min(
              Math.round((beforeAmount / targetGoal.targetAmount) * 100),
              100
            );
            const remainingAfter =
              targetGoal.targetAmount - targetGoal.currentAmount;

            goalUpdated = {
              goalId: targetGoal._id,
              goalName: targetGoal.name,
              contributionAmount,
              currentAmount: targetGoal.currentAmount,
              targetAmount: targetGoal.targetAmount,
              progress: goalProgress,
              beforeProgress,
              remaining: remainingAfter,
              deadline: targetGoal.deadline,
              priority: targetGoal.priority,
              completed: goalProgress >= 100,
            };

            console.log(
              `🎯 [addTransactionAgent] Contributed ₹${contributionAmount} to goal: ${targetGoal.name}`
            );
            console.log(
              `🎯 [addTransactionAgent] Goal progress: ${goalProgress}% (${targetGoal.currentAmount}/${targetGoal.targetAmount})`
            );
          } else {
            console.log(
              `ℹ️ [addTransactionAgent] No matching or active goals found for ${type} transaction`
            );
          }
        }
      } catch (goalError) {
        console.error(
          '⚠️ [addTransactionAgent] Goal contribution error:',
          goalError
        );
        // Don't fail the transaction if goal update fails
      }
    }

    // Send immediate response - don't wait for background processing
    const responseData = {
      success: true,
      message: 'AI transaction added successfully',
      transaction: saved,
      goal: goalUpdated || null, // Include goal update info if applicable
    };

    // Background processing (non-blocking)
    (async () => {
      try {
        console.log(
          '🔄 [addTransactionAgent] Starting background processing...'
        );

        /* ---------------------------
           2. USER INTELLIGENCE
        ----------------------------*/

        const stats = await getUserStatsInternal(userIdObj);
        const history = await getUserHistoryInternal(userIdObj);
        const goals = await Goal.find({ userId: userIdObj });

        let behaviorProfileDoc = null;
        let behaviorProfile = null;
        try {
          behaviorProfileDoc = await BehaviorProfile.findOne({
            userId: userIdObj,
          }).lean();
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
          console.log('BehaviorProfile fetch failed (safe continue)');
        }

        const userProfile = {
          behaviorProfile,
        };

        /* ---------------------------
           2.5. FINANCIAL COACH ENGINE (ONLY DECISION SYSTEM)
        ----------------------------*/
        let coachAnalysis = null;
        try {
          coachAnalysis = await runFinancialCoachEngine({
            userId: userIdObj,
            transaction: saved,
            stats,
            goals,
            history,
            behaviorProfile,
          });
          console.log(
            '✅ [AI Transaction] Financial coach analysis completed:',
            coachAnalysis?.level,
            coachAnalysis?.alert ? 'Alert created' : 'No alert (LOW level)'
          );
        } catch (coachError) {
          console.error(
            '⚠️ [AI Transaction] Financial coach error (non-critical):',
            coachError.message
          );
          // Continue even if coach engine fails
        }

        /* ---------------------------
           3. USE ALERT FROM FINANCIAL COACH ENGINE ONLY
        ----------------------------*/

        // Financial Coach Engine is the ONLY decision system
        // It handles: alert creation, memory storage, financial report updates
        const alert = coachAnalysis?.alert;
        const decision = coachAnalysis
          ? {
              level: coachAnalysis.level,
              reasons: coachAnalysis.reasons || [],
              riskScore: coachAnalysis.riskScore || 0,
              positivityScore: coachAnalysis.positivityScore || 0,
              trigger: !!alert,
            }
          : null;

        await resolveAlerts({ userId: userIdObj, stats, goals });

        // AI insights are automatically generated by Financial Coach Engine
        // via generateAndStoreAiInsight() in aiAlert.internal.js
        // The insight will be stored in alert.aiInsight field
        if (alert) {
          console.log(
            '✅ [AI Transaction] AI insights will be generated asynchronously by Financial Coach Engine'
          );
        }

        console.log('✅ [addTransactionAgent] Background processing completed');
      } catch (bgError) {
        console.error(
          '❌ [addTransactionAgent] Background processing error:',
          bgError
        );
        // Don't throw - background processing failures shouldn't affect the response
      }
    })();

    // Send response immediately after saving transaction
    console.log('📤 [addTransactionAgent] Sending response...');
    return res.status(201).json(responseData);
  } catch (error) {
    console.error('AI Add error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getDailyMentorData = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. USER INFO
    const user = await User.findById(userId).select('name email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // 2. TODAY TRANSACTIONS
    const txs = await Transaction.find({
      userId,
      occurredAt: { $gte: start, $lte: end },
    });

    let income = 0,
      expense = 0,
      saving = 0,
      investment = 0;
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

    // 3. USER STATS (use your function)
    const stats = await getUserStatsInternal(userId);

    // 4. MEMORY FROM CHROMA
    const memRes = await axios.post('http://localhost:8001/search-memory', {
      userId: userId.toString(),
      query: 'spending habits goals risk investment behaviour',
      topK: 7,
    });

    const memories = memRes.data.matches?.map((m) => m.content) || [];

    res.json({
      user: {
        name: user.name,
        email: user.email,
      },
      today: {
        income,
        expense,
        saving,
        investment,
        topCategory,
      },
      stats: {
        savingsRate: stats.savingsRate,
        investmentRate: stats.investmentRate,
        netWorth: stats.netWorth,
      },
      memories,
    });
  } catch (err) {
    console.error('Daily mentor error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
