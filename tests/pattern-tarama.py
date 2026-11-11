# Pattern taraması (10 Ekim 2026; kullanıcı: "geçmiş verilerde pattern taraması: coinlerin kendi zamanları içinde ya da birkaç coinde tekrarlayan, tanımaya müsait patternler var mı, tanıyarak işlem yapabilir miyiz").
# Veri madenciliği, çoklu test denetimiyle. Tüm parametreler veriye bakılmadan bu başlıkta sabitlendi; seçim yalnız KAZI döneminde (2021-01 → 2023-12),
# karar yalnız dokunulmamış AYRILMIŞ dönemde (2024-01 → bugün): iki yarı + son 12 ay + aynı işlemlerin rastgele kaydırılmış hâlleri (1000 çekiliş).
# Aileler:
#   A) Şekil kümeleri: karar saatinde son 24 saatlik fiyat yolu (A1), son 72 saat 3 sa adımla (A2), fiyat + hacim yolu (A3); her biri RMS'e bölünür (yalnız şekil),
#      kazı döneminde k-ortalama (64 küme); her küme × ufuk (4 / 24 sa) bir test.
#   A*) Benzer geçmiş (en yakın komşu): ayrılmış dönemdeki her şeklin kazı kütüphanesindeki 100 (havuz, tüm coinler) / 30 (yalnız aynı coin) en yakın komşusunun
#      sonraki getirisi = tahmin; IC, tahmin yönünde işlem (|tahmin| > maliyet), plasebo = kütüphane sonuçları karıştırılır (200 kez).
#   B) Sembol dizileri: 4 sa mum durumu (aşağı / yatay / yukarı, ±0,5 σ) son 5 mum → 243 dizi × (4, 24 sa); günlük son 4 gün → 81 dizi × (1, 5 gün).
#   C) Takvim: haftanın saati (168 hücre) × (1, 4 sa); ayın günü (31) × 24 sa.
#   D) Coinler arası öncülük: BTC / ETH / SOL / piyasa (eşit ağırlık) son 1 saati ±1,5 σ → takipçi coinde aynı yön (D1) ya da öncü − takipçi farkı ±1,5 σ (D2), 1 / 4 sa (16 kural, seçimsiz);
#      ilk 20 coinde ikili öncülük (380 sıralı çift) kazıda IC t'sine göre ilk 10 → ayrılmış dönemde aynı D1 kuralı.
# Rastgele taban: aynı işlem kümesi ayrılmış dönemde rastgele saat kadar dairesel kaydırılır (coin, yön, kümelenme korunur).
# Seçim kuralı (A, B, C, D-çift): kazıda haftalık t ≥ 3 ve maliyet + fonlama sonrası ortalama > 0; yön = kazıdaki işaret. Haftalık t: işlemler haftada ortalanır (aynı saatte çok coin, üst üste binen tutuşlar tek gözlem gibi sayılmaz).
# İşlem: karar mumu kapanışı → giriş sonraki mumun VWAP'ı, çıkış ufuk sonundaki mumun VWAP'ı (kapanış sıçraması yok), basit getiri, maliyet %0,16 gidiş-dönüş, fonlama arşivden (long öder).
# Evren: her ay önceki 30 gün hacmine göre ilk 50 (delist dahil, TradFi hariç, universe.json). Ölü veri (hacim 0) ve VWAP'ı [dip, tepe] dışı mum kapanışa düşer.
# Kullanım: python3 tests/pattern-tarama.py [--arch tests/data/arch] [--out tests/pattern-tarama-report.md] [--fast]
import json, os, sys, time, math, numpy as np, pandas as pd
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
HERE = os.path.dirname(os.path.abspath(__file__))
D = arg('arch', os.path.join(HERE, 'data', 'arch')); OUT = arg('out', os.path.join(HERE, 'pattern-tarama-report.md')); FAST = '--fast' in sys.argv
FROM, SPLIT = '2021-01', '2024-01-01'; TOPN = 50; COST = 0.0016; TMIN = 3.0; KCL = 64; KNN = 100; KNN_OWN = 30; NPERM = 200; NRAND = 1000; ZTH = 1.5
t0 = time.time(); log = lambda *a: print(f'[{time.time()-t0:6.0f} sn]', *a, flush=True)
rng = np.random.RandomState(7)
HR = 3600_000

