# Ozan + eğitilmiş 8 üyenin birleşimi — 14 Ekim 2026
# Soru: Ozan'ın (lambdarank) sırası, Emre/Baran/Serkan/Mert/Arda/Can/Kerem/Yusuf'un model sıralarıyla birleşince daha iyi mi?
# Veri: üyelerin ve Ozan'ın ileriye yürüyen örneklem dışı yüzdelik sıraları (uye-oos.csv; ayın ilk 30'u, saatlik, 2024-06 → 2026-10)
# + hedef ve getiri (rank-model.py --save → rank-oos-tam-{4,12}.pkl: yc = VWAP → VWAP oynaklığa bölünmüş ±5, ret = ham log getiri, fr fonlama).
# Birleşimler: (a) 9'unun eşit ortalaması, (b) Ozan + w × 8 üyenin ortalaması (w ilk yarıda seçilir), (c) yığma: her ay başı yalnız
# 2 gün öncesine kadarki verilerle hedefin 9 sıraya doğrusal regresyonu (ridge), o ayın tahmini (ileriye yürüyen, 6 ay ısınma).
# Ölçüler: saat içi IC; alt / üst onluğun ortalama hedefi (Ozan'ın masadaki rolü: alt onluktaki longu veto etmek); 2+2 işlem taker + fonlama sonrası.
# Kullanım: python tests/uye-birlesim.py <uye-oos.csv> <rank-oos klasörü>
import sys, os, json, math, numpy as np, pandas as pd
CSV, D = sys.argv[1], sys.argv[2]; HERE = os.path.dirname(os.path.abspath(__file__)); COST = 0.16
IDS = ['rank', 'trend', 'mom', 'vol', 'flow', 'macro', 'risk', 'liq', 'check']
AD = {'rank': 'Ozan', 'trend': 'Emre', 'mom': 'Baran', 'vol': 'Serkan', 'flow': 'Mert', 'macro': 'Arda', 'risk': 'Can', 'liq': 'Kerem', 'check': 'Yusuf'}
f = lambda v, d=3: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ',')
U = pd.read_csv(CSV); meta = json.load(open(os.path.join(D, 'rank.json'), encoding='utf-8')); SYMS = meta['syms']

def ic_series(o, col):
    d = o[['t', col, 'yc']].dropna(); codes, _ = pd.factorize(d.t.values); n = np.bincount(codes)
    rp = d.groupby('t')[col].rank().values; ry = d.groupby('t')['yc'].rank().values
    sx, sy = np.bincount(codes, rp), np.bincount(codes, ry); sxx, syy, sxy = np.bincount(codes, rp * rp), np.bincount(codes, ry * ry), np.bincount(codes, rp * ry)
    with np.errstate(invalid='ignore', divide='ignore'): r = (sxy - sx * sy / n) / np.sqrt((sxx - sx * sx / n) * (syy - sy * sy / n))
    return r[(n >= 10) & np.isfinite(r)]
def ic(o, col):
    r = ic_series(o, col); return r.mean(), r.mean() / r.std() * math.sqrt(len(r))
def deciles(o, col):
    dc = np.floor(o.groupby('t')[col].rank(pct=True, method='first') * 10 - 1e-9).clip(0, 9); return o.yc[dc == 0].mean(), o.yc[dc == 9].mean()
def trade(o, col, hh):
    s = o.dropna(subset=['ret']); fd = np.nan_to_num(s.fr.values) / 1e4 * hh / 8
    l = np.expm1(s.ret.values) - fd; sh = -np.expm1(s.ret.values) + fd
    rk = s.groupby('t')[col].rank(method='first').values; n = s.groupby('t')[col].transform('size').values
    lg = pd.Series(l[rk > n - 2]).groupby(s.t.values[rk > n - 2]).mean() * 100; ss = pd.Series(sh[rk <= 2]).groupby(s.t.values[rk <= 2]).mean() * 100
    return lg.mean() - COST, ss.mean() - COST, (lg.mean() + ss.mean()) / 2 - COST

L = [f'# Ozan + eğitilmiş üyelerin birleşimi ({pd.Timestamp.now():%Y-%m-%d})', '',
     'Girdi: Ozan ve 8 eğitilmiş üyenin ileriye yürüyen örneklem dışı yüzdelik sıraları (uye-oos.csv, ayın ilk 30 coini, saatlik), hedef rank-model.py ile aynı '
     '(VWAP → VWAP, oynaklığa bölünmüş). Birleşimler: (a) 9 sıranın eşit ortalaması; (b) Ozan + w × 8 üyenin ortalaması, w ilk yarıda 0–3 arasından (0,25 adım) seçilir; '
     '(c) yığma: her ay başında yalnız iki gün öncesine kadarki verilerle hedefin 9 sıraya ridge regresyonu (ilk 6 ay yalnız eğitim), o ayın tahmini. '
     'Onluk sütunları: alt / üst onluğun ortalama hedefi (long yönü, oynaklık birimi; Ozan masada alt onluktaki longu veto eder). İşlem: her saat en üst 2 long, en alt 2 short, '
     'ufuk boyunca, basit getiri + fonlama, taker gidiş-dönüş %0,16 sonrası, işlem başı %.', '']
