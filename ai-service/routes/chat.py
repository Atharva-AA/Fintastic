"""
AI Chat route handler
"""

import json
from typing import Any, Dict

from schemas import ChatRequest
from tools import (
    build_behavior_context, merge_and_clean_memories, store_memory_entry,
    market_overview, sip_forecast, crash_risk_detector, investment_signal_engine
)
from utils import get_latest_financial_data
from prompts import build_chat_system_prompt
from node_client import get_user_stats_tool
from config import GIG_CATEGORIES, LIVE_DATA_TRIGGER_KEYWORDS, MARKET_INVESTMENT_KEYWORDS
from datetime import datetime


async def handle_chat_request(data: ChatRequest, client, model: str) -> Dict[str, Any]:
    """Handle AI chat request"""
    
    user_id = data.userId
    message = data.message.strip()
    is_gig_worker = data.isGigWorker or False
    gig_indicators = data.gigWorkerIndicators or []
    
    # Detect if user needs live data or market data
    needs_live_data = any(keyword in message.lower() for keyword in LIVE_DATA_TRIGGER_KEYWORDS)
    needs_market_data = any(keyword in message.lower() for keyword in MARKET_INVESTMENT_KEYWORDS)
    
    live_data_context = ""
    market_context = ""
    user_context_for_market = {}
    
    # Fetch live data if needed
    if needs_live_data:
        print(f"🔄 Fetching live financial data for user: {user_id}")
        live_data = await get_latest_financial_data(user_id)
        live_data_context, user_context_for_market = _build_live_data_context(live_data, is_gig_worker)
    
    # Fetch market data if needed
    if needs_market_data:
        if not user_context_for_market:
            live_data = await get_latest_financial_data(user_id)
            _, user_context_for_market = _build_live_data_context(live_data, is_gig_worker)
            user_context_for_market["userId"] = user_id
        
        market_context = await _fetch_market_context(user_id, user_context_for_market, message)
    
    # Fetch fresh stats
    fresh_stats = get_user_stats_tool(user_id)
    stats_context, goals_context = _build_stats_context(fresh_stats)
    
    # Build contexts
    behavior_meta = build_behavior_context(data.behaviorProfile)
    memory_context = merge_and_clean_memories(data.relevantMemories[:8])
    history_text = "\n".join([f"{m.role}: {m.content}" for m in data.chatHistory[-6:]])
    
    # Build system prompt
    system_prompt = build_chat_system_prompt(
        live_data_context=live_data_context,
        market_context=market_context,
        stats_context=stats_context,
        goals_context=goals_context,
        memory_context=memory_context,
        behavior_context=behavior_meta["text"],
        history_text=history_text
    )
    
    try:
        result = await client.chat.completions.create(
            model=model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ]
        )
        
        raw = result.choices[0].message.content.strip()
        plan_dict = json.loads(raw)
        
        if 'intent' not in plan_dict:
            return {"success": False, "error": "Invalid AI response", "raw": raw}
        
        return {"success": True, "plan": plan_dict}
        
    except Exception as e:
        print("ai_chat error:", e)
        return {"success": False, "error": str(e)}


def _build_live_data_context(live_data: dict, is_gig_worker: bool) -> tuple:
    """Build live data context string and user context for market"""
    
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
    
    if recent_tx:
        for t in recent_tx:
            if t.get("type") == "income":
                category = (t.get("category") or "").lower()
                note = (t.get("note") or "").lower()
                if any(indicator in category or indicator in note for indicator in GIG_CATEGORIES):
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

INCOME: Total ₹{income.get('total', 0)}, Count: {income.get('count', 0)}
EXPENSES: Total ₹{expenses.get('total', 0)}, Count: {expenses.get('count', 0)}
SAVINGS: Total ₹{savings.get('total', 0)}
INVESTMENTS: Total ₹{investments.get('total', 0)}

GOALS: {json.dumps(goals, ensure_ascii=False, default=str)}
ALERTS: {json.dumps(alerts[:5], ensure_ascii=False, default=str)}

BEHAVIOR:
- Discipline: {behavior.get('disciplineScore', 50)}/100
- Impulse: {behavior.get('impulseScore', 50)}/100
- Risk Index: {behavior.get('riskIndex', 50)}/100

