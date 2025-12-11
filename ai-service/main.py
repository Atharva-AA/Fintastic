"""
Fintastic AI Service - Main Application
Refactored for maintainability with modular architecture

Modules:
- config.py: Environment variables and constants
- schemas/: Pydantic request/response models
- tools/: Search, market, and memory tools
- prompts/: AI prompt templates
- utils/: Helper functions
"""

# =========================
# IMPORTS
# =========================

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Any, Dict, List
import os
import json
import httpx
import requests
from datetime import datetime as dt_datetime
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

# IMPORTANT: Load environment variables BEFORE other imports
from dotenv import load_dotenv
load_dotenv()

# Fix temp directory issue for PyTorch/transformers
import tempfile
temp_dirs = ['/tmp', '/var/tmp', os.path.expanduser('~/tmp')]
for temp_dir in temp_dirs:
    try:
        os.makedirs(temp_dir, exist_ok=True)
        test_file = os.path.join(temp_dir, '.fintastic_test')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        os.environ['TMPDIR'] = temp_dir
        tempfile.tempdir = temp_dir
        print(f"✅ Using temp directory: {temp_dir}")
        break
    except (OSError, PermissionError):
        continue
else:
    fallback_temp = os.path.join(os.getcwd(), 'temp')
    os.makedirs(fallback_temp, exist_ok=True)
    os.environ['TMPDIR'] = fallback_temp
    tempfile.tempdir = fallback_temp
    print(f"⚠️ Using fallback temp directory: {fallback_temp}")

# =========================
# LOCAL IMPORTS
# =========================

from config import (
    GROQ_API_KEY, GROQ_MODEL, NODE_BACKEND_URL, AI_SECRET,
    SMTP_HOST, SMTP_PORT, MENTOR_EMAIL, MENTOR_EMAIL_PASSWORD,
    GIG_CATEGORIES, LIVE_DATA_TRIGGER_KEYWORDS, MARKET_INVESTMENT_KEYWORDS
)

from schemas import (
    MemoryRequest, QueryRequest, Input, InsightRequest,
    ChatMessage, ChatRequest, AgentPlan, ExecuteRequest,
    MarketDataRequest, DailyMentorRequest
)

from tools import (
    tavily_search, get_stock_market_data, get_sip_ideas, get_insurance_ideas,
    market_overview, sip_forecast, crash_risk_detector, investment_signal_engine,
    store_memory_entry, query_user_memories, merge_and_clean_memories,
    build_behavior_context, get_latest_alert_context
)
from tools.memory import get_collection, get_model

from prompts import build_chat_system_prompt, build_gig_worker_context
from utils import get_latest_financial_data, detect_gig_worker, analyze_transactions

# External imports
from services.market_data import get_market_data
from node_client import (
    add_transaction_tool, update_transaction_tool, delete_transaction_tool,
    get_transactions_tool, get_user_stats_tool, create_goal_tool,
    fetch_recent_transactions
)
from transaction_service import create_transaction
from connect_mail import authenticate_user_gmail, fetch_and_classify, debug_fetch
from parser import parse_pdf
from groq import AsyncGroq

# =========================
# APP INIT
# =========================

