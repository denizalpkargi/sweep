// Test #105: Kaplumbağa girişinde coin/BTC kırılımı şartı (16 Kasım taraması; hisselerde artık momentum). Canlı kod (src/turtle.js ttClose/ttIntraday),
// turtle-test.js --replay döngüsü (arşiv 1g, ayın ilk 50'si, 2020-06 →). ttClose evren sırasına göre girer; evren listesi süzülür ya da sıralanır:
//   a) bugün; b) ek şart: coin/BTC kapanış oranı önceki 20 günün en yüksek oranını geçmiş (BTC kendisi bu şartı geçemez);
//   c) şart yok, ama oranı kırılmış coinler önce (sıra içinde bugünkü sıra korunur). Oran kapanışla, 20 = giriş penceresi (seçilmedi).
//   Rastgele: her gün karıştırılmış sıra, 200 tekrar (#101 gibi). Kullanım: node tests/test105-kaplumbaga-coinbtc.js
const path=require('path'), fs=require('fs'); const {loadEngine}=require('./engine-node.js');
const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const DAY=864e5, ARCH=path.join(__dirname,'data','arch'), TOP=50;
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)))];
const D={}; for(const sym of syms){ const f=path.join(ARCH,'1d',sym+'.csv'); if(!fs.existsSync(f)) continue; D[sym]=fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); }
const idx={}; for(const k in D) idx[k]=new Map(D[k].map((b,i)=>[b.t,i]));
const lr=(k,i,n)=>{ const a=D[k], r=[]; for(let j=i-n+1;j<=i;j++) r.push(Math.log(a[j].c/a[j-1].c)); return r; };
const sd=r=>{ const m=r.reduce((x,y)=>x+y,0)/r.length; return Math.sqrt(r.reduce((x,y)=>x+(y-m)**2,0)/r.length); };
const corr=(a,b)=>{ const ma=a.reduce((x,y)=>x+y,0)/a.length, mb=b.reduce((x,y)=>x+y,0)/b.length; let c=0,va=0,vb=0; for(let i=0;i<a.length;i++){ c+=(a[i]-ma)*(b[i]-mb); va+=(a[i]-ma)**2; vb+=(b[i]-mb)**2; } return va&&vb?c/Math.sqrt(va*vb):0; };
const t0=Date.UTC(2020,5,1), t1=D.BTCUSDT[D.BTCUSDT.length-1].t;
let seed=101; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
let busy=0, days=0;
function run(order){ const s=E.ttNew({fee:0.0005,slip:0.0003}); const eq=[];
  for(let t=t0;t<t1;t+=DAY){
    for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) E.ttIntraday(s,k,D[k][i],t); }
    const m=new Date(t).toISOString().slice(0,7); let univ=(U[m]||[]).slice(0,TOP).filter(k=>idx[k]&&idx[k].has(t));
    const need=new Set([...univ,...Object.keys(s.pos),'BTCUSDT']); const data={}, px={};
    for(const k of need){ const i=idx[k]&&idx[k].get(t); if(i==null||i<130) continue; data[k]=D[k].slice(Math.max(0,i-215),i+1); const nx=D[k][i+1]; if(nx) px[k]=nx.o; }
    for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null&&i===D[k].length-1) E.ttExit(s,k,D[k][i].c,'listeden çıktı',t); }
    if(order) univ=order(univ,t,s);
    E.ttClose(s,data,univ,px,t+DAY);
    for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) s.pos[k].px=D[k][i].c; }
    eq.push([t,E.ttEq(s,null)]); }
  return {eq,n:s.trades.length}; }

