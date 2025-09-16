# Node UI - Janus Research Console

## Summary

The Janus Research Console is a comprehensive web application that provides financial analysis and portfolio management interfaces for micro-cap equity research. The application has evolved to support multiple investment strategies (Daily, Weekly, and Hold) with their own dedicated tracking systems. It connects to a PostgreSQL database containing ticker scoring data and portfolio positions, providing tools for identifying stocks with multiple "Buy" recommendations, generating detailed financial analysis prompts, and visualizing multi-strategy portfolio performance.

## Docker Configuration

### Dockerfile
- **Base Image**: `node:20-alpine` - Lightweight Node.js runtime
- **Working Directory**: `/app`
- **Installation**: Production dependencies only (`npm install --omit=dev`)
- **Port**: Exposes port 3000
- **Entry Point**: `node server.js`
- **Assets**: Copies `server.js` and entire `public/` directory
- **Security**: Runs as non-root in alpine container

### Docker Compose (compose.yaml)
- **Service Name**: `janus-app`
- **Network**: Connected to external `n8n-net` network for database access
- **Port Mapping**: Host port 3001 → Container port 3000
- **Environment Variables**:
  - `DB_HOST`: n8n-postgres (PostgreSQL host in Docker network)
  - `DB_PORT`: 5432
  - `DB_USER`: n8n
  - `DB_PASS`: n8npass
  - `DB_NAME`: n8n
  - `APP_PORT`: 3000
- **Restart Policy**: `unless-stopped` - Automatically restarts on failure
- **Dependencies**: Assumes existing `n8n-net` network with PostgreSQL database

## Application Architecture

### Backend (server.js)
- **Framework**: Express.js with ES modules (type: "module" in package.json)
- **Database**: PostgreSQL connection using `pg` Pool with configurable connection parameters
- **Static Files**: Serves frontend assets from `/public` directory
- **JSON Support**: Built-in JSON request parsing middleware
- **Error Handling**: Comprehensive try-catch blocks with structured error responses
- **Database Tables**: Supports multiple strategy-specific position tables

### Frontend Architecture
The application features a dual-interface design:

1. **Research Console** (`/` route) - Primary stock analysis interface
2. **Portfolio Dashboard** (`/portfolio.html` route) - Multi-strategy portfolio visualization

### Strategy System
The application implements a sophisticated multi-strategy architecture:

- **Daily Strategy**: High-frequency trading positions (buy at open, sell at close)
- **Weekly Strategy**: Medium-term positions managed on weekly cycles
- **Hold Strategy**: Long-term buy-and-hold positions with rebalancing

Each strategy is completely self-contained with:
- Dedicated database tables (`daily_positions`, `weekly_positions`, `hold_positions`)
- Specific API endpoint namespaces (`/api/daily/`, `/api/weekly/`, `/api/hold/`)
- Individual frontend modules (`daily-strategy.js`, `weekly-strategy.js`, `hold-strategy.js`)

## API Endpoints

### Research & Analysis Endpoints

#### GET /api/buys
**Purpose**: Retrieve tickers with multiple "Buy" recommendations
- **Query**: `SELECT symbol, count(*) FROM ticker_scores WHERE recommendation='Buy' GROUP BY symbol HAVING count(*) > 1 ORDER BY count DESC`
- **Response**: Array of `{symbol, count}` objects sorted by recommendation count
- **Use Case**: Identifying consensus buy recommendations for further analysis

#### GET /api/ticker/:symbol/prompt
**Purpose**: Generate comprehensive financial analysis prompt for AI-powered research
- **Parameters**: `symbol` (stock ticker, case-insensitive, URL-encoded)
- **Data Source**: `ticker_universe` table with enriched financial metrics
- **Response Structure**:
  ```json
  {
    "symbol": "AAPL",
    "data": {
      "market_cap": 3000000000000,
      "revenue": 365000000000,
      "gross_margins": 0.43,
      "trailing_pe": 28.5,
      "dividend_yield": 0.015,
      "high": 182.94,
      "low": 124.17,
      "volume": 75000000
    },
    "prompt": "/* 2000+ word structured analysis template */"
  }
  ```
