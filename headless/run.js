#!/usr/bin/env node
// SWEEP · ekransız kâğıt bot. Tarayıcı/Electron penceresi olmadan aynı motoru ve Masa (komite) modunu 7/24 çalıştırır.
// Kullanım: node headless/run.js [--dir bot-data] [--min-vol 10000000] [--every 300000] [--votes deep|all|go|none] [--once]
// Çıktılar (--dir altında): bot.json (durum), status.json (nabız), store.json (motor önbellekleri, liderler),
//   logs/votes-YYYY-MM-DD.jsonl (her taramada masa oyu ve girdileri; deep: derin taranan, eşiğe 0,15 yakın ya da giriş alan coin × yön, all: hepsi), logs/events-*.jsonl (bot olayları),
//   logs/reviews-*.jsonl (açık pozisyonların 2 dakikalık masa gözden geçirmeleri), logs/trades.jsonl (kapanan her işlem: giriş anındaki özellikler + sonuç).
// Günlük sınırlar yerel güne göre sayılır; TZ verilmezse Europe/Istanbul (UI ile aynı gün).
if(!process.env.TZ) process.env.TZ='Europe/Istanbul';
const fs=require('fs'); const path=require('path');
const {loadEngine}=require('../tests/engine-node.js');
const {fileStorage,jsonl,atomicWrite}=require('./store.js');
const {createBot}=require('./bot.js');

function args(argv){ const o={dir:'bot-data',minVol:10e6,every:300000,votes:'deep',once:false,quiet:false};
  for(let i=0;i<argv.length;i++){ const a=argv[i], v=argv[i+1];
    if(a==='--dir'){ o.dir=v; i++; } else if(a==='--min-vol'){ o.minVol=+v; i++; } else if(a==='--every'){ o.every=+v; i++; }
    else if(a==='--votes'){ o.votes=v; i++; } else if(a==='--once') o.once=true; else if(a==='--quiet') o.quiet=true;
    else if(a==='-h'||a==='--help'){ console.log(fs.readFileSync(__filename,'utf8').split('\n').slice(1,8).join('\n')); process.exit(0); }
    else { console.error('bilinmeyen seçenek: '+a); process.exit(2); } }
  return o; }

