// Geriye dönük test yardımcıları: günlük yön, strateji döngüsü, özet istatistik. backtest-compare.js ve backtest-explore.js kullanır.
const fs=require('fs'); const path=require('path');
const DIR=process.env.SWEEP_DATA||path.join(__dirname,'data');
function loadData(){ return fs.readdirSync(DIR).filter(f=>/USDT\.json$/.test(f)&&!f.startsWith('_')).map(f=>JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'))); }
// günlük yön: analyze() ile aynı puanlama, t anında kapanmış günlük mumlarla (bakış ileri yok)
function dailyBiasAt(k1d, t, px){
  const closed=k1d.filter(x=>x.t+86400e3<=t); if(closed.length<60) return "flat"; const cur=k1d.find(x=>x.t<=t && t<x.t+86400e3)||closed[closed.length-1];
  const dc=closed.map(x=>x.c); const sma=(a,n)=>a.slice(-n).reduce((x,y)=>x+y,0)/n; const s20=sma(dc,20), s50=sma(dc,50), s20p=sma(dc.slice(0,-5),20);
  const ch30=px/dc[dc.length-31]-1; const r1=closed.slice(-10), r0=closed.slice(-20,-10);
  const hh=Math.max(...r1.map(x=>x.h))>Math.max(...r0.map(x=>x.h)), hl=Math.min(...r1.map(x=>x.l))>Math.min(...r0.map(x=>x.l));
  let s=0; if(px>s20) s++; if(s20>s20p) s++; if(px>s50) s++; if(hh) s++; if(hl) s++; if(ch30>0) s++; if(px<s20) s--; if(s20<s20p) s--; if(px<s50) s--; if(!hh&&!hl) s--; if(ch30<0) s--;
  return s>=3?"up":s<=-3?"down":(s>=1&&px>=cur.o?"up":s<=-1&&px<=cur.o?"down":"flat");
}
// Bir coin için stratejileri çalıştırır. strats: {name:{key,det,ok,plan,wait,hold}}; E: motor; k: mumlar; step: tarama adımı
function runCoin(E, sym, k, k1d, strats, results, opts={}){
  const {simTrade}=E; const rng=k.map(c=>(c.h-c.l)/c.c).sort((a,b)=>a-b); const med15=rng[Math.floor(rng.length/2)]||0.005;
  const start=opts.start||200, step=opts.step||1, biasEvery=opts.biasEvery||4;
  E.setPoolCache(new Map());
  for(const dir of ["long","short"]){
    const seen={}; for(const s in strats) seen[s]=new Set();
    let bc={i:-1,v:"flat"};
    for(let i=start;i<k.length-5;i+=step){
      if(i-bc.i>=biasEvery){ bc={i,v:opts.bias?opts.bias(k1d,k[i-1].t,k[i-1].c):dailyBiasAt(k1d,k[i-1].t,k[i-1].c)}; }
      const bias=bc.v; if(bias==="flat" && !opts.allowFlat) continue;
      for(const name in strats){ const S=strats[name]; if(S.dirs && !S.dirs.includes(dir)) continue; let r; try{ r=S.det(k,k1d,med15,dir,bias,i); }catch(e){ console.error(sym,dir,name,i,e.message); continue; }
        if(!r||!S.ok(r)) continue; const key=S.key(r); if(seen[name].has(key)) continue; seen[name].add(key);
        const p=S.plan(r,dir); if(!p) continue; const sim=simTrade(k,p,i,S.wait,S.hold); if(!sim||sim.res==="nofill"||sim.res==="open") continue;
        results[name].push({sym,dir,grade:r.grade||"-",kz:r.kz||null,t:k[sim.fill].t,r:+sim.r.toFixed(3),how:sim.how,sd:+(Math.abs(p.entry-p.stop)/p.entry*100).toFixed(2),hold:sim.end-sim.fill});
      }
    }
  }
  E.setPoolCache(null);
}
function stats(tr){
  if(!tr.length) return null; const s=[...tr].sort((a,b)=>a.t-b.t); const n=s.length; const win=s.filter(x=>x.r>0).length; const sum=s.reduce((a,x)=>a+x.r,0);
  const pos=s.filter(x=>x.r>0).reduce((a,x)=>a+x.r,0), neg=-s.filter(x=>x.r<=0).reduce((a,x)=>a+x.r,0);
  let eq=0,peak=0,dd=0,cl=0,mcl=0; for(const x of s){ eq+=x.r; peak=Math.max(peak,eq); dd=Math.max(dd,peak-eq); if(x.r<=0){ cl++; mcl=Math.max(mcl,cl); } else cl=0; }
  const mid=s[Math.floor(n/2)].t; const h1=s.filter(x=>x.t<mid), h2=s.filter(x=>x.t>=mid); const avg=a=>a.length?a.reduce((p,x)=>p+x.r,0)/a.length:NaN;
  const coins={}; for(const x of s){ coins[x.sym]=(coins[x.sym]||0)+x.r; } const cp=Object.values(coins).filter(v=>v>0).length, cn=Object.keys(coins).length;
  const how={}; for(const x of s) how[x.how]=(how[x.how]||0)+1;
  const byG={}; for(const g of ["A","B"]){ const a=s.filter(x=>x.grade===g); if(a.length) byG[g]={n:a.length,wr:+(a.filter(x=>x.r>0).length/a.length).toFixed(2),avg:+avg(a).toFixed(2)}; }
  const byD={}; for(const g of ["long","short"]){ const a=s.filter(x=>x.dir===g); if(a.length) byD[g]={n:a.length,wr:+(a.filter(x=>x.r>0).length/a.length).toFixed(2),avg:+avg(a).toFixed(2)}; }
  const kz={}; for(const x of s){ const z=x.kz||"dışı"; kz[z]=kz[z]||{n:0,s:0}; kz[z].n++; kz[z].s+=x.r; } for(const z in kz) kz[z]={n:kz[z].n,avg:+(kz[z].s/kz[z].n).toFixed(2)};
  // t-istatistiği: ortalama R'nin sıfırdan farkı (bağımsız işlem varsayımı, kaba)
  const sd=Math.sqrt(s.reduce((a,x)=>a+(x.r-sum/n)**2,0)/Math.max(1,n-1)); const tstat=sd?+(sum/n/(sd/Math.sqrt(n))).toFixed(2):0;
  return {n,wr:+(win/n).toFixed(3),avgR:+(sum/n).toFixed(3),sumR:+sum.toFixed(1),pf:neg?+(pos/neg).toFixed(2):Infinity,maxDD:+dd.toFixed(1),maxLossStreak:mcl,tstat,half1:{n:h1.length,avg:+avg(h1).toFixed(2)},half2:{n:h2.length,avg:+avg(h2).toFixed(2)},coinsPos:cp+"/"+cn,how,byGrade:byG,byDir:byD,kz,avgHold:+(s.reduce((a,x)=>a+x.hold,0)/n).toFixed(1),avgStopPct:+(s.reduce((a,x)=>a+x.sd,0)/n).toFixed(2),coins};
}
function printTable(summary){
  console.log(['Strateji'.padEnd(30),'n'.padStart(5),'hedef%'.padStart(7),'ortR'.padStart(7),'topR'.padStart(7),'PF'.padStart(6),'maxDD'.padStart(6),'seri'.padStart(5),'t'.padStart(6),'1.yarı'.padStart(7),'2.yarı'.padStart(7),'coin+'.padStart(7),'stop%'.padStart(6)].join(' '));
  for(const s in summary){ const x=summary[s]; if(!x){ console.log(s.padEnd(30),'işlem yok'); continue; }
    console.log([s.padEnd(30),String(x.n).padStart(5),String(Math.round(x.wr*100)).padStart(7),x.avgR.toFixed(2).padStart(7),x.sumR.toFixed(1).padStart(7),String(x.pf).padStart(6),x.maxDD.toFixed(1).padStart(6),String(x.maxLossStreak).padStart(5),String(x.tstat).padStart(6),x.half1.avg.toFixed(2).padStart(7),x.half2.avg.toFixed(2).padStart(7),x.coinsPos.padStart(7),String(x.avgStopPct).padStart(6)].join(' '));
    console.log('   ','çıkış',JSON.stringify(x.how),'· not',JSON.stringify(x.byGrade),'· yön',JSON.stringify(x.byDir),'· seans',JSON.stringify(x.kz),'· tutuş',x.avgHold);
  }
}
module.exports={loadData,dailyBiasAt,runCoin,stats,printTable};
