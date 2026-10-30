# Test #96: Ozan sırasına bant + kısmi geçiş (devir cezası) (26 Ekim taraması; SFI 24-47, Gârleanu–Pedersen).
# Girdi: Ozan örneklem dışı tahminleri (rank-oos-tam-{4,12}.pkl, 2024-06 →, saatlik, ilk 30), sinyal = iki modelin saat içi yüzdeliklerinin ortalaması.
# Saatlik portföy (T = saat başı): getiri T'de açılan 15 dk mumun VWAP'ı → T+1 sa'te açılan mumun VWAP'ı (basit), fonlama arşivdeki gerçek ödemeler.
# Pozisyon başına ağırlık 1/K, K = saatteki coin sayısının %10'u (≈3): tam dengelemede brüt kaldıraç 1.
#   tam   : her saat en kötü %10 short (long: en iyi %10), gerisi kapalı (#32/#83'teki tam dengeleme)
#   bant  : en kötü %10'a girince aç, en kötü %30'un dışına çıkınca kapat (long ayna)
#   kısmi : w ← w + λ·(hedef − w), λ 0,05 / 0,1 / 0,2 (hedef tam dengelemedeki ağırlık)
# Maliyet: devir başına taker %0,05 + kayma %0,03 (|Δw| × %0,08). Plasebo: aynı kuralla saat içi karıştırılmış sıra (20 tekrar).
# Felaket stopu bu saatlik simülasyonda yok (her saat yeniden değerlendirilir); en kötü saat ve en büyük düşüş raporlanır.
# Parametreler test listesinden, sonuca bakmadan. Kullanım: python3 tests/test96-ozan-bant.py → tests/test96-ozan-bant-report.md
import json, os, time, numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch'); OUT = os.path.join(HERE, 'test96-ozan-bant-report.md'); t0 = time.time()
H = 3600000; COST = 0.0008
meta = json.load(open(os.path.join(D, 'rank.json'))); SY = meta['syms']
O = {}
for h in (4, 12):
    o = pd.read_pickle(os.path.join(D, f'rank-oos-tam-{h}.pkl')).reset_index(drop=True); o['si'] = o.si.round().astype(int)
    o['pc'] = o.groupby('t').p.rank(pct=True); O[h] = o[['t', 'si', 'pc']]
S = O[4].merge(O[12], on=['t', 'si'], suffixes=('4', '12')); S['s'] = (S.pc4 + S.pc12) / 2
S['sym'] = [SY[i] for i in S.si.values]; T = np.sort(S.t.unique()); TI = {t: i for i, t in enumerate(T)}
syms = sorted(S.sym.unique()); CI = {s: i for i, s in enumerate(syms)}; nT, nC = len(T), len(syms)
SIG = np.full((nT, nC), np.nan);
for t, s, v in zip(S.t.values, S.sym.values, S.s.values): SIG[TI[t], CI[s]] = v
RET = np.full((nT, nC), np.nan); FUN = np.zeros((nT, nC))
TMIN = int(T.min()) - 86400000
for s in syms:
    a = pd.read_csv(os.path.join(D, '15m', s + '.csv'), header=None, usecols=[0, 2, 3, 4, 5, 7], names=['t', 'h', 'l', 'c', 'v', 'q'])
    a = a[a.t >= TMIN].drop_duplicates('t').set_index('t').sort_index()
    vw = np.where((a.v > 0) & (a.q > 0), a.q / a.v.where(a.v > 0, 1), a.c); vw = np.where((vw >= a.l * 0.999) & (vw <= a.h * 1.001), vw, a.c)
    vw = pd.Series(np.where(a.v > 0, vw, np.nan), index=a.index)
    p0 = vw.reindex(T).values; p1 = vw.reindex(T + H).values; RET[:, CI[s]] = p1 / p0 - 1
    f = os.path.join(D, 'funding', s + '.csv')
    if os.path.exists(f):
        F = pd.read_csv(f, header=None, names=['t', 'r']).drop_duplicates('t'); F = F[(F.t > T.min()) & (F.t <= T.max() + H)]
        k = np.searchsorted(T, F.t.values, 'left') - 1  # (T, T+1h] aralığındaki ödeme T saatine
        ok = (k >= 0) & (k < nT); np.add.at(FUN[:, CI[s]], k[ok], F.r.values[ok])
print('saat', nT, 'coin', nC, f'{time.time()-t0:.0f} sn', flush=True)
valid = ~np.isnan(SIG) & ~np.isnan(RET)
def target(sig, side, q):
    n = np.sum(~np.isnan(sig)); K = max(1, round(0.1 * n)); x = np.where(np.isnan(sig), np.inf, sig); r = np.empty(len(x)); r[np.argsort(x, kind='stable')] = np.arange(1, len(x) + 1)  # küçük = kötü
    sel = (r <= q * n) if side == 'short' else (r > (1 - q) * n)
    return sel & ~np.isnan(sig), K
