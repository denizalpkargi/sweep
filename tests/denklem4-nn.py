# Denklem 4 · sinir ağı v3 (9 Ekim 2026; kullanıcı: "daha derin neural network, daha çok kombinasyon"):
#   - derin artık (residual) MLP gövde (LayerNorm + GELU, 3 blok × 2d genişlik, dropout),
#   - coinler arası dikkat: aynı saatteki coinler bir küme; 2 katmanlı Transformer kodlayıcı coinler arasında dikkat kurar (öncülük, genişlik, göreli konum
#     öğrenilebilir; önceki ağlar her coini tek başına görüyordu),
#   - çok ufuklu çıkış: 1 / 4 / 12 / 24 sa VWAP hedefi aynı anda (ortak gövde),
#   - sıralama kaybı: MSE + (1 − saat içi Pearson korelasyonu) → doğrudan IC'yi iyileştirir,
#   - doğrulama: eğitim penceresinin son 60 günü ayrılır, en iyi IC'li tur saklanır; kosinüs öğrenme hızı, AdamW, gradyan kırpma,
#   - topluluk: iki tohumun ortalaması.
# Girdi: denklem4.f32 (eski 202 + 1 dk mikro yapı + çoklu pencere + coinler arası sıra; 2023-06'dan). Aynı bölünmelerde LightGBM (tümü) kıyası.
# İleriye yürüyen: test 6 ay, eğitim yalnız öncesi (1 gün ara). Kullanım: python3 tests/denklem4-nn.py [--start 12] [--step 6] [--epochs 5] [--maxh 16000] [--d 320] [--lam 1] [--variants derin,coinler,dikkat,tümü] [--out rapor.md] [--pkl ad.pkl]
# Ablasyon (9 Ekim): --lam 0 --variants derin → yalnız MSE ile derin tablo (sıralama kaybının payı).
import json, sys, os, math, time, pickle
import numpy as np, pandas as pd, torch, torch.nn as nn, lightgbm as lgb
torch.set_num_threads(4); D = os.path.join(os.path.dirname(__file__), 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
OUT = arg('out', os.path.join(os.path.dirname(__file__), 'denklem4-nn-report.md')); START = int(arg('start', 12)); STEP = int(arg('step', 6)); EPOCHS = int(arg('epochs', 5)); MAXH = int(arg('maxh', 16000)); DM = int(arg('d', 320)); LAM = float(arg('lam', 1.0))
meta = json.load(open(os.path.join(D, 'denklem4.json'))); COLS = meta['cols']; NEW = meta['new']; t0 = time.time()
X = np.fromfile(os.path.join(D, 'denklem4.f32'), dtype=np.float32).reshape(-1, len(COLS)); df = pd.DataFrame(X, columns=COLS); del X
df = df[np.isfinite(df.y1v) & np.isfinite(df.y4v)].copy(); df['t'] = df.th.astype(np.int64) * 3600000 + meta['t0']; df['month'] = pd.to_datetime(df.t, unit='ms').dt.strftime('%Y-%m')
HZ = {'1 sa': ('y1v', 2.0), '4 sa': ('y4v', 4.0), '12 sa': ('y12v', math.sqrt(48)), '24 sa': ('y24v', math.sqrt(96))}; HN = list(HZ)
for h, (yc, _) in HZ.items(): df[yc + 'c'] = df[yc].clip(-5, 5)
df = df.sort_values(['th', 'sym']).reset_index(drop=True)
DROP = {'sym', 'th', 'y1', 'y4', 'y24', 'y1v', 'y4v', 'y12v', 'y24v', 'sd15', 't', 'month'} | {c + 'c' for c, _ in HZ.values()}
FEATS = [c for c in COLS if c not in DROP]; months = sorted(df.month.unique()); fx = lambda v, d=3: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
thv = df.th.values.astype(np.int64); uh, hstart, hcnt = np.unique(thv, return_index=True, return_counts=True); htime = df.t.values[hstart]; hmonth = df.month.values[hstart]
XF = df[FEATS].values.astype(np.float32); YV = df[[HZ[h][0] + 'c' for h in HN]].values.astype(np.float32)
print('satır', len(df), 'saat', len(uh), 'özellik', len(FEATS), 'ay', months[0], '→', months[-1], f'{time.time()-t0:.0f} sn', flush=True)

def fast_ic(o, pcol, ycol, key='th', minn=10):
    d = o[[key, pcol, ycol]].dropna()
    if len(d) < 50: return np.nan, np.nan, 0
    codes, _ = pd.factorize(d[key].values); n = np.bincount(codes)
    rp = d.groupby(key)[pcol].rank().values; ry = d.groupby(key)[ycol].rank().values
    sx = np.bincount(codes, rp); sy = np.bincount(codes, ry); sxx = np.bincount(codes, rp*rp); syy = np.bincount(codes, ry*ry); sxy = np.bincount(codes, rp*ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx*sy/n)/np.sqrt((sxx - sx*sx/n)*(syy - sy*sy/n))
    r = r[(n >= minn) & np.isfinite(r)]; return (r.mean() if len(r) else np.nan), (r.mean()/r.std()*math.sqrt(len(r)) if len(r) > 2 and r.std() > 0 else np.nan), len(r)

class Trunk(nn.Module):
    def __init__(self, nin, d, nblk=3, p=0.15):
        super().__init__(); self.inp = nn.Linear(nin, d)
        self.blocks = nn.ModuleList([nn.Sequential(nn.LayerNorm(d), nn.Linear(d, 2*d), nn.GELU(), nn.Dropout(p), nn.Linear(2*d, d)) for _ in range(nblk)]); self.out = nn.LayerNorm(d)
    def forward(self, x):
        h = self.inp(x)
        for b in self.blocks: h = h + b(h)
        return self.out(h)
class Net(nn.Module):
    def __init__(self, nin, d, xattn):
        super().__init__(); self.trunk = Trunk(nin, d)
        self.xattn = nn.TransformerEncoder(nn.TransformerEncoderLayer(d, 4, 2*d, dropout=0.1, batch_first=True, norm_first=True, activation='gelu'), xattn) if xattn > 0 else None
        self.head = nn.Sequential(nn.Linear(d, d), nn.GELU(), nn.Linear(d, 4))
    def forward(self, x, mask):
        h = self.trunk(x)
        if self.xattn is not None: h = self.xattn(h, src_key_padding_mask=~mask)
        return self.head(h)
def ic_term(p, y, m):
    mf = m.float(); n = mf.sum(1); ok = n >= 8; yz = torch.nan_to_num(y)
    pm = (p*mf).sum(1)/n.clamp(min=1); ym = (yz*mf).sum(1)/n.clamp(min=1); pc = (p - pm[:, None])*mf; yc = (yz - ym[:, None])*mf
    r = (pc*yc).sum(1)/torch.sqrt((pc*pc).sum(1)*(yc*yc).sum(1) + 1e-8)
    return 1 - (r[ok].mean() if ok.any() else torch.zeros(()))
def batch_idx(H, start, cnt, PAD):
    c = cnt[H]; T = int(c.max()); idx = start[H][:, None] + np.arange(T)[None, :]; valid = np.arange(T)[None, :] < c[:, None]; idx = np.where(valid, idx, PAD); return torch.tensor(idx), torch.tensor(valid)
def train_nn(trH, vaH, teH, xattn, seed, Xs, Ys):
    torch.manual_seed(seed); np.random.seed(seed); PAD = len(Xs) - 1
    net = Net(Xs.shape[1], DM, xattn); opt = torch.optim.AdamW(net.parameters(), lr=1e-3, weight_decay=1e-4); BH = 96; steps = EPOCHS * math.ceil(len(trH)/BH); sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=1e-3, total_steps=steps, pct_start=0.15, anneal_strategy='cos', final_div_factor=50)
    def predict(H):
        net.eval(); out = np.zeros((len(df), 4), np.float32); 
        with torch.no_grad():
            for b in range(0, len(H), 256):
                idx, valid = batch_idx(H[b:b+256], hstart, hcnt, PAD); p = net(Xs[idx], valid).numpy(); ii = idx.numpy()[valid.numpy()]; out[ii] = p[valid.numpy()]
        return out
    def val_ic(H):
        P = predict(H); rows = np.concatenate([np.arange(hstart[h], hstart[h]+hcnt[h]) for h in H]); o = pd.DataFrame({'th': thv[rows], 'p1': P[rows, 0], 'p4': P[rows, 1], 'y1': YV[rows, 0], 'y4': YV[rows, 1]})
        return np.nanmean([fast_ic(o, 'p1', 'y1')[0], fast_ic(o, 'p4', 'y4')[0]])
    best, best_state = -1, None
    for ep in range(EPOCHS):
        net.train(); perm = np.random.permutation(trH); tot = 0; nb = 0
        for b in range(0, len(perm), BH):
            idx, valid = batch_idx(perm[b:b+BH], hstart, hcnt, PAD); x = Xs[idx]; y = Ys[idx]; p = net(x, valid); loss = 0
            for k in range(4):
                m = valid & torch.isfinite(y[:, :, k]); yk = y[:, :, k]; pk = p[:, :, k]
                mse = ((pk - torch.nan_to_num(yk))**2)[m].mean() if m.any() else torch.zeros(()); loss = loss + (mse + LAM*ic_term(pk, yk, m))/4
            opt.zero_grad(); loss.backward(); nn.utils.clip_grad_norm_(net.parameters(), 1.0); opt.step(); sched.step(); tot += loss.item(); nb += 1
        v = val_ic(vaH); print(f'      tur {ep+1} kayıp {tot/max(nb,1):.4f} doğrulama IC {fx(v)} {time.time()-t0:.0f} sn', flush=True)
        if v > best: best, best_state = v, {k: w.clone() for k, w in net.state_dict().items()}
    net.load_state_dict(best_state); return predict(teH), best
