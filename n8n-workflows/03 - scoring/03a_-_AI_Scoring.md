# 03a - AI Scoring

## Summary
This workflow analyzes micro-cap stock fundamentals using multiple AI models to generate investment scores and recommendations. It queries filtered ticker data from the database, sends the data to OpenAI, Google Gemini, and DeepSeek models for analysis, then stores the AI-generated scores and recommendations back to the database.

## How it is Triggered
- **Schedule**: Runs weekly on Sundays at 8:00 AM
- **Trigger Type**: Schedule trigger with weekly interval

## What it Does
1. **Data Selection**: Queries the `ticker_universe` table for micro-cap companies (market cap < $300M) that meet specific financial criteria:
   - Positive market cap, revenue, and gross margins
   - Trading volume > 10,000
   - Reasonable P/E ratios (0-100)
   - Dividend yield sanity checks
   - 52-week price range validation
   - Revenue-to-market cap ratio checks
   - Liquidity requirements

2. **AI Analysis**: Sends each ticker's fundamental data to three AI models in parallel:
   - **OpenAI GPT-4**: Analyzes fundamentals and returns structured JSON with score (1-10), recommendation (Buy/Hold/Sell), and reasoning
   - **Google Gemini**: Performs the same analysis with their latest model
   - **DeepSeek (Local)**: Uses a local Ollama instance for on-premise analysis

3. **Response Processing**: Each AI response is parsed by dedicated JavaScript code nodes that:
   - Clean and validate JSON responses
   - Handle markdown code blocks and formatting issues
   - Extract scores, recommendations, and reasoning
   - Handle parsing errors gracefully

4. **Data Storage**: Stores all AI analysis results in the `ticker_scores` table with:
   - Symbol and model identification
   - Numerical scores and categorical recommendations
   - Reasoning text with proper SQL escaping
   - Timestamps for tracking

5. **Notifications**: Sends Discord webhook notifications for workflow start/completion and error handling

## External Dependencies
- **PostgreSQL Database**: Stores ticker universe data and AI scoring results
- **OpenAI API**: GPT-4 model for fundamental analysis
- **Google Gemini API**: Google's AI model for analysis
- **Ollama (Local)**: Local DeepSeek model deployment
- **Discord Webhooks**: For workflow status notifications
- **N8N LangChain Nodes**: For AI model integration

## Notes
- The workflow processes stocks in parallel across all three AI models
- Recommendation meanings: "Buy" = analyze deeper, "Hold" = maintain position if owned, "Sell" = skip for now
- Error handling includes retry logic and Discord notifications
- Results are upserted to handle duplicate runs on the same data