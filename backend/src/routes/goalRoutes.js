import express from "express";
import {
  createGoal,
  getGoalStatus,
  contributeToGoal,
} from "../controllers/goalController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createGoal);
router.get("/status", protect, getGoalStatus);
router.post("/contribute", protect, contributeToGoal);

export default router;
