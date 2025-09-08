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
    
    valid_types = ["close", "current", "open"]
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
                
    except Exception as e:
        return jsonify({"error": f"Failed to fetch data: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
