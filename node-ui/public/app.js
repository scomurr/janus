const tbody = document.querySelector("#tickers tbody");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh");
const promptTA = document.getElementById("prompt");
const symTitle = document.getElementById("symTitle");
const meta = document.getElementById("meta");
const copyBtn = document.getElementById("copyBtn");

async function fetchBuys() {
  statusEl.textContent = "Loading...";
  try {
    const resp = await fetch("/api/buys");
    const data = await resp.json();
    renderTable(data);
    statusEl.textContent = `Loaded ${data.length}`;
  } catch (e) {
    console.error(e);
    statusEl.textContent = "Error";
  }
}

function renderTable(rows) {
  tbody.innerHTML = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    const tdSym = document.createElement("td");
    const tdCnt = document.createElement("td");
    tdSym.textContent = r.symbol;
    tdCnt.innerHTML = `<span class="badge">${r.count}</span>`;
    tr.appendChild(tdSym);
    tr.appendChild(tdCnt);
    tr.addEventListener("click", () => loadPrompt(r.symbol));
    tbody.appendChild(tr);
  });
}

async function loadPrompt(symbol) {
  symTitle.textContent = symbol;
  meta.textContent = "Loading...";
  promptTA.value = "";
  copyBtn.disabled = true;

  try {
    const resp = await fetch(`/api/ticker/${encodeURIComponent(symbol)}/prompt`);
    if (!resp.ok) {
      meta.textContent = "Not found";
      return;
    }
    const { data, prompt } = await resp.json();
    promptTA.value = prompt;
    copyBtn.disabled = false;

    const parts = [];
    if (data.market_cap !== null && data.market_cap !== undefined) parts.push(`MC: ${data.market_cap}`);
    if (data.revenue !== null && data.revenue !== undefined) parts.push(`Rev: ${data.revenue}`);
    if (data.gross_margins !== null && data.gross_margins !== undefined) parts.push(`GM: ${data.gross_margins}`);
    if (data.trailing_pe !== null && data.trailing_pe !== undefined) parts.push(`PE: ${data.trailing_pe}`);
    if (data.dividend_yield !== null && data.dividend_yield !== undefined) parts.push(`DivY: ${data.dividend_yield}`);
    if (data.high !== null && data.low !== null && data.high !== undefined && data.low !== undefined) parts.push(`52W: ${data.high}/${data.low}`);
    if (data.volume !== null && data.volume !== undefined) parts.push(`Vol: ${data.volume}`);

    meta.textContent = parts.join("  ·  ") || "";
  } catch (e) {
    console.error(e);
    meta.textContent = "Error";
  }
}

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(promptTA.value);
    copyBtn.textContent = "Copied";
    setTimeout(() => (copyBtn.textContent = "Copy prompt"), 1000);
  } catch {}
});

refreshBtn.addEventListener("click", fetchBuys);
fetchBuys();
