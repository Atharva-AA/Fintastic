import mongoose from 'mongoose';

const behaviorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    disciplineScore: {
      type: Number,
      default: 50, // 0–100
    },

    impulseScore: {
      type: Number,
      default: 50,
    },

    savingStreak: {
      type: Number,
      default: 0,
    },

    riskIndex: {
      type: Number,
      default: 50,
    },

    consistencyIndex: {
      type: Number,
      default: 50,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('BehaviorProfile', behaviorProfileSchema);
