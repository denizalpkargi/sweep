# Açık kaynak Freqtrade stratejilerini Binance vadeli arşivimizle test eder (10 Ekim 2026).
#
# Stratejilerin kendi kodu (populate_indicators / entry / exit, minimal_roi, stoploss, trailing) olduğu gibi çalışır;
# freqtrade kurulmaz, onun yerine küçük bir taklit katman (IStrategy, parametreler, qtpylib = technical.qtpylib) yüklenir.
# Parametreler değiştirilmez (buy_params/sell_params varsa freqtrade gibi onlar kullanılır).
# Simülatör freqtrade backtest mantığına yakındır:
#   - sinyal mum kapanışında, giriş sonraki mumun açılışında; aynı mumda giriş+çıkış sinyali varsa giriş yok
#   - stop / ROI mum içinde (düşük/yüksek), aynı mumda ikisi → stop; çıkış sinyali sonraki açılışta
#   - iz süren stop yalnız önceki mumların tepesiyle güncellenir (freqtrade'den kötümser)
#   - maliyet taraf başına %0,05 komisyon + %0,03 kayma; fonlama arşivden (long öder, short alır); kaldıraç 1
#   - evren: ayın 30 günlük hacmine göre ilk 30 coin (delist dahil, TradFi hariç); giriş yalnız coin o ay evrendeyken
#   - 1 dk / 5 dk stratejiler 15 dk'da (ve --alt1h ile 1 sa'te) koşar; 4 sa / 12 sa 1 sa'ten toplanır, 1 g arşivden
#   - portföy: en çok 10 açık işlem, işlem başına gerçekleşmiş özkaynağın 1/10'u (düşüş gerçekleşmiş özkaynaktan)
# Gerekenler: pip install pandas numpy TA-Lib technical; strateji deposu:
#   git clone --depth 1 https://github.com/freqtrade/freqtrade-strategies ../ft-src/freqtrade-strategies
# Kullanım: python tests/freqtrade-test.py [--src DİZİN] [--only A,B] [--proc 6] [--top 30] [--alt1h]
# Çıktı: tests/data/arch/freqtrade-results.json (+ -trades.json); rapor: python tests/freqtrade-report.py
import sys, os, re, io, contextlib, json, types, glob, math, time, argparse, importlib.util, heapq
from datetime import datetime, timezone
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ARCH = os.path.join(HERE, 'data', 'arch')
NPY = os.path.join(ARCH, 'npy')
FEE, SLIP = 0.0005, 0.0003
T0 = int(datetime(2020, 6, 1, tzinfo=timezone.utc).timestamp() * 1000)
SLOTS = 10
TFMIN = {'1m': 1, '3m': 3, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '2h': 120, '4h': 240, '6h': 360, '8h': 480, '12h': 720, '1d': 1440}
SKIP = {
    'DoesNothingStrategy': 'işlem yapmıyor',
    'Freqtrade_backtest_validation_freqtrade1': 'freqtrade doğrulama örneği',
    'AlmgrenChrissStrategy': 'emir yürütme algoritması',
    'TWAPStrategy': 'emir yürütme algoritması',
    'BreakEven': 'yardımcı örnek (başabaş)',
    'FOttStrategy': 'çok yavaş (satır satır pandas döngüsü; tek coin saatler sürüyor)',
}

