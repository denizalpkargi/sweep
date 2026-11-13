# Test #90 (16 Ekim 2026; kullanıcının 5 fikri, 3; BIS WP 1087): BTC çeyreklik vadeli bazı rejim kapısı.
# Önceden sabit: her gün, vadesine ≥ 14 gün kalan en yakın çeyreklik vadeli (tests/fetch-quarterly.py) ile perp günlük kapanışı:
# yıllık baz = (çeyrek / perp − 1) × 365 / kalan gün. Bayrak 1 "baz yüksek": bazın son 365 günün (yalnız geçmiş, en az 120 gün) %80 yüzdeliğinin üstünde;
# bayrak 2 "baz hızlı artıyor": 7 günlük baz değişimi aynı şekilde %80 üstü. Beklenti: bayraklıyken longlar kötü.
# Ölçüm: BTC sonraki 7 / 30 gün basit getirisi; masa long/short kararlarının R'si; Kaplumbağa A ve F işlemlerinin R'si (bayrak giriş gününden önceki kapanıştan).
import os, glob, re, numpy as np, pandas as pd, datetime as dt, importlib.util
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'data','arch'); OUT=os.path.join(H,'test90-ceyrek-baz-report.md'); DAY=86400000
sp=importlib.util.spec_from_file_location('ok',os.path.join(H,'test-ortak-kapi.py')); ok=importlib.util.module_from_spec(sp); sp.loader.exec_module(ok)
pc=pd.read_csv(f'{A}/1d/BTCUSDT.csv',header=None,usecols=[0,4],names=['t','c']).drop_duplicates('t').set_index('t').c
Q={}
for p in glob.glob(f'{A}/quarterly/BTCUSDT_*.csv'):
    e=dt.datetime.strptime(re.search(r'_(\d{6})',p).group(1),'%y%m%d').replace(hour=8,tzinfo=dt.timezone.utc).timestamp()*1000
    k=pd.read_csv(p,header=None,usecols=[0,4],names=['t','c']).drop_duplicates('t').set_index('t').c; Q[e]=k
B={}
for t in pc.index:
    cands=[e for e in Q if e-t>=14*DAY and t in Q[e].index]
    if not cands: continue
    e=min(cands); d=(e-t)/DAY; B[t]=(Q[e][t]/pc[t]-1)*365/d
b=pd.Series(B).sort_index()
def hi(x): return x.rolling(365,min_periods=120).apply(lambda w:(w[:-1]<w[-1]).mean(),raw=True)>=0.8
f1=hi(b); f2=hi(b-b.shift(7))
def flag_at(f,t):  # karardan önceki kapanmış gün (gün açılış zamanı + 1 gün ≤ t)
    i=f.index.searchsorted(np.asarray(t)-DAY,side='right')-1; out=np.zeros(len(i),bool); m=i>=0; out[m]=f.values[i[m]]; return out, (np.asarray(t)-DAY>=f.index[0])
L=['# Test #90 · BTC çeyreklik vadeli baz kapısı (16 Ekim 2026)\n',
   f'Baz serisi {pd.Timestamp(b.index[0],unit="ms"):%Y-%m-%d} → {pd.Timestamp(b.index[-1],unit="ms"):%Y-%m-%d}, {len(Q)} vade. Yıllık baz medyan {b.median()*100:.1f} %, %10–90 {b.quantile(.1)*100:.1f} … {b.quantile(.9)*100:.1f} %. Bayrak 1 gün payı {f1.mean()*100:.0f} %, bayrak 2 {f2.mean()*100:.0f} %.\n']
for nm,f in [('Baz yüksek (365 g %80 üstü)',f1),('Baz hızlı artıyor (7 g değişim %80 üstü)',f2)]:
    L.append(f'## {nm}\n'); L.append(ok.HEAD.replace(' R (n)',' değer (n)'))
    c=pc.reindex(f.index)
    for hz in (7,30):
        fw=(c.shift(-hz)/c-1); m=f.index>=f.index[0]+120*DAY
        ok.split(f'BTC sonraki {hz} g getirisi (gün)',f.index[m],fw.values[m],f.values[m],L)
    ms=ok.masa()
    for d in ('long','short'):
        z=ms[ms.dir==d]; fl,val=flag_at(f,z.t.values); ok.split(f'masa {d} R',z.t.values[val],z.R.values[val],fl[val],L)
    for v in ('A','F'):
        z=ok.turtle(v); fl,val=flag_at(f,z.t0.values); ok.split(f'Kaplumbağa {v} R',z.t0.values[val],z.R.values[val],fl[val],L)
    L.append('')
L.append('Not: BTC getiri satırında gözlemler örtüşür (günlük, 7/30 gün ileri); t şişkindir.')
open(OUT,'w').write('\n'.join(L)+'\n'); print('\n'.join(L))
