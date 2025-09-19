# 04b - Update Conviction Scores (AI)

## Summary
This workflow uses AI to analyze daily news sentiment and automatically adjust conviction scores for stock positions. It processes news articles with sentiment analysis to determine if conviction scores should be updated based on market-moving information.

## Trigger
- **Schedule**: Runs at 7:45 AM, Tuesday through Friday (`45 7 * * 2-5`)
- **Type**: Automated cron schedule (runs 15 minutes after news collection workflow)

## Workflow Process
1. **Initialize dates** - Sets up current date, yesterday, Monday, and session ID variables
2. **Copy yesterday's scores** - Duplicates previous day's conviction scores as baseline for today
3. **Get Monday's ticker positions** - Retrieves active stock symbols from start of week
4. **Fetch news and sentiment** - Pulls today's news articles with sentiment analysis for each symbol
5. **Group news by symbol** - Organizes multiple news articles per stock symbol
6. **Retrieve yesterday's conviction** - Gets baseline conviction score for comparison
7. **AI score adjustment** - Uses Ollama LLM to analyze news impact and recommend score changes
8. **Sanitize and merge data** - Processes AI output and combines with existing data
9. **Update conviction scores** - Writes new scores and reasoning to database

## External Dependencies
- **Ollama**: Local LLM instance for conviction score analysis (model: `mistral:7b`)
- **PostgreSQL**: Database for reading/writing conviction scores and news data
- **Discord Webhook**: Workflow status notifications and error alerts

## Database Tables
- `ticker_buys`: Stores conviction scores, thesis, and trade dates
- `company_news`: Source of news articles with sentiment analysis

## AI Logic
- **Conviction Scale**: 0-5 (0 = sell, 1-5 = buy intensity distribution)
- **Input**: Current conviction score, news articles, sentiment analysis
- **Output**: Structured JSON with new score and reasoning
- **Safety**: Score 0 triggers immediate sell recommendations for severe negative news

## Key Features
- **Automatic score propagation**: Copies previous day's scores as starting point
- **News-driven decisions**: Only adjusts scores when relevant news exists
- **Audit trail**: Stores AI reasoning (thesis) for each score change
- **Conflict handling**: Uses database UPSERT to handle duplicate entries