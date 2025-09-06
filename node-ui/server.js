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

// 1) List tickers with multiple Buy recommendations
//    select symbol, count(*) as count from ticker_scores where recommendation='Buy' group by symbol having count(*) > 1 order by count desc;
app.get("/api/buys", async (_req, res) => {
  try {
    const q = `
      select symbol, count(*)::int as count
      from ticker_scores
      where recommendation = 'Buy'
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

// Healthcheck
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(APP_PORT, () => {
  console.log(`janus-app listening on port ${APP_PORT}`);
});
