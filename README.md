# Janus - Automated Micro-Cap Equity Research Platform

Janus is a comprehensive financial analysis platform designed for systematic micro-cap equity research and portfolio management. The system combines automated data collection, AI-powered stock analysis, and real-time portfolio tracking to identify and manage micro-cap investment opportunities.

## System Overview

The Janus platform consists of several interconnected components that work together to provide end-to-end micro-cap equity research capabilities:

- **Automated Data Discovery**: Weekly collection of all NYSE and NASDAQ stock tickers
- **Market Data Enrichment**: Real-time financial data retrieval via Yahoo Finance API
- **AI-Powered Analysis**: Multi-model stock scoring using OpenAI, Google Gemini, and local LLM models
- **Portfolio Management**: Real-time portfolio tracking with performance visualization
- **Research Console**: Web-based interface for analyzing stocks with multiple buy recommendations

## Architecture Components

### n8n Workflows (`n8n-workflows/`)
Automated workflows that handle the core data processing pipeline:
- **Ticker Discovery**: Weekly retrieval of all stock tickers from exchanges
- **Data Enrichment**: Bulk collection of financial metrics for all tickers
- **AI Scoring**: Multi-model analysis generating buy/sell recommendations
- **Execution Support**: Portfolio rebalancing and trade execution workflows

### Python Yahoo Finance API (`python-yfinance/`)
Flask-based microservice providing standardized access to market data:
- Market capitalization data for multiple tickers
- Comprehensive financial information retrieval
- Real-time and historical price data
- Dockerized service integrated with the n8n network

### Node.js Research Console (`node-ui/`)
Web-based financial research interface:
- **Research Console**: Identifies stocks with multiple AI buy recommendations
- **Portfolio Dashboard**: Real-time portfolio performance visualization with interactive charting
- **Analysis Tools**: Generates structured prompts for detailed financial analysis

### Portfolio Analysis (`n8n-porfolio/`)
Contains analysis workflows and documentation for portfolio management operations.

## Database Requirements

**Critical Dependency**: All components require access to a PostgreSQL database instance that must be available to both n8n and the individual applications.

The system expects the following PostgreSQL tables:
- `ticker_universe`: Complete ticker data with financial metrics
- `ticker_scores`: AI-generated buy/sell recommendations 
- `daily_valuation`: Portfolio performance tracking data

## Key Features

- **Systematic Stock Discovery**: Automated identification of all tradeable micro-cap securities
- **Multi-Model AI Analysis**: Consensus scoring from multiple AI models (OpenAI GPT-4, Google Gemini, local LLM)
- **Liquidity & Risk Filtering**: Automated screening for trading volume, solvency, and governance risks
- **Real-Time Portfolio Tracking**: Visual performance monitoring with asset-level breakdowns
- **Research Workflow Integration**: Seamless data flow from discovery to analysis to execution

## Getting Started

1. Ensure PostgreSQL database is running and accessible
2. Deploy the Python Yahoo Finance API service
3. Configure n8n workflows for data collection and analysis
4. Launch the Node.js Research Console for portfolio monitoring

Each component directory contains detailed setup and configuration documentation in its respective `.md` file.

## Use Case

Janus is designed for systematic micro-cap equity research where traditional analysis tools are insufficient due to limited coverage and data availability. The platform automates the entire research pipeline from initial discovery through final investment decisions, making it possible to efficiently analyze thousands of micro-cap opportunities that would be impractical to research manually.