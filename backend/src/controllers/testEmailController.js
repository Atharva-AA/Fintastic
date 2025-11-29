import { sendFinancialCoachEmail } from '../utils/sendFinancialCoachEmail.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

/**
 * Test endpoint to verify email sending works
 * POST /api/test/email
 */
export const testEmail = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('name email');
    
    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: 'User not found or no email'
      });
    }

    // Create a mock transaction for testing
    const mockTransaction = {
      _id: 'test-transaction-id',
      type: 'expense',
      category: 'Test',
      amount: 10000,
      occurredAt: new Date(),
      createdAt: new Date()
    };

    const mockStats = {
      monthlyIncome: 50000,
      monthlyExpense: 35000,
      savingsRate: 10,
      netWorth: 100000
    };

    console.log(`🧪 [Test Email] Attempting to send test email to ${user.email}`);

    await sendFinancialCoachEmail({
      userId: user._id,
      transaction: mockTransaction,
      alert: {
        title: 'Test Email',
        level: 'HIGH',
        scope: 'expense'
      },
      level: 'HIGH',
      reasons: ['This is a test email to verify the email system is working'],
      stats: mockStats,
      goals: [],
      insights: {
        changeFromLastWeek: 0,
        changeFromLastMonth: 0,
        goalImpact: false,
        nearGoal: false,
        habitBroken: false,
        milestone: false
      }
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      email: user.email
    });
  } catch (error) {
    console.error('❌ [Test Email] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
};

