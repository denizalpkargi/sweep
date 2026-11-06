// Test #94: yatay rejimde etkin kaldıraç aşınması (19 Ekim taraması; GSR 2023).
// Trend sepeti canlı kodla (trendTargets → trendRebalance → trendMark; replay-trend.js ile aynı döngü), veri arşivin 1g mumları.
// Rejim (gün başında, yalnız kapanmış mumlar): BTC 30 günlük getirisi |r| < %5 → yatay. Parametreler test listesinden, sonuca bakmadan.
// Çıktı: rejim × etkin kaldıraç (gün sonu Σ|nominal| ÷ özkaynak) dilimlerinde günlük getiri; yatayda tv tavanı 0,8 varyantı,
// tüm dönem / iki yarı / son 12 ay yıllık getiri, düşüş, Sharpe. Çalıştırma: node tests/test94-yatay-kaldirac.js
const fs=require('fs'), path=require('path'); const {loadEngine}=require('./engine-node.js'); const E=loadEngine();
const DIR=path.join(__dirname,'data','arch','1d'); const DAY=864e5; const SYMS=E.TREND_DEF.syms;
const D={}; for(const s of SYMS) D[s]=fs.readFileSync(path.join(DIR,s+'.csv'),'utf8').trim().split('\n').map(l=>{ const a=l.split(',').map(Number); return {t:a[0],o:a[1],h:a[2],l:a[3],c:a[4]}; });
const IX={}; for(const s of SYMS){ IX[s]=new Map(); D[s].forEach((b,i)=>IX[s].set(b.t,i)); }
const FLAT=0.05, TVF=0.8;
function run(flatCap,from,to){
  const s=E.trendNew({}); const rows=[];
  for(let t=from;t<to;t+=DAY){ const data={}, px={}, close={};
    for(const k of SYMS){ const a=D[k]; let i=IX[k].get(t); if(i==null){ i=a.findIndex(b=>b.t>=t); if(i<0) i=a.length; }
      data[k]=a.slice(Math.max(0,i-130),i); if(a[i]&&a[i].t===t){ px[k]=a[i].o; close[k]=a[i].c; } }
    const b=data.BTCUSDT; const r30=b.length>30?b[b.length-1].c/b[b.length-31].c-1:NaN; const flat=Math.abs(r30)<FLAT;
    const e0=E.trendEq(s,px);
    E.trendMark(s,px,t,null); const cfg=flatCap&&flat?Object.assign({},s.cfg,{tv:Math.min(s.cfg.tv,TVF)}):s.cfg;
    E.trendRebalance(s,E.trendTargets(data,cfg),px,t); E.trendMark(s,close,t+DAY-1,null);
    const e=E.trendEq(s,close); let nom=0; for(const k in s.pos) nom+=Math.abs(s.pos[k].qty*(close[k]||s.pos[k].px));
    rows.push({t,e,ret:e/e0-1,flat,lev:nom/e}); }
  return rows; }
function stats(rows){ if(!rows.length) return null; let eq=1,pk=1,dd=0; for(const r of rows){ eq*=1+r.ret; pk=Math.max(pk,eq); dd=Math.min(dd,eq/pk-1); }
  const m=rows.reduce((a,r)=>a+r.ret,0)/rows.length, sd=Math.sqrt(rows.reduce((a,r)=>a+(r.ret-m)**2,0)/rows.length);
  return {cagr:(eq**(365/rows.length)-1)*100,dd:dd*100,sharpe:sd>0?m/sd*Math.sqrt(365):0}; }
