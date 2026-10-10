# Hacim profili şekilleri (10 Ekim 2026; kullanıcı: "volume profile'da D, P, b, B shape stratejisini araştırsana").
# İddia (Dalton, Mind Over Markets ve türevleri; NinjaTrader, LuxAlgo, OTG, Bookmap yazıları): günün hacim profili şekli ertesi günü söyler.
#   P (POC üstte, altta ince kuyruk): yükselişte "değer yukarı kaydı" → devam (long); düşüşte "short kapatma", geçici güç → düşüş sürer (short).
#   b (POC altta, üstte ince kuyruk): ayna; düşüşte devam (short); yükselişte "long tasfiyesi" → yükseliş sürer (long).
#   D (POC ortada, simetrik): denge; ertesi gün kenarlardan dönüş ya da dengeden kırılım (yön yok).
#   B (iki dağılım, arada ince boyun): değer bir alandan diğerine göçtü → göç yönünde devam.
#   İnce kuyruk "yeniden ziyaret edilir" (P'nin dibi, b'nin tepesi).
# Yayımlanmış ölçüm bulunamadı (yalnız eğitim yazıları ve gösterge betikleri); tek akademik iz bir yüksek lisans tezi (TAIEX vadeli, POC'yi giriş referansı).
# Tanımlar ve tüm eşikler veriye bakmadan sabitlendi (10 Ekim 2026, sonuçlar görülmeden):
#   oturum = UTC günü, 15 dk mumlar (≥ 90 mum), 48 satır, her mumun dolar hacmi mumun [l,h] aralığına eşit dağıtılır (engine.js volProfile ile aynı), değer alanı %70 (POC'den büyük komşuya doğru, satır satır);
#   p = POC'nin gün aralığındaki yeri (0 dip, 1 tepe), VAL/VAH aralıkta 0–1;
#   B: 5 satırlık hareketli ortalamada iki yerel tepe, aralarında ≥ 12 satır (aralığın %25'i), küçük tepe ≥ büyük tepenin %50'si, aradaki en düşük nokta ≤ küçük tepenin %50'si;
#   P: B değil, p ≥ 2/3 ve VAL ≥ 1/3 (değer alanı alt üçte bire inmiyor); b: p ≤ 1/3 ve VAH ≤ 2/3; D: 0,35 ≤ p ≤ 0,65 ve |VA ortası − 0,5| ≤ 0,1; diğerleri "diğer".
#   bağlam: günün kapanışı 20 günlük kapanış ortalamasının üstünde = yükseliş, altında = düşüş.
# İşlem: ertesi günün ilk 15 dk mumunun VWAP'ında gir (kapanıştan kapanışa ölçme kuralı), 1/3/5 gün sonra son 15 dk mumun VWAP'ında çık;
#   basit getiri − %0,16 gidiş-dönüş − (long) / + (short) fonlama; R simülasyonu: stop 1 ATR (14 günlük), hedef 2 ATR, 3 gün zaman stopu, 15 dk mumlarla, aynı mumda ikisi → stop.
# Kontroller: (1) koşulsuz taban: aynı yönde tüm günler; (2) eşlenmiş taban: aynı gün getirisi (ATR) onluğundaki tüm günlerin aynı yöndeki ortalaması
#   (şekil, günün yönünden fazlasını söylüyor mu); kuyruk ziyareti için uzaklık (ATR) onluğuyla eşlenmiş dokunma oranı.
# Doğrulama: iki yarı (tarih ortası), son 12 ay; t = gün kümeli (her gün coinlerin ortalaması, sonra günler üzerinden t). Parametre seçilmediği için ileriye yürüyen pencere gerekmez.
# Evren: ayın ilk 30 coini (universe.json, delist dahil, TradFi hariç), 15 dk arşiv; fonlama arch/funding.
# Kullanım: python3 tests/test-vp-sekil.py [--from 2020-06] [--top 30] [--arch tests/data/arch] [--out tests/vp-sekil-report.md]
#           python3 tests/test-vp-sekil.py --selftest   (yapay veriyle uçtan uca, arşivsiz)
import json, os, sys, math, time, numpy as np, pandas as pd
arg = lambda k, d: sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
HERE = os.path.dirname(os.path.abspath(__file__))
SELF = '--selftest' in sys.argv
D = arg('arch', os.path.join(HERE, 'data', 'arch')); FROM = arg('from', '2020-06'); TOP = int(arg('top', 30))
OUT = arg('out', os.path.join(HERE, 'vp-sekil-report.md')); T0 = time.time()
NB = 48; COST = 0.0016; HZ = [1, 3, 5]; DAYMS = 86400000; BAR = 900000

