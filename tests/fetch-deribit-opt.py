# Deribit opsiyon geçmişi (11 Ekim 2026, kullanıcı: "opsiyonlardaki hareketlere bakarak futures tahmini yapılabilir mi").
# history.deribit.com buluttan kapalı; www.deribit.com public/get_tradingview_chart_data süresi dolmuş opsiyonlar için de saatlik
# işlem mumu veriyor (ad biliniyorsa). Adlar tahmin edilir: 2020-01'den her cuma vadesi (08:00 UTC), vadeden önceki 50 gün,
# perp aralığına göre ~%1 adımlı kullanım fiyatları (put 0,70–1,05×, call 0,95–1,30×); olmayan ad "instrument not found" döner.
# Çıktı tests/data/opsiyon/: perp-<C>.csv (t,o,h,l,c,v saatlik), fund-<C>.csv (t,i1h), opt-<C>.csv (t,exp,K,cp,c,v: yalnız
# hacimli saatler; c = opsiyon fiyatı, dayanak cinsinden). Var olan vade atlanır (done-<C>.txt). Kullanım: python3 tests/fetch-deribit-opt.py [BTC ETH]
import sys, os, time, json, threading, datetime as dt
from concurrent.futures import ThreadPoolExecutor
import requests
API = 'https://www.deribit.com/api/v2/public/'
OUT = os.path.join(os.path.dirname(__file__), 'data', 'opsiyon'); os.makedirs(OUT, exist_ok=True)
H = 3600_000; DAY = 24 * H
S = requests.Session(); lock = threading.Lock()
MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

def get(m, **p):
    for a in range(6):
        try:
            r = S.get(API + m, params=p, timeout=40)
            if r.status_code == 429: time.sleep(2 ** a); continue
            j = r.json()
            if 'error' in j:
                if j['error'].get('code') == 10028: time.sleep(2 ** a); continue  # too_many_requests
                return None
            return j['result']
        except Exception:
            time.sleep(2 ** a)
    return None

def chart(name, t0, t1, res='60'):
    out = []; t = t0
    while t < t1:
        e = min(t1, t + 4000 * H)
        r = get('get_tradingview_chart_data', instrument_name=name, start_timestamp=t, end_timestamp=e, resolution=res)
        if r is None: return None
        if r.get('status') == 'ok':
            for i, ts in enumerate(r['ticks']):
                out.append((ts, r['open'][i], r['high'][i], r['low'][i], r['close'][i], r['volume'][i]))
        t = e
    d = {}
    for x in out: d[x[0]] = x
    return [d[k] for k in sorted(d)]

def perp(cur):
    f = os.path.join(OUT, f'perp-{cur}.csv')
    t0 = int(dt.datetime(2019, 10, 1, tzinfo=dt.timezone.utc).timestamp() * 1000); now = int(time.time() * 1000) // H * H
    rows = chart(f'{cur}-PERPETUAL', t0, now)
    with open(f, 'w') as fh:
        for r in rows: fh.write('%d,%s,%s,%s,%s,%s\n' % r)
    fr = []; t = t0
    while t < now:
        e = min(now, t + 700 * H); r = get('get_funding_rate_history', instrument_name=f'{cur}-PERPETUAL', start_timestamp=t, end_timestamp=e) or []
        fr += [(x['timestamp'], x['interest_1h']) for x in r]; t = e
    with open(os.path.join(OUT, f'fund-{cur}.csv'), 'w') as fh:
        for a, b in sorted(set(fr)): fh.write(f'{a},{b}\n')
    return rows

def name(cur, exp, K, cp):
    d = dt.datetime.fromtimestamp(exp / 1000, dt.timezone.utc)
    ks = str(int(K)) if float(K).is_integer() else str(K)
    return f'{cur}-{d.day}{MON[d.month-1]}{d.year % 100:02d}-{ks}-{cp}'

def nice_step(s):
    st = [5, 10, 20, 25, 50, 100, 250, 500, 1000, 2000]
    best = st[0]
    for x in st:
        if x <= s * 0.012: best = x
    return best

def main():
    curs = sys.argv[1:] or ['BTC', 'ETH']
    for cur in curs:
        P = perp(cur); print(cur, 'perp saat', len(P), flush=True)
        close = {r[0]: r[4] for r in P}
        donef = os.path.join(OUT, f'done-{cur}.txt'); done = set(open(donef).read().split()) if os.path.exists(donef) else set()
        optf = open(os.path.join(OUT, f'opt-{cur}.csv'), 'a')
        e = dt.datetime(2020, 1, 3, 8, tzinfo=dt.timezone.utc); end = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=1)
        exps = []
        while e < end: exps.append(int(e.timestamp() * 1000)); e += dt.timedelta(days=7)
        t_start = time.time(); nq = 0
        for exp in exps:
            if str(exp) in done: continue
            t0 = exp - 50 * DAY
            px = [close[t] for t in range(t0 // H * H, exp, H) if t in close]
            if not px: continue
            lo, hi = min(px), max(px); step = nice_step((lo + hi) / 2)
            Ks = []
            k = (int(0.70 * lo / step)) * step
            while k <= 1.30 * hi:
                if k > 0:
                    if k <= 1.05 * hi: Ks.append((k, 'P'))
                    if k >= 0.95 * lo: Ks.append((k, 'C'))
                k += step
            def job(kc):
                K, cp = kc; rows = chart(name(cur, exp, K, cp), t0, exp + H)
                return K, cp, rows
            with ThreadPoolExecutor(12) as ex:
                res = list(ex.map(job, Ks))
            nq += len(Ks); n = 0
            for K, cp, rows in res:
                if not rows: continue
                for r in rows:
                    if r[5] > 0 and r[0] < exp: optf.write(f'{r[0]},{exp},{K},{cp},{r[4]},{r[5]}\n'); n += 1
            optf.flush()
            with open(donef, 'a') as fh: fh.write(f'{exp}\n')
            print(cur, dt.datetime.fromtimestamp(exp / 1000, dt.timezone.utc).date(), 'adım', step, 'sorgu', len(Ks), 'satır', n,
                  'toplam sorgu', nq, int(time.time() - t_start), 'sn', flush=True)
        optf.close()

if __name__ == '__main__':
    main()
