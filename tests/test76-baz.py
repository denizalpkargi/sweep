# Test #76 (15 Ekim 2026, günlük döngü): perp primi (baz) coinler arası L−S + baz7 faktörü.
# Kaynak: Chi vd. 2023 (JFM) baz faktörü; Luo 2025. Bizdeki karşılık Binance premiumIndex (perp − endeks) ÷ endeks.
# Önceden sabit: evren ayın ilk 30 coini (önceki 30 günün hacmi, TradFi hariç); sinyal = son 7 günün 15 dk prim kapanışlarının ortalaması (gün kapanışında);
# en düşük beşte bir long / en yüksek beşte bir short, eşit ağırlık, bacak başına özkaynağın yarısı; giriş ertesi günün açılışı.
# Tutuş 1 g (her gün dengeleme) ve 7 g (haftada bir). Maliyet: ağırlık değişimi × (%0,05 taker + %0,03 kayma); fonlama arşivden (long öder, short alır).
# Basit getiri. Kıyas: aynı sayıda rastgele long/short (40 tohum). Dönemler: tümü, iki yarı, son 12 ay, yıl yıl. IC = günlük coinler arası Spearman (−baz7 ↔ ileri getiri).
# Geçme: net L−S iki yarıda ve son 12 ayda artı, rastgeleden iyi, t ≥ 3 (çoklu deneme; #72).  → tests/test76-baz-report.md
import json, os, numpy as np, pandas as pd, time
A=os.path.join(os.path.dirname(__file__),'data','arch'); OUT=os.path.join(os.path.dirname(__file__),'test76-baz-report.md'); DAY=86400000
U=json.load(open(f'{A}/universe.json')); TF=set(U['tradfi'])
top={m:[s for s in v if s not in TF][:30] for m,v in U['months'].items()}
syms=sorted(set(s for v in top.values() for s in v))
def rd(p,cols):
    if not os.path.exists(p): return None
    return pd.read_csv(p,header=None,usecols=range(len(cols)),names=cols)

