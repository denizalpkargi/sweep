# Gün içi kâr anahtarı · 1. aşama (12 Ekim 2026; kullanıcı "kâr anahtarını bulmamız lazım", "günlük işlemleri kâra geçirmenin sırrı" dedi)
# Soru: eğitilmiş üyelerin (ve Ozan'ın) coin sırası, eğitildiği soruya göre kullanılınca para eder mi?
#   (a) tek bacak: yalnız en iyi onluğa long / yalnız en kötü onluğa short (piyasa yönü riski var)
#   (b) çift: aynı anda en iyi onluk long + en kötü onluk short, eşit boy (piyasadan bağımsız; modelin bildiği şey)
# Veri: tests/uye-evren100.py örneklem dışı dilimleri (uye-evren100-oos.pkl, 2024-06 →; B = ilk 100 ile eğitilmiş, sıra ilk 30 ve 31–100 içinde ayrı)
#       + rank-*.f32 getirileri: p4 / p12 = sonraki 15 dk mumun VWAP'ı → 4 / 12 sa sonraki mumun VWAP'ı (log); fr = o anki fonlama.
# Getiri basit (exp − 1), fonlama h/8 × fr (long öder, short alır), maliyet bacak başına gidiş-dönüş: taker %0,16 (2 × %0,05 + 2 × %0,03 kayma), maker %0,04.
# Her h saatte bir yeniden kurulur (örtüşmesiz), saat başı h'ye bölünen saatlerde. Sinyaller: "8 üye" = Emre, Baran, Serkan, Mert, Arda, Can, Kerem, Yusuf
# dilimlerinin ortalaması (4 ve 12 sa ortalaması, canlıdaki uyeVote gibi); "Ozan"; "8 üye + Ozan".
# Akıllı limit emir (c) bu aşamada yok: maker satırı yalnız maliyetin üst sınırını gösterir, dolum varsayılır (iyimser).
# Kullanım: python tests/gun-ici-anahtar.py [--q 0.1] → tests/gun-ici-anahtar-report.md
import json, sys, os, glob, time, numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch'); t0 = time.time()
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
Q = float(arg('q', 0.1)); OUT = arg('out', os.path.join(HERE, 'gun-ici-anahtar-report.md'))
meta = json.load(open(os.path.join(D, 'rank.json'), encoding='utf-8')); COLS = meta['cols']; SYMS = meta['syms']
need = ['th', 'si', 'fr', 'p4', 'p12']; ix = [COLS.index(c) for c in need]
R = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(COLS))[:, ix] for f in sorted(glob.glob(os.path.join(D, 'rank-*.f32')))])
R = pd.DataFrame(R, columns=need); R['t'] = (R.th.round().astype(np.int64)*3600000 + meta['t0']); R['sym'] = [SYMS[int(round(s))] for s in R.si.values]
R = R[['t', 'sym', 'fr', 'p4', 'p12']]
P = pd.read_pickle(os.path.join(D, 'uye-evren100-oos.pkl')); P = P[P.key.isin(['B30', 'B70'])]
P = P.groupby(['key', 'uye', 't', 'sym'], observed=True).pr.mean().reset_index()       # 4 ve 12 sa ortalaması
W = P.pivot_table(index=['key', 't', 'sym'], columns='uye', values='pr', observed=True); del P
eight = [c for c in W.columns if c.split(' (')[0] in ('Emre', 'Baran', 'Serkan', 'Mert', 'Arda', 'Can', 'Kerem', 'Yusuf')]
oz = [c for c in W.columns if c.startswith('Ozan')][0]
W['8 üye'] = W[eight].mean(axis=1); W['8 üye + Ozan'] = W[eight + [oz]].mean(axis=1); W['Ozan'] = W[oz]
W = W[['8 üye', 'Ozan', '8 üye + Ozan']].reset_index().merge(R, on=['t', 'sym'], how='inner'); del R
print('satır', len(W), f'{time.time()-t0:.0f} sn', flush=True)
fx = lambda v, d=3: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
COST = {'taker': 0.0016, 'maker': 0.0004}
def periods(d, sig, h):
    d = d[(d.t // 3600000) % h == 0].copy(); yc = 'p%d' % h; d = d[np.isfinite(d[yc]) & np.isfinite(d[sig])]
    d['r'] = np.expm1(d[yc]); d['fund'] = d.fr.fillna(0)/1e4*h/8   # fr baz puan (rkFeat: S.fr × 1e4)
    d['rk'] = d.groupby('t')[sig].rank(pct=True); d['n'] = d.groupby('t')[sig].transform('size'); d = d[d.n >= 10]
    L = d[d.rk > 1 - Q].groupby('t').agg(rl=('r', 'mean'), fl=('fund', 'mean')); S = d[d.rk <= Q].groupby('t').agg(rs=('r', 'mean'), fs=('fund', 'mean'))
    A = d.groupby('t').r.mean().rename('mkt'); return L.join(S, how='inner').join(A)
def stats(x, per_year):
    x = x.dropna(); n = len(x)
    if n < 20: return None
    m = x.mean(); t = m/(x.std()/np.sqrt(n)); eq = np.cumprod(1+x.values); dd = (eq/np.maximum.accumulate(eq)-1).min(); yrs = n/per_year
    return m*100, t, (eq[-1]**(1/yrs)-1)*100 if eq[-1] > 0 else -100.0, dd*100
L = [f'# Gün içi kâr anahtarı · 1. aşama · {time.strftime("%Y-%m-%d")}', '',
     f'Eğitilmiş üyelerin (ilk 100 ile eğitilmiş, örneklem dışı 2024-06 →) coin sırasıyla her h saatte bir en iyi %{Q*100:.0f} long, en kötü %{Q*100:.0f} short. '
     'Getiri basit, VWAP → VWAP, fonlama dahil. Maliyet bacak başına gidiş-dönüş: taker %0,16, maker %0,04 (dolum varsayılır, iyimser). '
     'Çift = sermayenin yarısı long, yarısı short (dönem başına brüt sermayeye göre). Yıllık ve düşüş dönem getirilerinin bileşiğinden, kaldıraçsız.', '',
     '| Sinyal | Evren | Ufuk | Strateji | Maliyet | Dönem başı % | t | 1. yarı % | 2. yarı % | Son 12 ay % | Yıllık % | En büyük düşüş % | Dönem |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|']
for sig in ['8 üye', 'Ozan', '8 üye + Ozan']:
    for key, uni in (('B30', 'ilk 30'), ('B70', '31–100')):
        dk = W[W.key == key]
        for h in (4, 12):
            pp = periods(dk, sig, h); per_year = 365*24/h; mid = np.sort(pp.index.values)[len(pp)//2]; y12 = pp.index.max() - 365*864e5
            for strat in ('long', 'short', 'çift'):
                for cn, c in COST.items():
                    if strat == 'long': x = pp.rl - pp.fl - c
                    elif strat == 'short': x = -pp.rs + pp.fs - c
                    else: x = 0.5*(pp.rl - pp.fl) + 0.5*(-pp.rs + pp.fs) - c
                    s = stats(x, per_year); s1 = stats(x[x.index < mid], per_year); s2 = stats(x[x.index >= mid], per_year); s3 = stats(x[x.index >= y12], per_year)
                    if s is None: continue
                    L.append(f'| {sig} | {uni} | {h} sa | {strat} | {cn} | {fx(s[0])} | {fx(s[1],1)} | {fx(s1[0]) if s1 else "—"} | {fx(s2[0]) if s2 else "—"} | {fx(s3[0]) if s3 else "—"} | {fx(s[2],0)} | {fx(s[3],0)} | {len(x.dropna())} |')
            # piyasa (evrenin eşit ağırlıklı ortalaması) ve bacakların maliyetsiz brüt farkı: bilgi nereden geliyor
            L.append(f'| {sig} | {uni} | {h} sa | brüt: long {fx(pp.rl.mean()*100)} · short bacak {fx(-pp.rs.mean()*100)} · piyasa {fx(pp.mkt.mean()*100)} | — | | | | | | | | |')
        print(sig, uni, f'{time.time()-t0:.0f} sn', flush=True)
open(OUT, 'w', encoding='utf-8').write('\n'.join(L)+'\n'); print('\n'.join(L)); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
