# Sepetlere model süzgeci (12 Ekim 2026; kullanıcı "ikisi" dedi): artı çıkan yavaş sepetlerin işlemleri, eğitilmiş üyelerin ve Ozan'ın coin sırasıyla
# daha iyi seçilebilir mi? Kaplumbağa (tt-trades-all.json, sepet-kaplumbaga-dump.js: canlı kod, pozisyon sınırı yok, bütün sinyaller) ve
# kalite short (_t52-trades.json: masa short 72 sa, "m_s" süzgeçsiz, "m_s_k30" kalite süzgeçli). Sıra: uye-evren100-oos.pkl (ilk 100 ile eğitilmiş,
# örneklem dışı 2024-06 →; coin ilk 30'daysa B30, 31–100'deyse B70 dilimi; 4 ve 12 sa ortalaması). Görüş q yönde: long = dilim, short = 1 − dilim.
# Eşleştirme: işlemin karar anına kadar bilinen son saatlik sıra (Kaplumbağa: giriş günü 00 UTC; short: t + 15 dk'nın saat başı).
# Ölçü: q'ya göre üçte birler, en kötü üçte bir atılınca kalan R, iki yarı ve son 12 ay.
# Kullanım: python tests/sepet-suzgec.py --t52 <_t52-trades.json> → tests/sepet-suzgec-report.md
import json, sys, os, time, numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch'); t0 = time.time()
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
T52 = arg('t52', os.path.join(D, '_t52-trades.json')); OUT = arg('out', os.path.join(HERE, 'sepet-suzgec-report.md'))
P = pd.read_pickle(os.path.join(D, 'uye-evren100-oos.pkl')); P = P[P.key.isin(['B30', 'B70'])]
P = P.groupby(['uye', 't', 'sym'], observed=True).pr.mean().reset_index()       # B30 ve B70 ayrık coinler; 4 ve 12 sa ortalaması
W = P.pivot_table(index=['t', 'sym'], columns='uye', values='pr', observed=True); del P
eight = [c for c in W.columns if c.split(' (')[0] in ('Emre', 'Baran', 'Serkan', 'Mert', 'Arda', 'Can', 'Kerem', 'Yusuf')]
oz = [c for c in W.columns if c.startswith('Ozan')][0]
W = pd.DataFrame({'8 üye': W[eight].mean(axis=1), 'Ozan': W[oz]}).reset_index()
tmin = W.t.min(); print('sıra satırı', len(W), f'{time.time()-t0:.0f} sn', flush=True)
fx = lambda v, d=3: ('—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ','))
def load_tt():
    T = pd.DataFrame(json.load(open(os.path.join(D, 'tt-trades-all.json'), encoding='utf-8'))); T['side'] = 1; T['k'] = T.t; return T
def load_ks(key):
    T = pd.DataFrame(json.load(open(T52, encoding='utf-8'))[key]); T['side'] = np.where(T.dir == 'long', 1, -1); T['k'] = ((T.t + 9e5)//3.6e6*3.6e6).astype(np.int64); return T
def block(name, T):
    T = T[T.k >= tmin].merge(W, left_on=['k', 'sym'], right_on=['t', 'sym'], how='left', suffixes=('', '_w'))
    out = [f'## {name}', '', f'Örneklem dışı dönemde {len(T):,} işlem, sırası bulunan {int(T["Ozan"].notna().sum()):,} (ilk 100 dışında kalanlar sırasız). Tüm işlemler ort. {fx(T.R.mean())}R.', '',
           '| Sinyal | Dönem | n | Tümü R | Kötü ⅓ R | Orta ⅓ R | İyi ⅓ R | Kötü ⅓ atılınca R | Fark |', '|---|---|---|---|---|---|---|---|---|']
    mid = T.k.median(); y12 = T.k.max() - 365*864e5
    for sig in ('Ozan', '8 üye'):
        d0 = T[T[sig].notna()].copy(); d0['q'] = np.where(d0.side > 0, d0[sig], 1 - d0[sig])
        for lbl, c in (('tümü', d0.k >= 0), ('1. yarı', d0.k < mid), ('2. yarı', d0.k >= mid), ('son 12 ay', d0.k >= y12)):
            d = d0[c]
            if len(d) < 30: continue
            g = pd.qcut(d.q.rank(method='first'), 3, labels=False); r = d.groupby(g).R.mean().values; keep = d[g > 0].R.mean()
            out.append(f'| {sig} | {lbl} | {len(d):,} | {fx(d.R.mean())} | {fx(r[0])} | {fx(r[1])} | {fx(r[2])} | {fx(keep)} | {fx(keep - d.R.mean())} |')
    return out + ['']
L = [f'# Sepetlere model süzgeci · {time.strftime("%Y-%m-%d")}', '',
     'Eğitilmiş üyelerin (8 üye ortalaması) ve Ozan\'ın coin sırası (ilk 100 ile eğitilmiş, örneklem dışı 2024-06 →), işlemin yönünde (long: dilim, short: 1 − dilim). '
     'Üçte birler işlemin kendi dönemindeki q sırasına göre. R her sepetin kendi simülasyonundan (maliyet ve fonlama dahil).', '']
L += block('Kaplumbağa (canlı kod, pozisyon sınırı yok, ilk 50)', load_tt())
L += block('Kalite short (masa short ∧ kalite en kötü %30 değil, 72 sa, stop 2 × sd)', load_ks('m_s_k30|72|sd2'))
L += block('Masa short, süzgeçsiz (72 sa, stop 2 × sd)', load_ks('m_s|72|sd2'))
open(OUT, 'w', encoding='utf-8').write('\n'.join(L)+'\n'); print('\n'.join(L)); print('yazıldı', OUT, f'{time.time()-t0:.0f} sn')
