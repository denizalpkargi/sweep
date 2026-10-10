# Denklem 4 ek (9 Ekim 2026, Kaggle kıyası): ağ (sıralama kayıplı) ile LightGBM (ham MSE) OOS tahminlerini saat içi sıra ortalamasıyla harmanla.
# DRW 1. çözümü MLP (MSE+Pearson) + XGBoost karışımı kullandı; bizde ikisi ayrı ölçüldü, karışım hiç denenmedi. → tests/denklem4-blend-report.md
import pickle, numpy as np, pandas as pd, math, os, time
A=os.path.join(os.path.dirname(__file__),'data','arch'); OUT=os.path.join(os.path.dirname(__file__),'denklem4-blend-report.md'); t0=time.time()
d=pickle.load(open(f'{A}/denklem4-nn-oos.pkl','rb')); HN=['1 sa','4 sa','12 sa','24 sa']
def fast_ic(o,pcol,ycol,key='th',minn=10):
    x=o[[key,pcol,ycol]].dropna(); codes,_=pd.factorize(x[key].values); n=np.bincount(codes)
    rp=x.groupby(key)[pcol].rank().values; ry=x.groupby(key)[ycol].rank().values
    sx=np.bincount(codes,rp); sy=np.bincount(codes,ry); sxx=np.bincount(codes,rp*rp); syy=np.bincount(codes,ry*ry); sxy=np.bincount(codes,rp*ry)
    with np.errstate(invalid='ignore',divide='ignore'): r=(sxy-sx*sy/n)/np.sqrt((sxx-sx*sx/n)*(syy-sy*sy/n))
    r=r[(n>=minn)&np.isfinite(r)]; return r.mean(), len(r)
fx=lambda v,k=3: f'{v:+.{k}f}'.replace('.',',')
nn=d['ağ derin tablo'].copy(); lg=d['LightGBM tümü'].copy(); at=d['ağ coinler arası dikkat'].copy()
assert (nn.th.values==lg.th.values).all() and (nn.sym.values==lg.sym.values).all()
B=nn[['t','th','sym','sd15']+['yc_'+h for h in HN]].copy()
for h in HN:
    for nm,src in [('nn',nn),('lg',lg),('at',at)]: B[f'{nm}_{h}']=src['p_'+h].values; B[f'r{nm}_{h}']=src.groupby('th')['p_'+h].rank(pct=True).values
    B[f'b50_{h}']=(B[f'rnn_{h}']+B[f'rlg_{h}'])/2; B[f'b70_{h}']=0.7*B[f'rnn_{h}']+0.3*B[f'rlg_{h}']; B[f'b3_{h}']=(B[f'rnn_{h}']+B[f'rlg_{h}']+B[f'rat_{h}'])/3
mid=np.sort(B.t.values)[len(B)//2]; y12=B.t.max()-365*864e5
P=[('tümü',B),('1. yarı',B[B.t<mid]),('2. yarı',B[B.t>=mid]),('son 12 ay',B[B.t>=y12])]
L=[f'# Denklem 4 ek · ağ + LightGBM harmanı (saat içi sıra ortalaması) · {time.strftime("%Y-%m-%d")}','',f'{len(B):,} OOS saat-coin satırı (2024-06 → 2026-10). Sıra = saat içi yüzdelik; harman = sıraların ağırlıklı ortalaması. IC = saat içi Spearman ortalaması.','','| Ufuk | Dönem | ağ | LightGBM | dikkat | ağ+LGB 50/50 | ağ+LGB 70/30 | ağ+LGB+dikkat | ağ–LGB sıra korelasyonu |','|---|---|---|---|---|---|---|---|---|']
for h in HN:
    for pn,sub in P:
        cor=np.corrcoef(sub[f'rnn_{h}'].values,sub[f'rlg_{h}'].values)[0,1]
        L.append(f'| {h} | {pn} | '+' | '.join(fx(fast_ic(sub,c,'yc_'+h)[0]) for c in [f'nn_{h}',f'lg_{h}',f'at_{h}',f'b50_{h}',f'b70_{h}',f'b3_{h}'])+f' | {cor:.2f} |')
L+=['','Okuma: harman tek başına ağı geçiyorsa (iki yarıda) DRW 1. çözümündeki MLP+GBDT karışımı bizde de işe yarıyor demektir; geçmiyorsa LightGBM\'in bilgisi ağın içinde zaten var.']
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L)); print('yazıldı',OUT,f'{time.time()-t0:.0f} sn')
