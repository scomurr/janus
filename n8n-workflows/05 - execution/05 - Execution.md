Summary
 - runs weekdays at 4PM Central and executes portfolio allocation based on conviction scores, fetches current prices, and tracks daily portfolio performance

** Portfolio Management Process **
- Uses dynamic portfolio value based on current holdings (defaults to $1,000 if no prior data)
- Allocates funds proportionally based on conviction scores
- Fetches real-time pricing data for position sizing
- Tracks daily performance and profit/loss calculations

Trigger
 - 4PM Central, Monday through Friday (cron: 0 16 * * 1-5)

Create portfolio_positions Table if Missing
 - creates table to store portfolio positions with allocation, conviction, and timestamp

Create price_snapshots Table if Missing
 - creates table to store daily price snapshots for performance tracking

Create daily_valuation Table if Missing
 - creates table to store daily portfolio valuations and P&L calculations

Get Portfolio Value
 - queries current portfolio value from latest daily_valuation records
 - returns sum of all position values, defaults to $1,000 if no data exists

Get Today's Assets
 - retrieves tickers from ticker_buys that were updated within last 20 hours

Set Position Size Per Ticker
 - calculates USD allocation per ticker based on conviction score weighting
 - uses current portfolio value allocated proportionally by conviction scores
 - formula: (ticker_conviction ÷ total_conviction) × current_portfolio_value

Set Portfolio Positions
 - inserts/updates portfolio positions in database with allocations and metadata

YF - Get Price Data
 - fetches current closing price for each ticker from marketcap-api

Set Daily Price Info
 - stores current price snapshots in price_snapshots table for historical tracking

No Operation, do nothing
 - synchronization point to ensure price data is stored before valuation

Get Portfolio Info
 - retrieves latest portfolio positions with current day's price data

Code
 - calculates portfolio metrics for each position:
   - quantity_held = allocation_usd ÷ current_price
   - value_close = quantity_held × current_price  
   - profit_loss = current_value - original_allocation

Set daily_valuations
 - stores daily portfolio performance data including quantities, values, and P&L