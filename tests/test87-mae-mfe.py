# Test #87 (16 Ekim 2026; kullanıcının listesi "MAE/MFE analizi"): masanın giriş kararlarında en kötü / en iyi gidiş ve stop–hedef ızgarası.
# Veri: masa arşivi örnekleri (tests/data/arch/samples-*.jsonl, 16 Ekim yeniden üretildi) + 15 dk arşivi. Kararlar: veto yok, puan ≥ 0,35, evet ≥ 3.
# Giriş karar mumunun kapanışı (simBot ile aynı) + %0,03 kayma; yol 96 mum (24 sa). Birim: plan stop uzaklığı sd (bugünkü stop = 1 sd).
# Izgara (önceden sabit): stop k ∈ {0,5; 1; 1,5; 2; 3} sd, hedef m ∈ {1; 2; 3; 5; yok} sd, zaman 8 / 24 sa; aynı mumda stop ve hedef → stop.
# Maliyet 2 × %0,08 (R'ye çevrilir), fonlama yok (≤ 24 sa, iki yön; ihmal). Seçim yalnız 1. yarıda; 2. yarı ve son 12 ay sınav.
# Karşılaştırma: arşivdeki bot R'si (bugünkü plan: 1,5R'de yarı + stop girişe, koşucu, 8 sa zaman stopu).
import json, os, glob, numpy as np, pandas as pd, time
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test87-mae-mfe-report.md'); DAY=86400000; M15=900000
S=[]
for f in sorted(glob.glob(f'{A}/samples-*.jsonl')):
    for l in open(f):
        x=json.loads(l)
        if x['veto']==0 and x['score'] is not None and x['sd'] and x['score']>=0.35 and x['yes']>=3: S.append((x['sym'],x['t'],1 if x['dir']=='long' else -1,x['sd'],x['R']))
S=pd.DataFrame(S,columns=['s','t','d','sd','Rbot']); print('karar',len(S),flush=True)
KS=[0.5,1,1.5,2,3]; MS=[1,2,3,5,None]; HZ=[32,96]; SL=0.0003; C2=0.0016
rows=[]
for s,g in S.groupby('s'):
    p=f'{A}/15m/{s}.csv'
    if not os.path.exists(p): continue
    k=pd.read_csv(p,header=None,usecols=[0,1,2,3,4],names=['t','o','h','l','c']); ti={t:i for i,t in enumerate(k.t.values)}
    O,Hh,Ll,Cc=k.o.values,k.h.values,k.l.values,k.c.values
    for r in g.itertuples():
        i=ti.get(r.t)
        if i is None or i+97>=len(Cc): continue
        e=Cc[i]*(1+r.d*SL); sd=r.sd
        hi=Hh[i+1:i+97]; lo=Ll[i+1:i+97]; cl=Cc[i+1:i+97]
        fav=((hi/e-1) if r.d>0 else (1-lo/e))/sd; adv=((1-lo/e) if r.d>0 else (hi/e-1))/sd   # mum içi en iyi / en kötü (sd biriminde)
        mfe=np.maximum.accumulate(fav); mae=np.maximum.accumulate(adv); end24=r.d*(cl[-1]/e-1)/sd
        out=dict(s=s,t=r.t,d=r.d,sd=sd,Rbot=r.Rbot,mae=mae[-1],mfe=mfe[-1],end24=end24,cost=C2/sd)
        for hz in HZ:
            for kk in KS:
                st=np.where(adv[:hz]>=kk)[0]; s0=st[0] if len(st) else 10**9
                for m in MS:
                    if m is None: tg=10**9
                    else: tt=np.where(fav[:hz]>=m)[0]; tg=tt[0] if len(tt) else 10**9
                    if s0<=tg and s0<10**9: R=-kk
                    elif tg<10**9: R=m
                    else: R=r.d*(cl[hz-1]/e-1)/sd
                    out[f'{hz}_{kk}_{m}']=R-C2/sd
        rows.append(out)
D=pd.DataFrame(rows).sort_values('t'); mid=D.t.iloc[len(D)//2]; y12=D.t.max()-365*DAY
h1,h2,y1=D[D.t<mid],D[D.t>=mid],D[D.t>=y12]
fx=lambda v,k=3: (f'{v:+.{k}f}').replace('.',',') if np.isfinite(v) else '–'
win=D.end24>0
L=[f'# Test #87 · Masa kararlarında MAE / MFE ve stop–hedef ızgarası · {time.strftime("%Y-%m-%d")}','',
   f'{len(D)} karar (veto yok, puan ≥ 0,35, evet ≥ 3), 2020-06 → 2026-10; birim plan stop uzaklığı sd (medyan %{D.sd.median()*100:.2f}); maliyet R cinsinden ort. {fx(D.cost.mean(),3)} sd.','',
   '## Gidiş dağılımı (24 sa)','','| | n | MAE medyan | MAE %75 | MAE %90 | MFE medyan | MFE %75 |','|---|---:|---:|---:|---:|---:|---:|']
for ad,x in [('24 sa sonunda kârda',D[win]),('24 sa sonunda zararda',D[~win]),('hepsi',D)]:
    L.append(f'| {ad} | {len(x)} | {x.mae.median():.2f} | {x.mae.quantile(.75):.2f} | {x.mae.quantile(.9):.2f} | {x.mfe.median():.2f} | {x.mfe.quantile(.75):.2f} |'.replace('.',','))
cols=[c for c in D.columns if c.count('_')==2]
sc=pd.DataFrame({c:[h1[c].mean(),h2[c].mean(),y1[c].mean(),D[c].mean()] for c in cols},index=['h1','h2','y1','all']).T.sort_values('h1',ascending=False)
L+=['','## Izgara: 1. yarıda en iyi 10 (sınav 2. yarı ve son 12 ay)','','| zaman | stop (sd) | hedef (sd) | 1. yarı R | 2. yarı R | son 12 ay R | tümü |','|---:|---:|---:|---:|---:|---:|---:|']
for c,r in sc.head(10).iterrows():
    hz,kk,m=c.split('_'); L.append(f'| {int(hz)//4} sa | {kk} | {m if m!="None" else "yok"} | {fx(r.h1)} | {fx(r.h2)} | {fx(r.y1)} | {fx(r["all"])} |')
best=sc.index[0]; cur='32_1_None'
L+=['',f'Bugünkü stop (1 sd), hedefsiz, 8 sa: 1. yarı {fx(sc.loc[cur,"h1"])}, 2. yarı {fx(sc.loc[cur,"h2"])}, son 12 ay {fx(sc.loc[cur,"y1"])}. Arşivdeki bot R (bugünkü tam plan): {fx(h1.Rbot.mean())} / {fx(h2.Rbot.mean())} / {fx(y1.Rbot.mean())}.',
    f'2. yarıda ızgaranın en iyisi (sonradan bakılmış, sınav değil): {sc.h2.idxmax()} → {fx(sc.h2.max())}; ızgarada 2. yarıda artı hücre {(sc.h2>0).sum()}/{len(sc)}.']
ok=sc.loc[best,'h2']>0 and sc.loc[best,'y1']>0
L+=['','## Sonuç','',f'1. yarının en iyisi ({best}) sınavda **{"artı" if ok else "artı değil"}**: 2. yarı {fx(sc.loc[best,"h2"])}, son 12 ay {fx(sc.loc[best,"y1"])}.']
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
