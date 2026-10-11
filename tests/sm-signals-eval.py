# Telegram sinyal kanallarının çağrılarını Binance fiyatıyla ölçer (11 Ekim 2026).
# Girdi tests/data/signals/_cagrilar.json (sm-signals-parse.py). Mumlar: www.binance.com/fapi (yoksa 1000'li perp, yoksa spot) 15 dk,
# yayından itibaren ~20 gün → tests/data/signals/kl/<SYM>_<t>.json önbelleği.
# Kurallar: giriş 72 saat içinde; aralık sinyalinde limit = bölgenin yakın kenarı (fiyat zaten bölgedeyse sonraki açılış), "Buy stop" = kırılımda,
# "Instant/now" = sonraki 15 dk açılışı. Stop ve hedef aynı mumda → stop; dolum mumunda hedef sayılmaz. 14 gün sonra piyasadan kapat.
# İki yönetim: (A) tamamı hedef 1'de; (B) ilk 3 hedefe eşit böl, hedef 1'den sonra stop girişe (Cornix tarzı).
# Maliyet: limit dolum %0,02, market/stop %0,05 + %0,03 kayma; hedef %0,02; stop/zaman %0,08. Fonlama yok. R = net ÷ |giriş − stop|.
# Kıyas: aynı coin, aynı an, aynı geometri, TERS yön (ayna); ve aynı yön ama rastgele saat (yayından önceki/sonraki ±10 gün içinde, aynı mum dizisinden).
import json, os, sys, time, threading, urllib.request, random, math
from concurrent.futures import ThreadPoolExecutor
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'signals'); K = os.path.join(D, 'kl'); os.makedirs(K, exist_ok=True)
B = 'https://www.binance.com'; M15 = 900000
lock = threading.Lock(); used = [0]; last = [0.0]

def get(url):
    for a in range(6):
        with lock:
            w = 0.3 - (time.time() - last[0])
            if w > 0: time.sleep(w)
            if used[0] > 1600: time.sleep(15); used[0] = 0
            last[0] = time.time()
        try:
            r = urllib.request.urlopen(url, timeout=30); used[0] = int(r.headers.get('x-mbx-used-weight-1m') or used[0]); return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code in (400,): return None
            if e.code == 418: raise SystemExit('418')
            time.sleep(2 ** a * (10 if e.code == 429 else 1))
        except Exception:
            time.sleep(2 ** a)
    return None

def kl(sym, t0, spot=False):
    f = os.path.join(K, f"{'S_' if spot else ''}{sym}_{t0}.json")
    if os.path.exists(f): return json.load(open(f))
    out = []; s = t0
    for _ in range(3):
        x = get(f"{B}/{'api/v3' if spot else 'fapi/v1'}/klines?symbol={sym}&interval=15m&startTime={s}&limit=1000")
        if not x: break
        out += [[k[0], float(k[1]), float(k[2]), float(k[3]), float(k[4])] for k in x]
        if len(x) < 1000: break
        s = x[-1][0] + M15
    json.dump(out, open(f, 'w')); return out

