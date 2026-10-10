# Büyük işlem akışı (aggTrades) ilk ölçüm (9 Ekim 2026, test listesi #35): saatlik büyüklük kovalı taker akışı → coinler arası ileri getiri.
# Veri tests/data/arch/aggflow/<SYM>.csv (fetch-aggflow.js; ilk 20 coin, 2025-01'den), getiri tests/data/arch/1h (VWAP [low,high] içinde sınırlı),
# giriş t+1 VWAP → t+1+h VWAP, basit %. Saat başına en az 10 coin. IC = saat içi Spearman ortalaması; "kontrollü" = geçmiş 1/4/24 sa getiri ve
# toplam taker dengesizliği saat içi sıralarından arındırılmış kısmi IC. Kullanım: python3 tests/aggflow-study.py → tests/aggflow-report.md
import os, glob, math, time, numpy as np, pandas as pd
A=os.path.join(os.path.dirname(__file__),'data','arch'); OUT=os.path.join(os.path.dirname(__file__),'aggflow-report.md'); t0=time.time(); HZ=[1,4,12,24]
rows=[]
for f in sorted(glob.glob(f'{A}/aggflow/*.csv')):
    s=os.path.basename(f)[:-4]; k=f'{A}/1h/{s}.csv'
    if not os.path.exists(k): continue
    a=pd.read_csv(f,header=None,names=['t','n','q','qb','q1k','qb1k','q10k','qb10k','q100k','qb100k','mx','n100k']).drop_duplicates('t').set_index('t').sort_index()
    if len(a)<24*60: continue
    kl=pd.read_csv(k,header=None).iloc[:,[0,2,3,4,5,7]]; kl.columns=['t','h','l','c','v','qv']; kl=kl.drop_duplicates('t').set_index('t').sort_index(); kl=kl[kl.index>=a.index.min()-30*864e5]
    vw=np.where(kl.v>0,kl.qv/kl.v.replace(0,np.nan),np.nan); vw=np.where((vw>=kl.l*0.999)&(vw<=kl.h*1.001),vw,kl.c); kl['vw']=vw
    full=pd.DataFrame(index=kl.index).join(a,how='left'); d=pd.DataFrame(index=kl.index)
    q=full.q; sm=(q-full.q10k); smb=(full.qb-full.qb10k)
    d['imb']=(2*full.qb-q)/q; d['imb10k']=(2*full.qb10k-full.q10k)/full.q10k.where(full.q10k>0); d['imb100k']=(2*full.qb100k-full.q100k)/full.q100k.where(full.q100k>0)
    d['imbSmall']=(2*smb-sm)/sm.where(sm>0); d['bigMinusSmall']=d.imb10k-d.imbSmall
    d['sh10k']=full.q10k/q; d['sh100k']=full.q100k/q; d['sz']=np.log(q/full.n); d['szZ']=d.sz-d.sz.rolling(720,min_periods=240).mean()
    d['n100kZ']=np.log1p(full.n100k)-np.log1p(full.n100k).rolling(720,min_periods=240).mean(); d['sh100kZ']=d.sh100k-d.sh100k.rolling(720,min_periods=240).mean()
    for c in ['imb10k','imb100k','imbSmall','bigMinusSmall']:
        num={'imb10k':(2*full.qb10k-full.q10k),'imb100k':(2*full.qb100k-full.q100k),'imbSmall':(2*smb-sm),'bigMinusSmall':None}[c]
        if num is not None: den={'imb10k':full.q10k,'imb100k':full.q100k,'imbSmall':sm}[c]; d[c+'24']=num.rolling(24,min_periods=12).sum()/den.rolling(24,min_periods=12).sum(); d[c+'4']=num.rolling(4,min_periods=2).sum()/den.rolling(4,min_periods=2).sum()
    d['bigMinusSmall24']=d.imb10k24-d.imbSmall24; d['bigMinusSmall4']=d.imb10k4-d.imbSmall4; d['imb24']=(2*full.qb-q).rolling(24,min_periods=12).sum()/q.rolling(24,min_periods=12).sum()
    lc=np.log(kl.c); d['r1']=lc.diff(); d['r4']=lc.diff(4); d['r24']=lc.diff(24)
    v=kl.vw.values; n=len(v)
    for h in HZ:
        y=np.full(n,np.nan); y[:n-h-1]=(v[1+h:]/v[1:n-h]-1)*100; d[f'y{h}']=y
    d['sym']=s; d=d[d.index>=a.index.min()]; d=d[np.isfinite(full.q.reindex(d.index).values)]; rows.append(d.reset_index().rename(columns={'index':'t'}))
