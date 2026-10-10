"""Test #31 (10 Ekim 2026): pompa dönüşü short, 24 sa.
Her gün 00:00 UTC'de ayın evreninden (universe.json months[ay][:TOP], önceki 30 günün hacmine göre) son 24 sa en çok yükselen ilk 3 coin
short; giriş 00:00–00:15 mumunun VWAP'ı (q/v, [low, high] içine sınırlı), çıkış ertesi gün 00:00–00:15 mumunun VWAP'ı.
Maliyet: taker %0,05 + kayma %0,03 her bacakta; fonlama (short alır/öder) nominal × o andaki fiyat / giriş.
Boyut: pozisyon başına bakiyenin 1/10 ya da 1/20'si (nominal), bileşik günlük bakiye.
Stop: yok, +%15 / +%25 gün içi yüksek ile (seviyeden, açılış seviyeyi aşmışsa açılıştan çıkış), +%15 / +%25 15 dk kapanışla (sonraki mumun açılışında çıkış).
Taban: aynı gün evrendeki bütün coinleri eşit short (piyasa short'u) → pompa seçiminin farkı.
Sıkışma (short −%20'den kötü, stopsuz): giriş anındaki işaretler (coin 24 sa, 7 g, hacim oranı, son fonlama, OI 24 sa değişimi,
büyük trader / tüm hesap long/short, BTC 24 sa) beşliklere göre sıkışma oranı ve AUC, iki yarı.
15 dk mum yoksa (ilk 50 evreninde 31–50. sıradakiler) 1 sa mumlar kullanılır (giriş/çıkış o saatin VWAP'ı).
Kullanım: python3 tests/test31-pompa-short.py [--top 30] [--n 3] → tests/test31-pompa-short-report.md (--top 50 ek bölüm olarak aynı rapora)
"""
import json, os, sys, math, time
import numpy as np, pandas as pd

ARCH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'arch')
FEE = 0.0005 + 0.0003
DAY = 86400000; M15 = 900000; H1 = 3600000
FROM = '2020-06'

def arg(k, d):
    return sys.argv[sys.argv.index('--' + k) + 1] if '--' + k in sys.argv else d

NPICK = int(arg('n', 3))
U = json.load(open(os.path.join(ARCH, 'universe.json')))['months']

def load_k(sym, iv):
    f = os.path.join(ARCH, iv, sym + '.csv')
    if not os.path.exists(f):
        return None
    d = pd.read_csv(f, header=None, usecols=[0, 1, 2, 3, 4, 5, 7], names=['t', 'o', 'h', 'l', 'c', 'v', 'q'], dtype=np.float64)
    d = d.drop_duplicates('t').sort_values('t')
    return {k: d[k].values for k in d.columns}

def load_f(sym):
    f = os.path.join(ARCH, 'funding', sym + '.csv')
    if not os.path.exists(f):
        return None
    d = pd.read_csv(f, header=None, names=['t', 'r']).dropna()
    return d['t'].values.astype(np.float64), d['r'].values.astype(np.float64)

