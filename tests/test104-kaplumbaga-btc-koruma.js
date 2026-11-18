// Test #104: Kaplumbağa açık longlarını BTC short ile korumak (16 Kasım taraması; Quantpedia 2024, Sila vd. 2025).
// Canlı kod (src/turtle.js), turtle-test.js --replay / test101 döngüsü (arşiv 1g, ayın ilk 50'si, 2020-06 →, fonlama varsayılan). Kaplumbağa bir kez oynatılır;
// koruma üstüne eklenen ayrı bir BTC perp short hesabıdır (Kaplumbağa'nın boyunu değiştirmez). t günü kapanışında H_t = Σ açık long nominali × beta
// (1:1 ya da coinin son 60 günlük BTC betası, [0, 2] kırpılmış) kadar short, koşul geçerken; t+1 kapanışına kadar tutulur.
// Getiri −H·(BTC c_{t+1}/c_t − 1) + H·Σ fonlama (short alır), maliyet |H_t − H_{t−1}·c_t/c_{t−1}| × (taker %0,05 + kayma %0,03).
// Koşul (önceden): A) BTC kapanışı son 20 kapanışın tepesi değil (x = 20, seçilmedi); B) BTC < SMA200; C) her zaman (bilgi).
// Rastgele: A ile aynı açık gün payı ve geçiş sayısında Markov koşulu, 200 tekrar (1:1). Kullanım: node tests/test104-kaplumbaga-btc-koruma.js
const path=require('path'), fs=require('fs'); const {loadEngine}=require('./engine-node.js');
const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const DAY=864e5, ARCH=path.join(__dirname,'data','arch'), TOP=50;
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)))];
const D={}; for(const sym of syms){ const f=path.join(ARCH,'1d',sym+'.csv'); if(!fs.existsSync(f)) continue; D[sym]=fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); }
const idx={}; for(const k in D) idx[k]=new Map(D[k].map((b,i)=>[b.t,i]));
const t0=Date.UTC(2020,5,1), t1=D.BTCUSDT[D.BTCUSDT.length-1].t;
// BTC kapanış (eksik gün önceki kapanışla) ve günlük fonlama toplamı
const BC=new Map(); { let last=null; for(let t=D.BTCUSDT[0].t;t<=t1;t+=DAY){ const i=idx.BTCUSDT.get(t); if(i!=null) last=D.BTCUSDT[i].c; BC.set(t,last); } }
const FR=new Map(); for(const l of fs.readFileSync(path.join(ARCH,'funding','BTCUSDT.csv'),'utf8').trim().split('\n')){ const [t,r]=l.split(',').map(Number); const d=Math.floor((t-1)/DAY)*DAY; FR.set(d,(FR.get(d)||0)+r); } // (t gününden t+1'e) ödemeler
const beta=(k,t)=>{ const i=idx[k]&&idx[k].get(t); if(i==null||i<61) return 1; const x=[],y=[]; for(let j=i-59;j<=i;j++){ const tb=D[k][j].t, a=BC.get(tb), b=BC.get(tb-DAY); if(!a||!b) continue; x.push(a/b-1); y.push(D[k][j].c/D[k][j-1].c-1); }
  const mx=x.reduce((p,q)=>p+q,0)/x.length, my=y.reduce((p,q)=>p+q,0)/y.length; let c=0,v=0; for(let j=0;j<x.length;j++){ c+=(x[j]-mx)*(y[j]-my); v+=(x[j]-mx)**2; } return v>0?Math.max(0,Math.min(2,c/v)):1; };
// Kaplumbağa bir kez
const s=E.ttNew({fee:0.0005,slip:0.0003}); const days=[];
for(let t=t0;t<t1;t+=DAY){
  for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) E.ttIntraday(s,k,D[k][i],t); }
  const m=new Date(t).toISOString().slice(0,7); const univ=(U[m]||[]).slice(0,TOP).filter(k=>idx[k]&&idx[k].has(t));
  const need=new Set([...univ,...Object.keys(s.pos),'BTCUSDT']); const data={}, px={};
  for(const k of need){ const i=idx[k]&&idx[k].get(t); if(i==null||i<130) continue; data[k]=D[k].slice(Math.max(0,i-215),i+1); const nx=D[k][i+1]; if(nx) px[k]=nx.o; }
  for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null&&i===D[k].length-1) E.ttExit(s,k,D[k][i].c,'listeden çıktı',t); }
  E.ttClose(s,data,univ,px,t+DAY);
  for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) s.pos[k].px=D[k][i].c; }
  let n1=0,nb=0; for(const k in s.pos){ const v=s.pos[k].qty*s.pos[k].px; n1+=v; nb+=v*beta(k,t); }
  days.push({t,eq:E.ttEq(s,null),n1,nb}); }
console.log('kaplumbağa', s.trades.length);
const condA=t=>{ const c=BC.get(t); for(let j=0;j<20;j++) if(BC.get(t-j*DAY)>c) return true; return false; };
const condB=t=>{ let z=0; for(let j=0;j<200;j++) z+=BC.get(t-j*DAY); return BC.get(t)<z/200; };
const COST=0.0008;
function hedge(on,useBeta){ const out=[]; let cum=0, Hp=0, tp=null, hp=0;
  for(const d of days){ const c=BC.get(d.t);
    if(tp!=null&&Hp>0){ const c0=BC.get(tp); cum+=-Hp*(c/c0-1)+Hp*(FR.get(tp)||0); }
    const H=on(d.t)?(useBeta?d.nb:d.n1):0; const drift=tp!=null?Hp*c/BC.get(tp):0; cum-=Math.abs(H-drift)*COST; hp+=H>0?1:0;
    out.push([d.t,d.eq+cum,cum]); Hp=H; tp=d.t; }
  return {eq:out,cum,onShare:hp/days.length}; }
