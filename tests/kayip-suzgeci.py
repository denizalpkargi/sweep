# Kayıp süzgeci (10 Ekim 2026): masanın hiç açmaması gereken kararları geçmiş veriyle bulur ve örneklem dışında sınar.
# Kullanıcı karar kartında "Kayıp süzgeci"ni seçti. Girdi: tests/masa-archive.js örnekleri (samples-*.jsonl; arşiv /mnt/project-files/veri-arsivi/samples.tar.gz).
# Karar kümesi bugünkü giriş kuralı (veto yok, puan ≥ 0,35, evet ≥ 3). Üç bölüm:
#   1) İleriye yürüyen seçim: 6 ayda bir, yalnız önceki veriyle açgözlü "uyarsa girme" kuralları (en çok 4, her biri kalan R'yi ≥0,01 artırır, ≥%40 kalır),
#      sonraki 6 ayda uygulanır; örneklem dışı fark gün kümeli bootstrap ile (aynı gün coinler bağımlı).
#   2) Sabit kurallar yıl yıl (atlanan / kalan R).
#   3) Senaryolar bugünkü masaya (BTC 200 kapısı açık) karşı: yarılar, son 12 ay, t.
# Kullanım: python3 -I tests/kayip-suzgeci.py <samples klasörü>   (~3 dk, numpy + pandas)
import json, glob, sys, numpy as np, pandas as pd
rows=[]
for f in sorted(glob.glob(sys.argv[1]+'/samples-*.jsonl')):
    for l in open(f):
        s=json.loads(l)
        if s['veto'] or s['R'] is None or (s['score'] or 0)<0.35 or s['yes']<3: continue
        r={'t':s['t'],'long':1 if s['dir']=='long' else 0,'score':s['score'],'yes':s['yes'],'sd':s['sd'],'R':s['R']}
        for k,(v,c,ab) in s['a'].items(): r['v_'+k]=np.nan if ab else v; r['c_'+k]=np.nan if ab else c
        for k,v in s['x'].items(): r[k]=np.nan if v is None else v
        rows.append(r)
df=pd.DataFrame(rows).sort_values('t').reset_index(drop=True); df['ts']=pd.to_datetime(df.t,unit='ms'); df['day']=df.t//864e5; df['yr']=df.ts.dt.year
R=df.R.values; L=df.long.values==1; T=df.t.values; rng=np.random.default_rng(1)
GATE=~(df.bs200>0).values  # bugünkü BTC 200 kapısının vetoladığı kararlar (örneklerde kapı yok; bs200 yönde işaretli)
print(f"karar {len(df)}, ort. {R.mean():+.4f}R; long {R[L].mean():+.3f}, short {R[~L].mean():+.3f}")
def boot(sel,skA,skB,n=400):  # B'nin kalanları ile A'nın kalanları arasındaki işlem başı R farkı, gün kümeli bootstrap
    d=pd.DataFrame({'day':df.day[sel],'R':R[sel],'a':~skA[sel],'b':~skB[sel]}); d['Ra']=d.R*d.a; d['Rb']=d.R*d.b
    g=d.groupby('day').agg(ra=('Ra','sum'),na=('a','sum'),rb=('Rb','sum'),nb=('b','sum')).values; D=len(g); o=[]
    for _ in range(n): s=g[rng.integers(0,D,D)]; o.append(s[:,2].sum()/max(1,s[:,3].sum())-s[:,0].sum()/max(1,s[:,1].sum()))
    ra=g[:,0].sum()/g[:,1].sum(); rb=g[:,2].sum()/g[:,3].sum(); return ra,int(g[:,1].sum()),rb,int(g[:,3].sum()),rb-ra,np.std(o)
# ---- 1) ileriye yürüyen seçim ----
FEATS=[f for f in ['score','yes','sd','atrp','r1','r4','r24','r7d','r30d','s20','s50','s200','pos24','vq','tk','vol30','b4','b24','bs200','bs50','fr','hr']+[c for c in df.columns if c[:2] in('v_','c_')] if df[f].notna().mean()>0.3 and df[f].nunique()>5]
MK={}
def M(r):
    if r not in MK:
        f,op,v,side=r
        if f=='long': m=df.long.values==v
        else: x=df[f].values; m=np.isfinite(x)&((x<v) if op=='<' else (x>v))
        MK[r]=m if side is None else m&(df.long.values==side)
    return MK[r]
