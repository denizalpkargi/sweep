/* ---------- Kaplumbağa sepeti: 20 günlük kırılım, yalnız long, BTC > SMA200 (8 Ekim 2026, masterplan Adım 3) ----------
   Araştırma (tests/research-daily-wide.js, Binance arşivi günlük, 2020-06 → 2026-10, 433 coin delist dahil, her ay önceki 30 günün hacmine göre ilk 50,
   TradFi vadelileri hariç; maliyet taraf başına %0,08 + fonlama): kapanış önceki 20 günün tepesini geçince ertesi açılışta long; kapanış önceki 10 günün
   dibinin altına inince ya da giriş − 2N altında kapanınca ertesi açılışta çık; gün içi giriş − 4N felaket stopu (N = 20 günlük ATR). Yalnız BTC kapanışı
   200 günlük ortalamanın üstündeyken yeni giriş. 801 işlem, +0,94R, yarılar +1,52 / +0,54, son 24 ay +0,36; işlem başına %0,5 risk, en çok 10 pozisyon,
   toplam nominal ≤ 2x ile yıllık +%25, en büyük düşüş −%31 (boyut 4 denemeden seçildi). Kazanç az sayıda büyük işlemden: medyan −0,84R, 2024 −%3, 2025 −%9.
   Shortlar ve piramit kenarsız. Canlı evren: 24 sa hacimce ilk 80 aday → kapanmış son 30 günün hacmine göre ilk 50 (günde bir).
   Masa'dan ayrı sanal bakiye; ui.js (Bot sekmesi "Kaplumbağa sepeti") ve headless/run.js aynı fonksiyonları kullanır. Gerçek emir yok. */
const TT_DEF={on:true,bal0:100,top:50,cand:80,entryN:20,exitN:10,atrN:20,stopN:2,catN:4,btcSma:200,risk:0.005,maxPos:10,lev:2,exLev:20,
  fee:0.0005,slip:0.0003,fundDef:0.0001,
  // boy (10 Ekim 2026, test #50): "risk" = risk ÷ stop uzaklığı (2N); "vol" = volTv ÷ σ (son volN günün kapanış getirisi std × √365), Grobys vd. 2025
  size:"risk",volTv:0.04,volN:60};
