# "Denklem" araştırması, 3. adım (8 Ekim 2026; kullanıcı: "sinir ağı gibi binlerce değişkeni aynı anda kombinasyonlayıp doğru
# sinyalleri bulabiliriz"): tablo özellikleri (denklem.f32, ~120 değişken) + son 32 mumun ham dizisi (7 kanal: getiri, hacim, taker,
# aralık, gövde, üst/alt fitil) ile sinir ağı (Conv1d + GRU + MLP), hedef VWAP → VWAP 1 sa ve 4 sa (oynaklık biriminde).
# İleriye yürüyen: test dönemleri 6 ay, eğitim yalnız öncesi (1 gün ara). Aynı bölünmelerde LightGBM (tablo) kıyas.
# Varyantlar: tablo-only ağ, tablo+dizi ağ, LightGBM. Ölçü: saatlik coinler arası IC, üst−alt onluk VWAP getirisi (%), 2+2 işlem.
# Kullanım: python3 tests/denklem-nn.py [--from 2023-06] [--start 12] [--step 6] [--epochs 3] [--maxtrain 600000] [--out rapor.md]
import json, sys, os, math, time
import numpy as np, pandas as pd, torch, torch.nn as nn, lightgbm as lgb
torch.set_num_threads(4); torch.manual_seed(1); np.random.seed(1)
D = os.path.join(os.path.dirname(__file__), 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
OUT = arg('out', os.path.join(os.path.dirname(__file__), 'denklem-nn-report.md')); FROM = arg('from', None); START = int(arg('start', 12)); STEP = int(arg('step', 6))
EPOCHS = int(arg('epochs', 3)); MAXTR = int(arg('maxtrain', 600000)); SEQ = 32
meta = json.load(open(os.path.join(D, 'denklem.json'))); COLS = meta['cols']; SYMS = meta['syms']
X = np.fromfile(os.path.join(D, 'denklem.f32'), dtype=np.float32).reshape(-1, len(COLS)); df = pd.DataFrame(X, columns=COLS); del X
df = df[np.isfinite(df.y1v) & np.isfinite(df.y4v)].copy()
df['t'] = df.th.astype(np.int64) * 3600000 + meta['t0']; df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
if FROM: df = df[df.month >= FROM].copy()
df['y1c'] = df.y1v.clip(-5, 5); df['y4c'] = df.y4v.clip(-5, 5); df = df.reset_index(drop=True)
DROP = {'sym', 'th', 'y1', 'y4', 'y24', 'y1v', 'y4v', 'sd15', 't', 'month', 'y1c', 'y4c'}; FEATS = [c for c in COLS if c not in DROP]
months = sorted(df.month.unique()); t0 = time.time()
print('satır', len(df), 'ay', months[0], '→', months[-1], 'özellik', len(FEATS), flush=True)
fx = lambda v, d=3: ('—' if not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))

# ---------- dizi kanalları: coin başına 15 dk mumlardan ----------
print('diziler hazırlanıyor', flush=True)
SEQX = np.zeros((len(df), 7, SEQ), dtype=np.float32)
for si, name in enumerate(SYMS):
    idx = np.where(df.sym.values == si)[0]
    if len(idx) == 0: continue
    k = np.loadtxt(os.path.join(D, '15m', name + '.csv'), delimiter=',', usecols=(0, 1, 2, 3, 4, 7, 10), ndmin=2)
    ot = k[:, 0]; o = k[:, 1]; h = k[:, 2]; l = k[:, 3]; c = k[:, 4]; q = k[:, 5]; tb = k[:, 6]
    lr = np.zeros(len(k)); lr[1:] = np.log(c[1:]/c[:-1]); rg = np.log(np.maximum(h, 1e-12)/np.maximum(l, 1e-12))
    q30 = pd.Series(q).rolling(2880, min_periods=100).mean().values; rg30 = pd.Series(rg).rolling(2880, min_periods=100).mean().values
    sd = df.sd15.values[idx]
    pos = np.searchsorted(ot, df.t.values[idx] - 900000); ok = (pos >= SEQ) & (pos < len(ot)) & (ot[np.minimum(pos, len(ot)-1)] == df.t.values[idx] - 900000)
    p = pos[ok]; ii = idx[ok]; s_ = sd[ok]
    win = p[:, None] - np.arange(SEQ-1, -1, -1)[None, :]  # (n, SEQ) eski → yeni
    body = (c - o) / np.maximum(h - l, 1e-12); uw = (h - np.maximum(o, c)) / np.maximum(h - l, 1e-12); lw = (np.minimum(o, c) - l) / np.maximum(h - l, 1e-12)
    ch = [lr[win] / np.maximum(s_[:, None], 1e-6), np.log(np.maximum(q[win], 1) / np.maximum(q30[win], 1)), tb[win] / np.maximum(q[win], 1e-9) - 0.5, rg[win] / np.maximum(rg30[win], 1e-9), body[win], uw[win], lw[win]]
    for ci, a in enumerate(ch): SEQX[ii, ci, :] = np.nan_to_num(np.clip(a, -8, 8)).astype(np.float32)
