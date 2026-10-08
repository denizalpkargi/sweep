# "Denklem" araştırması, 2. adım (8 Ekim 2026): tests/denklem-ozellik.js'in ürettiği ~100 değişkenli saatlik tabloda
#  (a) ileriye yürüyen LightGBM (6 ayda bir yeniden eğitim, ilk 12 ay yalnız eğitim, 1 gün ara): hedef 1 sa ve 4 sa getiri (oynaklık biriminde),
#  (b) örneklem dışı ölçüler: saatlik coinler arası Spearman IC (dönem, seans, saat, gün), onluk getirileri, en uç dilimde maliyetli getiri,
#  (c) çakışmasız işlem simülasyonu (saat başı en güçlü 2 long + 2 short, eşik eğitimden, coin kilidi, maker ve taker maliyet),
#  (d) tek değişken × seans taraması ve çift etkileşim taraması (ilk yarıda bul, ikinci yarı ve son 12 ayda sına),
#  (e) seansa özel modeller (yalnız o seansın satırlarıyla eğitilen) ile ortak modelin kıyası.
# Kullanım: python3 tests/denklem-model.py [--out rapor.md] [--fast] [--step 6]
import json, sys, os, math, time
import numpy as np, pandas as pd
import lightgbm as lgb
from scipy.stats import spearmanr

