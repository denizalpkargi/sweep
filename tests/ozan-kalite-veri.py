# Ozan işlem kalitesi · veri: masa arşivi örnekleri + yeni değişken aileleri (10 Ekim 2026)
# Girdi: masa-archive.js örnekleri (samples-*.jsonl) ve dış veri klasörü (fetch-external.js + ilgi + yahoo).
# Çıktı: tek pickle (pandas) — her satır bir toplantı (sym, t, yön), etiketler R / y / f4, aileler önekle:
#   b_  bugünkü masa girdileri (x alanları, puan, evet, üye oyları ve güvenleri, aşama, kill zone)
#   xs_ coinler arası yüzdelik dilim (aynı 4 saatlik anda ayın ilk 30 coini içinde) + genişlik/dağılım
#   h_  coinin kendi geçmişi (4 sa getiri serisinden 30 g BTC betası/korelasyonu, özgün oynaklık, oto-korelasyon,
#       fonlama 7 g ortalaması/değişimi/z, coinin masadaki geçmiş isabeti y — yalnız sonucu bilinen kayıtlar)
#   m_  piyasa/dış veri (korku endeksi, DVOL, stablecoin arzı, TVL, DEX, ABD piyasaları, COT, zincir üstü), gecikmeli
#   i_  coin ilgisi (Google Trends haftalık, Wikipedia günlük), gecikmeli
# Bakış hatası olmasın diye: günlük dış veri 1 gün, haftalık Trends 7 gün, COT 3 gün, ABD piyasaları 1 iş günü gecikmeli.
#   o_  (--arch ile, PC) Ozan'ın canlı değişkenleri (rank-*.f32: rkFeat 52 ham + saat içi coinler arası dilimleri); OI, büyük trader/hesap oranı dahil
#   d_  (--arch ile, PC) Denklem 4 değişkenleri (denklem4.f32: emir defteri derinliği, 1 dk mikro yapı, OI 2, takvim …; 2023-06'dan)
#   Birleştirme anahtarı: kararın verildiği an (mum kapanışı t+15 dk) öncesindeki son tam saat; satırlar o saatte kapanmış veriyle.
# Kullanım: python3 tests/ozan-kalite-veri.py <örnek klasörü> <dış veri klasörü> <çıktı.pkl> [--arch tests/data/arch]
import json, glob, sys, os, numpy as np, pandas as pd

SD, XD, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
def ms(x): return pd.to_datetime(x).values.astype('datetime64[ms]').astype('int64')  # pandas 3'te astype(int64) saniye verebilir
H4 = 4*3600*1000; DAY = 864e5
AG = ['trend','liq','flow','macro','quant','mom','vol','check','fac','risk']

rows = []
for f in sorted(glob.glob(os.path.join(SD, 'samples-*.jsonl'))):
    for l in open(f):
        s = json.loads(l)
        if s['R'] is None: continue
        r = {'sym': s['sym'], 't': s['t'], 'L': 1 if s['dir'] == 'long' else 0, 'veto': s['veto'],
             'b_score': s['score'] if s['score'] is not None else 0.0, 'b_yes': s['yes'], 'b_sd': s['sd'],
             'b_kz': s['kz'], 'stage': s['stage'] or 'yok', 'R': s['R'], 'y': s['y'], 'f4': s['f4']}
        for k in AG:
            v, c, ab = s['a'].get(k, [0, 0, 1])
            r['b_v_'+k] = np.nan if ab else v; r['b_c_'+k] = np.nan if ab else c
        for k, v in s['x'].items(): r['b_'+k] = np.nan if v is None else v
        rows.append(r)
df = pd.DataFrame(rows); del rows
df['b_stage'] = df.stage.astype('category').cat.codes; df.drop(columns='stage', inplace=True)
df['sg'] = np.where(df.L == 1, 1.0, -1.0)
print('örnek', len(df), 'coin', df.sym.nunique(), pd.to_datetime(df.t.min(), unit='ms'), '→', pd.to_datetime(df.t.max(), unit='ms'))

# ---- yönsüz ham değerler (long satırından) ----
SIGNED = ['r1','r4','r24','r7d','r30d','s20','s50','s200','b4','b24','bs200','bs50','fr']
raw = df[df.L == 1][['sym','t']+['b_'+k for k in SIGNED+['atrp','pos24','vq','tk','vol30']]].copy()
raw.columns = ['sym','t']+[k for k in SIGNED+['atrp','pos24','vq','tk','vol30']]
raw = raw.drop_duplicates(['sym','t']).sort_values(['sym','t']).reset_index(drop=True)

