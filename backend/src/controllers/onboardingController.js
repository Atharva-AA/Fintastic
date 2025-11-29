import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import {
  summarizeProfile,
  summarizeIncomes,
  summarizeExpenses,
  summarizeGoals,
  summarizeSavingsInvestments,
} from '../utils/summary.utils.js';

import { bootstrapAIForNewUser } from '../utils/bootstrapAiOnboarding.js';
import { updateFinancialReport } from '../utils/updateFinancialReport.js';

/* ======================================================
   STEP 1 – BASIC PROFILE
   ====================================================== */

export const saveBasicProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const { occupation, age, dependents, cityType, riskLevel } = req.body;

    const update = {};

    if (occupation !== undefined) {
      if (!Array.isArray(occupation)) {
        return res.status(400).json({ message: 'occupation must be an array' });
      }
      update.occupation = occupation.map((o) => String(o));
    }

    if (age !== undefined) {
      const parsedAge = Number(age);
      if (isNaN(parsedAge)) {
        return res.status(400).json({ message: 'age must be a number' });
      }
      update.age = parsedAge;
    }

    if (dependents !== undefined) {
      const parsed = Number(dependents);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ message: 'invalid dependents' });
      }
      update.dependents = parsed;
    }

    if (cityType !== undefined) {
      const valid = ['urban', 'semi_urban', 'rural'];
      if (!valid.includes(cityType)) {
        return res.status(400).json({ message: 'invalid cityType' });
      }
      update.cityType = cityType;
    }

    if (riskLevel !== undefined) {
      const valid = ['low', 'medium', 'high'];
      if (!valid.includes(riskLevel))
        return res.status(400).json({ message: 'invalid riskLevel' });
      update.riskLevel = riskLevel;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No data provided for update' });
    }

    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
      select: '-password',
    });

    const summary = summarizeProfile(user);

    // Memory will be sent by bootstrap at the end of onboarding

    res.json({
      message: 'Basic profile saved successfully',
      user,
    });
  } catch (error) {
    console.error('Basic profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ======================================================
   STEP 2 – Income Profile 
   ====================================================== */

export const saveIncomeData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { incomes } = req.body;

    if (!Array.isArray(incomes) || incomes.length === 0) {
      return res.status(400).json({ message: 'No income data provided' });
    }

    const allowedIncomeSubtypes = ['fixed', 'variable', 'one-time'];

    const transactions = [];

    for (let item of incomes) {
      if (!item.category || !item.amount) {
        return res.status(400).json({
          message: 'Each income must include category and amount',
        });
      }

      const amount = Number(item.amount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount value' });
      }

      const subtype = item.subtype || 'one-time';

      if (!allowedIncomeSubtypes.includes(subtype)) {
        return res.status(400).json({
          message: `Invalid income subtype: ${subtype}`,
        });
      }

      transactions.push({
        userId,
        type: 'income',
        category: item.category.trim(), // Bonus, Freelance, Salary, etc.
        amount,
        subtype,
        source: 'onboarding',
        note: item.note || '',
      });
    }

    const result = await Transaction.insertMany(transactions);

    const summary = summarizeIncomes(transactions);

    // Memory will be sent by bootstrap at the end of onboarding

    res.status(201).json({
      message: 'Income data saved successfully',
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Income error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ======================================================
   STEP 3 – Expense Profile 
   ====================================================== */

export const saveExpenseData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { expenses } = req.body;

    // Check if expenses array exists
    if (!Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({ message: 'No expense data provided' });
    }

    // ✅ Final allowed expense subtypes
    const allowedExpenseSubtypes = [
      'fixed', // rent, subscriptions, insurance
      'variable', // food, travel, shopping
      'debit', // EMI, loan payment, credit card
      'one-time', // hospital, repairs, festivals
    ];

    const transactions = [];

    for (let item of expenses) {
      // Basic validation
      if (!item.category || !item.amount) {
        return res.status(400).json({
          message: 'Each expense must include category and amount',
        });
      }

      const amount = Number(item.amount);

      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          message: `Invalid amount for category: ${item.category}`,
        });
      }

      const subtype = item.subtype || 'one-time';

      if (!allowedExpenseSubtypes.includes(subtype)) {
        return res.status(400).json({
          message: `Invalid expense subtype: ${subtype}`,
        });
      }

      transactions.push({
        userId,
        type: 'expense',
        category: item.category.trim(),
        amount,
        subtype,
        source: 'onboarding',
        note: item.note || '',
      });
    }

    const result = await Transaction.insertMany(transactions);

    res.status(201).json({
      message: 'Expense data saved successfully',
      count: result.length,
      data: result,
    });

    const summary = summarizeExpenses(transactions);

    // Memory will be sent by bootstrap at the end of onboarding
  } catch (error) {
    console.error('Expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ====================================================== */
/* STEP 4 – Goals  Profile 
  /* ====================================================== */

export const saveGoals = async (req, res) => {
  try {
    const userId = req.user._id;
    const { goals } = req.body;

    if (!Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({ message: 'No goals provided' });
    }

    const allowedPriorities = ['must_have', 'good_to_have'];

    const goalDocs = [];

    for (let goal of goals) {
      if (!goal.name || !goal.targetAmount) {
        return res.status(400).json({
          message: 'Each goal must have name and targetAmount',
        });
      }

      const targetAmount = Number(goal.targetAmount);
      if (isNaN(targetAmount) || targetAmount <= 0) {
        return res.status(400).json({
          message: `Invalid targetAmount for goal: ${goal.name}`,
        });
      }

      const currentAmount = goal.currentAmount ? Number(goal.currentAmount) : 0;

      const priority = goal.priority || 'important';

      if (!allowedPriorities.includes(priority)) {
        return res.status(400).json({
          message: `Invalid priority for goal: ${goal.name}`,
        });
      }

      goalDocs.push({
        userId,
        name: goal.name.trim(),
        targetAmount,
        currentAmount,
        priority,
        deadline: goal.deadline || null,
      });
    }

    const result = await Goal.insertMany(goalDocs);

    res.status(201).json({
      message: 'Goals saved successfully',
      count: result.length,
      data: result,
    });

    const summary = summarizeGoals(goalDocs);

    // Memory will be sent by bootstrap at the end of onboarding
  } catch (error) {
    console.error('Goals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ====================================================== */
/* STEP 5 – Investment Profile 
 /* ====================================================== */

export const saveSavingsInvestments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { savings, investments } = req.body;

    const transactions = [];

    /* ---------------- SAVINGS ---------------- */
    if (Array.isArray(savings) && savings.length > 0) {
      for (let item of savings) {
        if (!item.category || !item.amount) {
          return res.status(400).json({
            message: 'Each saving must include category and amount',
          });
        }

        const amount = Number(item.amount);
        if (isNaN(amount) || amount <= 0) {
          return res.status(400).json({
            message: `Invalid amount for saving: ${item.category}`,
          });
        }

        transactions.push({
          userId,
          type: 'saving',
          category: item.category.trim(),
          subtype: 'lumpsum', // ✅ ALWAYS for onboarding
          amount,
          source: 'onboarding',
          note: item.note || '',
        });
      }
    }

    /* ---------------- INVESTMENTS ---------------- */
    if (Array.isArray(investments) && investments.length > 0) {
      for (let item of investments) {
        if (!item.category || !item.amount) {
          return res.status(400).json({
            message: 'Each investment must include category and amount',
          });
        }

        const amount = Number(item.amount);
        if (isNaN(amount) || amount <= 0) {
          return res.status(400).json({
            message: `Invalid amount for investment: ${item.category}`,
          });
        }

        transactions.push({
          userId,
          type: 'investment',
          category: item.category.trim(),
          subtype: 'lumpsum', // ✅ ALWAYS for onboarding
          amount,
          source: 'onboarding',
          note: item.note || '',
        });
      }
    }

    if (transactions.length === 0) {
      return res.status(400).json({
        message: 'No savings or investments data provided',
      });
    }

    const result = await Transaction.insertMany(transactions);

    res.status(201).json({
      message: 'Savings & Investments saved successfully',
      count: result.length,
      data: result,
    });

    // ✅ COMPREHENSIVE BOOTSTRAP - Captures ALL onboarding data in one memory
    try {
      await bootstrapAIForNewUser(userId);
      console.log('✅ Comprehensive onboarding data stored for user:', userId);
    } catch (bootstrapError) {
      console.error('⚠️ Bootstrap failed (non-critical):', bootstrapError.message);
      // Don't fail the request if bootstrap fails
    }

    try {
      await updateFinancialReport(userId, 'onboarding');
    } catch (reportError) {
      console.error('⚠️ Financial report update failed (non-critical):', reportError.message);
    }

  } catch (error) {
    console.error('Savings/Investment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
