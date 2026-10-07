// Masa'nın hedef odaklı yönetimini (src/goal.js) kayıtlı 15 dk mumlarla portföy düzeyinde tekrar oynatır: önce / sonra.
// Sinyaller: Kurulum 3 (regimeSweep, bakış ileri yok). Giriş: fiyat OTE'ye dokunduğunda (16 mum içinde) masanın aşama süzgeci karar verir.
// Fiyat yürüyüşü: her mumda açılış → ters uç → lehte uç → kapanış (muhafazakâr), her adımda paperStep (botla aynı çıkış kuralları).
// Masa puanı ve OI/taker/fonlama/lider verisi geçmişte yok: puan K3 notundan türetilir (A 0,55, B 0,42, kill zone +0,05), dinamik hedeflerden
// yalnızca veriyle hesaplanabilenler (hedef 1'de tamamı, başabaş) oynatılır; masa yeniden oylaması (hedef uzat/kısalt, yapısal stop, sönmüş pozisyon) oynatılmaz.
// Çalıştırma: node tests/replay-goal.js [--fresh]  (veri: tests/data/*.json, node tests/fetch-history.js)
const fs=require('fs'); const path=require('path');
const {loadEngine}=require('./engine-node.js'); const {loadData,dailyBiasAt}=require('./bt-lib.js');
const E=loadEngine(); const {K,regimeSweep,paperStep,entryStages,freePlan,deskAdjust,deskApply,deskNote,deskFill,goalTick,goalState,BOT_CFG_DEF}=E;
const STEP=9e5, DAY=864e5;

/* --- 1. sinyaller (önbellekli) --- */
const SIG=path.join(__dirname,'data','_signals-k3.json');
const data=loadData().filter(d=>d.sym&&d.k15);
const C={}; for(const d of data){ const k=K(d.k15); const ix=new Map(); k.forEach((c,i)=>ix.set(c.t,i)); C[d.sym]={k,ix}; }
let sigs;
if(fs.existsSync(SIG)&&!process.argv.includes('--fresh')) sigs=JSON.parse(fs.readFileSync(SIG,'utf8'));
else {
  sigs=[]; const BTC=C.BTCUSDT.k; const empty={oi:new Map(),tk:new Map()}; const t0=Date.now();
  for(const d of data){ const k=C[d.sym].k, k1d=K(d.k1d); const rng=k.map(c=>(c.h-c.l)/c.c).sort((a,b)=>a-b); const med=rng[Math.floor(rng.length/2)]||0.005;
    E.setPoolCache(new Map());
    for(const dir of ["long","short"]){ const seen=new Set(); let bc={i:-1,v:"flat"};
      for(let i=200;i<k.length-5;i++){ if(i-bc.i>=4) bc={i,v:dailyBiasAt(k1d,k[i-1].t,k[i-1].c)}; if(bc.v==="flat") continue;
        let r; try{ r=regimeSweep(k,k1d,med,dir,empty,bc.v,BTC,i); }catch(e){ continue; }
        if(!r.rsOk||!(r.stage==="waitEntry"||r.stage==="entry")||seen.has(r.sw)) continue; seen.add(r.sw);
        sigs.push({sym:d.sym,dir,i,t:k[i].t,entry:r.entry,stop:r.stop,tp1:r.tp1,run:r.run,grade:r.grade,kz:r.kz||null,ch24:r.ch24,atrRel:r.atrRel,btc:r.btc?{ch4:r.btc.ch4,ch24:r.btc.ch24,bias:r.btc.bias,ok:r.btc.ok,dump:r.btc.dump}:null}); } }
    E.setPoolCache(null); process.stdout.write(d.sym+' '); }
  console.log(`\n${sigs.length} sinyal, ${Math.round((Date.now()-t0)/1000)} sn`); fs.writeFileSync(SIG,JSON.stringify(sigs));
}