# ---------------- freqtrade taklidi ----------------
def install_shim():
    if 'freqtrade.strategy' in sys.modules: return
    import numpy.lib; numpy.lib.math = math  # eski stratejiler `from numpy.lib import math` yazar (numpy 2'de yok)
    from technical import qtpylib as _q
    class _P:
        def __init__(self, *a, default=None, space=None, optimize=True, load=True, **k):
            if default is None:
                if a and isinstance(a[0], (list, tuple)): default = a[0][0]
                elif a: default = a[0]
            self.value = default; self.space = space; self.optimize = optimize; self.load = load
        @property
        def range(self): return [self.value]
    class IntParameter(_P): pass
    class DecimalParameter(_P): pass
    class RealParameter(_P): pass
    class BooleanParameter(_P): pass
    class CategoricalParameter(_P):
        def __init__(self, categories, *, default=None, **k):
            super().__init__(default=default if default is not None else categories[0], **k)
    class IStrategy:
        INTERFACE_VERSION = 3
        minimal_roi = {'0': 10}
        stoploss = -1.0
        trailing_stop = False; trailing_stop_positive = None; trailing_stop_positive_offset = 0.0; trailing_only_offset_is_reached = False
        can_short = False; startup_candle_count = 0; process_only_new_candles = True; timeframe = '5m'
        use_custom_stoploss = False; position_adjustment_enable = False
        order_types = {}; order_time_in_force = {}
        def __init__(self, config=None):
            self.config = config or {}; self.dp = None; self.wallets = None
            for k in dir(type(self)):  # örnek başına kopya; freqtrade gibi buy_params/sell_params öncelikli
                p = getattr(type(self), k, None)
                if isinstance(p, _P): q = _P.__new__(type(p)); q.__dict__ = dict(p.__dict__); setattr(self, k, q)
            for src in ('buy_params', 'sell_params', 'protection_params'):
                for k, v in (getattr(self, src, None) or {}).items():
                    p = getattr(self, k, None)
                    if isinstance(p, _P): p.value = v
        def informative_pairs(self): return []
    def merge_informative_pair(dataframe, informative, timeframe, timeframe_inf, ffill=True, **k):
        m1, m2 = TFMIN[timeframe], TFMIN[timeframe_inf]
        inf = informative.copy()
        inf['date_merge'] = inf['date'] + pd.to_timedelta(m2 - m1, 'm') if m1 < m2 else inf['date']
        inf.columns = [f'{c}_{timeframe_inf}' for c in inf.columns]
        df = pd.merge(dataframe, inf, left_on='date', right_on=f'date_merge_{timeframe_inf}', how='left').drop(f'date_merge_{timeframe_inf}', axis=1)
        return df.ffill() if ffill else df
    def informative(*a, **k): return lambda f: f
    def stoploss_from_open(rel, prof, is_short=False, leverage=1.0):
        if prof == -1: return 1
        st = -1 + ((1 + rel / leverage) / (1 + prof)) if not is_short else 1 - ((1 - rel / leverage) / (1 - prof))
        return max(st * leverage, 0.0)
    def timeframe_to_minutes(tf): return TFMIN[tf]
    def mk(name, **attrs):
        m = types.ModuleType(name); m.__dict__.update(attrs); sys.modules[name] = m; return m
    strat = dict(IStrategy=IStrategy, IntParameter=IntParameter, DecimalParameter=DecimalParameter, RealParameter=RealParameter,
                 BooleanParameter=BooleanParameter, CategoricalParameter=CategoricalParameter, merge_informative_pair=merge_informative_pair,
                 informative=informative, stoploss_from_open=stoploss_from_open, timeframe_to_minutes=timeframe_to_minutes)
    ft = mk('freqtrade', __path__=[]); st = mk('freqtrade.strategy', __path__=[], **strat); mk('freqtrade.strategy.interface', **strat)
    v = mk('freqtrade.vendor', __path__=[]); qp = mk('freqtrade.vendor.qtpylib', __path__=[], indicators=_q); sys.modules['freqtrade.vendor.qtpylib.indicators'] = _q
    class Trade: pass
    mk('freqtrade.persistence', Trade=Trade)
    mk('freqtrade.exchange', timeframe_to_minutes=timeframe_to_minutes, date_minus_candles=lambda tf, n, d=None: (d or datetime.now(timezone.utc)) - pd.to_timedelta(n * TFMIN[tf], 'm'))
    ft.data = mk('freqtrade.data', __path__=[]); ft.strategy = st; ft.vendor = v; v.qtpylib = qp

