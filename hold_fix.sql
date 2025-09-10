-- Hold Strategy Database Reset Script
-- This script reconstructs the hold strategy data as if it started on 2024-09-08
-- with proper rebalancing on 2024-09-09 and 2024-09-10

-- 1. Clear existing hold_positions data
TRUNCATE TABLE hold_positions;

-- 2. Set initial USDH seed capital for 2024-09-08
INSERT INTO hold_positions (symbol, date, shares_bought, conviction_at_buy, rebalance_reason, created_at)
VALUES ('USDH', '2024-09-08', 1000.00, 0, 'Initial seed capital', NOW());

-- 3. Get conviction scores for 2024-09-09 and create initial positions
WITH conviction_data AS (
  SELECT symbol, conviction 
  FROM ticker_buys 
  WHERE DATE(last_updated) = '2024-09-09' AND conviction > 0
),
total_conviction AS (
  SELECT SUM(conviction) as total_conv FROM conviction_data
),
price_data AS (
  SELECT symbol, COALESCE(price_open, price_close) as price
  FROM daily_prices 
  WHERE date = '2024-09-09'
)
-- Calculate target allocations and create buy orders for 2024-09-09
INSERT INTO hold_positions (symbol, date, shares_bought, buy_price, conviction_at_buy, rebalance_reason, created_at)
SELECT 
  cd.symbol,
  '2024-09-09',
  FLOOR((cd.conviction / tc.total_conv * 1000.0 / pd.price) * 10000) / 10000 as shares_to_buy,
  pd.price,
  cd.conviction,
  CONCAT('Initial allocation: ', ROUND(cd.conviction / tc.total_conv * 100, 1), '% target allocation'),
  NOW()
FROM conviction_data cd
CROSS JOIN total_conviction tc
JOIN price_data pd ON cd.symbol = pd.symbol
WHERE pd.price > 0;

-- 4. Calculate cash used and reduce USDH accordingly
WITH cash_used AS (
  SELECT SUM(shares_bought * buy_price) as total_spent
  FROM hold_positions 
  WHERE date = '2024-09-09' AND symbol != 'USDH'
)
INSERT INTO hold_positions (symbol, date, shares_sold, sell_price, conviction_at_sell, rebalance_reason, created_at)
SELECT 
  'USDH',
  '2024-09-09',
  cu.total_spent,
  1.0,
  0,
  'Cash used for initial asset purchases',
  NOW()
FROM cash_used cu;

-- 5. Now handle today's rebalancing (2024-09-10) based on current conviction scores
-- First, get current conviction scores for today
WITH today_conviction AS (
  SELECT symbol, conviction 
  FROM ticker_buys 
  WHERE DATE(last_updated) >= '2024-09-10' AND conviction > 0
),
today_total_conviction AS (
  SELECT SUM(conviction) as total_conv FROM today_conviction
),
current_positions AS (
  SELECT 
    hp.symbol,
    SUM(hp.shares_bought) - SUM(hp.shares_sold) as net_shares,
    AVG(CASE WHEN hp.shares_bought > 0 THEN hp.buy_price END) as avg_cost
  FROM hold_positions hp
  WHERE hp.symbol != 'USDH'
  GROUP BY hp.symbol
  HAVING (SUM(hp.shares_bought) - SUM(hp.shares_sold)) > 0
),
today_prices AS (
  SELECT symbol, COALESCE(price_close, price_open) as price
  FROM daily_prices 
  WHERE date = '2024-09-10'
),
current_portfolio_value AS (
  SELECT 
    SUM(CASE WHEN hp.symbol = 'USDH' THEN hp.shares_bought - hp.shares_sold ELSE 0 END) as cash_value,
    SUM(CASE WHEN hp.symbol != 'USDH' THEN (hp.shares_bought - hp.shares_sold) * tp.price ELSE 0 END) as equity_value
  FROM hold_positions hp
  LEFT JOIN today_prices tp ON hp.symbol = tp.symbol
),
total_portfolio AS (
  SELECT cash_value + equity_value as total_value FROM current_portfolio_value
),
rebalance_trades AS (
  SELECT 
    tc.symbol,
    tc.conviction,
    tc.conviction / ttc.total_conv as target_allocation,
    tc.conviction / ttc.total_conv * tp_val.total_value as target_value,
    COALESCE(cp.net_shares * tpr.price, 0) as current_value,
    COALESCE(cp.net_shares, 0) as current_shares,
    tpr.price as current_price,
    (tc.conviction / ttc.total_conv * tp_val.total_value) - COALESCE(cp.net_shares * tpr.price, 0) as value_delta
  FROM today_conviction tc
  CROSS JOIN today_total_conviction ttc
  CROSS JOIN total_portfolio tp_val
  LEFT JOIN current_positions cp ON tc.symbol = cp.symbol
  LEFT JOIN today_prices tpr ON tc.symbol = tpr.symbol
  WHERE ABS((tc.conviction / ttc.total_conv * tp_val.total_value) - COALESCE(cp.net_shares * tpr.price, 0)) / tp_val.total_value > 0.05
)
-- Execute rebalancing trades for 2024-09-10
INSERT INTO hold_positions (symbol, date, shares_bought, shares_sold, buy_price, sell_price, conviction_at_buy, conviction_at_sell, rebalance_reason, created_at)
SELECT 
  symbol,
  '2024-09-10',
  CASE WHEN value_delta > 0 THEN FLOOR((value_delta / current_price) * 10000) / 10000 ELSE 0 END as shares_bought,
  CASE WHEN value_delta < 0 THEN FLOOR((ABS(value_delta) / current_price) * 10000) / 10000 ELSE 0 END as shares_sold,
  CASE WHEN value_delta > 0 THEN current_price ELSE NULL END as buy_price,
  CASE WHEN value_delta < 0 THEN current_price ELSE NULL END as sell_price,
  CASE WHEN value_delta > 0 THEN conviction ELSE NULL END as conviction_at_buy,
  CASE WHEN value_delta < 0 THEN conviction ELSE NULL END as conviction_at_sell,
  CASE 
    WHEN value_delta > 0 THEN CONCAT('Rebalance buy: ', ROUND(target_allocation * 100, 1), '% target allocation')
    ELSE CONCAT('Rebalance sell: ', ROUND(target_allocation * 100, 1), '% target allocation')
  END as rebalance_reason,
  NOW()
