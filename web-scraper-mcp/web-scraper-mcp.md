# Web Scraper MCP Documentation

A Model Context Protocol (MCP) server that provides web scraping capabilities using ScrapOwl API (with DuckDuckGo search) and Playwright. This server can search for stock news, scrape specific URLs, and perform general web searches with content extraction and optional date filtering.

## Features

- **Stock News Search**: Search for recent news about stock tickers using DuckDuckGo via ScrapOwl API (bypasses CAPTCHAs)
- **URL Scraping**: Extract content from specific web pages with optional CSS selectors using Playwright
- **Search and Scrape**: Perform DuckDuckGo searches using ScrapOwl API and extract results reliably
- **Date Filtering**: Optional 30-day filter for recent content only
- **CAPTCHA-Free**: Uses ScrapOwl API with DuckDuckGo to avoid bot detection issues
- **HTTP API**: Provides RESTful endpoints for easy integration

## Setup and Installation

### Prerequisites
- Node.js 18+
- Docker (recommended for deployment)
- **ScrapOwl API Key** (required for search functionality)

### API Key Setup

1. **Get ScrapOwl API Key**: Sign up at [ScrapOwl](https://scrapowl.com) and get your API key (the $5/month plan works great)

2. **Set Environment Variable**:
   ```bash
   export SCRAPOWL_API_KEY="your_api_key_here"
   ```

3. **For Docker (Recommended)**:
   Create a `.env` file in the project root:
   ```env
   SCRAPOWL_API_KEY=your_api_key_here
   ```

### Local Installation
```bash
# Set API key
export SCRAPOWL_API_KEY="your_api_key_here"

# Install and start
npm install
npm start
```

### Docker Deployment (Secure Method)
```bash
# Create .env file with your API key
echo "SCRAPOWL_API_KEY=your_api_key_here" > .env

# Deploy with Docker Compose
docker compose up -d
```

The server runs on port 3000 internally and is exposed on port 3002 via Docker Compose.

## API Endpoints

### 1. Search Stock News

Searches for recent news articles about a specific stock ticker symbol.

**Endpoint**: `POST /search-stock-news`

**Parameters**:
- `ticker` (string, required): Stock ticker symbol (e.g., "AAPL", "TSLA")
- `days` (number, optional): Number of days to look back (default: 7)
- `recent_only` (boolean, optional): Filter to content from past 30 days only (default: false)

**Example Request** (Basic):
```bash
curl -X POST http://localhost:3002/search-stock-news \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL", "days": 7}'
```

**Example Request** (With 30-day filter):
```bash
curl -X POST http://localhost:3002/search-stock-news \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL", "days": 7, "recent_only": true}'
```

**Example Response**:
```json
{
  "ticker": "AAPL",
  "articles": [
    {
      "title": "Apple Stock Rises Amid Strong iPhone 17 Preorders",
      "url": "https://www.investors.com/news/technology/apple-stock-aapl-iphone-17-preorders/",
      "description": "Article from www.investors.com"
    },
    {
      "title": "Apple Stock Gains. What Preorders Say About iPhone 17 Demand",
      "url": "https://www.barrons.com/articles/apple-stock-price-iphone-17-preorder-0a6ee75a",
      "description": "Article from www.barrons.com"
    }
  ],
  "timestamp": "2025-09-16T00:37:48.040Z"
}
```

### 2. Scrape URL

Extracts content from a specific web page, optionally targeting specific elements with CSS selectors.

**Endpoint**: `POST /scrape-url`

**Parameters**:
- `url` (string, required): The URL to scrape
- `selector` (string, optional): CSS selector to target specific content

**Example Request** (Full page scraping):
```bash
curl -X POST http://localhost:3002/scrape-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Example Request** (Targeted scraping):
```bash
curl -X POST http://localhost:3002/scrape-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "selector": ".main-content"}'
```

**Example Response**:
```json
{
  "url": "https://example.com",
  "content": "Page content text here...",
  "timestamp": "2025-09-16T00:37:48.040Z"
}
```

### 3. Search and Scrape

Performs a Google search and extracts content from the search results, optionally scraping the linked pages.

**Endpoint**: `POST /search-and-scrape`

**Parameters**:
- `query` (string, required): Search query
- `maxResults` (number, optional): Maximum number of results to return (default: 5)
- `recent_only` (boolean, optional): Filter to content from past 30 days only (default: false)

**Example Request** (Basic):
```bash
curl -X POST http://localhost:3002/search-and-scrape \
  -H "Content-Type: application/json" \
  -d '{"query": "artificial intelligence news", "maxResults": 3}'
```

**Example Request** (With 30-day filter):
```bash
curl -X POST http://localhost:3002/search-and-scrape \
  -H "Content-Type: application/json" \
  -d '{"query": "artificial intelligence news", "maxResults": 3, "recent_only": true}'
```

**Example Response**:
```json
{
  "query": "artificial intelligence news",
  "results": [
    {
      "title": "Latest AI Developments",
      "url": "https://techcrunch.com/ai-news",
      "description": "Recent developments in artificial intelligence...",
      "content": "Full page content if scraped..."
    }
  ],
  "timestamp": "2025-09-16T00:37:48.040Z"
}
```

## MCP Tool Integration

This server also exposes MCP tools that can be used by Claude and other MCP clients:

### Available Tools

1. **search_stock_news**
   - Description: Search for recent news about a stock ticker using DuckDuckGo
   - Parameters: `ticker` (required), `days` (optional), `recent_only` (optional)

2. **scrape_url**
   - Description: Scrape content from a specific URL
   - Parameters: `url` (required), `selector` (optional)

3. **search_and_scrape**
   - Description: Search for a topic using DuckDuckGo and scrape results
   - Parameters: `query` (required), `maxResults` (optional), `recent_only` (optional)

## Technical Details

### DuckDuckGo + ScrapOwl API Integration
- Uses DuckDuckGo via ScrapOwl API for all search operations (search-stock-news and search-and-scrape)
- Bypasses CAPTCHAs and bot detection automatically (DuckDuckGo is much more scraping-friendly than Google)
- Reliable extraction of search results without browser-based scraping complexities
- Optional 30-day date filtering using DuckDuckGo's `&df=m` parameter
- Uses residential proxies and realistic browser headers for maximum reliability

### Browser Configuration (URL Scraping Only)
- Uses Chromium browser in headless mode for direct URL content extraction
- Configured with `--no-sandbox` and `--disable-setuid-sandbox` for Docker compatibility
- Sets realistic User-Agent header to avoid bot detection

### Anti-Detection Features
- **DuckDuckGo + ScrapOwl API**: Handles anti-bot measures automatically with scraping-friendly search engine
- **Residential Proxies**: Uses `premium_proxies: true` with US-based IPs
- **JavaScript Rendering**: Full headless Chrome rendering with `render_js: true`
- **Realistic Headers**: Custom Accept-Language and Accept headers
- **Resource Blocking**: Blocks CSS/images/fonts to reduce detection risk
- Custom User-Agent for direct URL scraping: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36`
- Intelligent content filtering based on domains and URL patterns

### Supported News Sources
The stock news search automatically filters and prioritizes content from:
- Yahoo Finance
- Reuters
- Bloomberg
- MarketWatch
- Seeking Alpha
- TipRanks
- Investor's Business Daily
- Barron's
- MarketBeat
- The Motley Fool
- CNBC
- Nasdaq

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `500`: Server error (with error message in JSON response)

Error responses include detailed error messages:
```json
{
  "error": "Error message describing what went wrong"
}
```

## Health Check

The Docker Compose configuration includes a health check endpoint:
```bash
curl -f http://localhost:3002/health
```

## Debugging

The server includes comprehensive logging for debugging scraping issues. Check Docker logs for detailed information:
```bash
docker logs <container_id>
```

Debug screenshots are automatically saved to `/tmp/debug-screenshot.png` in the container and can be extracted for analysis:
```bash
docker cp <container_id>:/tmp/debug-screenshot.png ./debug-screenshot.png
```

## Date Filtering

Both search endpoints now support optional date filtering:

- **recent_only: false** (default): Returns all search results regardless of age
- **recent_only: true**: Filters results to content from the past 30 days using DuckDuckGo's `&df=m` parameter

This is particularly useful for:
- Getting only the latest news about a stock ticker
- Filtering search results to recent developments
- Avoiding outdated information in time-sensitive research

**Example with date filtering:**
```bash
# Get only recent AI news from the past month
curl -X POST http://localhost:3002/search-and-scrape \
  -H "Content-Type: application/json" \
  -d '{"query": "artificial intelligence breakthrough", "recent_only": true}'

# Get recent stock news for Tesla
curl -X POST http://localhost:3002/search-stock-news \
  -H "Content-Type: application/json" \
  -d '{"ticker": "TSLA", "recent_only": true}'
```

## Use Cases

- **Financial Research**: Automated collection of stock news and market sentiment with date filtering
- **Content Monitoring**: Regular scraping of specific websites for updates
- **Market Intelligence**: Gathering competitive information from multiple sources
- **News Aggregation**: Collecting recent news articles from various financial publications
- **Research Automation**: Extracting specific data points from web pages with time-based filtering

## Limitations

- Respects robots.txt and rate limiting where appropriate
- Some websites may block automated access during direct URL scraping
- JavaScript-heavy sites may require additional wait times
- DuckDuckGo search results may differ from Google (but much more reliable for automated access)
- 30-day date filtering is limited to DuckDuckGo's built-in time filters

## Security Considerations

- **API Key Protection**: ScrapOwl API key is passed via environment variables, never hardcoded
- **Docker Secrets**: Use `.env` file for local development, environment variables for production
- **Sandboxed Execution**: Runs in a sandboxed Docker container
- **No Persistent Storage**: No data is stored locally, API key is only kept in memory
- **Rate Limiting**: ScrapOwl handles rate limiting automatically based on your plan
- **Secure Deployment**: Environment variables are not exposed in Docker images or logs

### Production API Key Management

For production deployments, consider:

1. **Docker Secrets**:
   ```bash
   echo "your_api_key_here" | docker secret create scrapowl_api_key -
   ```

2. **Kubernetes Secrets**:
   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: scrapowl-secret
   data:
     api-key: <base64-encoded-key>
   ```

3. **Cloud Provider Secrets**:
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Secret Manager