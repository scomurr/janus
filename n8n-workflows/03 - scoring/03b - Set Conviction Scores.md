Summary
 - manually triggered workflow that allows user to set conviction scores for selected tickers based on external analysis (ChatGPT recommendations)

** Manual Process Required **
- User must update the JSON array in the "Conviction Scores" node before running
- Replace ticker symbols and conviction scores (1-5 scale) based on current analysis
- Conviction scores typically provided by ChatGPT and pasted in manually

Trigger
 - Manual trigger (user clicks "Execute workflow")

Create Table if Missing
 - creates ticker_buys table if it doesn't exist with symbol, conviction, and timestamp

Conviction Scores
 - **REQUIRES MANUAL UPDATE**: JavaScript code node containing array of tickers with conviction scores
 - Current example format: { "ticker": "IMPP", "signal": "Buy", "conviction": 5 }
 - Conviction scale: 1 (low confidence) to 5 (high confidence)
 - User must edit this JSON array before each execution

Execute a SQL query
 - inserts/updates ticker conviction scores in ticker_buys table
 - uses UPSERT operation (INSERT with ON CONFLICT DO UPDATE)
 - updates timestamp for each ticker processed