// Kurulum 3 işlemlerini uzun dönem faktör testinde geçen günlük faktörlere göre ayırır (factor-ic.js, 6 Ekim 2026).
// Soru: K3 işlemi, faktörün "lehte" olduğu coinlerde (ör. long için düşük oynaklık, düşük fonlama, yükselmemiş coin) daha mı iyi?
// Her işlem için giriş anından ÖNCE kapanmış son günlük mumla faktör hesaplanır, o gün tüm coinler arasında yüzdelik sıraya çevrilir.
// IC'si eksi olan faktörde long için düşük sıra lehte, short için yüksek sıra lehte (taker_7 artı IC, ters).
// Veri: tests/data/*.json (fetch-history.js). Fonlama: tests/data/fic önbelleği varsa (factor-ic.js), yoksa fonlama faktörü atlanır.
// Kullanım: node tests/backtest-k3-factors.js
const fs=require('fs'); const path=require('path');
const {loadEngine}=require('./engine-node.js'); const {loadData,runCoin,stats}=require('./bt-lib.js');
const E=loadEngine(); const {K,regimeSweep,RS_CFG}=E;
const data=loadData(); const BTC=K(data.find(d=>d.sym==='BTCUSDT').k15); const empty={oi:new Map(),tk:new Map()};
const STRATS={K3:{key:r=>r.sw, det:(k,k1d,med,dir,bias,i)=>regimeSweep(k,k1d,med,dir,empty,bias,BTC,i), ok:r=>r.rsOk&&(r.stage==="waitEntry"||r.stage==="entry"), plan:(r,dir)=>({dir,entry:r.entry,stop:r.stop,tp1:r.tp1,tgt:r.run,part:RS_CFG.part,be:true}), wait:RS_CFG.maxWait, hold:RS_CFG.maxHold}};
const results={K3:[]};
for(const d of data){ runCoin(E,d.sym,K(d.k15),K(d.k1d),STRATS,results); process.stdout.write(d.sym+' '); }
const trades=results.K3; console.log('\nK3 işlem:',trades.length);

