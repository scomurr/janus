# Scoring Workflows

This directory contains n8n workflows for the scoring category of the Janus trading system.

## Workflow Overview

### 03a - AI Scoring
- **File**: `03a_-_AI_Scoring.json`
- **Status**: Active (active: true)
- **Schedule**: Weekly - Sundays at 8:00 AM
- **Purpose**: Multi-model AI analysis and scoring of micro-cap stocks
- **Use Case**: 
  - Filters ticker universe for viable micro-cap investments (market cap < $300M)
  - Applies strict financial health criteria for quality screening
  - Analyzes filtered stocks using three AI models in parallel:
    - OpenAI GPT-4o-latest for primary analysis
    - Google Gemini 2.5 Flash for validation
    - Ollama Llama3 (local) for additional perspective
  - Generates investment scores (1-10) and recommendations (Buy/Hold/Sell)
  - Stores comprehensive analysis results in `ticker_scores` database table
  - Includes Discord notifications for workflow monitoring

### 03b - Update Conviction Scores (AI)
- **File**: `03b_-_Update_Conviction_Scores__AI_.json`
- **Status**: Inactive (active: false)
- **Schedule**: Manual trigger only
- **Purpose**: AI-powered conviction scoring (development/testing)
- **Use Case**: 
  - Retrieves active daily strategy tickers from portfolio
  - Uses AI agent with Redis memory for conviction analysis
  - Integrates with Kali tools for additional research capabilities
  - Generates hardcoded conviction scores for testing
  - Updates `ticker_buys` table with conviction ratings (1-5 scale)

### 03b - Update Conviction Scores (manual)
- **File**: `03b_-_Update_Conviction_Scores__manual_.json`
- **Status**: Inactive (active: false)
- **Schedule**: Manual trigger only
- **Purpose**: Manual conviction score entry and thesis management
- **Use Case**: 
  - Manual entry of conviction scores with detailed analyst notes
  - Combines multiple analyst notes into comprehensive thesis statements
  - Stores conviction ratings with trade dates for historical tracking
  - Updates `ticker_buys` table with manual conviction assessments
  - Used for human oversight and validation of AI recommendations

### 03d - Get Prices Info per Time
- **File**: `03d_-_Get_Prices_Info_per_Time.json`
- **Status**: Active (active: true)
- **Schedule**: Multiple daily schedules:
  - 9:30 AM Central (Market Open) - Opening prices
  - 3:55 PM Central (Market Close) - Closing prices
- **Purpose**: Automated price data collection throughout trading day
- **Use Case**: 
  - Fetches opening prices from Python API at market open
  - Collects closing prices before market close
  - Stores daily price data in `daily_prices` table
  - Supports historical price analysis and performance tracking
  - Includes comprehensive error handling and Discord notifications

## Workflow Features

### Multi-Model AI Analysis (03a)
- **Financial Screening**: Rigorous filtering criteria for micro-cap quality assessment
- **Parallel Processing**: Three AI models analyze each stock simultaneously
- **Comprehensive Scoring**: 1-10 investment scores with detailed reasoning
- **Risk Assessment**: Buy/Hold/Sell recommendations based on fundamental analysis

### Conviction Management (03b variants)
- **Human-AI Hybrid**: Combines AI analysis with human judgment
- **Historical Tracking**: Maintains conviction score history with timestamps
- **Thesis Management**: Stores detailed investment thesis for each position
- **Flexible Scoring**: 1-5 conviction scale for portfolio allocation

### Price Data Collection (03d)
- **Real-time Capture**: Opening and closing price collection
- **API Integration**: Python microservice for reliable price data
- **Data Persistence**: Historical price tracking in PostgreSQL
- **Schedule Flexibility**: Multiple daily collection points

### Automation Features
- **Scheduled Execution**: Automated runs at optimal market times
- **Error Handling**: Comprehensive error catching with Discord notifications
- **Data Validation**: SQL injection protection and data sanitization
- **Monitoring**: Real-time workflow status notifications

## Dependencies

- **External APIs**: 
  - OpenAI API for GPT-4o-latest analysis
  - Google Gemini API for validation analysis
  - Python microservice for price data (marketcap-api:5000)
  - Discord webhook for notifications
- **Local Services**:
  - Ollama for local AI model inference
  - Redis for AI agent memory management
  - PostgreSQL with scoring and pricing tables
- **Database Tables**:
  - `ticker_universe` - Filtered stock universe
  - `ticker_scores` - AI analysis results
  - `ticker_buys` - Conviction scores and thesis
  - `daily_prices` - Historical price data
  - `portfolio_positions` - Active trading positions

## Data Output

### Scoring Data (`ticker_scores`)
- `symbol` - Stock ticker symbol
- `model` - AI model used (openai/gemini/llama3)
- `score` - Investment score (1-10)
- `recommendation` - Buy/Hold/Sell recommendation
- `reason` - Detailed analysis reasoning
- `last_updated` - Timestamp of analysis

### Conviction Data (`ticker_buys`)
- `symbol` - Stock ticker symbol
- `conviction` - Conviction rating (1-5)
- `thesis` - Investment thesis statement
- `trade_date` - Date of conviction assessment
- `last_updated` - Timestamp of update

### Price Data (`daily_prices`)
- `symbol` - Stock ticker symbol
- `date` - Trading date
- `price_open` - Opening price
- `price_close` - Closing price
- `created_at` - Data collection timestamp

This scoring system provides the analytical foundation for the Janus trading system, combining AI-powered fundamental analysis with human oversight and real-time price tracking for informed investment decisions.