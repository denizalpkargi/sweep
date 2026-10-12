# Eski kural masası ile eğitilmiş üyeli masa aynı dönemde (12 Ekim 2026): masa-archive.js --rule ve --oos örnekleri.
# Giriş = veto yok, puan ≥ 0,35, evet ≥ 3 (canlıdaki kural). Ölçüler: girilen kararların R'si (botun planı, maliyet dahil), sayısı,
# aynı sayıda rastgele veto dışı karar (rastgele ikiz, 200 kez), puan ↔ 4 sa hareket IC (gün içi Spearman), yön ayrı.
# Dönemler: tümü, iki yarı (zaman ortasından), son 12 ay.
# Kullanım: python tests/masa-oos-karar.py [--dir tests/data/arch] [--tags rule,oos] → tests/masa-oos-karar-report.md
import json, sys, os, glob, numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__))
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
D = arg('dir', os.path.join(HERE, 'data', 'arch')); TAGS = arg('tags', 'rule,oos').split(','); OUT = arg('out', os.path.join(HERE, 'masa-oos-karar-report.md'))
LBL = {'rule': 'Kural masası', 'oos': 'Eğitilmiş üyeli masa (örneklem dışı)'}
def load(tag):
    rows = []
    for f in sorted(glob.glob(os.path.join(D, f'samples-{tag}-*.jsonl'))):
        with open(f, encoding='utf-8') as fh:
            for l in fh:
                x = json.loads(l); rows.append((x['sym'], x['t'], x['dir'] == 'long', x['veto'], x['score'], x['yes'], x['R'], x['f4'], len(x.get('uye') or {})))
    return pd.DataFrame(rows, columns=['sym', 't', 'long', 'veto', 'score', 'yes', 'R', 'f4', 'nm'])
S = {t: load(t) for t in TAGS}
t0 = min(d.t.min() for d in S.values()); t1 = max(d.t.max() for d in S.values()); mid = (t0 + t1) / 2; y12 = t1 - 365 * 864e5
PER = [('tümü', lambda d: d), ('1. yarı', lambda d: d[d.t < mid]), ('2. yarı', lambda d: d[d.t >= mid]), ('son 12 ay', lambda d: d[d.t >= y12])]
fx = lambda v, k=3: '—' if v is None or not np.isfinite(v) else f'{v:+.{k}f}'.replace('.', ',')
rng = np.random.default_rng(1)
def ic(d):
    d = d[d.veto == 0].dropna(subset=['score', 'f4']); g = d.groupby(d.t // 864e5)
    r = g.apply(lambda z: z.score.rank().corr(z.f4.rank()) if len(z) >= 10 else np.nan).dropna(); return r.mean() if len(r) else np.nan
def twin(d, n):
    R = d[d.veto == 0].R.values
    return np.mean([R[rng.choice(len(R), n, replace=False)].mean() for _ in range(200)]) if len(R) >= n > 0 else np.nan
L = [f'# Kural masası ↔ eğitilmiş üyeli masa · {pd.Timestamp.now():%Y-%m-%d}', '',
     f'masa-archive.js aynı dönem ({pd.to_datetime(t0, unit="ms"):%Y-%m-%d} → {pd.to_datetime(t1, unit="ms"):%Y-%m-%d}), ayın ilk 30 coini, 4 saatte bir iki yön. '
     '"oos": üyeler ileriye yürüyen eğitimin örneklem dışı dilimleriyle oy verir (canlıdaki model arşivin tamamıyla eğitildiği için kullanılmaz). '
     'Giriş = veto yok, puan ≥ 0,35, evet ≥ 3. R = botun planı (market giriş, stop ×2, 1,5R\'de yarısı, 8 sa), maliyet dahil. İkiz = aynı sayıda rastgele veto dışı karar.', '',
     '| Masa | Dönem | Toplantı | Giriş | Giriş R | İkiz R | Fark | Long R (n) | Short R (n) | Puan IC (4 sa) |', '|---|---|---|---|---|---|---|---|---|---|']
for tag, d0 in S.items():
    for nm, f in PER:
        d = f(d0); E = d[(d.veto == 0) & (d.score >= 0.35) & (d.yes >= 3)]; tw = twin(d, len(E))
        el, es = E[E.long], E[~E.long]
        L.append(f'| {LBL.get(tag, tag)} | {nm} | {len(d):,} | {len(E):,} | {fx(E.R.mean())} | {fx(tw)} | {fx(E.R.mean() - tw)} | {fx(el.R.mean())} ({len(el):,}) | {fx(es.R.mean())} ({len(es):,}) | {fx(ic(d))} |')
if 'oos' in S:
    d = S['oos']; L += ['', f'Modelle oy veren üye sayısı (oos): ortalama {d.nm.mean():.1f}, hiç model oyu olmayan toplantı %{100 * (d.nm == 0).mean():.0f}.']
open(OUT, 'w', encoding='utf-8').write('\n'.join(L) + '\n'); print('\n'.join(L))
