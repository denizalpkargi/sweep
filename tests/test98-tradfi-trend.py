# Test #98: kripto dışı trend sepeti (29 Ekim taraması; Hurst–Ooi–Pedersen). Veri: /mnt/project-files/veri-arsivi/dis-veri/yahoo (günlük, 2019 →);
# gümüş geçmişi yok, yalnız altın; endeks perp\'leri için Nasdaq ve S&P 500 vekil. Kural (taramadaki betikle aynı, sonuca bakmadan):
# işaret = 1/3/12 ay (21/63/252 işlem günü) getiri işaretlerinin ortalaması, boy = işaret × min(3, %15 ÷ 60 g oynaklık), dünkü kapanışla karar.
# Maliyet: boy değişimine %0,06 (taker + kayma) + perp fonlaması varsayımı: long nominal günde %0,03 öder, short alır (8 saatte %0,01).
# Kaplumbağa günlük getirisi: research-daily-wide.js T1 long + BTC SMA200, %0,5 · 10 · 2× (tests/test98-kaplumbaga-dump.js → tests/data/arch/test98-kaplumbaga-gunluk.csv; takvim günleri).
# Birleşik portföy sabit %10 / %20 trend sepeti + kalan Kaplumbağa (veride seçilmez), iş günü olmayan günlerde trend getirisi 0.
import os, numpy as np, pandas as pd
H = os.path.dirname(os.path.abspath(__file__)); Y = '/mnt/project-files/veri-arsivi/dis-veri/yahoo/'
px = {n: pd.read_csv(Y + n + '.csv', parse_dates=['tarih']).set_index('tarih').kapanis.dropna() for n in ('gold', 'nasdaq', 'spx')}
FUND = 0.0003; COST = 0.0006
def tsmom(p, fund=True):
    r = p.pct_change().fillna(0); sig = sum(np.sign(p.shift(1) - p.shift(1 + L)) for L in (21, 63, 252)) / 3
    vol = r.shift(1).rolling(60).std() * np.sqrt(252); pos = (sig * np.minimum(3, 0.15 / vol)).fillna(0); pos[:260] = 0
    days = pd.Series(p.index, index=p.index).diff().dt.days.fillna(1)
    return pos * r - pos.diff().abs().fillna(0) * COST - (pos * FUND * days if fund else 0)
S = {n: tsmom(p) for n, p in px.items()}; S0 = {n: tsmom(p, False) for n, p in px.items()}
T = pd.read_csv(os.path.join(H, 'data', 'arch', 'test98-kaplumbaga-gunluk.csv'), parse_dates=['t']).set_index('t').r
def stats(x):
    x = x.dropna(); n = len(x); per = 252 if n / ((x.index[-1] - x.index[0]).days / 365) < 300 else 365
    m, s = x.mean() * per, x.std() * np.sqrt(per); eq = (1 + x).cumprod(); dd = (eq / eq.cummax() - 1).min()
    return m * 100, m / s if s > 0 else 0, dd * 100
def periods(x):
    x = x[x.index >= '2020-06-01']; mid = x.index[len(x) // 2]; l12 = x.index[-1] - pd.Timedelta(days=365)
    return [stats(x), stats(x[x.index < mid]), stats(x[x.index >= mid]), stats(x[x.index >= l12])]
f = lambda v, d=2: f'{v:+.{d}f}'.replace('.', ',')
L = ['# Test #98: kripto dışı trend sepeti (altın + endeksler)', '',
     'Kural taramadakiyle aynı: 1/3/12 ay işaret ortalaması × %15 oynaklık hedefi (en çok 3×), boy değişimine %0,06, perp fonlaması long günde %0,03. '
     'Gümüş geçmişi yok; endeks perp\'leri için Nasdaq ve S&P 500 vekil. Dönem 2020-06 → 2026-10 (altın verisi 9 Ekim\'de bitiyor).', '',
     '| Seri | yıllık % / Sharpe / düşüş % (tümü) | 1. yarı Sharpe | 2. yarı Sharpe | son 12 ay Sharpe |', '|---|---|---|---|---|']
rows = [('altın', S['gold']), ('altın (fonlamasız)', S0['gold']), ('Nasdaq', S['nasdaq']), ('S&P 500', S['spx']),
        ('altın + Nasdaq + S&P (eşit)', pd.concat([S['gold'], S['nasdaq'], S['spx']], axis=1).fillna(0).mean(axis=1)), ('Kaplumbağa', T)]
for nm, x in rows:
    a, b, c, d = periods(x); L.append(f'| {nm} | {f(a[0],1)} / {f(a[1])} / {f(a[2],0)} | {f(b[1])} | {f(c[1])} | {f(d[1])} |')
# korelasyon ve birleşim (takvim günlerine yay)
tr = pd.concat([S['gold'], S['nasdaq'], S['spx']], axis=1).fillna(0).mean(axis=1)
idx = T.index; G = S['gold'].reindex(idx).fillna(0); TR = tr.reindex(idx).fillna(0)
m = idx >= '2020-06-01'
L += ['', f'Günlük korelasyon Kaplumbağa ile: altın {np.corrcoef(G[m], T[m])[0,1]:+.2f}, üçlü sepet {np.corrcoef(TR[m], T[m])[0,1]:+.2f}'.replace('.', ','), '',
      '| Birleşim | yıllık % / Sharpe / düşüş % | 1. yarı Sharpe | 2. yarı Sharpe | son 12 ay Sharpe |', '|---|---|---|---|---|']
for w in (0.1, 0.2):
    for nm, X in (('altın', G), ('üçlü', TR)):
        c = (1 - w) * T + w * X; a, b, cc, d = periods(c)
        L.append(f'| Kaplumbağa %{int((1-w)*100)} + {nm} %{int(w*100)} | {f(a[0],1)} / {f(a[1])} / {f(a[2],0)} | {f(b[1])} | {f(cc[1])} | {f(d[1])} |')
open(os.path.join(H, 'test98-tradfi-trend-report.md'), 'w').write('\n'.join(L) + '\n'); print('\n'.join(L))
