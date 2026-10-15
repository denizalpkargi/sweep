# Token kilit açılımı short'u · sağlamlık turu — 15 Ekim 2026 (kullanıcı "devam edelim" dedi; olaylar tests/unlock-etkisi.py'den)
# Sorular: (1) 2021 ve veri hataları (büyüklük > 1) dışlanınca etki kalıyor mu? (2) Plasebo: aynı coinlerde açılımdan uzak rastgele günlerde
# aynı short ne veriyor (etki açılımdan mı, bu coinlerin genel zayıflığından mı)? (3) Giriş/çıkış günü varyantları. (4) Gün içi stop (günlük tepe ile).
# (5) En çok kazandıran 3 coin çıkarılınca. (6) Portföy: işlem başı bakiyenin %r'si risk (stop uzaklığına göre boy), aynı anda en çok N short.
# Short getirisi: giriş günü kapanışında short, çıkış günü kapanışında kapat; basit getiri, fonlama arşivden (short pozitif fonlamayı alır), taker gidiş-dönüş %0,16.
# Kullanım: python tests/unlock-saglamlik.py <arşiv klasörü (1d, funding)> [--min 0.025]
import sys, os, math, numpy as np, pandas as pd
A = sys.argv[1]; HERE = os.path.dirname(os.path.abspath(__file__)); COST = 0.0016
MIN = float(sys.argv[sys.argv.index('--min') + 1]) if '--min' in sys.argv else 0.025
f = lambda v, d=2: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ',')
E = pd.read_csv(os.path.join(HERE, 'data', 'unlock', 'olaylar.csv'), parse_dates=['day'])
ALL = E.copy()                                                     # tüm açılım günleri (plasebo dışlaması için, büyüklük fark etmez)
E = E[(E['size'] >= MIN) & (E['size'] <= 1) & (E.day >= '2022-01-01')].reset_index(drop=True)
PX, FR = {}, {}
def px(s):
    if s not in PX:
        d = pd.read_csv(os.path.join(A, '1d', s + '.csv'), header=None, usecols=[0, 2, 4]); d.columns = ['t', 'h', 'c']
        d['day'] = pd.to_datetime(d.t, unit='ms').dt.normalize(); PX[s] = d.drop_duplicates('day').set_index('day')[['h', 'c']]
    return PX[s]
def fr(s):
    if s not in FR:
        p = os.path.join(A, 'funding', s + '.csv')
        FR[s] = pd.read_csv(p, header=None, names=['t', 'r']).assign(day=lambda d: pd.to_datetime(d.t, unit='ms').dt.normalize()).groupby('day').r.sum() if os.path.exists(p) else pd.Series(dtype=float)
    return FR[s]

def short(s, day, a=-7, b=0, stop=None):
    """giriş = gün a kapanışı, çıkış = gün b kapanışı (gün 0 = açılım). stop: girişin (1+stop) katı günlük tepeyle aşılırsa o fiyattan çık.
    Dönüş: (getiri, stop vurdu mu, giriş günü, çıkış günü)."""
    d = px(s); i = d.index.searchsorted(day)
    if i >= len(d) or d.index[i] != day or i + a < 0 or i + b >= len(d): return None
    e = d.c.iloc[i + a]; out = d.c.iloc[i + b]; hit = False; xd = d.index[i + b]
    if stop is not None:
        for k in range(i + a + 1, i + b + 1):
            if d.h.iloc[k] >= e * (1 + stop): out = e * (1 + stop) * 1.002; hit = True; xd = d.index[k]; break   # stop kayması %0,2
    fd = fr(s).reindex(d.index[i + a + 1:d.index.get_loc(xd) + 1]).fillna(0).sum()
    return (e - out) / e + fd - COST, hit, d.index[i + a], xd

def stats(v):
    v = np.asarray([x for x in v if x is not None and np.isfinite(x)])
    if len(v) < 3: return len(v), np.nan, np.nan, np.nan, np.nan
    return len(v), v.mean() * 100, np.median(v) * 100, v.mean() / v.std() * math.sqrt(len(v)), (v > 0).mean() * 100
def row(nm, v):
    n, m, md, t, w = stats(v); return f'| {nm} | {n} | {f(m)} | {f(md)} | {f(t, 1)} | %{w:.0f} |' if n >= 3 else f'| {nm} | {n} | — | — | — | — |'
mid = E.day.min() + (E.day.max() - E.day.min()) / 2; y12 = E.day.max() - pd.Timedelta(days=365)
L = [f'# Token kilit açılımı short\'u · sağlamlık turu ({pd.Timestamp.now():%Y-%m-%d})', '',
     f'Olaylar tests/unlock-etkisi.py çıktısından: insider / özel satış payı açılımı, büyüklük serbest arzın ≥ %{MIN * 100:.1f}\'i ve ≤ %100 (üstü veri hatası), 2022-01\'den '
     f'({len(E)} olay, {E.sym.nunique()} coin, {E.day.min():%Y-%m-%d} → {E.day.max():%Y-%m-%d}). Short: giriş günü kapanışında, çıkış günü kapanışında; basit getiri, '
     'fonlama dahil (short pozitif fonlamayı alır), taker gidiş-dönüş %0,16; stoplu satırlarda stop günlük tepe ile, %0,2 kaymayla. Gün 0 = açılım günü (UTC).', '',
     '## Temel kural ve dönemler (−7 → 0, stopsuz)', '', '| dönem | olay | ort % | medyan % | t | kazanma |', '|---|---|---|---|---|---|']
