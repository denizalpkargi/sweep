# Ozan işlem kalitesi · ileri yürüyen model: hangi değişken aileleri masanın iyi ve kötü işlemini ayırıyor? (10 Ekim 2026)
# Girdi: ozan-kalite-veri.py çıktısı. Eğitim: veto dışı, puanı ≥ --minscore toplantılar; değerlendirme: masanın gireceği kararlar
# (veto yok, puan ≥ 0,35, evet ≥ 3). 6 ayda bir yeniden eğitim (önceki tüm veri, 2 gün boşluk), 2022-01'den örneklem dışı.
# Hedef: --target R (botun planıyla R, [−1,5; 3]'e kırpılır) | y (4 sa içinde önce +1 ATR) | f4 (4 sa hareket ÷ ATR, [−4,4]) | Rx, f4x (aynı andaki ortalamadan fark).
# Ölçüler (yalnız örneklem dışı): IC (Spearman, gün içi), onluklarda R, en kötü %30 / %50 atılınca kalan R ve fark,
# gün kümeli bootstrap t, iki yarı (2022-01 → 2024-04 / 2024-05 →), son 12 ay; rastgele atma = taban (beklenen fark 0).
# Ağaç modeli: numpy histogram gradyan artırma (bulut ortamında lightgbm kurulamıyor; PC'de --lgb ile LightGBM kullanılır).
# Kullanım: python3 tests/ozan-kalite-model.py <veri.pkl> <rapor.md> [--sets B,BX,...] [--target R] [--minscore 0.15] [--trees 120] [--lgb]
import sys, os, time, json, numpy as np, pandas as pd
from multiprocessing import Pool
A = sys.argv; PK, OUT = A[1], A[2]
def arg(k, d): return A[A.index('--'+k)+1] if '--'+k in A else d
TARGET = arg('target', 'R'); MINS = float(arg('minscore', 0.15)); NT = int(arg('trees', 120)); LGB = '--lgb' in A
SETS = arg('sets', 'B,B+XS,B+H,B+M,B+I,HEPSI,HEPSI-B').split(',')
DAY = 864e5

class HGB:
    """Histogram gradyan artırma (kare kayıp), derinlik d, 32 kova (kayip-suzgeci/gbm.py'nin aynısı)."""
    def __init__(s, n=150, lr=0.05, d=3, minleaf=400, nb=32, l2=50.0, sub=0.7, seed=0): s.__dict__.update(n=n, lr=lr, d=d, minleaf=minleaf, nb=nb, l2=l2, sub=sub, rng=np.random.default_rng(seed))
    def _bin(s, X):
        B = np.empty(X.shape, np.uint8)
        for j in range(X.shape[1]):
            b = np.searchsorted(s.edges[j], X[:, j], side='right'); b[np.isnan(X[:, j])] = s.nb; B[:, j] = b
        return B
    def fit(s, X, y):
        s.edges = [np.unique(np.nanquantile(X[:, j], np.linspace(0, 1, s.nb+1)[1:-1])) if np.isfinite(X[:, j]).any() else np.array([]) for j in range(X.shape[1])]
        B = s._bin(X); s.base = y.mean(); p = np.full(len(y), s.base); s.trees = []
        for _ in range(s.n):
            g = y-p; idx = np.where(s.rng.random(len(y)) < s.sub)[0]; tree = []; s._grow(B, g, idx, 0, tree); s.trees.append(tree)
            p += s.lr*s._pt(tree, B)
        return s
    def _grow(s, B, g, idx, depth, tree):
        tree.append(None); me = len(tree)-1; G = g[idx].sum(); n = len(idx); val = G/(n+s.l2)
        if depth >= s.d or n < 2*s.minleaf: tree[me] = (-1, 0, 0, 0, val); return me
        best = (0, None, None); nbx = s.nb+1; gi = g[idx]
        for j in range(B.shape[1]):
            b = B[idx, j]; gs = np.bincount(b, weights=gi, minlength=nbx); ns = np.bincount(b, minlength=nbx)
            cg = np.cumsum(gs[:-1]); cn = np.cumsum(ns[:-1]); rg = G-cg; rn = n-cn; ok = (cn >= s.minleaf) & (rn >= s.minleaf)
            if not ok.any(): continue
            gain = cg**2/(cn+s.l2)+rg**2/(rn+s.l2)-G**2/(n+s.l2); gain[~ok] = -1; k = int(np.argmax(gain))
            if gain[k] > best[0]: best = (gain[k], j, k)
        if best[1] is None: tree[me] = (-1, 0, 0, 0, val); return me
        j, k = best[1], best[2]; m = B[idx, j] <= k
        l = s._grow(B, g, idx[m], depth+1, tree); r = s._grow(B, g, idx[~m], depth+1, tree); tree[me] = (j, k, l, r, val); return me
    def _pt(s, tree, B):
        out = np.empty(len(B)); st = [(0, np.arange(len(B)))]
        while st:
            nd, ix = st.pop(); j, k, l, r, v = tree[nd]
            if j < 0: out[ix] = v; continue
            m = B[ix, j] <= k; st.append((l, ix[m])); st.append((r, ix[~m]))
        return out
    def predict(s, X):
        B = s._bin(X); p = np.full(len(X), s.base)
        for t in s.trees: p += s.lr*s._pt(t, B)
        return p
    def importance(s, nf):
        imp = np.zeros(nf)
        for t in s.trees:
            for nd in t:
                if nd[0] >= 0: imp[nd[0]] += 1
        return imp