const T0=Date.UTC(2020,5,1), T1=D.BTCUSDT[D.BTCUSDT.length-1].t+DAY, TM=(T0+T1)/2, L12=T1-365*DAY;
const base=run(false,T0,T1), cap=run(true,T0,T1);
const f=(x,d=1)=>x.toFixed(d).replace('.',','); const L=[];
L.push('# Test #94: yatay rejimde etkin kaldıraç aşınması (Trend sepeti)\n',
  `Canlı kod (src/trend.js, varsayılan tv ${String(E.TREND_DEF.tv).replace('.',',')}), BTC·ETH·SOL·BNB arşiv 1g, ${new Date(T0).toISOString().slice(0,10)} → ${new Date(T1-DAY).toISOString().slice(0,10)}. Yatay = BTC 30 g getirisi |r| < %5 (gün başında). Taker + kayma, fonlama yok (replay-trend.js gibi).\n`);
L.push('## Rejim × etkin kaldıraç (bugünkü ayar)\n\n| Rejim | kaldıraç | gün | ort. günlük % | yıllıklaştırılmış % | günlük σ % |\n|---|---|---|---|---|---|');
const bk=l=>l<0.05?'nakit':l<1?'0–1x':l<2?'1–2x':'2x+';
for(const fl of [true,false]) for(const b of ['nakit','0–1x','1–2x','2x+']){ const g=base.filter(r=>r.flat===fl&&bk(r.lev)===b); if(!g.length) continue;
  const m=g.reduce((a,r)=>a+r.ret,0)/g.length, sd=Math.sqrt(g.reduce((a,r)=>a+(r.ret-m)**2,0)/g.length);
  L.push(`| ${fl?'yatay':'trendli'} | ${b} | ${g.length} | ${f(m*100,3)} | ${f(m*36500,0)} | ${f(sd*100,2)} |`); }
// kaldıraç başına getiri: yatayda aşınma = getiri ÷ kaldıraç düşük mü
L.push('\n## Kaldıraç başına günlük getiri (yalnız pozisyonlu günler)\n\n| Dönem | yatay % / 1x | trendli % / 1x | yatay gün payı |\n|---|---|---|---|');
const per=[['tümü',r=>true],['ilk yarı',r=>r.t<TM],['ikinci yarı',r=>r.t>=TM],['son 12 ay',r=>r.t>=L12]];
for(const [pn,fn] of per){ const g=base.filter(fn), p=g.filter(r=>r.lev>=0.05);
  const pl=fl=>{ const x=p.filter(r=>r.flat===fl); const lv=x.reduce((a,r)=>a+r.lev,0); return lv?x.reduce((a,r)=>a+r.ret,0)/lv*100:NaN; };
  L.push(`| ${pn} | ${f(pl(true),3)} | ${f(pl(false),3)} | %${f(g.filter(r=>r.flat).length/g.length*100,0)} |`); }
L.push(`\n## Varyant: yatayda tv ≤ ${String(TVF).replace('.',',')}\n\n| Dönem | bugünkü yıllık % / düşüş % / Sharpe | tavanlı | fark (yıllık) |\n|---|---|---|---|`);
for(const [pn,fn] of per){ const a=stats(base.filter(fn)), b=stats(cap.filter(fn));
  L.push(`| ${pn} | ${f(a.cagr,0)} / ${f(a.dd,0)} / ${f(a.sharpe,2)} | ${f(b.cagr,0)} / ${f(b.dd,0)} / ${f(b.sharpe,2)} | ${f(b.cagr-a.cagr,0)} |`); }
L.push('\n## Yıl yıl (yıllık %: bugünkü → tavanlı)\n\n| Yıl | bugünkü | tavanlı | yatay gün |\n|---|---|---|---|');
const yrs=[...new Set(base.map(r=>new Date(r.t).getUTCFullYear()))];
for(const y of yrs){ const fy=r=>new Date(r.t).getUTCFullYear()===y; const pr=x=>x.filter(fy).reduce((a,r)=>a*(1+r.ret),1)-1;
  L.push(`| ${y} | ${f(pr(base)*100,0)} | ${f(pr(cap)*100,0)} | ${base.filter(fy).filter(r=>r.flat).length} |`); }
fs.writeFileSync(path.join(__dirname,'test94-yatay-kaldirac-report.md'),L.join('\n')+'\n'); console.log(L.join('\n'));
