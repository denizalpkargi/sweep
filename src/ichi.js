/* ---------- Ichimoku sepeti: 4 saatlik Ichimoku kesişimi, long + short (11 Ekim 2026, sosyal medya taraması, test listesi #65) ----------
   Kural (TRADE PRO ve yaygın anlatım, 9/26/52): 4 sa kapanış bulutun üstünde, Tenkan Kijun'u yukarı keser ve kapanış 26 mum öncekinin üstünde → long
   (short tersi). Stop Kijun ile bulutun öbür ucundan uzak olanı, hedef sinyal kapanışından 2R; kapanış Kijun'un öbür yanına geçince sonraki turda çık.
   Coin başına tek pozisyon. Araştırma (tests/sm-run.js, tests/sm-aday.js; www.binance.com/fapi 4 sa, 2020 → 2026-10, taraf başına %0,05 + %0,03 kayma,
   gerçek fonlama, aynı mumda stop + hedef → stop): her ayın önceki 30 gününün hacmine göre ilk 50 coin (delist dahil, 425 coin) 10.245 işlem +0,076R
   (yarılar +0,095 / +0,061, son 12 ay +0,066, 7 yılın 7'si artı); ana 20 dışı +0,073; 2/6/8/12 sa ve 7/22/44, 10/30/60, 20/60/120 ayarları artı; maliyet ×2
   +0,057; aynı stop/hedef/çıkışla rastgele zamanda giriş −0,06…−0,11R. Stop ortalama %9 (10x üstünde likidasyon stoptan önce), tutuş ~2 gün, kazanma %35.
   88+ ayar denendi, t 3,7 (Bonferroni sınırında) → kanıt değil, kâğıtta ileriye. Canlı evren Kaplumbağa gibi: 24 sa hacimce ilk 80 aday → kapanmış
   son 30 günün 4 sa hacmine göre ilk 50 (4 saatte bir). Masa'dan ayrı sanal bakiye; ui.js (Bot sekmesi "Ichimoku sepeti") ve headless/run.js aynı
   fonksiyonları kullanır. Gerçek emir yok. */
const IC_DEF={on:true,bal0:100,top:50,cand:80,ten:9,kij:26,sb:52,R:2,risk:0.005,maxPos:10,lev:2,exLev:20,fee:0.0005,slip:0.0003,fundDef:0.0001,bars:200};
const IC_KEY="st-ichi", IC_TF=4*3600e3;
function icNew(cfg){ cfg=Object.assign({},IC_DEF,cfg||{}); return {cfg,bal:cfg.bal0,start:cfg.bal0,peak:cfg.bal0,pos:{},busy:{},trades:[],log:[],bar:null,fundT:0,fees:0,funding:0,univ:[]}; }
function icLoad(){ let s=null; try{ s=JSON.parse(localStorage.getItem(IC_KEY)||"null"); }catch(e){} if(!s) s=icNew(); s.cfg=Object.assign({},IC_DEF,s.cfg||{}); return s; }
function icSave(s){ try{ localStorage.setItem(IC_KEY,JSON.stringify(s)); }catch(e){} }
function icLog(s,ev){ s.log.push(ev); if(s.log.length>400) s.log.splice(0,s.log.length-400); return ev; }
function icEq(s,px){ let u=0; for(const k in s.pos){ const p=s.pos[k]; const x=px&&px[k]||p.px; if(x>0) u+=p.dir*p.qty*(x-p.e); } return s.bal+u; }
function icMid(a,i,n){ if(i<n-1) return NaN; let h=-Infinity,l=Infinity; for(let k=i-n+1;k<=i;k++){ if(a[k].h>h) h=a[k].h; if(a[k].l<l) l=a[k].l; } return (h+l)/2; }
// a: kapanmış 4 sa mumlar; i: mum indisi → Tenkan, Kijun (i ve i−1), bulut (i anında: b mum önce hesaplanan Senkou A/B)
function icInd(a,i,c){ const b=c.kij; if(i-b<c.sb-1||i<1) return null;
  const ten=icMid(a,i,c.ten), kij=icMid(a,i,b), tenP=icMid(a,i-1,c.ten), kijP=icMid(a,i-1,b);
  const sA=(icMid(a,i-b,c.ten)+icMid(a,i-b,b))/2, sB=icMid(a,i-b,c.sb); if(![ten,kij,tenP,kijP,sA,sB].every(Number.isFinite)) return null;
  return {ten,kij,tenP,kijP,top:Math.max(sA,sB),bot:Math.min(sA,sB)}; }