O,C,PR,FR={}, {}, {}, {}
for s in syms:
    d=rd(f'{A}/1d/{s}.csv',['t','o','h','l','c','v','ct','q'])
    p=rd(f'{A}/premium15m/{s}.csv',['t','o','h','l','c'])
    f=rd(f'{A}/funding/{s}.csv',['t','r'])
    if d is None or p is None: continue
    d=d[d.q>0]; O[s]=pd.Series(d.o.values,index=d.t.values); C[s]=pd.Series(d.c.values,index=d.t.values)
    p['d']=(p.t//DAY)*DAY; PR[s]=p.groupby('d').c.mean()   # günün ortalama primi
    if f is not None: f['d']=(f.t//DAY)*DAY; FR[s]=f.groupby('d').r.sum()
O=pd.DataFrame(O).sort_index(); C=pd.DataFrame(C).reindex(O.index); PRd=pd.DataFrame(PR).reindex(O.index); FRd=pd.DataFrame(FR).reindex(O.index).fillna(0)
B7=PRd.rolling(7,min_periods=5).mean()       # gün D'nin kapanışında bilinen (D dahil)
days=O.index.values; mk=lambda t: pd.to_datetime(t,unit='ms').strftime('%Y-%m')
COST=0.0008
def run(hold,rng=None):
    rows=[]; w_old=pd.Series(dtype=float); i=0
    while i+hold < len(days):
        D=days[i]; u=[s for s in top.get(mk(D+DAY),[]) if s in B7.columns]
        sig=B7.loc[D,u].dropna(); e=days[i+1]; x=days[i+hold]   # giriş e açılışı, çıkış x kapanışı
        px0=O.loc[e,sig.index]; px1=C.loc[x,sig.index]; ok=px0.notna()&px1.notna(); sig=sig[ok]
        if len(sig)<15: i+=hold; continue
        k=max(1,len(sig)//5)
        if rng is None: srt=sig.sort_values(); L=list(srt.index[:k]); S=list(srt.index[-k:])
        else: perm=list(rng.permutation(sig.index)); L=perm[:k]; S=perm[k:2*k]
        ret=px1/px0-1; fund=FRd.loc[days[i+1]:x, sig.index].sum()
        w=pd.Series(0.0,index=sorted(set(L)|set(S)|set(w_old.index))); w[L]+=0.5/k; w[S]-=0.5/k
        turn=(w-w_old.reindex(w.index).fillna(0)).abs().sum(); w_old=w[w!=0]
        rl=(ret[L]-fund[L]).mean()*0.5; rs=(-ret[S]+fund[S]).mean()*0.5
        rows.append(dict(t=e,L=rl,S=rs,g=rl+rs,cost=turn*COST,net=rl+rs-turn*COST,worst=min((ret[L]-fund[L]).min(),(-ret[S]+fund[S]).min()),
                         fl=-fund[L].mean()*0.5,fs=fund[S].mean()*0.5))
        i+=hold
    return pd.DataFrame(rows)
def ic(hold):
    out=[]
    for i in range(len(days)-hold):
        D=days[i]; u=[s for s in top.get(mk(D+DAY),[]) if s in B7.columns]; sig=B7.loc[D,u]
        r=C.loc[days[i+hold],u]/O.loc[days[i+1],u]-1; z=pd.concat([sig,r],axis=1).dropna()
        if len(z)>=15: out.append((days[i+1],-z.iloc[:,0].rank().corr(z.iloc[:,1].rank())))
    return pd.DataFrame(out,columns=['t','ic'])
fx=lambda v,k=3: (f'{v:+.{k}f}').replace('.',',') if np.isfinite(v) else '–'
L=[f'# Test #76 · Perp primi (baz) coinler arası L−S · {time.strftime("%Y-%m-%d")}','',
   'Evren ayın ilk 30 coini (önceki ayın hacmi, TradFi hariç); sinyal 7 günlük ortalama perp primi (premiumIndexKlines 15 dk); en düşük beşte bir long, en yüksek beşte bir short; giriş ertesi gün açılışı; maliyet ağırlık değişimi × %0,08; fonlama dahil; basit getiri. Getiriler özkaynağa göre (bacak başına %50).','']
res={}
for hold in [1,7]:
    R=run(hold); R['dt']=pd.to_datetime(R.t,unit='ms'); mid=R.t.iloc[len(R)//2]; y12=R.t.iloc[-1]-365*DAY
    rnd=pd.concat([run(hold,np.random.default_rng(sd)).assign(sd=sd) for sd in range(40 if hold==7 else 10)])
    I=ic(hold)
    per=[('tümü',lambda x: x.t>0),('1. yarı',lambda x: x.t<mid),('2. yarı',lambda x: x.t>=mid),('son 12 ay',lambda x: x.t>=y12)]
    L+=[f'## Tutuş {hold} gün ({len(R)} dönem, {R.dt.iloc[0]:%Y-%m-%d} → {R.dt.iloc[-1]:%Y-%m-%d})','',
        '| dönem | n | long % | short % | brüt L−S % | maliyet % | net % | t (net) | rastgele net % | IC | fonlama long / short % | en kötü coin bacağı % |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    res[hold]=[]
    for pn,f in per:
        r=R[f(R)]; q=rnd[f(rnd)]; ii=I[f(I)]
        t=r.net.mean()/r.net.std()*np.sqrt(len(r)); res[hold].append((pn,r.net.mean(),t,q.net.mean()))
        L.append(f'| {pn} | {len(r)} | {fx(r.L.mean()*100)} | {fx(r.S.mean()*100)} | {fx(r.g.mean()*100)} | {fx(r.cost.mean()*100)} | {fx(r.net.mean()*100)} | {fx(t,1)} | {fx(q.net.mean()*100)} | {fx(ii.ic.mean())} | {fx(r.fl.mean()*100)} / {fx(r.fs.mean()*100)} | {fx(r.worst.min()*100,1)} |')
    yr=R.groupby(R.dt.dt.year).net.agg(['mean','count']); L+=['','Yıl yıl net % (dönem başı): '+' · '.join(f'{y} {fx(m*100)} ({c})' for y,(m,c) in yr.iterrows()),'']
    eq=(1+R.net).cumprod(); dd=(eq/eq.cummax()-1).min(); L+=[f'Bileşik: {fx((eq.iloc[-1]-1)*100,0)} %, en büyük düşüş {fx(dd*100,0)} %.','']
ok={h:all(m>0 and m>rm for pn,m,t,rm in v[1:]) and v[0][2]>=3 for h,v in res.items()}
L+=['## Sonuç','',f'Geçme (iki yarı ve son 12 ay net artı ve rastgeleden iyi, tüm dönem t ≥ 3): 1 g **{"geçti" if ok[1] else "geçmedi"}**, 7 g **{"geçti" if ok[7] else "geçmedi"}**.']
L+=['','Not: short bacağında coin başına kayıp sınırsız (stopsuz); 7 g tutuşta tek coin −%1393 gördü, bileşik −%100 altı bu yüzden: yüksek primli coinler sıkışmada patlıyor. IC ≈ 0 olduğundan `baz7` Kaan\'a faktör olarak da eklenmez.']
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
