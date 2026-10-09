const fs=require('fs'); const P=__dirname+'/';
// Windows'ta git core.autocrlf=true dosyaları CRLF yazar; aşağıdaki metin yamaları LF bekler. Okurken satır sonlarını LF'ye çevir.
const rd=(f,e)=>{ const s=fs.readFileSync(f,e); return typeof s==='string'?s.replace(/\r\n/g,'\n'):s; };
// Motor kaynağına (engine.js) string yamaları uygular ve strat2/strat3'ü ekler. Hem derleme hem Node testleri bunu kullanır.
function patchedEngine(){
let eng=rd(P+'engine.js','utf8');
const rep=(a,b)=>{ if(!eng.includes(a)) throw new Error('engine: not found '+a.slice(0,60)); eng=eng.replace(a,b); };
rep(`kzS:S?S.kz||null:null,consL,consS,`,`kzS:S?S.kz||null:null,consL,consS,rrL:L&&isFinite(L.rr1)?L.rr1:NaN,rrS:S&&isFinite(S.rr1)?S.rr1:NaN,`);
rep(`const state = { sym:"DUSKUSDT",`,`const state = { sym:"ENAUSDT",`);
rep(`const inZone=!!(r&&r.stage==="entry");`,`const inZone=!!(r&&(r.stageLive||r.stage)==="entry");`);

// --- dayanıklılık: hız sınırı bekletme, hafif istekler ---
rep(`async function j(path){
  let r; try{ r=await fetch(BASE+path); }catch(e){ throw new Error(path.split("?")[0]+" → bağlantı kurulamadı ("+e.message+")"); }
  if(!r.ok){ let t=""; try{ t=(await r.text()).slice(0,120); }catch(e){} throw new Error(path.split("?")[0]+" → HTTP "+r.status+(t?" · "+t:"")); }`,
`${rd(P+'wsdata.js','utf8')}
const rest={cool:0,fails:0,used:0,usedT:0};
// Binance yasağı (418) ya da hız sınırı (429) yeniden başlatmada unutulmasın: art arda açılışlar 429'u saatlik 418'e çeviriyordu (6 Ekim 2026 gecesi)
try{ const c=+(localStorage.getItem("st-rest-cool")||0); if(c>Date.now()) rest.cool=c; }catch(e){}
const restSleep=ms=>new Promise(r=>setTimeout(r,ms));
// önce WebSocket veri katmanı (src/wsdata.js): akıştan mum/fiyat, saklanan yanıtlar; yasakta son hâl
async function j(path){
  if(wsd.on){ const t=wsdTicker(path); if(t!==undefined) return t; }
  if(path.startsWith("/fapi/v1/klines")){ if(wsd.on){ const kk=await wsdKlines(path,jRest); if(kk!==undefined) return kk; } }
  else { const c=wsdRespGet(path,false); if(c!==undefined){ wsd.stat.respHit++; return c; } }
  try{ const d=await jRest(path); wsdRespPut(path,d); return d; }
  catch(e){ const c=wsdRespGet(path,true); if(c!==undefined){ wsd.stat.stale++; return c; } throw e; }
}
async function jRest(path){
  for(let g=0;g<20;g++){ const now=Date.now(); if(now<rest.cool){ if(rest.cool-now>60e3) throw new Error(path.split("?")[0]+" → Binance yasağı/hız sınırı, "+Math.round((rest.cool-now)/6e4)+" dk kaldı (akıştaki ve saklanan veri kullanılıyor)"); await restSleep(rest.cool-now); continue; }
    // dakikalık ağırlık 2400: 1800'ü geçtiyse dakika dolana kadar bekle (429'a varmadan)
    if(rest.used>=1800&&Math.floor(rest.usedT/6e4)===Math.floor(now/6e4)){ await restSleep(6e4-now%6e4+500); continue; } break; }
  let r; rest.fly=(rest.fly||0)+1; try{ r=await fetch(BASE+path); }catch(e){ throw new Error(path.split("?")[0]+" → bağlantı kurulamadı ("+e.message+")"); } finally{ rest.fly--; }
  try{ const w=+r.headers.get("x-mbx-used-weight-1m"); if(w){ rest.used=w; rest.usedT=Date.now(); } }catch(e){}
  if(r.status===429||r.status===418){ const ra=+(r.headers.get("retry-after")||0);
    // 9 Ekim 2026: yasağı getiren istek (tarama işçisinde jOr hatayı yuttuğu için) günlüğe hiç yazılmıyordu; artık her 429/418 ayrıntısıyla yazılır
    try{ console.warn("SWEEP · Binance HTTP "+r.status+" · "+path.split("?")[0]+" · bekleme "+ra+" sn · dakikalık ağırlık "+rest.used+" · aynı anda "+(rest.fly+1)+" istek · yasak önceden "+(rest.cool>Date.now()?"sürüyordu":"yoktu")); }catch(e){} rest.cool=Date.now()+Math.max(15000,ra*1000)+(r.status===418?5*6e4:0); // 418 sonrası ilk deneme 5 dk pay ile (9 Ekim 2026: sayaç bitince giden ilk istek iki kez yeni 418 aldı) try{ localStorage.setItem("st-rest-cool",String(rest.cool)); }catch(e){} throw new Error(path.split("?")[0]+" → hız sınırı (HTTP "+r.status+"), "+Math.round((rest.cool-Date.now())/1000)+" sn bekleniyor"); }
  if(!r.ok){ let t=""; try{ t=(await r.text()).slice(0,120); }catch(e){} throw new Error(path.split("?")[0]+" → HTTP "+r.status+(t?" · "+t:"")); }`);
rep("j(`/fapi/v1/depth?symbol=${s}&limit=500`),","j(`/fapi/v1/depth?symbol=${s}&limit=100`),");
rep("j(`/fapi/v1/aggTrades?symbol=${s}&limit=1000`)","j(`/fapi/v1/aggTrades?symbol=${s}&limit=300`)");


// --- kurulum 2 (kırılım + FVG) ve AMD pivot bölgesi ---
eng=eng.replace(`// backtest: every completed sequence in the history`, rd(P+'strat2.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function breakoutRetest')) throw new Error('strat2 insert failed');
rep(`  const amdGo = r => r && r.stage==="entry" && (r.grade==="A"||r.grade==="B") && r.rr1>=1.5;`,
`  A.br={long:breakoutRetest(kb,A.med15,"long",biasHTF),short:breakoutRetest(kb,A.med15,"short",biasHTF)};
  A.brStats = kb.length>=600 ? {long:breakoutStats(kb,A.med15,"long"),short:breakoutStats(kb,A.med15,"short")} : null;
  const brGo = r => r && r.stage==="entry" && (r.grade==="A"||r.grade==="B");
  A.brL=brGo(A.br.long); A.brS=brGo(A.br.short);
  const amdGo = r => r && r.stage==="entry" && (r.grade==="A"||r.grade==="B") && r.rr1>=1.5;`);
rep(`  res.mss=m;`,`  res.mss=m;
  // talep/arz bölgesi (Trading Geek modeli): süpürme ucu → geri alım mumunun ucu (tüm pivot); rafine: bacaktan önceki son karşı yönlü mum
  res.pivotZone = isL ? [best.ext, Math.max(...k.slice(best.sw,best.back+1).map(c=>c.h))] : [Math.min(...k.slice(best.sw,best.back+1).map(c=>c.l)), best.ext];
  for(let j=m-1;j>=best.sw;j--){ const c=k[j]; if(isL? c.c<c.o : c.c>c.o){ res.refZone=[c.l,c.h]; break; } }`);
rep(`kzS:S?S.kz||null:null,consL,consS,`,`kzS:S?S.kz||null:null,consL,consS,brL:A.br?{stage:A.br.long.stage,grade:A.br.long.grade,aligned:A.br.long.aligned}:null,brS:A.br?{stage:A.br.short.stage,grade:A.br.short.grade,aligned:A.br.short.aligned}:null,`);


// --- kurulum 3 (rejimli süpürme): strat3.js amdStats'ın önüne, BTC 15 dk mumları fetchSlow/scanDeep'e, sonuçlar analyze'a ---
eng=eng.replace(`// backtest: every completed sequence in the history`, rd(P+'strat3.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function regimeSweep')) throw new Error('strat3 insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, rd(P+'auditor.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function auditRun')) throw new Error('auditor insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, rd(P+'committee.js','utf8')+`
// backtest: every completed sequence in the history`);
if(!eng.includes('function committee')) throw new Error('committee insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, ()=>rd(P+'volume.js','utf8')+'\n'+rd(P+'tfcheck.js','utf8')+'\n'+rd(P+'factors.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function volMember')||!eng.includes('function tfMember')||!eng.includes('function facMember')) throw new Error('volume/tfcheck insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, ()=>rd(P+'forecast.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function fcObserve')) throw new Error('forecast insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, ()=>rd(P+'goal.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function entryStages')) throw new Error('goal insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, ()=>rd(P+'llmdesk.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function lmdMeet')) throw new Error('llmdesk insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, ()=>rd(P+'trend.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function trendTargets')) throw new Error('trend insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, ()=>rd(P+'dip.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function dipClose')) throw new Error('dip insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, ()=>rd(P+'turtle.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function ttClose')) throw new Error('turtle insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, rd(P+'account.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function acctStart')) throw new Error('account insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, rd(P+'leaders.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function ldRefresh')) throw new Error('leaders insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, rd(P+'research.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function labAnalyze')) throw new Error('research insert failed');
eng=eng.replace(`// backtest: every completed sequence in the history`, ()=>rd(P+'llm.js','utf8')+'\n'+rd(P+'analyst.js','utf8')+`\n// backtest: every completed sequence in the history`);
if(!eng.includes('function selTick')||!eng.includes('function llmChat')) throw new Error('llm/analyst insert failed');
rep(`sl={k1d:K(k1d),k4h:K(k4h),k1h:K(k1h),toppos,glob};`,`sl={k1d:K(k1d),k4h:K(k4h),k1h:K(k1h),toppos,glob,btc15:await btcKlines()};`);
rep(`async function fetchSlow(s){`,`const btcCache={t:0,k:null,d:null,dt:0};
async function btcKlines(){ if(!btcCache.d || Date.now()-btcCache.dt>36e5){ btcCache.dt=Date.now(); const rd=await opt(\`/fapi/v1/klines?symbol=BTCUSDT&interval=1d&limit=260\`, null); if(rd) btcCache.d=K(rd); } // günlük: faktör "BTC 200 günlük ortalama" (factors.js)
  if(btcCache.k && Date.now()-btcCache.t<9e5) return btcCache.k; const raw=await opt(\`/fapi/v1/klines?symbol=BTCUSDT&interval=15m&limit=1500\`, null); if(raw){ btcCache.k=K(raw); btcCache.t=Date.now(); } return btcCache.k; }
async function fetchSlow(s){`);
rep("    opt(`/fapi/v1/fundingRate?symbol=${s}&limit=9`, [])\n  ]);","    opt(`/fapi/v1/fundingRate?symbol=${s}&limit=9`, []),\n    btcKlines()\n  ]);");
rep(`k15L:k15L?K(k15L):null,oi15,taker15,toppos15};`,`k15L:k15L?K(k15L):null,oi15,taker15,toppos15,btc15};`);
rep("  const [k15L,oi15,taker15]=await Promise.all([ j(`/fapi/v1/klines?symbol=${s}&interval=15m&limit=1500`), opt(`/futures/data/openInterestHist?symbol=${s}&period=15m&limit=200`), opt(`/futures/data/takerlongshortRatio?symbol=${s}&period=15m&limit=200`) ]);",
    "  const [k15L,oi15,taker15,btc15]=await Promise.all([ j(`/fapi/v1/klines?symbol=${s}&interval=15m&limit=1500`), opt(`/futures/data/openInterestHist?symbol=${s}&period=15m&limit=200`), opt(`/futures/data/takerlongshortRatio?symbol=${s}&period=15m&limit=200`), btcKlines() ]);");
rep(`const A=analyze({...r._f,k15:kb},{...r._s,k15L:kb,oi15:oi15||null,taker15:taker15||null});`,`const A=analyze({...r._f,k15:kb},{...r._s,k15L:kb,oi15:oi15||null,taker15:taker15||null,btc15:btc15||null});`);
rep(`  A.amdL=amdGo(A.amd.long); A.amdS=amdGo(A.amd.short);`,`  A.amdL=amdGo(A.amd.long); A.amdS=amdGo(A.amd.short);
  const btc=s.btc15||null;
  A.rs = btc ? {long:regimeSweep(kb,d,A.med15,"long",maps,biasHTF,btc),short:regimeSweep(kb,d,A.med15,"short",maps,biasHTF,btc)} : null;
  A.rsStats = btc && kb.length>=600 ? memo(mk+"rs",()=>({long:regimeStats(kb,d,A.med15,"long",btc),short:regimeStats(kb,d,A.med15,"short",btc)})) : null;
  const rsGo = r => !!(r && r.rsOk && (r.stage==="entry"||r.stage==="waitEntry"));
  A.rsL=rsGo(A.rs&&A.rs.long); A.rsS=rsGo(A.rs&&A.rs.short);
  A.btcReg = btc && btc.length ? {long:btcRegimeAt(btc,btc[btc.length-1].t,"long"),short:btcRegimeAt(btc,btc[btc.length-1].t,"short")} : null;`);


// --- bot planları satırlara ---
rep(`function rowOf(A,u){`,`function planOf(r,k){ if(!r||!r.zone||!(r.grade==="A"||r.grade==="B")) return null; return {stage:r.stage,grade:r.grade,kz:r.kz||null,entry:r.entry,stop:r.stop,t1:r.t1,t2:r.t2,rr1:r.rr1,rr2:isFinite(r.rr2)?r.rr2:null,expires:(k&&r.mss!=null&&k[r.mss]?k[r.mss].t:Date.now())+17*9e5}; }
function brPlanOf(r,k){ if(!r||!r.fvg) return null; return {stage:r.stage,grade:r.grade,aligned:!!r.aligned,kz:r.kz||null,entry:r.entry,stop:r.stop,t1:r.r2,t2:r.r3,expires:(k&&k[r.bo]?k[r.bo].t:Date.now())+25*9e5}; }
function rowOf(A,u){`);
rep(`rrL:L&&isFinite(L.rr1)?L.rr1:NaN,rrS:S&&isFinite(S.rr1)?S.rr1:NaN,`,`rrL:L&&isFinite(L.rr1)?L.rr1:NaN,rrS:S&&isFinite(S.rr1)?S.rr1:NaN,planL:planOf(L,A.src.k15L),planS:planOf(S,A.src.k15L),brPlanL:brPlanOf(A.br&&A.br.long,A.src.k15L),brPlanS:brPlanOf(A.br&&A.br.short,A.src.k15L),rsL:A.rs?{stage:A.rs.long.stage,grade:A.rs.long.grade,ok:A.rs.long.rsOk}:null,rsS:A.rs?{stage:A.rs.short.stage,grade:A.rs.short.grade,ok:A.rs.short.rsOk}:null,rsPlanL:rsPlanOf(A.rs&&A.rs.long,A.src.k15L),rsPlanS:rsPlanOf(A.rs&&A.rs.short,A.src.k15L),com:{long:committee(A,"long",+u.t24.priceChangePercent,{sym:u.t24.symbol}),short:committee(A,"short",+u.t24.priceChangePercent,{sym:u.t24.symbol})},`);


// --- hız: tek seferde çek, ağır istatistikleri mumlar değişene kadar ezberle ---
rep(`  const [k1h,k4h,k1d]=await Promise.all([
    j(\`/fapi/v1/klines?symbol=\${s}&interval=1h&limit=200\`),
    j(\`/fapi/v1/klines?symbol=\${s}&interval=4h&limit=200\`),
    j(\`/fapi/v1/klines?symbol=\${s}&interval=1d&limit=150\`)
  ]);
  const [k15L,oi15,taker15,toppos15]=await Promise.all([
    opt(\`/fapi/v1/klines?symbol=\${s}&interval=15m&limit=1500\`, null),
    opt(\`/futures/data/openInterestHist?symbol=\${s}&period=15m&limit=200\`, null),
    opt(\`/futures/data/takerlongshortRatio?symbol=\${s}&period=15m&limit=200\`, null),
    opt(\`/futures/data/topLongShortPositionRatio?symbol=\${s}&period=15m&limit=200\`, null)
  ]);
  const [oi1h,taker1h,toppos,topacc,glob,fund]=await Promise.all([`,
`  const [k1h,k4h,k1d,k15L,oi15,taker15,toppos15,oi1h,taker1h,toppos,topacc,glob,fund,btc15]=await Promise.all([
    j(\`/fapi/v1/klines?symbol=\${s}&interval=1h&limit=200\`),
    j(\`/fapi/v1/klines?symbol=\${s}&interval=4h&limit=200\`),
    j(\`/fapi/v1/klines?symbol=\${s}&interval=1d&limit=150\`),
    opt(\`/fapi/v1/klines?symbol=\${s}&interval=15m&limit=1500\`, null),
    opt(\`/futures/data/openInterestHist?symbol=\${s}&period=15m&limit=200\`, null),
    opt(\`/futures/data/takerlongshortRatio?symbol=\${s}&period=15m&limit=200\`, null),
    opt(\`/futures/data/topLongShortPositionRatio?symbol=\${s}&period=15m&limit=200\`, null),`);
rep(`function analyze(f, s){`,`const statsMemo=new Map();
function memo(key,fn){ const h=statsMemo.get(key); if(h!==undefined) return h; const v=fn(); statsMemo.set(key,v); if(statsMemo.size>90){ statsMemo.delete(statsMemo.keys().next().value); } return v; }
function analyze(f, s){`);
rep(`  A.btStats = kb.length>=600 ? {long:boxTheoryStats(kb,A.med15,"long"),short:boxTheoryStats(kb,A.med15,"short")} : {};`,
`  const mk=(f.t24&&f.t24.symbol||"?")+"|"+kb.length+"|"+(kb.length?kb[kb.length-1].t:0)+"|";
  A.btStats = kb.length>=600 ? memo(mk+"bt",()=>({long:boxTheoryStats(kb,A.med15,"long"),short:boxTheoryStats(kb,A.med15,"short")})) : {};`);
rep(`  A.amdStats = kb.length>=600 ? {long:amdStats(kb,d,A.med15,"long"),short:amdStats(kb,d,A.med15,"short")} : null;`,
`  A.amdStats = kb.length>=600 ? memo(mk+"amd",()=>({long:amdStats(kb,d,A.med15,"long"),short:amdStats(kb,d,A.med15,"short")})) : null;`);
rep(`  A.brStats = kb.length>=600 ? {long:breakoutStats(kb,A.med15,"long"),short:breakoutStats(kb,A.med15,"short")} : null;`,
`  A.brStats = kb.length>=600 ? memo(mk+"br",()=>({long:breakoutStats(kb,A.med15,"long"),short:breakoutStats(kb,A.med15,"short")})) : null;`);


// --- havuz önbelleği: geriye dönük testte aynı mum için havuzlar bir kez hesaplanır ---
rep(`function poolsAt(k, k1d, med15, at){
  const tolEq=Math.max(0.001,0.25*med15); const out=[];`,`let _poolCache=null;
function poolsAt(k, k1d, med15, at){
  if(_poolCache){ const c=_poolCache.get(at); if(c) return c; }
  const out=poolsAt_(k,k1d,med15,at); if(_poolCache) _poolCache.set(at,out); return out;
}
function poolsAt_(k, k1d, med15, at){
  const tolEq=Math.max(0.001,0.25*med15); const out=[];`);
rep(`function amdStats(k, k1d, med15, dir){
  const out=`,`function amdStats(k, k1d, med15, dir){ _poolCache=new Map(); try{ return amdStats_(k,k1d,med15,dir); } finally{ _poolCache=null; } }
function amdStats_(k, k1d, med15, dir){
  const out=`);
return eng;
}

function build(){
  const eng=patchedEngine();
  const ui=rd(P+'ui.js','utf8');
  const head=rd(P+'term-head.html','utf8').replace('</head>',`<link rel="icon" type="image/png" href="data:image/png;base64,${rd(P+'icon192.b64','utf8')}">\n<link rel="apple-touch-icon" href="data:image/png;base64,${rd(P+'icon192.b64','utf8')}">\n</head>`);
  const body=rd(P+'term-body.html','utf8');
  const script=`(function(){\n"use strict";\n${eng}\n\n${ui}\n})();`;
  try{ new Function(script); }catch(e){ console.error('SYNTAX',e.message); process.exit(1); }
  const html=head+body+`<script>\n${script}\n</script>\n</body>\n</html>\n`;
  fs.writeFileSync(__dirname+'/../site/index.html',html);
  console.log('built',html.length);
}
module.exports={patchedEngine};
if(require.main===module) build();