const sd=r=>{ const m=r.reduce((x,y)=>x+y,0)/r.length; return Math.sqrt(r.reduce((x,y)=>x+(y-m)**2,0)/r.length); };
const TM=Math.round((t0+t1)/2/DAY)*DAY, L12=t1-365*DAY;
const per=[['tümü',t0,t1],['1. yarı',t0,TM],['2. yarı',TM,t1],['son 12 ay',L12,t1]];
function st(eq,a,b){ const x=eq.filter(([t])=>t>=a&&t<b); let pk=x[0][1],dd=0; const r=[]; for(let i=1;i<x.length;i++){ r.push(x[i][1]/x[i-1][1]-1); pk=Math.max(pk,x[i][1]); dd=Math.min(dd,x[i][1]/pk-1); }
  const m=r.reduce((p,q)=>p+q,0)/r.length, v=sd(r); return {cagr:((x[x.length-1][1]/x[0][1])**(365/r.length)-1)*100,dd:dd*100,sh:v>0?m/v*Math.sqrt(365):0}; }
const f=(x,d=0)=>(x>=0?'+':'')+x.toFixed(d).replace('.',','), g=x=>x.toFixed(2).replace('.',',');
const base=days.map(d=>[d.t,d.eq,0]);
const V={'korumasız (bugün)':{eq:base,cum:0,onShare:0},
 'A · 20 g tepede değilken · 1:1':hedge(condA,false),'A · 20 g tepede değilken · beta':hedge(condA,true),
 'B · BTC < SMA200 · 1:1':hedge(condB,false),'B · BTC < SMA200 · beta':hedge(condB,true),
 'C · her zaman · 1:1 (bilgi)':hedge(()=>true,false),'C · her zaman · beta (bilgi)':hedge(()=>true,true)};
const L=['# Test #104: Kaplumbağa açık longlarını BTC short ile korumak\n',
 `Canlı kod (src/turtle.js), arşiv 1g, ayın ilk ${TOP}'si, ${new Date(t0).toISOString().slice(0,10)} → ${new Date(t1).toISOString().slice(0,10)}, %0,5 risk · 10 pozisyon · 2×, taker + kayma, Kaplumbağa ${s.trades.length} işlem. Koruma ayrı BTC perp short: açık long nominali × (1 ya da 60 g beta, [0,2]), gün kapanışında ayarlanır, fonlama arşivden, taker + kayma. Hücre: yıllık % / düşüş % / Sharpe. Koşul ve x = 20 önceden; seçim yok.\n`,
 '| Varyant | korumalı gün | korumanın toplam katkısı ($, 100 $ başlangıç) | tümü | 1. yarı | 2. yarı | son 12 ay |','|---|---|---|---|---|---|---|'];
const R={};
for(const [nm,v] of Object.entries(V)){ R[nm]=per.map(([,a,b])=>st(v.eq,a,b)); L.push(`| ${nm} | %${Math.round(v.onShare*100)} | ${f(v.cum,1)} | ${R[nm].map(x=>`${f(x.cagr)} / ${f(x.dd)} / ${g(x.sh)}`).join(' | ')} |`); }
// rastgele Markov koşulu (A'nın açık payı ve geçiş sayısı), 1:1
const aOn=days.map(d=>condA(d.t)?1:0); const pOn=aOn.reduce((a,b)=>a+b,0)/aOn.length; let sw=0; for(let i=1;i<aOn.length;i++) if(aOn[i]!==aOn[i-1]) sw++;
const pOff=sw/2/aOn.reduce((a,b)=>a+b,0), pUp=sw/2/(aOn.length-aOn.reduce((a,b)=>a+b,0));
let seed=104; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
const RS=per.map(()=>[]);
for(let k=0;k<200;k++){ const mp=new Map(); let v=rnd()<pOn?1:0; for(const d of days){ mp.set(d.t,v); if(v&&rnd()<pOff) v=0; else if(!v&&rnd()<pUp) v=1; } const h=hedge(t=>mp.get(t)===1,false); per.forEach(([,a,b],i)=>RS[i].push(st(h.eq,a,b))); }
const q=(a,p)=>{ const z=[...a].sort((x,y)=>x-y); return z[Math.floor(p*(z.length-1))]; };
for(const [lab,p] of [['rastgele (A gibi) %5',0.05],['rastgele medyan',0.5],['rastgele %95',0.95]]) L.push(`| ${lab} | koşul %${Math.round(pOn*100)} | | ${RS.map(a=>`${f(q(a.map(x=>x.cagr),p))} / ${f(q(a.map(x=>x.dd),p))} / ${g(q(a.map(x=>x.sh),p))}`).join(' | ')} |`);
L.push('','## Rastgele dağılımda yüzdelik (Sharpe; düşüş)\n','| Varyant | tümü | 1. yarı | 2. yarı | son 12 ay |','|---|---|---|---|---|');
for(const nm of Object.keys(V).filter(n=>n.startsWith('A')||n.startsWith('B'))) L.push(`| ${nm} | ${R[nm].map((x,i)=>`%${Math.round(RS[i].filter(y=>y.sh<x.sh).length/2)}; %${Math.round(RS[i].filter(y=>y.dd<x.dd).length/2)}`).join(' | ')} |`);
L.push('','Yıllık katkı: korumanın kendi kârı/zararı (sütun 3) Kaplumbağa özkaynağına eklenir; Kaplumbağa boyu korumadan etkilenmez.');
fs.writeFileSync(path.join(__dirname,'test104-kaplumbaga-btc-koruma-report.md'),L.join('\n')+'\n'); console.log(L.join('\n'));
