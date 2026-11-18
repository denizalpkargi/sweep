# Test #89 (16 Ekim 2026; kullanıcının 5 fikri, 2): spot ile perp taker akışı ayrışması.
# Önceden sabit: evren ayın ilk 30'u (TradFi hariç) ve spot 15 dk verisi olanlar. Her 4 saatte bir (00/04/…/20 UTC)
# D = perp 24 sa taker alış payı − spot 24 sa taker alış payı (nominal, 96 mum). Kesitsel beşte bir: en yüksek D (perp kaldıraçla alıyor,
# spot almıyor) short, en düşük D (spot alıyor) long; 24 sa tut. Giriş sonraki 15 dk mumun VWAP'ı, çıkış 96 mum sonrakinin VWAP'ı,
# 2 × %0,08 + fonlama, basit getiri. Karşılaştırma: aynı anda tüm coinlerin ortalaması (rastgele seçim beklentisi). Ayrıca r24 işaretine göre.
# t: günde yalnız 00 UTC sinyalleri (örtüşmesiz), bacak − ortalama farkı. Geçme: iki yarı ve son 12 ay artı, t ≥ 3.
import json, os, numpy as np, pandas as pd
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test89-spot-perp-report.md')
U=json.load(open(f'{A}/universe.json')); TF=set(U['tradfi']); M15=900000; SIDE=0.0008
top={m:set([s for s in v if s not in TF][:30]) for m,v in U['months'].items()}
syms=sorted(set(s for v in top.values() for s in v))
def ld(p):
    k=pd.read_csv(p,header=None,usecols=[0,2,3,7,10],names=['t','h','l','q','qb']); k=k.drop_duplicates('t').set_index('t'); return k
rows=[]
for s in syms:
    pp,ps,pf=f'{A}/15m/{s}.csv',f'{A}/spot15m/{s}.csv',f'{A}/funding/{s}.csv'
    if not(os.path.exists(pp) and os.path.exists(ps)): continue
    p=ld(pp); q=ld(ps); v=pd.read_csv(pp,header=None,usecols=[0,5,4],names=['t','c','v']).drop_duplicates('t').set_index('t')
    idx=pd.RangeIndex(max(p.index[0],q.index[0]),p.index[-1]+M15,M15)
    p=p.reindex(idx); q=q.reindex(idx); v=v.reindex(idx)
    vw=(p.q/v.v).clip(p.l,p.h).where(v.v>0)
    tp=p.qb.rolling(96,min_periods=90).sum()/p.q.rolling(96,min_periods=90).sum()
    ts=q.qb.rolling(96,min_periods=90).sum()/q.q.rolling(96,min_periods=90).sum()
    D=tp-ts; c=v.c; r24=c/c.shift(96)-1
    if os.path.exists(pf):
        f=pd.read_csv(pf,header=None,names=['t','r']); fs=pd.Series(f.r.values,index=f.t.values).sort_index(); cf=fs.cumsum()
    else: cf=None
    t=idx.values; sel=np.where(((t+M15)%(4*3600000))==0)[0]  # sinyal: 4 sa sınırında kapanan mumdan sonra
    vwv=vw.values
    for i in sel:
        j=i+1; x=i+97
        if x>=len(t): break
        mo=pd.Timestamp(int(t[j]),unit='ms').strftime('%Y-%m')
        if s not in top.get(mo,()): continue
        if not(np.isfinite(D.values[i]) and vwv[j]>0 and vwv[x]>0): continue
        g=vwv[x]/vwv[j]-1; fu=0.0
        if cf is not None:
            a,b=cf.index.searchsorted(t[j]),cf.index.searchsorted(t[x]); fu=(cf.values[b-1]-(cf.values[a-1] if a>0 else 0)) if b>a else 0.0
        rows.append((int(t[i]+M15),s,D.values[i],r24.values[i],g,fu))
df=pd.DataFrame(rows,columns=['t','s','D','r24','g','fu'])
df['n']=df.groupby('t').s.transform('count'); df=df[df.n>=15].copy()
df['qd']=df.groupby('t').D.rank(pct=True); df['m']=df.groupby('t').g.transform('mean')
df['L']=df.g-df.fu-2*SIDE; df['S']=-df.g+df.fu-2*SIDE  # long / short net
df['day']=pd.to_datetime(df.t,unit='ms').dt.floor('D'); df['h0']=pd.to_datetime(df.t,unit='ms').dt.hour==0
T0,T1=df.t.min(),df.t.max(); mid=(T0+T1)/2; l12=T1-365*86400000
ic=df.groupby('t').apply(lambda z: z.D.rank().corr(z.g.rank())); 
def per(sub,col):
    a=sub.groupby('t')[col].mean(); b=sub.groupby('t').m.mean(); return a,b
def line(name,mask_long,mask_short):
    out=[]
    for lab,mk,col,sg in [('long (düşük D)',mask_long,'L',1),('short (yüksek D)',mask_short,'S',-1)]:
        z=df[mk]; a=z.groupby('t')[col].mean(); ex=(z.groupby('t').g.mean()-z.groupby('t').m.mean())*sg
        h0=z[z.h0].groupby('day').apply(lambda w:(w.g.mean()-w.m.mean())*sg)
        tt=h0.mean()/h0.std()*np.sqrt(len(h0)) if len(h0)>2 else np.nan
        tix=a.index.values
        f=lambda m:f'{a[m].mean()*100:+.2f}'
        out.append(f'| {name} | {lab} | {len(z)} | {a.mean()*100:+.2f} | {ex.mean()*100:+.2f} | {tt:.1f} | {f(tix<mid)} / {f(tix>=mid)} | {f(tix>=l12)} |')
    return out
L=[]
L.append('# Test #89 · spot ile perp taker akışı ayrışması (16 Ekim 2026)\n')
L.append(f'Dönem {pd.Timestamp(T0,unit="ms"):%Y-%m-%d} → {pd.Timestamp(T1,unit="ms"):%Y-%m-%d}, {df.s.nunique()} coin, {df.t.nunique()} sinyal anı (4 sa), 24 sa tutuş, VWAP, 2 × %0,08 + fonlama, basit getiri.\n')
L.append(f'Kesitsel sıra IC (D ↔ sonraki 24 sa getiri): ort. {ic.mean():+.4f}, ilk yarı {ic[ic.index<mid].mean():+.4f}, ikinci yarı {ic[ic.index>=mid].mean():+.4f}, son 12 ay {ic[ic.index>=l12].mean():+.4f}. Önceden beklenen işaret eksi.\n')
L.append('| Koşul | Bacak | n | net % / işlem | ortalamadan fark % (brüt) | t (00 UTC, gün) | yarılar net % | son 12 ay net % |\n|---|---|---|---|---|---|---|---|')
L+=line('tümü',df.qd<=0.2,df.qd>=0.8)
L+=line('r24 < 0',(df.qd<=0.2)&(df.r24<0),(df.qd>=0.8)&(df.r24<0))
L+=line('r24 > 0',(df.qd<=0.2)&(df.r24>0),(df.qd>=0.8)&(df.r24>0))
z=df.groupby('t').agg(L=('L','mean'),S=('S','mean')); L.append(f'\nTaban (tüm coinler, aynı anlar): long net {z.L.mean()*100:+.2f} %, short net {z.S.mean()*100:+.2f} %.\n')
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
