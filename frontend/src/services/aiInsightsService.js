import api from '../api/base';

/**
 * Get income-specific insight
 */
export const getIncomeInsight = async (userId) => {
  try {
    const response = await api.get(`/api/ai/insights/income/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching income insight:', error);
    return { success: false, report: null };
  }
};

/**
 * Get expense-specific insight
 */
export const getExpenseInsight = async (userId) => {
  try {
    const response = await api.get(`/api/ai/insights/expense/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching expense insight:', error);
    return { success: false, report: null };
  }
};

/**
 * Get savings page insight (savings + investment mix)
 */
export const getSavingsInsight = async (userId) => {
  try {
    const response = await api.get(`/api/ai/insights/savings/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching savings insight:', error);
    return { success: false, savings: null, investment: null };
  }
};

/**
 * Get investment-specific insight
 */
export const getInvestmentInsight = async (userId) => {
  try {
    const response = await api.get(`/api/ai/insights/investment/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching investment insight:', error);
    return { success: false, report: null };
  }
};

/**
 * Get goals-specific insight
 */
export const getGoalsInsight = async (userId) => {
  try {
    const response = await api.get(`/api/ai/insights/goals/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching goals insight:', error);
    return { success: false, report: null };
  }
};

/**
 * Get all insights (for dashboard)
 */
export const getAllInsights = async (userId) => {
  try {
    const response = await api.get(`/api/ai/insights/all/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching all insights:', error);
    return { success: false, reports: null };
  }
};

