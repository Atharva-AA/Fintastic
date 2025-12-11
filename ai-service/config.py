"""
Configuration module for Fintastic AI Service
Centralizes environment variables and constants
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# =========================
# API KEYS & SECRETS
# =========================
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
AI_SECRET = os.getenv("AI_INTERNAL_SECRET", "fintastic-ai-secret-2024")
SERVICE_JWT = os.getenv("SERVICE_JWT")

# =========================
# SERVICE URLS
# =========================
NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL", "http://localhost:3000")
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8001")

# =========================
# EMAIL CONFIGURATION
# =========================
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
MENTOR_EMAIL = os.getenv("MENTOR_EMAIL")
MENTOR_EMAIL_PASSWORD = os.getenv("MENTOR_EMAIL_PASSWORD")

# =========================
# AI MODEL CONFIGURATION
# =========================
GROQ_MODEL = "llama-3.3-70b-versatile"

# =========================
# CHROMA DB CONFIGURATION
# =========================
BASE_DIR = os.getcwd()
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")

# =========================
# MEMORY TYPE MAPPING
# =========================
# Standardized memory type mapping (same as Node.js)
TYPE_MAPPING = {
    "general": "onboarding_profile",
    "onboarding_profile": "onboarding_profile",
    "income_pattern": "onboarding_profile",
    "spending_pattern": "onboarding_profile",
    "investment_profile": "onboarding_profile",
    "goal": "onboarding_profile",
    "spending_alert": "daily_activity",
    "positive_behavior": "daily_activity",
    "daily_mentor": "daily_activity",
    "chat_behavior": "behavior_pattern",
    "decision_history": "decision_history",
    "goal_profile": "goal_progress",
    "goal_progress": "goal_progress",
    "market_intelligence": "market_intelligence",
    "market_alert": "market_alert",
}

# =========================
# GIG WORKER DETECTION
# =========================
GIG_CATEGORIES = [
    "freelance", "gig", "contractor", "self-employed", 
    "consulting", "commission", "tips", "side hustle"
]

# =========================
# KEYWORD TRIGGERS
# =========================
LIVE_DATA_TRIGGER_KEYWORDS = [
    "how am i doing", "how am i", "current", "today", "this month", "now",
    "how much", "can i afford", "recent", "latest", "update", "progress",
    "where am i", "status", "report", "financial state", "my situation"
]

MARKET_INVESTMENT_KEYWORDS = [
    "market", "stock", "invest", "sip", "mutual fund", "nifty", "sensex",
    "crash", "bullish", "bearish", "buy", "sell", "portfolio", "equity",
    "should i invest", "when to invest", "investment advice", "market trend",
    "share", "share value", "share price", "stock price", "current price",
    "zomato", "tata", "reliance", "infosys", "tcs", "hdfc", "icici"
]