const TT_KEY="st-turtle";
const TT_TRADFI=new Set("42 AAOI AAPL ADBE ALAB AMAT AMD AMZN ANC APP ARM ASML ASTS AVGO AXTI BABA BBX BE BITO BMNR BNC BOT BSP BTCST BX BYD BZ CAT CBRS CIEN CL COHR COIN COPPER COST CRCL CRDO CRM CRWD CRWV CSCO CSOPSAMSUNG2L CSOPSKHYNIX2L CXMT DDOG DELL DIS DJT DKNG DRAM EBAY EWJ EWT EWY FLEX FLNC FWDI GDX GEV GIGADEV GLW GME GOOGL GPRO GS GTLB HANMI HD HIMS HK0625 HK0700 HK0992 HK1810 HOOD HPE HYUNDAI IBM INTC INTW IONQ IREN JPM KLAC KODEX200 KORU KSTR KUAISHOU LGELECTRONICS LITE LLY LRCX LYTE MARA MDB MEITUAN META MINIMAX MRK MRNA MRVL MSFT MSTR MU MUU MVLL NATGAS NAVER NBIS NET NFLX NOK NOW NVDA NVDL NVO ONDS ORCL PANW PAXG PAYP PDD PENG PLTR POPMART PYPL QCOM QNTX QQQ RAM RDDT RIVN RKLB SAMSUNG SAMSUNGEM SHAZ SHOP SKDD SKHY SKHYNIX SKUU SMCI SMH SNDK SNOW SNXX SOFI SONY SOXL SOXS SPCX SPY SQQQ STRC STXX TBT TEAM TEM TENCENT TER TMF TQQQ TSLA TSLL TSM TTWO TXN TZA UBER UNITREE URNM USAR UVXY V VRT VST WDC WEN WMT XAG XAU XAUT XBI XPD XPT ZHIPU ZHONGJI ZM ZS".split(" ").map(s=>s+"USDT"));
function ttNew(cfg){ cfg=Object.assign({},TT_DEF,cfg||{}); return {cfg,bal:cfg.bal0,start:cfg.bal0,peak:cfg.bal0,pos:{},trades:[],log:[],day:null,fundT:0,fees:0,funding:0,univ:[],btc:null}; }
function ttLoad(){ let s=null; try{ s=JSON.parse(localStorage.getItem(TT_KEY)||"null"); }catch(e){} if(!s) s=ttNew(); s.cfg=Object.assign({},TT_DEF,s.cfg||{}); return s; }
function ttSave(s){ try{ localStorage.setItem(TT_KEY,JSON.stringify(s)); }catch(e){} }
function ttLog(s,ev){ s.log.push(ev); if(s.log.length>400) s.log.splice(0,s.log.length-400); return ev; }
function ttEq(s,px){ let u=0; for(const k in s.pos){ const p=s.pos[k]; const x=px&&px[k]||p.px; if(x>0) u+=p.qty*(x-p.e); } return s.bal+u; }
// a: kapanmış günlük mumlar (zamana göre); i: son mum indisi
function ttAtr(a,i,n){ if(i<n) return NaN; let s=0; for(let k=i-n+1;k<=i;k++) s+=Math.max(a[k].h-a[k].l,Math.abs(a[k].h-a[k-1].c),Math.abs(a[k].l-a[k-1].c)); return s/n; }
function ttHi(a,i,n){ let m=-Infinity; for(let k=i-n+1;k<=i;k++) m=Math.max(m,a[k].h); return m; }
function ttLo(a,i,n){ let m=Infinity; for(let k=i-n+1;k<=i;k++) m=Math.min(m,a[k].l); return m; }
function ttVol(a,i,n){ if(i<n) return NaN; let x=0,y=0; for(let k=i-n+1;k<=i;k++){ const r=a[k].c/a[k-1].c-1; x+=r; y+=r*r; } const m=x/n; return Math.sqrt(Math.max(y/n-m*m,0))*Math.sqrt(365); }
function ttBtcOk(b,cfg){ const i=b?b.length-1:-1; if(i<cfg.btcSma) return null; const m=trSma(b,i,cfg.btcSma); return {ok:b[i].c>m,c:b[i].c,sma:m,t:b[i].t}; }
function ttExit(s,sym,px,why,now){
  const p=s.pos[sym], c=s.cfg; const fill=px*(1-c.slip); const fee=p.qty*fill*c.fee; const pnl=p.qty*(fill-p.e);
  s.bal+=pnl-fee; s.fees+=fee; delete s.pos[sym];
  const net=pnl-fee-p.fee-p.fund, R=net/(p.qty*p.e*p.risk0);
  const tr={sym,t:p.t,closeT:now,e:p.e,x:fill,why,R,pnl:net,days:p.age||0}; s.trades.push(tr); if(s.trades.length>1000) s.trades.shift();
  return ttLog(s,{t:now,type:"exit",sym,why,px:fill,pnl:net,R});
}
// gün içi felaket stopu. bar: {o,l} (tekrar oynatmada günün mumu; canlıda o = l = mark fiyat)
function ttIntraday(s,sym,bar,now){ const p=s.pos[sym]; if(!p||!(bar.l<=p.cat)) return null; return ttExit(s,sym,Math.min(bar.o,p.cat),"felaket stopu (giriş − "+s.cfg.catN+"N)",now); }
// gün kapanışı: data = {SYM: kapanmış günlük mumlar} (BTCUSDT dahil); univ = evrendeki coinler (hacim sırasıyla); px = işlem fiyatı (ertesi açılış / şimdiki mark)
function ttClose(s,data,univ,px,now){
  const c=s.cfg, evs=[];
  for(const sym of Object.keys(s.pos)){ const a=data[sym], p=s.pos[sym]; if(!a||a.length<c.exitN+2||!(px[sym]>0)) continue; const i=a.length-1; if(a[i].t<p.day) continue;
    p.age=Math.round((a[i].t-p.day)/864e5)+1; const lo=ttLo(a,i-1,c.exitN);
    if(a[i].c<p.stop) evs.push(ttExit(s,sym,px[sym],"kapanış stopu (giriş − "+c.stopN+"N)",now));
    else if(a[i].c<lo) evs.push(ttExit(s,sym,px[sym],c.exitN+" günlük dibin altında kapanış",now)); }
  const bt=ttBtcOk(data.BTCUSDT,c); s.btc=bt; s.univ=univ.slice(0,c.top);
  if(!bt||!bt.ok) return evs;
  for(const sym of s.univ){ if(s.pos[sym]||Object.keys(s.pos).length>=c.maxPos) continue; const a=data[sym], x=px[sym]; if(!a||a.length<Math.max(c.entryN,c.atrN)+2||!(x>0)) continue;
    const i=a.length-1; if(!(a[i].c>ttHi(a,i-1,c.entryN))) continue; const N=ttAtr(a,i,c.atrN); if(!(N>0)) continue;
    const e=x*(1+c.slip), stop=e-c.stopN*N, cat=e-c.catN*N; if(!(stop>0)||a[i].c<=stop) continue; const risk0=(e-stop)/e;
    const used=Object.entries(s.pos).reduce((m,[k,p])=>m+p.qty*(px[k]||p.px),0); let usd=c.risk*s.bal/risk0;
    if(c.size==="vol"){ const v=ttVol(a,i,c.volN); if(!(v>0)) continue; usd=c.volTv*s.bal/v; }
    usd=Math.min(usd,c.lev*s.bal-used); if(!(usd>1)) continue;
    const qty=usd/e, fee=usd*c.fee; s.bal-=fee; s.fees+=fee;
    s.pos[sym]={e,qty,t:now,day:a[i].t+864e5,stop,cat,N,risk0,fee,fund:0,px:x,age:0};
    evs.push(ttLog(s,{t:now,type:"entry",sym,px:e,usd,stop,cat,N,why:c.entryN+" günlük tepe "+ttHi(a,i-1,c.entryN)+" kapanışla geçildi"})); }
  return evs;
}
function ttFund(s,px,now,fr){ const F=8*3600e3; const slot=Math.floor(now/F)*F; if(!s.fundT) s.fundT=slot;
  while(s.fundT<slot){ s.fundT+=F; for(const k in s.pos){ const p=s.pos[k]; const r=fr&&isFinite(fr[k])?fr[k]:s.cfg.fundDef; const cst=p.qty*(px&&px[k]||p.px)*r; s.bal-=cst; s.funding+=cst; p.fund+=cst; } } }
