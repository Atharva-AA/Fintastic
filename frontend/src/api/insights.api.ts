import api from './base';

/**
 * AI Insights API
 * Fetch page-specific AI insights with timestamps
 */

export interface PageInsight {
  page: string;
  updatedAt: string;
  title: string;
  positives: string;
  negatives: string;
  action: string;
  prediction?: string; // For goals page
}

export interface AIInsightsResponse {
  success: boolean;
  insights: PageInsight[];
  page: string;
}

/**
 * Get AI insights for a specific page
 * @param page - Page type: 'income', 'expense', 'savings', 'investment', 'goals', 'dashboard'
 */
export const getPageInsights = async (page: string): Promise<AIInsightsResponse> => {
  const response = await api.get(`/api/insights/${page}`);
  return response.data;
};

/**
 * Get all AI alerts for the user
 */
export const getAllAlerts = async () => {
  const response = await api.get('/api/alerts');
  return response.data;
};
