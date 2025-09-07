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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
