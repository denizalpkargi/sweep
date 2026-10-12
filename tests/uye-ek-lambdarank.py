# Gelişmemiş üyeler (11 Ekim 2026; kullanıcı "devam" dedi): Kerem (likidite), Yusuf (zaman dilimi uyumu), Onur (coinin geçmişi) değişkenleri
# (tests/uye-ek-ozellik.js → uyeek-*.f32) Ozan'ın satırlarıyla (th, si) birleştirilir; her üye kendi değişkenleriyle uye-lambdarank.py ile aynı yöntemle eğitilir.
# Sorular: üye tek başına bilgi taşıyor mu (IC, iki yarı, son 12 ay, pencereler), Emre'yi / Ozan'ı tekrar ediyor mu, Ozan'a eklenince IC artıyor mu?
# Kullanım: python tests/uye-ek-lambdarank.py [--trees 200] [--maxtrain 300000] → tests/uye-ek-lambdarank-report.md
import json, sys, os, math, time, glob, numpy as np, pandas as pd, lightgbm as lgb
np.random.seed(1); HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
NTREE = int(arg('trees', 200)); MAXTR = int(arg('maxtrain', 300000)); GAP = 2; OUT = arg('out', os.path.join(HERE, 'uye-ek-lambdarank-report.md')); t0 = time.time()
meta = json.load(open(os.path.join(D, 'rank.json'))); COLS = meta['cols']; RAW = meta['feats']; XS = meta['xs']
X = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(COLS)) for f in sorted(glob.glob(os.path.join(D, 'rank-*.f32')))]); df = pd.DataFrame(X, columns=COLS); del X
em = json.load(open(os.path.join(D, 'uyeek.json'))); EX = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(em['cols'])) for f in sorted(glob.glob(os.path.join(D, 'uyeek-*.f32')))])
ex = pd.DataFrame(EX, columns=em['cols']); del EX; ex['th'] = ex.th.round().astype(np.int64); ex['si'] = ex.si.round().astype(np.int64)
df = df[np.isfinite(df.y4v)].copy(); df['th'] = df.th.round().astype(np.int64); df['si'] = df.si.round().astype(np.int64); n0 = len(df)
df = df.merge(ex.drop_duplicates(['th', 'si']), on=['th', 'si'], how='left'); print('birleşen satır', int(df[em['ker'][0]].notna().sum()), '/', n0, flush=True)
df['t'] = df.th*3600000 + meta['t0']; df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
df = df.sort_values(['th', 'si']).reset_index(drop=True)
for k in XS: df['x_'+k] = df.groupby('th')[k].rank(pct=True).astype(np.float32)
HZ = {'4 sa': 'y4v', '12 sa': 'y12v'}
for h, yc in HZ.items():
    df[yc+'c'] = df[yc].clip(-5, 5); df[yc+'r'] = np.floor(df.groupby('th')[yc+'c'].rank(pct=True, method='first').values*10 - 1e-9).clip(0, 9)
UYE = {
  'Emre (trend)':        ['dS20','dS50','dS100','z9d','z14d','z30d','z90d','pos30d','pos9d','ddHi90','x_z9d','x_z30d'],
  'Kerem (likidite)':    em['ker'],
  'Yusuf (zaman dilimi)':em['yus'],
  'Onur (coin geçmişi)': em['onu'],
}
UYE = {k: [c for c in v if c in df.columns] for k, v in UYE.items()}
UYE['Ozan (hepsi)'] = RAW + ['x_'+k for k in XS]
UYE['Ozan + üç üye'] = UYE['Ozan (hepsi)'] + em['ker'] + em['yus'] + em['onu']
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
print('satır', len(df), 'saat', df.th.nunique(), flush=True)
months = sorted(df.month.unique()); starts = [m for m in months if m >= '2024-06'][::6]; oos = {}
for m0 in starts:
    test_m = [m for m in months if m >= m0][:6]; tmin = df[df.month == m0].t.min()
    tr_idx = df.index[df.t < tmin - GAP*864e5].values; te_idx = df.index[df.month.isin(test_m)].values
    if len(tr_idx) > MAXTR: tr_idx = np.sort(np.random.choice(tr_idx, MAXTR, replace=False))
    tr = df.loc[tr_idx]; te = df.loc[te_idx]
    for name, feats in UYE.items():
        for h, yc in HZ.items():
            m = fit(tr, feats, yc+'r'); o = pd.DataFrame({'t': te.t.values, 'th': te.th.values, 'si': te.si.values, 'p': m.predict(te[feats]), 'yc': te[yc+'c'].values})
            oos.setdefault((name, h), []).append(o); print(m0, name, h, fx(fast_ic(o, 'p', 'yc')), f'{time.time()-t0:.0f} sn', flush=True)
L = [f'# Kerem, Yusuf, Onur · yeni değişkenlerle lambdarank · {time.strftime("%Y-%m-%d")}', '',
     f'{len(df):,} satır, {df.th.nunique():,} saat, ayın ilk 30 coini. Hedef rank-model.py ile aynı (VWAP → VWAP, oynaklığa bölünmüş, saat içi onluk). Test 2024-06\'dan 6 aylık pencereler, boşluk {GAP} gün, {NTREE} ağaç.', '',
     '| Üye | Değişken | Ufuk | IC tümü | 1. yarı | 2. yarı | Son 12 ay | Pencereler |', '|---|---|---|---|---|---|---|---|']
P = {}
for (name, h), parts in oos.items():
    o = pd.concat(parts); mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5
    L.append(f'| {name} | {len(UYE[name])} | {h} | {fx(fast_ic(o,"p","yc"))} | {fx(fast_ic(o[o.t<mid],"p","yc"))} | {fx(fast_ic(o[o.t>=mid],"p","yc"))} | {fx(fast_ic(o[o.t>=y12],"p","yc"))} | ' + ' / '.join(fx(fast_ic(p,'p','yc')) for p in parts) + ' |')
    o['pr'] = o.groupby('th').p.rank(pct=True); P[(name, h)] = o.set_index(['th', 'si']).pr
for h in HZ:
    C = pd.DataFrame({n: P[(n, h)] for n in UYE}).dropna().corr()
    L += ['', f'## {h}: üye tahminlerinin benzerliği (saat içi sıra korelasyonu)', '', '```', C.round(2).to_string(), '```']
    # Ozan'a eklenen bilgi: üyelerin sıralarının ortalaması ↔ Ozan
    o = pd.DataFrame({n: P[(n, h)] for n in UYE}).dropna(); y = pd.concat(oos[('Ozan (hepsi)', h)]).set_index(['th', 'si']).yc.reindex(o.index)
    avg = o[['Kerem (likidite)', 'Yusuf (zaman dilimi)', 'Onur (coin geçmişi)']].mean(axis=1); tmp = pd.DataFrame({'th': o.index.get_level_values(0), 'p': avg.values, 'yc': y.values})
    L.append(f'Üç yeni üyenin sıra ortalaması IC {fx(fast_ic(tmp,"p","yc"))}; Ozan tek başına {fx(fast_ic(pd.concat(oos[("Ozan (hepsi)", h)]),"p","yc"))}.')
open(OUT, 'w', encoding='utf-8').write('\n'.join(L)+'\n'); print('\n'.join(L)); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
