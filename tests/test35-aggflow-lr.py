# Test #35 yeniden koşu (10 Ekim 2026): büyük işlem akışı (aggTrades) lambdarank'e katkı veriyor mu? Akış arşivi artık 2023-06'dan, her ay ilk 20 coin.
# Önceki koşu (tests/denklem4-aggflow-lr.py) 2025-01'den ve 3 aylık pencerelerdeydi: 4 sa IC 0,045 → 0,050, 12 sa +0,001.
# Burada: Ozan ile aynı ileriye yürüyen bölünmeler (test 2024-06'dan 6 aylık 5 pencere, eğitim öncesi tüm veri, boşluk 2 gün), aynı lambdarank ayarları.
# Satırlar yalnız akış verisi olan coin-saatler (ayın ilk 20'si); aynı satırlarda (a) denklem4 değişkenleri, (b) + akış, (c) yalnız akış,
# (d) Ozan'ın 64 canlı değişkeni (tests/data/arch/rank-*.f32), (e) Ozan + akış. IC: saat içi Spearman, oynaklığa bölünmüş VWAP getirisi (kırpılmış ±5).
# Akış değişkenleri tests/denklem4-aggflow-lr.py ile aynı (t saatinin akışı t+1 saat başında bilinir).
# Kullanım: python3 tests/test35-aggflow-lr.py [--maxtrain 300000] [--jobs 2] → tests/test35-aggflow-lr-report.md
import json, os, sys, glob, math, time, numpy as np, pandas as pd, lightgbm as lgb
np.random.seed(1); HERE = os.path.dirname(os.path.abspath(__file__)); A = os.path.join(HERE, 'data', 'arch'); OUT = os.path.join(HERE, 'test35-aggflow-lr-report.md'); t0 = time.time()
arg = lambda k, d: sys.argv[sys.argv.index('--' + k) + 1] if '--' + k in sys.argv else d
MAXTR = int(arg('maxtrain', 300000)); JOBS = int(arg('jobs', 2)); GAP = 2
# --- akış değişkenleri
AF = []
for f in sorted(glob.glob(f'{A}/aggflow/*.csv')):
    s = os.path.basename(f)[:-4]; a = pd.read_csv(f, header=None, names=['t', 'n', 'q', 'qb', 'q1k', 'qb1k', 'q10k', 'qb10k', 'q100k', 'qb100k', 'mx', 'n100k']).drop_duplicates('t').set_index('t').sort_index()
    if len(a) < 24 * 20: continue
    a = a.reindex(np.arange(a.index.min(), a.index.max() + 1, 3600000)); q = a.q; sm = q - a.q10k; smb = a.qb - a.qb10k; d = pd.DataFrame(index=a.index)
    for w in [4, 24, 72]:
        R = lambda x: x.rolling(w, min_periods=w // 2).sum()
        d[f'af_imb10k{w}'] = R(2 * a.qb10k - a.q10k) / R(a.q10k); d[f'af_imbSm{w}'] = R(2 * smb - sm) / R(sm); d[f'af_bms{w}'] = d[f'af_imb10k{w}'] - d[f'af_imbSm{w}']; d[f'af_imb100k{w}'] = R(2 * a.qb100k - a.q100k) / R(a.q100k)
    d['af_sh10k'] = a.q10k.rolling(24, min_periods=12).sum() / q.rolling(24, min_periods=12).sum(); d['af_sh10kZ'] = d.af_sh10k - d.af_sh10k.rolling(720, min_periods=240).mean()
    d['af_szZ'] = np.log(q / a.n).rolling(24, min_periods=12).mean() - np.log(q / a.n).rolling(720, min_periods=240).mean()
    d.index = d.index + 3600000; d = d[a.q.notna().values]  # yalnız akış verisi olan saatler
    d['symn'] = s; AF.append(d.reset_index().rename(columns={'index': 't'}).astype({c: np.float32 for c in d.columns if c.startswith('af_')}))
AF = pd.concat(AF, ignore_index=True); AF = AF.dropna(subset=['af_imb10k4']); FA = [c for c in AF.columns if c.startswith('af_')]
print('akış satırı', len(AF), 'coin', AF.symn.nunique(), f'{time.time()-t0:.0f} sn', flush=True)
fx = lambda v, d=3: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ',')
def fast_ic(o, pcol, ycol, key='th', minn=8):
    x = o[[key, pcol, ycol]].dropna()
    if len(x) < 50: return np.nan
    codes, _ = pd.factorize(x[key].values); n = np.bincount(codes); rp = x.groupby(key)[pcol].rank().values; ry = x.groupby(key)[ycol].rank().values
    sx = np.bincount(codes, rp); sy = np.bincount(codes, ry); sxx = np.bincount(codes, rp * rp); syy = np.bincount(codes, ry * ry); sxy = np.bincount(codes, rp * ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx * sy / n) / np.sqrt((sxx - sx * sx / n) * (syy - sy * sy / n))
    r = r[(n >= minn) & np.isfinite(r)]; return r.mean()