# ---------- veri ----------
U = json.load(open(os.path.join(D, 'universe.json')))['months']; months = sorted(m for m in U if m >= FROM)
syms = sorted({s for m in months for s in U[m][:TOPN]} & {f[:-4] for f in os.listdir(os.path.join(D, '1h')) if f.endswith('.csv')})
tFrom = int(pd.Timestamp(FROM).value // 10**6) - 40*24*HR
frames = {}; tMax = 0
for s in syms:
    k = pd.read_csv(os.path.join(D, '1h', s + '.csv'), header=None, usecols=[0, 2, 3, 4, 5, 7], dtype=np.float64).values
    ot = k[:, 0]; ot = np.where(ot > 1e14, np.floor(ot/1000), ot); k[:, 0] = ot
    k = k[k[:, 0] >= tFrom]
    if len(k) < 500: continue
    k = k[np.unique(k[:, 0], return_index=True)[1]]; frames[s] = k; tMax = max(tMax, k[-1, 0])
syms = sorted(frames); S = len(syms); T = int((tMax - tFrom)//HR) + 1
log(f'{S} coin, {T} saat')
TT = tFrom + np.arange(T, dtype=np.int64)*HR
C = np.full((S, T), np.nan, np.float32); VW = C.copy(); V = C.copy(); CF = np.zeros((S, T), np.float64)
for a, s in enumerate(syms):
    k = frames[s]; ix = ((k[:, 0] - tFrom)//HR).astype(np.int64)
    h, l, c, v, q = k[:, 1], k[:, 2], k[:, 3], k[:, 4], k[:, 5]
    vw = np.where((v > 0) & (q > 0), q/np.maximum(v, 1e-12), c); vw = np.where((vw >= l) & (vw <= h), vw, c)
    C[a, ix] = c; VW[a, ix] = np.where(v > 0, vw, np.nan); V[a, ix] = v
    fp = os.path.join(D, 'funding', s + '.csv'); fr = np.zeros(T)
    if os.path.exists(fp):
        f = pd.read_csv(fp, header=None, names=['t', 'r'], dtype=str); f = f[f.t.str.match(r'^\d')]
        ft = f.t.astype(np.float64).values; fv = pd.to_numeric(f.r, errors='coerce').fillna(0).values
        fi = np.round((ft - tFrom)/HR).astype(np.int64); m = (fi >= 0) & (fi < T); np.add.at(fr, fi[m], fv[m])
    CF[a] = np.cumsum(fr)
del frames
mon = pd.to_datetime(TT, unit='ms').strftime('%Y-%m').values
uniSet = {m: set(U[m][:TOPN]) for m in months}
INU = np.zeros((S, T), bool)
for m in np.unique(mon):
    if m not in uniSet: continue
    cols = mon == m
    for a, s in enumerate(syms):
        if s in uniSet[m]: INU[a, cols] = True
INU &= TT[None, :] >= int(pd.Timestamp(FROM).value//10**6)
tSplit = int(pd.Timestamp(SPLIT).value//10**6); iSplit = int((tSplit - tFrom)//HR)
week = (np.arange(T)//168).astype(np.int64)
lc = np.log(C.astype(np.float64)); r1 = np.diff(lc, axis=1, prepend=np.nan)  # kapanıştan kapanışa (yalnız girdi olarak)

HZ = [1, 4, 24, 120]; FWD = {}; FUN = {}
for H in HZ:
    e = np.arange(T) + 1; x = e + H; ok = x < T
    R = np.full((S, T), np.nan, np.float32); F = np.zeros((S, T), np.float32)
    R[:, ok] = VW[:, x[ok]]/VW[:, e[ok]] - 1; F[:, ok] = CF[:, x[ok]] - CF[:, e[ok]]
    R[~INU] = np.nan; FWD[H] = R; FUN[H] = F
# ayrılmış dönemde ilk ufuk kadar boşluk: kazı dönemi işlemleri SPLIT'ten önce kapanır
def period_mask(H):
    i = np.arange(T); mine = i + 1 + H < iSplit; hold = i >= iSplit
    return mine, hold
holdIdx = np.arange(iSplit, T); hMid = iSplit + (T - iSplit)//2; i12 = T - 365*24
log('getiriler hazır')

def net(d, a, i, H):  # d: ±1 dizisi
    return d*FWD[H][a, i] - COST - d*FUN[H][a, i]
def wstat(x, i):  # haftalık t
    ok = np.isfinite(x); x, i = x[ok], i[ok]
    if len(x) < 5: return dict(n=len(x), m=np.nan, t=np.nan, w=np.nan, nw=0)
    wk = week[i]; u, inv = np.unique(wk, return_inverse=True); sm = np.bincount(inv, x); ct = np.bincount(inv); wm = sm/ct
    t = wm.mean()/(wm.std(ddof=1)/math.sqrt(len(wm))) if len(wm) > 2 and wm.std() > 0 else np.nan
    return dict(n=len(x), m=x.mean(), t=t, w=(x > 0).mean(), nw=len(wm))
# rastgele taban: aynı işlem kümesi (aynı coinler, aynı yönler, aynı zaman kümelenmesi) ayrılmış dönem içinde rastgele saat kadar dairesel kaydırılır
# (1 hafta ile dönem − 1 hafta arası). Bağımsız rastgele girişler kümelenmiş işlemlerin oynaklığını küçük gösterirdi; kaydırma piyasanın genel yönünü de aynı yönle taşır.
HL = T - iSplit
def rand_pct(a, i, d, H, mean_act):
    if len(i) == 0 or not np.isfinite(mean_act): return np.nan
    out = np.empty(NRAND)
    for b in range(NRAND):
        off = rng.randint(168, HL - 168); j = iSplit + (i - iSplit + off) % HL
        out[b] = np.nanmean(net(d, a, j, H))
    out = out[np.isfinite(out)]
    return (out < mean_act).mean()*100 if len(out) else np.nan
def judge(name, a, i, d, H, mineSel=None):
    """a,i,d: ayrılmış dönem işlemleri. mineSel: kazı istatistiği."""
    x = net(d, a, i, H); ok = np.isfinite(x); a, i, d, x = a[ok], i[ok], d[ok], x[ok]
    full = wstat(x, i); h1 = wstat(x[i < hMid], i[i < hMid]); h2 = wstat(x[i >= hMid], i[i >= hMid]); l12 = wstat(x[i >= i12], i[i >= i12])
    rp = rand_pct(a, i, d, H, full['m']) if len(x) else np.nan
    gross = np.nanmean(d*FWD[H][a, i]) if len(x) else np.nan
    passed = bool(len(x) >= 30 and full['m'] > 0 and h1['m'] > 0 and h2['m'] > 0 and l12['m'] > 0 and rp >= 95)
    return dict(ad=name, H=H, kazi=mineSel, n=full['n'], m=full['m'], t=full['t'], w=full['w'], h1=h1['m'], h2=h2['m'], l12=l12['m'], brut=gross, rp=rp, gecti=passed, long=float((d > 0).mean()) if len(d) else np.nan)

def pct(x, k=3): return '—' if x is None or not np.isfinite(x) else f'{x*100:+.{k}f}'.replace('.', ',') + ' %'
def num(x, k=2): return '—' if x is None or not np.isfinite(x) else f'{x:.{k}f}'.replace('.', ',')
REP = []; SUM = []
REP_ALL = []
def table(rows, title):
    REP_ALL.extend(rows); REP.append(f'\n### {title}\n')
    if not rows: REP.append('Kazıda seçim kuralını geçen yok.\n'); return
    REP.append('| desen | ufuk | kazı n / ort / t | ayr. n | ayr. ort (net) | brüt | t | 1. yarı | 2. yarı | son 12 ay | rastgele %ile | long payı | geçti |')
    REP.append('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for r in rows:
        k = r['kazi'] or {}
        REP.append(f"| {r['ad']} | {r['H']} sa | {k.get('n','—')} / {pct(k.get('m'))} / {num(k.get('t'))} | {r['n']} | {pct(r['m'])} | {pct(r['brut'])} | {num(r['t'])} | {pct(r['h1'])} | {pct(r['h2'])} | {pct(r['l12'])} | {num(r['rp'],0)} | {num(r['long']*100 if np.isfinite(r['long']) else np.nan,0)} % | {'evet' if r['gecti'] else 'hayır'} |")

# Kod → işlem kümesi seçimi (A, B, C ortak). code: (S,T) int, -1 = yok. Dönüş: seçilenlerin ayrılmış sonucu
def mine_codes(code, ncode, Hs, fam, label):
    res = []; ntest = 0; nsel = 0
    for H in Hs:
        mine, hold = period_mask(H)
        a, i = np.nonzero(code >= 0); c = code[a, i]; R = FWD[H][a, i]; ok = np.isfinite(R); a, i, c, R = a[ok], i[ok], c[ok], R[ok]
        F = FUN[H][a, i]; mm = mine[i]; hh = hold[i]
        for k in range(ncode):
            ntest += 1
            sel = mm & (c == k)
            if sel.sum() < 30: continue
            g = R[sel]; d = 1 if g.mean() > 0 else -1
            st = wstat(d*g - COST - d*F[sel], i[sel]); tg = wstat(d*g, i[sel])['t']
            if not (tg >= TMIN and st['m'] > 0): continue
            nsel += 1; hs = hh & (c == k)
            r = judge(f'{label} #{k}', a[hs], i[hs], np.full(hs.sum(), d), H, dict(n=st['n'], m=st['m'], t=tg)); res.append(r)
    exp = ntest*2*0.00135
    SUM.append(dict(aile=fam, test=ntest, secilen=nsel, sans=exp, gecen=sum(r['gecti'] for r in res)))
    return res

# ---------- A) şekil kümeleri + benzer geçmiş ----------
STEP = 4
def shapes(kind):
    """karar noktaları (her STEP saatte, evrende) ve şekil vektörleri"""
    i_all = np.arange(80, T - 1, STEP); a, i = np.meshgrid(np.arange(S), i_all, indexing='ij'); a, i = a.ravel(), i.ravel()
    keep = INU[a, i]; a, i = a[keep], i[keep]
    if kind in ('A1', 'A3'):
        X = np.stack([r1[a, i - j] for j in range(23, -1, -1)], 1)
    else:
        X = np.stack([lc[a, i - 3*j] - lc[a, i - 3*j - 3] for j in range(23, -1, -1)], 1)
    rms = np.sqrt(np.nanmean(X**2, 1)); X = X/rms[:, None]
    if kind == 'A3':
        lv = np.log1p(np.stack([V[a, i - j].astype(np.float64) for j in range(23, -1, -1)], 1)); lv = (lv - lv.mean(1, keepdims=True))/(lv.std(1, keepdims=True) + 1e-9)
        X = np.hstack([X, 0.5*lv])
    ok = np.isfinite(X).all(1) & (rms > 0); return a[ok], i[ok], X[ok].astype(np.float32)
def kmeans(X, k, it=25):
    sub = X[rng.choice(len(X), min(len(X), 100000), replace=False)]; Cc = sub[rng.choice(len(sub), k, replace=False)].copy()
    for _ in range(it):
        lab = assign(sub, Cc)
        for j in range(k):
            m = lab == j
            if m.any(): Cc[j] = sub[m].mean(0)
    return Cc
def assign(X, Cc):
    out = np.empty(len(X), np.int64); cn = (Cc**2).sum(1)
    for s0 in range(0, len(X), 50000):
        x = X[s0:s0+50000]; out[s0:s0+50000] = np.argmin(cn[None, :] - 2*x @ Cc.T, 1)
    return out
def knn_idx(Q, L, K):
    out = np.empty((len(Q), K), np.int32); ln = (L**2).sum(1)
    for s0 in range(0, len(Q), 256):
        q = Q[s0:s0+256]; d2 = ln[None, :] - 2*q @ L.T
        out[s0:s0+256] = np.argpartition(d2, K, 1)[:, :K]
    return out
def sp(p, y):  # Spearman (scipy'siz)
    p = np.asarray(p, float); y = np.asarray(y, float); ok = np.isfinite(p) & np.isfinite(y)
    if ok.sum() < 10: return np.nan
    return np.corrcoef(pd.Series(p[ok]).rank().values, pd.Series(y[ok]).rank().values)[0, 1]
def ic_by_hour(pred, act, i):
    df = pd.DataFrame(dict(p=pred, y=act, i=i)).dropna(); df = df[df.groupby('i').p.transform('size') >= 8]
    if not len(df): return np.nan, np.nan
    g = df.groupby('i')[['p', 'y']].rank(); g['i'] = df.i.values
    ics = g.groupby('i').apply(lambda z: np.corrcoef(z.p, z.y)[0, 1] if z.p.std() > 0 and z.y.std() > 0 else np.nan).dropna()
    wk = week[ics.index.values]; wm = pd.Series(ics.values).groupby(wk).mean()
    return ics.mean(), wm.mean()/(wm.std(ddof=1)/math.sqrt(len(wm))) if len(wm) > 2 else np.nan
KN = []
for kind, lab in [('A1', 'fiyat 24 sa'), ('A2', 'fiyat 72 sa'), ('A3', 'fiyat+hacim 24 sa')]:
    a, i, X = shapes(kind); log(kind, len(X), 'şekil')
    mineM = i + 1 + 24 < iSplit; Cc = kmeans(X[mineM], KCL); lab_ = assign(X, Cc)
    code = np.full((S, T), -1, np.int64); code[a, i] = lab_
    REP_A = mine_codes(code, KCL, [4, 24], 'A ' + lab, lab)
    for r in REP_A:  # kümenin ortalama şekli: birikimli yol (8 nokta) ve toplam hareket (RMS birimi)
        cp = np.cumsum(Cc[int(r['ad'].split('#')[1])][:24]); pts = cp[np.linspace(0, 23, 8).astype(int)]; lo_, hi_ = min(pts.min(), 0), max(pts.max(), 0)
        r['ad'] += ' ' + ''.join('▁▂▃▄▅▆▇█'[int(round(7*(v - lo_)/(hi_ - lo_ + 1e-9)))] for v in pts) + f' ({cp[-1]:+.1f})'
    table(REP_A, f'A · şekil kümeleri · {lab}')
    if kind == 'A2': continue
    # benzer geçmiş
    for H in [4, 24]:
        mineH = (i + 1 + H < iSplit) & np.isfinite(FWD[H][a, i]); Lx = X[mineH]; La, Li = a[mineH], i[mineH]; Ly = FWD[H][La, Li].astype(np.float64)
        qm = (i >= iSplit) & (i % 8 == 0) & np.isfinite(FWD[H][a, i]); Qx, Qa, Qi = X[qm], a[qm], i[qm]
        if FAST: kq = np.sort(rng.choice(len(Qx), min(len(Qx), 20000), replace=False)); Qx, Qa, Qi = Qx[kq], Qa[kq], Qi[kq]
        y = FWD[H][Qa, Qi].astype(np.float64); mk = np.nanmean(np.where(INU[:, Qi], FWD[H][:, Qi], np.nan), 0); yx = y - mk
        nb = knn_idx(Qx, Lx, KNN); pred = Ly[nb].mean(1)
        def evalp(p):
            pooled = sp(p, y); ich, ict = ic_by_hour(p, yx, Qi)
            return pooled, ich, ict
        po, ich, ict = evalp(pred)
        perm = []
        for b in range(NPERM):
            Lp = Ly[rng.permutation(len(Ly))]; perm.append(sp(Lp[nb].mean(1), y))
        perm = np.array(perm); pp = (perm >= po).mean()*100
        d = np.where(pred > 0, 1, -1); tr = np.abs(pred) > COST
        jr = judge(f'benzer geçmiş, havuz ({lab})', Qa[tr], Qi[tr], d[tr], H, None)
        # yalnız aynı coin
        predo = np.full(len(Qx), np.nan)
        for s_ in np.unique(Qa):
            lm = La == s_; qq = Qa == s_
            if lm.sum() < KNN_OWN*5: continue
            nbo = knn_idx(Qx[qq], Lx[lm], KNN_OWN); predo[qq] = Ly[lm][nbo].mean(1)
        poo, icho, icto = evalp(predo)
        do = np.where(predo > 0, 1, -1); tro = np.isfinite(predo) & (np.abs(predo) > COST)
        jro = judge(f'benzer geçmiş, aynı coin ({lab})', Qa[tro], Qi[tro], do[tro], H, None)
        KN.append(dict(lab=lab, H=H, nq=len(Qx), po=po, ich=ich, ict=ict, perm95=np.percentile(perm, 95), pp=pp, jr=jr, poo=poo, icho=icho, icto=icto, jro=jro))
        log(kind, H, 'knn', round(po, 4), round(ich, 4))

# ---------- B) sembol dizileri ----------
def seq_codes(step, nseq, sdwin, hourMod):
    rr = lc - np.roll(lc, step, 1); rr[:, :step] = np.nan
    pos = np.arange(T); dec = (pos % step == hourMod)
    sd = np.full((S, T), np.nan)
    for a in range(S):
        idx = np.nonzero(dec)[0]; x = pd.Series(rr[a, idx]); sd[a, idx] = x.shift(1).rolling(sdwin, min_periods=sdwin//2).std().values
    st = np.where(rr < -0.5*sd, 0, np.where(rr > 0.5*sd, 2, 1)).astype(np.int64); st[~np.isfinite(sd) | ~np.isfinite(rr)] = -1
    code = np.zeros((S, T), np.int64); bad = np.zeros((S, T), bool)
    for j in range(nseq):
        sh = np.roll(st, j*step, 1); sh[:, :j*step] = -1; bad |= sh < 0; code = code*3 + np.maximum(sh, 0)
    code[bad | ~dec[None, :] | ~INU] = -1; return code
# karar mumu: 4 sa mumunun son saati (açılış saati %4 == 3), gün mumunun son saati (23)
hod = ((TT // HR) % 24).astype(np.int64)
c4 = seq_codes(4, 5, 60, int(np.nonzero(hod % 4 == 3)[0][0] % 4)); B4 = mine_codes(c4, 243, [4, 24], 'B 4 sa dizi', '4 sa dizi')
def decode(k, n):
    s = ''
    for _ in range(n): s = '↓→↑'[k % 3] + s; k //= 3
    return s[::-1]  # kodun en anlamlı hanesi en yeni mum; eskiden yeniye yaz
for r in B4: r['ad'] = '4 sa ' + decode(int(r['ad'].split('#')[1]), 5)
table(B4, 'B · 4 sa sembol dizileri (son 5 mum eskiden yeniye; ↓ aşağı, → yatay, ↑ yukarı, ±0,5 σ)')
cD = seq_codes(24, 4, 30, int(np.nonzero(hod == 23)[0][0] % 24)); BD = mine_codes(cD, 81, [24, 120], 'B günlük dizi', 'günlük dizi')
for r in BD: r['ad'] = 'gün ' + decode(int(r['ad'].split('#')[1]), 4)
table(BD, 'B · günlük sembol dizileri (son 4 gün)')
CODES_B = {'4 sa': c4, 'gün': cD}



# ---------- C) takvim ----------
dow = ((TT // (24*HR) + 3) % 7).astype(np.int64)  # 0 = pazartesi
how = dow*24 + hod
cH = np.where(INU, how[None, :], -1); CH = mine_codes(cH, 168, [1, 4], 'C haftanın saati', 'haftanın saati')
gun = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
for r in CH: k = int(r['ad'].split('#')[1]); r['ad'] = f'{gun[k//24]} {k%24:02d}:00 UTC mumu kapanışı'
table(CH, 'C · haftanın saati (168 hücre)')
dom = pd.to_datetime(TT, unit='ms').day.values - 1
cM = np.where(INU & (hod == 23)[None, :], dom[None, :], -1); CM = mine_codes(cM, 31, [24], 'C ayın günü', 'ayın günü')
for r in CM: r['ad'] = f"ayın {int(r['ad'].split('#')[1])+1}. günü kapanışı"
table(CM, 'C · ayın günü')

# ---------- D) öncülük ----------
sd1 = pd.DataFrame(r1.T).shift(1).rolling(168, min_periods=84).std().values.T
z1 = r1/sd1
mk = np.where(INU, r1, np.nan); mkt = np.nanmean(mk, 0); mkt_sd = pd.Series(mkt).shift(1).rolling(168, min_periods=84).std().values
LEAD = {'BTC': syms.index('BTCUSDT') if 'BTCUSDT' in syms else None, 'ETH': syms.index('ETHUSDT') if 'ETHUSDT' in syms else None, 'SOL': syms.index('SOLUSDT') if 'SOLUSDT' in syms else None}
DR = []
def lead_rule(zL, rL, rule, H, name, followers=None):
    # zL, rL: (T,) öncü z ve getirisi
    if rule == 'D1':
        sig = np.where(np.abs(zL) > ZTH, np.sign(zL), 0)[None, :].repeat(S, 0)
    else:
        gap = (rL[None, :] - r1)/sd1; sig = np.where(np.abs(gap) > ZTH, np.sign(gap), 0)
    sig = np.where(INU & np.isfinite(sig), sig, 0)
    if followers is not None:
        m = np.zeros(S, bool); m[followers] = True; sig[~m] = 0
    a, i = np.nonzero(sig != 0); d = sig[a, i]
    mine, hold = period_mask(H)
    km = mine[i]; x = net(d[km], a[km], i[km], H); st = wstat(x, i[km]); tg = wstat(d[km]*FWD[H][a[km], i[km]], i[km])['t']
    hm = hold[i]; return judge(name, a[hm], i[hm], d[hm], H, dict(n=st['n'], m=st['m'], t=tg))
for nm, ix in list(LEAD.items()) + [('piyasa', 'mkt')]:
    if ix is None: continue
    if ix == 'mkt': zL, rL, fol = mkt/mkt_sd, mkt, None
    else: zL, rL, fol = z1[ix], r1[ix], [j for j in range(S) if j != ix]
    for rule in ['D1', 'D2']:
        for H in [1, 4]:
            DR.append(lead_rule(zL, rL, rule, H, f"{nm} → {'aynı yön' if rule == 'D1' else 'fark kapanır'}", fol))
table(DR, 'D · öncü coin kuralları (seçimsiz, 16 kural; kazı sütunu bilgi için)')
# ikili öncülük: kazı dönemi ortalama hacmi en yüksek 20 coin
mineCols = np.arange(T) < iSplit
vol = np.nanmean(np.where(INU[:, mineCols], (V*C)[:, mineCols], np.nan), 1); cov = INU[:, mineCols].mean(1)
top20 = [j for j in np.argsort(-np.nan_to_num(vol)) if cov[j] > 0.8][:20]
PAIR = []; ntest = 0
y1 = FWD[1]; mkf = np.nanmean(np.where(INU, y1, np.nan), 0); y1x = y1 - mkf[None, :]
for la in top20:
    for fo in top20:
        if la == fo: continue
        ntest += 1
        x = z1[la, :iSplit-2]; y = y1x[fo, :iSplit-2]; ok = np.isfinite(x) & np.isfinite(y)
        if ok.sum() < 2000: continue
        wk = week[:iSplit-2][ok]; prod = pd.Series((x[ok] - x[ok].mean())*(y[ok] - y[ok].mean())).groupby(wk).mean()
        t = prod.mean()/(prod.std(ddof=1)/math.sqrt(len(prod))); PAIR.append((abs(t), t, la, fo))
PAIR.sort(reverse=True); DP = []
for _, t, la, fo in PAIR[:10]:
    zL = z1[la] * (1 if t > 0 else -1)
    r = lead_rule(zL, r1[la], 'D1', 1, f"{syms[la][:-4]} → {syms[fo][:-4]} ({'aynı' if t > 0 else 'ters'})", [fo]); r['kazi']['t'] = t; DP.append(r)
SUM.append(dict(aile='D ikili öncülük', test=ntest, secilen=sum(p[0] >= TMIN for p in PAIR), sans=ntest*2*0.00135, gecen=sum(r['gecti'] for r in DP)))
table(DP, 'D · ikili öncülük, kazıda en güçlü 10 çift (1 sa; kazı t = IC t\'si)')

# ---------- rapor ----------
H0 = ['# Pattern taraması', '', f'Üretim: `python3 tests/pattern-tarama.py` ({time.strftime("%Y-%m-%d %H:%M")} UTC, {time.time()-t0:.0f} sn). Evren: her ay ilk {TOPN} coin, 1 sa mumlar, {S} coin.',
      f'Kazı (seçim) dönemi {FROM} → {SPLIT[:7]} (hariç), ayrılmış dönem {SPLIT[:7]} → {pd.Timestamp(int(TT[-1]), unit="ms").strftime("%Y-%m-%d")}. Parametreler veriye bakmadan sabitlendi (betiğin başı).',
      'İşlem: giriş sonraki mumun VWAP\'ı, çıkış ufuk sonundaki mumun VWAP\'ı, basit getiri, maliyet %0,16 gidiş-dönüş, arşiv fonlaması. "Geçti" = ayrılmış dönemde net ort. > 0, iki yarıda ve son 12 ayda > 0, aynı işlemlerin rastgele kaydırılmış hâllerinin (1000) ≥ %95\'inden iyi, ≥ 30 işlem.', '',
      '## Özet', '', '| aile | test sayısı | kazıda seçilen (t ≥ 3, net > 0) | şansla beklenen (|t| ≥ 3) | ayrılmış dönemde geçen |', '|---|---|---|---|---|']
for s_ in SUM: H0.append(f"| {s_['aile']} | {s_['test']} | {s_['secilen']} | {num(s_['sans'],1)} | {s_['gecen']} |")
H0.append('\nNot: "şansla beklenen" bağımsız testler için; aynı saatte çok coin ve üst üste binen tutuşlar haftalık t ile kısmen düzeltilir, gerçek yanlış pozitif sayısı daha yüksek olabilir. Asıl yargı ayrılmış dönem.\n')
H0.append('## A* · benzer geçmiş (en yakın komşu tahmini)\n')
H0.append('| şekil | ufuk | sorgu | havuz IC (Spearman) | plasebo %95 | plasebo p | saatlik coinler arası IC / t | aynı coin IC | aynı coin saatlik IC / t | havuz işlem n / net / yarılar / son 12 ay / rastgele %ile | aynı coin işlem n / net / rastgele %ile |')
H0.append('|---|---|---|---|---|---|---|---|---|---|---|')
for k in KN:
    j, jo = k['jr'], k['jro']
    H0.append(f"| {k['lab']} | {k['H']} sa | {k['nq']} | {num(k['po'],4)} | {num(k['perm95'],4)} | {num(k['pp'],1)} % | {num(k['ich'],4)} / {num(k['ict'])} | {num(k['poo'],4)} | {num(k['icho'],4)} / {num(k['icto'])} | {j['n']} / {pct(j['m'])} / {pct(j['h1'])}, {pct(j['h2'])} / {pct(j['l12'])} / {num(j['rp'],0)} | {jo['n']} / {pct(jo['m'])} / {num(jo['rp'],0)} |")
open(OUT, 'w').write('\n'.join(H0 + REP) + '\n')
json.dump(dict(ozet=SUM, knn=KN, gecenler=[r for r in REP_ALL if r['gecti']]), open(OUT.replace('.md', '.json'), 'w'),
          default=lambda o: float(o) if isinstance(o, (np.floating, np.integer)) else str(o), ensure_ascii=False, indent=1)
log('yazıldı', OUT)
