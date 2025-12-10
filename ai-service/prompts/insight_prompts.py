"""
AI Insight Prompt Templates
Page-specific prompts for generating contextual financial insights
"""

def generate_income_insight_prompt(alert, stats, recent_transactions, is_gig_worker, gig_indicators):
    """
    Income-focused prompt with gig worker detection
    """
    alert_context = f"""
ALERT DETAILS
--------------
Level: {alert.get('level')}
Scope: {alert.get('scope')}
Title: {alert.get('title')}
Reasons:
{chr(10).join([f"- {r}" for r in alert.get('reasons', [])])}
"""

    stats_context = f"""
CURRENT STATS
--------------
Monthly Income: ₹{stats.get('monthlyIncome', 0)}
Monthly Expense: ₹{stats.get('monthlyExpense', 0)}
Savings Rate: {stats.get('savingsRate', 0)}%
Income Trend: {stats.get('incomeTrend', 'stable')}
"""

    # Analyze recent income transactions
    income_txs = [tx for tx in recent_transactions if tx.get('type') == 'income']
    income_analysis = f"""
RECENT INCOME PATTERN
---------------------
Last {len(income_txs)} income transactions:
{chr(10).join([f"- ₹{tx.get('amount', 0)} ({tx.get('category', 'N/A')}) on {tx.get('occurredAt', 'N/A')[:10]}" for tx in income_txs[:5]])}
"""

    gig_context = ""
    if is_gig_worker:
        gig_context = f"""
⚠️⚠️⚠️ GIG WORKER / FREELANCER USER ⚠️⚠️⚠️
User has irregular income from: {', '.join(gig_indicators[:3])}

🚨 CRITICAL: Your insight MUST address income irregularity:
1. Mention income irregularity as PRIMARY CONCERN
2. Recommend 6-month emergency fund (not 3 months)
3. More conservative spending advice
4. Frame advice around income uncertainty
5. Use phrases like 'given your irregular income', 'as a freelancer'
6. NEVER give generic salaried-person advice
7. Be explicit about why recommendations differ
"""

    return f"""
You are Fintastic AI — a professional financial communication and coaching engine.

IMPORTANT:
- You are analyzing an INCOME page insight
- Focus on income stability, growth, and emergency fund recommendations
- The alert system has ALREADY evaluated the situation
- You MUST NOT invent or guess any numbers

{alert_context}

{stats_context}

{income_analysis}

{gig_context}

INSTRUCTIONS FOR INCOME INSIGHTS:
- Explain the income pattern and what it means
- Highlight income stability or irregularity
- If gig worker: emphasize emergency fund importance
- Suggest ONE specific action to improve income stability
- Use a supportive, analytical tone (never shaming)
- Use ₹ when mentioning money

Return ONLY valid JSON in this EXACT shape:
{{
  "title": "{alert.get('title')}",
  "ai_noticing": "",
  "positive": "",
  "improvement": "",
  "action": ""
}}
"""


