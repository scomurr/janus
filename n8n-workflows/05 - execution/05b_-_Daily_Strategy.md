# 05b - Daily Strategy

## Summary
This workflow executes a daily trading strategy that buys stocks at market open and sells them at market close, implementing a day trading approach based on AI-generated conviction scores.

## How it is triggered
- **Morning Execution**: Scheduled trigger at 9:35 AM Central (5 minutes after market open) on weekdays (Monday-Friday)
- **Evening Execution**: Scheduled trigger at 4:00 PM Central (market close) on weekdays (Monday-Friday)

## What it does

### Morning Execution (9:35 AM):
1. Sets the current date for trading calculations
2. Retrieves available USDD cash from the `daily_positions` table
3. Gets the latest conviction scores from the `ticker_buys` table for the current date
4. Calculates position sizes based on conviction scores and available cash
5. Retrieves opening prices for the selected tickers from `daily_prices`
6. Calculates exact shares to buy for each ticker based on allocation and opening price
7. Records the morning buy transactions in the `daily_positions` table
8. Updates USDD cash position to reflect remaining funds

### Evening Execution (4:00 PM):
1. Sets the current date for trading calculations
2. Retrieves all positions bought during the day from `daily_positions`
3. Calculates end-of-day sales using closing prices
4. Records the sales transactions and updates USDD cash with proceeds
5. Effectively closes all positions at market close

## External Dependencies
- **PostgreSQL Database**: Stores trading data in tables:
  - `daily_positions`: Records daily buy/sell transactions
  - `ticker_buys`: Contains AI-generated conviction scores
  - `daily_prices`: Historical price data (open/close prices)
- **Discord Webhook**: Sends notifications for workflow start, completion, and errors
- **Market Data**: Requires daily price data to be populated in the `daily_prices` table before execution

## Key Features
- Fully automated day trading strategy
- Proportional allocation based on conviction scores
- Cash management with USDD as the base currency
- Error handling with Discord notifications
- Dual execution schedule for market open and close