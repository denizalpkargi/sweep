# Test #80 (16 Ekim 2026; kullanıcı "bi başlat bakalım bir şeyler çıkıyor mu"): Kaplumbağa'yı hızlandıran varyantlar.
# Önceden sabit (sonuca bakmadan): long, BTC önceki gün kapanışı > SMA200, evren giriş ayının ilk K coini (önceki ayın hacmi, TradFi hariç, delist dahil).
#   A  1g 20/10, ilk 50 (taban; canlı sepet)              B  1g 20/10, ilk 100 (geniş evren)
#   C  erken giriş: 1 sa kapanışı önceki 20 günün tepesini geçince sonraki 1 sa açılışında gir; çıkış A ile aynı (günlük kapanış), ilk 50
#   D  4 sa 20/10 (≈3,3 / 1,7 gün)   E  4 sa 60/30 (10 / 5 gün)   F  4 sa 120/60 (20 / 10 gün, 4 sa kapanışla), hepsi ilk 50
# Kurallar (Kaplumbağa sepetiyle aynı): giriş sinyal mumundan sonraki mumun açılışı; çıkış kapanış < önceki X mumun dibi ya da < giriş − 2N (sonraki açılışta);
# felaket stopu giriş − 4N mum içinde (açılış ötesindeyse açılışta); N = 20 mumluk ATR (C'de günlük). R = getiri ÷ (2N ÷ giriş).
# Maliyet taraf başına %0,08 (taker + kayma), fonlama arşivden (8 saatlik kayıtlar, long öder). Basit getiri.
# Kıyas: rastgele giriş (aynı coin/evren/BTC süzgeci, rastgele mum, aynı çıkış kuralları; 3 tohum, işlem sayısı kadar).
# Portföy: işlem başına %0,5 risk, en çok 10 pozisyon, nominal ≤ 2×; kapanışta gerçekleşen özsermaye (düşüş gerçekleşmiş kâr/zararla, iyimser).
# Geçme (#72 kuralı): iki yarı ve son 12 ay artı, rastgeleden iyi, tabandan (A) iyi, t ≥ 3; sepet varsayılanı yalnız aile DSR ≥ 0,5 ile değişir.
import json, os, numpy as np, pandas as pd, time
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test80-hizli-kaplumbaga-report.md')
DAY=86400000; HR=3600000; SIDE=0.0008
U=json.load(open(f'{A}/universe.json')); TF=set(U['tradfi'])
topM={k:{m:[s for s in v if s not in TF][:k] for m,v in U['months'].items()} for k in (50,100)}
inU={k:{m:set(v) for m,v in d.items()} for k,d in topM.items()}
mon=lambda t: time.strftime('%Y-%m',time.gmtime(t/1000))
def rd(p,n):
    if not os.path.exists(p): return None
    a=pd.read_csv(p,header=None,usecols=range(n)).values
    return a