def coin_days(sym, days, iv):
    """sym için her gün D (00:00 ms) kaydı: ret24, giriş/çıkış VWAP, en yüksek, stop çıkışları, fonlama, özellikler."""
    k = load_k(sym, iv)
    if k is None or len(k['t']) < 200:
        return {}
    bar = M15 if iv == '15m' else H1
    t = k['t'].astype(np.int64); o, h, l, c, v, q = k['o'], k['h'], k['l'], k['c'], k['v'], k['q']
    with np.errstate(divide='ignore', invalid='ignore'):
        vw = np.where(v > 0, q / v, np.nan)
    vw = np.where((vw >= l) & (vw <= h), vw, np.where(v > 0, c, np.nan))
    pos = {int(x): i for i, x in enumerate(t)}
    fu = load_f(sym)
    # fonlama × fiyat birikimli (bar başına): rate_f × o[bar içeren f]
    cumF = np.zeros(len(t) + 1)
    if fu is not None and len(fu[0]):
        bi = np.searchsorted(t, fu[0], side='right') - 1
        ok = (bi >= 0) & (fu[0] < t[np.clip(bi, 0, None)] + bar)
        add = np.zeros(len(t))
        np.add.at(add, bi[ok], fu[1][ok] * o[bi[ok]])
        cumF[1:] = np.cumsum(add)
        frT, frR = fu
    else:
        frT = frR = None
    cq = np.concatenate([[0], np.cumsum(np.nan_to_num(q))])
    out = {}
    for D in days:
        i0 = pos.get(D); ip = pos.get(D - bar); i24 = pos.get(D - DAY - bar); ix = pos.get(D + DAY)
        if i0 is None or ip is None or i24 is None or ix is None or ix - i0 != DAY // bar:
            continue
        if not (v[i0] > 0 and v[ix] > 0):
            continue  # ölü veri
        e = vw[i0]; x = vw[ix]
        r24 = c[ip] / c[i24] - 1
        rec = {'r24': r24, 'e': e, 'x': x}
        seg = slice(i0 + 1, ix)
        hmax = h[seg].max(); rec['hmax'] = hmax / e - 1
        # fonlama: (D, D+1 00:00] aralığı → barlar i0+1..ix (ix barının açılışındaki 00:00 fonlaması dahil)
        rec['fund'] = (cumF[ix + 1] - cumF[i0 + 1]) / e
        # stoplar
        for lv in (0.15, 0.25):
            S = e * (1 + lv)
            key = int(lv * 100)
            rec[f'sh{key}'] = None; rec[f'sc{key}'] = None
            if hmax >= S:
                j = i0 + 1 + int(np.argmax(h[seg] >= S))
                px = max(S, o[j])
                rec[f'sh{key}'] = (px, (cumF[j + 1] - cumF[i0 + 1]) / e)
            cc = c[seg]
            if cc.max() >= S:
                j = i0 + 1 + int(np.argmax(cc >= S))
                jn = j + 1
                px = o[jn] if jn <= ix else c[j]
                rec[f'sc{key}'] = (px, (cumF[min(jn, ix) + 1] - cumF[i0 + 1]) / e)
        # özellikler (giriş anında bilinen)
        i7 = pos.get(D - 7 * DAY - bar)
        rec['r7'] = c[ip] / c[i7] - 1 if i7 is not None else np.nan
        n1 = DAY // bar
        if ip - 8 * n1 >= 0:
            q24 = cq[ip + 1] - cq[ip + 1 - n1]; q7 = (cq[ip + 1 - n1] - cq[ip + 1 - 8 * n1]) / 7
            rec['vr'] = q24 / q7 if q7 > 0 else np.nan
        else:
            rec['vr'] = np.nan
        if frT is not None:
            fi = np.searchsorted(frT, D, side='right') - 1
            rec['fr'] = frR[fi] if fi >= 0 else np.nan
        else:
            rec['fr'] = np.nan
        out[D] = rec
    return out

def metrics_feats(sym, Ds):
    f = os.path.join(ARCH, 'metrics', sym + '.csv')
    res = {}
    if not os.path.exists(f):
        return res
    d = pd.read_csv(f, header=None, names=['t', 'oi', 'oiv', 'topAcc', 'topPos', 'glob', 'taker'])
    d = d.dropna(subset=['t']).sort_values('t')
    t = d['t'].values
    for D in Ds:
        i = np.searchsorted(t, D - 300000, side='right') - 1; j = np.searchsorted(t, D - DAY - 300000, side='right') - 1
        if i < 0 or j < 0 or D - t[i] > 3600e3 or D - DAY - t[j] > 3600e3:
            continue
        oi1, oi0 = d['oi'].values[i], d['oi'].values[j]
        res[D] = {'oi24': oi1 / oi0 - 1 if oi0 > 0 else np.nan, 'topPos': d['topPos'].values[i], 'glob': d['glob'].values[i],
                  'topAcc': d['topAcc'].values[i]}
    return res

