# Ozan (sıralama modeli) için Kaggle kazananlarının denenmemiş üç fikri (test listesi #37), aynı ileriye yürüyen bölünmelerle:
#  bdm  = BTC'ye göre arındırılmış hedef: (coin getirisi − β·BTC getirisi) ÷ ölçek; β = coinin son 24 sa 15 dk betası (canlıda da var)
#  tw   = zaman ağırlığı: eğitim satırı ağırlığı 0,5^(yaş/yarı ömür), yarı ömür --hl ay (varsayılan 12)
#  fsel = değişken seçimi: önce tam modelle eğit, kazançta ilk --k (30) değişkenle yeniden eğit
# Değerlendirme hepsinde aynı: saat içi Spearman IC, hedef Denklem 4 / tests/rank-model.py ile aynı (oynaklığa bölünmüş VWAP getirisi); ayrıca arındırılmış hedefte IC.
# Kullanım: python3 tests/rank-deneme.py [--hl 12] [--k 30] [--out tests/rank-deneme-report.md]
import json, sys, os, math, time, glob, numpy as np, pandas as pd, lightgbm as lgb
np.random.seed(1); HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
HL = float(arg('hl', 12)); K = int(arg('k', 30)); OUT = arg('out', os.path.join(HERE, 'rank-deneme-report.md')); MAXTR = 300000; GAP = 2; t0 = time.time()
meta = json.load(open(os.path.join(D, 'rank.json'))); COLS = meta['cols']; RAW = meta['feats']; XS = meta['xs']; BTC = meta['syms'].index('BTCUSDT')
X = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(COLS)) for f in sorted(glob.glob(os.path.join(D, 'rank-*.f32')))]); df = pd.DataFrame(X, columns=COLS); del X
df = df[np.isfinite(df.y4v)].copy(); df['th'] = df.th.round().astype(np.int64); df['t'] = df.th * 3600000 + meta['t0']; df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m'); df['si'] = df.si.round().astype(int)
df = df.sort_values(['th', 'si']).reset_index(drop=True)
for k in XS: df['x_' + k] = df.groupby('th')[k].rank(pct=True).astype(np.float32)
FEATS = RAW + ['x_' + k for k in XS]
HZ = {'4 sa': ('y4v', 'p4'), '12 sa': ('y12v', 'p12')}
dec = lambda s: np.floor(df.groupby('th')[s].rank(pct=True, method='first').values * 10 - 1e-9).clip(0, 9)
for h, (yc, pc) in HZ.items():
    df[yc + 'c'] = df[yc].clip(-5, 5); df[yc + 'r'] = dec(yc + 'c')
    with np.errstate(invalid='ignore', divide='ignore'): sc = df[pc] / df[yc]  # ölçek = oynaklık × √mum (hedefin paydası)
    b = df[df.si == BTC].set_index('th')[pc]; bt = df.th.map(b)
    df[yc + 'b'] = ((df[pc] - df.beta.clip(-3, 5).fillna(1) * bt) / sc).clip(-5, 5); df.loc[df.si == BTC, yc + 'b'] = np.nan; df[yc + 'br'] = dec(yc + 'b')
fx = lambda v, d=3: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
def fast_ic(o, pcol, ycol, key='th', minn=10):
    d = o[[key, pcol, ycol]].dropna()
    if len(d) < 50: return np.nan
    codes, _ = pd.factorize(d[key].values); n = np.bincount(codes); rp = d.groupby(key)[pcol].rank().values; ry = d.groupby(key)[ycol].rank().values
    sx = np.bincount(codes, rp); sy = np.bincount(codes, ry); sxx = np.bincount(codes, rp*rp); syy = np.bincount(codes, ry*ry); sxy = np.bincount(codes, rp*ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx*sy/n)/np.sqrt((sxx - sx*sx/n)*(syy - sy*sy/n))
    r = r[(n >= minn) & np.isfinite(r)]; return r.mean() if len(r) else np.nan
