# Test #91 (16 Ekim 2026; kullanıcının 5 fikri, 4; arXiv 2608.03616): piyasa geneli korelasyon sıçraması kapısı.
# Önceden sabit: ayın ilk 30 coini (TradFi hariç), saatlik kapanış getirileri; her 4 saatte bir son 24 saatin ortalama ikili korelasyonu
# (en az 20 coin tam veriyle). Bayrak: bu değer son 365 günün (yalnız geçmiş, en az 90 gün) %90 yüzdeliğinin üstünde. Beklenti: bayraklıyken işlemler kötü.
# Ölçüm: masa long/short kararlarının R'si (karar anından önceki son değer), Kaplumbağa A/F (giriş gününden önceki kapanış), BTC sonraki 24 sa / 7 g.
import json, os, numpy as np, pandas as pd, importlib.util
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test91-korelasyon-report.md'); DAY=86400000; HR=3600000
sp=importlib.util.spec_from_file_location('ok',os.path.join(H,'test-ortak-kapi.py')); ok=importlib.util.module_from_spec(sp); sp.loader.exec_module(ok)
U=json.load(open(f'{A}/universe.json')); TF=set(U['tradfi'])
top={m:[s for s in v if s not in TF][:30] for m,v in U['months'].items()}
syms=sorted(set(s for v in top.values() for s in v)|{'BTCUSDT'})
C={}
for s in syms:
    p=f'{A}/1h/{s}.csv'
    if os.path.exists(p): C[s]=pd.read_csv(p,header=None,usecols=[0,4],names=['t','c']).drop_duplicates('t').set_index('t').c
P=pd.DataFrame(C).sort_index(); R=np.log(P).diff()
ts=[];vals=[]
idx=R.index.values
for i in range(24,len(idx)):
    t=idx[i]
    if (t+HR)%(4*HR): continue
    mo=pd.Timestamp(int(t),unit='ms').strftime('%Y-%m'); cs=[s for s in top.get(mo,[]) if s in R.columns]
    w=R.iloc[i-23:i+1][cs].dropna(axis=1); w=w.loc[:,w.std()>0]  # donmuş fiyat (delist) sıfır oynaklık: korelasyon tanımsız, dışarıda
    if w.shape[1]<20: continue
    c=np.corrcoef(w.values.T); n=c.shape[0]; vals.append((c.sum()-n)/(n*n-n)); ts.append(int(t+HR))
k=pd.Series(vals,index=ts)
print('nan',int(k.isna().sum()),flush=True)
fl=k.rolling(2190,min_periods=540).apply(lambda w:(w[:-1]<w[-1]).mean(),raw=True)>=0.9
pd.DataFrame({'t':k.index,'c':k.values,'flag':fl.values.astype(int)}).to_csv(f'{A}/test91-bayrak.csv',index=False)
def at(t):
    i=fl.index.searchsorted(np.asarray(t),side='right')-1; o=np.zeros(len(i),bool); m=i>=0; o[m]=fl.values[i[m]]; return o,(np.asarray(t)>=fl.index[0]+90*DAY)
L=['# Test #91 · piyasa geneli korelasyon sıçraması kapısı (16 Ekim 2026)\n',
   f'Seri {pd.Timestamp(k.index[0],unit="ms"):%Y-%m-%d} → {pd.Timestamp(k.index[-1],unit="ms"):%Y-%m-%d}, {len(k)} nokta; 24 sa ortalama ikili korelasyon medyan {k.median():.2f}, %90 {k.quantile(.9):.2f}. Bayrak payı {fl.mean()*100:.0f} %.\n',ok.HEAD]
ms=ok.masa()
for d in ('long','short'):
    z=ms[ms.dir==d]; f,v=at(z.t.values); ok.split(f'masa {d} R',z.t.values[v],z.R.values[v],f[v],L)
for vv in ('A','F'):
    z=ok.turtle(vv); f,v=at(z.t0.values-1); ok.split(f'Kaplumbağa {vv} R',z.t0.values[v],z.R.values[v],f[v],L)
b=P.BTCUSDT
for hz,nm in ((24,'24 sa'),(168,'7 g')):
    fw=(b.shift(-hz)/b-1).reindex(fl.index); m=fl.index>=fl.index[0]+90*DAY
    ok.split(f'BTC sonraki {nm} getirisi',fl.index[m],fw.values[m],fl.values[m],L)
L.append('\nNot: masa kararları ve BTC satırları örtüşür; t şişkindir.')
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
