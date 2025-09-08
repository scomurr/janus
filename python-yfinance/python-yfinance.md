# Python Yahoo Finance API - Market Data Service

## Summary

The Python Yahoo Finance API service is a Flask-based web service that provides real-time and historical market data for financial instruments. It acts as a lightweight wrapper around the yfinance Python library, offering RESTful endpoints for retrieving market capitalization, stock prices, and comprehensive financial information for ticker symbols. The service is designed to integrate seamlessly with the Janus n8n workflow ecosystem, providing essential market data for automated financial analysis and portfolio management operations.

## Docker Configuration

### Dockerfile
- **Base Image**: `python:3.11-slim` - Lightweight Python runtime
- **Working Directory**: `/app`
- **Dependencies**: Flask and yfinance libraries installed via pip
- **Port**: Exposes port 5000
- **Entry Point**: `python app.py`

### Docker Compose (compose.yaml)
- **Service Name**: `marketcap-api`
- **Network**: Connected to external `n8n-net` network
- **Port Mapping**: Host port 5000 → Container port 5000
- **Container Name**: `marketcap-api`

## Application Architecture

### Backend (app.py)
- **Framework**: Flask web framework
- **Data Source**: Yahoo Finance via `yfinance` Python library
- **Response Format**: JSON responses for all endpoints
- **Error Handling**: Comprehensive error responses with HTTP status codes
- **Host Configuration**: Runs on `0.0.0.0:5000` for containerized deployment

## API Endpoints

### GET /marketcap
**Purpose**: Retrieve market capitalization data for multiple ticker symbols
- **Parameters**: 
  - `symbols` (required) - Comma-separated list of stock ticker symbols
- **Processing**: 
  - Normalizes symbols to uppercase
  - Strips whitespace from input
  - Filters out invalid tickers
- **Response**: 
  ```json
  {
    "AAPL": 2800000000000,
    "MSFT": 2400000000000
  }
  ```
- **Use Case**: Bulk market cap retrieval for portfolio analysis and screening

### GET /info
**Purpose**: Retrieve comprehensive financial information for ticker symbols
- **Parameters**:
  - `symbols` (required) - Comma-separated list of stock ticker symbols
  - `fields` (optional) - Comma-separated list of specific data fields to return
- **Default Fields** (when `fields` not specified):
  - `marketCap` - Market capitalization
  - `volume` - Trading volume
  - `trailingPE` - Price-to-earnings ratio
  - `fiftyTwoWeekHigh` - 52-week high price
  - `fiftyTwoWeekLow` - 52-week low price
  - `dividendYield` - Dividend yield percentage
  - `totalRevenue` - Total company revenue
  - `grossMargins` - Gross profit margins
- **Response**:
  ```json
  {
    "AAPL": {
      "marketCap": 2800000000000,
      "volume": 45000000,
      "trailingPE": 28.5,
      "fiftyTwoWeekHigh": 185.0,
      "fiftyTwoWeekLow": 124.0,
      "dividendYield": 0.005,
      "totalRevenue": 365000000000,
      "grossMargins": 0.43
    }
  }
  ```
- **Use Case**: Comprehensive financial data retrieval for analysis and database population

### GET /price
**Purpose**: Retrieve specific price information for a single ticker symbol
- **Parameters**:
  - `ticker` (required) - Single stock ticker symbol
  - `type` (optional) - Price type: `close`, `current`, or `open` (default: `close`)
- **Price Types**:
  - `current`: Real-time current price from ticker info
  - `close`: Latest closing price from historical data
  - `open`: Latest opening price from historical data
- **Response**:
  ```json
  {
    "ticker": "AAPL",
    "type": "close",
    "price": 175.84
  }
  ```
- **Data Source**: Uses 5-day historical data for close/open prices
- **Use Case**: Precise price tracking for portfolio valuation and trading decisions

## Error Handling

### Common Error Responses
- **400 Bad Request**: Missing required parameters or invalid price type
  ```json
  {"error": "Missing symbols param"}
  ```
- **404 Not Found**: No data available for requested ticker
  ```json
  {"error": "Current price not available"}
  ```
- **500 Internal Server Error**: Yahoo Finance API failures or network issues
  ```json
  {"error": "Failed to fetch data: [detailed error message]"}
  ```

## Usage

### Development
```bash
# Install dependencies
pip install flask yfinance

# Start development server
python app.py

# Server runs on port 5000
```

### Production Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Access via http://localhost:5000
```

### API Usage Examples

#### Get Market Cap for Multiple Stocks
```bash
curl "http://localhost:5000/marketcap?symbols=AAPL,MSFT,GOOGL"
```

#### Get Comprehensive Info with Specific Fields
```bash
curl "http://localhost:5000/info?symbols=AAPL,TSLA&fields=marketCap,volume,trailingPE"
```

#### Get Current Stock Price
```bash
curl "http://localhost:5000/price?ticker=AAPL&type=current"
```

#### Get Latest Closing Price
```bash
curl "http://localhost:5000/price?ticker=AAPL&type=close"
```

## Data Processing Features

### Symbol Normalization
- Converts all ticker symbols to uppercase
- Strips whitespace from input
- Handles comma-separated lists efficiently
- Filters out empty or invalid symbols

### Flexible Data Retrieval
- Default field sets for common use cases
- Custom field selection for targeted queries
- Multiple price types for different analysis needs
- Bulk processing capabilities

## Integration Points

### n8n Workflow Integration
- Designed to work within the Janus n8n ecosystem
- Provides market data for automated workflows
- Connected to shared `n8n-net` Docker network
- Lightweight and fast response times for workflow efficiency

### Database Population
- Structured responses suitable for database insertion
- Consistent data formatting across endpoints
- Error handling prevents workflow failures
- Supports batch processing for large ticker lists

## Why This Application Exists

This service serves as a crucial data provider within the Janus financial analysis ecosystem:

1. **Market Data Gateway**: Provides reliable access to Yahoo Finance data through a standardized REST interface
2. **Workflow Integration**: Enables n8n workflows to retrieve real-time market data for automated analysis
3. **Data Standardization**: Ensures consistent data formatting across different financial analysis tools
4. **Performance Optimization**: Lightweight Flask service with minimal overhead for high-frequency data requests
5. **Error Resilience**: Robust error handling prevents workflow failures due to data unavailability
6. **Flexible Querying**: Supports both bulk operations and targeted data retrieval based on specific analysis needs

The application bridges the gap between external market data sources and internal financial analysis workflows, providing the essential market data foundation that powers the broader Janus research and portfolio management platform.