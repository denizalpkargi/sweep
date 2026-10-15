# Token kilit açılımı (unlock) olay çalışması — 14 Ekim 2026 (kullanıcı Ozan'ı geliştirecek kaynaklar için "evet" dedi)
# Soru: büyük kilit açılımları (insider / yatırımcı payının bir günde serbest kalması) coinin piyasaya göre getirisini etkiliyor mu,
# özellikle açılımdan önceki günlerde (literatürdeki "açılım öncesi düşüş")? Etki varsa Ozan'a / masaya süzgeç olarak girer.
# Veri: DefiLlama'nın ücretsiz veri dosyaları (defillama-datasets.llama.fi: emissionsIndex = tarihli açılım olayları, emissions/<slug> = günlük
# serbest arz eğrisi), Binance vadeli 1g arşivi (delist dahil), aylık evren (universe.json), fonlama arşivi.
# Olay: kategori insiders / privateSale olan, tek günde (cliff) açılan pay; büyüklük = miktar ÷ önceki günün serbest arzı.
# Getiri: günlük kapanıştan kapanışa basit getiri, piyasaya göre fazla = coin − o gün ayın ilk 100 coininin eşit ortalaması.
# Pencereler (gün 0 = açılım günü, UTC): [−30,−1], [−7,−1], [0,+7], [+1,+30]. Short kuralı: gün −7 kapanışında short,
# gün 0 kapanışında kapat; taker gidiş-dönüş %0,16, fonlama arşivden (short pozitif fonlamayı alır).
# Uyarılar: DefiLlama listesi bugünkü (ölü tokenlar eksik olabilir); takvim önceden bilinir varsayılır (vesting sözleşmeleri herkese açık).
# Kullanım: python tests/unlock-etkisi.py <arşiv klasörü (1d, funding, universe.json)> [--fetch]
import sys, os, json, math, time, urllib.request, numpy as np, pandas as pd
A = sys.argv[1]; HERE = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(HERE, 'data', 'unlock'); os.makedirs(RAW, exist_ok=True)
BASE = 'https://defillama-datasets.llama.fi'; COST = 0.16
f = lambda v, d=2: '—' if v is None or not np.isfinite(v) else f'{v:+.{d}f}'.replace('.', ',')

def get(path, out):
    p = os.path.join(RAW, out)
    if os.path.exists(p) and '--fetch' not in sys.argv: return json.load(open(p, encoding='utf-8'))
    for k in range(3):
        try:
            with urllib.request.urlopen(BASE + path, timeout=60) as r: b = r.read()
            open(p, 'wb').write(b); time.sleep(0.5); return json.loads(b)
        except Exception as e:
            if k == 2: print('alınamadı', path, e); return None
            time.sleep(3)

U = json.load(open(os.path.join(A, 'universe.json'), encoding='utf-8')); months = U['months']
have = {os.path.basename(x)[:-4] for x in os.listdir(os.path.join(A, '1d'))}
idx = get('/emissionsIndex', 'index.json')['data']
mp = {}   # fiyat sembolü → Binance perp (SYMUSDT, 1000SYMUSDT, 1000000SYMUSDT)
for e in idx:
    sym = (e.get('tokenPrice') or [{}])[0].get('symbol')
    if not sym or not e.get('protocolSlug') or not e.get('unlockEvents'): continue
    for c in (sym.upper() + 'USDT', '1000' + sym.upper() + 'USDT', '1000000' + sym.upper() + 'USDT'):
        if c in have and c not in mp.values(): mp[e['protocolSlug']] = c; break
print(len(idx), 'protokol,', len(mp), 'Binance perp ile eşleşti', flush=True)
INS = {'insiders', 'privateSale'}
ev = []
for slug, bsym in mp.items():
    d = get(f'/emissions/{slug}', f'{slug}.json')
    if not d: continue
    curve = {}
    for lab in (d.get('documentedData') or {}).get('data') or []:
        for p in lab.get('data', []): curve[p['timestamp']] = curve.get(p['timestamp'], 0) + (p.get('unlocked') or 0)
    if not curve: continue
    S = pd.Series(curve).sort_index(); S.index = pd.to_datetime(S.index, unit='s').normalize(); S = S.groupby(level=0).max()
    e = next(x for x in idx if x.get('protocolSlug') == slug)
    for u in e.get('unlockEvents') or []:
        day = pd.to_datetime(u['timestamp'], unit='s').normalize()
        amt = sum(c['amount'] for c in u.get('cliffAllocations', []) if (c.get('amount') or 0) > 0 and c.get('category') in INS)
        prev = S[S.index < day]
        if amt <= 0 or not len(prev) or prev.iloc[-1] <= 0: continue
        ev.append(dict(sym=bsym, slug=slug, day=day, size=amt / prev.iloc[-1]))
E = pd.DataFrame(ev).groupby(['sym', 'day'], as_index=False)['size'].sum(); print(len(E), 'insider/yatırımcı açılımı', flush=True)

def load1d(s):
    d = pd.read_csv(os.path.join(A, '1d', s + '.csv'), header=None, usecols=[0, 4]); d.columns = ['t', 'c']
    d['day'] = pd.to_datetime(d.t, unit='ms').dt.normalize(); return d.drop_duplicates('day').set_index('day').c
uni = sorted(({s for m in months.values() for s in m[:100]} | set(E.sym)) & have)
C = pd.DataFrame({s: load1d(s) for s in uni}).sort_index(); R = C.pct_change(fill_method=None)
inU = pd.DataFrame(False, index=R.index, columns=R.columns); ym = R.index.strftime('%Y-%m')
for m, ss in months.items():
    cols = [s for s in ss[:100] if s in R.columns]; inU.loc[ym == m, cols] = True
