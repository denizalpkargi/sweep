# Denklem 4 · LightGBM kıyası (9 Ekim 2026): eski 202 değişken ↔ 202 + yeni aileler (1 dk mikro yapı m_*, çoklu pencere e_*, coinler arası sıra x_*),
# standart ↔ derin/çok kombinasyonlu ağaçlar; hedefler 1 / 4 / 12 / 24 sa VWAP → VWAP (÷ oynaklık). İleriye yürüyen: test 6 ay, eğitim yalnız öncesi (1 gün ara).
# Ayrıca: yeni değişkenlerin tek başına coinler arası IC'si üç dönemde (test #29'un cevabı: çeyrek saat açılış dengesizliği → 1/4/12/24 sa),
# aile ekleme ablasyonu (eski+1dk, eski+pencere, eski+sıra; 4 sa), özellik önemi (aile payı), 2+2 işlem simülasyonu (1 sa saat başı, 4 sa 4 saatte bir, 12 sa 12 saatte bir).
# Kullanım: python3 tests/denklem4-model.py [--start 12] [--step 6] [--maxtrain 450000] [--out tests/denklem4-model-report.md] [--quick]
import json, sys, os, math, time
import numpy as np, pandas as pd, lightgbm as lgb
np.random.seed(1); D = os.path.join(os.path.dirname(__file__), 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
OUT = arg('out', os.path.join(os.path.dirname(__file__), 'denklem4-model-report.md')); START = int(arg('start', 12)); STEP = int(arg('step', 6)); MAXTR = int(arg('maxtrain', 450000)); QUICK = '--quick' in sys.argv
meta = json.load(open(os.path.join(D, 'denklem4.json'))); COLS = meta['cols']; NEW = meta['new']; t0 = time.time()
X = np.fromfile(os.path.join(D, 'denklem4.f32'), dtype=np.float32).reshape(-1, len(COLS)); df = pd.DataFrame(X, columns=COLS); del X
df = df[np.isfinite(df.y1v) & np.isfinite(df.y4v)].copy(); df['t'] = df.th.astype(np.int64) * 3600000 + meta['t0']; df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
HZ = {'1 sa': ('y1v', 2.0), '4 sa': ('y4v', 4.0), '12 sa': ('y12v', math.sqrt(48)), '24 sa': ('y24v', math.sqrt(96))}
for h, (yc, _) in HZ.items(): df[yc + 'c'] = df[yc].clip(-5, 5)
df = df.reset_index(drop=True)
DROP = {'sym', 'th', 'y1', 'y4', 'y24', 'y1v', 'y4v', 'y12v', 'y24v', 'sd15', 't', 'month'} | {c + 'c' for c, _ in HZ.values()}
OLDC = [c for c in COLS if c not in NEW]; OLD = [c for c in OLDC if c not in DROP]
M = [c for c in NEW if c.startswith('m_')]; E = [c for c in NEW if c.startswith('e_')]; XR = [c for c in NEW if c.startswith('x_')]; ALL = OLD + M + E + XR
months = sorted(df.month.unique()); fx = lambda v, d=3: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
print('satır', len(df), 'ay', months[0], '→', months[-1], 'eski', len(OLD), 'yeni', len(M), len(E), len(XR), f'{time.time()-t0:.0f} sn', flush=True)

def fast_ic(o, pcol, ycol, key='th', minn=10):
    d = o[[key, pcol, ycol]].dropna()
    if len(d) < 50: return np.nan, np.nan, 0
    codes, _ = pd.factorize(d[key].values); n = np.bincount(codes)
    rp = d.groupby(key)[pcol].rank().values; ry = d.groupby(key)[ycol].rank().values
    sx = np.bincount(codes, rp); sy = np.bincount(codes, ry); sxx = np.bincount(codes, rp*rp); syy = np.bincount(codes, ry*ry); sxy = np.bincount(codes, rp*ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx*sy/n)/np.sqrt((sxx - sx*sx/n)*(syy - sy*sy/n))
    r = r[(n >= minn) & np.isfinite(r)]; return (r.mean() if len(r) else np.nan), (r.mean()/r.std()*math.sqrt(len(r)) if len(r) > 2 and r.std() > 0 else np.nan), len(r)
def pooled_ic(o, pcol, ycol):
    d = o[[pcol, ycol]].dropna()
    return d[pcol].rank().corr(d[ycol].rank()) if len(d) > 100 else np.nan

L = [f'# Denklem 4 · LightGBM: eski 202 ↔ yeni aileler, derin ağaçlar, 1–24 sa hedefler · {time.strftime("%Y-%m-%d")}', '',
     f'{len(df):,} saatlik gözlem ({months[0]} → {months[-1]}), eski {len(OLD)} değişken + 1 dk mikro yapı {len(M)} + çoklu pencere {len(E)} + coinler arası sıra {len(XR)} = {len(ALL)}. Hedef: sonraki mumun VWAP\'ından 1 / 4 / 12 / 24 sa sonraki mumun VWAP\'ına getiri ÷ oynaklık (±5 kırpılır). İleriye yürüyen: test {STEP} ay, eğitim yalnız öncesi (en çok {MAXTR:,} satır örneklenir). IC = saatlik coinler arası Spearman ortalaması.', '']

# ---------- 1) Tek değişken: yeni ailelerin coinler arası IC'si (3 dönem, tüm veri) ----------
mid = np.sort(df.t.values)[len(df)//2]; y12 = df.t.max() - 365*864e5
PER = [('1. yarı', df.t < mid), ('2. yarı', df.t >= mid), ('son 12 ay', df.t >= y12)]
L += ['## 1) Yeni değişkenlerin tek başına coinler arası IC\'si (ham değişken, tüm veri; 1. yarı / 2. yarı / son 12 ay)', '',
      '| Değişken | IC 1 sa | IC 4 sa | IC 12 sa | IC 24 sa | Havuzlanmış 4 sa | Üç dönem aynı işaret (4 sa) |', '|---|---|---|---|---|---|---|']
single = []
for c in M + E + [x for x in XR if x[2:] in M + E]:
    row = {'c': c}; same = True; signs = []
    for h, (yc, _) in HZ.items():
        vals = [fast_ic(df[m], c, yc + 'c')[0] for _, m in PER]; row[h] = vals
        if h == '4 sa': signs = [np.sign(v) for v in vals if np.isfinite(v)]
    row['pool'] = pooled_ic(df, c, 'y4vc'); row['same'] = len(signs) == 3 and len(set(signs)) == 1 and signs[0] != 0; single.append(row)
single.sort(key=lambda r: -abs(np.nanmean(r['4 sa'])) if np.isfinite(np.nanmean(r['4 sa'])) else 0)
for r in single: L.append(f"| {r['c']} | " + ' | '.join(' / '.join(fx(v) for v in r[h]) for h in HZ) + f" | {fx(r['pool'])} | {'evet' if r['same'] else 'hayır'} |")
L += ['', f'Üç dönemde aynı işaretli (4 sa): {sum(r["same"] for r in single)} / {len(single)} (şansla ≈ {len(single)/4:.0f}).', '']
print('tek değişken tablosu', f'{time.time()-t0:.0f} sn', flush=True)

# ---------- 2) İleriye yürüyen LightGBM ----------
def fit(tr, te, feats, tg, deep):
    m = (lgb.LGBMRegressor(n_estimators=600, learning_rate=0.02, num_leaves=127, min_child_samples=300, subsample=0.7, subsample_freq=1, colsample_bytree=0.5, reg_lambda=5, max_bin=255, verbose=-1, n_jobs=4) if deep
         else lgb.LGBMRegressor(n_estimators=300, learning_rate=0.03, num_leaves=31, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10, verbose=-1, n_jobs=4))
    ok = np.isfinite(tr[tg].values); m.fit(tr.loc[ok, feats], tr.loc[ok, tg])
    return m, m.predict(te[feats]), m.predict(tr.loc[ok, feats].sample(min(ok.sum(), 150000), random_state=2))
VARS = [('LGB eski 202', OLD, False, list(HZ)), ('LGB tümü', ALL, False, list(HZ)), ('LGB tümü derin', ALL, True, ['4 sa', '12 sa'])]
if not QUICK: VARS += [('LGB eski+1dk', OLD + M, False, ['4 sa']), ('LGB eski+pencere', OLD + E, False, ['4 sa']), ('LGB eski+sıra', OLD + XR, False, ['4 sa'])]
oos = {}; imp = None
for i in range(START, len(months), STEP):
    test_m = months[i:i+STEP]; tmin = df[df.month == months[i]].t.min()
    tr_idx = df.index[(df.month < months[i]) & (df.t < tmin - 864e5)].values; te_idx = df.index[df.month.isin(test_m)].values
    if len(te_idx) == 0 or len(tr_idx) < 50000: continue
    if len(tr_idx) > MAXTR: tr_idx = np.sort(np.random.choice(tr_idx, MAXTR, replace=False))
    tr = df.loc[tr_idx]; te = df.loc[te_idx]; print('test', test_m[0], 'eğitim', len(tr_idx), 'test', len(te_idx), flush=True)
    for name, feats, deep, hzs in VARS:
        for h in hzs:
            yc = HZ[h][0] + 'c'; m, P, Ptr = fit(tr, te, feats, yc, deep)
            o = pd.DataFrame({'t': te.t.values, 'th': te.th.values, 'sym': te.sym.values, 'sd15': te.sd15.values, 'p': P, 'q95': np.quantile(Ptr, 0.95), 'q05': np.quantile(Ptr, 0.05), 'y': te[HZ[h][0]].values, 'yc': te[yc].values})
            oos.setdefault((name, h), []).append(o); ic = fast_ic(o, 'p', 'yc')[0]
            print(f'    {name} {h} IC {fx(ic)} {time.time()-t0:.0f} sn', flush=True)
            if name == 'LGB tümü' and h == '4 sa': imp = pd.Series(m.booster_.feature_importance('gain'), index=feats)
L += ['## 2) İleriye yürüyen LightGBM: IC ve üst−alt onluk getirisi', '', '| Model | Ufuk | Dönem | n | IC | t | Üst−alt onluk % | Üst onluk % | Alt onluk % |', '|---|---|---|---|---|---|---|---|---|']
SUMM = {}
for (name, h), parts in oos.items():
    o = pd.concat(parts); omid = np.sort(o.t.values)[len(o)//2]; oy12 = o.t.max() - 365*864e5; sc = HZ[h][1]
    for pn, sub in [('tümü', o), ('1. yarı', o[o.t < omid]), ('2. yarı', o[o.t >= omid]), ('son 12 ay', o[o.t >= oy12])]:
        sub = sub.dropna(subset=['yc']); a, at, _ = fast_ic(sub, 'p', 'yc')
        dec = np.floor(sub.groupby('th')['p'].rank(method='first', pct=True).values*10 - 1e-9).clip(0, 9); ret = sub.y.values*sub.sd15.values*sc*100
        top = ret[dec == 9].mean(); bot = ret[dec == 0].mean(); SUMM[(name, h, pn)] = (a, top - bot)
        L.append(f'| {name} | {h} | {pn} | {len(sub):,} | {fx(a)} | {fx(at, 1)} | {fx(top-bot)} | {fx(top)} | {fx(bot)} |')
# 2+2 işlem
L += ['', '## 3) Gerçek işlem gibi: her ufukta en güçlü 2 long + 2 short (eşik: eğitim tahminlerinin %95/%5\'i; coin kilidi; VWAP dolum)', '', '| Model | Ufuk | Dönem | İşlem | Ort. % (maliyetsiz) | Maker sonrası (%0,04) | Taker sonrası (%0,16) | Kazanma |', '|---|---|---|---|---|---|---|---|']
STEPH = {'1 sa': 1, '4 sa': 4, '12 sa': 12, '24 sa': 24}
for (name, h), parts in oos.items():
    if name not in ('LGB eski 202', 'LGB tümü', 'LGB tümü derin'): continue
    o = pd.concat(parts).dropna(subset=['y']); st = STEPH[h]; o = o[(o.th % st) == 0].sort_values(['th', 'p']); omid = np.sort(o.t.values)[len(o)//2]; oy12 = o.t.max() - 365*864e5; busy = {}; T = []; sc = HZ[h][1]
    for th, g in o.groupby('th', sort=True):
        cand = [(1, r) for _, r in g[g.p >= g.q95].nlargest(2, 'p').iterrows()] + [(-1, r) for _, r in g[g.p <= g.q05].nsmallest(2, 'p').iterrows()]
        for d, r in cand:
            if busy.get(r.sym, -1) > th: continue
            busy[r.sym] = th + st; T.append((r.t, d*r.y*r.sd15*sc*100))
    T = pd.DataFrame(T, columns=['t', 'ret'])
    for pn, sub in [('1. yarı', T[T.t < omid]), ('2. yarı', T[T.t >= omid]), ('son 12 ay', T[T.t >= oy12])]:
        if len(sub) == 0: continue
        L.append(f'| {name} | {h} | {pn} | {len(sub):,} | {fx(sub.ret.mean())} | {fx(sub.ret.mean()-0.04)} | {fx(sub.ret.mean()-0.16)} | %{100*(sub.ret>0).mean():.1f} |'.replace('.', ',', 0))
# özellik önemi
if imp is not None:
    fam = lambda c: '1 dk' if c.startswith('m_') else 'pencere' if c.startswith('e_') else 'sıra' if c.startswith('x_') else 'eski'
    tot = imp.sum(); byf = imp.groupby(imp.index.map(fam)).sum() / tot
    L += ['', '## 4) Özellik önemi (LGB tümü, 4 sa, son pencere; kazanç payı)', '', '| Aile | Pay |', '|---|---|'] + [f'| {k} | %{100*v:.1f} |'.replace('.', ',') for k, v in byf.sort_values(ascending=False).items()]
    L += ['', '| Değişken | Pay |', '|---|---|'] + [f'| {k} | %{100*v/tot:.2f} |'.replace('.', ',') for k, v in imp.sort_values(ascending=False).head(25).items()]
# karar
g = lambda n, h, p='tümü': SUMM.get((n, h, p), (np.nan, np.nan))
L += ['', '## Karar', '',
      f"IC (tümü): 1 sa eski {fx(g('LGB eski 202','1 sa')[0])} → tümü {fx(g('LGB tümü','1 sa')[0])}; 4 sa eski {fx(g('LGB eski 202','4 sa')[0])} → tümü {fx(g('LGB tümü','4 sa')[0])} → derin {fx(g('LGB tümü derin','4 sa')[0])}; 12 sa eski {fx(g('LGB eski 202','12 sa')[0])} → tümü {fx(g('LGB tümü','12 sa')[0])} → derin {fx(g('LGB tümü derin','12 sa')[0])}; 24 sa eski {fx(g('LGB eski 202','24 sa')[0])} → tümü {fx(g('LGB tümü','24 sa')[0])}.",
      f"Son 12 ay: 4 sa eski {fx(g('LGB eski 202','4 sa','son 12 ay')[0])} → tümü {fx(g('LGB tümü','4 sa','son 12 ay')[0])} → derin {fx(g('LGB tümü derin','4 sa','son 12 ay')[0])}.",
      '']
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L[-6:])); print('yazıldı', OUT, 'süre', f'{time.time()-t0:.0f} sn')
