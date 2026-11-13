// Test #100: günlük mumun kesim saati şansı ve kademeli dengeleme (5 Kasım taraması; Zarattini–Pagani 2026, Newfound 2019).
// Veri: python3 tests/test100-kesim-veri.py <kök> (1 sa arşivden h UTC'de kesilmiş günlük mumlar, etiket 00 UTC).
// Trend sepeti canlı kodla (test94 döngüsü; taker + kayma, fonlama yok), Kaplumbağa research-daily-wide.js T1 long + BTC SMA200,
// %0,5 · 10 · 2× (test98-kaplumbaga-dump.js ile aynı; komisyon + arşiv fonlaması). Kesimler 00/04/08/12/16/20 UTC (6/18 yalnız 4 parçalı sepette).
// Kademeli: sermaye N eşit parçaya, her parça kendi saatinde dengelenir (parçalar arası dengeleme yok); 2 parça 00+12, 3 parça 00+08+16,
// 4 parça 00+06+12+18. Parçaların günlük özkaynağı etiket gününde toplanır (parçalar arası ≤ 18 sa zaman farkı yok sayılır).
// Parametre seçilmez; yalnız dağılım ölçülür. Kullanım: node tests/test100-kesim-saati.js <kök> → tests/test100-kesim-saati-report.md
const fs=require('fs'), path=require('path'); const ROOT=process.argv[2]; const DAY=864e5;
const {loadEngine}=require('./engine-node.js'); const E=loadEngine(); const SYMS=E.TREND_DEF.syms;
const CUTS=[0,4,6,8,12,16,18,20], SHOW=[0,4,8,12,16,20];
const dir=h=>path.join(ROOT,'k'+String(h).padStart(2,'0'));
function trendRun(h){ const D={}, ix={};
  for(const s of SYMS){ D[s]=fs.readFileSync(path.join(dir(h),'data','arch','1d',s+'.csv'),'utf8').trim().split('\n').map(l=>{ const a=l.split(',').map(Number); return {t:a[0],o:a[1],h:a[2],l:a[3],c:a[4]}; }); ix[s]=new Map(D[s].map((b,i)=>[b.t,i])); }
  const s=E.trendNew({}); const out=new Map(); const T1=D.BTCUSDT[D.BTCUSDT.length-1].t+DAY;
  for(let t=Date.UTC(2020,5,1);t<T1;t+=DAY){ const data={}, px={}, close={};
    for(const k of SYMS){ const a=D[k]; let i=ix[k].get(t); if(i==null){ i=a.findIndex(b=>b.t>=t); if(i<0) i=a.length; } data[k]=a.slice(Math.max(0,i-130),i); if(a[i]&&a[i].t===t){ px[k]=a[i].o; close[k]=a[i].c; } }
    E.trendMark(s,px,t,null); E.trendRebalance(s,E.trendTargets(data,s.cfg),px,t); E.trendMark(s,close,t+DAY-1,null); out.set(t,E.trendEq(s,close)/s.start); }
  return out; }
function turtleRun(h){ const T=dir(h);  // research-daily-wide.js arşivi __dirname/data/arch'tan okur
  let src=fs.readFileSync(path.join(__dirname,'research-daily-wide.js'),'utf8'); src=src.slice(0,src.indexOf('const fx=')).replace("return {cagr:","return {daily,cagr:");
  const argv=['node','x','--top','50','--risk','0.005','--maxpos','10','--lev','2'];
  const R=new Function('require','__dirname','process',src+'\nreturn {D,trades,portfolio,btcAbove,DAY};')(require,T,{argv});
  let all=[]; for(const s of Object.keys(R.D)) all=all.concat(R.trades(s,'T1',1,false));
  const pf=R.portfolio(all.filter(x=>x.ti>=Date.UTC(2020,5,1)&&R.btcAbove(x.ti-R.DAY)===true)); return new Map(pf.daily.map(x=>[x.t,x.eq])); }
function stats(eq,from,to){ const ks=[...eq.keys()].filter(t=>t>=from&&t<to).sort((a,b)=>a-b); if(ks.length<30) return null; let pk=eq.get(ks[0]),dd=0; const r=[];
  for(let i=1;i<ks.length;i++){ const a=eq.get(ks[i-1]), b=eq.get(ks[i]); r.push(b/a-1); pk=Math.max(pk,b); dd=Math.min(dd,b/pk-1); }
  const m=r.reduce((x,y)=>x+y,0)/r.length, sd=Math.sqrt(r.reduce((x,y)=>x+(y-m)**2,0)/r.length);
  return {cagr:((eq.get(ks[ks.length-1])/eq.get(ks[0]))**(365/r.length)-1)*100,dd:dd*100,sh:sd>0?m/sd*Math.sqrt(365):0}; }
