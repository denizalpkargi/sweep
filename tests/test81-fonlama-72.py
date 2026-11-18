# Test #81 (16 Ekim 2026, 24–72 sa odağı): aşırı fonlama → 72 sa dönüş.
# Önceden sabit: evren giriş ayının ilk 30 coini (TradFi hariç); sinyal gün D kapanışında son 3 günün fonlama toplamı (9 kayıt);
# coinler arası sıralama: en yüksek beşte bir short (kalabalık long), en düşük beşte bir long; bacak başına özkaynağın %50'si, eşit ağırlık.
# Giriş D+1 açılışı, çıkış D+3 kapanışı (72 sa); 3 kaydırmalı alt portföy (her gün üçte biri yenilenir) ortalaması.
# Ayrıca mutlak eşik: 3 günlük toplam > %0,15 (≈ 8 saatte %0,05) olan coinler short, eşit ağırlık, yalnız short bacağı.
# Maliyet ağırlık değişimi × %0,08, fonlama arşivden (long öder, short alır), basit getiri. Kıyas rastgele (40 tohum).
# Geçme: iki yarı ve son 12 ay net artı ve rastgeleden iyi, tüm dönem t ≥ 3 (#72).  → tests/test81-fonlama-72-report.md
import json, os, numpy as np, pandas as pd, time
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test81-fonlama-72-report.md'); DAY=86400000
U=json.load(open(f'{A}/universe.json')); TF=set(U['tradfi'])
top={m:[s for s in v if s not in TF][:30] for m,v in U['months'].items()}
syms=sorted(set(s for v in top.values() for s in v))
def rd(p,cols):
    if not os.path.exists(p): return None
    return pd.read_csv(p,header=None,usecols=range(len(cols)),names=cols)
O,C,FR={},{},{}
for s in syms:
    d=rd(f'{A}/1d/{s}.csv',['t','o','h','l','c','v','ct','q']); f=rd(f'{A}/funding/{s}.csv',['t','r'])
    if d is None or f is None: continue
    d=d[d.q>0]; O[s]=pd.Series(d.o.values,index=d.t.values); C[s]=pd.Series(d.c.values,index=d.t.values)
    f['d']=(f.t//DAY)*DAY; FR[s]=f.groupby('d').r.sum()
O=pd.DataFrame(O).sort_index(); C=pd.DataFrame(C).reindex(O.index); FRd=pd.DataFrame(FR).reindex(O.index)
F3=FRd.rolling(3,min_periods=3).sum(); FRd=FRd.fillna(0)
days=O.index.values; mk=lambda t: pd.to_datetime(t,unit='ms').strftime('%Y-%m'); COST=0.0008; HOLD=3
START=int(pd.Timestamp('2020-06-01').value//10**6)
def run(mode,off,rng=None):
    rows=[]; wo=pd.Series(dtype=float); i=int(np.searchsorted(days,START))+off
    while i+HOLD<len(days):
        D=days[i]; e=days[i+1]; x=days[i+HOLD]
        u=[s for s in top.get(mk(e),[]) if s in F3.columns]
        sig=F3.loc[D,u]; ok=sig.notna()&O.loc[e,u].notna()&C.loc[x,u].notna(); sig=sig[ok]
        if len(sig)<15: i+=HOLD; continue
        ret=C.loc[x,sig.index]/O.loc[e,sig.index]-1; fund=FRd.loc[e:x,sig.index].sum()
        W={}
        if mode=='LS':
            k=max(1,len(sig)//5)
            if rng is None: srt=sig.sort_values(); L=list(srt.index[:k]); S=list(srt.index[-k:])
            else: p=list(rng.permutation(sig.index)); L=p[:k]; S=p[k:2*k]
            for s in L: W[s]=0.5/k
            for s in S: W[s]=W.get(s,0)-0.5/k
        else:
            S=list(sig.index[sig>0.0015])
            if rng is not None and S: S=list(rng.choice(sig.index,len(S),replace=False))
            for s in S: W[s]=-1/len(S)*0.5 if S else 0
        w=pd.Series(W,dtype=float); idx=sorted(set(w.index)|set(wo.index))
        turn=(w.reindex(idx).fillna(0)-wo.reindex(idx).fillna(0)).abs().sum(); wo=w
        g=float((w*(ret[w.index]-np.sign(w)*fund[w.index])).sum()) if len(w) else 0.0
        lg=float((w[w>0]*(ret[w[w>0].index]-fund[w[w>0].index])).sum()) if (w>0).any() else 0.0
        rows.append(dict(t=e,net=g-turn*COST,L=lg,S=g-lg,c=turn*COST,n=len(w),worst=float((np.sign(w)*ret[w.index]).min()) if len(w) else 0))
        i+=HOLD
    return pd.DataFrame(rows)
def comb(mode,rng=None):
    R=[run(mode,o,rng).assign(o=o) for o in range(HOLD)]; R=pd.concat(R); R['net']=R.net/HOLD; R['L']=R.L/HOLD; R['S']=R.S/HOLD
    return R.groupby('t')[['net','L','S','c']].sum().reset_index().sort_values('t')
fx=lambda v,k=3: (f'{v:+.{k}f}').replace('.',',') if np.isfinite(v) else '–'
L=[f'# Test #81 · Aşırı fonlama → 72 sa · {time.strftime("%Y-%m-%d")}','','Ayın ilk 30 coini; 3 günlük fonlama toplamı; 72 sa tutuş, 3 kaydırmalı alt portföy; maliyet %0,08 × ağırlık değişimi + fonlama; günlük net % (özkaynağa göre).','']
ok={}
for mode,ad in [('LS','L−S beşte birler'),('ABS','mutlak eşik short (> %0,15 / 3 gün)')]:
    R=comb(mode); R['dt']=pd.to_datetime(R.t,unit='ms'); rnd=pd.concat([comb(mode,np.random.default_rng(sd)) for sd in range(10)])
    mid=R.t.iloc[len(R)//2]; y12=R.t.iloc[-1]-365*DAY; tt=lambda x: x.mean()/x.std()*np.sqrt(len(x))
    L+=[f'## {ad}','','| dönem | gün | net % / gün | t | long bacağı | short bacağı | maliyet | rastgele net |','|---|---:|---:|---:|---:|---:|---:|---:|']
    res=[]
    for pn,f in [('tümü',lambda x:x.t>0),('1. yarı',lambda x:x.t<mid),('2. yarı',lambda x:x.t>=mid),('son 12 ay',lambda x:x.t>=y12)]:
        r=R[f(R)]; q=rnd[f(rnd)]; res.append((r.net.mean(),tt(r.net),q.net.mean()))
        L.append(f'| {pn} | {len(r)} | {fx(r.net.mean()*100)} | {fx(tt(r.net),1)} | {fx(r.L.mean()*100)} | {fx(r.S.mean()*100)} | {fx(r.c.mean()*100)} | {fx(q.net.mean()*100)} |')
    yr=R.groupby(R.dt.dt.year).net.mean()*100; eq=(1+R.net).cumprod()
    L+=['','Yıl yıl net %/gün: '+' · '.join(f'{y} {fx(v)}' for y,v in yr.items()),f'Bileşik {fx((eq.iloc[-1]-1)*100,0)} %, en büyük düşüş {fx((eq/eq.cummax()-1).min()*100,0)} %.','']
    ok[ad]=all(m>0 and m>rm for m,t,rm in res[1:]) and res[0][1]>=3
L+=['## Sonuç','','Geçme: '+', '.join(f'{k} **{"geçti" if v else "geçmedi"}**' for k,v in ok.items())+'.']
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
