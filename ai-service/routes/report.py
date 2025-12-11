"""
Financial Report route handler
"""

import json
from datetime import datetime
from typing import Any, Dict

from schemas import MarketDataRequest
from tools import tavily_search, store_memory_entry
from prompts import build_report_prompt
from node_client import get_user_stats_tool


async def handle_report_request(data: MarketDataRequest, client, model: str) -> Dict[str, Any]:
    """Generate personalized financial report"""
    
    user_id = data.userId
    timeframe = data.timeframe or "weekly"
    
    # Fetch user financial data
    fresh_stats = get_user_stats_tool(user_id)
    if not fresh_stats:
        return {"success": False, "error": "Could not fetch user financial data"}
    
    # Build user context
    user_context = {
        "monthlyIncome": fresh_stats.get("monthlyIncome", 0),
        "monthlyExpense": fresh_stats.get("monthlyExpense", 0),
        "savingsRate": fresh_stats.get("savingsRate", 0),
        "investmentRate": fresh_stats.get("investmentRate", 0),
        "netWorth": fresh_stats.get("netWorth", 0),
        "liquidSavings": fresh_stats.get("liquidSavings", 0),
        "investedAmount": fresh_stats.get("investedAmount", 0),
        "goals": fresh_stats.get("goalStats", [])
    }
    
    # Fetch market context
    market_context = ""
    try:
        market_search = tavily_search(f"Indian stock market news today {datetime.now().strftime('%Y-%m-%d')}")
        market_context = market_search[:500] if market_search else ""
    except Exception as e:
        print(f"⚠️ Market search error: {e}")
    
    # Build prompt
    system_prompt = build_report_prompt(
        user_context=user_context,
        timeframe=timeframe,
        market_context=market_context
    )
    
    try:
        result = await client.chat.completions.create(
            model=model,
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Generate my {timeframe} financial report."}
            ]
        )
        
        report = json.loads(result.choices[0].message.content.strip())
        report["generatedAt"] = datetime.utcnow().isoformat() + "Z"
        report["timeframe"] = timeframe
        
        # Store memory
        store_memory_entry(
            user_id,
            f"Generated {timeframe} financial report on {datetime.now().strftime('%Y-%m-%d')}",
            "report_history",
            {"timeframe": timeframe, "date": datetime.now().isoformat()}
        )
        
        return {"success": True, "report": report}
        
    except Exception as e:
        print(f"❌ Report generation error: {e}")
        return {"success": False, "error": str(e)}
