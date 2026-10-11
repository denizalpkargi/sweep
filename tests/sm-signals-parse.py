# Telegram sinyal kanalları (11 Ekim 2026): t.me/s önizlemesinden indirilen mesajlardan (tests/data/signals/<kanal>.jsonl, PC'de toplandı)
# giriş/stop/hedef çağrılarını ayrıştırır → tests/data/signals/_cagrilar.json
# Kullanım: python3 tests/sm-signals-parse.py
import json, re, os, sys
from datetime import datetime
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'signals')
CH = ['binancekillersfreesignals', 'binancekillers', 'WallstreetQueenOfficial', 'cryptosignals0rg', 'evening_trader_official', 'ravensignalspro', 'AltSignals']
NOT_CRYPTO = {'GOLD', 'XAU', 'XAUUSD', 'XAG', 'EUR', 'GBP', 'JPY', 'USD', 'US30', 'NAS', 'SPX', 'OIL', 'WTI', 'USDT', 'BTCD', 'TOTAL', 'VIP', 'FREESIGNAL', 'SIGNAL', 'COIN', 'ID'}
NUM = r'(\d+(?:\.\d+)?)'

def norm(t):
    t = t.replace('–', '-').replace('—', '-').replace('➝', ' ').replace('→', ' ').replace('➡️', ' ').replace('$', ' $').replace('‍', '')
    t = re.sub(r'(\d),(\d{3})(?!\d)', r'\1\2', t)          # binlik virgül
    return t

def nums(seg):
    seg = re.sub(r'\d+(?:\.\d+)?\s*%', ' ', seg)            # yüzdeler
    seg = re.sub(r'\b1\s*:\s*\d+(?:\.\d+)?', ' ', seg)     # RRR 1:3
    seg = re.sub(r'\d+\s*[xX]\s*\d*', ' ', seg)             # kaldıraç 10x, 20x50
    seg = re.sub(r'[xX]\s*\d+', ' ', seg)
    seg = re.sub(r'(?<![\d.])\d\)\s', ' ', seg)             # 1) numaralar
    seg = re.sub(r'(?i)tp\s*\d', ' ', seg)                 # TP1
    seg = re.sub(r'#\d+', ' ', seg)
    return [float(x) for x in re.findall(r'(?<![\w.])' + NUM + r'(?![\w])', seg)]

LAB = [('entry', r'(?i)(entry\s*(?:zone|price|targets?)?|buy\s*zone|take entry now|entries)\s*[:\-]?'),
       ('ote', r'\bOTE\b\s*:?'),
       ('tp', r'(?i)((?:take[- ]profit|profit)\s*targets?|targets?|\btp\s*\d?)\s*[:\-]?'),
       ('sl', r'(?i)(stop[- ]?loss|stoploss|stop\s*targets?|\bstop\b|\bsl\b)\s*[:\-]?')]

