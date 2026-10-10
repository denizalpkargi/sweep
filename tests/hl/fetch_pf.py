import json,random,os,hl,sys
if not os.path.exists('lb.json'):
    import urllib.request
    with urllib.request.urlopen('https://stats-data.hyperliquid.xyz/Mainnet/leaderboard',context=hl.CTX) as f: open('lb.json','wb').write(f.read())
r=json.load(open('lb.json'))['leaderboardRows']
def w(x,k): return {a:b for a,b in x['windowPerformances']}[k]
pool=[x['ethAddress'] for x in r if float(w(x,'allTime')['vlm'])>=1e6]
random.seed(38); random.shuffle(pool)
N=int(sys.argv[1]); out='pf.jsonl'
done=set()
if os.path.exists(out):
    for l in open(out): done.add(json.loads(l)['u'])
print(len(pool),'pool',len(done),'done',flush=True)
with open(out,'a') as f:
    for i,u in enumerate(pool[:N]):
        if u in done: continue
        try: d=hl.info({'type':'portfolio','user':u})
        except Exception as e: print('err',u,e,flush=True); continue
        d=dict(d); keep={k:d[k] for k in ('perpAllTime','perpMonth') if k in d}
        f.write(json.dumps({'u':u,'pf':keep})+'\n'); f.flush()
        if i%200==0: print(i,flush=True)
