"""
Gmail integration route handlers
"""

import os
import json
import secrets
from datetime import datetime
from typing import Any, Dict, Optional
from pathlib import Path

from tools import store_memory_entry
from node_client import backend_api_request
from config import BACKEND_BASE_URL

# Gmail credentials directory
GMAIL_CREDS_DIR = Path(__file__).parent.parent / "gmail_credentials"


def get_gmail_auth_url(user_id: str) -> Dict[str, Any]:
    """Generate Gmail OAuth authorization URL"""
    
    try:
        from google_auth_oauthlib.flow import Flow
        
        credentials_path = GMAIL_CREDS_DIR / "credentials.json"
        if not credentials_path.exists():
            return {"success": False, "error": "Gmail credentials not configured"}
        
        # Generate state token
        state = secrets.token_urlsafe(32)
        state_file = GMAIL_CREDS_DIR / f"oauth_state_{state[:32]}.txt"
        state_file.write_text(user_id)
        
        flow = Flow.from_client_secrets_file(
            str(credentials_path),
            scopes=[
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.modify'
            ],
            redirect_uri=f"{os.getenv('AI_SERVICE_URL', 'http://localhost:8001')}/gmail/callback"
        )
        
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=state,
            prompt='consent'
        )
        
        return {"success": True, "authUrl": auth_url, "state": state}
        
    except Exception as e:
        print(f"❌ Gmail auth URL error: {e}")
        return {"success": False, "error": str(e)}


def handle_gmail_callback(code: str, state: str) -> Dict[str, Any]:
    """Handle Gmail OAuth callback"""
    
    try:
        from google_auth_oauthlib.flow import Flow
        
        # Find user from state
        state_file = GMAIL_CREDS_DIR / f"oauth_state_{state[:32]}.txt"
        if not state_file.exists():
            return {"success": False, "error": "Invalid state token"}
        
        user_id = state_file.read_text().strip()
        state_file.unlink()  # Remove state file
        
        credentials_path = GMAIL_CREDS_DIR / "credentials.json"
        
        flow = Flow.from_client_secrets_file(
            str(credentials_path),
            scopes=[
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.modify'
            ],
            redirect_uri=f"{os.getenv('AI_SERVICE_URL', 'http://localhost:8001')}/gmail/callback"
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Save token
        token_file = GMAIL_CREDS_DIR / f"token_{user_id}.json"
        token_data = {
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": credentials.scopes,
            "expiry": credentials.expiry.isoformat() if credentials.expiry else None
        }
        token_file.write_text(json.dumps(token_data, indent=2))
        
        return {"success": True, "userId": user_id, "message": "Gmail connected successfully"}
        
    except Exception as e:
        print(f"❌ Gmail callback error: {e}")
        return {"success": False, "error": str(e)}


def get_gmail_credentials(user_id: str):
    """Get Gmail credentials for user"""
    
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        
        token_file = GMAIL_CREDS_DIR / f"token_{user_id}.json"
        if not token_file.exists():
            return None
        
        token_data = json.loads(token_file.read_text())
        
        credentials = Credentials(
            token=token_data.get("token"),
            refresh_token=token_data.get("refresh_token"),
            token_uri=token_data.get("token_uri"),
            client_id=token_data.get("client_id"),
            client_secret=token_data.get("client_secret"),
            scopes=token_data.get("scopes")
        )
        
        # Refresh if expired
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            
            # Save refreshed token
            token_data["token"] = credentials.token
            if credentials.expiry:
                token_data["expiry"] = credentials.expiry.isoformat()
            token_file.write_text(json.dumps(token_data, indent=2))
        
        return credentials
        
    except Exception as e:
        print(f"⚠️ Error getting Gmail credentials: {e}")
        return None


async def fetch_gmail_transactions(user_id: str, client, model: str) -> Dict[str, Any]:
    """Fetch and parse financial emails from Gmail"""
    
    try:
        from googleapiclient.discovery import build
        
        credentials = get_gmail_credentials(user_id)
        if not credentials:
            return {"success": False, "error": "Gmail not connected", "needsAuth": True}
        
        service = build('gmail', 'v1', credentials=credentials)
        
        # Search for financial emails
        query = "(from:alerts@hdfcbank.net OR from:alerts@icicibank.com OR from:noreply@paytm.com " \
                "OR from:no-reply@phonepe.com OR from:noreply@gpay.com OR subject:transaction " \
                "OR subject:payment OR subject:credited OR subject:debited) newer_than:7d"
        
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=50
        ).execute()
        
        messages = results.get('messages', [])
        
        if not messages:
            return {"success": True, "transactions": [], "message": "No financial emails found"}
        
        transactions = []
        
        for msg in messages[:20]:
            msg_data = service.users().messages().get(
                userId='me',
                id=msg['id'],
                format='snippet'
            ).execute()
            
            snippet = msg_data.get('snippet', '')
            subject = ''
            
            for header in msg_data.get('payload', {}).get('headers', []):
                if header['name'] == 'Subject':
                    subject = header['value']
                    break
            
            # Parse transaction from email
            parsed = await _parse_email_transaction(client, model, subject, snippet)
            if parsed and parsed.get("amount"):
                parsed["emailId"] = msg['id']
                parsed["userId"] = user_id
                transactions.append(parsed)
        
        # Store transactions via backend
        stored_count = 0
        for tx in transactions:
            try:
                result = backend_api_request(
                    "POST",
                    "/transactions/from-email",
                    {"userId": user_id, "transaction": tx}
                )
                if result.get("success"):
                    stored_count += 1
            except Exception as e:
                print(f"⚠️ Error storing email transaction: {e}")
        
        # Store memory
        store_memory_entry(
            user_id,
            f"Processed {len(transactions)} email transactions, stored {stored_count}",
            "gmail_sync",
            {
                "date": datetime.now().isoformat(),
                "emailsProcessed": len(messages),
                "transactionsFound": len(transactions),
                "transactionsStored": stored_count
            }
        )
        
        return {
            "success": True,
            "transactions": transactions,
            "processed": len(messages),
            "stored": stored_count
        }
        
    except Exception as e:
        print(f"❌ Gmail fetch error: {e}")
        return {"success": False, "error": str(e)}


