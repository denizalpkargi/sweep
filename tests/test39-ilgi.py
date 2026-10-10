"""Test listesi #39: ilgi verisi (Google Trends haftalık, Wikipedia günlük görüntüleme) → 1–6 hafta coin getirisi.
Veri: tests/fetch-interest.js (kullanıcının bilgisayarında çekildi) → /mnt/project-files/veri-arsivi/dis-veri/ilgi/{trends,wiki}/<SYM>.csv;
fiyat ve fonlama arşivden (tests/data/arch/1d, funding).
Haftalık takvim: Trends haftası pazar başlar (pazar–cumartesi). Sinyal hafta bitince bilinir; Trends verisi birkaç gün gecikebildiği için
giriş haftanın başından 9 gün sonraki (salı) açılışta, çıkış h hafta sonraki aynı günün açılışında. Getiri basit, fonlama dahil (long öder).
Değişkenler (hafta sonunda):
  t_chg   log(Trends haftası / önceki 4 haftanın ortalaması)        (ilgi değişimi; Liu–Tsyvinski'nin "anormal arama"sı)
  t_lvl   log(Trends / 52 haftalık ortalama)
  w_chg   log(son 7 gün Wikipedia / önceki 28 günün 7 günlük ortalaması)
  w_lvl   log(son 7 gün / 52 haftalık ortalama)
  mom4    son 4 hafta getirisi (kontrol)
Ölçüler: BTC zaman serisi Spearman IC (1/2/4/6 hafta), coinler arası haftalık sıra IC'si ve beşlikler (üst − alt, basit getiri + fonlama),
momentumdan arındırılmış kısmi IC, iki yarı + son 24 ay + son 12 ay + yıl yıl. Uyarı: coin listesi bugünün coinleri (hayatta kalan seçimi).
Kullanım: python3 tests/test39-ilgi.py [--dir /mnt/project-files/veri-arsivi/dis-veri/ilgi] → tests/test39-ilgi-report.md
"""
import os, sys, argparse, numpy as np, pandas as pd
ap = argparse.ArgumentParser(); ap.add_argument('--dir', default='/mnt/project-files/veri-arsivi/dis-veri/ilgi')
ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), 'test39-ilgi-report.md')); a = ap.parse_args()
ARCH = os.path.join(os.path.dirname(__file__), 'data', 'arch'); DAY = 86400000
HZ = [1, 2, 4, 6]

def perp(sym):
    for s in (sym, '1000' + sym):
        f = os.path.join(ARCH, '1d', s + '.csv')
        if os.path.exists(f): return s, f
    return None, None

def load_px(f):
    d = pd.read_csv(f, header=None, usecols=[0, 1, 4, 7], names=['t', 'o', 'c', 'q'])
    d = d[d.q > 0]; d['d'] = pd.to_datetime(d.t, unit='ms').dt.normalize(); return d.set_index('d')[['o', 'c']]

def load_fr(s):
    f = os.path.join(ARCH, 'funding', s + '.csv')
    if not os.path.exists(f): return None
    d = pd.read_csv(f, header=None, names=['t', 'r']); d['d'] = pd.to_datetime(d.t, unit='ms').dt.normalize()
    return d.groupby('d').r.sum()