app = FastAPI(
    title="Fintastic AI Service",
    description="AI-powered financial intelligence engine",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
client = AsyncGroq(api_key=GROQ_API_KEY)

# Get ChromaDB collection and model
collection = get_collection()
model = get_model()

# =========================
# STARTUP
# =========================

@app.on_event("startup")
async def startup_event():
    print("✅ AI-Service ready")
    print("📬 Gmail reader loaded")
    print("🚀 AI-Service running at http://localhost:8001")

# =========================
# HEALTH CHECK
# =========================

@app.get("/")
def health():
    return {"status": "✅ Fintastic AI Service Running", "version": "2.0.0"}

# =========================
# MEMORY ROUTES
# =========================

@app.post("/store-memory")
async def store_memory(data: MemoryRequest):
    """Store a memory in ChromaDB"""
    print("📥 Storing memory:", data)
    
    if not data.content or len(data.content.strip()) < 10:
        return {"status": "skipped", "reason": "Content too small"}
    
    vector = model.encode(data.content).tolist()
    
    collection.upsert(
        ids=[data.id],
        embeddings=[vector],
        metadatas=[{
            "userId": data.userId,
            "type": data.type,
            "content": data.content,
            **(data.metadata or {})
        }],
        documents=[data.content]
    )
    
    return {"status": "stored", "id": data.id, "vector_dim": len(vector)}


@app.post("/search-memory")
def search_memory(data: QueryRequest):
    """Search memories by query"""
    matches = query_user_memories(
        user_id=data.userId,
        query=data.query,
        top_k=data.topK or 5,
    )
    return {"matches": matches}


@app.get("/all-memories")
def view_all_memories():
    """View all memories in the database"""
    try:
        data = collection.get(include=["documents", "metadatas"])
        return {
            "total": len(data["ids"]),
            "ids": data["ids"],
            "documents": data["documents"],
            "metadatas": data["metadatas"]
        }
    except Exception as e:
        return {"error": str(e), "total": 0}


@app.get("/count")
def count_memories():
    """Count total memories"""
    try:
        data = collection.get()
        return {"total": len(data["ids"])}
    except Exception as e:
        return {"error": str(e), "total": 0}


@app.delete("/clear-all")
def clear_all_memories():
    """Clear all memories"""
    try:
        data = collection.get()
        if len(data["ids"]) == 0:
            return {"status": "already_empty", "deleted": 0}
        collection.delete(ids=data["ids"])
        return {"status": "success", "deleted": len(data["ids"])}
    except Exception as e:
        return {"error": str(e), "status": "failed"}


@app.delete("/clear-user/{user_id}")
def clear_user_memories(user_id: str):
    """Clear memories for a specific user"""
    try:
        data = collection.get(where={"userId": user_id})
        if len(data["ids"]) == 0:
            return {"status": "not_found", "userId": user_id, "deleted": 0}
        collection.delete(ids=data["ids"])
        return {"status": "success", "userId": user_id, "deleted": len(data["ids"])}
    except Exception as e:
        return {"error": str(e), "status": "failed"}

# =========================
# CLASSIFICATION ROUTE
# =========================

@app.post("/classify")
async def classify(data: Input):
    """Classify a transaction"""
    print("📊 Transaction received:", data)
    result = await create_transaction(data.amount, data.description)
    return {"success": True, "data": result}

# =========================
# MARKET DATA ROUTE
# =========================

@app.post("/market-data")
async def get_market_data_endpoint(data: MarketDataRequest):
    """Get market data for a stock symbol"""
    try:
        result = get_market_data(data.symbol)
        return result
    except Exception as e:
        print(f"❌ Error in market data endpoint: {str(e)}")
        return {
            "symbol": data.symbol.upper(),
            "price": 0,
            "change": 0,
            "changePercent": 0,
            "chartData": [],
            "info": {"name": data.symbol, "sector": None, "marketCap": None},
            "error": str(e)
        }

# =========================
# AI INSIGHTS ROUTE
# =========================

@app.post("/ai/insights")
async def generate_ai_insights(data: InsightRequest):
    """Generate AI financial insights"""
    from routes.insights import handle_insights_request
    return await handle_insights_request(data, client, GROQ_MODEL)

# =========================
# AI CHAT ROUTE
# =========================

@app.post("/ai/chat")
async def ai_chat(data: ChatRequest):
    """Main AI chat endpoint"""
    from routes.chat import handle_chat_request
    return await handle_chat_request(data, client, GROQ_MODEL)

# =========================
# AI EXECUTE ROUTE
# =========================

@app.post("/ai/execute")
async def ai_execute(data: ExecuteRequest):
    """Execute a planned action"""
    from routes.execute import handle_execute_request
    return await handle_execute_request(data, client, GROQ_MODEL)

# =========================
# AI REPORT ROUTES
# =========================

@app.post("/ai/update-report")
async def update_financial_report(data: MarketDataRequest):
    """Generate financial report"""
    from routes.report import handle_report_request
    return await handle_report_request(data, client, GROQ_MODEL)


@app.post("/ai/daily-monitor")
async def daily_monitor(data: dict):
    """Daily financial monitoring"""
    from routes.monitor import handle_daily_monitor
    return await handle_daily_monitor(data, client, GROQ_MODEL)

# =========================
# DAILY MENTOR ROUTE
# =========================

@app.post("/ai/daily-mentor")
async def daily_mentor(data: DailyMentorRequest):
    """Generate daily mentor report"""
    from routes.mentor import handle_daily_mentor
    return await handle_daily_mentor(data, client, GROQ_MODEL)

# =========================
# EMAIL ROUTE
# =========================

@app.post("/ai/send-email")
async def send_financial_coach_email(data: dict):
    """Send financial coach email"""
    from routes.email import handle_send_email
    return await handle_send_email(data, client, GROQ_MODEL)

# =========================
# GMAIL ROUTES
# =========================

@app.get("/gmail/connect/{userId}")
async def gmail_connect(userId: str):
    """Get OAuth URL for Gmail connection"""
    from routes.gmail import get_gmail_auth_url
    return get_gmail_auth_url(userId)


@app.get("/gmail/callback")
async def gmail_callback(code: str = None, state: str = None, error: str = None):
    """Handle OAuth callback"""
    if error:
        return {"success": False, "error": error}
    if not code or not state:
        return {"success": False, "error": "Missing code or state"}
    
    from routes.gmail import handle_gmail_callback
    result = handle_gmail_callback(code, state)
    
    if result.get("success"):
        # Redirect to frontend success page
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}/settings?gmail=connected")
    return result


