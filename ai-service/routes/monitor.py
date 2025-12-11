"""
Daily Monitor route handler
"""

import json
from datetime import datetime
from typing import Any, Dict

from tools import store_memory_entry, build_behavior_context
from node_client import fetch_recent_transactions
from config import GIG_CATEGORIES


async def handle_daily_monitor(data: dict, client, model: str) -> Dict[str, Any]:
    """Handle daily financial monitoring"""
    
    user_id = data.get("userId")
    if not user_id:
        return {"success": False, "error": "userId is required"}
    
    # Fetch recent transactions
    recent_transactions = fetch_recent_transactions(user_id, "daily", limit=50)
    
    if not recent_transactions or len(recent_transactions) == 0:
        return {
            "success": True,
            "message": "No recent transactions to analyze",
            "alerts": []
        }
    
    # Analyze transactions
    analysis = _analyze_daily_transactions(recent_transactions)
    
    # Check for gig income patterns
    gig_income = _detect_gig_income(recent_transactions)
    
    # Build prompt
    system_prompt = _build_daily_monitor_prompt(analysis, gig_income)
    
    try:
        result = await client.chat.completions.create(
            model=model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Analyze today's financial activity and generate alerts."}
            ]
        )
        
        response = json.loads(result.choices[0].message.content.strip())
        
        # Store analysis memory
        store_memory_entry(
            user_id,
            f"Daily monitor: {len(recent_transactions)} transactions analyzed on {datetime.now().strftime('%Y-%m-%d')}",
            "monitor_history",
            {
                "transactionCount": len(recent_transactions),
                "alerts": len(response.get("alerts", [])),
                "date": datetime.now().isoformat()
            }
        )
        
        return {
            "success": True,
            "analysis": response,
            "transactionCount": len(recent_transactions),
            "generatedAt": datetime.utcnow().isoformat() + "Z"
        }
        
    except Exception as e:
        print(f"❌ Daily monitor error: {e}")
        return {"success": False, "error": str(e)}


def _analyze_daily_transactions(transactions: list) -> dict:
    """Analyze transactions for patterns"""
    
    total_income = 0
    total_expense = 0
    categories = {}
    expense_count = 0
    income_count = 0
    
    for tx in transactions:
        amount = abs(tx.get("amount", 0))
        tx_type = tx.get("type", "expense")
        category = tx.get("category", "Other")
        
        if tx_type == "income":
            total_income += amount
            income_count += 1
        elif tx_type == "expense":
            total_expense += amount
            expense_count += 1
            
            if category not in categories:
                categories[category] = {"amount": 0, "count": 0}
            categories[category]["amount"] += amount
            categories[category]["count"] += 1
    
    # Find top spending categories
    top_categories = sorted(categories.items(), key=lambda x: x[1]["amount"], reverse=True)[:5]
    
    return {
        "totalIncome": total_income,
        "totalExpense": total_expense,
        "netFlow": total_income - total_expense,
        "incomeCount": income_count,
        "expenseCount": expense_count,
        "topCategories": [{"name": c[0], **c[1]} for c in top_categories],
        "averageExpense": total_expense / expense_count if expense_count > 0 else 0
    }


def _detect_gig_income(transactions: list) -> dict:
    """Detect gig/freelance income patterns"""
    
    gig_transactions = []
    total_gig = 0
    
    for tx in transactions:
        if tx.get("type") == "income":
            category = (tx.get("category") or "").lower()
            note = (tx.get("note") or "").lower()
            
            if any(indicator in category or indicator in note for indicator in GIG_CATEGORIES):
                gig_transactions.append(tx)
                total_gig += abs(tx.get("amount", 0))
    
    return {
        "hasGigIncome": len(gig_transactions) > 0,
        "gigTransactionCount": len(gig_transactions),
        "totalGigIncome": total_gig,
        "platforms": list(set([t.get("category") for t in gig_transactions if t.get("category")]))
    }


def _build_daily_monitor_prompt(analysis: dict, gig_income: dict) -> str:
    """Build daily monitoring prompt"""
    
    return f"""You are a daily financial monitor for FINtastic.

Analyze the user's daily financial activity and generate relevant alerts.

TODAY'S ANALYSIS:
- Total Income: ₹{analysis['totalIncome']}
- Total Expense: ₹{analysis['totalExpense']}
- Net Flow: ₹{analysis['netFlow']}
- Income Transactions: {analysis['incomeCount']}
- Expense Transactions: {analysis['expenseCount']}
- Average Expense: ₹{analysis['averageExpense']:.2f}

Top Spending Categories: {json.dumps(analysis['topCategories'], indent=2)}

Gig Income: {json.dumps(gig_income, indent=2)}

Return JSON:
{{
  "summary": "Brief one-line summary",
  "alerts": [
    {{
      "level": "INFO | WARNING | CRITICAL",
      "title": "Alert title",
      "message": "Alert message",
      "category": "spending | income | pattern"
    }}
  ],
  "insights": [
    "Insight 1",
    "Insight 2"
  ],
  "recommendation": "Action recommendation"
}}

Rules:
1. Generate alerts only if patterns warrant attention
2. Be concise and actionable
3. Consider Indian context (UPI, gig economy, etc.)
4. Highlight positive patterns too (INFO level)
"""
