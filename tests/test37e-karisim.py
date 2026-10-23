# Test #37 (e) (14 Ekim 2026, günlük döngü): lambdarank LightGBM + sıralama kayıplı ağ karışımı (DRW 1. çözümü MLP + GBDT).
# Girdi: tests/data/arch/denklem4-lr-oos.pkl (lambdarank, gerçek etiket, 4/12 sa) ve denklem4-nn-oos.pkl (ağ derin tablo, ağ dikkat).
# (t, sym) üzerinden ortak satırlar; karışım = saat içi yüzdelik sıraların ortalaması (50/50, önceden sabit; 70/30 iki yönde yan bilgi).
# Ölçü: saat içi Spearman IC (VWAP hedef yc), yarılar + son 12 ay; üst−alt onluk farkı (basit % getiri, 'ret' lambdarank dosyasından ölçeklenmemiş).
# Geçme: 50/50 karışım IC'si en iyi tek modelden iki yarıda ve son 12 ayda büyük. → tests/test37e-karisim-report.md
import pickle, numpy as np, pandas as pd, os, time
A=os.path.join(os.path.dirname(__file__),'data','arch'); OUT=os.path.join(os.path.dirname(__file__),'test37e-karisim-report.md')
LR=pd.read_pickle(f'{A}/denklem4-lr-oos.pkl'); NN=pd.read_pickle(f'{A}/denklem4-nn-oos.pkl')
def ic(o,p,y='y'):
    x=o[['th',p,y]].dropna(); g=x.groupby('th'); rp=g[p].rank(); ry=g[y].rank(); x=x.assign(rp=rp,ry=ry)
    r=x.groupby('th').apply(lambda z: np.corrcoef(z.rp,z.ry)[0,1] if len(z)>=10 else np.nan).dropna(); return r.mean(), len(r)
fx=lambda v,k=3: f'{v:+.{k}f}'.replace('.',',')
L=[f'# Test #37 (e) · lambdarank + ağ karışımı · {time.strftime("%Y-%m-%d")}','']
for h in ['4 sa','12 sa']:
    lr=LR[(h,'lambdarank, gerçek etiket')][['t','sym','p','yc','ret']].rename(columns={'p':'lr'})
    nn=NN['ağ derin tablo'][['t','th','sym','p_'+h,'yc_'+h]].rename(columns={'p_'+h:'nn','yc_'+h:'ycn'})
    at=NN['ağ coinler arası dikkat'][['t','sym','p_'+h]].rename(columns={'p_'+h:'at'})
    B=lr.merge(nn,on=['t','sym']).merge(at,on=['t','sym']); B['y']=B['yc']
    agree=np.corrcoef(B.yc.rank(),B.ycn.rank())[0,1]
    for c in ['lr','nn','at']: B['r'+c]=B.groupby('th')[c].rank(pct=True)
    B['k50']=(B.rlr+B.rnn)/2; B['k70']=0.7*B.rlr+0.3*B.rnn; B['k30']=0.3*B.rlr+0.7*B.rnn; B['k3']=(B.rlr+B.rnn+B.rat)/3
    mid=np.sort(B.t.unique())[B.t.nunique()//2]; y12=B.t.max()-365*864e5
    P=[('tümü',B),('1. yarı',B[B.t<mid]),('2. yarı',B[B.t>=mid]),('son 12 ay',B[B.t>=y12])]
    L+=[f'## {h}','',f'{len(B):,} ortak satır, {B.th.nunique():,} saat, {pd.to_datetime(B.t.min(),unit="ms"):%Y-%m-%d} → {pd.to_datetime(B.t.max(),unit="ms"):%Y-%m-%d}; iki dosyanın hedef sırası uyumu {agree:.3f}; lambdarank–ağ sıra korelasyonu {np.corrcoef(B.rlr,B.rnn)[0,1]:.2f}.','',
        '| dönem | saat | lambdarank | ağ | dikkat | 50/50 | 70/30 (LR) | 30/70 (ağ) | üçlü | 50/50 üst−alt onluk % |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    res=[]
    for pn,s in P:
        v={c:ic(s,c)[0] for c in ['lr','nn','at','k50','k70','k30','k3']}
        q=s.groupby('th')['k50'].rank(pct=True); top=s.ret[q>0.9].mean(); bot=s.ret[q<=0.1].mean()
        res.append((pn,v)); L.append(f'| {pn} | {s.th.nunique():,} | '+' | '.join(fx(v[c]) for c in ['lr','nn','at','k50','k70','k30','k3'])+f' | {fx(top-bot,2)} |')
    ok=all(v['k50']>max(v['lr'],v['nn']) for pn,v in res[1:]); L+=['',f'Geçme (50/50 iki yarıda ve son 12 ayda en iyi tek modelden büyük): **{"geçti" if ok else "geçmedi"}**.','']
L+=['Not: lambdarank OOS dosyası yalnız tek pencereyi (2025-06 → 2025-11) içerir, bu yüzden "son 12 ay" tüm dönemle aynı; karşılaştırma ortak satırlarda. ret = lambdarank dosyasındaki ileri getiri (birimi dosyadaki gibi).']
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
