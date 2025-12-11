"""
Tools module for Fintastic AI Service
Contains search tools, market tools, and memory operations
"""

from .search import tavily_search, get_stock_market_data, get_sip_ideas, get_insurance_ideas
from .market import market_overview, sip_forecast, crash_risk_detector, investment_signal_engine
from .memory import (
    get_importance,
    store_memory_entry,
    query_user_memories,
    merge_and_clean_memories,
    get_latest_alert_context,
    build_behavior_context,
)

__all__ = [
    # Search tools
    "tavily_search",
    "get_stock_market_data",
    "get_sip_ideas",
    "get_insurance_ideas",
    # Market tools
    "market_overview",
    "sip_forecast",
    "crash_risk_detector",
    "investment_signal_engine",
    # Memory tools
    "get_importance",
    "store_memory_entry",
    "query_user_memories",
    "merge_and_clean_memories",
    "get_latest_alert_context",
    "build_behavior_context",
]
