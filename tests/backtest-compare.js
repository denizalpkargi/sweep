// Üç kurulumu aynı veri, aynı yön filtresi, aynı dolum/çıkış simülatörü ve aynı maliyetlerle karşılaştırır (15 dk).
// Veri: tests/data/*.json (node tests/fetch-history.js). Çıktı: konsol + tests/backtest-compare.json
// Kurallar: plan, kurulum ilk görüldüğü mumda sabitlenir (bakış ileri yok); her süpürme/kırılım için bir işlem; aynı mumda stop+hedef → stop.
// --opt: iyimser mod (aynı mumda stop+hedef → hedef) sınır testi. --A: Kurulum 3 yalnızca not A.
const fs=require('fs'); const path=require('path');
const {loadEngine}=require('./engine-node.js'); const {loadData,runCoin,stats,printTable}=require('./bt-lib.js');
const E=loadEngine(); const {K,amdDetect,breakoutRetest,regimeSweep,RS_CFG}=E;
const onlyA=process.argv.includes('--A'); if(process.argv.includes('--opt')) RS_CFG.optimistic=true;
const data=loadData(); const BTC=K(data.find(d=>d.sym==='BTCUSDT').k15); const empty={oi:new Map(),tk:new Map()};
const runnerOf=(r,dir)=>{ const isL=dir==="long"; const risk=Math.abs(r.entry-r.stop); let tgt=null; for(const p of [r.t1,r.t2]){ if(isFinite(p)&&p&&Math.abs(p-r.entry)/risk>=RS_CFG.runMinR){ tgt=p; break; } } if(tgt==null) tgt=isL?r.entry+3*risk:r.entry-3*risk; if(Math.abs(tgt-r.entry)/risk>RS_CFG.runMaxR) tgt=isL?r.entry+RS_CFG.runMaxR*risk:r.entry-RS_CFG.runMaxR*risk; return tgt; };
const amdOk=r=>r.mss!=null&&(r.stage==="waitEntry"||r.stage==="entry")&&(r.grade==="A"||r.grade==="B")&&r.rr1>=1.5;
const STRATS={
  "K1 AMD (mevcut çıkış)":{key:r=>r.sw, det:(k,k1d,med,dir,bias,i)=>amdDetect(k,k1d,med,dir,empty,bias,i), ok:amdOk, plan:(r,dir)=>({dir,entry:r.entry,stop:r.stop,tp1:null,tgt:r.t1,part:0,be:false}), wait:16, hold:48},
  "K1 AMD + K3 çıkışı":{key:r=>r.sw, det:(k,k1d,med,dir,bias,i)=>amdDetect(k,k1d,med,dir,empty,bias,i), ok:amdOk, plan:(r,dir)=>{ const isL=dir==="long"; const risk=Math.abs(r.entry-r.stop); return {dir,entry:r.entry,stop:r.stop,tp1:isL?r.entry+1.5*risk:r.entry-1.5*risk,tgt:runnerOf(r,dir),part:0.5,be:true}; }, wait:16, hold:32},
  "K2 Kırılım+FVG":{key:r=>r.bo, det:(k,k1d,med,dir,bias,i)=>breakoutRetest(k,med,dir,bias,i), ok:r=>!!r.fvg&&r.aligned&&(r.grade==="A"||r.grade==="B")&&(r.stage==="waitRetest"||r.stage==="entry"), plan:(r,dir)=>({dir,entry:r.entry,stop:r.stop,tp1:null,tgt:r.r2,part:0,be:false}), wait:24, hold:40},
  "K3 Rejimli süpürme":{key:r=>r.sw, det:(k,k1d,med,dir,bias,i)=>regimeSweep(k,k1d,med,dir,empty,bias,BTC,i), ok:r=>r.rsOk&&(r.stage==="waitEntry"||r.stage==="entry")&&(!onlyA||r.grade==="A"), plan:(r,dir)=>({dir,entry:r.entry,stop:r.stop,tp1:r.tp1,tgt:r.run,part:RS_CFG.part,be:true}), wait:RS_CFG.maxWait, hold:RS_CFG.maxHold},
};
const results={}; for(const s in STRATS) results[s]=[];
const t0=Date.now();
for(const d of data){ runCoin(E,d.sym,K(d.k15),K(d.k1d),STRATS,results); process.stdout.write(d.sym+' '); }
console.log('\n'+Math.round((Date.now()-t0)/1000)+' sn');
const summary={}; for(const s in results) summary[s]=stats(results[s]);
const all=Object.values(results).flat(); const span=all.length?new Date(Math.min(...all.map(x=>x.t))).toISOString().slice(0,10)+" → "+new Date(Math.max(...all.map(x=>x.t))).toISOString().slice(0,10):"";
console.log('Dönem:',span,'· coin:',data.length,'· 15 dk · komisyon maker %0,02 / taker %0,05 · kayma %0,03'+(RS_CFG.optimistic?' · İYİMSER mod':''));
printTable(summary);
fs.writeFileSync(path.join(__dirname,'backtest-compare.json'),JSON.stringify({span,coins:data.length,at:new Date().toISOString(),optimistic:RS_CFG.optimistic,summary,trades:results},null,1));
