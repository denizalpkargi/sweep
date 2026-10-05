// Kurulum 3 parametre taraması (şeffaf): stop tabanı kuralları ve zaman dilimi. İki yarı ve yön ayrı yazılır; tek sayıya bakıp seçmek yerine her yerde tutan ayar aranır.
const fs=require('fs'); const path=require('path');
const {loadEngine}=require('./engine-node.js'); const {loadData,runCoin,stats,printTable}=require('./bt-lib.js');
const E=loadEngine(); const {K,regimeSweep,RS_CFG}=E;
const data=loadData(); const btcD=data.find(d=>d.sym==='BTCUSDT'); const BTC15=K(btcD.k15), BTC1H=K(btcD.k1h); const empty={oi:new Map(),tk:new Map()};
const results={};
const variants=[
  {tf:"15m",minStop:0,floorStop:0,stopAtr:0.8,label:"taban yok (ilk hali)"},
  {tf:"15m",minStop:0.01,floorStop:0,stopAtr:0.8,label:"filtre: stop≥%1"},
  {tf:"15m",minStop:0.015,floorStop:0,stopAtr:0.8,label:"filtre: stop≥%1,5"},
  {tf:"15m",minStop:0,floorStop:0.01,stopAtr:0.8,label:"taban: stop %1'e genişlet"},
  {tf:"15m",minStop:0,floorStop:0.015,stopAtr:0.8,label:"taban: stop %1,5'e genişlet"},
  {tf:"15m",minStop:0.01,floorStop:0,stopAtr:1.5,label:"filtre %1 + 1,5 ATR"},
  {tf:"1h",minStop:0,floorStop:0,stopAtr:0.8,label:"1 saat · taban yok"},
  {tf:"1h",minStop:0.015,floorStop:0,stopAtr:0.8,label:"1 saat · filtre stop≥%1,5"},
  {tf:"1h",minStop:0,floorStop:0.015,stopAtr:0.8,label:"1 saat · taban %1,5"},
];
for(const v of variants){
  const btc = v.tf==="15m"?BTC15:BTC1H; RS_CFG.n4h = v.tf==="15m"?16:4; RS_CFG.n24h = v.tf==="15m"?96:24;
  RS_CFG.minStop=v.minStop; RS_CFG.floorStop=v.floorStop; RS_CFG.stopAtr=v.stopAtr; RS_CFG.maxStopAtr=Math.max(3,v.stopAtr+2);
  const name=`K3 ${v.tf} ${v.label}`; results[name]=[];
  const S={[name]:{key:r=>r.sw, det:(k,k1d,med,dir,bias,i)=>regimeSweep(k,k1d,med,dir,empty,bias,btc,i), ok:r=>r.rsOk&&(r.stage==="waitEntry"||r.stage==="entry"), plan:(r,dir)=>({dir,entry:r.entry,stop:r.stop,tp1:r.tp1,tgt:r.run,part:0.5,be:true}), wait:RS_CFG.maxWait, hold:RS_CFG.maxHold}};
  for(const d of data){ runCoin(E,d.sym,K(v.tf==="15m"?d.k15:d.k1h),K(d.k1d),S,results,{start:v.tf==="15m"?200:150}); }
  process.stdout.write('✓ ');
}
console.log();
const summary={}; for(const s in results) summary[s]=stats(results[s]);
printTable(summary);
fs.writeFileSync(path.join(__dirname,'backtest-k3-sweep.json'),JSON.stringify({at:new Date().toISOString(),variants,summary,trades:results},null,1));
