# Sıralama modeli (Ozan, src/rankmodel.js): canlıyla aynı JS değişkenleriyle (tests/rank-ozellik.js) LightGBM lambdarank.
# İleriye yürüyen: test 2024-06'dan 6 aylık 5 pencere (Denklem 4 ile aynı), eğitim öncesi tüm veri (en çok --maxtrain satır), boşluk 2 gün.
# Varyantlar: tam (ham + coinler arası dilim), dilimsiz, OI/kalabalık/fonlamasız. --export: son modeli tüm veriyle eğitip src/rankmodel-data.js'e yazar
# ve tests/data/rank-parity.json'a 300 satırlık Python tahmini koyar (tests/rank-test.js JS ağaçlarıyla birebir karşılaştırır).
# Kullanım: python3 tests/rank-model.py [--trees 200] [--leaves 31] [--maxtrain 300000] [--vars 0,1,2] [--hz "4 sa,12 sa"] [--export "tam"] [--noeval]
import json, sys, os, math, time, glob, numpy as np, pandas as pd, lightgbm as lgb
np.random.seed(1); HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
NTREE = int(arg('trees', 200)); LEAVES = int(arg('leaves', 31)); MAXTR = int(arg('maxtrain', 300000)); GAP = 2; OUT = arg('out', os.path.join(HERE, 'rank-model-report.md')); t0 = time.time()
meta = json.load(open(os.path.join(D, 'rank.json'))); COLS = meta['cols']; RAW = meta['feats']; XS = meta['xs']
X = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(COLS)) for f in sorted(glob.glob(os.path.join(D, 'rank-*.f32')))]); df = pd.DataFrame(X, columns=COLS); del X
df = df[np.isfinite(df.y4v)].copy(); df['th'] = df.th.round().astype(np.int64); df['t'] = df.th * 3600000 + meta['t0']; df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
df = df.sort_values(['th', 'si']).reset_index(drop=True)
for k in XS: df['x_' + k] = df.groupby('th')[k].rank(pct=True).astype(np.float32)  # canlıda rkPct ile aynı tanım
HZ = {'4 sa': ('y4v', 'p4'), '12 sa': ('y12v', 'p12')}; HZ = {k: v for k, v in HZ.items() if k in arg('hz', ','.join(HZ)).split(',')}
for h, (yc, _) in HZ.items():
    df[yc + 'c'] = df[yc].clip(-5, 5); df[yc + 'r'] = np.floor(df.groupby('th')[yc + 'c'].rank(pct=True, method='first').values * 10 - 1e-9).clip(0, 9)
XSF = ['x_' + k for k in XS]; THIN = ['oi1', 'oi2', 'oiTurn', 'tp', 'tpCh', 'gl', 'glCh', 'fr', 'x_fr', 'x_oi1']
VARS = [('tam', RAW + XSF), ('dilimsiz', RAW), ('OI/kalabalık/fonlamasız', [c for c in RAW + XSF if c not in THIN])]
VARS = [v for i, v in enumerate(VARS) if str(i) in arg('vars', '0,1,2').split(',')]
fx = lambda v, d=3: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
def fast_ic(o, pcol, ycol, key='th', minn=10):
    d = o[[key, pcol, ycol]].dropna()
    if len(d) < 50: return np.nan, np.nan, 0
    codes, _ = pd.factorize(d[key].values); n = np.bincount(codes)
    rp = d.groupby(key)[pcol].rank().values; ry = d.groupby(key)[ycol].rank().values
    sx = np.bincount(codes, rp); sy = np.bincount(codes, ry); sxx = np.bincount(codes, rp*rp); syy = np.bincount(codes, ry*ry); sxy = np.bincount(codes, rp*ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx*sy/n)/np.sqrt((sxx - sx*sx/n)*(syy - sy*sy/n))
    r = r[(n >= minn) & np.isfinite(r)]; return (r.mean() if len(r) else np.nan), (r.mean()/r.std()*math.sqrt(len(r)) if len(r) > 2 and r.std() > 0 else np.nan), len(r)
