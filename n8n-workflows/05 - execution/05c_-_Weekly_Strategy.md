# 05c - Weekly Strategy

## Summary
This workflow executes a weekly trading strategy that buys positions on Monday, monitors for mid-week conviction changes, and sells all positions on Friday. It implements a longer-term trading approach based on weekly conviction score evaluations.

## How it is triggered
- **Monday 9:00 AM**: Week start - initial position buying
- **Tuesday-Thursday 10:00 AM**: Mid-week conviction monitoring
- **Friday 4:00 PM**: Week end - position liquidation

## What it does

### Monday Morning (9:00 AM):
1. Sets the current date for weekly calculations
2. Retrieves available USDW (weekly cash) from the `weekly_positions` table
3. Gets the latest conviction scores from `ticker_buys` (only positive convictions)
4. Calculates weekly position sizes based on conviction scores and available cash
5. Retrieves Monday opening prices for selected tickers
6. Calculates shares to buy for each ticker and records transactions
7. Updates USDW cash position with remaining funds

### Mid-Week Monitoring (Tuesday-Thursday 10:00 AM):
1. Identifies current week holdings from `weekly_positions`
2. Checks current conviction scores for held positions
3. Filters for positions with zero conviction (sell signals)
4. If zero conviction positions found:
   - Calculates position size and current price
   - Executes immediate sale of zero-conviction positions
   - Converts proceeds to USDW cash
   - Sends Discord notification for debugging

### Friday Evening (4:00 PM):
1. Retrieves all positions held during the current week
2. Calculates sales for all non-USDW positions using closing prices
3. Records final sales transactions
4. Consolidates all proceeds into USDW cash position
5. Effectively closes the weekly trading cycle

## External Dependencies
- **PostgreSQL Database**: Stores trading data in tables:
  - `weekly_positions`: Records weekly buy/sell transactions
  - `ticker_buys`: Contains AI-generated conviction scores
  - `daily_prices`: Historical price data for open/close prices
- **Discord Webhook**: Sends notifications for workflow events and debugging alerts
- **Market Data**: Requires current price data in the `daily_prices` table

## Key Features
- Weekly trading cycle with systematic entry/exit points
- Mid-week risk management through conviction monitoring
- Automatic liquidation of zero-conviction positions
- Cash management with USDW as the weekly base currency
- Comprehensive error handling and monitoring
- Debugging notifications for mid-week conviction changes

## Notes
- Contains a disabled node for mid-week sales recording (marked for review)
- Includes a sticky note indicating potential timing issues with conviction score updates
- The workflow is currently set to active status