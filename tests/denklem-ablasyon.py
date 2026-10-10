# Denklem 3 · yeni değişkenlerin katkısı (9 Ekim 2026). 207 sütunlu tabloda (denklem-ozellik.js) LightGBM, VWAP hedefi:
# eğitim 2025-04 öncesi (1 gün ara), test 2025-04 sonrası. Varyantlar: tümü, eski 127, yalnız yeni 80, yeni gruplardan biri çıkarılmış.
# Ayrıca yeni değişkenlerin tek başına IC'si (eğitim 1. yarı / 2. yarı / test) ve "tümü" modelinde en önemli 40 girdi.
# Kullanım: python3 tests/denklem-ablasyon.py [--split 2025-04] [--from 2021-01] [--out rapor.md]
import json, sys, os, math, time
import numpy as np, pandas as pd, lightgbm as lgb
D = os.path.join(os.path.dirname(__file__), 'data', 'arch'); arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
OUT = arg('out', os.path.join(os.path.dirname(__file__), 'denklem-ablasyon-report.md')); SPLIT = arg('split', '2025-04'); FROM = arg('from', '2021-01'); t0 = time.time()
meta = json.load(open(os.path.join(D, 'denklem.json'))); COLS = meta['cols']
X = np.fromfile(os.path.join(D, 'denklem.f32'), dtype=np.float32).reshape(-1, len(COLS)); df = pd.DataFrame(X, columns=COLS); del X
df = df[np.isfinite(df.y1v) & np.isfinite(df.y4v)].copy(); df['t'] = df.th.astype(np.int64)*3600000 + meta['t0']; df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
df = df[df.month >= FROM].copy(); df['y1c'] = df.y1v.clip(-5, 5); df['y4c'] = df.y4v.clip(-5, 5)
DROP = {'sym', 'th', 'y1', 'y4', 'y24', 'y1v', 'y4v', 'sd15', 't', 'month', 'y1c', 'y4c'}
i_new = COLS.index('sessId'); OLD = [c for c in COLS[:i_new] if c not in DROP]; NEW = [c for c in COLS[i_new:] if c not in DROP]; ALL = OLD + NEW
GROUPS = {'seans açılışı': ['sessId','sinceSess','sOpen2','sOpenRet','sOpenPos','orBrk','orSize','prevSessRet','asiaRet','ldnRet'],
          'gün/hafta/ay yapısı 2': ['pdRet','pdClosePos','pdRng','pdBrk','insideDay','dPos','sinceDH','sinceDL','trendDay','pdVwap','pdPoc','pwh','pwl','wkPos','moOpen','cmeGap','rnd'],
          'mum kalıpları / saatlik teknikler': ['engulf','pin','inside15','nr4','sma2050','dx14','di14','macdH','sqz','vr','skew7','kurt7','jump24','r1l1','r1l2','r1l3','r1l4'],
          'hacim 2': ['vqHr','vClimax','vClimaxDir','deltaZ','cvdDiv','vwapW'], 'OI / fonlama 2': ['oiDay','liqProxy','oiHi30','frSum7'],
          'BTC / piyasa 2': ['bCorr7','bBeta7','bLead15','ethBtc24','bMinusAlt24','xsVol24','xsR15'],
          'takvim': ['toFomc','fromFomc','toCpi','fromCpi','toNfp','fromNfp','evWin','toOptExp','toWkExp','cmeOpen','sinceHalving','ddAth','daysAth','bDdAth']}
