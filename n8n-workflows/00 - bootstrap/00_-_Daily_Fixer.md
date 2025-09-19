# 00 - Daily Fixer

## Summary
Executes daily trading strategy by buying positions at market open and selling them at market close.

## Trigger
Manual trigger - executed when user clicks "Execute workflow"

## Use Case
This workflow implements a daily trading strategy with two execution paths:

### Morning Execution (Buy Path):
1. Gets available USDD cash balance from previous day
2. Retrieves latest conviction scores for the trading date
3. Calculates position sizes based on conviction-weighted allocation
4. Gets opening prices for target symbols
5. Calculates shares to buy based on available cash and opening prices
6. Records morning purchases in `daily_positions` table
7. Updates USDD cash balance with remaining funds

### End of Day Execution (Sell Path):
1. Gets all positions bought during the day with their prices
2. Calculates end-of-day sales using closing prices
3. Updates `daily_positions` with shares sold
4. Converts all proceeds back to USDD cash

The workflow uses dynamic date setting (current date) for morning buys and a hardcoded date (2025-09-09) for end-of-day processing. All non-cash positions are liquidated daily.

## External Dependencies
- PostgreSQL database with `daily_positions`, `ticker_buys`, and `daily_prices` tables
- Real-time price data for opening and closing prices
- USDD symbol used for cash tracking in daily strategy