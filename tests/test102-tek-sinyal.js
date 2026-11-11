// Test #102: Trend sepetinde tek uzun süreli sinyal (9 Kasım taraması; Valeyre 2025 arXiv 2504.10914, Etienne vd. 2025).
// Canlı kod (src/trend.js; test94/test100 döngüsü, taker + kayma, fonlama yok). Yalnız coin puanı değişir:
//   bugün   : SMA 10/20/50/100'ün üstünde kalan pay (0…1)
//   EMA 112 : kapanış > EMA112 → 1, değilse 0 (süre literatürden, veride seçilmedi)
//   SMA 100 : kapanış > SMA100 → 1, değilse 0
// Ağırlık = puan × min(cap, tv / 30 g oynaklık) ÷ coin sayısı, BTC SMA50 kapısı aynı. Devir = yılda Σ|işlem $| ÷ özkaynak.
// Kesim saatleri: python3 tests/test100-kesim-veri.py <kök> ile 00/04/08/12/16/20 UTC; 00 UTC kesimi arşivin 1g mumlarıyla aynı.
// Kullanım: node tests/test102-tek-sinyal.js <kök> → tests/test102-tek-sinyal-report.md
const fs=require('fs'), path=require('path'); const ROOT=process.argv[2]; const DAY=864e5;
const {loadEngine}=require('./engine-node.js'); const E=loadEngine(); const SYMS=E.TREND_DEF.syms; const CUTS=[0,4,8,12,16,20];
const ema=(a,n)=>{ const k=2/(n+1); let e=a[0].c; for(let i=1;i<a.length;i++) e=a[i].c*k+e*(1-k); return e; };
const SC={
  'bugün (SMA 10/20/50/100 payı)':null,
  'EMA 112 işareti':a=>a.length>=300?(a[a.length-1].c>ema(a,112)?1:0):null,
  'SMA 100 işareti':a=>{ if(a.length<100) return null; let s=0; for(let i=a.length-100;i<a.length;i++) s+=a[i].c; return a[a.length-1].c>s/100?1:0; },
};
function load(h){ const D={}, ix={}; for(const s of SYMS){ D[s]=fs.readFileSync(path.join(ROOT,'k'+String(h).padStart(2,'0'),'data','arch','1d',s+'.csv'),'utf8').trim().split('\n').map(l=>{ const a=l.split(',').map(Number); return {t:a[0],o:a[1],h:a[2],l:a[3],c:a[4]}; }); ix[s]=new Map(D[s].map((b,i)=>[b.t,i])); } return {D,ix}; }
function run({D,ix},score){ const s=E.trendNew({}); const out=new Map(); let turn=0; const T1=D.BTCUSDT[D.BTCUSDT.length-1].t+DAY;
  for(let t=Date.UTC(2020,5,1);t<T1;t+=DAY){ const data={}, long={}, px={}, close={};
    for(const k of SYMS){ const a=D[k]; let i=ix[k].get(t); if(i==null){ i=a.findIndex(b=>b.t>=t); if(i<0) i=a.length; } data[k]=a.slice(Math.max(0,i-130),i); long[k]=a.slice(Math.max(0,i-500),i); if(a[i]&&a[i].t===t){ px[k]=a[i].o; close[k]=a[i].c; } }
    E.trendMark(s,px,t,null); const tg=E.trendTargets(data,s.cfg);
    if(score){ const act=SYMS.filter(k=>tg.w[k].score!=null).length; for(const k of SYMS){ const w=tg.w[k]; const sc=w.score!=null?score(long[k]):null; w.w=tg.btcOk&&sc!=null?sc*Math.min(s.cfg.cap,s.cfg.tv/w.vol)/act:0; } }
    const eq0=E.trendEq(s,px); const evs=E.trendRebalance(s,tg,px,t)||[]; for(const ev of evs) if(ev&&ev.usd) turn+=ev.usd/eq0;
    E.trendMark(s,close,t+DAY-1,null); out.set(t,E.trendEq(s,close)/s.start); }
  return {eq:out,turn}; }
