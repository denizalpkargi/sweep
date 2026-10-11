# Test #52 hazırlığı (11 Ekim 2026): Ozan işlem kalitesi modelinin (tests/ozan-kalite-model.py, hedef g72x) örneklem dışı tahminlerini
# test52-ozan-kalite-72sa.js için tek CSV'ye döker. Girdi: <ok klasörü>/rapor-g72x-<küme>.pkl (sym, t, L, p, k30, k50; masanın girdiği kararlar,
# 2022-01 →, eşik her an önceki 90 günün örneklem dışı tahminlerinin yüzdeliği). Çıktı: tests/data/arch/_t52-kalite.csv (küme,sym,t,dir,p,k30,k50).
# Kullanım: python3 tests/test52-kalite-tahmin.py <ok klasörü> [kümeler=HEPSI,B,HEPSI-B]
import os, sys
import pandas as pd
OK = sys.argv[1]; SETS = (sys.argv[2] if len(sys.argv) > 2 else 'HEPSI,B,HEPSI-B').split(',')
out = []
for s in SETS:
    d = pd.read_pickle(os.path.join(OK, f'rapor-g72x-{s}.pkl'))
    out.append(pd.DataFrame({'set': s, 'sym': d.sym.astype(str), 't': d.t, 'dir': d.L.map({1: 'long', 0: 'short'}),
                             'p': d.p.round(5), 'k30': d.k30.astype(int), 'k50': d.k50.astype(int)}))
o = pd.concat(out)
f = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'arch', '_t52-kalite.csv')
o.to_csv(f, index=False, header=False)
print(f, len(o), o.groupby('set').size().to_dict())
