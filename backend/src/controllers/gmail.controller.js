import mongoose from 'mongoose';
import GmailPendingTransaction from '../models/GmailPendingTransaction.js';
import GmailToken from '../models/GmailToken.js';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import BehaviorProfile from '../models/BehaviorProfile.js';
import { parseTransaction } from '../utils/parseTransaction.utils.js';
import { getUserStatsInternal } from '../utils/getUserStats.internal.js';
import { getUserHistoryInternal } from '../utils/getUserHistory.internal.js';
import { updateBehaviorProfile } from '../utils/updateBehaviorProfile.js';
import { resolveAlerts } from '../utils/resolveAlerts.internal.js';
import { runFinancialCoachEngine } from '../utils/financialCoachEngine.js';

/**
 * Save pending Gmail transaction from AI-Service
 * POST /gmail/save-pending
 */
export const savePending = async (req, res) => {
  try {
    const { userId, gmailMessageId, amount, text, type } = req.body;

    console.log('📥 Incoming Gmail transaction from AI-Service');
    console.log('📦 Received body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Parsed fields:', {
      userId: userId ? `"${userId}" (${typeof userId})` : 'MISSING',
      gmailMessageId: gmailMessageId
        ? `"${gmailMessageId}" (${typeof gmailMessageId})`
        : 'MISSING',
      amount: amount !== undefined ? `${amount} (${typeof amount})` : 'MISSING',
      text: text ? `"${text}" (${typeof text})` : 'MISSING',
      type: type ? `"${type}" (${typeof type})` : 'MISSING',
    });

    // Validation
    if (
      !userId ||
      !gmailMessageId ||
      amount === undefined ||
      amount === null ||
      !text ||
      !type
    ) {
      console.log('❌ Validation failed - missing fields');
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields: userId, gmailMessageId, amount, text, type',
      });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "income" or "expense"',
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount',
      });
    }

    // Check for duplicate
    const existing = await GmailPendingTransaction.findOne({ gmailMessageId });
    if (existing) {
      console.log(`⚠️ Duplicate Gmail message skipped: ${gmailMessageId}`);
      return res.json({
        success: false,
        duplicate: true,
        message: 'Duplicate Gmail transaction',
      });
    }

    // Convert userId to ObjectId
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Save pending transaction
    const pending = await GmailPendingTransaction.create({
      userId: userIdObj,
      gmailMessageId,
      amount: numericAmount,
      text,
      type,
      status: 'PENDING',
    });

    console.log(`💰 Amount: ₹${numericAmount}`);
    console.log(`🧾 Text: ${text}`);
    console.log(`📊 Type: ${type}`);
    console.log(`✨ Saved to pending (ID: ${pending._id})`);

    return res.json({
      success: true,
      message: 'Pending transaction saved',
      pendingId: pending._id,
    });
  } catch (error) {
    console.error('❌ Error saving pending Gmail transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get all pending transactions for a user
 * GET /gmail/pending/:userId
 */
export const getPending = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);

    const pendingTransactions = await GmailPendingTransaction.find({
      userId: userIdObj,
      status: 'PENDING',
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: pendingTransactions.length,
      transactions: pendingTransactions,
    });
  } catch (error) {
    console.error('❌ Error fetching pending transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Approve pending transaction and convert to real transaction
 * POST /gmail/approve
 */
export const approvePending = async (req, res) => {
  try {
    const { pendingId } = req.body;

    if (!pendingId) {
      return res.status(400).json({
        success: false,
        message: 'pendingId is required',
      });
    }

    // Load pending transaction
    const pending = await GmailPendingTransaction.findById(pendingId);

    if (!pending) {
      return res.status(404).json({
        success: false,
        message: 'Pending transaction not found',
      });
    }

    if (pending.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Transaction already ${pending.status}`,
      });
    }

    // Get user stats and history for Financial Coach Engine
    const stats = await getUserStatsInternal(pending.userId);
    const history = await getUserHistoryInternal(pending.userId);
    const goals = await Goal.find({
      userId: pending.userId,
      isActive: true,
    }).lean();
    const behaviorProfile = await BehaviorProfile.findOne({
      userId: pending.userId,
    }).lean();

    // Parse transaction text to extract category
    const parsed = await parseTransaction(pending.text, pending.amount);

    // Create real transaction
    const transaction = await Transaction.create({
      userId: pending.userId,
      type: pending.type,
      category: parsed.data.category || 'Gmail Import',
      subtype: 'one-time',
      amount: pending.amount,
      source: 'gmail',
      note: `Gmail: ${pending.text}`,
      occurredAt: pending.createdAt || new Date(),
    });

    // Run Financial Coach Engine
    try {
      await runFinancialCoachEngine({
        userId: pending.userId,
        transaction,
        stats,
        goals,
        history,
        behaviorProfile,
      });
    } catch (coachError) {
      console.error(
        '⚠️ Financial Coach Engine error (non-critical):',
        coachError.message
      );
    }

    // Update behavior profile
    try {
      const behaviorChanges = {};
      if (pending.type === 'income') {
        behaviorChanges.consistencyIndex = 1;
      } else if (pending.type === 'expense') {
        if (pending.amount > 1000) {
          behaviorChanges.impulseScore = 1;
        }
      }
      await updateBehaviorProfile(pending.userId, behaviorChanges);
    } catch (behaviorError) {
      console.error(
        '⚠️ Behavior profile update error (non-critical):',
        behaviorError.message
      );
    }

    // Resolve alerts
    try {
      await resolveAlerts({
        userId: pending.userId,
        stats,
        goals,
      });
    } catch (alertError) {
      console.error(
        '⚠️ Alert resolution error (non-critical):',
        alertError.message
      );
    }

    // Mark pending as approved
    pending.status = 'APPROVED';
    await pending.save();

    console.log(`🎉 Approved Gmail transaction: ${pendingId}`);

    return res.json({
      success: true,
      message: 'Transaction approved and created',
      transactionId: transaction._id,
      pendingId: pending._id,
    });
  } catch (error) {
    console.error('❌ Error approving pending transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Reject pending transaction
 * POST /gmail/reject
 */
export const rejectPending = async (req, res) => {
  try {
    const { pendingId } = req.body;

    if (!pendingId) {
      return res.status(400).json({
        success: false,
        message: 'pendingId is required',
      });
    }

    // Load pending transaction
    const pending = await GmailPendingTransaction.findById(pendingId);

    if (!pending) {
      return res.status(404).json({
        success: false,
        message: 'Pending transaction not found',
      });
    }

    if (pending.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Transaction already ${pending.status}`,
      });
    }

    // Mark as rejected
    pending.status = 'REJECTED';
    await pending.save();

    console.log(`🚫 Rejected Gmail transaction: ${pendingId}`);

    return res.json({
      success: true,
      message: 'Transaction rejected',
      pendingId: pending._id,
    });
  } catch (error) {
    console.error('❌ Error rejecting pending transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Create or update GmailToken record when Gmail is connected
 * POST /gmail/connect-status
 * Body: { userId, email }
 */
export const updateGmailConnectionStatus = async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Create or update GmailToken record
    const gmailToken = await GmailToken.findOneAndUpdate(
      { userId: userIdObj },
      {
        userId: userIdObj,
        email: email || null,
        connectedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    console.log(`✅ Gmail connection status updated for user: ${userId}`);

    return res.json({
      success: true,
      message: 'Gmail connection status updated',
      gmailToken,
    });
  } catch (error) {
    console.error('❌ Error updating Gmail connection status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
