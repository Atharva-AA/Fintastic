# =========================
# IMPORTS
# =========================

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Optional, Dict, List
import os
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from collections import Counter
import requests
import httpx

# IMPORTANT: Load environment variables BEFORE importing node_client
from dotenv import load_dotenv
load_dotenv()

# Fix temp directory issue for PyTorch/transformers
import tempfile
import os
# Ensure temp directory exists
temp_dirs = ['/tmp', '/var/tmp', os.path.expanduser('~/tmp')]
for temp_dir in temp_dirs:
    try:
        os.makedirs(temp_dir, exist_ok=True)
        # Test if we can write to it
        test_file = os.path.join(temp_dir, '.fintastic_test')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        # Set as temp directory
        os.environ['TMPDIR'] = temp_dir
        tempfile.tempdir = temp_dir
        print(f"✅ Using temp directory: {temp_dir}")
        break
    except (OSError, PermissionError):
        continue
else:
    # Fallback: use current directory
    fallback_temp = os.path.join(os.getcwd(), 'temp')
    os.makedirs(fallback_temp, exist_ok=True)
    os.environ['TMPDIR'] = fallback_temp
    tempfile.tempdir = fallback_temp
    print(f"⚠️ Using fallback temp directory: {fallback_temp}")

from node_client import (
  add_transaction_tool,
  update_transaction_tool,
  delete_transaction_tool,
  get_transactions_tool,
  get_user_stats_tool,
  create_goal_tool
)

import chromadb
from fastapi.middleware.cors import CORSMiddleware
import json 
from transaction_service import create_transaction

from groq import AsyncGroq

# Import sentence_transformers AFTER temp directory fix
from sentence_transformers import SentenceTransformer

# =========================
# APP INIT
# =========================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# HELPERS
# =========================
from tavily import TavilyClient
import requests


TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL", "http://localhost:3000")
SERVICE_JWT = os.getenv("SERVICE_JWT")  # optional, if you use auth

tavily_client = TavilyClient(api_key=TAVILY_API_KEY)

def tavily_search(query: str) -> str:
    """Search using Tavily and return formatted results"""
    try:
        # Check if API key is available
        if not TAVILY_API_KEY:
            print("⚠️ TAVILY_API_KEY not configured")
            return "Web search unavailable - TAVILY_API_KEY not configured in environment variables."
        
        print(f"🔍 Tavily search query: {query}")
        res = tavily_client.search(query=query, search_depth="advanced")
        
        if res and res.get("results"):
            # Format results nicely
            results = []
            for i, r in enumerate(res["results"][:5], 1):  # Get top 5 results
                title = r.get("title", "No title")
                content = r.get("content", "")
                url = r.get("url", "")
                results.append(f"[{i}] {title}\n{content[:500]}{'...' if len(content) > 500 else ''}\nSource: {url}")
            
            formatted = "\n\n".join(results)
            print(f"✅ Tavily returned {len(res.get('results', []))} results")
            return formatted
        else:
            print("⚠️ Tavily returned no results")
            return "No relevant web information found for this query."
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Tavily error: {error_msg}")
        
        # Check for specific error types
        if "api_key" in error_msg.lower() or "unauthorized" in error_msg.lower() or "invalid" in error_msg.lower():
            return "Web search unavailable - TAVILY_API_KEY is invalid or expired. Please check your API key."
        elif "quota" in error_msg.lower() or "limit" in error_msg.lower() or "exceeded" in error_msg.lower():
            return "Web search unavailable - Tavily API quota exceeded. Please check your API usage."
        elif "rate" in error_msg.lower():
            return "Web search temporarily unavailable - Rate limit reached. Please try again in a moment."
        else:
            return f"Web search error: {error_msg[:200]}"


def get_stock_market_data(symbol: str) -> str:
    """Fetch stock market data using Tavily search - returns actual search results"""
    try:
        # Clean symbol name (remove common words)
        clean_symbol = symbol.replace(" share", "").replace(" stock", "").replace(" price", "").replace(" value", "").replace(" current", "").strip()
        
        # Build multiple queries for better coverage
        queries = [
            f"{clean_symbol} stock price today India NSE BSE current share value",
            f"{clean_symbol} share price latest NSE BSE India market",
            f"{clean_symbol} stock analysis price target India"
        ]
        
        all_results = []
        for query in queries:
            result = tavily_search(query)
            if result and "unavailable" not in result.lower() and "error" not in result.lower() and "not configured" not in result.lower():
                all_results.append(result)
                if len(all_results) >= 2:  # Get results from 2 queries
                    break
        
        if all_results:
            combined = "\n\n---\n\n".join(all_results)
            print(f"✅ Retrieved stock data for {clean_symbol}")
            return combined
        else:
            # Fallback message if Tavily fails
            return f"⚠️ Unable to fetch current price for {clean_symbol} via search.\n\nPlease check financial websites:\n- NSE: https://www.nseindia.com (search for {clean_symbol})\n- BSE: https://www.bseindia.com\n- Moneycontrol: https://www.moneycontrol.com"
            
    except Exception as e:
        print(f"❌ Stock market data error for {symbol}:", e)
        clean_symbol = symbol.replace(" share", "").replace(" stock", "").replace(" price", "").replace(" value", "").strip()
        return f"⚠️ Error fetching market data for {clean_symbol}: {str(e)}\n\nFor current prices, please check:\n- NSE: https://www.nseindia.com\n- BSE: https://www.bseindia.com"


def get_sip_ideas(risk_level: str, monthly_amount: float, goal: str) -> str:
    """Fetch SIP (Systematic Investment Plan) recommendations using Tavily"""
    try:
        query = f"best SIP mutual funds India {risk_level} risk ₹{monthly_amount} monthly investment {goal}"
        return tavily_search(query)
    except Exception as e:
        print(f"SIP ideas error: {e}")
        return f"SIP recommendations for {risk_level} risk profile with ₹{monthly_amount}/month are currently unavailable. Consider consulting a financial advisor."


def get_insurance_ideas(age: int, dependents: int, income: float) -> str:
    """Fetch insurance recommendations using Tavily"""
    try:
        query = f"best life insurance health insurance India age {age} dependents {dependents} income ₹{income} monthly"
        return tavily_search(query)
    except Exception as e:
        print(f"Insurance ideas error: {e}")
        return f"Insurance recommendations for age {age} with {dependents} dependents and ₹{income}/month income are currently unavailable. Consider consulting an insurance advisor."


# =========================
# MARKET-AWARE TOOLS
# =========================