print('diziler', f'{time.time()-t0:.0f} sn', flush=True)

def fast_ic(o, pcol, ycol, key='th', minn=10):
    d = o[[key, pcol, ycol]].dropna(); codes, _ = pd.factorize(d[key].values); n = np.bincount(codes)
    rp = d.groupby(key)[pcol].rank().values; ry = d.groupby(key)[ycol].rank().values
    sx = np.bincount(codes, rp); sy = np.bincount(codes, ry); sxx = np.bincount(codes, rp*rp); syy = np.bincount(codes, ry*ry); sxy = np.bincount(codes, rp*ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx*sy/n)/np.sqrt((sxx - sx*sx/n)*(syy - sy*sy/n))
    r = r[(n >= minn) & np.isfinite(r)]; return (r.mean() if len(r) else np.nan), (r.mean()/r.std()*math.sqrt(len(r)) if len(r) > 2 and r.std() > 0 else np.nan), len(r)

class Net(nn.Module):
    def __init__(self, ntab, seq=True):
        super().__init__(); self.seq = seq
        self.tab = nn.Sequential(nn.Linear(ntab, 256), nn.ReLU(), nn.Dropout(0.1), nn.Linear(256, 128), nn.ReLU())
        if seq:
            self.conv = nn.Sequential(nn.Conv1d(7, 32, 3, padding=1), nn.ReLU(), nn.Conv1d(32, 32, 3, padding=1), nn.ReLU())
            self.gru = nn.GRU(32, 64, batch_first=True)
        self.head = nn.Sequential(nn.Linear(128 + (64 if seq else 0), 128), nn.ReLU(), nn.Dropout(0.1), nn.Linear(128, 2))
    def forward(self, xt, xs=None):
        h = self.tab(xt)
        if self.seq:
            z = self.conv(xs).transpose(1, 2); _, g = self.gru(z); h = torch.cat([h, g[-1]], 1)
        return self.head(h)

def train_nn(tr_idx, te_idx, seq):
    mu = np.nanmean(df.loc[tr_idx, FEATS].values, 0); sd = np.nanstd(df.loc[tr_idx, FEATS].values, 0) + 1e-6
    prep = lambda ix: torch.tensor(np.nan_to_num(np.clip((df.loc[ix, FEATS].values - mu) / sd, -6, 6)).astype(np.float32))
    Xt = prep(tr_idx); Y = torch.tensor(df.loc[tr_idx, ['y1c', 'y4c']].values.astype(np.float32)); S = torch.tensor(SEQX[tr_idx]) if seq else None
    net = Net(len(FEATS), seq); opt = torch.optim.Adam(net.parameters(), lr=1e-3, weight_decay=1e-5); bs = 2048; n = len(tr_idx)
    for ep in range(EPOCHS):
        net.train(); perm = torch.randperm(n); tot = 0
        for b in range(0, n, bs):
            j = perm[b:b+bs]; opt.zero_grad(); out = net(Xt[j], S[j] if seq else None); loss = nn.functional.mse_loss(out, Y[j]); loss.backward(); opt.step(); tot += loss.item()*len(j)
        print(f'    epoch {ep+1} loss {tot/n:.4f} {time.time()-t0:.0f} sn', flush=True)
    net.eval(); Xe = prep(te_idx); Se = torch.tensor(SEQX[te_idx]) if seq else None; P = []
    with torch.no_grad():
        for b in range(0, len(te_idx), 8192): P.append(net(Xe[b:b+8192], Se[b:b+8192] if seq else None).numpy())
    P = np.concatenate(P); Ptr = []
    with torch.no_grad():
        sub = torch.randperm(n)[:200000]
        for b in range(0, len(sub), 8192): j = sub[b:b+8192]; Ptr.append(net(Xt[j], S[j] if seq else None).numpy())
    return P, np.concatenate(Ptr)