def prep(df, ycols):
    df = df[df.groupby('th').t.transform('count') >= 10].reset_index(drop=True)
    for c in FA: df['x_' + c] = df.groupby('th')[c].rank(pct=True).astype(np.float32)
    for yc in ycols:
        df[yc + 'c'] = df[yc].clip(-5, 5); df[yc + 'r'] = np.floor(df.groupby('th')[yc + 'c'].rank(pct=True, method='first').values * 10 - 1e-9).clip(0, 9)
    df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m'); return df
FA2 = FA + ['x_' + c for c in FA]
# --- denklem4 satırları (yalnız akış coinleri)
meta = json.load(open(f'{A}/denklem4.json')); COLS = meta['cols']; SY = meta['syms']; afs = set(AF.symn)
X = np.memmap(f'{A}/denklem4.f32', dtype=np.float32, mode='r').reshape(-1, len(COLS)); keep = np.isin(X[:, 0].astype(int), [i for i, s in enumerate(SY) if s in afs])
D4 = pd.DataFrame(np.asarray(X[keep]), columns=COLS); del X
D4['t'] = D4.th.astype(np.int64) * 3600000 + meta['t0']; D4 = D4[np.isfinite(D4.y4v)]; D4['symn'] = [SY[int(i)] for i in D4.sym.values]
D4 = prep(D4.merge(AF, on=['symn', 't'], how='inner'), ['y4v', 'y12v'])
DROP = {'sym', 'th', 'y1', 'y4', 'y24', 'y1v', 'y4v', 'y12v', 'y24v', 'sd15', 't', 'symn', 'month'}; F4 = [c for c in COLS if c not in DROP]
print('denklem4 satır', len(D4), 'saat', D4.th.nunique(), D4.month.min(), '→', D4.month.max(), f'{time.time()-t0:.0f} sn', flush=True)
# --- Ozan satırları
rm = json.load(open(f'{A}/rank.json')); RC = rm['cols']; RS = rm['syms']
X = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(RC)) for f in sorted(glob.glob(f'{A}/rank-*.f32'))]); OZ = pd.DataFrame(X, columns=RC); del X
OZ = OZ[np.isfinite(OZ.y4v)].copy(); OZ['th'] = OZ.th.round().astype(np.int64); OZ['t'] = OZ.th * 3600000 + rm['t0']; OZ['symn'] = [RS[int(round(i))] for i in OZ.si.values]
for k in rm['xs']: OZ['x_' + k] = OZ.groupby('th')[k].rank(pct=True).astype(np.float32)  # dilim Ozan'ın 30 coinlik evreninde (canlıdaki gibi)
OZ = prep(OZ.merge(AF, on=['symn', 't'], how='inner'), ['y4v', 'y12v']); FO = rm['feats'] + ['x_' + k for k in rm['xs']]
print('Ozan satır', len(OZ), 'saat', OZ.th.nunique(), f'{time.time()-t0:.0f} sn', flush=True)
VARS = [('denklem4', D4, F4), ('denklem4 + akış', D4, F4 + FA2), ('yalnız akış', D4, FA2), ('Ozan', OZ, FO), ('Ozan + akış', OZ, FO + FA2)]
HZ = ['y4v', 'y12v']; HN = {'y4v': '4 sa', 'y12v': '12 sa'}
starts = ['2024-06', '2024-12', '2025-06', '2025-12', '2026-06']; oos = {}
CK = os.path.join(A, 'test35-cache.pkl'); CACHE = pd.read_pickle(CK) if os.path.exists(CK) else {}  # yarıda kalan koşu kaldığı yerden devam eder
for wi, m0 in enumerate(starts):
    for name, df, feats in VARS:
        months = sorted(df.month.unique()); test_m = [m for m in months if m >= m0][:6]; tmin = df[df.month == m0].t.min()
        tr_idx = df.index[df.t < tmin - GAP * 864e5].values; te = df[df.month.isin(test_m)]
        if len(tr_idx) > MAXTR: tr_idx = np.sort(np.random.choice(tr_idx, MAXTR, replace=False))
        tr0 = df.loc[tr_idx]
        for yc in HZ:
            ck = (name, yc, m0)
            if ck in CACHE: o = CACHE[ck]; oos.setdefault((name, yc), []).append(o); oos.setdefault(('imp', name, yc), []).append(CACHE[('imp',) + ck]) if '+ akış' in name else None; continue
            tr = tr0[np.isfinite(tr0[yc + 'r'].values)].sort_values('th'); grp = tr.groupby('th', sort=False).size().values
            m = lgb.LGBMRanker(objective='lambdarank', n_estimators=200, learning_rate=0.03, num_leaves=31, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10,
                               label_gain=list(range(10)), lambdarank_truncation_level=30, verbose=-1, n_jobs=JOBS).fit(tr[feats], tr[yc + 'r'].astype(int), group=grp)
            o = pd.DataFrame({'t': te.t.values, 'th': te.th.values, 'p': m.predict(te[feats]), 'y': te[yc + 'c'].values}); oos.setdefault((name, yc), []).append(o)
            if '+ akış' in name:
                imp = pd.Series(m.booster_.feature_importance('gain'), index=feats); oos.setdefault(('imp', name, yc), []).append(imp[FA2].sum() / imp.sum()); CACHE[('imp',) + ck] = imp[FA2].sum() / imp.sum()
            CACHE[ck] = o; pd.to_pickle(CACHE, CK)
            print(m0, name, HN[yc], 'eğitim', len(tr), 'test', len(te), 'IC', fx(fast_ic(o, 'p', 'y')), f'{time.time()-t0:.0f} sn', flush=True)
