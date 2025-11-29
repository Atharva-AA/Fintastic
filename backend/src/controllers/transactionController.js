import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
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

import axios from 'axios';

/* ======================================================
   ADD TRANSACTION (income / expense / saving / investment)
====================================================== */

export const addTransaction = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, text, amount } = req.body;

    if (!text || !amount) {
      return res.status(400).json({ message: 'text and amount required' });
    }

    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const allowed = ['income', 'expense', 'holding'];
    if (!allowed.includes(type)) {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }

    /* ---------------------------
       1. AI PARSE
    ----------------------------*/
    const parsed = await parseTransaction(text, numericAmount);

    let finalType = type;

    if (type === 'holding') {
      finalType = parsed.data.type;
    }

    if (!['income', 'expense', 'saving', 'investment'].includes(finalType)) {
      return res
        .status(400)
        .json({ message: 'AI could not determine correct type' });
    }

    const { category, subtype, note } = parsed.data;

    const duplicate = await Transaction.findOne({
      userId,
      amount: numericAmount,
      note: note || text,
      createdAt: { $gte: new Date(Date.now() - 3000) },
    });

    if (duplicate) {
      return res
        .status(409)
        .json({ message: 'Duplicate transaction prevented' });
    }

    const statsBefore = await getUserStatsInternal(userId);
    let overLimitWarning = null;
    if (finalType === 'expense' && statsBefore) {
      if (
        !overLimitWarning &&
        numericAmount > (statsBefore.monthlyIncome || 0)
      ) {
        overLimitWarning = 'Expense exceeds monthly income';
      }
      if (
        !overLimitWarning &&
        statsBefore.liquidSavings &&
        numericAmount > statsBefore.liquidSavings * 0.7
      ) {
        overLimitWarning = 'Expense is dangerously high compared to wealth';
      }
      if (
        !overLimitWarning &&
        statsBefore.netWorth &&
        numericAmount > statsBefore.netWorth
      ) {
        overLimitWarning = 'Expense exceeds your current net worth';
      }
    }

    if (overLimitWarning) {
      req.forceCritical = true;
      req.limitReason = overLimitWarning;
    }

    /* ---------------------------
       2. SAVE IN DB
    ----------------------------*/
    const saved = await Transaction.create({
      userId,
      type: finalType,
      category: category || 'Other',
      subtype: subtype || 'one-time',
      amount: numericAmount,
      source: 'manual',
      note: note || text,
    });

    /* ---------------------------
       2.5. UPDATE BEHAVIOR PROFILE
    ----------------------------*/
    console.log('🔥 Updating BehaviorProfile for user:', userId);
    console.log('🔥 UserId type:', typeof userId, 'Value:', userId);

    // Calculate behavior changes based on transaction type
    const behaviorChanges = {};

    if (finalType === 'saving' || finalType === 'investment') {
      // Positive financial behavior
      behaviorChanges.disciplineScore = 2;
      behaviorChanges.consistencyIndex = 1;
      if (finalType === 'saving') {
        behaviorChanges.impulseScore = -1; // Reduce impulse when saving
      }
    } else if (finalType === 'expense') {
      // Expense might indicate impulse spending
      if (numericAmount > 1000) {
        behaviorChanges.impulseScore = 1; // Large expense might indicate impulse
      }
    } else if (finalType === 'income') {
      // Income increases consistency
      behaviorChanges.consistencyIndex = 1;
    }

    // Always update behavior profile (will create if doesn't exist)
    // Even with empty changes, this ensures the profile is created
    try {
      // Pass userId directly (can be ObjectId or string, function handles both)
      const result = await updateBehaviorProfile(userId, behaviorChanges);
      if (result) {
        console.log('✅ BehaviorProfile updated successfully');
      } else {
        console.error('❌ BehaviorProfile update returned null');
      }
    } catch (err) {
      console.error('⚠️ Failed to update BehaviorProfile:', err.message);
      console.error('⚠️ Error stack:', err.stack);
      // Don't fail the transaction if behavior update fails
    }

    /* ---------------------------
       3. USER INTELLIGENCE
    ----------------------------*/
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
      console.log('BehaviorProfile fetch failed (safe continue)');
    }

    const userProfile = {
      behaviorProfile,
    };

    /* ---------------------------
       3.5. FINANCIAL COACH ENGINE
    ----------------------------*/
    let coachAnalysis = null;
    try {
      coachAnalysis = await runFinancialCoachEngine({
        userId,
        transaction: saved,
        stats,
        goals,
        history,
        behaviorProfile,
      });
      console.log(
        '✅ [Transaction] Financial coach analysis completed:',
        coachAnalysis?.level
      );
    } catch (coachError) {
      console.error(
        '⚠️ [Transaction] Financial coach error (non-critical):',
        coachError.message
      );
      // Continue even if coach engine fails
    }

    /* ---------------------------
       4. USE ALERT FROM FINANCIAL COACH ENGINE
    ----------------------------*/

    // Use alert created by Financial Coach Engine (no duplication)
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

    console.log(
      `📊 [Transaction] Alert from coach: ${alert ? 'YES' : 'NO'}, Level: ${
        decision?.level || 'N/A'
      }`
    );

    // Resolve any alerts that should be auto-resolved
    await resolveAlerts({ userId, stats, goals });

    let storedInsight = null;

    // Financial Coach Engine handles all memory storage and financial report updates
    // AI insights are automatically generated by Financial Coach Engine
    // Check if alert already has AI insight (might be populated already)
    if (alert && alert.aiInsight) {
      console.log(
        '✅ [Transaction] Alert already has AI insight:',
        alert.aiInsight.title
      );
      storedInsight = {
        title: alert.aiInsight.title,
        aiNoticing: alert.aiInsight.ai_noticing,
        suggestions: {
          positive: alert.aiInsight.positive,
          improvement: alert.aiInsight.improvement,
          action: alert.aiInsight.action,
        },
      };
    } else if (alert) {
      console.log('⏳ [Transaction] AI insight generation in progress (async)');
    }

    /* ---------------------------
       FINAL RESPONSE
    ----------------------------*/
    return res.status(201).json({
      message: `${finalType} added successfully`,
      data: saved,
      decision,
      alert,
      insight: storedInsight,
    });
  } catch (error) {
    console.error('Transaction error:', error);
    return res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
};