function stats(eq,from,to){ const ks=[...eq.keys()].filter(t=>t>=from&&t<to).sort((a,b)=>a-b); let pk=eq.get(ks[0]),dd=0; const r=[];
  for(let i=1;i<ks.length;i++){ const a=eq.get(ks[i-1]), b=eq.get(ks[i]); r.push(b/a-1); pk=Math.max(pk,b); dd=Math.min(dd,b/pk-1); }
  const m=r.reduce((x,y)=>x+y,0)/r.length, sd=Math.sqrt(r.reduce((x,y)=>x+(y-m)**2,0)/r.length);
  return {cagr:((eq.get(ks[ks.length-1])/eq.get(ks[0]))**(365/r.length)-1)*100,dd:dd*100,sh:sd>0?m/sd*Math.sqrt(365):0}; }
const f=(x,d=0)=>(x>=0?'+':'')+x.toFixed(d).replace('.',','), g=x=>x.toFixed(2).replace('.',',');
const DATA={}; for(const h of CUTS) DATA[h]=load(h);
const L=['# Test #102: Trend sepetinde tek uzun süreli sinyal\n'];
const R={};
for(const [nm,sc] of Object.entries(SC)){ R[nm]={}; for(const h of CUTS) R[nm][h]=run(DATA[h],sc); console.log(nm); }
const ks=[...R[Object.keys(SC)[0]][0].eq.keys()].sort((a,b)=>a-b); const T0=ks[0], T1=ks[ks.length-1]+1, TM=Math.round((T0+T1)/2/DAY)*DAY, L12=T1-365*DAY, yrs=(T1-T0)/365/DAY;
const per=[['tümü',T0,T1],['1. yarı',T0,TM],['2. yarı',TM,T1],['son 12 ay',L12,T1]];
L.push(`Canlı kod (src/trend.js, tv ${String(E.TREND_DEF.tv).replace('.',',')}), BTC·ETH·SOL·BNB, ${new Date(T0).toISOString().slice(0,10)} → ${new Date(T1).toISOString().slice(0,10)}. Yalnız puan değişir; oynaklık hedefi, BTC SMA50 kapısı, bant ve maliyet aynı. Hücre: yıllık % / düşüş % / Sharpe.\n`,
 '## 00 UTC kesimi\n','| Puan | devir (yılda ×özkaynak) | tümü | 1. yarı | 2. yarı | son 12 ay |','|---|---|---|---|---|---|');
for(const nm in R){ const x=R[nm][0]; L.push(`| ${nm} | ${(x.turn/yrs).toFixed(1).replace('.',',')} | ${per.map(([,a,b])=>{ const z=stats(x.eq,a,b); return `${f(z.cagr)} / ${f(z.dd)} / ${g(z.sh)}`; }).join(' | ')} |`); }
L.push('','## Altı kesim saatinde Sharpe (en kötü – ortanca – en iyi)\n','| Puan | tümü | 1. yarı | 2. yarı | son 12 ay | kesimlerde bugünü geçme |','|---|---|---|---|---|---|');
const base=Object.keys(SC)[0];
for(const nm in R){ const cells=per.map(([,a,b])=>{ const v=CUTS.map(h=>stats(R[nm][h].eq,a,b).sh).sort((x,y)=>x-y); return `${g(v[0])} – ${g((v[2]+v[3])/2)} – ${g(v[5])}`; });
  const wins=CUTS.filter(h=>stats(R[nm][h].eq,T0,T1).sh>stats(R[base][h].eq,T0,T1).sh).length;
  L.push(`| ${nm} | ${cells.join(' | ')} | ${nm===base?'—':wins+'/6'} |`); }
fs.writeFileSync(path.join(__dirname,'test102-tek-sinyal-report.md'),L.join('\n')+'\n'); console.log(L.join('\n'));