/* --- 2. portföy simülasyonu --- */
function run(cfgIn, from, to, opt){
  opt=opt||{}; const cfg={...BOT_CFG_DEF,...cfgIn}; const legacy=!!opt.legacy;
  const b={bal:100,start:100,peak:100,goalHit:null,positions:[],trades:[],cool:{},day:{}}; const st={opened:0,noMargin:0,noSlot:0,freed:0,freeActs:0,blocked:{},goalT:null,bust:null,maxDD:0,peak:100,decs:{}};
  const pend=sigs.filter(s=>s.t>=from&&s.t<to).sort((a,b)=>a.t-b.t); let si=0; const live=[];
  const px=sym=>{ const c=C[sym]; return c.last||NaN; };
  const eqNow=()=>b.bal+b.positions.reduce((a,p)=>a+(p.dir==="long"?px(p.sym)-p.entry:p.entry-px(p.sym))*p.qty,0);
  const closePart=(p,part,price,k,taker,t)=>{ const q=p.qty*part; if(!(q>0)) return; const pnl=(p.dir==="long"?price-p.entry:p.entry-price)*q; const fee=q*price*(taker?cfg.feeTaker:cfg.feeMaker);
    b.bal+=pnl-fee; p.realized+=pnl-fee; p.fees+=fee; p.qty-=q; p.notional=p.qty*p.entry; p.margin=p.notional/p.lev; p.exits.push(k); deskFill(p,k,price,q,t); };
  const closePos=(p,t)=>{ const r=p.realized/p.risk; const sg=p.dir==="long"?1:-1;
    b.trades.push({sym:p.sym,dir:p.dir,openT:p.openT,closeT:t,r,pnl:p.realized,risk:p.risk,fees:p.fees,exits:p.exits,decs:p.decs,xs:p.xs,r0:p.risk0,freed:p.freed,mfe:sg*((sg>0?p.hi:p.lo)-p.entry0)/p.risk0,snap:{v:{},warn:p.warn||0,score:p.score,yes:6},sig:p.sig});
    b.positions=b.positions.filter(x=>x!==p); b.cool[p.sym]=t+cfg.cooldownMin*60e3; const dk=Math.floor(t/DAY); b.day[dk]=b.day[dk]||{o:0,l:0}; if(p.realized<0) b.day[dk].l++; };
  const times=C.BTCUSDT.k.filter(c=>c.t>=from&&c.t<to).map(c=>c.t);
  for(const t of times){
    // fiyatlar: bu mumu her coin için yürüt
    for(const p of [...b.positions]){ const c=C[p.sym]; const i=c.ix.get(t); if(i==null) continue; const k=c.k[i]; const L=p.dir==="long";
      for(const x of (L?[k.o,k.l,k.h,k.c]:[k.o,k.h,k.l,k.c])){ if(!b.positions.includes(p)) break; const acts=paperStep(p,x,t+STEP-1,cfg); let fin=false;
        for(const a of acts){ if(a.k==="move") continue; closePart(p,a.part,a.price,a.k,a.taker,t+STEP-1); if(a.final){ fin=true; break; } }
        if(fin||p.qty<=1e-12) closePos(p,t+STEP-1); } }
    for(const s in C){ const i=C[s].ix.get(t); if(i!=null) C[s].last=C[s].k[i].c; }
    // hedef: özkaynak, zirve, 200 $ kilidi; dinamik hedef/stop
    const eq=eqNow(); st.peak=Math.max(st.peak,eq); st.maxDD=Math.max(st.maxDD,1-eq/st.peak);
    if(!legacy){ const g=goalTick(b,eq,cfg); if(g.lock){ for(const p of [...b.positions]){ const x=px(p.sym); deskNote(p,"goal",x,1,t+STEP); closePart(p,1,p.dir==="long"?x*(1-cfg.slip):x*(1+cfg.slip),"goal",true,t+STEP); closePos(p,t+STEP); } b.goalHit=t; if(!st.goalT) st.goalT=t; if(opt.stopAtGoal) break; }
      else { const gs=g.gs; for(const p of b.positions){ for(const a of deskAdjust(p,{cfg,px:px(p.sym),rv:null,lvl:null,gs})){ deskApply(p,a,px(p.sym),t+STEP); st.decs[a.k]=(st.decs[a.k]||0)+1; } } } }
    else if(b.bal>=200&&!st.goalT){ st.goalT=t; if(opt.stopAtGoal) break; }
    if(eq<40&&!st.bust){ st.bust=t; break; }
    // yeni sinyaller → bekleyen listesi (16 mum içinde OTE'ye dokunursa karar)
    while(si<pend.length&&pend[si].t<=t){ live.push({...pend[si],exp:pend[si].t+16*STEP}); si++; }
    for(const s of [...live]){ const c=C[s.sym]; const i=c.ix.get(t); if(t>s.exp||i==null){ if(t>s.exp) live.splice(live.indexOf(s),1); continue; } if(s.t>=t) continue;
      const k=c.k[i]; const L=s.dir==="long"; if(L?k.c<s.stop:k.c>s.stop){ live.splice(live.indexOf(s),1); continue; } if(!(L?k.l<=s.entry:k.h>=s.entry)) continue; live.splice(live.indexOf(s),1);
      // giriş kararı
      const dk=Math.floor(t/DAY); b.day[dk]=b.day[dk]||{o:0,l:0}; if(b.day[dk].o>=cfg.maxOpens||b.day[dk].l>=cfg.maxLosses) continue; if(b.cool[s.sym]&&t<b.cool[s.sym]) continue; if(b.positions.some(p=>p.sym===s.sym)) continue;
      const sd=Math.abs(s.entry-s.stop)/s.entry; const score=(s.grade==="A"?0.55:0.42)+(s.kz?0.05:0);
      const x={sym:s.sym,dir:s.dir,score,yes:6,veto:null,sd,feat:{c24:s.ch24*100,btc:s.btc,atrRel:s.atrRel},com:{agents:[{id:"liq",v:0.8},{id:"flow",v:0.5}]}};
      let riskUsd, warn=0, freed=false;
      if(legacy){ if(b.positions.length>=cfg.maxPos){ st.noSlot++; continue; } riskUsd=b.bal*cfg.risk; const m=riskUsd/sd/cfg.lev; if(m+b.positions.reduce((a,p)=>a+p.margin,0)>b.bal*0.95){ st.noMargin++; continue; } }
      else { const ctx={cfg,bal:b.bal,start:b.start,eq:eqNow(),peak:b.peak,goalHit:b.goalHit,positions:b.positions,trades:b.trades,now:t+STEP,thr:cfg.threshold,minYes:cfg.minYes,aud:null,lev:cfg.lev,px};
        let es=entryStages(x,ctx); if(!es.ok){ const f=es.stages.find(z=>z.st==="fail"); const kk=f?f.k:"uyarı"; st.blocked[kk]=(st.blocked[kk]||0)+1; continue; }
        if(es.need>0||es.slot){ const fp=freePlan(x,es,ctx); if(!fp){ if(es.slot) st.noSlot++; else st.noMargin++; continue; }
          for(const o of fp){ const p=o.p; const xp=px(p.sym); deskNote(p,o.kind,xp,o.part,t+STEP); closePart(p,o.part,p.dir==="long"?xp*(1-cfg.slip):xp*(1+cfg.slip),o.kind,true,t+STEP); if(o.part>=1||p.qty<=1e-12) closePos(p,t+STEP); st.freeActs++; }
          es=entryStages(x,{...ctx,bal:b.bal,eq:eqNow(),positions:b.positions,trades:b.trades}); if(!es.ok||es.need>0||es.slot) continue; freed=true; st.freed++; }
        riskUsd=es.riskUsd; warn=es.warn; }
      const fill=L?s.entry*(1+cfg.slip):s.entry*(1-cfg.slip); const notional=riskUsd/sd; const qty=notional/fill; const fee=notional*cfg.feeTaker; b.bal-=fee; b.day[dk].o++; st.opened++;
      const r0=Math.abs(fill-s.stop); const t2=s.run;
      b.positions.push({sym:s.sym,dir:s.dir,entry:fill,entry0:fill,stop:s.stop,stop0:s.stop,t1:L?fill+(cfg.tp1R||1.5)*r0:fill-(cfg.tp1R||1.5)*r0,t2,lev:cfg.lev,notional,margin:notional/cfg.lev,risk:riskUsd,risk0:r0,qty,qty0:qty,fees:fee,openT:t+STEP,expiresAt:t+STEP+cfg.holdH*4*STEP,stage:"open",hi:fill,lo:fill,realized:0,exits:[],score,warn,freed,sig:s});
    }
  }
  const tr=b.trades; const R=tr.map(x=>x.r); const sum=R.reduce((a,x)=>a+x,0); const eq=eqNow();
  return {tr,cfg:cfgIn,eq,bal:b.bal,trades:tr.length,wr:tr.length?tr.filter(x=>x.r>0).length/tr.length:0,avgR:tr.length?sum/tr.length:0,maxDD:st.maxDD,goalDays:st.goalT?(st.goalT-from)/DAY:null,bust:!!st.bust,st,auditDecs:E.audDecisions(tr)};
}

