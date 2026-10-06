// Trend sepetini canlı kodla (src/trend.js: trendTargets → trendRebalance → trendMark) günlük veride baştan sona oynatır.
// Veri: tests/data/daily/<SYM>.csv (bkz. tests/research-daily.js). Yoksa atlar.
// Çıktı: yıllık getiri, iki yarı, en büyük düşüş, 100 $ → 200 $ için kaç gün; bant ve hedef oynaklık varyantları.
// Çalıştırma: node tests/replay-trend.js
const fs=require('fs'); const path=require('path'); const {loadEngine}=require('./engine-node.js');
const DIR=path.join(__dirname,'data','daily'); const E=loadEngine();
const SYMS=E.TREND_DEF.syms; if(!SYMS.every(s=>fs.existsSync(path.join(DIR,s+'.csv')))){ console.log('tests/data/daily yok, atlandı'); process.exit(0); }
const D={}; for(const s of SYMS) D[s]=fs.readFileSync(path.join(DIR,s+'.csv'),'utf8').trim().split('\n').map(l=>{ const a=l.split(',').map(Number); return {t:a[0],o:a[1],h:a[2],l:a[3],c:a[4]}; });
const DAY=864e5;
function run(cfg,from,to){
  const s=E.trendNew(cfg); const days=[]; for(let t=from;t<to;t+=DAY) days.push(t); const eq=[]; let doubled=null;
  for(const t of days){ const data={}, px={};
    for(const k of SYMS){ const a=D[k]; let i=a.findIndex(b=>b.t>=t); if(i<0) i=a.length; data[k]=a.slice(Math.max(0,i-130),i); if(a[i]&&a[i].t===t) px[k]=a[i].o; }
    E.trendMark(s,px,t,null); const tg=E.trendTargets(data,s.cfg); E.trendRebalance(s,tg,px,t);
    const close={}; for(const k of SYMS){ const b=D[k].find(b=>b.t===t); if(b) close[k]=b.c; } E.trendMark(s,close,t+DAY-1,null);
    const e=E.trendEq(s,close); eq.push([t,e]); if(!doubled&&e>=2*s.start) doubled=t; }
  let pk=eq[0][1], dd=0; for(const [,e] of eq){ pk=Math.max(pk,e); dd=Math.min(dd,e/pk-1); }
  const yrs={}; let prev=s.start; for(const [t,e] of eq){ const y=new Date(t).getUTCFullYear(); if(!(y in yrs)) yrs[y]={a:prev}; yrs[y].b=e; prev=e; }
  const yr={}; for(const y in yrs) yr[y]=+((yrs[y].b/yrs[y].a-1)*100).toFixed(0);
  const end=eq[eq.length-1][1]; const cagr=(end/s.start)**(365/eq.length)-1;
  return {end:+end.toFixed(0),cagr:+(cagr*100).toFixed(0),maxDD:+(dd*100).toFixed(0),trades:s.trades,fees:+s.fees.toFixed(0),funding:+s.funding.toFixed(0),daysTo2x:doubled?Math.round((doubled-from)/DAY):null,yr};
}
const T0=Date.UTC(2020,3,1), T1=Date.UTC(2026,8,30), TM=Date.UTC(2023,5,15);
const out={};
for(const tv of [0.4,0.8,1.2]) for(const band of [0,0.2]){ const k=`tv${tv}_band${band}`; out[k]={all:run({tv,cap:tv*5,band},T0,T1),h1:run({tv,cap:tv*5,band},T0,TM),h2:run({tv,cap:tv*5,band},TM,T1)}; }
// varsayılan ayarla her 30 günde bir başlayan hesap: 100 $ → 200 $ kaç günde, 50 $'a düşme oranı
const starts=[]; for(let t=T0;t<T1-365*DAY;t+=30*DAY) starts.push(t);
const rolls=starts.map(t=>{ const r=run({},t,t+365*DAY); return {t:new Date(t).toISOString().slice(0,7),end:r.end,dd:r.maxDD,to2x:r.daysTo2x}; });
out.rolling365={n:rolls.length,hit2x:+(rolls.filter(r=>r.to2x).length/rolls.length).toFixed(2),medDays2x:rolls.filter(r=>r.to2x).map(r=>r.to2x).sort((a,b)=>a-b)[Math.floor(rolls.filter(r=>r.to2x).length/2)]||null,
  below50:+(rolls.filter(r=>r.dd<=-50).length/rolls.length).toFixed(2),medEnd:rolls.map(r=>r.end).sort((a,b)=>a-b)[rolls.length>>1],worstEnd:Math.min(...rolls.map(r=>r.end)),rows:rolls};
fs.writeFileSync(path.join(__dirname,'replay-trend.json'),JSON.stringify(out,null,1));
for(const k in out) if(k!=='rolling365') console.log(k.padEnd(14),'tümü',JSON.stringify(out[k].all),'\n'.padEnd(16),'1. yarı',JSON.stringify({cagr:out[k].h1.cagr,dd:out[k].h1.maxDD}),'2. yarı',JSON.stringify({cagr:out[k].h2.cagr,dd:out[k].h2.maxDD}));
const R=out.rolling365; console.log('365 günlük kayan hesap (varsayılan):',JSON.stringify({n:R.n,hit2x:R.hit2x,medDays2x:R.medDays2x,below50:R.below50,medEnd:R.medEnd,worstEnd:R.worstEnd}));
