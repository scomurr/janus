# 00 - Update Conviction Scores (manual)

## Summary
Manually updates conviction scores and investment thesis for specific tickers.

## Trigger
Manual trigger - executed when user clicks "Execute workflow"

## Use Case
This workflow allows manual updates to conviction scores by:
1. Setting the current date dynamically
2. Processing hardcoded conviction scores and thesis statements for specific tickers
3. Filtering for "buy" positions (though currently bypassed)
4. Inserting/updating records in the `ticker_buys` table with:
   - Symbol and conviction score (1-5 scale)
   - Trade date (current date)
   - Investment thesis explaining the conviction level

The workflow currently processes these tickers with updated conviction scores:
- CHRS: 4 (lowered from 5, Nasdaq compliance + revenue growth)
- DDC: 4 (raised from 3, first profitable half-year + BTC partnerships)
- GAMB: 3 (lowered from 4, Q2 beat offset by analyst cuts)
- ISSC: 2 (lowered from 4, revenue growth but F-16 avionics warning)
- REI: 3 (lowered from 4, record Q2 but CFO resignation concerns)
- TPVG: 2 (lowered from 3, Q2 gains offset by dividend cut)

## External Dependencies
- PostgreSQL database with `ticker_buys` table
- Manual updates required to conviction scores in the code node