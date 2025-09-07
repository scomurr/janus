--select count(*) from ticker_universe ;
--TRUNCATE TABLE ticker_universe RESTART IDENTITY;
--DELETE FROM ticker_universe where symbol = 'AACB';
--select * from ticker_universe where symbol = 'AACB';
--ALTER TABLE ticker_universe ADD COLUMN IF NOT EXISTS last_scanned TIMESTAMP;
--select * from ticker_universe limit 1;
--select * from ticker_universe where market_cap > 0 limit 10;

--select count(*) from ticker_universe where last_scanned::date = CURRENT_DATE;
--select count(*) from ticker_universe where last_updated::date = CURRENT_DATE and market_cap > 0;

--select * from ticker_universe where symbol = 'ETI$';
--SELECT symbol, market_cap, volume, trailing_pe, fifty_two_week_high, fifty_two_week_low, dividend_yield, total_revenue, gross_margins, last_updated, info_raw FROM ticker_universe WHERE symbol IN ('ACGLN', 'ACGLO', 'ACHC', 'AACB') ORDER BY symbol;
--select * from ticker_universe where symbol = 'ZTAX';

select symbol, count(*) as count from ticker_scores
where recommendation = 'Buy'
group by symbol
having count(*) > 1
order by count desc;

select * from ticker_scores where symbol = 'IMMR';
select * from ticker_universe  where symbol = 'IMMR';