// --- günlük faktörler (gün kapanışı d'de bilinen) ---
const DAY=864e5; const dk=t=>Math.floor(t/DAY);
const daily={}; for(const d of data){ const m=new Map(); for(const x of K(d.k1d)) m.set(dk(x.t),x); daily[d.sym]=m; }
function fundingOf(sym){ // tests/data/fic/monthly/fundingRate/SYM/*.csv → gün → toplam
  const dir=path.join(__dirname,'data','fic','monthly','fundingRate',sym); if(!fs.existsSync(dir)) return null; const m=new Map();
  for(const f of fs.readdirSync(dir)) for(const l of fs.readFileSync(path.join(dir,f),'utf8').split(/\r?\n/)){ if(!/^[0-9]/.test(l)) continue; const r=l.split(','); const d=dk(+r[0]-1); m.set(d,(m.get(d)||0)+(+r[r.length-1])); }
  return m.size?m:null;
}
const fund={}; for(const d of data) fund[d.sym]=fundingOf(d.sym);
const hasFund=Object.values(fund).filter(Boolean).length>=data.length*0.6;
const ser=(sym,d,n,f)=>{ const out=[]; for(let i=d-n+1;i<=d;i++){ const x=daily[sym].get(i); out.push(x?f(x,i):NaN); } return out; };
const okN=(a,n)=>a.filter(v=>isFinite(v)).length>=Math.ceil(n*0.7);
const mean=a=>{ const v=a.filter(isFinite); return v.length?v.reduce((x,y)=>x+y,0)/v.length:NaN; };
const sd=a=>{ const v=a.filter(isFinite), m=mean(v); return Math.sqrt(v.reduce((x,y)=>x+(y-m)**2,0)/v.length); };
const close=(sym,d)=>daily[sym].get(d)?.c;
const FACT={ // ic: uzun dönem testteki işaret
  vol_30:  {ic:-1, f:(s,d)=>{ const r=ser(s,d,30,(x,i)=>{ const p=close(s,i-1); return p?Math.log(x.c/p):NaN; }); return okN(r,30)?sd(r):NaN; }},
  qvol_z30:{ic:-1, f:(s,d)=>{ const q=ser(s,d,30,x=>Math.log(x.q)); if(!okN(q,30)) return NaN; const z=sd(q); return z>0&&isFinite(q[29])?(q[29]-mean(q))/z:NaN; }},
  mom_7:   {ic:-1, f:(s,d)=>{ const a=close(s,d), b=close(s,d-7); return a&&b?a/b-1:NaN; }},
  mom_1:   {ic:-1, f:(s,d)=>{ const a=close(s,d), b=close(s,d-1); return a&&b?a/b-1:NaN; }},
  taker_7: {ic:+1, f:(s,d)=>mean(ser(s,d,7,x=>x.q>0?x.tb/x.q:NaN))},
  ...(hasFund?{fund_1:{ic:-1, f:(s,d)=>{ const m=fund[s]; return m&&m.has(d)?m.get(d):NaN; }}}:{}),
};
const pctCache=new Map();
function pct(name,sym,d){ // o gün coinler arasında yüzdelik sıra 0..1
  const key=name+d; let m=pctCache.get(key);
  if(!m){ const vals=data.map(x=>[x.sym,FACT[name].f(x.sym,d)]).filter(v=>isFinite(v[1])).sort((a,b)=>a[1]-b[1]); m=new Map(); vals.forEach((v,i)=>m.set(v[0],vals.length>1?i/(vals.length-1):NaN)); m.n=vals.length; pctCache.set(key,m); }
  return m.n>=8?m.get(sym):undefined;
}
// lehte skor 0..1: 1 = faktör bu yön için en lehte coin
for(const tr of trades){ const d=dk(tr.t)-1; tr.fx={}; for(const n in FACT){ const p=pct(n,tr.sym,d); if(p==null||!isFinite(p)) continue; const lo=(FACT[n].ic<0)===(tr.dir==="long"); tr.fx[n]=lo?1-p:p; } }
const names=Object.keys(FACT); for(const tr of trades){ const v=names.map(n=>tr.fx[n]).filter(isFinite); tr.fx.birlesik=v.length>=3?mean(v):undefined; }

const row=(lab,a)=>{ const s=stats(a); return s?`${lab.padEnd(22)} n ${String(s.n).padStart(4)}  ortR ${s.avgR.toFixed(3).padStart(7)}  hedef% ${String(Math.round(s.wr*100)).padStart(3)}  PF ${String(s.pf).padStart(5)}  1.yarı ${s.half1.avg.toFixed(2).padStart(6)}  2.yarı ${s.half2.avg.toFixed(2).padStart(6)}  t ${String(s.tstat).padStart(5)}`:`${lab.padEnd(22)} işlem yok`; };
const out=[]; const base=stats(trades);
out.push(row('Tüm K3',trades));
out.push(`Fonlama faktörü: ${hasFund?'var (tests/data/fic)':'YOK (önce node tests/factor-ic.js çalıştır)'}`);
for(const n of [...names,'birlesik']){
  const a=trades.filter(x=>isFinite(x.fx[n])); if(a.length<30){ out.push(`\n${n}: yetersiz (${a.length})`); continue; }
  const s=[...a].sort((x,y)=>x.fx[n]-y.fx[n]); const k=Math.floor(s.length/3);
  out.push(`\n${n} (lehte skora göre üçte birler)`);
  out.push(row('  aleyhte 1/3',s.slice(0,k))); out.push(row('  orta 1/3',s.slice(k,2*k))); out.push(row('  lehte 1/3',s.slice(2*k)));
  out.push(row('  aleyhte 1/3 elenince',s.slice(k)));
}
const txt=out.join('\n'); console.log('\n'+txt);
console.log('\nNot: üçte bir ~'+Math.round(trades.length/3)+' işlem; ±0,1R fark gürültü içinde olabilir. Bir filtre ancak iki yarıda da aynı yönde iyileştiriyorsa ciddiye alınır.');
fs.writeFileSync(path.join(__dirname,'backtest-k3-factors.json'),JSON.stringify({at:new Date().toISOString(),base,hasFund,trades},null,1));
