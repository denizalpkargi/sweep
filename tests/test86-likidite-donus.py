# Test #86 (16 Ekim 2026; kullanıcının listesi): likiditeye göre bölünmüş kısa vadeli geri dönüş.
# Önceden sabit: evren giriş ayının ilk 100 coini (TradFi hariç), "çok likit" = ayın ilk 30'u, "az likit" = 31–100.
# Her 4 saatte bir (00/04/…/20 UTC) sinyal = son 4 saatin VWAP'tan VWAP'a getirisi (kapanış sıçramasından kaçınmak için, #26 kuralı).
# Az likit: en çok düşen beşte bir long / en çok yükselen beşte bir short (geri dönüş). Çok likit: tersi (devam). Bacak başına %50.
# Giriş sonraki 1 sa mumun VWAP'ı, çıkış 4 / 24 sa sonraki mumun VWAP'ı (24 sa'te 6 kaydırmalı alt portföy). Ayrıca her grupta öbür yön.
# Maliyet ağırlık değişimi × %0,08, fonlama, basit getiri. Kıyas rastgele (10 tohum). Geçme: iki yarı + son 12 ay artı, rastgeleden iyi, t ≥ 3.
import json, os, numpy as np, pandas as pd, time
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test86-likidite-donus-report.md'); DAY=86400000; HR=3600000
U=json.load(open(f'{A}/universe.json')); TF=set(U['tradfi'])
top={m:[s for s in v if s not in TF][:100] for m,v in U['months'].items()}
syms=sorted(set(s for v in top.values() for s in v))
VW,FR={},{}
for s in syms:
    p=f'{A}/1h/{s}.csv'
    if not os.path.exists(p): continue
    k=pd.read_csv(p,header=None,usecols=[0,3,2,5,7],names=['t','h','l','v','q']); k=k[k.q>0]
    VW[s]=pd.Series(((k.q/k.v).clip(k.l,k.h)).values,index=k.t.values)
    f=f'{A}/funding/{s}.csv'
    if os.path.exists(f): a=pd.read_csv(f,header=None,names=['t','r']); a['h']=(a.t//HR)*HR; FR[s]=a.groupby('h').r.sum()
V=pd.DataFrame(VW).sort_index(); F=pd.DataFrame(FR).reindex(V.index).fillna(0); Fc=F.cumsum()
T=V.index.values; T=T[(T%(4*HR)==0)&(T>=int(pd.Timestamp('2020-06-01').value//10**6))]
mk=lambda t: pd.to_datetime(t,unit='ms').strftime('%Y-%m'); COST=0.0008
VA=V.values; FA=Fc.values; COL={c:i for i,c in enumerate(V.columns)}; TI={t:i for i,t in enumerate(V.index.values)}
UI={m:np.array([COL[s] for s in v if s in COL],dtype=int) for m,v in top.items()}
def run(hz,grp,sign,rng=None,off=0):
    rows=[]; wo=np.zeros(VA.shape[1]); step=hz//4
    for t in T[off::step]:
        if t+(hz+1)*HR>T[-1]: break
        u=UI.get(mk(t+HR),np.array([],int)); u=u[:30] if grp=='çok' else u[30:100]
        i0,i1,ie,ix=TI.get(t-3*HR),TI.get(t),TI.get(t+HR),TI.get(t+(hz+1)*HR)
        if None in (i0,i1,ie,ix) or len(u)==0: continue
        sig=VA[i1,u]/VA[i0,u]-1; e=VA[ie,u]; x=VA[ix,u]; m=np.isfinite(sig)&np.isfinite(e)&np.isfinite(x); u=u[m]; sig=sig[m]
        if len(u)<15: continue
        k=max(1,len(u)//5)
        if rng is None: o=np.argsort(sig,kind='stable'); dn,upp=u[o[:k]],u[o[-k:]]
        else: pp=rng.permutation(len(u)); dn,upp=u[pp[:k]],u[pp[k:2*k]]
        L_,S_=(dn,upp) if sign=='dönüş' else (upp,dn)
        w=np.zeros(VA.shape[1]); w[L_]=0.5/k; w[S_]=-0.5/k; nz=np.nonzero(w)[0]
        ret=VA[ix,nz]/VA[ie,nz]-1; fund=FA[ix,nz]-FA[ie,nz]
        turn=np.abs(w-wo).sum(); wo=w
        rows.append(dict(t=t,net=float((w[nz]*(ret-np.sign(w[nz])*fund)).sum())-turn*COST))
    return pd.DataFrame(rows)
def comb(hz,grp,sign,rng=None):
    step=hz//4; R=pd.concat([run(hz,grp,sign,rng,o) for o in range(step)]); R['net']=R.net/step
    return R.groupby('t').net.sum().reset_index().sort_values('t')
fx=lambda v,k=3: (f'{v:+.{k}f}').replace('.',',') if np.isfinite(v) else '–'
L=[f'# Test #86 · Likiditeye göre bölünmüş geri dönüş · {time.strftime("%Y-%m-%d")}','','Ayın ilk 30 (çok likit) ve 31–100 (az likit) coini; sinyal 4 sa VWAP getirisi; beşte birler, bacak %50; 4 ve 24 sa; maliyet + fonlama; 4 saatlik dönem başına net %.','',
   '| grup | yön | ufuk | dönem | net % | t | 1. yarı | 2. yarı | son 12 ay | rastgele | brüt yaklaşık (maliyet ekli) |','|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
ok={}
for grp,sign in [('az','dönüş'),('az','devam'),('çok','devam'),('çok','dönüş')]:
    for hz in (4,24):
        R=comb(hz,grp,sign); q=pd.concat([comb(hz,grp,sign,np.random.default_rng(sd)) for sd in range(5)])
        mid=R.t.iloc[len(R)//2]; y12=R.t.iloc[-1]-365*DAY; t=R.net.mean()/R.net.std()*np.sqrt(len(R))
        h1,h2,y=R[R.t<mid].net.mean(),R[R.t>=mid].net.mean(),R[R.t>=y12].net.mean()
        L.append(f'| {grp} likit | {sign} | {hz} sa | {len(R)} | {fx(R.net.mean()*100)} | {fx(t,1)} | {fx(h1*100)} | {fx(h2*100)} | {fx(y*100)} | {fx(q.net.mean()*100)} | {fx((R.net.mean()-q.net.mean())*100)} |')
        ok[(grp,sign,hz)]=h1>0 and h2>0 and y>0 and R.net.mean()>q.net.mean() and t>=3; print(L[-1],flush=True)
L+=['','Son sütun = rastgele seçimden fark (aynı devir, aynı maliyet).','','## Sonuç','','Geçen: '+(', '.join(f'{a} likit {b} {c} sa' for (a,b,c),v in ok.items() if v) or 'yok')+'.']
open(OUT,'w').write('\n'.join(L)+'\n'); print(L[-1])