syms = sorted(set(x[:-4] for x in os.listdir(os.path.join(a.dir, 'trends'))) | set(x[:-4] for x in os.listdir(os.path.join(a.dir, 'wiki'))))
rows = []; seen = set()
for sym in syms:
    ps, pf = perp(sym)
    if not ps or ps in seen: continue
    seen.add(ps); px = load_px(pf); fr = load_fr(ps)
    ft, fw = os.path.join(a.dir, 'trends', sym + '.csv'), os.path.join(a.dir, 'wiki', sym + '.csv')
    tr = pd.read_csv(ft, parse_dates=['tarih']).set_index('tarih').deger if os.path.exists(ft) else None
    wk = pd.read_csv(fw, parse_dates=['tarih']).set_index('tarih').goruntuleme if os.path.exists(fw) else None
    if wk is not None and len(wk) < 400: wk = None   # yanlış makale (birkaç gün)
    if tr is None and wk is None: continue
    weeks = pd.date_range('2020-03-01', px.index.max() - pd.Timedelta(days=9), freq='W-SUN')
    for w0 in weeks:
        we = w0 + pd.Timedelta(days=6); ent = w0 + pd.Timedelta(days=9)
        if ent not in px.index: continue
        r = dict(sym=ps, w=w0)
        if tr is not None and w0 in tr.index:
            prev = tr[(tr.index < w0) & (tr.index >= w0 - pd.Timedelta(weeks=4))]; yr = tr[(tr.index <= w0) & (tr.index > w0 - pd.Timedelta(weeks=52))]
            v = tr[w0]
            if len(prev) == 4 and prev.mean() > 0 and v > 0: r['t_chg'] = np.log(v / prev.mean())
            if len(yr) >= 40 and yr.mean() > 0 and v > 0: r['t_lvl'] = np.log(v / yr.mean())
        if wk is not None:
            last7 = wk[(wk.index > we - pd.Timedelta(days=7)) & (wk.index <= we)]; p28 = wk[(wk.index > we - pd.Timedelta(days=35)) & (wk.index <= we - pd.Timedelta(days=7))]
            y = wk[(wk.index > we - pd.Timedelta(days=364)) & (wk.index <= we)]
            if len(last7) == 7 and len(p28) >= 25 and p28.mean() > 0: r['w_chg'] = np.log(last7.sum() / (p28.mean() * 7))
            if len(y) >= 300 and y.mean() > 0: r['w_lvl'] = np.log(last7.sum() / (y.mean() * 7))
        p0 = px.o[ent]; b4 = ent - pd.Timedelta(weeks=4)
        if b4 in px.index: r['mom4'] = p0 / px.o[b4] - 1
        for h in HZ:
            ex = ent + pd.Timedelta(weeks=h)
            if ex in px.index:
                f = fr[(fr.index >= ent) & (fr.index < ex)].sum() if fr is not None else 0.0001 * 3 * 7 * h
                r[f'y{h}'] = px.o[ex] / p0 - 1 - f        # long: basit getiri − ödenen fonlama
        rows.append(r)
D = pd.DataFrame(rows); D = D[D.w >= '2020-06-01']
FEATS = ['t_chg', 't_lvl', 'w_chg', 'w_lvl']
T0, T1 = D.w.min(), D.w.max(); TM = T0 + (T1 - T0) / 2; T24 = T1 - pd.Timedelta(days=730); T12 = T1 - pd.Timedelta(days=365)
PER = [('tümü', D.w >= T0), ('1. yarı', D.w < TM), ('2. yarı', D.w >= TM), ('son 24 ay', D.w >= T24), ('son 12 ay', D.w >= T12)]
fx = lambda x, d=3: '–' if x is None or not np.isfinite(x) else (f'{x:+.{d}f}').replace('.', ',')
L = ['# Test #39 · İlgi verisi → 1–6 hafta getiri', '',
     f'{D.sym.nunique()} coin, {len(D)} coin-hafta, {T0.date()} → {T1.date()}. Trends haftalık (pazar başlangıçlı), Wikipedia günlük (en, insan). Giriş haftanın başından 9 gün sonra açılışta (Trends gecikmesine pay), çıkış h hafta sonra; basit getiri − fonlama. Coin listesi bugünün coinleri (hayatta kalan seçimi var). `python3 tests/test39-ilgi.py`.', '']

# 1) BTC zaman serisi
B = D[D.sym == 'BTCUSDT'].sort_values('w')
L += ['## 1. BTC zaman serisi (Spearman IC; Liu–Tsyvinski: ilgi artışı → 1–6 hafta artı getiri)', '', '| Değişken | Ufuk | ' + ' | '.join(p for p, _ in PER) + ' |', '|---|---|' + '---|' * len(PER)]
for f in FEATS:
    for h in HZ:
        cells = []
        for p, m in PER:
            s = B[m.loc[B.index]][[f, f'y{h}']].dropna()
            cells.append(fx(s[f].corr(s[f'y{h}'], method='spearman')) + f' ({len(s)})' if len(s) > 20 else '–')
        L.append(f'| {f} | {h} hf | ' + ' | '.join(cells) + ' |')
L += ['', 'Not: haftalık örtüşen ufuklarda (2–6 hafta) gözlemler bağımsız değil; 1. yarı/2. yarı işaret uyumu t değerinden daha önemli.', '']
by = []
for y, g in B.groupby(B.w.dt.year):
    by.append(f'| {y} | ' + ' | '.join(fx(g[[f, "y4"]].dropna().corr(method="spearman").iloc[0, 1]) if g[[f, 'y4']].dropna().shape[0] > 10 else '–' for f in FEATS) + ' |')
