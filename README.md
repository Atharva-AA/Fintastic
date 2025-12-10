## Fintastic – Intelligent Personal Finance Coach

Fintastic is a full‑stack personal finance platform that combines a traditional budgeting app with a deterministic “Financial Coach Engine” and an AI insights service. It is designed to feel like a premium, calm, data‑driven finance product (Apple‑style UI, no noise), while running a fairly sophisticated decision system in the background.

### High‑Level Architecture

- **Frontend (React + TypeScript + Tailwind)**  
  - Runs at `http://localhost:5174` (Vite dev server).  
  - Uses a pastel / glassmorphism dashboard theme with optional dark mode.  
  - Pages: `Dashboard`, `Income`, `Expenses`, `Goals`, `Investments`, `Timeline`, `Profile`, `AI Coach`, and `Finance Tutor`.  
  - Core UI features:
    - Clean money overview (income vs expenses, top categories, trends).
    - Page‑specific AI insight cards (Income / Spending / Savings / Goals / Investments) rendered via `InsightCard`.
    - Gmail pending‑transactions review and direct bank‑PDF ingestion.
    - Finance Tutor area with:
      - **VideoLectures** – curated YouTube learning playlist.
      - **PaperTradingSimulator** – paper trading UI with charts and portfolio.
      - **SIPCalculator** – SIP projections and comparison cards using Recharts.

- **Backend (Node.js + Express + MongoDB)**  
  - Runs at `http://localhost:3000`.  
  - Responsible for auth (cookie‑based JWT), transactions, goals, dashboard analytics, AI alerts, Gmail pending transactions, bank‑PDF ingestion, and tutor / paper‑trading APIs.
  - Key subsystems:
    - `FinancialCoachEngine` – central decision brain that:
      - Analyses transactions + history.
      - Computes risk/positivity scores and behavioral flags (micro‑leaks, drift, recovery, spending bursts, etc.).
      - Creates/updates `AiAlert` records and calls the AI service only for “meaningful” alerts.
    - `AiAlert` model – stores alerts plus rich `fullInsights` used across pages.
    - `classifyAlertArea` – deterministic mapping of every alert to a single app scope/page (income / expense / saving / investment / goal / overall).
    - Gmail + PDF flows:
      - Gmail: AI‑classified emails are stored as `GmailPendingTransaction` and can be approved/rejected into real transactions.
      - Bank PDFs: parsed into transactions, deduplicated by hash and added directly.
    - Tutor / paper trading:
      - `PaperTrade` + `Portfolio` models to track simulated trading.
      - `/api/tutor/...` routes for videos, market data, paper trades, portfolio and SIP calculations.

- **AI Service (Python FastAPI)**  
  - Runs at `http://localhost:8001`.  
  - Responsibilities:
    - `/ai/insights` – generates structured, page‑specific insights for alerts using a single “ultra‑comprehensive” system prompt and Groq.  
    - Gmail reader – OAuth + Gmail API integration, parsing only real financial emails (UPI / card / bank) and pushing structured transactions to the Node backend.  
    - Bank‑PDF parser – parses SBI‑style statements with `pdfplumber`, creates normalized rows and posts them to the backend.  
    - Market data – `/market-data` endpoint backed by `yfinance` used by the Finance Tutor paper‑trading UI.  
    - Background jobs – APScheduler cron for Gmail auto‑sync and daily mentor tasks.

### Core Concepts

- **Single Source of Truth for Alerts**  
  All alerts and AI insights are created only inside `runFinancialCoachEngine`. Controllers never call `createOrUpdateAiAlert` or `sendToMemory` directly. This keeps classification, memory storage and insight triggering deterministic and centralized.

- **Behavior‑Aware AI**  
  Alerts and insights are not just about single transactions: the engine computes micro‑patterns (drift, micro‑leaks, bursts, improvement, recovery) and passes those flags plus history to the AI service. The `/ai/insights` endpoint applies a “meaningfulness” filter so only significant alerts generate AI text.

- **Page‑Specific AI Reports**  
  For each alert, the backend requests a page‑specific bundle of insights (income, expense, savings, investment, goals). These are stored on the alert and read by each page via small REST endpoints, then rendered in a neutral, paragraph‑style `InsightCard`.

- **Data Ingestion Pipelines**  
  - Manual: user‑entered income/expense transactions.  
  - Gmail: per‑user Gmail OAuth + strict parsing rules for financial emails → pending transactions.  
  - PDFs: bank statements parsed into normalized transactions with duplicate protection.  
  - Tutor: yfinance‑powered market data and simulated trades.

### Running the Project (Local Dev)

1. **Backend (Node)**  
   ```bash
   cd backend
   npm install
   npm run dev     # or npm start, depending on your setup
   ```
   Ensure MongoDB is running and `.env` contains `MONGODB_URI`, `JWT_SECRET`, and any Gmail/AI secrets.

2. **AI Service (FastAPI)**  
   ```bash
   cd ai-service
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```

3. **Frontend (Vite + React)**  
   ```bash
   cd frontend
   npm install
   npm run dev     # runs on http://localhost:5174
   ```

### Finance Tutor (New Area)

- Accessible from the left sidebar (`Finance Tutor` tab) or `/finance-tutor`.
- Tabs:
  - **Videos** – pulls `/api/tutor/videos` (first two from “Finance with Sharan”), shows a featured hero video + grid.
  - **Paper Trading Lab** – calls `/api/tutor/market-data/:symbol`, `/api/tutor/trade`, `/api/tutor/portfolio`, `/api/tutor/orders` to simulate stock trades with charts and portfolio metrics.
  - **SIP Calculator** – calls `/api/tutor/calculate-sip`, shows growth projections with Recharts and summary cards.

### Design Principles

- Calm, premium, “pro‑grade” finance UI (no cartoons or loud colors).
- Deterministic backend logic (no fuzzy magic in controllers).
- AI is used to explain and coach, not to invent data.
- Extensible: new pages or data sources can plug into the existing alert + insights pipeline.


# Fintastic
# Fintastic
# Fintastic
# Fintastic
