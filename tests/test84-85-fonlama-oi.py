# Testler #84 ve #85 (16 Ekim 2026; kullanıcının listesi, "bunlara bakalım mı").
# #84 Aşırı negatif fonlamada long: fonlama kaydı (8 sa) ≤ −%0,05 (ayrıca ≤ −%0,10) olunca kayıttan sonraki 1 sa mumun VWAP'ında long, 24 sa sonra VWAP'ta çık.
#     Karşılaştırma: aşırı pozitif (≥ +%0,10) sonrası short. Evren ayın ilk 30'u + BTC ayrı satır. Coin başına 24 sa'te bir olay.
# #85 OI × fiyat dört bölge (saatlik, son 24 sa; eşik |fiyat| ≥ %5, |OI| ≥ %10, kontrat): bölge başına sonraki 24 / 72 sa long getirisi
#     (işaret yönü verir; işlem yönü önceden: fiyat↓ OI↑ = short birikimi → long (sıkışma); fiyat↑ OI↓ = short kapanışı → short (yakıt bitti);
#     fiyat↑ OI↑ = yeni long → long (devam); fiyat↓ OI↓ = long tasfiyesi → long (#82 ailesi)).
# Ortak: VWAP giriş/çıkış, 2 × %0,08 + fonlama (long öder), basit getiri; rastgele: aynı coin, ayda rastgele saat (20 tohum); t gün kümeli.
# Geçme: iki yarı ve son 12 ay artı, rastgeleden iyi, t ≥ 3.  → tests/test84-85-fonlama-oi-report.md
import json, os, numpy as np, pandas as pd, time
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test84-85-fonlama-oi-report.md'); DAY=86400000; HR=3600000
U=json.load(open(f'{A}/universe.json')); TF=set(U['tradfi'])
top={m:set([s for s in v if s not in TF][:30]) for m,v in U['months'].items()}
syms=sorted(set(s for v in top.values() for s in v)|{'BTCUSDT'})
SIDE=0.0008; EV=[]; RN=[]
def rng_for(s,sd): return np.random.default_rng(sd*7919+sum(map(ord,s)))
for s in syms:
    ph=f'{A}/1h/{s}.csv'; pf=f'{A}/funding/{s}.csv'
    if not(os.path.exists(ph) and os.path.exists(pf)): continue
    k=pd.read_csv(ph,header=None,usecols=[0,2,3,4,5,7],names=['t','h','l','c','v','q']); k=k[k.q>0].set_index('t')
    full=pd.RangeIndex(k.index[0],k.index[-1]+HR,HR); k=k.reindex(full)
    vw=((k.q/k.v).clip(k.l,k.h)).values; t=k.index.values; c=k.c.values
    f=pd.read_csv(pf,header=None,names=['t','r']); fc=(f.t.values,np.cumsum(f.r.values))
    def fund(t0,t1):
        i0,i1=np.searchsorted(fc[0],t0),np.searchsorted(fc[0],t1); return (fc[1][i1-1]-(fc[1][i0-1] if i0>0 else 0)) if i1>i0 else 0.0
    mon=pd.to_datetime(t,unit='ms').strftime('%Y-%m').values
    inu=np.array([s in top.get(x,()) for x in mon]) if s!='BTCUSDT' else np.ones(len(t),bool)
    grp='BTC' if s=='BTCUSDT' else 'ilk 30'
    def trade(i,d,hz):
        j=i+1; x=j+hz
        if x>=len(t) or not(vw[j]>0) or not(vw[x]>0): return None
        return d*(vw[x]/vw[j]-1)-2*SIDE-d*fund(t[j],t[x])
    def emit(test,kind,d,hz,idx):
        busy=-1; n=0
        for i in idx:
            if i<=busy: continue
            g=trade(i,d,hz)
            if g is None: continue
            EV.append(dict(test=test,k=kind,g_=grp,hz=hz,t=int(t[i]),g=g,s=s)); busy=i+hz; n+=1
        pool=np.where(inu&np.isfinite(vw))[0]
        for sd in range(20):
            if not n or not len(pool): break
            for i in rng_for(s,sd).choice(pool,min(n,len(pool)),replace=False):
                g=trade(i,d,hz)
                if g is not None: RN.append(dict(test=test,k=kind,g_=grp,hz=hz,t=int(t[i]),g=g))
    # #84: fonlama kaydının saati (ms) → o saatin mumu i (kayıt anında bilinir; giriş i+1)
    ft=(f.t.values//HR)*HR; fi=np.searchsorted(t,ft); okf=(fi<len(t))
    for kind,d,cond in [('neg ≤ −%0,05',1,f.r.values<=-0.0005),('neg ≤ −%0,10',1,f.r.values<=-0.001),('poz ≥ +%0,10 short',-1,f.r.values>=0.001)]:
        idx=sorted(i for i in fi[okf&cond] if i<len(t) and inu[i]); emit('#84',kind,d,24,idx)
    # #85
    if s!='BTCUSDT' and os.path.exists(f'{A}/metrics/{s}.csv'):
        m=pd.read_csv(f'{A}/metrics/{s}.csv',header=None,usecols=[0,1],names=['t','oi']); m=m[m.oi>0]; m['h']=(m.t//HR)*HR
        oi=m.groupby('h').oi.last().reindex(full).values
        r24=c/np.r_[np.full(24,np.nan),c[:-24]]-1; o24=oi/np.r_[np.full(24,np.nan),oi[:-24]]-1
        for kind,d,cond in [('fiyat↓ OI↑ → long',1,(r24<=-0.05)&(o24>=0.10)),('fiyat↑ OI↓ → short',-1,(r24>=0.05)&(o24<=-0.10)),
                            ('fiyat↑ OI↑ → long',1,(r24>=0.05)&(o24>=0.10)),('fiyat↓ OI↓ → long',1,(r24<=-0.05)&(o24<=-0.10))]:
            idx=np.where(cond&inu)[0]
            for hz in (24,72): emit('#85',kind,d,hz,idx)
E=pd.DataFrame(EV); R=pd.DataFrame(RN)
fx=lambda v,k=2: (f'{v:+.{k}f}').replace('.',',') if np.isfinite(v) else '–'
L=[f'# Testler #84 ve #85 · Aşırı fonlama ve OI × fiyat · {time.strftime("%Y-%m-%d")}','','VWAP giriş/çıkış, 2 × %0,08 + fonlama; işlem başı net %; t gün kümeli; rastgele = aynı coin, ayda rastgele saat, aynı yön.','',
   '| test | olay | evren | ufuk | n | net % | t | 1. yarı | 2. yarı | son 12 ay | rastgele | medyan | yıllar artı |','|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
ok={}
for (te,kind,g_,hz),e in E.groupby(['test','k','g_','hz'],sort=False):
    e=e.sort_values('t'); q=R[(R.test==te)&(R.k==kind)&(R.g_==g_)&(R.hz==hz)]
    if len(e)<20: L.append(f'| {te} | {kind} | {g_} | {hz} sa | {len(e)} | {fx(e.g.mean()*100)} | | | | | | | |'); continue
    mid=e.t.iloc[len(e)//2]; y12=e.t.max()-365*DAY; dd=e.groupby(e.t//DAY).g.mean(); t=dd.mean()/dd.std()*np.sqrt(len(dd))
    h1,h2,y=e[e.t<mid].g.mean(),e[e.t>=mid].g.mean(),e[e.t>=y12].g.mean(); yr=e.groupby(pd.to_datetime(e.t,unit='ms').dt.year).g.mean()
    L.append(f'| {te} | {kind} | {g_} | {hz} sa | {len(e)} | {fx(e.g.mean()*100)} | {fx(t,1)} | {fx(h1*100)} | {fx(h2*100)} | {fx(y*100)} ({(e.t>=y12).sum()}) | {fx(q.g.mean()*100)} | {fx(e.g.median()*100)} | {(yr>0).sum()}/{len(yr)} |')
    ok[(te,kind,g_,hz)]=h1>0 and h2>0 and y>0 and e.g.mean()>q.g.mean() and t>=3
L+=['','## Sonuç','','Geçen: '+(', '.join(f'{a} {b} {c} {d} sa' for (a,b,c,d),v in ok.items() if v) or 'yok')+'.']
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
