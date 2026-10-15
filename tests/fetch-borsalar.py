# Diğer borsaların geçmiş verisi — 14 Ekim 2026 (kullanıcı: "devam et borsalarla")
# Bybit USDT vadeli: saatlik açık pozisyon (OI), saatlik hesap long/short oranı, fonlama; Coinbase spot: saatlik mum (USD).
# Evren: Ozan'ın örneklem dışı dönemindeki (2024-05 →) aylık ilk 30 coin (universe.json). OKX'te derin geçmiş yok (boş döner), alınmadı.
# Çıktı: tests/data/borsa/{bybit-oi,bybit-ls,bybit-fr,coinbase}/<SYM>.csv (var olan dosyaya kaldığı yerden ekler). Yalnız herkese açık uç noktalar.
# Kullanım: python tests/fetch-borsalar.py <universe.json> [bybit|coinbase] [--from 2024-05]
import sys, os, json, time, csv, calendar, urllib.request, urllib.error
UNI = sys.argv[1]; SRC = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else 'bybit'
FROM = sys.argv[sys.argv.index('--from') + 1] if '--from' in sys.argv else '2024-05'
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'data', 'borsa'); H = 3600000
T0 = calendar.timegm(time.strptime(FROM + '-01', '%Y-%m-%d')) * 1000 - 3 * 86400000; NOW = int(time.time() // 3600 * 3600 * 1000)
U = json.load(open(UNI, encoding='utf-8'))['months']; SYMS = sorted({s for m, v in U.items() if m >= FROM for s in v[:30]})
if '--part' in sys.argv:   # --part k/n: paralel süreçler için coinlerin k. dilimi
    k_, n_ = map(int, sys.argv[sys.argv.index('--part') + 1].split('/')); SYMS = SYMS[k_::n_]
GAP = {'bybit': 0.13, 'coinbase': 0.2}[SRC]

def get(url):
    for k in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'sweep-research'})
            with urllib.request.urlopen(req, timeout=30) as r: b = r.read()
            time.sleep(GAP); return json.loads(b)
        except urllib.error.HTTPError as e:
            if e.code in (403, 418, 429): print('hız sınırı', e.code, '— 60 sn bekleniyor', flush=True); time.sleep(60); continue
            if e.code in (400, 404): return None
            time.sleep(3)
        except Exception: time.sleep(3)
    return None

def last_t(p):
    if not os.path.exists(p): return None
    with open(p, 'rb') as f:
        try: f.seek(-200, 2)
        except OSError: f.seek(0)
        ln = f.read().decode().strip().split('\n')[-1]
    try: return int(ln.split(',')[0])
    except ValueError: return None

def append(p, rows):
    with open(p, 'a', newline='') as f:
        w = csv.writer(f)
        for r in rows: w.writerow(r)

def bybit_series(sym, kind):
    d = os.path.join(OUT, 'bybit-' + kind); os.makedirs(d, exist_ok=True); p = os.path.join(d, sym + '.csv')
    start = (last_t(p) or T0 - H) + H; rows = []; lim = {'oi': 200, 'ls': 500, 'fr': 200}[kind]; step = {'oi': H, 'ls': H, 'fr': 8 * H}[kind]
    s = start
    while s < NOW:   # ileri doğru pencereler: [s, s + lim × adım)
        e = min(s + lim * step, NOW)
        if kind == 'oi': j = get(f'https://api.bybit.com/v5/market/open-interest?category=linear&symbol={sym}&intervalTime=1h&limit={lim}&startTime={s}&endTime={e - 1}')
        elif kind == 'ls': j = get(f'https://api.bybit.com/v5/market/account-ratio?category=linear&symbol={sym}&period=1h&limit={lim}&startTime={s}&endTime={e - 1}')
        else: j = get(f'https://api.bybit.com/v5/market/funding/history?category=linear&symbol={sym}&limit={lim}&startTime={s}&endTime={e - 1}')
        if j is None or j.get('retCode') not in (0, None):
            if kind == 'oi' and s == start and not rows: return 'yok'
            s = e; continue
        for x in (j.get('result') or {}).get('list') or []:
            if kind == 'oi': rows.append((int(x['timestamp']), x['openInterest']))
            elif kind == 'ls': rows.append((int(x['timestamp']), x['buyRatio']))
            else: rows.append((int(x['fundingRateTimestamp']), x['fundingRate']))
        s = e
    rows = sorted({r[0]: r for r in rows if r[0] >= start}.values()); append(p, rows); return len(rows)

def coinbase(sym, products):
    base = sym[:-4]; mult = 1
    for pre, m in (('1000000', 1e6), ('1000', 1e3)):
        if base.startswith(pre) and base[len(pre):] + '-USD' in products: base, mult = base[len(pre):], m; break
    prod = base + '-USD'
    if prod not in products: return 'yok'
    d = os.path.join(OUT, 'coinbase'); os.makedirs(d, exist_ok=True); p = os.path.join(d, sym + '.csv')
    start = (last_t(p) or T0 - H) + H; s = start; rows = []
    while s < NOW:
        e = min(s + 300 * H, NOW)
        j = get(f'https://api.exchange.coinbase.com/products/{prod}/candles?granularity=3600&start={time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(s / 1000))}&end={time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime((e - H) / 1000))}')
        if isinstance(j, list):
            for x in j: rows.append((int(x[0]) * 1000, x[4] * mult, x[5] / mult))   # t (açılış), kapanış (Binance ölçeğinde), hacim
        s = e
    rows = sorted({r[0]: r for r in rows if r[0] >= start}.values()); append(p, rows); return len(rows)

print(SRC, len(SYMS), 'coin', FROM, flush=True); t0 = time.time()
products = None
if SRC == 'coinbase':
    j = get('https://api.exchange.coinbase.com/products'); products = {x['id'] for x in j if x.get('quote_currency') == 'USD'}
for k, s in enumerate(SYMS):
    if SRC == 'bybit':
        r = bybit_series(s, 'oi')
        if r != 'yok': r = (r, bybit_series(s, 'ls'), bybit_series(s, 'fr'))
    else: r = coinbase(s, products)
    print(f'{k + 1}/{len(SYMS)} {s} {r}  {time.time() - t0:.0f} sn', flush=True)
print('bitti', flush=True)