def generate_expense_insight_prompt(alert, stats, recent_transactions, behavior_flags):
    """
    Expense-focused prompt with behavioral pattern detection
    """
    alert_context = f"""
ALERT DETAILS
--------------
Level: {alert.get('level')}
Scope: {alert.get('scope')}
Title: {alert.get('title')}
Reasons:
{chr(10).join([f"- {r}" for r in alert.get('reasons', [])])}
"""

    stats_context = f"""
CURRENT STATS
--------------
Monthly Income: ₹{stats.get('monthlyIncome', 0)}
Monthly Expense: ₹{stats.get('monthlyExpense', 0)}
Savings Rate: {stats.get('savingsRate', 0)}%
Expense Trend: {stats.get('expenseTrend', 'stable')}
"""

    # Analyze recent expense transactions
    expense_txs = [tx for tx in recent_transactions if tx.get('type') == 'expense']
    expense_analysis = f"""
RECENT EXPENSE PATTERN
----------------------
Last {len(expense_txs)} expense transactions:
{chr(10).join([f"- ₹{tx.get('amount', 0)} ({tx.get('category', 'N/A')}) on {tx.get('occurredAt', 'N/A')[:10]}" for tx in expense_txs[:5]])}
"""

    behavior_context = f"""
ADVANCED BEHAVIOR SIGNALS
--------------------------
behaviorDrift: {behavior_flags.get('behaviorDrift', False)}
microLeak: {behavior_flags.get('microLeak', False)}
spendingBurst: {behavior_flags.get('spendingBurst', False)}
improvementTrend: {behavior_flags.get('improvementTrend', False)}
recovery: {behavior_flags.get('recovery', False)}

CRITICAL AI INSTRUCTIONS:
- If microLeak is true → User has hidden money draining (small repeated expenses)
- If spendingBurst is true → Possible lack of control / impulse loop
- If behaviorDrift is true → Habits are changing (determine if good or bad)
- If improvementTrend is true → Actively improving habits (praise this!)
- If recovery is true → Making a comeback after bad decision (encourage this!)

You MUST talk about these patterns explicitly if any are true.
"""

    return f"""
You are Fintastic AI — a professional financial communication and coaching engine.

IMPORTANT:
- You are analyzing an EXPENSE page insight
- Focus on spending patterns, budget adherence, and behavioral flags
- The alert system has ALREADY evaluated the situation
- You MUST NOT invent or guess any numbers

{alert_context}

{stats_context}

{expense_analysis}

{behavior_context}

INSTRUCTIONS FOR EXPENSE INSIGHTS:
- Explain the spending pattern and what it means
- If behavioral flags are present, mention them explicitly
- Highlight ONE realistic positive angle (if any)
- Suggest ONE specific action to improve spending control
- Use a supportive, analytical tone (never shaming)
- Use ₹ when mentioning money

Return ONLY valid JSON in this EXACT shape:
{{
  "title": "{alert.get('title')}",
  "ai_noticing": "",
  "positive": "",
  "improvement": "",
  "action": ""
}}
"""


def generate_savings_insight_prompt(alert, stats, recent_transactions, goals):
    """
    Savings-focused prompt with goal allocation
    """
    alert_context = f"""
ALERT DETAILS
--------------
Level: {alert.get('level')}
Scope: {alert.get('scope')}
Title: {alert.get('title')}
Reasons:
{chr(10).join([f"- {r}" for r in alert.get('reasons', [])])}
"""

    stats_context = f"""
CURRENT STATS
--------------
Monthly Income: ₹{stats.get('monthlyIncome', 0)}
Monthly Expense: ₹{stats.get('monthlyExpense', 0)}
Savings Rate: {stats.get('savingsRate', 0)}%
Liquid Savings: ₹{stats.get('liquidSavings', 0)}
"""

    # Analyze recent saving transactions
    saving_txs = [tx for tx in recent_transactions if tx.get('type') == 'saving']
    savings_analysis = f"""
RECENT SAVINGS PATTERN
----------------------
Last {len(saving_txs)} saving transactions:
{chr(10).join([f"- ₹{tx.get('amount', 0)} ({tx.get('category', 'N/A')}) on {tx.get('occurredAt', 'N/A')[:10]}" for tx in saving_txs[:5]])}
"""

    goals_context = ""
    if goals and len(goals) > 0:
        goals_context = f"""
ACTIVE GOALS
------------
{chr(10).join([f"- {g.get('name')}: ₹{g.get('currentAmount', 0)}/₹{g.get('targetAmount', 0)} ({g.get('progress', 0)}%)" for g in goals[:3]])}
"""

    return f"""
You are Fintastic AI — a professional financial communication and coaching engine.

IMPORTANT:
- You are analyzing a SAVINGS page insight
- Focus on savings rate, emergency fund, and goal allocation
- The alert system has ALREADY evaluated the situation
- You MUST NOT invent or guess any numbers

{alert_context}

{stats_context}

{savings_analysis}

{goals_context}

INSTRUCTIONS FOR SAVINGS INSIGHTS:
- Explain the savings pattern and what it means
- Highlight emergency fund status (should be 3-6 months of expenses)
- If goals exist, mention how savings support them
- Suggest ONE specific action to improve savings consistency
- Use a supportive, analytical tone (never shaming)
- Use ₹ when mentioning money

Return ONLY valid JSON in this EXACT shape:
{{
  "title": "{alert.get('title')}",
  "ai_noticing": "",
  "positive": "",
  "improvement": "",
  "action": ""
}}
"""


