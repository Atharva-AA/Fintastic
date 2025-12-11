"""
AI Execute route handler - executes planned actions
"""

import json
from typing import Any, Dict

from schemas import ExecuteRequest, AgentPlan
from tools import tavily_search, get_stock_market_data, get_sip_ideas, get_insurance_ideas, store_memory_entry
from node_client import (
    add_transaction_tool, update_transaction_tool, delete_transaction_tool,
    get_transactions_tool, create_goal_tool
)
from config import GROQ_MODEL


async def handle_execute_request(data: ExecuteRequest, client, model: str) -> Dict[str, Any]:
    """Execute a previously planned action"""
    
    print("⚙️ /ai/execute CALLED")
    print(f"⚙️ TOOL: {data.plan.tool if data.plan else 'NO PLAN'}")
    print(f"⚙️ USER_ID: {data.userId}")
    
    user_id = data.userId
    plan: AgentPlan = data.plan
    tool = plan.tool
    params = plan.params or {}
    
    result = None
    reflection = ""
    
    try:
        # Transaction operations
        if tool == "add_transaction":
            result = add_transaction_tool(
                user_id=user_id,
                tx_type=params.get("type", "expense"),
                category=params.get("category", "Other"),
                amount=float(params.get("amount", 0)),
                note=params.get("note", "")
            )
            
            goal_info = result.get("goal") if isinstance(result, dict) else None
            if goal_info and params.get("type") in ["saving", "investment"]:
                reflection = (
                    f"Added {params.get('type')} of ₹{params.get('amount')} in {params.get('category')}. "
                    f"Contributed to goal '{goal_info.get('goalName')}'."
                )
            else:
                reflection = f"Added {params.get('type')} of ₹{params.get('amount')} in {params.get('category')}."
        
        elif tool == "update_transaction":
            transaction_id = params.get("transactionId")
            if not transaction_id or transaction_id == "None":
                return {"success": False, "error": "transactionId is required"}
            
            result = update_transaction_tool(user_id, transaction_id, params.get("fields", {}))
            reflection = f"Updated transaction {transaction_id}."
        
        elif tool == "delete_transaction":
            transaction_id = params.get("transactionId")
            if not transaction_id or transaction_id == "None":
                return {"success": False, "error": "transactionId is required"}
            
            result = delete_transaction_tool(user_id, transaction_id)
            reflection = f"Deleted transaction {transaction_id}."
        
        elif tool == "get_transactions":
            result = get_transactions_tool(user_id, params.get("filters", {}))
            reflection = "Retrieved transaction overview."
        
        # Web search
        elif tool == "tavily_search":
            answer = tavily_search(params.get("query", ""))
            result = {"answer": answer}
            reflection = f"Searched: {params.get('query')}."
        
        # Market data
        elif tool == "market_data":
            symbol = params.get("symbol") or params.get("investment_type") or "shares"
            if symbol.lower() in ["shares", "stocks", "equity"]:
                symbol = "Indian stock market"
            
            raw_info = get_stock_market_data(symbol)
            user_message = params.get("userMessage", "").lower()
            is_price_query = any(word in user_message for word in ["price", "value", "current", "what is"])
            
            if is_price_query:
                result = await _extract_price_info(client, model, symbol, raw_info)
            else:
                result = await _analyze_stock(client, model, symbol, raw_info, params)
            
            reflection = f"Market data for {symbol}."
            store_memory_entry(user_id, reflection, "decision_history", {"symbol": symbol, "kind": "stock"})
        
        # SIP recommendation
        elif tool == "sip_recommender":
            risk = params.get("riskLevel", "medium")
            monthly_amount = float(params.get("monthlyAmount", 3000))
            goal = params.get("goalName", "wealth creation")
            
            raw_info = get_sip_ideas(risk, monthly_amount, goal)
            result = await _generate_sip_recommendation(client, model, risk, monthly_amount, goal, raw_info)
            reflection = f"SIP suggestions for goal {goal}."
            store_memory_entry(user_id, reflection, "decision_history", {"kind": "sip", "goal": goal})
        
        # Insurance recommendation
        elif tool == "insurance_matcher":
            age = int(params.get("age", 25))
            dependents = int(params.get("dependents", 0))
            income = float(params.get("income", 0))
            
            raw_info = get_insurance_ideas(age, dependents, income)
            result = await _generate_insurance_recommendation(client, model, age, dependents, income, raw_info)
            reflection = f"Insurance advice generated."
            store_memory_entry(user_id, reflection, "decision_history", {"kind": "insurance"})
        
        # Goal creation
        elif tool == "create_goal":
            name = params.get("name", "").strip()
            target_amount = params.get("targetAmount")
            deadline = params.get("deadline")
            priority = params.get("priority", "good_to_have")
            
            if not name:
                return {"success": False, "error": "Goal name is required"}
            
            try:
                target_amount = float(target_amount) if target_amount else 0
            except (ValueError, TypeError):
                return {"success": False, "error": "Invalid targetAmount"}
            
            if target_amount <= 0:
                return {"success": False, "error": "targetAmount must be greater than 0"}
            
            if priority not in ["must_have", "good_to_have"]:
                priority = "good_to_have"
            
            result = create_goal_tool(user_id, name, target_amount, deadline, priority)
            reflection = f"Created goal: {name} with target ₹{target_amount}."
        
        else:
            return {"success": False, "error": f"Unknown tool: {tool}"}
        
        # Store behavior memory
        if reflection:
            store_memory_entry(user_id, reflection, "chat_behavior", {"tool": tool, "source": "ai"})
        
        return {"success": True, "tool": tool, "result": result}
        
    except Exception as e:
        print(f"❌ ai_execute error: {e}")
        import traceback
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}


