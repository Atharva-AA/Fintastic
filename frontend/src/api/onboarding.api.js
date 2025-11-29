import api from './base.js';

/**
 * Submit basic profile data (Step 1 of onboarding)
 * @param {Object} data - Basic profile data
 * @param {string[]} data.occupation - Array of occupation roles
 * @param {number} data.age - User age
 * @param {number} data.dependents - Number of dependents
 * @param {string} data.cityType - City type (urban, semi_urban, rural)
 * @param {string} data.riskLevel - Risk level (low, medium, high)
 * @returns {Promise} API response
 */
export async function submitBasicProfile(data) {
  try {
    const response = await api.put('/api/onboarding/basic-profile', data);
    return response.data;
  } catch (error) {
    console.error('Error submitting basic profile:', error);
    throw error;
  }
}

/**
 * Submit income data (Step 2 of onboarding)
 * @param {Object} data - Income data
 * @param {Array} data.incomes - Array of income items
 * @returns {Promise} API response
 */
export async function submitIncomeData(data) {
  try {
    const response = await api.post('/api/onboarding/income', data);
    return response.data;
  } catch (error) {
    console.error('Error submitting income data:', error);
    throw error;
  }
}

/**
 * Submit exact monthly income payload (Step 2 revamped)
 * @param {{ incomes: Array<{category: string; amount: number; subtype: string; note?: string}> }} data
 * @returns {Promise} API response
 */
export async function submitIncome(data) {
  try {
    const response = await api.post('/api/onboarding/income', data);
    return response.data;
  } catch (error) {
    console.error('Error submitting exact income data:', error);
    throw error;
  }
}

/**
 * Submit expense data (Step 3 of onboarding)
 * @param {Object} data - Expense data
 * @param {Array} data.expenses - Array of expense items
 * @returns {Promise} API response
 */
export async function submitExpenseData(data) {
  try {
    const response = await api.post('/api/onboarding/expense', data);
    return response.data;
  } catch (error) {
    console.error('Error submitting expense data:', error);
    throw error;
  }
}

/**
 * Submit exact monthly expenses (Step 3 revamped)
 * @param {{ expenses: Array<{category: string; amount: number; subtype: string; note?: string}> }} data
 * @returns {Promise} API response
 */
export async function submitExpense(data) {
  try {
    const response = await api.post('/api/onboarding/expense', data);
    return response.data;
  } catch (error) {
    console.error('Error submitting exact expense data:', error);
    throw error;
  }
}

/**
 * Submit goals data (Step 4 of onboarding)
 * @param {Object} data - Goals data
 * @param {Array} data.goals - Array of goal items
 * @returns {Promise} API response
 */
export async function submitGoalsData(data) {
  try {
    const response = await api.post('/api/onboarding/goals', data);
    return response.data;
  } catch (error) {
    console.error('Error submitting goals data:', error);
    throw error;
  }
}

/**
 * Submit savings and investments data (Step 5 of onboarding)
 * @param {Object} data - Savings and investments data
 * @param {Array} data.savings - Array of saving items
 * @param {Array} data.investments - Array of investment items
 * @returns {Promise} API response
 */
export async function submitSavingsInvestmentsData(data) {
  try {
    const response = await api.post('/api/onboarding/savings-investments', data);
    return response.data;
  } catch (error) {
    console.error('Error submitting savings/investments data:', error);
    throw error;
  }
}

/**
 * Submit exact savings & investments balances (Step 5 revamped)
 * @param {{
 *  savings: Array<{category: string; amount: number; note?: string}>,
 *  investments: Array<{category: string; amount: number; note?: string}>
 * }} data
 * @returns {Promise} API response
 */
export async function submitSavingsAndInvestments(data) {
  try {
    const response = await api.post('/api/onboarding/savings-investments', data);
    return response.data;
  } catch (error) {
    console.error('Error submitting savings & investments:', error);
    throw error;
  }
}
