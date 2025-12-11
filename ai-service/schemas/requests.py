"""
Request/Response Pydantic models for API endpoints
"""

from pydantic import BaseModel
from typing import Any, Optional, Dict, List


class MemoryRequest(BaseModel):
    """Request model for storing memories"""
    id: str
    userId: str
    content: str
    type: Optional[str] = "general"
    metadata: Optional[Dict] = {}


class QueryRequest(BaseModel):
    """Request model for memory search"""
    userId: str
    query: str
    topK: Optional[int] = 5


class Input(BaseModel):
    """Request model for transaction classification"""
    amount: int
    description: str


class InsightRequest(BaseModel):
    """Request model for AI insights generation"""
    userId: str
    transactionId: Optional[str] = None
    alert: Optional[Dict[str, Any]] = None
    stats: Optional[Dict[str, Any]] = None
    dataConfidence: Optional[str] = "low"
    goals: List[Dict[str, Any]] = []
    behaviorProfile: Dict[str, Any] = {}
    page: Optional[str] = "coach"
    recentTransactions: Optional[List[Dict[str, Any]]] = []
    isGigWorker: Optional[bool] = False
    gigWorkerIndicators: Optional[List[str]] = []


class ChatMessage(BaseModel):
    """Model for chat message"""
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request model for AI chat"""
    userId: str
    message: str
    chatHistory: List[ChatMessage] = []
    relevantMemories: List[Dict[str, Any]] = []
    behaviorProfile: Optional[Dict[str, Any]] = None
    isGigWorker: Optional[bool] = False
    gigWorkerIndicators: Optional[List[str]] = []


class AgentPlan(BaseModel):
    """Model for agent execution plan"""
    intent: str
    needs_confirmation: bool
    tool: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    response_to_user: str


class ExecuteRequest(BaseModel):
    """Request model for executing agent plan"""
    userId: str
    plan: AgentPlan


class MarketDataRequest(BaseModel):
    """Request model for market data"""
    symbol: str


class DailyMentorRequest(BaseModel):
    """Request model for daily mentor generation"""
    userId: str
    name: str
    today: Dict[str, Any]
    stats: Dict[str, Any]
    goals: List[Dict[str, Any]] = []
    behaviorPatterns: List[str] = []
    riskTrends: Dict[str, Any] = {}
    behaviorProfile: Optional[Dict[str, Any]] = None
    memories: List[str] = []  # Deprecated - use behaviorPatterns instead
