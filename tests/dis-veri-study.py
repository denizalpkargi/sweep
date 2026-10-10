# Dış veri ilk ölçüm (9 Ekim 2026): korku endeksi, stablecoin arzı, DeFi TVL/DEX hacmi, Deribit DVOL, CFTC COT (CME Bitcoin), zincir üstü
# → BTC ileri getirisi (1 g / 7 g / 30 g, ertesi gün açılışından) ve Denklem 4 ağının günlük short/long bacağı. Günlük değişkenler 1 gün gecikmeli
# (bilinen değer), COT 4 gün gecikmeli (salı raporu cuma açıklanır). Kullanım: python3 tests/dis-veri-study.py [--ext /mnt/project-files/veri-arsivi/dis-veri] → tests/dis-veri-report.md
import numpy as np, pandas as pd, pickle, math, os, sys, time
arg=lambda k,d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
A=os.path.join(os.path.dirname(__file__),'data','arch'); E=arg('ext','/mnt/project-files/veri-arsivi/dis-veri'); OUT=os.path.join(os.path.dirname(__file__),'dis-veri-report.md'); t0=time.time()
btc=pd.read_csv(f'{A}/1d/BTCUSDT.csv',header=None).iloc[:,[0,1,4]]; btc.columns=['t','o','c']; btc['date']=pd.to_datetime(btc.t,unit='ms').dt.strftime('%Y-%m-%d'); btc=btc.sort_values('t').reset_index(drop=True)
o=btc.o.values; n=len(btc)
for h in [1,7,30]:
    f=np.full(n,np.nan); f[:n-h-1]=np.log(o[1+h:]/o[1:n-h])*100; btc[f'f{h}']=f
btc['r']=np.log(btc.c).diff(); btc['rv30']=btc.r.rolling(30).std()*math.sqrt(365)*100; btc['mom30']=np.log(btc.c/btc.c.shift(30))*100
D=btc[['date','t','c','f1','f7','f30','rv30','mom30']].copy()
def lagjoin(df,cols,lag):
    x=df[['date']+cols].copy(); x['date']=(pd.to_datetime(x.date)+pd.Timedelta(days=lag)).dt.strftime('%Y-%m-%d'); return x
