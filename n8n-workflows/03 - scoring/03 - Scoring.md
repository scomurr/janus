Summary
 - runs every Sunday at 8AM and analyzes filtered ticker data using multiple AI models to generate investment scores and recommendations

** Filtering Criteria (Trading Terms) **
- Small-cap stocks only: Market cap under $300 million
- Profitable companies: Must have positive revenue and gross margins
- Liquid stocks: Daily volume above 10,000 shares
- Reasonable valuation: P/E ratio between 1-100 (excludes loss-making and extremely overvalued stocks)
- Dividend sanity check: Dividend yield under 50% (excludes dividend traps)
- Price stability: 52-week high/low ratio under 100x (excludes extreme penny stocks)
- Revenue efficiency: Revenue must be at least 1% of market cap (excludes shell companies)
- Trading liquidity: Daily volume must exceed market cap ÷ 1000 (ensures adequate liquidity)

Trigger
 - Sunday at 8AM

Create Table if Missing
 - creates ticker_scores table if it doesn't exist

Execute a SQL query
 - filters ticker_universe with investment criteria and orders by market cap ascending

OpenAI
 - sends filtered ticker data to OpenAI for analysis using GPT-4o-latest model

Gemini
 - sends same ticker data to Google Gemini 2.5 Flash for parallel analysis

OpenAI Chat Model
 - configures OpenAI GPT-4o-latest connection

Google Gemini Chat Model
 - configures Google Gemini API connection

Basic LLM Chain
 - processes ticker data through Ollama local model

Ollama Chat Model
 - configures local Ollama model connection

Parse OpenAI Response
 - extracts JSON response from OpenAI containing score, recommendation, and reason

Parse Gemini Response
 - extracts JSON response from Google Gemini

Parse Llama3 Response
 - extracts JSON response from local Ollama model

Insert into Ticker Scores
 - saves the AI-generated scores and recommendations to ticker_scores table

Error Trigger
 - catches any workflow errors

Discord
 - sends error notifications to Discord if workflow fails