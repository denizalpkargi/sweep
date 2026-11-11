# Opsiyon → futures araştırması (11 Ekim 2026). Veri: tests/fetch-deribit-opt.py (Deribit perp saatlik, fonlama, opsiyon saatlik işlem mumları).
# 1) Opsiyon işlemlerinden IV (Black-76, F = perp kapanışı, r = 0) ve delta; günlük/4 saatlik göstergeler (son 24 sa işlemleri):
#    rr25 (25 delta call IV − put IV, 7–45 gün), skew = rr25 / ATM IV, ATM IV, vade yapısı (≤10 g ATM − 25–45 g ATM), P/C hacim (kontrat ve prim),
#    0–2 günlük vade payı, değişimler (1 g, 7 g). Hedef: perp getirisi (sinyalden 1 sa sonra kapanıştan +4/24/72 sa) ve gelecek RV.
#    IC (Spearman) iki yarı + son 12 ay, Newey-West t, dairesel kaydırma plasebosu; kural: 180 g z-puanı üst/alt %20 → yön, maliyet + fonlama.
# 2) Vade etkileri: cuma 08:00 UTC (haftalık / aylık / çeyreklik): vade öncesi/sonrası oynaklık ve getiri, yuvarlak strike'a çekim,
#    işlem hacminden "max pain" vekili (gerçek OI geçmişi yok) → son 7/3 günde fiyat ona gidiyor mu.
# Kullanım: python3 tests/opsiyon-study.py [BTC ETH] → tests/opsiyon-report.md
import sys, os, math, datetime as dt
import numpy as np, pandas as pd
D = os.path.join(os.path.dirname(__file__), 'data', 'opsiyon'); H = 3600_000; DAY = 24 * H; YR = 365 * DAY
COST = 0.0016  # taker 0,05 % × 2 + kayma 0,03 % × 2
rng = np.random.default_rng(7)
out = []
def P(*a): s = ' '.join(str(x) for x in a); print(s, flush=True); out.append(s)

from math import erf
_erf = np.frompyfunc(erf, 1, 1)
def Ncdf(x): return 0.5 * (1 + _erf(x / math.sqrt(2)).astype(float))

def black(F, K, T, s, cp):
    sv = s * np.sqrt(T); d1 = (np.log(F / K) + 0.5 * sv * sv) / sv; d2 = d1 - sv
    c = F * Ncdf(d1) - K * Ncdf(d2)
    return np.where(cp == 1, c, c - F + K), d1

def implied(F, K, T, px, cp):
    lo = np.full(len(F), 0.02); hi = np.full(len(F), 6.0)
    for _ in range(40):
        mid = (lo + hi) / 2; v, _ = black(F, K, T, mid, cp)
        up = v > px; hi = np.where(up, mid, hi); lo = np.where(up, lo, mid)
    iv = (lo + hi) / 2
    _, d1 = black(F, K, T, iv, cp)
    dl = np.where(cp == 1, Ncdf(d1), Ncdf(d1) - 1)
    intr = np.where(cp == 1, np.maximum(F - K, 0), np.maximum(K - F, 0))
    bad = (px <= intr * 1.0005) | (iv < 0.03) | (iv > 5.9)
    return np.where(bad, np.nan, iv), dl

def load(cur):
    p = pd.read_csv(f'{D}/perp-{cur}.csv', header=None, names=['t', 'o', 'h', 'l', 'c', 'v']).drop_duplicates('t').set_index('t').sort_index()
    f = pd.read_csv(f'{D}/fund-{cur}.csv', header=None, names=['t', 'i']).drop_duplicates('t').set_index('t').sort_index()
    o = pd.read_csv(f'{D}/opt-{cur}.csv', header=None, names=['t', 'exp', 'K', 'cp', 'c', 'v'])
    o = o.drop_duplicates(['t', 'exp', 'K', 'cp'])
    o['F'] = p['c'].reindex(o['t']).values
    o = o[o.F > 0].copy()
    o['T'] = (o.exp - (o.t + H)) / YR; o['dte'] = o['T'] * 365
    o['cpn'] = (o.cp == 'C').astype(int)
    o['usd'] = o.c * o.F * o.v
    m = (o['T'] > 1 / 365 / 24).values
    iv, dl = implied(o.F.values[m], o.K.values[m].astype(float), o['T'].values[m], (o.c * o.F).values[m], o.cpn.values[m])
    o['iv'] = np.nan; o['dl'] = np.nan
    o.loc[m, 'iv'] = iv; o.loc[m, 'dl'] = dl
    return p, f, o

