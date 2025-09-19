# 03d - Get Prices Info per Time

## Summary
This workflow collects and stores daily stock price data at specific market times. It captures opening prices at market open and closing prices at market close for actively traded tickers, storing the data in a PostgreSQL database for historical analysis and trading strategy development.

## How it is Triggered
- **Opening Prices**: Daily at 9:30 AM Central (market open) on weekdays (Monday-Friday)
- **Closing Prices**: Daily at 3:55 PM Central (5 minutes before market close) on weekdays (Monday-Friday)
- **1Hr After Open**: Daily at 11:00 AM Central on weekdays (currently disabled)
- **Trigger Type**: Schedule triggers with cron expressions

## What it Does

### Opening Prices Collection (9:30 AM Central)
1. **Active Ticker Retrieval**: Queries `ticker_buys` table to get symbols for the current trading date
2. **Price Fetching**: Calls Python API (`marketcap-api:5000/daily-prices`) to get opening price data
3. **Data Processing**: JavaScript code processes the API response and structures data for database insertion
4. **Database Storage**: Inserts opening prices into `daily_prices` table with conflict handling

### Closing Prices Collection (3:55 PM Central)
1. **Ticker Retrieval**: Queries `daily_prices` table to get symbols that already have opening price data
2. **Price Fetching**: Calls the same Python API to get current/closing price data
3. **Data Processing**: Processes API response to extract closing prices
4. **Database Update**: Updates existing records in `daily_prices` table with closing prices

### 1Hr After Open Collection (11:00 AM Central - Disabled)
- Similar process to capture prices 1 hour after market open
- Uses historical price API endpoint
- Currently disabled in the workflow

## External Dependencies
- **PostgreSQL Database**:
  - `ticker_buys` table for active trading symbols
  - `daily_prices` table for storing price data
- **Python Market API** (`marketcap-api:5000`):
  - `/daily-prices` endpoint for current price data
  - `/historical-prices` endpoint for historical data
- **Discord Webhooks**: For workflow start/completion notifications and error alerts
- **Market Data Provider**: Underlying data source for the Python API

## Notes
- The workflow handles three different time points but only opening and closing are currently active
- Uses proper conflict handling with `ON CONFLICT DO NOTHING` for opening prices and `UPDATE` for closing prices
- Error handling includes Discord notifications for workflow monitoring
- Time zones are configured for Central Time to align with US market hours
- Data is structured to support daily trading analysis and historical backtesting