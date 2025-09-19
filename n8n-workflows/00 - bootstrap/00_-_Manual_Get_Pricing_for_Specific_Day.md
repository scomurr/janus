# 00 - Manual Get Pricing for Specific Day

## Summary
Fetches and stores historical price data for specific dates using an external market data API.

## Trigger
Manual trigger - executed when user clicks "Execute workflow"

## Use Case
This workflow retrieves historical price data for a specific date by:
1. Setting the target date (hardcoded as 2025-09-15) and price type (close)
2. Getting all ticker symbols that have existing daily price records for that date
3. Calling the market data API with all symbols in a single batch request
4. Processing the returned price data (open, close, high, low, 1hr after open, volume)
5. Upserting the data into the `daily_prices` table with conflict resolution

The workflow supports different price types (open, close, all) and only updates the specified price components.

## External Dependencies
- MarketCap API service running on `marketcap-api:5000`
- PostgreSQL database with `daily_prices` table
- API timeout set to 30 seconds for large batch requests