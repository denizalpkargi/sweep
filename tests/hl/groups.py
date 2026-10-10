import json, numpy as np, random, datetime
rows=[json.loads(l) for l in open('pf.jsonl')]
DAY=86400000
def ts_(y,m,d): return int(datetime.datetime(y,m,d,tzinfo=datetime.UTC).timestamp()*1000)
CUTS=[ts_(2026,6,1),ts_(2026,7,1),ts_(2026,8,1),ts_(2026,9,1),ts_(2026,10,1)]
def ip(ts,v,t):
    if len(ts)<2 or t<ts[0] or t>ts[-1]+9*DAY: return None
    return float(np.interp(t,ts,v))
acc={}
for r in rows:
    pf=r['pf'].get('perpAllTime')
    if not pf: continue
    acc[r['u']]=(np.array([p[0] for p in pf['pnlHistory']]),np.array([float(p[1]) for p in pf['pnlHistory']]),
                 np.array([p[0] for p in pf['accountValueHistory']]),np.array([float(p[1]) for p in pf['accountValueHistory']]))
G={}
random.seed(1)
for C in CUTS:
    st=[]
    for u,(t,p,ta,a) in acc.items():
        e=[C-90*DAY,C-60*DAY,C-30*DAY,C]
        pv=[ip(t,p,x) for x in e]; av=[ip(ta,a,x) for x in e]
        if None in pv or None in av: continue
        if av[3]<10000 or av[0]<1000: continue
        m=[pv[i+1]-pv[i] for i in range(3)]
        if all(x==0 for x in m): continue
        roi=sum(m[i]/max(av[i],1000) for i in range(3))
        st.append((u,roi,sum(x>0 for x in m),sum(x<0 for x in m),av[3]))
    rs=sorted(st,key=lambda x:x[1]); n=len(rs)
    good=[x for x in rs[int(.8*n):] if x[2]>=2][::-1][:150]
    bad=[x for x in rs[:int(.2*n)] if x[3]>=2][:150]
    big=sorted(st,key=lambda x:-x[4])[:100]
    small=random.sample([x for x in st if x[4]<30000],min(150,sum(x[4]<30000 for x in st)))
    G[C]={'good':[x[0] for x in good],'bad':[x[0] for x in bad],'big':[x[0] for x in big],'small':[x[0] for x in small],'n':n}
    print(datetime.datetime.fromtimestamp(C/1000,datetime.UTC).date(),n,len(good),len(bad),len(big),len(small))
U=set()
for g in G.values():
    for k in ('good','bad','big','small'): U|=set(g[k])
print('union',len(U))
json.dump({str(k):v for k,v in G.items()},open('groups.json','w'))
# order: good+bad first (core #38), then big, small
order=[]
for k in ('good','bad','big','small'):
    for g in G.values():
        for u in g[k]:
            if u not in order: order.append(u)
json.dump(order,open('users.json','w'))
