"""
Daily Mentor route handler
"""

import json
from datetime import datetime
from typing import Any, Dict

from schemas import DailyMentorRequest
from tools import store_memory_entry, build_behavior_context
from prompts import build_daily_mentor_prompt
from node_client import get_user_stats_tool, get_ai_alerts_tool


async def handle_daily_mentor(data: DailyMentorRequest, client, model: str) -> Dict[str, Any]:
    """Generate daily personalized mentoring message"""
    
    user_id = data.userId
    
    # Fetch user data
    stats = get_user_stats_tool(user_id)
    alerts = get_ai_alerts_tool(user_id, limit=5)
    
    behavior_meta = build_behavior_context(data.behaviorProfile)
    
    user_context = {
        "monthlyIncome": stats.get("monthlyIncome", 0) if stats else 0,
        "monthlyExpense": stats.get("monthlyExpense", 0) if stats else 0,
        "savingsRate": stats.get("savingsRate", 0) if stats else 0,
        "investmentRate": stats.get("investmentRate", 0) if stats else 0,
        "netWorth": stats.get("netWorth", 0) if stats else 0,
        "goals": stats.get("goalStats", []) if stats else [],
        "behaviorProfile": behavior_meta,
        "recentAlerts": [a.get("title") for a in alerts[:3]] if alerts else [],
        "isGigWorker": data.isGigWorker or False
    }
    
    # Build mentor prompt
    system_prompt = build_daily_mentor_prompt(user_context, datetime.now())
    
    try:
        result = await client.chat.completions.create(
            model=model,
            temperature=0.4,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Generate my daily mentoring message."}
            ]
        )
        
        mentor_response = json.loads(result.choices[0].message.content.strip())
        mentor_response["generatedAt"] = datetime.utcnow().isoformat() + "Z"
        
        # Store mentor memory
        store_memory_entry(
            user_id,
            f"Daily mentor: {mentor_response.get('title', 'Daily message')}",
            "mentor_history",
            {
                "date": datetime.now().isoformat(),
                "theme": mentor_response.get("theme", "general")
            }
        )
        
        return {"success": True, "mentor": mentor_response}
        
    except Exception as e:
        print(f"❌ Daily mentor error: {e}")
        return {"success": False, "error": str(e)}


async def run_daily_mentor_cron(user_ids: list, client, model: str) -> Dict[str, Any]:
    """Run daily mentor for multiple users (cron job)"""
    
    results = {
        "success": True,
        "processed": 0,
        "failed": 0,
        "skipped": 0,
        "users": []
    }
    
    for user_id in user_ids:
        try:
            # Create minimal request
            from schemas import DailyMentorRequest
            request = DailyMentorRequest(
                userId=user_id,
                behaviorProfile={},
                isGigWorker=False,
                gigWorkerIndicators=[]
            )
            
            result = await handle_daily_mentor(request, client, model)
            
            if result.get("success"):
                results["processed"] += 1
                results["users"].append({"userId": user_id, "status": "success"})
            else:
                results["failed"] += 1
                results["users"].append({"userId": user_id, "status": "failed", "error": result.get("error")})
                
        except Exception as e:
            results["failed"] += 1
            results["users"].append({"userId": user_id, "status": "error", "error": str(e)})
    
    results["timestamp"] = datetime.utcnow().isoformat() + "Z"
    return results
