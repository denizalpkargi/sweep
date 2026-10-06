/* ---------- Trend sepeti: günlük trend takibi, oynaklığa göre boy (6 Ekim 2026) ----------
   Araştırma (tests/research-daily.js, BTC·ETH·SOL·BNB günlük, 2020-01 → 2026-09, komisyon + kayma + fonlama dahil):
   coin kapanışı SMA 10/20/50/100'ün kaçının üstündeyse o oranda long, BTC SMA50 altındaysa hepsi nakit;
   ağırlık = puan × min(üst sınır, hedef oynaklık ÷ 30 günlük oynaklık) ÷ coin sayısı; günde bir yeniden dengeleme.
   Hedef oynaklık 0,8: yıllık %91, Sharpe 1,63, en büyük düşüş −%43, iki yarı +%103 / +%79, yalnız 2022 eksi (−%32).
   Short eklemek ve 15 dk girişler iyileştirmedi. 4 büyük coin hayatta kalan seçimidir; ileriye dönük beklenti daha düşük olmalı.
   Masa'dan ayrı sanal bakiye; ui.js (Bot sekmesi "Trend sepeti") ve headless/run.js aynı fonksiyonları kullanır. Gerçek emir yok. */
const TREND_DEF={on:true,bal0:100,syms:["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT"],smas:[10,20,50,100],btcSma:50,volN:30,tv:0.8,cap:4,band:0.2,minUsd:5,
  fee:0.0005,slip:0.0003,fundDef:0.0001};
