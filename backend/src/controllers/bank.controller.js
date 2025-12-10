import mongoose from 'mongoose';
import BankPending from '../models/BankPending.js';
import { addTransaction } from './transactionController.js';

/**
 * Save pending bank transaction from AI-Service
 * POST /bank/save-pending
 * Headers: x-ai-secret (for authentication)
 */
export const savePendingBankTx = async (req, res) => {
  try {
    console.log('📥 Incoming parsed PDF TX:', req.body.text);

    const { userId, bankHash, amount, text, type, source } = req.body;

    // Validate required fields
    if (!userId || !bankHash || amount === undefined || !text || !type) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields: userId, bankHash, amount, text, type',
      });
    }

    // Validate type
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "income" or "expense"',
      });
    }

    // Duplicate protection using bankHash
    const exists = await BankPending.findOne({ bankHash });
    if (exists) {
      console.log('⚠️ Duplicate bank row skipped:', text);
      return res.json({ success: true, duplicate: true });
    }

    // Convert userId to ObjectId
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Save pending transaction
    await BankPending.create({
      userId: userIdObj,
      bankHash,
      amount: Number(amount),
      text: text.trim(),
      type,
      status: 'PENDING',
    });

    console.log(`💾 Saved bank pending tx for user ${userId}`);

    return res.json({
      success: true,
      message: 'Bank transaction saved as pending',
      duplicate: false,
    });
  } catch (err) {
    console.error('❌ Error saving bank pending tx:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error saving bank pending tx',
      error: err.message,
    });
  }
};

/**
 * Get all pending bank transactions for a user
 * GET /bank/pending/:userId
 */
export const getPendingBankTx = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);

    const pendingTransactions = await BankPending.find({
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
    console.error('❌ Error fetching pending bank transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Approve pending bank transaction and convert to real transaction
 * POST /bank/approve
 * Body: { pendingId }
 */
export const approvePendingBankTx = async (req, res) => {
  try {
    const { pendingId } = req.body;

    if (!pendingId) {
      return res.status(400).json({
        success: false,
        message: 'pendingId is required',
      });
    }

    // Load pending transaction
    const pending = await BankPending.findById(pendingId);

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

    console.log('➡️ Calling addTransaction() for:', pending.text);

    // Create fake req/res to reuse addTransaction
    const fakeReq = {
      user: { _id: pending.userId },
      body: {
        type: pending.type,
        text: pending.text,
        amount: Number(pending.amount),
      },
    };

    // Create a response wrapper that captures the result
    let transactionResult = null;
    let transactionError = null;

    const fakeRes = {
      status: (code) => ({
        json: (data) => {
          transactionResult = { code, data };
          return { code, data };
        },
      }),
    };

    try {
      await addTransaction(fakeReq, fakeRes);
      console.log('🎉 Bank TX added via addTransaction()');

      // Mark pending as approved
      pending.status = 'APPROVED';
      await pending.save();

      return res.json({
        success: true,
        message: 'Bank transaction approved and created',
        transactionResult,
      });
    } catch (err) {
      console.error('❌ Error in addTransaction():', err);
      transactionError = err;
      return res.status(500).json({
        success: false,
        message: 'Error creating transaction',
        error: err.message,
      });
    }
  } catch (err) {
    console.error('❌ Error approving bank pending tx:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error approving bank pending tx',
      error: err.message,
    });
  }
};

/**
 * Reject pending bank transaction
 * POST /bank/reject
 * Body: { pendingId }
 */
export const rejectPendingBankTx = async (req, res) => {
  try {
    const { pendingId } = req.body;

    if (!pendingId) {
      return res.status(400).json({
        success: false,
        message: 'pendingId is required',
      });
    }

    // Load pending transaction
    const pending = await BankPending.findById(pendingId);

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

    console.log(`🚫 Rejected bank pending transaction: ${pendingId}`);

    return res.json({
      success: true,
      message: 'Bank transaction rejected',
      pendingId: pending._id,
    });
  } catch (error) {
    console.error('❌ Error rejecting bank pending transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
