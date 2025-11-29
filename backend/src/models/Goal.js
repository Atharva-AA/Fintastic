import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    targetAmount: {
      type: Number,
      required: true,
    },

    currentAmount: {
      type: Number,
      default: 0,
    },

    priority: {
      type: String,
      enum: ["must_have", "good_to_have"],
      default: "good_to_have",
    },

    deadline: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Goal", goalSchema);