df = pd.read_pickle(PK)
# 24 / 72 sa tutuş etiketi (g24, g72): sonraki 4 sa adımlarının b_r4'ünden (long satırı = ham log getiri) ileri getiri; basit getiri,
# yönde, gidiş-dönüş taker + kayma %0,16 ve fonlama (her 4 sa adımda son oranın yarısı) düşülmüş. Ara adım eksikse (coin evrenden çıktı) NaN.
# Not: kapanıştan kapanışa; 24–72 sa ufukta kapanış sıçraması (|kapanış−VWAP| ≈ %0,2) küçük ama sıfır değil.
def fwd(df, n):
    raw = df[df.L == 1][['sym', 't', 'b_r4', 'b_fr']].drop_duplicates(['sym', 't']).sort_values(['sym', 't'])
    out = []
    for s_, g in raw.groupby('sym'):
        g = g.set_index('t').reindex(np.arange(g.t.min(), g.t.max()+1, 4*3600*1000))
        r = g.b_r4.shift(-1).rolling(n).sum().shift(-(n-1)); f = (g.b_fr.fillna(0)/2).shift(-1).rolling(n).sum().shift(-(n-1))
        out.append(pd.DataFrame({'sym': s_, 't': g.index, 'lr': r.values, 'fs': f.values}))
    o = pd.concat(out).dropna(); m = df[['sym', 't', 'L']].merge(o, on=['sym', 't'], how='left')
    sgn = np.where(m.L == 1, 1.0, -1.0)
    return (sgn*(np.exp(m.lr)-1) - sgn*m.fs - 0.0016).values
