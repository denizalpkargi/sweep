// Keşif testleri: rastgele giriş kıyası (maliyet tabanı), 1 saatlik süpürme modeli, günlük trend takibi. Parametreler önceden sabit; iki yarı ayrı raporlanır.
const fs=require('fs'); const path=require('path');
const {loadEngine}=require('./engine-node.js'); const {loadData,runCoin,stats,printTable,dailyBiasAt}=require('./bt-lib.js');
const E=loadEngine(); const {K,amdDetect,regimeSweep,simTrade,atrAt,RS_CFG}=E;
const data=loadData(); const btcD=data.find(d=>d.sym==='BTCUSDT'); const BTC15=K(btcD.k15), BTC1H=K(btcD.k1h); const empty={oi:new Map(),tk:new Map()};
// deterministik sözde rastgele
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
const results={}; const add=n=>{ results[n]=results[n]||[]; };
const t0=Date.now();
/* ---- E0: rastgele giriş, aynı maliyet (15 dk, stop %1, hedef 1,5R) — "kenarsız" taban ---- */
add("E0 rastgele 15dk stop%1 1,5R"); add("E0 rastgele 15dk + K3 çıkışı");
for(const d of data){ const k=K(d.k15), k1d=K(d.k1d); const R=rng(7); for(let i=200;i<k.length-60;i+=12){ if(R()>0.25) continue; const dir=R()<0.5?"long":"short"; const isL=dir==="long"; const entry=k[i-1].c; const sd=0.01; const stop=isL?entry*(1-sd):entry*(1+sd); const risk=sd*entry;
  const s1=simTrade(k,{dir,entry,stop,tp1:null,tgt:isL?entry+1.5*risk:entry-1.5*risk,part:0,be:false},i,1,48); if(s1&&s1.res!=="nofill"&&s1.res!=="open") results["E0 rastgele 15dk stop%1 1,5R"].push({sym:d.sym,dir,grade:"-",kz:null,t:k[s1.fill].t,r:+s1.r.toFixed(3),how:s1.how,sd:1,hold:s1.end-s1.fill});
  const s2=simTrade(k,{dir,entry,stop,tp1:isL?entry+1.5*risk:entry-1.5*risk,tgt:isL?entry+3*risk:entry-3*risk,part:0.5,be:true},i,1,32); if(s2&&s2.res!=="nofill"&&s2.res!=="open") results["E0 rastgele 15dk + K3 çıkışı"].push({sym:d.sym,dir,grade:"-",kz:null,t:k[s2.fill].t,r:+s2.r.toFixed(3),how:s2.how,sd:1,hold:s2.end-s2.fill}); } }
