# Test #37 kalan kısımlar (10 Ekim 2026), Ozan sıralama modeli (src/rankmodel.js değişkenleri, tests/rank-model.py ile aynı veri ve bölünmeler):
#  (c) purged ileriye yürüyen doğrulamayla ayar ızgarası: yaprak 15/31/63 × min_child_samples 300/1000/3000 × ağaç 200/400, öğrenme oranı 0,03.
#      Seçim yalnız eğitimin içinde: eğitimin son 6 ayı doğrulama, iç eğitim doğrulamadan 2 gün önce biter. Seçilen ayar tüm eğitimle yeniden eğitilir, testte (OOS) raporlanır.
#      Bütün ızgara ayarlarının OOS IC'si de yazılır (seçimin işe yarayıp yaramadığını görmek için).
#  (a) değişken seçimi: (i) kazanç önemiyle ilk 30 (tam modelin eğitim verisindeki önemi), (ii) korelasyon kümeleme medoidleri (eğitim örnekleminde |Spearman|,
#      ortalama bağlantılı hiyerarşik kümeleme, 30 küme, her kümeden diğerleriyle en çok ilişkili değişken).
#  Taban: yayındaki model ayarları (31 yaprak, 1000, 200 ağaç). Öneri kuralı: 5 pencerenin ≥4'ünde ve son 12 ayda iyileşme.
# Kullanım: python3 tests/test37-ozan-izgara.py [--part grid|fsel|all] [--jobs 2] → tests/test37-ozan-izgara-report.md (ara sonuçlar tests/data/arch/test37-*.pkl)
import json, sys, os, math, time, glob, numpy as np, pandas as pd, lightgbm as lgb
from scipy.cluster.hierarchy import linkage, fcluster
from scipy.spatial.distance import squareform
np.random.seed(1); HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--' + k) + 1] if '--' + k in sys.argv else d
MAXTR = 300000; GAP = 2; JOBS = int(arg('jobs', 2)); PART = arg('part', 'all'); WIN_ONLY = arg('win', None); OUT = os.path.join(HERE, 'test37-ozan-izgara-report.md'); t0 = time.time()
meta = json.load(open(os.path.join(D, 'rank.json'))); COLS = meta['cols']; RAW = meta['feats']; XS = meta['xs']
X = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(COLS)) for f in sorted(glob.glob(os.path.join(D, 'rank-*.f32')))]); df = pd.DataFrame(X, columns=COLS); del X
df = df[np.isfinite(df.y4v)].copy(); df['th'] = df.th.round().astype(np.int64); df['t'] = df.th * 3600000 + meta['t0']; df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
df = df.sort_values(['th', 'si']).reset_index(drop=True)
for k in XS: df['x_' + k] = df.groupby('th')[k].rank(pct=True).astype(np.float32)
FEATS = RAW + ['x_' + k for k in XS]; HZ = {'4 sa': 'y4v', '12 sa': 'y12v'}
for h, yc in HZ.items(): df[yc + 'c'] = df[yc].clip(-5, 5); df[yc + 'r'] = np.floor(df.groupby('th')[yc + 'c'].rank(pct=True, method='first').values * 10 - 1e-9).clip(0, 9)
fx = lambda v, d=3: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
def fast_ic(o, pcol, ycol, key='th', minn=10):
    d = o[[key, pcol, ycol]].dropna()
    if len(d) < 50: return np.nan
    codes, _ = pd.factorize(d[key].values); n = np.bincount(codes); rp = d.groupby(key)[pcol].rank().values; ry = d.groupby(key)[ycol].rank().values
    sx = np.bincount(codes, rp); sy = np.bincount(codes, ry); sxx = np.bincount(codes, rp * rp); syy = np.bincount(codes, ry * ry); sxy = np.bincount(codes, rp * ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx * sy / n) / np.sqrt((sxx - sx * sx / n) * (syy - sy * sy / n))
    r = r[(n >= minn) & np.isfinite(r)]; return r.mean() if len(r) else np.nan
def fit(tr, feats, tg, leaves=31, mcs=1000, trees=200):
    trs = tr[np.isfinite(tr[tg].values)].sort_values('th'); grp = trs.groupby('th', sort=False).size().values
    return lgb.LGBMRanker(objective='lambdarank', n_estimators=trees, learning_rate=0.03, num_leaves=leaves, min_child_samples=mcs, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10,
                          label_gain=list(range(10)), lambdarank_truncation_level=30, verbose=-1, n_jobs=JOBS, random_state=1).fit(trs[feats], trs[tg].astype(int), group=grp)
def sample(idx, n):
    rs = np.random.RandomState(len(idx)); return np.sort(rs.choice(idx, n, replace=False)) if len(idx) > n else idx
