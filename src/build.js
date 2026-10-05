const fs=require('fs'); const P=__dirname+'/';
let eng=fs.readFileSync(P+'engine.js','utf8');
const rep=(a,b)=>{ if(!eng.includes(a)) throw new Error('engine: not found '+a.slice(0,60)); eng=eng.replace(a,b); };
rep(`kzS:S?S.kz||null:null,consL,consS,`,`kzS:S?S.kz||null:null,consL,consS,rrL:L&&isFinite(L.rr1)?L.rr1:NaN,rrS:S&&isFinite(S.rr1)?S.rr1:NaN,`);
rep(`const state = { sym:"DUSKUSDT",`,`const state = { sym:"ENAUSDT",`);
rep(`const inZone=!!(r&&r.stage==="entry");`,`const inZone=!!(r&&(r.stageLive||r.stage)==="entry");`);

// --- dayanıklılık: hız sınırı bekletme, hafif istekler ---
rep(`async function j(path){
  let r; try{ r=await fetch(BASE+path); }catch(e){ throw new Error(path.split("?")[0]+" → bağlantı kurulamadı ("+e.message+")"); }
  if(!r.ok){ let t=""; try{ t=(await r.text()).slice(0,120); }catch(e){} throw new Error(path.split("?")[0]+" → HTTP "+r.status+(t?" · "+t:"")); }`,
`const rest={cool:0,fails:0,used:0};
async function j(path){
  if(Date.now()<rest.cool) await new Promise(r=>setTimeout(r,rest.cool-Date.now()));
  let r; try{ r=await fetch(BASE+path); }catch(e){ throw new Error(path.split("?")[0]+" → bağlantı kurulamadı ("+e.message+")"); }
  try{ const w=+r.headers.get("x-mbx-used-weight-1m"); if(w) rest.used=w; }catch(e){}
  if(r.status===429||r.status===418){ const ra=+(r.headers.get("retry-after")||0); rest.cool=Date.now()+Math.max(15000,ra*1000); throw new Error(path.split("?")[0]+" → hız sınırı (HTTP "+r.status+"), "+Math.round((rest.cool-Date.now())/1000)+" sn bekleniyor"); }
  if(!r.ok){ let t=""; try{ t=(await r.text()).slice(0,120); }catch(e){} throw new Error(path.split("?")[0]+" → HTTP "+r.status+(t?" · "+t:"")); }`);
rep("j(`/fapi/v1/depth?symbol=${s}&limit=500`),","j(`/fapi/v1/depth?symbol=${s}&limit=100`),");
rep("j(`/fapi/v1/aggTrades?symbol=${s}&limit=1000`)","j(`/fapi/v1/aggTrades?symbol=${s}&limit=300`)");


// --- kurulum 2 (kırılım + FVG) ve AMD pivot bölgesi ---
eng=eng.replace(`// backtest: every completed sequence in the history`, fs.readFileSync(P+'strat2.js','utf8')+`\n// backtest: every completed sequence in the history`);
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


// --- bot planları satırlara ---
rep(`function rowOf(A,u){`,`function planOf(r,k){ if(!r||!r.zone||!(r.grade==="A"||r.grade==="B")) return null; return {stage:r.stage,grade:r.grade,kz:r.kz||null,entry:r.entry,stop:r.stop,t1:r.t1,t2:r.t2,rr1:r.rr1,rr2:isFinite(r.rr2)?r.rr2:null,expires:(k&&r.mss!=null&&k[r.mss]?k[r.mss].t:Date.now())+17*9e5}; }
function brPlanOf(r,k){ if(!r||!r.fvg) return null; return {stage:r.stage,grade:r.grade,aligned:!!r.aligned,kz:r.kz||null,entry:r.entry,stop:r.stop,t1:r.r2,t2:r.r3,expires:(k&&k[r.bo]?k[r.bo].t:Date.now())+25*9e5}; }
function rowOf(A,u){`);
rep(`rrL:L&&isFinite(L.rr1)?L.rr1:NaN,rrS:S&&isFinite(S.rr1)?S.rr1:NaN,`,`rrL:L&&isFinite(L.rr1)?L.rr1:NaN,rrS:S&&isFinite(S.rr1)?S.rr1:NaN,planL:planOf(L,A.src.k15L),planS:planOf(S,A.src.k15L),brPlanL:brPlanOf(A.br&&A.br.long,A.src.k15L),brPlanS:brPlanOf(A.br&&A.br.short,A.src.k15L),`);


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
`  const [k1h,k4h,k1d,k15L,oi15,taker15,toppos15,oi1h,taker1h,toppos,topacc,glob,fund]=await Promise.all([
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

const ui=fs.readFileSync(P+'ui.js','utf8');
const head=fs.readFileSync(P+'term-head.html','utf8').replace('</head>',`<link rel="icon" type="image/png" href="data:image/png;base64,${fs.readFileSync(P+'icon192.b64','utf8')}">\n<link rel="apple-touch-icon" href="data:image/png;base64,${fs.readFileSync(P+'icon192.b64','utf8')}">\n</head>`);
const body=fs.readFileSync(P+'term-body.html','utf8');
const script=`(function(){\n"use strict";\n${eng}\n\n${ui}\n})();`;
try{ new Function(script); }catch(e){ console.error('SYNTAX',e.message); process.exit(1); }
const html=head+body+`<script>\n${script}\n</script>\n</body>\n</html>\n`;
fs.writeFileSync(__dirname+'/../site/index.html',html);
console.log('built',html.length);
