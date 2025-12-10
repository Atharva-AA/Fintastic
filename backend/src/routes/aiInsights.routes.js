import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getIncomeInsight,
  getExpenseInsight,
  getSavingsInsight,
  getInvestmentInsight,
  getGoalsInsight,
  getAllInsights
} from "../controllers/aiInsights.controller.js";

const router = express.Router();

// All routes require authentication
router.get("/income/:userId", protect, getIncomeInsight);
router.get("/expense/:userId", protect, getExpenseInsight);
router.get("/savings/:userId", protect, getSavingsInsight);
router.get("/investment/:userId", protect, getInvestmentInsight);
router.get("/goals/:userId", protect, getGoalsInsight);
router.get("/all/:userId", protect, getAllInsights);

export default router;

