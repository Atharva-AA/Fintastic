"""
Search tools using Tavily API for web search functionality
"""

from tavily import TavilyClient
from config import TAVILY_API_KEY

# Initialize Tavily client
tavily_client = TavilyClient(api_key=TAVILY_API_KEY) if TAVILY_API_KEY else None


def tavily_search(query: str) -> str:
    """Search using Tavily and return formatted results"""
    try:
        # Check if API key is available
        if not TAVILY_API_KEY or not tavily_client:
            print("⚠️ TAVILY_API_KEY not configured")
            return "Web search unavailable - TAVILY_API_KEY not configured in environment variables."
        
        print(f"🔍 Tavily search query: {query}")
        res = tavily_client.search(query=query, search_depth="advanced")
        
        if res and res.get("results"):
            # Format results nicely
            results = []
            for i, r in enumerate(res["results"][:5], 1):  # Get top 5 results
                title = r.get("title", "No title")
                content = r.get("content", "")
                url = r.get("url", "")
                results.append(f"[{i}] {title}\n{content[:500]}{'...' if len(content) > 500 else ''}\nSource: {url}")
            
            formatted = "\n\n".join(results)
            print(f"✅ Tavily returned {len(res.get('results', []))} results")
            return formatted
        else:
            print("⚠️ Tavily returned no results")
            return "No relevant web information found for this query."
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Tavily error: {error_msg}")
        
        # Check for specific error types
        if "api_key" in error_msg.lower() or "unauthorized" in error_msg.lower() or "invalid" in error_msg.lower():
            return "Web search unavailable - TAVILY_API_KEY is invalid or expired. Please check your API key."
        elif "quota" in error_msg.lower() or "limit" in error_msg.lower() or "exceeded" in error_msg.lower():
            return "Web search unavailable - Tavily API quota exceeded. Please check your API usage."
        elif "rate" in error_msg.lower():
            return "Web search temporarily unavailable - Rate limit reached. Please try again in a moment."
        else:
            return f"Web search error: {error_msg[:200]}"


def get_stock_market_data(symbol: str) -> str:
    """Fetch stock market data using Tavily search - returns actual search results"""
    try:
        # Clean symbol name (remove common words)
        clean_symbol = symbol.replace(" share", "").replace(" stock", "").replace(" price", "").replace(" value", "").replace(" current", "").strip()
        
        # Build multiple queries for better coverage
        queries = [
            f"{clean_symbol} stock price today India NSE BSE current share value",
            f"{clean_symbol} share price latest NSE BSE India market",
            f"{clean_symbol} stock analysis price target India"
        ]
        
        all_results = []
        for query in queries:
            result = tavily_search(query)
            if result and "unavailable" not in result.lower() and "error" not in result.lower() and "not configured" not in result.lower():
                all_results.append(result)
                if len(all_results) >= 2:  # Get results from 2 queries
                    break
        
        if all_results:
            combined = "\n\n---\n\n".join(all_results)
            print(f"✅ Retrieved stock data for {clean_symbol}")
            return combined
        else:
            # Fallback message if Tavily fails
            return f"⚠️ Unable to fetch current price for {clean_symbol} via search.\n\nPlease check financial websites:\n- NSE: https://www.nseindia.com (search for {clean_symbol})\n- BSE: https://www.bseindia.com\n- Moneycontrol: https://www.moneycontrol.com"
            
    except Exception as e:
        print(f"❌ Stock market data error for {symbol}:", e)
        clean_symbol = symbol.replace(" share", "").replace(" stock", "").replace(" price", "").replace(" value", "").strip()
        return f"⚠️ Error fetching market data for {clean_symbol}: {str(e)}\n\nFor current prices, please check:\n- NSE: https://www.nseindia.com\n- BSE: https://www.bseindia.com"


def get_sip_ideas(risk_level: str, monthly_amount: float, goal: str) -> str:
    """Fetch SIP (Systematic Investment Plan) recommendations using Tavily"""
    try:
        query = f"best SIP mutual funds India {risk_level} risk ₹{monthly_amount} monthly investment {goal}"
        return tavily_search(query)
    except Exception as e:
        print(f"SIP ideas error: {e}")
        return f"SIP recommendations for {risk_level} risk profile with ₹{monthly_amount}/month are currently unavailable. Consider consulting a financial advisor."


def get_insurance_ideas(age: int, dependents: int, income: float) -> str:
    """Fetch insurance recommendations using Tavily"""
    try:
        query = f"best life insurance health insurance India age {age} dependents {dependents} income ₹{income} monthly"
        return tavily_search(query)
    except Exception as e:
        print(f"Insurance ideas error: {e}")
        return f"Insurance recommendations for age {age} with {dependents} dependents and ₹{income}/month income are currently unavailable. Consider consulting an insurance advisor."
