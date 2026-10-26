#!/usr/bin/env node
// SWEEP · ekransız kâğıt bot. Tarayıcı/Electron penceresi olmadan aynı motoru ve Masa (komite) modunu 7/24 çalıştırır.
// Kullanım: node headless/run.js [--dir bot-data] [--min-vol 10000000] [--every 300000] [--votes deep|all|go|none] [--once]
// Trend sepeti (src/trend.js) aynı süreçte, ayrı sanal bakiyeyle çalışır: logs/trend-*.jsonl, status.json → trend; Geri çekilme sepeti (src/dip.js) de aynı şekilde: logs/dip-*.jsonl, status.json → dip, config.json → dip; Kaplumbağa sepeti (src/turtle.js): logs/turtle-*.jsonl, status.json → turtle, config.json → turtle; Ichimoku sepeti (src/ichi.js): logs/ichi-*.jsonl, status.json → ichi, config.json → ichi; Sıkışma sepeti (src/kovner.js): logs/kov-*.jsonl, status.json → kov, config.json → kov.
// Trend ayarları config.json → trend (ör. {"trend":{"on":false}} ya da {"trend":{"tv":0.4,"cap":2}}).
// Lider araştırması: research/rapor-YYYY-MM-DD.md (saatte bir), research/lab-rules.json; Selim'in LLM'i config.json → llm ({"provider":"ollama","model":"qwen3:8b"}) ya da LLM_PROVIDER/LLM_URL/LLM_MODEL, Claude için ANTHROPIC_API_KEY.
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
  // masa kuralları config.json → masa (ör. {"masa":{"lf":false,"btc200":true}}: kayıp süzgecini kapat, BTC 200 kapısını aç); varsayılan COM_DEF
  if(cfg&&cfg.masa&&typeof cfg.masa==='object') Object.assign(E.COM_DEF,cfg.masa);
  const timers=[]; let ws=null, wsKey=null, stopping=false;
  // yapay zekâ masası (src/llmdesk.js, istemci src/llm.js): model/uç config.json → llm (Selim ile ortak), masa bütçesi config.json → desk_ai; görüşler logs/llm-*.jsonl, özet status.json → desk_ai
  if(cfg&&cfg.desk_ai) E.lmdSetCfg(cfg.desk_ai);
  E.lmd.onView=v=>{ write('llm',{t:v.t,kind:v.kind,sym:v.sym,dir:v.dir,model:v.model,ms:v.ms,tokIn:v.tokIn,tokOut:v.tokOut,dec:v.dec,members:v.members,talk:v.talk,rule:v.rule});
    if(!o.quiet) console.log(`${new Date(v.t).toISOString().slice(11,19)} llm    ${v.sym.padEnd(12)} ${v.kind} ${v.dir} → ${v.dec.act} (oy ${v.dec.v.toFixed(2)}, ${Math.round(v.ms/1000)} sn) · ${v.dec.why}`); };
  const B=createBot(E,{dir,write,cfg,votes:o.votes,say:o.quiet?()=>{}:(s=>console.log(s)),onPositions:()=>wsSync()});
  const {bot,rt,log}=B;
  const freshPx=async sym=>{ const t=await E.j(`/fapi/v1/ticker/price?symbol=${sym}`); return +t.price; };

  /* --- gölge kural masası (src/shadow.js, ui.js shRun ile aynı): kapıyı geçen kararlar ve işlemler, 15 dk / 1 sa / 4 sa sonra; işlem açmaz.
     Vadesi gelen kayıt varsa tüm coin fiyatı tek istekle (ağırlık 2, en çok dakikada bir); biten kayıtlar logs/shadow-*.jsonl */
  let shPx={}, shPxT=0;
  async function shadowRun(){ try{ const now=Date.now(), S=E.shLoad(); const fresh=!!(lastScan&&now-lastScan.t<10*60e3);
      const due=S.pend.some(p=>E.SH_DEF.hz.some(h=>p.r[h]===undefined&&now>=p.t+h*6e4));
      if(!due&&!fresh) return;
      if(now-shPxT>50e3){ try{ const a=await E.j('/fapi/v1/ticker/price'); if(Array.isArray(a)){ shPx={}; for(const x of a) shPx[x.symbol]=+x.price; shPxT=now; } }catch(e){} }
      const r=E.shTick(fresh?E.scan.rows:[],s=>B.rt.mark[s]||(now-shPxT<120e3?shPx[s]:0)||NaN,now,B.thr(),B.minYes());
      for(const p of r.fin) write('shadow',p); }catch(e){ log('skip','',`Gölge masa hatası: ${e.message}`); } }

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
      await shadowRun();
      E.lmdScanAsk(out);
      await ksScanRun(out);
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
  function status(){ const s={t:Date.now(),pid:process.pid,startT:bot.startT,bal:bot.bal,equity:B.equity(),roi:(B.equity()/bot.start-1)*100,positions:bot.positions.map(p=>({sym:p.sym,dir:p.dir,entry:p.entry,stop:p.stop,t1:p.t1,t2:p.t2,stage:p.stage,px:rt.px[p.sym]||null,openT:p.openT})),trades:bot.trades.length,day:bot.day,lastScan,priceSrc:rt.src,desk_ai:(()=>{ const C=E.lmdCfg(), L=E.lmd; return {on:C.on,model:E.llm.cfg.model,ready:E.lmdReady()||'hazır',calls:L.stats.n,ok:L.stats.ok,bad:L.stats.bad,avgSec:L.stats.ok?Math.round(L.stats.ms/L.stats.ok/1000):null,err:L.err,queue:L.q.length}; })(),lastTick:bot.lastTick,weight:E.rest.used,goal:(()=>{ const g=B.goal(); return {goal:g.goal,eq:g.eq,peak:g.peak,dd:g.dd,prog:g.prog,mode:g.mode,why:g.why,hit:bot.goalHit||null}; })(),trend:(()=>{ const m=E.trendSummary(TR.s,null); return {on:TR.s.cfg.on,tv:TR.s.cfg.tv,tvNow:m.tvNow,goal:m.goal,goalHit:m.goalHit,eq:m.eq,roi:m.roi,dd:m.dd,lev:m.lev,day:m.day,btcOk:m.btcOk,fees:m.fees,funding:m.funding,pos:Object.fromEntries(Object.entries(TR.s.pos).map(([k,p])=>[k,{qty:p.qty,avg:p.avg,px:p.px}]))}; })(),dip:(()=>{ const m=E.dipSummary(DP.s,null); return {on:DP.s.cfg.on,lev:DP.s.cfg.lev,eq:m.eq,roi:m.roi,dd:m.dd,n:m.n,wr:m.wr,avg:m.avg,open:m.open,orders:m.orders,pos:DP.s.pos,ord:DP.s.ord}; })(),turtle:(()=>{ const m=E.ttSummary(TT.s,null); return {on:TT.s.cfg.on,eq:m.eq,roi:m.roi,dd:m.dd,n:m.n,wr:m.wr,avgR:m.avgR,open:m.open,lev:m.lev,btc:m.btc,univ:m.univ,day:TT.s.day,pos:Object.fromEntries(Object.entries(TT.s.pos).map(([k,p])=>[k,{e:p.e,qty:p.qty,stop:p.stop,cat:p.cat,px:p.px,age:p.age}]))}; })(),ichi:(()=>{ const m=E.icSummary(IC.s,null); return {on:IC.s.cfg.on,eq:m.eq,roi:m.roi,dd:m.dd,n:m.n,wr:m.wr,avgR:m.avgR,open:m.open,lev:m.lev,univ:m.univ,bar:IC.s.bar,pos:Object.fromEntries(Object.entries(IC.s.pos).map(([k,p])=>[k,{dir:p.dir,e:p.e,qty:p.qty,stop:p.stop,tp:p.tp,px:p.px,age:p.age}]))}; })(),kov:(()=>{ const m=E.kovSummary(KV.s,null); return {on:KV.s.cfg.on,eq:m.eq,roi:m.roi,dd:m.dd,n:m.n,wr:m.wr,avgR:m.avgR,open:m.open,pos:KV.s.pos,sq:KV.s.sq||null}; })(),leaders:{at:E.ld.at,n:E.ld.list.length,err:E.ld.err},research:(()=>{ const L=E.lab, S=E.sel; const lr=S.runs[S.runs.length-1]||null; return {trades:L.trades.length,base:L.base?{leaders:L.base.leaders,featured:L.base.featured,long:L.base.long.mean,short:L.base.short.mean}:null,cands:L.cands.map(c=>({name:c.name,dir:c.dir,n:c.n,mean:c.mean,lift:c.lift,status:c.status})),avoid:L.avoid.map(c=>({name:c.name,dir:c.dir,n:c.n,lift:c.lift})),shadows:L.shadows.length,llm:{provider:E.llm.cfg.provider,model:E.llm.cfg.provider==='claude'?E.llm.cfg.claudeModel:E.llm.cfg.model,ready:E.llmReady()},selim:{at:S.at,err:S.err,last:lr,summary:S.summary,hyps:S.hyps.map(h=>({name:h.ad||h.name,dir:h.dir,conds:h.conds,status:h.status,avoid:!!h.avoid,n:h.n,lift:h.lift}))},positions:bot.positions.map(p=>{ const w=E.ldPosView(p.sym,p.dir); return {sym:p.sym,dir:p.dir,leaders:w.txt}; })}; })(),shadow:(()=>{ try{ return E.shSum(); }catch(e){ return null; } })(),forecast:(()=>{ const F=E.getFC()||E.fcLoad(); const L=F.learn; return {pend:F.pend.length,n:L?L.n:0,base:L?L.base:null,go:L?L.go:null,buckets:L?L.buckets:[],agents:L?L.agents:{},lessons:L?L.lessons:[]}; })(),audit:(()=>{ const A=E.getAud(); return A&&A.summary?{n:A.summary.n,wr:A.summary.wr,avgR:A.summary.avg,lessons:A.lessons.map(l=>({k:l.k,n:l.n,avg:l.avg,lever:l.lever})),mult:A.mult,decs:A.decs,off:A.off}:null; })()};
    try{ const m=E.ksSummary(KS.s,KS.px); s.ks={on:KS.s.cfg.on,eq:m.eq,roi:m.roi,dd:m.dd,n:m.n,wr:m.wr,avgR:m.avgR,open:m.open,thr:m.thr,last:KS.s.last,preds:KS.s.preds.length,pos:KS.s.pos}; }catch(e){}
    try{ const m=E.ulSummary(UL.s,UL.px); s.ul={on:UL.s.cfg.on,eq:m.eq,roi:m.roi,dd:m.dd,n:m.n,wr:m.wr,avgPct:m.avgPct,open:m.open,cal:m.cal,next:m.next,pos:UL.s.pos}; }catch(e){}
    try{ atomicWrite(path.join(dir,'status.json'),JSON.stringify(s,null,1)); }catch(e){} return s; }

  /* --- trend sepeti (src/trend.js): Masa'dan ayrı sanal bakiye, depo st-trend (store.json), olaylar logs/trend-*.jsonl --- */
  const TR={s:E.trendLoad(),busy:false,last:null}; if(cfg&&cfg.trend) Object.assign(TR.s.cfg,cfg.trend);
  async function trendRun(){ if(TR.busy||!TR.s.cfg.on) return; TR.busy=true;
    try{ const r=await E.trendTick(TR.s,Date.now()); TR.last={t:Date.now(),eq:r.eq}; E.trendSave(TR.s);
      for(const ev of r.evs){ write('trend',ev); if(!o.quiet) console.log(`${new Date(ev.t).toISOString().slice(11,19)} trend  ${ev.side} ${ev.sym} ${ev.usd.toFixed(2)} $ @ ${ev.px} · ${ev.why}`); }
      if(r.evs.length||!TR.s.log.length) write('trend',{t:Date.now(),type:'mark',eq:r.eq,sig:TR.s.lastSig}); }
    catch(e){ write('trend',{t:Date.now(),type:'error',text:String(e.message||e)}); }
    finally{ TR.busy=false; } }
  /* --- geri çekilme sepeti (src/dip.js): depo st-dip, olaylar logs/dip-*.jsonl, ayar config.json → dip --- */
  const DP={s:E.dipLoad(),busy:false}; if(cfg&&cfg.dip) Object.assign(DP.s.cfg,cfg.dip);
  async function dipRun(){ if(DP.busy||!DP.s.cfg.on) return; DP.busy=true;
    try{ const r=await E.dipTick(DP.s,Date.now()); E.dipSave(DP.s);
      for(const ev of r.evs){ write('dip',ev); if(!o.quiet&&ev.type!=='order') console.log(`${new Date(ev.t).toISOString().slice(11,19)} dip    ${ev.type} ${ev.sym} @ ${ev.px}${ev.why?' · '+ev.why:''}`); } }
    catch(e){ write('dip',{t:Date.now(),type:'error',text:String(e.message||e)}); }
    finally{ DP.busy=false; } }
  /* --- Kaplumbağa sepeti (src/turtle.js): depo st-turtle, olaylar logs/turtle-*.jsonl, ayar config.json → turtle --- */
  const TT={s:E.ttLoad(),busy:false}; if(cfg&&cfg.turtle) Object.assign(TT.s.cfg,cfg.turtle);
  async function turtleRun(){ if(TT.busy||!TT.s.cfg.on) return; TT.busy=true;
    try{ const r=await E.ttTick(TT.s,Date.now()); E.ttSave(TT.s);
      for(const ev of r.evs){ write('turtle',ev); if(!o.quiet) console.log(`${new Date(ev.t).toISOString().slice(11,19)} kaplumbağa ${ev.type} ${ev.sym} @ ${ev.px}${ev.why?' · '+ev.why:''}`); } }
    catch(e){ write('turtle',{t:Date.now(),type:'error',text:String(e.message||e)}); }
    finally{ TT.busy=false; } }
  /* --- Ichimoku sepeti (src/ichi.js, test #65): depo st-ichi, olaylar logs/ichi-*.jsonl, ayar config.json → ichi; fiyat turu dakikada bir --- */
  const IC={s:E.icLoad(),busy:false}; if(cfg&&cfg.ichi) Object.assign(IC.s.cfg,cfg.ichi);
  async function ichiRun(){ if(IC.busy||!IC.s.cfg.on) return; IC.busy=true;
    try{ const r=await E.icTick(IC.s,Date.now()); E.icSave(IC.s);
      for(const ev of r.evs){ write('ichi',ev); if(!o.quiet) console.log(`${new Date(ev.t).toISOString().slice(11,19)} ichi   ${ev.type} ${ev.dir>0?'L':'S'} ${ev.sym} @ ${ev.px}${ev.why?' · '+ev.why:''}`); } }
    catch(e){ write('ichi',{t:Date.now(),type:'error',text:String(e.message||e)}); }
    finally{ IC.busy=false; } }
  /* --- sıkışma sepeti (src/kovner.js): depo st-kov, olaylar logs/kov-*.jsonl, ayar config.json → kov --- */
  const KV={s:E.kovLoad(),busy:false}; if(cfg&&cfg.kov) Object.assign(KV.s.cfg,cfg.kov);
  async function kovRun(){ if(KV.busy||!KV.s.cfg.on) return; KV.busy=true;
    try{ const r=await E.kovTick(KV.s,Date.now()); E.kovSave(KV.s);
      for(const ev of r.evs){ write('kov',ev); if(!o.quiet) console.log(`${new Date(ev.t).toISOString().slice(11,19)} kov    ${ev.type} ${ev.sym} @ ${ev.px}${ev.why?' · '+ev.why:''}`); } }
    catch(e){ write('kov',{t:Date.now(),type:'error',text:String(e.message||e)}); }
    finally{ KV.busy=false; } }
  /* --- kalite short sepeti (src/kshort.js, test #52): depo st-ks, olaylar logs/ks-*.jsonl, ayar config.json → ks; karar tarama sonrası, fiyat turu dakikada bir --- */
  const KS={s:E.ksLoad(),busy:false,scanBusy:false,px:{}}; if(cfg&&cfg.ks) Object.assign(KS.s.cfg,cfg.ks);
  const ksOut=ev=>{ if(ev.type==='skip'&&ev.why==='kalite eşiğin altında') return; write('ks',ev); if(!o.quiet) console.log(`${new Date(ev.t).toISOString().slice(11,19)} ks     ${ev.type} ${ev.sym||''}${ev.px?' @ '+ev.px:''}${ev.why?' · '+ev.why:''}${ev.p!=null?' · kalite '+ev.p.toFixed(3):''}`); };
  async function ksScanRun(rows){ if(KS.scanBusy||!KS.s.cfg.on) return; KS.scanBusy=true;
    try{ const evs=await E.ksScan(KS.s,rows,Date.now()); E.ksSave(KS.s); evs.forEach(ksOut);
      for(const ev of evs) if(ev.type==='signal'){ let px=NaN; try{ px=await freshPx(ev.sym); }catch(e){} B.openKs(ev,px>0?px:ev.px); } }
    catch(e){ write('ks',{t:Date.now(),type:'error',text:String(e.message||e)}); }
    finally{ KS.scanBusy=false; } }
  async function ksRun(){ if(KS.busy) return; KS.busy=true;
    try{ const r=await E.ksTick(KS.s,Date.now()); KS.px=r.px; E.ksSave(KS.s); r.evs.forEach(ksOut); }
    catch(e){ write('ks',{t:Date.now(),type:'error',text:String(e.message||e)}); }
    finally{ KS.busy=false; } }
  /* --- açılım short sepeti (src/unlock.js, 15 Ekim 2026): depo st-ul, olaylar logs/ul-*.jsonl, ayar config.json → ul; takvim günde bir (DefiLlama), fiyat turu dakikada bir --- */
  const UL={s:E.ulLoad(),busy:false,px:{}}; if(cfg&&cfg.ul) Object.assign(UL.s.cfg,cfg.ul);
  const ulOut=ev=>{ write('ul',ev); if(!o.quiet) console.log(`${new Date(ev.t).toISOString().slice(11,19)} ul     ${ev.type} ${ev.sym||''}${ev.px?' @ '+ev.px:''}${ev.why?' · '+ev.why:''}${ev.size?' · arzın %'+(ev.size*100).toFixed(1):''}`); };
  async function ulRun(){ if(UL.busy) return; UL.busy=true;
    try{ const r=await E.ulTick(UL.s,Date.now()); UL.px=r.px; E.ulSave(UL.s); r.evs.forEach(ulOut); }
    catch(e){ write('ul',{t:Date.now(),type:'error',text:String(e.message||e)}); }
    finally{ UL.busy=false; } }
  /* --- araştırma (src/research.js, src/analyst.js, src/llm.js): LLM ayarı config.json → llm ya da ortam değişkenleri; anahtar dosyaya yazılmaz --- */
  { const lc=Object.assign({},cfg&&cfg.llm||{}); if(process.env.LLM_PROVIDER) lc.provider=process.env.LLM_PROVIDER; if(process.env.LLM_URL) lc.url=process.env.LLM_URL; if(process.env.LLM_MODEL) lc.model=process.env.LLM_MODEL;
    if(Object.keys(lc).length) Object.assign(E.llm.cfg,lc); if(process.env.ANTHROPIC_API_KEY) E.llmSetKey(process.env.ANTHROPIC_API_KEY,false);
    E.sel.posProvider=()=>bot.positions.map(p=>({sym:p.sym,dir:p.dir})); }
  let resAt=0, resRuns=0;
  function research(force){ const now=Date.now(); const nr=E.sel.runs.length; if(!force&&now-resAt<36e5&&nr===resRuns) return; resAt=now; resRuns=nr;
    try{ const rd=path.join(dir,'research'); fs.mkdirSync(rd,{recursive:true}); const day=new Date(now).toISOString().slice(0,10);
      atomicWrite(path.join(rd,`rapor-${day}.md`),E.labReport()); atomicWrite(path.join(rd,'lab-rules.json'),JSON.stringify(E.labRulesExport(),null,1)); }catch(e){} }
  function shutdown(sig){ if(stopping) return; stopping=true; for(const t of timers) clearInterval(t); if(ws){ try{ ws.onclose=null; ws.close(); }catch(e){} }
    log('sys','',`Durduruldu (${sig}). Açık pozisyonlar bot.json'da; yeniden başlatınca aradaki süre oynatılır.`); B.save(true); store.flush(); status(); }

  const c=bot.cfg; log('sys','',`Ekransız bot başladı · KOMİTE · sanal ${bot.bal.toFixed(2)} $ · risk %${c.risk*100} · en çok ${c.lev}x · aynı anda ${c.maxPos} pozisyon · eşik ${E.pts(c.threshold)}/${E.SCORE_MAX}, ${c.minYes}/${E.DESK.length} oy · zaman stopu ${c.holdH} sa · hedef ${c.goal} $ · aynı yönde en fazla ${c.maxSameDir} · yer açma ${c.freeMargin?"açık":"kapalı"}${c.aggr?" · AGRESİF (düşüş frenleri kapalı)":""} · tarama ${Math.round(o.every/60000)} dk · ${bot.positions.length} açık pozisyon`,{cfg:c,opts:o});
  await gapFill(); wsSync();
  await E.ldRefresh(false).catch(()=>{});
  await trendRun(); await dipRun(); await turtleRun(); await ichiRun(); await kovRun(); await ksRun(); await ulRun();
  await runScan();
  if(o.once){ await B.manage().catch(()=>{}); shutdown('once'); return {B,E,status:status()}; }
  timers.push(setInterval(()=>{ runScan(); },o.every));
  timers.push(setInterval(()=>{ if(!scanning) B.decide(E.scan.rows,'tick',freshPx).catch(e=>log('skip','',`Karar hatası: ${e.message}`)); },60000));
  timers.push(setInterval(()=>{ if(!scanning) shadowRun(); },60000));
  timers.push(setInterval(()=>{ B.manage().catch(()=>{}); },30000));
  timers.push(setInterval(poll,3000));
  timers.push(setInterval(()=>{ E.ldRefresh(false).catch(()=>{}); },10*60e3));
  // araştırma ekibi: Node'da CORS yok, lider geçmişi burada da toplanır (depo: st-lab); Selim (LLM) günde bir, rapor saatte bir research/ altına
  timers.push(setInterval(()=>{ E.labTick(false).then(()=>research()).catch(()=>{}); },60e3));
  timers.push(setInterval(trendRun,5*60e3)); timers.push(setInterval(dipRun,5*60e3)); timers.push(setInterval(turtleRun,5*60e3)); timers.push(setInterval(ichiRun,60e3)); timers.push(setInterval(kovRun,5*60e3)); timers.push(setInterval(ksRun,60e3)); timers.push(setInterval(ulRun,60e3));
  timers.push(setInterval(status,30000)); status();
  for(const s of ['SIGINT','SIGTERM']) process.on(s,()=>{ shutdown(s); process.exit(0); });
  return {B,E,shutdown,status};
}

module.exports={main};
if(require.main===module){
  process.on('unhandledRejection',e=>console.error('yakalanmamış hata:',e&&e.message||e));
  main(args(process.argv.slice(2))).catch(e=>{ console.error(e); process.exit(1); });
}
