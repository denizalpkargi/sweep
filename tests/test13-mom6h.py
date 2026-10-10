"""Test #13 (10 Ekim 2026): `mom6h` faktörü — 6 saatlik pencerede momentum.
Değişkenler (15 dk kapanışlarından, t anında kapanmış mumla; yönsüz):
  m6  = c / c[−24] − 1   (son 6 sa)
  m24 = c / c[−96] − 1   (4 × 6 sa)
  m48 = c / c[−192] − 1  (8 × 6 sa)
  m72 = c / c[−288] − 1  (12 × 6 sa)
  mz  = 4/8/12 × 6 sa getirilerinin oynaklıkla ölçeklenmiş ortalaması (her biri ÷ (σ15 · √N))
Hedef: sonraki mumun VWAP'ı → 16 mum sonraki mumun VWAP'ı (4 sa, basit getiri); ek ufuk 96 mum (24 sa). VWAP = q/v, [low, high] içine sınırlı.
Evren: universe.json ayın ilk 30'u (önceki 30 günün hacmi), 2022-01'den; örnek saat başı (saatin son 15 dk mumu kapanınca).
Ölçü: saat içi coinler arası Spearman IC (ort., Newey–West t, günlük ortalamalarla), havuzlanmış Spearman IC, üst−alt beşlik farkı;
iki yarı (dönem ortası) + son 12 ay. Masa: giriş kuralını geçen örneklerde yönde işaretli değişkenin beşliklerine göre R ve y.
Kullanım: python3 tests/test13-mom6h.py → tests/test13-mom6h-report.md
"""
import json, os, time, math
import numpy as np, pandas as pd
from scipy.stats import spearmanr

ARCH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'arch')
M15 = 900000; DAY = 86400000
FROM = '2022-01'; TOP = 30
U = json.load(open(os.path.join(ARCH, 'universe.json')))['months']
FE = ['m6', 'm24', 'm48', 'm72', 'mz']
FN = {'m6': 'son 6 sa', 'm24': '4 × 6 sa (24 sa)', 'm48': '8 × 6 sa (48 sa)', 'm72': '12 × 6 sa (72 sa)', 'mz': '4/8/12 × 6 sa, oynaklıkla ölçekli ort.'}

