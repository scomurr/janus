import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const APP_PORT = process.env.APP_PORT ? Number(process.env.APP_PORT) : 3000;

// DB config from env
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "n8n",
  ssl: false
});

// Static SPA
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// 1) List tickers with multiple Buy recommendations from the past 2 days
//    select symbol, count(*) as count from ticker_scores where recommendation='Buy' and created_at >= NOW() - INTERVAL '2 days' group by symbol having count(*) > 1 order by count desc;
app.get("/api/buys", async (_req, res) => {
  try {
    const q = `
      select symbol, count(*)::int as count
      from ticker_scores
      where recommendation = 'Buy'
        and time_added >= CURRENT_DATE - INTERVAL '2 days'
      group by symbol
      having count(*) > 1
      order by count desc;
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/buys error:", err);
    res.status(500).json({ error: "query_failed" });
  }
});

// 2) Get metric details for a symbol from ticker_universe and return the filled prompt
app.get("/api/ticker/:symbol/prompt", async (req, res) => {
  const symbol = (req.params.symbol || "").toUpperCase();

  // Pull metrics; adapt to your enrichment columns
  // Using commonly-seen column names from your earlier dumps
  const q = `
    select
      symbol,
      market_cap,
      volume,
      trailing_pe,
      fifty_two_week_high,
      fifty_two_week_low,
      dividend_yield,
      total_revenue,
      gross_margins
    from ticker_universe
    where symbol = $1
    limit 1;
  `;

  try {
    const { rows } = await pool.query(q, [symbol]);
    if (!rows.length) {
      return res.status(404).json({ error: "symbol_not_found" });
    }

    const r = rows[0];

    // Simple helpers
    const v = (x) => (x === null || x === undefined ? "unknown" : x);
    const fmtNum = (x) => (x === null || x === undefined ? "unknown" : String(x));

    const prompt = [
    "Act as a professional-grade micro-cap equity analyst. Your only goal is to generate alpha over the next 1–6 months. Use only public, verifiable data. Be concise, skeptical, and prioritize actionable insights over vague narratives.",
    "",
    "You are evaluating a stock for immediate inclusion or removal from a $100 micro-cap portfolio composed of full-share positions only. Your decision must be either [Buy] or [Sell] — no 'hold' or 'research further'.",
    "",
    "Decision Criteria:",
    "- Recommend [Buy] only if:",
    "  - There is a clear and time-relevant alpha thesis (1–6 months), and",
    "  - There are no thesis-breaking risks (e.g., near-certain dilution, insolvency, fraud).",
    "- Recommend [Sell] if:",
    "  - The upside is low or speculative, or",
    "  - There are material concerns about liquidity, governance, dilution, or solvency.",
    "",
    "Required Considerations:",
    "- Liquidity & Tradability: Avg daily $ volume, float %, spread.",
    "- Dilution Risk: Recent or pending offerings, ATM usage, warrants, convertibles, S-3 shelf.",
    "- Solvency: Cash vs. burn, debt maturity, going-concern risk.",
    "- Governance & Compliance: Insider control, related-party risk, listing status, audit flags.",
    "- Catalysts: Must reasonably occur within the next 6 months and be significant (earnings, contracts, legal wins, regulatory approvals, launches, etc.).",
    "",
    "Use This Structure:",
    "",
    "1. Key Financials",
    "- Market Cap, Revenue, Gross Margin",
    "- Cash, Debt, Free Cash Flow or Burn",
    "- Shares Outstanding",
    "- Valuation Multiples (EV/Sales, P/S, P/B, P/E if relevant)",
    "",
    "2. Business Model & Competitive Position",
    "- What do they sell? To whom?",
    "- Market size, competition, moat (if any)",
    "- Pricing power, margin durability",
    "",
    "3. Price & Volume Behavior",
    "- 1–6 month price trend",
    "- Volume consistency, accumulation/distribution",
    "- Relative strength vs sector or peers",
    "",
    "4. Risks & Red Flags",
    "- Dilution setups, financial distress",
    "- Insider behavior, SEC/audit flags, customer concentration",
    "- Anything that undermines confidence in the thesis",
    "",
    "5. Upcoming Catalysts (within 6 months)",
    "- List expected events with timing and likely impact",
    "",
    "6. Alpha Thesis",
    "- What is the edge? Why does this have asymmetric upside now?",
    "- What would prove this thesis wrong?",
    "",
    "7. Final Recommendation:",
    "- [Buy] or [Sell]",
    "- Follow with the 3 strongest reasons for this recommendation",
    "",
    `Ticker: ${symbol}`,
    `Market Cap: ${fmtNum(r.market_cap)}`,
    `Revenue: ${fmtNum(r.total_revenue)}`,
    `Gross Margins: ${fmtNum(r.gross_margins)}`,
    `Trailing P/E: ${fmtNum(r.trailing_pe)}`,
    `Dividend Yield: ${fmtNum(r.dividend_yield)}`,
    `52W High / Low: ${fmtNum(r.fifty_two_week_high)} / ${fmtNum(r.fifty_two_week_low)}`,
    `Avg Volume (shares): ${fmtNum(r.volume)}`
    ].join("\n");

    res.json({
      symbol,
      data: {
        market_cap: r.market_cap,
        revenue: r.total_revenue,
        gross_margins: r.gross_margins,
        trailing_pe: r.trailing_pe,
        dividend_yield: r.dividend_yield,
        high: r.fifty_two_week_high,
        low: r.fifty_two_week_low,
        volume: r.volume
      },
      prompt
    });
  } catch (err) {
    console.error("GET /api/ticker/:symbol/prompt error:", err);
    res.status(500).json({ error: "query_failed" });
  }
});

// Removed old portfolio APIs - each strategy now has its own endpoints:
// - Daily: /api/daily/* (implemented)
// - Hold: /api/hold/* (future)  
// - Weekly: /api/weekly/* (future)

// === DAILY STRATEGY API ENDPOINTS ===

// 1) Get daily strategy current status
app.get("/api/daily/status", async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const q = `
      SELECT 
        symbol,
        SUM(shares_bought) as total_bought,
        SUM(shares_sold) as total_sold,
        (SUM(shares_bought) - SUM(shares_sold)) as net_position,
        MAX(updated_at) as last_updated
      FROM daily_positions
      WHERE date = $1
      GROUP BY symbol
      ORDER BY symbol
    `;
    
    const { rows } = await pool.query(q, [today]);
    
    const positions = rows.map(row => ({
      symbol: row.symbol,
      totalBought: parseFloat(row.total_bought) || 0,
      totalSold: parseFloat(row.total_sold) || 0,
      netPosition: parseFloat(row.net_position) || 0,
      lastUpdated: row.last_updated
    }));
    
    const cashPosition = positions.find(p => p.symbol === 'USDD');
    const equityPositions = positions.filter(p => p.symbol !== 'USDD');
    
    res.json({
      date: today,
      cashPosition: cashPosition || { symbol: 'USDD', netPosition: 0 },
      equityPositions,
      totalPositions: equityPositions.length
    });
  } catch (err) {
    console.error("GET /api/daily/status error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// 2) Get daily strategy performance over time
app.get("/api/daily/performance", async (_req, res) => {
  try {
    const q = `
      SELECT 
        dp.date,
        dp.symbol,
        dp.shares_bought,
        dp.shares_sold,
        COALESCE(pr.price_open, 0) as price_open,
        COALESCE(pr.price_close, 0) as price_close,
        (dp.shares_bought - COALESCE(dp.shares_sold, 0)) as net_shares,
        CASE 
          WHEN dp.symbol = 'USDD' THEN (dp.shares_bought - COALESCE(dp.shares_sold, 0))
          ELSE (dp.shares_bought - COALESCE(dp.shares_sold, 0)) * COALESCE(pr.price_close, 0)
        END as current_value
      FROM daily_positions dp
      LEFT JOIN daily_prices pr ON dp.symbol = pr.symbol AND dp.date = pr.date
      WHERE dp.shares_bought > 0 OR dp.shares_sold > 0
      ORDER BY dp.date ASC, dp.symbol ASC
    `;
    
    const { rows } = await pool.query(q);
    
    const portfolioByDate = {};
    const assetData = {};
    const allSymbols = new Set();
    
    rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      const symbol = row.symbol;
      const value = parseFloat(row.current_value) || 0;
      const netShares = parseFloat(row.net_shares) || 0;
      
      // Track all symbols that have ever been traded
      if (symbol !== 'USDD') {
        allSymbols.add(symbol);
      }
      
      // Portfolio totals by date (only count positions we currently hold)
      if (netShares !== 0) {
        if (!portfolioByDate[dateStr]) {
          portfolioByDate[dateStr] = { date: dateStr, total: 0 };
        }
        portfolioByDate[dateStr].total += value;
      }
      
      // Individual asset data (include all trading activity)
      if (symbol !== 'USDD') {
        if (!assetData[symbol]) {
          assetData[symbol] = [];
        }
        
        // Calculate cumulative P&L for this asset up to this date
        const buyValue = (parseFloat(row.shares_bought) || 0) * (parseFloat(row.price_open) || 0);
        const sellValue = (parseFloat(row.shares_sold) || 0) * (parseFloat(row.price_close) || 0);
        const dailyPnL = sellValue - buyValue;
        
        assetData[symbol].push({
          date: dateStr,
          value: value,
          shares: netShares,
          sharesBought: parseFloat(row.shares_bought) || 0,
          sharesSold: parseFloat(row.shares_sold) || 0,
          buyValue: buyValue,
          sellValue: sellValue,
          dailyPnL: dailyPnL,
          priceOpen: parseFloat(row.price_open) || 0,
          priceClose: parseFloat(row.price_close) || 0
        });
      }
    });
    
    // Calculate cumulative P&L for each asset
    Object.keys(assetData).forEach(symbol => {
      let cumulativePnL = 0;
      assetData[symbol].forEach(item => {
        cumulativePnL += item.dailyPnL;
        item.cumulativePnL = cumulativePnL;
      });
    });
    
    // Add raw positions and prices data for correct P&L calculation
    const rawPositions = rows.map(row => ({
      symbol: row.symbol,
      date: row.date.toISOString().split('T')[0],
      shares_bought: parseFloat(row.shares_bought) || 0,
      shares_sold: parseFloat(row.shares_sold) || 0,
      price_open: parseFloat(row.price_open) || 0,
      price_close: parseFloat(row.price_close) || 0
    }));

    res.json({
      portfolioTotals: Object.values(portfolioByDate).sort((a, b) => a.date.localeCompare(b.date)),
      assetData,
      symbols: Array.from(allSymbols).sort(),
      rawPositions: rawPositions
    });
  } catch (err) {
    console.error("GET /api/daily/performance error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// Generic chart data endpoint for all strategies
app.get('/api/:strategy/chart-data', async (req, res) => {
  try {
    const strategy = req.params.strategy;
    let query = '';
    
    // Each strategy defines its own chart query
    switch(strategy) {
      case 'daily':
        query = `
          SELECT 
            to_char(dp.date, 'YYYY-MM-DD') AS date,
            dp.shares_bought::float AS value
          FROM daily_positions dp
          LEFT JOIN daily_prices pr ON dp.symbol = pr.symbol AND dp.date = pr.date
          WHERE dp.symbol = 'USDD' 
            AND (pr.price_close IS NOT NULL OR dp.date < CURRENT_DATE OR dp.symbol = 'USDD')
          ORDER BY dp.date ASC
        `;
        break;
      case 'weekly':
        query = `
          SELECT
            to_char(wp.date, 'YYYY-MM-DD') AS date,
            wp.shares_bought::float AS value
          FROM weekly_positions wp
          LEFT JOIN daily_prices pr ON wp.symbol = pr.symbol AND wp.date = pr.date
          WHERE wp.symbol = 'USDW'
            AND (pr.price_close IS NOT NULL OR wp.date < CURRENT_DATE OR wp.symbol = 'USDW')
          ORDER BY wp.date ASC
        `;
        break;
      case 'hold':
        query = `
          SELECT 
            to_char(hp.date, 'YYYY-MM-DD') AS date,
            hp.shares_bought::float AS value
          FROM hold_positions hp
          LEFT JOIN daily_prices pr ON hp.symbol = pr.symbol AND hp.date = pr.date
          WHERE hp.symbol = 'USDH' 
            AND (pr.price_close IS NOT NULL OR hp.date < CURRENT_DATE)
          ORDER BY hp.date ASC
        `;
        break;
      default:
        return res.status(400).json({ error: 'Invalid strategy' });
    }
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching ${req.params.strategy} chart data:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3) Get daily strategy execution history for a specific date
app.get("/api/daily/execution/:date", async (req, res) => {
  try {
    const date = req.params.date;
    
    const q = `
      SELECT 
        dp.symbol,
        dp.shares_bought,
        dp.shares_sold,
        dp.created_at,
        dp.updated_at,
        pr.price_open,
        pr.price_close
      FROM daily_positions dp
      LEFT JOIN daily_prices pr ON dp.symbol = pr.symbol AND dp.date = pr.date
      WHERE dp.date = $1
      ORDER BY dp.created_at ASC, dp.symbol ASC
    `;
    
    const { rows } = await pool.query(q, [date]);
    
    const executions = rows.map(row => ({
      symbol: row.symbol,
      sharesBought: parseFloat(row.shares_bought) || 0,
      sharesSold: parseFloat(row.shares_sold) || 0,
      openPrice: parseFloat(row.price_open) || 0,
      closePrice: parseFloat(row.price_close) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      buyValue: (parseFloat(row.shares_bought) || 0) * (parseFloat(row.price_open) || 0),
      sellValue: (parseFloat(row.shares_sold) || 0) * (parseFloat(row.price_close) || 0)
    }));
    
    const totalBuyValue = executions.reduce((sum, ex) => sum + ex.buyValue, 0);
    const totalSellValue = executions.reduce((sum, ex) => sum + ex.sellValue, 0);
    
    res.json({
      date,
      executions,
      summary: {
        totalBuyValue,
        totalSellValue,
        dailyPnL: totalSellValue - totalBuyValue,
        executionCount: executions.length
      }
    });
  } catch (err) {
    console.error("GET /api/daily/execution/:date error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// 4) Get aggregate asset performance for all assets ever traded
app.get("/api/daily/assets", async (_req, res) => {
  try {
    const q = `
      SELECT 
        dp.symbol,
        SUM(dp.shares_bought) as total_shares_bought,
        SUM(dp.shares_sold) as total_shares_sold,
        SUM(dp.shares_bought * COALESCE(pr_buy.price_open, 0)) as total_buy_value,
        SUM(dp.shares_sold * COALESCE(pr_sell.price_close, 0)) as total_sell_value,
        COUNT(DISTINCT dp.date) as trading_days,
        MIN(dp.date) as first_trade_date,
        MAX(dp.date) as last_trade_date,
        (SUM(dp.shares_bought) - SUM(dp.shares_sold)) as current_position
      FROM daily_positions dp
      LEFT JOIN daily_prices pr_buy ON dp.symbol = pr_buy.symbol AND dp.date = pr_buy.date
      LEFT JOIN daily_prices pr_sell ON dp.symbol = pr_sell.symbol AND dp.date = pr_sell.date
      WHERE dp.symbol != 'USDD'
      GROUP BY dp.symbol
      ORDER BY dp.symbol
    `;
    
    const { rows } = await pool.query(q);
    
    const assets = rows.map(row => ({
      symbol: row.symbol,
      totalSharesBought: parseFloat(row.total_shares_bought) || 0,
      totalSharesSold: parseFloat(row.total_shares_sold) || 0,
      totalBuyValue: parseFloat(row.total_buy_value) || 0,
      totalSellValue: parseFloat(row.total_sell_value) || 0,
      netPnL: (parseFloat(row.total_sell_value) || 0) - (parseFloat(row.total_buy_value) || 0),
      tradingDays: parseInt(row.trading_days) || 0,
      firstTradeDate: row.first_trade_date,
      lastTradeDate: row.last_trade_date,
      currentPosition: parseFloat(row.current_position) || 0,
      isCurrentlyHeld: (parseFloat(row.current_position) || 0) > 0
    }));
    
    const summary = {
      totalAssets: assets.length,
      currentlyHeld: assets.filter(a => a.isCurrentlyHeld).length,
      totalBuyValue: assets.reduce((sum, a) => sum + a.totalBuyValue, 0),
      totalSellValue: assets.reduce((sum, a) => sum + a.totalSellValue, 0),
      totalNetPnL: assets.reduce((sum, a) => sum + a.netPnL, 0)
    };
    
    res.json({
      assets,
      summary
    });
  } catch (err) {
    console.error("GET /api/daily/assets error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// === WEEKLY STRATEGY API ENDPOINTS ===

// 1) Get weekly strategy current status
app.get("/api/weekly/status", async (_req, res) => {
  try {
    // Get current week start date (Monday)
    const today = new Date();
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - (today.getDay() || 7) + 1);
    const mondayStr = currentMonday.toISOString().split('T')[0];
    
    const q = `
      SELECT 
        symbol,
        SUM(shares_bought) as total_bought,
        SUM(shares_sold) as total_sold,
        (SUM(shares_bought) - SUM(shares_sold)) as net_position,
        MAX(updated_at) as last_updated
      FROM weekly_positions
      WHERE date >= $1
      GROUP BY symbol
      ORDER BY symbol
    `;
    
    const { rows } = await pool.query(q, [mondayStr]);
    
    const positions = rows.map(row => ({
      symbol: row.symbol,
      totalBought: parseFloat(row.total_bought) || 0,
      totalSold: parseFloat(row.total_sold) || 0,
      netPosition: parseFloat(row.net_position) || 0,
      lastUpdated: row.last_updated
    }));
    
    const cashPosition = positions.find(p => p.symbol === 'USDW');
    const equityPositions = positions.filter(p => p.symbol !== 'USDW' && p.netPosition > 0);
    
    res.json({
      weekStart: mondayStr,
      cashPosition: cashPosition || { symbol: 'USDW', netPosition: 0 },
      equityPositions,
      totalPositions: equityPositions.length
    });
  } catch (err) {
    console.error("GET /api/weekly/status error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// 2) Get weekly strategy performance over time
app.get("/api/weekly/performance", async (_req, res) => {
  try {
    const q = `
      SELECT
        wp.date,
        wp.symbol,
        wp.shares_bought,
        wp.shares_sold,
        COALESCE(pr.price_open, 0) as price_open,
        COALESCE(pr.price_close, 0) as price_close,
        (wp.shares_bought - COALESCE(wp.shares_sold, 0)) as net_shares,
        CASE
          WHEN wp.symbol = 'USDW' THEN (wp.shares_bought - COALESCE(wp.shares_sold, 0))
          ELSE (wp.shares_bought - COALESCE(wp.shares_sold, 0)) * COALESCE(pr.price_close, 0)
        END as current_value
      FROM weekly_positions wp
      LEFT JOIN daily_prices pr ON wp.symbol = pr.symbol AND wp.date = pr.date
      WHERE wp.shares_bought > 0 OR wp.shares_sold > 0
      ORDER BY wp.date ASC, wp.symbol ASC
    `;

    const { rows } = await pool.query(q);

    const portfolioByDate = {};
    const assetData = {};
    const allSymbols = new Set();

    rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      const symbol = row.symbol;
      const value = parseFloat(row.current_value) || 0;
      const netShares = parseFloat(row.net_shares) || 0;

      // Track all symbols that have ever been traded
      if (symbol !== 'USDW') {
        allSymbols.add(symbol);
      }

      // Portfolio totals by date (only count positions we currently hold)
      if (netShares !== 0) {
        if (!portfolioByDate[dateStr]) {
          portfolioByDate[dateStr] = { date: dateStr, total: 0 };
        }
        portfolioByDate[dateStr].total += value;
      }

      // Individual asset data (include all trading activity)
      if (symbol !== 'USDW') {
        if (!assetData[symbol]) {
          assetData[symbol] = [];
        }

        // Calculate P&L for this asset transaction
        const buyValue = (parseFloat(row.shares_bought) || 0) * (parseFloat(row.price_open) || 0);
        const sellValue = (parseFloat(row.shares_sold) || 0) * (parseFloat(row.price_close) || 0);
        const dailyPnL = sellValue - buyValue;

        assetData[symbol].push({
          date: dateStr,
          value: value,
          shares: netShares,
          sharesBought: parseFloat(row.shares_bought) || 0,
          sharesSold: parseFloat(row.shares_sold) || 0,
          buyValue: buyValue,
          sellValue: sellValue,
          dailyPnL: dailyPnL,
          priceOpen: parseFloat(row.price_open) || 0,
          priceClose: parseFloat(row.price_close) || 0
        });
      }
    });

    // Calculate cumulative P&L for each asset
    Object.keys(assetData).forEach(symbol => {
      let cumulativePnL = 0;
      assetData[symbol].forEach(item => {
        cumulativePnL += item.dailyPnL;
        item.cumulativePnL = cumulativePnL;
      });
    });

    // Add raw positions and prices data for correct P&L calculation
    const rawPositions = rows.map(row => ({
      symbol: row.symbol,
      date: row.date.toISOString().split('T')[0],
      shares_bought: parseFloat(row.shares_bought) || 0,
      shares_sold: parseFloat(row.shares_sold) || 0,
      price_open: parseFloat(row.price_open) || 0,
      price_close: parseFloat(row.price_close) || 0
    }));

    res.json({
      portfolioTotals: Object.values(portfolioByDate).sort((a, b) => a.date.localeCompare(b.date)),
      assetData,
      symbols: Array.from(allSymbols).sort(),
      rawPositions: rawPositions
    });
  } catch (err) {
    console.error("GET /api/weekly/performance error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// 3) Get weekly strategy execution history for a specific week
app.get("/api/weekly/execution/:date", async (req, res) => {
  try {
    const inputDate = new Date(req.params.date);
    const weekStart = new Date(inputDate);
    weekStart.setDate(inputDate.getDate() - (inputDate.getDay() || 7) + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const q = `
      SELECT
        wp.symbol,
        wp.date,
        wp.shares_bought,
        wp.shares_sold,
        COALESCE(pr.price_open, 0) as buy_price,
        COALESCE(pr.price_close, 0) as sell_price,
        wp.created_at,
        wp.updated_at
      FROM weekly_positions wp
      LEFT JOIN daily_prices pr ON wp.symbol = pr.symbol AND wp.date = pr.date
      WHERE wp.date >= $1 AND wp.date <= $2
      ORDER BY wp.date ASC, wp.created_at ASC, wp.symbol ASC
    `;

    const { rows } = await pool.query(q, [weekStartStr, weekEndStr]);

    const executions = rows.map(row => ({
      symbol: row.symbol,
      date: row.date.toISOString().split('T')[0],
      sharesBought: parseFloat(row.shares_bought) || 0,
      sharesSold: parseFloat(row.shares_sold) || 0,
      buyPrice: parseFloat(row.buy_price) || 0,
      sellPrice: parseFloat(row.sell_price) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      buyValue: (parseFloat(row.shares_bought) || 0) * (parseFloat(row.buy_price) || 0),
      sellValue: (parseFloat(row.shares_sold) || 0) * (parseFloat(row.sell_price) || 0)
    }));

    const totalBuyValue = executions.reduce((sum, ex) => sum + ex.buyValue, 0);
    const totalSellValue = executions.reduce((sum, ex) => sum + ex.sellValue, 0);

    res.json({
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      executions,
      summary: {
        totalBuyValue,
        totalSellValue,
        weeklyPnL: totalSellValue - totalBuyValue,
        executionCount: executions.length
      }
    });
  } catch (err) {
    console.error("GET /api/weekly/execution/:date error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// 4) Get aggregate asset performance for all assets ever traded in weekly strategy
app.get("/api/weekly/assets", async (_req, res) => {
  try {
    const q = `
      SELECT
        wp.symbol,
        SUM(wp.shares_bought) as total_shares_bought,
        SUM(wp.shares_sold) as total_shares_sold,
        SUM(wp.shares_bought * COALESCE(pr_buy.price_open, 0)) as total_buy_value,
        SUM(wp.shares_sold * COALESCE(pr_sell.price_close, 0)) as total_sell_value,
        COUNT(DISTINCT wp.date) as trading_days,
        MIN(wp.date) as first_trade_date,
        MAX(wp.date) as last_trade_date,
        (SUM(wp.shares_bought) - SUM(wp.shares_sold)) as current_position
      FROM weekly_positions wp
      LEFT JOIN daily_prices pr_buy ON wp.symbol = pr_buy.symbol AND wp.date = pr_buy.date
      LEFT JOIN daily_prices pr_sell ON wp.symbol = pr_sell.symbol AND wp.date = pr_sell.date
      WHERE wp.symbol != 'USDW'
      GROUP BY wp.symbol
      ORDER BY wp.symbol
    `;

    const { rows } = await pool.query(q);

    const assets = rows.map(row => ({
      symbol: row.symbol,
      totalSharesBought: parseFloat(row.total_shares_bought) || 0,
      totalSharesSold: parseFloat(row.total_shares_sold) || 0,
      totalBuyValue: parseFloat(row.total_buy_value) || 0,
      totalSellValue: parseFloat(row.total_sell_value) || 0,
      netPnL: (parseFloat(row.total_sell_value) || 0) - (parseFloat(row.total_buy_value) || 0),
      tradingDays: parseInt(row.trading_days) || 0,
      firstTradeDate: row.first_trade_date,
      lastTradeDate: row.last_trade_date,
      currentPosition: parseFloat(row.current_position) || 0,
      isCurrentlyHeld: (parseFloat(row.current_position) || 0) > 0
    }));

    const summary = {
      totalAssets: assets.length,
      currentlyHeld: assets.filter(a => a.isCurrentlyHeld).length,
      totalBuyValue: assets.reduce((sum, a) => sum + a.totalBuyValue, 0),
      totalSellValue: assets.reduce((sum, a) => sum + a.totalSellValue, 0),
      totalNetPnL: assets.reduce((sum, a) => sum + a.netPnL, 0)
    };

    res.json({
      assets,
      summary
    });
  } catch (err) {
    console.error("GET /api/weekly/assets error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// === HOLD STRATEGY API ENDPOINTS ===

// 1) Get hold strategy current status
app.get("/api/hold/status", async (_req, res) => {
  try {
    const q = `
      SELECT 
        hp.symbol,
        SUM(hp.shares_bought) as total_bought,
        SUM(hp.shares_sold) as total_sold,
        (SUM(hp.shares_bought) - SUM(hp.shares_sold)) as net_position,
        MAX(hp.updated_at) as last_updated,
        CASE 
          WHEN hp.symbol = 'USDH' THEN (SUM(hp.shares_bought) - SUM(hp.shares_sold))
          ELSE (SUM(hp.shares_bought) - SUM(hp.shares_sold)) * COALESCE(pr.price_close, pr.price_open, 1.0)
        END as current_value,
        COALESCE(pr.price_close, pr.price_open, 1.0) as current_price
      FROM hold_positions hp
      LEFT JOIN daily_prices pr ON hp.symbol = pr.symbol AND pr.date = (NOW() AT TIME ZONE 'America/Chicago')::DATE
      GROUP BY hp.symbol, pr.price_close, pr.price_open
      HAVING (SUM(hp.shares_bought) - SUM(hp.shares_sold)) != 0
      ORDER BY hp.symbol
    `;
    
    const { rows } = await pool.query(q);
    
    const positions = rows.map(row => ({
      symbol: row.symbol,
      totalBought: parseFloat(row.total_bought) || 0,
      totalSold: parseFloat(row.total_sold) || 0,
      netPosition: parseFloat(row.net_position) || 0,
      currentValue: parseFloat(row.current_value) || 0,
      currentPrice: parseFloat(row.current_price) || 0,
      lastUpdated: row.last_updated
    }));
    
    const cashPosition = positions.find(p => p.symbol === 'USDH');
    const equityPositions = positions.filter(p => p.symbol !== 'USDH');
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
    
    res.json({
      date: new Date().toISOString().split('T')[0],
      cashPosition: cashPosition || { symbol: 'USDH', netPosition: 0, currentValue: 0 },
      equityPositions,
      totalPositions: equityPositions.length,
      totalPortfolioValue: totalValue
    });
  } catch (err) {
    console.error("GET /api/hold/status error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// 2) Get hold strategy performance over time
app.get("/api/hold/performance", async (_req, res) => {
  try {
    const q = `
      SELECT 
        hp.date,
        hp.symbol,
        hp.shares_bought,
        hp.shares_sold,
        COALESCE(hp.buy_price, 0) as buy_price,
        COALESCE(hp.sell_price, 0) as sell_price,
        hp.rebalance_reason,
        COALESCE(pr_buy.price_open, hp.buy_price, 1.0) as price_open,
        COALESCE(pr_sell.price_close, hp.sell_price, 1.0) as price_close
      FROM hold_positions hp
      LEFT JOIN daily_prices pr_buy ON hp.symbol = pr_buy.symbol AND hp.date = pr_buy.date
      LEFT JOIN daily_prices pr_sell ON hp.symbol = pr_sell.symbol AND hp.date = pr_sell.date
      WHERE hp.shares_bought > 0 OR hp.shares_sold > 0
      ORDER BY hp.date ASC, hp.symbol ASC
    `;
    
    const { rows } = await pool.query(q);
    
    const portfolioByDate = {};
    const assetData = {};
    const allSymbols = new Set();
    const assetPnL = {}; // Track cumulative P&L per asset
    const assetPositions = {}; // Track running position per asset
    
    rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      const symbol = row.symbol;
      
      // Track all symbols that have ever been traded
      if (symbol !== 'USDH') {
        allSymbols.add(symbol);
        
        if (!assetPnL[symbol]) {
          assetPnL[symbol] = 0;
          assetPositions[symbol] = 0;
        }
        
        // Update running position
        const sharesBought = parseFloat(row.shares_bought) || 0;
        const sharesSold = parseFloat(row.shares_sold) || 0;
        assetPositions[symbol] += sharesBought - sharesSold;
        
        // Calculate P&L from this transaction
        const buyValue = sharesBought * (parseFloat(row.buy_price) || 0);
        const sellValue = sharesSold * (parseFloat(row.sell_price) || 0);
        const transactionPnL = sellValue - buyValue;
        
        assetPnL[symbol] += transactionPnL;
        
        if (!assetData[symbol]) {
          assetData[symbol] = [];
        }
        
        assetData[symbol].push({
          date: dateStr,
          sharesBought: sharesBought,
          sharesSold: sharesSold,
          buyValue: buyValue,
          sellValue: sellValue,
          transactionPnL: transactionPnL,
          cumulativePnL: assetPnL[symbol],
          runningShares: assetPositions[symbol],
          buyPrice: parseFloat(row.buy_price) || 0,
          sellPrice: parseFloat(row.sell_price) || 0,
          rebalanceReason: row.rebalance_reason
        });
      }
    });
    
    // Calculate portfolio totals by date (actual portfolio value, not transaction P&L)
    const allDates = new Set();
    Object.keys(assetData).forEach(symbol => {
      assetData[symbol].forEach(item => {
        allDates.add(item.date);
      });
    });
    
    const sortedDates = Array.from(allDates).sort();
    
    for (const dateStr of sortedDates) {
      let totalPortfolioValue = 0;
      
      // For each date, calculate the total portfolio value
      // Get cash position on this date
      const cashQuery = await pool.query(`
        SELECT SUM(shares_bought) - SUM(shares_sold) as net_cash
        FROM hold_positions 
        WHERE symbol = 'USDH' AND date <= $1
      `, [dateStr]);
      
      const cashPosition = parseFloat(cashQuery.rows[0]?.net_cash) || 0;
      totalPortfolioValue += cashPosition;
      
      // Get equity positions with current market values
      for (const symbol of Object.keys(assetData)) {
        if (symbol === 'USDH') continue;
        
        const positionQuery = await pool.query(`
          SELECT SUM(shares_bought) - SUM(shares_sold) as net_shares
          FROM hold_positions 
          WHERE symbol = $1 AND date <= $2
        `, [symbol, dateStr]);
        
        const netShares = parseFloat(positionQuery.rows[0]?.net_shares) || 0;
        
        if (netShares > 0) {
          // Get current price for this symbol on this date
          const priceQuery = await pool.query(`
            SELECT COALESCE(price_close, price_open) as price
            FROM daily_prices 
            WHERE symbol = $1 AND date = $2
          `, [symbol, dateStr]);
          
          const currentPrice = parseFloat(priceQuery.rows[0]?.price) || 1.0;
          totalPortfolioValue += (netShares * currentPrice);
        }
      }
      
      portfolioByDate[dateStr] = {
        date: dateStr,
        total: totalPortfolioValue
      };
    }
    
    // Add raw positions and prices data for correct P&L calculation
    const rawPositions = rows.map(row => ({
      symbol: row.symbol,
      date: row.date.toISOString().split('T')[0],
      shares_bought: parseFloat(row.shares_bought) || 0,
      shares_sold: parseFloat(row.shares_sold) || 0,
      price_open: parseFloat(row.price_open) || 0,
      price_close: parseFloat(row.price_close) || 0
    }));

    res.json({
      portfolioTotals: Object.values(portfolioByDate).sort((a, b) => a.date.localeCompare(b.date)),
      assetData,
      symbols: Array.from(allSymbols).sort(),
      rawPositions: rawPositions
    });
  } catch (err) {
    console.error("GET /api/hold/performance error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// 3) Get hold strategy rebalancing history for a specific date
app.get("/api/hold/execution/:date", async (req, res) => {
  try {
    const date = req.params.date;
    
    const q = `
      SELECT 
        hp.symbol,
        hp.shares_bought,
        hp.shares_sold,
        hp.buy_price,
        hp.sell_price,
        hp.conviction_at_buy,
        hp.conviction_at_sell,
        hp.rebalance_reason,
        hp.created_at,
        hp.updated_at
      FROM hold_positions hp
      WHERE hp.date = $1
      ORDER BY hp.created_at ASC, hp.symbol ASC
    `;
    
    const { rows } = await pool.query(q, [date]);
    
    const executions = rows.map(row => ({
      symbol: row.symbol,
      sharesBought: parseFloat(row.shares_bought) || 0,
      sharesSold: parseFloat(row.shares_sold) || 0,
      buyPrice: parseFloat(row.buy_price) || 0,
      sellPrice: parseFloat(row.sell_price) || 0,
      convictionAtBuy: parseFloat(row.conviction_at_buy) || null,
      convictionAtSell: parseFloat(row.conviction_at_sell) || null,
      rebalanceReason: row.rebalance_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      buyValue: (parseFloat(row.shares_bought) || 0) * (parseFloat(row.buy_price) || 0),
      sellValue: (parseFloat(row.shares_sold) || 0) * (parseFloat(row.sell_price) || 0)
    }));
    
    const totalBuyValue = executions.reduce((sum, ex) => sum + ex.buyValue, 0);
    const totalSellValue = executions.reduce((sum, ex) => sum + ex.sellValue, 0);
    
    res.json({
      date,
      executions,
      summary: {
        totalBuyValue,
        totalSellValue,
        netPnL: totalSellValue - totalBuyValue,
        rebalanceCount: executions.length
      }
    });
  } catch (err) {
    console.error("GET /api/hold/execution/:date error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// 4) Get aggregate asset performance for all assets ever held in hold strategy
app.get("/api/hold/assets", async (_req, res) => {
  try {
    const q = `
      SELECT 
        hp.symbol,
        SUM(hp.shares_bought) as total_shares_bought,
        SUM(hp.shares_sold) as total_shares_sold,
        SUM(hp.shares_bought * COALESCE(hp.buy_price, 0)) as total_buy_value,
        SUM(hp.shares_sold * COALESCE(hp.sell_price, 0)) as total_sell_value,
        COUNT(DISTINCT hp.date) as rebalance_days,
        MIN(hp.date) as first_trade_date,
        MAX(hp.date) as last_trade_date,
        (SUM(hp.shares_bought) - SUM(hp.shares_sold)) as current_position
      FROM hold_positions hp
      WHERE hp.symbol != 'USDH'
      GROUP BY hp.symbol
      ORDER BY hp.symbol
    `;
    
    const { rows } = await pool.query(q);
    
    const assets = rows.map(row => ({
      symbol: row.symbol,
      totalSharesBought: parseFloat(row.total_shares_bought) || 0,
      totalSharesSold: parseFloat(row.total_shares_sold) || 0,
      totalBuyValue: parseFloat(row.total_buy_value) || 0,
      totalSellValue: parseFloat(row.total_sell_value) || 0,
      netPnL: (parseFloat(row.total_sell_value) || 0) - (parseFloat(row.total_buy_value) || 0),
      rebalanceDays: parseInt(row.rebalance_days) || 0,
      firstTradeDate: row.first_trade_date,
      lastTradeDate: row.last_trade_date,
      currentPosition: parseFloat(row.current_position) || 0,
      isCurrentlyHeld: (parseFloat(row.current_position) || 0) > 0
    }));
    
    // Calculate actual portfolio performance vs. initial investment
    const totalBuyValue = assets.reduce((sum, a) => sum + a.totalBuyValue, 0);
    const totalSellValue = assets.reduce((sum, a) => sum + a.totalSellValue, 0);
    
    // Get current total portfolio value (cash + current equity value)
    const currentPortfolioQuery = await pool.query(`
      SELECT 
        SUM(CASE WHEN hp.symbol = 'USDH' THEN hp.shares_bought - hp.shares_sold ELSE 0 END) as cash_position,
        SUM(CASE WHEN hp.symbol != 'USDH' THEN (hp.shares_bought - hp.shares_sold) * COALESCE(dp.price_close, dp.price_open, 1.0) ELSE 0 END) as equity_value
      FROM hold_positions hp
      LEFT JOIN daily_prices dp ON hp.symbol = dp.symbol AND dp.date = (NOW() AT TIME ZONE 'America/Chicago')::DATE
    `);
    
    const cashPosition = parseFloat(currentPortfolioQuery.rows[0]?.cash_position) || 0;
    const equityValue = parseFloat(currentPortfolioQuery.rows[0]?.equity_value) || 0;
    const totalPortfolioValue = cashPosition + equityValue;
    
    // Total P&L = current portfolio value - initial investment (assuming started with $1000 USDH)
    const initialInvestment = 1000; // This could be made dynamic later
    const actualPnL = totalPortfolioValue - initialInvestment;
    
    const summary = {
      totalAssets: assets.length,
      currentlyHeld: assets.filter(a => a.isCurrentlyHeld).length,
      totalBuyValue: totalBuyValue,
      totalSellValue: totalSellValue,
      totalNetPnL: actualPnL, // This is now the actual portfolio P&L vs. initial investment
      currentPortfolioValue: totalPortfolioValue,
      initialInvestment: initialInvestment
    };
    
    res.json({
      assets,
      summary
    });
  } catch (err) {
    console.error("GET /api/hold/assets error:", err);
    res.status(500).json({ error: "query_failed", message: err.message });
  }
});

// Healthcheck
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(APP_PORT, () => {
  console.log(`janus-app listening on port ${APP_PORT}`);
});
