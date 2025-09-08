Summary
 - runs every weekend and gets the following info for each ticker in the database:

** List **
- marketCap
- volume
- trailingPE
- fiftyTwoWeekHigh
- fiftyTwoWeekLow
- dividendYield
- totalRevenue
- grossMargins

Trigger
 - Sunday at 4AM

Get Symbol Count
 - queries ticker_universe table to get total count of symbols

Set loopCount
 - calculates how many loops of 50 symbols are needed (count � 50)

Start of Loop (noop)
 - beginning of the processing loop

Code
 - passes loop count and total count through for control flow

If2
 - checks if there are more loops to process (loopCount > 0)

Get n-50 Tickers  
 - selects up to 50 tickers that haven't been scanned today or are null

If
 - checks if any tickers were returned from the query

Smush Symbols
 - combines ticker symbols into comma-separated string for API call

YF - Get Market Cap Data
 - makes HTTP request to marketcap-api to fetch ticker enrichment data

Split to Individual
 - splits the API response into individual records per ticker and sanitizes numeric values

Update Market Cap and Last Updated
 - updates ticker_universe table with new enrichment data using COALESCE to preserve existing values

Update Last Scanned
 - marks the ticker as scanned with current timestamp

Aggregate
 - collects all processed items together

Merge
 - combines the processing branch with loop control

If1
 - checks if all loops are complete (runIndex >= loopCount)

Wait
 - pauses for 0.5 seconds between loop iterations

Discord1
 - sends completion notification to Discord when workflow finishes

Error Trigger
 - catches any workflow errors

Discord
 - sends error notifications to Discord if workflow fails