- **Analysis Framework**: Professional micro-cap equity analysis structure covering:
  - Key Financials (market cap, revenue, margins, valuation multiples)
  - Business Model & Competitive Position
  - Price & Volume Behavior Analysis
  - Risk Assessment (dilution, solvency, governance, liquidity)
  - Upcoming Catalysts (6-month forward-looking)
  - Alpha Thesis Development
  - Final Buy/Sell Recommendation with reasoning

### Daily Strategy Endpoints

#### GET /api/daily/status
**Purpose**: Current day portfolio status for daily strategy
- **Logic**: Aggregates positions for current date from `daily_positions`
- **Response**: Current cash (USDD) and equity positions with net shares
- **Calculation**: `SUM(shares_bought) - SUM(shares_sold)` grouped by symbol

#### GET /api/daily/performance
**Purpose**: Historical performance data with P&L calculations
- **Data Sources**: `daily_positions` JOIN `daily_prices` for price data
- **Response**: Portfolio totals over time, individual asset performance, raw position data
- **P&L Calculation**: `shares_sold * (price_close - price_open)` for realized gains

#### GET /api/daily/execution/:date
**Purpose**: Detailed execution history for specific trading date
- **Parameters**: `date` in YYYY-MM-DD format
- **Response**: All buy/sell transactions with prices and P&L calculations

#### GET /api/daily/assets
**Purpose**: Aggregate performance summary across all assets ever traded
- **Aggregation**: Total shares traded, buy/sell values, net P&L by symbol
- **Metrics**: Trading days, date ranges, current positions

### Weekly Strategy Endpoints

#### GET /api/weekly/status
**Purpose**: Current week portfolio status (Monday-Sunday cycle)
- **Logic**: Positions from current Monday forward from `weekly_positions`
- **Currency**: USDW for cash positions
- **Features**: Conviction scores, rebalance reasons

#### GET /api/weekly/performance
**Purpose**: Weekly strategy performance with transaction-level P&L
- **P&L Method**: Uses stored `buy_price` and `sell_price` from positions table
- **Calculation**: More sophisticated than daily (accounts for multi-day holds)

#### GET /api/weekly/execution/:date
**Purpose**: Weekly execution history (finds Monday of input week)
- **Date Logic**: Automatically calculates week boundaries
- **Additional Data**: Conviction levels at buy/sell, rebalance reasoning

#### GET /api/weekly/assets
**Purpose**: Weekly strategy asset performance aggregation
- **Metrics**: Same structure as daily but with weekly-specific calculations

### Hold Strategy Endpoints

#### GET /api/hold/status
**Purpose**: Current long-term holdings with market values
- **Currency**: USDH for cash positions
- **Market Value**: Current shares × latest price from `daily_prices`
- **Features**: Shows unrealized P&L for current positions

#### GET /api/hold/performance
**Purpose**: Long-term portfolio value tracking over time
- **Complexity**: Calculates actual portfolio value (not just P&L) at each date
- **Method**: Cash + (shares × market_price) for true portfolio value

#### GET /api/hold/execution/:date
**Purpose**: Rebalancing activity for specific date
- **Features**: Includes rebalance reasons and conviction scores
- **Use Case**: Understanding portfolio allocation decisions

#### GET /api/hold/assets
**Purpose**: Long-term asset performance with actual portfolio metrics
- **Advanced Calculation**: True portfolio P&L vs. initial investment
- **Baseline**: Assumes $1000 initial investment for return calculations

### Chart Data Endpoints

#### GET /api/:strategy/chart-data
**Purpose**: Simplified chart data for performance visualization
- **Strategies**: Supports 'daily', 'weekly', 'hold'
- **Response**: Array of `{date, value}` objects for time series charts
- **Optimization**: Direct queries to cash position tables for performance

### Health & Monitoring

