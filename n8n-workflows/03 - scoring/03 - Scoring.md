# 03 - Scoring Workflows

## Overview
The scoring phase consists of multiple workflows that generate and manage investment recommendations:
- **03a - Scoring**: AI-powered analysis and scoring of filtered tickers
- **03b - Update Conviction Scores (manual)**: Manual entry of conviction scores (current)
- **03b - Update Conviction Scores (AI)**: AI-powered conviction scoring (in development)

## 03a - Scoring
**Purpose**: Analyzes filtered ticker data using multiple AI models to generate investment scores and recommendations

**Trigger**: Sunday at 8:00 AM Central

**Filtering Criteria (Trading Terms)**:
- Small-cap stocks only: Market cap under $300 million
- Profitable companies: Must have positive revenue and gross margins
- Liquid stocks: Daily volume above 10,000 shares
- Reasonable valuation: P/E ratio between 1-100 (excludes loss-making and extremely overvalued stocks)
- Dividend sanity check: Dividend yield under 50% (excludes dividend traps)
- Price stability: 52-week high/low ratio under 100x (excludes extreme penny stocks)
- Revenue efficiency: Revenue must be at least 1% of market cap (excludes shell companies)
- Trading liquidity: Daily volume must exceed market cap ÷ 1000 (ensures adequate liquidity)

**Multi-Model AI Analysis**:
- **OpenAI GPT-4o-latest**: Primary analysis model
- **Google Gemini 2.5 Flash**: Parallel validation analysis
- **Ollama (Local)**: Local model for additional perspective

## 03b - Update Conviction Scores (manual)
**Purpose**: Manually set conviction scores for portfolio allocation

**Trigger**: Manual execution as needed

**Process**:
- Creates/updates ticker_buys table with enhanced schema
- Preserves historical conviction data (original_conviction, last_conviction)
- Fills thesis from ticker_scores where missing
- Updates conviction scores via manual code block entry

## 03b - Update Conviction Scores (AI) 
**Purpose**: AI-powered conviction scoring (in development - will replace manual process)

**Status**: Under development - intended to automate the conviction scoring process

## Workflow Components

### 03a - Scoring Workflow
**Create Table if Missing**
- Creates ticker_scores table if it doesn't exist
- Schema includes symbol, score, recommendation, reason, model_source

**Execute a SQL query**
- Filters ticker_universe with investment criteria and orders by market cap ascending
- Applies all filtering criteria to identify viable small-cap candidates

**AI Model Configuration**:
- **OpenAI Chat Model**: Configures OpenAI GPT-4o-latest connection
- **Google Gemini Chat Model**: Configures Google Gemini API connection  
- **Ollama Chat Model**: Configures local Ollama model connection

**AI Analysis Execution**:
- **OpenAI**: Sends filtered ticker data to OpenAI for analysis using GPT-4o-latest model
- **Gemini**: Sends same ticker data to Google Gemini 2.5 Flash for parallel analysis
- **Basic LLM Chain**: Processes ticker data through Ollama local model

**Response Processing**:
- **Parse OpenAI Response**: Extracts JSON response from OpenAI containing score, recommendation, and reason
- **Parse Gemini Response**: Extracts JSON response from Google Gemini
- **Parse Llama3 Response**: Extracts JSON response from local Ollama model

**Data Storage**:
- **Insert into Ticker Scores**: Saves the AI-generated scores and recommendations to ticker_scores table

**Error Handling**:
- **Error Trigger**: Catches any workflow errors
- **Discord**: Sends error notifications to Discord if workflow fails

### 03b - Update Conviction Scores (manual) Workflow
**Create Enhanced Table**
- Creates/updates ticker_buys table with enhanced schema
- Includes: symbol, conviction, thesis, original_conviction, last_conviction

**Preserve Historical Data**:
- **Fill Thesis from Ticker Scores**: Copies reason from ticker_scores into empty thesis fields
- **Preserve Conviction History**: Moves current conviction to last_conviction, sets original_conviction

**Manual Score Entry**:
- **Conviction Scores**: JavaScript code block for manual entry of conviction scores
- **Update Conviction Scores**: Updates ticker_buys table with new conviction values

### 03b - Update Conviction Scores (AI) Workflow
**Status**: In development - intended to replace manual conviction scoring process with AI-driven analysis