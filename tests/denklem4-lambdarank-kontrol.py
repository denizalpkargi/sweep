# Lambdarank sızıntı / yapay sonuç kontrolü (9 Ekim 2026): tek pencerede (varsayılan test 2025-06, 6 ay) LGBMRanker'ı
# (a) gerçek etiketle, (b) saat içinde karıştırılmış etiketle (plasebo: IC ≈ 0 olmalı), (c) yalnız piyasa düzeyi değişkenlerle (saat içi sabit: IC ≈ 0 olmalı)
# eğitir; IC'yi hem oynaklığa bölünmüş hedefte hem ham % getiride, onlukları ve saat başı 2+2 işlemi (maliyetsiz ve taker %0,16) raporlar; OOS tahminleri kaydeder.
# Kullanım: python3 tests/denklem4-lambdarank-kontrol.py [--test 2025-06] [--hz "4 sa"] → tests/denklem4-lambdarank-kontrol-report.md, tests/data/arch/denklem4-lr-oos.pkl
import json, sys, os, math, time, pickle, numpy as np, pandas as pd, lightgbm as lgb
np.random.seed(1); D=os.path.join(os.path.dirname(__file__),'data','arch'); arg=lambda k,d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
TEST=arg('test','2025-06'); HS=arg('hz','4 sa,12 sa').split(','); OUT=os.path.join(os.path.dirname(__file__),'denklem4-lambdarank-kontrol-report.md'); t0=time.time()
meta=json.load(open(os.path.join(D,'denklem4.json'))); COLS=meta['cols']
X=np.fromfile(os.path.join(D,'denklem4.f32'),dtype=np.float32).reshape(-1,len(COLS)); df=pd.DataFrame(X,columns=COLS); del X
df=df[np.isfinite(df.y1v)&np.isfinite(df.y4v)].copy(); df['t']=df.th.astype(np.int64)*3600000+meta['t0']; df['month']=pd.to_datetime(df.t,unit='ms').dt.strftime('%Y-%m')
HZ={'1 sa':('y1v',2.0),'4 sa':('y4v',4.0),'12 sa':('y12v',math.sqrt(48)),'24 sa':('y24v',math.sqrt(96))}; HZ={k:v for k,v in HZ.items() if k in HS}
DROP={'sym','th','y1','y4','y24','y1v','y4v','y12v','y24v','sd15','t','month'}; FEATS=[c for c in COLS if c not in DROP]
for h,(yc,_) in HZ.items():
    df[yc+'c']=df[yc].clip(-5,5); df[yc+'r']=np.floor(df.groupby('th')[yc+'c'].rank(pct=True,method='first').values*10-1e-9).clip(0,9)
    df[yc+'p']=df.groupby('th')[yc+'r'].transform(lambda v: np.random.permutation(v.values))  # plasebo: saat içinde karıştırılmış etiket
df=df.reset_index(drop=True)
samp=df[df.th.isin(np.random.choice(df.th.unique(),300,replace=False))]; ratio=(samp.groupby('th')[FEATS].std().mean()/samp[FEATS].std()).fillna(0); MKT=[c for c in FEATS if ratio[c]<0.02]
months=sorted(df.month.unique()); i=months.index(TEST); test_m=months[i:i+6]; tmin=df[df.month==TEST].t.min()
tr_idx=df.index[(df.t<tmin-2*864e5)].values; te_idx=df.index[df.month.isin(test_m)].values
if len(tr_idx)>300000: tr_idx=np.sort(np.random.choice(tr_idx,300000,replace=False))
tr=df.loc[tr_idx]; te=df.loc[te_idx]; print('eğitim',len(tr),'test',len(te),test_m[0],'→',test_m[-1],'piyasa düzeyi',len(MKT),flush=True)
fx=lambda v,d=3: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.',',')
def fast_ic(o,pcol,ycol,key='th',minn=10):
    x=o[[key,pcol,ycol]].dropna(); codes,_=pd.factorize(x[key].values); n=np.bincount(codes); rp=x.groupby(key)[pcol].rank().values; ry=x.groupby(key)[ycol].rank().values
    sx=np.bincount(codes,rp); sy=np.bincount(codes,ry); sxx=np.bincount(codes,rp*rp); syy=np.bincount(codes,ry*ry); sxy=np.bincount(codes,rp*ry)
    with np.errstate(invalid='ignore',divide='ignore'): r=(sxy-sx*sy/n)/np.sqrt((sxx-sx*sx/n)*(syy-sy*sy/n))
    r=r[(n>=minn)&np.isfinite(r)]; return r.mean(), r.mean()/r.std()*math.sqrt(len(r))
