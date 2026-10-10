# Büyük işlem akışı değişkenleri lambdarank'e katkı veriyor mu? (9 Ekim 2026, test listesi #35)
# denklem4 satırları (2025-01'den, aggflow verisi olan coinler) + aggflow saatlik değişkenleri (t saatinin kapanmış akışı; satır th = saat başı, akış t−1 saatine kadar).
# Aynı satırlarda lambdarank (a) denklem4 değişkenleri, (b) + akış değişkenleri; ileriye yürüyen 3 aylık test pencereleri (2025-10'dan), eğitim testten 2 gün önce biter.
# Kullanım: python3 tests/denklem4-aggflow-lr.py → tests/denklem4-aggflow-lr-report.md
import json, os, glob, math, time, numpy as np, pandas as pd, lightgbm as lgb
np.random.seed(1); A=os.path.join(os.path.dirname(__file__),'data','arch'); OUT=os.path.join(os.path.dirname(__file__),'denklem4-aggflow-lr-report.md'); t0=time.time()
meta=json.load(open(f'{A}/denklem4.json')); COLS=meta['cols']; SY=meta['syms']
X=np.fromfile(f'{A}/denklem4.f32',dtype=np.float32).reshape(-1,len(COLS)); df=pd.DataFrame(X,columns=COLS); del X
df['t']=df.th.astype(np.int64)*3600000+meta['t0']; df=df[(df.t>=pd.Timestamp('2025-01-02').value//10**6)&np.isfinite(df.y4v)].copy(); df['symn']=[SY[int(i)] for i in df.sym.values]
AF=[]
for f in glob.glob(f'{A}/aggflow/*.csv'):
    s=os.path.basename(f)[:-4]; a=pd.read_csv(f,header=None,names=['t','n','q','qb','q1k','qb1k','q10k','qb10k','q100k','qb100k','mx','n100k']).drop_duplicates('t').set_index('t').sort_index()
    if len(a)<24*30: continue
    a=a.reindex(np.arange(a.index.min(),a.index.max()+1,3600000)); q=a.q; sm=q-a.q10k; smb=a.qb-a.qb10k; d=pd.DataFrame(index=a.index)
    for w in [4,24,72]:
        R=lambda x: x.rolling(w,min_periods=w//2).sum()
        d[f'af_imb10k{w}']=R(2*a.qb10k-a.q10k)/R(a.q10k); d[f'af_imbSm{w}']=R(2*smb-sm)/R(sm); d[f'af_bms{w}']=d[f'af_imb10k{w}']-d[f'af_imbSm{w}']; d[f'af_imb100k{w}']=R(2*a.qb100k-a.q100k)/R(a.q100k)
    d['af_sh10k']=a.q10k.rolling(24,min_periods=12).sum()/q.rolling(24,min_periods=12).sum(); d['af_sh10kZ']=d.af_sh10k-d.af_sh10k.rolling(720,min_periods=240).mean()
    d['af_szZ']=np.log(q/a.n).rolling(24,min_periods=12).mean()-np.log(q/a.n).rolling(720,min_periods=240).mean()
    d.index=d.index+3600000  # açılış zamanı t olan saatin akışı t+1 saat başında bilinir
    d['symn']=s; AF.append(d.reset_index().rename(columns={'index':'t'}))
AF=pd.concat(AF,ignore_index=True); FA=[c for c in AF.columns if c.startswith('af_')]
df=df.merge(AF,on=['symn','t'],how='inner'); df=df[df.groupby('th').sym.transform('count')>=10].reset_index(drop=True)
for c in FA: df['x_'+c]=df.groupby('th')[c].rank(pct=True)
FA2=FA+['x_'+c for c in FA]
DROP={'sym','th','y1','y4','y24','y1v','y4v','y12v','y24v','sd15','t','symn','month'}; FEATS=[c for c in COLS if c not in DROP]
HZ={'4 sa':('y4v',4.0),'12 sa':('y12v',math.sqrt(48))}
for h,(yc,_) in HZ.items(): df[yc+'c']=df[yc].clip(-5,5); df[yc+'r']=np.floor(df.groupby('th')[yc+'c'].rank(pct=True,method='first').values*10-1e-9).clip(0,9)
df['month']=pd.to_datetime(df.t,unit='ms').dt.strftime('%Y-%m'); months=sorted(df.month.unique())
print('satır',len(df),'saat',df.th.nunique(),'coin',df.sym.nunique(),months[0],'→',months[-1],f'{time.time()-t0:.0f} sn',flush=True)
def fast_ic(o,pcol,ycol,key='th',minn=10):
    x=o[[key,pcol,ycol]].dropna(); codes,_=pd.factorize(x[key].values); n=np.bincount(codes); rp=x.groupby(key)[pcol].rank().values; ry=x.groupby(key)[ycol].rank().values
    sx=np.bincount(codes,rp); sy=np.bincount(codes,ry); sxx=np.bincount(codes,rp*rp); syy=np.bincount(codes,ry*ry); sxy=np.bincount(codes,rp*ry)
    with np.errstate(invalid='ignore',divide='ignore'): r=(sxy-sx*sy/n)/np.sqrt((sxx-sx*sx/n)*(syy-sy*sy/n))
    r=r[(n>=minn)&np.isfinite(r)]; return r.mean()
fx=lambda v,d=3: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.',',')
VARS=[('denklem4 değişkenleri',FEATS),('denklem4 + akış',FEATS+FA2),('yalnız akış',FA2)]
res={}; L=[f'# Büyük işlem akışı + lambdarank · {time.strftime("%Y-%m-%d")}','',f'{len(df):,} satır, {df.th.nunique():,} saat, {df.sym.nunique()} coin (aggflow verisi olanlar), {months[0]} → {months[-1]}. Akış değişkenleri ({len(FA)} ham + {len(FA)} saat içi sıra): 4/24/72 sa ≥10k, ≥100k ve küçük işlem dengesizliği, büyük − küçük farkı, büyük işlem payı ve sapması, işlem büyüklüğü sapması. Lambdarank ayarları ana koşuyla aynı (200 ağaç, saat içi onluk etiketi), eğitim testten 2 gün önce biter, eğitim yalnız 2025-01\'den (akış verisinin başı).','','| Test | Ufuk | denklem4 | + akış | yalnız akış | fark |','|---|---|---|---|---|---|']
for i in range(9,len(months),3):
    test_m=months[i:i+3]; tmin=df[df.month==test_m[0]].t.min(); tr=df[df.t<tmin-2*864e5]; te=df[df.month.isin(test_m)]
    if len(te)==0: continue
    for h,(yc,_) in HZ.items():
        row=[]
        for name,feats in VARS:
            trs=tr.sort_values('th'); grp=trs.groupby('th',sort=False).size().values
            m=lgb.LGBMRanker(objective='lambdarank',n_estimators=200,learning_rate=0.03,num_leaves=31,min_child_samples=500,subsample=0.7,subsample_freq=1,colsample_bytree=0.6,reg_lambda=10,label_gain=list(range(10)),lambdarank_truncation_level=30,verbose=-1,n_jobs=4).fit(trs[feats],trs[yc+'r'].astype(int),group=grp)
            o=pd.DataFrame({'th':te.th.values,'p':m.predict(te[feats]),'y':te[yc+'c'].values}); v=fast_ic(o,'p','y'); row.append(v); res.setdefault((name,h),[]).append((len(te),v))
            if name=='denklem4 + akış':
                imp=pd.Series(m.booster_.feature_importance('gain'),index=feats); res.setdefault(('imp',h),[]).append(imp[[c for c in feats if c in FA2]].sum()/imp.sum())
        L.append(f'| {test_m[0]} → {test_m[-1]} | {h} | {fx(row[0])} | {fx(row[1])} | {fx(row[2])} | {fx(row[1]-row[0])} |'); print(L[-1],f'{time.time()-t0:.0f} sn',flush=True)
L+=['','Ağırlıklı ortalama (test satır sayısıyla):','']
for h in HZ:
    w=lambda name: sum(n*v for n,v in res[(name,h)])/sum(n for n,_ in res[(name,h)])
    L.append(f'- {h}: denklem4 {fx(w("denklem4 değişkenleri"))}, + akış {fx(w("denklem4 + akış"))}, yalnız akış {fx(w("yalnız akış"))}; akış değişkenlerinin kazanç payı (gain) ort. %{100*np.mean(res[("imp",h)]):.0f}'.replace('.',','))
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L[-3:])); print('yazıldı',OUT,f'{time.time()-t0:.0f} sn')