function blend(runs,hs){ const ks=[...runs[hs[0]].keys()].filter(t=>hs.every(h=>runs[h].has(t))); return new Map(ks.map(t=>[t,hs.reduce((a,h)=>a+runs[h].get(t)/runs[h].get(ks[0]),0)/hs.length])); }
const f=(x,d=0)=>x==null?'—':(x>=0?'+':'')+x.toFixed(d).replace('.',','); const L=['# Test #100: günlük kesim saati şansı ve kademeli dengeleme\n'];
L.push('Günlük mum 1 sa arşivden h UTC\'de kesildi (`tests/test100-kesim-veri.py`); 00 UTC kesimi arşivin 1g mumlarıyla birebir aynı. Trend sepeti canlı kod (fonlama yok), Kaplumbağa research-daily-wide.js T1 + BTC SMA200, %0,5 · 10 · 2× (komisyon + fonlama). Kademeli sepet: sermaye eşit parçalara, her parça kendi saatinde dengelenir. Hücre: yıllık % / en büyük düşüş % / Sharpe.\n');
for(const [nm,fn] of [['Trend sepeti',trendRun],['Kaplumbağa',turtleRun]]){
  const runs={}; for(const h of CUTS){ runs[h]=fn(h); console.log(nm,h); }
  const ks=[...runs[0].keys()].sort((a,b)=>a-b); const T0=ks[0], T1=ks[ks.length-1]+1, TM=Math.round((T0+T1)/2/DAY)*DAY, L12=T1-365*DAY;
  const per=[['tümü',T0,T1],['1. yarı',T0,TM],['2. yarı',TM,T1],['son 12 ay',L12,T1]];
  L.push(`## ${nm} (${new Date(T0).toISOString().slice(0,10)} → ${new Date(T1).toISOString().slice(0,10)})\n`,'| Kesim | tümü | 1. yarı | 2. yarı | son 12 ay |','|---|---|---|---|---|');
  const S={}; for(const h of SHOW){ S[h]=per.map(([,a,b])=>stats(runs[h],a,b)); L.push(`| ${String(h).padStart(2,'0')} UTC | ${S[h].map(x=>`${f(x.cagr)} / ${f(x.dd)} / ${x.sh.toFixed(2).replace('.',',')}`).join(' | ')} |`); }
  const rng=(k,i)=>{ const v=SHOW.map(h=>S[h][i][k]); return Math.max(...v)-Math.min(...v); };
  L.push(`| **aralık (en iyi − en kötü)** | ${per.map((_,i)=>`${f(rng('cagr',i))} puan / ${f(rng('dd',i))} puan / ${rng('sh',i).toFixed(2).replace('.',',')}`).join(' | ')} |`);
  for(const [lab,hs] of [['2 parça (00+12)',[0,12]],['3 parça (00+08+16)',[0,8,16]],['4 parça (00+06+12+18)',[0,6,12,18]]]){ const b=blend(runs,hs);
    L.push(`| ${lab} | ${per.map(([,a,c])=>{ const x=stats(b,a,c); return `${f(x.cagr)} / ${f(x.dd)} / ${x.sh.toFixed(2).replace('.',',')}`; }).join(' | ')} |`); }
  // kesimler arası günlük getiri korelasyonu (00 ↔ 12)
  const r=h=>{ const k=[...runs[h].keys()].sort((a,b)=>a-b); return new Map(k.slice(1).map((t,i)=>[t,runs[h].get(t)/runs[h].get(k[i])-1])); };
  const a=r(0), b=r(12); const kk=[...a.keys()].filter(t=>b.has(t)); const xa=kk.map(t=>a.get(t)), xb=kk.map(t=>b.get(t)); const ma=xa.reduce((p,q)=>p+q,0)/kk.length, mb=xb.reduce((p,q)=>p+q,0)/kk.length;
  const c=kk.reduce((p,_,i)=>p+(xa[i]-ma)*(xb[i]-mb),0)/Math.sqrt(xa.reduce((p,q)=>p+(q-ma)**2,0)*xb.reduce((p,q)=>p+(q-mb)**2,0));
  L.push('',`00 ↔ 12 UTC kesimlerinin günlük getiri korelasyonu ${c.toFixed(2).replace('.',',')}.\n`); }
fs.writeFileSync(path.join(__dirname,'test100-kesim-saati-report.md'),L.join('\n')+'\n'); console.log(L.join('\n'));
