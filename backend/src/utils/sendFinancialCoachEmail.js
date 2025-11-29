import User from '../models/User.js';
import axios from 'axios';

const AI_EMAIL_URL = process.env.AI_EMAIL_URL || 'http://localhost:8001/ai/send-email';

/**
 * Send financial coach email to user
 * 
 * Triggers:
 * - CRITICAL alerts
 * - HIGH alerts
 * - POSITIVE milestones
 * - Goal threats
 * - Financial health drops
 * - Big positive steps
 */
export async function sendFinancialCoachEmail({
  userId,
  transaction,
  alert,
  level,
  reasons,
  stats,
  goals,
  insights
}) {
  try {
    console.log(`📧 [Email] ========== EMAIL SEND ATTEMPT ==========`);
    console.log(`📧 [Email] Preparing to send ${level} email for user ${userId}`);
    console.log(`📧 [Email] Transaction: ${transaction?.type} ₹${transaction?.amount} in ${transaction?.category}`);
    console.log(`📧 [Email] Level: ${level}, Reasons count: ${reasons?.length || 0}`);
    
    // Get user email
    const user = await User.findById(userId).select('name email');
    if (!user || !user.email) {
      console.log('⚠️ [Email] User not found or no email:', userId);
      return;
    }

    console.log(`📧 [Email] User email found: ${user.email}`);

    // Skip if email not configured (check both MENTOR_EMAIL and SMTP_USER for compatibility)
    const emailUser = process.env.MENTOR_EMAIL || process.env.SMTP_USER;
    const emailPass = process.env.MENTOR_EMAIL_PASSWORD || process.env.SMTP_PASS;
    
    console.log(`📧 [Email] Checking credentials...`);
    console.log(`   MENTOR_EMAIL: ${process.env.MENTOR_EMAIL ? `SET (${process.env.MENTOR_EMAIL.substring(0, 5)}...)` : 'NOT SET'}`);
    console.log(`   MENTOR_EMAIL_PASSWORD: ${process.env.MENTOR_EMAIL_PASSWORD ? 'SET (***)' : 'NOT SET'}`);
    console.log(`   SMTP_USER (fallback): ${process.env.SMTP_USER ? `SET (${process.env.SMTP_USER.substring(0, 5)}...)` : 'NOT SET'}`);
    console.log(`   SMTP_PASS (fallback): ${process.env.SMTP_PASS ? 'SET (***)' : 'NOT SET'}`);
    
    if (!emailUser || !emailPass) {
      console.log('❌ [Email] Email credentials not configured, skipping email');
      console.log('   Please set MENTOR_EMAIL and MENTOR_EMAIL_PASSWORD in backend/.env file');
      return;
    }
    
    console.log(`✅ [Email] Credentials found, proceeding with email send...`);

    const transactionAmount = transaction.amount || 0;
    const transactionType = transaction.type;
    const transactionCategory = transaction.category || 'Other';
    const userName = user.name || 'there';

    // Determine email subject and content based on level
    let subject = '';
    let body = '';

    if (level === 'POSITIVE') {
      subject = '🌟 You are making powerful progress';
      
      body = `
Hi ${userName},

Great news! Your recent financial action shows strong discipline:

${transactionType === 'saving' ? '💰 Savings' : transactionType === 'investment' ? '📈 Investment' : '✅ Positive Action'}: ₹${transactionAmount.toLocaleString('en-IN')} in ${transactionCategory}

${reasons.length > 0 ? `Why this matters:\n${reasons.map(r => `• ${r}`).join('\n')}` : ''}

${insights.nearGoal && goals.length > 0 ? `\n🎯 You're very close to your goal: ${goals[0].name}\nKeep this momentum going!` : ''}

${insights.goalImpact ? `\n✅ This directly supports your goals. Excellent work!` : ''}

Your current financial health:
• Savings Rate: ${stats.savingsRate || 0}%
• Net Worth: ₹${(stats.netWorth || 0).toLocaleString('en-IN')}

Keep up the excellent work!

Best regards,
Fintastic AI Coach
      `.trim();

    } else if (level === 'CRITICAL') {
      subject = '⚠️ Action needed to protect your goals';
      
      body = `
Hi ${userName},

I need to alert you about a recent transaction that may impact your financial goals:

Transaction: ₹${transactionAmount.toLocaleString('en-IN')} in ${transactionCategory}

${reasons.length > 0 ? `Why this is concerning:\n${reasons.map(r => `• ${r}`).join('\n')}` : ''}

${insights.goalImpact && goals.length > 0 ? `\n⚠️ This affects your goal: ${goals.map(g => g.name).join(', ')}` : ''}

${insights.changeFromLastWeek ? `\n📊 Change from last week: ${insights.changeFromLastWeek}%` : ''}
${insights.changeFromLastMonth ? `Change from last month: ${insights.changeFromLastMonth}%` : ''}

Current situation:
• Monthly Expense: ₹${(stats.monthlyExpense || 0).toLocaleString('en-IN')}
• Savings Rate: ${stats.savingsRate || 0}%
• Remaining Budget: ₹${((stats.monthlyIncome || 0) - (stats.monthlyExpense || 0)).toLocaleString('en-IN')}

Recommended action:
${insights.goalImpact ? `1. Review your goal timeline: ${goals.map(g => g.name).join(', ')}` : ''}
${insights.habitBroken ? '2. This is an unusual spending pattern - consider if this was necessary' : ''}
3. Check your remaining budget for this month
4. Consider adjusting upcoming expenses

I'm here to help you stay on track.

Best regards,
Fintastic AI Coach
      `.trim();

    } else if (level === 'HIGH') {
      subject = '📊 Your spending pattern is changing';
      
      body = `
Hi ${userName},

I noticed a recent transaction that's worth your attention:

Transaction: ₹${transactionAmount.toLocaleString('en-IN')} in ${transactionCategory}

${reasons.length > 0 ? `Observations:\n${reasons.map(r => `• ${r}`).join('\n')}` : ''}

${insights.changeFromLastWeek ? `\n📈 Change from last week: ${insights.changeFromLastWeek}%` : ''}

Current status:
• Monthly Expense: ₹${(stats.monthlyExpense || 0).toLocaleString('en-IN')}
• Savings Rate: ${stats.savingsRate || 0}%

${insights.goalImpact ? `\n💡 This may impact your goals. Consider reviewing your budget.` : ''}

Keep tracking your expenses to maintain financial health.

Best regards,
Fintastic AI Coach
      `.trim();

    } else if (insights.milestone) {
      subject = '🎯 You are VERY close to a goal';
      
      body = `
Hi ${userName},

Exciting news! You're almost there:

${goals.map(g => {
        const progress = g.targetAmount > 0 
          ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100) 
          : 0;
        return `Goal: ${g.name}\nProgress: ${progress}% (₹${(g.currentAmount || 0).toLocaleString('en-IN')} / ₹${g.targetAmount.toLocaleString('en-IN')})`;
      }).join('\n\n')}

You're in the final stretch! Keep up the momentum.

Best regards,
Fintastic AI Coach
      `.trim();
    }

    // Send email via Python service
    if (subject && body) {
      try {
        const htmlBody = body.replace(/\n/g, '<br>');
        
        console.log(`📧 [Email] Sending to Python service: ${AI_EMAIL_URL}`);
        console.log(`📧 [Email] Payload: email=${user.email}, subject=${subject}`);
        
        const response = await axios.post(AI_EMAIL_URL, {
          email: user.email,
          name: user.name,
          subject,
          body: htmlBody
        }, {
          timeout: 10000 // 10 second timeout
        });

        console.log(`📧 [Email] Python service response:`, response.data);

        if (response.data?.success) {
          console.log(`✅ [Email] Successfully sent ${level} email to ${user.email}`);
        } else {
          console.error(`❌ [Email] Python service returned error:`, response.data);
          console.error(`   Error message: ${response.data?.error || 'Unknown error'}`);
        }
      } catch (emailError) {
        console.error('❌ [Email] Failed to send via Python service');
        console.error(`   Error message: ${emailError.message}`);
        if (emailError.code === 'ECONNREFUSED') {
          console.error('   ⚠️ Python AI service is not running or not accessible at', AI_EMAIL_URL);
          console.error('   Please ensure the AI service is running on port 8001');
        }
        if (emailError.response) {
          console.error('   Response status:', emailError.response.status);
          console.error('   Response data:', emailError.response.data);
        }
        if (emailError.request) {
          console.error('   Request was made but no response received');
        }
        // Don't throw - email failure shouldn't break the flow
      }
    } else {
      console.warn(`⚠️ [Email] Missing subject or body. Subject: ${subject ? 'SET' : 'MISSING'}, Body: ${body ? 'SET' : 'MISSING'}`);
    }

  } catch (error) {
    console.error('❌ [Email] Error sending email:', error);
    // Don't throw - email failure shouldn't break the flow
  }
}

