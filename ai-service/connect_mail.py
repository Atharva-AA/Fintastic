"""
Gmail Transaction Classifier
Handles Gmail OAuth, email fetching, and transaction classification
"""

import os
import json
import re
from typing import List, Dict, Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# Paths
CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), 'gmail_credentials', 'credentials.json')
GMAIL_CREDENTIALS_DIR = os.path.join(os.path.dirname(__file__), 'gmail_credentials')


def get_token_path(userId: str) -> str:
    """Get token file path for a specific user"""
    return os.path.join(GMAIL_CREDENTIALS_DIR, f'token_{userId}.json')


def get_oauth_url(userId: str, redirect_uri: str) -> Optional[str]:
    """
    Generate OAuth authorization URL for web flow
    
    Args:
        userId: User ID string
        redirect_uri: Redirect URI after OAuth completes
        
    Returns:
        str: Authorization URL or None if error
    """
    print(f"🔐 Generating OAuth URL for user: {userId}")
    
    if not os.path.exists(CREDENTIALS_PATH):
        print(f"❌ Credentials file not found at: {CREDENTIALS_PATH}")
        return None
    
    try:
        from google_auth_oauthlib.flow import Flow
        
        flow = Flow.from_client_secrets_file(
            CREDENTIALS_PATH,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        
        # Generate authorization URL
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        # Store state with userId mapping (state -> userId)
        state_file = os.path.join(GMAIL_CREDENTIALS_DIR, f'oauth_state_{state}.txt')
        os.makedirs(GMAIL_CREDENTIALS_DIR, exist_ok=True)
        with open(state_file, 'w') as f:
            f.write(userId)
        
        print(f"✅ Generated OAuth URL for user: {userId}, state: {state[:20]}...")
        return authorization_url
    except Exception as e:
        print(f"❌ OAuth URL generation failed: {e}")
        return None


def handle_oauth_callback(authorization_code: str, state: str) -> bool:
    """
    Handle OAuth callback and save token
    
    Args:
        authorization_code: Authorization code from OAuth callback
        state: OAuth state (used to look up userId)
        
    Returns:
        bool: True if successful
    """
    # Get userId from state file
    state_file = os.path.join(GMAIL_CREDENTIALS_DIR, f'oauth_state_{state}.txt')
    if not os.path.exists(state_file):
        print(f"❌ State file not found: {state_file}")
        return False
    
    with open(state_file, 'r') as f:
        userId = f.read().strip()
    
    print(f"🔐 Handling OAuth callback for user: {userId}")
    
    # Remove state file after reading
    try:
        os.remove(state_file)
    except:
        pass
    
    if not os.path.exists(CREDENTIALS_PATH):
        print(f"❌ Credentials file not found at: {CREDENTIALS_PATH}")
        return False
    
    try:
        from google_auth_oauthlib.flow import Flow
        
        # Get redirect URI (MUST match the one used in get_oauth_url and registered in Google Cloud Console)
        redirect_uri = "http://localhost:8001/gmail/callback"  # FastAPI callback endpoint
        
        flow = Flow.from_client_secrets_file(
            CREDENTIALS_PATH,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        
        # Exchange authorization code for token
        flow.fetch_token(code=authorization_code)
        creds = flow.credentials
        
        # Save token for this user
        token_path = get_token_path(userId)
        print(f"💾 Saving token to: {token_path}")
        os.makedirs(GMAIL_CREDENTIALS_DIR, exist_ok=True)
        with open(token_path, 'w') as token_file:
            token_file.write(creds.to_json())
        print(f"✅ Token saved for user: {userId}")
        
        return True
    except Exception as e:
        print(f"❌ OAuth callback failed: {e}")
        return False


def authenticate_user_gmail(userId: str) -> bool:
    """
    Authenticate user with Gmail OAuth and save token per user
    (Legacy function - kept for backward compatibility)
    
    Args:
        userId: User ID string
        
    Returns:
        bool: True if authentication successful
    """
    print(f"🔐 Authenticating Gmail for user: {userId}")
    
    token_path = get_token_path(userId)
    creds = None
    
    # Check if token exists for this user
    if os.path.exists(token_path):
        print(f"📂 Loading existing token from: {token_path}")
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        except Exception as e:
            print(f"⚠️ Error loading token: {e}")
            creds = None
    
    # If no valid credentials, get new ones
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Refreshing expired token...")
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"⚠️ Token refresh failed: {e}")
                creds = None
        
        if not creds:
            print("🔑 Starting OAuth flow...")
            if not os.path.exists(CREDENTIALS_PATH):
                print(f"❌ Credentials file not found at: {CREDENTIALS_PATH}")
                return False
            
            try:
                flow = InstalledAppFlow.from_client_secrets_file(
                    CREDENTIALS_PATH, SCOPES
                )
                creds = flow.run_local_server(port=0)
            except Exception as e:
                print(f"❌ OAuth flow failed: {e}")
                return False
        
        # Save token for this user
        print(f"💾 Saving token to: {token_path}")
        os.makedirs(GMAIL_CREDENTIALS_DIR, exist_ok=True)
        with open(token_path, 'w') as token_file:
            token_file.write(creds.to_json())
        print(f"✅ Token saved for user: {userId}")
    
    return True


def get_gmail_service(userId: str):
    """Get Gmail service instance for a user"""
    token_path = get_token_path(userId)
    
    if not os.path.exists(token_path):
        print(f"❌ No token found for user: {userId}")
        return None
    
    try:
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        
        if not creds.valid:
            if creds.expired and creds.refresh_token:
                print("🔄 Refreshing token...")
                creds.refresh(Request())
                # Save refreshed token
                with open(token_path, 'w') as token_file:
                    token_file.write(creds.to_json())
            else:
                print(f"❌ Invalid credentials for user: {userId}")
                return None
        
        service = build('gmail', 'v1', credentials=creds)
        return service
    except Exception as e:
        print(f"❌ Error building Gmail service: {e}")
        return None


class GmailTransactionClassifier:
    """Classifies Gmail messages as transactions"""
    
    # Transaction keywords - any email with these + amount = valid transaction
    TRANSACTION_KEYWORDS = [
        "payment", "paid", "upi", "imps", "neft",
        "debited", "credited", "txn", "transaction", "transfer",
        "sent", "received", "successful", "failed", "withdrawal",
        "deposit", "reversal", "refund", "purchase", "order",
        "pos", "atm", "card", "vpa", "rtgs"
    ]
    
    # Expense indicators
    EXPENSE_KEYWORDS = [
        "debited", "paid", "purchase", "sent", "transfer to",
        "withdrawal", "pos", "upi", "imps", "neft", "transaction",
        "order", "payment", "successful"
    ]
    
    # Income indicators
    INCOME_KEYWORDS = [
        "credited", "deposit", "received", "refund", "reversal",
        "transfer from", "salary", "income"
    ]
    
    @staticmethod
    def extract_amount(text: str) -> Optional[float]:
        """Extract amount from text with improved patterns"""
        # Enhanced patterns for Indian currency
        patterns = [
            r'₹\s*([\d,]+\.?\d*)',
            r'rs\.?\s*([\d,]+\.?\d*)',
            r'inr\s*([\d,]+\.?\d*)',
            r'amount(?:\s*of)?\s*₹?\s*([\d,]+\.?\d*)',
            r'by\s*₹?\s*([\d,]+\.?\d*)',
            r'for\s*₹?\s*([\d,]+\.?\d*)',
            r'paid\s*₹?\s*([\d,]+\.?\d*)',
            r'payment\s*of\s*₹?\s*([\d,]+\.?\d*)',
            r'debited\s*(?:by)?\s*₹?\s*([\d,]+\.?\d*)',
            r'credited\s*(?:by)?\s*₹?\s*([\d,]+\.?\d*)',
            r'([\d,]+\.?\d*)\s*₹',
            r'([\d,]+\.?\d*)\s*rs',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(',', '')
                try:
                    amount = float(amount_str)
                    if amount > 0:  # Reject amounts <= 0
                        return amount
                except ValueError:
                    continue
        
        return None
    
    @staticmethod
    def classify_transaction(subject: str, body: str, from_addr: str = '') -> Optional[Dict]:
        """
        Classify email as transaction using amount + keywords (no sender check)
        
        Returns:
            Dict with keys: amount, text, type
            or None if not a valid transaction
        """
        combined_text = f"{subject} {body}".lower()
        
        print(f"📨 Email: {subject[:60]}")
        
        # Extract amount first
        amount = GmailTransactionClassifier.extract_amount(combined_text)
        
        if amount is None or amount <= 0:
            print(f"📨 Email ignored (no amount or amount <= 0)")
            return None
        
        print(f"💰 Amount detected: {amount}")
        
        # Check for transaction keywords
        matched_keywords = [
            k for k in GmailTransactionClassifier.TRANSACTION_KEYWORDS
            if k in combined_text
        ]
        
        if not matched_keywords:
            print(f"📨 Email ignored (no payment keywords)")
            return None
        
        print(f"🔍 Keywords matched: {', '.join(matched_keywords[:3])}")
        
        # Determine type
        if any(k in combined_text for k in GmailTransactionClassifier.INCOME_KEYWORDS):
            tx_type = "income"
        else:
            tx_type = "expense"
        
        # Extract merchant/summary text (clean subject)
        text = subject.strip()[:100]  # Use subject as text, limit to 100 chars
        
        if not text:
            print(f"📨 Email ignored (no valid text)")
            return None
        
        print(f"✔ VALID TRANSACTION: {tx_type} ₹{amount}")
        
        return {
            'amount': amount,
            'text': text,
            'type': tx_type
        }


def fetch_and_classify(userId: str) -> List[Dict]:
    """
    Fetch emails for user and classify transactions
    
    Args:
        userId: User ID string
        
    Returns:
        List of transaction dicts with keys: gmailMessageId, amount, text, type
    """
    print(f"📨 Checking emails for user: {userId}")
    
    service = get_gmail_service(userId)
    if not service:
        print(f"❌ Could not get Gmail service for user: {userId}")
        return []
    
    try:
        # Search for transaction-related emails from last 24 hours only
        query = (
            "newer_than:1d "
            "(upi OR payment OR paid OR IMPS OR NEFT OR debit OR credit "
            "OR transaction OR transfer OR deposit OR withdrawal)"
        )
        print(f"🔍 Gmail search query: {query}")
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=50
        ).execute()
        
        messages = results.get('messages', [])
        print(f"📧 Found {len(messages)} potential transaction emails")
        
        transactions = []
        
        for msg in messages:
            try:
                message = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full'
                ).execute()
                
                # Extract subject, from, and body
                headers = message['payload'].get('headers', [])
                subject = next(
                    (h['value'] for h in headers if h['name'] == 'Subject'),
                    ''
                )
                from_addr = next(
                    (h['value'] for h in headers if h['name'] == 'From'),
                    ''
                )
                
                # Extract body
                body = ''
                if 'parts' in message['payload']:
                    for part in message['payload']['parts']:
                        if part['mimeType'] == 'text/plain':
                            data = part['body'].get('data', '')
                            if data:
                                import base64
                                body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                else:
                    data = message['payload']['body'].get('data', '')
                    if data:
                        import base64
                        body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                
                # Classify with from address
                classification = GmailTransactionClassifier.classify_transaction(
                    subject, body, from_addr
                )
                
                if classification:
                    # Ensure all fields are valid
                    gmail_id = msg.get('id', '')
                    amount = classification.get('amount')
                    text = classification.get('text', '').strip()
                    tx_type = classification.get('type', '')
                    
                    # Validate before adding
                    if gmail_id and amount is not None and amount > 0 and text and tx_type:
                        transaction = {
                            'gmailMessageId': gmail_id,
                            'amount': float(amount),
                            'text': text,
                            'type': tx_type
                        }
                        transactions.append(transaction)
                        
                        print(f"📩 Subject: {subject[:50]}")
                        print(f"💰 Amount: ₹{transaction['amount']}")
                        print(f"🧾 Text: {transaction['text']}")
                        print(f"📊 Type: {transaction['type']}")
                        print("🚀 Sending to backend")
                        print("---")
                    else:
                        print(f"⚠️ Skipping invalid transaction: id={gmail_id}, amount={amount}, text={text[:30] if text else 'None'}, type={tx_type}")
            
            except Exception as e:
                print(f"⚠️ Error processing message {msg.get('id', 'unknown')}: {e}")
                continue
        
        print(f"✅ Classified {len(transactions)} transactions for user: {userId}")
        return transactions
    
    except HttpError as error:
        print(f"❌ Gmail API error: {error}")
        return []
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return []


