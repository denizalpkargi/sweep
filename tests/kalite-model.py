# Kalite short sepeti modeli (11 Ekim 2026, test #52; kullanıcı "evet" dedi): Ozan işlem kalitesi modelinin yalnız masa değişkenleriyle (B) sürümü,
# hedef g72x (72 sa kapanıştan kapanışa, yönde, maliyet + fonlama düşülmüş, aynı andaki (t, yön) kararların ortalamasından fark).
# Değişkenler masa-archive.js örneklerinden (canlıda src/kshort.js ksRow aynısını kurar): puan, evet, sd, kill zone, aşama, 10 üyenin açılış oyu ve
# güveni (çekimser → NaN), 20 piyasa ölçüsü (yönlü olanlar short'ta eksi), yön.
# 1) İleri yürüyen kontrol (2022-01'den 6 ayda bir, öncesiyle eğit, 2 gün boşluk) — tests/ozan-kalite-model.py --target g72x --sets B ile aynı kurgu.
# 2) Tüm veriyle son model → src/kshort-data.js (ağaç biçimi src/rankmodel.js rkTree ile aynı) + tests/data/kshort-parity.json (JS ↔ Python).
# Eşik: masanın girdiği kararlarda (veto yok, puan ≥ 0,35, evet ≥ 3) örneklem dışı tahminlerin son 90 günlük %30 / %50 yüzdeliği (canlıda başlangıç değeri).
# Kullanım: python3 tests/kalite-model.py [--trees 240] → tests/kalite-model-report.md
import os, sys, json, glob, time
import numpy as np, pandas as pd
import lightgbm as lgb
HERE = os.path.dirname(os.path.abspath(__file__)); ARCH = os.path.join(HERE, 'data', 'arch')
A = sys.argv[1:]; arg = lambda k, d: A[A.index('--'+k)+1] if '--'+k in A else d
NT = int(arg('trees', 240)); DAY = 864e5; H4 = 4*3600*1000; t0 = time.time()
AG = ['trend', 'liq', 'flow', 'macro', 'quant', 'mom', 'vol', 'check', 'fac', 'risk']
XK = ['atrp', 'r1', 'r4', 'r24', 'r7d', 'r30d', 's20', 's50', 's200', 'pos24', 'vq', 'tk', 'vol30', 'b4', 'b24', 'bs200', 'bs50', 'fr', 'hr', 'dow']
FEATS = ['L', 'score', 'yes', 'sd', 'kz', 'stage'] + [p+k for k in AG for p in ('v_', 'c_')] + XK
rows = []
for f in sorted(glob.glob(os.path.join(ARCH, 'samples-*.jsonl'))):
    for l in open(f, encoding='utf-8'):
        s = json.loads(l)
        if s['R'] is None: continue
        r = {'sym': s['sym'], 't': s['t'], 'L': 1 if s['dir'] == 'long' else 0, 'veto': s['veto'], 'score': s['score'] if s['score'] is not None else 0.0,
             'yes': s['yes'], 'sd': s['sd'], 'kz': s['kz'], 'stage_s': s['stage'] or 'yok'}
        for k in AG:
            v, c, ab = s['a'].get(k, [0, 0, 1]); r['v_'+k] = np.nan if ab else v; r['c_'+k] = np.nan if ab else c
        for k in XK:
            v = s['x'].get(k); r[k] = np.nan if v is None else v
        rows.append(r)
df = pd.DataFrame(rows); del rows
STAGES = sorted(df.stage_s.unique().tolist()); df['stage'] = df.stage_s.map({k: i for i, k in enumerate(STAGES)}).astype(float)
print('örnek', len(df), 'coin', df.sym.nunique(), f'{time.time()-t0:.0f} sn', flush=True)
# g72: sonraki 18 adımın (4 sa) long satırındaki r4'ünden basit getiri, yönde, fonlama (adım başına son oranın yarısı) ve gidiş-dönüş %0,16 düşülmüş
raw = df[df.L == 1][['sym', 't', 'r4', 'fr']].drop_duplicates(['sym', 't']).sort_values(['sym', 't']); out = []
for s_, g in raw.groupby('sym'):
    g = g.set_index('t').reindex(np.arange(g.t.min(), g.t.max()+1, H4)); n = 18
    lr = g.r4.shift(-1).rolling(n).sum().shift(-(n-1)); fs_ = (g.fr.fillna(0)/2).shift(-1).rolling(n).sum().shift(-(n-1))
    out.append(pd.DataFrame({'sym': s_, 't': g.index, 'lr': lr.values, 'fs': fs_.values}))
