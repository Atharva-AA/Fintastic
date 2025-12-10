import AiAlert from '../models/AiAlert.js';

/**
 * Insights Controller
 * Handle fetching AI insights for different pages
 */

/**
 * GET /api/insights/:page
 * Get AI insights for a specific page
 */
export const getPageInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page } = req.params;

    console.log(`📊 [Insights] Fetching insights for page: ${page}, user: ${userId}`);

    // Validate page parameter
    const validPages = ['income', 'expense', 'savings', 'investment', 'goals', 'dashboard'];
    if (!validPages.includes(page)) {
      return res.status(400).json({
        success: false,
        message: `Invalid page. Must be one of: ${validPages.join(', ')}`
      });
    }

    // Map page to scope for querying
    // Note: savings and investment are grouped together
    let scopes = [];
    if (page === 'income') {
      scopes = ['income'];
    } else if (page === 'expense') {
      scopes = ['expense'];
    } else if (page === 'savings') {
      scopes = ['saving', 'investment']; // Savings and investments together
    } else if (page === 'investment') {
      scopes = ['saving', 'investment']; // Savings and investments together
    } else if (page === 'goals') {
      scopes = ['goal'];
    } else if (page === 'dashboard') {
      scopes = ['overall'];
    }

    // Find alerts with pageReports for this page
    const alerts = await AiAlert.find({
      userId,
      scope: { $in: scopes },
      status: { $ne: 'resolved' }
    })
      .sort({ lastTriggeredAt: -1 })
      .limit(10)
      .lean();

    console.log(`📊 [Insights] Found ${alerts.length} alerts for scopes: ${scopes.join(', ')}`);

    // Extract page-specific insights
    const insights = [];
    
    for (const alert of alerts) {
      // Check if this alert has a report for the requested page
      const pageReport = alert.pageReports?.[page];
      
      if (pageReport && pageReport.title) {
        insights.push({
          alertId: alert._id,
          page: page,
          scope: alert.scope,
          level: alert.level,
          updatedAt: pageReport.updatedAt || alert.lastTriggeredAt,
          title: pageReport.title,
          positives: pageReport.positives || '',
          negatives: pageReport.negatives || '',
          action: pageReport.action || '',
          prediction: pageReport.prediction || '' // For goals page
        });
      }
    }

    console.log(`✅ [Insights] Returning ${insights.length} insights for page: ${page}`);

    return res.json({
      success: true,
      page: page,
      insights: insights,
      count: insights.length
    });

  } catch (error) {
    console.error('❌ [Insights] Error fetching page insights:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching insights',
      error: error.message
    });
  }
};

/**
 * GET /api/alerts
 * Get all active alerts for the user
 */
export const getAllAlerts = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log(`📊 [Insights] Fetching all alerts for user: ${userId}`);

    const alerts = await AiAlert.find({
      userId,
      status: { $ne: 'resolved' }
    })
      .sort({ lastTriggeredAt: -1 })
      .limit(20)
      .lean();

    console.log(`✅ [Insights] Found ${alerts.length} active alerts`);

    return res.json({
      success: true,
      alerts: alerts,
      count: alerts.length
    });

  } catch (error) {
    console.error('❌ [Insights] Error fetching alerts:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message
    });
  }
};