def ranker(feats,lab):
    trs=tr.sort_values('th'); ok=np.isfinite(trs[lab].values); trs=trs[ok]; grp=trs.groupby('th',sort=False).size().values
    return lgb.LGBMRanker(objective='lambdarank',n_estimators=200,learning_rate=0.03,num_leaves=31,min_child_samples=1000,subsample=0.7,subsample_freq=1,colsample_bytree=0.6,reg_lambda=10,label_gain=list(range(10)),lambdarank_truncation_level=30,verbose=-1,n_jobs=4).fit(trs[feats],trs[lab].astype(int),group=grp)
def regr(feats,lab):
    ok=np.isfinite(tr[lab].values); return lgb.LGBMRegressor(n_estimators=200,learning_rate=0.03,num_leaves=31,min_child_samples=1000,subsample=0.7,subsample_freq=1,colsample_bytree=0.6,reg_lambda=10,verbose=-1,n_jobs=4).fit(tr.loc[ok,feats],tr.loc[ok,lab])
L=[f'# Lambdarank kontrolü · test {test_m[0]} → {test_m[-1]} · {time.strftime("%Y-%m-%d")}','',f'Eğitim {len(tr):,} satır (testten 2 gün önce biter), test {len(te):,}. Plasebo = saat içinde karıştırılmış etiket; piyasa düzeyi = yalnız saat içinde sabit {len(MKT)} değişken (sıralama bilgisi taşıyamaz). IC (oynaklığa bölünmüş) eğitim hedefiyle aynı ölçü; IC (%) ham yüzde getiriyle. 2+2: saat başı en yüksek 2 long + en düşük 2 short, ufuk boyunca tut, her saat yeni kohort (örtüşen), işlem başı ortalama %.','',
   '| Ufuk | Model | IC (oynaklığa bölünmüş) | t | IC (ham %) | Üst onluk % | Alt onluk % | Üst−alt % | 2+2 long % | 2+2 short % | 2+2 ort. maliyetsiz % | taker sonrası % |','|---|---|---|---|---|---|---|---|---|---|---|---|']
OOS={}
for h,(yc,sc) in HZ.items():
    te2=te.copy(); te2['ret']=te2[yc]*te2.sd15*sc*100
    for name,fn in [('lambdarank, gerçek etiket',lambda: ranker(FEATS,yc+'r')),('lambdarank, plasebo etiket',lambda: ranker(FEATS,yc+'p')),('lambdarank, yalnız piyasa düzeyi',lambda: ranker(MKT,yc+'r')),('LightGBM arındırılmış MSE (karşılaştırma)',None)]:
        if fn is None:
            tr[yc+'d']=tr[yc+'c']-tr.groupby('th')[yc+'c'].transform('mean'); feats=FEATS; m=regr(FEATS,yc+'d')
        else: m=fn(); feats=MKT if 'piyasa' in name else FEATS
        o=pd.DataFrame({'t':te2.t.values,'th':te2.th.values,'sym':te2.sym.values,'sd15':te2.sd15.values,'p':m.predict(te2[feats]),'yc':te2[yc+'c'].values,'ret':te2.ret.values})
        a,at=fast_ic(o,'p','yc'); ar,_=fast_ic(o,'p','ret'); dec=np.floor(o.groupby('th')['p'].rank(method='first',pct=True).values*10-1e-9).clip(0,9); top=o.ret[dec==9].mean(); bot=o.ret[dec==0].mean()
        s=o.dropna(subset=['ret']).sort_values(['th','p']); lg_=s.groupby('th').tail(2).ret.mean(); sh_=-s.groupby('th').head(2).ret.mean()
        L.append(f'| {h} | {name} | {fx(a)} | {fx(at,1)} | {fx(ar)} | {fx(top)} | {fx(bot)} | {fx(top-bot)} | {fx(lg_)} | {fx(sh_)} | {fx((lg_+sh_)/2)} | {fx((lg_+sh_)/2-0.16)} |'); OOS[(h,name)]=o
        print(L[-1],f'{time.time()-t0:.0f} sn',flush=True)
pickle.dump(OOS,open(os.path.join(D,'denklem4-lr-oos.pkl'),'wb'))
L+=['','Okuma: plasebo ve yalnız piyasa düzeyi satırlarının IC\'si ≈ 0 olmalı; değilse ölçümde/etikette sızıntı var. Gerçek etiketli lambdarank IC\'si ham % getiride de korunuyorsa sonuç oynaklık normalleştirmesinin yapay ürünü değildir.']
open(OUT,'w').write('\n'.join(L)+'\n'); print('yazıldı',OUT,f'{time.time()-t0:.0f} sn')