# ---- xs_: coinler arası dilim (aynı t) ----
XSK = ['r1','r4','r24','r7d','r30d','s20','s50','atrp','pos24','vq','tk','vol30','fr']
g = raw.groupby('t')
xs = raw[['sym','t']].copy()
for k in XSK: xs['p_'+k] = g[k].rank(pct=True)
xs['n'] = g['r24'].transform('count')
mk = pd.DataFrame({'br24': g['r24'].apply(lambda v: (v > 0).mean()), 'br4': g['r4'].apply(lambda v: (v > 0).mean()),
                   'disp24': g['r24'].std(), 'mr24': g['r24'].mean(), 'mfr': g['fr'].mean(), 'matr': g['atrp'].median()}).reset_index()

# ---- h_: coin geçmişi (4 sa adımlı seri; boşluklar NaN) ----
def roll(gr):
    gr = gr.set_index('t').reindex(np.arange(gr.t.min(), gr.t.max()+1, H4))
    r, b = gr['r4'], gr['b4']; o = pd.DataFrame(index=gr.index)
    W = 180  # 30 gün
    cov = (r*b).rolling(W, min_periods=90).mean() - r.rolling(W, min_periods=90).mean()*b.rolling(W, min_periods=90).mean()
    vb = b.rolling(W, min_periods=90).var(ddof=0); vr = r.rolling(W, min_periods=90).var(ddof=0)
    o['beta'] = cov/vb; o['corr'] = cov/np.sqrt(vb*vr)
    o['ivol'] = np.sqrt(np.maximum(vr - o['beta']**2*vb, 0))
    o['ac1'] = r.rolling(W, min_periods=90).corr(r.shift(1))
    o['beta7'] = ((r*b).rolling(42, min_periods=30).mean()-r.rolling(42, min_periods=30).mean()*b.rolling(42, min_periods=30).mean())/b.rolling(42, min_periods=30).var(ddof=0)
    o['idr24'] = gr['r24'] - o['beta']*gr['b24']        # BTC'den arındırılmış 24 sa
    o['idr7'] = r.rolling(42, min_periods=30).sum() - o['beta']*b.rolling(42, min_periods=30).sum()
    f = gr['fr']
    o['fr7'] = f.rolling(42, min_periods=20).mean(); o['frd'] = f - f.shift(42)
    o['frz'] = (f - f.rolling(180, min_periods=60).mean())/f.rolling(180, min_periods=60).std()
    o['vq7'] = gr['vq'].rolling(42, min_periods=20).mean()
    o['atrch'] = np.log(gr['atrp']/gr['atrp'].shift(42))
    o['tk7'] = gr['tk'].rolling(42, min_periods=20).mean()
    o['age'] = np.arange(len(gr))
    o = o.dropna(how='all', subset=['beta','fr7','vq7']); o['sym'] = gr.name if hasattr(gr, 'name') else None
    return o.reset_index().rename(columns={'index': 't'})
hist = []
for s, gr in raw.groupby('sym'):
    o = roll(gr[['t','r4','b4','r24','b24','fr','vq','atrp','tk']].copy()); o['sym'] = s; hist.append(o)
hist = pd.concat(hist, ignore_index=True)

# coinin masadaki geçmiş isabeti (y: 4 sa içinde önce ±1 ATR) — yalnız ≥ 1 adım (4 sa) önceki kayıtlar, yön başına son 60 kayıt
df = df.sort_values(['sym','L','t']).reset_index(drop=True)
gy = df.groupby(['sym','L'])['y']
df['h_ytrack'] = gy.transform(lambda v: v.shift(2).rolling(60, min_periods=20).mean())
df['h_ftrack'] = df.groupby(['sym','L'])['f4'].transform(lambda v: v.shift(2).rolling(60, min_periods=20).mean())

# ---- m_: dış veri ----
def daily(path, cols, lag_days=1, date='date'):
    if not os.path.exists(path): print('yok', path); return None
    d = pd.read_csv(path)
    d['t'] = ms(d[date]) + int(lag_days*DAY)
    return d[['t']+cols].sort_values('t')
