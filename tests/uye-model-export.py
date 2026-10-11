# Eğitilmiş masa üyeleri (11 Ekim 2026; kullanıcı "direkt masayı bunlarla güncelleyelim" dedi): Ozan'ın saatlik değişkenleri üye alanlarına bölünür,
# her üye yalnız kendi değişkenleriyle LightGBM lambdarank (4 sa ve 12 sa) olarak tüm veriyle eğitilir ve src/uyemodel-data.js'e (UYE_MODEL) yazılır;
# tests/data/uye-parity.json'a 300 satırlık Python tahmini (tests/uye-test.js JS ağaçlarıyla birebir karşılaştırır).
# Ayarlar ve aileler tests/uye-lambdarank.py ile aynı (ileriye yürüyen sonuç: tests/uye-lambdarank-report.md). Arşiv: rank-*.f32 + rank.json (tests/rank-ozellik.js).
# Evren genişliği (12 Ekim 2026): --top100 trend,mom,… verilen aileler ayın ilk 100 coiniyle eğitilir (UYE_MODEL.fams[id].top = 100; x_ ve etiket ilk 100 içinde),
# diğerleri ilk 30 ile. Arşiv rank-ozellik.js --top 100 ile üretilmiş olmalı (ilk 30 alt kümesi universe.json'dan seçilir). Parite: ilk 100 aileleri rows100 satırlarıyla.
# Kullanım: python tests/uye-model-export.py [--trees 200] [--maxtrain 300000] [--top100 trend,mom]
import json, sys, os, time, glob, numpy as np, pandas as pd, lightgbm as lgb
np.random.seed(1); HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
NTREE = int(arg('trees', 200)); MAXTR = int(arg('maxtrain', 300000)); T100 = [x for x in str(arg('top100', '')).split(',') if x]; t0 = time.time()
meta = json.load(open(os.path.join(D, 'rank.json'))); COLS = meta['cols']; RAW = meta['feats']; XS = meta['xs']
X = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(COLS)) for f in sorted(glob.glob(os.path.join(D, 'rank-*.f32')))]); df = pd.DataFrame(X, columns=COLS); del X
df = df[np.isfinite(df.y4v)].copy(); df['th'] = df.th.round().astype(np.int64); df['t'] = df.th*3600000 + meta['t0']; df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
U = json.load(open(os.path.join(D, 'universe.json')))['months']; pos = {m: {s: i for i, s in enumerate(v)} for m, v in U.items()}; SYMS = meta['syms']
df['urk'] = [pos.get(m, {}).get(SYMS[int(round(s))], 999) for m, s in zip(df.month.values, df.si.values)]
HZ = {'4': 'y4v', '12': 'y12v'}
def prep(d):  # x_ dilimleri (canlıda rkPct ile aynı tanım) ve saat içi onluk etiket, d'nin evreni içinde
    d = d.sort_values(['th', 'si']).reset_index(drop=True)
    for k in XS: d['x_'+k] = d.groupby('th')[k].rank(pct=True).astype(np.float32)
    for h, yc in HZ.items():
        d[yc+'c'] = d[yc].clip(-5, 5); d[yc+'r'] = np.floor(d.groupby('th')[yc+'c'].rank(pct=True, method='first').values*10 - 1e-9).clip(0, 9)
    return d
D100 = prep(df[df.urk < 100]) if T100 else None; df = prep(df[df.urk < 30])
# üye id'leri committee.js DESK ile aynı
FAMS = {
  'trend': ['dS20','dS50','dS100','z9d','z14d','z30d','z90d','pos30d','pos9d','ddHi90','x_z9d','x_z30d'],
  'mom':   ['z15','z1','z4','z24','z48h','z3d','rsi15','rsi1h','bb15','pos24','pos48h','body1','jump','x_z1','x_z4','x_z24'],
  'vol':   ['vq1','vq4','vqD','vq7','lq24','vwD24','vwD4','x_vq1','x_lq24','x_vwD24'],
  'flow':  ['tk1','tk4','tk24','tk9d','x_tk24','oi1','oi2','oiTurn','tp','tpCh','gl','glCh','fr','x_fr','x_oi1'],
  'macro': ['rel1','rel4','rel24','beta','corr'],
  'risk':  ['rv','rvR','rv4h','rvD','rng24','x_rv'],
}
XSF = ['x_'+k for k in XS]
for k, v in FAMS.items():
    miss = [c for c in v if c not in RAW + XSF]; assert not miss, (k, miss)