def train_lgb(trRows, teRows):
    P = np.zeros((len(teRows), 4), np.float32); tr = df.iloc[trRows]
    for k, h in enumerate(HN):
        yc = HZ[h][0] + 'c'; ok = np.isfinite(tr[yc].values)
        m = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.03, num_leaves=31, min_child_samples=1000, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=10, verbose=-1, n_jobs=4).fit(tr.loc[ok, FEATS], tr.loc[ok, yc]); P[:, k] = m.predict(df.iloc[teRows][FEATS])
    return P
ONLY = arg('variants', None); VARS = [v for v in ['ağ derin tablo', 'ağ coinler arası dikkat', 'ağ dikkat ×2 topluluk', 'LightGBM tümü'] if not ONLY or v.split()[1] in ONLY.split(',')]; oos = {v: [] for v in VARS}
for i in range(START, len(months), STEP):
    test_m = months[i:i+STEP]; tmin = df[df.month == months[i]].t.min(); teH = np.where(np.isin(hmonth, test_m))[0]
    allTr = np.where((hmonth < months[i]) & (htime < tmin - 864e5))[0]
    if len(teH) == 0 or hcnt[allTr].sum() < 50000: continue
    vaH = allTr[htime[allTr] >= tmin - 61*864e5]; trH = allTr[htime[allTr] < tmin - 61*864e5]
    if len(trH) > MAXH: trH = np.sort(np.random.RandomState(7).choice(trH, MAXH, replace=False))
    trRows = np.concatenate([np.arange(hstart[h], hstart[h]+hcnt[h]) for h in trH]); teRows = np.concatenate([np.arange(hstart[h], hstart[h]+hcnt[h]) for h in teH])
    mu = np.nanmean(XF[trRows], 0); sd = np.nanstd(XF[trRows], 0) + 1e-6
    Xs = torch.tensor(np.vstack([np.nan_to_num(np.clip((XF - mu)/sd, -6, 6)).astype(np.float32), np.zeros((1, XF.shape[1]), np.float32)])); Ys = torch.tensor(np.vstack([YV, np.full((1, 4), np.nan, np.float32)]))
    print('test', test_m[0], 'eğitim saat', len(trH), 'satır', len(trRows), 'doğrulama saat', len(vaH), 'test satır', len(teRows), flush=True)
    te = df.iloc[teRows]; base = {'t': te.t.values, 'th': te.th.values, 'sym': te.sym.values, 'sd15': te.sd15.values}
    for h in HN: base['y_' + h] = te[HZ[h][0]].values; base['yc_' + h] = te[HZ[h][0] + 'c'].values
    preds = {}
    if 'ağ derin tablo' in VARS: P, v = train_nn(trH, vaH, teH, 0, 1, Xs, Ys); preds['ağ derin tablo'] = P[teRows]; print('   ', 'ağ derin tablo', 'en iyi doğrulama', fx(v), flush=True)
    if 'ağ coinler arası dikkat' in VARS or 'ağ dikkat ×2 topluluk' in VARS: P1, v1 = train_nn(trH, vaH, teH, 2, 1, Xs, Ys); preds['ağ coinler arası dikkat'] = P1[teRows]; print('   ', 'ağ dikkat', 'en iyi doğrulama', fx(v1), flush=True)
    if 'ağ dikkat ×2 topluluk' in VARS: P2, v2 = train_nn(trH, vaH, teH, 2, 2, Xs, Ys); preds['ağ dikkat ×2 topluluk'] = (P1[teRows] + P2[teRows])/2; print('   ', 'ağ dikkat tohum 2', 'en iyi doğrulama', fx(v2), flush=True)
    if 'LightGBM tümü' in VARS: preds['LightGBM tümü'] = train_lgb(trRows, teRows)
    for v in VARS:
        o = pd.DataFrame(base)
        for k, h in enumerate(HN): o['p_' + h] = preds[v][:, k]
        # eşikler: test içi tahmin dağılımının %95/%5'i (eğitim tahmini saklanmadı; işlem sayısı kıyaslanabilir kalsın)
        for h in HN: o['q95_' + h] = np.quantile(o['p_' + h], 0.95); o['q05_' + h] = np.quantile(o['p_' + h], 0.05)
        oos[v].append(o); print('   ', v, ' '.join(f'{h} {fx(fast_ic(o, "p_"+h, "yc_"+h)[0])}' for h in HN), f'{time.time()-t0:.0f} sn', flush=True)
    del Xs, Ys
