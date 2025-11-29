import mongoose from "mongoose";

const financialReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true,
    },
    financialHealthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    summary: String,
    strengths: [String],
    risks: [String],
    suggestions: [String],
    keyPoints: [String],
    recommendations: [String],
    statsSnapshot: {
      monthlyIncome: Number,
      monthlyExpense: Number,
      savingsRate: Number,
      investmentRate: Number,
      netWorth: Number,
    },
    weeklyTrend: {
      type: String,
      enum: ["improving", "risky", "stable"],
      default: "stable",
    },
    goalHealth: {
      type: String,
      enum: ["excellent", "good", "at_risk", "critical"],
      default: "good",
    },
    savingDiscipline: {
      type: String,
      enum: ["excellent", "good", "needs_improvement", "poor"],
      default: "good",
    },
    incomeStability: {
      type: String,
      enum: ["stable", "moderate", "unstable"],
      default: "moderate",
    },
    source: {
      type: String,
      enum: ["onboarding", "transaction", "alert", "system", "daily_monitor"],
      default: "system",
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FinancialReport", financialReportSchema);