def fit(tr, feats, tg):
    trs = tr[np.isfinite(tr[tg].values)].sort_values('th'); grp = trs.groupby('th', sort=False).size().values
    return lgb.LGBMRanker(objective='lambdarank', n_estimators=NTREE, learning_rate=0.03, num_leaves=31, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10,
                          label_gain=list(range(10)), lambdarank_truncation_level=30, verbose=-1, n_jobs=4).fit(trs[feats], trs[tg].astype(int), group=grp)
def f32dn(t):  # rank-model.py ile aynı: en büyük float32 ≤ t, en kısa ondalık
    if not np.isfinite(t) or abs(t) > 1e30: return float(t)
    f = np.float32(t)
    if float(f) > t: f = np.nextafter(f, np.float32(-np.inf))
    lo = float(f)
    for k in range(1, 18):
        for c in (float(f'{t:.{k}g}'), float(f'{lo:.{k}g}')):
            if lo <= c <= t: return c
    return float(t)
def conv(node, S):
    if 'leaf_value' in node: S['v'].append(float(f"{node['leaf_value']:.7g}")); return ~(len(S['v']) - 1)
    i = len(S['s']); S['s'].append(node['split_feature']); S['t'].append(f32dn(node['threshold'])); S['l'].append(0); S['r'].append(0)
    mt = {'None': 0, 'Zero': 2, 'NaN': 4}[node['missing_type']]; S['m'].append(mt | (1 if node['default_left'] else 0)); assert node['decision_type'] == '<='
    S['l'][i] = conv(node['left_child'], S); S['r'][i] = conv(node['right_child'], S); return i
def sets(d):  # eğitim örneklemi (rank-model.py --export ile aynı: en çok 2 × maxtrain) ve son 30 günden 300 parite satırı
    tr_idx = d.index.values
    if len(tr_idx) > MAXTR*2: tr_idx = np.sort(np.random.choice(tr_idx, MAXTR*2, replace=False))
    return d.loc[tr_idx], d.loc[np.sort(np.random.choice(d.index[d.t >= d.t.max() - 30*864e5].values, 300, replace=False))]
rows_of = lambda par: [[None if not np.isfinite(v) else float(v) for v in r] for r in par[RAW + XSF].values.tolist()]
tr, par = sets(df); parity = {'cols': RAW + XSF, 'rows': rows_of(par), 'pred': {}}
if T100: tr100, par100 = sets(D100); parity['rows100'] = rows_of(par100)
fams = {}
for fid, feats in FAMS.items():
    big = fid in T100; fams[fid] = {'models': {}, **({'top': 100} if big else {})}; parity['pred'][fid] = {}
    for h, yc in HZ.items():
        m = fit(tr100 if big else tr, feats, yc+'r'); trees = []
        for T in m.booster_.dump_model()['tree_info']:
            S = {'s': [], 't': [], 'm': [], 'l': [], 'r': [], 'v': []}; conv(T['tree_structure'], S); trees.append(S)
        fams[fid]['models'][h] = {'feats': feats, 'trees': trees}; parity['pred'][fid][h] = m.predict((par100 if big else par)[feats]).tolist()
        print(fid, h, 'sa', 'ilk 100' if big else 'ilk 30', len(trees), 'ağaç', f'{time.time()-t0:.0f} sn', flush=True)
js = '/* tests/uye-model-export.py ile üretildi (' + time.strftime('%Y-%m-%d') + f', {len(tr):,} satır ilk 30' + (f', {len(tr100):,} satır ilk 100 ({",".join(T100)})' if T100 else '') + f', 2022-01 → {df.month.max()}); elle düzenleme */\nconst UYE_MODEL=' + json.dumps({'at': time.strftime('%Y-%m-%d'), 'rows': len(tr), 'to': df.month.max(), 'fams': fams}, separators=(',', ':')) + ';\n'
open(os.path.join(HERE, '..', 'src', 'uyemodel-data.js'), 'w', encoding='utf-8').write(js); json.dump(parity, open(os.path.join(HERE, 'data', 'uye-parity.json'), 'w'), separators=(',', ':'))
print('yazıldı src/uyemodel-data.js', f'{len(js)/1024:.0f} KB', f'{time.time()-t0:.0f} sn')
