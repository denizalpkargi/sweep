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
P['id'] = P.uye.str.split(' (').str[0].map(IDS); P = P[P.id.notna()]
P = P[((P.id != 'rank') & (P.key == FAM)) | ((P.id == 'rank') & (P.key == RANK))]
P['hz'] = P.h.astype(str).str.extract(r'(\d+)')[0].map({'4': 'p4', '12': 'p12'})
W = P.pivot_table(index=['t', 'sym', 'id'], columns='hz', values='pr').reset_index()
for c in ('p4', 'p12'):
    if c not in W: W[c] = float('nan')
W['t'] = W.t.astype('int64'); out = arg('out', os.path.join(D, 'uye-oos.csv'))
W[['t', 'sym', 'id', 'p4', 'p12']].to_csv(out, index=False, float_format='%.4f')
print(len(W), 'satır', W.id.value_counts().to_dict(), pd.to_datetime(W.t.min(), unit='ms'), '→', pd.to_datetime(W.t.max(), unit='ms'), '→', out)
