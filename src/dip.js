/* ---------- Geri çekilme sepeti: trend içinde düşüşte al, küçük kâr, kapanış stopu (6 Ekim 2026) ----------
   Araştırma (tests/research-highwr.js, BTC·ETH·SOL·BNB günlük, 2020-01 → 2026-09, maliyet dahil): BTC > SMA50 ve coin puanı ≥ 0,5 iken
   önceki kapanışın %2 altına bir günlük limit alım; +%3'te kâr; günlük KAPANIŞ girişin %10 altındaysa çık (gün içi fitil saymaz);
   gün içi −%25 felaket stopu; 20 günde kapanmazsa çık. 978 işlem, kazanma %83, ort. +%1,15/işlem, iki yarı +%1,53 / +%0,67;
   2022 −%1,15, 2024 +%0,37, 2025 +%0,17, 2026 +%0,03 (kenar son yıllarda inceldi). Aynı stop gün içi uygulanınca 166 stopun 115'i fitildi
   ve ortalama +%0,30'a düştü. 4 yuva, yuva başına özkaynağın ¼'ü × kaldıraç (1x varsayılan: yıllık %23, en büyük düşüş −%34).
   Trend sepetiyle aynı günlük veriyi kullanır (trendData); ayrı sanal bakiye. Gerçek emir yok. */
const DIP_DEF={on:true,bal0:100,syms:["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT"],minScore:0.5,pull:0.02,tp:0.03,stop:0.10,cat:0.25,hold:20,lev:1,exLev:20,slots:4,brakeDD:0,brakeMult:0.5,
  maker:0.0002,taker:0.0005,slip:0.0003,fundDef:0.0001};
const DIP_KEY="st-dip";
function dipNew(cfg){ cfg=Object.assign({},DIP_DEF,cfg||{}); return {cfg,bal:cfg.bal0,start:cfg.bal0,peak:cfg.bal0,pos:{},ord:{},trades:[],log:[],day:null,fundT:0,fees:0,funding:0}; }
function dipLoad(){ let s=null; try{ s=JSON.parse(localStorage.getItem(DIP_KEY)||"null"); }catch(e){} if(!s) s=dipNew(); s.cfg=Object.assign({},DIP_DEF,s.cfg||{}); return s; }
function dipSave(s){ try{ localStorage.setItem(DIP_KEY,JSON.stringify(s)); }catch(e){} }
const DAY_MS=864e5;
function dipEq(s,px){ let u=0; for(const k in s.pos){ const p=s.pos[k]; const x=px&&px[k]||p.px; if(x>0) u+=p.qty*(x-p.e); } return s.bal+u; }
function dipLog(s,ev){ s.log.push(ev); if(s.log.length>400) s.log.splice(0,s.log.length-400); return ev; }
function dipExit(s,sym,px,why,now,slip){
  const p=s.pos[sym]; const c=s.cfg; const fill=px*(1-(slip?c.slip:0)); const fee=p.qty*fill*c.taker; const pnl=p.qty*(fill-p.e);
  s.bal+=pnl-fee; s.fees+=fee; delete s.pos[sym];
  const r=(pnl-fee-p.fee-p.fund)/(p.qty*p.e); // fiyat hareketi cinsinden net getiri (giriş komisyonu ve fonlama dahil)
  const tr={sym,t:p.t,closeT:now,e:p.e,x:fill,why,days:p.age,r,pnl:pnl-fee-p.fee-p.fund}; s.trades.push(tr); if(s.trades.length>1000) s.trades.shift();
  return dipLog(s,{t:now,type:"exit",sym,why,px:fill,pnl:tr.pnl,r,days:p.age});
}
// gün içi: felaket stopu, kâr al (giriş günü değil), bekleyen limitin dolumu. bar = bugünün mumu (şimdiye kadar)
function dipIntraday(s,sym,bar,now){
  const c=s.cfg; const evs=[]; const p=s.pos[sym];
  if(p){ p.px=bar.c; p.age=Math.round((bar.t-p.day)/DAY_MS);
    if(bar.l<=p.e*(1-c.cat)) evs.push(dipExit(s,sym,Math.min(bar.o,p.e*(1-c.cat)),"felaket",now,true));
    else if(p.age>0&&bar.h>=p.e*(1+c.tp)) evs.push(dipExit(s,sym,Math.max(bar.o,p.e*(1+c.tp)),"kâr",now,false));
    return evs; }
  const o=s.ord[sym];
  if(o&&o.day===bar.t&&bar.l<=o.px){ const e=Math.min(bar.o,o.px); const eq=dipEq(s,null); const dd=s.peak>0?1-eq/s.peak:0; const k=c.brakeDD&&dd>=c.brakeDD?c.brakeMult:1; const qty=eq/c.slots*c.lev*k/e; const fee=qty*e*c.maker;
    s.bal-=fee; s.fees+=fee; s.pos[sym]={e,qty,t:now,day:bar.t,age:0,px:bar.c,fee,fund:0}; delete s.ord[sym];
    evs.push(dipLog(s,{t:now,type:"fill",sym,px:e,usd:qty*e,fee,tp:e*(1+c.tp),stop:e*(1-c.stop)})); }
  return evs;
}
// gün kapanışı: kapanış stopu, zaman stopu, yaşlandırma; sonra yarın için limit emir (data = kapanmış mumlar, bar dahil)
function dipClose(s,sym,bar,data,now){
  const c=s.cfg; const evs=[]; const p=s.pos[sym]; delete s.ord[sym]; s.peak=Math.max(s.peak||s.start,dipEq(s,null));
  if(p){ p.age=Math.round((bar.t-p.day)/DAY_MS); // bugün açılan pozisyon (yaş 0) kapanış stopuna bugün girmez
    if(p.age>0){
      if(bar.c<=p.e*(1-c.stop)) evs.push(dipExit(s,sym,bar.c,"kapanış stopu",now,true));
      else if(p.age>=c.hold) evs.push(dipExit(s,sym,bar.c,"zaman",now,true)); }
    if(s.pos[sym]) return evs; }
  const a=data[sym], b=data.BTCUSDT; if(!a||!b||a.length<101||b.length<51) return evs;
  const bm=trSma(b,b.length-1,50); if(!(b[b.length-1].c>bm)) return evs;
  const sc=trendScore(a,a.length-1,{smas:[10,20,50,100]}); if(sc==null||sc<c.minScore) return evs;
  const px=a[a.length-1].c*(1-c.pull); s.ord[sym]={px,day:a[a.length-1].t+DAY_MS,score:sc};
  evs.push(dipLog(s,{t:now,type:"order",sym,px,score:sc}));
  return evs;
}
function dipFund(s,px,now,fr){ const F=8*3600e3; const slot=Math.floor(now/F)*F; if(!s.fundT) s.fundT=slot;
  while(s.fundT<slot){ s.fundT+=F; for(const k in s.pos){ const p=s.pos[k]; const r=fr&&isFinite(fr[k])?fr[k]:s.cfg.fundDef; const cst=p.qty*(px&&px[k]||p.px)*r; s.bal-=cst; s.funding+=cst; p.fund+=cst; } } }
