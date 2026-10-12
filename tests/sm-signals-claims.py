# Binance Killers ücretsiz kanal: kanalın sinyal başına sonuç duyurusu (hedef ✅ / zarar) ile ölçülen sonucun karşılaştırması → stdout (rapora elle)
import json, re, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'signals')
R = {r['sid']: r for r in json.load(open(os.path.join(D, '_sonuc.json'))) if r['ch'] == 'binancekillersfreesignals' and r.get('sid')}
W, Lo = set(), set()
for ch in ['binancekillersfreesignals', 'binancekillers']:
    for l in open(os.path.join(D, ch + '.jsonl')):
        t = json.loads(l).get('text') or ''
        m = re.search(r'SIGNAL ID:\s*#?(\d+)', t)
        if not m or re.search(r'(?i)\bentry\b', t): continue
        if re.search(r'Target\s*\d+:\s*[\d.]+\s*✅', t): W.add(m.group(1))
        if re.search(r'(?i)(\bloss\b|sl hit|stop(ped)? (out|hit))', t): Lo.add(m.group(1))
fil = {k: r for k, r in R.items() if isinstance(r.get('A'), dict) and 'R' in r['A']}
stop = {k for k, r in fil.items() if r['A']['hit'] == 0 and r['A']['why'] == 'stop'}
win = {k for k, r in fil.items() if r['A']['hit'] > 0}
print('dolan', len(fil), 'ölçülen hedef1', len(win), 'ölçülen stop (hedefsiz)', len(stop))
print('kanal hedef duyurusu (tüm sinyaller)', len(W & set(R)), 'zarar duyurusu', len(Lo & set(R)))
print('ölçülen stoplardan kanalın zarar duyurduğu', len(stop & Lo), 'kazanç duyurduğu', len(stop & W))
print('ölçülen kazançlardan kanalın duyurduğu', len(win & W))
nf = {k for k, r in R.items() if not (isinstance(r.get('A'), dict) and 'R' in r['A'])}
print('dolmayan/atlanan', len(nf), 'bunlardan hedef duyurusu', len(nf & W))
