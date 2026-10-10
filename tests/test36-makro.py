"""Test listesi #36, makro kısmı (10 Ekim 2026): Yahoo Finance günlük serileri (kullanıcının bilgisayarından, Stooq/FRED engelli)
→ BTC ve ETH ileri getirisi. Seriler: S&P 500, Nasdaq, VIX, dolar endeksi, ABD 10 yıl ve 3 ay faiz, petrol, altın, HYG, TLT, USD/TRY.
ABD kapanışı 20–21 UTC; değer ertesi UTC günü biliniyor sayılır (1 gün gecikme), hafta sonu son değer taşınır.
Getiri: ertesi gün açılışından 1 / 7 / 30 gün sonraki açılışa, basit %, fonlama dahil (long öder). Ölçü Spearman IC; iki yarı, son 24 ay,
son 12 ay, yıl yıl. Kural: |IC| ≥ 0,05 ve iki yarıda + son 12 ayda aynı işaret ve yıl yıl ≥ 5/7 → aday.
Kullanım: python3 tests/test36-makro.py [--dir /mnt/project-files/veri-arsivi/dis-veri/yahoo] → tests/test36-makro-report.md
"""
import os, sys, numpy as np, pandas as pd
arg = lambda k, d: sys.argv[sys.argv.index('--' + k) + 1] if '--' + k in sys.argv else d
Y = arg('dir', '/mnt/project-files/veri-arsivi/dis-veri/yahoo'); A = os.path.join(os.path.dirname(__file__), 'data', 'arch')
OUT = os.path.join(os.path.dirname(__file__), 'test36-makro-report.md')

def coin(sym):
    d = pd.read_csv(f'{A}/1d/{sym}.csv', header=None).iloc[:, [0, 1, 4]]; d.columns = ['t', 'o', 'c']
    d['date'] = pd.to_datetime(d.t, unit='ms').dt.normalize(); d = d.set_index('date').sort_index()
    fr = pd.read_csv(f'{A}/funding/{sym}.csv', header=None, names=['t', 'r']); fr['date'] = pd.to_datetime(fr.t, unit='ms').dt.normalize()
    fd = fr.groupby('date').r.sum().reindex(d.index).fillna(0.0003); cf = fd.cumsum()
    o = d.o.values; n = len(d)
    for h in [1, 7, 30]:
        f = np.full(n, np.nan); f[:n - h - 1] = (o[1 + h:] / o[1:n - h] - 1) * 100
        fund = np.full(n, np.nan); c = cf.values; fund[:n - h - 1] = (c[h:n - 1] - c[0:n - h - 1]) * 100
        d[f'f{h}'] = f - fund
    d['mom30'] = d.c / d.c.shift(30) - 1
    return d

def ser(name):
    f = os.path.join(Y, name + '.csv'); x = pd.read_csv(f)
    dc = [c for c in x.columns if c.lower() in ('tarih', 'date')][0]; cc = [c for c in x.columns if c.lower() in ('kapanis', 'close', 'adjclose', 'duzeltilmis')]
    x['date'] = pd.to_datetime(x[dc]).dt.tz_localize(None).dt.normalize()
    return x.set_index('date')[cc[0]].astype(float).dropna()

S = {k: ser(k) for k in ['spx', 'nasdaq', 'vix', 'dxy', 'us10y', 'us3m', 'oil', 'gold', 'hyg', 'tlt', 'usdtry']}
days = pd.date_range('2019-01-01', '2026-10-10')
M = pd.DataFrame({k: v.reindex(days).ffill() for k, v in S.items()})
F = pd.DataFrame(index=days)
for k in ['spx', 'nasdaq', 'oil', 'gold', 'hyg', 'tlt', 'usdtry', 'dxy']:
    F[f'{k}_r1'] = np.log(M[k] / M[k].shift(1)); F[f'{k}_r5'] = np.log(M[k] / M[k].shift(7)); F[f'{k}_r20'] = np.log(M[k] / M[k].shift(28))
