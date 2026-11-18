// Test #3 (11 Ekim 2026, günlük döngü): Trend sepetinde BTC kapısı SMA50 yerine SMA200. Canlı kodla (src/trend.js) replay-trend.js'in döngüsü,
// veri arşivin 1g mumları (tests/data/arch/1d), SMA200 için 260 günlük pencere. Ayarlar bugünkü varsayılan (tv 1,4); tv 0,8 de bilgi için.
// Geçme (önceden): SMA200 yıllık getiride iki yarıda ve son 24 ayda SMA50'den iyi ve en büyük düşüş daha kötü değil.
// Kullanım: node tests/test03-btc-sma200-trend.js → tests/test03-btc-sma200-trend-report.md
const fs=require('fs'), path=require('path'); const {loadEngine}=require('./engine-node.js'); const E=loadEngine();
const SYMS=E.TREND_DEF.syms, DAY=864e5, A=path.join(__dirname,'data','arch','1d');
const D={}; for(const s of SYMS) D[s]=fs.readFileSync(path.join(A,s+'.csv'),'utf8').trim().split('\n').map(l=>{ const a=l.split(',').map(Number); return {t:a[0],o:a[1],h:a[2],l:a[3],c:a[4]}; });
const ix={}; for(const s of SYMS){ ix[s]=new Map(D[s].map((b,i)=>[b.t,i])); }
function run(cfg,from,to){
  const s=E.trendNew(cfg); const eq=[];
  for(let t=from;t<to;t+=DAY){ const data={}, px={}, close={};
    for(const k of SYMS){ const a=D[k]; let i=ix[k].get(t); if(i==null){ i=a.findIndex(b=>b.t>=t); if(i<0) i=a.length; } data[k]=a.slice(Math.max(0,i-260),i); if(a[i]&&a[i].t===t){ px[k]=a[i].o; close[k]=a[i].c; } }
    E.trendMark(s,px,t,null); E.trendRebalance(s,E.trendTargets(data,s.cfg),px,t); E.trendMark(s,close,t+DAY-1,null); eq.push([t,E.trendEq(s,close)]); }
  let pk=eq[0][1], dd=0; for(const [,e] of eq){ pk=Math.max(pk,e); dd=Math.min(dd,e/pk-1); }
  const end=eq[eq.length-1][1], cagr=(end/s.start)**(365/eq.length)-1, yr={}; let prev=s.start;
  for(const [t,e] of eq){ const y=new Date(t).getUTCFullYear(); if(!yr[y]) yr[y]={a:prev}; yr[y].b=e; prev=e; }
  return {cagr:100*cagr,dd:100*dd,yr:Object.fromEntries(Object.entries(yr).map(([y,v])=>[y,100*(v.b/v.a-1)]))}; }
const T0=Date.UTC(2020,8,1), T1=Date.UTC(2026,9,8), TM=Math.round((T0+T1)/2/DAY)*DAY, T24=T1-730*DAY;
const fx=(x,d=0)=>(x>=0?'+':'')+x.toFixed(d).replace('.',',');
const L=['# Test #3 · Trend sepetinde BTC kapısı: SMA50 ↔ SMA200 (arşiv, canlı kod)','',`11 Ekim 2026 · \`node tests/test03-btc-sma200-trend.js\` · BTC·ETH·SOL·BNB, ${new Date(T0).toISOString().slice(0,10)} → ${new Date(T1).toISOString().slice(0,10)}, yarı ${new Date(TM).toISOString().slice(0,10)}. Maliyet ve fonlama canlı koddaki gibi.`,'',
 '| ayar | kapı | yıllık % (düşüş %) | 1. yarı | 2. yarı | son 24 ay | yıl yıl % |','|---|---|---|---|---|---|---|'];
const res={};
for(const tv of [1.4,0.8]) for(const g of [50,200]){ const c={tv,cap:tv*5,btcSma:g}; if(tv===1.4) delete c.cap; const r=[run(c,T0,T1),run(c,T0,TM),run(c,TM,T1),run(c,T24,T1)]; res[tv+'_'+g]=r;
  L.push(`| tv ${String(tv).replace('.',',')} | SMA${g} | ${fx(r[0].cagr)} (${fx(r[0].dd)}) | ${r.slice(1).map(z=>`${fx(z.cagr)} (${fx(z.dd)})`).join(' | ')} | ${Object.entries(r[0].yr).map(([y,v])=>`${y} ${fx(v)}`).join(', ')} |`); }
const a=res['1.4_50'], b=res['1.4_200']; const ok=[1,2,3].every(i=>b[i].cagr>a[i].cagr)&&b[0].dd>=a[0].dd;
L.push('',`Geçme (tv 1,4): SMA200 iki yarıda ve son 24 ayda daha yüksek getiri ve düşüş daha kötü değil → **${ok?'evet':'hayır'}**.`);
fs.writeFileSync(path.join(__dirname,'test03-btc-sma200-trend-report.md'),L.join('\n')+'\n'); console.log(L.slice(4).join('\n'));
