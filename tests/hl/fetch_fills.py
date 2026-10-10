import json,hl,time,os,sys
T0=int(time.mktime((2026,6,1,0,0,0,0,0,0))*1000)
users=json.load(open(sys.argv[1]))
out='fills.jsonl'; done=set()
if os.path.exists(out):
    for l in open(out): done.add(json.loads(l)['u'])
with open(out,'a') as f:
    for i,u in enumerate(users):
        if u in done: continue
        try:
            st=hl.info({'type':'clearinghouseState','user':u})
            fl=[];s=T0;pages=0
            while True:
                d=hl.info({'type':'userFillsByTime','user':u,'startTime':s})
                pages+=1
                if not d: break
                fl+=d; s=max(x['time'] for x in d)+1
                if len(d)<2000 or pages>=15: break
        except Exception as e: print('err',u,e,flush=True); continue
        pos={p['position']['coin']:float(p['position']['szi']) for p in st.get('assetPositions',[])}
        fl=[(x['time'],x['coin'],float(x['startPosition']),float(x['sz'])*(1 if x['side']=='B' else -1),float(x['px'])) for x in fl]
        f.write(json.dumps({'u':u,'pos':pos,'av':float(st['marginSummary']['accountValue']),'fills':fl,'capped':pages>=15})+'\n'); f.flush()
        print(i,u,len(fl),pages,flush=True)
