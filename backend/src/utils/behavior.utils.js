import mongoose from "mongoose";
import BehaviorProfile from "../models/BehaviorProfile.js";

export async function getBehaviorProfile(userId) {
  try {
    let userIdObj = userId;
    if (typeof userId === "string" && mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
    }

    const profile = await BehaviorProfile.findOne({ userId: userIdObj }).lean();
    return profile || null;
  } catch (error) {
    console.error("getBehaviorProfile util error:", error.message);
    return null;
  }
}

