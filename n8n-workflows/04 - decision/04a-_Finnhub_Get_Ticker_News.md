# 04a- Finnhub Get Ticker News

## Summary
This workflow fetches news articles for stock symbols from Finnhub API, scrapes article content, generates AI-powered summaries with sentiment analysis, and stores the processed information in a PostgreSQL database.

## Trigger
- **Schedule**: Runs at 7:30 AM, Tuesday through Friday (`30 7 * * 2-5`)
- **Type**: Automated cron schedule

## Workflow Process
1. **Setup dates** - Calculates today's date, yesterday, 30 days ago, and Monday's date
2. **Get yesterday's positions** - Retrieves stock symbols from previous day's trades
3. **Fetch news articles** - Calls Finnhub API to get company news for each symbol (last 30 days)
4. **Store articles** - Inserts new articles into `company_news` database table
5. **Process articles without summaries** - Identifies articles that need content processing
6. **Scrape article content** - Uses ScrapeOwl API to extract full article text with fallback methods
7. **Generate AI summaries** - Uses Ollama LLM to create one-sentence summaries and sentiment analysis
8. **Update database** - Stores summaries and sentiment scores back to the database

## External Dependencies
- **Finnhub API**: Stock news data source (requires API token `d34mkgpr01qhorbeq7j0d34mkgpr01qhorbeq7jg`)
- **ScrapeOwl API**: Web scraping service (requires `SCRAPEOWL_API_KEY` environment variable)
- **Ollama**: Local LLM instance for text summarization (models: `qwen2.5:14b`, `llama3:latest`)
- **PostgreSQL**: Database for storing news articles and metadata
- **Discord Webhook**: Error notifications and workflow status updates

## Database Tables
- `company_news`: Stores article metadata, summaries, and sentiment scores
- `ticker_buys`: Referenced for getting active stock positions

## Error Handling
- Comprehensive error catching with Discord notifications
- Fallback scraping methods (GET, POST, Premium Proxies)
- Graceful handling of failed article processing