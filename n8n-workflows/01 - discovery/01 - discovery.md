# Discovery Workflows

This directory contains n8n workflows for the discovery category of the Janus trading system.

## Workflow Overview

### 01 - Ticker Fetcher
- **File**: `01_-_Ticker_Fetcher.json`
- **Status**: Active (active: true)
- **Schedule**: Weekly - Saturdays at 5:00 PM
- **Purpose**: Automated ticker symbol discovery and universe maintenance
- **Use Case**: 
  - Fetches ticker symbols from official NASDAQ sources:
    - NASDAQ listed companies from https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt
    - NYSE/AMEX listed companies from https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt
  - Parses ticker data including symbol, company name, and exchange
  - Updates the `ticker_universe` table with new symbols (inserts only, no conflicts)
  - Maintains comprehensive ticker universe for downstream workflows
  - Includes Discord notifications for workflow start, completion, and error handling
  - Uses SQL escape handling for company names with special characters

## Workflow Features

### Automation
- **Scheduled Execution**: Runs automatically every Saturday at 5:00 PM
- **Data Sources**: Official NASDAQ data feeds ensure accurate and up-to-date ticker information
- **Error Handling**: Comprehensive error catching with Discord notifications
- **Conflict Resolution**: Uses `ON CONFLICT DO NOTHING` to avoid duplicate entries

### Data Processing
- **Multi-Exchange Support**: Processes both NASDAQ and other exchanges (NYSE/AMEX)
- **Data Validation**: Filters out header rows and metadata from source files
- **SQL Injection Protection**: Escapes special characters in company names
- **Merge Operations**: Combines data from multiple sources into unified output

### Notifications
- **Discord Integration**: Sends notifications for:
  - Workflow start confirmation
  - Successful completion
  - Error conditions with detailed error messages
- **Monitoring**: Facilitates easy monitoring of data pipeline health

## Dependencies

- **External APIs**: 
  - NASDAQ Trader website for ticker lists
  - Discord webhook for notifications
- **Database**: PostgreSQL with `ticker_universe` table
- **Network**: Reliable internet connection for data fetching

## Data Output

Updates the `ticker_universe` table with:
- `symbol` - Stock ticker symbol
- `name` - Company name (SQL-escaped)
- `exchange` - Exchange identifier (NASDAQ or OTHER)

This ticker universe serves as the foundation for all subsequent discovery, enrichment, scoring, and execution workflows in the Janus system.