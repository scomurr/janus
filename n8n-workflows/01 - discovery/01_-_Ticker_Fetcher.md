# 01 - Ticker Fetcher

## Summary
This workflow fetches stock ticker symbols from NASDAQ and other exchanges (NYSE/AMEX) and updates a PostgreSQL database with the latest ticker universe data.

## Trigger
- **Schedule**: Runs every Saturday at 5:00 PM
- **Cron Expression**: `0 17 * * 6`

## What It Does
1. **Fetch Data**: Downloads ticker symbol lists from two sources:
   - NASDAQ listed companies from `nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt`
   - NYSE/AMEX listed companies from `nasdaqtrader.com/dynamic/SymDir/otherlisted.txt`

2. **Parse Data**: Processes the downloaded text files to extract:
   - Stock symbol
   - Company name (with SQL escaping for special characters)
   - Exchange designation (NASDAQ or OTHER)

3. **Database Update**: Inserts ticker data into the `ticker_universe` table using PostgreSQL
   - Uses `ON CONFLICT (symbol) DO NOTHING` to avoid duplicates

4. **Notifications**: Sends Discord notifications for:
   - Workflow start
   - Workflow completion
   - Any errors that occur

## External Dependencies
- **NASDAQ Trader Data**:
  - `https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt`
  - `https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt`
- **PostgreSQL Database**: Requires `ticker_universe` table with columns for symbol, name, and exchange
- **Discord Webhooks**: For notifications (Janus Errors Webhook)
- **Credentials**:
  - PostgreSQL connection credentials
  - Discord webhook API credentials