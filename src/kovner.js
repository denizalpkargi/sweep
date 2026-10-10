/* ---------- Sıkışma sepeti (Bruce Kovner): dar aralıktan günlük kapanışla kırılım, kapanış stopu (7 Ekim 2026) ----------
   Araştırma (tests/research-legends.js, BTC·ETH·SOL·BNB günlük, 2020-01 → 2026-10, maliyet ve fonlama dahil): son 7 günün aralığı
   (en yüksek − en düşük) ÷ kapanış, son 60 günün en dar %20'sindeyse ve günlük kapanış 7 günün tepesini geçerse ertesi açılışta long.
   Stop 7 günün dibi, yalnız günlük KAPANIŞLA (fitil saymaz); gün içi felaket stopu stop uzaklığının 2 katı; çıkış kapanış 10 günün dibinin
   altına inince. 128 işlem, ort. +1,70R, kazanma %39, iki yarı +2,45 / +0,93R, son 2 yıl +0,51R; işlem başı %1 risk, en çok 6 birimle
   100 $ → 450 $, en büyük düşüş %15. Masanın 23 coininde son yıl yalnız +0,06R: küçük coinlerde tutmadı, bu yüzden 4 büyük coin.
   Kullanıcı "devam" dedi (masterplan adım 1). Trend sepetiyle aynı günlük veriyi kullanır (trendData); ayrı sanal bakiye. Gerçek emir yok. */
const KOV_DEF={on:true,bal0:100,syms:["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT"],win:7,look:60,pct:0.2,trailN:10,cat:2,risk:0.01,maxNotional:1,minRisk:0.005,exLev:20,
  taker:0.0005,slip:0.0003,fundDef:0.0001};
const KOV_KEY="st-kov";
function kovNew(cfg){ cfg=Object.assign({},KOV_DEF,cfg||{}); return {cfg,bal:cfg.bal0,start:cfg.bal0,peak:cfg.bal0,pos:{},trades:[],log:[],day:null,fundT:0,fees:0,funding:0}; }
function kovLoad(){ let s=null; try{ s=JSON.parse(localStorage.getItem(KOV_KEY)||"null"); }catch(e){} if(!s) s=kovNew(); s.cfg=Object.assign({},KOV_DEF,s.cfg||{}); return s; }
function kovSave(s){ try{ localStorage.setItem(KOV_KEY,JSON.stringify(s)); }catch(e){} }
function kovEq(s,px){ let u=0; for(const k in s.pos){ const p=s.pos[k]; const x=px&&px[k]||p.px; if(x>0) u+=p.qty*(x-p.e); } return s.bal+u; }
function kovLog(s,ev){ s.log.push(ev); if(s.log.length>400) s.log.splice(0,s.log.length-400); return ev; }
const kovHH=(a,i,n)=>{ let m=-Infinity; for(let k=Math.max(0,i-n+1);k<=i;k++) m=Math.max(m,a[k].h); return m; };
const kovLL=(a,i,n)=>{ let m=Infinity; for(let k=Math.max(0,i-n+1);k<=i;k++) m=Math.min(m,a[k].l); return m; };
// a: kapanmış günlük mumlar; i. gün kapanışında sinyal var mı (bakış ileri yok). Dönüş {rank, lv (7 gün tepesi), stop (7 gün dibi)} ya da null
function kovSignal(a,i,c){ c=c||KOV_DEF; if(i<c.look+c.win+1) return null;
  const r=j=>(kovHH(a,j,c.win)-kovLL(a,j,c.win))/a[j].c; const prev=r(i-1); let le=0; for(let j=i-c.look+1;j<=i-1;j++) if(r(j)<=prev) le++;
  const rank=le/(c.look-1); const lv=kovHH(a,i-1,c.win), stop=kovLL(a,i-1,c.win);
  return {rank,lv,stop,squeeze:rank<=c.pct,go:rank<=c.pct&&a[i].c>lv}; }
function kovExit(s,sym,px,why,now){
  const p=s.pos[sym]; const c=s.cfg; const fill=px*(1-c.slip); const fee=p.qty*fill*c.taker; const pnl=p.qty*(fill-p.e);
  s.bal+=pnl-fee; s.fees+=fee; delete s.pos[sym];
  const net=pnl-fee-p.fee-p.fund; const R=net/(p.qty*(p.e-p.stop0));
  const tr={sym,t:p.t,closeT:now,e:p.e,x:fill,why,R,r:net/(p.qty*p.e),pnl:net}; s.trades.push(tr); if(s.trades.length>1000) s.trades.shift();
  return kovLog(s,{t:now,type:"exit",sym,why,px:fill,pnl:net,R});
}
// gün içi: felaket stopu (stop uzaklığının cat katı). bar = bugünün mumu (şimdiye kadar)
function kovIntraday(s,sym,bar,now){ const p=s.pos[sym]; if(!p) return []; p.px=bar.c;
  if(bar.l<=p.cat) return [kovExit(s,sym,Math.min(bar.o,p.cat),"felaket",now)]; return []; }
