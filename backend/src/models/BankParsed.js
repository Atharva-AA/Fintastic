import mongoose from 'mongoose';

const bankParsedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: String,
    description: String,
    amount: Number,
    type: {
      type: String,
      enum: ['income', 'expense'],
    },
    hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('BankParsed', bankParsedSchema);