def generate_investment_insight_prompt(alert, stats, recent_transactions, risk_profile):
    """
    Investment-focused prompt with risk-adjusted recommendations
    """
    alert_context = f"""
ALERT DETAILS
--------------
Level: {alert.get('level')}
Scope: {alert.get('scope')}
Title: {alert.get('title')}
Reasons:
{chr(10).join([f"- {r}" for r in alert.get('reasons', [])])}
"""

    stats_context = f"""
CURRENT STATS
--------------
Monthly Income: ₹{stats.get('monthlyIncome', 0)}
Investment Rate: {stats.get('investmentRate', 0)}%
Invested Amount: ₹{stats.get('investedAmount', 0)}
"""

    # Analyze recent investment transactions
    investment_txs = [tx for tx in recent_transactions if tx.get('type') == 'investment']
    investment_analysis = f"""
RECENT INVESTMENT PATTERN
-------------------------
Last {len(investment_txs)} investment transactions:
{chr(10).join([f"- ₹{tx.get('amount', 0)} ({tx.get('category', 'N/A')}) on {tx.get('occurredAt', 'N/A')[:10]}" for tx in investment_txs[:5]])}
"""

    risk_context = f"""
RISK PROFILE
------------
Risk Index: {risk_profile.get('riskIndex', 50)}/100
Discipline Score: {risk_profile.get('disciplineScore', 50)}/100
"""

    return f"""
You are Fintastic AI — a professional financial communication and coaching engine.

IMPORTANT:
- You are analyzing an INVESTMENT page insight
- Focus on investment allocation, risk management, and consistency
- The alert system has ALREADY evaluated the situation
- You MUST NOT invent or guess any numbers

{alert_context}

{stats_context}

{investment_analysis}

{risk_context}

INSTRUCTIONS FOR INVESTMENT INSIGHTS:
- Explain the investment pattern and what it means
- Adjust recommendations based on risk profile (low/medium/high)
- Highlight portfolio diversification if applicable
- Suggest ONE specific action to improve investment strategy
- Use a supportive, analytical tone (never shaming)
- Use ₹ when mentioning money

Return ONLY valid JSON in this EXACT shape:
{{
  "title": "{alert.get('title')}",
  "ai_noticing": "",
  "positive": "",
  "improvement": "",
  "action": ""
}}
"""


