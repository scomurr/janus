# Portfolio Value Fix

## PostgreSQL Query Node: "Get Current Portfolio Value"
```sql
SELECT COALESCE(SUM(value_close), 1000) as current_portfolio_value
FROM daily_valuation
WHERE date = (SELECT MAX(date) FROM daily_valuation);
```

## JavaScript Code Node: "Set Position Size Per Ticker" (Updated)
```javascript
// Get current portfolio value from the previous node
const portfolioValueItem = $input.first('Get Current Portfolio Value');
const budget = portfolioValueItem ? portfolioValueItem.json.current_portfolio_value : 1000;

// Get ticker data from Get Today's Assets  
const tickerItems = $input.all('Get Today\'s Assets');
const total = tickerItems.reduce((sum, i) => sum + i.json.conviction, 0);

return tickerItems.map(i => {
  const alloc = Math.round((i.json.conviction / total) * budget * 100) / 100;
  return {
    json: {
      ...i.json,
      allocation_usd: alloc,
      total_portfolio_value: budget
    }
  };
});
```

## Workflow Connection Changes:
1. Get Today's Assets → Get Current Portfolio Value
2. Get Current Portfolio Value → Set Position Size Per Ticker (updated)
3. Set Position Size Per Ticker → Set Portfolio Positions (unchanged)