// i mumunun kapanışında sinyal: {dir, stop, tp, why} | null
function icSignal(a,i,c){ const I=icInd(a,i,c); if(!I||i<c.kij) return null; const x=a[i].c;
  if(x>I.top&&I.tenP<=I.kijP&&I.ten>I.kij&&x>a[i-c.kij].c){ const st=Math.min(I.kij,I.bot); if(st<x) return {dir:1,stop:st,tp:x+c.R*(x-st),kij:I.kij,why:"bulut üstü, Tenkan Kijun'u yukarı kesti"}; }
  if(x<I.bot&&I.kijP<=I.tenP&&I.kij>I.ten&&x<a[i-c.kij].c){ const st=Math.max(I.kij,I.top); if(st>x) return {dir:-1,stop:st,tp:x-c.R*(st-x),kij:I.kij,why:"bulut altı, Tenkan Kijun'u aşağı kesti"}; }
  return null; }
function icExit(s,sym,px,why,now,until){
  const p=s.pos[sym], c=s.cfg; const fill=px*(1-p.dir*c.slip); s.busy=s.busy||{}; s.busy[sym]=until||0; const fee=p.qty*fill*c.fee; const pnl=p.dir*p.qty*(fill-p.e);
  s.bal+=pnl-fee; s.fees+=fee; delete s.pos[sym];
  const net=pnl-fee-p.fee-p.fund, R=net/(p.qty*p.e*p.risk0);
  const tr={sym,dir:p.dir,t:p.t,closeT:now,e:p.e,x:fill,why,R,pnl:net,bars:p.age||0}; s.trades.push(tr); if(s.trades.length>1000) s.trades.shift();
  return icLog(s,{t:now,type:"exit",sym,dir:p.dir,why,px:fill,pnl:net,R});
}
// mum içi stop/hedef. bar: {t,o,h,l} (tekrar oynatmada 4 sa mum; canlıda o = h = l = mark). Giriş mumunda açılış boşluğu sayılmaz (simülatörle aynı).
// Aynı mumda stop ve hedef → stop.
function icIntra(s,sym,bar,now){ const p=s.pos[sym]; if(!p) return null; const d=p.dir;
  if(bar.t>p.bar0){ if(d>0?bar.o<=p.stop:bar.o>=p.stop) return icExit(s,sym,bar.o,"stop (açılış boşluğu)",now,bar.t);
    if(d>0?bar.o>=p.tp:bar.o<=p.tp) return icExit(s,sym,bar.o,"hedef "+s.cfg.R+"R (açılış boşluğu)",now,bar.t); }
  if(d>0?bar.l<=p.stop:bar.h>=p.stop) return icExit(s,sym,p.stop,"stop",now,bar.t);
  if(d>0?bar.h>=p.tp:bar.l<=p.tp) return icExit(s,sym,p.tp,"hedef "+s.cfg.R+"R",now,bar.t);
  return null; }
// 4 sa mum kapanışı: data = {SYM: kapanmış 4 sa mumlar}; univ = evren (hacim sırasıyla); px = işlem fiyatı (sonraki açılış / şimdiki mark); bar0 = giriş mumunun açılış zamanı
function icClose(s,data,univ,px,now,bar0){
  const c=s.cfg, evs=[];
  for(const sym of Object.keys(s.pos)){ const a=data[sym], p=s.pos[sym]; if(!a||a.length<c.kij+2||!(px[sym]>0)) continue; const i=a.length-1; if(a[i].t<p.bar0) continue;
    p.age=Math.round((a[i].t-p.bar0)/IC_TF)+1; const kij=icMid(a,i,c.kij);
    if(p.dir>0?a[i].c<kij:a[i].c>kij) evs.push(icExit(s,sym,px[sym],"kapanış Kijun'un "+(p.dir>0?"altında":"üstünde"),now,bar0)); }
  s.univ=univ.slice(0,c.top);
  for(const sym of s.univ){ if(s.pos[sym]) continue; if(Object.keys(s.pos).length>=c.maxPos) break; const a=data[sym], x=px[sym]; if(!a||a.length<c.kij+c.sb+2||!(x>0)) continue;
    if(s.busy&&s.busy[sym]>=a[a.length-1].t) continue; const sg=icSignal(a,a.length-1,c); if(!sg) continue; const d=sg.dir;
    if(d>0?!(sg.stop<x):!(sg.stop>x)) continue; const e=x*(1+d*c.slip); const risk0=Math.abs(x-sg.stop)/x; if(risk0<0.0005) continue;
    const used=Object.entries(s.pos).reduce((m,[k,p])=>m+p.qty*(px[k]||p.px),0); let usd=c.risk*s.bal/risk0; usd=Math.min(usd,c.lev*s.bal-used); if(!(usd>1)) continue;
    const qty=usd/e, fee=usd*c.fee; s.bal-=fee; s.fees+=fee;
    s.pos[sym]={dir:d,e,qty,t:now,bar0,stop:sg.stop,tp:sg.tp,risk0,fee,fund:0,px:x,age:0};
    evs.push(icLog(s,{t:now,type:"entry",sym,dir:d,px:e,usd,stop:sg.stop,tp:sg.tp,why:sg.why})); }
  return evs;
}
function icFund(s,px,now,fr){ const F=8*3600e3; const slot=Math.floor(now/F)*F; if(!s.fundT) s.fundT=slot;
  while(s.fundT<slot){ s.fundT+=F; for(const k in s.pos){ const p=s.pos[k]; const r=fr&&isFinite(fr[k])?fr[k]:s.cfg.fundDef; const cst=p.dir*p.qty*(px&&px[k]||p.px)*r; s.bal-=cst; s.funding+=cst; p.fund+=cst; } } }
