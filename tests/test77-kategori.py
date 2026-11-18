# Test #77 (15 Ekim 2026, günlük döngü): kategori momentumu (Luo 2025, 4. bölüm) ↔ coin momentumu.
# Kategori etiketleri tests/kategoriler.json: ayın ilk 50'sine girmiş 437 coin, elle bir kez verildi (CoinGecko buluttan yok), sabit; "Diğer" sıralamaya girmez.
# Önceden sabit: evren giriş ayının ilk 50 coini (önceki 30 günün hacmi, TradFi hariç); 7 günde bir dengeleme, gün D kapanışında sinyal, giriş D+1 açılışı, çıkış D+7 kapanışı.
# Kategori getirisi = üyelerinin (evrende, ≥2 coin) son L günlük basit getirisinin ortalaması, L ∈ {7, 30}.
# Varyantlar: LO = en iyi 3 kategorinin coinleri eşit ağırlık long (1x); LO−EW = LO eksi evrenin eşit ağırlıklı long'u; LS = en iyi 3 ↔ en kötü 3 kategori (bacak %50);
# COIN = coin momentumu L−S (üst/alt beşte bir, #54). Maliyet ağırlık değişimi × %0,08, fonlama arşivden, basit getiri.
# Kıyas: rastgele 3 / 3 kategori (40 tohum). Geçme: iki yarı ve son 12 ay net artı ve rastgeleden iyi, tüm dönem t ≥ 3.  → tests/test77-kategori-report.md
import json, os, numpy as np, pandas as pd, time
H=os.path.dirname(__file__); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test77-kategori-report.md'); DAY=86400000
U=json.load(open(f'{A}/universe.json')); TF=set(U['tradfi']); CAT=json.load(open(os.path.join(H,'kategoriler.json')))
top={m:[s for s in v if s not in TF][:50] for m,v in U['months'].items()}
syms=sorted(set(s for v in top.values() for s in v))
def rd(p,cols):
    if not os.path.exists(p): return None
    return pd.read_csv(p,header=None,usecols=range(len(cols)),names=cols)