o = pd.concat(out).dropna(); m = df[['sym', 't', 'L']].merge(o, on=['sym', 't'], how='left'); sg = np.where(m.L == 1, 1.0, -1.0)
df['g72'] = (sg*(np.exp(m.lr)-1) - sg*m.fs - 0.0016).values*100
df = df[(df.veto == 0) & np.isfinite(df.g72)].reset_index(drop=True)
df['ent'] = (df.score >= 0.35) & (df.yes >= 3)
yc = df.g72.clip(-30, 30); df['y'] = yc - yc.groupby([df.t, df.L]).transform('mean')
trm = (df.score >= 0.15).values; X = df[FEATS].to_numpy(np.float32)
P = dict(n_estimators=NT, learning_rate=0.03, num_leaves=15, min_child_samples=400, subsample=0.7, subsample_freq=1, colsample_bytree=0.7, reg_lambda=50, verbose=-1)
# 1) ileri yürüyen
starts = pd.date_range('2022-01-01', '2026-10-01', freq='6MS'); pr = np.full(len(df), np.nan)
for i, a in enumerate(starts):
    a_ = int(a.value//10**6); b_ = int((starts[i+1] if i+1 < len(starts) else pd.Timestamp('2026-11-01')).value//10**6)
    tr = trm & (df.t.values < a_-2*DAY); te = (df.t.values >= a_) & (df.t.values < b_) & df.ent.values
    if te.sum() == 0: continue
    mm = lgb.LGBMRegressor(**P).fit(X[tr], df.y.values[tr]); pr[te] = mm.predict(X[te]); print('pencere', a.date(), te.sum(), f'{time.time()-t0:.0f} sn', flush=True)
d = df[np.isfinite(pr)].copy(); d['p'] = pr[np.isfinite(pr)]; d = d.sort_values('t')
tv, pv = d.t.values, d.p.values; q = {}
for t in np.unique(tv):
    lo, hi = np.searchsorted(tv, t-90*DAY), np.searchsorted(tv, t); q[t] = np.quantile(pv[lo:hi], [0.3, 0.5]) if hi-lo >= 500 else (np.nan, np.nan)
d['q30'] = [q[t][0] for t in tv]; d['k30'] = (d.p >= d.q30) | d.q30.isna()
L = [f'# Kalite short sepeti modeli (B, g72x)\n\n{time.strftime("%Y-%m-%d")} · `python3 tests/kalite-model.py`\n',
     f'Örnek {len(df):,} (veto dışı, g72 tanımlı), eğitim puan ≥ 0,15, {NT} ağaç (lr 0,03, 15 yaprak, en az 400 örnek, alt örnek 0,7, λ 50). Değerlendirme masanın girdiği kararlarda, örneklem dışı 2022-01 →. g72: % işlem başı, 72 sa kapanıştan kapanışa.\n',
     '| yön | karar | g72 tümü | en kötü %30 atılınca | atılanlar | fark |', '|---|---:|---:|---:|---:|---:|']
for nm, dd in [('hepsi', d), ('short', d[d.L == 0]), ('long', d[d.L == 1])]:
    L.append(f'| {nm} | {len(dd):,} | {dd.g72.mean():+.3f} | {dd.g72[dd.k30].mean():+.3f} (%{100*dd.k30.mean():.0f}) | {dd.g72[~dd.k30].mean():+.3f} | {dd.g72[dd.k30].mean()-dd.g72.mean():+.3f} |')
yr = d[d.L == 0].groupby(pd.to_datetime(d[d.L == 0].t, unit='ms').dt.year).apply(lambda g: f'{g.g72[g.k30].mean()-g.g72.mean():+.3f}')
L += ['', 'Short, yıl yıl fark (kalan − tümü): ' + ' · '.join(f'{k} {v}' for k, v in yr.items())]
last = d[d.t >= d.t.max()-90*DAY]; thr30, thr50 = [float(x) for x in np.quantile(last.p, [0.3, 0.5])]
L += ['', f'Son 90 günün örneklem dışı tahminlerinden eşik: %30 → {thr30:.4f}, %50 → {thr50:.4f} ({len(last)} karar). Canlıda başlangıç değeri; 90 günlük canlı tahmin birikince onunla güncellenir.']
# 2) son model
mm = lgb.LGBMRegressor(**P).fit(X[trm], df.y.values[trm]); dm = mm.booster_.dump_model()
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
trees = []
for T in dm['tree_info']:
    S = {'s': [], 't': [], 'm': [], 'l': [], 'r': [], 'v': []}; conv(T['tree_structure'], S); trees.append(S)
imp = pd.Series(mm.booster_.feature_importance('gain'), index=FEATS).sort_values(ascending=False)
L += ['', 'Son modelde en çok kazanç: ' + ', '.join(f'{k} {v/imp.sum()*100:.0f}%' for k, v in imp.head(12).items())]
to = pd.to_datetime(df.t.max(), unit='ms').strftime('%Y-%m-%d')
js = (f'/* tests/kalite-model.py ile üretildi ({time.strftime("%Y-%m-%d")}, {int(trm.sum()):,} satır, 2020-06 → {to}); elle düzenleme */\nconst KS_MODEL='
      + json.dumps({'at': time.strftime('%Y-%m-%d'), 'rows': int(trm.sum()), 'to': to, 'feats': FEATS, 'stages': STAGES, 'thr30': round(thr30, 6), 'thr50': round(thr50, 6), 'trees': trees}, separators=(',', ':')) + ';\n')
open(os.path.join(HERE, '..', 'src', 'kshort-data.js'), 'w', encoding='utf-8').write(js)
rng = np.random.default_rng(7); pi = rng.choice(np.where(df.ent.values & (df.t.values >= df.t.max()-60*DAY))[0], 300, replace=False)
Xp = X[pi]; parity = {'cols': FEATS, 'rows': [[None if not np.isfinite(v) else float(v) for v in r] for r in Xp.tolist()], 'pred': mm.predict(Xp).tolist()}
json.dump(parity, open(os.path.join(HERE, 'data', 'kshort-parity.json'), 'w'), separators=(',', ':'))
L += ['', f'Model dosyası src/kshort-data.js {len(js)/1024:.0f} KB, aşamalar: {", ".join(STAGES)}.']
open(os.path.join(HERE, 'kalite-model-report.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n'); print('\n'.join(L)); print(f'{time.time()-t0:.0f} sn')