ext = []
fng = daily(os.path.join(XD,'fng.csv'), ['value'])
if fng is not None:
    fng['fng'] = fng.value; fng['fng7'] = fng.value - fng.value.shift(7); ext.append(fng[['t','fng','fng7']])
st = daily(os.path.join(XD,'stablecoins.csv'), ['total'])
if st is not None:
    st['stab30'] = np.log(st.total/st.total.shift(30)); st['stab7'] = np.log(st.total/st.total.shift(7)); ext.append(st[['t','stab30','stab7']])
de = daily(os.path.join(XD,'defi.csv'), ['tvl','dexVol'])
if de is not None:
    de['tvl30'] = np.log(de.tvl/de.tvl.shift(30)); de['dex7'] = np.log(de.dexVol.rolling(7).mean()/de.dexVol.rolling(60).mean()); ext.append(de[['t','tvl30','dex7']])
oc = daily(os.path.join(XD,'onchain-btc.csv'), ['ntx','addrs','hashrate'])
if oc is not None:
    for c in ['ntx','addrs','hashrate']: oc[c+'30'] = np.log(oc[c].rolling(7).mean()/oc[c].rolling(30).mean())
    ext.append(oc[['t','ntx30','addrs30','hashrate30']])
for nm in ['spx','nasdaq','vix','dxy','gold','us10y','hyg','tlt','oil']:
    p = os.path.join(XD,'yahoo',nm+'.csv')
    if not os.path.exists(p): continue
    y = pd.read_csv(p); y['t'] = ms(y.tarih) + int(DAY*1.9)  # kapanış ertesi gün ~22 UTC sonrası güvenli
    y = y.sort_values('t'); c = y.kapanis
    if nm in ('vix','us10y'): y[nm+'_lv'] = c; y[nm+'_5'] = c - c.shift(5)
    else: y[nm+'_5'] = np.log(c/c.shift(5)); y[nm+'_20'] = np.log(c/c.shift(20))
    ext.append(y[['t']+[k for k in y.columns if k.startswith(nm+'_')]])
cot = daily(os.path.join(XD,'cot.csv'), ['market','oi','assetMgrL','assetMgrS','levL','levS'], lag_days=3)
if cot is not None:
    cb = cot[cot.market == 'BTC'].copy(); cb['cot_am'] = (cb.assetMgrL-cb.assetMgrS)/cb.oi; cb['cot_lev'] = (cb.levL-cb.levS)/cb.oi
    cb['cot_amd'] = cb.cot_am - cb.cot_am.shift(4); ext.append(cb[['t','cot_am','cot_lev','cot_amd']])
for a in ['BTC','ETH']:
    p = os.path.join(XD, f'dvol-{a}.csv')
    if os.path.exists(p):
        d = pd.read_csv(p).sort_values('t'); d['t'] = d.t + 3600*1000  # saatlik mum kapanışı
        d[f'dv{a}'] = d.c; d[f'dv{a}7'] = np.log(d.c/d.c.shift(168)); ext.append(d[['t',f'dv{a}',f'dv{a}7']])
M = mk.sort_values('t').copy()
for e in ext: M = pd.merge_asof(M, e.dropna(subset=[c for c in e.columns if c != 't'], how='all').sort_values('t'), on='t', direction='backward')
if 'dvETH' in M and 'dvBTC' in M: M['dvEB'] = M.dvETH - M.dvBTC
M = M.rename(columns={c: 'm_'+c for c in M.columns if c != 't'})