for n_, nm_ in [(6, 'g24'), (18, 'g72')]: df[nm_] = fwd(df, n_)*100   # yüzde
df = df[df.veto == 0].reset_index(drop=True)
df['ent'] = (df.b_score >= 0.35) & (df.b_yes >= 3)
df['day'] = (df.t//DAY).astype(int)
cols = {p: [c for c in df.columns if c.startswith(p)] for p in ['b_', 'xs_', 'h_', 'm_', 'i_', 'o_', 'd_']}
def fs(name):
    if name == 'HEPSI': return ['L']+sum(cols.values(), [])
    if name == 'HEPSI-B': return ['L']+cols['xs_']+cols['h_']+cols['m_']+cols['i_']+cols['o_']+cols['d_']
    if name == 'B-M':  return ['L']+cols['b_']+cols['xs_']+cols['h_']+cols['i_']
    out = ['L']
    for p in name.split('+'): out += cols[{'B': 'b_', 'XS': 'xs_', 'H': 'h_', 'M': 'm_', 'I': 'i_', 'O': 'o_', 'D': 'd_'}[p]]
    return out
_R = df.R.clip(-1.5, 3); _f = df.f4.clip(-4, 4)
# Rx / f4x: aynı andaki (t, yön) toplantıların ortalamasından fark — "o an hangi coin" sorusu (Ozan'ın sorusu); zamanlama bilgisi çıkar
if TARGET.startswith('g'):
    base_ = TARGET.rstrip('x'); df = df[np.isfinite(df[base_])].reset_index(drop=True); df['R'] = df[base_]  # değerlendirme bu ölçüyle (% işlem başı)
    train_mask = (df.b_score >= MINS).values; _R = df.R.clip(-30, 30); _f = df.f4.clip(-4, 4)
yv = {'g24': _R, 'g72': _R, 'g24x': _R-_R.groupby([df.t, df.L]).transform('mean'), 'g72x': _R-_R.groupby([df.t, df.L]).transform('mean'), 'R': _R, 'y': df.y.astype(float), 'f4': _f, 'Rx': _R-_R.groupby([df.t, df.L]).transform('mean'),
      'f4x': _f-_f.groupby([df.t, df.L]).transform('mean')}[TARGET].values
train_mask = (df.b_score >= MINS).values
starts = pd.date_range('2022-01-01', '2026-10-01', freq='6MS')
WIN = [(int(a.value//10**6), int((starts[i+1] if i+1 < len(starts) else pd.Timestamp('2026-11-01')).value//10**6)) for i, a in enumerate(starts)]

def job(args):
    name, wi = args; a, b = WIN[wi]; F = fs(name); X = df[F].to_numpy(np.float32)
    tr = train_mask & (df.t.values < a-2*DAY); te = (df.t.values >= a) & (df.t.values < b) & df.ent.values
    if LGB:
        import lightgbm as lgb
        m = lgb.LGBMRegressor(n_estimators=NT*2, learning_rate=0.03, num_leaves=15, min_child_samples=400, subsample=0.7, subsample_freq=1, colsample_bytree=0.7, reg_lambda=50, verbose=-1)
        m.fit(X[tr], yv[tr]); p = m.predict(X[te]); imp = m.booster_.feature_importance('gain')
    else:
        m = HGB(n=NT, lr=0.05, d=3, minleaf=800, sub=0.6, seed=wi).fit(X[tr], yv[tr]); p = m.predict(X[te]); imp = m.importance(len(F))
    return name, wi, np.where(te)[0], p, imp

if __name__ == '__main__':
    t0 = time.time(); tasks = [(s, w) for s in SETS for w in range(len(WIN))]
    with Pool(int(arg('jobs', os.cpu_count()))) as P: res = P.map(job, tasks, chunksize=1)
    print('eğitim bitti', round(time.time()-t0), 'sn')
    E = df[df.ent].copy(); rng = np.random.default_rng(1)
    H1 = int(pd.Timestamp('2024-05-01').value//10**6); L12 = int(df.t.max()-365*DAY)
    def boot(d, col):  # gün kümeli bootstrap: kalan R − hepsi
        g = d.groupby('day').agg(n=('R', 'size'), s=('R', 'sum'), nk=(col, 'sum'), sk=('Rk', 'sum')); n, s, nk, sk = g.n.values, g.s.values, g.nk.values, g.sk.values
        diffs = []
        for _ in range(300):
            i = rng.integers(0, len(g), len(g)); diffs.append(sk[i].sum()/max(1, nk[i].sum())-s[i].sum()/n[i].sum())
        return float(np.std(diffs))
    rep = [f"# Ozan işlem kalitesi · ileri yürüyen model ({time.strftime('%Y-%m-%d')})\n",
           f"Hedef `{TARGET}`, eğitim veto dışı puan ≥ {MINS}, {NT} ağaç, {'LightGBM' if LGB else 'numpy HGB'}; değerlendirme masanın girdiği kararlar, örneklem dışı 2022-01 →.\n",
           "| Değişkenler | n | IC (gün içi) | Taban R | En kötü %30 atılınca | fark (t) | En kötü %50 atılınca | fark (t) | 1. yarı fark | 2. yarı fark | Son 12 ay fark | Alt onluk R | Üst onluk R |",
           "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    detail = {}; imps = {}
    for name in SETS:
        P = np.full(len(df), np.nan); imp = np.zeros(len(fs(name)))
        for (nm, wi, ix, p, im) in res:
            if nm != name: continue
            P[ix] = p; imp = imp+im/im.sum() if im.sum() > 0 else imp
        imps[name] = sorted(zip(fs(name), imp/len(WIN)), key=lambda z: -z[1])[:15]
        d = df.loc[df.ent & ~np.isnan(P)].copy(); d['p'] = P[d.index]
        d['pr'] = d.groupby('day').p.rank(pct=True)   # gün içi sıra: canlıda karar anında bilinebilir değil → aşağıda eşik geçmişten
        # canlıda uygulanabilir eşik: o pencerenin eğitim tahminleri yok; onun yerine her pencerede önceki pencerelerin tahmin dağılımı
        # yerine basitçe pencere içi yüzdelik kullanılırsa bakış olur. Bu yüzden eşik = önceki 90 günün tahminlerinin yüzdeliği.
        d = d.sort_values('t'); pv = d.p.values; tv = d.t.values; ut = np.unique(tv); Q = {}
        for t in ut:
            lo, hi = np.searchsorted(tv, t-90*DAY), np.searchsorted(tv, t)
            Q[t] = np.quantile(pv[lo:hi], [0.3, 0.5]) if hi-lo >= 500 else (np.nan, np.nan)
        q30 = np.array([Q[t][0] for t in tv]); q50 = np.array([Q[t][1] for t in tv])
        d['k30'] = (d.p >= q30) | np.isnan(q30); d['k50'] = (d.p >= q50) | np.isnan(q50)
        ic = d.groupby('day').apply(lambda g: g.p.rank().corr(g.R.rank()) if len(g) >= 5 else np.nan).mean()
        def kept(dd, col):
            dd = dd.copy(); dd['Rk'] = dd.R*dd[col]; return dd.R[dd[col]].mean()-dd.R.mean(), boot(dd, col), dd[col].mean()
        k3, s3, f3 = kept(d, 'k30'); k5, s5, f5 = kept(d, 'k50')
        h1 = kept(d[d.t < H1], 'k30')[0]; h2 = kept(d[d.t >= H1], 'k30')[0]; l12 = kept(d[d.t >= L12], 'k30')[0]
        dec = pd.qcut(d.p.rank(method='first'), 10, labels=False); dr = d.R.groupby(dec).mean()
        rep.append(f"| {name} | {len(d)} | {ic:+.3f} | {d.R.mean():+.3f} | {d.R[d.k30].mean():+.3f} (%{100*f3:.0f}) | {k3:+.3f} ({k3/s3:.1f}) | {d.R[d.k50].mean():+.3f} (%{100*f5:.0f}) | {k5:+.3f} ({k5/s5:.1f}) | {h1:+.3f} | {h2:+.3f} | {l12:+.3f} | {dr.iloc[0]:+.3f} | {dr.iloc[-1]:+.3f} |")
        yr = d.groupby(pd.to_datetime(d.t, unit='ms').dt.year).apply(lambda g: g.R[g.k30].mean()-g.R.mean())
        lr = d.groupby('L').apply(lambda g: (g.R.mean(), g.R[g.k30].mean(), g.k30.mean()))
        detail[name] = {'yil': {int(k): round(v, 3) for k, v in yr.items()}, 'onluk': [round(v, 3) for v in dr.values],
                        'yon': {('long' if k else 'short'): [round(v[0], 3), round(v[1], 3), round(v[2], 2)] for k, v in lr.items()}}
        d[['sym', 't', 'L', 'R', 'y', 'f4', 'p', 'k30', 'k50']].to_pickle(OUT.replace('.md', f'-{name}.pkl'))
    rep.append("\nfark = kalan kararların R'si − tüm kararların R'si (kalan payı parantezde). Eşik her an önceki 90 günün örneklem dışı tahminlerinin %30/%50 yüzdeliği (canlıda uygulanabilir).\n")
    rep.append("## Yıl yıl fark (en kötü %30 atılınca)\n\n| Değişkenler | "+" | ".join(str(y) for y in range(2022, 2027))+" |\n|---|"+"---|"*5)
    for n in SETS: rep.append(f"| {n} | "+" | ".join(f"{detail[n]['yil'].get(y, float('nan')):+.3f}" for y in range(2022, 2027))+" |")
    rep.append("\n## Yön (taban R → kalan R, kalan payı)\n")
    for n in SETS: rep.append(f"- {n}: " + ", ".join(f"{k} {v[0]:+.3f} → {v[1]:+.3f} (%{100*v[2]:.0f})" for k, v in detail[n]['yon'].items()))
    rep.append("\n## Onluklar (tahmin, tüm dönem; düşük → yüksek; bakışlı, yalnız okuma için)\n")
    for n in SETS: rep.append(f"- {n}: " + " · ".join(f"{v:+.3f}" for v in detail[n]['onluk']))
    rep.append("\n## En çok kullanılan değişkenler\n")
    for n in SETS: rep.append(f"- {n}: " + ", ".join(f"{c} {100*v:.1f}%" for c, v in imps[n][:12]))
    open(OUT, 'w', encoding='utf-8').write("\n".join(rep)+"\n"); print("\n".join(rep[:4+len(SETS)]))