O,C,FR={},{},{}
for s in syms:
    d=rd(f'{A}/1d/{s}.csv',['t','o','h','l','c','v','ct','q']); f=rd(f'{A}/funding/{s}.csv',['t','r'])
    if d is None: continue
    d=d[d.q>0]; O[s]=pd.Series(d.o.values,index=d.t.values); C[s]=pd.Series(d.c.values,index=d.t.values)
    if f is not None: f['d']=(f.t//DAY)*DAY; FR[s]=f.groupby('d').r.sum()
O=pd.DataFrame(O).sort_index(); C=pd.DataFrame(C).reindex(O.index); FRd=pd.DataFrame(FR).reindex(O.index).fillna(0)
days=O.index.values; mk=lambda t: pd.to_datetime(t,unit='ms').strftime('%Y-%m'); COST=0.0008; HOLD=7
def book(W,ret,fund,w_old):
    w=pd.Series(W,dtype=float); idx=sorted(set(w.index)|set(w_old.index))
    turn=(w.reindex(idx).fillna(0)-w_old.reindex(idx).fillna(0)).abs().sum()
    g=(w*(ret[w.index]-np.sign(w)*fund[w.index])).sum()   # long fonlama öder, short alır (rate>0)
    return g, turn*COST, w
def run(LB,rng=None):
    rows=[]; wo={k:pd.Series(dtype=float) for k in ['LO','EW','LS','COIN']}; i=LB
    while i+HOLD < len(days):
        D=days[i]; e=days[i+1]; x=days[i+HOLD]
        u=[s for s in top.get(mk(e),[]) if s in C.columns]
        r0=C.loc[D,u]/C.loc[days[i-LB],u]-1; px0=O.loc[e,u]; px1=C.loc[x,u]
        ok=r0.notna()&px0.notna()&px1.notna(); u=[s for s in u if ok[s]]
        if len(u)<30: i+=HOLD; continue
        r0=r0[u]; ret=px1[u]/px0[u]-1; fund=FRd.loc[e:x,u].sum()
        cm={}
        for s in u:
            c=CAT.get(s,'Diğer')
            if c!='Diğer': cm.setdefault(c,[]).append(s)
        cm={c:v for c,v in cm.items() if len(v)>=2}
        if len(cm)<6: i+=HOLD; continue
        cr=pd.Series({c:r0[v].mean() for c,v in cm.items()}).sort_values()
        if rng is None: lo=list(cr.index[:3]); hi=list(cr.index[-3:])
        else: p=list(rng.permutation(cr.index)); lo=p[:3]; hi=p[3:6]
        Lc=[s for c in hi for s in cm[c]]; Sc=[s for c in lo for s in cm[c]]
        res={}
        res['LO']=book({s:1/len(Lc) for s in Lc},ret,fund,wo['LO'])
        res['EW']=book({s:1/len(u) for s in u},ret,fund,wo['EW'])
        W={s:0.5/len(Lc) for s in Lc}
        for s in Sc: W[s]=W.get(s,0)-0.5/len(Sc)
        res['LS']=book(W,ret,fund,wo['LS'])
        k=max(1,len(u)//5); srt=r0.sort_values(); W={s:0.5/k for s in srt.index[-k:]}
        for s in srt.index[:k]: W[s]=-0.5/k
        res['COIN']=book(W,ret,fund,wo['COIN'])
        row=dict(t=e,ncat=len(cm))
        for kk,(g,c,w) in res.items(): row[kk]=g-c; row[kk+'_c']=c; wo[kk]=w
        row['LOEW']=row['LO']-row['EW']; rows.append(row); i+=HOLD
    return pd.DataFrame(rows)
fx=lambda v,k=3: (f'{v:+.{k}f}').replace('.',',') if np.isfinite(v) else '–'
L=[f'# Test #77 · Kategori momentumu · {time.strftime("%Y-%m-%d")}','',
   'Evren giriş ayının ilk 50 coini (TradFi hariç); etiketler `tests/kategoriler.json` (elle, sabit; "Diğer" dışarıda); 7 günde bir dengeleme, giriş ertesi gün açılışı, çıkış 7. gün kapanışı; maliyet ağırlık değişimi × %0,08, fonlama dahil, basit getiri; haftalık net % (özkaynağa göre).','',
   'LO = en iyi 3 kategori long · LO−EW = LO eksi evrenin eşit ağırlıklı long\'u · LS = en iyi 3 ↔ en kötü 3 kategori · COIN = coin momentumu üst/alt beşte bir (#54). Rastgele: kategoriler karıştırılır (40 tohum).','']
verdict={}
for LB in [7,30]:
    R=run(LB); R['dt']=pd.to_datetime(R.t,unit='ms'); mid=R.t.iloc[len(R)//2]; y12=R.t.iloc[-1]-365*DAY
    rnd=pd.concat([run(LB,np.random.default_rng(sd)) for sd in range(40)])
    per=[('tümü',lambda x: x.t>0),('1. yarı',lambda x: x.t<mid),('2. yarı',lambda x: x.t>=mid),('son 12 ay',lambda x: x.t>=y12)]
    L+=[f'## Geriye bakış {LB} gün ({len(R)} hafta, {R.dt.iloc[0]:%Y-%m-%d} → {R.dt.iloc[-1]:%Y-%m-%d}, ort. {R.ncat.mean():.1f} kategori)','',
        '| dönem | n | LO % | EW % | LO−EW % (t) | rastgele LO−EW % | LS % (t) | rastgele LS % | COIN % (t) |','|---|---:|---:|---:|---:|---:|---:|---:|---:|']
    tt=lambda s: s.mean()/s.std()*np.sqrt(len(s))
    for pn,f in per:
        r=R[f(R)]; q=rnd[f(rnd)]
        L.append(f'| {pn} | {len(r)} | {fx(r.LO.mean()*100)} | {fx(r.EW.mean()*100)} | {fx(r.LOEW.mean()*100)} ({fx(tt(r.LOEW),1)}) | {fx(q.LOEW.mean()*100)} | {fx(r.LS.mean()*100)} ({fx(tt(r.LS),1)}) | {fx(q.LS.mean()*100)} | {fx(r.COIN.mean()*100)} ({fx(tt(r.COIN),1)}) |')
        for v in ['LOEW','LS']: verdict.setdefault((LB,v),[]).append((pn,r[v].mean(),tt(r[v]),q[v].mean()))
    yr=R.groupby(R.dt.dt.year)[['LOEW','LS','COIN']].mean()*100
    L+=['','Yıl yıl haftalık net % (LO−EW / LS / COIN): '+' · '.join(f'{y} {fx(a)} / {fx(b)} / {fx(c)}' for y,(a,b,c) in yr.iterrows()),'']
    co=R[['LOEW','LS','COIN','EW']].corr()
    L+=[f'Korelasyon: LS ↔ COIN {fx(co.loc["LS","COIN"],2)}, LO−EW ↔ COIN {fx(co.loc["LOEW","COIN"],2)}, LO−EW ↔ EW {fx(co.loc["LOEW","EW"],2)}. Ortalama haftalık maliyet LO {fx(R.LO_c.mean()*100)} %, LS {fx(R.LS_c.mean()*100)} %, COIN {fx(R.COIN_c.mean()*100)} %.']
    b=np.polyfit(R.COIN,R.LS,1); res=R.LS-np.polyval(b,R.COIN)
    L+=[f'LS\'nin COIN\'den arındırılmış kalanı: haftalık {fx(res.mean()*100)} % (t {fx(tt(res),1)}), β {fx(b[0],2)}.']
    for v in ['LO','LS','COIN']:
        eq=(1+R[v]).cumprod(); L.append(f'{v} bileşik {fx((eq.iloc[-1]-1)*100,0)} %, en büyük düşüş {fx((eq/eq.cummax()-1).min()*100,0)} %, en kötü hafta {fx(R[v].min()*100,1)} %.')
    L.append('')
ok={k:all(m>0 and m>rm for pn,m,t,rm in v[1:]) and v[0][2]>=3 for k,v in verdict.items()}
L+=['## Sonuç','','Geçme (iki yarı ve son 12 ay net artı ve rastgeleden iyi, tüm dönem t ≥ 3): '+', '.join(f'{lb} g {v} **{"geçti" if o else "geçmedi"}**' for (lb,v),o in ok.items())+'.']
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
