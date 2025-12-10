import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import BehaviorProfile from '../models/BehaviorProfile.js';
import mongoose from 'mongoose';

/**
 * AI Internal Controller
 * Handles internal API requests from AI service
 * Protected by x-ai-secret header
 */

/**
 * GET RECENT TRANSACTIONS
 * Fetch recent transactions for AI context generation
 */
export const getRecentTransactions = async (req, res) => {
  try {
    const { userId, filters = {} } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Convert userId to ObjectId if string
    let userIdObj = userId;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
    }

    // Build query
    const query = { userId: userIdObj };

    // Apply filters
    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.category) {
      query.category = { $regex: new RegExp(filters.category, 'i') };
    }

    if (filters.startDate || filters.endDate) {
      query.occurredAt = {};
      if (filters.startDate) {
        query.occurredAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.occurredAt.$lte = new Date(filters.endDate);
      }
    }

    // Fetch transactions
    const limit = Math.min(filters.limit || 20, 50); // Max 50 transactions
    const transactions = await Transaction.find(query)
      .sort({ occurredAt: -1, createdAt: -1 })
      .limit(limit)
      .select('type category subtype amount note occurredAt createdAt source')
      .lean();

    console.log(`📊 [AI Internal] Fetched ${transactions.length} transactions for user ${userId}`);

    return res.json({
      success: true,
      transactions: transactions,
      count: transactions.length,
      filters: filters
    });

  } catch (error) {
    console.error('❌ [AI Internal] Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message
    });
  }
};

/**
 * GET USER GOALS
 * Fetch user goals with progress calculations
 */
export const getUserGoals = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Convert userId to ObjectId if string
    let userIdObj = userId;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
    }

    // Fetch goals
    const goals = await Goal.find({ userId: userIdObj })
      .sort({ priority: -1, deadline: 1 })
      .lean();

    // Calculate progress and remaining for each goal
    const goalsWithProgress = goals.map(goal => {
      const currentAmount = goal.currentAmount || 0;
      const targetAmount = goal.targetAmount || 0;
      const remaining = Math.max(0, targetAmount - currentAmount);
      const progress = targetAmount > 0 ? Math.min(Math.round((currentAmount / targetAmount) * 100), 100) : 0;

      return {
        _id: goal._id,
        name: goal.name,
        targetAmount: targetAmount,
        currentAmount: currentAmount,
        remaining: remaining,
        progress: progress,
        deadline: goal.deadline,
        priority: goal.priority,
        completed: progress >= 100,
        createdAt: goal.createdAt
      };
    });

    console.log(`🎯 [AI Internal] Fetched ${goalsWithProgress.length} goals for user ${userId}`);

    return res.json({
      success: true,
      goals: goalsWithProgress,
      count: goalsWithProgress.length
    });

  } catch (error) {
    console.error('❌ [AI Internal] Error fetching goals:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching goals',
      error: error.message
    });
  }
};

/**
 * GET BEHAVIOR PROFILE
 * Fetch user behavior profile data
 */
export const getBehaviorProfile = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Convert userId to ObjectId if string
    let userIdObj = userId;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
    }

    // Fetch behavior profile
    const behaviorProfile = await BehaviorProfile.findOne({ userId: userIdObj }).lean();

    if (!behaviorProfile) {
      // Return default profile if not found
      console.log(`⚠️ [AI Internal] No behavior profile found for user ${userId}, returning defaults`);
      return res.json({
        success: true,
        behaviorProfile: {
          disciplineScore: 50,
          impulseScore: 50,
          consistencyIndex: 50,
          riskIndex: 50,
          savingStreak: 0,
          spendingStreak: 0
        },
        isDefault: true
      });
    }

    console.log(`🧠 [AI Internal] Fetched behavior profile for user ${userId}`);

    return res.json({
      success: true,
      behaviorProfile: {
        disciplineScore: behaviorProfile.disciplineScore || 50,
        impulseScore: behaviorProfile.impulseScore || 50,
        consistencyIndex: behaviorProfile.consistencyIndex || 50,
        riskIndex: behaviorProfile.riskIndex || 50,
        savingStreak: behaviorProfile.savingStreak || 0,
        spendingStreak: behaviorProfile.spendingStreak || 0
      },
      isDefault: false
    });

  } catch (error) {
    console.error('❌ [AI Internal] Error fetching behavior profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching behavior profile',
      error: error.message
    });
  }
};
