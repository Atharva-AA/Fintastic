import AiAlert from '../models/AiAlert.js';

/**
 * Get income-specific report
 * GET /ai/insights/income/:userId
 */
export const getIncomeInsight = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the most recent active alert with fullInsights
    const alert = await AiAlert.findOne({
      userId,
      status: 'active',
      'fullInsights.reports.income': { $exists: true },
    })
      .sort({ 'fullInsights.updatedAt': -1, lastTriggeredAt: -1 })
      .lean();

    if (!alert || !alert.fullInsights || !alert.fullInsights.reports.income) {
      return res.json({
        success: false,
        message: 'No income insights available',
        report: null,
      });
    }

    res.json({
      success: true,
      updatedAt: alert.fullInsights.updatedAt,
      report: alert.fullInsights.reports.income,
    });
  } catch (err) {
    console.error('getIncomeInsight error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Get expense-specific report
 * GET /ai/insights/expense/:userId
 */
export const getExpenseInsight = async (req, res) => {
  try {
    const { userId } = req.params;

    const alert = await AiAlert.findOne({
      userId,
      status: 'active',
      'fullInsights.reports.expense': { $exists: true },
    })
      .sort({ 'fullInsights.updatedAt': -1, lastTriggeredAt: -1 })
      .lean();

    if (!alert || !alert.fullInsights || !alert.fullInsights.reports.expense) {
      return res.json({
        success: false,
        message: 'No expense insights available',
        report: null,
      });
    }

    res.json({
      success: true,
      updatedAt: alert.fullInsights.updatedAt,
      report: alert.fullInsights.reports.expense,
    });
  } catch (err) {
    console.error('getExpenseInsight error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Get savings page report (savings + investment mix)
 * GET /ai/insights/savings/:userId
 */
export const getSavingsInsight = async (req, res) => {
  try {
    const { userId } = req.params;

    const alert = await AiAlert.findOne({
      userId,
      status: 'active',
      'fullInsights.reports.savings': { $exists: true },
    })
      .sort({ 'fullInsights.updatedAt': -1, lastTriggeredAt: -1 })
      .lean();

    if (!alert || !alert.fullInsights) {
      return res.json({
        success: false,
        message: 'No savings insights available',
        savings: null,
        investment: null,
      });
    }

    res.json({
      success: true,
      updatedAt: alert.fullInsights.updatedAt,
      savings: alert.fullInsights.reports.savings || null,
      investment: alert.fullInsights.reports.investment || null,
    });
  } catch (err) {
    console.error('getSavingsInsight error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Get investment page report
 * GET /ai/insights/investment/:userId
 */
export const getInvestmentInsight = async (req, res) => {
  try {
    const { userId } = req.params;

    const alert = await AiAlert.findOne({
      userId,
      status: 'active',
      'fullInsights.reports.investment': { $exists: true },
    })
      .sort({ 'fullInsights.updatedAt': -1, lastTriggeredAt: -1 })
      .lean();

    if (
      !alert ||
      !alert.fullInsights ||
      !alert.fullInsights.reports.investment
    ) {
      return res.json({
        success: false,
        message: 'No investment insights available',
        report: null,
      });
    }

    res.json({
      success: true,
      updatedAt: alert.fullInsights.updatedAt,
      report: alert.fullInsights.reports.investment,
    });
  } catch (err) {
    console.error('getInvestmentInsight error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Get goals report
 * GET /ai/insights/goals/:userId
 */
export const getGoalsInsight = async (req, res) => {
  try {
    const { userId } = req.params;

    const alert = await AiAlert.findOne({
      userId,
      status: 'active',
      'fullInsights.reports.goals': { $exists: true },
    })
      .sort({ 'fullInsights.updatedAt': -1, lastTriggeredAt: -1 })
      .lean();

    if (!alert || !alert.fullInsights || !alert.fullInsights.reports.goals) {
      return res.json({
        success: false,
        message: 'No goals insights available',
        report: null,
      });
    }

    res.json({
      success: true,
      updatedAt: alert.fullInsights.updatedAt,
      report: alert.fullInsights.reports.goals,
    });
  } catch (err) {
    console.error('getGoalsInsight error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Get all reports (for dashboard)
 * GET /ai/insights/all/:userId
 */
export const getAllInsights = async (req, res) => {
  try {
    const { userId } = req.params;

    const alert = await AiAlert.findOne({
      userId,
      status: 'active',
      fullInsights: { $exists: true },
    })
      .sort({ 'fullInsights.updatedAt': -1, lastTriggeredAt: -1 })
      .lean();

    if (!alert || !alert.fullInsights || !alert.fullInsights.reports) {
      return res.json({
        success: false,
        message: 'No insights available',
        reports: null,
      });
    }

    res.json({
      success: true,
      updatedAt: alert.fullInsights.updatedAt,
      classifiedType: alert.fullInsights.classifiedType,
      reports: alert.fullInsights.reports,
    });
  } catch (err) {
    console.error('getAllInsights error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
