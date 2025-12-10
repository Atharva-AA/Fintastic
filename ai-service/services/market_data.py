import yfinance as yf
from datetime import datetime, timedelta
import json

def get_market_data(symbol: str):
    """
    Fetch market data for a stock symbol using yfinance
    
    Args:
        symbol: Stock ticker symbol (e.g., 'AAPL', 'MSFT')
    
    Returns:
        dict: Market data including price, change, chart data, and company info
    """
    try:
        ticker = yf.Ticker(symbol.upper())
        
        # Get current price and info
        info = ticker.info
        current_price = info.get('currentPrice') or info.get('regularMarketPrice') or 0
        
        # Get historical data for chart (last 30 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        hist = ticker.history(start=start_date, end=end_date, interval='1d')
        
        # Calculate change
        if len(hist) > 1:
            previous_close = hist['Close'].iloc[-2]
            change = current_price - previous_close
            change_percent = (change / previous_close) * 100 if previous_close > 0 else 0
        else:
            change = 0
            change_percent = 0
        
        # Prepare chart data
        chart_data = []
        for date, row in hist.iterrows():
            chart_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'price': float(row['Close'])
            })
        
        # If no chart data, add current price
        if not chart_data:
            chart_data.append({
                'date': datetime.now().strftime('%Y-%m-%d'),
                'price': current_price
            })
        
        return {
            'symbol': symbol.upper(),
            'price': round(current_price, 2),
            'change': round(change, 2),
            'changePercent': round(change_percent, 2),
            'chartData': chart_data,
            'info': {
                'name': info.get('longName') or info.get('shortName') or symbol,
                'sector': info.get('sector'),
                'marketCap': info.get('marketCap'),
            }
        }
    except Exception as e:
        print(f"❌ Error fetching market data for {symbol}: {str(e)}")
        # Return default data on error
        return {
            'symbol': symbol.upper(),
            'price': 0,
            'change': 0,
            'changePercent': 0,
            'chartData': [{
                'date': datetime.now().strftime('%Y-%m-%d'),
                'price': 0
            }],
            'info': {
                'name': symbol,
                'sector': None,
                'marketCap': None,
            }
        }

