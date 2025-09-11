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

@app.route("/historical-prices")
def historical_prices():
    """Get historical prices for multiple tickers for a specific date"""
    symbols = request.args.get("symbols")
    target_date = request.args.get("date")
    
    if not symbols:
        return jsonify({"error": "Missing symbols param"}), 400
    if not target_date:
        return jsonify({"error": "Missing date param (format: YYYY-MM-DD)"}), 400
    
    # Validate date format
    try:
        from datetime import datetime
        datetime.strptime(target_date, '%Y-%m-%d')
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    tickers = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    result = {}
    
    try:
        for ticker in tickers:
            stock = yf.Ticker(ticker)
            
            # Get historical data around the target date
            # Use a range to ensure we get the target date even if it's a weekend/holiday
            from datetime import datetime, timedelta
            target = datetime.strptime(target_date, '%Y-%m-%d')
            start_date = (target - timedelta(days=5)).strftime('%Y-%m-%d')
            end_date = (target + timedelta(days=2)).strftime('%Y-%m-%d')
            
            hist = stock.history(start=start_date, end=end_date)
            if hist.empty:
                continue
            
            # Find the exact date or the closest trading day
            hist_dates = hist.index.strftime('%Y-%m-%d').tolist()
            
            if target_date in hist_dates:
                # Exact date found
                target_data = hist[hist.index.strftime('%Y-%m-%d') == target_date].iloc[0]
                actual_date = target_date
            else:
                # Find the closest trading day (preferring earlier dates)
                available_dates = [d for d in hist_dates if d <= target_date]
                if available_dates:
                    actual_date = max(available_dates)
                    target_data = hist[hist.index.strftime('%Y-%m-%d') == actual_date].iloc[0]
                else:
                    # If no earlier date, take the first available
                    target_data = hist.iloc[0]
                    actual_date = hist_dates[0]
            
            # Get 1hr after open price - try multiple approaches
            one_hr_after_open = None
            print(f"Processing ticker {ticker} for 1hr after open price...")
            try:
                import pandas as pd
                
                target_date_obj = datetime.strptime(actual_date, '%Y-%m-%d')
                
                # Method 1: Try yf.download with different intervals
                for interval in ["5m", "15m", "30m", "1h"]:
                    try:
                        # Download for the specific day
                        df = yf.download(ticker, start=actual_date, end=(target_date_obj + timedelta(days=1)).strftime('%Y-%m-%d'), interval=interval, progress=False)
                        
                        if not df.empty:
                            # Convert to Eastern time if needed
                            if hasattr(df.index, 'tz') and df.index.tz is not None:
                                df.index = df.index.tz_convert("US/Eastern")
                            
                            # Filter for market hours (9:30 AM to 4 PM ET)
                            market_hours = df.between_time('09:30', '16:00')
                            
                            if not market_hours.empty:
                                if interval in ["5m", "15m"] and len(market_hours) > 12:
                                    # For 5m: ~12 candles = 1hr, for 15m: ~4 candles = 1hr
                                    target_idx = 12 if interval == "5m" else 4
                                    one_hr_after_open = float(market_hours.iloc[min(target_idx, len(market_hours)-1)]["Close"])
                                    print(f"Set 1hr price for {ticker} from {interval} interval: {one_hr_after_open}")
                                    break
                                elif interval == "30m" and len(market_hours) >= 2:
                                    # Second 30m candle = ~1hr after open
                                    one_hr_after_open = float(market_hours.iloc[1]["Close"])
                                    print(f"Set 1hr price for {ticker} from {interval} interval: {one_hr_after_open}")
                                    break
                                elif interval == "1h" and len(market_hours) >= 1:
                                    # First 1h candle = ~1hr after open
                                    one_hr_after_open = float(market_hours.iloc[0]["Close"])
                                    print(f"Set 1hr price for {ticker} from {interval} interval: {one_hr_after_open}")
                                    break
                    except Exception as e:
                        print(f"Interval {interval} failed for {ticker}: {e}")
                        continue
                
                # Method 2: If yf.download fails, try stock.history with period
                if one_hr_after_open is None:
                    try:
                        # Get recent data and look for our date
                        intraday = stock.history(period="5d", interval="1h")
                        if not intraday.empty:
                            # Filter for our target date
                            date_mask = intraday.index.date == target_date_obj.date()
                            day_data = intraday[date_mask]
                            if not day_data.empty and len(day_data) >= 1:
                                # Take first hour of trading
                                one_hr_after_open = float(day_data.iloc[0]["Close"])
                                print(f"Set 1hr price for {ticker} from Method 2: {one_hr_after_open}")
                    except Exception as e:
                        print(f"Method 2 failed for {ticker}: {e}")
                        
            except Exception as e:
                print(f"1hr after open completely failed for {ticker}: {e}")
                pass
            
            print(f"Final 1hr price for {ticker}: {one_hr_after_open}")
            
            result[ticker] = {
                "date": target_date,
                "actual_date": actual_date,
                "open": float(target_data['Open']),
                "close": float(target_data['Close']),
                "high": float(target_data['High']),
                "low": float(target_data['Low']),
                "volume": int(target_data['Volume']) if target_data['Volume'] is not None else None,
                "one_hr_after_open": one_hr_after_open
            }
            
    except Exception as e:
        return jsonify({"error": f"Failed to fetch historical data: {str(e)}"}), 500
    
    return jsonify(result)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
