Summary
 - Every weekend this flow retrieves all of the stock tickers and pushes them into a database

Trigger
 - 5PM Saturday

 Create table
  - creates ticker_universe

Fetch/Set/Parse
 - two branches that get the NASDAQ and NYSE tickers. Then parses and normalizes the data

Merge
 - Brings the branches together

 Update ticker_universe
  - inserts the raw tickers into the DB
