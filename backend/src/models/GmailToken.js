import mongoose from 'mongoose';

const gmailTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Note: This schema does NOT store OAuth tokens
// OAuth tokens are stored in ai-service/gmail_credentials/token_<userId>.json
// This schema only tracks which users have connected their Gmail

export default mongoose.model('GmailToken', gmailTokenSchema);
