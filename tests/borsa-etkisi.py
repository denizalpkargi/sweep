# Diğer borsaların verisi Ozan'a bilgi ekliyor mu? — 14 Ekim 2026 (veri: tests/fetch-borsalar.py)
# Değişkenler (karar anı T = saat başı; yalnız T'den önce kapanmış / yayımlanmış veri, Bybit serileri 1 saat gecikmeli alınır):
#   cbp     Coinbase primi: Coinbase USD spot kapanışı ÷ Binance vadeli kapanışı − 1 (T'de biten saat)
#   cbp24   24 saatlik ortalama prim; cbpd = cbp − cbp24 (primin son değişimi)
#   fspread Bybit son fonlama − Binance son fonlama
#   oi24d   Bybit OI 24 sa log değişimi − Binance OI 24 sa log değişimi;  boi24 = yalnız Bybit OI 24 sa değişimi
#   lsd     Bybit hesap long payı − Binance hesap long payı (metrics count_long_short_ratio → r / (1 + r));  bls24 = Bybit long payının 24 sa değişimi
# Ölçü: Ozan'ın örneklem dışı satırlarında (rank-oos-tam-{4,12}.pkl; ayın ilk 30'u, saatlik, 2024-06 → 2026-10) saat içi IC (hedef yc),
# ve Ozan'dan arındırılmış IC (her saatte değişkenin yüzdelik sırası Ozan'ın sırasına regres edilir, kalıntının IC'si). İki yarı + son 12 ay.
# Kullanım: python tests/borsa-etkisi.py <arşiv klasörü (1h, metrics, funding, rank.json, rank-oos-tam-*.pkl)>
import sys, os, json, math, numpy as np, pandas as pd
A = sys.argv[1]; HERE = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(HERE, 'data', 'borsa'); H = 3600000
S = json.load(open(os.path.join(A, 'rank.json'), encoding='utf-8'))['syms']
f = lambda v, d=3: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ',')

def rd(p, names):
    if not os.path.exists(p) or os.path.getsize(p) == 0: return None
    d = pd.read_csv(p, header=None, names=names, usecols=range(len(names))); return d.drop_duplicates('t').sort_values('t').reset_index(drop=True)
def asof(T, d, col, lag=0):   # T anındaki son değer (zamanı ≤ T − lag)
    if d is None or not len(d): return np.full(len(T), np.nan)
    i = np.searchsorted(d.t.values, T - lag, side='right') - 1; v = d[col].values.astype(float)[np.clip(i, 0, None)]; v[i < 0] = np.nan; return v

O4 = pd.read_pickle(os.path.join(A, 'rank-oos-tam-4.pkl')); O12 = pd.read_pickle(os.path.join(A, 'rank-oos-tam-12.pkl'))
for O in (O4, O12): O['sym'] = [S[int(i)] for i in O.si]; O['T'] = O.t.astype(np.int64)
M = O4[['T', 'sym', 'p', 'yc']].merge(O12[['T', 'sym', 'p', 'yc']], on=['T', 'sym'], suffixes=('4', '12'))
feats = {k: np.full(len(M), np.nan) for k in ('cbp', 'cbp24', 'cbpd', 'fspread', 'oi24d', 'boi24', 'lsd', 'bls24')}
cov = {}
for s, idx in M.groupby('sym').indices.items():
    T = M['T'].values[idx]
    bn = rd(os.path.join(A, '1h', s + '.csv'), ['t', 'o', 'h', 'l', 'c'])
    cb = rd(os.path.join(B, 'coinbase', s + '.csv'), ['t', 'c', 'v'])
    if bn is not None and cb is not None:
        m = bn[['t', 'c']].merge(cb[['t', 'c']], on='t', suffixes=('b', 'k')); m['pr'] = m.ck / m.cb - 1
        m['pr24'] = m.pr.rolling(24, min_periods=12).mean(); m['t'] = m.t + H        # açılış t → kapanış t + 1 sa
        feats['cbp'][idx] = asof(T, m, 'pr'); feats['cbp24'][idx] = asof(T, m, 'pr24'); cov['coinbase'] = cov.get('coinbase', 0) + 1
    bfr = rd(os.path.join(B, 'bybit-fr', s + '.csv'), ['t', 'r']); nfr = rd(os.path.join(A, 'funding', s + '.csv'), ['t', 'r'])
    if bfr is not None and nfr is not None: feats['fspread'][idx] = asof(T, bfr, 'r') - asof(T, nfr, 'r')
    boi = rd(os.path.join(B, 'bybit-oi', s + '.csv'), ['t', 'oi']); mt = rd(os.path.join(A, 'metrics', s + '.csv'), ['t', 'oi', 'oiv', 'tc', 'ts', 'gl'])
    if boi is not None:
        a = asof(T, boi, 'oi', H); b = asof(T, boi, 'oi', 25 * H); feats['boi24'][idx] = np.log(a / b)
        if mt is not None:
            c = asof(T, mt, 'oi', 300000); d_ = asof(T, mt, 'oi', 24 * H + 300000); feats['oi24d'][idx] = np.log(a / b) - np.log(c / d_)
        cov['bybit'] = cov.get('bybit', 0) + 1
    bls = rd(os.path.join(B, 'bybit-ls', s + '.csv'), ['t', 'r'])
    if bls is not None:
        x = asof(T, bls, 'r', H); feats['bls24'][idx] = x - asof(T, bls, 'r', 25 * H)
        if mt is not None:
            g = asof(T, mt, 'gl', 300000); feats['lsd'][idx] = x - g / (1 + g)
