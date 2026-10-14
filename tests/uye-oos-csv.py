# Üye modellerinin örneklem dışı dilimlerini masa-archive.js --oos için düz CSV'ye çevirir (12 Ekim 2026).
# Girdi: tests/uye-evren100.py'nin data/arch/uye-evren100-oos.pkl'si (t, sym, pr = saat içi dilim, uye, h, key).
# Canlıdaki gibi: sekiz aile ilk 100 ile eğitilmiş model (B30: ilk 30 coinde dilim), Ozan ilk 30 modeli (A30).
# Çıktı: t,sym,id,p4,p12 (t = tahminin saati, ms; id = committee'deki üye id'si)
# Kullanım: python tests/uye-oos-csv.py [--pkl yol] [--fam B30] [--rank A30] → tests/data/arch/uye-oos.csv
import os, sys, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'data', 'arch')
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
P = pd.read_pickle(arg('pkl', os.path.join(D, 'uye-evren100-oos.pkl'))); FAM = arg('fam', 'B30'); RANK = arg('rank', 'A30')
IDS = {'Emre': 'trend', 'Baran': 'mom', 'Serkan': 'vol', 'Mert': 'flow', 'Arda': 'macro', 'Can': 'risk', 'Kerem': 'liq', 'Yusuf': 'check', 'Ozan': 'rank'}
# az bellek (5,5 M satır, pivot_table 21 GB'a çıkıyordu): ad eşlemesi kategoriler üzerinde, iki ufuk ayrı süzülüp birleştirilir
for c in ('uye', 'key', 'h', 'sym'): P[c] = P[c].astype('category')
P = P[P.key.isin([FAM, RANK])]
umap = {u: IDS.get(str(u).split(' (', 1)[0]) for u in P.uye.cat.categories}
P['id'] = P.uye.map(umap).astype('category'); P = P[P.id.notna()]
P = P[((P.id != 'rank') & (P.key == FAM)) | ((P.id == 'rank') & (P.key == RANK))]
hz = {h: {'4': 'p4', '12': 'p12'}.get(''.join(ch for ch in str(h) if ch.isdigit())) for h in P.h.cat.categories}
P['hz'] = P.h.map(hz); P = P[['t', 'sym', 'id', 'hz', 'pr']]
K = ['t', 'sym', 'id']; f = lambda z: P[P.hz == z].drop(columns='hz').groupby(K, observed=True).pr.mean().rename(z)
W = pd.concat([f('p4'), f('p12')], axis=1).reset_index(); del P
W['t'] = W.t.astype('int64'); out = arg('out', os.path.join(D, 'uye-oos.csv'))
W[['t', 'sym', 'id', 'p4', 'p12']].to_csv(out, index=False, float_format='%.4f')
print(len(W), 'satır', W.id.value_counts().to_dict(), pd.to_datetime(W.t.min(), unit='ms'), '→', pd.to_datetime(W.t.max(), unit='ms'), '→', out)
