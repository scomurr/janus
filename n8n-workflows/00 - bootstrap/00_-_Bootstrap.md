# 00 - Bootstrap

## Summary
Database initialization workflow that creates all required tables for the Janus trading system.

## Trigger
Manual trigger - executed when user clicks "Execute workflow"

## Use Case
This workflow sets up the complete database schema for the Janus trading system by creating the following tables in sequence:
- `ticker_universe`: Stores stock symbol information and market data
- `ticker_scores`: Stores AI-generated scores and recommendations
- `ticker_buys`: Tracks conviction scores and thesis for positions
- `daily_prices`: Historical price data (open, close, 1hr after open)
- `portfolio_positions`: Portfolio allocation snapshots
- `price_snapshots`: Price data at specific times
- `daily_valuation`: Daily position valuations across strategies
- `daily_positions`: Daily trading positions and cash flows
- `weekly_positions`: Weekly trading positions (seeds with $1000 USDW)
- `hold_positions`: Long-term hold positions (seeds with $1000 USDH)
- `company_news`: News articles and sentiment data

## External Dependencies
- PostgreSQL database
- Postgres credentials configured in n8n