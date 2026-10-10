# Denklem 4 (9 Ekim 2026; kullanıcı: "daha çok değişken, daha çok kombinasyon, daha derin neural network").
# denklem.f32'nin 202 sütununa (2023-06'dan itibaren satırlar) üç yeni aile ve iki yeni hedef ekler → tests/data/arch/denklem4.f32 + denklem4.json
#  (1) m_*: 1 dk mikro yapı (tests/data/arch/open1m/, fetch-open1m.js): çeyrek saat açılışının ilk 1/3 dakikasındaki taker dengesizliği (test #29, arXiv 2607.09426),
#      son 1/3 dakika, ilk dakikanın hacim/işlem payı ve işlem büyüklüğü, 1 dk gerçekleşen oynaklık ve sıçrama, saatlik/4 sa/24 sa birikimleri,
#      açılış dengesizliğinin son 24 saatte mumun kendi getirisini ne kadar tuttuğu (m_i1ret24).
#  (2) e_*: çoklu pencere ek değişkenler (15 dk mumlardan): 2 sa … 14 g getiri, 4 sa / 48 sa oynaklık, 8 sa / 48 sa taker payı ve farkı, 4/8/48 sa hacim oranı,
#      48 sa aralıkta yer, 24 sa tepe/dip uzaklığı, işlem sayısı/büyüklüğü, 8 sa aralık, gövde, yükselen mum payı, 24 sa içi en büyük düşüş/yükseliş.
#  (3) x_*: coinler arası sıra — seçilen 30 değişkenin aynı saatteki coinler arasında yüzdelik sırası (0–1).
#  + y12v, y24v: 12 sa / 24 sa VWAP → VWAP hedefi (y1v/y4v ile aynı tanım: giriş sonraki mumun VWAP'ı; ÷ sd15·√mum).
#  VWAP koruması: mumun VWAP'ı (q/v) [düşük, yüksek] dışındaysa kapanış kullanılır (arşivde bozuk q alanı: ör. 2023-09-19 16:00 ARB/NMR).
# Kullanım: python3 tests/denklem4-ozellik.py [--from 2023-06]
import json, os, sys, time, numpy as np, pandas as pd
D = os.path.join(os.path.dirname(__file__), 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
FROM = arg('from', '2023-06'); t0 = time.time()
meta = json.load(open(os.path.join(D, 'denklem.json'))); COLS = meta['cols']; SYMS = meta['syms']; T0 = meta['t0']; ix = {c: i for i, c in enumerate(COLS)}
X = np.fromfile(os.path.join(D, 'denklem.f32'), dtype=np.float32).reshape(-1, len(COLS))
t = X[:, ix['th']].astype(np.int64) * 3600000 + T0; tFrom = int(pd.Timestamp(FROM).value // 10**6)
keep = t >= tFrom; X = X[keep]; t = t[keep]; sym = X[:, ix['sym']].astype(int); sd15 = X[:, ix['sd15']].astype(np.float64)
print('satır', len(X), 'coin', len(np.unique(sym)), f'{time.time()-t0:.0f} sn', flush=True)
M_COLS = ['m_i1', 'm_i1h', 'm_i1o', 'm_i1_4h', 'm_i1_24h', 'm_i3', 'm_i3h', 'm_iL', 'm_iL3h', 'm_vs1h', 'm_vs1r', 'm_vs3h', 'm_r1m', 'm_r1mh', 'm_rvh', 'm_rv24', 'm_jmph', 'm_jmpSh', 'm_ns1h', 'm_sz1h', 'm_nUph', 'm_i1cum24', 'm_i1std24', 'm_i1ret24', 'm_i1hOpen4']
E_COLS = ['e_r2h', 'e_r8h', 'e_r12h', 'e_r48h', 'e_r3d', 'e_r14d', 'e_sq4', 'e_sq48', 'e_tk8', 'e_tk48', 'e_tkd', 'e_vq4', 'e_vq8', 'e_vq48', 'e_vtr', 'e_pos48', 'e_hi24d', 'e_lo24d', 'e_cnt4', 'e_size4', 'e_rng8', 'e_body4', 'e_up24', 'e_mdd24', 'e_mup24']
XS_SRC = ['r1', 'r4', 'r24', 'r7d', 'vq1', 'vq24', 'tk1', 'tk4', 'oi4', 'oi24', 'fr', 'frZ', 'prem', 'basis', 'sq', 'rsi', 'dPos', 'pdPos', 'bLead15', 'dImb1', 'topPosZ', 'globZ', 'm_i1h', 'm_i1', 'm_rvh', 'm_vs1h', 'm_jmph', 'e_r8h', 'e_r48h', 'e_tk8']
X_COLS = ['x_' + c for c in XS_SRC]; Y_COLS = ['y12v', 'y24v']
NEW = M_COLS + E_COLS + X_COLS + Y_COLS; nix = {c: i for i, c in enumerate(NEW)}
N = np.full((len(X), len(NEW)), np.nan, dtype=np.float32)
LB = 2880 + 8  # 30 gün taban + pay
def cs(a): o = np.zeros(len(a) + 1); np.cumsum(np.nan_to_num(a), out=o[1:]); return o
def S(C, i, w): return C[i + 1] - C[i - w + 1]  # [i-w+1, i] toplamı
def nanmean(x, i, w):
    Cx, Cc = cs(x), cs(np.isfinite(x).astype(float)); n = S(Cc, i, w)
    with np.errstate(invalid='ignore', divide='ignore'): return np.where(n > 0, S(Cx, i, w) / n, np.nan)
def win(a, i, w): return a[i[:, None] - np.arange(w - 1, -1, -1)[None, :]]
missing1m = 0
for si in np.unique(sym):
    rows = np.where(sym == si)[0]; name = SYMS[si]; f15 = os.path.join(D, '15m', name + '.csv')
    if not os.path.exists(f15): continue
    k = pd.read_csv(f15, header=None, usecols=[0, 1, 2, 3, 4, 5, 7, 8, 10], dtype=np.float64).values
    ot = k[:, 0]; ot = np.where(ot > 1e14, np.floor(ot / 1000), ot); lo = max(0, np.searchsorted(ot, tFrom - 32 * 864e5)); k = k[lo:]; ot = ot[lo:]
    o, h, l, c, v, q, n, tbq = (k[:, j] for j in range(1, 9)); L = len(ot)
    pos = np.searchsorted(ot, t[rows] - 900000); pos_c = np.minimum(pos, L - 1)
    ok = (pos < L) & (ot[pos_c] == t[rows] - 900000) & (pos >= LB)
    i = pos[ok]; r = rows[ok]; s = sd15[r]
    if len(i) == 0: continue
    lr = np.zeros(L); lr[1:] = np.log(c[1:] / c[:-1]); lr[~np.isfinite(lr)] = 0
    Clr, Cq, Cn, Ctb, Cr2, Cbody, Crng, Cup = cs(lr), cs(q), cs(n), cs(tbq), cs(lr * lr), cs(c - o), cs(h - l), cs((lr > 0).astype(float))
    ret = lambda w: np.log(c[i] / c[i - w]); put = lambda col, val: N.__setitem__((r, nix[col]), np.asarray(val, dtype=np.float64).astype(np.float32))
    # (2) çoklu pencere
    for col, w in [('e_r2h', 8), ('e_r8h', 32), ('e_r12h', 48), ('e_r48h', 192), ('e_r3d', 288), ('e_r14d', 1344)]: put(col, ret(w) / (s * np.sqrt(w)))
    put('e_sq4', np.sqrt(S(Cr2, i, 16) / 16) / s); put('e_sq48', np.sqrt(S(Cr2, i, 192) / 192) / s)
    with np.errstate(invalid='ignore', divide='ignore'):
        tk8 = S(Ctb, i, 32) / S(Cq, i, 32); tk48 = S(Ctb, i, 192) / S(Cq, i, 192); put('e_tk8', tk8); put('e_tk48', tk48); put('e_tkd', tk8 - tk48)
        q30 = S(Cq, i, 2880) / 2880; put('e_vq4', (S(Cq, i, 16) / 16) / q30); put('e_vq8', (S(Cq, i, 32) / 32) / q30); put('e_vq48', (S(Cq, i, 192) / 192) / q30); put('e_vtr', (S(Cq, i, 16) / 16) / (S(Cq, i, 96) / 96))
        n30 = S(Cn, i, 2880) / 2880; put('e_cnt4', (S(Cn, i, 16) / 16) / n30); put('e_size4', (S(Cq, i, 16) / S(Cn, i, 16)) / (q30 / n30))
        put('e_body4', S(Cbody, i, 16) / S(Crng, i, 16)); put('e_up24', S(Cup, i, 96) / 96)
    H48 = win(h, i, 192).max(1); L48 = win(l, i, 192).min(1); put('e_pos48', (c[i] - L48) / np.maximum(H48 - L48, 1e-12))
    H24 = win(h, i, 96).max(1); L24 = win(l, i, 96).min(1); put('e_hi24d', np.log(H24 / c[i]) / (s * np.sqrt(96))); put('e_lo24d', np.log(c[i] / L24) / (s * np.sqrt(96)))
    H8 = win(h, i, 32).max(1); L8 = win(l, i, 32).min(1); put('e_rng8', np.log(H8 / L8) / (s * np.sqrt(32)))
    W = win(c, i, 96); rm = np.maximum.accumulate(W, 1); rn = np.minimum.accumulate(W, 1); put('e_mdd24', (1 - W / rm).max(1) / (s * np.sqrt(96))); put('e_mup24', (W / rn - 1).max(1) / (s * np.sqrt(96)))
    # hedefler: VWAP koruması
    with np.errstate(invalid='ignore', divide='ignore'): vw = np.where((q > 0) & (v > 0), q / np.maximum(v, 1e-12), c)
    vw = np.where((vw >= l * 0.999) & (vw <= h * 1.001), vw, c)
    for col, w in [('y12v', 48), ('y24v', 96)]:
        okk = i + w + 1 < L; val = np.full(len(i), np.nan); val[okk] = np.log(vw[i[okk] + w + 1] / vw[i[okk] + 1]) / (s[okk] * np.sqrt(w)); put(col, val)
    # (1) 1 dk mikro yapı
    f1 = os.path.join(D, 'open1m', name + '.csv')
    if os.path.exists(f1) and os.path.getsize(f1) > 0:
        m = pd.read_csv(f1, header=None, dtype=np.float64).values; mt = m[:, 0]; p1 = np.searchsorted(ot, mt); p1c = np.minimum(p1, L - 1); good = (p1 < L) & (ot[p1c] == mt)
        A = {}; names = ['i1', 'i3', 'iL', 'iL3', 'vs1', 'vs3', 'r1m', 'r3m', 'rv', 'jmp', 'jmpSh', 'ns1', 'sz1', 'nUp', 'nmin']
        for j, nm in enumerate(names): a = np.full(L, np.nan); a[p1[good]] = m[good, j + 1]; A[nm] = a
        bad = ~(A['nmin'] >= 10)
        for nm in names: A[nm][bad] = np.nan
        put('m_i1', A['i1'][i]); put('m_i1h', nanmean(A['i1'], i, 4)); put('m_i1o', A['i1'][i - 3]); put('m_i1_4h', nanmean(A['i1'], i, 16)); put('m_i1_24h', nanmean(A['i1'], i, 96))
        put('m_i3', A['i3'][i]); put('m_i3h', nanmean(A['i3'], i, 4)); put('m_iL', A['iL'][i]); put('m_iL3h', nanmean(A['iL3'], i, 4))
        vs1h = nanmean(A['vs1'], i, 4); put('m_vs1h', vs1h); put('m_vs1r', vs1h / nanmean(A['vs1'], i, 96)); put('m_vs3h', nanmean(A['vs3'], i, 4))
        s1m = s / np.sqrt(15); put('m_r1m', A['r1m'][i] / s1m); put('m_r1mh', nanmean(A['r1m'], i, 4) / s1m)
        put('m_rvh', nanmean(A['rv'], i, 4) / (s * s)); put('m_rv24', nanmean(A['rv'], i, 96) / (s * s))
        put('m_jmph', np.nanmax(win(A['jmp'], i, 4), 1) / s); put('m_jmpSh', nanmean(A['jmpSh'], i, 4)); put('m_ns1h', nanmean(A['ns1'], i, 4)); put('m_sz1h', nanmean(A['sz1'], i, 4)); put('m_nUph', nanmean(A['nUp'], i, 4))
        Ci, Cc, Ci2 = cs(A['i1']), cs(np.isfinite(A['i1']).astype(float)), cs(A['i1'] ** 2); n96 = S(Cc, i, 96)
        with np.errstate(invalid='ignore', divide='ignore'):
            mean96 = S(Ci, i, 96) / n96; put('m_i1cum24', np.where(n96 > 0, S(Ci, i, 96) / np.sqrt(np.maximum(n96, 1)), np.nan)); put('m_i1std24', np.sqrt(np.maximum(S(Ci2, i, 96) / n96 - mean96 ** 2, 0)))
            put('m_i1ret24', nanmean(A['i1'] * lr / np.where(np.isfinite(A['i1']), 1, np.nan), i, 96) / s)
        put('m_i1hOpen4', np.nanmean(np.stack([A['i1'][i - 3], A['i1'][i - 7], A['i1'][i - 11], A['i1'][i - 15]], 1), 1))
    else: missing1m += 1
print('coin döngüsü bitti', f'{time.time()-t0:.0f} sn', '1 dk verisi olmayan coin', missing1m, flush=True)
# (3) coinler arası sıra
th = X[:, ix['th']].astype(np.int64)
for src in XS_SRC:
    col = X[:, ix[src]] if src in ix else N[:, nix[src]]
    N[:, nix['x_' + src]] = pd.Series(col.astype(np.float64)).groupby(th).rank(pct=True).values.astype(np.float32)
print('sıralar bitti', f'{time.time()-t0:.0f} sn', flush=True)
out = np.concatenate([X, N], axis=1).astype(np.float32); out.tofile(os.path.join(D, 'denklem4.f32'))
json.dump({'cols': COLS + NEW, 'syms': SYMS, 't0': T0, 'from': FROM, 'rows': int(len(out)), 'new': NEW}, open(os.path.join(D, 'denklem4.json'), 'w'))
cov = {c: float(np.isfinite(N[:, nix[c]]).mean()) for c in NEW}
print('yazıldı', out.shape, f'{time.time()-t0:.0f} sn'); print('kapsama (dolu pay):', {c: round(v, 3) for c, v in cov.items()})