FROM rebalance_trades
WHERE ABS(value_delta) > 0;

-- 6. Handle any assets that lost conviction (need to be sold completely)
WITH assets_to_sell AS (
  SELECT DISTINCT hp.symbol
  FROM hold_positions hp
  WHERE hp.symbol != 'USDH' 
    AND (SUM(hp.shares_bought) - SUM(hp.shares_sold)) > 0
    AND hp.symbol NOT IN (
      SELECT symbol FROM ticker_buys 
      WHERE DATE(last_updated) >= '2024-09-10' AND conviction > 0
    )
  GROUP BY hp.symbol
)
INSERT INTO hold_positions (symbol, date, shares_sold, sell_price, conviction_at_sell, rebalance_reason, created_at)
SELECT 
  ats.symbol,
  '2024-09-10',
  SUM(hp.shares_bought) - SUM(hp.shares_sold) as shares_to_sell,
  tp.price,
  0,
  'Sell all: conviction dropped to 0',
  NOW()
FROM assets_to_sell ats
JOIN hold_positions hp ON ats.symbol = hp.symbol
JOIN today_prices tp ON ats.symbol = tp.symbol
GROUP BY ats.symbol, tp.price;

-- 7. Handle cash rebalancing from today's trades
WITH todays_trades AS (
  SELECT 
    SUM(COALESCE(shares_bought * buy_price, 0)) as cash_used,
    SUM(COALESCE(shares_sold * sell_price, 0)) as cash_received
  FROM hold_positions
  WHERE date = '2024-09-10' AND symbol != 'USDH'
),
net_cash_change AS (
  SELECT cash_received - cash_used as net_change FROM todays_trades
)
INSERT INTO hold_positions (symbol, date, shares_bought, shares_sold, buy_price, sell_price, conviction_at_buy, conviction_at_sell, rebalance_reason, created_at)
SELECT 
  'USDH',
  '2024-09-10',
  CASE WHEN net_change > 0 THEN net_change ELSE 0 END,
  CASE WHEN net_change < 0 THEN ABS(net_change) ELSE 0 END,
  CASE WHEN net_change > 0 THEN 1.0 ELSE NULL END,
  CASE WHEN net_change < 0 THEN 1.0 ELSE NULL END,
  CASE WHEN net_change > 0 THEN 0 ELSE NULL END,
  CASE WHEN net_change < 0 THEN 0 ELSE NULL END,
  CASE 
    WHEN net_change > 0 THEN 'Cash from rebalancing sales'
    WHEN net_change < 0 THEN 'Cash for rebalancing purchases'
    ELSE 'No cash change needed'
  END,
  NOW()
FROM net_cash_change
WHERE net_change != 0;

-- 8. Verification queries (optional - uncomment to check results)
/*
-- Check final portfolio positions
SELECT 
  symbol,
  SUM(shares_bought) - SUM(shares_sold) as net_shares,
  COUNT(*) as transaction_count,
  MIN(date) as first_trade,
  MAX(date) as last_trade
FROM hold_positions 
GROUP BY symbol 
ORDER BY symbol;

-- Check total portfolio value
SELECT 
  SUM(CASE WHEN hp.symbol = 'USDH' THEN hp.shares_bought - hp.shares_sold ELSE 0 END) as cash_position,
  SUM(CASE WHEN hp.symbol != 'USDH' THEN (hp.shares_bought - hp.shares_sold) * COALESCE(dp.price_close, dp.price_open, 1.0) ELSE 0 END) as equity_value
FROM hold_positions hp
LEFT JOIN daily_prices dp ON hp.symbol = dp.symbol AND dp.date = '2024-09-10';
*/