# Execution Workflows

This directory contains n8n workflows for the execution category of the Janus trading system.

## Workflow Overview

### 05b - Daily Strategy
- **File**: `05b_-_Daily_Strategy.json`
- **Status**: Active (active: true)
- **Schedule**: Multiple daily schedules:
  - 9:35 AM Central (Market Open) - Buy positions
  - 4:05 PM Central (Market Close) - Sell positions
- **Purpose**: Automated daily trading strategy with intraday position management
- **Use Case**: 
  - Executes daily buy-and-sell strategy based on conviction scores
  - Allocates available USDD cash proportionally by conviction weights
  - Opens positions at market open using opening prices
  - Closes all positions at market close using closing prices
  - Maintains daily position history in `daily_positions` table
  - Provides full cash utilization with automatic rebalancing
  - Includes comprehensive Discord notifications for trade execution

### 05c - Weekly Strategy
- **File**: `05c_-_Weekly_Strategy.json`
- **Status**: Active (active: true)
- **Schedule**: Multiple weekly schedules:
  - Monday 9:00 AM - Week start (buy positions)
  - Tuesday-Thursday 10:00 AM - Midweek conviction checks
  - Friday 4:00 PM - Week end (sell all positions)
- **Purpose**: Weekly position management with midweek conviction monitoring
- **Use Case**: 
  - Opens positions Monday morning based on conviction scores
  - Monitors conviction changes Tuesday-Thursday and sells zero-conviction positions
  - Closes all positions Friday afternoon regardless of conviction
  - Uses USDW as cash equivalent for weekly strategy
  - Tracks weekly performance and position changes
  - Maintains `weekly_positions` table with detailed trade history
  - Provides systematic weekly reset of portfolio positions

### 05d - Hold Strategy
- **File**: `05d_-_Hold_Strategy.json`
- **Status**: Inactive (active: false)
- **Schedule**: Monday 9:00 AM - Weekly rebalancing
- **Purpose**: Long-term hold strategy with periodic rebalancing
- **Use Case**: 
  - Maintains long-term portfolio based on conviction scores
  - Rebalances portfolio weekly when allocation drifts >5% from target
  - Uses conviction scores to determine target portfolio allocation
  - Automatically sells positions when conviction drops to zero
  - Uses USDH as cash equivalent for hold strategy
  - Creates and manages `hold_positions` table with detailed rebalancing history
  - Designed for buy-and-hold investors with periodic adjustments

## Workflow Features

### Daily Strategy (05b)
- **Intraday Execution**: Complete buy/sell cycle within each trading day
- **Cash Management**: Utilizes 100% of available USDD cash daily
- **Proportional Allocation**: Distributes capital based on conviction score weights
- **Price-Based Execution**: Uses opening prices for buys, closing prices for sells
- **Risk Management**: Zero overnight exposure with daily position closure

### Weekly Strategy (05c)
- **Multi-Day Holding**: Positions held Monday through Friday
- **Dynamic Adjustment**: Midweek selling of zero-conviction positions
- **Weekly Reset**: Complete portfolio liquidation every Friday
- **Conviction Monitoring**: Active tracking of conviction changes during week
- **Systematic Approach**: Consistent weekly cycle regardless of market conditions

### Hold Strategy (05d)
- **Long-Term Focus**: Designed for extended position holding
- **Rebalancing Logic**: Only trades when allocation drifts significantly (>5%)
- **Conviction-Based**: Portfolio weights directly tied to conviction scores
- **Efficient Trading**: Minimizes transactions through drift thresholds
- **Portfolio Maintenance**: Automatic position closure when conviction reaches zero

### Automation Features
- **Schedule Coordination**: Multiple daily/weekly triggers for trade execution
- **Error Handling**: Comprehensive error catching with Discord notifications
- **Trade Logging**: Detailed transaction history with timestamps and reasoning
- **Cash Management**: Automatic cash allocation and rebalancing across strategies
- **Price Integration**: Real-time price data integration for accurate execution

## Dependencies

- **External Services**: 
  - Discord webhook for trade notifications and error alerts
  - Daily price data from `daily_prices` table
  - PostgreSQL for position and transaction storage
- **Data Sources**:
  - Conviction scores from `ticker_buys` table
  - Current price data from `daily_prices` table
  - Portfolio positions from strategy-specific tables
- **Database Tables**:
  - `daily_positions` - Daily strategy transaction log
  - `weekly_positions` - Weekly strategy transaction log  
  - `hold_positions` - Hold strategy transaction log
  - `ticker_buys` - Conviction scores for position sizing
  - `daily_prices` - Current market price data

## Data Output

### Daily Positions (`daily_positions`)
- `symbol` - Stock ticker symbol
- `date` - Trading date
- `shares_bought` - Shares purchased (morning)
- `shares_sold` - Shares sold (evening)
- `updated_at` - Transaction timestamp

### Weekly Positions (`weekly_positions`)  
- `symbol` - Stock ticker symbol
- `date` - Trading date
- `shares_bought` - Shares purchased
- `shares_sold` - Shares sold
- `buy_price` - Purchase price per share
- `sell_price` - Sale price per share
- `conviction_at_buy` - Conviction score at purchase
- `conviction_at_sell` - Conviction score at sale

### Hold Positions (`hold_positions`)
- `symbol` - Stock ticker symbol
- `date` - Transaction date
- `shares_bought` - Shares purchased
- `shares_sold` - Shares sold
- `buy_price` - Purchase price per share
- `sell_price` - Sale price per share
- `conviction_at_buy` - Conviction score at purchase
- `conviction_at_sell` - Conviction score at sale
- `rebalance_reason` - Explanation for rebalancing trade
- `created_at` - Transaction timestamp
- `updated_at` - Last modification timestamp

## Strategy Comparison

| Feature | Daily Strategy | Weekly Strategy | Hold Strategy |
|---------|---------------|----------------|---------------|
| **Holding Period** | Intraday only | Monday-Friday | Long-term |
| **Cash Symbol** | USDD | USDW | USDH |
| **Rebalancing** | Daily complete | Weekly reset + midweek sells | Drift-based (>5%) |
| **Risk Profile** | Lowest overnight risk | Medium-term exposure | Long-term market exposure |
| **Trade Frequency** | Very high (2x daily) | Medium (weekly + adjustments) | Low (as needed) |
| **Conviction Sensitivity** | Daily response | Midweek monitoring | Weekly assessment |

This execution system provides three distinct trading strategies, each optimized for different risk tolerance and holding period preferences, with automated execution and comprehensive trade tracking.