L += ['BTC yıl yıl (4 hafta IC):', '', '| Yıl | ' + ' | '.join(FEATS) + ' |', '|---|' + '---|' * len(FEATS)] + by + ['']

# 2) coinler arası haftalık sıra IC'si ve beşlikler
def xs(f, h, m, resid=False):
    s = D[m][['w', 'sym', f, f'y{h}', 'mom4']].dropna()
    ics, sp = [], []
    for w, g in s.groupby('w'):
        if len(g) < 10: continue
        x = g[f].rank()
        if resid:
            mm = g.mom4.rank(); x = x - np.polyval(np.polyfit(mm, x, 1), mm)
        ics.append(pd.Series(x.values).corr(pd.Series(g[f'y{h}'].rank().values)))
        q = pd.qcut(x.rank(method='first'), 5, labels=False); sp.append(g[f'y{h}'][q.values == 4].mean() - g[f'y{h}'][q.values == 0].mean())
    ics = np.array(ics); sp = np.array(sp)
    if len(ics) < 10: return None
    t = ics.mean() / ics.std() * np.sqrt(len(ics) / h)   # örtüşmeye göre kaba düzeltme
    return ics.mean(), t, sp.mean(), len(ics)
L += ['## 2. Coinler arası (haftalık sıra IC; üst − alt beşlik basit getiri + fonlama, %)', '', '| Değişken | Ufuk | ' + ' | '.join(p for p, _ in PER) + ' |', '|---|---|' + '---|' * len(PER)]
res = {}
for f in FEATS:
    for h in HZ:
        cells = []
        for p, m in PER:
            r = xs(f, h, m); res[(f, h, p)] = r
            cells.append('–' if r is None else f'{fx(r[0])} (t {fx(r[1], 1)}) · {fx(100 * r[2], 2)}%')
        L.append(f'| {f} | {h} hf | ' + ' | '.join(cells) + ' |')
L += ['', '### 4 hafta getirisi momentumdan arındırılmış (değişken sırası, son 4 hafta getirisinin sırasına göre artık)', '', '| Değişken | ' + ' | '.join(p for p, _ in PER) + ' |', '|---|' + '---|' * len(PER)]
for f in FEATS:
    L.append(f'| {f} | ' + ' | '.join('–' if (r := xs(f, 4, m, True)) is None else f'{fx(r[0])} (t {fx(r[1], 1)})' for p, m in PER) + ' |')
# 3) ilgi patlaması: haftalık değişimde üst %5
L += ['', '## 3. İlgi patlaması (coinler arası değişimde haftanın en üst %10'+"'u"+') → sonraki getiri, coinin haftalık ortalamasından fark (%)', '', '| Değişken | Ufuk | ' + ' | '.join(p for p, _ in PER) + ' |', '|---|---|' + '---|' * len(PER)]
for f in ['t_chg', 'w_chg']:
    for h in HZ:
        cells = []
        for p, m in PER:
            s = D[m][['w', f, f'y{h}']].dropna(); s['ex'] = s[f'y{h}'] - s.groupby('w')[f'y{h}'].transform('mean')
            top = s[s.groupby('w')[f].rank(pct=True) > 0.9]
            cells.append(f'{fx(100 * top.ex.mean(), 2)} ({len(top)})' if len(top) > 20 else '–')
        L.append(f'| {f} | {h} hf | ' + ' | '.join(cells) + ' |')
# karar
L += ['', '## Karar', '']
ok = []
for f in FEATS:
    for h in HZ:
        rr = [res[(f, h, p)] for p in ('1. yarı', '2. yarı', 'son 12 ay')]
        if all(r is not None for r in rr) and (all(r[0] > 0.02 for r in rr) or all(r[0] < -0.02 for r in rr)): ok.append(f'{f} {h} hf ({", ".join(fx(r[0]) for r in rr)})')
L.append('- Coinler arası iki yarıda ve son 12 ayda aynı işaretli (|IC| > 0,02): ' + ('; '.join(ok) if ok else 'yok') + '.')
open(a.out, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L[-3:])); print('yazıldı', a.out)