async def _extract_price_info(client, model: str, symbol: str, raw_info: str) -> dict:
    """Extract price information from search results"""
    
    prompt = f"""Extract ONLY the current stock price from:

{raw_info}

Return JSON:
{{
  "symbol": "{symbol}",
  "current_price": "price or 'Not available'",
  "price_date": "date or 'Not available'",
  "day_change": "change or 'Not available'",
  "market": "NSE or BSE",
  "brief_summary": "one sentence summary"
}}"""
    
    try:
        result = await client.chat.completions.create(
            model=model,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": "Extract now."}]
        )
        return {"symbol": symbol, "price_info": json.loads(result.choices[0].message.content.strip()), "type": "price_query"}
    except:
        return {"symbol": symbol, "price_info": {"current_price": "Unable to extract"}, "type": "price_query"}


async def _analyze_stock(client, model: str, symbol: str, raw_info: str, params: dict) -> dict:
    """Analyze stock for investment advice"""
    
    prompt = f"""Analyze this stock for investment:

USER: Risk: {params.get("riskLevel", "medium")}, Goals: {params.get("goalNames", "wealth building")}

DATA: {raw_info[:1000]}

Return JSON:
{{
  "symbol": "{symbol}",
  "current_price_info": "brief info",
  "decision": "BUY | HOLD | AVOID",
  "confidence": "low | medium | high",
  "reason": "2-3 sentences",
  "suggested_allocation_range": "amount or percentage"
}}"""
    
    try:
        result = await client.chat.completions.create(
            model=model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": "Analyze now."}]
        )
        return json.loads(result.choices[0].message.content.strip())
    except:
        return {"symbol": symbol, "decision": "HOLD", "confidence": "low", "reason": "Analysis unavailable"}


async def _generate_sip_recommendation(client, model: str, risk: str, amount: float, goal: str, raw_info: str) -> dict:
    """Generate SIP recommendations"""
    
    prompt = f"""You are an Indian mutual fund advisor.

USER: Risk: {risk}, Monthly SIP: ₹{amount}, Goal: {goal}

WEB DATA: {raw_info}

Return JSON:
{{
  "goal": "{goal}",
  "monthlyAmount": {amount},
  "recommendations": [
    {{"name": "", "category": "", "risk": "low|medium|high", "reason": ""}}
  ]
}}"""
    
    result = await client.chat.completions.create(
        model=model,
        temperature=0.3,
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": prompt}, {"role": "user", "content": "Generate recommendations."}]
    )
    return json.loads(result.choices[0].message.content.strip())


async def _generate_insurance_recommendation(client, model: str, age: int, dependents: int, income: float, raw_info: str) -> dict:
    """Generate insurance recommendations"""
    
    prompt = f"""You are an Indian insurance advisor.

USER: Age: {age}, Dependents: {dependents}, Monthly income: ₹{income}

WEB DATA: {raw_info}

Return JSON:
{{
  "term_insurance": {{"recommended_cover": "", "recommended_term_years": 0, "reason": ""}},
  "health_insurance": {{"recommended_cover": "", "reason": ""}},
  "suggested_providers": []
}}"""
    
    result = await client.chat.completions.create(
        model=model,
        temperature=0.3,
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": prompt}, {"role": "user", "content": "Generate recommendations."}]
    )
    return json.loads(result.choices[0].message.content.strip())
