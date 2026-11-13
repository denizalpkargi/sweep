# Test #82 (16 Ekim 2026, 24–72 sa odağı): OI patlaması → 24 / 72 sa.
# Önceden sabit: ayın ilk 30 coini (TradFi hariç); saat başı, son 24 sa OI değişimi (kontrat sayısı, metrics 5 dk) ve fiyat değişimi (1 sa kapanış).
#   KOVALAMA: OI +%20 ve fiyat +%8 → short (kaldıraçlı kovalama söner);  TASFIYE: OI −%20 ve fiyat −%8 → long (zorla satış sonrası dönüş).
# Giriş sonraki 1 sa mumunun VWAP'ı, çıkış 24 / 72 sa sonraki mumun VWAP'ı; coin başına tutuş süresince yeni olay yok.
# Maliyet 2 × %0,08 + fonlama (long öder, short alır). Basit getiri. Kıyas: aynı coin ve ayda rastgele saat (20 tohum).
# t: olayların gün içi kümelenmesi için gün başına ortalamadan. Geçme: iki yarı ve son 12 ay artı, rastgeleden iyi, t ≥ 3.  → tests/test82-oi-patlama-report.md
import json, os, numpy as np, pandas as pd, time
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.environ.get('OUT',os.path.join(H,'test82-oi-patlama-report.md')); DAY=86400000; HR=3600000
U=json.load(open(f'{A}/universe.json')); TF=set(U['tradfi'])
top={m:set([s for s in v if s not in TF][:30]) for m,v in U['months'].items()}
syms=sorted(set(s for v in top.values() for s in v))
SIDE=0.0008; EV=[]; RN=[]
for s in syms:
    pm=f'{A}/metrics/{s}.csv'; ph=f'{A}/1h/{s}.csv'
    if not(os.path.exists(pm) and os.path.exists(ph)): continue
    m=pd.read_csv(pm,header=None,usecols=[0,1],names=['t','oi']); m=m[m.oi>0]; m['h']=(m.t//HR)*HR; oi=m.groupby('h').oi.last()
    k=pd.read_csv(ph,header=None,usecols=[0,1,2,3,4,5,7],names=['t','o','h','l','c','v','q']); k=k[k.q>0].set_index('t')
    vw=(k.q/k.v).clip(k.l,k.h); df=pd.DataFrame({'c':k.c,'vw':vw}).join(oi.rename('oi'),how='left')
    idx=df.index.values; full=pd.RangeIndex(idx[0],idx[-1]+HR,HR); df=df.reindex(full)
    df['r24']=df.c/df.c.shift(24)-1; df['o24']=df.oi/df.oi.shift(24)-1
    f=pd.read_csv(f'{A}/funding/{s}.csv',header=None,names=['t','r']) if os.path.exists(f'{A}/funding/{s}.csv') else None
    fc=(f.t.values,np.cumsum(f.r.values)) if f is not None and len(f) else None
    def fund(t0,t1):
        if fc is None: return 0.0001*(t1-t0)/(8*HR)
        i0,i1=np.searchsorted(fc[0],t0),np.searchsorted(fc[0],t1); return (fc[1][i1-1]-(fc[1][i0-1] if i0>0 else 0)) if i1>i0 else 0.0
    mon=pd.to_datetime(df.index,unit='ms').strftime('%Y-%m').values; inu=np.array([s in top.get(x,()) for x in mon])
    vwa=df.vw.values; t=df.index.values; o24=df.o24.values; r24=df.r24.values
    def trade(i,d,hz):
        j=i+1; x=j+hz
        if x>=len(t) or not(vwa[j]>0) or not(vwa[x]>0): return None
        return d*(vwa[x]/vwa[j]-1)-2*SIDE-d*fund(t[j],t[x])
    OT=float(os.environ.get('OT','0.20')); RT=float(os.environ.get('RT','0.08'))
    for kind,d,cond in [('KOVALAMA',-1,(o24>OT)&(r24>RT)),('TASFIYE',1,(o24<-OT)&(r24<-RT))]:
        cand=np.where(cond&inu)[0]
        for hz in (24,72):
            busy=-1; n=0
            for i in cand:
                if i<=busy: continue
                g=trade(i,d,hz)
                if g is None: continue
                EV.append(dict(s=s,k=kind,hz=hz,t=int(t[i]),g=g)); busy=i+hz; n+=1
            pool=np.where(inu&np.isfinite(vwa))[0]
            for sd in range(20):
                r=np.random.default_rng(sd*1000+hash(s)%1000)
                for i in r.choice(pool,min(n,len(pool)),replace=False) if n and len(pool) else []:
                    g=trade(i,d,hz)
                    if g is not None: RN.append(dict(s=s,k=kind,hz=hz,t=int(t[i]),g=g))
E=pd.DataFrame(EV); R=pd.DataFrame(RN)
import sys
if '--dump' in sys.argv: E.to_csv(os.path.join(A,'test82-ev.csv'),index=False); R.to_csv(os.path.join(A,'test82-rn.csv'),index=False)
fx=lambda v,k=2: (f'{v:+.{k}f}').replace('.',',') if np.isfinite(v) else '–'
L=[f'# Test #82 · OI patlaması → 24 / 72 sa · {time.strftime("%Y-%m-%d")}','','Ayın ilk 30 coini, metrics 5 dk OI (kontrat), saatlik; VWAP giriş/çıkış, 2 × %0,08 + fonlama; işlem başı net %. t gün başına ortalamadan.','',
   '| olay | ufuk | n | net % | t (gün) | 1. yarı | 2. yarı | son 12 ay | rastgele | kazanma | en kötü |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
ok={}
for (kind,hz),e in E.groupby(['k','hz']):
    e=e.sort_values('t'); q=R[(R.k==kind)&(R.hz==hz)]; mid=e.t.iloc[len(e)//2]; y12=e.t.max()-365*DAY
    dd=e.groupby(e.t//DAY).g.mean(); t=dd.mean()/dd.std()*np.sqrt(len(dd))
    h1,h2,y=e[e.t<mid].g.mean(),e[e.t>=mid].g.mean(),e[e.t>=y12].g.mean()
    L.append(f'| {kind} | {hz} sa | {len(e)} | {fx(e.g.mean()*100)} | {fx(t,1)} | {fx(h1*100)} | {fx(h2*100)} | {fx(y*100)} ({(e.t>=y12).sum()}) | {fx(q.g.mean()*100)} | %{(e.g>0).mean()*100:.0f} | {fx(e.g.min()*100,0)} |')
    ok[(kind,hz)]=h1>0 and h2>0 and y>0 and e.g.mean()>q.g.mean() and t>=3
    yr=e.groupby(pd.to_datetime(e.t,unit='ms').dt.year).g.agg(['mean','count'])
    L.append(f'|  | yıl | '+' · '.join(f'{a} {fx(m*100)} ({c})' for a,(m,c) in yr.iterrows())+' | | | | | | | | |')
L+=['','## Sonuç','','Geçme: '+', '.join(f'{k} {h} sa **{"geçti" if v else "geçmedi"}**' for (k,h),v in ok.items())+'.']
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
