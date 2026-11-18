# Test #91b (17 Ekim 2026): korelasyon sıçraması kapısı Kaplumbağa portföyünde (örtüşmesiz ölçü). #91'in bayrağı (tests/data/arch/test91-bayrak.csv,
# yalnız geçmiş eşik) giriş anından önceki son noktada açıksa giriş atlanır. Portföy test80-portfoy ile aynı (%0,5 risk, 10 pozisyon, 2× nominal), aylık.
# Kıyas: aynı sayıda girişi rastgele atlamak (200 tohum). Geçme: iki yarıda ve son 12 ayda yıllık getiri ve Sharpe kapısızdan iyi, rastgele atlamanın %95'inden iyi.
import os, numpy as np, pandas as pd
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test91b-portfoy-report.md')
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
ann=lambda x:(1+x).prod()**(12/len(x))-1
sh=lambda x:x.mean()/x.std()*np.sqrt(12) if x.std()>0 else np.nan
def stats(e):
    r=e.pct_change().fillna(e.iloc[0]-1); mid=len(r)//2; dd=(e/e.cummax()-1).min()
    return dict(ann=ann(r),a1=ann(r.iloc[:mid]),a2=ann(r.iloc[mid:]),y12=ann(r.iloc[-12:]),sh=sh(r),s1=sh(r.iloc[:mid]),s2=sh(r.iloc[mid:]),dd=dd)
B=pd.read_csv(f'{A}/test91-bayrak.csv'); bt=B.t.values; bf=B.flag.values
L=['# Test #91b · korelasyon kapısı Kaplumbağa portföyünde (17 Ekim 2026)\n','Portföy %0,5 risk, 10 pozisyon, 2× nominal, aylık; bayrak giriş anından önceki son 4 saatlik noktadan.\n',
   '| Varyant | atlanan giriş | yıllık % | yarılar % | son 12 ay % | Sharpe | yarılar Sharpe | düşüş % | rastgele atlama yıllık % (medyan / %95) |','|---|---|---|---|---|---|---|---|---|']
f=lambda v:f'{v*100:+.0f}'
for v in ('A','F'):
    T=pd.read_csv(f'{A}/test80-{v}.csv').sort_values('t0').reset_index(drop=True)
    i=np.searchsorted(bt,T.t0.values,side='right')-1; fl=np.where(i>=0,bf[np.clip(i,0,None)],0).astype(bool)
    b=stats(port(T)); g=stats(port(T[~fl].reset_index(drop=True)))
    rng=np.random.default_rng(1); rs=[stats(port(T.drop(rng.choice(len(T),fl.sum(),replace=False)).reset_index(drop=True)))['ann'] for _ in range(200)]
    for nm,s,n in ((f'{v} kapısız',b,0),(f'{v} kapılı',g,int(fl.sum()))):
        L.append(f'| {nm} | {n} | {f(s["ann"])} | {f(s["a1"])} / {f(s["a2"])} | {f(s["y12"])} | {s["sh"]:.2f} | {s["s1"]:.2f} / {s["s2"]:.2f} | {f(s["dd"])} | {"" if not n else f(np.median(rs))+" / "+f(np.quantile(rs,.95))} |')
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
