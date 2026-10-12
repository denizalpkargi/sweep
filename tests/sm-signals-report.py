# Sinyal kanalları özet raporu (11 Ekim 2026): tests/data/signals/_sonuc.json → tests/sm-signals-report.md
import json, os, re, math, statistics as st
from collections import defaultdict
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'signals')
R = json.load(open(os.path.join(D, '_sonuc.json')))
AD = {'binancekillersfreesignals': 'Binance Killers (ücretsiz kanal)', 'binancekillers': 'Binance Killers (ana kanal, VIP tekrarları)', 'WallstreetQueenOfficial': 'Wallstreet Queen Official',
      'cryptosignals0rg': 'cryptosignals.org', 'evening_trader_official': 'Evening Trader', 'ravensignalspro': 'Raven Signals Pro', 'AltSignals': 'AltSignals'}
f = lambda x, k=2: '–' if x is None or (isinstance(x, float) and math.isnan(x)) else f'{x:.{k}f}'.replace('.', ',')
pc = lambda x: '–' if x is None else f'{100 * x:.0f} %'

def tstat(rows, key):
    by = defaultdict(list)
    for r in rows: by[r['t'] // (30 * 864e5)].append(key(r))
    m = [sum(v) / len(v) for v in by.values()]
    if len(m) < 3: return None
    sd = st.stdev(m); return sum(m) / len(m) / (sd / math.sqrt(len(m))) if sd > 0 else None

def block(rows, mode):
    ok = [r for r in rows if isinstance(r.get(mode), dict) and 'R' in r[mode]]
    if not ok: return None
    Rs = [r[mode]['R'] for r in ok]; mir = [r for r in ok if isinstance(r.get(mode + 'm'), dict) and 'R' in r[mode + 'm']]
    rnd = [r for r in ok if r.get(mode + 'r') is not None]; mk = [r for r in ok if isinstance(r.get(mode + 'k'), dict) and 'R' in r[mode + 'k']]
    yrs = defaultdict(list)
    for r in ok: yrs[int(__import__('datetime').datetime.utcfromtimestamp(r['t'] / 1000).year)].append(r[mode]['R'])
    return dict(n=len(ok), win=sum(x > 0 for x in Rs) / len(Rs), hit1=sum(r[mode]['hit'] > 0 for r in ok) / len(ok), R=sum(Rs) / len(Rs), med=st.median(Rs), tR=tstat(ok, lambda r: r[mode]['R']),
                ret=sum(r[mode]['ret'] for r in ok) / len(ok), risk=sum(r[mode]['risk'] for r in ok) / len(ok),
                mir=sum(r[mode + 'm']['R'] for r in mir) / len(mir) if mir else None,
                dmir=sum(r[mode]['R'] - r[mode + 'm']['R'] for r in mir) / len(mir) if mir else None, tdm=tstat(mir, lambda r: r[mode]['R'] - r[mode + 'm']['R']) if mir else None,
                rnd=sum(r[mode + 'r'] for r in rnd) / len(rnd) if rnd else None, mkt=sum(r[mode + 'k']['R'] for r in mk) / len(mk) if mk else None,
                L=st.mean([r[mode]['R'] for r in ok if r['dir'] > 0]) if any(r['dir'] > 0 for r in ok) else None,
                S=st.mean([r[mode]['R'] for r in ok if r['dir'] < 0]) if any(r['dir'] < 0 for r in ok) else None,
                nL=sum(r['dir'] > 0 for r in ok), yrs={y: (len(v), sum(v) / len(v)) for y, v in sorted(yrs.items())})

md = ['# Telegram sinyal kanalları · çağrılar fiyatla ölçüldü\n',
      'Kaynak: kanalların herkese açık web önizlemesi (t.me/s), 2023-01-01 → 2026-10, kullanıcının PC\'sinden indirildi. Yalnız giriş + stop + hedef içeren çağrılar; VIP\'ten iletilen ya da tekrar paylaşılan aynı sinyal bir kez (ilk görünüş). Son 15 günün çağrıları sonucu belli olmadığı için dışarıda.',
      'Ölçü: Binance vadeli (yoksa 1000\'li perp, yoksa spot) 15 dk mumlar. Giriş: bölgenin yakın kenarına limit (fiyat zaten bölgedeyse sonraki 15 dk açılışı), "instant/now" çağrısında sonraki açılış, "buy stop"ta kırılımda; 72 saatte dolmazsa ya da dolmadan hedef 1 vurulursa işlem yok (Cornix kuralı). 14 gün sonra kapanış. Stop ve hedef aynı mumda → stop. Maliyet: limit %0,02, market %0,08; fonlama yok.',
      '**A** = tamamı hedef 1\'de; **B** = ilk 3 hedefe eşit böl, hedef 1\'den sonra stop girişe. R = net ÷ |giriş − stop|. **Ayna** = aynı an ve dolum fiyatı, stop ve hedefler ters tarafta (yön bilgisi yoksa ayna ile aynı sonucu verir). **Rastgele saat** = aynı coin, aynı yön ve geometri, yayından ±10 gün içinde rastgele mumda market giriş. **Market** = aynı an, aynı plan, limit beklemeden giriş.\n']
md.append('| Kanal | Çağrı | Fiyat bulunan | Doldu | Dolmadan hedef 1 | Dolmadı | Düzenlenmiş |\n|---|---|---|---|---|---|---|')
groups = defaultdict(list)
for r in R: groups[r['ch']].append(r)
summ = {}
for ch, rows in sorted(groups.items(), key=lambda x: -len(x[1])):
    pr = [r for r in rows if not r.get('err')]
    fil = [r for r in pr if isinstance(r.get('A'), dict) and 'R' in r['A']]
    sk = [r for r in pr if isinstance(r.get('A'), dict) and r['A'].get('skip')]
    md.append(f"| {AD.get(ch, ch)} | {len(rows)} | {len(pr)} | {len(fil)} ({pc(len(fil) / max(1, len(pr)))}) | {len(sk)} ({pc(len(sk) / max(1, len(pr)))}) | {len(pr) - len(fil) - len(sk)} | {sum(r['edited'] for r in rows)} |")
    summ[ch] = {m: block(rows, m) for m in 'AB'}
md.append('\n## Sonuç (R / işlem)\n')
md.append('| Kanal | Yönetim | İşlem | Kazanan | Hedef 1 vuruldu | Ort. R | Medyan R | t | Ort. getiri % (kaldıraçsız) | Ort. stop % | Ayna R | Fark (çağrı − ayna) | Fark t | Rastgele saat R | Market giriş R | Long R (n) | Short R |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for ch in summ:
    for m in 'AB':
        b = summ[ch][m]
        if not b: continue
        md.append(f"| {AD.get(ch, ch)} | {m} | {b['n']} | {pc(b['win'])} | {pc(b['hit1'])} | **{f(b['R'])}** | {f(b['med'])} | {f(b['tR'], 1)} | {f(100 * b['ret'])} | {f(100 * b['risk'], 1)} | {f(b['mir'])} | {f(b['dmir'])} | {f(b['tdm'], 1)} | {f(b['rnd'])} | {f(b['mkt'])} | {f(b['L'])} ({b['nL']}) | {f(b['S'])} |")
md.append('\n## Yıl yıl (A yönetimi, işlem / ort. R)\n')
md.append('| Kanal | 2023 | 2024 | 2025 | 2026 |\n|---|---|---|---|---|')
for ch in summ:
    b = summ[ch]['A']
    if b: md.append(f"| {AD.get(ch, ch)} | " + ' | '.join(f"{b['yrs'][y][0]} / {f(b['yrs'][y][1])}" if y in b['yrs'] else '–' for y in (2023, 2024, 2025, 2026)) + ' |')
# kanalların kendi duyuruları: kazanç / kayıp sonuç mesajları
md.append('\n## Kanalların kendi sonuç duyuruları\n\nSinyal metni olmayan (giriş içermeyen) mesajlarda hedef/kâr duyurusu ile stop/zarar duyurusu sayısı.\n')
md.append('| Kanal | Mesaj | Kazanç duyurusu | Zarar duyurusu |\n|---|---|---|---|')
for ch in ['binancekillers', 'binancekillersfreesignals', 'WallstreetQueenOfficial', 'cryptosignals0rg', 'AltSignals', 'evening_trader_official', 'ravensignalspro', 'fatpigsignals']:
    p = os.path.join(D, ch + '.jsonl')
    if not os.path.exists(p): continue
    T = [json.loads(l).get('text') or '' for l in open(p)]
    T = [t for t in T if t and not re.search(r'(?i)\bentry\b|stop[- ]?loss\s*:|\bsl\s*:', t)]
    w = sum(bool(re.search(r'(?i)(target\s*\d+\s*:\s*[\d.]+\$?\s*(✅|✔️)|target\s*\d?\s*(done|hit|achieved|reached|✅)|targets? (done|destroyed|achieved|hit)|take-profit target|all take-profit|profit booked|profit:\s*\+?[\d.]+\s*%|tp\s*\d?\s*(hit|✅|done))', t)) for t in T)
    l = sum(bool(re.search(r'(?i)(stop[- ]?loss (hit|triggered|reached)|stopped out|hit (the )?(sl|stop)|sl hit|stop target hit|loss:\s*-?[\d.]+\s*%|closed in loss)', t)) for t in T)
    md.append(f'| {AD.get(ch, ch)} | {len(T)} | {w} | {l} |')
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sm-signals-report.md'), 'w').write('\n'.join(md) + '\n\n_python3 tests/sm-signals-report.py_\n')
json.dump(summ, open(os.path.join(D, '_ozet-sonuc.json'), 'w'), default=str)
print('\n'.join(md[:40]))