// canlı veri: gün başına bir kez evren + günlük mumlar; her turda mark fiyat ve fonlama
const ttCache={day:null,data:null,univ:null,pxT:0,px:null,fr:null};
async function ttData(s,now,force){
  const c=s.cfg, day=new Date(now).toISOString().slice(0,10);
  if(!ttCache.px||now-ttCache.pxT>60e3||force){ const px={}, fr={}; const pi=await j("/fapi/v1/premiumIndex"); for(const r of pi){ px[r.symbol]=+r.markPrice; fr[r.symbol]=+r.lastFundingRate; } Object.assign(ttCache,{px,fr,pxT:now}); }
  if(ttCache.day!==day||!ttCache.data||force){
    const tk=await j("/fapi/v1/ticker/24hr"); const cand=tk.filter(r=>/USDT$/.test(r.symbol)&&!TT_TRADFI.has(r.symbol)&&ttCache.px[r.symbol]>0).sort((a,b)=>(+b.quoteVolume)-(+a.quoteVolume)).slice(0,c.cand).map(r=>r.symbol);
    const need=[...new Set([...cand,...Object.keys(s.pos),"BTCUSDT"])], data={};
    for(const sym of need){ try{ const k=K(await j(`/fapi/v1/klines?symbol=${sym}&interval=1d&limit=${sym==="BTCUSDT"?c.btcSma+10:40}`)); data[sym]=k.filter(b=>b.t+864e5<=now); }catch(e){} }
    const vol=sym=>{ const a=data[sym]; if(!a||a.length<20) return -1; return a.slice(-30).reduce((m,b)=>m+(b.q||b.c*b.v||0),0); };
    const univ=cand.filter(x=>vol(x)>0).sort((x,y)=>vol(y)-vol(x)).slice(0,c.top);
    Object.assign(ttCache,{day,data,univ}); }
  return ttCache;
}
async function ttTick(s,now,opts){
  opts=opts||{}; now=now||Date.now(); const c=s.cfg; const C=await ttData(s,now,opts.refresh); const evs=[]; const day=new Date(now).toISOString().slice(0,10);
  ttFund(s,C.px,now,C.fr);
  if(c.on&&(s.day!==day||opts.force)){ evs.push(...ttClose(s,C.data,C.univ,C.px,now)); s.day=day; }
  // listeden çıkan (mark fiyatı artık gelmeyen) coin: son bilinen fiyattan kapat
  if(Object.keys(C.px).length>50) for(const k of Object.keys(s.pos)) if(!(C.px[k]>0)) evs.push(ttExit(s,k,s.pos[k].px,"listeden çıktı",now));
  for(const k of Object.keys(s.pos)){ const x=C.px[k]; if(x>0){ s.pos[k].px=x; const ev=ttIntraday(s,k,{o:x,l:x},now); if(ev) evs.push(ev); } }
  const eq=ttEq(s,C.px); s.peak=Math.max(s.peak||s.start,eq);
  return {eq,evs,px:C.px};
}
function ttSummary(s,px){ const eq=ttEq(s,px); const tr=s.trades; const gross=Object.entries(s.pos).reduce((a,[k,p])=>a+p.qty*((px&&px[k])||p.px),0);
  const openRisk=Object.entries(s.pos).reduce((a,[k,p])=>a+Math.max(0,p.qty*(((px&&px[k])||p.px)-p.stop)),0);
  return {eq,roi:(eq/s.start-1)*100,dd:s.peak>0?Math.max(0,1-eq/s.peak):0,n:tr.length,wr:tr.length?tr.filter(t=>t.R>0).length/tr.length:null,avgR:tr.length?tr.reduce((a,t)=>a+t.R,0)/tr.length:null,
    open:Object.keys(s.pos).length,gross,lev:eq>0?gross/eq:0,margin:gross/(s.cfg.exLev||20),openRisk,fees:s.fees,funding:s.funding,btc:s.btc,univ:s.univ.length}; }
