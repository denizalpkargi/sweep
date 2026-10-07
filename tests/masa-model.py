# Adım 4b: puanı sonuçtan öğrenen model. Girdi: tests/data/arch/samples-*.jsonl (node tests/masa-archive.js).
# İleriye yürüyen pencere: her test dönemi (3 ay) yalnız kendinden önceki aylarla eğitilir (en az 12 ay), 1 günlük ara bırakılır.
# Modeller: bugünkü masa puanı (kıyas), üye oylarıyla ridge, üyeler + ham özelliklerle ridge, LightGBM (aynı girdiler).
# Ölçüler (yalnız örneklem dışı tahminler): aylık Spearman IC'nin ortalaması ve t'si (R ve 4 sa hareket f4 için), iki yarı ve son 24 ay,
# tahmin onluklarına göre ortalama R / isabet, her ay eğitim tahminlerinin üst %10 eşiğini geçen işlemlerin R'si (maliyet R'nin içinde).
# Kullanım: python3 tests/masa-model.py [--out rapor.md]
import json, glob, sys, os, math
import numpy as np, pandas as pd
from scipy.stats import spearmanr
import lightgbm as lgb
from sklearn.linear_model import Ridge

D = os.path.join(os.path.dirname(__file__), 'data', 'arch')
OUT = sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else os.path.join(os.path.dirname(__file__), 'masa-model-report.md')
rows = []
for f in sorted(glob.glob(os.path.join(D, 'samples-*.jsonl'))):
    with open(f) as fh:
        for l in fh:
            s = json.loads(l); r = {'t': s['t'], 'sym': s['sym'], 'dir': 1 if s['dir'] == 'long' else -1, 'veto': s['veto'], 'score': s['score'], 'yes': s['yes'], 'sd': s['sd'], 'kz': s['kz'],
                                    'R': s['R'], 'y': s['y'], 'f4': s['f4'], 'stage': s['stage'] or 'yok'}
            for k, (v, c, ab) in s['a'].items():
                r['m_'+k] = 0.0 if ab else (v or 0)*(c or 0); r['ab_'+k] = ab
            for k, v in s['x'].items(): r['x_'+k] = np.nan if v is None else v
            rows.append(r)
df = pd.DataFrame(rows); df = df[df.veto == 0].copy()
df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
df['Rc'] = df.R.clip(-1.5, 3); df['f4c'] = df.f4.clip(-5, 5)
df['stage_c'] = df.stage.astype('category').cat.codes
MEM = [c for c in df.columns if c.startswith('m_')]; AB = [c for c in df.columns if c.startswith('ab_')]; X = [c for c in df.columns if c.startswith('x_')]
ALL = MEM + AB + X + ['dir', 'kz', 'sd', 'stage_c']
months = sorted(df.month.unique()); print('örnek', len(df), 'coin', df.sym.nunique(), 'ay', months[0], '→', months[-1], 'taban R', round(df.R.mean(), 3), 'isabet', round(df.y.mean(), 3))

def fit_pred(name, tr, te):
    if name == 'puan': return te.score.values, tr.score.values
    if name.startswith('ridge'):
        cols = MEM if name == 'ridge_üye' else ALL
        mu = tr[cols].mean(); sd = tr[cols].std().replace(0, 1)
        Z = lambda d: ((d[cols].fillna(mu) - mu) / sd).values
        m = Ridge(alpha=100.0).fit(Z(tr), tr.Rc.values); return m.predict(Z(te)), m.predict(Z(tr))
    m = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.03, num_leaves=15, min_child_samples=400, subsample=0.7, subsample_freq=1, colsample_bytree=0.7, reg_lambda=5, verbose=-1)
    m.fit(tr[ALL], tr.Rc.values); fit_pred.imp = dict(zip(ALL, m.feature_importances_)); return m.predict(te[ALL]), m.predict(tr[ALL])