D=pd.concat(rows,ignore_index=True); D=D[D.groupby('t').sym.transform('count')>=10].reset_index(drop=True)
FE=['imb','imb24','imb10k','imb100k','imbSmall','bigMinusSmall','imb10k4','imb100k4','imbSmall4','bigMinusSmall4','imb10k24','imb100k24','imbSmall24','bigMinusSmall24','sh10k','sh100k','sh100kZ','szZ','n100kZ','r1','r4','r24']
CTRL=['r1','r4','r24','imb']
print('satır',len(D),'saat',D.t.nunique(),'coin',D.sym.nunique(),f'{time.time()-t0:.0f} sn',flush=True)
# saat içi sıralar
R=D[['t']].copy()
for c in FE+[f'y{h}' for h in HZ]: R[c]=D.groupby('t')[c].rank(pct=True)
def ic_by_hour(x,y,t):
    m=np.isfinite(x)&np.isfinite(y); df=pd.DataFrame({'t':t[m],'x':x[m],'y':y[m]}); g=df.groupby('t')
    xm=g.x.transform('mean'); ym=g.y.transform('mean'); df['xy']=(df.x-xm)*(df.y-ym); df['xx']=(df.x-xm)**2; df['yy']=(df.y-ym)**2; s=df.groupby('t')[['xy','xx','yy']].sum(); cnt=g.size()
    r=(s.xy/np.sqrt(s.xx*s.yy))[cnt>=10].replace([np.inf,-np.inf],np.nan).dropna(); return r
def resid(c):  # saat içi sıranın kontrollerden arındırılmış kalıntısı (saat içi doğrusal regresyon, sıralar üzerinde)
    X=R[[x for x in CTRL if x!=c]].copy(); y=R[c].copy(); out=np.full(len(R),np.nan)
    for tt,idx in R.groupby('t').indices.items():
        xx=X.values[idx]; yy=y.values[idx]; m=np.isfinite(yy)&np.all(np.isfinite(xx),axis=1)
        if m.sum()<10: continue
        Z=np.column_stack([np.ones(m.sum()),xx[m]]); b=np.linalg.lstsq(Z,yy[m],rcond=None)[0]; o=np.full(len(idx),np.nan); o[m]=yy[m]-Z@b; out[idx]=o
    return out
mid=np.sort(D.t.unique())[D.t.nunique()//2]; y12=D.t.max()-365*864e5; tt=R.t.values
fx=lambda v,d=3: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.',',')
def summ(x,hcol):
    r=ic_by_hour(x,R[hcol].values,tt); out=[]
    for sel in [r.index>=0, r.index<mid, r.index>=mid, r.index>=y12]: rr=r[sel]; out.append(rr.mean())
    h=int(hcol[1:]); tstat=r.mean()/r.std()*math.sqrt(len(r)/max(h,1))  # örtüşen ufuk için t'yi √h ile kıs
    return out,tstat
L=[f'# Büyük işlem akışı (aggTrades) · ilk ölçüm · {time.strftime("%Y-%m-%d")}','',f'{len(D):,} saat-coin satırı, {D.t.nunique():,} saat, {D.sym.nunique()} coin (ayın ilk 20\'si), {pd.to_datetime(D.t.min(),unit="ms").date()} → {pd.to_datetime(D.t.max(),unit="ms").date()}. İleri getiri t+1 VWAP → t+1+h VWAP, basit %. IC = saat içi Spearman ortalaması; t örtüşme için √h ile kısıldı. Kovalar: ≥10k ve ≥100k USDT tek işlem; küçük = <10k. Dengesizlik = (taker alış − taker satış) / toplam.','',
   '## 1) Tek değişken IC (tümü / 1. yarı / 2. yarı / son 12 ay)','','| Değişken | 1 sa | 4 sa | 12 sa | 24 sa | t 4 sa | t 24 sa |','|---|---|---|---|---|---|---|']
SUM={}
for c in FE:
    cells=[]; ts={}
    for h in HZ:
        o,tst=summ(R[c].values,f'y{h}'); ts[h]=tst; SUM[(c,h)]=o; cells.append(' / '.join(fx(v) for v in o))
    L.append(f'| {c} | '+' | '.join(cells)+f' | {fx(ts[4],1)} | {fx(ts[24],1)} |')
L+=['','## 2) Kontrollü kısmi IC (geçmiş 1/4/24 sa getiri ve toplam dengesizlik sıralarından arındırılmış)','','| Değişken | 1 sa | 4 sa | 12 sa | 24 sa | t 4 sa |','|---|---|---|---|---|---|']
for c in [x for x in FE if x not in CTRL]:
    e=resid(c); cells=[]
    for h in HZ: o,tst=summ(e,f'y{h}'); cells.append(' / '.join(fx(v) for v in o)); 
    o4,t4=summ(e,'y4'); L.append(f'| {c} | '+' | '.join(cells)+f' | {fx(t4,1)} |')
    print('kontrollü',c,f'{time.time()-t0:.0f} sn',flush=True)
L+=['','## Okuma','','- Tutarlı sayılan: dört dönemde aynı işaretli ve |IC| ≥ 0,02, kontrollü IC de aynı işaretli.','- r1/r4/r24 kıyas içindir (kısa vadeli geri dönüş Denklem 1–4\'ten bilinen bilgi).']
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L)); print('yazıldı',OUT,f'{time.time()-t0:.0f} sn')
