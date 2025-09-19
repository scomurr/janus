# 00 - Weekly Fixer

## Summary
Manages weekly trading strategy by allocating cash to positions based on conviction scores and selling zero-conviction positions.

## Trigger
Manual trigger - executed when user clicks "Execute workflow"

## Use Case
This workflow handles weekly portfolio rebalancing in two scenarios:

### Monday Morning (Buy Path):
1. Gets available USDW cash from previous week
2. Retrieves latest conviction scores for the specified date
3. Calculates position sizes based on conviction-weighted allocation
4. Gets Monday open prices for target symbols
5. Calculates shares to buy and records purchases in `weekly_positions`
6. Updates USDW cash balance with remaining funds

### Mid-week Rebalancing (Sell Path):
1. Identifies current week holdings
2. Checks current conviction scores
3. Filters for positions with zero conviction (need to sell)
4. Gets current position sizes and closing prices
5. Calculates complete position sales
6. Records sales in `weekly_positions` and adds cash back to USDW

The workflow uses hardcoded dates (2025-09-08 for buys, 2025-09-09 for sells) and maintains separate cash tracking with USDW symbol.

## External Dependencies
- PostgreSQL database with `weekly_positions`, `ticker_buys`, and `daily_prices` tables
- Price data availability for trading dates