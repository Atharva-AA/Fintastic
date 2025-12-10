import os
import requests

NODE_BASE = "http://localhost:3000"
AI_SECRET = os.getenv("AI_INTERNAL_SECRET")

print(f"🔑 [node_client] AI_SECRET loaded: {'***' if AI_SECRET else 'MISSING/NONE'}")
print(f"🔑 [node_client] AI_SECRET type: {type(AI_SECRET)}")
if AI_SECRET:
    print(f"🔑 [node_client] AI_SECRET length: {len(AI_SECRET)}")
else:
    print("⚠️ [node_client] WARNING: AI_INTERNAL_SECRET is not set in environment!")

# Ensure header is always sent, even if None (requests will send it as string "None")
HEADERS = {
    "Content-Type": "application/json"
}

# Only add x-ai-secret if it exists, otherwise log warning
if AI_SECRET:
    HEADERS["x-ai-secret"] = AI_SECRET
    print(f"🔑 [node_client] HEADERS['x-ai-secret']: *** (set)")
else:
    print("❌ [node_client] ERROR: x-ai-secret header NOT being sent because AI_SECRET is None!")
    print("❌ [node_client] Please set AI_INTERNAL_SECRET in your .env file")

def add_transaction_tool(user_id, tx_type, category, amount, note):
    print("🔧 [node_client] add_transaction_tool CALLED")
    print(f"🔧 [node_client] URL: {NODE_BASE}/api/ai/add-transaction")
    print(f"🔧 [node_client] Headers being sent: {HEADERS}")
    print(f"🔧 [node_client] x-ai-secret in headers: {'YES' if 'x-ai-secret' in HEADERS else 'NO'}")
    if 'x-ai-secret' in HEADERS:
        print(f"🔧 [node_client] x-ai-secret value: {'***' if HEADERS['x-ai-secret'] else 'EMPTY/NONE'}")
    print(f"🔧 [node_client] Payload: userId={user_id}, type={tx_type}, category={category}, amount={amount}, note={note}")
    
    if not AI_SECRET:
        print("❌ [node_client] ERROR: Cannot make request without AI_SECRET!")
        raise ValueError("AI_INTERNAL_SECRET environment variable is not set")
    
    try:
        response = requests.post(
            f"{NODE_BASE}/api/ai/add-transaction",
            json={
                "userId": user_id,
                "type": tx_type,
                "category": category,
                "amount": amount,
                "note": note
            },
            headers=HEADERS
        )
        print(f"🔧 [node_client] Response status: {response.status_code}")
        print(f"🔧 [node_client] Response body: {response.text}")
        
        if response.status_code >= 400:
            error_msg = f"Backend returned {response.status_code}"
            try:
                error_data = response.json()
                error_msg = error_data.get("message", error_msg)
            except:
                error_msg = response.text or error_msg
            raise Exception(f"Failed to add transaction: {error_msg}")
        
        # Handle empty response
        if not response.text or response.text.strip() == "":
            raise Exception("Empty response from backend")
        
        result = response.json()
        print(f"🔧 [node_client] Parsed JSON: {result}")
        return result
    except requests.exceptions.JSONDecodeError as e:
        print(f"❌ [node_client] JSON decode error: {e}")
        print(f"❌ [node_client] Response text: {response.text if 'response' in locals() else 'No response'}")
        raise Exception(f"Invalid JSON response from backend: {response.text if 'response' in locals() else 'No response'}")
    except Exception as e:
        print(f"❌ [node_client] ERROR in add_transaction_tool: {e}")
        print(f"❌ [node_client] ERROR type: {type(e)}")
        raise


def update_transaction_tool(user_id, transaction_id, fields):
    return requests.put(
        f"{NODE_BASE}/api/ai/update-transaction/{transaction_id}",
        json={ "userId": user_id, "fields": fields },
        headers=HEADERS
    ).json()


def delete_transaction_tool(user_id, transaction_id):
    return requests.delete(
        f"{NODE_BASE}/api/ai/delete-transaction/{transaction_id}",
        json={ "userId": user_id },
        headers=HEADERS
    ).json()


def get_transactions_tool(user_id, filters):
    return requests.post(
        f"{NODE_BASE}/api/ai/get-transactions",
        json={ "userId": user_id, "filters": filters },
        headers=HEADERS
    ).json()