// canlı veri: 4 sa mum başına bir kez evren + 4 sa mumlar; her turda mark fiyat ve fonlama
const icCache={bar:null,data:null,univ:null,pxT:0,px:null,fr:null};
async function icData(s,now,force){
  const c=s.cfg, bar=Math.floor(now/IC_TF)*IC_TF;
  if(!icCache.px||now-icCache.pxT>30e3||force){ const px={}, fr={}; const pi=await j("/fapi/v1/premiumIndex"); for(const r of pi){ px[r.symbol]=+r.markPrice; fr[r.symbol]=+r.lastFundingRate; } Object.assign(icCache,{px,fr,pxT:now}); }
  if(icCache.bar!==bar||!icCache.data||force){
    const tk=await j("/fapi/v1/ticker/24hr"); const cand=tk.filter(r=>/USDT$/.test(r.symbol)&&!TT_TRADFI.has(r.symbol)&&icCache.px[r.symbol]>0).sort((a,b)=>(+b.quoteVolume)-(+a.quoteVolume)).slice(0,c.cand).map(r=>r.symbol);
    const need=[...new Set([...cand,...Object.keys(s.pos)])], data={};
    for(const sym of need){ try{ const k=K(await j(`/fapi/v1/klines?symbol=${sym}&interval=4h&limit=${c.bars}`)); data[sym]=k.filter(b=>b.t+IC_TF<=now); }catch(e){} }
    const vol=sym=>{ const a=data[sym]; if(!a||a.length<c.kij+c.sb+2) return -1; return a.slice(-180).reduce((m,b)=>m+(b.q||b.c*b.v||0),0); };
    const univ=cand.filter(x=>vol(x)>0).sort((x,y)=>vol(y)-vol(x)).slice(0,c.top);
    Object.assign(icCache,{bar,data,univ}); }
  return icCache;
}
async function icTick(s,now,opts){
  opts=opts||{}; now=now||Date.now(); const c=s.cfg; const C=await icData(s,now,opts.refresh); const evs=[]; const bar=Math.floor(now/IC_TF)*IC_TF;
  icFund(s,C.px,now,C.fr);
  for(const k of Object.keys(s.pos)){ const x=C.px[k]; if(x>0){ s.pos[k].px=x; const ev=icIntra(s,k,{t:bar,o:x,h:x,l:x},now); if(ev) evs.push(ev); } }
  if(c.on&&(s.bar!==bar||opts.force)){ evs.push(...icClose(s,C.data,C.univ,C.px,now,bar)); s.bar=bar; }
  if(Object.keys(C.px).length>50) for(const k of Object.keys(s.pos)) if(!(C.px[k]>0)) evs.push(icExit(s,k,s.pos[k].px,"listeden çıktı",now));
  const eq=icEq(s,C.px); s.peak=Math.max(s.peak||s.start,eq);
  return {eq,evs,px:C.px};
}
function icSummary(s,px){ const eq=icEq(s,px); const tr=s.trades; const gross=Object.entries(s.pos).reduce((a,[k,p])=>a+p.qty*((px&&px[k])||p.px),0);
  return {eq,roi:(eq/s.start-1)*100,dd:s.peak>0?Math.max(0,1-eq/s.peak):0,n:tr.length,wr:tr.length?tr.filter(t=>t.R>0).length/tr.length:null,avgR:tr.length?tr.reduce((a,t)=>a+t.R,0)/tr.length:null,
    nL:tr.filter(t=>t.dir>0).length,open:Object.keys(s.pos).length,gross,lev:eq>0?gross/eq:0,margin:gross/(s.cfg.exLev||20),fees:s.fees,funding:s.funding,univ:s.univ.length}; }