D = os.path.join(os.path.dirname(__file__), 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
OUT = arg('out', os.path.join(os.path.dirname(__file__), 'denklem-report.md')); FAST = '--fast' in sys.argv; STEP = int(arg('step', 6))
meta = json.load(open(os.path.join(D, 'denklem.json'))); COLS = meta['cols']; NF = len(COLS)
X = np.fromfile(os.path.join(D, 'denklem.f32'), dtype=np.float32).reshape(-1, NF)
df = pd.DataFrame(X, columns=COLS); del X
df = df[np.isfinite(df.y1) & np.isfinite(df.y4)].copy()
df['t'] = (df.th.astype(np.int64) * 3600000 + meta['t0']); df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
for c in ['y1', 'y4', 'y24']: df[c+'c'] = df[c].clip(-5, 5)
SESS = {0: 'Asya 00–07', 1: 'Londra 07–12', 2: 'New York 12–21', 3: 'Gece 21–24'}
DROP = {'sym', 'th', 'y1', 'y4', 'y24', 'sd15', 't', 'month', 'y1c', 'y4c', 'y24c'}
FEATS = [c for c in COLS if c not in DROP]
months = sorted(df.month.unique()); t_all0 = time.time()
print('satır', len(df), 'coin', df.sym.nunique(), 'ay', months[0], '→', months[-1], 'özellik', len(FEATS), flush=True)
fx = lambda v, d=3: ('—' if not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
pct = lambda v, d=2: ('—' if not np.isfinite(v) else f'%{v:.{d}f}'.replace('.', ','))

def fast_ic(o, pcol, ycol, key='th', minn=10):
    """gruplar içinde Spearman: sıralar vektörel, grup başına Pearson bincount ile; dönüş (ortalama, t, grup sayısı)"""
    d = o[[key, pcol, ycol]].dropna()
    if len(d) == 0: return np.nan, np.nan, 0
    codes, _ = pd.factorize(d[key].values); n = np.bincount(codes)
    rp = d.groupby(key)[pcol].rank().values; ry = d.groupby(key)[ycol].rank().values
    sx = np.bincount(codes, rp); sy = np.bincount(codes, ry); sxx = np.bincount(codes, rp*rp); syy = np.bincount(codes, ry*ry); sxy = np.bincount(codes, rp*ry)
    with np.errstate(invalid='ignore', divide='ignore'):
        cov = sxy - sx*sy/n; vx = sxx - sx*sx/n; vy = syy - sy*sy/n; r = cov/np.sqrt(vx*vy)
    r = r[(n >= minn) & np.isfinite(r)]
    return (r.mean() if len(r) else np.nan), (r.mean()/r.std()*math.sqrt(len(r)) if len(r) > 2 and r.std() > 0 else np.nan), len(r)
def xs_ic(o, col='y1c', key='th'): return fast_ic(o, 'p', col, key)
def pooled_ic(o, col='y1c'):
    a, t, _ = fast_ic(o, 'p', col, 'month', 200); return a, t

PARAMS = dict(n_estimators=250 if FAST else 400, learning_rate=0.03, num_leaves=31, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10, verbose=-1, n_jobs=4)
def fit(tr, target, feats=FEATS):
    if FAST and len(tr) > 700000: tr = tr.sample(700000, random_state=1)
    m = lgb.LGBMRegressor(**PARAMS); m.fit(tr[feats], tr[target]); return m

# ---------- (a) ileriye yürüyen ----------
oos = {'y1c': [], 'y4c': []}; imps = {'y1c': [], 'y4c': []}; sess_oos = []
start = 12
CACHE = os.path.join(D, 'denklem-oos.pkl')
if '--cached' in sys.argv and os.path.exists(CACHE):
    import pickle; oos, imps, sess_oos = pickle.load(open(CACHE, 'rb')); print('tahminler önbellekten', flush=True)
for i in (range(start, len(months), STEP) if not ('--cached' in sys.argv and os.path.exists(CACHE)) else []):
    test_m = months[i:i+STEP]; tmin = df[df.month == months[i]].t.min()
    tr = df[(df.month < months[i]) & (df.t < tmin - 864e5)]; te = df[df.month.isin(test_m)]
    if len(te) == 0 or len(tr) < 50000: continue
    for tg in ['y1c', 'y4c']:
        m = fit(tr, tg); p = m.predict(te[FEATS]); ptr = m.predict(tr[FEATS].sample(min(len(tr), 300000), random_state=2))
        imps[tg].append(pd.Series(m.booster_.feature_importance('gain'), index=FEATS))
        oos[tg].append(pd.DataFrame({'t': te.t.values, 'th': te.th.values, 'month': te.month.values, 'sym': te.sym.values, 'sess': te.sess.values, 'hr': te.hr.values, 'dow': te.dow.values, 'sd15': te.sd15.values,
                                     'p': p, 'q95': np.quantile(ptr, 0.95), 'q05': np.quantile(ptr, 0.05), 'y1': te.y1.values, 'y4': te.y4.values, 'y1c': te.y1c.values, 'y4c': te.y4c.values}))
    # (e) seansa özel 1 sa modelleri
    for s in range(4):
        trs = tr[tr.sess == s]; tes = te[te.sess == s]
        if len(trs) < 30000 or len(tes) == 0: continue
        m = fit(trs, 'y1c'); sess_oos.append(pd.DataFrame({'th': tes.th.values, 't': tes.t.values, 'sess': s, 'p': m.predict(tes[FEATS]), 'y1c': tes.y1c.values}))
    print('test', test_m[0], 'eğitim', len(tr), 'test', len(te), f'{time.time()-t_all0:.0f} sn', flush=True)

import pickle; pickle.dump((oos, imps, sess_oos), open(CACHE, 'wb'))
L = [f'# Denklem · ~100 değişkenle 15 dk/1 sa/4 sa yön modeli, seans ve etkileşimler · {time.strftime("%Y-%m-%d")}', '',
     f'{len(df):,} saatlik gözlem, {df.sym.nunique()} coin (ayın ilk 30\'u), {months[0]} → {months[-1]}, {len(FEATS)} değişken (liste sonda). Hedef: sonraki 1 sa ve 4 sa getiri ÷ coinin 30 günlük oynaklığı (±5 kırpılmış). Model: LightGBM, ileriye yürüyen (her {STEP} ayda bir yalnız geçmişle yeniden eğitilir, ilk 12 ay yalnız eğitim). Bütün sayılar örneklem dışı.', '',
     '**IC** = her saatte coinleri tahmine göre sıralayıp gerçek getiriyle Spearman ilişkisi, saatlerin ortalaması (0 = bilgi yok; 0,05 zayıf ama gerçek; 0,10 güçlü). t ≥ 3 anlamlı sayılır.', '']
summary = {}
for tg, nm in [('y1c', '1 saat'), ('y4c', '4 saat')]:
    o = pd.concat(oos[tg]); mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5
    L += [f'## {nm} hedefi', '', '| Dönem | n | Coinler arası IC | t | Havuz IC (aylık) | t |', '|---|---|---|---|---|---|']
    for pn, sub in [('tümü', o), ('1. yarı', o[o.t < mid]), ('2. yarı', o[o.t >= mid]), ('son 12 ay', o[o.t >= y12])]:
        a, at, n = xs_ic(sub, tg); b, bt = pooled_ic(sub, tg); summary[(tg, pn)] = (a, at)
        L.append(f'| {pn} | {len(sub):,} | {fx(a)} | {fx(at,1)} | {fx(b)} | {fx(bt,1)} |')
    L += ['', '**Seansa göre** (ortak model, o seansın saatleri):', '', '| Seans | 1. yarı IC | t | 2. yarı IC | t | son 12 ay IC | t |', '|---|---|---|---|---|---|---|']
    for s in range(4):
        r = [xs_ic(sub[sub.sess == s], tg) for sub in (o[o.t < mid], o[o.t >= mid], o[o.t >= y12])]
        L.append(f'| {SESS[s]} | ' + ' | '.join(f'{fx(a)} | {fx(t,1)}' for a, t, _ in r) + ' |')
    L += ['', '**Saate göre** (UTC; 1. yarı / 2. yarı IC):', '']
    hrs = []
    for h in range(24):
        a1, _, _ = xs_ic(o[(o.hr == h) & (o.t < mid)], tg); a2, _, _ = xs_ic(o[(o.hr == h) & (o.t >= mid)], tg); hrs.append(f'{h:02d}: {fx(a1,2)} / {fx(a2,2)}')
    L += [' · '.join(hrs), '', '**Güne göre** (Pzt…Paz; 1. yarı / 2. yarı IC):', '']
    L += [' · '.join(f'{["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"][d]}: {fx(xs_ic(o[(o.dow==d)&(o.t<mid)], tg)[0],2)} / {fx(xs_ic(o[(o.dow==d)&(o.t>=mid)], tg)[0],2)}' for d in [1,2,3,4,5,6,0]), '']
    # onluklar: saat içinde sıralı
    o['dec'] = np.floor(o.groupby('th').p.rank(method='first', pct=True).values * 10 - 1e-9).clip(0, 9); o.loc[o.groupby('th').p.transform('size') < 10, 'dec'] = np.nan
    ycol = 'y1' if tg == 'y1c' else 'y4'; hz = 2 if tg == 'y1c' else 4
    o['ret'] = o[ycol] * o.sd15 * hz * 100  # % cinsinden gerçek getiri
    g = o.dropna(subset=['dec']).groupby('dec').agg(n=('ret', 'size'), r=('ret', 'mean'), w=('ret', lambda s: (s > 0).mean()))
    g1 = o[o.t < mid].dropna(subset=['dec']).groupby('dec').ret.mean(); g2 = o[o.t >= mid].dropna(subset=['dec']).groupby('dec').ret.mean(); g3 = o[o.t >= y12].dropna(subset=['dec']).groupby('dec').ret.mean()
    L += [f'**Onluklar** (her saat coinler tahmine göre 10 dilime; gerçek {nm} getirisi %, maliyetsiz, yön long):', '', '| Onluk | n | ort. % | kazanma | 1. yarı | 2. yarı | son 12 ay |', '|---|---|---|---|---|---|---|']
    for d, r in g.iterrows(): L.append(f'| {int(d)+1}{" (en düşük tahmin)" if d==0 else " (en yüksek)" if d==9 else ""} | {int(r.n):,} | {fx(r.r)} | {pct(100*r.w,1)} | {fx(g1.get(d,np.nan))} | {fx(g2.get(d,np.nan))} | {fx(g3.get(d,np.nan))} |')
    od = o.dropna(subset=['dec']); top9 = od[od.dec == 9].groupby('th').ret.mean(); bot0 = od[od.dec == 0].groupby('th').ret.mean()
    lsd = pd.DataFrame({'ls': top9 - bot0, 't': od.groupby('th').t.first()}).dropna()
    L += ['', f'Üst onluk long − alt onluk short (saat başına, iki bacak toplamı %, maliyetsiz): ' + ' · '.join(f'{pn} {fx(sub.ls.mean())}% (t {fx(sub.ls.mean()/sub.ls.std()*math.sqrt(len(sub)),1)})' for pn, sub in [('1. yarı', lsd[lsd.t < mid]), ('2. yarı', lsd[lsd.t >= mid]), ('son 12 ay', lsd[lsd.t >= y12])]) + f'. Maliyet iki bacak için maker %0,08, taker %0,32.', '']
    imp = pd.concat(imps[tg], axis=1).mean(axis=1).sort_values(ascending=False); imp = imp / imp.sum() * 100
    L += [f'En çok kullanılan girdiler (kazanç payı %): ' + ', '.join(f'{k} {v:.1f}' for k, v in imp.head(25).items()), '']

# ---------- (c) çakışmasız işlem simülasyonu (1 sa modeli) ----------
o = pd.concat(oos['y1c']).sort_values(['th', 'p']); mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5
L += ['## Gerçek işlem gibi: saat başı en güçlü 2 long + 2 short', '', 'Tahmin eğitim dağılımının üst %5 / alt %5 eşiğini geçmeli; coin başına tek açık işlem; giriş saat kapanışı, çıkış 1 sa (ya da 4 sa) sonra kapanış; maliyet gidiş-dönüş maker %0,04, taker %0,16.', '',
      '| Tutuş | Yön | İşlem | Kazanma (maliyetsiz) | 1. yarı ort. % (taker / maker) | 2. yarı | son 12 ay | Günde işlem |', '|---|---|---|---|---|---|---|---|']
for hold, ycol, hz, lock in [('1 sa', 'y1', 2, 1), ('4 sa', 'y4', 4, 4)]:
    for side in ['long', 'short', 'ikisi']:
        busy = {}; T = []
        for th, g in o.groupby('th', sort=True):
            cand = []
            if side != 'short': cand += [(1, r) for _, r in g[g.p >= g.q95].nlargest(2, 'p').iterrows()]
            if side != 'long': cand += [(-1, r) for _, r in g[g.p <= g.q05].nsmallest(2, 'p').iterrows()]
            for d, r in cand:
                if busy.get(r.sym, -1) > th: continue
                busy[r.sym] = th + lock; T.append((r.t, d * r[ycol] * r.sd15 * hz * 100))
        if not T: continue
        T = pd.DataFrame(T, columns=['t', 'ret']); days = len(set((T.t // 864e5).astype(int)))
        cell = lambda sub: f'{fx(sub.ret.mean()-0.16)} / {fx(sub.ret.mean()-0.04)} (n {len(sub):,})'
        L.append(f'| {hold} | {side} | {len(T):,} | {pct(100*(T.ret>0).mean(),1)} | {cell(T[T.t<mid])} | {cell(T[T.t>=mid])} | {cell(T[T.t>=y12])} | {len(T)/max(1,days):.1f} |')
L.append('')

# ---------- (e) seansa özel modeller ----------
if sess_oos:
    so = pd.concat(sess_oos); L += ['## Seansa özel modeller (yalnız o seansın verisiyle eğitilen) ile ortak model', '', '| Seans | Ortak model IC (1. / 2. yarı) | Seans modeli IC (1. / 2. yarı) |', '|---|---|---|']
    for s in range(4):
        a = o[o.sess == s]; b = so[so.sess == s]
        L.append(f'| {SESS[s]} | {fx(xs_ic(a[a.t<mid])[0])} / {fx(xs_ic(a[a.t>=mid])[0])} | {fx(xs_ic(b[b.t<mid])[0])} / {fx(xs_ic(b[b.t>=mid])[0])} |')
    L.append('')

# ---------- (d) tek değişken × seans ve çift etkileşim (model dışı, ham) ----------
dmid = np.sort(df.t.values)[len(df)//2]; dy12 = df.t.max() - 365*864e5
H1 = df[df.t < dmid]; H2 = df[df.t >= dmid]; Y12 = df[df.t >= dy12]
H1S = {s: H1[H1.sess == s] for s in range(4)}; H2S = {s: H2[H2.sess == s] for s in range(4)}; Y12S = {s: Y12[Y12.sess == s] for s in range(4)}
def ic_table(sub, feats, col='y1c', minn=10):
    """tüm değişkenlerin saat içi Spearman IC'si tek seferde (gruplar içinde sıra, bincount)"""
    d = sub[['th', col] + feats]; codes, _ = pd.factorize(d.th.values); n_all = np.bincount(codes)
    R = d.groupby('th')[feats + [col]].rank().astype(np.float32); ry = R[col].values; out = {}
    for f in feats:
        rp = R[f].values; ok = np.isfinite(rp)
        c = codes[ok]; x = rp[ok]; y = ry[ok]; n = np.bincount(c, minlength=len(n_all))
        sx = np.bincount(c, x, minlength=len(n_all)); sy = np.bincount(c, y, minlength=len(n_all)); sxx = np.bincount(c, x*x, minlength=len(n_all)); syy = np.bincount(c, y*y, minlength=len(n_all)); sxy = np.bincount(c, x*y, minlength=len(n_all))
        with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx*sy/n)/np.sqrt((sxx - sx*sx/n)*(syy - sy*sy/n))
        r = r[(n >= minn) & np.isfinite(r)]; out[f] = r.mean() if len(r) else np.nan
    return out
_IC = {}
def feat_ic(sub, f, col='y1c'):
    key = (id(sub), col)
    if key not in _IC: _IC[key] = ic_table(sub, [x for x in FEATS], col); _IC['_keep_'+str(id(sub))] = sub
    return _IC[key].get(f, np.nan)
L += ['## Tek değişken, seansa göre (ham, modelsiz)', '', 'Her değişkenin 1 sa hedefiyle coinler arası IC\'si, seans seans. Yalnız iki yarıda da aynı işaretli ve |IC| ≥ 0,02 olanlar (toplam 4 × ' + str(len(FEATS)) + ' deneme; şans eseri birkaçı geçer).', '',
      '| Değişken | Seans | 1. yarı | 2. yarı | son 12 ay | Tüm seanslar 1. / 2. yarı |', '|---|---|---|---|---|---|']
rows_d = []
for f in FEATS:
    if f in ('hr', 'sess', 'dow', 'dom', 'minFund', 'monthEnd', 'fri8', 'weekend', 'nCoins', 'breadth1', 'breadth4', 'disp4', 'top10m4', 'eth4', 'b15', 'b1', 'b4', 'b24', 'bPrev1', 'bs50', 'bs200', 'bVol', 'bPos24'): continue  # coinler arası sabit
    all1 = feat_ic(H1, f); all2 = feat_ic(H2, f)
    for s in range(4):
        a = feat_ic(H1S[s], f); b = feat_ic(H2S[s], f)
        if np.isfinite(a) and np.isfinite(b) and np.sign(a) == np.sign(b) and min(abs(a), abs(b)) >= 0.02:
            rows_d.append((min(abs(a), abs(b)), f'| {f} | {SESS[s]} | {fx(a)} | {fx(b)} | {fx(feat_ic(Y12S[s], f))} | {fx(all1)} / {fx(all2)} |'))
rows_d.sort(key=lambda x: -x[0]); L += [r for _, r in rows_d[:30]] or ['| — | hiçbiri | | | | |']; L.append('')

# çift etkileşim: ilk yarıda en güçlü 24 değişkenin beşlik çiftleri, hücre ortalaması (oynaklık biriminde), ikinci yarı ve son 12 ayda sınanır
L += ['## Çift etkileşim taraması', '', 'İlk yarıda IC\'si en yüksek 24 değişken, ikişer ikişer 5 × 5 hücreye bölündü (sınırlar ilk yarıdan). Hücre = 1 sa getiri ortalaması (oynaklık biriminde; 0,10 ≈ coinin 1 saatlik oynaklığının onda biri). İlk yarıda |ort.| ≥ 0,06 ve n ≥ 3000 olan hücreler, ikinci yarı ve son 12 ayda aynı işaretli mi? (Yaklaşık 6900 hücre denendi; aynı işaret şansla %50.)', '',
      '| Değişken A (beşlik) | Değişken B (beşlik) | 1. yarı ort. (n) | 2. yarı ort. (n) | son 12 ay ort. (n) | Yorum |', '|---|---|---|---|---|---|']
cand = [f for f in FEATS if f not in ('hr', 'sess', 'dow', 'dom', 'monthEnd', 'fri8', 'weekend', 'nCoins')]
ics1 = {f: feat_ic(H1, f) for f in cand}; top = sorted([f for f in cand if np.isfinite(ics1[f])], key=lambda f: -abs(ics1[f]))[:24]
edges = {f: np.nanquantile(H1[f].values, [0.2, 0.4, 0.6, 0.8]) for f in top}
def bucket(sub, f): return np.digitize(sub[f].values, edges[f])
B1 = {f: bucket(H1, f) for f in top}; B2 = {f: bucket(H2, f) for f in top}; B3 = {f: bucket(Y12, f) for f in top}
y1_1 = H1.y1c.values; y1_2 = H2.y1c.values; y1_3 = Y12.y1c.values
found = []
for ia, a in enumerate(top):
    for b in top[ia+1:]:
        k1 = B1[a] * 5 + B1[b]; k2 = B2[a] * 5 + B2[b]; k3 = B3[a] * 5 + B3[b]
        ok1 = np.isfinite(H1[a].values) & np.isfinite(H1[b].values); ok2 = np.isfinite(H2[a].values) & np.isfinite(H2[b].values); ok3 = np.isfinite(Y12[a].values) & np.isfinite(Y12[b].values)
        s1 = np.bincount(k1[ok1], weights=y1_1[ok1], minlength=25); n1 = np.bincount(k1[ok1], minlength=25)
        s2 = np.bincount(k2[ok2], weights=y1_2[ok2], minlength=25); n2 = np.bincount(k2[ok2], minlength=25)
        s3 = np.bincount(k3[ok3], weights=y1_3[ok3], minlength=25); n3 = np.bincount(k3[ok3], minlength=25)
        for c in range(25):
            if n1[c] < 3000: continue
            m1 = s1[c]/n1[c]
            if abs(m1) < 0.06: continue
            m2 = s2[c]/n2[c] if n2[c] >= 500 else np.nan; m3 = s3[c]/n3[c] if n3[c] >= 300 else np.nan
            found.append((abs(m1), a, c//5+1, b, c % 5+1, m1, n1[c], m2, n2[c], m3, n3[c]))
found.sort(key=lambda x: -x[0]); nconf = sum(1 for f in found if np.isfinite(f[7]) and np.sign(f[7]) == np.sign(f[5]) and np.isfinite(f[9]) and np.sign(f[9]) == np.sign(f[5]))
L.append(f'Aday hücre {len(found)}, üç dönemde de aynı işaretli {nconf}. En güçlü 30 aday:')
L += ['', '| Değişken A (beşlik) | Değişken B (beşlik) | 1. yarı ort. (n) | 2. yarı ort. (n) | son 12 ay ort. (n) | Yorum |', '|---|---|---|---|---|---|']
for _, a, qa, b, qb, m1, n1_, m2, n2_, m3, n3_ in found[:30]:
    conf = np.isfinite(m2) and np.sign(m2) == np.sign(m1) and np.isfinite(m3) and np.sign(m3) == np.sign(m1) and min(abs(m2), abs(m3)) >= 0.03
    L.append(f'| {a} ({qa}) | {b} ({qb}) | {fx(m1)} ({int(n1_):,}) | {fx(m2)} ({int(n2_):,}) | {fx(m3)} ({int(n3_):,}) | {"**tutuyor**" if conf else "tutmuyor" if np.isfinite(m2) and np.sign(m2) != np.sign(m1) else "zayıf"} |')
L.append('')


# ---------- (f) sağlamlık: kapanış fiyatı sıçraması (VWAP ile giriş/çıkış) ----------
# 15 dk kapanışı son işlemin fiyatıdır (alış ya da satış tarafı); kapanıştan kapanışa 1 sa getiri bu yüzden yapay "geri dönüş" taşır.
# Gerçekçi ölçü: giriş sonraki mumun VWAP'ı (15 dk içinde dolum), çıkış tutuş sonundaki mumun VWAP'ı.
o = pd.concat(oos['y1c']).reset_index(drop=True); o['y1v'] = np.nan; o['y4v'] = np.nan; o['y1o'] = np.nan
for si, name in enumerate(meta['syms']):
    idx = np.where(o.sym.values == si)[0]
    if len(idx) == 0: continue
    k = np.loadtxt(os.path.join(D, '15m', name + '.csv'), delimiter=',', usecols=(0, 1, 4, 5, 7), ndmin=2)
    ot = k[:, 0]; op = k[:, 1]; cl = k[:, 2]; vw = np.where(k[:, 3] > 0, k[:, 4]/np.maximum(k[:, 3], 1e-12), cl)
    t_open = o.t.values[idx] - 900000; pos = np.searchsorted(ot, t_open); ok = (pos < len(ot) - 18) & (ot[np.minimum(pos, len(ot)-1)] == t_open)
    p = pos[ok]; ii = idx[ok]; good = ot[p+17] == ot[p] + 17*900000; p = p[good]; ii = ii[good]
    o.loc[ii, 'y1v'] = np.log(vw[p+5]/vw[p+1]); o.loc[ii, 'y4v'] = np.log(vw[p+17]/vw[p+1]); o.loc[ii, 'y1o'] = np.log(cl[p+4]/op[p+1])
o = o.dropna(subset=['y1v']); mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5
L += ['## Sağlamlık: kapanış fiyatı sıçraması', '', '15 dk kapanışı son işlemin fiyatıdır; alış tarafında biten mum bir sonraki mumda "düşmüş" görünür. Kapanıştan kapanışa ölçülen 1 saatlik geri dönüşün büyük kısmı bu yapay etkidir. Aşağıda aynı tahminler üç ölçüyle: kapanış→kapanış (modelin eğitildiği), sonraki mumun açılışı→kapanış, sonraki mumun VWAP\'ı→çıkış mumunun VWAP\'ı (gerçekçi dolum).', '',
      '| Dönem | IC kapanış→kapanış | IC açılış→kapanış | IC VWAP→VWAP 1 sa | IC VWAP→VWAP 4 sa |', '|---|---|---|---|---|']
for nm, sub in [('1. yarı', o[o.t < mid]), ('2. yarı', o[o.t >= mid]), ('son 12 ay', o[o.t >= y12])]:
    L.append(f'| {nm} | {fx(fast_ic(sub, "p", "y1")[0])} | {fx(fast_ic(sub, "p", "y1o")[0])} | {fx(fast_ic(sub, "p", "y1v")[0])} | {fx(fast_ic(sub, "p", "y4v")[0])} |')
o['dec'] = np.floor(o.groupby('th').p.rank(method='first', pct=True).values * 10 - 1e-9).clip(0, 9)
L += ['', 'Üst onluk − alt onluk, VWAP ile (iki bacak toplamı %, maliyetsiz; maker iki bacak %0,08):', '']
for col, hz in [('y1v', '1 sa'), ('y4v', '4 sa')]:
    L.append(f'- {hz}: ' + ' · '.join(f'{nm} {fx((sub.groupby("dec")[col].mean()[9] - sub.groupby("dec")[col].mean()[0])*100)}%' for nm, sub in [('1. yarı', o[o.t < mid]), ('2. yarı', o[o.t >= mid]), ('son 12 ay', o[o.t >= y12])]))
L += ['', 'Saat başı en güçlü 2 long + 2 short, VWAP dolumla (işlem başı %, maliyetsiz; taker %0,16, maker %0,04 düşülecek):', '', '| Tutuş | Dönem | İşlem | Ort. % | Long | Short | Kazanma |', '|---|---|---|---|---|---|---|']
VW_SUM = {}
for col, hz, lock in [('y1v', '1 sa', 1), ('y4v', '4 sa', 4)]:
    busy = {}; T = []
    for th, g in o.sort_values(['th', 'p']).groupby('th', sort=True):
        cand = [(1, r) for _, r in g[g.p >= g.q95].nlargest(2, 'p').iterrows()] + [(-1, r) for _, r in g[g.p <= g.q05].nsmallest(2, 'p').iterrows()]
        for d, r in cand:
            if busy.get(r.sym, -1) > th: continue
            busy[r.sym] = th + lock; T.append((r.t, d, d*r[col]*100))
    T = pd.DataFrame(T, columns=['t', 'd', 'ret'])
    for nm, sub in [('1. yarı', T[T.t < mid]), ('2. yarı', T[T.t >= mid]), ('son 12 ay', T[T.t >= y12])]:
        VW_SUM[(hz, nm)] = sub.ret.mean(); L.append(f'| {hz} | {nm} | {len(sub):,} | {fx(sub.ret.mean())} | {fx(sub[sub.d==1].ret.mean())} | {fx(sub[sub.d==-1].ret.mean())} | {pct(100*(sub.ret>0).mean(),1)} |')
L.append('')

# ---------- karar ----------
a1, t1 = summary[('y1c', '1. yarı')]; a2, t2 = summary[('y1c', '2. yarı')]; a3, t3 = summary[('y1c', 'son 12 ay')]
okv = all(VW_SUM[('1 sa', h)] - 0.04 > 0 for h in ['1. yarı', '2. yarı', 'son 12 ay'])
L += ['## Karar', '', f'1 sa modeli kapanıştan kapanışa IC: 1. yarı {fx(a1)}, 2. yarı {fx(a2)}, son 12 ay {fx(a3)}; VWAP dolumla {fx(fast_ic(o[o.t<mid],"p","y1v")[0])} / {fx(fast_ic(o[o.t>=mid],"p","y1v")[0])} / {fx(fast_ic(o[o.t>=y12],"p","y1v")[0])}. Gerçekçi işlem (2+2, VWAP, 1 sa) maker maliyet sonrası: ' + ' · '.join(f'{h} {fx(VW_SUM[("1 sa", h)] - 0.04)}%' for h in ['1. yarı', '2. yarı', 'son 12 ay']) + f'. Kriter (üç dönemde de maker sonrası artı): **{"GEÇTİ" if okv else "GEÇMEDİ"}**; taker ile hiçbir dönemde artı değil.', '',
      '## Değişken listesi', '', ', '.join(FEATS), '']
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L)); print('süre', f'{time.time()-t_all0:.0f} sn')