def load_strategies(src):
    out = []
    for f in sorted(glob.glob(os.path.join(src, 'user_data', 'strategies', '**', '*.py'), recursive=True)):
        if 'lookahead_bias' in f: continue  # depo bunları bilerek geleceğe bakan örnek olarak ayırıyor
        txt = open(f, encoding='utf-8', errors='replace').read()
        for name in re.findall(r'^class\s+(\w+)\s*\(\s*IStrategy\s*\)', txt, re.M):
            out.append((name, f, txt))
    return out

def instantiate(name, f):
    spec = importlib.util.spec_from_file_location('ft_' + name, f)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return getattr(m, name)({'stake_currency': 'USDT', 'dry_run': True, 'runmode': 'backtest'})

def unsupported(s, txt):
    if type(s).__name__ in SKIP: return SKIP[type(s).__name__]
    for fn in ('custom_stoploss', 'custom_exit', 'custom_sell', 'adjust_trade_position', 'confirm_trade_entry', 'custom_entry_price', 'custom_exit_price', 'custom_stake_amount'):
        if re.search(r'def ' + fn + r'\b', txt): return fn
    if re.search(r'self\.dp\.|@informative', txt): return 'başka coin/zaman dilimi verisi (DataProvider)'
    return None

# ---------------- veri ----------------
def universe(): return json.load(open(os.path.join(ARCH, 'universe.json'), encoding='utf-8'))['months']

def npy_of(sym, iv):
    os.makedirs(NPY, exist_ok=True)
    p = os.path.join(NPY, f'{sym}-{iv}.npy'); c = os.path.join(ARCH, iv, sym + '.csv')
    if not os.path.exists(c): return None
    if os.path.exists(p) and os.path.getmtime(p) >= os.path.getmtime(c): return np.load(p)
    try: a = pd.read_csv(c, header=None, usecols=[0, 1, 2, 3, 4, 5]).values.astype(float)
    except Exception: return None
    if not len(a): return None
    a = a[np.argsort(a[:, 0], kind='stable')]
    tmp = p + '.tmp.npy'; np.save(tmp, a); os.replace(tmp, p); return a

