# Test #32 (10 Ekim 2026): Ozan sıralama modelinin örneklem dışı tahminleriyle stoplu kâğıt short simülasyonu.
# Girdi: tests/data/arch/rank-oos-tam-{4,12}.pkl (tests/rank-model.py --save; 2024-06'dan 6 aylık 5 pencere), 15 dk mumlar, fonlama arşivi.
# Kural: her saat (T = özelliklerin hesaplandığı saat başı) en düşük tahminli coinlerden (alt %5 ya da alt onluk) en çok 2 short.
#   Giriş: T'de açılan 15 dk mumun VWAP'ı (q/v, [low, high] içine sınırlı). Çıkış: T+4 sa / T+12 sa'te açılan mumun VWAP'ı.
#   Stop (15 dk yüksekleriyle, giriş mumundan sonraki mumdan çıkış mumuna kadar): yok / 2 × ATR(1 sa, 14) / %3 / %5; dolum max(stop, mum açılışı).
#   Boyut: bakiyenin 1/10'u (nominal), coin başına tek pozisyon, aynı anda en çok 10 pozisyon (toplam nominal ≤ bakiye); yer yoksa sinyal atlanır.
#   Maliyet: taker %0,05 + kayma %0,03 taraf başına; maker varyantında giriş/zaman çıkışı %0,02, stop çıkışı yine taker + kayma.
#   Fonlama: arşivdeki gerçek ödemeler (giriş-çıkış arası; short pozitif oranda alır).
#   Pompa freni: son 24 sa getirisi > +%20 olan coin shortlanmaz.
# Long bacak yalnız süzgeç: her coin için aynı giriş/çıkışla long (taker), alt onluk vs diğerleri.
# Getiri basit (VWAP→VWAP) + fonlama. Dönemler: tümü, iki yarı (zaman ortası), son 12 ay, 5 pencere.
# Kullanım: python3 tests/test32-ozan-short.py → tests/test32-ozan-short-report.md
import json, os, sys, math, time, numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch'); OUT = os.path.join(HERE, 'test32-ozan-short-report.md'); t0 = time.time()
M15, H = 900000, 3600000
meta = json.load(open(os.path.join(D, 'rank.json'))); SY = meta['syms']
O = {h: pd.read_pickle(os.path.join(D, f'rank-oos-tam-{h}.pkl')).reset_index(drop=True) for h in (4, 12)}  # pencereler birleştirilirken indeks tekrarlanıyor
for h, o in O.items(): o['si'] = o.si.round().astype(int); o['sym'] = [SY[i] for i in o.si.values]
syms = sorted(set(O[4].sym) | set(O[12].sym)); TMIN = int(O[4].t.min()) - 40 * 86400000
print('coin', len(syms), f'{time.time()-t0:.0f} sn', flush=True)

def load15(s):
    a = pd.read_csv(os.path.join(D, '15m', s + '.csv'), header=None, usecols=[0, 1, 2, 3, 4, 5, 7], names=['t', 'o', 'h', 'l', 'c', 'v', 'q'])
    a = a[a.t >= TMIN].drop_duplicates('t').sort_values('t').reset_index(drop=True)
    vw = np.where((a.v > 0) & (a.q > 0), a.q / a.v.where(a.v > 0, 1), a.c); vw = np.where((vw >= a.l * 0.999) & (vw <= a.h * 1.001), vw, a.c)
    a['vw'] = vw; return a
def loadF(s):
    f = os.path.join(D, 'funding', s + '.csv')
    if not os.path.exists(f): return np.array([0]), np.array([0.0])
    F = pd.read_csv(f, header=None, names=['t', 'r']).drop_duplicates('t').sort_values('t'); F = F[F.t >= TMIN - 86400000]
    return F.t.values, np.concatenate([[0.0], np.cumsum(F.r.values)])
def fsum(F, a, b):  # (a, b] arasındaki fonlama toplamı
    ft, cf = F; return cf[np.searchsorted(ft, b, 'right')] - cf[np.searchsorted(ft, a, 'right')]

# Her satır için giriş/çıkış fiyatı, fonlama; alt onluk short adayları için yüksek yolu, ATR, 24 sa getiri
HZ = {4: 16, 12: 48}
for h, o in O.items():
    n = o.groupby('th').p.transform('size'); rk = o.groupby('th').p.rank(method='first'); o['pct'] = rk / n; o['rk'] = rk; o['dec'] = np.floor((rk - 1) / n * 10).clip(0, 9)
