import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    holdings: [
      {
        symbol: {
          type: String,
          required: true,
          uppercase: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 0,
        },
        avgPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        currentPrice: {
          type: Number,
          default: 0,
        },
        value: {
          type: Number,
          default: 0,
        },
        pnl: {
          type: Number,
          default: 0,
        },
        pnlPercent: {
          type: Number,
          default: 0,
        },
      },
    ],
    cashBalance: {
      type: Number,
      default: 100000, // Starting with $100,000 paper money
      min: 0,
    },
    totalValue: {
      type: Number,
      default: 100000,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Portfolio', portfolioSchema);

