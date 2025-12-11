"""
AI Insights route handler
"""

import json
from datetime import datetime as dt_datetime
from typing import Any, Dict

from schemas import InsightRequest
from tools import build_behavior_context, store_memory_entry
from node_client import fetch_recent_transactions
from config import GIG_CATEGORIES


async def handle_insights_request(data: InsightRequest, client, model: str) -> Dict[str, Any]:
    """Handle AI insights generation request"""
    
    user_id = data.userId
    alert = data.alert
    if not alert:
        return {"success": False, "error": "alert is required for transaction insights"}
    
    stats = data.stats or {}
    goals = data.goals or []
    behavior_meta = build_behavior_context(data.behaviorProfile)
    page = (data.page or "coach").lower()
    data_confidence = data.dataConfidence or "high"
    
    # Fetch recent transactions if not provided
    recent_transactions = data.recentTransactions or []
    if not recent_transactions or len(recent_transactions) == 0:
        print(f"📊 [AI Insights] Fetching recent transactions for page: {page}")
        recent_transactions = fetch_recent_transactions(user_id, page, limit=20)
        print(f"📊 [AI Insights] Fetched {len(recent_transactions)} transactions")
    
    # Extract behavior flags
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
    
    # Detect gig worker
    is_gig_worker = data.isGigWorker or False
    gig_indicators = data.gigWorkerIndicators or []
    
    if recent_transactions and not is_gig_worker:
        for t in recent_transactions:
            if t.get("type") == "income":
                category = (t.get("category") or "").lower()
                note = (t.get("note") or "").lower()
                if any(indicator in category or indicator in note for indicator in GIG_CATEGORIES):
                    is_gig_worker = True
                    if t.get("category") and t.get("category") not in gig_indicators:
                        gig_indicators.append(t.get("category"))
    
    # Meaningfulness filter
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
    
    print(f"\n🧠 Generating INSIGHT for User: {user_id} | Alert: {alert.get('id')} | "
          f"Level: {alert.get('level')} | Page: {page} | Gig Worker: {is_gig_worker}")
    
    # Goal metadata for prediction
    goal_metadata = {}
    if alert_metadata.get('needsPrediction'):
        goal_metadata = {
            'needsPrediction': True,
            'goalId': alert_metadata.get('goalId'),
            'goalName': alert_metadata.get('goalName'),
            'targetAmount': alert_metadata.get('targetAmount'),
            'currentAmount': alert_metadata.get('currentAmount', 0),
            'deadline': alert_metadata.get('deadline'),
            'priority': alert_metadata.get('priority')
        }
    
    # Build system prompt
    system_prompt = _build_insight_system_prompt(
        alert, stats, goals, recent_transactions,
        behavior_flags, is_gig_worker, gig_indicators, goal_metadata
    )
    
    try:
        result = await client.chat.completions.create(
            model=model,
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Generate the JSON response now. Remember: no markdown, no extra text, only JSON."}
            ],
        )
        
        raw_response = result.choices[0].message.content.strip()
        print("\n🧾 RAW AI RESPONSE:\n", raw_response)
        
        try:
            full_insights = json.loads(raw_response)
        except json.JSONDecodeError:
            first = raw_response.find("{")
            last = raw_response.rfind("}")
            if first != -1 and last != -1:
                full_insights = json.loads(raw_response[first:last + 1])
            else:
                raise ValueError("No JSON object found in response")
        
        # Validate structure
        if "reports" not in full_insights:
            raise ValueError("Missing 'reports' key in response")
        
        if "classifiedType" not in full_insights:
            full_insights["classifiedType"] = page or "general"
        
        # Ensure all reports have required fields
        required_report_keys = ["title", "summary", "positive", "warning", "actionStep"]
        for report_type in ["income", "expense", "investment", "savings", "goals"]:
            if report_type not in full_insights["reports"]:
                full_insights["reports"][report_type] = {
                    "title": f"{report_type.capitalize()} Insight",
                    "summary": "No specific insights available for this area.",
                    "positive": "Continue monitoring your financial health.",
                    "warning": "Keep tracking your transactions.",
                    "actionStep": "Review your financial dashboard regularly."
                }
            else:
                for key in required_report_keys:
                    if key not in full_insights["reports"][report_type]:
                        full_insights["reports"][report_type][key] = ""
        
        if "prediction" not in full_insights["reports"].get("goals", {}):
            full_insights["reports"]["goals"]["prediction"] = ""
        
        if "updatedAt" not in full_insights:
            full_insights["updatedAt"] = dt_datetime.utcnow().isoformat() + "Z"
        
        return {
            "success": True,
            "userId": user_id,
            "alertId": alert.get("id"),
            "page": page,
            "fullInsights": full_insights,
            "updatedAt": full_insights["updatedAt"]
        }
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        
        # Handle rate limit errors
        if "RateLimitError" in error_type or "429" in error_msg or "rate_limit" in error_msg.lower():
            print(f"⚠️ [AI Insights] Groq rate limit reached. Using fallback.")
            return _create_fallback_insights(user_id, alert, page)
        
        print(f"❌ Error in /ai/insights: {error_type}: {error_msg}")
        return {"success": False, "error": error_msg, "error_type": error_type}