# ---- i_: ilgi (coin başına) ----
ilg = []
for kind, col, lag in [('trends','deger',7), ('wiki','goruntuleme',1)]:
    for p in glob.glob(os.path.join(XD,'ilgi',kind,'*.csv')):
        s = os.path.basename(p)[:-4]; d = pd.read_csv(p)
        if len(d) < 20: continue
        d['t'] = ms(d.tarih) + int(lag*DAY); d = d.sort_values('t'); v = np.log1p(d[col].astype(float))
        n1, n2 = (4, 52) if kind == 'trends' else (7, 90)
        d['i_'+kind+'_z'] = (v.rolling(n1).mean() - v.rolling(n2, min_periods=n2//2).mean())/v.rolling(n2, min_periods=n2//2).std()
        d['i_'+kind+'_ch'] = v - v.shift(n1)
        d['sym'] = s; ilg.append(d[['sym','t','i_'+kind+'_z','i_'+kind+'_ch']])

# ---- birleştir ----
xs = xs.rename(columns={c: 'xs_'+c for c in xs.columns if c not in ('sym','t')})
hist = hist.rename(columns={c: 'h_'+c for c in hist.columns if c not in ('sym','t')})
df = df.merge(xs, on=['sym','t'], how='left').merge(hist, on=['sym','t'], how='left').merge(M, on='t', how='left')
df = df.sort_values('t')
for kind in ['trends','wiki']:
    part = [d for d in ilg if d.columns[2].startswith('i_'+kind)]
    if not part: continue
    I = pd.concat(part).sort_values('t')
    df = pd.merge_asof(df, I, on='t', by='sym', direction='backward', tolerance=int(21*DAY))
# yöne göre işaretle: coinler arası dilimde yönlü olanlar long için p, short için 1−p; h_ yönlü olanlar sg ile
for k in ['r1','r4','r24','r7d','r30d','s20','s50','fr']: df['xs_p_'+k] = np.where(df.L == 1, df['xs_p_'+k], 1-df['xs_p_'+k])
for k in ['h_idr24','h_idr7','h_fr7','h_frd','h_frz']: df[k] = df[k]*df.sg
for k in ['m_mr24','m_mfr']: df[k] = df[k]*df.sg
df['m_br24'] = np.where(df.L == 1, df.m_br24, 1-df.m_br24); df['m_br4'] = np.where(df.L == 1, df.m_br4, 1-df.m_br4)

ARCH = sys.argv[sys.argv.index('--arch')+1] if '--arch' in sys.argv else None
if ARCH:
    df['T'] = ((df.t + 15*60000)//3600000)*3600000
    keys = df[['sym','T']].drop_duplicates()
    def hourly(meta_f, f32s, pre, skip):
        meta = json.load(open(os.path.join(ARCH, meta_f))); C = meta['cols']; syms = meta['syms']
        X = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, len(C)) for f in sorted(glob.glob(os.path.join(ARCH, f32s)))])
        si = C.index('si') if 'si' in C else C.index('sym'); th = C.index('th')
        H = pd.DataFrame({'sym': np.array(syms)[X[:, si].round().astype(int)], 'T': X[:, th].round().astype(np.int64)*3600000 + meta['t0']})
        H = H.reset_index().merge(keys, on=['sym','T'])
        use = [c for c in C if c not in skip]; sub = pd.DataFrame(X[H['index'].values][:, [C.index(c) for c in use]], columns=[pre+c for c in use])
        del X; return pd.concat([H[['sym','T']].reset_index(drop=True), sub], axis=1), meta
    if os.path.exists(os.path.join(ARCH, 'rank.json')):
        O, meta = hourly('rank.json', 'rank-*.f32', 'o_', {'th','si','y4v','y12v','p4','p12'})
        for c in meta['xs']: O['o_xs_'+c] = O.groupby('T')['o_'+c].rank(pct=True)
        df = df.merge(O.drop_duplicates(['sym','T']), on=['sym','T'], how='left'); print('o_', O.shape)
        # yönlü olanlar yönle işaretlenir (getiriler, VWAP uzaklığı, taker, fonlama, oranlar) — ağaçlar L ile de ayırabilir
        for c in [c for c in df.columns if c.startswith('o_')]:
            if any(c.endswith(x) for x in ['z15','z1','z4','z24','vwD24','vwD4','tk1','tk4','tk24','fr','z9d','z30d']) and 'xs_' not in c: df[c] = df[c]*df.sg
    if os.path.exists(os.path.join(ARCH, 'denklem4.json')):
        D, meta = hourly('denklem4.json', 'denklem4.f32', 'd_', {'sym','th','y1','y4','y24','y1v','y4v','y12v','y24v'})
        df = df.merge(D.drop_duplicates(['sym','T']), on=['sym','T'], how='left'); print('d_', D.shape)
    df.drop(columns='T', inplace=True)
df = df.sort_values(['t','sym','L']).reset_index(drop=True)
df.to_pickle(OUT)
fam = {p: [c for c in df.columns if c.startswith(p)] for p in ['b_','xs_','h_','m_','i_','o_','d_']}
print({p: len(v) for p, v in fam.items()}); print('doluluk', {c: round(df[c].notna().mean(), 2) for c in fam['m_']+fam['i_']})
