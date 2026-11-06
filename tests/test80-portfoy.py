import pandas as pd, numpy as np
DAY=86400000
def port(T,risk=0.005,K=10,L=2.0):
    ev=sorted([(r.t0,0,i) for i,r in T.iterrows()]+[(r.t1,1,i) for i,r in T.iterrows()]); eq=1.0; op={}; c=[]
    for t,k,i in ev:
        r=T.loc[i]
        if k==0:
            if len(op)>=K: continue
            nom=risk*eq/r.r0
            if sum(op.values())+nom>L*eq: continue
            op[i]=nom
        elif i in op: eq+=op.pop(i)*r.g; c.append((t,eq))
    c=pd.DataFrame(c,columns=['t','e']); c['m']=pd.to_datetime(c.t,unit='ms').dt.to_period('M')
    s=c.groupby('m').e.last(); idx=pd.period_range('2020-06','2026-10',freq='M'); return s.reindex(idx).ffill().fillna(1.0)
M={}
for v in 'ABCDEF':
    T=pd.read_csv(f'tests/data/arch/test80-{v}.csv').sort_values('t0').reset_index(drop=True)
    e=port(T); r=e.pct_change().fillna(e.iloc[0]-1); dd=(e/e.cummax()-1).min(); M[v]=r
    mid=len(r)//2; y=r.index[-12:]
    ann=lambda x:(1+x).prod()**(12/len(x))-1
    sh=lambda x:x.mean()/x.std()*np.sqrt(12)
    print(v,'% işlem',round(T.g.mean()*100,2),'yarılar',round(T[T.t0<T.t0.iloc[len(T)//2]].g.mean()*100,2),round(T[T.t0>=T.t0.iloc[len(T)//2]].g.mean()*100,2),
          '| aylık port yıllık',round(ann(r)*100),'yarılar',round(ann(r.iloc[:mid])*100),round(ann(r.iloc[mid:])*100),'son12',round(ann(r.loc[y])*100),'dd',round(dd*100),'sharpe',round(sh(r),2),round(sh(r.iloc[:mid]),2),round(sh(r.iloc[mid:]),2))
D=pd.DataFrame(M).fillna(0)
for v in 'BCDEF':
    d=D[v]-D['A']; print(v,'- A aylık fark t',round(d.mean()/d.std()*np.sqrt(len(d)),2),'kor',round(D[v].corr(D['A']),2))
for a,b in [('A','F'),('A','E'),('C','F')]:
    m=0.5*D[a]+0.5*D[b]; e=(1+m).cumprod(); mid=len(m)//2
    print(a+b,'yıllık',round(((1+m).prod()**(12/len(m))-1)*100),'yarılar sharpe',round(m.iloc[:mid].mean()/m.iloc[:mid].std()*12**.5,2),round(m.iloc[mid:].mean()/m.iloc[mid:].std()*12**.5,2),'son12',round(((1+m.iloc[-12:]).prod()-1)*100),'dd',round((e/e.cummax()-1).min()*100),'sharpe',round(m.mean()/m.std()*12**.5,2))
