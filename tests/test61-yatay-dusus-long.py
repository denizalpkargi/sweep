# Test #61 (11 Ekim 2026 gecesi; #60 pattern taramasının yan bulgusu): günlük →→↓↓ sonrası 24 sa long.
# Kural tarama notundaki gibi önceden sabit: gün = 1 sa kapanışlarından UTC 23:00 mumunun kapanışı; gün getirisi log(c/c_dün) ÷ önceki 30 günün std'si,
# ↓ < −0,5, → arası, ↑ > +0,5. Son dört gün (eskiden yeniye) → → ↓ ↓ ise karar; ilk 50 coin (universe.json, TradFi hariç), ertesi 1 sa mumun VWAP'ında long,
# çıkış 24 sa sonraki 1 sa mumun VWAP'ı. Maliyet %0,16 gidiş-dönüş + fonlama (long öder). Bu testte önceden sabitlenenler:
#  - stop: girişin 1 × (30 g günlük std) altında, 1 sa diplerinde kontrol, dolum min(açılış, stop) − %0,03; R birimi = stop uzaklığı (dolar riski %0,5 → R ile orantılı).
#  - aynı gün en çok 5 coin: o ayın hacim sırasına göre ilk 5 (seçim yönsüz).
#  - rastgele kıyas: aynı coin, ±30 gün içinde 3 rastgele gün, aynı giriş/çıkış ve stop kuralı (tohum 61).
#  - Kaplumbağa örtüşmesi: daily-wide-trades.json'daki BTC süzgeçli Kaplumbağa 1 longunun açık olduğu coin-günler.
#  - komşu tanımlar (yalnız sağlamlık): ↓↓, →↓↓, eşik 0,3 / 0,7.
# Geçme: stoplu ve stopsuz net iki yarıda (2021-01 → 2023-12 / 2024-01 →) ve son 12 ayda > 0, gün kümeli t ≥ 3, rastgeleden iyi.
# Kullanım: python3 tests/test61-yatay-dusus-long.py → tests/test61-yatay-dusus-long-report.md
import os, json, math, re, numpy as np, pandas as pd
D = os.path.join(os.path.dirname(__file__), 'data', 'arch'); HR = 3600_000; DAY = 86400_000; COST = 0.0016; SLIP = 0.0003
U = json.load(open(os.path.join(D, 'universe.json')))['months']
TR = set(s + 'USDT' for s in re.search(r'TT_TRADFI=new Set\("([^"]+)"', open(os.path.join(os.path.dirname(__file__), '..', 'src', 'turtle.js')).read()).group(1).split(' '))
months = sorted(m for m in U if m >= '2020-12')
rank = {m: {s: r for r, s in enumerate([x for x in U[m] if x not in TR][:50])} for m in months}
syms = sorted({s for m in months for s in rank[m]} & {f[:-4] for f in os.listdir(os.path.join(D, '1h')) if f.endswith('.csv')})
rng = np.random.default_rng(61)
def load(s):
    k = pd.read_csv(os.path.join(D, '1h', s + '.csv'), header=None, usecols=[0, 1, 2, 3, 4, 5, 7]); k.columns = ['t', 'o', 'h', 'l', 'c', 'v', 'q']
    k = k[k.t >= pd.Timestamp('2020-10-01').value // 10**6].reset_index(drop=True)
    vw = np.where(k.v > 0, k.q / k.v.where(k.v > 0, 1), np.nan); vw = np.where((vw >= k.l) & (vw <= k.h), vw, k.c); k['vw'] = vw; k.loc[k.v <= 0, 'vw'] = np.nan
    f = os.path.join(D, 'funding', s + '.csv'); fr = pd.read_csv(f, header=None, usecols=[0, 1], names=['t', 'r']) if os.path.exists(f) else pd.DataFrame({'t': [], 'r': []})
    return k, fr.sort_values('t')
def trade(k, ix, fr, sd, stop=True):
    j = ix + 1; x = j + 24
    if x >= len(k) or k.t[x] != k.t[j] + 24 * HR or not np.isfinite(k.vw[j]) or not np.isfinite(k.vw[x]): return None
    e = k.vw[j]; st = e * (1 - sd); R = sd; px = k.vw[x]; tx = k.t[x]
    if stop:
        for q in range(j + 1, x + 1):
            if k.l[q] <= st: px = min(k.o[q], st) * (1 - SLIP); tx = k.t[q]; break
    f = fr.r[(fr.t > k.t[j]) & (fr.t <= tx)].sum()
    n = px / e - 1 - COST - f
    return n, n / R
TT = json.load(open(os.path.join(D, 'daily-wide-trades.json')))
tt = next(x for x in TT if x['name'] == 'T1' and x['d'] == 1 and x['filt'] and not x['pyr'])
tOpen = {}
for s, a, b, *_ in tt['tr']: tOpen.setdefault(s, []).append((a, b))
VAR = {'→→↓↓ (ana)': ('1100', 0.5), '↓↓': ('00', 0.5), '→↓↓': ('100', 0.5), '→→↓↓ eşik 0,3': ('1100', 0.3), '→→↓↓ eşik 0,7': ('1100', 0.7)}
rows = []; rnd = []
for si, s in enumerate(syms):
    k, fr = load(s); d = k[(k.t // HR) % 24 == 23].copy(); d = d[d.v > 0]
    lc = np.log(d.c.values); r = np.r_[np.nan, np.diff(lc)]; gap = np.r_[np.nan, np.diff(d.t.values)]; r[gap != DAY] = np.nan
    sd = pd.Series(r).shift(1).rolling(30, min_periods=15).std().values
    pos = {t: i for i, t in enumerate(k.t.values)}; T = d.t.values
    for name, (pat, th) in VAR.items():
        stt = np.where(r < -th * sd, '0', np.where(r > th * sd, '2', '1')); stt[~np.isfinite(sd) | ~np.isfinite(r)] = 'x'
        n = len(pat)
        for i in range(n, len(d)):
            if ''.join(stt[i - n + 1:i + 1]) != pat: continue
            m = pd.Timestamp(T[i], unit='ms').strftime('%Y-%m')
            if m not in rank or s not in rank[m] or T[i] < pd.Timestamp('2021-01-01').value // 10**6: continue
            ix = pos[T[i]]; a = trade(k, ix, fr, sd[i]); b = trade(k, ix, fr, sd[i], False)
            if a is None or b is None: continue
            day = T[i] // DAY
            ov = any(x <= T[i] + HR < y for x, y in tOpen.get(s, []))
            rows.append(dict(v=name, s=s, t=T[i], day=day, rk=rank[m][s], n=a[0], R=a[1], n0=b[0], tt=ov))
            if name == '→→↓↓ (ana)':
                cand = np.nonzero((np.abs(T - T[i]) <= 30 * DAY) & np.isfinite(sd))[0]
                for c in rng.choice(cand, 3) if len(cand) else []:
                    mm = pd.Timestamp(T[c], unit='ms').strftime('%Y-%m')
                    if mm not in rank or s not in rank[mm]: continue
                    a2 = trade(k, pos[T[c]], fr, sd[c]); b2 = trade(k, pos[T[c]], fr, sd[c], False)
                    if a2 and b2: rnd.append(dict(t=T[c], day=T[c] // DAY, n=a2[0], R=a2[1], n0=b2[0]))
    if si % 40 == 0: print(si, len(syms), s, len(rows), flush=True)
X = pd.DataFrame(rows); RN = pd.DataFrame(rnd)
X = X.sort_values(['v', 'day', 'rk']); X = X.groupby(['v', 'day']).head(5)
SPLIT = pd.Timestamp('2024-01-01').value // 10**6; tE = X.t.max(); t12 = tE - 365 * DAY
def st(df, col):
    if len(df) < 3: return (len(df), np.nan, np.nan)
    g = df.groupby('day')[col].mean(); t = g.mean() / (g.std(ddof=1) / math.sqrt(len(g))) if len(g) > 2 and g.std() > 0 else np.nan
    return (len(df), df[col].mean(), t)
f = lambda v, d=3: '–' if not np.isfinite(v) else ('+' if v >= 0 else '') + f'{v:.{d}f}'.replace('.', ',')
P = [lambda z: z.t < SPLIT, lambda z: z.t >= SPLIT, lambda z: z.t >= t12]
L = ['# Test #61 · Günlük →→↓↓ sonrası 24 sa long (arşiv)', '', f'11 Ekim 2026 gecesi · `python3 tests/test61-yatay-dusus-long.py` · ilk 50 coin (TradFi hariç), 2021-01 → {pd.Timestamp(tE, unit="ms").date()}, aynı gün en çok 5 coin (hacim sırası).', '',
     'Net %: VWAP→VWAP basit getiri − %0,16 − fonlama. Stoplu R: stop girişin 1 × 30 g günlük std altında, R = stop uzaklığı. t gün kümeli. Yarılar: 2021–2023 (taramanın seçim dönemi) / 2024+ (hüküm dönemi).', '',
     '| tanım | n | net stopsuz % (t) | stoplu net % | stoplu R (t) | R: 2021–23 / 2024+ / son 12 ay | stopsuz: 2021–23 / 2024+ / son 12 ay | Kaplumbağa açıkken n / R | geçti |', '|---|---:|---|---:|---|---|---|---|---|']
res = {}
for name in VAR:
    z = X[X.v == name]; a0 = st(z, 'n0'); aN = st(z, 'n'); aR = st(z, 'R'); pr = [st(z[p(z)], 'R')[1] for p in P]; p0 = [st(z[p(z)], 'n0')[1] for p in P]; to = st(z[z.tt], 'R')
    ok = all(v > 0 for v in pr + p0) and aR[2] >= 3 and a0[2] >= 3
    res[name] = (aR, a0)
    L.append(f'| {name} | {a0[0]} | {f(100*a0[1])} ({f(a0[2],1)}) | {f(100*aN[1])} | {f(aR[1])} ({f(aR[2],1)}) | {" / ".join(f(v) for v in pr)} | {" / ".join(f(100*v) for v in p0)} | {to[0]} / {f(to[1])} | {"**evet**" if ok and name.startswith("→→↓↓ (ana)") else ("hayır" if name.startswith("→→↓↓ (ana)") else "–")} |')
rR = st(RN, 'R'); r0 = st(RN, 'n0'); rp = [st(RN[p(RN)], 'R')[1] for p in P]
L.append(f'| rastgele gün (aynı coin ±30 g, 3 ×) | {r0[0]} | {f(100*r0[1])} ({f(r0[2],1)}) | {f(100*st(RN,"n")[1])} | {f(rR[1])} ({f(rR[2],1)}) | {" / ".join(f(v) for v in rp)} | {" / ".join(f(100*st(RN[p(RN)],"n0")[1]) for p in P)} | – | – |')
z = X[X.v == '→→↓↓ (ana)']; z = z.assign(y=pd.to_datetime(z.t, unit='ms').dt.year)
L += ['', '## Yıl yıl (ana tanım)', '', '| yıl | n | stopsuz net % | stoplu R |', '|---|---:|---:|---:|'] + [f'| {y} | {len(g)} | {f(100*g.n0.mean())} | {f(g.R.mean())} |' for y, g in z.groupby('y')]
L += ['', f'Kaplumbağa açıkken düşen sinyal payı: %{100*z.tt.mean():.0f}.']
open(os.path.join(os.path.dirname(__file__), 'test61-yatay-dusus-long-report.md'), 'w').write('\n'.join(L) + '\n'); print('\n'.join(L[6:]))