async def _parse_email_transaction(client, model: str, subject: str, snippet: str) -> Optional[dict]:
    """Parse transaction details from email"""
    
    prompt = f"""Extract transaction from this email:

Subject: {subject}
Content: {snippet}

Return JSON (null if not a transaction):
{{
  "type": "income | expense | transfer",
  "amount": number,
  "category": "category",
  "note": "description",
  "merchant": "merchant name or null",
  "date": "YYYY-MM-DD or null"
}}

Return {{"skip": true}} if not a valid transaction."""
    
    try:
        result = await client.chat.completions.create(
            model=model,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You parse Indian bank/UPI transaction emails."},
                {"role": "user", "content": prompt}
            ]
        )
        
        parsed = json.loads(result.choices[0].message.content.strip())
        
        if parsed.get("skip"):
            return None
        
        return parsed
        
    except Exception as e:
        print(f"⚠️ Email parse error: {e}")
        return None


async def run_gmail_cron_job(user_ids: list, client, model: str) -> Dict[str, Any]:
    """Run Gmail sync for multiple users (cron job)"""
    
    results = {
        "success": True,
        "processed": 0,
        "failed": 0,
        "skipped": 0,
        "totalTransactions": 0,
        "users": []
    }
    
    for user_id in user_ids:
        try:
            # Check if user has Gmail connected
            credentials = get_gmail_credentials(user_id)
            if not credentials:
                results["skipped"] += 1
                results["users"].append({"userId": user_id, "status": "skipped", "reason": "Gmail not connected"})
                continue
            
            result = await fetch_gmail_transactions(user_id, client, model)
            
            if result.get("success"):
                results["processed"] += 1
                results["totalTransactions"] += result.get("stored", 0)
                results["users"].append({
                    "userId": user_id,
                    "status": "success",
                    "transactions": result.get("stored", 0)
                })
            else:
                results["failed"] += 1
                results["users"].append({
                    "userId": user_id,
                    "status": "failed",
                    "error": result.get("error")
                })
                
        except Exception as e:
            results["failed"] += 1
            results["users"].append({"userId": user_id, "status": "error", "error": str(e)})
    
    results["timestamp"] = datetime.utcnow().isoformat() + "Z"
    return results


def check_gmail_connection(user_id: str) -> Dict[str, Any]:
    """Check if Gmail is connected for user"""
    
    credentials = get_gmail_credentials(user_id)
    
    if credentials:
        return {
            "connected": True,
            "userId": user_id,
            "message": "Gmail is connected"
        }
    else:
        return {
            "connected": False,
            "userId": user_id,
            "message": "Gmail not connected",
            "authRequired": True
        }
