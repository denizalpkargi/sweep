// Hyperliquid ileriye dönük veri toplayıcı (test #38 yan işi, 9 Ekim 2026).
// Saatte bir: coin durumu (mark, fonlama, OI, prim), Binance/Bybit/HL tahmini fonlama
// ve hesap değeri en büyük N hesabın açık pozisyonlarından likidasyon haritası
// (marka göre %0,5'lik kovalarda nominal). Geçmişi API'den alınamayan iki testin
// (gerçek likidasyon yığınları, HL–Binance fonlama farkı) verisi buradan birikir.
// Çalıştırma: node tests/hl-collect.js [--top 400] [--by vlm|av] [--once] [--out bot-data/hl]
// Varsayılan hesap seçimi aylık hacim: hesap değeri en büyükler düşük kaldıraçlı (kasa, piyasa yapıcı),
// likidasyon fiyatları marka uzak kalıyor (ilk denemede 300 hesapta yalnız 4 coin).
// Bulutta proxy arkasında: NODE_USE_ENV_PROXY=1 node tests/hl-collect.js
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const TOP = +arg('--top', 400), BY = arg('--by', 'vlm'), OUT = arg('--out', 'bot-data/hl'), ONCE = process.argv.includes('--once');
const GAP = 1100, BIN = 0.005, RANGE = 0.25;
fs.mkdirSync(OUT, { recursive: true });
let last = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function info(body, url = 'https://api.hyperliquid.xyz/info') {
  for (let t = 0; t < 8; t++) {
    const w = last + GAP - Date.now(); if (w > 0) await sleep(w); last = Date.now();
    try {
      const r = await fetch(url, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      if (r.status === 429) { await sleep(Math.min(120e3, 5e3 * 2 ** t)); continue; }
      if (!r.ok) { await sleep(5e3); continue; }
      return await r.json();
    } catch (e) { await sleep(5e3); }
  }
  throw new Error('istek başarısız');
}
let accts = [], acctsAt = 0;
async function topAccounts() {
  if (Date.now() - acctsAt < 24 * 3600e3 && accts.length) return accts;
  const lb = await info(null, 'https://stats-data.hyperliquid.xyz/Mainnet/leaderboard');
  const v = r => +(r.windowPerformances.find(w => w[0] === 'month')?.[1]?.vlm || 0);
  accts = lb.leaderboardRows.map(r => [r.ethAddress, BY === 'av' ? +r.accountValue : v(r)]).sort((a, b) => b[1] - a[1]).slice(0, TOP).map(x => x[0]);
  acctsAt = Date.now(); return accts;
}
async function snap() {
  const t = Date.now();
  const [meta, ctx] = await info({ type: 'metaAndAssetCtxs' });
  const coins = {};
  meta.universe.forEach((m, i) => { if (!m.isDelisted) coins[m.name] = { mark: +ctx[i].markPx, fund: +ctx[i].funding, oi: +ctx[i].openInterest, prem: +ctx[i].premium, vol: +ctx[i].dayNtlVlm }; });
  const pf = await info({ type: 'predictedFundings' });
  const pred = {};
  for (const [c, venues] of pf) { pred[c] = {}; for (const [v, x] of venues) if (x) pred[c][v] = [+x.fundingRate, x.fundingIntervalHours]; }
  // likidasyon haritası: coin → { "+0.035": [longNtl, shortNtl] } (kova = liqPx/mark − 1)
  const liq = {}, net = {}; let seen = 0;
  for (const u of await topAccounts()) {
    let st; try { st = await info({ type: 'clearinghouseState', user: u }); } catch (e) { continue; }
    seen++;
    for (const { position: p } of st.assetPositions || []) {
      const c = p.coin, mk = coins[c]?.mark; if (!mk) continue;
      const szi = +p.szi, ntl = Math.abs(szi) * mk;
      (net[c] ??= [0, 0, 0]); net[c][0] += szi * mk; net[c][szi > 0 ? 1 : 2]++;
      if (!p.liquidationPx) continue;
      const d = +p.liquidationPx / mk - 1; if (Math.abs(d) > RANGE) continue;
      const k = (Math.round(d / BIN) * BIN).toFixed(3);
      ((liq[c] ??= {})[k] ??= [0, 0])[szi > 0 ? 0 : 1] += ntl;
    }
  }
  const row = { t, accounts: seen, coins, pred, liq, net };
  fs.appendFileSync(path.join(OUT, `hl-${new Date(t).toISOString().slice(0, 10)}.jsonl`), JSON.stringify(row) + '\n');
  console.log(new Date(t).toISOString(), 'hesap', seen, 'coin', Object.keys(liq).length, 'süre', Math.round((Date.now() - t) / 1000), 'sn');
}
(async () => {
  for (;;) {
    try { await snap(); } catch (e) { console.error('hata', e.message); }
    if (ONCE) break;
    const next = Math.ceil(Date.now() / 3600e3) * 3600e3 + 60e3;
    await sleep(next - Date.now());
  }
})();