pickle.dump({v: pd.concat(parts) for v, parts in oos.items()}, open(os.path.join(D, arg('pkl', 'denklem4-nn-oos.pkl')), 'wb'))
L = [f'# Denklem 4 · sinir ağı v3: derin gövde + coinler arası dikkat + sıralama kaybı + çok ufuk · {time.strftime("%Y-%m-%d")}', '',
     f'{len(df):,} saatlik gözlem ({months[0]} → {months[-1]}), {len(FEATS)} değişken (eski 202 + 1 dk mikro yapı + çoklu pencere + coinler arası sıra). Hedefler: 1 / 4 / 12 / 24 sa VWAP → VWAP ÷ oynaklık. Ağ: artık MLP (d {DM}, 3 blok) → [2 katman coinler arası Transformer] → 4 çıkış; kayıp MSE + {LAM:g}·(1 − saat içi Pearson); AdamW, tek döngü kosinüs, {EPOCHS} tur, eğitim penceresinin son 60 günü doğrulama (en iyi tur). İleriye yürüyen test {STEP} ay, eğitimde en çok {MAXH:,} saat. LightGBM (tümü) aynı bölünmelerde.', '',
     '| Model | Ufuk | Dönem | n | IC | t | Üst−alt onluk % |', '|---|---|---|---|---|---|---|']