@app.post("/gmail/fetch/{userId}")
async def gmail_fetch(userId: str):
    """Fetch and classify transactions from Gmail"""
    from routes.gmail import fetch_gmail_transactions
    return await fetch_gmail_transactions(userId, client, GROQ_MODEL)


@app.get("/gmail/status/{userId}")
async def gmail_status(userId: str):
    """Check Gmail connection status"""
    from routes.gmail import check_gmail_connection
    return check_gmail_connection(userId)


@app.get("/gmail/debug/{userId}")
async def gmail_debug(userId: str):
    """Debug: Print last 5 emails for a user"""
    # Use original debug function
    return await debug_fetch(userId)

# =========================
# PDF PARSE ROUTE
# =========================

@app.post("/parse")
async def parse_bank_pdf(userId: str = Form(...), file: UploadFile = File(...)):
    """Parse bank PDF statement"""
    from routes.pdf import handle_pdf_parse
    file_content = await file.read()
    return await handle_pdf_parse(file_content, file.filename, userId, client, GROQ_MODEL)


@app.get("/pdf/supported-banks")
async def get_supported_banks():
    """Get list of supported banks for PDF parsing"""
    from routes.pdf import get_supported_banks
    return get_supported_banks()

# =========================
# BACKGROUND JOBS
# =========================

def run_gmail_cron():
    """Cron job to fetch Gmail transactions for all users"""
    import asyncio
    from routes.gmail import run_gmail_cron_job
    
    # Get list of user IDs with Gmail connected
    from routes.gmail import GMAIL_CREDS_DIR
    user_ids = []
    for token_file in GMAIL_CREDS_DIR.glob("token_*.json"):
        user_id = token_file.stem.replace("token_", "")
        user_ids.append(user_id)
    
    if user_ids:
        asyncio.run(run_gmail_cron_job(user_ids, client, GROQ_MODEL))


def run_daily_mentor_for_all_users():
    """Run daily mentor for all users"""
    import asyncio
    from routes.mentor import run_daily_mentor_cron
    
    # Get list of all users from backend
    try:
        import requests
        response = requests.get(f"{NODE_BACKEND_URL}/users/all-ids", timeout=10)
        if response.ok:
            user_ids = response.json().get("userIds", [])
            if user_ids:
                asyncio.run(run_daily_mentor_cron(user_ids, client, GROQ_MODEL))
    except Exception as e:
        print(f"⚠️ Daily mentor cron error: {e}")


# Initialize scheduler
scheduler = BackgroundScheduler()

scheduler.add_job(
    run_gmail_cron,
    trigger="interval",
    minutes=10,
    id="gmail_cron",
    replace_existing=True
)

scheduler.start()
print("✅ Daily Mentor Scheduler started (9 PM)")
print("⏰ Gmail Cron (10m) active")
