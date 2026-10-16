# Test #88 (16 Ekim 2026; kullanıcının listesi): fonlama tavanı olayı. Mayıs 2025'ten beri fonlama tavana/tabana değince Binance coinin ödeme
# aralığını 1 saate indiriyor. Olay = arşiv fonlama kayıtlarında aralığın ilk kez ≥ 4 saatten ≤ 1,5 saate düştüğü kayıt (kayıt anında bilinir);
# yön = o kaydın fonlama işareti (+ kalabalık long, − kalabalık short). Coin evreni: 1 sa arşivi olan tüm coinler (ilk 100'e girmiş olanlar).
# İşlem: (a) dönüş = kalabalığın tersi, (b) devam = kalabalıkla; giriş sonraki 1 sa mumun VWAP'ı, çıkış 24 / 72 sa sonra VWAP; 2 × %0,08 + fonlama.
# Kıyas: aynı coin, rastgele saat (20 tohum), aynı yön. Geçme: iki yarı + son 12 ay artı, rastgeleden iyi, t ≥ 3 (olay sayısı az, uyarı).
import os, glob, numpy as np, pandas as pd, time
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test88-fonlama-tavani-report.md'); DAY=86400000; HR=3600000
SIDE=0.0008; EV=[]; RN=[]; NOK=0
for pf in glob.glob(f'{A}/funding/*.csv'):
    s=os.path.basename(pf)[:-4]; f=pd.read_csv(pf,header=None,names=['t','r'])
    if len(f)<10: continue
    d=np.diff(f.t.values); ev=[i+1 for i in range(1,len(d)) if d[i]<=1.5*HR and d[i-1]>=3.5*HR]
    if not ev: continue
    ph=f'{A}/1h/{s}.csv'
    if not os.path.exists(ph): NOK+=len(ev); continue
    k=pd.read_csv(ph,header=None,usecols=[0,2,3,5,7],names=['t','h','l','v','q']); k=k[k.q>0].set_index('t')
    full=pd.RangeIndex(k.index[0],k.index[-1]+HR,HR); k=k.reindex(full); vw=((k.q/k.v).clip(k.l,k.h)).values; t=k.index.values
    fc=(f.t.values,np.cumsum(f.r.values))
    def fund(t0,t1):
        i0,i1=np.searchsorted(fc[0],t0),np.searchsorted(fc[0],t1); return (fc[1][i1-1]-(fc[1][i0-1] if i0>0 else 0)) if i1>i0 else 0.0
    def trade(i,d_,hz):
        j=i+1; x=j+hz
        if i<0 or x>=len(t) or not(vw[j]>0) or not(vw[x]>0): return None
        return d_*(vw[x]/vw[j]-1)-2*SIDE-d_*fund(t[j],t[x])
    for e in ev:
        i=int(np.searchsorted(t,(f.t.values[e]//HR)*HR)); crowd=1 if f.r.values[e]>0 else -1
        for mode,d_ in [('dönüş',-crowd),('devam',crowd)]:
            for hz in (24,72):
                g=trade(i,d_,hz)
                if g is None: continue
                EV.append(dict(s=s,t=int(f.t.values[e]),crowd=crowd,mode=mode,hz=hz,g=g,rate=f.r.values[e]))
                r=np.random.default_rng(len(EV))
                for j in r.integers(0,len(t)-hz-2,20):
                    g2=trade(int(j),d_,hz)
                    if g2 is not None: RN.append(dict(mode=mode,hz=hz,crowd=crowd,g=g2))
E=pd.DataFrame(EV); R=pd.DataFrame(RN)
fx=lambda v,k=2: (f'{v:+.{k}f}').replace('.',',') if np.isfinite(v) else '–'
L=[f'# Test #88 · Fonlama tavanı olayı (ödeme aralığı 1 saate iner) · {time.strftime("%Y-%m-%d")}','',
   f'Olay: {E.drop_duplicates(["s","t"]).shape[0]} (1 sa arşivi olmayan {NOK} olay dışarıda); ilk {pd.to_datetime(E.t.min(),unit="ms"):%Y-%m-%d}, son {pd.to_datetime(E.t.max(),unit="ms"):%Y-%m-%d}. VWAP giriş/çıkış, 2 × %0,08 + fonlama; işlem başı net %.','',
   '| kalabalık | işlem | ufuk | n | net % | t | 1. yarı | 2. yarı | rastgele | medyan | en kötü |','|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
for (cr,mode,hz),e in E.groupby(['crowd','mode','hz']):
    e=e.sort_values('t'); q=R[(R.crowd==cr)&(R['mode']==mode)&(R.hz==hz)]; mid=e.t.iloc[len(e)//2]; t=e.g.mean()/e.g.std()*np.sqrt(len(e))
    L.append(f'| {"long" if cr>0 else "short"} | {mode} | {hz} sa | {len(e)} | {fx(e.g.mean()*100)} | {fx(t,1)} | {fx(e[e.t<mid].g.mean()*100)} | {fx(e[e.t>=mid].g.mean()*100)} | {fx(q.g.mean()*100)} | {fx(e.g.median()*100)} | {fx(e.g.min()*100,0)} |')
L+=['','Olayların tamamı Mayıs 2025 sonrası (≈ 17 ay), "son 12 ay" ayrı sütun değil; yarılar zaman ortasından.']
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
