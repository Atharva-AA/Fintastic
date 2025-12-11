"""
Financial report prompts for AI report generation
"""

import json
from typing import Dict, Any, List
from datetime import datetime


def build_report_prompt(
    stats: Dict[str, Any],
    behavior: Dict[str, Any],
    transactions: List[Dict[str, Any]],
    goals: List[Dict[str, Any]],
    alerts: List[Dict[str, Any]],
    gig_context: str = "",
    transaction_analysis: str = ""
) -> str:
    """Build the comprehensive financial report prompt"""
    
    return f"""
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
- ❌ NOT use phrases like: "per week", "per month", "average", "trend"

Instead you MUST ONLY:
1. Welcome the user personally (by name if present in data)
2. Confirm onboarding is complete
3. Restate FACTS provided (income, expense, savings, goals)
4. Mention real insights will start after transactions are added

==================================================
MODE 2: REAL DATA PRESENT (TRANSACTIONS AVAILABLE)
==================================================
Trigger MODE 2 ONLY IF:
- RecentTransactions.length > 0
- AND no item contains "onboarding"
- AND Stats.source != "bootstrap"
- AND Stats.mode == "REAL_DATA"

In MODE 2 you MUST create a COMPREHENSIVE FINANCIAL REPORT that:
- ✅ Analyzes transaction patterns from ACTUAL transaction data
- ✅ Identifies spending categories using REAL transaction amounts
- ✅ Links insights with Goals & Alerts
- ✅ Provides actionable, data-driven recommendations
- ✅ References specific transactions, amounts, and dates

REPORT STRUCTURE (MODE 2):
1. Summary: 2-3 sentences capturing overall financial health
2. Strengths: List 3-5 positive financial behaviors with SPECIFIC AMOUNTS
3. Risks: List 3-5 concerns with SPECIFIC CATEGORIES and AMOUNTS
4. Recommendations: 3-5 SPECIFIC, ACTIONABLE steps with EXACT AMOUNTS

==================================================
STRICT OUTPUT FORMAT
==================================================
Return VALID JSON ONLY

{{
  "summary": "2-3 sentences describing overall financial health",
  "strengths": ["Strength 1", "Strength 2", "..."],
  "risks": ["Risk 1", "Risk 2", "..."],
  "suggestions": ["Actionable recommendation 1", "..."],
  "key_points": ["Key point 1", "Key point 2", "..."],
  "recommendations": ["Recommendation 1", "Recommendation 2", "..."]
}}

Rules:
- Use ₹ for money values
- Never repeat wording
- Do NOT hallucinate / guess numbers
- Reference actual transaction data
- If data is missing write: "Insufficient real transaction data"

{gig_context}

Use ONLY this trusted data:
{transaction_analysis}
Stats: {json.dumps(stats, ensure_ascii=False)}
BehaviorProfile: {json.dumps(behavior, ensure_ascii=False)}
Goals: {json.dumps(goals, ensure_ascii=False)}
ActiveAlerts: {json.dumps(alerts, ensure_ascii=False)}
RecentTransactions: {json.dumps(transactions, ensure_ascii=False)}
"""


def build_daily_mentor_prompt(
    name: str,
    today: str,
    today_income: float,
    today_expense: float,
    today_saving: float,
    today_investment: float,
    top_category: str,
    transaction_count: int,
    savings_rate: float,
    investment_rate: float,
    net_worth: float,
    monthly_income: float,
    monthly_expense: float,
    goals_text: str,
    trend_text: str,
    behavior_profile_text: str,
    behavior_context: str,
    discipline: int = 50,
    impulse: int = 50,
) -> str:
    """Build the daily mentor prompt"""
    
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
Monthly Income: ₹{monthly_income:,}
Monthly Expense: ₹{monthly_expense:,}

--- ACTIVE GOALS ---
{goals_text if goals_text else "No active goals"}

{trend_text}

{behavior_profile_text}

--- BEHAVIOR PATTERNS (FROM MEMORY) ---
{behavior_context if behavior_context else "No significant patterns detected"}
"""

    return f"""
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
- confidenceScore: Higher if more data available
- strength: Highlight ONE best thing
  * If discipline > 75: Include praise about their discipline
- weakness: Highlight ONE risk
  * If impulse > 70: Include warning about impulse spending
- Use ₹ for currency, format numbers with commas
- Be professional, data-driven, and motivating
"""