def _build_insight_system_prompt(
    alert, stats, goals, recent_transactions,
    behavior_flags, is_gig_worker, gig_indicators, goal_metadata
) -> str:
    """Build the insight generation system prompt"""
    
    return f"""You are the AI Insights Engine for FINtastic.

Your responsibilities:
1. Fully understand the alert, stats, recentTransactions, goals, behavior flags, gig indicators.
2. Correctly classify the alert type.
3. Produce 5 stable financial insights (Income, Expense, Investment, Savings, Goals).
4. Always produce valid pure JSON (no text outside JSON).
5. Keep insights simple, actionable, Indian-finance friendly.

----------------------------------------------------------------
OUTPUT FORMAT (STRICT)
----------------------------------------------------------------

Return EXACT JSON in this schema:

{{
  "classifiedType": "income | expense | investment | savings | goals | general",
  "updatedAt": "{dt_datetime.utcnow().isoformat()}Z",
  "reports": {{
      "income": {{"title": "Income Insight", "summary": "...", "positive": "...", "warning": "...", "actionStep": "..."}},
      "expense": {{"title": "Expense Insight", "summary": "...", "positive": "...", "warning": "...", "actionStep": "..."}},
      "investment": {{"title": "Investment Insight", "summary": "...", "positive": "...", "warning": "...", "actionStep": "..."}},
      "savings": {{"title": "Savings Insight", "summary": "...", "positive": "...", "warning": "...", "actionStep": "..."}},
      "goals": {{"title": "Goals Insight", "summary": "...", "positive": "...", "warning": "...", "actionStep": "...", "prediction": ""}}
  }}
}}

----------------------------------------------------------------
ALERT DETAILS
----------------------------------------------------------------

Alert ID: {alert.get('id', 'N/A')}
Level: {alert.get('level', 'MEDIUM')}
Scope: {alert.get('scope', 'overall')}
Title: {alert.get('title', 'Financial Alert')}
Reasons: {', '.join(alert.get('reasons', []))}

Behavior Flags:
- Behavior Drift: {behavior_flags['behaviorDrift']}
- Micro Leak: {behavior_flags['microLeak']}
- Spending Burst: {behavior_flags['spendingBurst']}
- Improvement Trend: {behavior_flags['improvementTrend']}
- Recovery: {behavior_flags['recovery']}
- Risk Score: {behavior_flags['riskScore']}
- Positivity Score: {behavior_flags['positivityScore']}

STATS: {json.dumps(stats, indent=2) if stats else 'No stats available'}

GOALS: {json.dumps([{{'name': g.get('name'), 'targetAmount': g.get('targetAmount'), 'currentAmount': g.get('currentAmount'), 'deadline': g.get('deadline')}} for g in goals[:5]], indent=2) if goals else 'No goals set'}

RECENT TRANSACTIONS: {json.dumps(recent_transactions[:20], indent=2) if recent_transactions else 'No recent transactions'}

Is Gig Worker: {is_gig_worker}
Gig Indicators: {', '.join(gig_indicators) if gig_indicators else 'None'}

Goal Metadata: {json.dumps(goal_metadata, indent=2) if goal_metadata else 'No goal metadata'}

Return ONLY the JSON object, nothing else."""


def _create_fallback_insights(user_id: str, alert: dict, page: str) -> dict:
    """Create fallback insights when AI is unavailable"""
    
    fallback_insights = {
        "classifiedType": alert.get("scope", "general"),
        "updatedAt": dt_datetime.utcnow().isoformat() + "Z",
        "reports": {
            "income": {
                "title": "Income Insight",
                "summary": "AI insights temporarily unavailable due to rate limits.",
                "positive": "Continue tracking your income for better insights.",
                "warning": "Monitor your income patterns regularly.",
                "actionStep": "Review your income dashboard."
            },
            "expense": {
                "title": "Expense Insight",
                "summary": "AI insights temporarily unavailable due to rate limits.",
                "positive": "Continue tracking your expenses.",
                "warning": f"Review your {alert.get('scope', 'spending')} patterns.",
                "actionStep": "Check your expense dashboard."
            },
            "investment": {
                "title": "Investment Insight",
                "summary": "AI insights temporarily unavailable due to rate limits.",
                "positive": "Keep monitoring your investments.",
                "warning": "Review your investment portfolio regularly.",
                "actionStep": "Check your investment dashboard."
            },
            "savings": {
                "title": "Savings Insight",
                "summary": "AI insights temporarily unavailable due to rate limits.",
                "positive": "Continue building your savings.",
                "warning": "Monitor your savings rate.",
                "actionStep": "Review your savings goals."
            },
            "goals": {
                "title": "Goals Insight",
                "summary": "AI insights temporarily unavailable due to rate limits.",
                "positive": "Keep working towards your goals.",
                "warning": "Review your goal progress regularly.",
                "actionStep": "Check your goals dashboard.",
                "prediction": ""
            }
        }
    }
    
    return {
        "success": True,
        "userId": user_id,
        "alertId": alert.get("id"),
        "page": page,
        "fullInsights": fallback_insights,
        "fallback": True
    }
