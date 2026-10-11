# Eğitilmiş üyeler masanın giriş kararlarını iyileştiriyor mu? (12 Ekim 2026; kullanıcı "modeller işlem girişlerini geliştirebiliyor mu görelim", "daha umutlu yolları yapalım" dedi)
# Girdi: tests/uye-evren100.py'nin örneklem dışı tahminleri (data/arch/uye-evren100-oos.pkl: t, sym, pr = saat içi dilim, uye, h, key)
#        + masa-archive.js örnekleri (samples-*.jsonl: sym, t = 15 dk mumun açılışı, dir, veto, score, yes, R = botun planıyla R, f4 = 4 sa hareket ÷ ATR, yönde).
# Eşleştirme: karar anı t + 15 dk; o ana kadar bilinen son saatlik tahmin (en çok 59 dk eski, canlıdaki gibi). Yön: long için dilim, short için 1 − dilim.
# Üye görüşü = 4 sa ve 12 sa dilimlerinin ortalaması (canlıdaki uyeVote ile aynı). "6 üye" = altısının ortalaması.
# Ölçüler (yalnız örneklem dışı dönem, 2024-06 →): masanın girdiği kararlarda (veto yok, puan ≥ 0,35, evet ≥ 3) R; model hemfikir (≥ 0,5) / karşı;
# beşte birler; en kötü %30 atılınca kalan R; iki yarı ve son 12 ay; tüm veto dışı kararlarda f4 ile Spearman IC.
# Kullanım: python tests/uye-karar.py --samples <samples-*.jsonl klasörü> [--keys B30,A30] → tests/uye-karar-report.md
import json, sys, os, glob, time, numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch'); t0 = time.time()
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
SD = arg('samples', D); KEYS = arg('keys', 'B30,A30').split(','); OUT = arg('out', os.path.join(HERE, 'uye-karar-report.md'))
P = pd.read_pickle(os.path.join(D, 'uye-evren100-oos.pkl'))
P = P[P.key.isin(KEYS)]; P = P.groupby(['key', 'uye', 't', 'sym']).pr.mean().reset_index()   # 4 sa ve 12 sa ortalaması
rows = []
for f in sorted(glob.glob(os.path.join(SD, 'samples-*.jsonl'))):
    with open(f, encoding='utf-8') as fh:
        for line in fh:
            x = json.loads(line); rows.append((x['sym'], x['t'], x['dir'] == 'long', x['veto'], x['score'], x['yes'], x['R'], x['f4']))
S = pd.DataFrame(rows, columns=['sym', 't0', 'long', 'veto', 'score', 'yes', 'R', 'f4']); del rows
S['t'] = ((S.t0 + 9e5)//3.6e6*3.6e6).astype(np.int64); S = S[(S.veto == 0) & (S.t >= P.t.min())].copy()
S['enter'] = (S.score >= 0.35) & (S.yes >= 3)
print('örnek', len(S), 'giriş', int(S.enter.sum()), f'{time.time()-t0:.0f} sn', flush=True)
fx = lambda v, d=3: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
def ic(d):  # gün içi Spearman (q ↔ f4), günlerin ortalaması
    d = d.dropna(subset=['q', 'f4']); d = d.assign(day=d.t//864e5); g = d.groupby('day')
    r = g.apply(lambda z: z.q.rank().corr(z.f4.rank()) if len(z) >= 10 else np.nan).dropna(); return r.mean() if len(r) else np.nan
def block(E):  # girilen kararlarda q'ya göre R
    E = E.dropna(subset=['q']); n = len(E)
    if n < 100: return None
    agree = E[E.q >= 0.5].R.mean(); dis = E[E.q < 0.5].R.mean(); cut = E.q.quantile(0.3); keep = E[E.q > cut].R.mean()
    qs = pd.qcut(E.q.rank(method='first'), 5, labels=False); qr = E.groupby(qs).R.mean().values
    return n, E.R.mean(), agree, dis, keep, keep - E.R.mean(), qr
L = [f'# Eğitilmiş üyeler masanın giriş kararlarında · {time.strftime("%Y-%m-%d")}', '',
     f'Masa arşivi örnekleri (masa-archive.js, 4 saatte bir iki yön, botun planıyla R) ↔ üye modellerinin örneklem dışı tahminleri (tests/uye-evren100.py, 2024-06 →). '
     f'Veto dışı {len(S):,} karar, masanın girdiği (puan ≥ 0,35, evet ≥ 3) {int(S.enter.sum()):,}. Görüş q = 4 ve 12 sa diliminin ortalaması, yönde (short: 1 − dilim).', '',
     'A30 = bugünkü gibi ilk 30 ile eğitilmiş model, B30 = ilk 100 ile eğitilmiş model (ikisi de ilk 30 coinde). "Kalan R" = q\'su en kötü %30 atılınca; fark kalan − tümü.', '']
for key in KEYS:
    Q = P[P.key == key].pivot_table(index=['t', 'sym'], columns='uye', values='pr')
    six = [c for c in Q.columns if c.split(' (')[0] in ('Emre', 'Baran', 'Serkan', 'Mert', 'Arda', 'Can')]
    Q['6 üye (ortalama)'] = Q[six].mean(axis=1)
    M = S.merge(Q.reset_index(), on=['t', 'sym'], how='left')
    tmin, tmax = M.t.min(), M.t.max(); mid = M[M.enter].t.median(); y12 = tmax - 365*864e5
    L += [f'## {key}', '', '| Üye | Dönem | Giriş n | R tümü | Hemfikir R | Karşı R | Kalan R (en kötü %30 atıldı) | Fark | Beşte birler (kötü → iyi) | IC (q ↔ f4, veto dışı) |', '|---|---|---|---|---|---|---|---|---|---|']
    for u in [c for c in Q.columns]:
        for lbl, cond in (('tümü', M.t >= tmin), ('1. yarı', M.t < mid), ('2. yarı', M.t >= mid), ('son 12 ay', M.t >= y12)):
            d = M[cond].copy(); d['q'] = np.where(d.long, d[u], 1 - d[u]); b = block(d[d.enter])
            if b is None: continue
            n, r, a, ds, k, df_, qr = b
            L.append(f'| {u} | {lbl} | {n:,} | {fx(r)} | {fx(a)} | {fx(ds)} | {fx(k)} | {fx(df_)} | ' + ' / '.join(fx(v, 2) for v in qr) + f' | {fx(ic(d))} |')
        print(key, u, f'{time.time()-t0:.0f} sn', flush=True)
    L.append('')
open(OUT, 'w', encoding='utf-8').write('\n'.join(L)+'\n'); print('\n'.join(L)); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