mkt = R.where(inU).mean(1); X = R.sub(mkt, axis=0)
def fund(s):
    p = os.path.join(A, 'funding', s + '.csv')
    if not os.path.exists(p): return None
    d = pd.read_csv(p, header=None, names=['t', 'r']); d['day'] = pd.to_datetime(d.t, unit='ms').dt.normalize(); return d.groupby('day').r.sum()
FD, rows = {}, []
for _, e in E.iterrows():
    if e.sym not in X.columns: continue
    x = X[e.sym]; r = R[e.sym]; i = x.index.searchsorted(e.day)
    if i < 61 or i + 31 >= len(x) or not np.isfinite(r.iloc[i - 60]) or not np.isfinite(r.iloc[i + 30]): continue
    w = lambda a, b: x.iloc[i + a:i + b + 1].sum() * 100
    if e.sym not in FD: FD[e.sym] = fund(e.sym)
    fr = FD[e.sym]; f7 = fr.reindex(x.index[i - 6:i + 1]).fillna(0).sum() * 100 if fr is not None else 0.0
    raw7 = (np.prod(1 + r.iloc[i - 6:i + 1].fillna(0)) - 1) * 100
    rows.append(dict(sym=e.sym, day=e.day, size=e['size'], pre30=w(-30, -1), pre7=w(-7, -1), post7=w(0, 7), post30=w(1, 30), short7=-raw7 + f7 - COST, bench=w(-60, -31)))
O = pd.DataFrame(rows); O = O[O.day >= '2021-01-01'].reset_index(drop=True)
print(len(O), 'olay fiyatla', flush=True)
mid = O.day.min() + (O.day.max() - O.day.min()) / 2
per = {'tümü': O.day == O.day, '1. yarı': O.day < mid, '2. yarı': O.day >= mid, 'son 12 ay': O.day >= O.day.max() - pd.Timedelta(days=365)}
def tstat(v): v = v.dropna(); return v.mean() / (v.std() / math.sqrt(len(v))) if len(v) > 2 else np.nan
L = [f'# Token kilit açılımı olay çalışması ({pd.Timestamp.now():%Y-%m-%d})', '',
     f'DefiLlama ücretsiz veri dosyaları: {len(idx)} protokol, {len(mp)} tanesi Binance vadeli ile eşleşti. Olay: insider / özel satış payının tek günde serbest kalması, '
     f'büyüklük = açılan miktar ÷ önceki günün serbest arzı (DefiLlama eğrisi). {len(O)} olay, {O.sym.nunique()} coin, {O.day.min():%Y-%m-%d} → {O.day.max():%Y-%m-%d}. '
     'Getiri: günlük kapanış, piyasaya göre fazla (ayın ilk 100 coininin eşit ortalaması düşülür), pencerelerde günlük fazlaların toplamı (%). '
     '"Short −7 → 0": gün −7 kapanışında short, gün 0 kapanışında kapat, ham getiri, fonlama dahil, %0,16 taker sonrası. '
     '"Kıyas [−60,−31]": aynı coinin olaydan önceki ayı (taban). Uyarı: DefiLlama listesi bugünkü protokoller (ölü tokenlar eksik olabilir).', '']
for lo, hi, nm in ((0.01, 99, '≥ %1'), (0.025, 99, '≥ %2,5'), (0.05, 99, '≥ %5'), (0.002, 0.01, '%0,2–1')):
    L += [f'## Büyüklük {nm}', '', '| dönem | olay | [−30,−1] % (t) | [−7,−1] % (t) | [0,+7] % (t) | [+1,+30] % (t) | kıyas [−60,−31] % | short −7 → 0 % (t) | short kazanma |', '|---|---|---|---|---|---|---|---|---|']
    for pn, m in per.items():
        g = O[m & (O['size'] >= lo) & (O['size'] < hi)]
        if len(g) < 5: L.append(f'| {pn} | {len(g)} | — | — | — | — | — | — | — |'); continue
        c = lambda k: f'{f(g[k].mean())} ({f(tstat(g[k]), 1)})'
        L.append(f'| {pn} | {len(g)} | {c("pre30")} | {c("pre7")} | {c("post7")} | {c("post30")} | {f(g.bench.mean())} | {c("short7")} | %{(g.short7 > 0).mean() * 100:.0f} |')
    L.append('')
O['yil'] = O.day.dt.year; g = O[O['size'] >= 0.01]
L += ['## Yıl yıl (≥ %1)', '', '| yıl | olay | [−30,−1] % | [−7,−1] % | [0,+7] % | short −7 → 0 % |', '|---|---|---|---|---|---|']
for y, gg in g.groupby('yil'): L.append(f'| {y} | {len(gg)} | {f(gg.pre30.mean())} | {f(gg.pre7.mean())} | {f(gg.post7.mean())} | {f(gg.short7.mean())} |')
L += ['', 'Okuma: eksi = coin piyasadan kötü. Etki iki yarıda ve son 12 ayda aynı yönde ve short kuralı maliyet + fonlama sonrası artıysa aday; '
      'aksi hâlde bilgi notu. Olaylar aynı günlerde kümelenebildiği için t değerleri iyimserdir.']
open(os.path.join(HERE, 'unlock-etkisi-report.md'), 'w', encoding='utf-8').write('\n'.join(L)); O.to_csv(os.path.join(RAW, 'olaylar.csv'), index=False)
sys.stdout.reconfigure(errors='replace'); print('\n'.join(L))
