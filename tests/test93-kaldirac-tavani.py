# Test #93: coin başına güvenli kaldıraç tavanı (19 Ekim taraması; arXiv 2102.04591).
# Ayın ilk 50 coini (universe.json, TradFi hariç), 4 saatte bir 1 sa kapanışında varsayımsal giriş; sonraki H saatte (8/24/72)
# en kötü fitil (long: 1 − min(low)/giriş, short: max(high)/giriş − 1). Son fiyat fitili (likidasyon mark fiyatla; mark fitili daha
# kısa olur, bu yüzden tavanlar ihtiyatlı). İzole likidasyon uzaklığı = 1/L − %0,5 (engine.js liqDist).
# Çıktı: %1 ve %0,1 olasılıklı fitil → kaldıraç tavanı, kademe (BTC/ETH, 3–10, 11–50) ve yıl yıl; geçmiş 30 günlük saatlik
# oynaklıkla ölçeklenmiş fitil (z) ile coin başına tavan formülü; sabit kaldıraçta (3/5/10/20x) likidasyon olasılığı.
import json, os, numpy as np, pandas as pd
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); HR=3600000; MM=0.005
U=json.load(open(f'{A}/universe.json'))['months']
rank={}  # (ay, sym) -> sıra
for m,l in U.items():
    for i,s in enumerate(l[:50]): rank[(m,s)]=i
syms=sorted({s for (m,s) in rank})
HZ=[8,24,72]; rows=[]
for s in syms:
    p=f'{A}/1h/{s}.csv'
    if not os.path.exists(p): continue
    d=pd.read_csv(p,header=None,usecols=[0,2,3,4,5]).values
    t=d[:,0].astype(np.int64); hi,lo,c,v=d[:,1],d[:,2],d[:,3],d[:,4]
    n=len(t)
    if n<800: continue
    lr=np.diff(np.log(c),prepend=np.nan)
    sd=pd.Series(lr).rolling(720,min_periods=600).std().values
    idx=np.where((t%(4*HR))==(3*HR))[0]  # kapanışı 4 sa sınırına denk gelen mum
    for i in idx:
        if i+72>=n or v[i]<=0 or not np.isfinite(sd[i]) or sd[i]<=0: continue
        m=pd.Timestamp(t[i]+HR,unit='ms').strftime('%Y-%m')
        r=rank.get((m,s))
        if r is None: continue
        if t[i+72]-t[i]!=72*HR: continue
        if (v[i+1:i+73]<=0).mean()>0.2: continue  # donmuş / ölü veri
        out=[t[i]+HR,s,r,sd[i]]
        for h in HZ:
            out+= [1-lo[i+1:i+1+h].min()/c[i], hi[i+1:i+1+h].max()/c[i]-1]
        rows.append(out)
cols=['t','s','r','sd']+[f'{k}{h}' for h in HZ for k in ('L','S')]
D=pd.DataFrame(rows,columns=cols); D['y']=pd.to_datetime(D.t,unit='ms').dt.year
D['tier']=np.where(D.s.isin(['BTCUSDT','ETHUSDT']),'BTC/ETH',np.where(D.r<10,'3–10','11–50'))
tmax=D.t.max(); tmin=D.t.min(); mid=(tmin+tmax)/2; l12=tmax-365*24*HR
cap=lambda q: 1/(q+MM) if q+MM>0 else np.inf
L=[f'# Test #93: coin başına güvenli kaldıraç tavanı\n',
   f'Ayın ilk 50 coini, 4 saatte bir giriş, {len(D)} örnek, {D.s.nunique()} coin, {pd.to_datetime(tmin,unit="ms"):%Y-%m} → {pd.to_datetime(tmax,unit="ms"):%Y-%m}. '
   'Son fiyat fitili (mark fitili daha kısa; tavanlar ihtiyatlı). Tavan = 1 / (fitil + %0,5).\n']
def qtab(title,groups):
    L.append(f'\n## {title}\n\n| Küme | n | yön | H | %1 fitil | tavan | %0,1 fitil | tavan |\n|---|---|---|---|---|---|---|---|')
    for name,g in groups:
        for k,kn in (('L','long'),('S','short')):
            for h in HZ:
                x=g[f'{k}{h}'].values; q1,q01=np.quantile(x,0.99),np.quantile(x,0.999)
                L.append(f'| {name} | {len(x)} | {kn} | {h} sa | %{q1*100:.1f} | {cap(q1):.1f}x | %{q01*100:.1f} | {cap(q01):.1f}x |')