L = [f'# Test #35 · büyük işlem akışı + lambdarank, 2023-06\'dan · {time.strftime("%Y-%m-%d")}', '',
     f'Akış arşivi 2023-06 → 2026-10, her ay hacimce ilk 20 coin ({AF.symn.nunique()} coin). Satırlar yalnız akış verisi olan coin-saatler (saat başına ≥10 coin). '
     f'denklem4: {len(D4):,} satır, {D4.th.nunique():,} saat; Ozan: {len(OZ):,} satır (Ozan\'ın coinler arası dilimleri 30 coinlik evrende, canlıdaki gibi). '
     f'Akış değişkenleri {len(FA)} ham + {len(FA)} saat içi sıra (4/24/72 sa ≥10k, ≥100k ve küçük işlem dengesizliği, büyük − küçük, büyük işlem payı ve sapması, işlem büyüklüğü sapması). '
     f'Bölünmeler Ozan ile aynı: test 2024-06\'dan 6 aylık 5 pencere, eğitim öncesi tüm veri (en çok {MAXTR:,} satır), boşluk {GAP} gün; lambdarank 200 ağaç, 31 yaprak, saat içi onluk etiketi. '
     'IC saat içi Spearman (aynı ~20 coin içinde), hedef oynaklığa bölünmüş VWAP → VWAP getirisi.', '',
     '| Model | Ufuk | Tümü | 1. yarı | 2. yarı | Son 12 ay | 2024-06 | 2024-12 | 2025-06 | 2025-12 | 2026-06 | Akışın kazanç payı |', '|---|---|---|---|---|---|---|---|---|---|---|---|']
for yc in HZ:
    for name, _, _ in VARS:
        parts = oos[(name, yc)]; o = pd.concat(parts); mid = np.sort(o.t.values)[len(o) // 2]; y12 = o.t.max() - 365 * 864e5
        imp = oos.get(('imp', name, yc)); L.append(f'| {name} | {HN[yc]} | {fx(fast_ic(o, "p", "y"))} | {fx(fast_ic(o[o.t < mid], "p", "y"))} | {fx(fast_ic(o[o.t >= mid], "p", "y"))} | {fx(fast_ic(o[o.t >= y12], "p", "y"))} | '
                 + ' | '.join(fx(fast_ic(p, 'p', 'y')) for p in parts) + f" | {('%' + format(100*np.mean(imp), '.0f')) if imp else '—'} |")
L += ['', '## Fark (akışlı − akışsız)', '', '| Taban | Ufuk | Tümü | 1. yarı | 2. yarı | Son 12 ay | 2024-06 | 2024-12 | 2025-06 | 2025-12 | 2026-06 | Artı pencere |', '|---|---|---|---|---|---|---|---|---|---|---|---|']
for yc in HZ:
    for base, plus in (('denklem4', 'denklem4 + akış'), ('Ozan', 'Ozan + akış')):
        P0 = oos[(base, yc)]; P1 = oos[(plus, yc)]; o0 = pd.concat(P0); o1 = pd.concat(P1); mid = np.sort(o0.t.values)[len(o0) // 2]; y12 = o0.t.max() - 365 * 864e5
        dd = lambda f: fast_ic(o1[f(o1)], 'p', 'y') - fast_ic(o0[f(o0)], 'p', 'y'); wd = [fast_ic(b, 'p', 'y') - fast_ic(a, 'p', 'y') for a, b in zip(P0, P1)]
        L.append(f'| {base} | {HN[yc]} | {fx(dd(lambda o: o.t > 0))} | {fx(dd(lambda o: o.t < mid))} | {fx(dd(lambda o: o.t >= mid))} | {fx(dd(lambda o: o.t >= y12))} | ' + ' | '.join(fx(w) for w in wd) + f' | {sum(w > 0 for w in wd)}/5 |')
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L)); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