def debug_fetch(userId: str) -> None:
    """
    Debug function to print last 5 emails for a user
    
    Args:
        userId: User ID string
    """
    print(f"🔍 Debug: Fetching last 5 emails for user: {userId}")
    
    service = get_gmail_service(userId)
    if not service:
        print(f"❌ Could not get Gmail service for user: {userId}")
        return
    
    try:
        results = service.users().messages().list(
            userId='me',
            maxResults=5
        ).execute()
        
        messages = results.get('messages', [])
        print(f"📧 Found {len(messages)} messages")
        
        for i, msg in enumerate(messages, 1):
            try:
                message = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='metadata',
                    metadataHeaders=['Subject', 'From', 'Date']
                ).execute()
                
                headers = message['payload'].get('headers', [])
                subject = next(
                    (h['value'] for h in headers if h['name'] == 'Subject'),
                    'No Subject'
                )
                from_addr = next(
                    (h['value'] for h in headers if h['name'] == 'From'),
                    'Unknown'
                )
                date = next(
                    (h['value'] for h in headers if h['name'] == 'Date'),
                    'Unknown'
                )
                
                print(f"\n📨 Email {i}:")
                print(f"   Subject: {subject}")
                print(f"   From: {from_addr}")
                print(f"   Date: {date}")
                print(f"   ID: {msg['id']}")
            
            except Exception as e:
                print(f"⚠️ Error fetching email {i}: {e}")
    
    except Exception as e:
        print(f"❌ Error: {e}")