GRID = [(l, m) for l in (15, 31, 63) for m in (300, 1000, 3000)]; TREES = (200, 400)
months = sorted(df.month.unique()); starts = [m for m in months if m >= '2024-06'][::6]
if WIN_ONLY: starts = [starts[int(i)] for i in WIN_ONLY.split(',')]
def medoids(tr, k=30):
    s = tr[FEATS].sample(min(60000, len(tr)), random_state=1).rank(); c = np.nan_to_num(s.corr().abs().values, nan=0.0); np.fill_diagonal(c, 1)
    Z = linkage(squareform(1 - c, checks=False), 'average'); lab = fcluster(Z, k, 'maxclust'); out = []
    for g in np.unique(lab):
        ii = np.where(lab == g)[0]; out.append(FEATS[ii[np.argmax(c[np.ix_(ii, ii)].mean(1))]])
    return out
for wi, m0 in zip(range(len(starts)), starts):
    tag = m0; pk = os.path.join(D, f'test37-{tag}.pkl'); R = pd.read_pickle(pk) if os.path.exists(pk) else {}
    test_m = [m for m in months if m >= m0][:6]; tmin = df[df.month == m0].t.min()
    tr_all = df.index[df.t < tmin - GAP * 864e5].values; te = df[df.month.isin(test_m)]
    tr = df.loc[sample(tr_all, MAXTR)]
    vstart = pd.Timestamp(tmin, unit='ms') - pd.DateOffset(months=6); vmin = vstart.value // 10**6; vmax = tmin - GAP * 864e5
    itr = df.loc[sample(df.index[df.t < vmin - GAP * 864e5].values, MAXTR)]; va = df[(df.t >= vmin) & (df.t < vmax)]
    print('pencere', m0, 'eğitim', len(tr), 'iç eğitim', len(itr), 'doğrulama', len(va), 'test', len(te), flush=True)
    for h, yc in HZ.items():
        if PART in ('grid', 'all'):
            for (l, m) in GRID:
                key = ('grid', h, l, m)
                if key in R: continue
                mv = fit(itr, FEATS, yc + 'r', l, m, 400); mo = fit(tr, FEATS, yc + 'r', l, m, 400); r = {}
                for nt in TREES:
                    r[('val', nt)] = fast_ic(pd.DataFrame({'th': va.th.values, 'p': mv.predict(va[FEATS], num_iteration=nt), 'y': va[yc + 'c'].values}), 'p', 'y')
                    r[('oos', nt)] = pd.DataFrame({'th': te.th.values.astype(np.int32), 'p': mo.predict(te[FEATS], num_iteration=nt).astype(np.float32), 'y': te[yc + 'c'].values.astype(np.float32)})
                R[key] = r; pd.to_pickle(R, pk)
                print(f'  {m0} {h} yaprak {l} mcs {m}: doğrulama {fx(r[("val", 200)])} / {fx(r[("val", 400)])}  OOS {fx(fast_ic(r[("oos", 200)], "p", "y"))} / {fx(fast_ic(r[("oos", 400)], "p", "y"))}  {time.time()-t0:.0f} sn', flush=True)
        if PART in ('fsel', 'all'):
            for kind in ('gain30', 'medoid30'):
                key = ('fsel', h, kind)
                if key in R: continue
                if kind == 'gain30':
                    base = fit(tr, FEATS, yc + 'r'); imp = pd.Series(base.booster_.feature_importance('gain'), index=FEATS).sort_values(ascending=False); fs = list(imp.index[:30])
                else: fs = medoids(tr)
                mo = fit(tr, fs, yc + 'r'); R[key] = {'feats': fs, 'oos': pd.DataFrame({'th': te.th.values.astype(np.int32), 'p': mo.predict(te[fs]).astype(np.float32), 'y': te[yc + 'c'].values.astype(np.float32)})}
                pd.to_pickle(R, pk); print(f'  {m0} {h} {kind}: OOS {fx(fast_ic(R[key]["oos"], "p", "y"))} {time.time()-t0:.0f} sn', flush=True)
if '--report' not in sys.argv and WIN_ONLY: sys.exit(0)
# --- rapor
allR = {m0: pd.read_pickle(os.path.join(D, f'test37-{m0}.pkl')) for m0 in [m for m in months if m >= '2024-06'][::6] if os.path.exists(os.path.join(D, f'test37-{m0}.pkl'))}
S = list(allR); TMAX = df.t.max(); y12 = TMAX - 365 * 864e5
L = [f'# Test #37 · Ozan: purged ayar ızgarası ve değişken seçimi · {time.strftime("%Y-%m-%d")}', '',
     f'Veri ve bölünmeler tests/rank-model.py ile aynı ({len(df):,} satır, src/rankmodel.js değişkenleri, {len(FEATS)} değişken; test 2024-06\'dan 6 aylık {len(S)} pencere, eğitim öncesi tüm veri en çok {MAXTR:,} satır, 2 gün boşluk). '
     'Izgara: yaprak 15/31/63 × min_child_samples 300/1000/3000 × ağaç 200/400, öğrenme oranı 0,03, diğerleri yayındaki modelle aynı. '
     'Seçim yalnız eğitimin içinde: eğitimin son 6 ayı doğrulama, iç eğitim doğrulamadan 2 gün önce biter (purged); seçilen ayar tüm eğitimle yeniden eğitilip testte ölçülür. IC saat içi Spearman.', '']
