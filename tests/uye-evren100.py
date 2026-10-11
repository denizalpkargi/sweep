# Eğitilmiş üyeler ilk 100 evreninde (12 Ekim 2026; kullanıcı "model oyları tüm coinlerde devreye girmesin mi", "önce ölçüp sonra masayı güncelleyelim" dedi).
# Veri: rank-ozellik.js --top 100 (rank-*.f32) + uye-ek-ozellik.js --top 100 (uyeek-*.f32), ayın hacimce ilk 100 coini (universe.json).
# İki eğitim, uye-lambdarank.py ile aynı yöntem (lambdarank, 200 ağaç, 6 aylık pencereler 2024-06'dan, 2 gün boşluk, en çok 300 bin eğitim satırı):
#   A) bugünkü gibi: yalnız ayın ilk 30'u (etiket ve x_ dilimleri ilk 30 içinde)
#   B) ilk 100 (etiket ve x_ dilimleri ilk 100 içinde)
# Ölçüm: saat içi IC ayrı ayrı ilk 30 coinde ve 31–100. coinlerde (sıra o alt küme içinde). Canlıda evren 100'e çıkarsa x_ dilimleri ilk 100 içinde
# hesaplanır; bu yüzden A'nın 31–100 ölçümünde x_ ilk 100 içinde, ilk 30 ölçümünde ilk 30 içinde.
# Kullanım: python tests/uye-evren100.py [--trees 200] [--maxtrain 300000] → tests/uye-evren100-report.md
import json, sys, os, time, glob, numpy as np, pandas as pd, lightgbm as lgb
np.random.seed(1); HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
NTREE = int(arg('trees', 200)); MAXTR = int(arg('maxtrain', 300000)); GAP = 2; OUT = arg('out', os.path.join(HERE, 'uye-evren100-report.md')); t0 = time.time()
meta = json.load(open(os.path.join(D, 'rank.json'))); COLS = meta['cols']; RAW = meta['feats']; XS = meta['xs']; SYMS = meta['syms']
X = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(COLS)) for f in sorted(glob.glob(os.path.join(D, 'rank-*.f32')))]); df = pd.DataFrame(X, columns=COLS); del X
df = df[np.isfinite(df.y4v)].copy(); df['th'] = df.th.round().astype(np.int64); df['si'] = df.si.round().astype(np.int64)
em = json.load(open(os.path.join(D, 'uyeek.json'))); EX = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(em['cols'])) for f in sorted(glob.glob(os.path.join(D, 'uyeek-*.f32')))])
ex = pd.DataFrame(EX, columns=em['cols']); del EX; ex['th'] = ex.th.round().astype(np.int64); ex['si'] = ex.si.round().astype(np.int64)
df = df.merge(ex.drop_duplicates(['th', 'si']), on=['th', 'si'], how='left'); del ex
df['t'] = df.th*3600000 + meta['t0']; df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
U = json.load(open(os.path.join(D, 'universe.json')))['months']
pos = {m: {s: i for i, s in enumerate(v)} for m, v in U.items()}
df['urk'] = [pos.get(m, {}).get(SYMS[s], 999) for m, s in zip(df.month.values, df.si.values)]
df = df[df.urk < 100].sort_values(['th', 'si']).reset_index(drop=True); df['top30'] = df.urk < 30
print('satır', len(df), 'ilk 30', int(df.top30.sum()), 'saat', df.th.nunique(), f'{time.time()-t0:.0f} sn', flush=True)
HZ = {'4 sa': 'y4v', '12 sa': 'y12v'}
def prep(d):  # x_ dilimleri ve saat içi onluk etiket, d'nin evreni içinde
    d = d.copy()
    for k in XS: d['x_'+k] = d.groupby('th')[k].rank(pct=True).astype(np.float32)
    for h, yc in HZ.items():
        d[yc+'c'] = d[yc].clip(-5, 5); d[yc+'r'] = np.floor(d.groupby('th')[yc+'c'].rank(pct=True, method='first').values*10 - 1e-9).clip(0, 9)
    return d
d100 = prep(df); d30 = prep(df[df.top30]); del df
UYE = {
  'Emre (trend)':        ['dS20','dS50','dS100','z9d','z14d','z30d','z90d','pos30d','pos9d','ddHi90','x_z9d','x_z30d'],
  'Baran (kısa momentum)':['z15','z1','z4','z24','z48h','z3d','rsi15','rsi1h','bb15','pos24','pos48h','body1','jump','x_z1','x_z4','x_z24'],
  'Serkan (hacim)':      ['vq1','vq4','vqD','vq7','lq24','vwD24','vwD4','x_vq1','x_lq24','x_vwD24'],
  'Mert (akış, OI, fonlama)':['tk1','tk4','tk24','tk9d','x_tk24','oi1','oi2','oiTurn','tp','tpCh','gl','glCh','fr','x_fr','x_oi1'],
  'Arda (BTC\'ye göre)': ['rel1','rel4','rel24','beta','corr'],
  'Can (oynaklık)':      ['rv','rvR','rv4h','rvD','rng24','x_rv'],
  'Kerem (likidite)':    em['ker'],
  'Yusuf (zaman dilimi)':em['yus'],
  'Onur (coin geçmişi)': em['onu'],
}
UYE = {k: [c for c in v if c in d100.columns] for k, v in UYE.items()}
UYE['Ozan (hepsi)'] = RAW + ['x_'+k for k in XS]
fx = lambda v, d=3: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
def fast_ic(o, pcol, ycol, key='th', minn=10):
    d = o[[key, pcol, ycol]].dropna()
    if len(d) < 50: return np.nan
    codes, _ = pd.factorize(d[key].values); n = np.bincount(codes)
    rp = d.groupby(key)[pcol].rank().values; ry = d.groupby(key)[ycol].rank().values
    sx = np.bincount(codes, rp); sy = np.bincount(codes, ry); sxx = np.bincount(codes, rp*rp); syy = np.bincount(codes, ry*ry); sxy = np.bincount(codes, rp*ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx*sy/n)/np.sqrt((sxx - sx*sx/n)*(syy - sy*sy/n))
    r = r[(n >= minn) & np.isfinite(r)]; return r.mean() if len(r) else np.nan