def get_user_stats_tool(user_id):
    """Fetch fresh user stats from backend"""
    try:
        response = requests.post(
            f"{NODE_BASE}/api/ai/get-stats",
            json={"userId": user_id},
            headers=HEADERS
        )
        result = response.json()
        return result.get("stats")
    except Exception as e:
        print(f"❌ [node_client] Error fetching stats: {e}")
        return None


def create_goal_tool(user_id, name, target_amount, deadline=None, priority="good_to_have"):
    """Create a new financial goal"""
    print("🎯 [node_client] create_goal_tool CALLED")
    print(f"🎯 [node_client] URL: {NODE_BASE}/api/ai/create-goal")
    print(f"🎯 [node_client] Payload: userId={user_id}, name={name}, targetAmount={target_amount}, deadline={deadline}, priority={priority}")
    
    if not AI_SECRET:
        print("❌ [node_client] ERROR: Cannot make request without AI_SECRET!")
        raise ValueError("AI_INTERNAL_SECRET environment variable is not set")
    
    try:
        payload = {
            "userId": user_id,
            "name": name,
            "targetAmount": target_amount,
        }
        
        if deadline:
            payload["deadline"] = deadline
        if priority:
            payload["priority"] = priority
            
        response = requests.post(
            f"{NODE_BASE}/api/ai/create-goal",
            json=payload,
            headers=HEADERS
        )
        print(f"🎯 [node_client] Response status: {response.status_code}")
        print(f"🎯 [node_client] Response body: {response.text}")
        
        if response.status_code >= 400:
            error_msg = f"Backend returned {response.status_code}"
            try:
                error_data = response.json()
                error_msg = error_data.get("message", error_msg)
            except:
                error_msg = response.text or error_msg
            raise Exception(f"Failed to create goal: {error_msg}")
        
        if not response.text or response.text.strip() == "":
            raise Exception("Empty response from backend")
        
        result = response.json()
        print(f"🎯 [node_client] Parsed JSON: {result}")
        return result
    except requests.exceptions.JSONDecodeError as e:
        print(f"❌ [node_client] JSON decode error: {e}")
        print(f"❌ [node_client] Response text: {response.text if 'response' in locals() else 'No response'}")
        raise Exception(f"Invalid JSON response from backend: {response.text if 'response' in locals() else 'No response'}")
    except Exception as e:
        print(f"❌ [node_client] ERROR in create_goal_tool: {e}")
        print(f"❌ [node_client] ERROR type: {type(e)}")
        raise


def fetch_recent_transactions(user_id, page=None, limit=20):
    """
    Fetch recent transactions for AI context
    
    Args:
        user_id: User ID
        page: Optional page filter (income/expense/savings/investment/goals/dashboard)
        limit: Number of transactions to fetch (default 20, max 50)
    
    Returns:
        List of transaction dicts
    """
    print(f"📊 [node_client] fetch_recent_transactions CALLED")
    print(f"📊 [node_client] URL: {NODE_BASE}/api/ai-internal/get-recent-transactions")
    print(f"📊 [node_client] userId={user_id}, page={page}, limit={limit}")
    
    if not AI_SECRET:
        print("❌ [node_client] ERROR: Cannot make request without AI_SECRET!")
        return []
    
    try:
        filters = {"limit": min(limit, 50)}  # Cap at 50
        
        # Page-specific filtering
        if page == "income":
            filters["type"] = "income"
        elif page == "expense":
            filters["type"] = "expense"
        elif page == "savings":
            filters["type"] = "saving"
        elif page == "investment":
            filters["type"] = "investment"
        # For goals and dashboard, fetch all types
        
        response = requests.post(
            f"{NODE_BASE}/api/ai-internal/get-recent-transactions",
            json={"userId": user_id, "filters": filters},
            headers=HEADERS,
            timeout=10
        )
        
        print(f"📊 [node_client] Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            transactions = result.get("transactions", [])
            print(f"📊 [node_client] Fetched {len(transactions)} transactions")
            return transactions
        else:
            print(f"⚠️ [node_client] Failed to fetch transactions: {response.status_code}")
            print(f"⚠️ [node_client] Response: {response.text}")
            return []
            
    except Exception as e:
        print(f"❌ [node_client] ERROR in fetch_recent_transactions: {e}")
        print(f"❌ [node_client] ERROR type: {type(e)}")
        return []