def bars(s,iv):
    if iv=='1d':
        a=rd(f'{A}/1d/{s}.csv',8)
        if a is None: return None
        a=a[a[:,7]>0]; return dict(t=a[:,0].astype(np.int64),o=a[:,1],h=a[:,2],l=a[:,3],c=a[:,4])
    a=rd(f'{A}/1h/{s}.csv',8)
    if a is None: return None
    a=a[a[:,7]>0]
    if iv=='1h': return dict(t=a[:,0].astype(np.int64),o=a[:,1],h=a[:,2],l=a[:,3],c=a[:,4])
    df=pd.DataFrame(a[:,:5],columns=['t','o','h','l','c']); df['g']=(df.t//(4*HR))*(4*HR)
    g=df.groupby('g').agg(o=('o','first'),h=('h','max'),l=('l','min'),c=('c','last'),n=('t','size'))
    g=g[g.n>=3]; return dict(t=g.index.values.astype(np.int64),o=g.o.values,h=g.h.values,l=g.l.values,c=g.c.values)
def atr(b,n=20):
    pc=np.r_[np.nan,b['c'][:-1]]; tr=np.nanmax(np.c_[b['h']-b['l'],np.abs(b['h']-pc),np.abs(b['l']-pc)],axis=1)
    return pd.Series(tr).rolling(n).mean().values
FUND={}
def fund(s,t0,t1):
    if s not in FUND:
        a=rd(f'{A}/funding/{s}.csv',2); FUND[s]=(a[:,0].astype(np.int64),np.cumsum(a[:,1])) if a is not None and len(a) else None
    f=FUND[s]
    if f is None: return 0.0001*(t1-t0)/(8*HR)
    i0,i1=np.searchsorted(f[0],t0),np.searchsorted(f[0],t1)
    return (f[1][i1-1]-(f[1][i0-1] if i0>0 else 0)) if i1>i0 else 0.0
# BTC SMA200 (günlük): t gününün açılışında bilinen = önceki günün kapanışı > önceki 200 günün ortalaması
bd=bars('BTCUSDT','1d'); sma=pd.Series(bd['c']).rolling(200).mean().values; okday={int(t)+DAY: bool(c>m) for t,c,m in zip(bd['t'],bd['c'],sma) if m==m}
btcOK=lambda t: okday.get(int(t//DAY*DAY),False)
OKD=np.array(sorted(k for k,v in okday.items() if v),dtype=np.int64)
def mask(s,t,K):
    ms=set(m for m,v in inU[K].items() if s in v)
    mm=pd.to_datetime(t,unit='ms').strftime('%Y-%m').values
    d=(t//DAY)*DAY; j=np.clip(np.searchsorted(OKD,d),0,len(OKD)-1)
    return np.isin(mm,list(ms)) & (OKD[j]==d) & (t>=1590969600000)
def sim(s,b,N,sigIdx,exN,dailyExit=None):
    """sigIdx: sinyal mumları (giriş sonraki mumun açılışı). dailyExit: C için (günlük barlar, N) — çıkış günlük kapanışla."""
    out=[]; busy=-1; n=len(b['t'])
    lowX=pd.Series(b['l']).rolling(exN).min().shift(1).values
    for i in sigIdx:
        j=i+1
        if j>=n or j<=busy: continue
        e=b['o'][j]; n0=N[i]
        if not(n0>0) or not(e>0): continue
        stopC=e-2*n0; cat=e-4*n0; t0=b['t'][j]; px=None
        if dailyExit is None:
            k=j
            while k<n:
                if b['l'][k]<=cat: px=min(cat,b['o'][k]); k_end=k; break
                if b['c'][k]<lowX[k] or b['c'][k]<stopC:
                    if k+1<n: px=b['o'][k+1]; k_end=k+1
                    else: px=b['c'][k]; k_end=k
                    break
                k+=1
            if px is None: px=b['c'][-1]; k_end=n-1
            t1=b['t'][k_end]; busy=k_end
        else:
            d,Nd,lowXd=dailyExit
            # gün içi felaket: 1 sa mumlarla; kapanış kuralı günlük kapanışla (giriş gününün kapanışından itibaren)
            dd=np.searchsorted(d['t'],t0//DAY*DAY); k=j; px=None
            while dd<len(d['t']) and px is None:
                dend=d['t'][dd]+DAY
                while k<n and b['t'][k]<dend:
                    if b['l'][k]<=cat: px=min(cat,b['o'][k]); t1=b['t'][k]; busy=k; break
                    k+=1
                if px is not None: break
                if d['c'][dd]<lowXd[dd] or d['c'][dd]<stopC:
                    if dd+1<len(d['t']): px=d['o'][dd+1]; t1=d['t'][dd+1]
                    else: px=d['c'][dd]; t1=d['t'][dd]
                    busy=np.searchsorted(b['t'],t1); break
                dd+=1
            if px is None: px=b['c'][-1]; t1=b['t'][-1]; busy=n
        g=px/e-1-2*SIDE-fund(s,t0,t1); r0=2*n0/e
        out.append(dict(s=s,t0=int(t0),t1=int(t1),g=g,R=g/r0,r0=r0))
    return out
VAR=dict(A=('1d',20,10,50),B=('1d',20,10,100),C=('1h',20,10,50),D=('4h',20,10,50),E=('4h',60,30,50),F=('4h',120,60,50))
syms={k:sorted(set(s for v in topM[k].values() for s in v)) for k in (50,100)}
res={}; rng=np.random.default_rng(7)
def run(v,rand=False,seed=0):
    iv,en,ex,K=VAR[v]; tr=[]; r=np.random.default_rng(seed)
    for s in syms[K]:
        if iv=='1h':
            b=CACHE.setdefault((s,'1h'),bars(s,'1h')); d=CACHE.setdefault((s,'1d'),bars(s,'1d'))
            if b is None or d is None or len(d['t'])<60: continue
            Nd=atr(d); hiD=pd.Series(d['h']).rolling(en).max().values   # gün d'nin sonunda biten 20 gün
            # 1 sa mumunun günündeki eşik = önceki günün sonunda biten 20 günün tepesi
            di=np.searchsorted(d['t'],b['t']//DAY*DAY)-1; ok=di>=0
            thr=np.where(ok,hiD[np.clip(di,0,None)],np.nan); Nh=np.where(ok,Nd[np.clip(di,0,None)],np.nan)
            cand=np.where((b['c']>thr))[0]
            lowXd=pd.Series(d['l']).rolling(ex).min().shift(1).values; extra=(d,Nd,lowXd); N=Nh
        else:
            b=CACHE.setdefault((s,iv),bars(s,iv))
            if b is None or len(b['t'])<200: continue
            N=atr(b); hi=pd.Series(b['h']).rolling(en).max().shift(1).values
            cand=np.where(b['c']>hi)[0]; extra=None
        M=mask(s,b['t'],K); cand=[i for i in cand if M[i]]
        if rand:
            pool=np.where(M)[0] if len(cand) else []
            # aynı sayıda sinyal: gerçek sinyal kümesindeki işlem sayısı bilinmediği için aday sayısının oranı korunur
            cand=sorted(r.choice(pool,size=min(len(pool),len(cand)),replace=False)) if len(pool) else []
        tr+=sim(s,b,N,cand,ex,extra)
    return pd.DataFrame(tr)
CACHE={}
def port(T,risk=0.005,K=10,L=2.0):
    ev=sorted([(r.t0,0,i) for i,r in T.iterrows()]+[(r.t1,1,i) for i,r in T.iterrows()]); eq=1.0; op={}; curve=[(T.t0.min(),1.0)]
    for t,k,i in ev:
        r=T.loc[i]
        if k==0:
            if len(op)>=K: continue
            nom=risk*eq/r.r0
            if sum(op.values())+nom>L*eq: continue
            op[i]=nom
        elif i in op: eq+=op.pop(i)*r.g; curve.append((t,eq))
    c=pd.DataFrame(curve,columns=['t','e']); yrs=(c.t.iloc[-1]-c.t.iloc[0])/(365*DAY)
    return eq**(1/yrs)-1, (c.e/c.e.cummax()-1).min(), len(c)-1
fx=lambda v,k=3: (f'{v:+.{k}f}').replace('.',',') if np.isfinite(v) else '–'
L=[f'# Test #80 · Hızlı Kaplumbağa varyantları · {time.strftime("%Y-%m-%d")}','','Long, BTC > SMA200, giriş ayının ilk K coini; giriş sonraki mumun açılışı; çıkış X mumun dibi ya da giriş − 2N, felaket 4N; maliyet %0,08 × 2 + fonlama; R = getiri ÷ 2N. Dönem 2020-06 → 2026-10.','',
   '| varyant | n | ayda | ort. R | t | 1. yarı | 2. yarı | son 24 ay | son 12 ay | rastgele R | medyan tutuş (gün) | kazanma | portföy yıllık / düşüş (alınan) |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|']
YR={}
for v in VAR:
    T=run(v); T=T.sort_values('t0').reset_index(drop=True)
    R=pd.concat([run(v,True,sd) for sd in range(3)])
    end=T.t1.max(); mid=T.t0.iloc[len(T)//2]; y12=end-365*DAY; y24=end-730*DAY
    tt=lambda x: x.mean()/x.std()*np.sqrt(len(x)) if len(x)>2 else np.nan
    months=(end-T.t0.min())/(30.4*DAY); a,dd,nt=port(T)
    L.append(f'| {v} {VAR[v][0]} {VAR[v][1]}/{VAR[v][2]} ilk {VAR[v][3]} | {len(T)} | {len(T)/months:.1f} | {fx(T.R.mean(),2)} | {fx(tt(T.R),1)} | {fx(T[T.t0<mid].R.mean(),2)} | {fx(T[T.t0>=mid].R.mean(),2)} | {fx(T[T.t0>=y24].R.mean(),2)} | {fx(T[T.t0>=y12].R.mean(),2)} ({(T.t0>=y12).sum()}) | {fx(R.R.mean(),2)} | {np.median((T.t1-T.t0)/DAY):.1f} | %{(T.g>0).mean()*100:.0f} | {fx(a*100,0)} % / {fx(dd*100,0)} % ({nt}) |')
    T['y']=pd.to_datetime(T.t0,unit='ms').dt.year; YR[v]=T.groupby('y').R.mean()
    T.to_csv(os.path.join(H,'data','arch',f'test80-{v}.csv'),index=False)
    print(L[-1],flush=True)
L+=['','Yıl yıl ort. R:','','| varyant | '+' | '.join(str(y) for y in sorted(YR['A'].index))+' |','|---|'+'---:|'*len(YR['A'])]
for v,s in YR.items(): L.append(f'| {v} | '+' | '.join(fx(s.get(y,np.nan),2) for y in sorted(YR['A'].index))+' |')
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L[-9:]))
