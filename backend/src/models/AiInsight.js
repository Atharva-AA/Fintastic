import mongoose from 'mongoose';

const aiInsightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AiAlert',
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: ['expense', 'income', 'saving', 'investment', 'goal', 'overall'],
      index: true,
    },
    level: {
      type: String,
      enum: ['POSITIVE', 'MEDIUM', 'HIGH', 'CRITICAL'],
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    aiNoticing: {
      type: String,
      trim: true,
    },
    suggestions: {
      positive: { type: String, trim: true },
      improvement: { type: String, trim: true },
      action: { type: String, trim: true },
    },
    raw: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model('AiInsight', aiInsightSchema);