def vw(g, col='iv'):
    w = g.v.values; x = g[col].values; ok = ~np.isnan(x)
    return np.nan if w[ok].sum() <= 0 else float((x[ok] * w[ok]).sum() / w[ok].sum())

def features(o, step_h):
    # her step_h saatte bir, son 24 saatin işlemlerinden
    o = o.copy(); o['b'] = (o.t // (step_h * H) + 1) * step_h * H  # sinyal zamanı = penceresinin sonu
    rows = {}
    ts = np.sort(o.b.unique())
    grp = {k: g for k, g in o.groupby('b')}
    win = 24 // step_h
    for i, b in enumerate(ts):
        parts = [grp[x] for x in ts[max(0, i - win + 1):i + 1] if x > b - 24 * H]
        g = pd.concat(parts)
        s = g[(g.dte >= 7) & (g.dte <= 45)]
        c25 = s[(s.cpn == 1) & (s.dl >= 0.15) & (s.dl <= 0.35)]; p25 = s[(s.cpn == 0) & (s.dl <= -0.15) & (s.dl >= -0.35)]
        atm = s[(s.dl.abs() >= 0.4) & (s.dl.abs() <= 0.6)]
        near = g[(g.dte >= 1) & (g.dte <= 10) & (g.dl.abs() >= 0.4) & (g.dl.abs() <= 0.6)]
        far = g[(g.dte >= 25) & (g.dte <= 60) & (g.dl.abs() >= 0.4) & (g.dl.abs() <= 0.6)]
        r = {}
        a = vw(atm); r['atm'] = a
        if c25.v.sum() > 0 and p25.v.sum() > 0:
            r['rr25'] = vw(c25) - vw(p25); r['skew'] = r['rr25'] / a if a == a and a > 0 else np.nan
        r['term'] = vw(near) - vw(far)
        g90 = g[g.dte <= 90]
        vc, vp = g90[g90.cpn == 1].v.sum(), g90[g90.cpn == 0].v.sum()
        uc, up = g90[g90.cpn == 1].usd.sum(), g90[g90.cpn == 0].usd.sum()
        r['pc_n'] = math.log((vp + 1e-9) / (vc + 1e-9)) if vc > 0 and vp > 0 else np.nan
        r['pc_usd'] = math.log((up + 1e-9) / (uc + 1e-9)) if uc > 0 and up > 0 else np.nan
        # OTM call / put prim: yön bahsi (OTM = |delta| < 0,4)
        oc = g90[(g90.cpn == 1) & (g90.dl < 0.4)].usd.sum(); op = g90[(g90.cpn == 0) & (g90.dl > -0.4)].usd.sum()
        r['otm_pc'] = math.log(op / oc) if oc > 0 and op > 0 else np.nan
        r['short_share'] = g[g.dte < 2].v.sum() / max(g.v.sum(), 1e-9)
        r['opt_usd'] = math.log(g.usd.sum() + 1)
        rows[b] = r
    F = pd.DataFrame.from_dict(rows, orient='index').sort_index()
    return F

def nw_t(x, lag):
    x = np.asarray(x, float); x = x[~np.isnan(x)]; n = len(x)
    if n < 20: return np.nan
    m = x.mean(); e = x - m; s = (e * e).sum() / n
    for L in range(1, lag + 1):
        s += 2 * (1 - L / (lag + 1)) * (e[L:] * e[:-L]).sum() / n
    return m / math.sqrt(s / n) if s > 0 else np.nan

def ic(x, y):
    m = ~(np.isnan(x) | np.isnan(y))
    if m.sum() < 30: return np.nan, np.nan, 0
    rx = pd.Series(x[m]).rank().values; ry = pd.Series(y[m]).rank().values
    rx = (rx - rx.mean()) / rx.std(); ry = (ry - ry.mean()) / ry.std()
    return float((rx * ry).mean()), rx * ry, int(m.sum())

def zscore(s, win):
    mu = s.rolling(win, min_periods=win // 2).mean(); sd = s.rolling(win, min_periods=win // 2).std()
    return (s - mu) / sd

def study(cur):
    P(f'\n## {cur}\n')
    p, f, o = load(cur)
    P(f'Opsiyon işlem saati satırı {len(o):,}, IV çözülen {o.iv.notna().sum():,}, vade {o.exp.nunique()}, dönem',
      dt.datetime.fromtimestamp(o.t.min() / 1000, dt.timezone.utc).date(), '→', dt.datetime.fromtimestamp(o.t.max() / 1000, dt.timezone.utc).date())
    c = p['c']; lr = np.log(c).diff()
    fund = f['i'].reindex(p.index).fillna(0)
    res = {}
    for step in [24, 4]:
        Fe = features(o, step)
        for k in ['rr25', 'skew', 'pc_n', 'pc_usd', 'otm_pc', 'atm', 'term']:
            if k in Fe: Fe['d1_' + k] = Fe[k].diff(24 // step)
        Fe['d7_rr25'] = Fe['rr25'] - Fe['rr25'].shift(7 * 24 // step)
        Fe['d7_skew'] = Fe['skew'] - Fe['skew'].shift(7 * 24 // step)
        # hedefler
        t = Fe.index.values; ent = t + H
        cE = c.reindex(ent).values
        tg = {}
        for hz in ([4, 24, 72] if step == 4 else [24, 72]):
            cX = c.reindex(ent + hz * H).values; tg[f'r{hz}'] = cX / cE - 1
            fs = fund.cumsum(); tg[f'f{hz}'] = fs.reindex(ent + hz * H).values - fs.reindex(ent).values
        rv = lr.pow(2)
        rvs = rv.rolling(24).sum()
        tg['rv24'] = np.log(np.sqrt(rvs.reindex(ent + 24 * H).values) + 1e-9)
        tg['rv24p'] = np.log(np.sqrt(rvs.reindex(t).values) + 1e-9)
        tg['mom7'] = c.reindex(t).values / c.reindex(t - 7 * DAY).values - 1
        res[step] = (Fe, tg)
    Fe, tg = res[24]
    feats = [k for k in Fe.columns if k not in ('opt_usd',)]
    n = len(Fe); t = Fe.index.values
    mid = t[0] + (t[-1] - t[0]) / 2; last12 = t[-1] - 365 * DAY
    halves = [('1. yarı', t < mid), ('2. yarı', t >= mid), ('son 12 ay', t >= last12)]
    P(f'Günlük örneklem {n} gün; yarı sınırı', dt.datetime.fromtimestamp(mid / 1000, dt.timezone.utc).date())
    P('\nGösterge kapsaması (dolu gün): ' + ', '.join(f'{k} {Fe[k].notna().sum()}' for k in feats))
    for hz in [24, 72]:
        y = tg[f'r{hz}']
        P(f'\n### Günlük sinyal → sonraki {hz} sa getiri (Spearman IC; NW t; plasebo p = dairesel kaydırma 500)\n')
        P('| gösterge | ' + ' | '.join(h for h, _ in halves) + ' | tümü | t | plasebo p | momentum kontrollü IC |')
        P('|' + '---|' * (len(halves) + 5))
        for k in feats:
            x = Fe[k].values; cells = []
            for h, m in halves:
                v, _, nn = ic(np.where(m, x, np.nan), y); cells.append(f'{v:+.3f}' if v == v else '–')
            v, prod, nn = ic(x, y); tt = nw_t(prod, hz // 24 + 1) if nn else np.nan
            ok = ~(np.isnan(x) | np.isnan(y)); xs = x[ok]; ys = y[ok]
            if len(xs) > 60:
                null = [ic(np.roll(xs, int(rng.integers(30, len(xs) - 30))), ys)[0] for _ in range(500)]
                pv = float(np.mean(np.abs(null) >= abs(v)))
            else: pv = np.nan
            # momentum (7 g) ve geçmiş RV'ye göre artık IC
            mm = ~(np.isnan(x) | np.isnan(y) | np.isnan(tg['mom7']))
            if mm.sum() > 60:
                X = np.c_[np.ones(mm.sum()), pd.Series(tg['mom7'][mm]).rank().values]
                rx = pd.Series(x[mm]).rank().values; bx = np.linalg.lstsq(X, rx, rcond=None)[0]; ex = rx - X @ bx
                ry = pd.Series(y[mm]).rank().values; by = np.linalg.lstsq(X, ry, rcond=None)[0]; ey = ry - X @ by
                pc = float(np.corrcoef(ex, ey)[0, 1])
            else: pc = np.nan
            P(f'| {k} | ' + ' | '.join(cells) + f' | {v:+.3f} | {tt:+.1f} | {pv:.2f} | {pc:+.3f} |')
    # oynaklık tahmini
    P('\n### Günlük sinyal → sonraki 24 sa gerçekleşen oynaklık (log RV), geçmiş 24 sa RV kontrollü kısmi IC\n')
    P('| gösterge | IC | kısmi IC (geçmiş RV) | 1. yarı kısmi | 2. yarı kısmi |'); P('|---|---|---|---|---|')
    for k in feats:
        x = Fe[k].values; y = tg['rv24']; z = tg['rv24p']
        def part(m):
            mm = m & ~(np.isnan(x) | np.isnan(y) | np.isnan(z))
            if mm.sum() < 60: return np.nan
            X = np.c_[np.ones(mm.sum()), pd.Series(z[mm]).rank().values]
            rx = pd.Series(x[mm]).rank().values; ry = pd.Series(y[mm]).rank().values
            ex = rx - X @ np.linalg.lstsq(X, rx, rcond=None)[0]; ey = ry - X @ np.linalg.lstsq(X, ry, rcond=None)[0]
            return float(np.corrcoef(ex, ey)[0, 1])
        v = ic(x, y)[0]; al = np.ones(n, bool)
        P(f'| {k} | {v:+.3f} | {part(al):+.3f} | {part(t < mid):+.3f} | {part(t >= mid):+.3f} |')
    # 4 saatlik sinyal, 4 sa ufuk
    Fe4, tg4 = res[4]; t4 = Fe4.index.values; mid4 = t4[0] + (t4[-1] - t4[0]) / 2
    P('\n### 4 saatte bir (son 24 sa işlemleri) → sonraki 4 sa getiri\n')
    P('| gösterge | 1. yarı | 2. yarı | son 12 ay | tümü | t |'); P('|---|---|---|---|---|---|')
    for k in [c for c in Fe4.columns if c != 'opt_usd']:
        x = Fe4[k].values; y = tg4['r4']; cells = []
        for m in [t4 < mid4, t4 >= mid4, t4 >= t4[-1] - 365 * DAY]:
            v = ic(np.where(m, x, np.nan), y)[0]; cells.append(f'{v:+.3f}' if v == v else '–')
        v, prod, nn = ic(x, y); tt = nw_t(prod, 1) if nn else np.nan
        P(f'| {k} | ' + ' | '.join(cells) + f' | {v:+.3f} | {tt:+.1f} |')
    # işlem kuralı: 180 günlük z, üst/alt %20 (z > 0,84 / < −0,84), yön = IC'nin tümündeki işareti İLK YARIDAN seçilir
    P('\n### İşlem kuralı (günlük, 180 g z-puanı > 0,84 ya da < −0,84 → yön; işaret yalnız 1. yarıdan seçildi; maliyet %0,16 + fonlama)\n')
    P('| gösterge | ufuk | işaret | işlem | 1. yarı ort. % | 2. yarı ort. % | son 12 ay % | rastgele taban % (aynı gün sayısı, aynı yön karışımı) |')
    P('|---|---|---|---|---|---|---|---|')
    for k in feats:
        z = zscore(Fe[k], 180).values
        for hz in [24, 72]:
            y = tg[f'r{hz}']; fu = tg[f'f{hz}']
            m1 = t < mid
            v1 = ic(np.where(m1, Fe[k].values, np.nan), y)[0]
            if v1 != v1: continue
            sg = 1 if v1 > 0 else -1
            d = np.where(z > 0.84, sg, np.where(z < -0.84, -sg, 0)).astype(float)
            d[np.isnan(z)] = 0
            # örtüşmesin: işlem sırasında yeni giriş yok
            keep = np.zeros(n, bool); nxt = -1
            for i in range(n):
                if d[i] != 0 and i >= nxt and y[i] == y[i]: keep[i] = True; nxt = i + hz // 24
            pnl = d * y - COST - d * np.nan_to_num(fu)
            def avg(m): mm = keep & m; return (pnl[mm].mean() * 100 if mm.sum() > 4 else np.nan), int(mm.sum())
            a1, n1 = avg(m1); a2, n2 = avg(~m1); a3, n3 = avg(t >= last12)
            # rastgele taban: aynı gün sayısı, aynı yön oranı, rastgele günler
            nk = keep.sum(); okd = np.where(~np.isnan(y))[0]; bs = []
            for _ in range(300):
                ii = rng.choice(okd, nk, replace=False); dd = rng.permutation(d[keep])
                bs.append((dd * y[ii] - COST - dd * np.nan_to_num(fu[ii])).mean() * 100)
            P(f'| {k} | {hz} sa | {"+" if sg > 0 else "−"} | {nk} | {a1:+.2f} ({n1}) | {a2:+.2f} ({n2}) | {a3:+.2f} ({n3}) | {np.mean(bs):+.2f} (%95: {np.percentile(bs, 97.5):+.2f}) |')
    return p, o

def expiry(cur, p, o):
    P(f'\n### {cur} vade etkileri (cuma 08:00 UTC)\n')
    c = p['c']; lr = np.log(c).diff()
    exps = np.sort(o.exp.unique())
    rows = []
    for e in exps:
        d = dt.datetime.fromtimestamp(e / 1000, dt.timezone.utc)
        nxt = d + dt.timedelta(days=7)
        kind = 'çeyreklik' if (nxt.month != d.month and d.month in (3, 6, 9, 12)) else ('aylık' if nxt.month != d.month else 'haftalık')
        def rv(a, b):
            x = lr.reindex(range(int(a + H), int(b + H), H)).values; x = x[~np.isnan(x)]
            return 100 * math.sqrt((x * x).sum() * 24 / max(len(x), 1)) if len(x) > 2 else np.nan
        def px(t): v = c.get(int(t - H), np.nan); return v  # t'de biten mumun kapanışı (mum başlangıcı t−1 sa)
        r = dict(e=e, kind=kind, rv_pre=rv(e - 8 * H, e), rv_post=rv(e, e + 16 * H), rv_base=rv(e - 7 * DAY - 8 * H, e - 7 * DAY + 16 * H),
                 r_pre3=px(e) / px(e - 3 * DAY) - 1, r_post3=px(e + 3 * DAY) / px(e) - 1, r_post1=px(e + DAY) / px(e) - 1, S=px(e))
        # hacim vekilli max pain: vadeye kadar biriken işlem hacmi (OI yerine), 7 / 3 gün önce
        g = o[o.exp == e]
        for lag in (7, 3):
            gg = g[g.t < e - lag * DAY]
            if len(gg) < 20: r[f'mp{lag}'] = np.nan; continue
            agg = gg.groupby(['K', 'cpn']).v.sum().reset_index()
            Ks = np.sort(agg.K.unique()); Kc = agg[agg.cpn == 1]; Kp = agg[agg.cpn == 0]
            pain = [(Kc.v * np.maximum(0, k - Kc.K)).sum() + (Kp.v * np.maximum(0, Kp.K - k)).sum() for k in Ks]
            r[f'mp{lag}'] = float(Ks[int(np.argmin(pain))]); r[f'S{lag}'] = px(e - lag * DAY)
        # en çok işlem gören strike (son 7 gün)
        gg = g[g.t >= e - 7 * DAY]
        r['topK'] = float(gg.groupby('K').v.sum().idxmax()) if len(gg) else np.nan
        rows.append(r)
    E = pd.DataFrame(rows)
    P('| vade türü | n | vade öncesi 8 sa RV (günlük %) | sonrası 16 sa RV | bir hafta önce aynı 24 sa | önceki 3 g getiri % | sonraki 1 g % | sonraki 3 g % |')
    P('|---|---|---|---|---|---|---|---|')
    for k in ['haftalık', 'aylık', 'çeyreklik']:
        s = E[E.kind == k]
        P(f'| {k} | {len(s)} | {s.rv_pre.mean():.2f} | {s.rv_post.mean():.2f} | {s.rv_base.mean():.2f} | {100*s.r_pre3.mean():+.2f} | {100*s.r_post1.mean():+.2f} | {100*s.r_post3.mean():+.2f} |')
    rp = E.rv_post / E.rv_pre
    P(f'\nVade sonrası / öncesi RV oranı (log ort.): haftalık {np.log(rp[E.kind=="haftalık"]).mean():+.3f}, aylık+çeyreklik {np.log(rp[E.kind!="haftalık"]).mean():+.3f}')
    # max pain vekili: fiyat ona gidiyor mu? yön isabeti ve getiri
    P('\n**Max pain (hacim vekili) çekimi**: vadeden 7 / 3 gün önce max pain yönü ile vadeye kadar getiri\n')
    P('| gecikme | vade türü | n | yön isabeti | yön × getiri ort. % (maliyetsiz) | max pain uzaklığı medyan % | 1. yarı isabet | 2. yarı isabet |'); P('|---|---|---|---|---|---|---|---|')
    mid = E.e.min() + (E.e.max() - E.e.min()) / 2
    for lag in (7, 3):
        for kk, msk in [('hepsi', E.kind.notna()), ('aylık+çeyreklik', E.kind != 'haftalık')]:
            s = E[msk & E[f'mp{lag}'].notna() & (E[f'mp{lag}'] != E[f'S{lag}'])].copy()
            s['dir'] = np.sign(s[f'mp{lag}'] - s[f'S{lag}']); s['ret'] = s.S / s[f'S{lag}'] - 1
            s = s[s.ret.notna()]
            hit = (np.sign(s.ret) == s.dir).mean(); dr = (s.dir * s.ret).mean() * 100
            dist = (s[f'mp{lag}'] / s[f'S{lag}'] - 1).abs().median() * 100
            h1 = (np.sign(s.ret) == s.dir)[s.e < mid].mean(); h2 = (np.sign(s.ret) == s.dir)[s.e >= mid].mean()
            P(f'| {lag} g | {kk} | {len(s)} | %{100*hit:.1f} | {dr:+.2f} | {dist:.1f} | %{100*h1:.1f} | %{100*h2:.1f} |')
    # yuvarlak strike çekimi: 08:00'de en yakın büyük strike'a uzaklık ↔ aynı haftanın diğer saatleri
    P('\n**Strike çekimi (pinning)**: vade anında fiyatın en çok işlem gören strike\'a (son 7 g) ve en yakın yuvarlak strike\'a uzaklığı, aynı vadenin önceki 7 günündeki saatlere göre\n')
    big = 1000 if cur == 'BTC' else 100
    rows = []
    for _, r in E.iterrows():
        if not (r.S == r.S and r.topK == r.topK): continue
        hrs = [int(r.e - k * H) for k in range(1, 7 * 24)]
        pp = c.reindex([h - H for h in hrs]).values
        stepb = big if r.S > (20000 if cur == 'BTC' else 1000) else big / 2
        def rd(x): return np.abs(x / stepb - np.round(x / stepb)) * stepb / x
        rows.append(dict(kind=r.kind, dTop=abs(r.S / r.topK - 1), dTopH=np.nanmedian(np.abs(pp / r.topK - 1)),
                         dRnd=float(rd(r.S)), dRndH=float(np.nanmean(rd(pp))), e=r.e))
    Q = pd.DataFrame(rows)
    for kk, msk in [('hepsi', Q.kind.notna()), ('aylık+çeyreklik', Q.kind != 'haftalık')]:
        s = Q[msk]
        w = (s.dTop < s.dTopH).mean(); wr = (s.dRnd < s.dRndH).mean()
        P(f'- {kk} ({len(s)} vade): en çok işlem gören strike\'a uzaklık vadede medyan %{100*s.dTop.median():.2f}, önceki 7 günün saatlerinde %{100*s.dTopH.median():.2f}; vadede daha yakın olan pay %{100*w:.0f}. '
          f'Yuvarlak strike ({big}) uzaklığı vadede ort. %{100*s.dRnd.mean():.3f}, önceki saatlerde %{100*s.dRndH.mean():.3f}; vadede daha yakın pay %{100*wr:.0f} (şans ≈ %50).')
    return E

if __name__ == '__main__':
    curs = sys.argv[1:] or ['BTC', 'ETH']
    P('# Opsiyon → futures: Deribit opsiyon işlemleriyle test (otomatik rapor)\n')
    P(f'Oluşturma {dt.datetime.now(dt.timezone.utc):%Y-%m-%d %H:%M} UTC. Veri tests/fetch-deribit-opt.py; betik tests/opsiyon-study.py.')
    for cur in curs:
        p, o = study(cur); expiry(cur, p, o)
    open(os.path.join(os.path.dirname(__file__), 'opsiyon-report.md'), 'w').write('\n'.join(out) + '\n')