def fit(tr, feats, tg):
    trs = tr[np.isfinite(tr[tg].values)].sort_values('th'); grp = trs.groupby('th', sort=False).size().values
    return lgb.LGBMRanker(objective='lambdarank', n_estimators=NTREE, learning_rate=0.03, num_leaves=LEAVES, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10,
                          label_gain=list(range(10)), lambdarank_truncation_level=30, verbose=-1, n_jobs=4).fit(trs[feats], trs[tg].astype(int), group=grp)
print('satır', len(df), 'saat', df.th.nunique(), 'coin/saat', round(len(df)/df.th.nunique(), 1), f'{time.time()-t0:.0f} sn', flush=True)
L = [f'# Sıralama modeli (Ozan) · canlı değişkenlerle lambdarank · {time.strftime("%Y-%m-%d")}', '',
     f'{len(df):,} satır, {df.th.nunique():,} saat (2022-01 → {df.month.max()}), saat başına {len(df)/df.th.nunique():.1f} coin (ayın ilk 30\'u). Değişkenler src/rankmodel.js rkFeat (canlıyla aynı kod): {len(RAW)} ham + {len(XSF)} coinler arası dilim. '
     f'Hedef Denklem 4 ile aynı (VWAP → VWAP, oynaklığa bölünmüş, saat içi onluk etiketi). Test 2024-06\'dan 6 aylık pencereler, eğitim öncesi tüm veri (en çok {MAXTR:,} satır, rastgele), boşluk {GAP} gün; {NTREE} ağaç, {LEAVES} yaprak.', '']
if '--noeval' not in sys.argv:
    months = sorted(df.month.unique()); starts = [m for m in months if m >= '2024-06'][::6]; oos = {}
    for m0 in starts:
        test_m = [m for m in months if m >= m0][:6]; tmin = df[df.month == m0].t.min()
        tr_idx = df.index[(df.t < tmin - GAP*864e5)].values; te_idx = df.index[df.month.isin(test_m)].values
        if len(tr_idx) > MAXTR: tr_idx = np.sort(np.random.choice(tr_idx, MAXTR, replace=False))
        tr = df.loc[tr_idx]; te = df.loc[te_idx]; print('test', m0, 'eğitim', len(tr_idx), 'test', len(te_idx), flush=True)
        for name, feats in VARS:
            for h, (yc, pc) in HZ.items():
                m = fit(tr, feats, yc + 'r'); o = pd.DataFrame({'t': te.t.values, 'th': te.th.values, 'p': m.predict(te[feats]), 'yc': te[yc + 'c'].values, 'ret': te[pc].values})
                oos.setdefault((name, h), []).append((m0, o)); print(f'    {name} {h} IC {fx(fast_ic(o, "p", "yc")[0])} {time.time()-t0:.0f} sn', flush=True)
    L += ['## İleriye yürüyen IC (saat içi Spearman)', '', '| Model | Ufuk | Tümü | t | 1. yarı | 2. yarı | Son 12 ay | Pencereler |', '|---|---|---|---|---|---|---|---|']
    TR = ['', '## Onluklar ve 2+2 işlem (ham getiri, %)', '', 'Her saat en yüksek 2 coin long, en düşük 2 short, ufuk boyunca tutulur; taker gidiş-dönüş %0,16 (bacak başına). Saatler örtüşür, ortalama işlem başına.', '',
          '| Model | Ufuk | Alt onluk | Üst onluk | Üst−alt | Long bacak | Short bacak | 2+2 brüt | 2+2 taker sonrası | Son 12 ay taker sonrası |', '|---|---|---|---|---|---|---|---|---|---|']
    for (name, h), parts in oos.items():
        o = pd.concat([p for _, p in parts]); mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5
        a, at, _ = fast_ic(o, 'p', 'yc'); win = ' / '.join(fx(fast_ic(p, 'p', 'yc')[0]) for _, p in parts)
        L.append(f'| {name} | {h} | {fx(a)} | {fx(at, 1)} | {fx(fast_ic(o[o.t < mid], "p", "yc")[0])} | {fx(fast_ic(o[o.t >= mid], "p", "yc")[0])} | {fx(fast_ic(o[o.t >= y12], "p", "yc")[0])} | {win} |')
        def tr22(s):
            s = s.dropna(subset=['ret']).copy(); s['rk'] = s.groupby('th')['p'].rank(method='first'); s['n'] = s.groupby('th')['p'].transform('size'); s['dec'] = np.floor(s.groupby('th')['p'].rank(method='first', pct=True)*10 - 1e-9).clip(0, 9)
            lg = s[s.rk > s.n - 2].groupby('th').ret.mean()*100; sh = -s[s.rk <= 2].groupby('th').ret.mean()*100
            return s[s.dec == 0].ret.mean()*100, s[s.dec == 9].ret.mean()*100, lg.mean(), sh.mean(), (lg.mean() + sh.mean())/2
        b, t_, lgm, shm, both = tr22(o); _, _, _, _, b12 = tr22(o[o.t >= y12])
        TR.append(f'| {name} | {h} | {fx(b, 3)} | {fx(t_, 3)} | {fx(t_-b, 3)} | {fx(lgm, 3)} | {fx(shm, 3)} | {fx(both, 3)} | {fx(both-0.16, 3)} | {fx(b12-0.16, 3)} |')
    L += TR
