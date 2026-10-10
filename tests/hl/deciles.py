import json,numpy as np,pandas as pd
exec(open('persist.py').read().split("U=sorted")[0].replace("W=int(sys.argv[1]) if len(sys.argv)>1 else 30","W=30").replace("F=int(sys.argv[2]) if len(sys.argv)>2 else 1","F=1"))
rec=[]
n_e=len(edges)
for (u,i),r in R.items():
    if (u,i+1) in R and A[(u,i)]>=1000 and P[(u,i)]!=0:
        rec.append((i,u,r,R[(u,i+1)],A[(u,i)]))
d=pd.DataFrame(rec,columns=['i','u','x','y','av'])
d['dec']=d.groupby('i')['x'].transform(lambda s: pd.qcut(s.rank(method='first'),10,labels=False))
mid=(d.i.min()+d.i.max())/2
for nm,s in [('ilk yarı',d[d.i<mid]),('ikinci yarı',d[d.i>=mid]),('hepsi',d),('AV>=50k',d[d.av>=5e4])]:
    g=s.groupby('dec')['y'].agg(win=lambda y:(y>0).mean(),med='median',n='size')
    print(nm,len(s)); print((g.T).round(3).to_string())
