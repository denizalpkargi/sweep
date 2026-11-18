# Test #92 (16 Ekim 2026; kullanıcının 5 fikri, 5): çıkışı fonlama saatine göre ayarlamak.
# Önceden sabit: masa kararları (giriş kapısını geçen), 24 sa tutuş (bugünkü long planı), giriş sonraki 1 sa mumun VWAP'ı.
# Taban: 24 sa sonra VWAP'ta çık. Kural: planlanan çıkıştan önceki son 4 saatte bir fonlama ödemesi varsa ve bir önceki fonlama oranı
# pozisyonun aleyhineyse (long için > 0, short için < 0) ödemeden önceki saatin VWAP'ında çık. Fark R = (kural − taban) ÷ plan stopu (sd).
import os, glob, json, numpy as np, pandas as pd, importlib.util
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test92-fonlama-cikis-report.md'); HR=3600000; DAY=86400000; SIDE=0.0008
sd={}; rows=[]
for p in sorted(glob.glob(f'{A}/samples-*.jsonl')):
    for l in open(p):
        d=json.loads(l)
        if d.get('veto') or d.get('score') is None or not d.get('sd'): continue
        if d['score']>=0.35 and d['yes']>=3: rows.append((d['t'],d['sym'],1 if d['dir']=='long' else -1,d['sd']))
df=pd.DataFrame(rows,columns=['t','s','d','sd']); out=[]
for s,z in df.groupby('s'):
    ph,pf=f'{A}/1h/{s}.csv',f'{A}/funding/{s}.csv'
    if not(os.path.exists(ph) and os.path.exists(pf)): continue
    k=pd.read_csv(ph,header=None,usecols=[0,2,3,5,7],names=['t','h','l','v','q']).drop_duplicates('t').set_index('t')
    k=k.reindex(pd.RangeIndex(k.index[0],k.index[-1]+HR,HR)); vw=((k.q/k.v).clip(k.l,k.h)).where(k.v>0).values; t0=k.index[0]
    f=pd.read_csv(pf,header=None,names=['t','r']).drop_duplicates('t').sort_values('t'); ft=f.t.values; fr=f.r.values; cf=np.cumsum(fr)
    def fund(a,b):
        i,j=np.searchsorted(ft,a),np.searchsorted(ft,b); return (cf[j-1]-(cf[i-1] if i>0 else 0)) if j>i else 0.0
    for t,dd,sdv in zip(z.t.values,z.d.values,z.sd.values):
        j=int((t//HR+1)*HR-t0)//HR; x=j+24
        if j<0 or x>=len(vw) or not(vw[j]>0 and vw[x]>0): continue
        T1=t0+j*HR; TX=t0+x*HR
        base=dd*(vw[x]/vw[j]-1)-dd*fund(T1,TX)
        m=(ft>TX-4*HR)&(ft<=TX); alt=base; act=0
        if m.any():
            i=np.where(m)[0][-1]; prev=fr[i-1] if i>0 else 0
            if dd*prev>0:
                xe=int((ft[i]-t0)//HR)-1
                if xe>j and vw[xe]>0: alt=dd*(vw[xe]/vw[j]-1)-dd*fund(T1,t0+xe*HR); act=1
        out.append((t,s,dd,sdv,base/sdv,alt/sdv,act))
r=pd.DataFrame(out,columns=['t','s','d','sd','b','a','act']); r['g']=r.a-r.b
mid=(r.t.min()+r.t.max())/2; l12=r.t.max()-365*DAY
def ln(nm,m):
    z=r[m]; a=z[z.act==1]; tt=a.g.mean()/a.g.std()*np.sqrt(len(a)) if len(a)>2 else np.nan
    return f'| {nm} | {len(z)} | {z.act.mean()*100:.0f} % | {z.b.mean():+.4f} | {z.a.mean():+.4f} | {z.g.mean():+.4f} | {a.g.mean():+.4f} ({tt:.1f}) |'
L=['# Test #92 · çıkışı fonlama saatine göre ayarlamak (16 Ekim 2026)\n',f'{len(r)} masa kararı, 24 sa tutuş, maliyet hariç (iki kolda aynı).\n',
   '| Küme | n | kural tetiklendi | taban R | kural R | fark R | tetiklenenlerde fark R (t) |\n|---|---|---|---|---|---|---|']
for nm,m in [('tümü',r.t>0),('long',r.d==1),('short',r.d==-1),('ilk yarı',r.t<mid),('ikinci yarı',r.t>=mid),('son 12 ay',r.t>=l12)]: L.append(ln(nm,m))
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
