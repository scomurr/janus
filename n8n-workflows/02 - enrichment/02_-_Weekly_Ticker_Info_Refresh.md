# 02 - Weekly Ticker Info Refresh

## Summary
This workflow refreshes market data for stock tickers in the ticker universe database on a weekly basis. It fetches current market information from Yahoo Finance and updates the PostgreSQL database with the latest financial metrics.

## Trigger
- **Schedule**: Runs every Sunday at 4:00 AM UTC
- **Type**: Cron trigger with expression `0 4 * * 0`

## Workflow Description
The workflow performs the following operations:

1. **Database Count Check**: Queries the PostgreSQL database to count total symbols in `ticker_universe` table
2. **Loop Setup**: Calculates how many batches of 50 symbols need to be processed
3. **Batch Processing**: For each batch:
   - Retrieves up to 50 tickers that haven't been scanned today or never scanned
   - Fetches market data from Yahoo Finance API including:
     - Market Cap
     - Volume
     - Trailing P/E ratio
     - 52-week high/low
     - Dividend yield
     - Total revenue
     - Gross margins
   - Updates the database with the new information
   - Marks symbols as scanned with current timestamp
4. **Loop Control**: Continues until all symbols are processed
5. **Completion Notification**: Sends Discord notification when finished

## External Dependencies

### APIs
- **Yahoo Finance API** (via marketcap-api service at `http://marketcap-api:5000`)
  - Endpoint: `/info`
  - Parameters: symbols, fields (marketCap, volume, trailingPE, etc.)

### Database
- **PostgreSQL Database**
  - Credential: "Postgres account"
  - Tables: `ticker_universe`
  - Operations: SELECT, UPDATE queries

### Notifications
- **Discord Webhook**
  - Credential: "Janus Errors Webhook"
  - Used for workflow start, completion, and error notifications

### Infrastructure
- **N8N Workflow Engine**
- **Docker/Container Environment** (implied by service URL format)

## Error Handling
- Error trigger captures workflow failures
- Discord notifications sent for errors with execution details
- Workflow name and error message included in error notifications