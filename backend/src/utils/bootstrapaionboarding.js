import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import { sendToMemory } from './memory.utils.js';

/**
 * Bootstrap AI with comprehensive financial data after onboarding completion
 * Should be called at the END of onboarding (Step 5)
 */
export async function bootstrapAIForNewUser(userId) {
  try {
    // Fetch user profile
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }

    // Fetch all transactions
    const transactions = await Transaction.find({ userId });

    // Fetch all goals
    const goals = await Goal.find({ userId });

    // ========== PROFILE DATA ==========
    const profileData = {
      name: user.name,
      age: user.age || 'Not specified',
      occupation: user.occupation?.join(', ') || 'Not specified',
      dependents: user.dependents || 0,
      cityType: user.cityType || 'Not specified',
      riskLevel: user.riskLevel || 'Not specified',
    };

    // ========== INCOME BREAKDOWN ==========
    const incomes = transactions.filter((t) => t.type === 'income');
    const fixedIncome = incomes
      .filter((t) => t.subtype === 'fixed')
      .reduce((sum, t) => sum + t.amount, 0);
    const variableIncome = incomes
      .filter((t) => t.subtype === 'variable')
      .reduce((sum, t) => sum + t.amount, 0);
    const oneTimeIncome = incomes
      .filter((t) => t.subtype === 'one-time')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = fixedIncome + variableIncome + oneTimeIncome;

    // ========== EXPENSE BREAKDOWN ==========
    const expenses = transactions.filter((t) => t.type === 'expense');
    const fixedExpense = expenses
      .filter((t) => t.subtype === 'fixed')
      .reduce((sum, t) => sum + t.amount, 0);
    const variableExpense = expenses
      .filter((t) => t.subtype === 'variable')
      .reduce((sum, t) => sum + t.amount, 0);
    const debitExpense = expenses
      .filter((t) => t.subtype === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    const oneTimeExpense = expenses
      .filter((t) => t.subtype === 'one-time')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense =
      fixedExpense + variableExpense + debitExpense + oneTimeExpense;

    // ========== UP-TO-DATE INVESTMENT DATA ==========
    const savings = transactions.filter((t) => t.type === 'saving');
    const investments = transactions.filter((t) => t.type === 'investment');

    const totalSavings = savings.reduce((sum, t) => sum + t.amount, 0);
    const totalInvestments = investments.reduce((sum, t) => sum + t.amount, 0);

    // Breakdown by category
    const savingsByCategory = {};
    savings.forEach((s) => {
      savingsByCategory[s.category] =
        (savingsByCategory[s.category] || 0) + s.amount;
    });

    const investmentsByCategory = {};
    investments.forEach((inv) => {
      investmentsByCategory[inv.category] =
        (investmentsByCategory[inv.category] || 0) + inv.amount;
    });

    // ========== GOALS ==========
    const goalSummary =
      goals.length > 0
        ? goals
            .map(
              (g) =>
                `${g.name} (Target: ₹${g.targetAmount}, Current: ₹${g.currentAmount || 0}, Priority: ${g.priority})`
            )
            .join('\n  - ')
        : 'No goals set yet';

    // ========== FINANCIAL HEALTH ==========
    const netCashflow = totalIncome - totalExpense;
    const savingsRate =
      totalIncome > 0 ? ((netCashflow / totalIncome) * 100).toFixed(2) : 0;
    const totalWealth = totalSavings + totalInvestments;

    // ========== BUILD COMPREHENSIVE SUMMARY ==========
    const comprehensiveSummary = `
COMPREHENSIVE FINANCIAL PROFILE - ONBOARDING COMPLETE

═══════════════════════════════════════════════════════
📋 USER PROFILE
═══════════════════════════════════════════════════════
Name: ${profileData.name}
Age: ${profileData.age}
Occupation: ${profileData.occupation}
Dependents: ${profileData.dependents}
City Type: ${profileData.cityType}
Risk Level: ${profileData.riskLevel}

═══════════════════════════════════════════════════════
💰 INCOME BREAKDOWN
═══════════════════════════════════════════════════════
Fixed Income: ₹${fixedIncome}
Variable Income: ₹${variableIncome}
One-time Income: ₹${oneTimeIncome}
─────────────────────────────────────────────────────
TOTAL INCOME: ₹${totalIncome}

═══════════════════════════════════════════════════════
💸 EXPENSE BREAKDOWN
═══════════════════════════════════════════════════════
Fixed Expenses: ₹${fixedExpense}
Variable Expenses: ₹${variableExpense}
Debt/EMI Payments: ₹${debitExpense}
One-time Expenses: ₹${oneTimeExpense}
─────────────────────────────────────────────────────
TOTAL EXPENSES: ₹${totalExpense}

═══════════════════════════════════════════════════════
📊 FINANCIAL HEALTH
═══════════════════════════════════════════════════════
Net Cashflow: ₹${netCashflow}
Savings Rate: ${savingsRate}%

═══════════════════════════════════════════════════════
💎 UP-TO-DATE WEALTH POSITION
═══════════════════════════════════════════════════════
Total Savings: ₹${totalSavings}
${Object.keys(savingsByCategory).length > 0 ? Object.entries(savingsByCategory).map(([cat, amt]) => `  - ${cat}: ₹${amt}`).join('\n') : '  - None'}

Total Investments: ₹${totalInvestments}
${Object.keys(investmentsByCategory).length > 0 ? Object.entries(investmentsByCategory).map(([cat, amt]) => `  - ${cat}: ₹${amt}`).join('\n') : '  - None'}
─────────────────────────────────────────────────────
TOTAL WEALTH: ₹${totalWealth}

═══════════════════════════════════════════════════════
🎯 GOALS
═══════════════════════════════════════════════════════
${goals.length > 0 ? '  - ' + goalSummary : 'No goals set yet'}

═══════════════════════════════════════════════════════
🤖 AI INSTRUCTIONS
═══════════════════════════════════════════════════════
Based on this comprehensive financial profile, generate:
1. Personalized financial strategy
2. Investment recommendations aligned with risk level
3. Goal achievement roadmap
4. Cashflow optimization suggestions
5. Risk mitigation strategies
`.trim();

    // Send to AI memory
    await sendToMemory({
      userId,
      content: comprehensiveSummary,
      type: 'onboarding_complete',
      metadata: {
        source: 'bootstrap',
        totalIncome,
        totalExpense,
        totalWealth,
        savingsRate,
        goalCount: goals.length,
      },
    });

    console.log('✅ AI Bootstrapped with comprehensive financial data');
  } catch (err) {
    console.error('⚠️ Failed to bootstrap AI for new user:', err.message);
    throw err; // Re-throw so caller knows it failed
  }
}