module.exports={run,sigs,C};
if(require.main!==module) return;
/* --- 3. karşılaştırma --- */
const T0=Math.min(...sigs.map(s=>s.t)), T1=C.BTCUSDT.k[C.BTCUSDT.k.length-1].t; const mid=T0+(T1-T0)/2;
const fmt=(v,d=2)=>isFinite(v)?v.toFixed(d):"—";
const CFGS=[
  ["Önce · risk %3 (bugünkü bot)",{risk:0.03,riskMax:0.03},{legacy:true}],
  ["Sonra · risk %3 (yeni masa)",{risk:0.03,riskMax:0.03},{}],
  ["Sonra · %3 · short uyarısı yok",{risk:0.03,riskMax:0.03,shortRule:"off"},{}],
  ["Sonra · %3 · short kapalı",{risk:0.03,riskMax:0.03,shortRule:"fail"},{}],
  ["Sonra · %3 · başabaş 1R",{risk:0.03,riskMax:0.03,beR:1},{}],
  ["Sonra · %3 · hedef 1 = 1R",{risk:0.03,riskMax:0.03,tp1R:1},{}],
  ["Sonra · %3 · hedef 1 = 0,75R",{risk:0.03,riskMax:0.03,tp1R:0.75},{}],
  ["Sonra · %3 · 0,75R'de %30 erken kâr",{risk:0.03,riskMax:0.03,preR:0.75,prePart:0.3},{}],
  ["Sonra · %3 · 1R'de %30 erken kâr",{risk:0.03,riskMax:0.03,preR:1,prePart:0.3},{}],
  ["Sonra · %3 · 0,75R %30 + başabaş 0,75R",{risk:0.03,riskMax:0.03,preR:0.75,prePart:0.3,beR:0.75},{}],
  ["Önce · risk %10 (dün geceki ayar)",{risk:0.10,riskMax:0.10},{legacy:true}],
  ["Sonra · risk %10",{risk:0.10,riskMax:0.10},{}],
  ["Sonra · güvenle %3–10 (masanın güveni)",{risk:0.03,riskMax:0.10},{}],
];
const out={span:new Date(T0).toISOString().slice(0,10)+" → "+new Date(T1).toISOString().slice(0,10),signals:sigs.length,rows:[]};
console.log(`Dönem ${out.span} · ${sigs.length} K3 sinyali · 24 coin · başlangıç 100 $, hedef 200 $, 20x`);
console.log("\nA) Tüm dönem tek koşu (hedefe ulaşınca durmadan) ve iki yarı ayrı (her biri 100 $'dan):");
console.log(['Ayar'.padEnd(36),'son $'.padStart(8),'işlem'.padStart(6),'kazanma%'.padStart(9),'ortR'.padStart(6),'maxDD%'.padStart(7),'200$ gün'.padStart(9),'teminat yok'.padStart(12),'yer açıldı'.padStart(11),'1.yarı $'.padStart(9),'2.yarı $'.padStart(9)].join(' '));
for(const [name,cfg,o] of CFGS){ const a=run(cfg,T0,T1+STEP,o), h1=run(cfg,T0,mid,o), h2=run(cfg,mid,T1+STEP,o);
  console.log([name.padEnd(36),fmt(a.eq).padStart(8),String(a.trades).padStart(6),fmt(a.wr*100,0).padStart(9),fmt(a.avgR).padStart(6),fmt(a.maxDD*100,1).padStart(7),(a.goalDays!=null?fmt(a.goalDays,0):"—").padStart(9),String(a.st.noMargin+a.st.noSlot).padStart(12),String(a.st.freed).padStart(11),fmt(h1.eq).padStart(9),fmt(h2.eq).padStart(9)].join(' '));
  out.rows.push({name,full:{eq:a.eq,trades:a.trades,wr:a.wr,avgR:a.avgR,maxDD:a.maxDD,goalDays:a.goalDays,bust:a.bust,blocked:a.st.blocked,noMargin:a.st.noMargin,noSlot:a.st.noSlot,freed:a.st.freed,freeActs:a.st.freeActs,decs:a.st.decs,audit:a.auditDecs},h1:{eq:h1.eq,trades:h1.trades,avgR:h1.avgR},h2:{eq:h2.eq,trades:h2.trades,avgR:h2.avgR}});
  if(!o.legacy) console.log('   ','engellenen aşama',JSON.stringify(a.st.blocked),'· kararlar',JSON.stringify(a.st.decs),'· Murat',JSON.stringify(Object.fromEntries(Object.entries(a.auditDecs).map(([k,v])=>[k,{n:v.n,ort:+v.avg.toFixed(2),iyi:v.good}]))));
}
console.log("\nB) Kayan başlangıç: her 7 günde bir 100 $ ile başla, 60 gün içinde 200 $'a ulaşan / 40 $'ın altına düşen:");
console.log(['Ayar'.padEnd(36),'koşu'.padStart(5),'200$%'.padStart(7),'medyan gün'.padStart(11),'batan%'.padStart(7),'60.gün medyan $'.padStart(16)].join(' '));
for(const [name,cfg,o] of CFGS){ const res=[]; for(let s=T0;s+60*DAY<=T1;s+=7*DAY) res.push(run(cfg,s,s+60*DAY,{...o,stopAtGoal:true}));
  const hit=res.filter(r=>r.goalDays!=null); const days=hit.map(r=>r.goalDays).sort((a,b)=>a-b); const ends=res.map(r=>r.goalDays!=null?200:r.eq).sort((a,b)=>a-b);
  console.log([name.padEnd(36),String(res.length).padStart(5),fmt(hit.length/res.length*100,0).padStart(7),(days.length?fmt(days[Math.floor(days.length/2)],0):"—").padStart(11),fmt(res.filter(r=>r.bust).length/res.length*100,0).padStart(7),fmt(ends[Math.floor(ends.length/2)]).padStart(16)].join(' '));
  const row=out.rows.find(r=>r.name===name); row.roll={runs:res.length,hit:hit.length,medDays:days.length?days[Math.floor(days.length/2)]:null,bust:res.filter(r=>r.bust).length,medEnd:ends[Math.floor(ends.length/2)]};
}
fs.writeFileSync(path.join(__dirname,'backtest-replay-goal.json'),JSON.stringify(out,null,1));