def greedy(idx,base):
    C=[('long','=',1,None),('long','=',0,None)]
    for f in FEATS:
        v=df[f].values[idx&~base]; v=v[np.isfinite(v)]
        if len(v)<2000: continue
        q=np.quantile(v,[.1,.2,.8,.9])
        for side in (None,1,0): C+= [(f,'<',float(q[0]),side),(f,'<',float(q[1]),side),(f,'>',float(q[2]),side),(f,'>',float(q[3]),side)]
    keep=idx&~base; n0=keep.sum(); rules=[]
    for _ in range(4):
        cur=R[keep].mean(); best=None
        for c in C:
            if c in rules: continue
            k2=keep&~M(c); n2=k2.sum()
            if n2<0.4*n0 or keep.sum()-n2<0.03*keep.sum(): continue
            g=R[k2].mean()-cur
            if g>=0.01 and (best is None or g>best[0]): best=(g,c,k2)
        if not best: break
        rules.append(best[1]); keep=best[2]
    return rules
folds=list(pd.date_range('2022-01-01','2026-07-01',freq='6MS'))+[pd.Timestamp('2027-01-01')]
for name,base in (('kapısız',np.zeros(len(df),bool)),('BTC 200 kapısı açık',GATE)):
    OOS=np.zeros(len(df),bool); SK=np.zeros(len(df),bool); print(f"\n== ileriye yürüyen seçim, {name} ==")
    for a,b in zip(folds[:-1],folds[1:]):
        tr=(df.ts<a).values; te=((df.ts>=a)&(df.ts<b)).values; rules=greedy(tr,base); sk=base.copy()
        for r in rules: sk|=M(r)
        OOS|=te; SK|=sk&te
        print(a.date(),' · '.join(f"{'long ' if s==1 else 'short ' if s==0 else ''}{f}{op}{v:.4g}" for f,op,v,s in rules) or '(kural yok)', f"| kalan {R[te&~sk].mean():+.3f} ({(te&~sk).sum()}) taban {R[te&~base].mean():+.3f}")
    ra,na,rb,nb,dd,se=boot(OOS,base,SK); print(f"örneklem dışı 2022-01 → 2026-10: {ra:+.4f}R ({na}) → {rb:+.4f}R ({nb}), fark {dd:+.4f} t {dd/se:.1f}")
# ---- 2) sabit kurallar yıl yıl ----
r7=df.r7d.values; Y=df.yr.values; yrs=sorted(set(Y))
print('\n== sabit kurallar (atlanan R / kalan − taban, yıl yıl) ==')
for name,sk in (('BTC 200 kapısı',GATE),('long yok',L),('7 gün trende karşı (r7d<0)',r7<0),('long ve 24 sa > %8 (pompa)',L&(df.r24>0.08).values),('long ve 24 sa aralığın tepesi (>0,9)',L&(df.pos24>0.9).values),('BTC SMA200 yönde > %40',(df.bs200>0.4).values),('long yok + r7d<0',L|(r7<0))):
    print(f"{name:38s} atlanan %{100*sk.mean():.0f} {R[sk].mean():+.3f}R kalan {R[~sk].mean():+.3f}R | "+' '.join(f"{y}:{R[(Y==y)&~sk].mean()-R[Y==y].mean():+.3f}" for y in yrs))
# ---- 3) senaryolar bugünkü masaya karşı ----
mid=np.median(T); last=T>=T.max()-365*864e5; days=(T.max()-T.min())/864e5
print('\n== senaryolar (bugünkü masa = BTC 200 kapısı) ==')
for name,sk in (('kapı + r7d<0',GATE|(r7<0)),('kapı + long yok',GATE|L),('kapı + long yok + r7d<0',GATE|L|(r7<0)),('kapısız r7d<0',r7<0),('kapısız long yok + r7d<0 (seçilen)',L|(r7<0))):
    out=[]
    for sel,lab in ((T<mid,'1. yarı'),(T>=mid,'2. yarı'),(last,'son 12 ay'),(np.ones(len(T),bool),'tümü')):
        ra,na,rb,nb,dd,se=boot(sel,GATE,sk); out.append(f"{lab} {ra:+.3f}→{rb:+.3f} ({dd:+.3f}, t {dd/se:.1f})")
    print(f"{name:36s} günde {(~sk).sum()/days:.1f} karar | "+' · '.join(out))