def fit(tr, feats, tg):
    trs = tr[np.isfinite(tr[tg].values)].sort_values('th'); grp = trs.groupby('th', sort=False).size().values
    return lgb.LGBMRanker(objective='lambdarank', n_estimators=NTREE, learning_rate=0.03, num_leaves=31, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10,
                          label_gain=list(range(10)), lambdarank_truncation_level=30, verbose=-1, n_jobs=4).fit(trs[feats], trs[tg].astype(int), group=grp)
def trainset(d, tmin):
    idx = d.index[d.t < tmin - GAP*864e5].values
    if len(idx) > MAXTR: idx = np.sort(np.random.choice(idx, MAXTR, replace=False))
    return d.loc[idx]
months = sorted(d100.month.unique()); starts = [m for m in months if m >= '2024-06'][::6]; oos = {}
for m0 in starts:
    test_m = [m for m in months if m >= m0][:6]; tmin = d100[d100.month == m0].t.min()
    trA = trainset(d30, tmin); trB = trainset(d100, tmin)
    te30 = d30[d30.month.isin(test_m)]; te100 = d100[d100.month.isin(test_m)]; teX = te100[~te100.top30]   # 31–100, x_ ilk 100 içinde
    for name, feats in UYE.items():
        for h, yc in HZ.items():
            mA = fit(trA, feats, yc+'r'); mB = fit(trB, feats, yc+'r')
            for key, m, te in (('A30', mA, te30), ('A70', mA, teX), ('B30', mB, te100[te100.top30]), ('B70', mB, teX)):
                o = pd.DataFrame({'t': te.t.values, 'th': te.th.values, 'si': te.si.values, 'p': m.predict(te[feats]), 'yc': te[yc+'c'].values})
                oos.setdefault((name, h, key), []).append(o)
            print(m0, name, h, ' '.join(f'{k} {fx(fast_ic(oos[(name,h,k)][-1],"p","yc"))}' for k in ('A30','A70','B30','B70')), f'{time.time()-t0:.0f} sn', flush=True)
def row(parts):
    o = pd.concat(parts); mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5
    return [fx(fast_ic(o,'p','yc')), fx(fast_ic(o[o.t<mid],'p','yc')), fx(fast_ic(o[o.t>=mid],'p','yc')), fx(fast_ic(o[o.t>=y12],'p','yc')), ' / '.join(fx(fast_ic(p,'p','yc')) for p in parts), sum(fast_ic(p,'p','yc') > 0 for p in parts)]
n30 = int(d30.shape[0]); n100 = int(d100.shape[0])
L = [f'# Eğitilmiş üyeler ilk 100 evreninde · {time.strftime("%Y-%m-%d")}', '',
     f'{n100:,} satır (ilk 30: {n30:,}), {d100.th.nunique():,} saat. Hedef rank-model.py ile aynı (VWAP → VWAP, oynaklığa bölünmüş, saat içi onluk). Test 2024-06\'dan 6 aylık pencereler, boşluk {GAP} gün, {NTREE} ağaç, en çok {MAXTR:,} eğitim satırı.',
     'A = bugünkü gibi yalnız ilk 30 ile eğitilmiş, B = ilk 100 ile eğitilmiş. IC her hücrede o alt küme içinde (ilk 30 ya da 31–100. coinler) saat içi sıra korelasyonu.', '',
     '| Üye | Ufuk | Eğitim → ölçüm | IC tümü | 1. yarı | 2. yarı | Son 12 ay | Pencereler | Artı pencere |', '|---|---|---|---|---|---|---|---|---|']
LBL = {'A30': 'A ilk 30 → ilk 30', 'A70': 'A ilk 30 → 31–100', 'B30': 'B ilk 100 → ilk 30', 'B70': 'B ilk 100 → 31–100'}
for name in UYE:
    for h in HZ:
        for k in ('A30', 'A70', 'B30', 'B70'):
            r = row(oos[(name, h, k)]); L.append(f'| {name} | {h} | {LBL[k]} | ' + ' | '.join(str(x) for x in r) + ' |')
open(OUT, 'w', encoding='utf-8').write('\n'.join(L)+'\n'); print('\n'.join(L)); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
# örneklem dışı tahminler (saat içi dilim, ölçülen alt küme içinde) → tests/uye-karar.py masanın giriş kararlarıyla eşleştirir
rows = []
for (name, h, k), parts in oos.items():
    o = pd.concat(parts); o['pr'] = o.groupby('th').p.rank(pct=True); o['sym'] = [SYMS[s] for s in o.si.values]
    rows.append(o[['t', 'sym', 'pr']].assign(uye=name, h=h, key=k))
pd.concat(rows).to_pickle(os.path.join(D, 'uye-evren100-oos.pkl')); print('örneklem dışı tahminler yazıldı', f'{time.time()-t0:.0f} sn')