{"⚠️ GIG INCOME DETECTED: " + f"₹{gig_income_total:,.0f} ({gig_percentage:.1f}%)" if has_gig_income else ""}
"""
    
    user_context_for_market = {
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
    
    return live_data_context, user_context_for_market


async def _fetch_market_context(user_id: str, user_context: dict, message: str) -> str:
    """Fetch and build market context"""
    
    try:
        market_overview_data = await market_overview(user_context)
        market_context = f"""
LIVE MARKET DATA
--------------
Market Trend: {market_overview_data.get('trend', 'unknown')}
Global Sentiment: {market_overview_data.get('global_sentiment', 'unknown')}
"""
        
        crash_risk_data = await crash_risk_detector(user_context, market_overview_data)
        market_context += f"""
CRASH RISK: {crash_risk_data.get('crash_probability_percent', 0)}% ({crash_risk_data.get('severity', 'low')})
Action: {crash_risk_data.get('recommended_user_action', 'N/A')}
"""
        
        investment_signal_data = await investment_signal_engine(user_context, market_overview_data)
        market_context += f"""
INVESTMENT SIGNAL: {investment_signal_data.get('signal', 'HOLD')}
Asset Type: {investment_signal_data.get('asset_type', 'unknown')}
Amount: ₹{investment_signal_data.get('recommended_amount', 0)}
"""
        
        if "sip" in message.lower():
            sip_forecast_data = await sip_forecast(user_context, market_overview_data)
            market_context += f"""
SIP FORECAST:
- Amount: ₹{sip_forecast_data.get('recommended_sip_amount', 0)}
- Funds: {', '.join(sip_forecast_data.get('suggested_funds', []))}
"""
        
        # Store market intelligence
        intelligence_content = f"""
MARKET INTELLIGENCE - {datetime.now().strftime("%Y-%m-%d %H:%M")}
Trend: {market_overview_data.get('trend')}
Crash Risk: {crash_risk_data.get('crash_probability_percent')}%
Signal: {investment_signal_data.get('signal')}
"""
        
        store_memory_entry(
            user_id=user_id,
            content=intelligence_content,
            mem_type="market_intelligence",
            metadata={
                "marketTrend": market_overview_data.get('trend'),
                "crashProbability": crash_risk_data.get('crash_probability_percent'),
                "investmentSignal": investment_signal_data.get('signal'),
                "date": datetime.now().isoformat(),
                "source": "market_analysis"
            }
        )
        
        return market_context
        
    except Exception as e:
        print(f"⚠️ Market data fetch error: {e}")
        return "Market data temporarily unavailable."


def _build_stats_context(fresh_stats: dict) -> tuple:
    """Build stats and goals context strings"""
    
    stats_context = ""
    goals_context = ""
    
    if fresh_stats:
        invested_amount = fresh_stats.get('investedAmount', 0) or 0
        investment_rate = fresh_stats.get('investmentRate', 0) or 0
        net_worth = fresh_stats.get('netWorth', 0) or 0
        
        investment_info = f"Total Invested Amount: ₹{invested_amount}" if invested_amount > 0 else "Total Invested Amount: ₹0"
        
        stats_context = (
            f"Monthly Income: ₹{fresh_stats.get('monthlyIncome', 0)}\n"
            f"Monthly Expense: ₹{fresh_stats.get('monthlyExpense', 0)}\n"
            f"Savings Rate: {fresh_stats.get('savingsRate', 0)}%\n"
            f"{investment_info}\n"
            f"Net Worth: ₹{net_worth}\n"
        )
        
        goal_stats = fresh_stats.get('goalStats', [])
        if goal_stats:
            active_goals = [g for g in goal_stats if g.get('status') != 'completed']
            if active_goals:
                goals_list = []
                for goal in active_goals[:5]:
                    remaining = goal.get('targetAmount', 0) - goal.get('currentAmount', 0)
                    progress = goal.get('progress', 0)
                    goals_list.append(
                        f"Goal: {goal.get('name', 'Unknown')} | "
                        f"₹{goal.get('currentAmount', 0)}/₹{goal.get('targetAmount', 0)} ({progress}%)"
                    )
                goals_context = "\n".join(goals_list)
    
    return stats_context, goals_context
