# BVOL (Binance ima edilen oynaklık endeksi) ilk ölçüm (9 Ekim 2026): BTC/ETH BVOL saatlik (tests/fetch-bvol.js) → BTC ileri getirisi,
# gerçekleşen oynaklık, oynaklık risk primi (BVOL − RV30) ve Denklem 4 ağının 12/24 sa short/long bacağının BVOL rejimine göre getirisi.
# Kullanım: python3 tests/bvol-study.py → tests/bvol-report.md
import numpy as np, pandas as pd, pickle, math, os, time
A=os.path.join(os.path.dirname(__file__),'data','arch'); OUT=os.path.join(os.path.dirname(__file__),'bvol-report.md'); t0=time.time()
bv=pd.read_csv(f'{A}/bvol/BTCBVOLUSDT.csv',header=None,names=['t','o','h','l','c','m']); ev=pd.read_csv(f'{A}/bvol/ETHBVOLUSDT.csv',header=None,names=['t','o','h','l','c','m'])
btc=pd.read_csv(f'{A}/1h/BTCUSDT.csv',header=None).iloc[:,[0,1,4,7]]; btc.columns=['t','o','c','q']; btc=btc[btc.t>=bv.t.min()-800*36e5].reset_index(drop=True)
df=btc.merge(bv[['t','c']].rename(columns={'c':'bvol'}),on='t',how='left').merge(ev[['t','c']].rename(columns={'c':'ebvol'}),on='t',how='left')
df['r']=np.log(df.c).diff(); df['rv30']=df.r.rolling(720).std()*math.sqrt(8760)*100; df['rv7']=df.r.rolling(168).std()*math.sqrt(8760)*100
o=df.o.values; n=len(df)
for h in [4,24,168]:
    f=np.full(n,np.nan); f[:n-h-1]=np.log(o[1+h:]/o[1:n-h])*100; df[f'f{h}']=f  # giriş t+1 açılış → t+1+h açılış
