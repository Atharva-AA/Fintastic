"""
Helper utility functions
"""

import os
import httpx
from typing import Dict, Any, List, Tuple
from config import NODE_BACKEND_URL, AI_SECRET, SERVICE_JWT, GIG_CATEGORIES


async def get_latest_financial_data(user_id: str) -> Dict[str, Any]:
    """Fetch latest comprehensive financial data from consolidated endpoint."""
    headers = {
        "Content-Type": "application/json",
        "x-internal-access": "true"
    }
    if AI_SECRET:
        headers["x-ai-secret"] = AI_SECRET
    
    params = {"userId": user_id}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{NODE_BACKEND_URL}/api/latest-data/latest",
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


def service_headers() -> Dict[str, str]:
    """Build headers for service-to-service communication"""
    headers = {"Content-Type": "application/json"}
    if SERVICE_JWT:
        headers["Authorization"] = f"Bearer {SERVICE_JWT}"
    return headers


def detect_gig_worker(
    transactions: List[Dict[str, Any]],
    is_gig_worker_from_payload: bool = False,
    gig_indicators_from_payload: List[str] = None
) -> Tuple[bool, float, List[str]]:
    """
    Detect if user is a gig worker based on transactions and payload data.
    Returns: (is_gig_worker, gig_income_total, gig_indicators)
    """
    has_gig_income = is_gig_worker_from_payload
    gig_income_total = 0
    gig_indicators = (gig_indicators_from_payload or []).copy()
    
    if transactions:
        for t in transactions:
            if t.get("type") == "income":
                category = (t.get("category") or "").lower()
                note = (t.get("note") or "").lower()
                
                if any(indicator in category or indicator in note for indicator in GIG_CATEGORIES):
                    has_gig_income = True
                    gig_income_total += abs(t.get("amount", 0))
                    
                    cat = t.get("category")
                    if cat and cat not in gig_indicators:
                        gig_indicators.append(cat)
    
    return has_gig_income, gig_income_total, gig_indicators


def analyze_transactions(transactions: List[Dict[str, Any]]) -> str:
    """Analyze transactions and return a formatted analysis string"""
    if not transactions:
        return ""
    
    # Group by type
    expenses = [t for t in transactions if t.get("type") == "expense"]
    incomes = [t for t in transactions if t.get("type") == "income"]
    savings = [t for t in transactions if t.get("type") == "saving"]
    investments = [t for t in transactions if t.get("type") == "investment"]
    
    # Category breakdown
    category_spending = {}
    category_counts = {}
    for t in expenses:
        cat = t.get("category", "Other")
        amt = abs(t.get("amount", 0))
        category_spending[cat] = category_spending.get(cat, 0) + amt
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    # Large transactions
    large_transactions = [t for t in transactions if abs(t.get("amount", 0)) > 5000]
    
    # Date range
    date_range = "Recent period"
    if transactions:
        dates = [t.get("occurredAt") or t.get("createdAt") for t in transactions if t.get("occurredAt") or t.get("createdAt")]
        if dates:
            from datetime import datetime as dt
            try:
                sorted_dates = sorted([dt.fromisoformat(str(d).replace('Z', '+00:00')) if isinstance(d, str) else d for d in dates])
                date_range = f"{sorted_dates[0].strftime('%d %b')} - {sorted_dates[-1].strftime('%d %b %Y')}"
            except:
                pass
    
    # Build category analysis
    category_analysis = []
    for cat, amt in sorted(category_spending.items(), key=lambda x: x[1], reverse=True)[:5]:
        count = category_counts.get(cat, 0)
        avg = amt / count if count > 0 else 0
        category_analysis.append(f"- {cat}: ₹{amt:,.0f} across {count} transactions (avg: ₹{avg:,.0f} per transaction)")
    
    # Calculate percentages
    total_expense = sum(abs(t.get('amount', 0)) for t in expenses)
    category_percentages = []
    for cat, amt in sorted(category_spending.items(), key=lambda x: x[1], reverse=True)[:5]:
        pct = (amt / total_expense * 100) if total_expense > 0 else 0
        category_percentages.append(f"- {cat}: {pct:.1f}% of total expenses")
    
    return f"""
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
"""
