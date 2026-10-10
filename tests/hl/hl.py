import json, time, urllib.request, urllib.error, ssl, os, sys
CA='/root/.ccr/ca-bundle.crt'
CTX = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
last=[0.0]
GAP=float(os.environ.get('HLGAP','1.0'))
def info(body, tries=8):
    for t in range(tries):
        w = last[0]+GAP-time.time()
        if w>0: time.sleep(w)
        last[0]=time.time()
        req=urllib.request.Request('https://api.hyperliquid.xyz/info', data=json.dumps(body).encode(), headers={'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=60, context=CTX) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(min(120, 5*2**t)); continue
            if e.code>=500: time.sleep(5); continue
            raise
        except Exception as e:
            time.sleep(5)
    raise RuntimeError('fail')
