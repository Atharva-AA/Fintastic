import express from "express";
import { addTransaction, addTransactionInternal } from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";
import { verifyAI } from "../middleware/verifyAI.js";


const router = express.Router();

/* ================================================
   ADD MANUAL TRANSACTION
   Types supported:
   - income
   - expense
   - holding (AI decides → saving / investment)
================================================== */

router.post("/add", protect, addTransaction);

/* ================================================
   ADD TRANSACTION FROM AI-SERVICE (Internal)
   For PDF uploads - adds directly without pending
   Headers: x-ai-secret (for authentication)
================================================== */

router.post("/add-internal", verifyAI, addTransactionInternal);

export default router;