F['vix'] = M.vix; F['vix_d5'] = M.vix - M.vix.shift(7); F['vix_rel'] = M.vix / M.vix.rolling(28).mean()
F['us10y_d20'] = M.us10y - M.us10y.shift(28); F['curve'] = M.us10y - M.us3m; F['curve_d20'] = F.curve - F.curve.shift(28)
F['spx_200'] = np.log(M.spx / M.spx.rolling(280).mean())
F = F.shift(1)   # 1 gün gecikme: dünkü ABD kapanışı bugün biliniyor
NAMES = {'spx_r1': 'S&P 500 1 g', 'spx_r5': 'S&P 500 5 iş g', 'spx_r20': 'S&P 500 20 iş g', 'spx_200': 'S&P 500 / 200 g ort.', 'nasdaq_r1': 'Nasdaq 1 g', 'nasdaq_r20': 'Nasdaq 20 iş g',
         'vix': 'VIX düzeyi', 'vix_d5': 'VIX 5 iş g değişim', 'vix_rel': 'VIX / 20 iş g ort.', 'dxy_r5': 'Dolar endeksi 5 iş g', 'dxy_r20': 'Dolar endeksi 20 iş g',
         'us10y_d20': '10 yıl faiz 20 iş g değişim', 'curve': '10 yıl − 3 ay', 'curve_d20': 'Eğri 20 iş g değişim', 'oil_r20': 'Petrol 20 iş g', 'gold_r5': 'Altın 5 iş g', 'gold_r20': 'Altın 20 iş g',
         'hyg_r5': 'HYG 5 iş g (kredi)', 'hyg_r20': 'HYG 20 iş g', 'tlt_r20': 'TLT 20 iş g', 'usdtry_r20': 'USD/TRY 20 iş g'}
fx = lambda v, d=3: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ',')
L = ['# Test #36 · Makro seriler → BTC / ETH', '', 'Yahoo Finance günlük (bilgisayardan; Stooq ve FRED engelli), 2020-01 → 2026-10. Değerler 1 gün gecikmeli, hafta sonu taşınır. Getiri ertesi açılıştan 1 / 7 / 30 gün, basit % − fonlama. 7 ve 30 günde gözlemler örtüşür; t yerine iki yarı / son 12 ay / yıl yıl işaret uyumuna bak. `python3 tests/test36-makro.py`.', '']
cands = []
for sym in ['BTCUSDT', 'ETHUSDT']:
    C = coin(sym).join(F, how='left'); C = C[C.index >= '2020-01-01']
    mid = C.index[len(C) // 2]; t24 = C.index[-1] - pd.Timedelta(days=730); t12 = C.index[-1] - pd.Timedelta(days=365)
    P = [('tümü', C), ('1. yarı', C[C.index < mid]), ('2. yarı', C[C.index >= mid]), ('son 24 ay', C[C.index >= t24]), ('son 12 ay', C[C.index >= t12])]
    L += [f'## {sym[:-4]}', '', '| Değişken | Ufuk | ' + ' | '.join(p for p, _ in P) + ' | Yıl yıl aynı işaret |', '|---|---|' + '---|' * (len(P) + 1)]
    for col, nm in NAMES.items():
        for h in [1, 7, 30]:
            ics = [g[[col, f'f{h}']].dropna().corr(method='spearman').iloc[0, 1] for _, g in P]
            yy = [g[[col, f'f{h}']].dropna().corr(method='spearman').iloc[0, 1] for _, g in C.groupby(C.index.year) if g[[col, f'f{h}']].dropna().shape[0] > 60]
            sg = np.sign(ics[0]); same = sum(np.sign(v) == sg for v in yy)
            L.append(f'| {nm} | {h} g | ' + ' | '.join(fx(v) for v in ics) + f' | {same}/{len(yy)} |')
            if abs(ics[0]) >= 0.05 and np.sign(ics[1]) == np.sign(ics[2]) == np.sign(ics[4]) == sg and same >= len(yy) - 2:
                cands.append(f'{sym[:-4]} · {nm} · {h} g: tümü {fx(ics[0])}, yarılar {fx(ics[1])} / {fx(ics[2])}, son 12 ay {fx(ics[4])}, yıl yıl {same}/{len(yy)}')
    L.append('')
L += ['## Aday (|IC| ≥ 0,05, iki yarı + son 12 ay aynı işaret, yıl yıl en çok 2 ters)', ''] + (['- ' + c for c in cands] if cands else ['- Yok.'])
L += ['', f'Not: {len(NAMES)} değişken × 3 ufuk × 2 coin = {len(NAMES) * 6} deneme; şansla birkaç tanesinin geçmesi beklenir.']
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L[-(len(cands) + 4):])); print('yazıldı', OUT)
