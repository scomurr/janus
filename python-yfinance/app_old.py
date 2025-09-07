from flask import Flask, request, jsonify
import yfinance as yf

app = Flask(__name__)

@app.route('/marketcap')
def market_cap():
    symbols = request.args.get('symbols')
    if not symbols:
        return jsonify({"error": "Missing symbols param"}), 400

    tickers = symbols.upper().split(",")
    data = yf.Tickers(" ".join(tickers))
    result = {}

    for symbol in tickers:
        info = data.tickers.get(symbol)
        if info:
            cap = info.info.get("marketCap")
            if cap:
                result[symbol] = cap

    return jsonify(result)

# ✅ This is what starts the server
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