df['af24']=df.f24.abs(); df['rvn24']=df.r[::-1].rolling(24).std()[::-1].shift(-1)*math.sqrt(8760)*100  # sonraki 24 sa gerçekleşen
df['d24']=df.bvol-df.bvol.shift(24); df['d168']=df.bvol-df.bvol.shift(168); df['vrp']=df.bvol-df.rv30; df['vrp7']=df.bvol-df.rv7; df['pct90']=df.bvol.rolling(2160,min_periods=720).rank(pct=True); df['spread']=df.ebvol-df.bvol
df=df[np.isfinite(df.bvol)].reset_index(drop=True); mid=df.t.iloc[len(df)//2]; y12=df.t.max()-365*864e5
fx=lambda v,d=3: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.',',')
def ic(x,y):
    m=np.isfinite(x)&np.isfinite(y); 
    if m.sum()<100: return np.nan
    return pd.Series(x[m]).corr(pd.Series(y[m]),method='spearman')
V={'BVOL düzeyi':'bvol','BVOL 24 sa değişim':'d24','BVOL 7 g değişim':'d168','BVOL − RV30 (risk primi)':'vrp','BVOL − RV7':'vrp7','BVOL 90 g yüzdelik':'pct90','ETH − BTC BVOL':'spread'}
P=[('tümü',df),('1. yarı',df[df.t<mid]),('2. yarı',df[df.t>=mid]),('son 12 ay',df[df.t>=y12])]
L=[f'# BVOL ima edilen oynaklık · ilk ölçüm · {time.strftime("%Y-%m-%d")}','',f'BTC BVOL saatlik {len(df):,} saat, {pd.to_datetime(df.t.min(),unit="ms").date()} → {pd.to_datetime(df.t.max(),unit="ms").date()}. BVOL ort. {df.bvol.mean():.1f}, RV30 ort. {df.rv30.mean():.1f} (yıllık %); BVOL − RV30 ort. {df.vrp.mean():+.1f} (ima edilen gerçekleşenin üstünde = risk primi). Getiriler BTC, t+1 açılıştan ileri açılışa, log %; saatler örtüşür (t değerleri şişkin, yarılara bak).','',
   '## 1) Spearman IC: değişken → BTC ileri getirisi (4 sa / 24 sa / 7 g) ve sonraki 24 sa gerçekleşen oynaklık','','| Değişken | Dönem | n | IC 4 sa | IC 24 sa | IC 7 g | IC RV sonraki 24 sa |','|---|---|---|---|---|---|---|']
for name,col in V.items():
    for pn,sub in P: L.append(f'| {name} | {pn} | {len(sub):,} | {fx(ic(sub[col].values,sub.f4.values))} | {fx(ic(sub[col].values,sub.f24.values))} | {fx(ic(sub[col].values,sub.f168.values))} | {fx(ic(sub[col].values,sub.rvn24.values))} |')
L+=['','## 2) Beşlikler: BTC ileri getirisi (ort. %, dönem içinde beşliğe bölünmüş)','','| Değişken | Dönem | Beşlik 1 (düşük) 24 sa / 7 g | 2 | 3 | 4 | Beşlik 5 (yüksek) 24 sa / 7 g | RV sonraki 24 sa B1 → B5 |','|---|---|---|---|---|---|---|---|']
for name,col in [('BVOL düzeyi','bvol'),('BVOL 24 sa değişim','d24'),('BVOL − RV30','vrp'),('BVOL 90 g yüzdelik','pct90')]:
    for pn,sub in P:
        s=sub.dropna(subset=[col,'f24']); q=pd.qcut(s[col].rank(method='first'),5,labels=False); g24=s.groupby(q).f24.mean(); g168=s.groupby(q).f168.mean(); gv=s.groupby(q).rvn24.mean()
        L.append(f'| {name} | {pn} | '+' | '.join(f'{fx(g24.get(k),2)} / {fx(g168.get(k),2)}' for k in range(5))+f' | {gv.get(0):.0f} → {gv.get(4):.0f} |')
# 3) Denklem 4 ağı: 12/24 sa short ve long bacağı BVOL rejimine göre
try:
    d=pickle.load(open(f'{A}/denklem4-nn-oos.pkl','rb'))['ağ derin tablo']; d['t']=d.t.astype(np.int64)
    L+=['','## 3) Denklem 4 ağı (sıralama kayıplı, OOS 2024-06 → 2026-10): saat başı en güçlü 2 short / 2 long, bacak getirisi (%) BVOL beşliğine göre','',
        'Short bacağı = −(alt 2 coinin ileri getirisi), long = üst 2; eşik yok (her saat), VWAP→VWAP, maliyetsiz. BVOL beşlikleri OOS dönemi içinde.','','| Ufuk | Rejim değişkeni | B1 (düşük) short / long | B2 | B3 | B4 | B5 (yüksek) short / long | n saat |','|---|---|---|---|---|---|---|---|']
    reg=df[['t','bvol','d24','vrp']].copy()
    for hz,sc in [('12 sa',math.sqrt(48)),('24 sa',math.sqrt(96))]:
        p='p_'+hz; y='y_'+hz; s=d.dropna(subset=[p,y]).sort_values(['th',p]); s['ret']=s[y]*s.sd15*sc*100
        bot=s.groupby('th').head(2).groupby('th').agg(t=('t','first'),sh=('ret',lambda v:-v.mean())); top=s.groupby('th').tail(2).groupby('th').agg(lg=('ret','mean'))
        hh=bot.join(top).merge(reg,on='t',how='inner')
        for rn,rc in [('BVOL düzeyi','bvol'),('BVOL 24 sa değişim','d24'),('BVOL − RV30','vrp')]:
            q=pd.qcut(hh[rc].rank(method='first'),5,labels=False); gs=hh.groupby(q).sh.mean(); gl=hh.groupby(q).lg.mean()
            L.append(f'| {hz} | {rn} | '+' | '.join(f'{fx(gs.get(k),2)} / {fx(gl.get(k),2)}' for k in range(5))+f' | {len(hh):,} |')
        L.append(f'| {hz} | tümü | short {fx(hh.sh.mean(),2)} / long {fx(hh.lg.mean(),2)} | | | | | {len(hh):,} |')
except Exception as e: L+=['','(ağ tahminleri okunamadı: '+str(e)+')']
L+=["","## Okuma","","- IC'lerde iki yarıda aynı işaretli ve |IC| ≥ 0,05 olan satırlar anlamlı sayılır; saatlik örtüşen getirilerde t-değeri verilmedi.","- BVOL oynaklığı tahmin ediyorsa (RV sütunu) bu zaten beklenen; yön için 24 sa/7 g sütunlarına bak.","- Short bacağı yüksek BVOL'da daha iyiyse \"oynaklık rejimi süzgeci\" olarak bot'a girer; değilse BVOL yalnız boyutlandırma (risk) değişkeni olur."]
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L[:14])); print('...'); print('\n'.join(L[-16:])); print('yazıldı',OUT,f'{time.time()-t0:.0f} sn')
