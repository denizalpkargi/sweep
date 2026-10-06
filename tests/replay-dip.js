// Geri çekilme sepetini canlı kodla (src/dip.js: dipIntraday → dipClose) günlük veride oynatır; research-highwr.js ile aynı sonucu vermeli.
// Veri: tests/data/daily/<SYM>.csv. Yoksa atlar. Çalıştırma: node tests/replay-dip.js
const fs=require('fs'); const path=require('path'); const {loadEngine}=require('./engine-node.js');
const DIR=path.join(__dirname,'data','daily'); const E=loadEngine(); const SYMS=E.DIP_DEF.syms;
if(!SYMS.every(s=>fs.existsSync(path.join(DIR,s+'.csv')))){ console.log('tests/data/daily yok, atlandı'); process.exit(0); }
const D={}; for(const s of SYMS) D[s]=fs.readFileSync(path.join(DIR,s+'.csv'),'utf8').trim().split('\n').map(l=>{ const a=l.split(',').map(Number); return {t:a[0],o:a[1],h:a[2],l:a[3],c:a[4]}; });
const DAY=864e5, TM=Date.UTC(2023,4,15);
function run(cfg,from,to){
  const s=E.dipNew(cfg); const idx={}; for(const k of SYMS){ idx[k]={}; D[k].forEach((b,i)=>idx[k][b.t]=i); }
  let pk=s.start, dd=0;
  for(let t=from;t<to;t+=DAY){ const px={};
    for(const k of SYMS){ const i=idx[k][t]; if(i==null) continue; const bar=D[k][i]; px[k]=bar.c;
      E.dipIntraday(s,k,bar,t+DAY/2); }
    E.dipFund(s,px,t+DAY-1,null);
    for(const k of SYMS){ const i=idx[k][t]; if(i==null) continue; const data={}; for(const q of SYMS){ const j=idx[q][t]; if(j!=null) data[q]=D[q].slice(Math.max(0,j-130),j+1); }
      E.dipClose(s,k,D[k][i],data,t+DAY-1); }
    const eq=E.dipEq(s,px); pk=Math.max(pk,eq); dd=Math.min(dd,eq/pk-1); }
  const tr=s.trades; const n=tr.length; const m=tr.reduce((a,x)=>a+x.r,0)/n; const sd=Math.sqrt(tr.reduce((a,x)=>a+(x.r-m)**2,0)/n);
  const yrs=(to-from)/DAY/365; const eq=E.dipEq(s,null); const why={}; for(const x of tr) why[x.why]=(why[x.why]||0)+1;
  const yr={}; for(const x of tr){ const y=new Date(x.t).getUTCFullYear(); (yr[y]=yr[y]||[]).push(x.r); }
  return {n,wr:+(tr.filter(x=>x.r>0).length/n*100).toFixed(1),avgPct:+(m*100).toFixed(2),t:+(m/sd*Math.sqrt(n)).toFixed(1),end:+eq.toFixed(0),cagr:+(((eq/s.start)**(1/yrs)-1)*100).toFixed(0),maxDD:+(dd*100).toFixed(0),why,
    yr:Object.fromEntries(Object.entries(yr).map(([y,a])=>[y,{n:a.length,wr:Math.round(a.filter(r=>r>0).length/a.length*100),avg:+(100*a.reduce((p,r)=>p+r,0)/a.length).toFixed(2)}]))};
}
const T0=Date.UTC(2020,3,1), T1=Date.UTC(2026,8,30);
const out={all:run({},T0,T1),h1:run({},T0,TM),h2:run({},TM,T1),lev2:run({lev:2},T0,T1)};
for(const k in out) console.log(k.padEnd(5),JSON.stringify(out[k]));
