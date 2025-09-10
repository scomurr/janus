from flask import Flask, request, jsonify
import yfinance as yf

app = Flask(__name__)

@app.route("/marketcap")
def market_cap():
    symbols = request.args.get("symbols")
    if not symbols:
        return jsonify({"error": "Missing symbols param"}), 400

    tickers = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    data = yf.Tickers(" ".join(tickers))
    out = {}

    for sym in tickers:
        t = data.tickers.get(sym)
        if not t:
            continue
        cap = t.info.get("marketCap")
        if cap is not None:
            out[sym] = cap
    return jsonify(out)

# NEW: generic info endpoint
@app.route("/info")
def info():
    symbols = request.args.get("symbols")
    fields = request.args.get("fields")  # optional: comma-separated subset
    if not symbols:
        return jsonify({"error": "Missing symbols param"}), 400

    requested = None
    if fields:
        requested = [f.strip() for f in fields.split(",") if f.strip()]

    tickers = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    data = yf.Tickers(" ".join(tickers))

    result = {}
    for sym in tickers:
        t = data.tickers.get(sym)
        if not t:
            continue
        info = t.info or {}
        if requested:
            result[sym] = {k: info.get(k) for k in requested}
        else:
            # default: return just the commonly needed ones
            keys = [
                "marketCap",
                "volume",
                "trailingPE",
                "fiftyTwoWeekHigh",
                "fiftyTwoWeekLow",
                "dividendYield",
                "totalRevenue",
                "grossMargins",
            ]
            result[sym] = {k: info.get(k) for k in keys}
    return jsonify(result)

@app.route("/price")
def price():
    ticker = request.args.get("ticker")
    price_type = request.args.get("type", "close").lower()
    
    if not ticker:
        return jsonify({"error": "Missing ticker param"}), 400
    
    valid_types = ["close", "current", "open", "1hr_after_open"]
    if price_type not in valid_types:
        return jsonify({"error": f"Invalid type. Must be one of: {', '.join(valid_types)}"}), 400
    
    try:
        stock = yf.Ticker(ticker.upper())
        
        if price_type == "current":
            # Get current price from info
            info = stock.info
            current_price = info.get("currentPrice") or info.get("regularMarketPrice")
            if current_price is None:
                return jsonify({"error": "Current price not available"}), 404
            return jsonify({"ticker": ticker.upper(), "type": "current", "price": current_price})
        
        else:
            # Get historical data for close/open
            hist = stock.history(period="5d")  # Get recent data
            if hist.empty:
                return jsonify({"error": "No historical data available"}), 404
            
            if price_type == "close":
                latest_close = hist['Close'].iloc[-1]
                return jsonify({"ticker": ticker.upper(), "type": "close", "price": float(latest_close)})
            
            elif price_type == "open":
                latest_open = hist['Open'].iloc[-1]
                return jsonify({"ticker": ticker.upper(), "type": "open", "price": float(latest_open)})
            
            elif price_type == "1hr_after_open":
                # Get intraday data for today to find price at 10:30 AM Central (market opens 9:30 AM Eastern)
                # 10:30 AM Central = 11:30 AM Eastern (or 10:30 AM Eastern during DST)
                import datetime
                from datetime import timedelta
                
                # Get today's date
                today = datetime.date.today()
                
                # Try to get 1-hour intervals for today
                try:
                    # Get intraday data with 1-hour intervals
                    intraday = stock.history(period="1d", interval="1h")
                    if not intraday.empty:
                        # Look for data around 10:30 AM Central time
                        # This is approximately 1 hour after market open
                        # Market opens at 9:30 AM Eastern, so we want ~10:30 AM Eastern
                        
                        # Get the second hour of trading (roughly 1 hour after open)
                        if len(intraday) >= 2:
                            one_hr_after_price = intraday['Close'].iloc[1]  # Second hour's close
                            return jsonify({"ticker": ticker.upper(), "type": "1hr_after_open", "price": float(one_hr_after_price)})
                        elif len(intraday) >= 1:
                            # Fallback to first hour if only one data point
                            one_hr_after_price = intraday['Close'].iloc[0]
                            return jsonify({"ticker": ticker.upper(), "type": "1hr_after_open", "price": float(one_hr_after_price)})
                except:
                    pass
                
                # Fallback: if intraday data fails, use current price
                info = stock.info
                current_price = info.get("currentPrice") or info.get("regularMarketPrice")
                if current_price:
                    return jsonify({"ticker": ticker.upper(), "type": "1hr_after_open", "price": float(current_price)})
                else:
                    # Final fallback: use latest close
                    latest_close = hist['Close'].iloc[-1]
                    return jsonify({"ticker": ticker.upper(), "type": "1hr_after_open", "price": float(latest_close)})
                
    except Exception as e:
        return jsonify({"error": f"Failed to fetch data: {str(e)}"}), 500

@app.route("/daily-prices")
def daily_prices():
    """Get both opening and closing prices for multiple tickers in one call"""
    symbols = request.args.get("symbols")
    if not symbols:
        return jsonify({"error": "Missing symbols param"}), 400
    
    tickers = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    result = {}
    
    try:
        for ticker in tickers:
            stock = yf.Ticker(ticker)
            
            # Get historical data for open price
            hist = stock.history(period="2d")  # Get 2 days to ensure we have today's data
            if hist.empty:
                continue
                
            # Get today's open price
            today_open = float(hist['Open'].iloc[-1])
            
            # Get current/close price from info
            info = stock.info
            current_price = info.get("currentPrice") or info.get("regularMarketPrice")
            
            # If market is closed, use the historical close price
            if current_price is None:
                current_price = float(hist['Close'].iloc[-1])
            
            result[ticker] = {
                "open": today_open,
                "close": float(current_price)
            }
            
    except Exception as e:
        return jsonify({"error": f"Failed to fetch data: {str(e)}"}), 500
    
    return jsonify(result)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