qtab('Kademeye göre',[(n,g) for n,g in D.groupby('tier')])
# yıl yıl: yalnız 24 sa, %1
L.append('\n## Yıl yıl (24 sa, %1 fitil → tavan)\n\n| Yıl | n | BTC/ETH long | short | 3–10 long | short | 11–50 long | short |\n|---|---|---|---|---|---|---|---|')
for y,g in D.groupby('y'):
    cells=[]
    for tr in ['BTC/ETH','3–10','11–50']:
        gg=g[g.tier==tr]
        for k in 'LS':
            cells.append(f'%{np.quantile(gg[f"{k}24"],0.99)*100:.1f} · {cap(np.quantile(gg[f"{k}24"],0.99)):.1f}x' if len(gg)>50 else '—')
    L.append(f'| {y} | {len(g)} | '+' | '.join(cells)+' |')
# oynaklıkla ölçek: z = fitil / (sd·√H)
L.append('\n## Oynaklıkla ölçeklenmiş fitil (z = fitil ÷ (30 g saatlik σ · √H)), %1 ve %0,1 yüzdelik\n\n| Dönem | yön | H | z %1 | z %0,1 |\n|---|---|---|---|---|')
per=[('tümü',D),('ilk yarı',D[D.t<mid]),('ikinci yarı',D[D.t>=mid]),('son 12 ay',D[D.t>=l12])]
Z={}
for pn,g in per:
    for k,kn in (('L','long'),('S','short')):
        for h in HZ:
            z=g[f'{k}{h}']/(g.sd*np.sqrt(h)); a,b=np.quantile(z,0.99),np.quantile(z,0.999); Z[(pn,k,h)]=(a,b)
            L.append(f'| {pn} | {kn} | {h} sa | {a:.2f} | {b:.2f} |')
# formül sınaması: ilk yarı z %1 ile ikinci yarıda gerçekleşen aşım oranı (hedef %1)
L.append('\n## Formül sınaması: ilk yarının z %1 değeriyle kurulan tavanda ikinci yarıda / son 12 ayda likidasyon oranı (hedef %1)\n\n| yön | H | ikinci yarı | son 12 ay | BTC/ETH | 11–50 |\n|---|---|---|---|---|---|')
for k,kn in (('L','long'),('S','short')):
    for h in HZ:
        z1=Z[('ilk yarı',k,h)][0]
        def br(g): return (g[f'{k}{h}']>=z1*g.sd*np.sqrt(h)).mean()*100
        g2=D[D.t>=mid]
        L.append(f'| {kn} | {h} sa | %{br(g2):.2f} | %{br(D[D.t>=l12]):.2f} | %{br(g2[g2.tier=="BTC/ETH"]):.2f} | %{br(g2[g2.tier=="11–50"]):.2f} |')
# sabit kaldıraçta likidasyon olasılığı
L.append('\n## Sabit izole kaldıraçta stopsuz likidasyon olasılığı (son 12 ay)\n\n| Kaldıraç | uzaklık | yön | 8 sa | 24 sa | 72 sa | 11–50 · 24 sa |\n|---|---|---|---|---|---|---|')
g=D[D.t>=l12]
for lev in [3,5,10,20]:
    dd=1/lev-MM
    for k,kn in (('L','long'),('S','short')):
        L.append(f'| {lev}x | %{dd*100:.1f} | {kn} | '+' | '.join(f'%{(g[f"{k}{h}"]>=dd).mean()*100:.1f}' for h in HZ)+f' | %{(g[g.tier=="11–50"][f"{k}24"]>=dd).mean()*100:.1f} |')
# bugünkü kurallar: Masaya sor kırmızı not likidasyon < 1,5 ATR (15 dk); botun levFor: stop ≤ liq × 0,6
med=D[D.t>=l12].sd.median()
L.append(f'\n## Notlar\n\n- Son 12 ayda saatlik σ medyanı %{med*100:.2f}; 24 sa z %1 = {Z[("son 12 ay","L",24)][0]:.2f} (long) / {Z[("son 12 ay","S",24)][0]:.2f} (short).')
open(os.path.join(H,'test93-kaldirac-tavani-report.md'),'w').write('\n'.join(L).replace('.',',').replace('#,','#.')+'\n')
D.to_csv(f'{A}/test93-fitil.csv',index=False)
print('\n'.join(L))
