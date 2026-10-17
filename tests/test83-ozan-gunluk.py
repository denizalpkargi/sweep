# Test #83 (16 Ekim 2026, 24–72 sa odağı): Ozan'ın örneklem dışı coin sırası, günde bir dengeleme, 24 / 72 sa.
# Veri: tests/data/arch/rank-oos-tam-12.pkl (ileriye yürüyen eğitim, 2024-06 → 2026-10, ilk 30 coin, 12 sa modeli) + 1 sa arşivi.
# Önceden sabit: her gün 00 UTC tahmini; en kötü onluk (3 coin) short, en iyi onluk long, çift = ikisi bacak başına %50.
# Giriş 01 UTC mumunun VWAP'ı, çıkış 24 / 72 sa sonraki mumun VWAP'ı; 72 sa'te 3 kaydırmalı alt portföy. Short bacağına %20 felaket stopu (1 sa tepe).
# Maliyet ağırlık değişimi × %0,08 (taker + kayma), fonlama arşivden, basit getiri. Kıyas rastgele 3 coin (20 tohum).
# Geçme: iki yarı ve son 12 ay artı, rastgeleden iyi, t ≥ 3.  → tests/test83-ozan-gunluk-report.md
import json, os, numpy as np, pandas as pd, time
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test83-ozan-gunluk-report.md'); DAY=86400000; HR=3600000
SY=json.load(open(f'{A}/rank.json'))['syms']
P=pd.read_pickle(f'{A}/rank-oos-tam-12.pkl'); P['sym']=[SY[int(round(x))] for x in P.si]; P=P[(P.t%DAY)==0][['t','sym','p']]
VW,HI,FC={},{},{}
for s in P.sym.unique():
    k=pd.read_csv(f'{A}/1h/{s}.csv',header=None,usecols=[0,1,2,3,4,5,7],names=['t','o','h','l','c','v','q']); k=k[k.q>0].set_index('t')
    VW[s]=(k.q/k.v).clip(k.l,k.h); HI[s]=k.h
    f=f'{A}/funding/{s}.csv'
    if os.path.exists(f): a=pd.read_csv(f,header=None,names=['t','r']); FC[s]=(a.t.values,np.cumsum(a.r.values))
def fund(s,t0,t1):
    if s not in FC: return 0.0001*(t1-t0)/(8*HR)
    a,c=FC[s]; i0,i1=np.searchsorted(a,t0),np.searchsorted(a,t1); return (c[i1-1]-(c[i0-1] if i0>0 else 0)) if i1>i0 else 0.0
def leg(s,t0,t1,d):
    v=VW[s]
    if t0 not in v.index or t1 not in v.index: return None
    e=v[t0]; x=v[t1]
    if d<0:
        h=HI[s].loc[t0:t1]; hit=h[h>=e*1.2]
        if len(hit): x=e*1.2
    return d*(x/e-1)-d*fund(s,t0,t1)
SIDE=0.0008; days=sorted(P.t.unique()); G={t:g.set_index('sym').p for t,g in P.groupby('t')}
def run(hz,mode,off=0,rng=None):
    rows=[]; wo=pd.Series(dtype=float); step=hz//24; i=off
    while i<len(days):
        D=days[i]; p=G[D]; t0=D+HR; t1=t0+hz*HR
        if len(p)<20: i+=step; continue
        k=max(1,len(p)//10); srt=p.sort_values()
        if rng is None: lo,hi=list(srt.index[:k]),list(srt.index[-k:])
        else: q=list(rng.permutation(p.index)); lo,hi=q[:k],q[k:2*k]
        W={}
        if mode in('S','LS'):
            for s in lo: W[s]=-(0.5 if mode=='LS' else 1)/k
        if mode in('L','LS'):
            for s in hi: W[s]=W.get(s,0)+(0.5 if mode=='LS' else 1)/k
        g=0; okk=True
        for s,w in W.items():
            r=leg(s,t0,t1,np.sign(w))
            if r is None: okk=False; break
            g+=abs(w)*r
        if not okk: i+=step; continue
        w=pd.Series(W); idx=sorted(set(w.index)|set(wo.index)); turn=(w.reindex(idx).fillna(0)-wo.reindex(idx).fillna(0)).abs().sum(); wo=w
        rows.append(dict(t=D,net=g-turn*SIDE)); i+=step
    return pd.DataFrame(rows)
def comb(hz,mode,rng=None):
    step=hz//24; R=pd.concat([run(hz,mode,o,rng) for o in range(step)]); R['net']=R.net/step
    return R.groupby('t').net.sum().reset_index().sort_values('t')
fx=lambda v,k=3: (f'{v:+.{k}f}').replace('.',',') if np.isfinite(v) else '–'
L=[f'# Test #83 · Ozan sırası, günlük dengeleme, 24 / 72 sa · {time.strftime("%Y-%m-%d")}','','Örneklem dışı 2024-06 → 2026-10, ilk 30 coin; onluklar (3 coin); VWAP giriş/çıkış; maliyet %0,08 × ağırlık değişimi + fonlama; short bacağı %20 felaket stopu; günlük net % (özkaynağa göre).','',
   '| ufuk | bacak | gün | net % / gün | t | 1. yarı | 2. yarı | son 12 ay | rastgele | bileşik | düşüş |','|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
ok={}
for hz in (24,72):
    for mode,ad in [('S','short en kötü'),('L','long en iyi'),('LS','çift')]:
        R=comb(hz,mode); q=pd.concat([comb(hz,mode,np.random.default_rng(sd)) for sd in range(20)])
        mid=R.t.iloc[len(R)//2]; y12=R.t.iloc[-1]-365*DAY; t=R.net.mean()/R.net.std()*np.sqrt(len(R))
        h1,h2,y=R[R.t<mid].net.mean(),R[R.t>=mid].net.mean(),R[R.t>=y12].net.mean(); eq=(1+R.net).cumprod()
        L.append(f'| {hz} sa | {ad} | {len(R)} | {fx(R.net.mean()*100)} | {fx(t,1)} | {fx(h1*100)} | {fx(h2*100)} | {fx(y*100)} | {fx(q.net.mean()*100)} | {fx((eq.iloc[-1]-1)*100,0)} % | {fx((eq/eq.cummax()-1).min()*100,0)} % |')
        ok[(hz,ad)]=h1>0 and h2>0 and y>0 and R.net.mean()>q.net.mean() and t>=3; print(L[-1],flush=True)
L+=['','## Sonuç','','Geçme: '+', '.join(f'{h} sa {a} **{"geçti" if v else "geçmedi"}**' for (h,a),v in ok.items())+'.']
open(OUT,'w').write('\n'.join(L)+'\n'); print(L[-1])
