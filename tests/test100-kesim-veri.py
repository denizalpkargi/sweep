# Test #100 yardımcısı: 1 sa arşivden günlük mumu h UTC'de keserek (h = 0,4,6,8,12,16,18,20) research-daily-wide.js'in okuyacağı ağaç kurar.
# Mum [D+h, D+h+24 sa) etiket olarak D (00 UTC) alır: böylece canlı kod ve research-daily-wide.js değişmeden çalışır (fonlama UTC gününe göre, ≤ 20 sa kayma).
# Ayın ilk 50 coini (universe.json) için. En az 20 saatlik mum olmayan gün atlanır. Kullanım: python3 tests/test100-kesim-veri.py <çıktı kökü>
import os, sys, json, numpy as np, pandas as pd
H = os.path.dirname(os.path.abspath(__file__)); A = os.path.join(H, 'data', 'arch'); OUT = sys.argv[1]; HR = 3600000; DAY = 24 * HR
U = json.load(open(f'{A}/universe.json'))['months']; syms = sorted({s for v in U.values() for s in v[:50]})
CUTS = [0, 4, 6, 8, 12, 16, 18, 20]
for h in CUTS:
    d = f'{OUT}/k{h:02d}/data/arch'; os.makedirs(f'{d}/1d', exist_ok=True)
    for x in ('funding', 'universe.json'):
        if not os.path.exists(f'{d}/{x}'): os.symlink(f'{A}/{x}', f'{d}/{x}')
n = 0
for s in syms:
    p = f'{A}/1h/{s}.csv'
    if not os.path.exists(p): continue
    a = pd.read_csv(p, header=None, usecols=[0, 1, 2, 3, 4, 5, 7], names=['t', 'o', 'h', 'l', 'c', 'v', 'q']).drop_duplicates('t').sort_values('t')
    for h in CUTS:
        g = (a.t - h * HR) // DAY * DAY
        b = a.groupby(g).agg(o=('o', 'first'), h=('h', 'max'), l=('l', 'min'), c=('c', 'last'), v=('v', 'sum'), q=('q', 'sum'), n=('t', 'size'))
        b = b[b.n >= 20]; b['ct'] = b.index + DAY - 1
        b.reset_index()[['t', 'o', 'h', 'l', 'c', 'v', 'ct', 'q']].to_csv(f'{OUT}/k{h:02d}/data/arch/1d/{s}.csv', header=False, index=False)
    n += 1
print('coin', n, 'kesim', CUTS)