def per(oo):  # pencere listesi → tümü, yarılar, son 12 ay, pencereler
    oo = [x.assign(t=x.th.astype(np.int64) * 3600000 + meta['t0']) for x in oo]; o = pd.concat(oo); mid = np.sort(o.t.values)[len(o) // 2]
    return [fast_ic(o, 'p', 'y'), fast_ic(o[o.t < mid], 'p', 'y'), fast_ic(o[o.t >= mid], 'p', 'y'), fast_ic(o[o.t >= y12], 'p', 'y')] + [fast_ic(x, 'p', 'y') for x in oo]
HDR = '| {} | Ufuk | Tümü | 1. yarı | 2. yarı | Son 12 ay | ' + ' | '.join(S) + ' |'; SEP = '|---' * (6 + len(S)) + '|'
for h in HZ:
    if not all(('grid', h, 31, 1000) in allR[m0] for m0 in S): continue
    base = per([allR[m0][('grid', h, 31, 1000)][('oos', 200)] for m0 in S]); rows = {'taban (31, 1000, 200)': base}
    # seçilen ayar her pencerede
    chosen = []; sel_oos = []
    for m0 in S:
        cand = [(allR[m0][('grid', h, l, m)][('val', nt)], l, m, nt) for (l, m) in GRID for nt in TREES if ('grid', h, l, m) in allR[m0]]
        v, l, m, nt = max(cand); chosen.append(f'{m0}: {l}/{m}/{nt} (doğr. {fx(v)})'); sel_oos.append(allR[m0][('grid', h, l, m)][('oos', nt)])
    rows['doğrulamayla seçilen'] = per(sel_oos)
    for (l, m) in GRID:
        for nt in TREES:
            if (l, m, nt) == (31, 1000, 200): continue
            rows[f'{l} yaprak, {m}, {nt} ağaç'] = per([allR[m0][('grid', h, l, m)][('oos', nt)] for m0 in S])
    for kind, nm in (('gain30', 'kazançta ilk 30'), ('medoid30', 'küme medoidleri (30)')):
        if all(('fsel', h, kind) in allR[m0] for m0 in S): rows[nm] = per([allR[m0][('fsel', h, kind)]['oos'] for m0 in S])
    L += [f'## {h}', '', HDR.format('Ayar'), SEP]
    for nm, r in rows.items(): L.append(f'| {nm} | {h} | ' + ' | '.join(fx(x) for x in r) + ' |')
    L += ['', 'Tabana göre fark (pencere başına) ve öneri kuralı (≥4/5 pencere ve son 12 ayda iyileşme):', '', '| Ayar | Tümü | Son 12 ay | Artı pencere | Kural |', '|---|---|---|---|---|']
    for nm, r in rows.items():
        if nm.startswith('taban'): continue
        d = [a - b for a, b in zip(r, base)]; pw = sum(x > 0 for x in d[4:]); ok = pw >= 4 and d[3] > 0
        L.append(f'| {nm} | {fx(d[0])} | {fx(d[3])} | {pw}/{len(S)} | {"geçti" if ok else "—"} |')
    L += ['', 'Doğrulamanın seçtiği ayar (yaprak/min_child_samples/ağaç): ' + '; '.join(chosen), '']
    # doğrulama IC'si ile OOS IC'si arasındaki ilişki (ızgara içinde)
    rr = []
    for m0 in S:
        v = [allR[m0][('grid', h, l, m)][('val', nt)] for (l, m) in GRID for nt in TREES]; q = [fast_ic(allR[m0][('grid', h, l, m)][('oos', nt)], 'p', 'y') for (l, m) in GRID for nt in TREES]
        rr.append(pd.Series(v).corr(pd.Series(q), method='spearman'))
    L.append('Izgara içinde doğrulama IC\'si ile test IC\'sinin sıra korelasyonu, pencere başına: ' + ' / '.join(fx(x, 2) for x in rr)); L.append('')
    fs = [allR[m0][('fsel', h, 'medoid30')]['feats'] for m0 in S if ('fsel', h, 'medoid30') in allR[m0]]
    if fs: L.append('Küme medoidleri (son pencere): ' + ', '.join(fs[-1])); L.append('')
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L)); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