def bars_for(c):
    t0 = (c['t'] // M15) * M15 - 10 * 86400000   # 10 gün önceden (rastgele saat kıyası için)
    for sym, sc, spot in [(c['coin'] + 'USDT', 1, False), ('1000' + c['coin'] + 'USDT', 1000, False), (c['coin'] + 'USDT', 1, True)]:
        b = kl(sym, t0, spot)
        if not b: continue
        i = next((k for k, x in enumerate(b) if x[0] >= c['t']), None)
        if i is None: continue
        px = b[i][1] / sc
        if 0.6 < px / c['ref'] < 1.67 or 0.6 < px / c['stop'] < 1.67:
            return [[x[0], x[1] / sc, x[2] / sc, x[3] / sc, x[4] / sc] for x in b], i, sym + (' spot' if spot else '')
    return None, None, None

LIM, MKT, TPF, SLF = 0.0002, 0.0008, 0.0002, 0.0008

def sim(b, i0, c, dr, mode, geo=None, force=None):
    """b: mumlar, i0: yayın sonrası ilk mum. geo: (lo, hi, ref, stop, tps) yön dr için. Dönüş dict ya da None (dolmadı)."""
    lo, hi, ref, stop, tps = geo
    kind = c['kind']; fill = None; fi = None; fee_in = LIM
    p0 = b[i0][1]
    past = (dr > 0 and p0 >= tps[0]) or (dr < 0 and p0 <= tps[0])   # yayında fiyat zaten hedef 1'in ötesinde: iptal kuralı uygulanmaz
    if force: fi, fill, fee_in = force
    elif kind == 'market':
        fill, fi, fee_in = p0 * (1 + dr * 0.0003), i0, MKT
    elif kind == 'stop':
        for j in range(i0, min(len(b), i0 + 288)):
            if (dr > 0 and b[j][2] >= ref) or (dr < 0 and b[j][3] <= ref):
                fill, fi, fee_in = max(ref, b[j][1]) if dr > 0 else min(ref, b[j][1]), j, MKT; break
    else:
        # fiyat zaten giriş bölgesinde ya da daha iyi tarafta (ama stopun berisinde) → açılıştan
        ne = hi if dr > 0 else lo   # bölgenin yakın kenarı: fiyat bölgeye girince dolar ("parça parça gir"in ilk emri)
        if (dr > 0 and stop < p0 <= ne) or (dr < 0 and stop > p0 >= ne): fill, fi, fee_in = p0 * (1 + dr * 0.0003), i0, MKT
        else:
            for j in range(i0, min(len(b), i0 + 288)):
                if (dr > 0 and b[j][3] <= ne * (1 - 0.0005)) or (dr < 0 and b[j][2] >= ne * (1 + 0.0005)):
                    fill, fi = ne, j; break
                # hedef 1 dolum olmadan vurulursa sinyal kaçmış sayılır (Cornix: iptal)
                if not past and ((dr > 0 and b[j][2] >= tps[0]) or (dr < 0 and b[j][3] <= tps[0])): return dict(skip='hedef1 önce')
    if fill is None: return None
    if (dr > 0 and fill <= stop) or (dr < 0 and fill >= stop): return None
    risk = abs(fill - stop) / fill
    parts = [1.0] if mode == 'A' else [1 / min(3, len(tps))] * min(3, len(tps))
    tg = tps[:len(parts)]; st = stop; left = 1.0; pnl = 0.0; hit = 0; end = min(len(b), fi + 14 * 96); why = 'zaman'; mae = 0.0
    for j in range(fi, end):
        o, h, l, cl = b[j][1], b[j][2], b[j][3], b[j][4]
        mae = max(mae, (fill - l) / fill if dr > 0 else (h - fill) / fill)
        if (dr > 0 and l <= st) or (dr < 0 and h >= st):
            px = min(st, o) if (j > fi and dr > 0) else (max(st, o) if (j > fi and dr < 0) else st)
            pnl += left * (dr * (px - fill) / fill - SLF); left = 0; why = 'stop' if hit == 0 else ('başabaş' if hit < len(parts) else why); break
        if j == fi: continue
        while hit < len(tg) and ((dr > 0 and h >= tg[hit]) or (dr < 0 and l <= tg[hit])):
            q = parts[hit]; pnl += q * (dr * (tg[hit] - fill) / fill - TPF); left -= q; hit += 1
            if mode == 'B' and hit == 1: st = fill
        if left <= 1e-9: why = 'hedef'; break
    if left > 1e-9:
        jx = min(end, len(b)) - 1; pnl += left * (dr * (b[jx][4] - fill) / fill - SLF)
    pnl -= fee_in
    return dict(R=pnl / risk, ret=pnl, hit=hit, why=why, risk=risk, mae=mae / risk, fill_lag=(fi - i0) * 0.25, f=(fi, fill, fee_in))

def mirror(c, ref):
    # ters yön: aynı dolum anı ve fiyatı, stop ve hedefler dolumun öbür tarafına aynı uzaklıkta
    f = lambda x: 2 * ref - x
    return (min(f(c['lo']), f(c['hi'])), max(f(c['lo']), f(c['hi'])), ref, f(c['stop']), [f(x) for x in c['tp']])

def one(c):
    try:
        b, i0, sym = bars_for(c)
    except SystemExit: raise
    except Exception as e:
        return dict(c, err=str(e))
    if b is None: return dict(c, err='fiyat yok')
    if i0 + 1 >= len(b): return dict(c, err='veri yok')
    geo = (c['lo'], c['hi'], c['ref'], c['stop'], c['tp']); out = dict(c, sym=sym)
    for mode in 'AB':
        r = sim(b, i0, c, c['dir'], mode, geo); out[mode] = r
        ok = r and 'R' in r
        out[mode + 'm'] = sim(b, i0, c, -c['dir'], mode, mirror(c, r['f'][1]), force=r['f']) if ok else None
        # rastgele saat: aynı geometri yüzdesel olarak, piyasa girişi, yayından ±10 gün içinde rastgele mum (veri sınırı içinde)
        rs = []; rnd = random.Random(c['id'] * 7 + (mode == 'B'))
        for _ in range(3):
            j = rnd.randrange(0, max(1, min(len(b) - 15 * 96, i0 + 10 * 96)))
            if j >= len(b): continue
            p = b[j][1]; sc = p / c['ref']; g = (c['lo'] * sc, c['hi'] * sc, c['ref'] * sc, c['stop'] * sc, [x * sc for x in c['tp']])
            rr = sim(b, j, dict(c, kind='market'), c['dir'], mode, g)
            if rr: rs.append(rr['R'])
        out[mode + 'r'] = sum(rs) / len(rs) if rs else None
        # aynı an, aynı yön, piyasa girişi (kanalın limit avantajı/dezavantajı)
        out[mode + 'k'] = sim(b, i0, dict(c, kind='market'), c['dir'], mode, geo)
    return out

if __name__ == '__main__':
    C = json.load(open(os.path.join(D, '_cagrilar.json')))
    only = sys.argv[1].split(',') if len(sys.argv) > 1 else None
    if only: C = [c for c in C if c['ch'] in only]
    C = [c for c in C if c['t'] < time.time() * 1000 - 15 * 86400000]   # sonucu belli olanlar
    res = []; t0 = time.time()
    with ThreadPoolExecutor(4) as ex:
        for k, r in enumerate(ex.map(one, C)):
            res.append(r)
            if k % 200 == 0: print(k, len(C), f'{time.time() - t0:.0f} sn', flush=True)
    json.dump(res, open(os.path.join(D, '_sonuc.json'), 'w'))
    print('bitti', len(res))