def generate_goals_insight_prompt(alert, stats, recent_transactions, goals, goal_metadata):
    """
    Goals-focused prompt with timeline prediction
    """
    alert_context = f"""
ALERT DETAILS
--------------
Level: {alert.get('level')}
Scope: {alert.get('scope')}
Title: {alert.get('title')}
Reasons:
{chr(10).join([f"- {r}" for r in alert.get('reasons', [])])}
"""

    stats_context = f"""
CURRENT STATS
--------------
Monthly Income: ₹{stats.get('monthlyIncome', 0)}
Savings Rate: {stats.get('savingsRate', 0)}%
"""

    # Calculate savings rate from recent transactions
    saving_txs = [tx for tx in recent_transactions if tx.get('type') in ['saving', 'investment']]
    total_savings = sum([tx.get('amount', 0) for tx in saving_txs])
    avg_monthly_savings = total_savings / max(1, len(saving_txs)) if saving_txs else 0

    # Goal prediction context
    prediction_context = ""
    if goal_metadata and goal_metadata.get('needsPrediction'):
        current = goal_metadata.get('currentAmount', 0)
        target = goal_metadata.get('targetAmount', 0)
        remaining = target - current
        deadline = goal_metadata.get('deadline', '')
        
        prediction_context = f"""
GOAL PREDICTION REQUIRED
------------------------
Goal: {goal_metadata.get('goalName')}
Current: ₹{current}
Target: ₹{target}
Remaining: ₹{remaining}
Deadline: {deadline}
Average Monthly Savings: ₹{avg_monthly_savings:.0f}

CRITICAL: You MUST generate a prediction paragraph that includes:
1. Estimated completion date based on current savings rate
2. Whether user will meet the deadline
3. Required monthly contribution to meet deadline
4. Specific, actionable recommendation

Example format:
"Based on your current savings rate of ₹{avg_monthly_savings:.0f}/month, you'll reach your {goal_metadata.get('goalName')} goal by [Predicted Date]. To meet your deadline of {deadline}, you need to increase contributions to ₹[Required Amount]/month."
"""

    goals_context = ""
    if goals and len(goals) > 0:
        goals_context = f"""
ALL ACTIVE GOALS
----------------
{chr(10).join([f"- {g.get('name')}: ₹{g.get('currentAmount', 0)}/₹{g.get('targetAmount', 0)} ({g.get('progress', 0)}%) - Deadline: {g.get('deadline', 'N/A')}" for g in goals[:3]])}
"""

    return f"""
You are Fintastic AI — a professional financial communication and coaching engine.

IMPORTANT:
- You are analyzing a GOALS page insight
- Focus on goal progress, timeline predictions, and contribution recommendations
- The alert system has ALREADY evaluated the situation
- You MUST NOT invent or guess any numbers

{alert_context}

{stats_context}

{goals_context}

{prediction_context}

INSTRUCTIONS FOR GOALS INSIGHTS:
- Explain the goal progress and what it means
- MUST include a prediction paragraph if needsPrediction is true
- Calculate realistic timeline based on current savings rate
- Suggest ONE specific action to improve goal progress
- Use a supportive, analytical tone (never shaming)
- Use ₹ when mentioning money

Return ONLY valid JSON in this EXACT shape:
{{
  "title": "{alert.get('title')}",
  "ai_noticing": "",
  "positive": "",
  "improvement": "",
  "action": "",
  "prediction": ""
}}

NOTE: The "prediction" field is REQUIRED for goals page and should contain the timeline prediction paragraph.
"""


def generate_dashboard_insight_prompt(alert, stats, recent_transactions):
    """
    Dashboard/overall insight prompt
    """
    alert_context = f"""
ALERT DETAILS
--------------
Level: {alert.get('level')}
Scope: {alert.get('scope')}
Title: {alert.get('title')}
Reasons:
{chr(10).join([f"- {r}" for r in alert.get('reasons', [])])}
"""

    stats_context = f"""
CURRENT STATS
--------------
Monthly Income: ₹{stats.get('monthlyIncome', 0)}
Monthly Expense: ₹{stats.get('monthlyExpense', 0)}
Savings Rate: {stats.get('savingsRate', 0)}%
Net Worth: ₹{stats.get('netWorth', 0)}
"""

    return f"""
You are Fintastic AI — a professional financial communication and coaching engine.

IMPORTANT:
- You are analyzing a DASHBOARD/OVERALL insight
- Focus on overall financial health and balance
- The alert system has ALREADY evaluated the situation
- You MUST NOT invent or guess any numbers

{alert_context}

{stats_context}

INSTRUCTIONS FOR DASHBOARD INSIGHTS:
- Explain the overall financial situation
- Highlight ONE realistic positive angle (if any)
- Suggest ONE specific action to improve overall financial health
- Use a supportive, analytical tone (never shaming)
- Use ₹ when mentioning money

Return ONLY valid JSON in this EXACT shape:
{{
  "title": "{alert.get('title')}",
  "ai_noticing": "",
  "positive": "",
  "improvement": "",
  "action": ""
}}
"""
