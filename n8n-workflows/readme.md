# N8N Workflows - Janus Trading System

This directory contains N8N workflow definitions for the Janus automated trading system. The workflows are organized into categories and run on specific schedules to handle data collection, analysis, scoring, and trade execution.

## Workflow Schedule Overview

### Saturday
| Time | Workflow | Type | Description |
|------|----------|------|-------------|
| 5:00 PM | 01 - Ticker Fetcher | Auto | Fetches ticker symbols from exchanges |

### Sunday
| Time | Workflow | Type | Description |
|------|----------|------|-------------|
| 4:00 AM | 02 - Weekly Ticker Info Refresh | Auto | Refreshes ticker universe data |
| 8:00 AM | 03a - AI Scoring | Auto | AI-based scoring of micro-cap companies |

### Monday
| Time | Workflow | Type | Description |
|------|----------|------|-------------|
| 9:30 AM | 03d - Get Prices Info per Time | Auto | Fetches opening prices |
| 9:35 AM | 05b - Daily Strategy | Auto | Market open trading strategy |
| 9:45 AM | 05c - Weekly Strategy | Auto | Week start strategy |
| 9:55 AM | 05d - Hold Strategy | Inactive | Portfolio rebalancing (disabled) |
| 3:55 PM | 03d - Get Prices Info per Time | Auto | Fetches closing prices |
| 4:00 PM | 05b - Daily Strategy | Auto | Market close trading strategy |

### Tuesday
| Time | Workflow | Type | Description |
|------|----------|------|-------------|
| 7:30 AM | 04a - Finnhub Get Ticker News | Auto | Fetches ticker news and sentiment analysis |
| 7:45 AM | 04b - Update Conviction Scores (AI) | Auto | Updates conviction scores based on AI analysis |
| 9:30 AM | 03d - Get Prices Info per Time | Auto | Fetches opening prices |
| 9:35 AM | 05b - Daily Strategy | Auto | Market open trading strategy |
| 10:00 AM | 05c - Weekly Strategy | Auto | Check convictions |
| 3:55 PM | 03d - Get Prices Info per Time | Auto | Fetches closing prices |
| 4:00 PM | 05b - Daily Strategy | Auto | Market close trading strategy |

### Wednesday
| Time | Workflow | Type | Description |
|------|----------|------|-------------|
| 7:30 AM | 04a - Finnhub Get Ticker News | Auto | Fetches ticker news and sentiment analysis |
| 7:45 AM | 04b - Update Conviction Scores (AI) | Auto | Updates conviction scores based on AI analysis |
| 9:30 AM | 03d - Get Prices Info per Time | Auto | Fetches opening prices |
| 9:35 AM | 05b - Daily Strategy | Auto | Market open trading strategy |
| 10:00 AM | 05c - Weekly Strategy | Auto | Check convictions |
| 3:55 PM | 03d - Get Prices Info per Time | Auto | Fetches closing prices |
| 4:00 PM | 05b - Daily Strategy | Auto | Market close trading strategy |

### Thursday
| Time | Workflow | Type | Description |
|------|----------|------|-------------|
| 7:30 AM | 04a - Finnhub Get Ticker News | Auto | Fetches ticker news and sentiment analysis |
| 7:45 AM | 04b - Update Conviction Scores (AI) | Auto | Updates conviction scores based on AI analysis |
| 9:30 AM | 03d - Get Prices Info per Time | Auto | Fetches opening prices |
| 9:35 AM | 05b - Daily Strategy | Auto | Market open trading strategy |
| 10:00 AM | 05c - Weekly Strategy | Auto | Check convictions |
| 3:55 PM | 03d - Get Prices Info per Time | Auto | Fetches closing prices |
| 4:00 PM | 05b - Daily Strategy | Auto | Market close trading strategy |

### Friday
| Time | Workflow | Type | Description |
|------|----------|------|-------------|
| 7:30 AM | 04a - Finnhub Get Ticker News | Auto | Fetches ticker news and sentiment analysis |
| 7:45 AM | 04b - Update Conviction Scores (AI) | Auto | Updates conviction scores based on AI analysis |
| 9:30 AM | 03d - Get Prices Info per Time | Auto | Fetches opening prices |
| 9:35 AM | 05b - Daily Strategy | Auto | Market open trading strategy |
| 3:55 PM | 03d - Get Prices Info per Time | Auto | Fetches closing prices |
| 4:00 PM | 05b - Daily Strategy | Auto | Market close trading strategy |
| 4:05 PM | 05c - Weekly Strategy | Auto | Week end strategy |

## Workflow Categories

### 00 - Bootstrap (Manual Tools)
- **00 - Bootstrap** - Database setup and table creation
- **00 - Export Janus Workflows** - Export workflow definitions
- **00 - Manual Get Pricing for Specific Day** - Historical price data retrieval
- **00 - Daily Fixer** - Daily position data corrections
- **00 - Weekly Fixer** - Weekly position data corrections

### 01 - Discovery
- **01 - Ticker Fetcher** - Automated ticker symbol collection (Saturday 5:00 PM)

### 02 - Enrichment
- **02 - Weekly Ticker Info Refresh** - Market cap and ticker data refresh (Sunday 4:00 AM)

### 03 - Scoring
- **03a - AI Scoring** - AI-based company scoring (Sunday 8:00 AM)
- **03b - Monday Set Initial Conviction Scores (manual)** - Manual conviction score setting
- **03d - Get Prices Info per Time** - Price data collection (9:30 AM & 3:55 PM daily)

### 04 - Decision
- **04a - Finnhub Get Ticker News** - News and sentiment analysis (7:30 AM daily)
- **04b - Update Conviction Scores (AI)** - AI-driven conviction updates (7:45 AM daily)

### 05 - Execution
- **05b - Daily Strategy** - Daily trading execution (9:35 AM & 4:00 PM daily)
- **05c - Weekly Strategy** - Weekly strategy management (Mon 9:00 AM, Tue-Thu 10:00 AM, Fri 4:00 PM)
- **05d - Hold Strategy** - Long-term portfolio rebalancing (Inactive)

## Workflow Dependencies

The workflows follow a logical data flow sequence:

1. **Data Collection**: Ticker Fetcher → Weekly Ticker Info Refresh
2. **Analysis**: AI Scoring → News Analysis
3. **Scoring**: Manual/AI Conviction Setting → Conviction Updates
4. **Execution**: Daily/Weekly/Hold Strategies

## Active vs Inactive Workflows

### Active Workflows (15)
All workflows with scheduled triggers are currently active and running according to their schedules.

### Inactive Workflows (1 + Manual Tools)
- **05d - Hold Strategy** - Disabled portfolio rebalancing
- All manual bootstrap tools (run on-demand only)

## System Features

- **Discord Notifications**: All workflows send completion and error notifications
- **Market Hours Awareness**: Trading workflows respect US market hours (Mon-Fri)
- **Weekend Processing**: Data enrichment and AI analysis during market closure
- **Error Handling**: Comprehensive error handling and recovery mechanisms

## Time Zone

All times are in Central Time (CT/CDT) to align with US market hours.

## Notes

- Manual workflows in the bootstrap category are available for on-demand execution
- The system represents a comprehensive automated trading pipeline
- Workflows are designed to handle micro-cap company analysis and trading
- All trading activities respect market hours and regulatory requirements