MODELS = ['puan', 'ridge_üye', 'ridge_tüm', 'lgbm']
oos = {m: [] for m in MODELS}; imps = []
start = 12
for i in range(start, len(months), 3):
    test_m = months[i:i+3]; tr = df[df.month < months[i]]; tr = tr[tr.t < df[df.month == months[i]].t.min() - 864e5]; te = df[df.month.isin(test_m)]
    if len(te) == 0: continue
    for m in MODELS:
        p, ptr = fit_pred(m, tr, te); thr = np.quantile(ptr, 0.9)
        oos[m].append(pd.DataFrame({'t': te.t.values, 'month': te.month.values, 'sym': te.sym.values, 'dir': te.dir.values, 'p': p, 'top': p >= thr, 'R': te.R.values, 'y': te.y.values, 'f4': te.f4c.values}))
        if m == 'lgbm': imps.append(fit_pred.imp)
    print('test', test_m[0], 'eğitim', len(tr), 'test', len(te), flush=True)

def ic_stats(o, col):
    ics = [spearmanr(g.p, g[col]).correlation for _, g in o.groupby('month') if len(g) > 50 and g.p.std() > 0]
    ics = np.array([x for x in ics if not np.isnan(x)]); return (ics.mean() if len(ics) else np.nan), (ics.mean()/ics.std()*math.sqrt(len(ics)) if len(ics) > 2 and ics.std() > 0 else np.nan), len(ics)

lines = ['# Puanı öğrenen model · ileriye yürüyen test', '', f'Örnek {len(df):,} (veto hariç), {df.sym.nunique()} coin, {months[0]} → {months[-1]}. Taban: R {df.R.mean():+.3f}, isabet %{100*df.y.mean():.1f}. Örneklem dışı dönem {months[start]} → {months[-1]}.', '']
lines += ['| Model | Dönem | IC (R) | t | IC (4 sa) | t | Üst %10 n | Üst %10 R | Üst %10 isabet |', '|---|---|---|---|---|---|---|---|---|']
summary = {}
for m in MODELS:
    o = pd.concat(oos[m]); mid = np.sort(o.t.values)[len(o)//2]; last24 = o.t.max() - 730*864e5
    for nm, sub in [('tümü', o), ('1. yarı', o[o.t < mid]), ('2. yarı', o[o.t >= mid]), ('son 24 ay', o[o.t >= last24])]:
        a, at, _ = ic_stats(sub, 'R'); b, bt, _ = ic_stats(sub, 'f4'); tp = sub[sub.top]
        lines.append(f'| {m} | {nm} | {a:+.3f} | {at:+.1f} | {b:+.3f} | {bt:+.1f} | {len(tp):,} | {tp.R.mean():+.3f} | %{100*tp.y.mean():.1f} |')
        summary[(m, nm)] = dict(icR=a, icRt=at, icF=b, icFt=bt, topN=len(tp), topR=tp.R.mean())
lines += ['', '## Tahmin onluklarına göre (örneklem dışı, ay içinde sıralı)', '']
for m in ['puan', 'lgbm', 'ridge_tüm']:
    o = pd.concat(oos[m]).copy(); o['dec'] = o.groupby('month').p.transform(lambda s: pd.qcut(s.rank(method='first'), 10, labels=False))
    g = o.groupby('dec').agg(n=('R', 'size'), R=('R', 'mean'), y=('y', 'mean'), f4=('f4', 'mean'))
    lines += [f'**{m}**', '', '| Onluk | n | R | isabet | 4 sa ATR |', '|---|---|---|---|---|'] + [f'| {int(d)+1} | {r.n:,} | {r.R:+.3f} | %{100*r.y:.1f} | {r.f4:+.3f} |' for d, r in g.iterrows()] + ['']
imp = pd.DataFrame(imps).mean().sort_values(ascending=False)
lines += ['## LightGBM: en çok kullanılan girdiler', '', ', '.join(f'{k} ({v:.0f})' for k, v in imp.head(15).items()), '']
# geçme kriteri (plan, Adım 4b): örneklem dışı IC ≥ 0,05 iki yarıda ve üst dilimde maliyet sonrası R > 0, iki yarıda
best = max(['ridge_üye', 'ridge_tüm', 'lgbm'], key=lambda m: summary[(m, 'tümü')]['icR'])
ok = all(summary[(best, h)]['icR'] >= 0.05 and summary[(best, h)]['topR'] > 0 for h in ['1. yarı', '2. yarı'])
lines += ['## Karar', '', f'En iyi model: {best}. Geçme kriteri (iki yarıda IC ≥ 0,05 ve üst %10 R > 0): **{"GEÇTİ" if ok else "GEÇMEDİ"}**.']
open(OUT, 'w').write('\n'.join(lines) + '\n'); print('\n'.join(lines))
