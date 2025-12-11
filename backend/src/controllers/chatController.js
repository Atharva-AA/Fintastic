import axios from 'axios';
import ChatMessage from '../models/ChatMessage.js';
import PendingAction from '../models/PendingAction.js';
import { addTransactionAgent } from './ai.transaction.controller.js';
import BehaviorProfile from '../models/BehaviorProfile.js';
import { detectGigWorker } from '../utils/detectGigWorker.js';
import Transaction from '../models/Transaction.js';

const FASTAPI_URL = 'http://127.0.0.1:8001';
/* ===============================
   MAIN CHAT CONTROLLER (FINAL)
================================== */

export const chatWithAgent = async (req, res) => {
  try {
    const userId = req.user._id;
    const { message } = req.body;

    console.log('📩 USER SAID:', message);

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const cleanMessage = message.trim().toUpperCase();

    /* ------------------------------------
       1. SAVE USER MESSAGE TO CHAT
    ------------------------------------ */
    await ChatMessage.create({
      userId,
      role: 'user',
      content: message,
    });

    /* ===================================================
       2. CONFIRM / CANCEL PENDING ACTION
    =================================================== */
    const pending = await PendingAction.findOne({
      userId,
      status: 'waiting_confirmation',
    });

    if (pending && cleanMessage === 'CONFIRM') {
      console.log('🔥 CONFIRM DETECTED. PLAN:', pending.plan);

      // Handle add_transaction directly via addTransactionAgent
      if (pending.plan.tool === 'add_transaction') {
        const params = pending.plan.params || {};

        console.log(
          '💳 [Chat] Directly calling addTransactionAgent for add_transaction'
        );
        console.log('💳 [Chat] Params:', params);

        try {
          // Call addTransactionAgent via internal API call
          const internalReq = {
            body: {
              userId: userId.toString(),
              type: params.type || 'expense',
              category: params.category || 'Other',
              amount: params.amount || 0,
              note: params.note || '',
            },
            headers: {
              ...req.headers,
              'x-ai-secret': process.env.AI_INTERNAL_SECRET,
            },
          };

          // Use a promise-based approach to capture the response
          let transactionResult = null;
          let responseStatus = 200;
          let responseError = null;

          const mockRes = {
            status: (code) => {
              responseStatus = code;
              return mockRes;
            },
            json: (data) => {
              transactionResult = data;
              if (responseStatus >= 400) {
                responseError = data;
              }
            },
          };

          await addTransactionAgent(internalReq, mockRes);

          if (responseError) {
            throw new Error(
              responseError.message || 'Failed to add transaction'
            );
          }

          await ChatMessage.create({
            userId,
            role: 'assistant',
            content: '✅ Transaction added successfully',
          });

          pending.status = 'executed';
          await pending.save();

          return res.json({
            success: true,
            type: 'executed',
            message: '✅ Transaction added successfully',
            result: transactionResult,
          });
        } catch (error) {
          console.error('❌ [Chat] addTransactionAgent ERROR:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to add transaction',
            error: error.message,
          });
        }
      }

      // Handle create_goal directly
      if (pending.plan.tool === 'create_goal') {
        const params = pending.plan.params || {};

        console.log('🎯 [Chat] Directly calling createGoal for create_goal');
        console.log('🎯 [Chat] Params:', params);

        try {
          const createGoalRes = await axios.post(
            'http://localhost:3000/api/ai/create-goal',
            {
              userId: userId.toString(),
              name: params.name || '',
              targetAmount: params.targetAmount || 0,
              deadline: params.deadline || null,
              priority: params.priority || 'good_to_have',
            },
            {
              headers: {
                'x-ai-secret': process.env.AI_INTERNAL_SECRET,
                'Content-Type': 'application/json',
              },
            }
          );

          await ChatMessage.create({
            userId,
            role: 'assistant',
            content: '✅ Goal created successfully',
          });

          pending.status = 'executed';
          await pending.save();

          return res.json({
            success: true,
            type: 'executed',
            message: '✅ Goal created successfully',
            result: createGoalRes.data,
          });
        } catch (error) {
          console.error('❌ [Chat] createGoal ERROR:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to create goal',
            error: error.response?.data?.message || error.message,
          });
        }
      }

      // For other tools, use FastAPI execute
      const executePayload = {
        userId: userId.toString(),
        plan: pending.plan,
      };

      console.log(
        '🚀 SENDING TO FASTAPI /ai/execute with plan:',
        JSON.stringify(executePayload, null, 2)
      );
      console.log('🚀 FASTAPI_URL:', FASTAPI_URL);
      console.log('🚀 Full URL:', `${FASTAPI_URL}/ai/execute`);

      try {
        const aiExec = await axios.post(
          `${FASTAPI_URL}/ai/execute`,
          executePayload
        );
        console.log(
          '✅ FASTAPI EXECUTE RESPONSE:',
          JSON.stringify(aiExec.data, null, 2)
        );
        console.log('✅ FASTAPI EXECUTE STATUS:', aiExec.status);

        await ChatMessage.create({
          userId,
          role: 'assistant',
          content: '✅ Action successfully completed',
        });

        pending.status = 'executed';
        await pending.save();

        return res.json({
          success: true,
          type: 'executed',
          message: '✅ Action executed successfully',
          result: aiExec.data?.result || null,
        });
      } catch (error) {
        console.error('❌ FASTAPI EXECUTE ERROR:', error.message);
        console.error(
          '❌ FASTAPI EXECUTE ERROR RESPONSE:',
          error.response?.data
        );
        console.error(
          '❌ FASTAPI EXECUTE ERROR STATUS:',
          error.response?.status
        );
        console.error('❌ FASTAPI EXECUTE ERROR STACK:', error.stack);

        return res.status(500).json({
          success: false,
          message: 'Failed to execute action',
          error: error.message,
        });
      }
    }

    if (pending && (cleanMessage === 'CANCEL' || cleanMessage === 'NO')) {
      pending.status = 'cancelled';
      await pending.save();

      await ChatMessage.create({
        userId,
        role: 'assistant',
        content: '❌ Action cancelled',
      });

      return res.json({
        success: true,
        type: 'cancelled',
        message: '❌ Action cancelled',
      });
    }

    /* ------------------------------------
       3. LOAD LAST 3 CHAT MESSAGES
    ------------------------------------ */
    const lastMessages = await ChatMessage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const chatHistory = lastMessages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    /* ------------------------------------
       4. GET RELEVANT MEMORY FROM CHROMA
    ------------------------------------ */
    let relevantMemories = [];

    try {
      const memRes = await axios.post(`${FASTAPI_URL}/search-memory`, {
        userId: userId.toString(),
        query: message,
        topK: 5,
      });

      relevantMemories = memRes.data?.matches || [];
    } catch (e) {
      console.log('Memory service unavailable (safe continue)');
    }

    /* ------------------------------------
       4.5. FETCH BEHAVIOR PROFILE
    ------------------------------------ */
    let behaviorProfile = null;
    try {
      behaviorProfile = await BehaviorProfile.findOne({ userId }).lean();
      if (behaviorProfile) {
        // Convert _id to string and remove MongoDB-specific fields
        behaviorProfile = {
          disciplineScore: behaviorProfile.disciplineScore || 50,
          impulseScore: behaviorProfile.impulseScore || 50,
          consistencyIndex: behaviorProfile.consistencyIndex || 50,
          riskIndex: behaviorProfile.riskIndex || 50,
          savingStreak: behaviorProfile.savingStreak || 0,
        };
      }
    } catch (e) {
      console.log('BehaviorProfile fetch failed (safe continue):', e.message);
    }

    /* ------------------------------------
       4.6. DETECT GIG WORKER STATUS
    ------------------------------------ */
    let gigWorkerInfo = { isGigWorker: false, source: 'none', indicators: [] };
    try {
      // Get recent transactions for gig detection
      const recentTransactions = await Transaction.find({
        userId,
        source: { $ne: 'onboarding' },
      })
        .sort({ occurredAt: -1 })
        .limit(20)
        .lean();

      gigWorkerInfo = await detectGigWorker(userId, recentTransactions);
      console.log(
        `💼 [Chat] Gig worker: ${gigWorkerInfo.isGigWorker} (${gigWorkerInfo.source})`
      );
    } catch (e) {
      console.log('Gig worker detection failed (safe continue):', e.message);
    }

    /* ------------------------------------
       5. SEND TO FASTAPI AGENT
    ------------------------------------ */
    const aiRes = await axios.post(`${FASTAPI_URL}/ai/chat`, {
      userId: userId.toString(),
      message,
      chatHistory,
      relevantMemories,
      behaviorProfile,
      isGigWorker: gigWorkerInfo.isGigWorker, // Pass gig worker status
      gigWorkerIndicators: gigWorkerInfo.indicators, // Pass indicators
    });

    const plan = aiRes.data?.plan;

    if (!plan) {
      return res
        .status(500)
        .json({ message: 'AI failed to generate response' });
    }

    /* ------------------------------------
       6. NORMAL CHAT (no tool)
    ------------------------------------ */
    if (plan.tool === 'none') {
      await ChatMessage.create({
        userId,
        role: 'assistant',
        content: plan.response_to_user,
      });

      return res.json({
        success: true,
        type: 'chat',
        message: plan.response_to_user,
      });
    }

    /* ------------------------------------
       7. AUTO EXECUTE (NO CONFIRMATION REQUIRED)
    ------------------------------------ */
    if (plan.needs_confirmation === false) {
      const executeRes = await axios.post(`${FASTAPI_URL}/ai/execute`, {
        userId: userId.toString(),
        plan,
        originalMessage: message, // Pass original message for tool context
      });

      const toolResult = executeRes.data?.result || null;
      let finalMessage = plan.response_to_user;

      // For market_data tool, format the response with actual Tavily search results
      if (plan.tool === 'market_data' && toolResult) {
        const marketData = toolResult.market_data || toolResult.marketData;
        const symbol = toolResult.symbol || plan.params?.symbol || 'stock';
        
        if (marketData && typeof marketData === 'string') {
          // Include the actual Tavily search results in the response
          finalMessage = `Here's the current market information for ${symbol}:\n\n${marketData}`;
          
          // If there's additional analysis, append it
          if (toolResult.current_price_info) {
            finalMessage += `\n\nPrice Information: ${toolResult.current_price_info}`;
          }
          if (toolResult.decision) {
            finalMessage += `\n\nInvestment Recommendation: ${toolResult.decision} (${toolResult.confidence || 'medium'} confidence)`;
            if (toolResult.reason) {
              finalMessage += `\nReason: ${toolResult.reason}`;
            }
          }
        } else if (toolResult.current_price_info) {
          finalMessage = toolResult.current_price_info;
        }
      }

      await ChatMessage.create({
        userId,
        role: 'assistant',
        content: finalMessage,
      });

      return res.json({
        success: true,
        type: 'auto_executed',
        message: finalMessage,
        result: toolResult,
      });
    }

    /* ------------------------------------
       8. SAVE PENDING ACTION (CONFIRM REQUIRED)
    ------------------------------------ */
    if (plan.needs_confirmation === true) {
      await PendingAction.findOneAndUpdate(
        { userId },
        {
          userId,
          plan,
          status: 'waiting_confirmation',
        },
        { upsert: true, new: true }
      );

      await ChatMessage.create({
        userId,
        role: 'assistant',
        content: plan.response_to_user,
      });

      return res.json({
        success: true,
        type: 'confirmation_required',
        message: plan.response_to_user,
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      success: false,
      message: 'Chat processing failed',
    });
  }
};