def build(TOP):
    months = sorted(m for m in U if m >= FROM)
    syms = sorted({s for m in months for s in U[m][:TOP]})
    has15 = set(f[:-4] for f in os.listdir(os.path.join(ARCH, '15m')))
    # günler
    d0 = int(pd.Timestamp(FROM + '-01', tz='UTC').value // 10**6)
    last = int(pd.Timestamp.now('UTC').value // 10**6)
    days_all = list(range(d0 + DAY, last - 2 * DAY, DAY))
    mon = lambda D: time.strftime('%Y-%m', time.gmtime(D / 1000))
    inU = {s: set() for s in syms}
    for m in months:
        for s in U[m][:TOP]:
            inU[s].add(m)
    REC = {}
    t0 = time.time()
    for n, s in enumerate(syms):
        Ds = [D for D in days_all if mon(D) in inU[s]]
        iv = '15m' if s in has15 else '1h'
        REC[s] = coin_days(s, Ds, iv)
        if s not in has15:
            for D in REC[s]:
                REC[s][D]['iv'] = '1h'
        if n % 40 == 0:
            print(TOP, n, len(syms), s, f'{time.time()-t0:.0f} sn', flush=True)
    return REC, days_all

def trades_of(REC, days, n=NPICK):
    rows = []; base = {}
    for D in days:
        cand = [(r['r24'], s) for s, R in REC.items() if D in R for r in [R[D]] if np.isfinite(r['r24'])]
        if len(cand) < 10:
            continue
        cand.sort(reverse=True)
        # piyasa short'u: evrendeki bütün coinler
        allr = [short_ret(REC[s][D], 'yok') for _, s in cand]
        base[D] = float(np.mean(allr))
        for rk, (r24, s) in enumerate(cand[:n]):
            rows.append({'D': D, 'sym': s, 'rank': rk + 1, 'ncand': len(cand), **REC[s][D]})
    return pd.DataFrame(rows), pd.Series(base)

def short_ret(r, stop):
    e = r['e']
    if stop == 'yok' or r.get(stop) is None:
        x, f = r['x'], r['fund']
        xp = x * (1 + 0.0003)
    else:
        x, f = r[stop]
        xp = x * (1 + 0.0003)
    # short: (giriş − çıkış)/giriş; giriş kayması giriş fiyatını kötüleştirir; ücretler nominal üzerinden
    ep = e * (1 - 0.0003)
    return (ep - xp) / e - 0.0005 - 0.0005 * xp / e + f

STOPS = [('yok', 'stopsuz'), ('sh15', '+%15 gün içi yüksek'), ('sh25', '+%25 gün içi yüksek'), ('sc15', '+%15 15 dk kapanış'), ('sc25', '+%25 15 dk kapanış')]

def equity(daily):
    b = np.cumprod(1 + daily.values)
    peak = np.maximum.accumulate(np.concatenate([[1], b]))[1:]
    dd = (b / peak - 1).min()
    return b, dd

def fmt(x, d=2, pct=True, sign=True):
    if x is None or (isinstance(x, float) and not np.isfinite(x)):
        return '—'
    v = x * 100 if pct else x
    s = f'{v:+.{d}f}' if sign else f'{v:.{d}f}'
    return s.replace('.', ',') + (' %' if pct else '')

def section(df, base, TOP, md):
    df = df.sort_values('D')
    D0, D1 = df['D'].min(), df['D'].max(); MID = (D0 + D1) / 2; L12 = D1 - 365 * DAY; L24 = D1 - 730 * DAY
    per = {'tümü': lambda d: d >= 0, '1. yarı': lambda d: d < MID, '2. yarı': lambda d: d >= MID, 'son 24 ay': lambda d: d >= L24, 'son 12 ay': lambda d: d >= L12}
    ds = lambda D: time.strftime('%Y-%m-%d', time.gmtime(D / 1000))
    md.append(f'\n## Evren: ayın ilk {TOP} coini · {ds(D0)} → {ds(D1)} · {df["D"].nunique()} gün, {len(df)} işlem\n')
    md.append(f'15 dk yerine 1 sa mumla işlenen işlem payı: %{100*(df.get("iv")=="1h").mean():.1f}.\n' if 'iv' in df else '')
    for s, _ in STOPS:
        df['R_' + s] = [short_ret(r, s) for r in df.to_dict('records')]
    # işlem başı
    md.append('\n### İşlem başı getiri (nominal üzerinden, maliyet + fonlama dahil)\n')
    md.append('| stop | ' + ' | '.join(per) + ' | kazanma | stop olan |\n|---|' + '---:|' * (len(per) + 2))
    for s, ad in STOPS:
        cells = [fmt(df.loc[f(df['D']), 'R_' + s].mean(), 3) for f in per.values()]
        so = '—' if s == 'yok' else f'%{100*df[s].notna().mean():.1f}'
        md.append(f'| {ad} | ' + ' | '.join(cells) + f' | %{100*(df["R_"+s]>0).mean():.1f} | {so} |')
    # fonlama payı ve taban
    md.append(f'\nFonlamanın işlem başı payı: {fmt(df["fund"].mean(),3)} (short lehine artı). Seçilen coinlerin 24 sa yükselişi medyan {fmt(df["r24"].median(),1)}.\n')
    bD = base.reindex(sorted(df['D'].unique()))
    pick = df.groupby('D')['R_yok'].mean()
    md.append('\n### Taban: aynı gün evrendeki bütün coinleri short (stopsuz, aynı maliyet) ve fark\n')
    md.append('| | ' + ' | '.join(per) + ' |\n|---|' + '---:|' * len(per))
    md.append('| pompa ilk 3, gün ort. | ' + ' | '.join(fmt(pick[f(pick.index)].mean(), 3) for f in per.values()) + ' |')
    md.append('| piyasa short, gün ort. | ' + ' | '.join(fmt(bD[f(bD.index)].mean(), 3) for f in per.values()) + ' |')
    dif = pick - bD
    md.append('| fark | ' + ' | '.join(fmt(dif[f(dif.index)].mean(), 3) + f' (t {dif[f(dif.index)].mean()/dif[f(dif.index)].std()*math.sqrt(f(dif.index).sum()):.1f})' for f in per.values()) + ' |')
    # portföy
    md.append('\n### Bileşik bakiye (pozisyon başına 1/10 ve 1/20 nominal)\n')
    md.append('| stop | boy | son bakiye (1 → ) | yıllık | en büyük düşüş | en kötü gün | 1. yarı | 2. yarı | son 12 ay |\n|---|---|---:|---:|---:|---:|---:|---:|---:|')
    yrs = sorted({time.gmtime(D / 1000).tm_year for D in df['D']})
    yy = {}
    worst = {}
    for s, ad in STOPS:
        for sz in (0.1, 0.05):
            daily = df.groupby('D')['R_' + s].sum() * sz
            daily = daily.sort_index()
            b, dd = equity(daily)
            nyr = (daily.index[-1] - daily.index[0]) / (365 * DAY)
            cagr = b[-1] ** (1 / nyr) - 1
            parts = []
            for nm in ('1. yarı', '2. yarı', 'son 12 ay'):
                m = per[nm](daily.index)
                parts.append(fmt(np.prod(1 + daily[m].values) - 1, 0))
            md.append(f'| {ad} | 1/{int(round(1/sz))} | {b[-1]:.2f}'.replace('.', ',') + f' | {fmt(cagr,0)} | {fmt(dd,0)} | {fmt(daily.min(),1)} | ' + ' | '.join(parts) + ' |')
            yy[(s, sz)] = {y: np.prod(1 + daily[[time.gmtime(D / 1000).tm_year == y for D in daily.index]].values) - 1 for y in yrs}
            if sz == 0.1:
                worst[s] = daily
    md.append('\nAynı tablo kısmi dönemler için bileşik getiri; "en kötü gün" bakiyenin o günkü değişimi (3 pozisyon toplamı).\n')
    md.append('\n### Yıl yıl bileşik getiri (1/10 boy)\n')
    md.append('| stop | ' + ' | '.join(str(y) for y in yrs) + ' |\n|---|' + '---:|' * len(yrs))
    for s, ad in STOPS:
        md.append(f'| {ad} | ' + ' | '.join(fmt(yy[(s, 0.1)][y], 0) for y in yrs) + ' |')
    md.append('\n### Yıl yıl işlem başı ortalama (stopsuz) ve taban farkı\n')
    md.append('| yıl | işlem | pompa short | piyasa short | fark |\n|---|---:|---:|---:|---:|')
    for y in yrs:
        m = np.array([time.gmtime(D / 1000).tm_year == y for D in pick.index])
        md.append(f'| {y} | {int((np.array([time.gmtime(D/1000).tm_year==y for D in df["D"]])).sum())} | {fmt(pick[m].mean(),3)} | {fmt(bD[m].mean(),3)} | {fmt(dif[m].mean(),3)} |')
    md.append('\n### En kötü 8 işlem (stopsuz) ve stoplu hâli\n')
    md.append('| gün | coin | 24 sa önce | short (stopsuz) | +%15 yüksek | +%25 yüksek | gün içi en yüksek |\n|---|---|---:|---:|---:|---:|---:|')
    for r in df.nsmallest(8, 'R_yok').to_dict('records'):
        md.append(f'| {ds(r["D"])} | {r["sym"]} | {fmt(r["r24"],0)} | {fmt(r["R_yok"],1)} | {fmt(r["R_sh15"],1)} | {fmt(r["R_sh25"],1)} | {fmt(r["hmax"],0)} |')
    md.append('\n### En kötü 5 gün (1/10 boy, bakiye değişimi)\n')
    md.append('| gün | stopsuz | +%15 yüksek | +%25 yüksek | coinler |\n|---|---:|---:|---:|---|')
    for D in worst['yok'].nsmallest(5).index:
        md.append(f'| {ds(D)} | {fmt(worst["yok"][D],1)} | {fmt(worst["sh15"][D],1)} | {fmt(worst["sh25"][D],1)} | {", ".join(df.loc[df["D"]==D,"sym"])} |')
    return df

def squeeze(df, md):
    df = df.copy()
    D0, D1 = df['D'].min(), df['D'].max(); MID = (D0 + D1) / 2
    df['sq'] = (df['R_yok'] < -0.20).astype(int)
    sqs = df.loc[df.sq == 1, 'R_yok'].sum(); alls = df['R_yok'].sum()
    md.append(f'\n## Sıkışma günlerinin öncü işareti\n\nSıkışma = stopsuz short −%20\'den kötü kapandı: {df["sq"].sum()} işlem (%{100*df["sq"].mean():.1f}). Getiriler pozisyon nominali 1 birim alınarak toplanırsa bu işlemlerin toplamı {fmt(sqs,1,pct=False)} birim, bütün {len(df)} işleminki {fmt(alls,1,pct=False)}; sıkışmalar dışındaki işlemler toplamda {fmt(alls-sqs,1,pct=False)}{''}. Gün içi +%25\'e değen işlem payı %{100*(df["hmax"]>=0.25).mean():.1f}.\n'.replace("\\'", "'"))
    # BTC 24 sa
    feats = {'r24': 'coin 24 sa yükselişi', 'r7': 'coin 7 g getirisi', 'vr': 'hacim 24 sa / önceki 7 g ortalaması', 'fr': 'son fonlama oranı', 'oi24': 'OI 24 sa değişimi',
             'topPos': 'büyük trader long/short (pozisyon)', 'glob': 'tüm hesaplar long/short', 'btc24': 'BTC 24 sa', 'rank': 'sıra (1 = en çok yükselen)'}
    md.append('| işaret | kapsam | AUC 1. yarı | AUC 2. yarı | beşlik sıkışma oranı (düşük → yüksek), tümü | beşlik ort. short getirisi |\n|---|---:|---:|---:|---|---|')
    from sklearn.metrics import roc_auc_score
    for k, ad in feats.items():
        if k not in df:
            continue
        d = df[np.isfinite(df[k].astype(float))]
        if len(d) < 100:
            continue
        aucs = []
        for m in (d['D'] < MID, d['D'] >= MID):
            dd = d[m]
            aucs.append(roc_auc_score(dd['sq'], dd[k].astype(float)) if dd['sq'].nunique() == 2 and len(dd) > 50 else np.nan)
        try:
            qb = pd.qcut(d[k].astype(float).rank(method='first'), 5, labels=False)
        except Exception:
            continue
        rates = d.groupby(qb)['sq'].mean(); rets = d.groupby(qb)['R_yok'].mean()
        md.append(f'| {ad} | %{100*len(d)/len(df):.0f} | {aucs[0]:.3f} | {aucs[1]:.3f} | '.replace('.', ',') + ' · '.join(f'%{100*x:.0f}' for x in rates) + ' | ' + ' · '.join(fmt(x, 1) for x in rets) + ' |')
    md.append('\nAUC 0,5 = ayırmıyor; > 0,5 = işaret yüksekken sıkışma daha sık. OI ve long/short oranları metrics arşivinden (5 dk anlık görüntü, girişten en az 5 dk önce biten; en erken 2020-09, kapsam coine göre değişir).\n')
    return df

def crowd_filter(df, base, md, TOP):
    """Sıkışma tablosundan çıkan aday: tüm hesaplar long/short düşükken (kalabalık zaten short) girme. Eşik metrics kapsamının ilk yarısından."""
    d = df[np.isfinite(df['glob'].astype(float))].copy()
    if len(d) < 500:
        return
    MID = (d['D'].min() + d['D'].max()) / 2; L12 = d['D'].max() - 365 * DAY; L24 = d['D'].max() - 730 * DAY
    thr = d.loc[d['D'] < MID, 'glob'].quantile(0.2)
    per = {'1. yarı': d['D'] < MID, '2. yarı': d['D'] >= MID, 'son 24 ay': d['D'] >= L24, 'son 12 ay': d['D'] >= L12}
    ds = lambda D: time.strftime('%Y-%m-%d', time.gmtime(D / 1000))
    md.append(f'\n## Aday süzgeç (ilk {TOP}): tüm hesapların long/short oranı düşükken girme\n')
    md.append('Sıkışma tablosu veriye bakılarak okundu; bu bölüm yeni bir adayın ilk ölçüsü, kanıt değil. Eşik = metrics kapsamının (' + ds(d['D'].min()) + ' → ' + ds(d['D'].max()) + ') ilk yarısında oranın %20 dilimi: ' + f'{thr:.3f}'.replace('.', ',') + '. Oran ≤ eşik ise o coin short edilmez (pozisyon boş kalır). İkinci yarı ve son 12 ay eşiğe göre örneklem dışı.\n')
    md.append('| | ' + ' | '.join(per) + ' |\n|---|' + '---:|' * len(per))
    keep = d['glob'] > thr
    for nm, m in [('bütün işlemler, stopsuz', None), ('süzgeçten geçen, stopsuz', keep), ('süzgeçte kalan (oran ≤ eşik), stopsuz', ~keep), ('süzgeçten geçen, +%15 gün içi yüksek', keep)]:
        col = 'R_sh15' if 'yüksek' in nm else 'R_yok'
        md.append(f'| {nm} | ' + ' | '.join(fmt(d.loc[pm & (m if m is not None else True), col].mean(), 3) + f' ({int((pm & (m if m is not None else True)).sum())})' for pm in per.values()) + ' |')
    # aynı günlerde piyasa short'u ile fark (geçen işlemler)
    dk = d[keep]
    dd = dk.groupby('D')['R_yok'].mean() - base.reindex(dk.groupby('D').size().index)
    md.append('| geçenler − aynı gün piyasa short\'u | ' + ' | '.join(fmt(dd[(dd.index < MID) if nm == '1. yarı' else (dd.index >= MID) if nm == '2. yarı' else (dd.index >= (L24 if nm == 'son 24 ay' else L12))].mean(), 3) for nm in per) + ' |')
    for qn, th in (('%10 dilimi', d.loc[d['D'] < MID, 'glob'].quantile(0.1)), ('%30 dilimi', d.loc[d['D'] < MID, 'glob'].quantile(0.3)), ('sabit 1,0', 1.0)):
        kk = d['glob'] > th
        md.append(f'| eşik {qn} ({th:.2f}), geçen, stopsuz | '.replace('.', ',') + ' | '.join(fmt(d.loc[pm & kk, 'R_yok'].mean(), 3) + f' ({int((pm & kk).sum())})' for pm in per.values()) + ' |')
    md.append('| sıkışma oranı geçen / kalan | ' + ' | '.join(f'%{100*(d.loc[pm & keep, "R_yok"] < -0.2).mean():.1f} / %{100*(d.loc[pm & ~keep, "R_yok"] < -0.2).mean():.1f}' for pm in per.values()) + ' |')
    md.append('\n| süzgeçli, boy | son bakiye | yıllık | en büyük düşüş | en kötü gün | 1. yarı | 2. yarı | son 12 ay |\n|---|---:|---:|---:|---:|---:|---:|---:|')
    for col, ad in (('R_yok', 'stopsuz'), ('R_sh15', '+%15 gün içi yüksek')):
        for sz in (0.1, 0.05):
            daily = (dk.groupby('D')[col].sum() * sz).reindex(sorted(d['D'].unique())).fillna(0)
            b, mdd = equity(daily); nyr = (daily.index[-1] - daily.index[0]) / (365 * DAY)
            parts = [fmt(np.prod(1 + daily[pm(daily.index)].values) - 1, 0) for pm in (lambda x: x < MID, lambda x: x >= MID, lambda x: x >= L12)]
            md.append(f'| {ad}, 1/{int(round(1/sz))} | ' + f'{b[-1]:.2f}'.replace('.', ',') + f' | {fmt(b[-1]**(1/nyr)-1,0)} | {fmt(mdd,0)} | {fmt(daily.min(),1)} | ' + ' | '.join(parts) + ' |')
    yrs = sorted({time.gmtime(D / 1000).tm_year for D in d['D']})
    md.append('\n| yıl | ' + ' | '.join(map(str, yrs)) + ' |\n|---|' + '---:|' * len(yrs))
    yr = np.array([time.gmtime(D / 1000).tm_year for D in d['D']])
    md.append('| geçenler, stopsuz, işlem başı | ' + ' | '.join(fmt(d.loc[keep & (yr == y), 'R_yok'].mean(), 3) for y in yrs) + ' |')
    md.append('| kalanlar, stopsuz, işlem başı | ' + ' | '.join(fmt(d.loc[~keep & (yr == y), 'R_yok'].mean(), 3) for y in yrs) + ' |')
    md.append('| geçenler, +%15 stop, işlem başı | ' + ' | '.join(fmt(d.loc[keep & (yr == y), 'R_sh15'].mean(), 3) for y in yrs) + ' |')

def main():
    md = ['# Test #31 · Pompa dönüşü short, 24 sa', '', '10 Ekim 2026 · `python3 tests/test31-pompa-short.py`', '',
          'Kural: her gün 00:00 UTC\'de ayın evreninden (önceki 30 günün hacmine göre ilk 30, ek bölümde ilk 50; delist dahil, TradFi hariç) son 24 saatte en çok yükselen 3 coini short; giriş 00:00–00:15 mumunun VWAP\'ı, çıkış ertesi gün aynı mumun VWAP\'ı. Maliyet taker %0,05 + kayma %0,03 her bacakta, fonlama dahil (short\'un aldığı/ödediği, o anki fiyatla). Getiriler basit getiri. Stop varyantları gün içi yüksek (15 dk mumların yükseği seviyeye değince seviyeden; mum seviyenin üstünde açıldıysa açılıştan) ya da 15 dk kapanış (sonraki mumun açılışında çıkış). Bileşik bakiye pozisyon başına bakiyenin 1/10 ya da 1/20\'si nominal, günlük yeniden boyutlanır. Taban: aynı gün evrendeki bütün coinlerin eşit short\'u.', '',
          'Parametreler (24 sa, ilk 3, 00:00) Denklem 4\'ün yan bulgusundan geldi (aynı arşiv, `e_mup24`); bu test onu stop, boyut ve maliyetle sınar, yeni parametre seçmez.']
    out = {}
    for TOP in (30, 50):
        REC, days = build(TOP)
        btc = REC.get('BTCUSDT', {})
        df, base = trades_of(REC, days)
        df['btc24'] = [btc[D]['r24'] if D in btc else np.nan for D in df['D']]
        df = section(df, base, TOP, md)
        mf = {}
        for s, g in df.groupby('sym'):
            mf[s] = metrics_feats(s, list(g['D']))
        for k in ('oi24', 'topPos', 'glob'):
            df[k] = [mf[s].get(D, {}).get(k, np.nan) for s, D in zip(df['sym'], df['D'])]
        if TOP == 30:
            squeeze(df, md)
        crowd_filter(df, base, md, TOP)
        out[TOP] = df
        del REC
    import re
    txt = '\n'.join(md) + '\n'
    txt = re.sub(r'%(\d+)\.(\d)', r'%\1,\2', txt); txt = re.sub(r'\(t (-?\d+)\.(\d)\)', r'(t \1,\2)', txt)
    open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test31-pompa-short-report.md'), 'w').write(txt)
    out[30].drop(columns=[c for c in out[30].columns if c.startswith('s') and c[1] in 'hc' and c[2:].isdigit()]).to_csv(
        os.path.join(ARCH, '_t31-islemler.csv'), index=False)
    print(txt)

if __name__ == '__main__':
    main()
