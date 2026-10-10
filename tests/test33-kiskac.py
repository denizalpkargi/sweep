# Test #33 (9 Ekim 2026; kullanıcı: "kıskaç stratejisi: high'lar ve low'lar sağa doğru birbirine yaklaşıp sıkıştıkça bir tarafa kırılım beklenirmiş, doğrusunu bul"):
# Simetrik üçgen / sıkışma (coil) kırılımı. Tanım (Edwards & Magee, Bulkowski): alçalan tepeler + yükselen dipler, iki çizgi sağda bir uçta (apex) kesişir;
# fiyat genişliğin ~%60–75'inde çizgilerden birini kapanışla kırınca kırılım; hedef = üçgenin yüksekliği (ölçülü hareket); stop üçgenin içi/orta hattı.
# Algoritma (1 sa ve 1 g mumlar, arşiv, ayın ilk 100 coini):
#   pivot tepe/dip: k mum sağ-sol (1 sa k=3, 1 g k=2), onay pivotun k mum sonrasında; her mumda son iki onaylı tepe (h1>h2, j1<j2) ve son iki dip (l1<l2);
#   koşullar: tepe eğimi < 0, dip eğimi > 0, dört pivot da son W mum içinde (1 sa W=72, 1 g W=60), kapanış çizgilerin arasında, güncel genişlik ≤ 0,6 × başlangıç yüksekliği (H0 = max tepe − min dip);
#   kırılım: izleyen ≤ L mumda (1 sa 24, 1 g 20) kapanış üst çizginin üstünde (yukarı) / alt çizginin altında (aşağı); yoksa "kırılmadı".
# Ölçüler: kırılım yönü payı; kırılım yönünde VWAP→VWAP getiri (giriş kırılımdan sonraki mumun VWAP'ı) 4/12/24/48 mum (1 g: 2/5/10/20 gün), ATR ve % cinsinden,
#   koşulsuz tabana ve sade Donchian kırılımına (üçgensiz, son 24 mumun tepesi/dibi) karşı; ölçülü hareket hedefi (±H0) ↔ orta hat stopu (önce hangisi, 48 mum); 6 mumda içeri dönen "sahte kırılım" payı;
#   önceki trendle koşullu (üçgenden önceki 5 günün yönü: devam mı dönüş mü); iki yarı ve son 12 ay; sıkışma vekilleri: Bollinger bant genişliği 120 mumun dibinde (BB squeeze), en dar 24 mumluk aralık (NR).
# Kullanım: python3 tests/test33-kiskac.py [--iv 1h|1d] [--from 2021-01] [--out tests/test33-kiskac-report.md]
import json, os, sys, math, time, numpy as np, pandas as pd
D = os.path.join(os.path.dirname(__file__), 'data', 'arch'); arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
IV = arg('iv', '1h'); FROM = arg('from', '2021-01' if IV == '1h' else '2020-06'); OUT = arg('out', os.path.join(os.path.dirname(__file__), f'test33-kiskac-{IV}-report.md')); t0 = time.time()
P = {'1h': dict(k=3, W=72, L=24, HZ=[4, 12, 24, 48], SIM=48, FB=6, TR=120, BBW=120, NRW=24, bar='sa'), '1d': dict(k=2, W=60, L=20, HZ=[2, 5, 10, 20], SIM=20, FB=3, TR=20, BBW=120, NRW=7, bar='g')}[IV]
U = json.load(open(os.path.join(D, 'universe.json')))['months']; months = sorted(m for m in U if m >= FROM)
syms = sorted({s for m in months for s in U[m][:100]} & {f[:-4] for f in os.listdir(os.path.join(D, IV))})
tFrom = int(pd.Timestamp(FROM).value // 10**6); BAR = 36e5 if IV == '1h' else 864e5
uniSet = {m: set(U[m][:100]) for m in months}
def pivots(x, k, high=True):
    n = len(x); idx = []
    for j in range(k, n - k):
        w = x[j-k:j+k+1]; v = x[j]
        if (high and v >= w.max() and (w == v).sum() == 1) or ((not high) and v <= w.min() and (w == v).sum() == 1): idx.append(j)
    return np.array(idx, dtype=np.int64)
EV = []  # olaylar
BASE = []  # koşulsuz taban (her sembolde rastgele 300 mum)
rng = np.random.RandomState(3)
for s in syms:
    k = pd.read_csv(os.path.join(D, IV, s + '.csv'), header=None, usecols=[0, 1, 2, 3, 4, 5, 7], dtype=np.float64).values
    ot = k[:, 0]; ot = np.where(ot > 1e14, np.floor(ot/1000), ot); lo = max(0, np.searchsorted(ot, tFrom - 200*BAR)); k = k[lo:]; ot = ot[lo:]
    if len(k) < 500: continue
    o, h, l, c, v, q = (k[:, j] for j in range(1, 7)); n = len(k); vw = np.where((v > 0) & (q > 0), q/np.maximum(v, 1e-12), c); vw = np.where((vw >= l*0.999) & (vw <= h*1.001), vw, c)
    tr = np.maximum(h - l, np.maximum(abs(h - np.roll(c, 1)), abs(l - np.roll(c, 1)))); tr[0] = h[0] - l[0]; atr = pd.Series(tr).rolling(14).mean().values
    mon = pd.to_datetime(ot, unit='ms').strftime('%Y-%m'); inU = np.array([m in uniSet and s in uniSet[m] for m in mon]); inU &= ot >= tFrom
    kk = P['k']; ph = pivots(h, kk, True); pl = pivots(l, kk, False)
    if len(ph) < 2 or len(pl) < 2: continue
    # her i için son iki onaylı tepe/dip (onay = pivot + k)
    cnth = np.searchsorted(ph + kk, np.arange(n), 'right'); cntl = np.searchsorted(pl + kk, np.arange(n), 'right')
    ok = (cnth >= 2) & (cntl >= 2) & inU & (np.arange(n) >= 200) & np.isfinite(atr)
    j2 = ph[np.clip(cnth-1, 0, len(ph)-1)]; j1 = ph[np.clip(cnth-2, 0, len(ph)-1)]; m2 = pl[np.clip(cntl-1, 0, len(pl)-1)]; m1 = pl[np.clip(cntl-2, 0, len(pl)-1)]
    h1, h2, l1, l2 = h[j1], h[j2], l[m1], l[m2]; i = np.arange(n)
    with np.errstate(invalid='ignore', divide='ignore'):
        su = (h2 - h1)/np.maximum(j2 - j1, 1); sl = (l2 - l1)/np.maximum(m2 - m1, 1); up = h2 + su*(i - j2); dn = l2 + sl*(i - m2); H0 = np.maximum(h1, h2) - np.minimum(l1, l2)
        start = np.minimum(j1, m1); width = i - start
        tri = ok & (h2 < h1) & (l2 > l1) & (su < 0) & (sl > 0) & (width <= P['W']) & (width >= 10) & (up > dn) & (c > dn) & (c < up) & ((up - dn) <= 0.6*H0) & (H0 > 0)
    # BB sıkışması ve NR vekilleri (aynı sembolde, bağımsız örnek)
    ma = pd.Series(c).rolling(20).mean().values; sd = pd.Series(c).rolling(20).std().values; bbw = 4*sd/ma; bbmin = pd.Series(bbw).rolling(P['BBW']).min().values
    sq = ok & (bbw <= bbmin*1.0001) & np.isfinite(bbw)
    rngN = pd.Series(h).rolling(P['NRW']).max().values - pd.Series(l).rolling(P['NRW']).min().values; nr = ok & (rngN <= pd.Series(rngN).rolling(P['NRW']*7).min().values*1.0001)
    def outcomes(b, d, lineU, lineD, H, kind, extra):
        # b: kırılım mumu, d: ±1; giriş b+1 VWAP; getiriler yön × VWAP→VWAP; hedef/stop simülasyonu
        e = b + 1
        if e + max(P['HZ']) + 1 >= n: return
        ent = vw[e]; a = atr[b]; row = dict(sym=s, t=ot[b], d=d, kind=kind, atr=a/ent, H=H/ent, **extra)
        for hz in P['HZ']: row[f'r{hz}'] = d*(vw[e+hz]/ent - 1)*100; row[f'a{hz}'] = d*(vw[e+hz]/ent - 1)*ent/a
        tgt = ent + d*H; hit = 0; dur = P['SIM']
        if kind == 'üçgen':  # stop karşı çizgide (Edwards-Magee / Bulkowski), en az max(0,5 ATR, %0,3), en çok H0 (orta çizgi stopu ucun dibinde sıfıra iniyordu)
            dist = min(max(abs(ent - (lineD if d > 0 else lineU)), 0.5*a, 0.003*ent), H); stp = ent - d*dist
        else: stp = ent - d*H*0.5
        for j in range(e, min(n, e + P['SIM'])):
            hitS = (l[j] <= stp) if d > 0 else (h[j] >= stp); hitT = (h[j] >= tgt) if d > 0 else (l[j] <= tgt)
            if hitS: hit = -1; dur = j - e; break
            if hitT: hit = 1; dur = j - e; break
        row['hit'] = hit; row['dur'] = dur; row['R'] = ((abs(tgt-ent)/abs(ent-stp)) if hit == 1 else (-1.0 if hit == -1 else d*(c[min(n-1, e+P['SIM'])]-ent)/abs(ent-stp))) - 0.0016*ent/abs(ent-stp)  # stop = −1R (önce −hedef/stop yazılıyordu)
        # sahte kırılım: FB mum içinde kapanış tekrar çizgilerin arasına/aralığa dönerse
        back = False
        for j in range(b+1, min(n, b+1+P['FB'])):
            if (d > 0 and c[j] < lineU) or (d < 0 and c[j] > lineD): back = True; break
        row['false'] = back; EV.append(row)
    # üçgen: aktif kalıp → kırılım taraması, tekrar tetiklemeyi önle
    nxt = 0
    for i0 in np.where(tri)[0]:
        if i0 < nxt: continue
        pre = (c[i0]/c[max(0, i0-120)] - 1)*100 if IV == '1h' else (c[i0]/c[max(0, i0-5)] - 1)*100  # önceki trend (5 gün)
        found = False
        for b in range(i0+1, min(n-1, i0+1+P['L'])):
            lu = h2[i0] + su[i0]*(b - j2[i0]); ld = l2[i0] + sl[i0]*(b - m2[i0])
            if lu <= ld: break
            if c[b] > lu: outcomes(b, 1, lu, ld, H0[i0], 'üçgen', dict(pre=pre, width=int(width[i0]), contr=(up[i0]-dn[i0])/H0[i0])); found = True; break
            if c[b] < ld: outcomes(b, -1, lu, ld, H0[i0], 'üçgen', dict(pre=pre, width=int(width[i0]), contr=(up[i0]-dn[i0])/H0[i0])); found = True; break
        if not found: EV.append(dict(sym=s, t=ot[i0], d=0, kind='üçgen', pre=pre, width=int(width[i0]), contr=(up[i0]-dn[i0])/H0[i0], hit=0, dur=0, R=np.nan, false=False, atr=np.nan, H=np.nan))
        nxt = (b if found else i0 + P['L']) + 1
    # vekiller: sıkışma anından sonraki L mumda aralık kırılımı (son NRW mumun tepesi/dibi)
    for mask, kind in [(sq, 'BB sıkışması'), (nr, 'en dar aralık')]:
        nxt = 0
        for i0 in np.where(mask)[0]:
            if i0 < nxt: continue
            hh = h[i0-P['NRW']+1:i0+1].max(); ll = l[i0-P['NRW']+1:i0+1].min(); found = False
            for b in range(i0+1, min(n-1, i0+1+P['L'])):
                if c[b] > hh: outcomes(b, 1, hh, ll, hh-ll, kind, dict(pre=np.nan, width=0, contr=np.nan)); found = True; break
                if c[b] < ll: outcomes(b, -1, hh, ll, hh-ll, kind, dict(pre=np.nan, width=0, contr=np.nan)); found = True; break
            nxt = (b if found else i0 + P['L']) + 1
    # sade Donchian kırılımı (üçgensiz) ve koşulsuz taban
    dc = ok & (c > pd.Series(h).shift(1).rolling(24 if IV == '1h' else 20).max().values); dd = ok & (c < pd.Series(l).shift(1).rolling(24 if IV == '1h' else 20).min().values)
    cand = np.where(dc | dd)[0]; 
    if len(cand): 
        for b in rng.choice(cand, min(len(cand), 60), replace=False): outcomes(int(b), 1 if dc[b] else -1, np.nan, np.nan, atr[b]*2, 'Donchian', dict(pre=np.nan, width=0, contr=np.nan))
    okI = np.where(ok)[0]
    if len(okI):
        for b in rng.choice(okI, min(len(okI), 300), replace=False):
            e = b + 1
            if e + max(P['HZ']) + 1 < n: BASE.append({f'r{hz}': (vw[e+hz]/vw[e]-1)*100 for hz in P['HZ']} | {'t': ot[b]})
E = pd.DataFrame(EV); B = pd.DataFrame(BASE); print('sembol', len(syms), 'olay', len(E), 'taban', len(B), f'{time.time()-t0:.0f} sn', flush=True)
fx = lambda v, d=2: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
pc = lambda v: ('—' if not np.isfinite(v) else f'%{100*v:.0f}')
T = E[E.kind == 'üçgen']; mid = np.sort(T.t.values)[len(T)//2] if len(T) else 0; y12 = T.t.max() - 365*864e5 if len(T) else 0
bar = P['bar']; L = [f'# Test #33 · Kıskaç / simetrik üçgen / sıkışma kırılımı · {IV} mumlar · {time.strftime("%Y-%m-%d")}', '',
    f'{len(syms)} coin (ayın ilk 100\'ü), {FROM} → {pd.to_datetime(E.t.max(), unit="ms").strftime("%Y-%m") if len(E) else "—"}. Tanım: alçalan iki tepe + yükselen iki dip (pivot {P["k"]} {bar}), dördü de son {P["W"]} {bar} içinde, kapanış çizgiler arasında, güncel genişlik ≤ 0,6 × başlangıç yüksekliği; kırılım = izleyen {P["L"]} {bar}da kapanış çizginin ötesinde. Getiri: kırılım yönünde, kırılımdan sonraki mumun VWAP\'ından (giriş) ileri VWAP\'a, maliyetsiz; R: hedef = +H0 (ölçülü hareket), stop = orta hat, gidiş-dönüş %0,16 düşülmüş, {P["SIM"]} {bar} içinde.', '']
nb = (T.d == 0).sum(); up = (T.d == 1).sum(); dn = (T.d == -1).sum()
L += ['## 1) Üçgen sayısı ve kırılım yönü', '', f'Üçgen: {len(T):,}; {P["L"]} {bar} içinde kırılmayan: {nb:,} ({pc(nb/max(len(T),1))}); yukarı {up:,} ({pc(up/max(up+dn,1))}), aşağı {dn:,} ({pc(dn/max(up+dn,1))}). Sahte kırılım ({P["FB"]} {bar} içinde geri dönen): yukarı {pc(T[T.d==1]["false"].mean())}, aşağı {pc(T[T.d==-1]["false"].mean())}.', '']
def tab(df, title, by='d'):
    rows = [f'## {title}', '', f'| Kesit | n | ' + ' | '.join(f'{hz} {bar} % (ATR)' for hz in P['HZ']) + ' | Hedef / stop / ikisi de değil | Ort. R | Sahte |', '|---|---|' + '---|'*len(P['HZ']) + '---|---|---|']
    for name, g in df:
        if len(g) < 20: continue
        rows.append(f'| {name} | {len(g):,} | ' + ' | '.join(f'{fx(g[f"r{hz}"].mean())} ({fx(g[f"a{hz}"].mean())})' for hz in P['HZ']) + f' | {pc((g.hit==1).mean())} / {pc((g.hit==-1).mean())} / {pc((g.hit==0).mean())} | {fx(g.R.mean())} | {pc(g["false"].mean())} |')
    return rows + ['']
Tb = T[T.d != 0].copy(); Tb['dir'] = np.where(Tb.d == 1, 'yukarı', 'aşağı'); Tb['per'] = np.where(Tb.t < mid, '1. yarı', '2. yarı'); Tb['y12'] = Tb.t >= y12
L += tab([('tümü', Tb), ('yukarı', Tb[Tb.d == 1]), ('aşağı', Tb[Tb.d == -1]), ('1. yarı', Tb[Tb.per == '1. yarı']), ('2. yarı', Tb[Tb.per == '2. yarı']), ('son 12 ay', Tb[Tb.y12]), ('son 12 ay yukarı', Tb[Tb.y12 & (Tb.d == 1)]), ('son 12 ay aşağı', Tb[Tb.y12 & (Tb.d == -1)])], '2) Üçgen kırılımı: kırılım yönünde sonuç')
# önceki trend: devam / dönüş
Tb['cont'] = np.sign(Tb.pre) == Tb.d
L += tab([('önceki trend yönünde (devam)', Tb[Tb.cont]), ('önceki trende karşı (dönüş)', Tb[~Tb.cont]), ('önceki 5 g > +%5, yukarı', Tb[(Tb.pre > 5) & (Tb.d == 1)]), ('önceki 5 g > +%5, aşağı', Tb[(Tb.pre > 5) & (Tb.d == -1)]), ('önceki 5 g < −%5, yukarı', Tb[(Tb.pre < -5) & (Tb.d == 1)]), ('önceki 5 g < −%5, aşağı', Tb[(Tb.pre < -5) & (Tb.d == -1)]), ('sıkı (genişlik ≤ 0,4 H0)', Tb[Tb.contr <= 0.4]), ('gevşek (0,4–0,6 H0)', Tb[Tb.contr > 0.4])], '3) Koşullu: önceki trend (üçgenden önceki 5 gün) ve sıkılık')
# kırılım yönü önceki trende bağlı mı
if len(Tb): L += [f'Kırılım yönü: önceki 5 gün artıyken yukarı payı {pc((Tb[Tb.pre>0].d==1).mean())} (n {len(Tb[Tb.pre>0]):,}), eksiyken {pc((Tb[Tb.pre<0].d==1).mean())} (n {len(Tb[Tb.pre<0]):,}).', '']
# vekiller ve taban
O = E[E.kind != 'üçgen'].copy(); O['dir'] = np.where(O.d == 1, 'yukarı', 'aşağı')
L += tab([(f'{k} {dd}', g) for k in ['BB sıkışması', 'en dar aralık', 'Donchian'] for dd, g in O[O.kind == k].groupby('dir')], '4) Karşılaştırma: Bollinger sıkışması kırılımı, en dar aralık kırılımı, sade Donchian kırılımı (üçgensiz)')
if len(B): L += ['## 5) Koşulsuz taban (rastgele mumlar, yön yok, mutlak getiri)', '', '| Kesit | n | ' + ' | '.join(f'{hz} {bar} ort. %' for hz in P['HZ']) + ' | ' + ' | '.join(f'{hz} {bar} ort. |%|' for hz in P['HZ']) + ' |', '|---|---|' + '---|'*(2*len(P['HZ'])),
             f'| tümü | {len(B):,} | ' + ' | '.join(fx(B[f"r{hz}"].mean()) for hz in P['HZ']) + ' | ' + ' | '.join(fx(B[f"r{hz}"].abs().mean()) for hz in P['HZ']) + ' |', '']
# yıl yıl
Tb['yıl'] = pd.to_datetime(Tb.t, unit='ms').dt.year
L += ['## 6) Yıl yıl (üçgen, kırılım yönünde)', '', f'| Yıl | n | yukarı payı | {P["HZ"][1]} {bar} % | {P["HZ"][3]} {bar} % | Ort. R | Hedef payı |', '|---|---|---|---|---|---|---|']
for y, g in Tb.groupby('yıl'): L.append(f'| {y} | {len(g):,} | {pc((g.d==1).mean())} | {fx(g[f"r{P["HZ"][1]}"].mean())} | {fx(g[f"r{P["HZ"][3]}"].mean())} | {fx(g.R.mean())} | {pc((g.hit==1).mean())} |')
open(OUT, 'w').write('\n'.join(L) + '\n'); print('\n'.join(L[:12])); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
