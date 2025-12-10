import mongoose from 'mongoose';

const aiAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },

    // What area this alert belongs to
    scope: {
      type: String,
      enum: ['expense', 'income', 'goal', 'investment', 'saving', 'overall'],
      required: true,
      index: true,
    },

    // Logical key to group similar alerts
    // e.g. overspending_vehicle, low_savings, goal_delay_<goalId>
    areaKey: {
      type: String,
      required: true,
      index: true,
    },

    level: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'POSITIVE'],
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
      index: true,
    },

    // Last known scores
    lastRiskScore: Number,
    lastPositivityScore: Number,

    // For linking to last triggering transaction
    lastTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },

    lastTriggeredAt: {
      type: Date,
      default: Date.now,
    },

    // Cooldown logic (don't spam same alert)
    coolDownUntil: Date,

    // UI content
    title: String, // short message for card
    page: String, // "expense" | "income" | "goals" | "investment" | "dashboard"

    // ✨ AI-generated insight for dashboard display
    aiInsight: {
      title: { type: String },
      ai_noticing: { type: String },
      positive: { type: String },
      improvement: { type: String },
      action: { type: String },
      generatedAt: { type: Date, default: Date.now },
    },

    // ✨ Page-specific AI reports (legacy)
    pageReports: {
      type: {
        dashboard: {
          updatedAt: { type: Date },
          title: { type: String },
          positives: { type: String },
          negatives: { type: String },
          action: { type: String },
        },
        income: {
          updatedAt: { type: Date },
          title: { type: String },
          positives: { type: String },
          negatives: { type: String },
          action: { type: String },
        },
        expense: {
          updatedAt: { type: Date },
          title: { type: String },
          positives: { type: String },
          negatives: { type: String },
          action: { type: String },
        },
        savings: {
          updatedAt: { type: Date },
          title: { type: String },
          positives: { type: String },
          negatives: { type: String },
          action: { type: String },
        },
        investment: {
          updatedAt: { type: Date },
          title: { type: String },
          positives: { type: String },
          negatives: { type: String },
          action: { type: String },
        },
        goals: {
          updatedAt: { type: Date },
          title: { type: String },
          positives: { type: String },
          negatives: { type: String },
          action: { type: String },
        },
      },
      default: {},
    },

    // ✨ New unified 5-report AI insight
    fullInsights: {
      classifiedType: { type: String },
      updatedAt: { type: Date },
      reports: {
        income: {
          title: { type: String },
          summary: { type: String },
          positive: { type: String },
          warning: { type: String },
          actionStep: { type: String },
        },
        expense: {
          title: { type: String },
          summary: { type: String },
          positive: { type: String },
          warning: { type: String },
          actionStep: { type: String },
        },
        investment: {
          title: { type: String },
          summary: { type: String },
          positive: { type: String },
          warning: { type: String },
          actionStep: { type: String },
        },
        savings: {
          title: { type: String },
          summary: { type: String },
          positive: { type: String },
          warning: { type: String },
          actionStep: { type: String },
        },
        goals: {
          title: { type: String },
          summary: { type: String },
          positive: { type: String },
          warning: { type: String },
          actionStep: { type: String },
          prediction: { type: String },
        },
      },
    },

    // Freely extensible
    meta: {
      type: Object,
      default: {},
    },

    // --- FEEDBACK / REINFORCEMENT ---
    triggerCount: { type: Number, default: 1 },
    resolvedCount: { type: Number, default: 0 },
    ignoredCount: { type: Number, default: 0 },

    // --- RESOLUTION INFO ---
    resolvedAt: Date,
    resolvedBy: {
      type: String, // "system" | "user"
    },
    resolutionReason: String, // "metrics_improved" | "user_acknowledged" | "goal_completed" | ...
  },
  { timestamps: true }
);

// You will query: "active alerts per user per area"
aiAlertSchema.index({ userId: 1, scope: 1, areaKey: 1, status: 1 });

export default mongoose.model('AiAlert', aiAlertSchema);