// main(): testler sahte fetch/WebSocket verir; normalde Node'un kendi fetch ve WebSocket'i kullanılır
async function main(o,inj){
  inj=inj||{}; const dir=path.resolve(o.dir); fs.mkdirSync(dir,{recursive:true});
  const store=fileStorage(path.join(dir,'store.json')); const write=jsonl(path.join(dir,'logs'));
  const fetchFn=inj.fetch||((...a)=>globalThis.fetch(...a)); const WS=inj.WebSocket!==undefined?inj.WebSocket:globalThis.WebSocket;
  const E=loadEngine({localStorage:store,fetch:fetchFn});
  // risk ayarları yalnızca --dir/config.json ile değişir (yoksa UI varsayılanları: BOT_CFG_DEF)
  let cfg=null; try{ cfg=JSON.parse(fs.readFileSync(path.join(dir,'config.json'),'utf8')); }catch(e){}
  const timers=[]; let ws=null, wsKey=null, stopping=false;
  const B=createBot(E,{dir,write,cfg,votes:o.votes,say:o.quiet?()=>{}:(s=>console.log(s)),onPositions:()=>wsSync()});
  const {bot,rt,log}=B;
  const freshPx=async sym=>{ const t=await E.j(`/fapi/v1/ticker/price?symbol=${sym}`); return +t.price; };

  /* --- tarama: ui.js runScan ile aynı akış (evren → hızlı tarama 3 işçi → en iyi 24 aday derin tarama 2 işçi) --- */
  let scanning=false, lastScan=null;
  async function runScan(){
    if(scanning) return; scanning=true; const t0=Date.now(); bot.scanId=(bot.scanId||0)+1; let failed=0, deepN=0;
    try{
      const list=await E.universe(o.minVol); const out=[]; const q=[...list];
      const worker=async()=>{ while(q.length&&!stopping){ const u=q.shift(); try{ const r=await E.scanOne(u); if(r) out.push(r); }catch(e){ failed++; if(/hız sınırı/.test(e.message)){ await new Promise(r=>setTimeout(r,15000)); q.unshift(u); } } } };
      await Promise.all(Array.from({length:3},worker));
      const cand=out.filter(r=>E.DEEP_STAGES.has(r.stageL)||E.DEEP_STAGES.has(r.stageS)||r.pick||r.pickS).sort((a,b)=>b.qv-a.qv).slice(0,24);
      const q2=[...cand]; const w2=async()=>{ while(q2.length&&!stopping){ const r=q2.shift(); try{ const deep=await E.scanDeep(r); if(deep){ Object.assign(r,deep); deepN++; } }catch(e){} } };
      await Promise.all(Array.from({length:2},w2));
      E.scan.rows=out; const now=Date.now(); const prev={}; out.forEach(r=>prev[r.s]={score:r.score,t:now}); E.scan.prev=prev;
      lastScan={t:now,n:out.length,universe:list.length,failed,deep:deepN,ms:now-t0};
      write('events',{t:now,type:'scan',sym:'',text:`${out.length}/${list.length} coin tarandı, ${deepN} derin, ${failed} hata, ${Math.round((now-t0)/1000)} sn`,scan:bot.scanId,...lastScan,weight:E.rest.used});
      if(!o.quiet) console.log(`${new Date(now).toISOString().slice(11,19)} scan   ${out.length}/${list.length} coin · ${deepN} derin · ${failed} hata · ${Math.round((now-t0)/1000)} sn`);
      await B.decide(out,'scan',freshPx);
    }catch(e){ log('skip','',`Tarama hatası: ${e.message}`); }
    finally{ scanning=false; }
  }

  /* --- canlı fiyat: pozisyon sembolleri tek WebSocket'te (botWsSync ile aynı akışlar) --- */
  function wsSync(){
    if(!WS) return; const syms=B.syms(); const key=syms.join(',');
    if(wsKey===key&&ws&&ws.readyState<=1) return;
    if(ws){ try{ ws.onclose=null; ws.close(); }catch(e){} ws=null; } wsKey=key; if(!syms.length||stopping) return;
    let w; try{ w=new WS('wss://fstream.binance.com/stream?streams='+syms.map(s=>s.toLowerCase()).flatMap(s=>[`${s}@trade`,`${s}@bookTicker`,`${s}@markPrice@1s`]).join('/')); }catch(e){ return; } ws=w;
    w.onmessage=ev=>{ let m; try{ m=JSON.parse(typeof ev.data==='string'?ev.data:String(ev.data)); }catch(e){ return; } const d=m.data||m; const st=m.stream||''; const sym=(d.s||st.split('@')[0]||'').toUpperCase(); if(!sym) return;
      if(st.endsWith('@trade')){ rt.src='ws'; rt.lastTrade[sym]=Date.now(); B.onPrice(sym,+d.p,+d.T); }
      else if(st.endsWith('@bookTicker')){ const b=+d.b,a=+d.a; if(b>0&&a>0){ rt.book[sym]={b,a}; if(!rt.lastTrade[sym]||Date.now()-rt.lastTrade[sym]>3000){ rt.src='ws'; B.onPrice(sym,(b+a)/2,Date.now()); } } }
      else if(st.endsWith('@markPrice@1s')){ if(+d.p>0){ rt.mark[sym]=+d.p; rt.lastMark=Date.now(); } const T=+d.T; const f=rt.fund[sym]||{r:0,T:0}; if(f.T&&T>f.T+60e3&&Date.now()>=f.T-5000) B.funding(sym,f.r); rt.fund[sym]={r:+d.r,T}; } };
    w.onerror=()=>{};
    w.onclose=()=>{ if(wsKey===key&&!stopping) setTimeout(()=>{ if(wsKey===key){ ws=null; wsKey=null; wsSync(); } },3000); };
  }
  /* --- REST yedeği: WebSocket 6 sn sessizse 3 sn'de bir fiyat (botPoll ile aynı) --- */
  let polling=false;
  async function poll(){
    if(!bot.positions.length||polling) return; const now0=Date.now();
    if(bot.lastTick&&now0-bot.lastTick<6000&&rt.src!=='rest') return; polling=true;
    try{ const syms=new Set(B.syms()); const tick=await E.j('/fapi/v1/ticker/price'); const now=Date.now();
      for(const t of tick) if(syms.has(t.symbol)&&+t.price>0) B.onPrice(t.symbol,+t.price,now); rt.src='rest'; }
    catch(e){ if(Date.now()-(rt.pollLogAt||0)>300e3){ rt.pollLogAt=Date.now(); log('skip','',`Fiyat yedeği (REST) hata verdi: ${String(e.message||e).slice(0,120)}.`); } }
    finally{ polling=false; }
  }
  /* --- yeniden başlatma: kapalıyken geçen süreyi 1 dk mumlarla oynat (önce ters uç, sonra lehte uç: muhafazakâr) --- */
  async function gapFill(){
    for(const p of [...bot.positions]){
      let from=Math.max(p.openT,bot.lastTick||p.openT); let n=0;
      try{ for(let page=0;page<20&&bot.positions.includes(p);page++){
          const k=await E.j(`/fapi/v1/klines?symbol=${p.sym}&interval=1m&startTime=${from}&limit=1000`); if(!k.length) break;
          for(const c of k){ if(!bot.positions.includes(p)) break; const [t,o,h,l,cl]=[+c[0],+c[1],+c[2],+c[3],+c[4]]; const L=p.dir==='long';
            for(const px of (L?[o,l,h,cl]:[o,h,l,cl])) B.onPrice(p.sym,px,t+59e3); n++; }
          from=+k[k.length-1][0]+60e3; if(k.length<1000||from>Date.now()) break; }
        if(n) log('sys',p.sym,`Kapalıyken geçen ${n} dakika 1 dk mumlarla oynatıldı.`,{id:p.id,minutes:n}); }
      catch(e){ log('skip',p.sym,`Boşluk doldurulamadı: ${e.message}`,{id:p.id}); } }
  }
  function status(){ const s={t:Date.now(),pid:process.pid,startT:bot.startT,bal:bot.bal,equity:B.equity(),roi:(B.equity()/bot.start-1)*100,positions:bot.positions.map(p=>({sym:p.sym,dir:p.dir,entry:p.entry,stop:p.stop,t1:p.t1,t2:p.t2,stage:p.stage,px:rt.px[p.sym]||null,openT:p.openT})),trades:bot.trades.length,day:bot.day,lastScan,priceSrc:rt.src,lastTick:bot.lastTick,weight:E.rest.used,leaders:{at:E.ld.at,n:E.ld.list.length,err:E.ld.err},audit:(()=>{ const A=E.getAud(); return A&&A.summary?{n:A.summary.n,wr:A.summary.wr,avgR:A.summary.avg,lessons:A.lessons.map(l=>({k:l.k,n:l.n,avg:l.avg,lever:l.lever})),mult:A.mult}:null; })()};
    try{ atomicWrite(path.join(dir,'status.json'),JSON.stringify(s,null,1)); }catch(e){} return s; }

  function shutdown(sig){ if(stopping) return; stopping=true; for(const t of timers) clearInterval(t); if(ws){ try{ ws.onclose=null; ws.close(); }catch(e){} }
    log('sys','',`Durduruldu (${sig}). Açık pozisyonlar bot.json'da; yeniden başlatınca aradaki süre oynatılır.`); B.save(true); store.flush(); status(); }

  const c=bot.cfg; log('sys','',`Ekransız bot başladı · KOMİTE · sanal ${bot.bal.toFixed(2)} $ · risk %${c.risk*100} · ${c.lev}x · aynı anda ${c.maxPos} pozisyon · eşik ${c.threshold}, ${c.minYes}/8 oy · zaman stopu ${c.holdH} sa · tarama ${Math.round(o.every/60000)} dk · ${bot.positions.length} açık pozisyon`,{cfg:c,opts:o});
  await gapFill(); wsSync();
  await E.ldRefresh(false).catch(()=>{});
  await runScan();
  if(o.once){ await B.manage().catch(()=>{}); shutdown('once'); return {B,E,status:status()}; }
  timers.push(setInterval(()=>{ runScan(); },o.every));
  timers.push(setInterval(()=>{ if(!scanning) B.decide(E.scan.rows,'tick',freshPx).catch(e=>log('skip','',`Karar hatası: ${e.message}`)); },60000));
  timers.push(setInterval(()=>{ B.manage().catch(()=>{}); },30000));
  timers.push(setInterval(poll,3000));
  timers.push(setInterval(()=>{ E.ldRefresh(false).catch(()=>{}); },10*60e3));
  timers.push(setInterval(status,30000)); status();
  for(const s of ['SIGINT','SIGTERM']) process.on(s,()=>{ shutdown(s); process.exit(0); });
  return {B,E,shutdown,status};
}

module.exports={main};
if(require.main===module){
  process.on('unhandledRejection',e=>console.error('yakalanmamış hata:',e&&e.message||e));
  main(args(process.argv.slice(2))).catch(e=>{ console.error(e); process.exit(1); });
}