def selftest_data(root):
    rng = np.random.RandomState(1); os.makedirs(os.path.join(root, '15m'), exist_ok=True); os.makedirs(os.path.join(root, 'funding'), exist_ok=True)
    t0 = int(pd.Timestamp('2022-01-01').value // 10**6); n = 96*500; months = {}
    for s in ['AAAUSDT', 'BBBUSDT', 'CCCUSDT']:
        r = rng.standard_t(4, n)*0.003; c = 100*np.exp(np.cumsum(r)); o = np.r_[c[0], c[:-1]]
        h = np.maximum(o, c)*(1+abs(rng.normal(0, 0.002, n))); l = np.minimum(o, c)*(1-abs(rng.normal(0, 0.002, n)))
        v = rng.lognormal(5, 0.6, n); q = v*(h+l+c)/3; t = t0 + np.arange(n)*BAR
        pd.DataFrame({0: t, 1: o, 2: h, 3: l, 4: c, 5: v, 6: t+BAR-1, 7: q, 8: 100, 9: v/2, 10: q/2, 11: 0}).to_csv(os.path.join(root, '15m', s+'.csv'), header=False, index=False)
        ft = t0 + np.arange(0, n*BAR, 8*3600000); pd.DataFrame({0: ft, 1: rng.normal(1e-4, 1e-4, len(ft))}).to_csv(os.path.join(root, 'funding', s+'.csv'), header=False, index=False)
    for m in pd.date_range('2022-01-01', '2023-06-01', freq='MS').strftime('%Y-%m'): months[m] = ['AAAUSDT', 'BBBUSDT', 'CCCUSDT']
    json.dump({'months': months}, open(os.path.join(root, 'universe.json'), 'w'))

if SELF:
    D = os.path.join(os.environ.get('TMPDIR', '/tmp'), 'vp-sekil-selftest'); selftest_data(D); FROM = '2022-01'; OUT = os.path.join(D, 'report.md')

U = json.load(open(os.path.join(D, 'universe.json')))['months']; months = sorted(m for m in U if m >= FROM)
uni = {m: set(U[m][:TOP]) for m in months}
syms = sorted({s for m in months for s in uni[m]} & {f[:-4] for f in os.listdir(os.path.join(D, '15m'))})
tFrom = int(pd.Timestamp(FROM + '-01').value // 10**6)

def profiles(lo_b, hi_b, q, day_idx, nday, dlo, dhi):
    """Gün başına 48 satırlık profil: mum hacmi [l,h]'nin kapsadığı satırlara eşit dağıtılır."""
    w = (dhi - dlo)/NB; w = np.where(w > 0, w, 1e-12)
    a = np.clip(np.floor((lo_b - dlo[day_idx])/w[day_idx]), 0, NB-1).astype(int)
    b = np.clip(np.ceil((hi_b - dlo[day_idx])/w[day_idx]) - 1, 0, NB-1).astype(int); b = np.maximum(a, b)
    sh = q/(b - a + 1); diff = np.zeros((nday, NB+1))
    np.add.at(diff, (day_idx, a), sh); np.add.at(diff, (day_idx, b+1), -sh)
    return np.cumsum(diff, axis=1)[:, :NB]

def value_area(v):
    best = int(np.argmax(v)); up = dn = best; acc = v[best]; tgt = 0.7*v.sum()
    while acc < tgt and (up < NB-1 or dn > 0):
        u = v[up+1] if up < NB-1 else -1; d = v[dn-1] if dn > 0 else -1
        if u >= d: up += 1; acc += v[up]
        else: dn -= 1; acc += v[dn]
    return best, dn, up

def shape_of(v):
    poc, dn, up = value_area(v); p = (poc+0.5)/NB; val = dn/NB; vah = (up+1)/NB
    sm = np.convolve(v, np.ones(5)/5, mode='same'); pk = [i for i in range(1, NB-1) if sm[i] > sm[i-1] and sm[i] >= sm[i+1]]
    isB = False
    if len(pk) >= 2:
        pk = sorted(pk, key=lambda i: -sm[i]); top = pk[0]
        for o in pk[1:]:
            if abs(o - top) >= 12 and sm[o] >= 0.5*sm[top]:
                lo_, hi_ = min(o, top), max(o, top)
                if sm[lo_:hi_+1].min() <= 0.5*sm[o]: isB = True
                break
    if isB: sh = 'B'
    elif p >= 2/3 and val >= 1/3: sh = 'P'
    elif p <= 1/3 and vah <= 2/3: sh = 'b'
    elif 0.35 <= p <= 0.65 and abs((val+vah)/2 - 0.5) <= 0.1: sh = 'D'
    else: sh = 'diğer'
    return sh, p, val, vah

ROWS = []
for s in syms:
    k = pd.read_csv(os.path.join(D, '15m', s + '.csv'), header=None, usecols=[0, 1, 2, 3, 4, 5, 7], dtype=np.float64).values
    ot = k[:, 0]; ot = np.where(ot > 1e14, np.floor(ot/1000), ot).astype(np.int64)
    sel = ot >= tFrom - 40*DAYMS; k = k[sel]; ot = ot[sel]
    if len(k) < 96*30: continue
    o, h, l, c, v, q = (k[:, j] for j in range(1, 7))
    vw = np.where((v > 0) & (q > 0), q/np.maximum(v, 1e-12), c); vw = np.where((vw >= l) & (vw <= h), vw, c)
    dead = v <= 0
    day = ot // DAYMS; ud, di = np.unique(day, return_inverse=True); nd = len(ud)
    cnt = np.bincount(di, minlength=nd)
    dlo = np.full(nd, np.inf); np.minimum.at(dlo, di, l); dhi = np.full(nd, -np.inf); np.maximum.at(dhi, di, h)
    first = np.full(nd, len(k)); np.minimum.at(first, di, np.arange(len(k))); last = np.full(nd, -1); np.maximum.at(last, di, np.arange(len(k)))
    dO = o[first]; dC = c[last]; dq = np.bincount(di, weights=q, minlength=nd); ddead = np.bincount(di, weights=dead.astype(float), minlength=nd)
    prof = profiles(l, h, q, di, nd, dlo, dhi)
    pc = np.r_[dC[0], dC[:-1]]; tr = np.maximum(dhi - dlo, np.maximum(abs(dhi - pc), abs(dlo - pc))); atr = pd.Series(tr).rolling(14).mean().values
    sma20 = pd.Series(dC).rolling(20).mean().values
    fpath = os.path.join(D, 'funding', s + '.csv')
    if os.path.exists(fpath) and os.path.getsize(fpath) > 0:
        f = pd.read_csv(fpath, header=None).values; ft = f[:, 0].astype(np.int64); ft = np.where(ft > 1e14, ft//1000, ft); fr = f[:, 1].astype(float)
        o_ = np.argsort(ft); ft = ft[o_]; fcum = np.r_[0, np.cumsum(fr[o_])]
    else: ft = np.array([0], dtype=np.int64); fcum = np.zeros(2)
    fsum = lambda t1, t2: fcum[np.searchsorted(ft, t2, 'right')] - fcum[np.searchsorted(ft, t1, 'right')]
    mon = pd.to_datetime(ud*DAYMS, unit='ms').strftime('%Y-%m')
    for i in range(20, nd - 6):
        if mon[i] not in uni or s not in uni[mon[i]] or ud[i]*DAYMS < tFrom: continue
        if cnt[i] < 90 or ddead[i] > 4 or not np.isfinite(atr[i]) or atr[i] <= 0 or dq[i] <= 0: continue
        if any(ud[i+j] != ud[i]+j or cnt[i+j] < 90 for j in range(1, 6)): continue
        sh, p, val, vah = shape_of(prof[i])
        e = first[i+1]; ent = vw[e]; a = atr[i]
        row = dict(sym=s, t=int(ud[i]*DAYMS), sh=sh, p=p, val=val, vah=vah, up=float(dC[i] > sma20[i]), dret=(dC[i]-dO[i])/a, dirday=1.0 if dC[i] > dO[i] else -1.0,
                   atrp=a/ent, distlo=(ent-dlo[i])/a, disthi=(dhi[i]-ent)/a)
        for H in HZ:
            x = last[i+H]; g = vw[x]/ent - 1; fu = fsum(ot[e], ot[x])
            row[f'L{H}'] = (g - COST - fu)*100; row[f'S{H}'] = (-g - COST + fu)*100
        x3 = last[i+3]
        row['tlo3'] = float(l[e:x3+1].min() <= dlo[i]); row['thi3'] = float(h[e:x3+1].max() >= dhi[i])
        row['tlo1'] = float(l[e:last[i+1]+1].min() <= dlo[i]); row['thi1'] = float(h[e:last[i+1]+1].max() >= dhi[i])
        for d, nm in ((1, 'RL'), (-1, 'RS')):
            stp = ent - d*a; tgt = ent + d*2*a; L_, H_ = l[e:x3+1], h[e:x3+1]
            hs = (L_ <= stp) if d > 0 else (H_ >= stp); ht = (H_ >= tgt) if d > 0 else (L_ <= tgt)
            js = int(np.argmax(hs)) if hs.any() else 10**9; jt = int(np.argmax(ht)) if ht.any() else 10**9
            if js <= jt and js < 10**9: out = stp; jx = e + js
            elif jt < 10**9: out = tgt; jx = e + jt
            else: out = vw[x3]; jx = x3
            fu = fsum(ot[e], ot[jx])
            row[nm] = d*(out - ent)/a - COST*ent/a - d*fu*ent/a
        ROWS.append(row)
    print(f'{s}: {nd} gün, toplam {len(ROWS)} satır ({time.time()-T0:.0f} sn)', flush=True)

df = pd.DataFrame(ROWS)
if df.empty: sys.exit('veri yok')
df['date'] = pd.to_datetime(df.t, unit='ms'); tmid = df.t.min() + (df.t.max() - df.t.min())/2; t12 = df.t.max() - 365*DAYMS
PER = [('tümü', df.t >= 0), ('1. yarı', df.t < tmid), ('2. yarı', df.t >= tmid), ('son 12 ay', df.t >= t12)]
# eşlenmiş taban: gün getirisi (ATR) onluğunda tüm günlerin ortalaması
df['dq'] = pd.qcut(df.dret, 10, labels=False, duplicates='drop')
for col in ['L1', 'S1', 'L3', 'S3', 'L5', 'S5', 'RL', 'RS']:
    df['m_'+col] = df.groupby('dq')[col].transform('mean')
def tstat(sub, col):
    g = sub.groupby('t')[col].mean()
    return (g.mean()/(g.std(ddof=1)/math.sqrt(len(g)))) if len(g) > 2 and g.std(ddof=1) > 0 else float('nan')
HYP = [
    ('P → long (devam)', lambda x: x.sh == 'P', 1),
    ('b → short (devam)', lambda x: x.sh == 'b', -1),
    ('P yükselişte → long', lambda x: (x.sh == 'P') & (x.up == 1), 1),
    ('P düşüşte → short (short kapatma söner)', lambda x: (x.sh == 'P') & (x.up == 0), -1),
    ('b düşüşte → short', lambda x: (x.sh == 'b') & (x.up == 0), -1),
    ('b yükselişte → long (long tasfiyesi söner)', lambda x: (x.sh == 'b') & (x.up == 1), 1),
    ('B → günün yönünde', lambda x: x.sh == 'B', 0),
    ('D → günün yönünde (kontrol)', lambda x: x.sh == 'D', 0),
    ('D → günün tersine (denge, kontrol)', lambda x: x.sh == 'D', 2),
]
def take(sub, d, col):
    if d == 1: return sub['L'+col] if col != 'R' else sub['RL']
    if d == -1: return sub['S'+col] if col != 'R' else sub['RS']
    dd = sub.dirday if d == 0 else -sub.dirday
    a = sub['L'+col] if col != 'R' else sub['RL']; b = sub['S'+col] if col != 'R' else sub['RS']
    return pd.Series(np.where(dd > 0, a, b), index=sub.index)
def mtake(sub, d, col):
    a = sub['m_RL'] if col == 'R' else sub['m_L'+col]; b = sub['m_RS'] if col == 'R' else sub['m_S'+col]
    if d == 1: return a
    if d == -1: return b
    dd = sub.dirday if d == 0 else -sub.dirday
    return pd.Series(np.where(dd > 0, a, b), index=sub.index)
L = []
w = L.append
w('# Hacim profili şekilleri (D, P, b, B) — arşiv testi\n')
w(f'Üretim: {time.strftime("%Y-%m-%d %H:%M")} UTC · `python3 tests/test-vp-sekil.py{" --selftest" if SELF else ""}` · {df.sym.nunique()} coin, {len(df):,} coin-günü, {df.date.min():%Y-%m-%d} → {df.date.max():%Y-%m-%d}, ayın ilk {TOP} coini · {time.time()-T0:.0f} sn\n')
w('Tanımlar ve eşikler veriye bakmadan sabitlendi (betiğin başı). Getiri: ertesi günün ilk 15 dk VWAP\'ı → H gün sonra son 15 dk VWAP\'ı, basit getiri − %0,16 − fonlama. R: stop 1 ATR, hedef 2 ATR, 3 gün. "Eşlenmiş fark" = getiri − aynı gün-getirisi onluğundaki tüm günlerin aynı yöndeki ortalaması (şeklin, günün kendi hareketinden fazlasını söyleyip söylemediği). t gün kümeli: her gün coinlerin ortalaması, günler eşit ağırlıklı; tablodaki ortalama ise coin-günü ağırlıklı, kalın kuyruklu birkaç gün ikisinin işaretini ayırabilir (ilk koşuda P → long 1g +0,10 % ama t −1,3).\n')
w('## Şekil dağılımı\n')
w('| şekil | pay | ort. POC yeri | yükselişte pay | gün getirisi (ATR) |\n|---|---|---|---|---|')
for sh in ['P', 'b', 'D', 'B', 'diğer']:
    x = df[df.sh == sh]; w(f'| {sh} | %{100*len(x)/len(df):.1f} ({len(x):,}) | {x.p.mean():.2f} | %{100*x.up.mean():.0f} | {x.dret.mean():+.2f} |')
w('\n## Koşulsuz taban (tüm günler)\n')
w('| dönem | long 1g % | short 1g % | long 3g % | short 3g % | long R | short R |\n|---|---|---|---|---|---|---|')
for nm, m in PER:
    x = df[m]; w(f'| {nm} | {x.L1.mean():+.3f} | {x.S1.mean():+.3f} | {x.L3.mean():+.3f} | {x.S3.mean():+.3f} | {x.RL.mean():+.3f} | {x.RS.mean():+.3f} |')
w('\n## Hipotezler\n')
for hn, f, d in HYP:
    w(f'### {hn}\n')
    w('| dönem | n | 1g % (t) | 3g % (t) | 5g % | R (t) | kazanma R>0 | eşlenmiş fark 1g % | eşlenmiş fark 3g % | eşlenmiş fark R |\n|---|---|---|---|---|---|---|---|---|---|')
    for nm, m in PER:
        sub = df[m & f(df)]
        if len(sub) < 20: w(f'| {nm} | {len(sub)} | – | – | – | – | – | – | – | – |'); continue
        r1, r3, r5, rr = take(sub, d, '1'), take(sub, d, '3'), take(sub, d, '5'), take(sub, d, 'R')
        tmp = sub.assign(r1=r1, r3=r3, rr=rr, e1=r1 - mtake(sub, d, '1'), e3=r3 - mtake(sub, d, '3'), er=rr - mtake(sub, d, 'R'))
        w(f'| {nm} | {len(sub):,} | {r1.mean():+.3f} ({tstat(tmp, "r1"):+.1f}) | {r3.mean():+.3f} ({tstat(tmp, "r3"):+.1f}) | {r5.mean():+.3f} | {rr.mean():+.3f} ({tstat(tmp, "rr"):+.1f}) | %{100*(rr > 0).mean():.0f} | {tmp.e1.mean():+.3f} ({tstat(tmp, "e1"):+.1f}) | {tmp.e3.mean():+.3f} ({tstat(tmp, "e3"):+.1f}) | {tmp.er.mean():+.3f} ({tstat(tmp, "er"):+.1f}) |')
    w('')
# ince kuyruk ziyareti: P'nin dibi / b'nin tepesi, uzaklık onluğuyla eşlenmiş
w('## İnce kuyruk yeniden ziyaret ediliyor mu\n')
w('Dokunma = ertesi gün (1g) / 3 gün içinde fiyat şekil gününün dibine (P) ya da tepesine (b) dokunuyor. Beklenen = girişin o uca uzaklığı (ATR) onluğunda tüm günlerin dokunma oranı.\n')
df['qlo'] = pd.qcut(df.distlo, 10, labels=False, duplicates='drop'); df['qhi'] = pd.qcut(df.disthi, 10, labels=False, duplicates='drop')
for c_ in ['tlo1', 'tlo3']: df['m_'+c_] = df.groupby('qlo')[c_].transform('mean')
for c_ in ['thi1', 'thi3']: df['m_'+c_] = df.groupby('qhi')[c_].transform('mean')
w('| şekil · uç | dönem | n | 1g dokunma | beklenen | 3g dokunma | beklenen |\n|---|---|---|---|---|---|---|')
for sh, side in (('P', 'lo'), ('b', 'hi'), ('P', 'hi'), ('b', 'lo')):
    for nm, m in PER:
        sub = df[m & (df.sh == sh)]
        if len(sub) < 20: continue
        w(f'| {sh} · {"dip" if side == "lo" else "tepe"} | {nm} | {len(sub):,} | %{100*sub["t"+side+"1"].mean():.1f} | %{100*sub["m_t"+side+"1"].mean():.1f} | %{100*sub["t"+side+"3"].mean():.1f} | %{100*sub["m_t"+side+"3"].mean():.1f} |')
w('\n## Yıl yıl (eşlenmiş fark, 3 gün %)\n')
df['yil'] = df.date.dt.year
w('| hipotez | ' + ' | '.join(str(y) for y in sorted(df.yil.unique())) + ' |\n|---|' + '---|'*df.yil.nunique())
for hn, f, d in HYP:
    cells = []
    for y in sorted(df.yil.unique()):
        sub = df[(df.yil == y) & f(df)]
        cells.append('–' if len(sub) < 20 else f'{(take(sub, d, "3") - mtake(sub, d, "3")).mean():+.2f} ({len(sub)})')
    w(f'| {hn} | ' + ' | '.join(cells) + ' |')
w('\n## Geçme ölçütü (önceden yazıldı)\n')
w('Bir hipotez aday sayılır: 3 gün getirisi maliyet ve fonlama sonrası iki yarıda ve son 12 ayda artı, eşlenmiş fark iki yarıda artı ve tümünde t ≥ 2, R iki yarıda artı. Kuyruk ziyareti: dokunma oranı iki yarıda beklenenin ≥ 3 puan üstü.\n')
for hn, f, d in HYP:
    ok = True; msg = []
    for nm, m in PER[1:]:
        sub = df[m & f(df)]
        if len(sub) < 20: ok = False; msg.append(f'{nm}: az'); continue
        r3 = take(sub, d, '3'); e3 = r3 - mtake(sub, d, '3'); rr = take(sub, d, 'R')
        if r3.mean() <= 0 or rr.mean() <= 0 or (nm != 'son 12 ay' and e3.mean() <= 0): ok = False
        msg.append(f'{nm}: 3g {r3.mean():+.2f} %, fark {e3.mean():+.2f}, R {rr.mean():+.2f}')
    sub = df[f(df)]; tm = tstat(sub.assign(e3=take(sub, d, '3') - mtake(sub, d, '3')), 'e3') if len(sub) > 20 else float('nan')
    ok = ok and tm >= 2
    w(f'- **{hn}**: {"ADAY" if ok else "geçmedi"} (eşlenmiş fark t {tm:+.1f}; ' + '; '.join(msg) + ')')
open(OUT, 'w').write('\n'.join(L) + '\n')
print('rapor:', OUT, f'({time.time()-T0:.0f} sn)')
