import express from 'express';
import { verifyAI } from '../middleware/verifyAI.js';
import mongoose from 'mongoose';

import { addTransactionAgent } from '../controllers/ai.transaction.controller.js';
import { getUserStatsInternal } from '../utils/getUserStats.internal.js';
import Goal from '../models/Goal.js';

const router = express.Router();

router.post('/add-transaction', verifyAI, addTransactionAgent);

// Internal stats endpoint for AI service
router.post('/get-stats', verifyAI, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId required' });
    }

    // Convert userId string to ObjectId if needed
    let userIdObj = userId;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
    }

    console.log('📊 [get-stats] Fetching stats for userId:', userIdObj);
    const stats = await getUserStatsInternal(userIdObj);
    
    if (!stats) {
      console.log('⚠️ [get-stats] No stats found for userId:', userIdObj);
      return res.json({ stats: null });
    }

    console.log('✅ [get-stats] Stats retrieved:', {
      investedAmount: stats.investedAmount,
      investmentRate: stats.investmentRate,
      netWorth: stats.netWorth,
    });

    res.json({ stats });
  } catch (error) {
    console.error('AI get-stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Internal goal creation endpoint for AI service
router.post('/create-goal', verifyAI, async (req, res) => {
  try {
    const { userId, name, targetAmount, deadline, priority } = req.body;
    
    if (!userId || !name || !targetAmount) {
      return res.status(400).json({ 
        success: false,
        message: 'userId, name, and targetAmount are required' 
      });
    }

    // Convert userId to ObjectId if it's a string
    let userIdObj = userId;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
    }

    // Validate and convert deadline to Date if provided
    let deadlineDate = null;
    if (deadline) {
      deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deadline format. Use ISO date string (e.g., "2024-12-31")',
        });
      }
    }

    // Validate priority
    const allowedPriorities = ['must_have', 'good_to_have'];
    const finalPriority = allowedPriorities.includes(priority)
      ? priority
      : 'good_to_have';

    console.log('🎯 [create-goal] Creating goal with:', {
      userId: userIdObj,
      name,
      targetAmount,
      deadline: deadlineDate,
      priority: finalPriority,
    });

    try {
      const goal = await Goal.create({
        userId: userIdObj,
        name: name.trim(),
        targetAmount: Number(targetAmount),
        currentAmount: 0,
        priority: finalPriority,
        deadline: deadlineDate,
      });

      console.log('✅ [create-goal] Goal created:', goal._id);

      // Send to memory in background (non-blocking)
      (async () => {
        try {
          const { sendToMemory } = await import('../utils/memory.utils.js');
          const memoryContent = `
User created a new financial goal:

Goal: ${goal.name}
Target Amount: ₹${goal.targetAmount}
Priority: ${goal.priority}
Deadline: ${goal.deadline ? goal.deadline : "Not set"}
This goal is very important to the user and should be considered in future financial decisions.
`;

          await sendToMemory({
            userId: userIdObj.toString(),
            type: "goal_profile",
            content: memoryContent,
            metadata: {
              goalId: goal._id.toString(),
              targetAmount: goal.targetAmount,
              priority: goal.priority,
              deadline: goal.deadline || null,
              source: "ai",
            },
          });
          console.log('✅ [create-goal] Memory stored');
        } catch (memError) {
          console.error('⚠️ [create-goal] Memory storage error:', memError);
          // Don't fail the request if memory fails
        }
      })();

      res.json({
        success: true,
        message: "Goal created successfully",
        data: goal,
      });
    } catch (error) {
      console.error('❌ [create-goal] Error:', error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  } catch (error) {
    console.error('AI create-goal error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

export default router;
