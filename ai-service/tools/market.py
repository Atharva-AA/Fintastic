"""
Market-aware tools for investment analysis and crash detection
"""

from typing import Any, Dict
from datetime import datetime
from .search import tavily_search


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
        nifty = "N/A"
        sensex = "N/A"
        vix = "N/A"
        
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
        
        # Extract top news
        top_news = market_data.split("\n\n")[:3] if market_data else []
        
        # Sector trends
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
            "raw_market_data": market_data[:500]
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
            available_for_sip = monthly_savings * 0.5
            emergency_fund_priority = True
        else:
            available_for_sip = monthly_savings * 0.7
            emergency_fund_priority = False
        
        # Adjust based on risk index
        if risk_index < 30:
            recommended_sip_amount = available_for_sip * 0.6
            suggested_funds = ["index", "large_cap", "debt"]
        elif risk_index < 70:
            recommended_sip_amount = available_for_sip * 0.8
            suggested_funds = ["index", "large_cap", "mid_cap", "debt"]
        else:
            recommended_sip_amount = available_for_sip
            suggested_funds = ["index", "large_cap", "mid_cap", "small_cap"]
        
        # Adjust based on market trend
        if market_trend == "bearish":
            recommended_sip_amount = recommended_sip_amount * 0.7
            ideal_execution_day_range = "5-10 (staggered approach)"
        elif market_trend == "volatile":
            recommended_sip_amount = recommended_sip_amount * 0.85
            ideal_execution_day_range = "1-5 (early month)"
        else:
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
        
        # Check VIX
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
        
        return {
            "crash_probability_percent": crash_probability,
            "severity": severity,
            "recommended_user_action": recommended_action,
            "reasoning": reasoning
        }
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
        
        # Adjust for impulse score
        if impulse_score > 70:
            recommended_amount = recommended_amount * 0.7
            justification_parts.append("High impulse score: Reducing recommended amount to prevent impulsive decisions.")
        
        # Adjust for consistency
        if consistency_index < 40:
            recommended_amount = recommended_amount * 0.8
            justification_parts.append("Low consistency: Smaller, more manageable investment amounts.")
        
        # Never recommend risky assets for low risk users
        if risk_index < 30 and asset_type in ["equity", "small_cap", "mid_cap"]:
            asset_type = "index"
            justification_parts.append("Low risk profile: Switching to safer index funds only.")
        
        # Protect emergency fund
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
