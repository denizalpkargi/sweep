# Denklem 4 ek (9 Ekim 2026): LightGBM'i piyasa ortalamasından arındırılmış hedefle (coin getirisi − aynı saatin ortalaması) ve
# piyasa düzeyi değişkenler (aynı saatte her coin için aynı olanlar: BTC rejimi, takvim, genişlik) çıkarılarak eğit.
# Soru: ağın IC'yi 0,02 → 0,04'e çıkarması "derin ağ"dan mı, yoksa hedefin/kaybın coinler arası sıralamayı ölçmesinden mi?
# Kullanım: python3 tests/denklem4-arindirilmis.py [--start 12] [--step 6] [--maxtrain 450000] [--out tests/denklem4-arindirilmis-report.md]
import json, sys, os, math, time, numpy as np, pandas as pd, lightgbm as lgb
np.random.seed(1); D = os.path.join(os.path.dirname(__file__), 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
OUT = arg('out', os.path.join(os.path.dirname(__file__), 'denklem4-arindirilmis-report.md')); START = int(arg('start', 12)); STEP = int(arg('step', 6)); MAXTR = int(arg('maxtrain', 450000))
meta = json.load(open(os.path.join(D, 'denklem4.json'))); COLS = meta['cols']; NEW = meta['new']; t0 = time.time()
X = np.fromfile(os.path.join(D, 'denklem4.f32'), dtype=np.float32).reshape(-1, len(COLS)); df = pd.DataFrame(X, columns=COLS); del X
df = df[np.isfinite(df.y1v) & np.isfinite(df.y4v)].copy(); df['t'] = df.th.astype(np.int64) * 3600000 + meta['t0']; df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
HZ = {'1 sa': ('y1v', 2.0), '4 sa': ('y4v', 4.0), '12 sa': ('y12v', math.sqrt(48)), '24 sa': ('y24v', math.sqrt(96))}; HZ = {k: v for k, v in HZ.items() if k in arg('hz', ','.join(HZ)).split(',')}  # --hz "4 sa,12 sa"
NTREE = int(arg('trees', 300)); GAP = float(arg('gap', 1))  # eğitim ile test arasında boşluk (gün); 24 sa hedef için ≥ 2 önerilir
for h, (yc, _) in HZ.items():
    df[yc + 'c'] = df[yc].clip(-5, 5); df[yc + 'd'] = df[yc + 'c'] - df.groupby('th')[yc + 'c'].transform('mean')  # arındırılmış
    df[yc + 'r'] = np.floor(df.groupby('th')[yc + 'c'].rank(pct=True, method='first').values*10 - 1e-9).clip(0, 9)  # lambdarank etiketi: saat içi onluk
df = df.reset_index(drop=True)
DROP = {'sym', 'th', 'y1', 'y4', 'y24', 'y1v', 'y4v', 'y12v', 'y24v', 'sd15', 't', 'month'} | {c + s for c, _ in HZ.values() for s in 'cd'}
FEATS = [c for c in COLS if c not in DROP]
# piyasa düzeyi değişken: saat içi std / genel std < 0,02 (örneklem: 300 saat)
samp = df[df.th.isin(np.random.choice(df.th.unique(), 300, replace=False))]
ratio = (samp.groupby('th')[FEATS].std().mean() / samp[FEATS].std()).fillna(0); MKT = [c for c in FEATS if ratio[c] < 0.02]; COIN = [c for c in FEATS if c not in MKT]
months = sorted(df.month.unique()); fx = lambda v, d=3: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
print('satır', len(df), 'piyasa düzeyi değişken', len(MKT), 'coin düzeyi', len(COIN), f'{time.time()-t0:.0f} sn', flush=True); print('piyasa düzeyi:', ' '.join(MKT), flush=True)
def fast_ic(o, pcol, ycol, key='th', minn=10):
    d = o[[key, pcol, ycol]].dropna()
    if len(d) < 50: return np.nan, np.nan, 0
    codes, _ = pd.factorize(d[key].values); n = np.bincount(codes)
    rp = d.groupby(key)[pcol].rank().values; ry = d.groupby(key)[ycol].rank().values
    sx = np.bincount(codes, rp); sy = np.bincount(codes, ry); sxx = np.bincount(codes, rp*rp); syy = np.bincount(codes, ry*ry); sxy = np.bincount(codes, rp*ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx*sy/n)/np.sqrt((sxx - sx*sx/n)*(syy - sy*sy/n))
    r = r[(n >= minn) & np.isfinite(r)]; return (r.mean() if len(r) else np.nan), (r.mean()/r.std()*math.sqrt(len(r)) if len(r) > 2 and r.std() > 0 else np.nan), len(r)
VARS = [('LGB ham hedef, tüm değişkenler', FEATS, 'c'), ('LGB arındırılmış hedef, tüm değişkenler', FEATS, 'd'), ('LGB arındırılmış hedef, yalnız coin değişkenleri', COIN, 'd'), ('LGB ham hedef, yalnız coin değişkenleri', COIN, 'c')]
VARS = [v for v in VARS if not arg('vars', None) or str(VARS.index(v)) in arg('vars', '').split(',')]  # --vars 0,1,2
if '--lambdarank' in sys.argv: VARS = [('LGB lambdarank (saat içi onluk etiketi), tüm değişkenler', FEATS, 'r'), ('LGB lambdarank, yalnız coin değişkenleri', COIN, 'r')]
oos = {}
for i in range(START, len(months), STEP):
    test_m = months[i:i+STEP]; tmin = df[df.month == months[i]].t.min()
    tr_idx = df.index[(df.month < months[i]) & (df.t < tmin - GAP*864e5)].values; te_idx = df.index[df.month.isin(test_m)].values
    if len(te_idx) == 0 or len(tr_idx) < 50000: continue
    if len(tr_idx) > MAXTR: tr_idx = np.sort(np.random.choice(tr_idx, MAXTR, replace=False))
    tr = df.loc[tr_idx]; te = df.loc[te_idx]; print('test', test_m[0], 'eğitim', len(tr_idx), 'test', len(te_idx), flush=True)
    for name, feats, suf in VARS:
        for h, (yc, sc) in HZ.items():
            tg = yc + suf; ok = np.isfinite(tr[tg].values)
            if suf == 'r':
                trs = tr.loc[ok].sort_values('th'); grp = trs.groupby('th', sort=False).size().values
                m = lgb.LGBMRanker(objective='lambdarank', n_estimators=NTREE, learning_rate=0.03, num_leaves=31, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10, label_gain=list(range(10)), lambdarank_truncation_level=30, verbose=-1, n_jobs=4).fit(trs[feats], trs[tg].astype(int), group=grp)
                o = pd.DataFrame({'t': te.t.values, 'th': te.th.values, 'sym': te.sym.values, 'sd15': te.sd15.values, 'p': m.predict(te[feats]), 'y': te[yc].values, 'yc': te[yc + 'c'].values})
                oos.setdefault((name, h), []).append(o); print(f'    {name} {h} IC {fx(fast_ic(o, "p", "yc")[0])} {time.time()-t0:.0f} sn', flush=True); continue
            m = lgb.LGBMRegressor(n_estimators=NTREE, learning_rate=0.03, num_leaves=31, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10, verbose=-1, n_jobs=4).fit(tr.loc[ok, feats], tr.loc[ok, tg])
            o = pd.DataFrame({'t': te.t.values, 'th': te.th.values, 'sym': te.sym.values, 'sd15': te.sd15.values, 'p': m.predict(te[feats]), 'y': te[yc].values, 'yc': te[yc + 'c'].values})
            oos.setdefault((name, h), []).append(o); print(f'    {name} {h} IC {fx(fast_ic(o, "p", "yc")[0])} {time.time()-t0:.0f} sn', flush=True)
L = [f'# Denklem 4 ek · arındırılmış hedef ve coin düzeyi değişkenlerle LightGBM · {time.strftime("%Y-%m-%d")}', '',
     f'{len(df):,} saat; {len(MKT)} piyasa düzeyi değişken (aynı saatte her coin için aynı; saat içi std / genel std < 0,02) çıkarıldı: {", ".join(MKT)}. Boşluk {GAP:g} gün. Arındırılmış hedef = coin getirisi − aynı saatteki coinlerin ortalaması. Aynı ileriye yürüyen bölünmeler (test {STEP} ay, 5 pencere).', '',
     '| Model | Ufuk | Dönem | n | IC | t | Üst−alt onluk % | Üst onluk % | Alt onluk % |', '|---|---|---|---|---|---|---|---|---|']
SUMM = {}
for (name, h), parts in oos.items():
    o = pd.concat(parts); mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5; sc = HZ[h][1]
    for pn, sub in [('tümü', o), ('1. yarı', o[o.t < mid]), ('2. yarı', o[o.t >= mid]), ('son 12 ay', o[o.t >= y12])]:
        sub = sub.dropna(subset=['yc']); a, at, _ = fast_ic(sub, 'p', 'yc'); dec = np.floor(sub.groupby('th')['p'].rank(method='first', pct=True).values*10 - 1e-9).clip(0, 9); ret = sub.y.values*sub.sd15.values*sc*100
        top = ret[dec == 9].mean(); bot = ret[dec == 0].mean(); SUMM[(name, h, pn)] = a; L.append(f'| {name} | {h} | {pn} | {len(sub):,} | {fx(a)} | {fx(at, 1)} | {fx(top-bot)} | {fx(top)} | {fx(bot)} |')
L += ['', '## Karar', ''] + [f"{h}: " + ' · '.join(f'{n} {fx(SUMM.get((n, h, "tümü")))} (son 12 ay {fx(SUMM.get((n, h, "son 12 ay")))})' for n, _, _ in VARS) for h in HZ]
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L[-5:])); print('yazıldı', OUT, 'süre', f'{time.time()-t0:.0f} sn')