tmin = df[df.month >= SPLIT].t.min(); tr = df[df.t < tmin - 864e5]; te = df[df.month >= SPLIT]
mid_tr = np.sort(tr.t.values)[len(tr)//2]; last6 = te.t.max() - 183*864e5
print('eğitim', len(tr), 'test', len(te), 'eski', len(OLD), 'yeni', len(NEW), flush=True)
fx = lambda v, d=3: ('—' if not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
def fast_ic(o, pcol, ycol, key='th', minn=10):
    d = o[[key, pcol, ycol]].dropna()
    if len(d) == 0: return np.nan, np.nan, 0
    codes, _ = pd.factorize(d[key].values); n = np.bincount(codes); rp = d.groupby(key)[pcol].rank().values; ry = d.groupby(key)[ycol].rank().values
    sx = np.bincount(codes, rp); sy = np.bincount(codes, ry); sxx = np.bincount(codes, rp*rp); syy = np.bincount(codes, ry*ry); sxy = np.bincount(codes, rp*ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx*sy/n)/np.sqrt((sxx - sx*sx/n)*(syy - sy*sy/n))
    r = r[(n >= minn) & np.isfinite(r)]; return (r.mean() if len(r) else np.nan), (r.mean()/r.std()*math.sqrt(len(r)) if len(r) > 2 and r.std() > 0 else np.nan), len(r)
P = dict(n_estimators=400, learning_rate=0.03, num_leaves=31, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10, verbose=-1, n_jobs=4)
trs = tr.sample(min(len(tr), 900000), random_state=1)
L = [f'# Denklem 3 · yeni 80 değişkenin katkısı · {time.strftime("%Y-%m-%d")}', '', f'Eğitim {FROM} → {SPLIT} öncesi ({len(trs):,} örnek), test {SPLIT} sonrası ({len(te):,} saat, {te.sym.nunique()} coin). LightGBM, hedef VWAP→VWAP 1 sa ve 4 sa (oynaklık biriminde). IC = saatlik coinler arası Spearman.', '',
     '| Girdi kümesi | Değişken | IC 1 sa test | t | IC 1 sa son 6 ay | IC 4 sa test | t | IC 4 sa son 6 ay |', '|---|---|---|---|---|---|---|---|']
variants = [('tümü (207)', ALL), ('eski 127', OLD), ('yalnız yeni 80', NEW)] + [(f'tümü − {g}', [c for c in ALL if c not in set(fs)]) for g, fs in GROUPS.items()]
imp_all = None
for nm, feats in variants:
    o = te[['th', 't', 'y1c', 'y4c']].copy()
    for tg in ['y1c', 'y4c']:
        m = lgb.LGBMRegressor(**P).fit(trs[feats], trs[tg]); o['p'+tg] = m.predict(te[feats])
        if nm.startswith('tümü (') and tg == 'y1c': imp_all = pd.Series(m.booster_.feature_importance('gain'), index=feats).sort_values(ascending=False)
    a, at, _ = fast_ic(o, 'py1c', 'y1c'); a6, _, _ = fast_ic(o[o.t >= last6], 'py1c', 'y1c'); b, bt, _ = fast_ic(o, 'py4c', 'y4c'); b6, _, _ = fast_ic(o[o.t >= last6], 'py4c', 'y4c')
    L.append(f'| {nm} | {len(feats)} | {fx(a)} | {fx(at,1)} | {fx(a6)} | {fx(b)} | {fx(bt,1)} | {fx(b6)} |'); print(nm, fx(a), fx(b), f'{time.time()-t0:.0f} sn', flush=True)
L += ['', 'Okuma: "tümü − grup" satırı tümünden belirgin düşükse o grup bilgi taşıyor; "yalnız yeni 80" eski 127\'ye yakınsa yeni değişkenler eskilerin bilgisini başka biçimde taşıyor.', '']
L += ['## "Tümü" modelinde en önemli 40 girdi (kazanç payı; ★ = yeni)', '', '| # | Değişken | Pay |', '|---|---|---|']
tot = imp_all.sum()
for i, (c, v) in enumerate(imp_all.head(40).items()): L.append(f'| {i+1} | {"★ " if c in NEW else ""}{c} | %{100*v/tot:.1f} |'.replace('.', ','))
L += ['', '## Yeni değişkenlerin tek başına IC\'si (1 sa VWAP; eğitim 1. yarı / eğitim 2. yarı / test), |IC| ≥ 0,01 ve üç dönemde aynı işaretli olanlar kalın', '', '| Değişken | Grup | IC eğitim 1 | IC eğitim 2 | IC test | t test |', '|---|---|---|---|---|---|']
grpOf = {c: g for g, fs in GROUPS.items() for c in fs}
rows = []
for c in NEW:
    a1 = fast_ic(tr[tr.t < mid_tr][['th', c, 'y1c']].rename(columns={c: 'p'}), 'p', 'y1c')[0]; a2 = fast_ic(tr[tr.t >= mid_tr][['th', c, 'y1c']].rename(columns={c: 'p'}), 'p', 'y1c')[0]; a3, t3, _ = fast_ic(te[['th', c, 'y1c']].rename(columns={c: 'p'}), 'p', 'y1c')
    rows.append((c, a1, a2, a3, t3))
rows.sort(key=lambda r: -abs(r[3]) if np.isfinite(r[3]) else 0)
for c, a1, a2, a3, t3 in rows:
    ok = all(np.isfinite([a1, a2, a3])) and abs(a1) >= 0.01 and abs(a2) >= 0.01 and abs(a3) >= 0.01 and np.sign(a1) == np.sign(a2) == np.sign(a3)
    nm = f'**{c}**' if ok else c; L.append(f'| {nm} | {grpOf.get(c, "")} | {fx(a1)} | {fx(a2)} | {fx(a3)} | {fx(t3,1)} |')
# seans açılışı örneği: sOpen2 koşullu getiri (model dışı)
L += ['', '## Kullanıcının örneği tablo içinde: seansın ilk iki mumu önceki gün ucunun dışında (`sOpen2`)', '', 'Satır = seansın ilk saati sonrası (sinceSess ≤ 2 sa) gözlemler; hücre = sonraki 4 sa VWAP getirisi (oynaklık biriminde) ve işlem başı %, dönem dönem.', '', '| Durum | Dönem | n | ort. 4 sa (σ birimi) | % | kazanma |', '|---|---|---|---|---|---|']
sub = df[(df.sinceSess <= 2) & np.isfinite(df.sOpen2)]
for lab, v in [('iki mum da PDH üstünde → long', 1), ('iki mum da PDL altında → short', -1), ('içeride', 0)]:
    for pn, s_ in [('eğitim 1', sub[sub.t < mid_tr]), ('eğitim 2', sub[(sub.t >= mid_tr) & (sub.t < tmin)]), ('test', sub[sub.t >= tmin])]:
        x = s_[s_.sOpen2 == v]; r = (x.y4v * (1 if v >= 0 else -1)); pcs = r * x.sd15 * 4 * 100
        L.append(f'| {lab} | {pn} | {len(x):,} | {fx(r.mean())} | {fx(pcs.mean(),3)} | %{100*(r>0).mean():.1f} |'.replace('%', '%', 1))
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L)); print('süre', f'{time.time()-t0:.0f} sn')
