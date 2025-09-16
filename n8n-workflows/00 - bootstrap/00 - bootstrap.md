# Bootstrap Workflows

This directory contains n8n workflows for the bootstrap category of the Janus trading system.

## Workflow Overview

### 00 - Bootstrap
- **File**: `00_-_Bootstrap.json`
- **Status**: Inactive (active: false)
- **Schedule**: Manual trigger only
- **Purpose**: Database initialization workflow that creates all required database tables for the Janus trading system
- **Use Case**: Sets up the initial database schema including:
  - `ticker_universe` - Stores ticker symbol data and market information
  - `ticker_scores` - Stores scoring and recommendation data for tickers
  - `ticker_buys` - Tracks buy decisions with conviction scores and thesis
  - `daily_prices` - Stores daily price data (open, close, 1hr after open)
  - `portfolio_positions` - Tracks portfolio allocations and positions
  - `price_snapshots` - Historical price snapshots
  - `daily_valuation` - Daily position valuations across strategies
  - `daily_positions` - Daily trading position tracking
  - `weekly_positions` - Weekly trading position tracking with initial $1000 USDW seed

### 00 - Weekly Fixer
- **File**: `00_-_Weekly_Fixer.json`
- **Status**: Inactive (active: false)
- **Schedule**: Manual trigger only
- **Purpose**: Manages weekly trading strategy positions - handles both Monday purchases and mid-week sales
- **Use Case**: 
  - **Monday Operations**: Calculates position sizes based on conviction scores and available USDW cash, executes purchases at market open prices
  - **Mid-week Operations**: Identifies positions with zero conviction and executes sales, converting proceeds back to USDW cash
  - Maintains weekly portfolio rebalancing based on updated conviction scores

### 00 - Manual Get Pricing for Specific Day
- **File**: `00_-_Manual_Get_Pricing_for_Specific_Day.json`
- **Status**: Inactive (active: false)
- **Schedule**: Manual trigger only
- **Purpose**: Fetches historical price data for a specific date from the Python market cap API
- **Use Case**: 
  - Retrieves historical pricing data (open, close, high, low, volume, 1hr after open) for all active tickers
  - Uses HTTP request to Python API service (marketcap-api:5000)
  - Processes and stores price data in the `daily_prices` table
  - Includes conflict resolution to update existing records selectively
  - Currently configured for 2025-09-09 (hardcoded in API call)

### 00 - Daily Fixer
- **File**: `00_-_Daily_Fixer.json`
- **Status**: Inactive (active: false)
- **Schedule**: Manual trigger only
- **Purpose**: Manages daily trading strategy positions for morning purchases and end-of-day liquidation
- **Use Case**:
  - **Morning Operations**: Calculates position sizes based on conviction scores and available USDD cash, executes purchases at market open prices
  - **End-of-Day Operations**: Liquidates all daily positions at market close prices, converts proceeds back to USDD cash
  - Implements daily momentum trading strategy with complete position turnover each trading day
  - Tracks positions in `daily_positions` table with separate buy/sell records

## Common Features

All workflows in this directory share the following characteristics:
- Manual trigger execution (no automated scheduling)
- PostgreSQL database integration for data persistence
- Integration with conviction scoring system
- Cash management through USDW (weekly) and USDD (daily) synthetic cash positions
- Position sizing based on conviction score weightings
- Integration with daily price data from external API services

## Dependencies

- PostgreSQL database with proper credentials configured
- Python market cap API service running on port 5000
- Active ticker universe populated in `ticker_buys` table
- Daily price data availability for trading operations