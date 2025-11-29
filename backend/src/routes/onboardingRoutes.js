import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  saveBasicProfile,
  saveIncomeData,
  saveExpenseData,
  saveGoals,
  saveSavingsInvestments,
} from "../controllers/onboardingController.js";

const router = express.Router();

router.put("/basic-profile", protect, saveBasicProfile);
router.post("/income", protect, saveIncomeData);
router.post("/expense", protect, saveExpenseData);
router.post("/goals", protect, saveGoals);
router.post("/savings-investments", protect, saveSavingsInvestments);

export default router;