def parse(text):
    t = norm(text)
    if re.search(r'(?i)(targets? (done|hit|achieved|reached)|take-profit target \d ✅|all take-profit|profit booked|profit:\s*[\d.]+%|period:|results)', t):
        return None
    # coin
    m = (re.search(r'(?i)instrument:\s*([A-Z0-9]{2,15}?)(?:/?USDT?|USD)\b', t) or re.search(r'[#$]?\s?([A-Z0-9]{2,15})\s*/\s*USDT?\b', t)
         or re.search(r'#([A-Z0-9]{2,15}?)USDT\b', t) or re.search(r'[#$]([A-Z][A-Z0-9]{1,14})\b', t))
    if not m: return None
    coin = m.group(1).upper()
    if coin in NOT_CRYPTO or re.search(r'(?i)\b(gold|xau|forex|pips)\b', t): return None
    if re.search(r'(?i)\b(short|sell)\b', t) and not re.search(r'(?i)\b(long|buy)\b', t): dr = -1
    elif re.search(r'(?i)\b(long|buy)\b', t) and not re.search(r'(?i)\b(short|sell)\b', t): dr = 1
    else:
        a = re.search(r'(?i)(direction|type|setup type|opinion)\s*:?\s*[^\n]{0,20}?\b(long|short|buy|sell)', t) or re.search(r'(?i)\b(long|short|buy|sell)\b', t)
        if not a: return None
        dr = 1 if a.group(a.lastindex).lower() in ('long', 'buy') else -1
    # bölümler
    pos = []
    for k, rx in LAB:
        for mm in re.finditer(rx, t): pos.append((mm.start(), mm.end(), k))
    pos.sort()
    sec = {}
    for i, (s, e, k) in enumerate(pos):
        nxt = pos[i + 1][0] if i + 1 < len(pos) else len(t)
        if k == 'tp' and 'tp' in sec and sec.get('_last') == 'tp': sec['tp'] += ' ' + t[e:nxt]
        elif k not in sec: sec[k] = t[e:nxt]
        elif k == 'tp': sec['tp'] += ' ' + t[e:nxt]
        sec['_last'] = k
    if 'entry' not in sec and pos: sec['entry'] = t[m.end():pos[0][0]]
    if 'entry' not in sec or 'sl' not in sec: return None
    en = nums(sec['entry'])[:2]; sl = nums(sec['sl'])[:1]; tp = nums(sec.get('tp', ''))
    ote = nums(sec['ote'])[:1] if 'ote' in sec else []
    # "Long #BSB 0.44163 ... Sl" biçimi (evening trader): giriş etiketi yoksa coinin ardındaki sayı
    if not en or not sl or not tp: return None
    lo, hi = min(en), max(en); stop = sl[0]
    ref = ote[0] if ote else (lo + hi) / 2
    tp = [x for x in tp if (x > hi if dr > 0 else x < lo)]
    if dr > 0: tp = sorted(set(tp))
    else: tp = sorted(set(tp), reverse=True)
    if not tp: return None
    if dr > 0 and not (stop < lo): return None
    if dr < 0 and not (stop > hi): return None
    if abs(ref - stop) / ref > 0.6 or hi / lo > 1.5: return None
    kind = 'limit'
    if re.search(r'(?i)(buy|sell)\s*stop', t): kind = 'stop'
    elif re.search(r'(?i)(instant execution|take entry now|long now|short now|market)', t) or lo == hi: kind = 'market' if re.search(r'(?i)(instant|now|market)', t) else 'limit'
    if re.search(r'(?i)entry:?\s*below', t): kind = 'limit_below'
    sid = re.search(r'SIGNAL ID:\s*#?(\d+)', t)
    lev = re.search(r'(\d+)\s*-?\s*(\d+)?\s*[xX]', t)
    return dict(coin=coin, dir=dr, lo=lo, hi=hi, ref=ref, stop=stop, tp=tp[:10], kind=kind, sid=sid.group(1) if sid else None)

out = []; stat = {}
for ch in CH:
    f = os.path.join(D, ch + '.jsonl')
    if not os.path.exists(f): continue
    L = [json.loads(l) for l in open(f)]
    L.sort(key=lambda x: x['time'])
    seen = {}; n = 0
    for x in L:
        if not x.get('text'): continue
        p = parse(x['text'])
        if not p: continue
        t = int(datetime.fromisoformat(x['time']).timestamp() * 1000)
        key = ('id', p['sid']) if p['sid'] else (p['coin'], p['dir'], round(p['ref'], 8))
        # aynı sinyal tekrar paylaşılmışsa (VIP'ten iletilmiş, tekrar) ilk zaman
        if key in seen and (p['sid'] or t - seen[key] < 3 * 864e5): continue
        seen[key] = t
        p.update(ch=ch, t=t, id=x['id'], edited=bool(x.get('edited')), fwd=x.get('fwd')); out.append(p); n += 1
    stat[ch] = n
json.dump(out, open(os.path.join(D, '_cagrilar.json'), 'w'))
print(stat, len(out))