#### GET /healthz
**Purpose**: Container and application health check
- **Response**: `{"ok": true}`
- **Use Case**: Docker health checks, load balancer monitoring

## Database Schema Dependencies

The application expects these PostgreSQL tables in the `n8n` database:

### Core Research Tables

#### ticker_scores
- **Purpose**: Stock recommendation aggregation
- **Schema**:
  - `symbol` (VARCHAR) - Stock ticker symbol
  - `recommendation` (VARCHAR) - Values: 'Buy', 'Sell', 'Hold', etc.
- **Usage**: Multi-buy identification query

#### ticker_universe
- **Purpose**: Comprehensive financial metrics storage
- **Schema**:
  - `symbol` (VARCHAR) - Stock ticker symbol (primary key)
  - `market_cap`, `volume`, `trailing_pe` (NUMERIC) - Core metrics
  - `fifty_two_week_high`, `fifty_two_week_low` (NUMERIC) - Price ranges
  - `dividend_yield`, `total_revenue`, `gross_margins` (NUMERIC) - Financial ratios
- **Usage**: Analysis prompt generation with real financial data

### Strategy-Specific Position Tables

#### daily_positions
- **Purpose**: Daily trading strategy position tracking
- **Schema**:
  - `date` (DATE) - Trading date
  - `symbol` (VARCHAR) - Asset symbol (USDD for cash)
  - `shares_bought`, `shares_sold` (NUMERIC) - Transaction volumes
  - `created_at`, `updated_at` (TIMESTAMP) - Audit trail
- **Business Logic**: Buy at market open, sell at market close

#### weekly_positions
- **Purpose**: Weekly strategy position management
- **Schema**:
  - `date` (DATE) - Position date
  - `symbol` (VARCHAR) - Asset symbol (USDW for cash)
  - `shares_bought`, `shares_sold` (NUMERIC) - Position changes
  - `buy_price`, `sell_price` (NUMERIC) - Execution prices
  - `conviction_at_buy`, `conviction_at_sell` (NUMERIC) - Position sizing scores
- **Business Logic**: Weekly position review and adjustment

#### hold_positions
- **Purpose**: Long-term hold strategy with rebalancing
- **Schema**:
  - `date` (DATE) - Rebalance date
  - `symbol` (VARCHAR) - Asset symbol (USDH for cash)
  - `shares_bought`, `shares_sold` (NUMERIC) - Rebalance quantities
  - `buy_price`, `sell_price` (NUMERIC) - Execution prices
  - `conviction_at_buy`, `conviction_at_sell` (NUMERIC) - Allocation confidence
  - `rebalance_reason` (TEXT) - Decision rationale
- **Business Logic**: Buy-and-hold with periodic rebalancing

#### daily_prices
- **Purpose**: Market price data for P&L calculations
- **Schema**:
  - `date` (DATE) - Price date
  - `symbol` (VARCHAR) - Asset symbol
  - `price_open`, `price_close` (NUMERIC) - Daily OHLC data
- **Usage**: P&L calculation across all strategies

## Frontend Interface Guide

### Research Console (`/` - index.html)

#### Main Interface Elements:
1. **Left Panel - Ticker List**:
   - Title: "Tickers with multiple Buy recommendations"
   - Refresh button for real-time data updates
   - Status indicator showing load state
   - Interactive table with columns: Symbol, Buy count
   - Click any row to load analysis prompt

2. **Right Panel - Analysis Prompt**:
   - Selected ticker display with financial metrics
   - Copy-to-clipboard button for AI analysis tools
   - Large text area with comprehensive analysis template
   - Helper text box with instruction for AI tools
   - Financial metrics display: Market Cap, Revenue, Gross Margin, P/E, etc.

#### Usage Workflow:
1. Application auto-loads tickers with 2+ buy recommendations
2. Click ticker symbol in left table
3. Right panel loads with comprehensive analysis prompt
4. Review key financial metrics displayed below ticker name
5. Copy prompt to clipboard using "Copy prompt" button
6. Paste into AI analysis tool (Claude, ChatGPT, etc.)
7. Use helper instruction text for optimal AI results

