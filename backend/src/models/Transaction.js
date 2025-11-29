import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['income', 'expense', 'saving', 'investment'],
      required: true,
    },

    // MUST match your controllers
    subtype: {
      type: String,
      enum: [
        // Used in BOTH income & expense
        'fixed',
        'variable',
        'one-time',

        // Used in expense (EMI / card / loans)
        'debit',

        // Used in saving & investment
        'allocation',
        'lumpsum',

        // Used in goal contribution
        'goal_contribution',
      ],
      default: 'one-time',
    },

    category: {
      type: String,
      required: true,
      trim: true,
      // Examples:
      // Food, Rent, Salary, Freelance,
      // Mutual Fund, Emergency Fund, Crypto
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    source: {
      type: String,
      enum: ['onboarding', 'manual', 'system', 'import', 'goal', 'ai'],
      default: 'manual',
    },

    note: {
      type: String,
      trim: true,
    },

    occurredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Useful indexes
transactionSchema.index({ userId: 1, occurredAt: -1 });
transactionSchema.index({ userId: 1, type: 1 });

export default mongoose.model('Transaction', transactionSchema);
