import dotenv from "dotenv";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
dotenv.config();

console.log("GEMINI:", process.env.GEMINI_API_KEY ? "LOADED" : "NOT LOADED");


// ✅ Connect MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Fintastic backend running at http://localhost:${PORT}`);
});



