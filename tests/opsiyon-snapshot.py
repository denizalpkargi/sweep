# Deribit opsiyon zincirinin anlık görüntüsü (11 Ekim 2026): P/C OI, GEX (bayi call uzun / put kısa varsayımı), vade başına max pain ve en büyük gamma strike.
# Önce: curl ".../public/get_book_summary_by_currency?currency=BTC&kind=option" > book-BTC.json (ETH de). Kullanım: python3 tests/opsiyon-snapshot.py
import json,math,sys,collections,time
def N(x): return 0.5*(1+math.erf(x/math.sqrt(2)))
def n(x): return math.exp(-x*x/2)/math.sqrt(2*math.pi)
now=time.time()*1000
MON={m:i for i,m in enumerate(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],1)}
import datetime as dt
for c in ['BTC','ETH']:
    B=json.load(open(f'book-{c}.json'))['result']
    S=B[0]['estimated_delivery_price']
    rows=[]
    for x in B:
        _,e,K,cp=x['instrument_name'].split('-'); K=float(K)
        d=int(e[:-5]); m=MON[e[-5:-2]]; y=2000+int(e[-2:])
        T=(dt.datetime(y,m,d,8,tzinfo=dt.timezone.utc).timestamp()*1000-now)/(365*864e5)
        if T<=0: continue
        F=x['underlying_price']; iv=(x['mark_iv'] or 0)/100; oi=x['open_interest']
        if iv<=0: continue
        d1=(math.log(F/K)+iv*iv*T/2)/(iv*math.sqrt(T)); g=n(d1)/(F*iv*math.sqrt(T))
        rows.append((e,K,cp,oi,g,T,F,x['volume']))
    gex=sum(oi*g*S*S*0.01*(1 if cp=='C' else -1) for e,K,cp,oi,g,T,F,v in rows)
    oiC=sum(r[3] for r in rows if r[2]=='C'); oiP=sum(r[3] for r in rows if r[2]=='P')
    vC=sum(r[7] for r in rows if r[2]=='C'); vP=sum(r[7] for r in rows if r[2]=='P')
    print(c,'spot',S,'OI call',round(oiC),'put',round(oiP),'P/C OI',round(oiP/oiC,2),'P/C hacim 24s',round(vP/max(vC,1e-9),2),'GEX (bayi uzun call/kısa put varsayımı) $',round(gex/1e6,1),'M /%1')
    # max pain per expiry with OI share
    by=collections.defaultdict(list)
    for r in rows: by[r[0]].append(r)
    tot=sum(r[3] for r in rows)
    for e,rs in sorted(by.items(),key=lambda kv:kv[1][0][5])[:8]:
        Ks=sorted(set(r[1] for r in rs))
        def pain(P): return sum(r[3]*(max(0,P-r[1]) if r[2]=='C' else max(0,r[1]-P)) for r in rs)
        mp=min(Ks,key=pain); oi=sum(r[3] for r in rs)
        g=collections.Counter()
        for r in rs: g[r[1]]+=r[3]*r[4]*S*S*0.01*(1 if r[2]=='C' else -1)
        top=max(g.items(),key=lambda kv:abs(kv[1]))
        print('  ',e,'OI payı %',round(100*oi/tot,1),'max pain',mp,'(%+.1f%%)'%(100*(mp/S-1)),'en büyük gamma strike',top[0],round(top[1]/1e6,1),'M')
