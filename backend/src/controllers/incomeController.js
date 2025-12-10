import Transaction from '../models/Transaction.js';
import AiAlert from '../models/AiAlert.js';

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const determineStability = (values = []) => {
  if (!values.length) return 'Unknown';
  if (values.length === 1) return 'Medium';

  const avg =
    values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  if (!avg) return 'Unknown';

  const max = Math.max(...values);
  const min = Math.min(...values);
  const volatility = Math.abs(max - min) / avg;

  if (volatility <= 0.2) return 'High';
  if (volatility <= 0.5) return 'Medium';
  return 'Low';
};

const describeBestDays = (days = []) => {
  if (!days.length) return 'No clear pattern yet';
  const sorted = [...days].sort((a, b) => a - b);

  if (sorted.length <= 3) {
    return sorted.map((d) => `day ${d}`).join(', ');
  }

  const chunks = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    if (current !== prev + 1) {
      chunks.push([start, prev]);
      start = current;
    }
    prev = current;
  }
  chunks.push([start, prev]);

  const prettified = chunks.map(([s, e]) =>
    s === e ? `day ${s}` : `days ${s}–${e}`
  );

  return prettified.slice(0, 2).join(', ');
};

export const getIncomeIntelligence = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized request' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    const incomes = await Transaction.find({
      userId,
      type: 'income',
      occurredAt: { $gte: threeMonthsAgo },
    })
      .sort({ occurredAt: -1 })
      .lean();

    const monthlyIncome = incomes.reduce((sum, tx) => {
      const occurredAt = new Date(tx.occurredAt || tx.createdAt || now);
      if (occurredAt >= startOfMonth) {
        return sum + (tx.amount || 0);
      }
      return sum;
    }, 0);

    const monthTotals = {};
    const sourceTotals = {};
    const sourceMeta = {};

    incomes.forEach((tx) => {
      const occurredAt = new Date(tx.occurredAt || tx.createdAt || now);
      const monthKey = getMonthKey(occurredAt);
      monthTotals[monthKey] = (monthTotals[monthKey] || 0) + (tx.amount || 0);

      const category = tx.category || 'Other';
      sourceTotals[category] = (sourceTotals[category] || 0) + (tx.amount || 0);

      if (!sourceMeta[category]) {
        sourceMeta[category] = {
          amounts: [],
          days: [],
        };
      }

      sourceMeta[category].amounts.push(tx.amount || 0);
      sourceMeta[category].days.push(occurredAt.getDate());
    });

    const mostReliableSource =
      Object.entries(sourceTotals).sort((a, b) => b[1] - a[1])?.[0]?.[0] ||
      null;

    const incomeStability = determineStability(Object.values(monthTotals));

    // Fetch income-related alerts
    const incomeAlerts = await AiAlert.find({
      userId,
      status: 'active',
      $or: [{ scope: 'income' }, { 'meta.lastCategory': 'income' }],
      level: { $in: ['CRITICAL', 'HIGH', 'POSITIVE'] },
    })
      .sort({ lastTriggeredAt: -1 })
      .limit(5)
      .lean();

    console.log(
      `💰 [Income Intelligence] Found ${incomeAlerts.length} income-related alerts`
    );

    const aiIncomeInsights = [];

    // Add income alerts first (most important)
    incomeAlerts.forEach((alert) => {
      if (alert.aiInsight?.ai_noticing) {
        // Use AI-generated insight
        aiIncomeInsights.push(alert.aiInsight.ai_noticing);
      } else if (alert.meta?.lastReasons?.length) {
        // Fallback: Use alert reasons
        aiIncomeInsights.push(alert.meta.lastReasons.join('. '));
      } else if (alert.title) {
        // Last fallback: Use alert title
        aiIncomeInsights.push(alert.title);
      }
    });

    // Add general income insights
    if (monthlyIncome > 0) {
      aiIncomeInsights.push(
        `You've recorded ${formatCurrency(monthlyIncome)} this month.`
      );
    } else {
      aiIncomeInsights.push(
        'No income recorded this month — add entries to unlock AI coaching.'
      );
    }

    if (mostReliableSource) {
      aiIncomeInsights.push(
        `Your most reliable source right now is ${mostReliableSource}.`
      );
    }

    const monthKeys = Object.keys(monthTotals).sort();
    if (monthKeys.length >= 2) {
      const lastKey = monthKeys[monthKeys.length - 1];
      const prevKey = monthKeys[monthKeys.length - 2];
      const diff = monthTotals[lastKey] - monthTotals[prevKey];
      if (diff > 0) {
        aiIncomeInsights.push(
          `Income increased by ${formatCurrency(diff)} vs last period.`
        );
      } else if (diff < 0) {
        aiIncomeInsights.push(
          `Income dropped by ${formatCurrency(Math.abs(diff))} vs last period.`
        );
      }
    }

    const topSources = Object.entries(sourceTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const incomeSources = topSources.map(([category, total], index) => {
      const meta = sourceMeta[category];
      const amounts = meta?.amounts || [];
      const days = meta?.days || [];
      const avg =
        amounts.reduce((sum, value) => sum + value, 0) /
        Math.max(amounts.length, 1);
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      const monthlyRange =
        amounts.length > 1
          ? `₹${Math.round(Math.min(min, avg))} – ₹${Math.round(
              Math.max(max, avg)
            )}`
          : `~₹${Math.round(avg)}`;

      const variance =
        amounts.reduce((sum, value) => sum + Math.abs(value - avg), 0) /
        Math.max(amounts.length, 1);

      let sourceStability = 'Medium';
      if (variance <= avg * 0.2) sourceStability = 'High';
      else if (variance > avg * 0.5) sourceStability = 'Low';

      const recommendation =
        sourceStability === 'High'
          ? 'Stable and predictable. Maintain this stream.'
          : sourceStability === 'Medium'
          ? 'Moderate consistency. Track invoices to keep it steady.'
          : 'Volatile income. Consider diversifying or negotiating terms.';

      return {
        name: category,
        type: index === 0 ? 'Primary' : 'Secondary',
        monthlyRange,
        bestDays: describeBestDays(days),
        stability: sourceStability,
        recommendation,
        pattern:
          days.length >= 2
            ? `Usually paid around ${describeBestDays(days)}`
            : 'Insufficient data for a clear pattern',
        averageAmount: avg,
        totalEarned: total,
      };
    });

    console.log(aiIncomeInsights);

    res.json({
      monthlyIncome,
      mostReliableSource,
      incomeStability,
      aiIncomeInsights,
      incomeSources,
    });
  } catch (error) {
    console.error('Income intelligence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch income intelligence',
      error: error.message,
    });
  }
};

const formatCurrency = (value = 0) =>
  `₹${Math.round(value).toLocaleString('en-IN')}`;