#### Navigation:
- "Portfolio" button in top-right navigates to dashboard
- Responsive design adapts to mobile screens

### Portfolio Dashboard (`/portfolio.html`)

#### Layout Structure:
1. **Header**: Title and navigation breadcrumb
2. **Main Content**: Split-panel layout (chart + summary)
3. **Strategy Selector**: Three-button strategy switcher
4. **Footer**: Last updated timestamp

#### Strategy Selection Interface:
- **Three Strategy Buttons** (center of page):
  - **Hold Strategy**: Long-term positions with rebalancing
  - **Daily Strategy**: Active day-trading positions (default selection)
  - **Weekly Strategy**: Medium-term weekly position management
- **Visual Feedback**: Active strategy highlighted in blue
- **Auto-loading**: Switching strategies immediately loads new data

#### Chart Panel (Left Side):
1. **Interactive Legend**: 
   - Clickable colored squares for each dataset
   - Toggle visibility of portfolio total and individual assets
   - Default: Portfolio total visible, individual assets hidden
   
2. **Performance Chart**:
   - Time-series line chart using Chart.js
   - X-axis: Date range of strategy activity
   - Y-axis: Dollar values (P&L for daily/weekly, portfolio value for hold)
   - Hover tooltips show exact values and dates
   - Responsive design adapts to screen size

#### Summary Panel (Right Side):
1. **Total Value Display**: 
   - Large prominent dollar amount
   - Current portfolio value or cumulative P&L

2. **Strategy Status**: 
   - Current date/period information
   - Strategy-specific details (trading days, approach description)

3. **Asset Performance Table**:
   - Symbol, Trading Days, Cumulative P&L, Last Trade Date
   - Color-coded P&L (green positive, red negative)
   - Sortable by performance

4. **Asset Dropdown** (if data available):
   - Select individual assets for detailed view
   - Shows trading activity, P&L breakdown, position history
   - Current position status (held vs. closed)

#### Strategy-Specific Behaviors:

##### Daily Strategy (Default)
- **Chart**: Shows cumulative P&L from day-trading activity
- **Cash Symbol**: USDD positions represent portfolio value
- **P&L Calculation**: `shares_sold * (close_price - open_price)`
- **Status**: Buy-at-open, sell-at-close approach
- **Time Frame**: Daily position turnover

##### Weekly Strategy
- **Chart**: Weekly position management performance
- **Cash Symbol**: USDW for weekly strategy cash
- **Features**: Conviction scoring, weekly cycles
- **Time Frame**: Monday-Sunday position reviews

##### Hold Strategy
- **Chart**: Actual portfolio value over time (not just P&L)
- **Cash Symbol**: USDH for hold strategy cash
- **Features**: Long-term holdings with periodic rebalancing
- **Display**: Current holdings table with allocation percentages
- **Advanced Metrics**: Unrealized P&L, average cost basis

#### Interactive Features:
- **Auto-refresh**: Updates every 5 minutes (when data changes)
- **Responsive Design**: Mobile-optimized layouts
- **Error Handling**: Graceful fallbacks when data unavailable
- **Loading States**: Smooth transitions between strategies

## Usage Instructions

### Research Console Workflow
1. **Access**: Navigate to `http://localhost:3001/`
2. **Discover Opportunities**: 
   - Review automatically loaded list of tickers with multiple buy recommendations
   - Higher "Buy count" indicates stronger consensus
3. **Generate Analysis**:
   - Click any ticker symbol to load comprehensive analysis template
   - Review key financial metrics displayed
   - Click "Copy prompt" to copy analysis template
4. **AI Analysis**: 
   - Paste prompt into preferred AI tool (Claude, ChatGPT, etc.)
   - Use helper instruction: "Answer each of your questions with 'do you need to do that in order to follow the provided instructions?' Use that as your answer for each question and then proceed."
   - Receive structured professional equity analysis

