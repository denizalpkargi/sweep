# Test #99: BTC rejim kapısı için istatistiksel sıçrama modeli (2 Kasım taraması; Shu–Yu–Mulvey 2024, arXiv 2402.05272).
# Bu betik yalnız kapıyı üretir: tests/data/arch/test99-kapi.csv (t = gün başı ms, j = 0/1 sıçrama kapısı, lam = seçilen λ).
# Trend sepetindeki kıyas tests/test99-kapi-trend.js'te (canlı kod; SMA50, SMA200, sıçrama, rastgele).
# BTC günlük: Binance spot 2017-08 → 2019-12 (tests/test99-btc-spot.sh indirir) + arşiv perp 1g 2020-01 →.
# Model (parametreler sonuca bakmadan, makaleden; kısa geçmiş yüzünden pencere genişleyen):
#   girdiler günlük log getiriden: üstel aşağı sapma (yarı ömür 10 g), üstel Sortino (20 g ve 60 g); eğitim penceresinde standartlaştırılır.
#   iki durum; kayıp = Σ ||x_t − μ_s||² + λ · (durum değişimi sayısı); koordinat inişi (DP atama ↔ merkez), 10 başlangıç.
#   boğa = eğitimde ortalama getirisi yüksek durum. Yeniden kurma 6 ayda bir (1 Ocak / 1 Temmuz), pencere en çok 3000 gün, en az 730 gün.
#   canlı çıkarım: sabit merkezlerle ileri DP, t günündeki durum = argmin V_t (geleceğe bakmaz).
#   λ ∈ {0, 1, 3, 10, 30, 100, 300}; her ay başında, örneklem dışı çıkarılmış durumlarla 0/1 BTC stratejisinin (1 gün gecikme, geçişte %0,10)
#   son en çok 8 yıllık Sharpe'ı en yüksek λ seçilir (en az 365 gün örneklem dışı geçmiş gerekir).
# Kapı t günü başında: t−1 kapanışına kadar veriyle çıkarılan durum (Trend sepetindeki SMA kapısıyla aynı zamanlama).
import os, sys, numpy as np, pandas as pd
H = os.path.dirname(os.path.abspath(__file__)); A = os.path.join(H, 'data', 'arch'); DAY = 86400000
SPOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(A, 'btc-spot-1d.csv')
sp = pd.read_csv(SPOT, header=None, usecols=[0, 4], names=['t', 'c']); pp = pd.read_csv(f'{A}/1d/BTCUSDT.csv', header=None, usecols=[0, 4], names=['t', 'c'])
sp = sp[sp.t < pp.t.min()]; B = pd.concat([sp, pp]).drop_duplicates('t').sort_values('t').reset_index(drop=True)
full = np.arange(B.t.min(), B.t.max() + DAY, DAY); B = B.set_index('t').reindex(full).ffill().rename_axis('t').reset_index()  # arşivde eksik gün (2026-10-28) önceki kapanışla
t = B.t.values; r = np.diff(np.log(B.c.values), prepend=np.nan); r[0] = 0.0; n = len(r)
def ewm(x, hl): return pd.Series(x).ewm(halflife=hl, adjust=False).mean().values
neg = np.minimum(r, 0) ** 2
dd10 = np.sqrt(ewm(neg, 10)); so = [ewm(r, h) / np.sqrt(ewm(neg, h) + 1e-12) for h in (20, 60)]
X = np.column_stack([np.log(dd10 + 1e-9), so[0], so[1]]); X[:60] = np.nan  # ısınma
LAMS = [0, 1, 3, 10, 30, 100, 300]
rng = np.random.default_rng(99)
def dp_assign(L, lam):
    m = len(L); V = L[0].copy(); bp = np.zeros((m, 2), int)
    for i in range(1, m):
        stay, sw = V, V[::-1] + lam; bp[i] = np.where(stay <= sw, [0, 1], [1, 0]); V = L[i] + np.minimum(stay, sw)
    s = np.zeros(m, int); s[-1] = int(np.argmin(V))
    for i in range(m - 1, 0, -1): s[i - 1] = bp[i, s[i]]
    return s, V.min()
def fit(Z, lam):
    best = None
    for _ in range(10):
        i0 = rng.integers(len(Z)); d = ((Z - Z[i0]) ** 2).sum(1); i1 = rng.choice(len(Z), p=d / d.sum()); mu = Z[[i0, i1]].copy()
        for _ in range(30):
            L = ((Z[:, None, :] - mu[None]) ** 2).sum(2); s, obj = dp_assign(L, lam)
            nm = np.array([Z[s == k].mean(0) if (s == k).any() else mu[k] for k in (0, 1)])
            if np.allclose(nm, mu): break
            mu = nm
        if best is None or obj < best[0]: best = (obj, mu, s)
    return best[1], best[2]
def online(Z, mu, lam):
    L = ((Z[:, None, :] - mu[None]) ** 2).sum(2); V = L[0].copy(); out = np.zeros(len(Z), int); out[0] = np.argmin(V)
    for i in range(1, len(Z)): V = L[i] + np.minimum(V, V[::-1] + lam); out[i] = np.argmin(V)
    return out
ts = pd.to_datetime(t, unit='ms'); first = 60
refits = [i for i in range(n) if ts[i].day == 1 and ts[i].month in (1, 7) and i - first >= 730]
S = {lam: np.full(n, -1) for lam in LAMS}  # örneklem dışı durum (1 = boğa) t günü kapanışında bilinen
for k, i0 in enumerate(refits):
    i1 = refits[k + 1] if k + 1 < len(refits) else n
    a = max(first, i0 - 3000); Xw = X[a:i0]; m, sd = Xw.mean(0), Xw.std(0); Zall = (X[a:i1] - m) / sd
    for lam in LAMS:
        mu, s = fit(Zall[:i0 - a], lam)
        bull = int(np.argmax([r[a:i0][s == q].mean() if (s == q).any() else -1 for q in (0, 1)]))
        st = online(Zall, mu, lam)  # pencere başından ileri DP, sabit merkezler
        S[lam][i0:i1] = (st[i0 - a:] == bull).astype(int)
    print('yeniden kurma', ts[i0].date(), flush=True)
# λ seçimi: ay başında, geçmiş örneklem dışı 0/1 stratejinin Sharpe'ı
def sharpe(pos, ret):
    x = pos[:-1] * ret[1:] - 0.001 * np.abs(np.diff(pos)); return x.mean() / x.std() * np.sqrt(365) if x.std() > 0 else -9
G = np.full(n, -1); LS = np.full(n, np.nan); oos0 = refits[0]
for i in range(n):
    if ts[i].day != 1 and i > 0 and not np.isnan(LS[i - 1]): G[i] = S[int(LS[i - 1])][i]; LS[i] = LS[i - 1]; continue
    a = max(oos0, i - 8 * 365)
    if i - a < 365: continue
    best = max(LAMS, key=lambda lam: sharpe(S[lam][a:i].astype(float), r[a:i]))
    LS[i] = best; G[i] = S[best][i]
# kapı t günü başında = t−1 kapanışındaki durum
out = pd.DataFrame({'t': t[1:], 'j': G[:-1], 'lam': LS[:-1]}); out = out[out.j >= 0]
for lam in LAMS: out[f'j{lam}'] = S[lam][:-1][out.index]
out.to_csv(f'{A}/test99-kapi.csv', index=False)
print(out.lam.value_counts().to_dict(), 'gün', len(out), 'boğa payı', round(out.j.mean(), 3), 'ilk', pd.to_datetime(out.t.min(), unit='ms').date())
