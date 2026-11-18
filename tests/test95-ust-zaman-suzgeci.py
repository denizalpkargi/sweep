# Test #95: üst zaman dilimi yön süzgeci (22 Ekim taraması; kullanıcının 6 Ekim sorusu "15 dk'da 4 sa, 1 sa'te günlük").
# Giriş kuralları sabit; süzgeç işlemi yalnız üst zaman dilimindeki yön işlem yönüyle aynıysa tutar. Üç yön tanımı (sonuca bakmadan):
#   sma  : SMA50 eğimi (SMA50 şimdi > 5 mum önceki → yukarı)
#   don  : 20/10 Donchian durumu (kapanış önceki 20 mumun tepesini geçince yukarı, önceki 10 mumun dibinin altına inince aşağı; arada son durum)
#   yapi : HH/HL (3'lü pivotlar; son iki tepe ve iki dip ikisi de yükselen → yukarı, ikisi de alçalan → aşağı, aksi nötr = atılır)
# Yalnız kapanmış mumlar. Sinyal kaynakları: masa kararları (giriş kapısını geçen, 15 dk; süzgeç 1 sa / 4 sa / 1 g), Kaplumbağa A
# (test80-A, 1 g long; süzgeç 1 hf). Ichimoku 4 sa işlem verisi bulutta yok (tests/data/sm), atlandı.
# Plasebo: aynı oranda işlemi rastgele atan süzgeç, 500 tekrar; p = rastgelenin süzgeç kadar iyi olma oranı.
import os, sys, numpy as np, pandas as pd
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import importlib.util
spec=importlib.util.spec_from_file_location('ok',os.path.join(os.path.dirname(os.path.abspath(__file__)),'test-ortak-kapi.py')); ok=importlib.util.module_from_spec(spec); spec.loader.exec_module(ok)
A=ok.A; DAY=ok.DAY; HR=3600000
def load(s,iv):
    p=f'{A}/{iv}/{s}.csv'
    if not os.path.exists(p): return None
    d=pd.read_csv(p,header=None,usecols=[0,1,2,3,4]); d.columns=['t','o','h','l','c']; return d
def agg(d,ms):
    g=(d.t//ms)*ms; x=d.groupby(g).agg(o=('o','first'),h=('h','max'),l=('l','min'),c=('c','last'),n=('t','size')).reset_index().rename(columns={'t':'t'})
    x.columns=['t','o','h','l','c','n']; return x
def states(d,ms):
    """her mum için kapanış zamanı ve üç yön (+1/−1/0)"""
    c,h,l=d.c.values,d.h.values,d.l.values; n=len(c)
    sma=pd.Series(c).rolling(50).mean().values; s1=np.sign(sma-np.roll(sma,5)); s1[:55]=0
    hi20=pd.Series(h).rolling(20).max().shift(1).values; lo10=pd.Series(l).rolling(10).min().shift(1).values
    dn=np.zeros(n); st=0
    for i in range(n):
        if c[i]>hi20[i]: st=1
        elif c[i]<lo10[i]: st=-1
        dn[i]=st
    # pivotlar i'de onaylanır (i+1 kapanınca): h[i-1] > h[i-2] ve h[i-1] > h[i]
    yp=np.zeros(n); PH=[]; PL=[]
    for i in range(2,n):
        if h[i-1]>h[i-2] and h[i-1]>h[i]: PH.append(h[i-1])
        if l[i-1]<l[i-2] and l[i-1]<l[i]: PL.append(l[i-1])
        if len(PH)>=2 and len(PL)>=2:
            yp[i]=1 if PH[-1]>PH[-2] and PL[-1]>PL[-2] else -1 if PH[-1]<PH[-2] and PL[-1]<PL[-2] else 0
    return d.t.values+ms, {'sma':s1,'don':dn,'yapi':yp}
def lookup(cache,s,iv,ms,t):
    k=(s,ms)
    if k not in cache:
        d=load(s,iv)
        if d is None: cache[k]=None
        else:
            if iv=='1h' and ms>HR: d=agg(d,ms)
            if iv=='1d' and ms>DAY: d=agg(d,ms)  # haftalık: 4 günden kaydırılmış epoch haftası değil, takvim etkisi küçük
            cache[k]=states(d,ms)
    if cache[k] is None: return None
    ct,S=cache[k]; i=np.searchsorted(ct,t,side='right')-1
    return {f:(S[f][i] if i>=60 else np.nan) for f in S}
rng=np.random.default_rng(95)
def evaluate(name,df,L):
    t=df.t.values; R=df.R.values; mid=(t.min()+t.max())/2; l12=t.max()-365*DAY
    per=[('tümü',np.ones(len(t),bool)),('ilk yarı',t<mid),('ikinci yarı',t>=mid),('son 12 ay',t>=l12)]
    for f in ['sma','don','yapi']:
        keep=(df[f].values==df.sgn.values); ok_=~np.isnan(df[f].values)
        cells=[]
        for pn,m in per:
            m=m&ok_; base=R[m]; kept=R[m&keep]
            if len(kept)<20: cells.append('—'); continue
            frac=len(kept)/len(base); rnd=np.array([rng.choice(base,len(kept),replace=False).mean() for _ in range(500)])
            p=(rnd>=kept.mean()).mean()
            cells.append(f'{kept.mean():+.3f} / {base.mean():+.3f} · %{frac*100:.0f} · p {p:.2f}')
        L.append(f'| {name} | {f} | '+' | '.join(cells)+' |')
L=['# Test #95: üst zaman dilimi yön süzgeci\n',
   'Hücre: süzgeçle kalan R / süzgeçsiz R · kalan pay · p (aynı oranda rastgele atan süzgecin en az bu kadar iyi olma oranı, 500 tekrar). Geçme: dört dönemde de süzgeçli > süzgeçsiz ve p ≤ 0,05.\n',
   '| Kaynak (süzgeç dilimi) | yön | tümü | ilk yarı | ikinci yarı | son 12 ay |','|---|---|---|---|---|---|']
cache={}
M=ok.masa(); M['sgn']=np.where(M.dir=='long',1,-1)
for lab,iv,ms in [('masa 15 dk (1 sa)','1h',HR),('masa 15 dk (4 sa)','1h',4*HR),('masa 15 dk (1 g)','1d',DAY)]:
    rows=[lookup(cache,s,iv,ms,t) for s,t in zip(M.s,M.t)]
    X=M.copy();
    for f in ['sma','don','yapi']: X[f]=[r[f] if r else np.nan for r in rows]
    for side in ['long','short']:
        evaluate(f'{lab} · {side}',X[X.dir==side].reset_index(drop=True),L)
    evaluate(f'{lab} · ikisi',X,L); print(lab,flush=True)
    for k in [k for k in cache if k[1]==ms]: cache.pop(k)
T=ok.turtle('A').rename(columns={'t0':'t'}); T['sgn']=1
rows=[lookup(cache,s,'1d',7*DAY,t) for s,t in zip(T.s,T.t)]
for f in ['sma','don','yapi']: T[f]=[r[f] if r else np.nan for r in rows]
evaluate('Kaplumbağa A 1 g (1 hf)',T,L)
out=os.path.join(os.path.dirname(os.path.abspath(__file__)),'test95-ust-zaman-suzgeci-report.md')
open(out,'w').write('\n'.join(L).replace('.',',').replace('#,','#.')+'\n'); print('\n'.join(L))