def train_lgb(tr_idx, te_idx):
    tr = df.loc[tr_idx]; P = []; Ptr = []
    for tg in ['y1c', 'y4c']:
        m = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.03, num_leaves=31, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10, verbose=-1, n_jobs=4).fit(tr[FEATS], tr[tg])
        P.append(m.predict(df.loc[te_idx, FEATS])); Ptr.append(m.predict(tr[FEATS].sample(min(len(tr), 200000), random_state=2)))
    return np.stack(P, 1), np.stack(Ptr, 1)

VARS = ['ağ tablo', 'ağ tablo+dizi', 'LightGBM tablo']; oos = {v: [] for v in VARS}
for i in range(START, len(months), STEP):
    test_m = months[i:i+STEP]; tmin = df[df.month == months[i]].t.min()
    tr_idx = df.index[(df.month < months[i]) & (df.t < tmin - 864e5)].values; te_idx = df.index[df.month.isin(test_m)].values
    if len(te_idx) == 0 or len(tr_idx) < 50000: continue
    if len(tr_idx) > MAXTR: tr_idx = np.sort(np.random.choice(tr_idx, MAXTR, replace=False))
    print('test', test_m[0], 'eğitim', len(tr_idx), 'test', len(te_idx), flush=True)
    for v in VARS:
        P, Ptr = train_nn(tr_idx, te_idx, v == 'ağ tablo+dizi') if v.startswith('ağ') else train_lgb(tr_idx, te_idx)
        te = df.loc[te_idx]
        oos[v].append(pd.DataFrame({'t': te.t.values, 'th': te.th.values, 'sym': te.sym.values, 'sess': te.sess.values, 'sd15': te.sd15.values, 'p1': P[:, 0], 'p4': P[:, 1], 'q95': np.quantile(Ptr[:, 0], 0.95), 'q05': np.quantile(Ptr[:, 0], 0.05), 'y1v': te.y1v.values, 'y4v': te.y4v.values, 'y1c': te.y1c.values, 'y4c': te.y4c.values}))
        print('   ', v, 'IC 1 sa', fx(fast_ic(oos[v][-1], 'p1', 'y1c')[0]), '4 sa', fx(fast_ic(oos[v][-1], 'p4', 'y4c')[0]), f'{time.time()-t0:.0f} sn', flush=True)

L = [f'# Denklem · sinir ağı ile tablo + ham dizi, VWAP hedefi · {time.strftime("%Y-%m-%d")}', '',
     f'{len(df):,} saatlik gözlem{(" (" + FROM + " sonrası)") if FROM else ""}, {len(FEATS)} tablo değişkeni + son {SEQ} mumun 7 kanalı. Hedef: sonraki mumun VWAP\'ından 1 sa / 4 sa sonraki mumun VWAP\'ına getiri ÷ oynaklık (gerçekçi dolum). İleriye yürüyen, test dönemi {STEP} ay, eğitim yalnız öncesi (en çok {MAXTR:,} satır örneklenir), ağ {EPOCHS} tur. Üç model aynı bölünmelerde.', '',
     '| Model | Dönem | n | IC 1 sa | t | IC 4 sa | t | Üst−alt onluk 1 sa % | Üst−alt onluk 4 sa % |', '|---|---|---|---|---|---|---|---|---|']