EXP = arg('export', None)
if EXP:
    feats = dict(VARS)[EXP] if EXP in dict(VARS) else RAW + XSF; models = {}; tr_idx = df.index.values
    if len(tr_idx) > MAXTR*2: tr_idx = np.sort(np.random.choice(tr_idx, MAXTR*2, replace=False))
    tr = df.loc[tr_idx]; par = df.loc[np.sort(np.random.choice(df.index[df.t >= df.t.max() - 30*864e5].values, 300, replace=False))]; parity = {'rows': [], 'pred': {}}
    for r in par[RAW + XSF].values.tolist(): parity['rows'].append([None if not np.isfinite(v) else float(v) for v in r])
    def conv(node, S):
        if 'leaf_value' in node: S['v'].append(float(f"{node['leaf_value']:.7g}")); return ~(len(S['v']) - 1)
        i = len(S['s']); S['s'].append(node['split_feature']); S['t'].append(float(node['threshold'])); S['l'].append(0); S['r'].append(0)
        mt = {'None': 0, 'Zero': 2, 'NaN': 4}[node['missing_type']]; S['m'].append(mt | (1 if node['default_left'] else 0)); assert node['decision_type'] == '<='
        S['l'][i] = conv(node['left_child'], S); S['r'][i] = conv(node['right_child'], S); return i
    for h, (yc, _) in HZ.items():
        m = fit(tr, feats, yc + 'r'); dm = m.booster_.dump_model(); trees = []
        for T in dm['tree_info']:
            S = {'s': [], 't': [], 'm': [], 'l': [], 'r': [], 'v': []}; conv(T['tree_structure'], S); trees.append(S)
        models[h.split()[0]] = {'feats': feats, 'trees': trees}; parity['pred'][h.split()[0]] = m.predict(par[feats]).tolist(); print('model', h, len(trees), 'ağaç', f'{time.time()-t0:.0f} sn', flush=True)
        imp = pd.Series(m.booster_.feature_importance('gain'), index=feats).sort_values(ascending=False); L += ['', f'Dışa aktarılan {h} modelinde en çok kazanç sağlayan değişkenler: ' + ', '.join(f'{k} {v/imp.sum()*100:.0f}%' for k, v in imp.head(12).items())]
    parity['cols'] = RAW + XSF
    js = '/* tests/rank-model.py --export ile üretildi (' + time.strftime('%Y-%m-%d') + f', {len(tr):,} satır, 2022-01 → {df.month.max()}); elle düzenleme */\nconst RK_MODEL=' + json.dumps({'at': time.strftime('%Y-%m-%d'), 'rows': len(tr), 'to': df.month.max(), 'models': models}, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, '..', 'src', 'rankmodel-data.js'), 'w').write(js); json.dump(parity, open(os.path.join(HERE, 'data', 'rank-parity.json'), 'w'), separators=(',', ':'))
    L += ['', f'Model dosyası src/rankmodel-data.js {len(js)/1024:.0f} KB ({EXP}).']
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L)); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