def resample(a, mins):
    ms = mins * 60000; g = (a[:, 0] // ms).astype(np.int64)
    idx = np.flatnonzero(np.r_[True, g[1:] != g[:-1]]); ends = np.r_[idx[1:], len(a)] - 1
    o = np.empty((len(idx), 6)); o[:, 0] = g[idx] * ms; o[:, 1] = a[idx, 1]; o[:, 4] = a[ends, 4]
    o[:, 2] = np.maximum.reduceat(a[:, 2], idx); o[:, 3] = np.minimum.reduceat(a[:, 3], idx); o[:, 5] = np.add.reduceat(a[:, 5], idx)
    if a[-1, 0] + 36e5 < (g[-1] + 1) * ms: o = o[:-1]  # son grup tamamlanmamış
    return o

def candles(sym, tf):
    if tf in ('15m', '1h', '1d'): return npy_of(sym, tf)
    a = npy_of(sym, '1h')
    return None if a is None else resample(a, TFMIN[tf])

FUND = {}
def fund_sum(sym, t0, t1):
    if sym not in FUND:
        p = os.path.join(ARCH, 'funding', sym + '.csv'); FUND[sym] = (np.zeros(0), np.zeros(1))
        if os.path.exists(p) and os.path.getsize(p) > 0:
            a = pd.read_csv(p, header=None).values.astype(float); a = a[np.argsort(a[:, 0])]
            FUND[sym] = (a[:, 0], np.r_[0, np.cumsum(a[:, 1])])
    t, cs = FUND[sym]
    if not len(t): return 0.0
    return cs[np.searchsorted(t, t1, 'right')] - cs[np.searchsorted(t, t0, 'right')]

# ---------------- simülatör ----------------
def roi_table(s, tfm, W):
    out = np.full(W, np.inf)
    for k, v in sorted(((int(float(k)), v) for k, v in (s.minimal_roi or {}).items()), key=lambda x: x[0]):
        out[np.arange(W) * tfm >= k] = v
    return out

def trade_ret(e, x, short, fsum):
    if not short: return x * (1 - SLIP) / (e * (1 + SLIP)) - 1 - FEE - FEE * x / e - fsum
    return 1 - x * (1 + SLIP) / (e * (1 - SLIP)) - FEE - FEE * x / e + fsum

def simulate(sym, s, a, sig, allow, tfm):
    t, o, h, l, c = a[:, 0], a[:, 1], a[:, 2], a[:, 3], a[:, 4]
    n = len(a); el, xl, es, xs = sig
    sh = lambda x: np.r_[False, x[:-1]]  # sinyal i kapanışında → i+1 açılışında
    EL = sh(el & ~xl & ~es) & allow
    ES = (sh(es & ~xs & ~el) & allow) if getattr(s, 'can_short', False) else np.zeros(n, bool)
    use_x = getattr(s, 'use_exit_signal', getattr(s, 'use_sell_signal', True))
    XL = sh(xl) if use_x else np.zeros(n, bool); XS = sh(xs) if use_x else np.zeros(n, bool)
    sl = abs(float(s.stoploss)); tr = bool(s.trailing_stop)
    tsp = s.trailing_stop_positive; tso = float(s.trailing_stop_positive_offset or 0); only_off = bool(s.trailing_only_offset_is_reached)
    epo = bool(getattr(s, 'exit_profit_only', getattr(s, 'sell_profit_only', False))); epoff = float(getattr(s, 'exit_profit_offset', getattr(s, 'sell_profit_offset', 0)) or 0)
    ROI = roi_table(s, tfm, 1 << 20)
    cand = np.flatnonzero(EL | ES); trades = []; i = 0
    for j in cand:
        if j < i: continue
        short = bool(ES[j]) and not EL[j]; sgn = -1 if short else 1
        e = o[j]; W = 256; ex = None
        while ex is None:
            k1 = min(n, j + W); oo, hh, ll = o[j:k1], h[j:k1], l[j:k1]
            base = e * (1 - sgn * sl)
            if tr:
                best = np.maximum.accumulate(hh) if not short else np.minimum.accumulate(ll)
                reach = sgn * (best / e - 1) > tso
                dist = np.where(reach, float(tsp), sl) if tsp is not None else np.full(len(best), sl)
                active = reach if (tsp is not None and only_off) else np.ones(len(best), bool)
                lev = np.where(active, best * (1 - sgn * dist), base)
                lev = np.maximum.accumulate(np.maximum(lev, base)) if not short else np.minimum.accumulate(np.minimum(lev, base))
                stopp = np.r_[base, lev[:-1]]
            else: stopp = np.full(len(oo), base)
            hit_stop = (ll <= stopp) if not short else (hh >= stopp)
            tgt = e * (1 + sgn * ROI[:len(oo)])
            hit_roi = (hh >= tgt) if not short else (ll <= tgt)
            xsig = (XL if not short else XS)[j:k1].copy(); xsig[0] = False
            if epo: xsig &= sgn * (oo / e - 1) > epoff
            cands = []
            for arr, pri, why in ((xsig, 0, 'sinyal'), (hit_stop, 1, 'stop'), (hit_roi, 2, 'roi')):
                f = np.flatnonzero(arr)
                if len(f): cands.append((f[0], pri, why))
            if cands:
                k, _, why = min(cands); kk = j + k
                if why == 'sinyal': px = o[kk]
                elif why == 'stop': px = min(o[kk], stopp[k]) if not short else max(o[kk], stopp[k])
                elif k == 0: px = tgt[k]
                else: px = max(o[kk], tgt[k]) if not short else min(o[kk], tgt[k])
                ex = (kk, px, why)
            elif k1 >= n: ex = (n - 1, c[n - 1], 'veri sonu')
            else: W *= 4
        kk, px, why = ex
        tx = t[kk] + (tfm * 60000 if why == 'veri sonu' else 0)
        trades.append((float(t[j]), float(tx), int(short), float(trade_ret(e, px, short, fund_sum(sym, t[j], tx))), why))
        i = kk + 1
    return trades

def signals(s, df, meta):
    n0 = len(df); dates = df['date'].copy()
    df = s.populate_indicators(df, meta)
    if hasattr(s, 'populate_entry_trend'): df = s.populate_entry_trend(df, meta)
    else: df = s.populate_buy_trend(df, meta)
    if hasattr(s, 'populate_exit_trend'): df = s.populate_exit_trend(df, meta)
    else: df = s.populate_sell_trend(df, meta)
    if len(df) != n0 and 'date' in df:  # satır atan stratejiler (dropna vb.): sinyaller tarihe göre geri hizalanır
        df = df.drop_duplicates('date').set_index('date').reindex(dates).reset_index()
    g = lambda c: (pd.to_numeric(df[c], errors='coerce').fillna(0).values == 1) if c in df else np.zeros(len(df), bool)
    el = g('enter_long') | g('buy'); xl = g('exit_long') | g('sell')
    return len(df), (el, xl, g('enter_short'), g('exit_short'))

CACHE = os.path.join(ARCH, 'ft-cache')  # iş başına sonuç; kesilirse yeniden çalıştırınca bitenler atlanır
def run_job(job):
    cf = os.path.join(CACHE, f"{job['name']}-{job['tf']}-{job['top']}.json")
    if os.path.exists(cf) and os.path.getmtime(cf) >= os.path.getmtime(job['file']):
        return json.load(open(cf, encoding='utf-8'))
    res = run_job0(job)
    if 'trades' in res or res.get('err', '').startswith(('çalışmadı', 'yüklenemedi')):
        os.makedirs(CACHE, exist_ok=True); json.dump(res, open(cf + '.tmp', 'w', encoding='utf-8')); os.replace(cf + '.tmp', cf)
    return res

def run_job0(job):
    import warnings; warnings.filterwarnings('ignore')
    name, f, tf, top = job['name'], job['file'], job['tf'], job['top']
    install_shim(); t0 = time.time()
    try: s = instantiate(name, f)
    except Exception as e: return dict(name=name, tf=tf, err='yüklenemedi: ' + str(e).splitlines()[0][:160])
    s.timeframe = tf  # freqtrade --timeframe gibi: strateji içindeki yeniden örnekleme katları bu zaman dilimine göre
    U = universe(); tfm = TFMIN[tf]
    syms = sorted({x for m, v in U.items() if m >= '2020-06' for x in v[:top]})
    allT = []; errs = 0; lasterr = ''; done = 0
    for sym in syms:
        a = candles(sym, tf)
        if a is None or len(a) < 50: continue
        mk = (a[:, 0] // 1000).astype('datetime64[s]').astype('datetime64[M]').astype(str)
        um = {m: sym in U.get(m, [])[:top] for m in np.unique(mk)}
        allow = np.array([um[m] for m in mk]) & (a[:, 0] >= T0)
        if not allow.any(): continue
        st = max(0, int(np.argmax(allow)) - max(600, 2 * int(getattr(s, 'startup_candle_count', 0) or 0)))  # ısınma
        a2 = a[st:]; allow2 = allow[st:]
        df = pd.DataFrame({'date': pd.to_datetime(a2[:, 0], unit='ms', utc=True), 'open': a2[:, 1], 'high': a2[:, 2], 'low': a2[:, 3], 'close': a2[:, 4], 'volume': a2[:, 5]})
        try:
            with contextlib.redirect_stdout(io.StringIO()):  # bazı stratejiler print eder
                m, sig = signals(s, df, {'pair': sym[:-4] + '/USDT:USDT'})
            if m != len(a2): raise RuntimeError('satır sayısı değişti')
        except Exception as e:
            errs += 1; lasterr = (type(e).__name__ + ': ' + str(e)).splitlines()[0][:160]
            if errs >= 3 and not done: return dict(name=name, tf=tf, err='çalışmadı: ' + lasterr)
            continue
        done += 1
        if time.time() - t0 > job.get('budget', 3600): return dict(name=name, tf=tf, err=f'çok yavaş ({done} coinde {round(time.time() - t0)} sn)')
        for x in simulate(sym, s, a2, sig, allow2, tfm): allT.append((sym,) + x)
    attrs = dict(roi=s.minimal_roi, stoploss=s.stoploss, trailing=bool(s.trailing_stop), short=bool(getattr(s, 'can_short', False)))
    return dict(name=name, tf=tf, file=os.path.relpath(f, job['src']).replace('\\', '/'), attrs=attrs, trades=allT, sec=round(time.time() - t0), errs=errs, lasterr=lasterr, pairs=done)

# ---------------- özet ----------------
def stats(rs):
    rs = np.asarray(rs, float)
    if not len(rs): return dict(n=0)
    w = rs[rs > 0].sum(); L = -rs[rs < 0].sum()
    cut = max(1, len(rs) // 100); trim = float(np.sort(rs)[:-cut].mean()) if len(rs) > cut else None  # en iyi %1 hariç
    return dict(n=int(len(rs)), mean=float(rs.mean()), trim=trim, med=float(np.median(rs)), win=float((rs > 0).mean()), pf=float(w / L) if L > 0 else None,
                t=float(rs.mean() / (rs.std(ddof=1) / math.sqrt(len(rs)))) if len(rs) > 2 and rs.std() > 0 else None)

def portfolio(tr):
    eq = peak = 1.0; mdd = 0.0; heap = []; taken = 0
    def close():
        nonlocal eq, peak, mdd
        _, stake, r = heapq.heappop(heap); eq += stake * r; peak = max(peak, eq); mdd = max(mdd, 1 - eq / peak)
    for x in sorted(tr, key=lambda x: x[1]):
        while heap and heap[0][0] <= x[1]: close()
        if len(heap) < SLOTS and eq > 0: heapq.heappush(heap, (x[2], eq / SLOTS, x[4])); taken += 1
    while heap: close()
    return eq, mdd, taken

def summarize(res, now_ms):
    tr = res['trades']; out = {k: res.get(k) for k in ('name', 'tf', 'file', 'attrs', 'errs', 'lasterr', 'pairs')}
    if not tr: out['all'] = dict(n=0); out['pass'] = False; return out
    ts = np.array([x[1] for x in tr]); r = np.array([x[4] for x in tr]); sh = np.array([x[3] for x in tr])
    mid = T0 + (now_ms - T0) / 2; y12 = now_ms - 365 * 864e5
    out['all'] = stats(r); out['h1'] = stats(r[ts < mid]); out['h2'] = stats(r[ts >= mid]); out['y12'] = stats(r[ts >= y12])
    out['long'] = stats(r[sh == 0]); out['short'] = stats(r[sh == 1])
    yrs = np.array([datetime.fromtimestamp(x / 1000, timezone.utc).year for x in ts])
    out['years'] = {int(y): stats(r[yrs == y]) for y in np.unique(yrs)}
    out['exits'] = {}
    for x in tr: out['exits'][x[5]] = out['exits'].get(x[5], 0) + 1
    out['hold_h'] = float(np.median([(x[2] - x[1]) / 36e5 for x in tr]))
    eq, mdd, taken = portfolio(tr); yrs_n = (now_ms - T0) / (365.25 * 864e5)
    out['port'] = dict(eq=eq, cagr=(eq ** (1 / yrs_n) - 1) if eq > 0 else -1, mdd=mdd, taken=taken)
    out['gross'] = float(np.mean(r) + 2 * FEE + 2 * SLIP)  # maliyetsiz kaba ortalama
    ok = lambda k, m: out[k].get('n', 0) >= m and out[k]['mean'] > 0
    out['pass'] = bool(ok('h1', 30) and ok('h2', 30) and ok('y12', 20))
    # sağlam: en iyi %1 işlem çıkarılınca da iki yarıda ve son 12 ayda artı (birkaç dev kazanca dayanmıyor)
    out['robust'] = bool(out['pass'] and all((out[k].get('trim') or -1) > 0 for k in ('h1', 'h2', 'y12')))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=os.path.join(HERE, '..', '..', 'ft-src', 'freqtrade-strategies'))
    ap.add_argument('--only', default=None); ap.add_argument('--proc', type=int, default=6); ap.add_argument('--top', type=int, default=30)
    ap.add_argument('--alt1h', action='store_true', help='1 dk / 5 dk stratejileri 1 sa mumlarda da koş')
    ap.add_argument('--out', default=os.path.join(ARCH, 'freqtrade-results.json'))
    A = ap.parse_args(); src = os.path.abspath(A.src)
    install_shim(); jobs = []; skipped = []
    for name, f, txt in load_strategies(src):
        if A.only and name not in A.only.split(','): continue
        try: s = instantiate(name, f)
        except Exception as e: skipped.append(dict(name=name, why='yüklenemedi: ' + str(e).splitlines()[0][:120])); continue
        why = unsupported(s, txt)
        if why: skipped.append(dict(name=name, why=why)); continue
        nat = getattr(s, 'timeframe', None) or getattr(s, 'ticker_interval', '5m')
        if TFMIN.get(nat, 5) < 15: tfs = ['15m'] + (['1h'] if A.alt1h else [])
        elif nat == '30m': tfs = ['15m', '1h']
        else: tfs = [nat]
        for tf in tfs: jobs.append(dict(name=name, file=f, tf=tf, top=A.top, src=src, native=nat))
    print(f'{len(jobs)} iş, {len(skipped)} atlandı: ' + ', '.join(f"{x['name']} ({x['why']})" for x in skipped), flush=True)
    U = universe(); need = sorted({x for m, v in U.items() if m >= '2020-06' for x in v[:A.top]})
    for iv in sorted({'1h' if j['tf'] not in ('15m', '1d') else j['tf'] for j in jobs}):  # npy önbelleği tek süreçte
        for sym in need: npy_of(sym, iv)
    now_ms = time.time() * 1000; results = []
    def show(res): print(f"  {res['name']} {res['tf']}: {res.get('err') or str(len(res['trades'])) + ' işlem, ' + str(res['pairs']) + ' coin, ' + str(res['sec']) + ' sn' + (' (hata ' + str(res['errs']) + ': ' + res['lasterr'] + ')' if res['errs'] else '')}", flush=True)
    if A.proc > 1:
        from multiprocessing import Pool
        with Pool(A.proc) as p:
            for res in p.imap_unordered(run_job, jobs): results.append(res); show(res)
    else:
        for j in jobs: res = run_job(j); results.append(res); show(res)
    nat = {(j['name'], j['tf']): j['native'] for j in jobs}
    summ = []
    for r in results:
        x = summarize(r, now_ms) if 'trades' in r else dict(name=r['name'], tf=r['tf'], err=r['err'])
        x['native'] = nat[(r['name'], r['tf'])]; summ.append(x)
    json.dump(dict(at=datetime.now(timezone.utc).isoformat(), top=A.top, fee=FEE, slip=SLIP, skipped=skipped, results=summ), open(A.out, 'w'), indent=1)
    json.dump({f"{r['name']}|{r['tf']}": r['trades'] for r in results if 'trades' in r}, open(A.out.replace('.json', '-trades.json'), 'w'))
    print('yazıldı', A.out)

if __name__ == '__main__':
    main()
