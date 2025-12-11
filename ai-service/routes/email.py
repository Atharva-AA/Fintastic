"""
Email route handler
"""

import json
from datetime import datetime
from typing import Any, Dict

from tools import store_memory_entry


async def handle_send_email(data: dict, client, model: str) -> Dict[str, Any]:
    """Generate personalized email content"""
    
    user_id = data.get("userId")
    email_type = data.get("type", "reminder")
    context = data.get("context", {})
    
    # Build email prompt based on type
    system_prompt = _build_email_prompt(email_type, context)
    
    try:
        result = await client.chat.completions.create(
            model=model,
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Generate a {email_type} email."}
            ]
        )
        
        email_content = json.loads(result.choices[0].message.content.strip())
        
        # Store email memory
        if user_id:
            store_memory_entry(
                user_id,
                f"Email generated: {email_type} - {email_content.get('subject', 'No subject')}",
                "email_history",
                {
                    "type": email_type,
                    "date": datetime.now().isoformat()
                }
            )
        
        return {
            "success": True,
            "email": email_content,
            "generatedAt": datetime.utcnow().isoformat() + "Z"
        }
        
    except Exception as e:
        print(f"❌ Email generation error: {e}")
        return {"success": False, "error": str(e)}


def _build_email_prompt(email_type: str, context: dict) -> str:
    """Build email generation prompt"""
    
    base_prompt = """You are an email composer for FINtastic, a personal finance app.

Generate a professional, friendly email in JSON format:
{{
  "subject": "Email subject line",
  "body": "Email body (HTML supported)",
  "preview": "One-line preview text"
}}

Guidelines:
1. Keep emails concise and actionable
2. Use friendly but professional tone
3. Include relevant financial tips when appropriate
4. Support Indian financial context (₹, UPI, SIP, etc.)
"""

    type_specific = {
        "reminder": f"""
Email Type: Payment/Goal Reminder
Context: {json.dumps(context, indent=2)}

Generate a gentle reminder email for the user about their pending payment or goal progress.
""",
        "alert": f"""
Email Type: Financial Alert
Context: {json.dumps(context, indent=2)}

Generate an alert email notifying the user about important financial activity.
""",
        "report": f"""
Email Type: Financial Report
Context: {json.dumps(context, indent=2)}

Generate a summary email with the user's financial report highlights.
""",
        "tip": f"""
Email Type: Financial Tip
Context: {json.dumps(context, indent=2)}

Generate an educational email with a helpful financial tip.
""",
        "welcome": f"""
Email Type: Welcome Email
Context: {json.dumps(context, indent=2)}

Generate a warm welcome email for a new user.
""",
        "weekly_summary": f"""
Email Type: Weekly Summary
Context: {json.dumps(context, indent=2)}

Generate a weekly financial summary email with highlights and insights.
"""
    }
    
    return base_prompt + type_specific.get(email_type, f"\nEmail Type: {email_type}\nContext: {json.dumps(context, indent=2)}")