def fit(tr, feats, tg, w=None):
    ok = np.isfinite(tr[tg].values); trs = tr[ok].sort_values('th', kind='stable'); grp = trs.groupby('th', sort=False).size().values
    ww = None if w is None else w[ok][np.argsort(tr[ok].th.values, kind='stable')]
    return lgb.LGBMRanker(objective='lambdarank', n_estimators=200, learning_rate=0.03, num_leaves=31, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10,
                          label_gain=list(range(10)), lambdarank_truncation_level=30, verbose=-1, n_jobs=4).fit(trs[feats], trs[tg].astype(int), group=grp, sample_weight=ww)
VAR = ['taban', 'bdm', 'tw', 'fsel', 'bdm+tw']; months = sorted(df.month.unique()); starts = [m for m in months if m >= '2024-06'][::6]; oos = {}; chosen = {}
for m0 in starts:
    test_m = [m for m in months if m >= m0][:6]; tmin = df[df.month == m0].t.min()
    tr_idx = df.index[(df.t < tmin - GAP*864e5)].values; te_idx = df.index[df.month.isin(test_m)].values
    if len(tr_idx) > MAXTR: tr_idx = np.sort(np.random.choice(tr_idx, MAXTR, replace=False))
    tr = df.loc[tr_idx]; te = df.loc[te_idx]; age = (tmin - tr.t.values) / (30.4*864e5); w = 0.5 ** (age / HL); print('test', m0, len(tr), len(te), flush=True)
    for h, (yc, pc) in HZ.items():
        for v in VAR:
            lab = yc + ('br' if v.startswith('bdm') else 'r'); feats = FEATS
            if v == 'fsel':
                m1 = fit(tr, FEATS, lab); imp = pd.Series(m1.booster_.feature_importance('gain'), index=FEATS).sort_values(ascending=False); feats = list(imp.index[:K]); chosen.setdefault(h, []).append(feats)
            m = fit(tr, feats, lab, w if 'tw' in v else None)
            o = pd.DataFrame({'t': te.t.values, 'th': te.th.values, 'p': m.predict(te[feats]), 'yc': te[yc + 'c'].values, 'yb': te[yc + 'b'].values}); oos.setdefault((h, v), []).append(o)
            print(f'   {h} {v} IC {fx(fast_ic(o, "p", "yc"))} arındırılmış {fx(fast_ic(o, "p", "yb"))} {time.time()-t0:.0f} sn', flush=True)
L = [f'# Ozan · Kaggle fikirleri (test listesi #37) · {time.strftime("%Y-%m-%d")}', '', f'Veri ve bölünmeler tests/rank-model.py ile aynı (src/rankmodel.js değişkenleri, 2024-06\'dan 6 aylık 5 pencere, 2 gün boşluk, 300 bin satır, 200 ağaç). '
     f'bdm = BTC\'ye göre arındırılmış hedefle eğitim (coin − β·BTC), tw = zaman ağırlığı (yarı ömür {HL:g} ay), fsel = kazançta ilk {K} değişken. IC her satırda aynı hedefte (oynaklığa bölünmüş VWAP getirisi); son sütun arındırılmış hedefte.', '',
     '| Ufuk | Varyant | IC tümü | 1. yarı | 2. yarı | Son 12 ay | Pencereler | IC (arındırılmış hedef) |', '|---|---|---|---|---|---|---|---|']
for (h, v), parts in oos.items():
    o = pd.concat(parts); mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5
    L.append(f'| {h} | {v} | {fx(fast_ic(o, "p", "yc"))} | {fx(fast_ic(o[o.t < mid], "p", "yc"))} | {fx(fast_ic(o[o.t >= mid], "p", "yc"))} | {fx(fast_ic(o[o.t >= y12], "p", "yc"))} | {" / ".join(fx(fast_ic(p, "p", "yc")) for p in parts)} | {fx(fast_ic(o, "p", "yb"))} |')
for h, ch in chosen.items():
    from collections import Counter; c = Counter(f for fs in ch for f in fs); L += ['', f'{h} değişken seçiminde 5 pencerenin hepsinde seçilenler: ' + ', '.join(sorted(k for k, n in c.items() if n == len(ch)))]
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L)); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
