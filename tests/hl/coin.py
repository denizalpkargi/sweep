import warnings; warnings.filterwarnings('ignore')
import json, numpy as np, pandas as pd, datetime, sys
H_LIST=[4,12]; HOUR=3600000; DAY=86400000
mkt=json.load(open('mkt.json')); G={int(k):v for k,v in json.load(open('groups.json')).items()}
CUTS=sorted(G)
coins=mkt['coins']
# hourly close / notional
cl={}; nv={}
for c in coins:
    k=mkt['candles'][c]
    if not k: continue
    s=pd.DataFrame(k,columns=['t','o','c','v']).drop_duplicates('t').set_index('t')
    cl[c]=s['c']; nv[c]=s['c']*s['v']
CL=pd.DataFrame(cl).sort_index(); NV=pd.DataFrame(nv).reindex(CL.index)
# hourly funding aligned to hour
fd={}
for c in coins:
    f=mkt['funding'].get(c) or []
    if not f: continue
    s=pd.Series({(t//HOUR)*HOUR:r for t,r in f})
    fd[c]=s
FD=pd.DataFrame(fd).reindex(CL.index).fillna(0.0)
idx=CL.index
T0=CUTS[0]; NOW=int(idx[-1])
grid=idx[(idx>=T0)]
# AV history
avh={}
for l in open('pf.jsonl'):
    r=json.loads(l); pf=r['pf'].get('perpAllTime')
    if pf: avh[r['u']]=(np.array([p[0] for p in pf['accountValueHistory']]),np.array([float(p[1]) for p in pf['accountValueHistory']]))
# positions per user on grid
POS={}; COV={}
for l in open('fills.jsonl'):
    r=json.loads(l); u=r['u']; fl=sorted(r['fills'])
    fl=[x for x in fl if x[1] in cl]
    nall=len(r['fills'])
    cov=T0 if (nall<9500 and not r['capped']) else (min(x[0] for x in r['fills']) if r['fills'] else T0)
    COV[u]=cov
    P=pd.DataFrame(0.0,index=grid,columns=list(cl))
    bycoin={}
    for t,c,sp,d,px in fl: bycoin.setdefault(c,[]).append((t,sp,d))
    held=set(bycoin)|{c for c in r['pos'] if c in cl}
    for c in held:
        ev=bycoin.get(c,[])
        if not ev:
            P[c]=r['pos'][c]; continue
        ts=np.array([e[0] for e in ev]); after=np.array([e[1]+e[2] for e in ev])
        j=np.searchsorted(ts,grid.values,side='right')-1   # last fill at or before hour
        before0=ev[0][1]
        P[c]=np.where(j>=0,after[np.clip(j,0,None)],before0)
    # value/AV
    if u in avh:
        ta,av=avh[u]; A=np.interp(grid.values,ta,av)
    else: A=np.full(len(grid),r['av'])
    A=np.maximum(A,1000.)
    P[grid<cov]=np.nan
    POS[u]=(P,A)
print('users with fills',len(POS),flush=True)
def group_signal(key,kind='pos'):
    out=np.full((len(grid),len(cl)),np.nan); cnt=out.copy()
    for i,C in enumerate(CUTS):
        E=CUTS[i+1] if i+1<len(CUTS) else NOW+1
        m=(grid>=C)&(grid<E)
        us=[u for u in G[C][key] if u in POS]
        if not us: continue
        px=CL.reindex(grid).ffill().values[m]
        if kind=='flow':
            stack=np.stack([(POS[u][0].values[m]-POS[u][0].shift(4).values[m])*px/POS[u][1][m][:,None] for u in us])
        else:
            stack=np.stack([POS[u][0].values[m]*px/POS[u][1][m][:,None] for u in us])
        lev=np.nanmean(np.clip(stack,-20,20),axis=0)
        sg=np.nanmean(np.sign(stack),axis=0)
        out[m]=lev; cnt[m]=sg
    return pd.DataFrame(out,index=grid,columns=list(cl)),pd.DataFrame(cnt,index=grid,columns=list(cl))
SIG={}
for k in ('good','bad','big','small'):
    a,b=group_signal(k); SIG[k+'_lev']=a; SIG[k+'_cnt']=b
SIG['bigminussmall']=SIG['big_cnt']-SIG['small_cnt']
SIG['goodminusbad']=SIG['good_cnt']-SIG['bad_cnt']
for k in ('good','bad','big','small'):
    a,b=group_signal(k,'flow'); SIG[k+'_flow4']=a
# controls
LR=np.log(CL)
SIG['mom4']=(LR-LR.shift(4)).reindex(grid); SIG['mom24']=(LR-LR.shift(24)).reindex(grid)
SIG['rev1']=-(LR-LR.shift(1)).reindex(grid)
SIG['fund24']=-FD.rolling(24).sum().reindex(grid)
# universe: top 30 by 24h notional
UNI=NV.rolling(24).sum().reindex(grid).rank(axis=1,ascending=False)<=30
def fwd(H,lag):
    r=(CL.shift(-H-lag)/CL.shift(-lag)-1)
    f=FD[::-1].rolling(H).sum()[::-1].shift(-1-lag)   # funding paid by long over (h+lag, h+lag+H]
    return (r-f).reindex(grid)
def ic_series(S,Y):
    Sx=S.where(UNI); Yx=Y.where(UNI&S.notna())
    rs=Sx.rank(axis=1); ry=Yx.rank(axis=1)
    ok=(rs.notna()&ry.notna()).sum(axis=1)>=15
    rs=rs.sub(rs.mean(1),axis=0); ry=ry.sub(ry.mean(1),axis=0)
    ic=(rs*ry).sum(1)/np.sqrt((rs**2).sum(1)*(ry**2).sum(1))
    return ic.where(ok)
def resid(S,ctrl):
    Sx=S.where(UNI).rank(axis=1); Sx=Sx.sub(Sx.mean(1),axis=0)
    Cs=[c.where(UNI&S.notna()).rank(axis=1) for c in ctrl]; Cs=[c.sub(c.mean(1),axis=0).fillna(0) for c in Cs]
    out=Sx.to_numpy(copy=True)
    for h in range(len(Sx)):
        y=Sx.values[h]; ok=~np.isnan(y)
        if ok.sum()<15: continue
        X=np.stack([c.values[h][ok] for c in Cs],1)
        b=np.linalg.lstsq(X,y[ok],rcond=None)[0]; out[h,ok]=y[ok]-X@b
    return pd.DataFrame(out,index=Sx.index,columns=Sx.columns)
def spread(S,Y,q=.2):
    Sx=S.where(UNI); Yx=Y.where(UNI&S.notna()); Yx=Yx.sub(Yx.mean(1),axis=0)
    p=Sx.rank(axis=1,pct=True)
    return (Yx.where(p>=1-q).mean(1)), (Yx.where(p<=q).mean(1))
ts=pd.to_datetime(grid,unit='ms',utc=True)
mid=grid[0]+(grid[-1]-grid[0])//2; last30=grid[-1]-30*DAY
per={'ilk yarı':grid<mid,'ikinci yarı':grid>=mid,'son 30 gün':grid>=last30,'hepsi':grid>=0}
for k in [k for k in SIG if k.startswith(('good','bad','big','small'))]:
    SIG[k+'|art']=resid(SIG[k],[SIG['mom4'],SIG['mom24'],SIG['fund24']])
res=[]
for H in H_LIST:
  for lag in (0,1):
    Y=fwd(H,lag)
    for k,S in SIG.items():
        ic=ic_series(S,Y); top,bot=spread(S,Y)
        row={'sinyal':k,'H':H,'gecikme':lag}
        for pn,m in per.items():
            x=ic[m]; xs=x.iloc[::H].dropna()
            row[pn]=round(x.mean(),3)
            if pn=='hepsi':
                row['t']=round(xs.mean()/xs.std()*np.sqrt(len(xs)),2) if len(xs)>3 else np.nan
                row['üst-alt %']=round((top[m]-bot[m]).iloc[::H].mean()*100,3)
                row['alt %']=round(bot[m].iloc[::H].mean()*100,3)
        res.append(row)
d=pd.DataFrame(res); pd.set_option('display.width',250)
print(d.to_string()); d.to_csv('coin_ic.csv',index=False)
# residual IC: good/bad/big signals after momentum/vol controls
print('coverage hours',len(grid))
