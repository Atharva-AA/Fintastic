// controllers/forecast.controller.js
import { forecastGoalsInternal } from "../utils/forecastGoals.internal.js";

export const getGoalForecast = async (req, res) => {
  try {
    const userId = req.user._id;
    const forecast = await forecastGoalsInternal(userId);
    res.json({ forecast });
  } catch (err) {
    console.error("getGoalForecast error", err);
    res.status(500).json({ message: "Server error" });
  }
};