PATH = {}
for k, s in enumerate(syms):
    a = load15(s); F = loadF(s); tt = a.t.values; idx = {t: i for i, t in enumerate(tt)}
    hh = a.h.values; oo = a.o.values; vw = a.vw.values; cc = a.c.values
    # 1 sa ATR(14) T'de: kapanmış 1 sa mumlardan
    a1 = a.assign(g=a.t // H).groupby('g').agg(h=('h', 'max'), l=('l', 'min'), c=('c', 'last'), n=('t', 'size')); pc = a1.c.shift(1)
    tr = np.maximum(a1.h - a1.l, np.maximum((a1.h - pc).abs(), (a1.l - pc).abs())); atr = tr.rolling(14, min_periods=10).mean(); atr.index = (atr.index + 1) * H  # T'de bilinen
    for h, o in O.items():
        m = (o.sym == s).values; T = o.t.values[m].astype(np.int64); nb = HZ[h]
        i0 = np.array([idx.get(t, -1) for t in T]); ok = (i0 >= 1) & (i0 + nb < len(tt))
        i0c = np.where(ok, i0, 0); ok &= tt[np.minimum(i0c + nb, len(tt) - 1)] == T + nb * M15
        e = np.where(ok, vw[i0c], np.nan); x = np.where(ok, vw[np.minimum(i0c + nb, len(tt) - 1)], np.nan)
        fu = fsum(F, T + 60000, T + h * H + 60000)
        o.loc[m, 'e'] = e; o.loc[m, 'x'] = x; o.loc[m, 'fund'] = fu
        # 24 sa getiri: T'de biten mumun kapanışı / 24 sa önce
        j24 = np.array([idx.get(t - 96 * M15, -1) for t in T]); r24 = np.where(ok & (j24 >= 1), cc[np.maximum(i0c - 1, 0)] / cc[np.maximum(j24 - 1, 0)] - 1, np.nan)
        o.loc[m, 'r24'] = r24; o.loc[m, 'atr'] = atr.reindex(T).values
        # short adayları: alt onluk; yol = giriş mumundan sonraki mumlardan çıkış mumuna kadar (dahil) yüksek ve açılış
        cand = m & (o.dec.values == 0); ci = np.where(cand)[0]
        for r in ci:
            i = idx.get(int(o.t.values[r]), -1)
            if i < 1 or i + nb >= len(tt) or tt[i + nb] != o.t.values[r] + nb * M15: continue
            PATH[(h, r)] = (hh[i + 1:i + nb + 1], oo[i + 1:i + nb + 1], tt[i + 1:i + nb + 1])
    if k % 20 == 0: print(k, s, f'{time.time()-t0:.0f} sn', flush=True)
for h, o in O.items():
    chk = o.dropna(subset=['e', 'x']); d = np.log(chk.x / chk.e) - chk.ret; print(h, 'sa doğrulama: |log(x/e) − ret| < 1e-4 payı', round(float((d.abs() < 1e-4).mean()), 4), 'eksik', int(o.e.isna().sum()), flush=True)

# Simülasyon
def sim(h, sel, stop, cost, pump):
    o = O[h]; cE = 0.0008 if cost == 'taker' else 0.0002; cX = cE; cS = 0.0008
    lim = 0.05 if sel == 'alt %5' else 0.10
    c = o[(o.pct <= lim + 1e-9) & (o.rk <= 2) & o.e.notna()]
    if pump: c = c[~(c.r24 > 0.20)]
    c = c.sort_values(['t', 'rk']); bal = 1.0; open_ = []; trades = []; peak = 1.0; dd = 0.0
    Fcache = {}
    for t, g in c.groupby('t', sort=True):
        # kapanan pozisyonlar (kapanış zamanı ≤ t)
        still = []
        for p in sorted(open_, key=lambda p: p['ct']):
            if p['ct'] <= t:
                g_ = p['r'] * p['not'] / bal; bal += p['r'] * p['not']; peak = max(peak, bal); dd = max(dd, 1 - bal / peak); p['g'] = g_; trades.append(p)
            else: still.append(p)
        open_ = still; held = {p['sym'] for p in open_}
        for r, row in zip(g.index, g.itertuples()):
            if len(open_) >= 10 or row.sym in held: continue
            if (h, r) not in PATH: continue
            hh, oo, tt = PATH[(h, r)]; e = row.e; ct = int(row.t) + h * H; xr = None; fund = row.fund; how = 'süre'
            lvl = None if stop == 'yok' else (2 * row.atr / e if stop == '2×ATR' else (0.03 if stop == '%3' else 0.05))
            if lvl is not None and np.isfinite(lvl):
                hit = np.nonzero(hh >= e * (1 + lvl))[0]
                if len(hit):
                    k = hit[0]; px = max(e * (1 + lvl), oo[k]); ct = int(tt[k]) + M15; xr = 1 - px / e
                    if row.sym not in Fcache: Fcache[row.sym] = loadF(row.sym)
                    fund = fsum(Fcache[row.sym], int(row.t) + 60000, int(tt[k]) + M15); how = 'stop'
            if xr is None: xr = 1 - row.x / e; rr = xr + fund - cE - cX
            else: rr = xr + fund - cE - cS
            p = {'t': int(row.t), 'ct': ct, 'sym': row.sym, 'r': rr, 'not': bal / 10, 'how': how}; open_.append(p); held.add(row.sym)
    for p in sorted(open_, key=lambda p: p['ct']):
        g_ = p['r'] * p['not'] / bal; bal += p['r'] * p['not']; peak = max(peak, bal); dd = max(dd, 1 - bal / peak); p['g'] = g_; trades.append(p)
    return pd.DataFrame(trades)

T_ALL = O[4].t; TMID = np.sort(T_ALL.values)[len(T_ALL) // 2]; T12 = T_ALL.max() - 365 * 86400000
WIN = [pd.Timestamp(m + '-01').value // 10**6 for m in ('2024-06', '2024-12', '2025-06', '2025-12', '2026-06')] + [int(T_ALL.max()) + 1]
fx = lambda v, d=2: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
def comp(tr):  # kapanış sırasıyla bileşik getiri ve düşüş (kapanan işlemlerle)
    if len(tr) == 0: return np.nan, np.nan
    g = tr.sort_values('ct').g.values; eq = np.cumprod(1 + g); pk = np.maximum.accumulate(np.concatenate([[1], eq]))[1:]
    return (eq[-1] - 1) * 100, (1 - eq / pk).max() * 100
def stats(tr):
    if len(tr) == 0: return dict(n=0)
    R, DD = comp(tr); return dict(n=len(tr), m=tr.r.mean() * 100, w=(tr.r > 0).mean() * 100, worst=tr.r.min() * 100, R=R, DD=DD, st=(tr.how == 'stop').mean() * 100)
res = {}; L = [f'# Test #32 · Ozan sinyaliyle stoplu kâğıt short · {time.strftime("%Y-%m-%d")}', '',
               f'Örneklem dışı tahminler (tests/rank-model.py, 5 pencere, 2024-06 → 2026-10, {O[4].th.nunique():,} saat, saat başına ~30 coin). '
               'Her saat en düşük tahminli coinlerden (alt %5 = saatteki sırası ≤ %5, pratikte 1 coin; alt onluk = en düşük 3 içinden en çok 2) short; giriş T saat başında açılan 15 dk mumun VWAP\'ı, çıkış 4/12 sa sonraki mumun VWAP\'ı. '
               'Boyut bakiyenin 1/10\'u, coin başına tek pozisyon, en çok 10 pozisyon (yer yoksa sinyal atlanır). Stop 15 dk yüksekleriyle (giriş mumundan sonra), dolum max(stop, mum açılışı). '
               'Maliyet: taker = %0,05 + %0,03 kayma taraf başına (gidiş-dönüş %0,16); maker = %0,02 taraf başına, stop çıkışı taker + kayma. Fonlama gerçek ödemelerden. Getiri basit. '
               'Bileşik getiri ve düşüş kapanan işlemlerle (açık pozisyonun ara zararı düşüşe girmez).', '']
for h in (4, 12):
    for sel in ('alt %5', 'alt onluk'):
        for stop in ('yok', '2×ATR', '%3', '%5'):
            for cost in ('taker', 'maker'):
                for pump in (False, True):
                    tr = sim(h, sel, stop, cost, pump); res[(h, sel, stop, cost, pump)] = tr
    print('sim', h, f'{time.time()-t0:.0f} sn', flush=True)

def row(key, tr):
    a = stats(tr); h1 = tr[tr.t < TMID]; h2 = tr[tr.t >= TMID]; l12 = tr[tr.t >= T12]
    return a, [stats(x) for x in (h1, h2, l12)], [stats(tr[(tr.t >= WIN[i]) & (tr.t < WIN[i + 1])]) for i in range(5)]
L += ['## Özet (işlem başı %, kazanma %, en kötü %, bileşik %, düşüş %)', '',
      '| Ufuk | Seçim | Stop | Maliyet | Pompa freni | n | İşlem başı | Kazanma | Stop payı | En kötü | Bileşik | Düşüş | 1. yarı | 2. yarı | Son 12 ay |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
WINL = []
for key, tr in res.items():
    h, sel, stop, cost, pump = key; a, (s1, s2, s3), ws = row(key, tr)
    if a['n'] == 0: continue
    L.append(f"| {h} sa | {sel} | {stop} | {cost} | {'var' if pump else 'yok'} | {a['n']:,} | {fx(a['m'], 3)} | {a['w']:.0f} | {a['st']:.0f} | {fx(a['worst'], 1)} | {fx(a['R'], 0)} | {a['DD']:.0f} | {fx(s1.get('m', np.nan), 3)} | {fx(s2.get('m', np.nan), 3)} | {fx(s3.get('m', np.nan), 3)} |")
    WINL.append(f"| {h} sa | {sel} | {stop} | {cost} | {'var' if pump else 'yok'} | " + ' | '.join(f"{fx(w.get('m', np.nan), 3)} / {fx(w.get('R', np.nan), 0)}" for w in ws) + ' |')
L += ['', '## Pencere pencere (işlem başı % / pencere içi bileşik %)', '', '| Ufuk | Seçim | Stop | Maliyet | Pompa freni | 2024-06 | 2024-12 | 2025-06 | 2025-12 | 2026-06 |', '|---|---|---|---|---|---|---|---|---|---|'] + WINL
# son 12 ayın bileşik getirisi ve düşüşü (en iyi birkaç ayar)
L += ['', '## Son 12 ay ve yarılar: bileşik % / düşüş %', '', '| Ufuk | Seçim | Stop | Maliyet | Pompa freni | 1. yarı | 2. yarı | Son 12 ay |', '|---|---|---|---|---|---|---|---|']
for key, tr in res.items():
    h, sel, stop, cost, pump = key
    if len(tr) == 0: continue
    parts = [comp(x) for x in (tr[tr.t < TMID], tr[tr.t >= TMID], tr[tr.t >= T12])]
    L.append(f"| {h} sa | {sel} | {stop} | {cost} | {'var' if pump else 'yok'} | " + ' | '.join(f'{fx(r_, 0)} / {d_:.0f}' if np.isfinite(r_) else '—' for r_, d_ in parts) + ' |')

# Long süzgeç: aynı giriş/çıkışla long, taker; onluklar
L += ['', '## Long bacak süzgeç olarak: onluklara göre long getirisi (taker sonrası, %, fonlama dahil)', '',
      'Her coin her saat aynı giriş/çıkışla long (stop yok). "Fark" = alt onluk − diğer dokuz onluğun ortalaması: masanın bir long sinyali alt onluktaki coine düşerse beklenen ek kayıp.', '',
      '| Ufuk | Dönem | Alt onluk | 2. onluk | Orta (3–8) | Üst onluk | Tüm coinler | Fark (alt − diğerleri) | Alt onlukta kazanma % |', '|---|---|---|---|---|---|---|---|---|']
for h, o in O.items():
    d = o.dropna(subset=['e', 'x']).copy(); d['lr'] = (d.x / d.e - 1 - d.fund - 0.0016) * 100
    for pn, s in [('tümü', d), ('1. yarı', d[d.t < TMID]), ('2. yarı', d[d.t >= TMID]), ('son 12 ay', d[d.t >= T12])] + [(pd.Timestamp(WIN[i], unit='ms').strftime('%Y-%m') + ' penceresi', d[(d.t >= WIN[i]) & (d.t < WIN[i + 1])]) for i in range(5)]:
        b = s[s.dec == 0].lr; L.append(f"| {h} sa | {pn} | {fx(b.mean(), 3)} | {fx(s[s.dec == 1].lr.mean(), 3)} | {fx(s[(s.dec >= 2) & (s.dec <= 7)].lr.mean(), 3)} | {fx(s[s.dec == 9].lr.mean(), 3)} | {fx(s.lr.mean(), 3)} | {fx(b.mean() - s[s.dec > 0].lr.mean(), 3)} | {(b > 0).mean()*100:.0f} |")
# Short getirisi onluklara göre (stopsuz, taker): sinyalin kendisi
L += ['', '## Short getirisi onluklara göre (stopsuz, taker sonrası, fonlama dahil, %)', '', '| Ufuk | Dönem | Alt onluk | Tüm coinler | Alt %5 (sıra 1) | Alt onluk − tüm |', '|---|---|---|---|---|---|']
for h, o in O.items():
    d = o.dropna(subset=['e', 'x']).copy(); d['sr'] = (1 - d.x / d.e + d.fund - 0.0016) * 100
    for pn, s in [('tümü', d), ('1. yarı', d[d.t < TMID]), ('2. yarı', d[d.t >= TMID]), ('son 12 ay', d[d.t >= T12])]:
        L.append(f"| {h} sa | {pn} | {fx(s[s.dec == 0].sr.mean(), 3)} | {fx(s.sr.mean(), 3)} | {fx(s[s.rk == 1].sr.mean(), 3)} | {fx(s[s.dec == 0].sr.mean() - s.sr.mean(), 3)} |")
open(OUT, 'w').write('\n'.join(L) + '\n'); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