// gün kapanışı (a = kapanmış mumlar, son eleman dün): kapanış stopu ya da 10 gün dibi → bugünün fiyatından çık; sinyal → bugünün fiyatından gir
function kovClose(s,sym,a,px,now){
  const c=s.cfg; const evs=[]; const i=a.length-1; if(i<1||!(px>0)) return evs; const p=s.pos[sym]; s.peak=Math.max(s.peak||s.start,kovEq(s,null));
  if(p){ if(a[i].t<p.day) return evs; // giriş gününden önceki mum
    if(a[i].c<p.stop0) evs.push(kovExit(s,sym,px,"kapanış stopu",now));
    else if(a[i].c<kovLL(a,i-1,c.trailN)) evs.push(kovExit(s,sym,px,"10 gün dibi",now));
    else p.trail=kovLL(a,i,c.trailN);
    return evs; }
  const sg=kovSignal(a,i,c); if(!sg||!sg.go) return evs;
  const e=px*(1+c.slip); const stop=sg.stop; if(!(e-stop>e*c.minRisk)) return evs;
  const eq=kovEq(s,null); let qty=eq*c.risk/(e-stop); qty=Math.min(qty,eq*c.maxNotional/e); const fee=qty*e*c.taker;
  s.bal-=fee; s.fees+=fee; s.pos[sym]={e,qty,t:now,day:a[i].t+DAY_MS,px,stop0:stop,cat:e-c.cat*(e-stop),trail:kovLL(a,i,c.trailN),fee,fund:0,rank:sg.rank};
  evs.push(kovLog(s,{t:now,type:"fill",sym,px:e,usd:qty*e,fee,stop,cat:e-c.cat*(e-stop),rank:sg.rank}));
  return evs;
}
function kovFund(s,px,now,fr){ const F=8*3600e3; const slot=Math.floor(now/F)*F; if(!s.fundT) s.fundT=slot;
  while(s.fundT<slot){ s.fundT+=F; for(const k in s.pos){ const p=s.pos[k]; const r=fr&&isFinite(fr[k])?fr[k]:s.cfg.fundDef; const cst=p.qty*(px&&px[k]||p.px)*r; s.bal-=cst; s.funding+=cst; p.fund+=cst; } } }
// canlı tur: UTC gün değiştiyse dünün kapanmış mumuyla kovClose (giriş/çıkış bugünün fiyatından ≈ açılış), sonra canlı mumla felaket stopu
async function kovTick(s,now){
  now=now||Date.now(); const c=s.cfg; const C=await trendData(now,c.syms,false); const evs=[];
  kovFund(s,C.px,now,C.fr); const day=new Date(now).toISOString().slice(0,10);
  if(c.on&&s.day!==day){ for(const sym of c.syms){ const a=C.data[sym], x=C.px[sym]; if(a&&a.length) evs.push(...kovClose(s,sym,a,x,now)); } s.day=day; }
  if(c.on) for(const sym of c.syms){ const l=C.live[sym]; if(l) evs.push(...kovIntraday(s,sym,l,now)); }
  for(const k in s.pos) if(C.px[k]>0) s.pos[k].px=C.px[k];
  const eq=kovEq(s,C.px); s.peak=Math.max(s.peak||s.start,eq);
  // sıkışma durumu (ekran için): her coinde dünün mumunda aralığın 60 gün içindeki yeri
  const sq={}; for(const sym of c.syms){ const a=C.data[sym]; if(a&&a.length) { const g=kovSignal(a,a.length-1,c); if(g) sq[sym]={rank:g.rank,lv:g.lv,stop:g.stop}; } } s.sq=sq;
  return {eq,evs,px:C.px};
}
function kovSummary(s,px){ const eq=kovEq(s,px); const tr=s.trades; const w=tr.filter(t=>t.R>0).length; const gross=Object.entries(s.pos).reduce((a,[k,p])=>a+p.qty*((px&&px[k])||p.px),0);
  return {eq,roi:(eq/s.start-1)*100,dd:s.peak>0?Math.max(0,1-eq/s.peak):0,n:tr.length,wr:tr.length?w/tr.length:null,avgR:tr.length?tr.reduce((a,t)=>a+t.R,0)/tr.length:null,open:Object.keys(s.pos).length,gross,margin:gross/(s.cfg.exLev||20),fees:s.fees,funding:s.funding}; }
