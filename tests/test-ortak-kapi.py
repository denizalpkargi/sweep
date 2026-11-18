# #90 ve #91 için ortak: masa kararları (giriş kapısını geçen: veto yok, puan ≥ 0,35, evet ≥ 3) ve Kaplumbağa A/F işlemleri,
# bir rejim bayrağına göre (bayrak yalnız geçmiş veriyle) ikiye ayrılıp R kıyası.
import json, os, glob, numpy as np, pandas as pd
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); DAY=86400000
def masa():
    r=[]
    for p in sorted(glob.glob(f'{A}/samples-*.jsonl')):
        for l in open(p):
            d=json.loads(l)
            if d.get('veto') or d.get('score') is None or d.get('R') is None: continue
            if d['score']>=0.35 and d['yes']>=3: r.append((d['t'],d['sym'],d['dir'],d['R']))
    return pd.DataFrame(r,columns=['t','s','dir','R'])
def turtle(v): return pd.read_csv(f'{A}/test80-{v}.csv')
def split(name,t,R,flag,L):
    t=np.asarray(t); R=np.asarray(R); flag=np.asarray(flag,bool); ok=~np.isnan(R)
    t,R,flag=t[ok],R[ok],flag[ok]
    if len(t)==0: return
    mid=(t.min()+t.max())/2; l12=t.max()-365*DAY
    def c(m): 
        a,b=R[m&flag],R[m&~flag]; return f'{a.mean():+.3f} ({len(a)}) / {b.mean():+.3f} ({len(b)})' if len(a) and len(b) else '—'
    a,b=R[flag],R[~flag]; se=np.sqrt(a.var()/max(len(a),1)+b.var()/max(len(b),1))
    L.append(f'| {name} | {c(np.ones(len(t),bool))} | {(a.mean()-b.mean())/se:.1f} | {c(t<mid)} | {c(t>=mid)} | {c(t>=l12)} |')
HEAD='| Küme | bayraklı / bayraksız R (n) | t (fark) | ilk yarı | ikinci yarı | son 12 ay |\n|---|---|---|---|---|---|'