def coin(sym, months):
    f = os.path.join(ARCH, '15m', sym + '.csv')
    if not os.path.exists(f):
        return None
    d = pd.read_csv(f, header=None, usecols=[0, 2, 3, 4, 5, 7], names=['t', 'h', 'l', 'c', 'v', 'q'], dtype=np.float64).drop_duplicates('t').sort_values('t')
    t = d['t'].values.astype(np.int64)
    # boşlukları doldur: düzenli ızgaraya yeniden indeksle (eksik mum NaN)
    g = np.arange(t[0], t[-1] + M15, M15)
    idx = ((t - t[0]) // M15).astype(int)
    A = {k: np.full(len(g), np.nan) for k in ['h', 'l', 'c', 'v', 'q']}
    for k in A:
        A[k][idx] = d[k].values
    c, h, l, v, q = A['c'], A['h'], A['l'], A['v'], A['q']
    with np.errstate(divide='ignore', invalid='ignore'):
        vw = np.where(v > 0, q / v, np.nan)
        vw = np.where((vw >= l) & (vw <= h), vw, np.where(v > 0, c, np.nan))
        lr = np.log(c[1:] / c[:-1])
    lr = np.concatenate([[np.nan], lr])
    s = pd.Series(lr)
    sig = s.rolling(96 * 7, min_periods=96 * 3).std().values  # 7 günlük 15 dk oynaklık
    n = len(g)
    def lag(a, k):
        o = np.full(n, np.nan); o[k:] = a[:-k]; return o
    def lead(a, k):
        o = np.full(n, np.nan); o[:-k] = a[k:]; return o
    F = {}
    with np.errstate(divide='ignore', invalid='ignore'):
        F['m6'] = c / lag(c, 24) - 1
        F['m24'] = c / lag(c, 96) - 1
        F['m48'] = c / lag(c, 192) - 1
        F['m72'] = c / lag(c, 288) - 1
        F['mz'] = (np.log(c / lag(c, 96)) / (sig * math.sqrt(96)) + np.log(c / lag(c, 192)) / (sig * math.sqrt(192)) + np.log(c / lag(c, 288)) / (sig * math.sqrt(288))) / 3
        e = lead(vw, 1)
        y4 = lead(vw, 17) / e - 1
        y24 = lead(vw, 97) / e - 1
    # ölü veri: hacim 0 olan giriş/çıkış mumu
    y4[~(lead(v, 1) > 0) | ~(lead(v, 17) > 0)] = np.nan
    y24[~(lead(v, 1) > 0) | ~(lead(v, 97) > 0)] = np.nan
    mon = pd.to_datetime(g, unit='ms', utc=True).strftime('%Y-%m').values
    inU = np.isin(mon, list(months))
    hourly = ((g + M15) % 3600000) == 0
    keep = inU & hourly & np.isfinite(y4) & np.isfinite(F['m72'])
    out = pd.DataFrame({'t': g[keep], 'sym': sym, 'y4': y4[keep], 'y24': y24[keep], **{k: F[k][keep] for k in FE}})
    allf = pd.DataFrame({'t': g, **{k: F[k] for k in FE}})  # masa birleştirmesi için (her mum)
    return out, allf

def nw_t(x, lags=3):
    x = np.asarray(x, float); x = x[np.isfinite(x)]; n = len(x)
    if n < 10:
        return np.nan
    m = x.mean(); e = x - m; g0 = (e @ e) / n; s = g0
    for L in range(1, lags + 1):
        s += 2 * (1 - L / (lags + 1)) * (e[L:] @ e[:-L]) / n
    return m / math.sqrt(s / n)

def ny(n):
    return f'{n:,}'.replace(',', '.')

def ic_series(d, k, hz):
    r = d.groupby('t')[[k, hz]].rank()
    a = r[k] - r.groupby(d['t'])[k].transform('mean'); b = r[hz] - r.groupby(d['t'])[hz].transform('mean')
    g = pd.DataFrame({'t': d['t'], 'ab': a * b, 'aa': a * a, 'bb': b * b}).groupby('t').sum()
    return (g['ab'] / np.sqrt(g['aa'] * g['bb'])).replace([np.inf, -np.inf], np.nan).dropna()

def f3(x, d=3):
    return '—' if x is None or not np.isfinite(x) else f'{x:+.{d}f}'.replace('.', ',')

def main():
    months = sorted(m for m in U if m >= FROM)
    syms = sorted({s for m in months for s in U[m][:TOP]})
    inU = {s: {m for m in months if s in U[m][:TOP]} for s in syms}
    rows = []; ALLF = {}
    t0 = time.time()
    for i, s in enumerate(syms):
        r = coin(s, inU[s])
        if r is None:
            continue
        rows.append(r[0]); ALLF[s] = r[1]
        if i % 40 == 0:
            print(i, len(syms), s, f'{time.time()-t0:.0f} sn', flush=True)
    D = pd.concat(rows, ignore_index=True)
    D = D[D.groupby('t')['sym'].transform('count') >= 10]
    T0, T1 = D['t'].min(), D['t'].max(); MID = (T0 + T1) / 2; L12 = T1 - 365 * DAY
    per = {'1. yarı': D['t'] < MID, '2. yarı': D['t'] >= MID, 'son 12 ay': D['t'] >= L12}
    ds = lambda x: time.strftime('%Y-%m-%d', time.gmtime(x / 1000))
    md = ['# Test #13 · `mom6h` faktörü (6 saatlik pencerede momentum)', '', '10 Ekim 2026 · `python3 tests/test13-mom6h.py`', '',
          f'Evren: ayın ilk 30 coini (önceki 30 günün hacmi, delist dahil, TradFi hariç), {ds(T0)} → {ds(T1)}, saat başı {ny(len(D))} gözlem, {D["sym"].nunique()} coin. ' +
          'Değişkenler 15 dk kapanışlarından (t anında kapanmış mum): son 6 sa getirisi ve 4/8/12 × 6 sa getirisi (AdaptiveTrend\'in 6 sa mumlarındaki L mumluk değişimi, kayan pencereyle), ayrıca üçünün 7 günlük 15 dk oynaklığıyla ölçeklenmiş ortalaması. '
          'Hedef sonraki mumun VWAP\'ından 16 mum sonraki mumun VWAP\'ına basit getiri (4 sa); ek ufuk 24 sa. Kapanıştan kapanışa ölçülmedi.', '',
          'IC = saat içi coinler arası Spearman, saatlerin ortalaması; t günlük ortalamalardan Newey–West (3 gecikme). Havuz = bütün (coin, saat) çiftlerinde tek Spearman (piyasa yönünü de içerir). Beşlik farkı = saat içi en yüksek beşte bir − en düşük beşte bir, 4 sa getirisi ortalaması (maliyetsiz; 2+2 taker gidiş-dönüş %0,16).', '']
    for hz in ('y4', 'y24'):
        md.append(f'## Ufuk {"4 sa" if hz=="y4" else "24 sa"}\n')
        md.append('| değişken | ' + ' | '.join(f'IC {p}' for p in per) + ' | ' + ' | '.join(f'havuz {p}' for p in per) + ' | ' + ' | '.join(f'üst−alt {p}' for p in per) + ' |')
        md.append('|---|' + '---:|' * 9)
        for k in FE:
            ics, pools, spr = [], [], []
            for nm, m in per.items():
                d = D[m & np.isfinite(D[k]) & np.isfinite(D[hz])]
                ic = ic_series(d, k, hz)
                day = ic.groupby(ic.index // DAY).mean()
                ics.append(f'{f3(ic.mean())} (t {f3(nw_t(day.values),1)})')
                pools.append(f3(spearmanr(d[k], d[hz]).statistic))
                q = d.groupby('t')[k].rank(pct=True)
                hi = d.loc[q > 0.8].groupby('t')[hz].mean(); lo = d.loc[q <= 0.2].groupby('t')[hz].mean()
                sp = (hi - lo).dropna()
                spr.append(f3(100 * sp.mean(), 3) + ' %')
            md.append(f'| {FN[k]} | ' + ' | '.join(ics) + ' | ' + ' | '.join(pools) + ' | ' + ' | '.join(spr) + ' |')
        md.append('')
    # yıl yıl IC (4 sa)
    md.append('## Yıl yıl saat içi IC (4 sa)\n')
    D['yr'] = pd.to_datetime(D['t'], unit='ms', utc=True).dt.year
    yrs = sorted(D['yr'].unique())
    md.append('| değişken | ' + ' | '.join(str(y) for y in yrs) + ' |\n|---|' + '---:|' * len(yrs))
    for k in FE:
        cells = []
        for y in yrs:
            d = D[(D['yr'] == y) & np.isfinite(D[k])]
            ic = ic_series(d, k, 'y4')
            cells.append(f3(ic.mean()))
        md.append(f'| {FN[k]} | ' + ' | '.join(cells) + ' |')
    # masa örnekleri
    md.append('\n## Masa kararlarında (giriş kuralını geçenler: veto yok, puan ≥ 0,35, evet ≥ 3)\n')
    S = []
    import glob
    for f in sorted(glob.glob(os.path.join(ARCH, 'samples-*.jsonl'))):
        for line in open(f):
            s = json.loads(line)
            if s['veto'] or s['score'] is None or s['score'] < 0.35 or s['yes'] < 3 or s['R'] is None:
                continue
            if s['sym'] not in ALLF:
                continue
            S.append((s['sym'], s['t'], 1 if s['dir'] == 'long' else -1, s['R'], s['y']))
    S = pd.DataFrame(S, columns=['sym', 't', 'sg', 'R', 'y'])
    S = S[S['t'] >= int(pd.Timestamp(FROM + '-01', tz='UTC').value // 10**6)]
    parts = []
    for sym, g in S.groupby('sym'):
        A = ALLF[sym].set_index('t')
        parts.append(g.join(A, on='t'))
    S = pd.concat(parts, ignore_index=True)
    for k in FE:
        S[k] = S[k] * S['sg']
    S0, S1 = S['t'].min(), S['t'].max(); SM = (S0 + S1) / 2; SL = S1 - 365 * DAY
    sper = {'1. yarı': S['t'] < SM, '2. yarı': S['t'] >= SM, 'son 12 ay': S['t'] >= SL}
    md.append(f'{ny(len(S))} karar ({ds(S0)} → {ds(S1)}); değişken yönde işaretli (long için olduğu gibi, short için eksi). R = botun planı (fonlamasız, örnekteki), y = 4 sa\'te önce +1 ATR (tahmin defteri ölçüsü). Beşlik sınırları tüm dönemden.\n')
    md.append('| değişken | dönem | ' + ' | '.join(f'B{i} R' for i in range(1, 6)) + ' | Spearman(değişken, R) | B5 − B1 R | B5 y / taban y |\n|---|---|' + '---:|' * 8)
    for k in ('m6', 'm24', 'm48', 'm72', 'mz'):
        d0 = S[np.isfinite(S[k])]
        qb = pd.qcut(d0[k], 5, labels=False, duplicates='drop')
        for nm, m in sper.items():
            mm = m[d0.index]
            g = d0[mm].groupby(qb[mm])
            Rq = g['R'].mean(); yq = g['y'].mean()
            md.append(f'| {FN[k]} | {nm} | ' + ' | '.join(f3(x) for x in Rq) + f' | {f3(spearmanr(d0.loc[mm,k], d0.loc[mm,"R"]).statistic)} | {f3(Rq.iloc[-1]-Rq.iloc[0])} | %{100*yq.iloc[-1]:.1f} / %{100*d0.loc[mm,"y"].mean():.1f} |'.replace('.', ',').replace('%+', '%'))
    open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test13-mom6h-report.md'), 'w').write('\n'.join(md) + '\n')
    print('\n'.join(md))

if __name__ == '__main__':
    main()