feats['cbpd'] = feats['cbp'] - feats['cbp24']
for k, v in feats.items(): M[k] = v
M['dt'] = pd.to_datetime(M['T'], unit='ms'); mid = M.dt.min() + (M.dt.max() - M.dt.min()) / 2
P = {'tümü': M.dt == M.dt, '1. yarı': M.dt < mid, '2. yarı': M.dt >= mid, 'son 12 ay': M.dt >= M.dt.max() - pd.Timedelta(days=365)}

def ic(d, x, y, minn=10):   # saat içi Spearman, bincount ile (uye-birlesim.py ile aynı)
    d = d[['T', x, y]].dropna()
    if len(d) < 1000: return np.nan, np.nan
    codes, _ = pd.factorize(d['T'].values); n = np.bincount(codes)
    rp = d.groupby('T')[x].rank().values; ry = d.groupby('T')[y].rank().values
    sx, sy = np.bincount(codes, rp), np.bincount(codes, ry); sxx, syy, sxy = np.bincount(codes, rp * rp), np.bincount(codes, ry * ry), np.bincount(codes, rp * ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx * sy / n) / np.sqrt((sxx - sx * sx / n) * (syy - sy * sy / n))
    r = r[(n >= minn) & np.isfinite(r)]; return r.mean(), r.mean() / r.std() * math.sqrt(len(r))
def resid(d, x, pc):
    d = d[['T', x, pc]].dropna().copy(); d['rx'] = d.groupby('T')[x].rank(pct=True); d['rp'] = d.groupby('T')[pc].rank(pct=True)
    g = d.groupby('T'); mx, mp = g.rx.transform('mean'), g.rp.transform('mean')
    cxp = ((d.rx - mx) * (d.rp - mp)).groupby(d['T']).transform('sum'); vp = ((d.rp - mp) ** 2).groupby(d['T']).transform('sum')
    return (d.rx - mx) - cxp / vp.replace(0, np.nan) * (d.rp - mp)

L = [f'# Diğer borsaların verisi ve Ozan ({pd.Timestamp.now():%Y-%m-%d})', '',
     f'Ozan\'ın örneklem dışı satırları (ayın ilk 30 coini, saatlik, {M.dt.min():%Y-%m-%d} → {M.dt.max():%Y-%m-%d}, {len(M):,} satır). Coinbase\'te olan coin: {cov.get("coinbase", 0)}, Bybit\'te olan: {cov.get("bybit", 0)}. '
     'IC: saat içi Spearman, değişken ile Ozan\'ın hedefi (VWAP → VWAP, oynaklığa bölünmüş); en az 10 coinli saatler. "Ozan\'dan arındırılmış": değişkenin saat içi sırasının Ozan sırasına göre kalıntısı. '
     'Kapsam = değişkenin dolu olduğu satır payı. Değişkenler betiğin başında tanımlı; Bybit serileri 1 saat, Binance metrics 5 dk gecikmeli alınır (yayın gecikmesi).', '']
for hh in (4, 12):
    L += [f'## {hh} saat', '', '| değişken | kapsam | IC tümü (t) | 1. yarı | 2. yarı | son 12 ay | Ozan\'dan arındırılmış IC tümü (t) | 1. yarı | 2. yarı | son 12 ay |', '|---|---|---|---|---|---|---|---|---|---|']
    for k in feats:
        M['res'] = resid(M, k, f'p{hh}')
        a = [ic(M[m], k, f'yc{hh}') for m in P.values()]; r = [ic(M[m], 'res', f'yc{hh}') for m in P.values()]
        L.append(f'| {k} | %{M[k].notna().mean() * 100:.0f} | {f(a[0][0])} ({f(a[0][1], 1)}) | {f(a[1][0])} | {f(a[2][0])} | {f(a[3][0])} | {f(r[0][0])} ({f(r[0][1], 1)}) | {f(r[1][0])} | {f(r[2][0])} | {f(r[3][0])} |')
    L.append('')
