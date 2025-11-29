import express from "express";
import { getIncomeIntelligence } from "../controllers/incomeController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/intelligence", protect, getIncomeIntelligence);

export default router;