/* ---- E1: 1 saatlik mumlarda süpürme modeli (K1 ve K3), BTC rejimi 1 saatlik ofsetlerle ---- */
const amdOk=r=>r.mss!=null&&(r.stage==="waitEntry"||r.stage==="entry")&&(r.grade==="A"||r.grade==="B")&&r.rr1>=1.5;
const S1H={
  "E1 K1 AMD 1 saat":{key:r=>r.sw, det:(k,k1d,med,dir,bias,i)=>amdDetect(k,k1d,med,dir,empty,bias,i), ok:amdOk, plan:(r,dir)=>({dir,entry:r.entry,stop:r.stop,tp1:null,tgt:r.t1,part:0,be:false}), wait:16, hold:48},
  "E1 K3 rejimli 1 saat":{key:r=>r.sw, det:(k,k1d,med,dir,bias,i)=>regimeSweep(k,k1d,med,dir,empty,bias,BTC1H,i), ok:r=>r.rsOk&&(r.stage==="waitEntry"||r.stage==="entry"), plan:(r,dir)=>({dir,entry:r.entry,stop:r.stop,tp1:r.tp1,tgt:r.run,part:0.5,be:true}), wait:RS_CFG.maxWait, hold:RS_CFG.maxHold},
};
for(const n in S1H) add(n);
RS_CFG.n4h=4; RS_CFG.n24h=24;
for(const d of data){ runCoin(E,d.sym,K(d.k1h),K(d.k1d),S1H,results,{start:150}); }
RS_CFG.n4h=16; RS_CFG.n24h=96;
/* ---- E2: günlük trend takibi (Donchian 20 kırılımı + SMA50 yönü + 2 ATR iz süren stop), 13 ay ---- */
add("E2 günlük trend takibi"); add("E2 günlük trend + BTC filtresi");
function trendFollow(k, name, btcFilter){
  const atr=(i)=>atrAt(k,i,14); const sma=(i,n)=>{ let s=0; for(let j=i-n;j<i;j++) s+=k[j].c; return s/n; };
  for(const dir of ["long","short"]){ const isL=dir==="long"; let i=60; while(i<k.length-1){
    const hi=Math.max(...k.slice(i-20,i).map(c=>c.h)), lo=Math.min(...k.slice(i-20,i).map(c=>c.l)); const c=k[i]; const a=atr(i); const s50=sma(i,50);
    const brk = isL ? (c.c>hi && c.c>s50) : (c.c<lo && c.c<s50); if(!brk){ i++; continue; }
    if(btcFilter){ const B=btcFilter(k[i].t); if(!B){ i++; continue; } }
    // giriş: kırılım mumunun kapanışı (taker), stop 2 ATR, iz süren stop (en yüksek/düşük kapanıştan 2 ATR), en fazla 60 gün
    const entry=c.c; let stop=isL?entry-2*a:entry+2*a; const risk=Math.abs(entry-stop); let ext=entry; let r=-(0.0005*entry/risk); let end=-1, how="";
    for(let j=i+1;j<k.length;j++){ const x=k[j]; if(isL? x.l<=stop : x.h>=stop){ r+=((isL?(stop-entry):(entry-stop))/risk)-((0.0005+0.0003)*entry/risk); end=j; how="stop"; break; }
      ext=isL?Math.max(ext,x.c):Math.min(ext,x.c); const aa=atrAt(k,j+1,14); const tr=isL?ext-2*aa:ext+2*aa; if(isL? tr>stop : tr<stop) stop=tr;
      if(j-i>=60){ r+=((isL?(x.c-entry):(entry-x.c))/risk)-((0.0005+0.0003)*entry/risk); end=j; how="time"; break; } }
    if(end<0){ i++; continue; }
    results[name].push({sym:k.sym,dir,grade:"-",kz:null,t:k[i].t,r:+r.toFixed(3),how,sd:+(risk/entry*100).toFixed(2),hold:end-i});
    i=end+1; } }
}
const btcDaily=K(btcD.k1d); const btcOkAt=(t,dir)=>{ const i=btcDaily.findIndex(x=>x.t>=t); const j=(i<0?btcDaily.length:i)-1; if(j<60) return true; let s=0; for(let q=j-50;q<j;q++) s+=btcDaily[q].c; const s50=s/50; return dir==="long"?btcDaily[j].c>s50:btcDaily[j].c<s50; };
for(const d of data){ const k=K(d.k1d); k.sym=d.sym; trendFollow(k,"E2 günlük trend takibi",null); const k2=K(d.k1d); k2.sym=d.sym; trendFollow(k2,"E2 günlük trend + BTC filtresi",(t)=>true); }
// BTC filtresi yön bağımlı olduğu için ayrı geç
results["E2 günlük trend + BTC filtresi"]=[]; for(const d of data){ const k=K(d.k1d); k.sym=d.sym; const atrF=null; (function(){ const name="E2 günlük trend + BTC filtresi"; const atr=(i)=>atrAt(k,i,14); const sma=(i,n)=>{ let s=0; for(let j=i-n;j<i;j++) s+=k[j].c; return s/n; };
  for(const dir of ["long","short"]){ const isL=dir==="long"; let i=60; while(i<k.length-1){ const hi=Math.max(...k.slice(i-20,i).map(c=>c.h)), lo=Math.min(...k.slice(i-20,i).map(c=>c.l)); const c=k[i]; const a=atr(i); const s50=sma(i,50);
    const brk = isL ? (c.c>hi && c.c>s50) : (c.c<lo && c.c<s50); if(!brk||!btcOkAt(k[i].t,dir)){ i++; continue; }
    const entry=c.c; let stop=isL?entry-2*a:entry+2*a; const risk=Math.abs(entry-stop); let ext=entry; let r=-(0.0005*entry/risk); let end=-1, how="";
    for(let j=i+1;j<k.length;j++){ const x=k[j]; if(isL? x.l<=stop : x.h>=stop){ r+=((isL?(stop-entry):(entry-stop))/risk)-((0.0005+0.0003)*entry/risk); end=j; how="stop"; break; } ext=isL?Math.max(ext,x.c):Math.min(ext,x.c); const aa=atrAt(k,j+1,14); const tr=isL?ext-2*aa:ext+2*aa; if(isL? tr>stop : tr<stop) stop=tr; if(j-i>=60){ r+=((isL?(x.c-entry):(entry-x.c))/risk)-((0.0005+0.0003)*entry/risk); end=j; how="time"; break; } }
    if(end<0){ i++; continue; } results[name].push({sym:d.sym,dir,grade:"-",kz:null,t:k[i].t,r:+r.toFixed(3),how,sd:+(risk/entry*100).toFixed(2),hold:end-i}); i=end+1; } } })(); }
console.log(Math.round((Date.now()-t0)/1000)+' sn');
const summary={}; for(const s in results) summary[s]=stats(results[s]);
for(const s in summary){ const x=summary[s]; if(!x) continue; const tr=results[s]; const a=Math.min(...tr.map(x=>x.t)), b=Math.max(...tr.map(x=>x.t)); console.log(s,'·',new Date(a).toISOString().slice(0,10),'→',new Date(b).toISOString().slice(0,10)); }
printTable(summary);
fs.writeFileSync(path.join(__dirname,'backtest-explore.json'),JSON.stringify({at:new Date().toISOString(),summary,trades:results},null,1));