# --- birleşim: Ozan + w1 × (ters lsd) + w2 × cbpd (saat içi yüzdelik sıralar; değişken yoksa 0,5), ağırlıklar ilk yarıda seçilir
for c in ('ret', 'fr'):
    M[c + '4'] = O4.set_index(['T', 'sym'])[c].reindex(pd.MultiIndex.from_arrays([M['T'], M.sym])).values
    M[c + '12'] = O12.set_index(['T', 'sym'])[c].reindex(pd.MultiIndex.from_arrays([M['T'], M.sym])).values
M['r_l'] = 1 - M.groupby('T').lsd.rank(pct=True).fillna(0.5); M['r_c'] = M.groupby('T').cbpd.rank(pct=True).fillna(0.5)
def trade(o, col, hh, cost=0.16):
    s = o.dropna(subset=['ret' + str(hh)]); fd = np.nan_to_num(s['fr' + str(hh)].values) / 1e4 * hh / 8; r = s['ret' + str(hh)].values
    l = np.expm1(r) - fd; sh = -np.expm1(r) + fd; rk = s.groupby('T')[col].rank(method='first').values; n = s.groupby('T')[col].transform('size').values
    lg = pd.Series(l[rk > n - 2]).groupby(s['T'].values[rk > n - 2]).mean() * 100; ss = pd.Series(sh[rk <= 2]).groupby(s['T'].values[rk <= 2]).mean() * 100
    return (lg.mean() + ss.mean()) / 2 - cost
def dec0(o, col, hh):
    d = np.floor(o.groupby('T')[col].rank(pct=True, method='first') * 10 - 1e-9).clip(0, 9); return o['yc' + str(hh)][d == 0].mean()
for hh in (4, 12):
    M['rp'] = M.groupby('T')[f'p{hh}'].rank(pct=True); g1 = M[P['1. yarı']]; best = (0, 0, -9)
    for w1 in np.arange(0, 1.01, 0.1):
        for w2 in np.arange(0, 1.01, 0.1):
            v = ic(g1.assign(b=g1.rp + w1 * g1.r_l + w2 * g1.r_c), 'b', f'yc{hh}')[0]
            if v > best[2]: best = (round(w1, 1), round(w2, 1), v)
    M['b'] = M.rp + best[0] * M.r_l + best[1] * M.r_c; M['b1'] = M.rp + 0.3 * M.r_l + 0.3 * M.r_c
    L += [f'## Birleşim {hh} saat: Ozan + w1 × (Bybit−Binance kalabalık farkının tersi) + w2 × (Coinbase primi değişimi)', '',
          f'İlk yarıda seçilen w1 {best[0]}, w2 {best[1]}; ayrıca seçimsiz w1 = w2 = 0,3. Alt onluk = en düşük sıralı %10\'un ortalama hedefi (eksi = kötü coini iyi buluyor). 2+2 işlem taker + fonlama sonrası %.', '',
          '| dönem | Ozan IC | seçili IC | 0,3/0,3 IC | Ozan alt onluk | seçili alt onluk | Ozan 2+2 % | seçili 2+2 % |', '|---|---|---|---|---|---|---|---|']
    for nm, m in P.items():
        g = M[m]
        L.append(f'| {nm} | {f(ic(g, "rp", f"yc{hh}")[0])} | {f(ic(g, "b", f"yc{hh}")[0])} | {f(ic(g, "b1", f"yc{hh}")[0])} | {f(dec0(g, "rp", hh))} | {f(dec0(g, "b", hh))} | {f(trade(g, "rp", hh))} | {f(trade(g, "b", hh))} |')
    L.append('')
L += ['Okuma: aday = arındırılmış IC iki yarıda ve son 12 ayda aynı işaretli ve |t| ≥ 2. Ozan\'ın kendi IC\'si bu satırlarda 4 sa ≈ +0,058, 12 sa ≈ +0,068 (uye-birlesim-report.md); '
      'tek değişkenden beklenen katkı +0,005 civarıdır.']
open(os.path.join(HERE, 'borsa-etkisi-report.md'), 'w', encoding='utf-8').write('\n'.join(L))
sys.stdout.reconfigure(errors='replace'); print('\n'.join(L))
