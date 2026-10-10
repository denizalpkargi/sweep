"""Test #46 hazırlık (10 Ekim 2026): Ozan'ın örneklem dışı tahminlerini (rank-oos-tam-4/12.pkl, 2024-06'dan) saat içi yüzdelik sıraya çevirip
tests/data/arch/_t46-ozan.csv'ye yazar: t (ms, tahmin anı), sym, q4, q12 (0 = en kötü, 1 = en iyi; saat içi sıra ÷ (n − 1)).
Kullanım: python3 tests/test46-ozan-dok.py"""
import os, json, pandas as pd
A = os.path.join(os.path.dirname(__file__), 'data', 'arch'); syms = json.load(open(f'{A}/rank.json'))['syms']
out = None
for h in [4, 12]:
    d = pd.read_pickle(f'{A}/rank-oos-tam-{h}.pkl')[['t', 'si', 'p']].copy()
    d['q'] = d.groupby('t').p.rank(method='average'); n = d.groupby('t').p.transform('count'); d[f'q{h}'] = (d.q - 1) / (n - 1).clip(lower=1)
    d = d[['t', 'si', f'q{h}']]; out = d if out is None else out.merge(d, on=['t', 'si'], how='outer')
out['sym'] = [syms[int(i)] for i in out.si]
out[['t', 'sym', 'q4', 'q12']].sort_values(['sym', 't']).to_csv(f'{A}/_t46-ozan.csv', index=False, float_format='%.4f')
print(len(out), out.t.min(), out.t.max(), out.groupby('t').size().describe().to_dict())