base = [short(r.sym, r.day) for r in E.itertuples()]; E['r'] = [x[0] if x else np.nan for x in base]
for nm, m in (('tümü', E.day == E.day), ('1. yarı', E.day < mid), ('2. yarı', E.day >= mid), ('son 12 ay', E.day >= y12)):
    L.append(row(nm, E.r[m]))
for y, g in E.groupby(E.day.dt.year): L.append(row(str(y), g.r))
rng = np.random.default_rng(5); pl = []
ud = ALL.groupby('sym').day.apply(lambda s: s.values)
for r in E.itertuples():
    for _ in range(5):
        d0 = (r.day + pd.Timedelta(days=int(rng.choice([-1, 1]) * rng.integers(30, 181)))).normalize()
        if np.min(np.abs((ud[r.sym] - np.datetime64(d0)) / np.timedelta64(1, 'D'))) <= 14: continue
        x = short(r.sym, d0); pl.append(x[0] if x else np.nan); break
L += ['', '## Plasebo (aynı coinler, açılımdan en az 14 gün uzak rastgele gün, aynı −7 → 0 short)', '', '| | olay | ort % | medyan % | t | kazanma |', '|---|---|---|---|---|---|',
      row('açılım öncesi', E.r), row('plasebo', pl)]
L += ['', '## Giriş / çıkış günü varyantları (stopsuz, tümü)', '', '| giriş → çıkış | olay | ort % | medyan % | t | kazanma |', '|---|---|---|---|---|---|']
for a, b in ((-10, 0), (-7, -1), (-7, 0), (-7, 1), (-5, 0), (-3, 0), (-14, -7), (0, 7)):
    v = [short(r.sym, r.day, a, b) for r in E.itertuples()]; L.append(row(f'{a} → {b}', [x[0] if x else None for x in v]))
L += ['', '## Gün içi stop (−7 → 0)', '', '| stop | olay | ort % | medyan % | t | kazanma | stop vuran % | 2. yarı ort % | son 12 ay ort % |', '|---|---|---|---|---|---|---|---|---|']
for st in (None, 0.10, 0.15, 0.20, 0.30):
    v = [short(r.sym, r.day, stop=st) for r in E.itertuples()]; vv = np.array([x[0] if x else np.nan for x in v]); hit = np.array([x[1] if x else False for x in v])
    n, m, md, t, w = stats(vv)
    L.append(f'| {"yok" if st is None else f"%{st * 100:.0f}"} | {n} | {f(m)} | {f(md)} | {f(t, 1)} | %{w:.0f} | %{hit.mean() * 100:.0f} | {f(np.nanmean(vv[(E.day >= mid).values]) * 100)} | {f(np.nanmean(vv[(E.day >= y12).values]) * 100)} |')
cs = E.groupby('sym').r.sum().sort_values(ascending=False); top3 = list(cs.index[:3])
L += ['', '## Yoğunlaşma', '', f'En çok kazandıran 3 coin: {", ".join(f"{s} ({f(cs[s] * 100, 1)} %, {int((E.sym == s).sum())} olay)" for s in top3)}. '
      f'Coin başına olay sayısı medyanı {E.groupby("sym").size().median():.0f}, en çok {E.groupby("sym").size().max()}.', '',
      '| | olay | ort % | medyan % | t | kazanma |', '|---|---|---|---|---|---|', row('tümü', E.r), row('ilk 3 coin hariç', E.r[~E.sym.isin(top3)]),
      row('coin başına ilk olay hariç', E.r[E.groupby('sym').cumcount() > 0])]
L += ['', '## Portföy (−7 → 0, %15 stop, boy = risk ÷ %15, aynı anda en çok N short; kazanç çıkışta gerçekleşir)', '',
      '| risk / işlem | N | işlem | yıllık % | en büyük düşüş % | son 12 ay % |', '|---|---|---|---|---|---|']
tr = []
for r in E.itertuples():
    x = short(r.sym, r.day, stop=0.15)
    if x: tr.append((x[2], x[3], x[0]))
tr.sort()
for risk, N in ((0.005, 5), (0.01, 5), (0.01, 10), (0.02, 5)):
    eq, open_, curve = 1.0, [], []
    for e_d, x_d, ret in tr:
        for o in sorted([o for o in open_ if o[0] <= e_d]): eq += o[1]; open_.remove(o); curve.append((o[0], eq))
        if len(open_) >= N: continue
        open_.append((x_d, eq * risk / 0.15 * ret))
    for o in sorted(open_): eq += o[1]; curve.append((o[0], eq))
    c = pd.Series([v for _, v in curve], index=[d for d, _ in curve]).sort_index(); yrs = (c.index.max() - c.index.min()).days / 365
    dd = (c / c.cummax() - 1).min() * 100; pre = c[c.index < y12]
    l12 = (c.iloc[-1] / pre.iloc[-1] - 1) * 100 if len(pre) else np.nan
    L.append(f'| %{risk * 100:.1f} | {N} | {len(tr)} | {f((c.iloc[-1] ** (1 / yrs) - 1) * 100, 1)} | {f(dd, 1)} | {f(l12, 1)} |')
L += ['', 'Okuma: kural açılımdan önceki 7 güne özgüyse plasebo ≈ 0 ve açılım öncesi belirgin artı olmalı; varyantlar komşu günlerde de artı olmalı; '
      'stop ortalamayı çok düşürmemeli; ilk 3 coin hariç de artı kalmalı. Uyarı: DefiLlama listesi bugünkü protokoller (hayatta kalan seçimi), takvim önceden bilinir varsayıldı.']
open(os.path.join(HERE, 'unlock-saglamlik-report.md'), 'w', encoding='utf-8').write('\n'.join(L))
sys.stdout.reconfigure(errors='replace'); print('\n'.join(L))
