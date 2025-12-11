"""
Gig worker specific prompts and context builders
"""

from typing import List


def build_gig_worker_context(
    gig_indicators: List[str],
    gig_income_total: float = 0,
    gig_percentage: float = 0,
    is_from_onboarding: bool = False
) -> str:
    """Build gig worker context for prompts"""
    
    source_note = "onboarding profile" if is_from_onboarding and not gig_income_total else "transaction data"
    
    income_detail = ""
    if gig_income_total > 0:
        income_detail = f"- Gig income from transactions: ₹{gig_income_total:,.0f} ({gig_percentage:.1f}% of total)"
    else:
        income_detail = "- Gig worker status from onboarding profile"
    
    indicators_text = ', '.join(gig_indicators[:5]) if gig_indicators else 'Gig worker from profile'
    
    return f"""
⚠️⚠️⚠️ GIG WORKER / FREELANCER DETECTED ⚠️⚠️⚠️
--------------------------------------------------
CRITICAL: User is a GIG WORKER/FREELANCER (detected from {source_note})
- Gig indicators: {indicators_text}
{income_detail}

🚨 YOUR RESPONSES MUST BE COMPLETELY DIFFERENT FROM SALARIED PERSON:

1. INCOME IRREGULARITY IS THE #1 RISK:
   - Gig income is UNPREDICTABLE - this is the PRIMARY concern
   - User may have ₹50,000 one month and ₹20,000 the next
   - NEVER assume stable monthly income
   - ALWAYS mention income irregularity as a key factor
   - Frame ALL advice around income uncertainty

2. EMERGENCY FUND IS CRITICAL:
   - Salaried person: 3 months expenses
   - Gig worker: 6 months expenses (DOUBLE)
   - This is NOT optional - it's essential for survival
   - Calculate based on AVERAGE monthly expense, not current month

3. SPENDING ADVICE MUST BE MORE CONSERVATIVE:
   - Large expenses are MUCH riskier with irregular income
   - Recommend maintaining 2-3x higher cash buffer
   - Category spending limits should be LOWER than for salaried
   - Never recommend spending based on "good month" income

4. GOAL PLANNING IS DIFFERENT:
   - Goal timelines must account for income variability
   - Add 20-30% buffer time to goal deadlines
   - Recommend saving MORE during good months
   - Goals should be more flexible/flexible deadlines

5. POSITIVE ASPECTS (mention but don't overemphasize):
   - Potential for higher earnings (but irregular)
   - Flexibility and multiple income streams
   - Diversification of income sources
   - BUT: These benefits require careful management

6. LANGUAGE AND TONE:
   - Use phrases like "given your irregular income", "considering income variability"
   - Frame as: "As a gig worker, you need to..."
   - Be explicit about why recommendations differ from salaried workers
   - NEVER give generic salaried-person advice

7. RECOMMENDATIONS MUST:
   - Always mention income irregularity
   - Recommend 6-month emergency fund (not 3)
   - Suggest more conservative spending limits
   - Account for income variability in calculations
   - Be specific about gig worker needs
"""
