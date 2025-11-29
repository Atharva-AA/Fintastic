import mongoose from 'mongoose';

const pendingActionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
      unique: true, // Only ONE pending action per user
    },

    plan: {
      type: Object,
      required: true,
    },

    status: {
      type: String,
      enum: ['waiting_confirmation', 'executed', 'cancelled'],
      default: 'waiting_confirmation',
    },
  },
  { timestamps: true }
);

export default mongoose.model('PendingAction', pendingActionSchema);