SUMM = {}
for v in VARS:
    o = pd.concat(oos[v]); mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5
    for h in HN:
        sc = HZ[h][1]
        for pn, sub in [('tümü', o), ('1. yarı', o[o.t < mid]), ('2. yarı', o[o.t >= mid]), ('son 12 ay', o[o.t >= y12])]:
            sub = sub.dropna(subset=['yc_' + h]); a, at, _ = fast_ic(sub, 'p_' + h, 'yc_' + h)
            dec = np.floor(sub.groupby('th')['p_' + h].rank(method='first', pct=True).values*10 - 1e-9).clip(0, 9); ret = sub['y_' + h].values*sub.sd15.values*sc*100; sp = ret[dec == 9].mean() - ret[dec == 0].mean()
            SUMM[(v, h, pn)] = (a, sp); L.append(f'| {v} | {h} | {pn} | {len(sub):,} | {fx(a)} | {fx(at, 1)} | {fx(sp)} |')
L += ['', '## Gerçek işlem gibi: her ufukta en güçlü 2 long + 2 short (test içi %95/%5 eşiği, coin kilidi, VWAP dolum)', '', '| Model | Ufuk | Dönem | İşlem | Ort. % (maliyetsiz) | Maker sonrası (%0,04) | Taker sonrası (%0,16) | Kazanma |', '|---|---|---|---|---|---|---|---|']
STEPH = {'1 sa': 1, '4 sa': 4, '12 sa': 12, '24 sa': 24}
for v in VARS:
    for h in ['1 sa', '4 sa', '12 sa']:
        o = pd.concat(oos[v]).dropna(subset=['y_' + h]); st = STEPH[h]; o = o[(o.th % st) == 0]; mid = np.sort(o.t.values)[len(o)//2]; y12 = o.t.max() - 365*864e5; busy = {}; T = []; sc = HZ[h][1]; pc = 'p_' + h
        longs = o[o[pc] >= o['q95_' + h]].sort_values(['th', pc], ascending=[True, False]).groupby('th').head(2).assign(d=1)
        shorts = o[o[pc] <= o['q05_' + h]].sort_values(['th', pc], ascending=[True, True]).groupby('th').head(2).assign(d=-1)
        cand = pd.concat([longs, shorts]).sort_values('th')
        for th, sym_, tt, d, yv, sdv in zip(cand.th.values, cand.sym.values, cand.t.values, cand.d.values, cand['y_' + h].values, cand.sd15.values):
            if busy.get(sym_, -1) > th: continue
            busy[sym_] = th + st; T.append((tt, d*yv*sdv*sc*100))
        T = pd.DataFrame(T, columns=['t', 'ret'])
        for pn, sub in [('1. yarı', T[T.t < mid]), ('2. yarı', T[T.t >= mid]), ('son 12 ay', T[T.t >= y12])]:
            if len(sub): L.append(f'| {v} | {h} | {pn} | {len(sub):,} | {fx(sub.ret.mean())} | {fx(sub.ret.mean()-0.04)} | {fx(sub.ret.mean()-0.16)} | %{100*(sub.ret>0).mean():.1f} |'.replace('.', ',', 0))
g = lambda v, h, p='tümü': SUMM.get((v, h, p), (np.nan, np.nan))[0]
L += ['', '## Karar', '', 'IC (tümü): ' + ' · '.join(f'{h}: ' + ', '.join(f'{v} {fx(g(v, h))}' for v in VARS) for h in HN) + '.', '',
      'Son 12 ay: ' + ' · '.join(f'{h}: ' + ', '.join(f'{v} {fx(g(v, h, "son 12 ay"))}' for v in VARS) for h in HN) + '.', '']
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L[-4:])); print('yazıldı', OUT, 'süre', f'{time.time()-t0:.0f} sn')