def sim(side, mode, lam=None, sigm=SIG):
    sg = -1 if side == 'short' else 1; w = np.zeros(nC); out = np.zeros(nT); gross = np.zeros(nT); turn = np.zeros(nT)
    for i in range(nT):
        sig = np.where(valid[i], sigm[i], np.nan); inn, K = target(sig, side, 0.1)
        if mode == 'tam': nw = np.where(inn, sg / K, 0.0)
        elif mode == 'bant':
            keep, _ = target(sig, side, 0.3); held = (w != 0) & keep; nw = np.where(inn | held, sg / K, 0.0)
        else: nw = w + lam * (np.where(inn, sg / K, 0.0) - w); nw[np.abs(nw) < 1e-4] = 0
        nw = np.where(valid[i], nw, 0.0)
        dw = np.abs(nw - w).sum(); r = np.nan_to_num(RET[i]); fu = FUN[i]
        out[i] = (nw * r).sum() - (nw * fu).sum() - COST * dw; gross[i] = np.abs(nw).sum(); turn[i] = dw; w = nw
    return out, gross, turn
mid = T[nT // 2]; y12 = T.max() - 365 * 86400000
def st(x, m):
    x = x[m]; d = pd.Series(x).groupby(T[m] // 86400000).sum(); n = len(d)
    if n < 20: return None
    eq = np.cumprod(1 + d.values); dd = (eq / np.maximum.accumulate(eq) - 1).min()
    return d.mean() * 100, d.mean() / (d.std() / np.sqrt(n)), (eq[-1] ** (365 / n) - 1) * 100 if eq[-1] > 0 else -100, dd * 100
fx = lambda v, d=3: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ',')
L = ['# Test #96: Ozan sırasına bant + kısmi geçiş', '',
     f'Ozan örneklem dışı sırası (4 ve 12 sa modellerinin ortalaması), ilk 30, saatlik, {pd.to_datetime(T.min(), unit="ms"):%Y-%m-%d} → {pd.to_datetime(T.max(), unit="ms"):%Y-%m-%d}. '
     'Getiri VWAP → VWAP (basit), gerçek fonlama, devir başına %0,08. Ağırlık pozisyon başına 1/K (K ≈ evrenin %10\'u). Günlük getiri toplamları; t günlük.', '',
     '| Bacak | Kural | günlük % | t | 1. yarı % | 2. yarı % | son 12 ay % | yıllık % | düşüş % | ort. brüt | saatlik devir | maliyet / brüt kâr |', '|---|---|---|---|---|---|---|---|---|---|---|---|']
rng = np.random.default_rng(96); allm = np.ones(nT, bool)
for side in ('short', 'long'):
    for mode, lam in (('tam', None), ('bant', None), ('kısmi', 0.05), ('kısmi', 0.1), ('kısmi', 0.2)):
        x, g, tu = sim(side, mode, lam); nm = mode if lam is None else f'kısmi λ {lam}'.replace('.', ',')
        a, b, c, e = st(x, allm), st(x, T < mid), st(x, T >= mid), st(x, T >= y12)
        brut = x + COST * tu; cr = (COST * tu).sum() / brut.sum() if brut.sum() > 0 else np.inf
        L.append(f'| {side} | {nm} | {fx(a[0])} | {fx(a[1],1)} | {fx(b[0])} | {fx(c[0])} | {fx(e[0])} | {fx(a[2],0)} | {fx(a[3],0)} | {g.mean():.2f} | {tu.mean():.3f} | {"brüt ≤ 0" if not np.isfinite(cr) else f"{cr:.2f}"} |'.replace('.', ','))
        print(side, nm, f'{time.time()-t0:.0f} sn', flush=True)
# plasebo: karıştırılmış sıra, bant kuralı (short)
L += ['', '## Plasebo (saat içi karıştırılmış sıra, aynı kural, 20 tekrar): günlük %', '', '| Bacak | Kural | gerçek | plasebo ort. | plasebo en iyi |', '|---|---|---|---|---|']
for side in ('short', 'long'):
    for mode, lam in (('bant', None), ('kısmi', 0.1)):
        real = st(sim(side, mode, lam)[0], allm)[0]; pl = []
        for _ in range(20):
            sh = SIG.copy()
            for i in range(nT):
                m = ~np.isnan(sh[i]); sh[i, m] = rng.permutation(sh[i, m])
            pl.append(st(sim(side, mode, lam, sh)[0], allm)[0])
        nm = mode if lam is None else f'kısmi λ {lam}'.replace('.', ',')
        L.append(f'| {side} | {nm} | {fx(real)} | {fx(np.mean(pl))} | {fx(np.max(pl))} |')
        print('plasebo', side, nm, f'{time.time()-t0:.0f} sn', flush=True)
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L))