for hh in (4, 12):
    W = U.pivot_table(index=['t', 'sym'], columns='id', values=f'p{hh}').reset_index()
    O = pd.read_pickle(os.path.join(D, f'rank-oos-tam-{hh}.pkl')); O['sym'] = [SYMS[int(i)] for i in O.si]; O['t'] = O.t.astype(np.int64)
    o = W.merge(O[['t', 'sym', 'yc', 'ret', 'fr']], on=['t', 'sym']).dropna(subset=IDS + ['yc']).sort_values(['t', 'sym']).reset_index(drop=True)
    MEM = [i for i in IDS if i != 'rank']
    o['eq9'] = o[IDS].mean(1); o['m8'] = o[MEM].mean(1)
    dt = pd.to_datetime(o.t, unit='ms'); mid = dt.min() + (dt.max() - dt.min()) / 2
    P = {'1. yarı': dt < mid, '2. yarı': dt >= mid, 'son 12 ay': dt >= dt.max() - pd.Timedelta(days=365), 'tümü': dt == dt}
    g1 = o[P['1. yarı']]; ws = np.arange(0, 3.01, 0.25); sc = [ic(g1.assign(b=g1['rank'] + w * g1.m8), 'b')[0] for w in ws]; wb = ws[int(np.argmax(sc))]
    o['ozw'] = o['rank'] + wb * o.m8
    o['mo'] = dt.dt.strftime('%Y-%m'); months = sorted(o.mo.unique()); o['stk'] = np.nan; coefs = []
    Xall = o[IDS].values - 0.5; y = o.yc.clip(-5, 5).values; tt = o.t.values
    for m in months[6:]:
        te = (o.mo == m).values; tmin = tt[te].min(); tr = tt < tmin - 2 * 864e5
        X = Xall[tr]; b = np.linalg.solve(X.T @ X + 1e3 * np.eye(len(IDS)), X.T @ y[tr]); o.loc[te, 'stk'] = Xall[te] @ b; coefs.append(b)
    cb = np.array(coefs[-1]); cb = cb / np.abs(cb).sum()
    co = o[IDS].sample(min(200000, len(o)), random_state=1).corr(method='spearman')
    L += [f'## {hh} saat', '', f'{len(o):,} satır, {o.t.nunique():,} saat, saat başına {len(o) / o.t.nunique():.1f} coin, {dt.min():%Y-%m-%d} → {dt.max():%Y-%m-%d}. '
          f'Ozan ile üyelerin sıra korelasyonu: ' + ', '.join(f'{AD[i]} {co.loc["rank", i]:+.2f}' for i in MEM) + f'. Üyeler arası ortalama {co.loc[MEM, MEM].values[np.triu_indices(8, 1)].mean():+.2f}. '
          f'Seçilen w (ilk yarı) {wb}. Yığmanın son ayki göreli ağırlıkları: ' + ', '.join(f'{AD[i]} {c:+.2f}' for i, c in zip(IDS, cb)) + '.', '',
          '| dönem | Ozan IC (t) | 9 eşit IC (t) | Ozan + w × üyeler IC | yığma IC (t) | Ozan alt / üst onluk | 9 eşit alt / üst | yığma alt / üst |', '|---|---|---|---|---|---|---|---|']
    for nm, m in P.items():
        g = o[m]; a = ic(g, 'rank'); e = ic(g, 'eq9'); w_ = ic(g, 'ozw'); gs = g.dropna(subset=['stk']); s = ic(gs, 'stk') if len(gs) else (np.nan, np.nan)
        da, de = deciles(g, 'rank'), deciles(g, 'eq9'); ds = deciles(gs, 'stk') if len(gs) else (np.nan, np.nan)
        L.append(f'| {nm} | {f(a[0])} ({f(a[1], 1)}) | {f(e[0])} ({f(e[1], 1)}) | {f(w_[0])} | {f(s[0])} ({f(s[1], 1)}) | {f(da[0])} / {f(da[1])} | {f(de[0])} / {f(de[1])} | {f(ds[0])} / {f(ds[1])} |')
    L += ['', '| dönem | Ozan 2+2 long / short / ikisi % | 9 eşit long / short / ikisi % | yığma long / short / ikisi % | yığma satırlarında Ozan ikisi % |', '|---|---|---|---|---|']
    for nm, m in P.items():
        g = o[m]; gs = g.dropna(subset=['stk']); a = trade(g, 'rank', hh); e = trade(g, 'eq9', hh); s = trade(gs, 'stk', hh); a2 = trade(gs, 'rank', hh)
        L.append(f'| {nm} | {f(a[0])} / {f(a[1])} / {f(a[2])} | {f(e[0])} / {f(e[1])} / {f(e[2])} | {f(s[0])} / {f(s[1])} / {f(s[2])} | {f(a2[2])} |')
    L += ['', '| üye | IC tümü | 1. yarı | 2. yarı | son 12 ay |', '|---|---|---|---|---|']
    for i in IDS:
        L.append(f'| {AD[i]} | ' + ' | '.join(f(ic(o[m], i)[0]) for m in (P['tümü'], P['1. yarı'], P['2. yarı'], P['son 12 ay'])) + ' |')
    L.append('')
L.append('Not: yığmanın ilk 6 ayı (2024-06 → 2024-11) yalnız eğitim, o yüzden yığma sütunları 2024-12\'den başlar; "yığma satırlarında Ozan" aynı satırlarda Ozan\'ın sonucudur.')
out = os.path.join(HERE, 'uye-birlesim-report.md'); open(out, 'w', encoding='utf-8').write('\n'.join(L))
sys.stdout.reconfigure(errors='replace'); print('\n'.join(L))