// canlı tur: gün değiştiyse dünün kapanmış mumuyla dipClose, sonra bugünün canlı mumuyla dipIntraday
async function dipTick(s,now){
  now=now||Date.now(); const c=s.cfg; const syms=[...new Set([...c.syms,"BTCUSDT"])]; const C=await trendData(now,syms,false); const evs=[];
  dipFund(s,C.px,now,C.fr); const day=new Date(now).toISOString().slice(0,10);
  if(c.on&&s.day!==day){ for(const sym of c.syms){ const a=C.data[sym]; if(a&&a.length) evs.push(...dipClose(s,sym,a[a.length-1],C.data,now)); } s.day=day; }
  if(c.on) for(const sym of c.syms){ const l=C.live[sym]; if(l) evs.push(...dipIntraday(s,sym,l,now)); }
  for(const k in s.pos) if(C.px[k]>0) s.pos[k].px=C.px[k];
  const eq=dipEq(s,C.px); s.peak=Math.max(s.peak||s.start,eq);
  return {eq,evs,px:C.px};
}
function dipSummary(s,px){ const eq=dipEq(s,px); const tr=s.trades; const w=tr.filter(t=>t.r>0).length; const gross=Object.entries(s.pos).reduce((a,[k,p])=>a+p.qty*((px&&px[k])||p.px),0);
  return {eq,roi:(eq/s.start-1)*100,dd:s.peak>0?Math.max(0,1-eq/s.peak):0,n:tr.length,wr:tr.length?w/tr.length:null,avg:tr.length?tr.reduce((a,t)=>a+t.r,0)/tr.length:null,open:Object.keys(s.pos).length,gross,margin:gross/(s.cfg.exLev||20),orders:Object.keys(s.ord).length,fees:s.fees,funding:s.funding}; }