V={}  # ad → (sütun, açıklama)
fng=pd.read_csv(f'{E}/fng.csv'); fng['fng']=fng.value; fng['fng_d7']=fng.value-fng.value.shift(7); fng['fng_30']=fng.value.rolling(30).mean()
D=D.merge(lagjoin(fng,['fng','fng_d7','fng_30'],1),on='date',how='left'); V.update({'Korku endeksi':'fng','Korku endeksi 7 g değişim':'fng_d7','Korku endeksi 30 g ort.':'fng_30'})
st=pd.read_csv(f'{E}/stablecoins.csv'); st=st[st.total>1e9].copy(); st['sc_7']=np.log(st.total/st.total.shift(7))*100; st['sc_30']=np.log(st.total/st.total.shift(30))*100; st['usdt_30']=np.log(st.usdt/st.usdt.shift(30))*100; st['usdc_30']=np.log(st.usdc.clip(lower=1)/st.usdc.clip(lower=1).shift(30))*100
D=D.merge(lagjoin(st,['sc_7','sc_30','usdt_30','usdc_30'],1),on='date',how='left'); V.update({'Stablecoin arzı 7 g %':'sc_7','Stablecoin arzı 30 g %':'sc_30','USDT arzı 30 g %':'usdt_30','USDC arzı 30 g %':'usdc_30'})
de=pd.read_csv(f'{E}/defi.csv'); de=de[de.tvl>1e9].copy(); de['tvl_7']=np.log(de.tvl/de.tvl.shift(7))*100; de['tvl_30']=np.log(de.tvl/de.tvl.shift(30))*100; de['dex_r']=de.dexVol.rolling(7).mean()/de.dexVol.rolling(30).mean()
D=D.merge(lagjoin(de,['tvl_7','tvl_30','dex_r'],1),on='date',how='left'); V.update({'TVL 7 g %':'tvl_7','TVL 30 g %':'tvl_30','DEX hacmi 7 g / 30 g':'dex_r'})
dv=pd.read_csv(f'{E}/dvol-BTC.csv'); dv['date']=pd.to_datetime(dv.t,unit='ms').dt.strftime('%Y-%m-%d'); dvd=dv.groupby('date').c.last().reset_index().rename(columns={'c':'dvol'}); dvd['dvol_d7']=dvd.dvol-dvd.dvol.shift(7); dvd['dvol_pct']=dvd.dvol.rolling(90,min_periods=30).rank(pct=True)
D=D.merge(dvd[['date','dvol','dvol_d7','dvol_pct']],on='date',how='left'); D['dvol_vrp']=D.dvol-D.rv30; V.update({'DVOL düzeyi':'dvol','DVOL 7 g değişim':'dvol_d7','DVOL 90 g yüzdelik':'dvol_pct','DVOL − RV30 (risk primi)':'dvol_vrp'})
ev=pd.read_csv(f'{E}/dvol-ETH.csv'); ev['date']=pd.to_datetime(ev.t,unit='ms').dt.strftime('%Y-%m-%d'); evd=ev.groupby('date').c.last().reset_index().rename(columns={'c':'edvol'}); D=D.merge(evd,on='date',how='left'); D['dvol_eb']=D.edvol-D.dvol; V['ETH − BTC DVOL']='dvol_eb'
co=pd.read_csv(f'{E}/cot.csv'); co=co[co.market=='BTC'].copy(); co=co.sort_values('date'); co['lev_net']=(co.levL-co.levS)/co.oi*100; co['am_net']=(co.assetMgrL-co.assetMgrS)/co.oi*100; co['dl_net']=(co.dealerL-co.dealerS)/co.oi*100; co['nr_net']=(co.nonRepL-co.nonRepS)/co.oi*100; co['oi_4w']=np.log(co.oi/co.oi.shift(4))*100
for c in ['lev_net','am_net']: co[c+'_d4']=co[c]-co[c].shift(4)
cot=lagjoin(co,['lev_net','am_net','dl_net','nr_net','oi_4w','lev_net_d4','am_net_d4'],4); full=pd.DataFrame({'date':D.date}); cot=full.merge(cot,on='date',how='left').ffill(); D=D.merge(cot,on='date',how='left',suffixes=('','_c'))
V.update({'COT kaldıraçlı fon net / OI %':'lev_net','COT varlık yöneticisi net / OI %':'am_net','COT dealer net / OI %':'dl_net','COT küçük yatırımcı net / OI %':'nr_net','COT OI 4 hafta %':'oi_4w','COT kaldıraçlı net 4 hf değişim':'lev_net_d4','COT varlık yön. net 4 hf değişim':'am_net_d4'})
ch=pd.read_csv(f'{E}/onchain-btc.csv'); ch=ch[pd.to_datetime(ch.date)>='2019-01-01'].copy(); full=pd.DataFrame({'date':pd.date_range('2019-01-01',D.date.max()).strftime('%Y-%m-%d')}); ch=full.merge(ch,on='date',how='left').ffill()
ch['hash_30']=np.log(ch.hashrate/ch.hashrate.shift(30))*100; ch['ntx_r']=ch.ntx.rolling(7).mean()/ch.ntx.rolling(30).mean(); ch['addr_r']=ch.addrs.rolling(7).mean()/ch.addrs.rolling(30).mean(); ch['fee_r']=ch.feesUsd.rolling(7).mean()/ch.feesUsd.rolling(30).mean()
D=D.merge(lagjoin(ch,['hash_30','ntx_r','addr_r','fee_r'],1),on='date',how='left'); V.update({'Hash oranı 30 g %':'hash_30','İşlem sayısı 7 g / 30 g':'ntx_r','Aktif adres 7 g / 30 g':'addr_r','Ücretler 7 g / 30 g':'fee_r'})
D=D[(D.date>='2020-01-01')].reset_index(drop=True); mid=D.date.iloc[len(D)//2]; y24=D.date.iloc[-730]
fx=lambda v,d=3: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.',',')
def ic(x,y):
    m=np.isfinite(x)&np.isfinite(y)
    return pd.Series(x[m]).corr(pd.Series(y[m]),method='spearman') if m.sum()>=60 else np.nan
P=[('tümü',D),('1. yarı',D[D.date<mid]),('2. yarı',D[D.date>=mid]),('son 24 ay',D[D.date>=y24])]
L=[f'# Dış veri ilk ölçüm · {time.strftime("%Y-%m-%d")}','',f'BTC günlük {len(D):,} gün, {D.date.min()} → {D.date.max()}; getiri ertesi gün açılışından 1 / 7 / 30 g ileri açılışa, log %. Değişkenler 1 gün gecikmeli (COT 4 gün). Günler örtüşür (7 g / 30 g IC\'lerinde t-değeri şişkin; iki yarıya ve son 24 aya bak). Veri: `/mnt/project-files/veri-arsivi/dis-veri/` (`tests/fetch-external.js`).','',
   '## 1) Spearman IC: değişken → BTC ileri getirisi','','| Değişken | n | 1 g tümü | 7 g tümü | 7 g 1. yarı | 7 g 2. yarı | 7 g son 24 ay | 30 g tümü | 30 g 1. yarı | 30 g 2. yarı | 30 g son 24 ay |','|---|---|---|---|---|---|---|---|---|---|---|']
for name,col in V.items():
    nn=int(np.isfinite(D[col].values).sum()); L.append(f'| {name} | {nn:,} | {fx(ic(D[col].values,D.f1.values))} | '+' | '.join(fx(ic(sub[col].values,sub.f7.values)) for _,sub in P)+' | '+' | '.join(fx(ic(sub[col].values,sub.f30.values)) for _,sub in P)+' |')
L+=['','## 2) Beşlikler: BTC 30 g ileri getirisi (ort. %, dönem içinde beşlik), B1 düşük → B5 yüksek','','| Değişken | Dönem | B1 | B2 | B3 | B4 | B5 | B5 − B1 |','|---|---|---|---|---|---|---|---|']
for name,col in V.items():
    for pn,sub in [('tümü',D),('2. yarı',D[D.date>=mid])]:
        s=sub.dropna(subset=[col,'f30']); 
        if len(s)<100: continue
        q=pd.qcut(s[col].rank(method='first'),5,labels=False); g=s.groupby(q).f30.mean(); L.append(f'| {name} | {pn} | '+' | '.join(fx(g.get(k),2) for k in range(5))+f' | {fx(g.get(4)-g.get(0),2)} |')
# 3) Denklem 4 ağı: günlük short/long bacağı (24 sa) ile ilişki
try:
    d=pickle.load(open(f'{A}/denklem4-nn-oos.pkl','rb'))['ağ derin tablo']; hz='24 sa'; sc=math.sqrt(96); p='p_'+hz; y='y_'+hz; s=d.dropna(subset=[p,y]).sort_values(['th',p]); s['ret']=s[y]*s.sd15*sc*100
    bot=s.groupby('th').head(2).groupby('th').agg(t=('t','first'),sh=('ret',lambda v:-v.mean())); top=s.groupby('th').tail(2).groupby('th').agg(lg=('ret','mean')); hh=bot.join(top); hh['date']=pd.to_datetime(hh.t.astype(np.int64),unit='ms').dt.strftime('%Y-%m-%d')
    dd=hh.groupby('date').agg(sh=('sh','mean'),lg=('lg','mean')).reset_index().merge(D,on='date',how='inner')
    L+=['','## 3) Denklem 4 ağı (OOS 2024-06 → 2026-10): günlük ortalama short / long bacağı (24 sa, saat başı 2+2, maliyetsiz) ile Spearman','',f'{len(dd):,} gün; short ort. {dd.sh.mean():+.2f} %, long ort. {dd.lg.mean():+.2f} %.','','| Değişken | IC short bacağı | IC long bacağı | Short B1 | Short B5 | Long B1 | Long B5 |','|---|---|---|---|---|---|---|']
    for name,col in V.items():
        s2=dd.dropna(subset=[col]); 
        if len(s2)<100: continue
        q=pd.qcut(s2[col].rank(method='first'),5,labels=False); gs=s2.groupby(q).sh.mean(); gl=s2.groupby(q).lg.mean(); L.append(f'| {name} | {fx(ic(s2[col].values,s2.sh.values))} | {fx(ic(s2[col].values,s2.lg.values))} | {fx(gs.get(0),2)} | {fx(gs.get(4),2)} | {fx(gl.get(0),2)} | {fx(gl.get(4),2)} |')
except Exception as e: L+=['','(ağ tahminleri okunamadı: '+str(e)+')']
# 4) Adaylar: yıl yıl 30 g IC ve BTC momentum/RV kontrollü kısmi korelasyon
CAND={'TVL 30 g %':'tvl_30','ETH − BTC DVOL':'dvol_eb','DVOL − RV30':'dvol_vrp','COT kaldıraçlı fon net / OI %':'lev_net','COT varlık yöneticisi net / OI %':'am_net','Stablecoin arzı 30 g %':'sc_30','Korku endeksi':'fng','Hash oranı 30 g %':'hash_30','USDC arzı 30 g %':'usdc_30','DVOL 90 g yüzdelik':'dvol_pct'}
D['yr']=D.date.str.slice(0,4); yrs=sorted(D.yr.unique())
def partial(x,y,Z):
    m=np.isfinite(x)&np.isfinite(y)&np.all(np.isfinite(Z),axis=1)
    if m.sum()<100: return np.nan
    rx=pd.Series(x[m]).rank().values; ry=pd.Series(y[m]).rank().values; RZ=np.column_stack([np.ones(m.sum())]+[pd.Series(Z[m,j]).rank().values for j in range(Z.shape[1])])
    ex=rx-RZ@np.linalg.lstsq(RZ,rx,rcond=None)[0]; ey=ry-RZ@np.linalg.lstsq(RZ,ry,rcond=None)[0]; return np.corrcoef(ex,ey)[0,1]
L+=['','## 4) Adaylar: yıl yıl 30 g IC, BTC 30 g momentum ve RV30 kontrollü kısmi IC (7 g / 30 g)','','| Değişken | '+' | '.join(yrs)+' | aynı işaretli yıl | kısmi 7 g | kısmi 30 g |','|---|'+'---|'*len(yrs)+'---|---|---|']
Z=D[['mom30','rv30']].values
for name,col in CAND.items():
    ys=[ic(sub[col].values,sub.f30.values) for _,sub in [(y,D[D.yr==y]) for y in yrs]]; sg=[np.sign(v) for v in ys if np.isfinite(v)]; same=max(sg.count(1),sg.count(-1)) if sg else 0
    L.append(f'| {name} | '+' | '.join(fx(v,2) for v in ys)+f' | {same}/{len(sg)} | {fx(partial(D[col].values,D.f7.values,Z))} | {fx(partial(D[col].values,D.f30.values,Z))} |')
L+=['','## Okuma','','- Anlamlı sayılan: 7 g ve 30 g IC\'si iki yarıda ve son 24 ayda aynı işaretli ve |IC| ≥ 0,10 (günlük örtüşen pencere; 30 g IC\'de 0,10 bile ~1 bağımsız gözlem/ay demektir, dikkat).','- Korku endeksi, DVOL ve momentumla ilişkili değişkenler BTC\'nin kendi geçmişini de taşır (`mom30`, `rv30` satırları kıyas içindir).']
V2={'BTC 30 g momentum (kıyas)':'mom30','BTC RV30 (kıyas)':'rv30'}; ins=L.index('## 2) Beşlikler: BTC 30 g ileri getirisi (ort. %, dönem içinde beşlik), B1 düşük → B5 yüksek')-1
for name,col in V2.items(): L.insert(ins,f'| {name} | {int(np.isfinite(D[col].values).sum()):,} | {fx(ic(D[col].values,D.f1.values))} | '+' | '.join(fx(ic(sub[col].values,sub.f7.values)) for _,sub in P)+' | '+' | '.join(fx(ic(sub[col].values,sub.f30.values)) for _,sub in P)+' |'); ins+=1
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L)); print('yazıldı',OUT,f'{time.time()-t0:.0f} sn')
