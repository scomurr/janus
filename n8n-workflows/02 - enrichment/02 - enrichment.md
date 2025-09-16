# Enrichment Workflows

This directory contains n8n workflows for the enrichment category of the Janus trading system.

## Workflow Overview

### 02 - Weekly Ticker Info Refresh
- **File**: `02_-_Weekly_Ticker_Info_Refresh.json`
- **Status**: Active (active: true)
- **Schedule**: Weekly - Sundays at 4:00 AM
- **Purpose**: Enriches ticker universe with comprehensive market and financial data from Yahoo Finance
- **Use Case**: 
  - Fetches fundamental financial data for all tickers in the universe
  - Processes tickers in batches of 50 to manage API rate limits
  - Updates `ticker_universe` table with enriched market data including:
    - Market capitalization
    - Trading volume
    - Trailing P/E ratio
    - 52-week high/low prices
    - Dividend yield
    - Total revenue
    - Gross margins
    - Raw JSON data for complete information preservation
  - Implements intelligent scanning logic that prioritizes unscanned tickers and daily refreshes
  - Uses loop-based processing to handle large ticker universes efficiently

## Workflow Features

### Batch Processing
- **Intelligent Batching**: Processes up to 50 tickers per API call to optimize performance
- **Rate Limiting**: Built-in 0.5-second delays between batch requests to respect API limits
- **Loop Management**: Calculates total loop count based on ticker universe size
- **Resumable Processing**: Tracks `last_scanned` timestamp to enable incremental processing

### Data Management
- **Selective Updates**: Uses `COALESCE` to preserve existing data when new data is unavailable
- **Data Sanitization**: Validates numeric data and handles null values appropriately
- **JSON Storage**: Stores complete raw API response in `info_raw` JSONB field
- **Timestamp Tracking**: Maintains both `last_updated` and `last_scanned` timestamps

### Error Handling & Monitoring
- **Discord Notifications**: 
  - Workflow start confirmation
  - Completion notification
  - Comprehensive error reporting with execution details
- **Robust Error Management**: Error trigger catches and reports all workflow failures
- **Data Integrity**: Uses database transactions to ensure consistent data state

### Performance Optimization
- **Incremental Processing**: Only processes tickers that haven't been scanned today
- **Batch Aggregation**: Combines individual ticker updates into batch operations
- **Memory Management**: Uses no-op nodes and proper data flow to minimize memory usage
- **API Efficiency**: Combines multiple tickers into single API requests

## API Integration

### Yahoo Finance Integration
- **Service Endpoint**: `http://marketcap-api:5000/info`
- **Data Fields**: marketCap, volume, trailingPE, fiftyTwoWeekHigh, fiftyTwoWeekLow, dividendYield, totalRevenue, grossMargins
- **Response Handling**: Processes structured JSON responses with symbol-keyed data
- **Error Tolerance**: Continues processing even if individual ticker data is unavailable

### Processing Logic
1. **Count Analysis**: Determines total ticker universe size
2. **Loop Calculation**: Calculates required number of 50-ticker batches
3. **Batch Processing**: Iteratively processes batches with proper data flow
4. **Data Enrichment**: Updates database with fetched financial metrics
5. **Completion Tracking**: Updates scan timestamps and aggregates results

## Dependencies

- **External APIs**: 
  - Python market cap API service (marketcap-api:5000)
  - Discord webhook for notifications
- **Database**: PostgreSQL with `ticker_universe` table structure
- **Infrastructure**: Docker container network for API communication

## Data Output

Enriches the `ticker_universe` table with financial metrics:
- `market_cap` - Company market capitalization (BIGINT)
- `volume` - Average trading volume (BIGINT)  
- `trailing_pe` - Trailing price-to-earnings ratio (DOUBLE PRECISION)
- `fifty_two_week_high/low` - 52-week price range (DOUBLE PRECISION)
- `dividend_yield` - Dividend yield percentage (DOUBLE PRECISION)
- `total_revenue` - Company total revenue (BIGINT)
- `gross_margins` - Gross profit margins (DOUBLE PRECISION)
- `last_updated` - Data refresh timestamp
- `last_scanned` - Last processing timestamp
- `info_raw` - Complete raw API response (JSONB)

This enriched data serves as the foundation for scoring algorithms and trading decision workflows in the Janus system.