### Portfolio Dashboard Workflow
1. **Access**: Click "Portfolio" from research console or navigate to `http://localhost:3001/portfolio.html`
2. **Strategy Selection**:
   - Choose strategy using three-button selector (Daily is default)
   - Each strategy shows different time horizons and approaches
3. **Performance Analysis**:
   - Review main chart for overall performance trend
   - Use legend to toggle individual asset visibility
   - Examine total value/P&L in right panel
4. **Detailed Investigation**:
   - Review asset performance table for winners/losers
   - Use asset dropdown for detailed position history
   - Understand trading activity and current holdings

### Strategy Comparison Workflow
1. **Daily Strategy Analysis**:
   - Best for: Understanding day-trading performance
   - Shows: Cumulative P&L from rapid position turnover
   - Time Frame: Daily execution, immediate results

2. **Weekly Strategy Analysis**:
   - Best for: Medium-term position management
   - Shows: Weekly conviction-based position adjustments
   - Features: Rebalance reasoning, conviction scores

3. **Hold Strategy Analysis**:
   - Best for: Long-term portfolio tracking
   - Shows: Actual portfolio value and allocation
   - Features: Buy-and-hold with strategic rebalancing

## Development & Deployment

### Local Development
```bash
# Install dependencies
npm install

# Configure database connection
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=your_user
export DB_PASS=your_password
export DB_NAME=n8n

# Start development server
npm start
# Server runs on http://localhost:3000
```

### Production Deployment with Docker
```bash
# Build and run with Docker Compose
docker-compose up -d

# Access application
# http://localhost:3001

# Monitor logs
docker-compose logs -f janus-app

# Stop services
docker-compose down
```

### Environment Configuration
Required environment variables:
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - Database username (default: postgres)
- `DB_PASS` - Database password (default: empty)
- `DB_NAME` - Database name (default: n8n)
- `APP_PORT` - Application port (default: 3000)

### Troubleshooting
- **Database Connection**: Verify n8n-net network exists and PostgreSQL is accessible
- **Missing Data**: Ensure ticker_scores, ticker_universe, and position tables are populated
- **Port Conflicts**: Change host port in compose.yaml if 3001 is in use
- **Strategy Data**: Each strategy requires its own position table with proper schema

## Application Purpose & Business Context

### Primary Use Cases
1. **Systematic Stock Screening**: Automated identification of stocks with multiple buy recommendations from various research sources
2. **AI-Enhanced Research**: Generation of professional-grade, structured analysis prompts optimized for AI financial analysis tools
3. **Multi-Strategy Portfolio Management**: Simultaneous tracking of different investment approaches (day-trading, weekly, buy-and-hold)
4. **Research Workflow Integration**: Seamless integration with n8n automation workflows for continuous data pipeline management
5. **Performance Attribution**: Understanding which strategy approach generates best risk-adjusted returns

### Target Users
- **Quantitative Analysts**: Data-driven investment research
- **Portfolio Managers**: Multi-strategy performance tracking
- **Research Analysts**: Systematic opportunity identification
- **Algorithmic Traders**: Strategy performance comparison

### Integration Ecosystem
The application is designed as the frontend interface for a larger financial data processing ecosystem:
- **n8n Workflows**: Automated data collection and processing
- **PostgreSQL Database**: Central data warehouse for financial metrics
- **AI Analysis Tools**: Downstream consumption of generated prompts
- **Trading Systems**: Potential integration for execution based on analysis

### Key Differentiators
1. **Multi-Strategy Architecture**: Simultaneous tracking of different investment approaches
2. **AI-Optimized Prompts**: Structured templates designed for modern AI analysis tools
3. **Real-Time Updates**: Live connection to continuously updated financial database
4. **Professional Framework**: Institutional-quality analysis structure and risk assessment
5. **Micro-Cap Focus**: Specialized tooling for small-cap equity research and analysis

This application bridges the gap between raw financial data and actionable investment insights, providing a comprehensive platform for systematic micro-cap equity research and portfolio management across multiple investment strategies.