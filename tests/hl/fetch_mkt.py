import json,hl,time
T0=int(time.mktime((2026,5,1,0,0,0,0,0,0))*1000); NOW=int(time.time()*1000)
meta,ctx=hl.info({'type':'metaAndAssetCtxs'})
names=[m['name'] for m in meta['universe']]
vol=sorted([(float(c['dayNtlVlm']),n) for n,c,m in zip(names,ctx,meta['universe']) if not m.get('isDelisted')],reverse=True)
coins=[n for v,n in vol[:45]]
print(coins,flush=True)
out={'coins':coins,'candles':{},'funding':{}}
for c in coins:
    k=[];s=T0
    while s<NOW:
        d=hl.info({'type':'candleSnapshot','req':{'coin':c,'interval':'1h','startTime':s,'endTime':NOW}})
        if not d: break
        k+=d; s=d[-1]['t']+3600000
        if len(d)<4000: break
    out['candles'][c]=[(x['t'],float(x['o']),float(x['c']),float(x['v'])) for x in k]
    f=[];s=T0
    while s<NOW:
        d=hl.info({'type':'fundingHistory','coin':c,'startTime':s})
        if not d: break
        f+=d; s=d[-1]['time']+1
        if len(d)<500: break
    out['funding'][c]=[(x['time'],float(x['fundingRate'])) for x in f]
    print(c,len(k),len(f),flush=True)
json.dump(out,open('mkt.json','w'))
