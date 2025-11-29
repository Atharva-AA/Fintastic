import Transaction from "../models/Transaction.js";
import Goal from "../models/Goal.js";

export async function forecastGoalsInternal(userId) {
  const goals = await Goal.find({ userId });
  if (!goals.length) return [];

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const txns = await Transaction.find({
    userId,
    type: { $in: ["saving", "investment"] },
    occurredAt: { $gte: threeMonthsAgo },
  });

  const totalSaved = txns.reduce((sum, t) => sum + t.amount, 0);
  const avgMonthlySaving = totalSaved / 3 || 0;

  return goals.map((goal) => {
    const remaining = goal.targetAmount - (goal.currentAmount || 0);

    if (remaining <= 0) {
      return {
        goalId: goal._id,
        name: goal.name,
        status: "completed",
        projectedCompletion: new Date(),
      };
    }

    if (avgMonthlySaving <= 0) {
      return {
        goalId: goal._id,
        name: goal.name,
        status: "stalled",
        projectedCompletion: null,
        comment: "No recent savings/investments detected.",
      };
    }

    const monthsToGoal = remaining / avgMonthlySaving;
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + Math.ceil(monthsToGoal));

    return {
      goalId: goal._id,
      name: goal.name,
      remaining,
      avgMonthlySaving: Math.round(avgMonthlySaving),
      monthsToGoal: Math.ceil(monthsToGoal),
      projectedCompletion: projectedDate,
      status: monthsToGoal <= 12 ? "on_track" : "slow",
    };
  });
}
