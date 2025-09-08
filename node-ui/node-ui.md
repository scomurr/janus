# Node UI - Janus Research Console

## Summary

The Janus Research Console is a web application that provides a financial analysis and portfolio management interface for micro-cap equity research. The application connects to a PostgreSQL database containing ticker scoring data and portfolio valuations, providing tools for identifying stocks with multiple "Buy" recommendations and generating detailed financial analysis prompts. It also includes a portfolio dashboard with charting capabilities to visualize portfolio performance over time.

## Docker Configuration

### Dockerfile
- **Base Image**: `node:20-alpine` - Lightweight Node.js runtime
- **Working Directory**: `/app`
- **Installation**: Production dependencies only (`npm install --omit=dev`)
- **Port**: Exposes port 3000
- **Entry Point**: `node server.js`

### Docker Compose (compose.yaml)
- **Service Name**: `janus-app`
- **Network**: Connected to external `n8n-net` network
- **Port Mapping**: Host port 3001 → Container port 3000
- **Environment Variables**:
  - `DB_HOST`: n8n-postgres (PostgreSQL host)
  - `DB_PORT`: 5432
  - `DB_USER`: n8n
  - `DB_PASS`: n8npass
  - `DB_NAME`: n8n
  - `APP_PORT`: 3000
- **Restart Policy**: `unless-stopped`

## Application Architecture

### Backend (server.js)
- **Framework**: Express.js with ES modules
- **Database**: PostgreSQL connection using `pg` Pool
- **Static Files**: Serves frontend from `/public` directory
- **JSON Support**: Built-in JSON request parsing

### Frontend
Two main interfaces:
1. **Research Console** (`index.html` + `app.js`) - Ticker analysis interface
2. **Portfolio Dashboard** (`portfolio.html` + `portfolio.js`) - Portfolio visualization

## API Endpoints

### GET /api/buys
**Purpose**: Retrieve tickers with multiple "Buy" recommendations
- **Query**: Selects symbols from `ticker_scores` table with count > 1 Buy recommendations
- **Response**: Array of `{symbol, count}` objects sorted by count descending
- **Use Case**: Identifying most recommended stocks for analysis

### GET /api/ticker/:symbol/prompt  
**Purpose**: Generate detailed financial analysis prompt for a specific ticker
- **Parameters**: `symbol` (stock ticker symbol, case-insensitive)
- **Data Source**: `ticker_universe` table
- **Response**: 
  ```json
  {
    "symbol": "AAPL",
    "data": { /* financial metrics */ },
    "prompt": "/* detailed analysis template */"
  }
  ```
- **Use Case**: Creates structured prompts for AI-powered financial analysis
- **Template**: Comprehensive micro-cap equity analysis framework covering:
  - Key financials (market cap, revenue, margins, P/E, etc.)
  - Business model assessment
  - Risk analysis (dilution, solvency, governance)
  - Catalyst identification
  - Alpha thesis development

### GET /api/portfolio/valuations
**Purpose**: Retrieve historical portfolio valuation data for charting
- **Data Source**: `daily_valuation` table
- **Response**: 
  ```json
  {
    "portfolioTotals": [/* daily total values */],
    "assetData": { /* per-symbol daily values */ },
    "symbols": [/* array of asset symbols */]
  }
  ```
- **Processing**: Aggregates daily values by date and by symbol
- **Use Case**: Portfolio performance visualization over time

### GET /api/portfolio/current
**Purpose**: Get current day portfolio snapshot
- **Data Source**: `daily_valuation` table (most recent date)
- **Response**:
  ```json
  {
    "assets": [/* current holdings with values */],
    "total": 12345.67,
    "date": "2024-01-01"
  }
  ```
- **Use Case**: Current portfolio composition and total value display

### GET /healthz
**Purpose**: Health check endpoint
- **Response**: `{"ok": true}`
- **Use Case**: Docker/deployment health monitoring

## Database Schema Dependencies

The application expects these PostgreSQL tables:

### ticker_scores
- `symbol` (VARCHAR) - Stock ticker symbol
- `recommendation` (VARCHAR) - Values include 'Buy', 'Sell', etc.
- Used for identifying stocks with multiple buy recommendations

### ticker_universe  
- `symbol` (VARCHAR) - Stock ticker symbol
- `market_cap`, `volume`, `trailing_pe`, `fifty_two_week_high`, `fifty_two_week_low` - Numeric financial metrics
- `dividend_yield`, `total_revenue`, `gross_margins` - Additional financial data
- Used for generating analysis prompts

### daily_valuation
- `date` (DATE) - Valuation date
- `symbol` (VARCHAR) - Asset symbol  
- `value_close` (NUMERIC) - Closing value for the asset
- Used for portfolio tracking and visualization

## Usage

### Research Console Interface
1. **Access**: Navigate to `http://localhost:3001/`
2. **Features**:
   - View tickers with multiple Buy recommendations
   - Click ticker to generate detailed analysis prompt
   - Copy prompts to clipboard for AI analysis tools
   - Quick navigation to Portfolio dashboard

### Portfolio Dashboard  
1. **Access**: Navigate to `http://localhost:3001/portfolio.html`
2. **Features**:
   - Interactive time-series chart of portfolio performance
   - Toggle individual asset visibility on chart
   - Current portfolio composition table with percentages
   - Auto-refresh every 5 minutes
   - Responsive design for mobile/desktop

### Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# Server runs on port 3000 (or APP_PORT env var)
```

### Production Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Access via http://localhost:3001
```

## Environment Configuration

Required environment variables:
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432) 
- `DB_USER` - Database user (default: postgres)
- `DB_PASS` - Database password (default: empty)
- `DB_NAME` - Database name (default: n8n)
- `APP_PORT` - Application port (default: 3000)

## Why This Application Exists

This application serves as a specialized financial research tool designed for:

1. **Systematic Stock Analysis**: Automates the identification of stocks receiving multiple buy recommendations from various sources
2. **AI-Enhanced Research**: Generates structured, professional-grade analysis prompts optimized for AI financial analysis tools
3. **Portfolio Tracking**: Provides visual monitoring of micro-cap portfolio performance with detailed breakdowns
4. **Research Workflow Integration**: Designed to work within the broader Janus n8n workflow ecosystem for automated financial data processing
5. **Decision Support**: Helps analysts focus on the most promising opportunities by surfacing consensus buy recommendations and providing comprehensive analysis frameworks

The application bridges the gap between raw financial data (stored in PostgreSQL via n8n workflows) and actionable investment research, making it easier to identify and analyze micro-cap investment opportunities systematically.