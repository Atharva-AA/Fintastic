import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';

export const canIBuy = async (req, res) => {
  try {
    const { product, price } = req.body;

    console.log('Fintastic decision for:', product, price);

    // Validation
    if (price === undefined || price === null) {
      return res.status(400).json({
        allowed: false,
        reason: 'Missing required field: price is required',
        impact: [],
      });
    }

    const purchaseAmount = Number(price);

    if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
      return res.status(400).json({
        allowed: false,
        reason: 'Invalid price: must be a positive number',
        impact: [],
      });
    }

    // Try to get userId from JWT token
    let userIdObj = null;
    let userId = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (user) {
          userIdObj = user._id;
          userId = user._id.toString();
          console.log('✅ Authenticated user:', userId);
        }
      } catch (err) {
        console.log('⚠️ JWT token invalid or expired:', err.message);
      }
    }

    // If no token or invalid token, return guest mode
    if (!userIdObj) {
      console.log('ℹ️ Guest mode: no valid JWT token');
      return res.json({
        allowed: true,
        reason: 'Guest mode: no financial profile linked yet',
        impact: [],
      });
    }

    // Create current month range
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);

    // Get user's transactions this month
    const transactions = await Transaction.find({
      userId: userIdObj,
      occurredAt: { $gte: start, $lte: end },
    });

    // Calculate income and expenses
    let totalIncome = 0;
    let totalExpense = 0;

    for (const txn of transactions) {
      if (txn.type === 'income') {
        totalIncome += txn.amount || 0;
      } else if (txn.type === 'expense') {
        totalExpense += txn.amount || 0;
      }
    }

    const remaining = totalIncome - totalExpense;

    // Edge case: No transactions & no income yet
    if (transactions.length === 0 || totalIncome === 0) {
      const goal = await Goal.findOne({
        userId: userIdObj,
        isActive: true,
      });

      if (goal && goal.targetAmount) {
        const safeLimit = goal.targetAmount * 0.1;
        if (purchaseAmount < safeLimit) {
          return res.json({
            allowed: true,
            reason: 'This purchase is within safe limit for new account',
            impact: [
              `Product: ${product || 'Unknown'}`,
              `Price: ₹${purchaseAmount}`,
              `Safe limit: ₹${safeLimit}`,
              'No income data yet - proceeding with caution',
            ],
          });
        } else {
          return res.json({
            allowed: false,
            reason: 'No income data available - purchase exceeds safe limit',
            impact: [
              `Product: ${product || 'Unknown'}`,
              `Price: ₹${purchaseAmount}`,
              `Safe limit: ₹${safeLimit}`,
              'Please add income transactions first',
            ],
          });
        }
      } else {
        // No goal either - be conservative
        return res.json({
          allowed: false,
          reason: 'No financial data available - cannot make safe decision',
          impact: [
            `Product: ${product || 'Unknown'}`,
            `Price: ₹${purchaseAmount}`,
            'Please set up your financial profile first',
          ],
        });
      }
    }

    // Edge case: No income but expenses exist
    if (totalIncome === 0 && totalExpense > 0) {
      return res.json({
        allowed: false,
        reason: 'You have expenses but no income recorded this month',
        impact: [
          `Product: ${product || 'Unknown'}`,
          `Price: ₹${purchaseAmount}`,
          `Current balance: ₹${remaining}`,
          'Please add income transactions first',
        ],
      });
    }

    // Get active goal
    const goal = await Goal.findOne({
      userId: userIdObj,
      isActive: true,
    });

    let requiredGoalSavings;

    if (goal) {
      const remainingGoal = goal.targetAmount - (goal.currentAmount || 0);
      requiredGoalSavings = remainingGoal / 3;
    } else {
      requiredGoalSavings = totalIncome * 0.15;
    }

    // Define safe limit
    const safeLimit = Math.max(totalIncome * 0.2, requiredGoalSavings);

    // Decision rules
    let shouldBlock = false;

    // BLOCK if: remaining <= 0
    if (remaining <= 0) {
      shouldBlock = true;
    }

    // BLOCK if: amount > remaining
    if (purchaseAmount > remaining) {
      shouldBlock = true;
    }

    // BLOCK if: (remaining - amount) < safeLimit
    if (remaining - purchaseAmount < safeLimit) {
      shouldBlock = true;
    }

    // Build response
    if (shouldBlock) {
      const impact = [
        `Product: ${product || 'Unknown'}`,
        `Price: ₹${purchaseAmount}`,
        `Current balance: ₹${remaining}`,
        `Balance after buy: ₹${remaining - purchaseAmount}`,
        `Safe minimum required: ₹${safeLimit}`,
      ];

      if (goal) {
        impact.push(`Goal at risk: ${goal.name}`);
      }

      return res.json({
        allowed: false,
        reason:
          'This purchase will impact your financial safety or active goal',
        impact,
      });
    } else {
      return res.json({
        allowed: true,
        reason: 'This purchase is within your safe spending limit',
        impact: [
          `Product: ${product || 'Unknown'}`,
          `Price: ₹${purchaseAmount}`,
          `Balance after buy: ₹${remaining - purchaseAmount}`,
          'Goal is still safe',
        ],
      });
    }
  } catch (error) {
    console.error('Decision engine error:', error);
    return res.status(500).json({
      allowed: false,
      reason: 'Server error while processing decision',
      impact: [`Error: ${error.message}`],
    });
  }
};
