"""
Prompts package for Fintastic AI Service
Contains all system prompts, chat prompts, and template generators
"""

from .system_prompt import SYSTEM_PROMPT, classifier_prompt
from .insight_prompts import (
    generate_income_insight_prompt,
    generate_expense_insight_prompt,
)
from .chat_prompts import build_chat_system_prompt
from .report_prompts import build_report_prompt, build_daily_mentor_prompt
from .gig_worker_prompts import build_gig_worker_context

__all__ = [
    "SYSTEM_PROMPT",
    "classifier_prompt",
    "generate_income_insight_prompt",
    "generate_expense_insight_prompt",
    "build_chat_system_prompt",
    "build_report_prompt",
    "build_daily_mentor_prompt",
    "build_gig_worker_context",
]