async def market_overview(user_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get comprehensive market overview including Nifty, Sensex, VIX, trends, and news.
    Must consider user's risk index and income stability.
    """
    try:
        risk_index = user_context.get("riskIndex", 50)
        income_stability = user_context.get("incomeStability", "moderate")
        is_gig_worker = user_context.get("isGigWorker", False)
        
        # Fetch market data using Tavily
        query = "Latest Indian stock market update, Nifty Sensex today, VIX index, crash risk, recession signals, market sentiment India"
        market_data = tavily_search(query)
        
        # Parse market data to extract key metrics
        # Note: In production, you'd use actual market APIs, but Tavily provides news/analysis
        nifty = "N/A"  # Would be from actual API
        sensex = "N/A"  # Would be from actual API
        vix = "N/A"  # Would be from actual API
        
        # Analyze sentiment from market data
        market_lower = market_data.lower()
        bullish_indicators = ["bullish", "rally", "gains", "up", "positive", "growth"]
        bearish_indicators = ["bearish", "crash", "fall", "down", "negative", "decline", "recession"]
        volatile_indicators = ["volatile", "uncertain", "mixed", "fluctuat"]
        
        bullish_count = sum(1 for word in bullish_indicators if word in market_lower)
        bearish_count = sum(1 for word in bearish_indicators if word in market_lower)
        volatile_count = sum(1 for word in volatile_indicators if word in market_lower)
        
        if bearish_count > bullish_count and bearish_count > volatile_count:
            trend = "bearish"
            global_sentiment = "negative"
        elif bullish_count > bearish_count and bullish_count > volatile_count:
            trend = "bullish"
            global_sentiment = "positive"
        else:
            trend = "volatile"
            global_sentiment = "unstable"
        
        # Extract top news (simplified - in production, parse structured data)
        top_news = market_data.split("\n\n")[:3] if market_data else []
        
        # Sector trends (simplified - would come from actual market data)
        sector_trends = {
            "IT": "stable",
            "Banking": "stable",
            "Pharma": "stable",
            "FMCG": "stable"
        }
        
        # Adjust interpretation based on user context
        if risk_index < 30:  # Low risk user
            if trend == "bearish":
                trend = "volatile"  # Soften for low-risk users
        if is_gig_worker:
            # Gig workers need more conservative interpretation
            if trend == "bullish":
                global_sentiment = "positive"  # But still cautious
        
        return {
            "nifty": nifty,
            "sensex": sensex,
            "vix": vix,
            "trend": trend,
            "global_sentiment": global_sentiment,
            "top_news": top_news,
            "sector_trends": sector_trends,
            "raw_market_data": market_data[:500]  # First 500 chars for context
        }
    except Exception as e:
        print(f"Market overview error: {e}")
        return {
            "nifty": "N/A",
            "sensex": "N/A",
            "vix": "N/A",
            "trend": "unknown",
            "global_sentiment": "unknown",
            "top_news": [],
            "sector_trends": {},
            "error": str(e)
        }


async def sip_forecast(user_context: Dict[str, Any], market_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate SIP forecast based on user context and market conditions.
    Considers: monthly income, savings rate, risk index, goals, income stability, market trend.
    """
    try:
        monthly_income = user_context.get("monthlyIncome", 0)
        savings_rate = user_context.get("savingsRate", 0)
        risk_index = user_context.get("riskIndex", 50)
        goals = user_context.get("goals", [])
        is_gig_worker = user_context.get("isGigWorker", False)
        income_stability = user_context.get("incomeStability", "moderate")
        market_trend = market_context.get("trend", "stable")
        
        # Calculate available amount for SIP
        monthly_savings = (monthly_income * savings_rate) / 100 if savings_rate > 0 else monthly_income * 0.1
        
        # For gig workers, be more conservative
        if is_gig_worker:
            # Reserve 50% for emergency fund building
            available_for_sip = monthly_savings * 0.5
            emergency_fund_priority = True
        else:
            # Reserve 30% for emergency fund
            available_for_sip = monthly_savings * 0.7
            emergency_fund_priority = False
        
        # Adjust based on risk index
        if risk_index < 30:  # Low risk
            recommended_sip_amount = available_for_sip * 0.6  # More conservative
            suggested_funds = ["index", "large_cap", "debt"]
        elif risk_index < 70:  # Medium risk
            recommended_sip_amount = available_for_sip * 0.8
            suggested_funds = ["index", "large_cap", "mid_cap", "debt"]
        else:  # High risk
            recommended_sip_amount = available_for_sip
            suggested_funds = ["index", "large_cap", "mid_cap", "small_cap"]
        
        # Adjust based on market trend
        if market_trend == "bearish":
            # Stagger SIP - reduce amount
            recommended_sip_amount = recommended_sip_amount * 0.7
            ideal_execution_day_range = "5-10 (staggered approach)"
        elif market_trend == "volatile":
            recommended_sip_amount = recommended_sip_amount * 0.85
            ideal_execution_day_range = "1-5 (early month)"
        else:  # bullish or stable
            ideal_execution_day_range = "1-7 (standard)"
        
        # Risk adjustment notes
        risk_notes = []
        if is_gig_worker:
            risk_notes.append("Gig worker: Build 6-month emergency fund before aggressive SIP")
        if risk_index < 30:
            risk_notes.append("Low risk profile: Conservative funds only")
        if market_trend == "bearish":
            risk_notes.append("Bearish market: Staggered SIP approach recommended")
        if income_stability == "unstable":
            risk_notes.append("Unstable income: Maintain higher cash buffer")
        
        return {
            "recommended_sip_amount": round(recommended_sip_amount, 2),
            "suggested_funds": suggested_funds,
            "ideal_execution_day_range": ideal_execution_day_range,
            "risk_adjustment_notes": risk_notes,
            "emergency_fund_priority": emergency_fund_priority
        }
    except Exception as e:
        print(f"SIP forecast error: {e}")
        return {
            "recommended_sip_amount": 0,
            "suggested_funds": [],
            "ideal_execution_day_range": "N/A",
            "risk_adjustment_notes": ["Error calculating SIP forecast"],
            "error": str(e)
        }


async def crash_risk_detector(user_context: Dict[str, Any], market_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Detect crash risk probability and severity.
    Automatically creates alerts and stores in ChromaDB when severity is high/extreme.
    """
    try:
        risk_index = user_context.get("riskIndex", 50)
        is_gig_worker = user_context.get("isGigWorker", False)
        market_trend = market_context.get("trend", "stable")
        global_sentiment = market_context.get("global_sentiment", "unknown")
        vix = market_context.get("vix", "N/A")
        market_data = market_context.get("raw_market_data", "")
        
        # Calculate crash probability
        crash_probability = 0
        
        # Check VIX (if available)
        if vix != "N/A" and isinstance(vix, (int, float)):
            if vix > 30:
                crash_probability += 40
            elif vix > 25:
                crash_probability += 25
            elif vix > 20:
                crash_probability += 15
        
        # Check market trend
        if market_trend == "bearish":
            crash_probability += 30
        elif market_trend == "volatile":
            crash_probability += 15
        
        # Check sentiment
        if global_sentiment == "negative":
            crash_probability += 20
        elif global_sentiment == "unstable":
            crash_probability += 10
        
        # Check market data for crash indicators
        market_lower = market_data.lower() if market_data else ""
        crash_keywords = ["crash", "recession", "correction", "panic", "sell-off", "downturn"]
        crash_mentions = sum(1 for keyword in crash_keywords if keyword in market_lower)
        if crash_mentions >= 3:
            crash_probability += 25
        elif crash_mentions >= 2:
            crash_probability += 15
        
        # Cap at 100%
        crash_probability = min(crash_probability, 100)
        
        # Determine severity
        if crash_probability >= 70:
            severity = "extreme"
        elif crash_probability >= 50:
            severity = "high"
        elif crash_probability >= 30:
            severity = "medium"
        else:
            severity = "low"
        
        # Generate recommendations based on user context
        if severity in ["high", "extreme"]:
            if is_gig_worker:
                recommended_action = "CRITICAL: Reduce SIP exposure, increase emergency fund to 6 months, avoid new investments until market stabilizes"
            elif risk_index < 30:
                recommended_action = "Reduce equity exposure, shift to debt funds, maintain cash buffer"
            else:
                recommended_action = "Consider reducing equity allocation, stagger investments, maintain liquidity"
        elif severity == "medium":
            recommended_action = "Monitor market closely, consider reducing new investments, maintain current positions"
        else:
            recommended_action = "Market conditions normal, continue with planned investments"
        
        reasoning = f"Crash probability: {crash_probability}% based on market trend ({market_trend}), sentiment ({global_sentiment}), and market indicators. "
        if is_gig_worker:
            reasoning += "Gig worker with irregular income needs extra caution. "
        if risk_index < 30:
            reasoning += "Low risk profile requires conservative approach."
        
        result = {
            "crash_probability_percent": crash_probability,
            "severity": severity,
            "recommended_user_action": recommended_action,
            "reasoning": reasoning
        }
        
        # Store alert in ChromaDB if severity is high/extreme
        if severity in ["high", "extreme"]:
            user_id = user_context.get("userId", "unknown")
            alert_content = f"""
MARKET ALERT - {severity.upper()} CRASH RISK DETECTED

Crash Probability: {crash_probability}%
Severity: {severity}
Market Trend: {market_trend}
Global Sentiment: {global_sentiment}

Recommended Action: {recommended_action}

Reasoning: {reasoning}

User Context:
- Risk Index: {risk_index}
- Gig Worker: {is_gig_worker}
- Income Stability: {user_context.get('incomeStability', 'unknown')}
            """.strip()
            
            store_memory_entry(
                user_id=user_id,
                content=alert_content,
                mem_type="market_alert",
                metadata={
                    "crashProbability": crash_probability,
                    "severity": severity,
                    "marketTrend": market_trend,
                    "riskLevel": severity,
                    "userRiskIndex": risk_index,
                    "date": datetime.now().isoformat(),
                    "source": "crash_risk_detector"
                }
            )
            print(f"🚨 Market alert stored for user {user_id}: {severity} crash risk")
        
        return result
    except Exception as e:
        print(f"Crash risk detector error: {e}")
        return {
            "crash_probability_percent": 0,
            "severity": "low",
            "recommended_user_action": "Unable to assess crash risk. Monitor market conditions.",
            "reasoning": f"Error: {str(e)}",
            "error": str(e)
        }


async def investment_signal_engine(user_context: Dict[str, Any], market_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate investment signals (BUY/HOLD/WAIT/REDUCE_RISK) based on user context and market conditions.
    Must consider user's behavior, protect emergency fund, never advise risky assets for low risk users.
    """
    try:
        risk_index = user_context.get("riskIndex", 50)
        monthly_income = user_context.get("monthlyIncome", 0)
        savings_rate = user_context.get("savingsRate", 0)
        liquid_savings = user_context.get("liquidSavings", 0)
        is_gig_worker = user_context.get("isGigWorker", False)
        income_stability = user_context.get("incomeStability", "moderate")
        discipline_score = user_context.get("disciplineScore", 50)
        impulse_score = user_context.get("impulseScore", 50)
        consistency_index = user_context.get("consistencyIndex", 50)
        market_trend = market_context.get("trend", "stable")
        global_sentiment = market_context.get("global_sentiment", "unknown")
        
        # Calculate available investment amount
        monthly_savings = (monthly_income * savings_rate) / 100 if savings_rate > 0 else monthly_income * 0.1
        
        # Emergency fund check
        monthly_expense = user_context.get("monthlyExpense", monthly_income * 0.7)
        emergency_fund_target = monthly_expense * (6 if is_gig_worker else 3)
        emergency_fund_shortfall = max(0, emergency_fund_target - liquid_savings)
        
        # Determine signal
        signal = "HOLD"
        asset_type = "balanced"
        recommended_amount = 0
        justification_parts = []
        
        # If emergency fund is insufficient
        if emergency_fund_shortfall > 0:
            signal = "WAIT"
            asset_type = "emergency_fund"
            recommended_amount = min(monthly_savings * 0.8, emergency_fund_shortfall)
            justification_parts.append(f"Emergency fund shortfall: ₹{emergency_fund_shortfall:,.0f}. Build emergency fund first.")
            if is_gig_worker:
                justification_parts.append("Gig workers need 6-month emergency fund before investing.")
        # If market is bearish and user is low risk
        elif market_trend == "bearish" and risk_index < 30:
            signal = "WAIT"
            asset_type = "debt"
            recommended_amount = monthly_savings * 0.3
            justification_parts.append("Bearish market + low risk profile: Wait for stability, consider debt funds only.")
        # If market is bearish and user is high risk
        elif market_trend == "bearish" and risk_index >= 70:
            signal = "REDUCE_RISK"
            asset_type = "debt"
            recommended_amount = monthly_savings * 0.4
            justification_parts.append("Bearish market: Reduce equity exposure, shift to debt funds.")
        # If market is volatile and user has low discipline
        elif market_trend == "volatile" and discipline_score < 40:
            signal = "WAIT"
            asset_type = "debt"
            recommended_amount = monthly_savings * 0.2
            justification_parts.append("Volatile market + low discipline: Wait for clearer signals, focus on debt.")
        # If market is bullish and conditions are good
        elif market_trend == "bullish" and global_sentiment == "positive":
            if risk_index < 30:
                signal = "BUY"
                asset_type = "index"
                recommended_amount = monthly_savings * 0.5
                justification_parts.append("Bullish market: Conservative investment in index funds recommended.")
            elif risk_index < 70:
                signal = "BUY"
                asset_type = "balanced"
                recommended_amount = monthly_savings * 0.7
                justification_parts.append("Bullish market: Balanced portfolio investment recommended.")
            else:
                signal = "BUY"
                asset_type = "equity"
                recommended_amount = monthly_savings * 0.8
                justification_parts.append("Bullish market: Equity investment recommended for high-risk profile.")
        # Default: HOLD
        else:
            signal = "HOLD"
            asset_type = "balanced"
            recommended_amount = monthly_savings * 0.3
            justification_parts.append("Market conditions neutral: Maintain current positions, small incremental investments.")
        
        # Adjust for impulse score (high impulse = more conservative)
        if impulse_score > 70:
            recommended_amount = recommended_amount * 0.7
            justification_parts.append("High impulse score: Reducing recommended amount to prevent impulsive decisions.")
        
        # Adjust for consistency (low consistency = more conservative)
        if consistency_index < 40:
            recommended_amount = recommended_amount * 0.8
            justification_parts.append("Low consistency: Smaller, more manageable investment amounts.")
        
        # Never recommend risky assets for low risk users
        if risk_index < 30 and asset_type in ["equity", "small_cap", "mid_cap"]:
            asset_type = "index"
            justification_parts.append("Low risk profile: Switching to safer index funds only.")
        
        # Protect emergency fund - never recommend more than available
        if recommended_amount > monthly_savings * 0.9:
            recommended_amount = monthly_savings * 0.9
            justification_parts.append("Maintaining 10% buffer for emergency fund growth.")
        
        justification = " ".join(justification_parts)
        
        return {
            "signal": signal,
            "asset_type": asset_type,
            "recommended_amount": round(recommended_amount, 2),
            "justification": justification
        }
    except Exception as e:
        print(f"Investment signal engine error: {e}")
        return {
            "signal": "HOLD",
            "asset_type": "unknown",
            "recommended_amount": 0,
            "justification": f"Error calculating investment signal: {str(e)}",
            "error": str(e)
        }


# =========================
# CHROMA CONFIG
# =========================

BASE_DIR = os.getcwd()
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")

print(f"\n✅ Chroma DB will be stored at:\n{CHROMA_PATH}\n")

# Persistent Chroma client
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# Collection
collection = chroma_client.get_or_create_collection(name="fintastic_memory")

# Embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

import uuid

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

def get_importance(mem_type: str, metadata: Optional[Dict[str, Any]] = None) -> str:
    """Determine importance level based on type and metadata"""
    if not metadata:
        metadata = {}
    
    # High importance: critical alerts, goal completions, major decisions
    if (
        metadata.get("level") == "CRITICAL" or
        metadata.get("progress", 0) >= 100 or
        metadata.get("kind") == "stock" or
        mem_type == "decision_history"
    ):
        return "high"
    
    # Medium importance: high alerts, goal progress, positive behaviors
    if (
        metadata.get("level") in ["HIGH", "POSITIVE"] or
        metadata.get("progress", 0) >= 50 or
        mem_type == "goal_progress"
    ):
        return "medium"
    
    # Low importance: everything else
    return "low"

def store_memory_entry(
    user_id: str,
    content: str,
    mem_type: str = "onboarding_profile",
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Store a single memory in Chroma with standardized format.
    Enforces 5 strict memory types and adds standardized metadata.
    """

    if not content or len(content.strip()) < 10:
        return {"status": "skipped", "reason": "content too small"}

    # Map to standardized type
    standardized_type = TYPE_MAPPING.get(mem_type, "onboarding_profile")
    
    # Get importance
    importance = get_importance(standardized_type, metadata)
    
    # Get source and date
    source = metadata.get("source", "ai") if metadata else "ai"
    date = datetime.now().strftime("%Y-%m-%d")

    vector = model.encode(content).tolist()
    doc_id = f"{user_id}_{standardized_type}_{uuid.uuid4().hex[:8]}"

    # Build standardized metadata
    full_meta = {
        "userId": user_id,
        "type": standardized_type,  # Use standardized type
        "content": content,
        "source": source,
        "date": date,
        "importance": importance,
        "originalType": mem_type,  # Preserve original for reference
    }
    if metadata:
        # Add all other metadata, but don't override standardized fields
        for key, value in metadata.items():
            if key not in ["source", "date", "importance", "type"]:
                full_meta[key] = value

    collection.upsert(
        ids=[doc_id],
        embeddings=[vector],
        metadatas=[full_meta],
        documents=[content],
    )

    return {"status": "stored", "id": doc_id, "type": standardized_type, "importance": importance}


def get_latest_alert_context(alert: Optional[Dict[str, Any]]) -> str:
    """Return a clean textual summary for the latest alert."""
    if not alert:
        return (
            "ALERT CONTEXT\n"
            "--------------\n"
            "Level: data_insufficient\n"
            "Scope: data_insufficient\n"
            "Title: data_insufficient\n"
            "Reasons:\ndata_insufficient"
        )

    reasons = alert.get("reasons") or []
    reasons_text = "\n".join([f"- {r}" for r in reasons]) or "data_insufficient"

    return (
        "ALERT CONTEXT\n"
        "--------------\n"
        f"Level: {alert.get('level')}\n"
        f"Scope: {alert.get('scope')}\n"
        f"Title: {alert.get('title')}\n"
        "Reasons:\n"
        f"{reasons_text}"
    )


def build_behavior_context(behavior: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Format behavior profile numbers for prompts."""
    behavior = behavior or {}
    discipline = behavior.get("disciplineScore", 50)
    impulse = behavior.get("impulseScore", 50)
    consistency = behavior.get("consistencyIndex", 50)
    risk_index = behavior.get("riskIndex", 50)

    context = (
        "BEHAVIOR PROFILE\n"
        "--------------\n"
        f"Discipline: {discipline}/100\n"
        f"Impulse: {impulse}/100\n"
        f"Consistency: {consistency}/100\n"
        f"Risk: {risk_index}/100\n"
        "\nGuidelines:\n"
        f"- High discipline ({discipline}): Be analytical and detailed\n"
        f"- High impulse ({impulse}): Add stronger spending warnings\n"
        f"- Low consistency ({consistency}): Motivate habit-building\n"
        f"- Risk index ({risk_index}): Adjust investment tone accordingly\n"
    )

    return {
        "discipline": discipline,
        "impulse": impulse,
        "consistency": consistency,
        "risk": risk_index,
        "text": context,
    }


def query_user_memories(user_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Semantic memory search helper."""
    query_vector = model.encode(query).tolist()
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=top_k,
        where={"userId": user_id},
    )

    matches: List[Dict[str, Any]] = []
    if results and results.get("ids"):
        for i in range(len(results["ids"][0])):
            matches.append(
                {
                    "id": results["ids"][0][i],
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                }
            )
    return matches


def merge_and_clean_memories(records: List[Any]) -> str:
    """Merge pre-fetched memory snippets into a readable block."""
    snippets: List[str] = []
    seen = set()

    for entry in records:
        if isinstance(entry, str):
            content = entry.strip()
        else:
            content = (
                entry.get("content")
                or entry.get("metadata", {}).get("content")
                or ""
            ).strip()

        if not content or content in seen:
            continue

        seen.add(content)
        snippets.append(content)

    return "\n".join(snippets)


async def get_latest_financial_data(user_id: str):
    """Fetch latest comprehensive financial data from consolidated endpoint."""
    NODE_BASE = os.getenv("NODE_BACKEND_URL", "http://localhost:3000")
    AI_SECRET = os.getenv("AI_INTERNAL_SECRET")
    
    headers = {
        "Content-Type": "application/json",
        "x-internal-access": "true"
    }
    if AI_SECRET:
        headers["x-ai-secret"] = AI_SECRET
    
    # Pass userId as query param for internal access
    params = {"userId": user_id}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Fetch consolidated latest data endpoint
            response = await client.get(
                f"{NODE_BASE}/api/latest-data/latest",
                headers=headers,
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("data", {})
            else:
                print(f"⚠️ Latest data endpoint returned {response.status_code}")
                return {}
    except Exception as e:
        print(f"⚠️ Error fetching latest financial data: {e}")
        return {}


# Groq Client
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
GROQ_MODEL = "llama-3.3-70b-versatile"

# =========================
# SCHEMAS
# =========================

class MemoryRequest(BaseModel):
    id: str
    userId: str
    content: str
    type: Optional[str] = "general"
    metadata: Optional[Dict] = {}


class QueryRequest(BaseModel):
    userId: str
    query: str
    topK: Optional[int] = 5


class Input(BaseModel):
    amount: int
    description: str


class InsightRequest(BaseModel):
    userId: str
    transactionId: Optional[str] = None
    alert: Optional[Dict[str, Any]] = None
    stats: Optional[Dict[str, Any]] = None
    dataConfidence: Optional[str] = "low"
    goals: List[Dict[str, Any]] = []
    behaviorProfile: Dict[str, Any] = {}
    page: Optional[str] = "coach"
    recentTransactions: Optional[List[Dict[str, Any]]] = []  # For gig detection
    isGigWorker: Optional[bool] = False  # Gig worker flag from onboarding/transactions
    gigWorkerIndicators: Optional[List[str]] = []  # What indicates gig work
    


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    userId: str
    message: str
    chatHistory: List[ChatMessage] = []
    relevantMemories: List[Dict[str, Any]] = []
    behaviorProfile: Optional[Dict[str, Any]] = None
    isGigWorker: Optional[bool] = False # Gig worker flag from onboarding/transactions
    gigWorkerIndicators: Optional[List[str]] = [] # What indicates gig work

class AgentPlan(BaseModel):
    intent: str
    needs_confirmation: bool
    tool: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    response_to_user: str

class ExecuteRequest(BaseModel):
    userId: str
    plan: AgentPlan


# =========================
# ROUTES
# =========================

# --------------------------
# STORE MEMORY (CHROMA)
# --------------------------

@app.post("/store-memory")
async def store_memory(data: MemoryRequest):

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

    return {
        "status": "stored",
        "id": data.id,
        "vector_dim": len(vector)
    }
    
    # --------------------------
    # SERVICE HEADERS
    # --------------------------
    
    def service_headers():
        headers = {"Content-Type": "application/json"}
        if SERVICE_JWT:
            headers["Authorization"] = f"Bearer {SERVICE_JWT}"
        return headers





# --------------------------
# SEARCH MEMORY
# --------------------------

@app.post("/search-memory")
def search_memory(data: QueryRequest):
    matches = query_user_memories(
        user_id=data.userId,
        query=data.query,
        top_k=data.topK or 5,
    )
    return {"matches": matches}


# --------------------------
# VIEW ALL MEMORIES
# --------------------------

@app.get("/all-memories")
def view_all_memories():
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
    try:
        data = collection.get()
        return {"total": len(data["ids"])}
    except Exception as e:
        return {"error": str(e), "total": 0}


# --------------------------
# CLEAR VECTOR DB
# --------------------------

@app.delete("/clear-all")
def clear_all_memories():

    try:
        data = collection.get()
        
        if len(data["ids"]) == 0:
            return {"status": "already_empty", "deleted": 0}
        
        collection.delete(ids=data["ids"])
        
        return {
            "status": "success",
            "deleted": len(data["ids"]),
            "message": "All memories cleared"
        }
    except Exception as e:
        return {"error": str(e), "status": "failed"}


@app.delete("/clear-user/{user_id}")
def clear_user_memories(user_id: str):

    try:
        data = collection.get(where={"userId": user_id})
        
        if len(data["ids"]) == 0:
            return {
                "status": "not_found",
                "userId": user_id,
                "deleted": 0
            }
        
        collection.delete(ids=data["ids"])
        
        return {
            "status": "success",
            "userId": user_id,
            "deleted": len(data["ids"]),
            "message": f"Deleted all memories for user {user_id}"
        }
    except Exception as e:
        return {"error": str(e), "status": "failed"}


# --------------------------
# HEALTH CHECK
# --------------------------

@app.get("/")
def health():
    return { "status": "✅ Chroma Memory Server Running" }


# --------------------------
# CLASSIFY TRANSACTION
# --------------------------

@app.post("/classify")
async def classify(data: Input):

    print("📊 Transaction received:", data)

    result = await create_transaction(data.amount, data.description)

    return {"success": True, "data": result}


# --------------------------
# AI FINANCIAL INSIGHTS
# --------------------------
@app.post("/ai/insights")
async def generate_ai_insights(data: InsightRequest):

    user_id = data.userId
    alert = data.alert
    if not alert:
        return {"success": False, "error": "alert is required for transaction insights"}
        
    stats = data.stats or {}
    goals = data.goals or []
    page = (data.page or "coach").lower()
    
    # ============================================
    # 1. EXTEND SUPPORTED METADATA - Behavior Flags
    # ============================================
    alert_metadata = alert.get("metadata", {})
    behavior_flags = {
        "behaviorDrift": alert_metadata.get("behaviorDrift", False),
        "microLeak": alert_metadata.get("microLeak", False),
        "spendingBurst": alert_metadata.get("spendingBurst", False),
        "improvementTrend": alert_metadata.get("improvementTrend", False),
        "recovery": alert_metadata.get("recovery", False),
        "riskScore": alert_metadata.get("riskScore", 0),
        "positivityScore": alert_metadata.get("positivityScore", 0),
    }
    
    # ============================================
    # 2. MEANINGFULNESS FILTER
    # ============================================
    is_meaningful_alert = (
        alert.get("level") in ["CRITICAL", "HIGH", "POSITIVE"]
        or behavior_flags["behaviorDrift"]
        or behavior_flags["microLeak"]
        or behavior_flags["spendingBurst"]
        or behavior_flags["improvementTrend"]
        or behavior_flags["recovery"]
        or behavior_flags["riskScore"] >= 20
        or behavior_flags["positivityScore"] >= 25
    )

    if not is_meaningful_alert:
        return {
            "success": False,
            "skipped": True,
            "reason": "Alert not meaningful enough for AI insight generation",
            "level": alert.get("level"),
        }

    # ============================================
    # 3. FETCH LIVE DATA + CONTEXT
    # ============================================
    liveDataFetched = True
    latest_data = {}
    try:
        latest_data = await get_latest_financial_data(user_id)
        if not latest_data:
            liveDataFetched = False
    except Exception as fetch_err:
        liveDataFetched = False
        latest_data = {}
        print(f"⚠️ [AI Insights] Live data fetch failed: {fetch_err}")

    stats_source = latest_data.get("stats", {}) if isinstance(latest_data, dict) else {}
    if stats_source:
        stats = stats_source
    else:
        if not stats:
            stats = {}
        liveDataFetched = False

    goals_source = latest_data.get("goals", []) if isinstance(latest_data, dict) else []
    if goals_source:
        goals = goals_source

    raw_transactions = latest_data.get("recentTransactions", []) if isinstance(latest_data, dict) else []
    if not raw_transactions:
        liveDataFetched = False
        raw_transactions = data.recentTransactions or []

    previous_alerts_live = latest_data.get("activeAlerts", []) if isinstance(latest_data, dict) else []

    def parse_timestamp(value):
        if not value:
            return None
        if isinstance(value, (int, float)):
            try:
                ts = value / 1000 if value > 1e12 else value
                return datetime.utcfromtimestamp(ts)
            except Exception:
                return None
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return None
            try:
                if text.endswith("Z"):
                    text = text.replace("Z", "+00:00")
                return datetime.fromisoformat(text)
            except ValueError:
                try:
                    return datetime.utcfromtimestamp(float(text))
                except Exception:
                    return None
        return None

    def get_transaction_date(tx):
        if not isinstance(tx, dict):
            return None
        for key in ("occurredAt", "createdAt", "updatedAt", "date"):
            dt = parse_timestamp(tx.get(key))
            if dt:
                return dt
        return None

    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    tx_with_dates = []
    for tx in raw_transactions:
        tx_date = get_transaction_date(tx)
        if tx_date and tx_date >= thirty_days_ago:
            tx_with_dates.append((tx, tx_date))

    tx_with_dates.sort(key=lambda item: item[1], reverse=True)
    recent_transactions = [item[0] for item in tx_with_dates[:50]]
    recent_transactions_with_dates = tx_with_dates[:50]

    if not recent_transactions and raw_transactions:
        tx_with_dates = []
        for tx in raw_transactions[:50]:
            tx_date = get_transaction_date(tx)
            if tx_date:
                tx_with_dates.append((tx, tx_date))
        tx_with_dates.sort(key=lambda item: item[1], reverse=True)
        recent_transactions = [item[0] for item in tx_with_dates[:50]]
        recent_transactions_with_dates = tx_with_dates[:50]

    transactionFrequency = sum(
        1 for _, dt in recent_transactions_with_dates if dt >= seven_days_ago
    )

    if recent_transactions:
        category_counter = Counter(
            (tx.get("category") or "Other").strip() or "Other"
            for tx in recent_transactions
        )
        mostCommonCategory = category_counter.most_common(1)[0][0]
    else:
        mostCommonCategory = "data_insufficient"

    def as_number(value):
        if isinstance(value, (int, float)):
            return float(value)
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    monthly_income_value = as_number(stats.get("monthlyIncome"))
    monthly_expense_value = as_number(stats.get("monthlyExpense"))
    savings_rate_value = as_number(stats.get("savingsRate"))
    investment_rate_value = as_number(stats.get("investmentRate"))
    net_worth_value = as_number(stats.get("netWorth"))

    incomeSpentPercent = (
        round((monthly_expense_value / monthly_income_value) * 100)
        if monthly_income_value and monthly_income_value > 0 and monthly_expense_value is not None
        else None
    )

    def format_currency_value(value):
        return f"{value:,.0f}" if isinstance(value, (int, float)) else "data_insufficient"

    def format_percent_value(value):
        return f"{value:.0f}%" if isinstance(value, (int, float)) else "data_insufficient"

    monthly_income_display = format_currency_value(monthly_income_value)
    monthly_expense_display = format_currency_value(monthly_expense_value)
    net_worth_display = format_currency_value(net_worth_value)
    saving_percent_display = format_percent_value(savings_rate_value)
    investment_percent_display = format_percent_value(investment_rate_value)
    income_spent_percent_display = format_percent_value(incomeSpentPercent)
    transaction_frequency_display = (
        str(transactionFrequency) if recent_transactions_with_dates else "data_insufficient"
    )

    def parse_alert_date(alert_doc):
        if not isinstance(alert_doc, dict):
            return datetime.min
        for key in ("lastTriggeredAt", "updatedAt", "createdAt"):
            dt = parse_timestamp(alert_doc.get(key))
            if dt:
                return dt
        return datetime.min

    sorted_alerts = sorted(
        previous_alerts_live,
        key=parse_alert_date,
        reverse=True,
    )
    previous_alerts = sorted_alerts[:5]
    last_alert = previous_alerts[0] if previous_alerts else None
    lastAlertLevel = last_alert.get("level", "none") if last_alert else "none"
    lastAlertScope = last_alert.get("scope", "none") if last_alert else "none"

    print(
        f"\n🧠 Generating INSIGHT for User: {user_id} | Alert: {alert.get('id')} | "
        f"Level: {alert.get('level')} | Scope: {alert.get('scope')} | LiveDataFetched: {liveDataFetched}"
    )

    alert_scope = alert.get("scope", "overall")
    alert_context = json.dumps(alert, ensure_ascii=False)

    behavior_flag_map = {
        "microLeak": "hidden small repeated spending",
        "behaviorDrift": "your habits are shifting",
        "spendingBurst": "many transactions in a short time",
        "recovery": "correcting past risky behavior",
        "improvementTrend": "discipline strengthening",
        "goalImpact": "this directly affects your goal",
    }
    behavior_flag_hint = "none"
    for key in [
        "goalImpact",
        "microLeak",
        "behaviorDrift",
        "spendingBurst",
        "recovery",
        "improvementTrend",
    ]:
        if alert_metadata.get("behavioralFlags", {}).get(key) or behavior_flags.get(key):
            behavior_flag_hint = behavior_flag_map[key]
            break

    system_prompt = f"""
You are Fintastic AI — a professional financial behavior and pattern analysis engine.

STRICT NON-NEGOTIABLE RULES:

1. You are NOT the decision maker.
2. The alert + scope are FINAL. Never change or reinterpret them.
3. Never talk about topics outside the alert scope.
4. Never invent numbers, trends, or behavior.
5. If something is missing → say "data_insufficient".
6. Your response will be printed on a specific page, so it MUST MATCH THAT PAGE.

LIVE STATUS:
- Live data fetched: {liveDataFetched}

If liveDataFetched is false → treat confidence as LOW.

----------------------------------
ALERT DETAILS
----------------------------------
{alert_context}

----------------------------------
REAL LIVE STATS
----------------------------------
Monthly Income: ₹{monthly_income_display}
Monthly Expense: ₹{monthly_expense_display}
Savings Rate: {saving_percent_display}
Investment Rate: {investment_percent_display}
Net Worth: ₹{net_worth_display}

% Spent from Income: {income_spent_percent_display}

Top Category: {mostCommonCategory}
Recent Transactions: {transaction_frequency_display} in last 7 days

----------------------------------
PREVIOUS ALERT CONTEXT
----------------------------------
Last Alert Level: {lastAlertLevel}
Last Alert Scope: {lastAlertScope}

----------------------------------
ALERT SCOPES YOU WILL RECEIVE:
----------------------------------
income | expense | saving | investment | goal | overall

You MUST speak ONLY about the scope you receive.

----------------------------------
IF scope = "income"
----------------------------------
You MUST ONLY talk about:
- income sources
- income changes
- % income spent
- stability
- irregularity
- new streams
- consistency

You MUST use real % if exists.

You MUST use phrases like:
"New income pattern detected"
"Shift in your income stream"
"Your earning behavior shows..."
"Currently you are spending {income_spent_percent_display} of your income"

----------------------------------
IF scope = "expense"
----------------------------------
You MUST ONLY talk about:
- spending behavior
- overspending
- micro leaks
- impulse
- control
- transaction frequency
- categories

Use phrases like:
"Unusual spending detected"
"Repeated small spending"
"Overspending trend"
"You spent {income_spent_percent_display} of your income"

----------------------------------
IF scope = "saving"
----------------------------------
ONLY talk about:
- saving rate
- saving consistency
- discipline
- gaps

Use phrases like:
"Your saving rate is {saving_percent_display}"
"Saving momentum improving/slowing"

----------------------------------
IF scope = "investment"
----------------------------------
ONLY talk about:
- investment actions
- risk exposure
- consistency
- diversification

Use:
"Investment activity detected"
"Your investment rate is {investment_percent_display}"

----------------------------------
IF scope = "goal"
----------------------------------
ONLY talk about the specific goal:
- progress
- delay
- risk
- acceleration

----------------------------------
IF scope = "overall"
----------------------------------
This is the ONLY time you can speak broader.

----------------------------------
BEHAVIORAL FLAGS TRANSLATION
----------------------------------

microLeak → hidden small repeated spending  
behaviorDrift → your habits are shifting  
spendingBurst → many transactions in a short time  
recovery → correcting past risky behavior  
improvementTrend → discipline strengthening  
goalImpact → this directly affects your goal  

Never mention the actual flag names.

Behavioral Pattern Hint: {behavior_flag_hint}

----------------------------------
IMPORTANT UI FORMAT
----------------------------------

Your result will be displayed as:

"AI {alert_scope} is noticing: <ai_noticing>"

So ai_noticing MUST be SHORT, CLEAR and SCOPE-CORRECT.

----------------------------------
FINAL OUTPUT FORMAT (STRICT)
----------------------------------

Return ONLY valid JSON:

{{
  "title": "{alert.get('title')}",
  "ai_noticing": "",
  "positive": "",
  "improvement": "",
  "action": ""
}}

RULES:
- Use ₹ for money
- No emojis
- No markdown
- No extra text
- No bullet points
- Must be short
"""

    try:
        result = await client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": "Generate the JSON response now. Remember: no markdown, no extra text, only JSON.",
                },
            ],
        )

        raw_response = result.choices[0].message.content.strip()
        print("\n🧾 RAW AI RESPONSE:\n", raw_response)

        try:
            insight = json.loads(raw_response)
        except json.JSONDecodeError:
            first = raw_response.find("{")
            last = raw_response.rfind("}")
            if first != -1 and last != -1:
                insight = json.loads(raw_response[first : last + 1])
            else:
                raise ValueError("No JSON object found in response")

        for key in ["title", "ai_noticing", "positive", "improvement", "action"]:
            if key not in insight:
                raise ValueError(f"Missing key in insight: {key}")

        return {
            "success": True,
            "userId": user_id,
            "alertId": alert.get("id"),
            "page": page,
            "insight": insight,
        }

    except Exception as ai_error:
            error_type = type(ai_error).__name__
            error_msg = str(ai_error)
            
            # Handle Groq rate limit errors
            if "RateLimitError" in error_type or "429" in error_msg or "rate_limit" in error_msg.lower():
                print(f"⚠️ [AI Insights] Groq rate limit reached. Using fallback insight.")
                print(f"   Error: {error_msg[:200]}")
                
                # Return fallback insight based on alert data
                alert_level = alert.get("level", "MEDIUM")
                alert_scope = alert.get("scope", "overall")
                alert_title = alert.get("title", "Financial Alert")
                
                fallback_insight = {
                    "title": alert_title,
                    "ai_noticing": f"This {alert_level} alert in {alert_scope} requires attention. AI insights temporarily unavailable due to rate limits.",
                    "positive": "Continue tracking your transactions for better insights.",
                    "improvement": f"Review your {alert_scope} spending patterns and adjust as needed.",
                    "action": "Check your dashboard for detailed financial data and recommendations."
                }
                
                return {
                    "success": True,
                    "userId": user_id,
                    "alertId": alert.get("id"),
                    "page": page,
                    "insight": fallback_insight,
                    "fallback": True  # Flag to indicate this is a fallback response
                }
            
            # Re-raise other errors to be caught by outer try-except
            raise

    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        print(f"❌ Error in /ai/insights: {error_type}: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "error_type": error_type
        }


@app.post("/ai/chat")
async def ai_chat(data: ChatRequest):
    """
    Main agent brain:
    - Reads user message
    - Reads last chat
    - Reads Chroma memories
    - Decides BEST action
    - Returns PLAN only (no execution)
    """

    user_id = data.userId
    message = data.message.strip()
    is_gig_worker = data.isGigWorker or False
    gig_indicators = data.gigWorkerIndicators or []

    # ----------------------------
    # 0. DETECT IF USER NEEDS LIVE DATA OR MARKET DATA
    # ----------------------------
    live_data_trigger_keywords = [
        "how am i doing", "how am i", "current", "today", "this month", "now",
        "how much", "can i afford", "recent", "latest", "update", "progress",
        "where am i", "status", "report", "financial state", "my situation"
    ]
    
    market_investment_keywords = [
        "market", "stock", "invest", "sip", "mutual fund", "nifty", "sensex",
        "crash", "bullish", "bearish", "buy", "sell", "portfolio", "equity",
        "should i invest", "when to invest", "investment advice", "market trend",
        "share", "share value", "share price", "stock price", "current price",
        "zomato", "tata", "reliance", "infosys", "tcs", "hdfc", "icici"
    ]
    
    needs_live_data = any(keyword in message.lower() for keyword in live_data_trigger_keywords)
    needs_market_data = any(keyword in message.lower() for keyword in market_investment_keywords)
    live_data_context = ""
    market_context = ""
    user_context_for_market = {}
    
    if needs_live_data:
        print(f"🔄 Fetching live financial data for user: {user_id}")
        live_data = await get_latest_financial_data(user_id)
        
        # Format live data for AI context
        stats = live_data.get("stats", {})
        income = live_data.get("income", {})
        expenses = live_data.get("expenses", {})
        savings = live_data.get("savings", {})
        investments = live_data.get("investments", {})
        goals = live_data.get("goals", [])
        alerts = live_data.get("alerts", [])
        behavior = live_data.get("behaviorProfile", {})
        recent_tx = live_data.get("recentTransactions", [])
        
        # Detect gig income
        has_gig_income = False
        gig_income_total = 0
        gig_categories = ["freelance", "gig", "contractor", "self-employed", "consulting", "commission", "tips", "side hustle"]
        
        if recent_tx:
            for t in recent_tx:
                if t.get("type") == "income":
                    category = (t.get("category") or "").lower()
                    note = (t.get("note") or "").lower()
                    if any(indicator in category or indicator in note for indicator in gig_categories):
                        has_gig_income = True
                        gig_income_total += abs(t.get("amount", 0))
        
        gig_percentage = 0
        if has_gig_income and stats.get("monthlyIncome", 0) > 0:
            gig_percentage = (gig_income_total / stats.get("monthlyIncome", 1)) * 100
        
        live_data_context = f"""
FINANCIAL SNAPSHOT (LIVE DATA - HIGHEST PRIORITY)
--------------
STATS:
- Monthly Income: ₹{stats.get('monthlyIncome', 0)}
- Monthly Expense: ₹{stats.get('monthlyExpense', 0)}
- Savings Rate: {stats.get('savingsRate', 0)}%
- Investment Rate: {stats.get('investmentRate', 0)}%
- Net Worth: ₹{stats.get('netWorth', 0)}
- Liquid Savings: ₹{stats.get('liquidSavings', 0)}
- Invested Amount: ₹{stats.get('investedAmount', 0)}
- Expense Trend: {stats.get('expenseTrend', 'stable')}
- Income Trend: {stats.get('incomeTrend', 'stable')}

INCOME BREAKDOWN:
- Total This Period: ₹{income.get('total', 0)}
- Count: {income.get('count', 0)}
- By Category: {json.dumps(income.get('byCategory', {}), ensure_ascii=False)}
- Recent: {json.dumps(income.get('recent', [])[:3], ensure_ascii=False, default=str)}

EXPENSES BREAKDOWN:
- Total This Period: ₹{expenses.get('total', 0)}
- Count: {expenses.get('count', 0)}
- By Category: {json.dumps(expenses.get('byCategory', {}), ensure_ascii=False)}
- Recent: {json.dumps(expenses.get('recent', [])[:3], ensure_ascii=False, default=str)}

SAVINGS BREAKDOWN:
- Total: ₹{savings.get('total', 0)}
- Count: {savings.get('count', 0)}
- By Category: {json.dumps(savings.get('byCategory', {}), ensure_ascii=False)}

INVESTMENTS BREAKDOWN:
- Total: ₹{investments.get('total', 0)}
- Count: {investments.get('count', 0)}
- By Category: {json.dumps(investments.get('byCategory', {}), ensure_ascii=False)}

GOALS:
{json.dumps(goals, ensure_ascii=False, default=str)}

ACTIVE ALERTS:
{json.dumps(alerts[:5], ensure_ascii=False, default=str)}

BEHAVIOR PROFILE:
- Discipline: {behavior.get('disciplineScore', 50)}/100
- Impulse: {behavior.get('impulseScore', 50)}/100
- Consistency: {behavior.get('consistencyIndex', 50)}/100
- Risk Index: {behavior.get('riskIndex', 50)}/100
- Saving Streak: {behavior.get('savingStreak', 0)} days

RECENT TRANSACTIONS (Last 5):
{json.dumps(recent_tx[:5], ensure_ascii=False, default=str)}

{"⚠️ GIG ECONOMY INCOME DETECTED:" + f"\n- Gig income: ₹{gig_income_total:,.0f} ({gig_percentage:.1f}% of total)" + "\n- Income irregularity is a RISK factor" + "\n- Recommend larger emergency fund (6 months)" + "\n- More conservative spending limits needed" + "\n- Account for income variability in all advice" if has_gig_income else ""}

CRITICAL: This LIVE DATA is the source of truth. Use these exact numbers.
If any conflict occurs between live data and memory, LIVE DATA always wins.
"""
        
        # Prepare user context for market tools
        user_context_for_market = {
            "userId": user_id,
            "monthlyIncome": stats.get('monthlyIncome', 0),
            "monthlyExpense": stats.get('monthlyExpense', 0),
            "savingsRate": stats.get('savingsRate', 0),
            "liquidSavings": stats.get('liquidSavings', 0),
            "investedAmount": stats.get('investedAmount', 0),
            "riskIndex": behavior.get('riskIndex', 50),
            "disciplineScore": behavior.get('disciplineScore', 50),
            "impulseScore": behavior.get('impulseScore', 50),
            "consistencyIndex": behavior.get('consistencyIndex', 50),
            "isGigWorker": is_gig_worker or has_gig_income,
            "incomeStability": "unstable" if (is_gig_worker or has_gig_income) else "stable",
            "goals": goals
        }
    
    # If market/investment question but no live data fetched, fetch it now
    if needs_market_data and not needs_live_data:
        print(f"🔄 Fetching live financial data for market analysis: {user_id}")
        live_data = await get_latest_financial_data(user_id)
        stats = live_data.get("stats", {})
        behavior = live_data.get("behaviorProfile", {})
        goals = live_data.get("goals", [])
        user_context_for_market = {
            "userId": user_id,
            "monthlyIncome": stats.get('monthlyIncome', 0),
            "monthlyExpense": stats.get('monthlyExpense', 0),
            "savingsRate": stats.get('savingsRate', 0),
            "liquidSavings": stats.get('liquidSavings', 0),
            "investedAmount": stats.get('investedAmount', 0),
            "riskIndex": behavior.get('riskIndex', 50),
            "disciplineScore": behavior.get('disciplineScore', 50),
            "impulseScore": behavior.get('impulseScore', 50),
            "consistencyIndex": behavior.get('consistencyIndex', 50),
            "isGigWorker": is_gig_worker,
            "incomeStability": "unstable" if is_gig_worker else "stable",
            "goals": goals
        }
    
    # ----------------------------
    # 0.5. FETCH MARKET DATA IF NEEDED
    # ----------------------------
    if needs_market_data and user_context_for_market:
        print(f"📈 Fetching market data for user: {user_id}")
        try:
            # Get market overview
            market_overview_data = await market_overview(user_context_for_market)
            market_context = f"""
LIVE MARKET DATA (HIGHEST PRIORITY FOR INVESTMENT QUESTIONS)
--------------
Market Trend: {market_overview_data.get('trend', 'unknown')}
Global Sentiment: {market_overview_data.get('global_sentiment', 'unknown')}
Nifty: {market_overview_data.get('nifty', 'N/A')}
Sensex: {market_overview_data.get('sensex', 'N/A')}
VIX: {market_overview_data.get('vix', 'N/A')}

Top Market News:
{chr(10).join(f"- {news[:200]}" for news in market_overview_data.get('top_news', [])[:3])}

Sector Trends: {json.dumps(market_overview_data.get('sector_trends', {}), ensure_ascii=False)}
"""
            
            # Get crash risk
            crash_risk_data = await crash_risk_detector(user_context_for_market, market_overview_data)
            market_context += f"""

CRASH RISK ASSESSMENT:
- Probability: {crash_risk_data.get('crash_probability_percent', 0)}%
- Severity: {crash_risk_data.get('severity', 'low')}
- Recommended Action: {crash_risk_data.get('recommended_user_action', 'N/A')}
"""
            
            # Get investment signal
            investment_signal_data = await investment_signal_engine(user_context_for_market, market_overview_data)
            market_context += f"""

INVESTMENT SIGNAL:
- Signal: {investment_signal_data.get('signal', 'HOLD')}
- Asset Type: {investment_signal_data.get('asset_type', 'unknown')}
- Recommended Amount: ₹{investment_signal_data.get('recommended_amount', 0)}
- Justification: {investment_signal_data.get('justification', 'N/A')}
"""
            
            # Get SIP forecast if user asks about SIP
            if "sip" in message.lower():
                sip_forecast_data = await sip_forecast(user_context_for_market, market_overview_data)
                market_context += f"""

SIP FORECAST:
- Recommended SIP Amount: ₹{sip_forecast_data.get('recommended_sip_amount', 0)}
- Suggested Funds: {', '.join(sip_forecast_data.get('suggested_funds', []))}
- Ideal Execution Day: {sip_forecast_data.get('ideal_execution_day_range', 'N/A')}
- Risk Notes: {', '.join(sip_forecast_data.get('risk_adjustment_notes', []))}
"""
            
            # Store market intelligence in ChromaDB
            intelligence_content = f"""
MARKET INTELLIGENCE - {datetime.now().strftime("%Y-%m-%d %H:%M")}

Market Trend: {market_overview_data.get('trend')}
Global Sentiment: {market_overview_data.get('global_sentiment')}
Crash Risk: {crash_risk_data.get('crash_probability_percent')}% ({crash_risk_data.get('severity')})
Investment Signal: {investment_signal_data.get('signal')} - {investment_signal_data.get('asset_type')}

User Context:
- Risk Index: {user_context_for_market.get('riskIndex')}
- Monthly Income: ₹{user_context_for_market.get('monthlyIncome')}
- Savings Rate: {user_context_for_market.get('savingsRate')}%
- Gig Worker: {user_context_for_market.get('isGigWorker')}
            """.strip()
            
            store_memory_entry(
                user_id=user_id,
                content=intelligence_content,
                mem_type="market_intelligence",
                metadata={
                    "marketTrend": market_overview_data.get('trend'),
                    "crashProbability": crash_risk_data.get('crash_probability_percent'),
                    "severity": crash_risk_data.get('severity'),
                    "investmentSignal": investment_signal_data.get('signal'),
                    "userRiskIndex": user_context_for_market.get('riskIndex'),
                    "date": datetime.now().isoformat(),
                    "source": "market_analysis"
                }
            )
            print(f"📊 Market intelligence stored for user {user_id}")
            
        except Exception as e:
            print(f"⚠️ Market data fetch error: {e}")
            market_context = "Market data temporarily unavailable. Please try again later."

    # ----------------------------
    # 1. FETCH FRESH STATS
    # ----------------------------
    fresh_stats = get_user_stats_tool(user_id)
    stats_context = ""
    goals_context = ""
    
    if fresh_stats:
        invested_amount = fresh_stats.get('investedAmount', 0) or 0
        investment_rate = fresh_stats.get('investmentRate', 0) or 0
        monthly_income = fresh_stats.get('monthlyIncome', 0) or 0
        net_worth = fresh_stats.get('netWorth', 0) or 0
        
        # Always show invested amount clearly - even if 0
        if invested_amount > 0:
            investment_info = f"Total Invested Amount: ₹{invested_amount} | Investment Rate: {investment_rate}% (of monthly income)"
        else:
            investment_info = "Total Invested Amount: ₹0 | Investment Rate: 0%"
        
        stats_context = (
            f"Monthly Income: ₹{fresh_stats.get('monthlyIncome', 0)}\n"
            f"Monthly Expense: ₹{fresh_stats.get('monthlyExpense', 0)}\n"
            f"Savings Rate: {fresh_stats.get('savingsRate', 0)}%\n"
            f"{investment_info}\n"
            f"Net Worth: ₹{net_worth}\n"
            f"Liquid Savings: ₹{fresh_stats.get('liquidSavings', 0)}\n"
        )
        
        # Get goals information for motivational messages
        goal_stats = fresh_stats.get('goalStats', [])
        if goal_stats and len(goal_stats) > 0:
            active_goals = [g for g in goal_stats if g.get('status') != 'completed' and (g.get('targetAmount', 0) - g.get('currentAmount', 0)) > 0]
            if active_goals:
                goals_list = []
                for goal in active_goals[:5]:  # Show top 5 active goals
                    remaining = goal.get('targetAmount', 0) - goal.get('currentAmount', 0)
                    progress = goal.get('progress', 0)
                    deadline = goal.get('deadline')
                    goals_list.append(
                        f"Goal: {goal.get('name', 'Unknown')} | "
                        f"Current: ₹{goal.get('currentAmount', 0)} | "
                        f"Target: ₹{goal.get('targetAmount', 0)} | "
                        f"Remaining: ₹{remaining} | "
                        f"Progress: {progress}%"
                        + (f" | Deadline: {deadline}" if deadline else "")
                    )
                goals_context = "\n".join(goals_list)

    # ----------------------------
    # 2. BEHAVIOR PROFILE CONTEXT
    # ----------------------------
    behavior_meta = build_behavior_context(data.behaviorProfile)
    behavior_context = behavior_meta["text"]

    # ----------------------------
    # 3. MEMORY CONTEXT
    # ----------------------------
    memory_context = merge_and_clean_memories(data.relevantMemories[:8])

    # ----------------------------
    # 4. CHAT CONTEXT
    # ----------------------------
    history_text = "\n".join(
        [f"{m.role}: {m.content}" for m in data.chatHistory[-6:]]
    )

    # ----------------------------
    # 5. STRONG SYSTEM PROMPT
    # ----------------------------
    system_prompt = f"""
You are Fintastic AI – a REAL-TIME, MARKET-AWARE financial intelligence engine and personal financial guardian.

YOU ARE NOT A GENERIC STOCK BOT.
YOU are a FULL CONTEXT financial guardian that combines USER CONTEXT with MARKET DATA.

====================================================
DATA PRIORITY ORDER (STRICT)
====================================================

You MUST ALWAYS use this EXACT priority order:

1. LIVE USER DATA (stats, goals, alerts, behavior) - HIGHEST PRIORITY
2. LIVE MARKET DATA (Tavily + market analysis) - HIGH PRIORITY FOR INVESTMENT QUESTIONS
3. Memory context (Chroma) - REFERENCE ONLY
4. Chat history - CONTEXT ONLY

CRITICAL RULES:
- If LIVE USER DATA and LIVE MARKET DATA exist → use them even if memory says otherwise
- Never contradict live data
- Never guess numbers
- If something is missing → say "Not enough data to give safe advice"
- Always adapt advice to:
  * Risk Index
  * Income stability (gig vs fixed)
  * Goal urgency
  * Spending discipline

{live_data_context}

{market_context}

CURRENT FINANCIAL STATS
--------------
{stats_context or "data_insufficient"}

GOALS SNAPSHOT
--------------
{goals_context or "No active goals right now."}

MEMORY CONTEXT
--------------
{memory_context if memory_context else "No memory yet"}

{behavior_context}

RECENT CHAT
--------------
{history_text if history_text else "No previous chat"}

CRITICAL: Always use the LIVE DATA (if present) or CURRENT FINANCIAL STATS above for accurate information. 
If memory contains outdated stats, trust the LIVE DATA or CURRENT FINANCIAL STATS section instead.

{"⚠️⚠️⚠️ MARKET DATA AVAILABLE ⚠️⚠️⚠️" + "\nThe system has fetched LIVE MARKET DATA above. You MUST use this data when answering investment/market questions." + "\n- Use market trend and sentiment to inform recommendations" + "\n- Consider crash risk when advising investments" + "\n- Use investment signals to guide buy/hold/wait decisions" + "\n- Adapt SIP recommendations based on market conditions" if market_context else ""}

WHEN MENTIONING INVESTMENTS:
- If "Total Invested Amount" shows ₹X (where X > 0), ALWAYS say "You have ₹X invested" or "Your current investments total ₹X"
- NEVER say "no current investments" or "₹0 invested" if the stats show an invested amount > 0
- The "Investment Rate" shows what percentage of monthly income is invested
- Use the EXACT numbers from CURRENT FINANCIAL STATS, never from memory

You are NOT just a chatbot.
You are a DECISION ENGINE for personal finance.

---------------------------------------
AVAILABLE TOOLS
---------------------------------------

1. add_transaction
   → whenever user says: "I spent", "I earned", "add", "paid", "bought", etc
   REQUIRED: type, category, amount
   SET needs_confirmation = true

2. update_transaction
   → whenever user says: "change", "edit", "update" a transaction
   SET needs_confirmation = true

3. delete_transaction
   → whenever user says: "remove", "delete" a transaction
   SET needs_confirmation = true

4. get_transactions
   → whenever user asks: "show expenses", "show income", "my transactions"

5. market_data
   → whenever user asks ABOUT A STOCK / COMPANY / SHARE / SHARE PRICE / SHARE VALUE:
     "Should I buy Zomato?"
     "Is Tata good?"
     "Best stock for me?"
     "What is Zomato share price?"
     "Zomato share value"
     "Current price of [company]"
     "[Company] stock price"
     "zomato share value" (any variation)
   REQUIRED params: 
     - symbol: the company/stock name (e.g., "Zomato", "Tata", "Reliance")
     - userMessage: the original user message (for detecting price vs advice queries)
   You must personalize using:
     - user goals
     - user risk level
     - user income & dependents
   
   NOTE: For general market/investment questions, the system has already fetched:
   - market_overview (trend, sentiment, news)
   - crash_risk_detector (crash probability, severity)
   - investment_signal_engine (BUY/HOLD/WAIT/REDUCE_RISK signals)
   - sip_forecast (if SIP-related)
   Use this data in your response!
   
   CRITICAL: 
   - If user asks about a specific stock price/value (e.g., "zomato share value"), you MUST call market_data tool with symbol parameter.
   - The tool will return actual Tavily search results - include these in your response_to_user.
   - For price queries, show the actual search results from Tavily.
   - For investment advice queries, analyze the search results and provide recommendation.

6. sip_recommender
   → whenever user asks:
     "Which SIP should I start?"
     "How to invest monthly?"

7. insurance_matcher
   → whenever user asks:
     "Do I need insurance?"
     "Best life insurance?"

8. create_goal
   → whenever user says: "add goal", "create goal", "set goal", "new goal", "I want to save for X", "save for [something]"
   REQUIRED: name, targetAmount, deadline, priority
   SET needs_confirmation = true
   
   CRITICAL RULES:
   - NEVER call create_goal tool until you have ALL required information: name, targetAmount, deadline, priority
   - If user says "add goal" or "create goal" without complete details, you MUST ask for ALL missing information:
     * "What would you like to save for?" (name)
     * "What's your target amount?" (targetAmount in ₹)
     * "What's your deadline?" (deadline - date or "in X months")
     * "Is this a must_have or good_to_have goal?" (priority: must_have | good_to_have)
   - Extract information from user message when possible:
     * name: "save for laptop" → name: "laptop"
     * targetAmount: "₹50000" or "50000" → targetAmount: 50000
     * deadline: "by December 2024" or "in 6 months" → deadline: "2024-12-31" (convert to ISO date)
     * priority: "must have" → priority: "must_have", "good to have" → priority: "good_to_have"
   - Only call the tool when you have ALL 4 pieces of information
   - In the confirmation message, show ALL details: "Creating goal: [name], Target: ₹[targetAmount], Deadline: [deadline], Priority: [priority]"

9. general_chat
   → for explanation, advice, planning, education

10. get_latest_financial_data
   → whenever user asks about:
     - current financial state
     - today, this month, now
     - how much, can I afford
     - how am I doing
     - recent, latest, update, progress
     - where am I overspending
     - how much can I invest
   → This tool fetches LIVE data from backend (dashboard, income, goals, alerts)
   → You MUST use the returned data to answer with real numbers
   → This data is automatically fetched when keywords are detected, but you can reference it in your response

---------------------------------------
STRICT RULES
---------------------------------------

0. For CURRENT FINANCIAL STATE questions:
   → If user asks "how am I doing", "can I afford X", "current status", "today's report", etc.
   → The system has already fetched LIVE DATA (see FINANCIAL SNAPSHOT section above)
   → You MUST use that LIVE DATA to answer with exact numbers
   → Example: "Based on your remaining ₹14,460 budget and low savings buffer, I advise..."
   → Never guess or use outdated memory when LIVE DATA is available

1. For INVESTMENT / MARKET / STOCK / CRYPTO questions:
   → The system has ALREADY fetched LIVE MARKET DATA (see MARKET DATA section above)
   → You MUST use this market data to answer:
     * Use market trend (bullish/bearish/volatile) to inform recommendations
     * Use crash risk probability and severity to warn users
     * Use investment signal (BUY/HOLD/WAIT/REDUCE_RISK) to guide advice
     * Use SIP forecast if user asks about SIP
   → ALWAYS combine market data with user context:
     * Low risk users → more conservative recommendations
     * Gig workers → extra safety margins
     * High impulse users → smaller recommended amounts
   → Never answer investment questions only from memory
   → If market data is missing → say "Not enough market data to give safe advice"

2. For SIP / MUTUAL FUNDS:
   → Use tool = "sip_recommender"

3. For INSURANCE:
   → Use tool = "insurance_matcher"

4. For GOAL CREATION:
   → Use tool = "create_goal"
   → REQUIRED fields: name (category), targetAmount, deadline, priority (must_have | good_to_have)
   → If user says "add goal" without complete details, ask for ALL missing information in ONE message:
     * "What would you like to save for?" (name/category - e.g., "laptop", "vacation")
     * "What's your target amount?" (targetAmount in ₹)
     * "What's your deadline?" (deadline - e.g., "December 2024" or "in 6 months")
     * "Is this a must_have or good_to_have goal?" (priority)
   → Only call the tool when you have ALL 4 pieces of information
   → In confirmation, show: "Creating goal: [name], Target: ₹[targetAmount], Deadline: [deadline], Priority: [priority]"

5. For SAVING/INVESTMENT transactions that contribute to goals:
   → When user adds saving/investment, check ACTIVE GOALS section
   → If transaction will contribute to a goal, show motivational message:
     * "This will contribute ₹X to your goal: [goal name]"
     * "Current progress: ₹Y / ₹Z ([progress]%)"
     * "After this, you'll be at ₹(Y+X) / ₹Z ([new_progress]%)"
     * "Remaining: ₹(Z-Y-X) to reach your goal"
     * If deadline exists: "Deadline: [deadline] - you're on track!" or "Deadline: [deadline] - keep going!"
   → Motivate the user by showing how much closer they'll be

5. For ANY DB CHANGE:
   needs_confirmation = true

6. For pure talk / planning:
   needs_confirmation = false

7. When generating confirmation messages for SAVING/INVESTMENT transactions:
   - Check ACTIVE GOALS section to see if transaction will contribute to a goal
   - If a goal matches the transaction category, show motivational message:
     * "This will contribute ₹X to your goal: [goal name]"
     * "Current progress: ₹Y / ₹Z ([progress]%)"
     * "After this contribution, you'll be at ₹(Y+X) / ₹Z ([new_progress]%)"
     * "Remaining: ₹(Z-Y-X) to reach your goal"
     * If deadline exists: "Deadline: [deadline] - you're making great progress!" or "Deadline: [deadline] - keep going!"
   - Motivate the user by showing how much closer they'll be to their goal
   - Use exact numbers from ACTIVE GOALS section

8. When generating confirmation messages or mentioning investments:
   - CRITICAL: Check "Total Invested Amount" in CURRENT FINANCIAL STATS
   - If "Total Invested Amount: ₹X" where X > 0, you MUST say "You have ₹X invested" or "Your current investments total ₹X"
   - NEVER say "no current investments", "₹0 invested", or "you have no invested amount" if stats show investedAmount > 0
   - Investment Rate shows what % of monthly income is invested (investedAmount / monthlyIncome * 100)
   - ALWAYS use the EXACT numbers from CURRENT FINANCIAL STATS section, never from memory or assumptions
   - Example: If stats show "Total Invested Amount: ₹160500", say "You have ₹160500 invested currently"

---------------------------------------
RETURN JSON ONLY

Format:

{{
  "intent": "...",
  "needs_confirmation": true | false,
  "tool": "add_transaction | update_transaction | delete_transaction | get_transactions | market_data | sip_recommender | insurance_matcher | create_goal | tavily_search | null",
  "params": {{
    ...
  }},
  "response_to_user": "Message for user"
}}

---------------------------------------
Now deeply understand USER's question and decide BEST action.

Be specific.
Be confident.
Be personalized.
"""
    # ----------------------------
    # 4. CALL GROQ
    # ----------------------------
    try:
        result = await client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ]
        )

        raw = result.choices[0].message.content.strip()
        plan_dict = json.loads(raw)

        # Optional safety fallback
        if 'intent' not in plan_dict:
            return {
                "success": False,
                "error": "Invalid AI response",
                "raw": raw
            }

        return {
            "success": True,
            "plan": plan_dict
        }

    except Exception as e:
        print("ai_chat error:", e)
        return {
            "success": False,
            "error": str(e)
        }



@app.post("/ai/execute")
async def ai_execute(data: ExecuteRequest):
    """
    Execute a previously planned action AFTER user confirmation (or auto).
    Called by Node when CONFIRM is given OR needs_confirmation = false.
    """
    print("⚙️ /ai/execute CALLED")
    print("⚙️ Request data:", data)
    print("⚙️ TOOL:", data.plan.tool if data.plan else "NO PLAN")
    print("⚙️ PARAMS:", data.plan.params if data.plan else "NO PARAMS")
    print("⚙️ USER_ID:", data.userId)

    user_id = data.userId
    plan: AgentPlan = data.plan

    tool = plan.tool
    params = plan.params or {}

    print("⚙️ Extracted tool:", tool)
    print("⚙️ Extracted params:", params)

    result = None
    reflection = ""

    try:

        # ===========================
        # TRANSACTIONS
        # ===========================

        if tool == "add_transaction":
            print("🧰 CALLING add_transaction_tool FROM /ai/execute")
            print("🧰 Arguments:")
            print(f"  - user_id: {user_id}")
            print(f"  - tx_type: {params.get('type', 'expense')}")
            print(f"  - category: {params.get('category', 'Other')}")
            print(f"  - amount: {float(params.get('amount', 0))}")
            print(f"  - note: {params.get('note', '')}")
            
            result = add_transaction_tool(
                user_id=user_id,
                tx_type=params.get("type", "expense"),
                category=params.get("category", "Other"),
                amount=float(params.get("amount", 0)),
                note=params.get("note", "")
            )
            
            print("✅ add_transaction_tool RESULT:", result)

            # Check if goal was updated and include in reflection
            goal_info = result.get("goal") if isinstance(result, dict) else None
            if goal_info and params.get("type") in ["saving", "investment"]:
                goal_name = goal_info.get("goalName", "goal")
                contribution = goal_info.get("contributionAmount", 0)
                current = goal_info.get("currentAmount", 0)
                target = goal_info.get("targetAmount", 0)
                progress = goal_info.get("progress", 0)
                remaining = goal_info.get("remaining", target - current)
                deadline = goal_info.get("deadline")
                
                deadline_text = f" Deadline: {deadline}" if deadline else ""
                reflection = (
                    f"User added a {params.get('type')} transaction "
                    f"of ₹{params.get('amount')} in {params.get('category')}. "
                    f"This contributed ₹{contribution} to goal '{goal_name}'. "
                    f"Progress: ₹{current}/{target} ({progress}%). "
                    f"Remaining: ₹{remaining}.{deadline_text}"
                )
            else:
                reflection = (
                    f"User added a {params.get('type')} transaction "
                    f"of ₹{params.get('amount')} in {params.get('category')}."
                )

        elif tool == "update_transaction":
            transaction_id = params.get("transactionId")
            if not transaction_id or transaction_id == "None":
                return {"success": False, "error": "transactionId is required for update_transaction"}
            
            result = update_transaction_tool(
                user_id=user_id,
                transaction_id=transaction_id,
                fields=params.get("fields", {})
            )

            reflection = (
                f"User updated transaction {transaction_id} "
                f"with {params.get('fields')}."
            )

        elif tool == "delete_transaction":
            transaction_id = params.get("transactionId")
            if not transaction_id or transaction_id == "None":
                return {"success": False, "error": "transactionId is required for delete_transaction"}
            
            result = delete_transaction_tool(
                user_id=user_id,
                transaction_id=transaction_id
            )

            reflection = f"User deleted transaction {transaction_id}."

        elif tool == "get_transactions":
            result = get_transactions_tool(
                user_id=user_id,
                filters=params.get("filters", {})
            )

            reflection = "User requested transaction overview."


        # ===========================
        # WEB SEARCH
        # ===========================

        elif tool == "tavily_search":
            answer = tavily_search(params.get("query", ""))
            result = {"answer": answer}

            reflection = f"User asked a web question: {params.get('query')}."


        # ===========================
        # MARKET INTELLIGENCE
        # ===========================

        elif tool == "market_data":
            # Handle both symbol and investment_type parameters
            symbol = params.get("symbol") or params.get("investment_type") or "shares"
            
            # If it's a generic investment type like "shares", use a generic query
            if symbol.lower() in ["shares", "stocks", "equity"]:
                symbol = "Indian stock market"
            
            print(f"📊 Fetching market data for: {symbol}")
            raw_info = get_stock_market_data(symbol)
            print(f"📊 Market data retrieved: {len(raw_info)} characters")
            
            # Check if user is asking for price/value (simple query) or investment advice
            user_message = params.get("userMessage", "").lower() if params.get("userMessage") else ""
            is_price_query = any(word in user_message for word in ["price", "value", "current", "what is", "how much", "share value", "stock price", "zomato", "tata"])
            
            if is_price_query:
                # For price queries, extract concise price info using LLM
                price_extraction_prompt = f"""
You are a financial data extractor. Extract ONLY the current stock price information from the search results below.

SEARCH RESULTS:
{raw_info}

Return ONLY JSON with this EXACT format:
{{
  "symbol": "{symbol}",
  "current_price": "Extract the current/latest price (e.g., ₹302.75 or 'Not available')",
  "price_date": "Extract the date (e.g., '27 Nov 2025' or 'Not available')",
  "day_change": "Extract day change if available (e.g., '+2.5%' or 'Not available')",
  "market": "NSE or BSE or both",
  "brief_summary": "One sentence summary (max 20 words) about the stock's recent performance"
}}

CRITICAL: Be concise. Extract only factual price data. No analysis, no recommendations.
"""
                
                try:
                    llm_result = await client.chat.completions.create(
                        model=GROQ_MODEL,
                        temperature=0.1,
                        response_format={"type": "json_object"},
                        messages=[
                            {"role": "system", "content": price_extraction_prompt},
                            {"role": "user", "content": "Extract the price information now."}
                        ],
                    )
                    
                    price_info = json.loads(llm_result.choices[0].message.content.strip())
                    result = {
                        "symbol": symbol,
                        "price_info": price_info,
                        "source": "Tavily Search",
                        "type": "price_query"
                    }
                    reflection = f"User asked about {symbol} share price. Current price: {price_info.get('current_price', 'N/A')}"
                except Exception as e:
                    print(f"⚠️ Error extracting price: {e}")
                    # Fallback: return simplified message
                    result = {
                        "symbol": symbol,
                        "price_info": {
                            "current_price": "Unable to extract price",
                            "brief_summary": "Please check NSE/BSE websites for current price"
                        },
                        "source": "Tavily Search",
                        "type": "price_query"
                    }
                    reflection = f"User asked about {symbol} share price (extraction failed)."
            else:
                # For investment advice queries, analyze and provide recommendation
                decision_prompt = f"""
You are a concise financial advisor. Analyze the stock and provide brief, focused advice.

USER PROFILE:
Risk Level: {params.get("riskLevel", "medium")}
Investment Horizon: {params.get("investmentHorizon", "long-term")}
Goals: {params.get("goalNames", "wealth building")}

MARKET DATA:
{raw_info[:1000]}

CRITICAL: Keep your response CONCISE. Extract key facts only.

Return ONLY JSON:

{{
  "symbol": "{symbol}",
  "current_price_info": "Brief price info (1 line)",
  "decision": "BUY | HOLD | AVOID",
  "confidence": "low | medium | high",
  "reason": "2-3 sentences max explaining your decision",
  "risk_to_goals": "1-2 sentences on goal impact",
  "suggested_allocation_range": "Recommended amount (e.g., ₹5,000-10,000 or 5-10% of savings)"
}}
"""

                try:
                    llm_result = await client.chat.completions.create(
                        model=GROQ_MODEL,
                        temperature=0.2,
                        response_format={"type": "json_object"},
                        messages=[
                            {"role": "system", "content": decision_prompt},
                            {"role": "user", "content": "Analyse this stock for the user based on the market data."}
                        ],
                    )

                    decision = json.loads(llm_result.choices[0].message.content.strip())
                    # Don't include raw market data - keep response concise
                    decision["source"] = "Market Analysis"
                    decision["type"] = "investment_advice"
                    result = decision
                    reflection = f"User asked for investment advice on {symbol}. Analyzed market data from Tavily."
                except Exception as e:
                    print(f"⚠️ Error analyzing stock: {e}")
                    # Fallback: return simple message without raw data
                    result = {
                        "symbol": symbol,
                        "current_price_info": "Unable to fetch price",
                        "decision": "HOLD",
                        "confidence": "low",
                        "reason": "Analysis temporarily unavailable. Please check financial websites for current data.",
                        "source": "Fallback",
                        "type": "investment_advice"
                    }
                    reflection = f"User asked about {symbol}. Analysis failed, returned fallback."
            
            # Store memory
            store_memory_entry(
                user_id=user_id,
                content=reflection,
                mem_type="decision_history",
                metadata={"symbol": symbol, "kind": "stock", "source": "ai", "result_type": result.get("type", "unknown")}
            )


        # ===========================
        # SIP SUGGESTION
        # ===========================

        elif tool == "sip_recommender":

            risk = params.get("riskLevel", "medium")
            monthly_amount = float(params.get("monthlyAmount", 3000))
            goal = params.get("goalName", "wealth creation")

            raw_info = get_sip_ideas(risk, monthly_amount, goal)

            prompt = f"""
You are an Indian mutual fund advisor.

USER:
Risk: {risk}
Monthly SIP: ₹{monthly_amount}
Goal: {goal}

WEB DATA:
{raw_info}

Return ONLY JSON:

{{
  "goal": "{goal}",
  "monthlyAmount": {monthly_amount},
  "recommendations": [
    {{
      "name": "",
      "category": "",
      "risk": "low | medium | high",
      "reason": ""
    }}
  ]
}}
"""

            llm_result = await client.chat.completions.create(
                model=GROQ_MODEL,
                temperature=0.3,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": "Generate SIP recommendations."}
                ],
            )

            decision = json.loads(llm_result.choices[0].message.content.strip())
            result = decision

            reflection = (
                f"SIP suggestions for goal {goal}, amount ₹{monthly_amount}. "
                f"Funds: {[r['name'] for r in decision['recommendations']]}"
            )

            store_memory_entry(
                user_id=user_id,
                content=reflection,
                mem_type="decision_history",
                metadata={"kind": "sip", "goal": goal, "source": "ai"}
            )


        # ===========================
        # INSURANCE MATCHING
        # ===========================

        elif tool == "insurance_matcher":

            age = int(params.get("age", 25))
            dependents = int(params.get("dependents", 0))
            income = float(params.get("income", 0))

            raw_info = get_insurance_ideas(age, dependents, income)

            prompt = f"""
You are an Indian insurance advisor.

USER:
Age: {age}
Dependents: {dependents}
Monthly income: ₹{income}

WEB DATA:
{raw_info}

Return ONLY JSON:

{{
  "term_insurance": {{
    "recommended_cover": "",
    "recommended_term_years": 0,
    "reason": ""
  }},
  "health_insurance": {{
    "recommended_cover": "",
    "reason": ""
  }},
  "suggested_providers": []
}}
"""

            llm_result = await client.chat.completions.create(
                model=GROQ_MODEL,
                temperature=0.3,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": "Generate insurance recommendations."}
                ],
            )

            decision = json.loads(llm_result.choices[0].message.content.strip())
            result = decision

            reflection = (
                f"Insurance advice: Term cover {decision['term_insurance']['recommended_cover']}, "
                f"Health cover {decision['health_insurance']['recommended_cover']} | "
                f"Providers: {decision['suggested_providers']}"
            )

            store_memory_entry(
                user_id=user_id,
                content=reflection,
                mem_type="decision_history",
                metadata={"kind": "insurance", "source": "ai"}
            )

        # ===========================
        # GOAL CREATION
        # ===========================

        elif tool == "create_goal":
            name = params.get("name", "").strip()
            target_amount = params.get("targetAmount")
            deadline = params.get("deadline")
            priority = params.get("priority", "good_to_have")
            
            # Validate all required fields
            if not name:
                return {
                    "success": False,
                    "error": "Goal name is required"
                }
            
            try:
                target_amount = float(target_amount) if target_amount else 0
            except (ValueError, TypeError):
                return {
                    "success": False,
                    "error": "Invalid targetAmount. Must be a number."
                }
            
            if target_amount <= 0:
                return {
                    "success": False,
                    "error": "targetAmount must be greater than 0"
                }
            
            # Validate priority
            if priority not in ["must_have", "good_to_have"]:
                priority = "good_to_have"
            
            result = create_goal_tool(
                user_id=user_id,
                name=name,
                target_amount=target_amount,
                deadline=deadline,
                priority=priority
            )
            
            reflection = (
                f"User created a new goal: {name} with target ₹{target_amount}. "
                f"Priority: {priority}" + (f", Deadline: {deadline}" if deadline else "")
            )

        else:
            return {"success": False, "error": f"Unknown tool: {tool}"}

        # ===========================
        # GENERIC CHAT BEHAVIOR MEMORY
        # ===========================

        if reflection:
            store_memory_entry(
                user_id=user_id,
                content=reflection,
                mem_type="chat_behavior",
                metadata={"tool": tool, "source": "ai"}
            )

        return {
            "success": True,
            "tool": tool,
            "result": result
        }

    except Exception as e:
        print("❌ ai_execute error:", e)
        print("❌ ai_execute error type:", type(e))
        import traceback
        print("❌ ai_execute traceback:", traceback.format_exc())
        return {"success": False, "error": str(e)}


# --------------------------
# AI FINANCIAL REPORT UPDATE
# --------------------------

@app.post("/ai/update-report")
async def update_financial_report(data: dict):
    user_id = data.get("userId")
    
    # ============================================
    # STEP 1: FETCH LATEST FINANCIAL DATA (TOOL)
    # ============================================
    print(f"📊 [Report] Fetching latest financial data for user {user_id}...")
    latest_data = await get_latest_financial_data(user_id)
    
    # Use latest data if available, otherwise fall back to provided data
    stats = latest_data.get("stats", data.get("stats", {}))
    behavior = latest_data.get("behaviorProfile", data.get("behaviorProfile", {}))
    transactions = latest_data.get("recentTransactions", data.get("recentTransactions", []))
    goals = latest_data.get("goals", data.get("goals", []))
    alerts = latest_data.get("activeAlerts", data.get("activeAlerts", []))
    
    # Get gig worker info from payload (detected in Node.js)
    is_gig_worker_from_payload = data.get("isGigWorker", False)
    gig_indicators_from_payload = data.get("gigWorkerIndicators", [])
    
    print(f"📊 [Report] Fetched {len(transactions)} transactions, {len(goals)} goals, {len(alerts)} alerts")
    print(f"📊 [Report] Gig worker from payload: {is_gig_worker_from_payload}")

    # Detect mode: ONBOARDING or REAL DATA
    # Check explicit flag first, then check transaction source fields
    has_real_transactions = len([t for t in transactions if t.get("source") != "onboarding"]) > 0
    
    # Also check if any transaction has source != "onboarding"
    real_transaction_count = 0
    if transactions:
        for t in transactions:
            # Check if transaction has source field and it's not onboarding
            tx_source = t.get("source") or ""
            if tx_source != "onboarding":
                real_transaction_count += 1
    
    # Determine mode: REAL_DATA if we have real transactions, otherwise ONBOARDING
    is_onboarding = (
        not has_real_transactions
        and real_transaction_count == 0
        and (len(transactions) == 0 or stats.get("source") == "bootstrap")
    )

    stats["mode"] = "ONBOARDING" if is_onboarding else "REAL_DATA"
    
    print(f"📊 [Report] Mode detection: is_onboarding={is_onboarding}, has_real_transactions={has_real_transactions}, real_tx_count={real_transaction_count}, total_tx={len(transactions)}")

    # ============================================
    # DETECT GIG ECONOMY / FREELANCE INCOME
    # ============================================
    # Use gig worker info from payload (from onboarding profile) OR detect from transactions
    has_gig_income = is_gig_worker_from_payload
    gig_income_total = 0
    gig_indicators = gig_indicators_from_payload.copy() if gig_indicators_from_payload else []
    
    # Also check transactions for additional gig income
    gig_categories = ["freelance", "gig", "contractor", "self-employed", "consulting", "commission", "tips", "side hustle"]
    
    if transactions:
        for t in transactions:
            if t.get("type") == "income":
                category = (t.get("category") or "").lower()
                note = (t.get("note") or "").lower()
                # Check if category or note contains gig indicators
                if any(indicator in category or indicator in note for indicator in gig_categories):
                    has_gig_income = True
                    gig_income_total += abs(t.get("amount", 0))
                    if f"{t.get('category', 'Income')}" not in gig_indicators:
                        gig_indicators.append(f"{t.get('category', 'Income')}")
    
    gig_percentage = 0
    if has_gig_income and stats.get("monthlyIncome", 0) > 0:
        if gig_income_total > 0:
            gig_percentage = (gig_income_total / stats.get("monthlyIncome", 1)) * 100
        else:
            # If detected from onboarding but no transaction data yet, estimate
            gig_percentage = 50  # Default estimate
    
    gig_context = ""
    if has_gig_income:
        source_note = "onboarding profile" if is_gig_worker_from_payload and not gig_income_total else "transaction data"
        gig_context = f"""
⚠️⚠️⚠️ GIG WORKER / FREELANCER DETECTED ⚠️⚠️⚠️
--------------------------------------------------
CRITICAL: User is a GIG WORKER/FREELANCER (detected from {source_note})
- Gig indicators: {', '.join(gig_indicators[:5]) if gig_indicators else 'Gig worker from profile'}
{"- Gig income from transactions: ₹" + f"{gig_income_total:,.0f} ({gig_percentage:.1f}% of total)" if gig_income_total > 0 else "- Gig worker status from onboarding profile"}

🚨 YOUR RESPONSES MUST BE COMPLETELY DIFFERENT FROM SALARIED PERSON:

1. INCOME IRREGULARITY IS THE #1 RISK:
   - Gig income is UNPREDICTABLE - this is the PRIMARY concern
   - User may have ₹50,000 one month and ₹20,000 the next
   - NEVER assume stable monthly income
   - ALWAYS mention income irregularity as a key factor
   - Frame ALL advice around income uncertainty

2. EMERGENCY FUND IS CRITICAL:
   - Salaried person: 3 months expenses
   - Gig worker: 6 months expenses (DOUBLE)
   - This is NOT optional - it's essential for survival
   - Calculate based on AVERAGE monthly expense, not current month

3. SPENDING ADVICE MUST BE MORE CONSERVATIVE:
   - Large expenses are MUCH riskier with irregular income
   - Recommend maintaining 2-3x higher cash buffer
   - Category spending limits should be LOWER than for salaried
   - Never recommend spending based on "good month" income

4. GOAL PLANNING IS DIFFERENT:
   - Goal timelines must account for income variability
   - Add 20-30% buffer time to goal deadlines
   - Recommend saving MORE during good months
   - Goals should be more flexible/flexible deadlines

5. POSITIVE ASPECTS (mention but don't overemphasize):
   - Potential for higher earnings (but irregular)
   - Flexibility and multiple income streams
   - Diversification of income sources
   - BUT: These benefits require careful management

6. LANGUAGE AND TONE:
   - Use phrases like "given your irregular income", "considering income variability"
   - Frame as: "As a gig worker, you need to..."
   - Be explicit about why recommendations differ from salaried workers
   - NEVER give generic salaried-person advice

7. RECOMMENDATIONS MUST:
   - Always mention income irregularity
   - Recommend 6-month emergency fund (not 3)
   - Suggest more conservative spending limits
   - Account for income variability in calculations
   - Be specific about gig worker needs
"""
        print(f"📊 [Report] Gig worker detected: {', '.join(gig_indicators[:3])} (from {source_note})")

    # Analyze transactions for report context
    transaction_analysis = ""
    if not is_onboarding and len(transactions) > 0:
        # Group by type
        expenses = [t for t in transactions if t.get("type") == "expense"]
        incomes = [t for t in transactions if t.get("type") == "income"]
        savings = [t for t in transactions if t.get("type") == "saving"]
        investments = [t for t in transactions if t.get("type") == "investment"]
        
        # Category breakdown
        category_spending = {}
        for t in expenses:
            cat = t.get("category", "Other")
            category_spending[cat] = category_spending.get(cat, 0) + abs(t.get("amount", 0))
        
        # Recent large transactions
        large_transactions = [t for t in transactions if abs(t.get("amount", 0)) > 5000]
        
        # Date range
        if transactions:
            dates = [t.get("occurredAt") or t.get("createdAt") for t in transactions if t.get("occurredAt") or t.get("createdAt")]
            if dates:
                from datetime import datetime as dt
                try:
                    sorted_dates = sorted([dt.fromisoformat(str(d).replace('Z', '+00:00')) if isinstance(d, str) else d for d in dates])
                    date_range = f"{sorted_dates[0].strftime('%d %b')} - {sorted_dates[-1].strftime('%d %b %Y')}"
                except:
                    date_range = "Recent period"
            else:
                date_range = "Recent period"
        else:
            date_range = "Recent period"
        
        # Calculate category transaction counts and averages
        category_counts = {}
        category_details = {}
        for t in expenses:
            cat = t.get("category", "Other")
            amt = abs(t.get("amount", 0))
            if cat not in category_counts:
                category_counts[cat] = 0
                category_details[cat] = []
            category_counts[cat] += 1
            category_details[cat].append(amt)
        
        # Calculate averages per category
        category_analysis = []
        for cat, amt in sorted(category_spending.items(), key=lambda x: x[1], reverse=True)[:5]:
            count = category_counts.get(cat, 0)
            avg = amt / count if count > 0 else 0
            category_analysis.append(f"- {cat}: ₹{amt:,.0f} across {count} transactions (avg: ₹{avg:,.0f} per transaction)")
        
        # Calculate total expense and percentage per category
        total_expense = sum(abs(t.get('amount', 0)) for t in expenses)
        category_percentages = []
        for cat, amt in sorted(category_spending.items(), key=lambda x: x[1], reverse=True)[:5]:
            pct = (amt / total_expense * 100) if total_expense > 0 else 0
            category_percentages.append(f"- {cat}: {pct:.1f}% of total expenses")
        
        transaction_analysis = f"""
TRANSACTION ANALYSIS (Last {len(transactions)} transactions, {date_range}):
--------------------------------------------------
Total Transactions: {len(transactions)}
- Expenses: {len(expenses)} transactions, Total: ₹{sum(abs(t.get('amount', 0)) for t in expenses):,.0f}
- Incomes: {len(incomes)} transactions, Total: ₹{sum(abs(t.get('amount', 0)) for t in incomes):,.0f}
- Savings: {len(savings)} transactions, Total: ₹{sum(abs(t.get('amount', 0)) for t in savings):,.0f}
- Investments: {len(investments)} transactions, Total: ₹{sum(abs(t.get('amount', 0)) for t in investments):,.0f}

Top Spending Categories (with details):
{chr(10).join(category_analysis)}

Category Percentage of Total Expenses:
{chr(10).join(category_percentages)}

Large Transactions (>₹5,000):
{chr(10).join([f"- {t.get('category', 'Other')}: ₹{abs(t.get('amount', 0)):,.0f} ({t.get('type', 'unknown')})" for t in large_transactions[:5]])}

IMPORTANT: Use these EXACT category names and amounts in your recommendations.
For example, if you see "Food: ₹15,000", recommend: "Reduce Food spending from ₹15,000 to ₹12,000 per month"
"""

    context = f"""
You are **Fintastic AI** — a professional financial analyst generating a comprehensive financial report.

You MUST strictly follow the MODE rules below:

==================================================
MODE 1: ONBOARDING ONLY (NO REAL TRANSACTIONS)
==================================================
Trigger MODE 1 if ANY of the following are true:
- RecentTransactions is EMPTY
- Any item in RecentTransactions contains "onboarding"
- Stats.source == "bootstrap"
- Stats.mode == "ONBOARDING"

In MODE 1 you MUST:
- ❌ NOT calculate averages
- ❌ NOT calculate trends
- ❌ NOT calculate weekly/monthly values
- ❌ NOT predict income/expense
- ❌ NOT use phrases like: "per week", "per month", "average", "trend", "increasing", "decreasing"

Instead you MUST ONLY:
1. Welcome the user personally (by name if present in data)
2. Confirm onboarding is complete
3. Restate FACTS provided (income, expense, savings, goals)
4. Say what Fintastic has understood about the user
5. Mention real insights will start after transactions are added

Recommendations in MODE 1:
- No numeric redirections (no ₹2000, no 20%, no projections)
- Only simple next steps:
  • "Start adding real transactions"
  • "Track daily expenses"
  • "Set priorities for your goals"

==================================================
MODE 2: REAL DATA PRESENT (TRANSACTIONS AVAILABLE)
==================================================
Trigger MODE 2 ONLY IF:
- RecentTransactions.length > 0
- AND no item contains "onboarding"
- AND Stats.source != "bootstrap"
- AND Stats.mode == "REAL_DATA"

In MODE 2 you MUST create a COMPREHENSIVE FINANCIAL REPORT that:
- ✅ Analyzes transaction patterns and trends from ACTUAL transaction data
- ✅ Identifies spending categories and behaviors using REAL transaction amounts
- ✅ Links insights with Goals & Alerts based on transaction impact
- ✅ Provides actionable, data-driven recommendations using transaction patterns
- ✅ Uses transaction context to explain financial health with SPECIFIC NUMBERS
- ✅ Feels like a professional financial report with detailed analysis
- ✅ References specific transactions, amounts, and dates when relevant
- ✅ NEVER mentions onboarding or baseline data - only use REAL transaction data

REPORT STRUCTURE (MODE 2):
1. Summary: 2-3 sentences capturing overall financial health and key trends FROM TRANSACTION DATA
2. Strengths: List 3-5 positive financial behaviors with SPECIFIC AMOUNTS from transactions
3. Risks: List 3-5 concerns with SPECIFIC CATEGORIES and AMOUNTS from transaction analysis
4. Recommendations: 3-5 SPECIFIC, ACTIONABLE steps with EXACT AMOUNTS and CATEGORIES from transactions

CRITICAL: RECOMMENDATIONS MUST BE SPECIFIC TO TRANSACTION DATA
==================================================
❌ BAD (Generic - NEVER DO THIS):
- "Reduce discretionary spending"
- "Explore ways to increase income"
- "Consider seeking financial advice"

✅ GOOD (Specific - ALWAYS DO THIS):
- "Reduce spending in [CATEGORY] from ₹X,XXX to ₹Y,YYY (currently X% of expenses)"
- "Your [CATEGORY] spending of ₹X,XXX this month is Y% above average - aim to cut by ₹Z,ZZZ"
- "You spent ₹X,XXX on [CATEGORY] across [N] transactions - consider limiting to ₹Y,YYY/month"
- "To reach your [GOAL] of ₹X,XXX, reduce [CATEGORY] spending by ₹Y,YYY/month (currently ₹Z,ZZZ)"
- "Your savings of ₹X,XXX across [N] transactions is good - increase by ₹Y,YYY/month to reach [GOAL] faster"

REQUIREMENTS FOR RECOMMENDATIONS:
1. MUST mention specific category names from transaction_analysis
2. MUST include actual amounts (₹X,XXX) from transactions
3. MUST reference transaction counts when relevant
4. MUST connect to specific goals with calculated impact
5. MUST be actionable with clear targets (e.g., "reduce by ₹X,XXX")
6. NEVER use generic phrases like "discretionary spending", "explore ways", "consider seeking"

IMPORTANT FOR MODE 2 - YOU MUST USE REAL TRANSACTION DATA:
- Reference specific transaction patterns with ACTUAL AMOUNTS (e.g., "Your spending in [category] has increased to ₹X,XXX based on [N] transactions")
- Use actual numbers from the transaction_analysis section above (e.g., "₹X,XXX spent on [category] across [N] transactions")
- Connect transaction behavior to goals with SPECIFIC IMPACT (e.g., "Your ₹X,XXX spending in [category] may delay your [goal] by [timeframe]")
- Mention specific large transactions with AMOUNTS and DATES if relevant
- Highlight positive behaviors with NUMBERS (e.g., "You've maintained consistent savings with ₹X,XXX across [N] transactions")
- Calculate trends from transaction data (e.g., "Average transaction size: ₹X,XXX, with [category] representing X% of expenses")
- NEVER use generic statements - always back up with transaction data
- If transaction_analysis shows specific categories, reference them by name and amount

==================================================
STRICT OUTPUT FORMAT
==================================================
Return VALID JSON ONLY

{{
  "summary": "2-3 sentences describing overall financial health and key trends",
  "strengths": ["Strength 1 based on transactions", "Strength 2", "..."],
  "risks": ["Risk 1 based on transaction patterns", "Risk 2", "..."],
  "suggestions": ["Actionable recommendation 1", "Recommendation 2", "..."],
  "key_points": ["Key point 1", "Key point 2", "..."],
  "recommendations": ["Recommendation 1", "Recommendation 2", "..."]
}}

Rules:
- Use ₹ for money values
- Never repeat wording
- Do NOT hallucinate / guess numbers
- Reference actual transaction data
- If data is missing write: "Insufficient real transaction data"
- Make it feel like a professional financial report

{gig_context}

Use ONLY this trusted data:
{transaction_analysis}
Stats: {json.dumps(stats, ensure_ascii=False)}
BehaviorProfile: {json.dumps(behavior, ensure_ascii=False)}
Goals: {json.dumps(goals, ensure_ascii=False)}
ActiveAlerts: {json.dumps(alerts, ensure_ascii=False)}
RecentTransactions: {json.dumps(transactions, ensure_ascii=False)}

CRITICAL: If gig income is detected, you MUST:
1. Mention income irregularity as a key risk factor
2. Recommend larger emergency fund (6 months vs 3 months)
3. Suggest more conservative spending limits
4. Account for income variability in goal timelines
5. Highlight both risks (irregularity) and opportunities (flexibility) of gig income
"""

    try:
        result = await client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=0.2,
            messages=[
                {"role": "system", "content": context},
                {
                    "role": "user",
                        "content": f"""Produce the JSON report now. Remember: no markdown, JSON only.

CRITICAL INSTRUCTIONS:
1. Look at the transaction_analysis section above - it shows EXACT categories and amounts
2. For recommendations, use THOSE SPECIFIC categories and amounts
3. Example: If transaction_analysis shows "Food: ₹15,000", your recommendation should say "Reduce Food spending from ₹15,000 to ₹12,000"
4. NEVER write generic recommendations like "reduce discretionary spending" or "explore ways to increase income"
5. ALWAYS include specific amounts (₹X,XXX) and category names from the transaction data
6. Connect recommendations to specific goals with calculated amounts

Use the transaction_analysis data to create SPECIFIC recommendations with EXACT numbers.""",
                },
            ],
        )

        raw = result.choices[0].message.content.strip()

        try:
            return json.loads(raw)
        except Exception:
            first = raw.find("{")
            last = raw.rfind("}")
            if first != -1 and last != -1:
                try:
                    return json.loads(raw[first : last + 1])
                except Exception:
                    pass

            print("⚠️ update-report JSON parse failed:", raw)
            return {
                "summary": "Unable to calculate report",
                "key_points": [],
                "recommendations": [],
            }

    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        
        # Handle Groq rate limit errors
        if "RateLimitError" in error_type or "429" in error_msg or "rate_limit" in error_msg.lower():
            print(f"⚠️ [Financial Report] Groq rate limit reached. Using fallback response.")
            print(f"   Error: {error_msg[:200]}")
            
            # Generate fallback report based on transaction data
            if not is_onboarding and len(transactions) > 0:
                expenses = [t for t in transactions if t.get("type") == "expense"]
                incomes = [t for t in transactions if t.get("type") == "income"]
                savings = [t for t in transactions if t.get("type") == "saving"]
                
                total_expense = sum(abs(t.get("amount", 0)) for t in expenses)
                total_income = sum(abs(t.get("amount", 0)) for t in incomes)
                total_saving = sum(abs(t.get("amount", 0)) for t in savings)
                
                # Category breakdown
                category_spending = {}
                for t in expenses:
                    cat = t.get("category", "Other")
                    category_spending[cat] = category_spending.get(cat, 0) + abs(t.get("amount", 0))
                
                top_category = max(category_spending.items(), key=lambda x: x[1]) if category_spending else None
                
                # Generate basic recommendations from data
                recommendations = []
                if top_category:
                    cat_name, cat_amount = top_category
                    recommendations.append(f"Reduce {cat_name} spending from ₹{cat_amount:,.0f} to ₹{cat_amount * 0.8:,.0f} (currently highest category)")
                
                if total_expense > total_income * 0.8:
                    recommendations.append(f"Your expenses (₹{total_expense:,.0f}) are high relative to income (₹{total_income:,.0f}) - aim to reduce by ₹{(total_expense - total_income * 0.7):,.0f}")
                
                if total_saving > 0:
                    savings_rate = (total_saving / total_income * 100) if total_income > 0 else 0
                    if savings_rate < 20:
                        recommendations.append(f"Increase savings from ₹{total_saving:,.0f} to ₹{total_income * 0.2:,.0f} to reach 20% savings rate")
                
                return {
                    "summary": f"Financial report based on {len(transactions)} transactions. Total income: ₹{total_income:,.0f}, expenses: ₹{total_expense:,.0f}, savings: ₹{total_saving:,.0f}.",
                    "strengths": [
                        f"Tracked {len(transactions)} transactions" if len(transactions) > 0 else "Starting to track finances",
                        f"Total savings: ₹{total_saving:,.0f}" if total_saving > 0 else "Focus on building savings"
                    ],
                    "risks": [
                        f"Expenses (₹{total_expense:,.0f}) represent {total_expense/total_income*100:.1f}% of income" if total_income > 0 and total_expense > total_income * 0.8 else "Monitor spending patterns",
                        f"Top spending category: {top_category[0]} at ₹{top_category[1]:,.0f}" if top_category else "Review category spending"
                    ],
                    "suggestions": recommendations if recommendations else ["Continue tracking transactions for better insights"],
                    "key_points": [
                        f"Total transactions: {len(transactions)}",
                        f"Income: ₹{total_income:,.0f}",
                        f"Expenses: ₹{total_expense:,.0f}"
                    ],
                    "recommendations": recommendations if recommendations else ["Track more transactions for personalized recommendations"]
                }
            else:
                # Onboarding mode fallback
                return {
                    "summary": "Welcome to Fintastic! Your onboarding is complete. Start adding real transactions to get personalized financial insights.",
                    "strengths": ["Onboarding completed successfully"],
                    "risks": [],
                    "suggestions": ["Start adding daily transactions", "Track your expenses regularly", "Set priorities for your goals"],
                    "key_points": ["Onboarding complete", "Ready to track transactions"],
                    "recommendations": ["Add your first transaction to begin financial tracking"]
                }
        
        # Handle other errors
        print(f"❌ [Financial Report] Error generating report: {error_type}: {error_msg}")
        return {
            "summary": "Unable to generate financial report at this time. Please try again later.",
            "strengths": [],
            "risks": [],
            "suggestions": ["Report generation temporarily unavailable"],
            "key_points": [],
            "recommendations": []
        }


# --------------------------
# DAILY FINANCIAL MONITOR
# --------------------------

@app.post("/ai/daily-monitor")
async def daily_monitor(data: dict):
    """
    Daily background job to:
    - Recalculate full FinancialReport for all users
    - Store in Chroma as financial_report
    - Send email if big change detected
    """
    try:
        user_id = data.get("userId")
        if not user_id:
            return {"success": False, "error": "userId required"}

        # This endpoint is called by backend cron job
        # Backend will fetch stats, goals, alerts, etc. and send here
        stats = data.get("stats", {})
        behavior = data.get("behaviorProfile", {})
        goals = data.get("goals", [])
        alerts = data.get("activeAlerts", [])
        previousReport = data.get("previousReport", {})

        # Calculate health score change
        previousScore = previousReport.get("financialHealthScore", 50)
        currentScore = data.get("financialHealthScore", 50)
        scoreChange = currentScore - previousScore

        # Store financial report in Chroma
        reportContent = f"""
FINANCIAL REPORT - {datetime.now().strftime("%Y-%m-%d")}

Health Score: {currentScore}/100
Previous Score: {previousScore}/100
Change: {'+' if scoreChange > 0 else ''}{scoreChange} points

Summary: {data.get("summary", "No summary available")}

Strengths:
{chr(10).join(f"- {s}" for s in data.get("strengths", []))}

Risks:
{chr(10).join(f"- {r}" for r in data.get("risks", []))}

Suggestions:
{chr(10).join(f"- {s}" for s in data.get("suggestions", []))}

Stats:
- Monthly Income: ₹{stats.get("monthlyIncome", 0)}
- Monthly Expense: ₹{stats.get("monthlyExpense", 0)}
- Savings Rate: {stats.get("savingsRate", 0)}%
- Investment Rate: {stats.get("investmentRate", 0)}%
- Net Worth: ₹{stats.get("netWorth", 0)}
        """.strip()

        store_memory_entry(
            user_id=user_id,
            content=reportContent,
            mem_type="financial_report",
            metadata={
                "healthScore": currentScore,
                "scoreChange": scoreChange,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "source": "daily_monitor"
            }
        )

        # Send email if big change
        if abs(scoreChange) >= 20:
            # Backend will handle email sending
            return {
                "success": True,
                "healthScore": currentScore,
                "scoreChange": scoreChange,
                "emailNeeded": True,
                "message": "Big change detected - email should be sent"
            }

        return {
            "success": True,
            "healthScore": currentScore,
            "scoreChange": scoreChange,
            "emailNeeded": False
        }

    except Exception as e:
        print(f"❌ Daily monitor error: {e}")
        return {"success": False, "error": str(e)}


# --------------------------
# SEND FINANCIAL COACH EMAIL
# --------------------------

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

@app.post("/ai/send-email")
async def send_financial_coach_email(data: dict):
    """
    Send financial coach email via Python SMTP
    Called from Node.js backend
    """
    try:
        user_email = data.get("email")
        user_name = data.get("name", "there")
        subject = data.get("subject")
        body = data.get("body")
        
        if not user_email or not subject or not body:
            return {"success": False, "error": "email, subject, and body required"}

        # Get SMTP config from environment variables (using MENTOR_EMAIL and MENTOR_EMAIL_PASSWORD)
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("MENTOR_EMAIL") or os.getenv("SMTP_USER")  # Fallback to SMTP_USER for compatibility
        smtp_pass = os.getenv("MENTOR_EMAIL_PASSWORD") or os.getenv("SMTP_PASS")  # Fallback to SMTP_PASS for compatibility
        
        # Verify credentials are loaded from environment
        if not smtp_user or not smtp_pass:
            print("⚠️ Email credentials not found in environment variables")
            print(f"   MENTOR_EMAIL: {'SET' if os.getenv('MENTOR_EMAIL') else 'NOT SET'}")
            print(f"   MENTOR_EMAIL_PASSWORD: {'SET' if os.getenv('MENTOR_EMAIL_PASSWORD') else 'NOT SET'}")
            print(f"   SMTP_USER (fallback): {'SET' if os.getenv('SMTP_USER') else 'NOT SET'}")
            print(f"   SMTP_PASS (fallback): {'SET' if os.getenv('SMTP_PASS') else 'NOT SET'}")
            print("   Please set MENTOR_EMAIL and MENTOR_EMAIL_PASSWORD in your .env file")
            return {"success": False, "error": "Email credentials not configured in environment"}
        
        print(f"📧 Using SMTP: {smtp_host}:{smtp_port} with email: {smtp_user}")

        # Create message
        msg = MIMEMultipart()
        msg["From"] = f"Fintastic AI Coach <{smtp_user}>"
        msg["To"] = user_email
        msg["Subject"] = subject
        
        # Add body
        msg.attach(MIMEText(body, "html" if "<" in body else "plain"))

        # Send email
        if smtp_port == 465:
            # SSL
            server = smtplib.SMTP_SSL(smtp_host, smtp_port)
        else:
            # TLS
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
        
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()

        print(f"✅ Email sent successfully to {user_email}: {subject}")
        return {"success": True, "message": "Email sent successfully"}

    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Email authentication error: {e}")
        print(f"   Check if MENTOR_EMAIL and MENTOR_EMAIL_PASSWORD are correct")
        print(f"   For Gmail, you may need to use an App Password instead of regular password")
        return {"success": False, "error": f"SMTP authentication failed: {str(e)}"}
    except smtplib.SMTPException as e:
        print(f"❌ SMTP error: {e}")
        return {"success": False, "error": f"SMTP error: {str(e)}"}
    except Exception as e:
        print(f"❌ Email send error: {e}")
        import traceback
        print(f"   Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}


from datetime import datetime, timedelta

# --------------------------

from datetime import datetime
from pydantic import BaseModel
from typing import Dict, Any, List

class DailyMentorRequest(BaseModel):
    userId: str
    name: str
    today: Dict[str, Any]
    stats: Dict[str, Any]
    goals: List[Dict[str, Any]] = []
    behaviorPatterns: List[str] = []  # From ChromaDB behavior_pattern memories
    riskTrends: Dict[str, Any] = {}  # Past 7 days trends
    behaviorProfile: Optional[Dict[str, Any]] = None  # Live BehaviorProfile from MongoDB
    memories: List[str] = []  # Deprecated - use behaviorPatterns instead


@app.post("/ai/daily-mentor")
async def daily_mentor(data: DailyMentorRequest):

    user_id = data.userId
    name = data.name
    today = datetime.now().strftime("%Y-%m-%d")

    # ============================================
    # 1. TODAY'S TRANSACTIONS (Structured)
    # ============================================
    today_income = data.today.get('income', 0)
    today_expense = data.today.get('expense', 0)
    today_saving = data.today.get('saving', 0)
    today_investment = data.today.get('investment', 0)
    top_category = data.today.get('topCategory', 'N/A')
    transaction_count = data.today.get('transactionCount', 0)

    # ============================================
    # 2. GOALS PROGRESS (Structured)
    # ============================================
    goals_text = ""
    if data.goals and len(data.goals) > 0:
        active_goals = [g for g in data.goals if g.get('remaining', 0) > 0]
        if active_goals:
            goals_list = []
            for goal in active_goals[:3]:  # Top 3 active goals
                name = goal.get('name', 'Unknown')
                current = goal.get('current', 0)
                target = goal.get('target', 0)
                remaining = goal.get('remaining', 0)
                progress = (current / target * 100) if target > 0 else 0
                deadline = goal.get('deadline')
                
                deadline_str = ""
                if deadline:
                    try:
                        deadline_date = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                        days_left = (deadline_date - datetime.now()).days
                        deadline_str = f" | Days left: {days_left}" if days_left > 0 else " | Deadline passed"
                    except:
                        deadline_str = f" | Deadline: {deadline}"
                
                goals_list.append(
                    f"- {name}: ₹{current:,}/₹{target:,} ({progress:.1f}%) | Remaining: ₹{remaining:,}{deadline_str}"
                )
            goals_text = "\n".join(goals_list)

    # ============================================
    # 3. BEHAVIOR PATTERNS (From ChromaDB)
    # ============================================
    behavior_context = ""
    if data.behaviorPatterns and len(data.behaviorPatterns) > 0:
        behavior_context = "\n".join(data.behaviorPatterns[:5])  # Top 5 patterns

    # ============================================
    # 4. RISK TRENDS (Past 7 Days)
    # ============================================
    risk_trends = data.riskTrends or {}
    trend_text = ""
    if risk_trends:
        avg_expense = risk_trends.get('avgExpense', 0)
        expense_change = risk_trends.get('expenseChange', 0)
        savings_trend = risk_trends.get('savingsTrend', 'stable')
        
        trend_text = f"""
RISK TRENDS (Past 7 Days):
- Average Daily Expense: ₹{avg_expense:,.0f}
- Expense Change: {expense_change:+.1f}%
- Savings Trend: {savings_trend}
"""

    # ============================================
    # 4.5. BEHAVIOR PROFILE (Live from MongoDB)
    # ============================================
    behavior = data.behaviorProfile
    behavior_profile_text = ""
    discipline = 50
    impulse = 50
    consistency = 50
    risk = 50
    
    if behavior:
        discipline = behavior.get("disciplineScore", 50)
        impulse = behavior.get("impulseScore", 50)
        consistency = behavior.get("consistencyIndex", 50)
        risk = behavior.get("riskIndex", 50)
        saving_streak = behavior.get("savingStreak", 0)
        
        behavior_profile_text = f"""
--- USER BEHAVIOR PROFILE (LIVE) ---
Discipline Score: {discipline}/100
Impulse Score: {impulse}/100
Consistency Index: {consistency}/100
Risk Index: {risk}/100
Saving Streak: {saving_streak} days

Guidelines for mentor output:
- If discipline > 75: Praise in Strength section
- If impulse > 70: Highlight in Risk section
- If consistency < 40: Add habit-building advice
- Use these scores to personalize tone and recommendations
"""

    # ============================================
    # 5. CALCULATE FINANCIAL SCORE (0-100)
    # ============================================
    savings_rate = data.stats.get('savingsRate', 0)
    investment_rate = data.stats.get('investmentRate', 0)
    net_worth = data.stats.get('netWorth', 0)
    
    # Score calculation
    score = 50  # Base score
    
    # Savings rate contribution (0-25 points)
    if savings_rate >= 30:
        score += 25
    elif savings_rate >= 20:
        score += 20
    elif savings_rate >= 10:
        score += 15
    elif savings_rate > 0:
        score += 10
    
    # Investment rate contribution (0-15 points)
    if investment_rate >= 20:
        score += 15
    elif investment_rate >= 10:
        score += 10
    elif investment_rate > 0:
        score += 5
    
    # Net worth contribution (0-10 points)
    if net_worth > 100000:
        score += 10
    elif net_worth > 50000:
        score += 5
    
    # Today's activity bonus (0-10 points)
    if today_saving > 0 or today_investment > 0:
        score += 10
    
    score = min(100, max(0, score))

    # ============================================
    # 6. BUILD STRUCTURED CONTEXT
    # ============================================
    context = f"""
USER: {name}
DATE: {today}

--- TODAY'S TRANSACTIONS ---
Income: ₹{today_income:,}
Expense: ₹{today_expense:,}
Saving: ₹{today_saving:,}
Investment: ₹{today_investment:,}
Top Category: {top_category}
Transaction Count: {transaction_count}

--- CURRENT STATS ---
Savings Rate: {savings_rate}%
Investment Rate: {investment_rate}%
Net Worth: ₹{net_worth:,}
Monthly Income: ₹{data.stats.get('monthlyIncome', 0):,}
Monthly Expense: ₹{data.stats.get('monthlyExpense', 0):,}

--- ACTIVE GOALS ---
{goals_text if goals_text else "No active goals"}

{trend_text}

{behavior_profile_text}

--- BEHAVIOR PATTERNS (FROM MEMORY) ---
{behavior_context if behavior_context else "No significant patterns detected"}
"""

    # ============================================
    # 7. GENERATE PROFESSIONAL MENTOR REPORT
    # ============================================
    prompt = f"""
You are a professional financial mentor analyzing daily financial performance.

CONTEXT:
{context}

Calculate a financial score (0-100) based on:
- Savings rate (30%+ = excellent, 20-30% = good, 10-20% = fair, <10% = poor)
- Investment rate (20%+ = excellent, 10-20% = good, >0% = fair)
- Net worth growth
- Today's positive actions (savings/investments)

Return ONLY VALID JSON in this exact format:

{{
  "financialScore": <0-100 integer>,
  "confidenceScore": <0-100 integer based on data completeness>,
  "strength": "<1-2 lines about today's best financial action>",
  "weakness": "<1-2 lines about today's financial risk>",
  "dataBackedAdvice": "<Specific advice with ₹ values and percentages>",
  "goalFocusedAction": "<One precise action related to their goals with specific ₹ amount>",
  "goalProgress": {{
    "goalName": "<name of most relevant goal>",
    "currentAmount": <number>,
    "targetAmount": <number>,
    "progress": <percentage>,
    "remaining": <number>,
    "requiredPerDay": <number if deadline exists>
  }}
}}

RULES:
- financialScore: Calculate based on savings rate, investment rate, net worth, and today's activity
- confidenceScore: Higher if more data available (transactions, goals, patterns)
- strength: Highlight ONE best thing (e.g., "You invested 21% of your income today")
  * If discipline > 75: Include praise about their discipline in strength
  * Example: "Your discipline score is strong ({discipline}/100), and you invested 21% of your income today"
- weakness: Highlight ONE risk (e.g., "Expenses exceeded income by ₹1,000 (20%)")
  * If impulse > 70: Include warning about impulse spending
  * Example: "Your impulse score is elevated ({impulse}/100), and expenses exceeded income by ₹1,000"
- dataBackedAdvice: Must include specific ₹ amounts and percentages
  * If consistency < 40: Add habit-building advice
- goalFocusedAction: Must be actionable with specific ₹ amount
- Use ₹ for currency, format numbers with commas
- Be professional, data-driven, and motivating
- Integrate behavior profile scores naturally into strength/weakness sections
"""

    result = await client.chat.completions.create(
        model=GROQ_MODEL,
        temperature=0.3,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": "Generate today's professional financial mentor report"}
        ]
    )

    raw = result.choices[0].message.content.strip()
    mentor_data = json.loads(raw)
    
    # Override financial score with calculated score if AI didn't provide it
    if "financialScore" not in mentor_data or mentor_data["financialScore"] is None:
        mentor_data["financialScore"] = score
    
    # Calculate confidence score based on data completeness
    confidence = 70  # Base confidence
    if transaction_count > 0:
        confidence += 10
    if len(data.goals) > 0:
        confidence += 10
    if behavior_context:
        confidence += 10
    confidence = min(100, confidence)
    
    if "confidenceScore" not in mentor_data or mentor_data["confidenceScore"] is None:
        mentor_data["confidenceScore"] = confidence

    # Store in memory with standardized type
    store_memory_entry(
        user_id=user_id,
        content=f"Daily mentor report for {today}. Score: {mentor_data.get('financialScore', score)}/100. {mentor_data.get('strength', '')}",
        mem_type="daily_activity",
        metadata={
            "date": today,
            "source": "daily_mentor",
            "financialScore": mentor_data.get('financialScore', score),
            "confidenceScore": mentor_data.get('confidenceScore', confidence)
        }
    )

    # ============================================
    # 8. STORE BEHAVIOR SNAPSHOT IN CHROMA (Once per day)
    # ============================================
    if behavior:
        try:
            # Check if snapshot already exists for today (prevent duplicates)
            existing_snapshots = collection.get(
                where={
                    "$and": [
                        {"userId": user_id},
                        {"type": "behavior_pattern"},
                        {"date": today},
                        {"source": "system"}
                    ]
                },
                limit=1
            )
            
            # Only store if no snapshot exists for today
            if not existing_snapshots.get("ids") or len(existing_snapshots["ids"]) == 0:
                top_strength = mentor_data.get('strength', 'No significant strength today')
                top_risk = mentor_data.get('weakness', 'No significant risk today')
                
                daily_summary = f"""
Today's Summary:
- Income: ₹{today_income:,}
- Expense: ₹{today_expense:,}
- Saving: ₹{today_saving:,}
- Investment: ₹{today_investment:,}
- Financial Score: {mentor_data.get('financialScore', score)}/100
"""
                
                snapshot = f"""Daily Behavior Snapshot ({today}):

Behavior Scores:
- Discipline: {discipline}/100
- Impulse: {impulse}/100
- Consistency: {consistency}/100
- Risk: {risk}/100
- Saving Streak: {behavior.get('savingStreak', 0)} days

{daily_summary}

Main Risk: {top_risk}

Main Strength: {top_strength}

Key Insight: {mentor_data.get('dataBackedAdvice', 'Continue monitoring finances')}
"""
                
                store_memory_entry(
                    user_id=user_id,
                    content=snapshot,
                    mem_type="behavior_pattern",
                    metadata={
                        "date": today,
                        "source": "system",
                        "disciplineScore": discipline,
                        "impulseScore": impulse,
                        "consistencyIndex": consistency,
                        "riskIndex": risk,
                        "financialScore": mentor_data.get('financialScore', score)
                    }
                )
                print(f"✅ Behavior snapshot stored for {user_id} on {today}")
            else:
                print(f"ℹ️ Behavior snapshot already exists for {user_id} on {today}, skipping")
        except Exception as e:
            print(f"⚠️ Failed to store behavior snapshot: {e}")

    return {
        "success": True,
        "userId": user_id,
        "date": today,
        "mentor": mentor_data
    }


def run_daily_mentor_for_all_users():
    print("\n🕘 Running DAILY MENTOR for all users...")

    try:
        # 1. Get all users from Node
        response = requests.get("http://localhost:3000/api/users")

        if response.status_code != 200:
            print("❌ Failed to fetch users")
            return

        users_data = response.json()
        
        # Handle response structure: {"success": true, "users": [...]}
        if not users_data.get("success"):
            print("❌ Users response not successful")
            return
            
        users = users_data.get("users", [])

        if not users:
            print("⚠️ No users found")
            return

        for user in users:
            user_id = user.get("userId") or user.get("_id")
            email = user.get("email")
            name = user.get("name", "User")

            if not email or not user_id:
                continue

            print(f"📨 Generating mentor for: {user_id}")

            try:
                # 2. Get daily data from Node.js backend
                daily_res = requests.get(f"http://localhost:3000/api/daily/{user_id}")

                if daily_res.status_code != 200:
                    print(f"❌ Failed to fetch daily data for {user_id}")
                    continue

                daily_data = daily_res.json()

                if not daily_data.get("success"):
                    print(f"❌ Daily data not successful for {user_id}")
                    continue

                # 3. Prepare data for AI mentor endpoint (structured)
                mentor_payload = {
                    "userId": user_id,
                    "name": name,
                    "today": daily_data.get("today", {}),
                    "stats": daily_data.get("stats", {}),
                    "goals": daily_data.get("goals", []),
                    "behaviorPatterns": daily_data.get("behaviorPatterns", []),
                    "riskTrends": daily_data.get("riskTrends", {}),
                    "behaviorProfile": daily_data.get("behaviorProfile"),  # Live BehaviorProfile
                    "memories": daily_data.get("memoryHighlights", [])  # Deprecated but kept for compatibility
                }

                # 4. Call AI mentor endpoint
                mentor_res = requests.post(
                    "http://localhost:8001/ai/daily-mentor",
                    json=mentor_payload,
                )

                if mentor_res.status_code != 200:
                    print(f"❌ Mentor AI failed for {user_id}")
                    continue

                mentor_response = mentor_res.json()

                # 5. Extract mentor data from response
                if not mentor_response.get("success"):
                    print(f"❌ Mentor response not successful for {user_id}")
                    continue

                mentor_data = mentor_response.get("mentor", {})
                
                if not mentor_data:
                    print(f"❌ No mentor data in response for {user_id}")
                    continue

                # 6. Send email (pass both daily_data and mentor_data for context)
                send_email(email, {
                    "mentor": mentor_data,
                    "daily": daily_data,
                    "name": name,
                    "date": daily_data.get("today", {}).get("date", datetime.now().strftime("%Y-%m-%d"))
                })

            except Exception as user_error:
                print(f"❌ Error processing user {user_id}: {str(user_error)}")
                continue

        print("✅ Daily Mentor completed for all users")

    except Exception as e:
        print("❌ Scheduler error:", str(e))
        import traceback
        print("❌ Scheduler traceback:", traceback.format_exc())


import smtplib
from email.mime.text import MIMEText

EMAIL = os.getenv("MENTOR_EMAIL")
PASSWORD = os.getenv("MENTOR_EMAIL_PASSWORD")

def send_email(to_email, data):
    # Handle both direct mentor data and nested response structure
    if isinstance(data, dict) and "mentor" in data:
        mentor_data = data["mentor"]
        daily_data = data.get("daily", {})
        name = data.get("name", "User")
        date = data.get("date", datetime.now().strftime("%Y-%m-%d"))
    else:
        mentor_data = data
        daily_data = {}
        name = "User"
        date = datetime.now().strftime("%Y-%m-%d")

    # Extract new structured fields from mentor_data
    financial_score = mentor_data.get("financialScore", 0)
    confidence_score = mentor_data.get("confidenceScore", 0)
    strength = mentor_data.get("strength", "No significant activity today.")
    weakness = mentor_data.get("weakness", "No risks detected.")
    goal_action = mentor_data.get("goalFocusedAction", "Stay focused on your financial goals.")
    
    # Get today's metrics from daily_data
    today_data = daily_data.get("today", {})
    stats_data = daily_data.get("stats", {})
    
    # Extract goal progress if available
    goal_progress = mentor_data.get("goalProgress", {})
    goal_section = ""
    if goal_progress and goal_progress.get("goalName"):
        goal_name = goal_progress.get("goalName", "Goal")
        current = goal_progress.get("currentAmount", 0)
        target = goal_progress.get("targetAmount", 0)
        progress = goal_progress.get("progress", 0)
        remaining = goal_progress.get("remaining", 0)
        required_per_day = goal_progress.get("requiredPerDay")
        
        goal_section = f"""
Progress toward goal ({goal_name} – ₹{target:,}):
- Completed: ₹{current:,} ({progress:.1f}%)
- Remaining: ₹{remaining:,}"""
        
        if required_per_day:
            goal_section += f"\n- Required/day: ₹{required_per_day:,.0f}"

    # Build professional email body
    body = f"""Name: {name}
Date: {date}

Financial Score: {financial_score}/100
Confidence: {confidence_score}%

🔹 Strength
- {strength}

🔸 Risk
- {weakness}

📊 Key Metrics
- Income: ₹{today_data.get('income', 0):,}
- Expense: ₹{today_data.get('expense', 0):,}
- Saving: ₹{today_data.get('saving', 0):,}
- Investment: ₹{today_data.get('investment', 0):,}
- Savings Rate: {stats_data.get('savingsRate', 0)}%

🎯 Smart Action for Tomorrow
- {goal_action}
{goal_section}
"""

    msg = MIMEText(body)
    msg["Subject"] = "Your Daily Financial Performance – Fintastic"
    msg["From"] = EMAIL
    msg["To"] = to_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL, PASSWORD)
            server.send_message(msg)
            print(f"✅ Email sent to {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")


scheduler = BackgroundScheduler()

# run at 9 PM everyday
# scheduler.add_job(
#     run_daily_mentor_for_all_users,
#     trigger="cron",
#     minute="*/20"   # every 2 minutes
# )

scheduler.start()
print("✅ Daily Mentor Scheduler started (9 PM)")
