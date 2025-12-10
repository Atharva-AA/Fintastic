import mongoose from 'mongoose';

const paperTradeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    orderType: {
      type: String,
      enum: ['buy', 'sell'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'executed', 'cancelled'],
      default: 'pending',
    },
    executedAt: {
      type: Date,
    },
    orderId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
paperTradeSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('PaperTrade', paperTradeSchema);

