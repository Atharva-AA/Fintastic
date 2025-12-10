import mongoose from "mongoose";
import AiAlert from "../models/AiAlert.js";

export async function getActiveAlerts(userId) {
  try {
    let userIdObj = userId;
    if (typeof userId === "string" && mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
    }

    const alerts = await AiAlert.find({
      userId: userIdObj,
      status: "active",
      level: { $in: ["CRITICAL", "HIGH", "POSITIVE"] },
    })
      .sort({ updatedAt: -1 })
      .lean();

    return alerts || [];
  } catch (error) {
    console.error("getActiveAlerts util error:", error.message);
    return [];
  }
}