SUMM = {}
for v in VARS:
    o = pd.concat(oos[v]); mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5
    for pn, sub in [('tümü', o), ('1. yarı', o[o.t < mid]), ('2. yarı', o[o.t >= mid]), ('son 12 ay', o[o.t >= y12])]:
        a, at, _ = fast_ic(sub, 'p1', 'y1c'); b, bt, _ = fast_ic(sub, 'p4', 'y4c'); sub = sub.copy()
        sp = []
        for pc, yc, hz in [('p1', 'y1v', 2), ('p4', 'y4v', 4)]:
            dec = np.floor(sub.groupby('th')[pc].rank(method='first', pct=True).values*10 - 1e-9).clip(0, 9); ret = sub[yc].values*sub.sd15.values*hz*100
            sp.append(ret[dec == 9].mean() - ret[dec == 0].mean())
        SUMM[(v, pn)] = (a, sp[0]); L.append(f'| {v} | {pn} | {len(sub):,} | {fx(a)} | {fx(at,1)} | {fx(b)} | {fx(bt,1)} | {fx(sp[0])} | {fx(sp[1])} |')
L += ['', '## Seansa göre IC (1 sa, 1. yarı / 2. yarı)', '', '| Model | Asya | Londra | New York | Gece |', '|---|---|---|---|---|']
for v in VARS:
    o = pd.concat(oos[v]); mid = np.sort(o.t.values)[len(o)//2]
    L.append(f'| {v} | ' + ' | '.join(f'{fx(fast_ic(o[(o.sess==s)&(o.t<mid)], "p1", "y1c")[0])} / {fx(fast_ic(o[(o.sess==s)&(o.t>=mid)], "p1", "y1c")[0])}' for s in range(4)) + ' |')
L += ['', '## Gerçek işlem gibi: saat başı en güçlü 2 long + 2 short (1 sa modeli, VWAP dolum, coin kilidi)', '', '| Model | Dönem | İşlem | Ort. % (maliyetsiz) | Maker sonrası | Taker sonrası | Kazanma |', '|---|---|---|---|---|---|---|']
for v in VARS:
    o = pd.concat(oos[v]).sort_values(['th', 'p1']); mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5; busy = {}; T = []
    for th, g in o.groupby('th', sort=True):
        cand = [(1, r) for _, r in g[g.p1 >= g.q95].nlargest(2, 'p1').iterrows()] + [(-1, r) for _, r in g[g.p1 <= g.q05].nsmallest(2, 'p1').iterrows()]
        for d, r in cand:
            if busy.get(r.sym, -1) > th: continue
            busy[r.sym] = th + 1; T.append((r.t, d*r.y1v*r.sd15*2*100))
    T = pd.DataFrame(T, columns=['t', 'ret'])
    for pn, sub in [('1. yarı', T[T.t < mid]), ('2. yarı', T[T.t >= mid]), ('son 12 ay', T[T.t >= y12])]:
        L.append(f'| {v} | {pn} | {len(sub):,} | {fx(sub.ret.mean())} | {fx(sub.ret.mean()-0.04)} | {fx(sub.ret.mean()-0.16)} | %{100*(sub.ret>0).mean():.1f} |'.replace('.', ',', 0))
best = max(VARS, key=lambda v: SUMM[(v, 'tümü')][0])
L += ['', '## Karar', '', f'En iyi IC: {best} ({fx(SUMM[(best, "tümü")][0])}). Dizi girdisinin tabloya katkısı: ağ tablo {fx(SUMM[("ağ tablo", "tümü")][0])} → tablo+dizi {fx(SUMM[("ağ tablo+dizi", "tümü")][0])}; LightGBM {fx(SUMM[("LightGBM tablo", "tümü")][0])}. Üst−alt onluk 1 sa (iki bacak, maliyetsiz, maker iki bacak %0,08): ' + ' · '.join(f'{v} {fx(SUMM[(v, "tümü")][1])}%' for v in VARS) + '.', '']
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L)); print('süre', f'{time.time()-t0:.0f} sn')
