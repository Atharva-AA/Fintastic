import express from "express";
import { addTransaction } from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";


const router = express.Router();

/* ================================================
   ADD MANUAL TRANSACTION
   Types supported:
   - income
   - expense
   - holding (AI decides → saving / investment)
================================================== */

router.post("/add", protect, addTransaction);

export default router;
