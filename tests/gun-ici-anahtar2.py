# Gün içi kâr anahtarı · 2. aşama (12 Ekim 2026; kullanıcı 1. aşamadan sonra "devam" dedi)
# 1. aşamada tek artı yapı: Ozan'ın sırası, ilk 30, 12 sa, en kötü onluk short (+ en iyi onluk long ile çift), limit emirle (dolum varsayılarak).
# Burada dolum dürüst: 15 dk mumlarla, limit fiyatı en az %0,05 geçilmeden dolmuş sayılmaz; dolmayan sinyallerin getirisi de yazılır (ters seçilim).
# Sinyal: Ozan'ın örneklem dışı dilimi (uye-evren100-oos.pkl, B30 = ilk 100 ile eğitilmiş, sıra ilk 30 içinde; 4 ve 12 sa ortalaması), 00 ve 12 UTC'de.
# T = sinyal anı (rank satırının zamanı = son kapanmış 15 dk mumun kapanışı). ref = o mumun kapanışı.
# Giriş: taker = T'de açılan mumun VWAP'ı + %0,03 kayma + %0,05; limit = ref × (1 ± x), W mum geçerli, maker %0,02.
# Çıkış: T + 12 sa'te açılan mumun VWAP'ı, taker (%0,05 + %0,03 kayma); stop: giriş × (1 ± s), mumun ucu stopu geçince stop fiyatından (+ kayma), taker.
# Fonlama: o anki fr (baz puan) × 12/8 sa, short alır, long öder; süzgeç: short için fr < −F baz puan ise girme.
# Kullanım: python tests/gun-ici-anahtar2.py → tests/gun-ici-anahtar2-report.md
import json, sys, os, glob, time, numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch'); t0 = time.time()
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
OUT = arg('out', os.path.join(HERE, 'gun-ici-anahtar2-report.md')); Q = float(arg('q', 0.1)); H = 12; M15 = 900000
meta = json.load(open(os.path.join(D, 'rank.json'), encoding='utf-8')); COLS = meta['cols']; SYMS = meta['syms']
need = ['th', 'si', 'fr']; ix = [COLS.index(c) for c in need]
R = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(COLS))[:, ix] for f in sorted(glob.glob(os.path.join(D, 'rank-*.f32')))])
R = pd.DataFrame(R, columns=need); R['t'] = R.th.round().astype(np.int64)*3600000 + meta['t0']; R['sym'] = [SYMS[int(round(s))] for s in R.si.values]
R = R[(R.t // 3600000) % H == 0][['t', 'sym', 'fr']]
P = pd.read_pickle(os.path.join(D, 'uye-evren100-oos.pkl')); P = P[(P.key == 'B30') & (P.uye == 'Ozan (hepsi)')]
P = P[(P.t // 3600000) % H == 0].groupby(['t', 'sym'], observed=True).pr.mean().reset_index()
S = P.merge(R, on=['t', 'sym'], how='inner'); del P, R
S['rk'] = S.groupby('t').pr.rank(pct=True); S['n'] = S.groupby('t').pr.transform('size'); S = S[S.n >= 10]
S['side'] = np.where(S.rk > 1 - Q, 1, np.where(S.rk <= Q, -1, 0)); S = S[S.side != 0].reset_index(drop=True)
print('sinyal', len(S), 'dönem', S.t.nunique(), f'{time.time()-t0:.0f} sn', flush=True)
# 15 dk mumlar: t, o, h, l, c, vwap (q/v, [l, h] dışındaysa c)
bars = {}
for s in S.sym.unique():
    f = os.path.join(D, '15m', s + '.csv')
    if not os.path.exists(f): continue
    a = pd.read_csv(f, header=None, usecols=[0, 1, 2, 3, 4, 5, 7]).values
    t, o, h, l, c, v, q = a.T; vw = np.where((v > 0) & (q > 0), q/np.maximum(v, 1e-12), c); vw = np.where((vw >= l*0.999) & (vw <= h*1.001), vw, c)
    bars[s] = (t.astype(np.int64), o, h, l, c, vw)
print('mum dosyası', len(bars), f'{time.time()-t0:.0f} sn', flush=True)
TK, SL, MK = 0.0005, 0.0003, 0.0002
def trade(s, T, side, fr, entry, x, W, stop):
    if s not in bars: return None
    t, o, h, l, c, vw = bars[s]; i = np.searchsorted(t, T)            # i = T'de açılan mum
    if i < 1 or i + H*4 >= len(t) or t[i] != T or t[i + H*4] != T + H*3600000: return None
    ref = c[i-1]; j = i + H*4                                          # j = çıkış mumu
    if entry == 'taker': px = vw[i]*(1 + side*SL); fee_in = TK; k0 = i
    else:
        lim = ref*(1 - side*x); fill = None
        for k in range(i, min(i + W, j)):
            if (side > 0 and l[k] <= lim*(1 - 0.0005)) or (side < 0 and h[k] >= lim*(1 + 0.0005)): fill = k; break
        if fill is None: return {'filled': 0, 'miss': side*(vw[j]/vw[i] - 1)}
        px = lim; fee_in = MK; k0 = fill
    exit_px = vw[j]*(1 - side*SL); why = 'zaman'
    if stop:
        sp = px*(1 - side*stop)
        for k in range(k0, j):
            if (side > 0 and l[k] <= sp) or (side < 0 and h[k] >= sp):
                exit_px = (min(o[k], sp) if side > 0 else max(o[k], sp))*(1 - side*SL) if k > k0 else sp*(1 - side*SL); why = 'stop'; break
    r = side*(exit_px/px - 1) - fee_in - TK - side*(fr/1e4)*H/8 if np.isfinite(fr) else side*(exit_px/px - 1) - fee_in - TK
    return {'filled': 1, 'r': r, 'why': why}
VARS = [('taker', 0, 0, 0), ('taker', 0, 0, 0.05)]
for x in (0.0, 0.001, 0.0025):
    for W in (4,):
        for st in (0, 0.05, 0.08): VARS.append(('limit', x, W, st))
FF = [None, 1.0]   # short fonlama süzgeci (baz puan): fr < −1 → short açma
fx = lambda v, d=3: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
def pstats(per):  # dönem serisi → ort %, t, yarılar, son 12 ay, yıllık, düşüş
    per = per.dropna(); n = len(per)
    if n < 30: return None
    m = per.mean(); tt = m/(per.std()/np.sqrt(n)); mid = np.sort(per.index.values)[n//2]; y12 = per.index.max() - 365*864e5
    eq = np.cumprod(1 + per.values); dd = (eq/np.maximum.accumulate(eq) - 1).min(); yrs = n/(365*24/H)
    return m*100, tt, per[per.index < mid].mean()*100, per[per.index >= mid].mean()*100, per[per.index >= y12].mean()*100, ((eq[-1]**(1/yrs) - 1)*100 if eq[-1] > 0 else -100), dd*100
L = [f'# Gün içi kâr anahtarı · 2. aşama · {time.strftime("%Y-%m-%d")}', '',
     f'Ozan (ilk 100 ile eğitilmiş, örneklem dışı 2024-06 →), ilk 30 coin, her 12 sa (00 ve 12 UTC): en kötü %{Q*100:.0f} short, en iyi %{Q*100:.0f} long, 12 sa tut. '
     'Dürüst dolum: 15 dk mumda fiyat limiti en az %0,05 geçmeli. Giriş taker = sonraki mumun VWAP\'ı + kayma; limit = sinyal kapanışından x uzağa, 4 mum (1 sa) geçerli, maker %0,02. '
     'Çıkış 12 sa sonraki mumun VWAP\'ı ya da stop, taker + kayma. Fonlama dahil. Dönem getirisi = o dönemde dolan bacakların ortalaması (çiftte long ve short yarı yarıya); kaldıraçsız.', '',
     '| Bacak | Giriş | Limit x | Stop | Fonlama süzgeci | Dolum | İşlem başı % | Dolmayanların 12 sa hareketi % | Dönem başı % | t | 1. yarı % | 2. yarı % | Son 12 ay % | Yıllık % | En büyük düşüş % |',
     '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
for ent, x, W, st in VARS:
    for ff in FF:
        rows = []
        for r in S.itertuples(index=False):
            if ff is not None and r.side < 0 and np.isfinite(r.fr) and r.fr < -ff: continue
            o = trade(r.sym, r.t, r.side, r.fr, ent, x, W, st)
            if o is not None: rows.append({'t': r.t, 'side': r.side, **o})
        T = pd.DataFrame(rows)
        for leg, cond in (('short', T.side < 0), ('long', T.side > 0), ('çift', T.side != 0)):
            d = T[cond]; f = d[d.filled == 1]; miss = d[d.filled == 0]
            if leg == 'çift':
                g = f.groupby(['t', 'side']).r.mean().unstack(); per = (0.5*g.get(1, 0) + 0.5*g.get(-1, 0)) if (1 in g and -1 in g) else pd.Series(dtype=float)
                per = per.dropna()
            else: per = f.groupby('t').r.mean()
            s = pstats(per)
            if s is None: continue
            L.append(f'| {leg} | {ent} | {x*100:.2f}% | {"—" if not st else f"{st*100:.0f}%"} | {"—" if ff is None else f"fr < −{ff:g} bp yok"} | %{len(f)/max(1,len(d))*100:.0f} | {fx(f.r.mean()*100)} | {fx(miss.miss.mean()*100) if len(miss) else "—"} | '
                     f'{fx(s[0])} | {fx(s[1],1)} | {fx(s[2])} | {fx(s[3])} | {fx(s[4])} | {fx(s[5],0)} | {fx(s[6],0)} |')
        print(ent, x, st, ff, f'{time.time()-t0:.0f} sn', flush=True)
open(OUT, 'w', encoding='utf-8').write('\n'.join(L)+'\n'); print('\n'.join(L)); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
