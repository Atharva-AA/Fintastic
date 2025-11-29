import BehaviorProfile from "../models/BehaviorProfile.js";
import mongoose from "mongoose";

export const getBehaviorProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate and convert userId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);
    const profile = await BehaviorProfile.findOne({ userId: userIdObj });

    if (!profile) {
      return res.status(404).json({ message: "No behavior profile found for this user." });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error("Error fetching BehaviorProfile:", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