const BCm=new Map(D.BTCUSDT.map(b=>[b.t,b.c]));
const rb=(k,t)=>{ const i=idx[k].get(t); if(i==null||i<21||k==='BTCUSDT') return false; const r=j=>{ const b=BCm.get(D[k][j].t); return b?D[k][j].c/b:null; }; const now=r(i); if(now==null) return false; let m=-Infinity; for(let j=i-20;j<i;j++){ const v=r(j); if(v!=null) m=Math.max(m,v); } return now>m; };
const ORD={
  'a) bugün':null,
  'b) coin/BTC kırılımı şartı':(u,t)=>u.filter(k=>rb(k,t)),
  'c) coin/BTC kırılımı olanlar önce':(u,t)=>{ const a=u.filter(k=>rb(k,t)); return a.concat(u.filter(k=>!a.includes(k))); },
};
const TM=Math.round((t0+t1)/2/DAY)*DAY, L12=t1-365*DAY;
const per=[['tümü',t0,t1],['1. yarı',t0,TM],['2. yarı',TM,t1],['son 12 ay',L12,t1]];
function st(eq,a,b){ const x=eq.filter(([t])=>t>=a&&t<b); let pk=x[0][1],dd=0; const r=[]; for(let i=1;i<x.length;i++){ r.push(x[i][1]/x[i-1][1]-1); pk=Math.max(pk,x[i][1]); dd=Math.min(dd,x[i][1]/pk-1); }
  const m=r.reduce((p,q)=>p+q,0)/r.length, s=sd(r); return {cagr:((x[x.length-1][1]/x[0][1])**(365/r.length)-1)*100,dd:dd*100,sh:s>0?m/s*Math.sqrt(365):0}; }
const f=(x,d=0)=>(x>=0?'+':'')+x.toFixed(d).replace('.',','), g=x=>x.toFixed(2).replace('.',',');
const L=['# Test #105: Kaplumbağa girişinde coin/BTC kırılımı şartı\n',
 `Canlı kod (src/turtle.js), arşiv 1g, ayın ilk ${TOP} coini, ${new Date(t0).toISOString().slice(0,10)} → ${new Date(t1).toISOString().slice(0,10)}, %0,5 risk · 10 pozisyon · 2×, taker + kayma (turtle-test.js --replay ile aynı; fonlama varsayılan). Yalnız evren listesi süzülür ya da sıralanır. Hücre: yıllık % / düşüş % / Sharpe.\n`,
 '| Sıra | işlem | tümü | 1. yarı | 2. yarı | son 12 ay |','|---|---|---|---|---|---|'];
const RES={};
for(const [nm,o] of Object.entries(ORD)){ const r=run(o); RES[nm]=per.map(([,a,b])=>st(r.eq,a,b)); L.push(`| ${nm} | ${r.n} | ${RES[nm].map(x=>`${f(x.cagr)} / ${f(x.dd)} / ${g(x.sh)}`).join(' | ')} |`); console.log(nm); }
const RS=per.map(()=>[]);
for(let k=0;k<200;k++){ const r=run(u=>{ const a=u.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }); per.forEach(([,a,b],i)=>RS[i].push(st(r.eq,a,b))); if(k%20===0) console.log('rastgele',k); }
const q=(a,p)=>{ const s=[...a].sort((x,y)=>x-y); return s[Math.floor(p*(s.length-1))]; };
for(const [lab,p] of [['rastgele %5',0.05],['rastgele medyan',0.5],['rastgele %95',0.95]]) L.push(`| ${lab} | | ${RS.map(a=>`${f(q(a.map(x=>x.cagr),p))} / ${f(q(a.map(x=>x.dd),p))} / ${g(q(a.map(x=>x.sh),p))}`).join(' | ')} |`);
L.push('','## Rastgele dağılımda yüzdelik (Sharpe)\n','| Sıra | tümü | 1. yarı | 2. yarı | son 12 ay |','|---|---|---|---|---|');
for(const nm in RES) L.push(`| ${nm} | ${RES[nm].map((x,i)=>'%'+Math.round(RS[i].filter(y=>y.sh<x.sh).length/RS[i].length*100)).join(' | ')} |`);
fs.writeFileSync(path.join(__dirname,'test105-kaplumbaga-coinbtc-report.md'),L.join('\n')+'\n'); console.log(L.join('\n'));
