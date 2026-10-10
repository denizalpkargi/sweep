import json, numpy as np, sys, datetime
def rk(a): return np.argsort(np.argsort(a)).astype(float)
def sp(x,y): return np.corrcoef(rk(x),rk(y))[0,1]
rows=[json.loads(l) for l in open('pf.jsonl')]
DAY=86400000
T1=max(p[0] for r in rows for p in r['pf']['perpAllTime']['pnlHistory'])
W=int(sys.argv[1]) if len(sys.argv)>1 else 30
F=int(sys.argv[2]) if len(sys.argv)>2 else 1   # formation windows
edges=[T1-k*W*DAY for k in range(0,int(900/W))][::-1]
def interp(ts,v,t):
    if len(ts)<2 or t<ts[0] or t>ts[-1]+9*DAY: return None
    return float(np.interp(t,ts,v))
P={}; R={}; A={}
for r in rows:
    pf=r['pf'].get('perpAllTime')
    if not pf: continue
    ts=np.array([p[0] for p in pf['pnlHistory']]); pv=np.array([float(p[1]) for p in pf['pnlHistory']])
    ta=np.array([p[0] for p in pf['accountValueHistory']]); av=np.array([float(p[1]) for p in pf['accountValueHistory']])
    for i,(a,b) in enumerate(zip(edges[:-1],edges[1:])):
        pa,pb,v=interp(ts,pv,a),interp(ts,pv,b),interp(ta,av,a)
        if None in (pa,pb,v): continue
        P[(r['u'],i)]=pb-pa; A[(r['u'],i)]=v
        R[(r['u'],i)]=(pb-pa)/max(v,1000.)
U=sorted({u for u,_ in R})
out=[]
for i in range(F,len(edges)-1):
    fs=range(i-F,i)
    us=[u for u in U if all((u,j) in R for j in fs) and (u,i) in R and A[(u,i-F)]>=1000 and any(P[(u,j)]!=0 for j in fs)]
    if len(us)<100: continue
    x=np.array([sum(R[(u,j)] for j in fs) for u in us]); y=np.array([R[(u,i)] for u in us])
    xp=np.array([sum(P[(u,j)] for j in fs) for u in us]); yp=np.array([P[(u,i)] for u in us])
    allpos=np.array([all(P[(u,j)]>0 for j in fs) for u in us])
    q=np.quantile(x,[.1,.2,.8,.9])
    top=y[x>=q[3]]; bot=y[x<=q[0]]
    good=(x>=q[2])&allpos; bad=(x<=q[1])&np.array([all(P[(u,j)]<0 for j in fs) for u in us])
    act=yp!=0
    out.append(dict(t=datetime.datetime.fromtimestamp(edges[i]/1000,datetime.UTC).date(),n=len(us),
        rho=sp(x,y),rho_act=sp(x[act],y[act]) if act.sum()>30 else np.nan,rho_pnl=sp(xp,yp),
        top_med=np.median(top),bot_med=np.median(bot),top_mean=np.mean(np.clip(top,-1,3)),bot_mean=np.mean(np.clip(bot,-1,3)),
        top_win=(top>0).mean(),bot_win=(bot>0).mean(),all_win=(y>0).mean(),
        good_win=(y[good]>0).mean() if good.sum() else np.nan, good_n=int(good.sum()), bad_win=(y[bad]>0).mean() if bad.sum() else np.nan,
        top_still=(rk(y)[x>=q[3]]>=np.quantile(rk(y),.9)).mean(), stop=(yp[x>=q[3]]==0).mean(), sbot=(yp[x<=q[0]]==0).mean()))
import pandas as pd
d=pd.DataFrame(out); pd.set_option('display.width',250); pd.set_option('display.max_columns',30)
print(d.round(3).to_string())
h=len(d)//2
for nm,s in [('ilk yarı',d.iloc[:h]),('ikinci yarı',d.iloc[h:]),('son 6',d.iloc[-6:]),('hepsi',d)]:
    print(nm, s.drop(columns='t').mean().round(3).to_dict())
d.to_csv(f'persist_W{W}_F{F}.csv',index=False)
