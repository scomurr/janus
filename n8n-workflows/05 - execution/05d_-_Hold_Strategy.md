# 05d - Hold Strategy

## Summary
This workflow implements a long-term portfolio rebalancing strategy that maintains positions based on conviction scores and periodically rebalances the portfolio to match target allocations. It operates on a buy-and-hold principle with periodic adjustments.

## How it is triggered
- **Monday 9:55 AM**: Scheduled trigger for weekly portfolio rebalancing

## What it does

### Portfolio Rebalancing Process:
1. **Portfolio Analysis**:
   - Sets trading dates (current date and last Monday reference)
   - Retrieves current portfolio positions from `hold_positions` table
   - Merges portfolio data into a single JSON structure for analysis

2. **Conviction Assessment**:
   - Gets latest conviction scores from `ticker_buys` (last 24 hours, conviction > 0)
   - Merges conviction data for processing

3. **Rebalancing Calculation**:
   - Calculates total portfolio value from current holdings
   - Determines current allocation percentages for each position
   - Calculates target allocations based on conviction scores
   - Identifies positions requiring rebalancing (>5% allocation difference)
   - Flags positions with zero conviction for complete liquidation

4. **Trade Execution**:
   - Retrieves current market prices for rebalancing trades
   - Calculates exact shares to buy/sell for each rebalancing action
   - Determines net cash requirements and manages USDH (hold cash) position
   - Records all rebalancing trades with detailed reasoning

5. **Cash Management**:
   - Manages surplus cash by adding to USDH position
   - Uses USDH cash when additional funds needed for rebalancing
   - Maintains cash as USDH with 1.0 price (stable value)

## External Dependencies
- **PostgreSQL Database**: Stores trading data in tables:
  - `hold_positions`: Long-term position records with detailed trade information
  - `ticker_buys`: AI-generated conviction scores and timing data
  - `daily_prices`: Current market prices for rebalancing calculations
- **Discord Webhook**: Sends notifications for workflow start, completion, and errors
- **Market Data**: Requires current price data for accurate rebalancing calculations

## Key Features
- **Smart Rebalancing**: Only trades when allocation drift exceeds 5% threshold
- **Zero Conviction Handling**: Automatically liquidates positions with no conviction
- **Cash Management**: Uses USDH as stable cash equivalent
- **Detailed Logging**: Records rebalancing reasons and conviction levels
- **Risk Management**: Maintains target allocations while minimizing unnecessary trades

## Current Status
- **Workflow Status**: Inactive (active: false)
- **Record Trades Node**: Disabled (marked for review)
- Contains development notes about theoretical vs. practical implementation

## Notes
- The workflow includes a sticky note indicating this is a theoretical implementation
- In practice, the rebalancing approach would need modification for real trading
- Currently configured for testing/development purposes