const TREND_KEY="st-trend";
function trendLoad(){ let s=null; try{ s=JSON.parse(localStorage.getItem(TREND_KEY)||"null"); }catch(e){} if(!s) s=trendNew(); s.cfg=Object.assign({},TREND_DEF,s.cfg||{}); return s; }
function trendSave(s){ try{ localStorage.setItem(TREND_KEY,JSON.stringify(s)); }catch(e){} }
function trendNew(cfg){ cfg=Object.assign({},TREND_DEF,cfg||{}); return {cfg,bal:cfg.bal0,start:cfg.bal0,peak:cfg.bal0,pos:{},log:[],eqHist:[],day:null,fundT:0,lastSig:null,fees:0,funding:0,trades:0}; }
const trSma=(a,i,n)=>{ if(i<n-1) return NaN; let s=0; for(let k=i-n+1;k<=i;k++) s+=a[k].c; return s/n; };
const trVol=(a,i,n)=>{ if(i<n) return NaN; const r=[]; for(let k=i-n+1;k<=i;k++) r.push(Math.log(a[k].c/a[k-1].c)); const m=r.reduce((x,y)=>x+y,0)/n; return Math.sqrt(r.reduce((x,y)=>x+(y-m)**2,0)/(n-1))*Math.sqrt(365); };
// puan: kapanmış son günlük mumda SMA'ların üstünde kalan payı (0…1); btcOk false ise 0
function trendScore(a,i,cfg){ let k=0; for(const n of cfg.smas){ const m=trSma(a,i,n); if(!isFinite(m)) return null; if(a[i].c>m) k++; } return k/cfg.smas.length; }
// hedef ağırlıklar: data = {SYM:[{t,c},…] kapanmış günlük mumlar, zamana göre}; BTCUSDT da içinde olmalı
function trendTargets(data,cfg){
  cfg=Object.assign({},TREND_DEF,cfg||{}); const b=data.BTCUSDT||[]; const bi=b.length-1; const bm=trSma(b,bi,cfg.btcSma); const btcOk=bi>=0&&isFinite(bm)&&b[bi].c>bm;
  const act=cfg.syms.filter(s=>data[s]&&data[s].length>Math.max(...cfg.smas,cfg.volN)+1); const out={};
  for(const s of cfg.syms){ const a=data[s]; if(!act.includes(s)){ out[s]={w:0,score:null,vol:null,why:"veri yetersiz"}; continue; }
    const i=a.length-1; const sc=trendScore(a,i,cfg), v=trVol(a,i,cfg.volN); const raw=sc*Math.min(cfg.cap,cfg.tv/v)/act.length; const w=btcOk?raw:0;
    out[s]={w,score:sc,vol:v,t:a[i].t,c:a[i].c,why:!btcOk?`BTC SMA${cfg.btcSma} altında: nakit`:sc===0?"tüm ortalamaların altında: nakit":`${Math.round(sc*cfg.smas.length)}/${cfg.smas.length} ortalamanın üstünde`}; }
  return {w:out,btcOk,btc:{c:b[bi]&&b[bi].c,sma:bm},t:b[bi]&&b[bi].t};
}
function trendEq(s,px){ let u=0; for(const k in s.pos){ const p=s.pos[k]; const x=px&&px[k]||p.px; if(x>0) u+=p.qty*(x-p.avg); } return s.bal+u; }
// pozisyonu hedefe yaklaştır (fark bant içindeyse dokunma); fiyat kayması aleyhe, komisyon taker
function trendTrade(s,sym,tgtQty,px,now,why){
  const cfg=s.cfg; const p=s.pos[sym]||{qty:0,avg:0,px}; const d=tgtQty-p.qty; if(!d) return null;
  const fill=px*(1+Math.sign(d)*cfg.slip); const fee=Math.abs(d)*fill*cfg.fee; let pnl=0;
  if(p.qty&&Math.sign(d)!==Math.sign(p.qty)){ const cl=Math.min(Math.abs(d),Math.abs(p.qty))*Math.sign(p.qty); pnl=cl*(fill-p.avg); }
  const nq=p.qty+d; let avg=p.avg;
  if(!p.qty||Math.sign(d)===Math.sign(p.qty)) avg=(p.avg*p.qty+fill*d)/nq; else if(Math.sign(nq)!==Math.sign(p.qty)&&nq) avg=fill;
  s.bal+=pnl-fee; s.fees+=fee; s.trades++;
  if(Math.abs(nq)*px<1e-9) delete s.pos[sym]; else s.pos[sym]={qty:nq,avg,px,openT:p.qty?p.openT:now};
  const ev={t:now,type:"trade",sym,side:d>0?"AL":"SAT",qty:d,px:fill,usd:Math.abs(d)*fill,fee,pnl,to:nq*px,why};
  s.log.push(ev); if(s.log.length>400) s.log.splice(0,s.log.length-400); return ev;
}
// günlük dengeleme: hedef ağırlık × özkaynak; |fark| < band × hedef ve < minUsd ise işlem yok
function trendRebalance(s,tg,px,now){
  const cfg=s.cfg; const eq=trendEq(s,px); const evs=[];
  for(const sym of cfg.syms){ const x=px[sym]; if(!(x>0)) continue; const w=tg.w[sym]?tg.w[sym].w:0; const tgtUsd=w*eq; const cur=(s.pos[sym]?s.pos[sym].qty:0)*x; const diff=tgtUsd-cur;
    if(Math.abs(diff)<cfg.minUsd) continue; if(tgtUsd>0&&cur>0&&Math.abs(diff)<cfg.band*tgtUsd) continue;
    const ev=trendTrade(s,sym,tgtUsd/x,x,now,tg.w[sym]?tg.w[sym].why:""); if(ev) evs.push(ev); }
  s.lastSig={t:now,btcOk:tg.btcOk,btc:tg.btc,w:Object.fromEntries(Object.entries(tg.w).map(([k,v])=>[k,{w:+v.w.toFixed(4),score:v.score,vol:v.vol&&+v.vol.toFixed(3),why:v.why}]))};
  s.log.push({t:now,type:"signal",btcOk:tg.btcOk,w:s.lastSig.w,eq}); return evs;
}
// fiyatla işaretle; 8 saatlik fonlama sınırı geçildiyse fonlamayı uygula (long öder, oran yoksa varsayılan %0,01)
function trendMark(s,px,now,fr){
  for(const k in s.pos) if(px[k]>0) s.pos[k].px=px[k];
  const F=8*3600e3; const slot=Math.floor(now/F)*F; if(!s.fundT) s.fundT=slot;
  while(s.fundT<slot){ s.fundT+=F; for(const k in s.pos){ const p=s.pos[k]; const r=fr&&isFinite(fr[k])?fr[k]:s.cfg.fundDef; const c=p.qty*p.px*r; s.bal-=c; s.funding+=c; } }
  const eq=trendEq(s,px); s.peak=Math.max(s.peak||s.start,eq); return eq;
}
// günlük mumdan kapanmış olanları al (son mum bugünse çıkar)
function trendClosed(k,now){ const D=864e5; return k.filter(b=>b.t+D<=now); }
const trendCache={t:0,data:null};
// canlı tur: saatte bir günlük mumlar, her turda fiyat; UTC gün değişince dengeleme. force: hemen dengele
async function trendTick(s,now,opts){
  opts=opts||{}; now=now||Date.now(); const cfg=s.cfg; const syms=[...new Set([...cfg.syms,"BTCUSDT"])];
  if(!trendCache.data||now-trendCache.t>3600e3||opts.refresh){ const data={}; for(const sym of syms){ const raw=await j(`/fapi/v1/klines?symbol=${sym}&interval=1d&limit=130`); data[sym]=trendClosed(K(raw),now); } trendCache.data=data; trendCache.t=now; }
  const px={}; let fr={};
  try{ const pi=await j(`/fapi/v1/premiumIndex`); for(const r of pi) if(syms.includes(r.symbol)){ px[r.symbol]=+r.markPrice; fr[r.symbol]=+r.lastFundingRate; } }
  catch(e){ for(const sym of syms){ const a=trendCache.data[sym]; if(a&&a.length) px[sym]=a[a.length-1].c; } fr=null; }
  trendMark(s,px,now,fr); const day=new Date(now).toISOString().slice(0,10); let evs=[];
  if(cfg.on&&(s.day!==day||opts.force)){ const tg=trendTargets(trendCache.data,cfg); evs=trendRebalance(s,tg,px,now); s.day=day; }
  const eq=trendEq(s,px); if(!s.eqHist.length||now-s.eqHist[s.eqHist.length-1][0]>3600e3){ s.eqHist.push([now,+eq.toFixed(4)]); if(s.eqHist.length>2400) s.eqHist.shift(); }
  return {eq,evs,px};
}
function trendSummary(s,px){ const eq=trendEq(s,px); const gross=Object.entries(s.pos).reduce((a,[k,p])=>a+Math.abs(p.qty*((px&&px[k])||p.px)),0);
  return {eq,roi:(eq/s.start-1)*100,dd:s.peak>0?1-eq/s.peak:0,gross,lev:eq>0?gross/eq:0,fees:s.fees,funding:s.funding,trades:s.trades,day:s.day,btcOk:s.lastSig?s.lastSig.btcOk:null}; }
