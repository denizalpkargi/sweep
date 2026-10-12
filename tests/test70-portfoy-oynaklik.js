// Test #70 (12 Ekim 2026, günlük döngü): sepetler arası portföy oynaklık hedefi + kaldıraç tavanı (Xenith tarzı).
// Kaplumbağa (src/turtle.js) ve Ichimoku (src/ichi.js) sepetleri canlı kodla, ichi-test.js --replay döngüsüyle; veri arşivden (tests/data/arch):
// ayın ilk 50 coini (universe.json, TradFi hariç; sm-aday evrenine yakın), Ichimoku için 1 sa mumlardan 4 sa, Kaplumbağa 1 g, fonlama arşiv.
// Kalite short sepeti bu turda yok (kalite tahmin dosyaları bu ortamda yok). Portföy: iki sepetin günlük getirilerinin eşit ağırlıklısı.
// Önceden sabit: hedef yıllık oynaklık %10 / %15 / %20 (veride seçilmez), çarpan = hedef ÷ (son 20 günün portföy oynaklığı × √365), en çok 1,25,
// dünkü veriyle; çarpan değişimi maliyeti: |Δçarpan| × %0,08 (taker + kayma). Kıyas sabit boy (1×). Beklenti: R değil, düşüş ve bileşik getiri.
// Geçme: bir hedef iki yarıda ve son 12 ayda Sharpe'ı sabit boydan iyi ve en büyük düşüşü küçük.
// Kullanım: node --max-old-space-size=6000 tests/test70-portfoy-oynaklik.js → tests/test70-portfoy-oynaklik-report.md
const fs=require('fs'), path=require('path'); const {loadEngine}=require('./engine-node.js');
const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const A=path.join(__dirname,'data','arch'), DAY=864e5, H4=E.IC_TF;
const TR=new Set(fs.readFileSync(path.join(__dirname,'..','src','turtle.js'),'utf8').match(/TT_TRADFI=new Set\("([^"]+)"/)[1].split(' ').map(s=>s+'USDT'));
const UM=JSON.parse(fs.readFileSync(path.join(A,'universe.json'),'utf8')).months; const U={};
for(const m in UM){ const [y,mo]=m.split('-').map(Number); U[y*12+mo-1]=UM[m].filter(s=>!TR.has(s)).slice(0,50); }
const MON=t=>{ const x=new Date(t); return x.getUTCFullYear()*12+x.getUTCMonth(); };
const syms=[...new Set(Object.values(U).flat())];
const rd=(iv,s)=>{ const f=path.join(A,iv,s+'.csv'); if(!fs.existsSync(f)) return null; return fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }); };
const D4={}, D1={}, FR={};
for(const s of syms){ const h=rd('1h',s); if(h&&h.length){ const o=[]; for(const b of h){ const t=Math.floor(b.t/H4)*H4, L=o[o.length-1]; if(L&&L.t===t){ L.h=Math.max(L.h,b.h); L.l=Math.min(L.l,b.l); L.c=b.c; L.q+=b.q; L.n++; } else o.push({t,o:b.o,h:b.h,l:b.l,c:b.c,q:b.q,n:1}); } D4[s]=o.filter(b=>b.n===4&&b.q>0); }
  const d=rd('1d',s); if(d&&d.length) D1[s]=d.filter(x=>x.q>0);
  const f=path.join(A,'funding',s+'.csv'); if(fs.existsSync(f)){ const m=new Map(); for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); m.set(Math.round(+t/(8*36e5)),+r); } FR[s]=m; } }
const ix=D=>{ const o={}; for(const k in D) o[k]=new Map(D[k].map((b,i)=>[b.t,i])); return o; }; const I4=ix(D4), I1=ix(D1);
const t0=Date.UTC(2020,5,1), t1=Math.min(D4.BTCUSDT[D4.BTCUSDT.length-1].t, D1.BTCUSDT[D1.BTCUSDT.length-1].t);
function runIchi(){ const s=E.icNew({}); const daily=new Map();
  for(let T=Date.UTC(2020,1,1);T<=t1;T+=H4){
    for(const k of Object.keys(s.pos)){ const i=I4[k]&&I4[k].get(T); if(i!=null){ E.icIntra(s,k,D4[k][i],T); if(s.pos[k]){ s.pos[k].px=D4[k][i].c; if(i===D4[k].length-1) E.icExit(s,k,D4[k][i].c,'listeden çıktı',T+H4); } } }
    const univ=(U[MON(T)]||[]).filter(k=>I4[k]&&I4[k].has(T)); const need=new Set([...univ,...Object.keys(s.pos)]); const data={}, px={}, fr={};
    for(const k of need){ const i=I4[k]&&I4[k].get(T); if(i==null) continue; data[k]=D4[k].slice(Math.max(0,i-90),i+1); const nx=D4[k][i+1]; if(nx&&nx.t===T+H4) px[k]=nx.o; }
    E.icClose(s,data,univ,px,T+H4,T+H4);
    for(const k in s.pos){ const m=FR[k]; const key=Math.round((T+H4)/(8*36e5)); fr[k]=m&&m.has(key)?m.get(key):0; }
    if(!s.fundT) s.fundT=Math.floor(T/(8*36e5))*8*36e5; E.icFund(s,null,T+H4+1,fr); s.trades.length=0;
    if((T+H4)%DAY===0) daily.set(T+H4,E.icEq(s,null)); }
  return daily; }
function runTurtle(){ const s=E.ttNew({fee:0.0005,slip:0.0003}); const daily=new Map();
  for(let t=t0;t<t1;t+=DAY){
    for(const k of Object.keys(s.pos)){ const i=I1[k]&&I1[k].get(t); if(i!=null) E.ttIntraday(s,k,D1[k][i],t); }
    const univ=(U[MON(t)]||[]).filter(k=>I1[k]&&I1[k].has(t)); const need=new Set([...univ,...Object.keys(s.pos),'BTCUSDT']); const data={}, px={};
    for(const k of need){ const i=I1[k]&&I1[k].get(t); if(i==null||i<130) continue; data[k]=D1[k].slice(Math.max(0,i-215),i+1); const nx=D1[k][i+1]; if(nx) px[k]=nx.o; }
    for(const k of Object.keys(s.pos)){ const i=I1[k]&&I1[k].get(t); if(i!=null&&i===D1[k].length-1) E.ttExit(s,k,D1[k][i].c,'listeden çıktı',t); }
    E.ttClose(s,data,univ,px,t+DAY);
    for(const k of Object.keys(s.pos)){ const i=I1[k]&&I1[k].get(t); if(i!=null) s.pos[k].px=D1[k][i].c; }
    daily.set(t+DAY,E.ttEq(s,null)); }
  return daily; }
const di=runIchi(), dt=runTurtle(); console.log('sepetler oynatıldı');
const days=[...dt.keys()].filter(t=>di.has(t)&&di.has(t-DAY)&&dt.has(t-DAY)).sort((a,b)=>a-b);
const R=days.map(t=>({t,i:di.get(t)/di.get(t-DAY)-1,k:dt.get(t)/dt.get(t-DAY)-1})); R.forEach(x=>x.p=(x.i+x.k)/2);
const SPLIT=R[Math.floor(R.length/2)].t, L12=R[R.length-1].t-365*DAY;
function overlay(key,tgt){ const out=[]; let m=1;
  for(let j=0;j<R.length;j++){ let mm=1; if(tgt){ if(j>=20){ const w=R.slice(j-20,j).map(x=>x[key]); const mu=w.reduce((a,b)=>a+b,0)/20; const sd=Math.sqrt(w.reduce((a,b)=>a+(b-mu)**2,0)/19)*Math.sqrt(365); mm=sd>0?Math.min(1.25,tgt/sd):1.25; } else mm=1; }
    const cost=tgt?Math.abs(mm-m)*0.0008:0; m=mm; out.push({t:R[j].t,r:mm*R[j][key]-cost,m:mm}); }
  return out; }
function stats(o,f){ const a=o.filter(f); if(a.length<30) return null; let eq=1,pk=1,dd=0; for(const x of a){ eq*=1+x.r; pk=Math.max(pk,eq); dd=Math.min(dd,eq/pk-1); }
  const mu=a.reduce((p,x)=>p+x.r,0)/a.length, sd=Math.sqrt(a.reduce((p,x)=>p+(x.r-mu)**2,0)/(a.length-1)); const yrs=a.length/365;
  return {cagr:Math.pow(Math.max(eq,1e-9),1/yrs)-1,dd,sh:sd>0?mu/sd*Math.sqrt(365):NaN,vol:sd*Math.sqrt(365),m:a.reduce((p,x)=>p+x.m,0)/a.length}; }
const fx=(x,d=0)=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(d).replace('.',','):'–';
const P=[[()=>true,'tümü'],[x=>x.t<SPLIT,'1. yarı'],[x=>x.t>=SPLIT,'2. yarı'],[x=>x.t>=L12,'son 12 ay']];
let md=`# Test #70 · Sepetler arası portföy oynaklık hedefi (arşiv, canlı kod)\n\n12 Ekim 2026 · \`node tests/test70-portfoy-oynaklik.js\` · Kaplumbağa + Ichimoku, ayın ilk 50 coini, ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[R.length-1].t).toISOString().slice(0,10)}, yarı ${new Date(SPLIT).toISOString().slice(0,10)}. Kalite short sepeti yok (tahmin dosyaları bu ortamda yok). Çarpan = hedef ÷ son 20 g oynaklık, en çok 1,25, dünkü veriyle, değişim maliyeti %0,08.\n\n`;
const corr=(()=>{ const a=R.map(x=>x.i), b=R.map(x=>x.k); const ma=a.reduce((p,q)=>p+q,0)/a.length, mb=b.reduce((p,q)=>p+q,0)/b.length; let s=0,sa=0,sb=0; for(let j=0;j<a.length;j++){ s+=(a[j]-ma)*(b[j]-mb); sa+=(a[j]-ma)**2; sb+=(b[j]-mb)**2; } return s/Math.sqrt(sa*sb); })();
md+=`Günlük getiri korelasyonu Ichimoku ↔ Kaplumbağa: ${corr.toFixed(2).replace('.',',')}.\n\n| seri | boy | dönem | yıllık % | düşüş % | Sharpe | oynaklık % | ort. çarpan |\n|---|---|---|---:|---:|---:|---:|---:|\n`;
const res={};
for(const [key,nm] of [['p','portföy (½ + ½)'],['k','Kaplumbağa'],['i','Ichimoku']]) for(const tgt of [0,0.10,0.15,0.20]){ const o=overlay(key,tgt); res[key+tgt]=P.map(([f])=>stats(o,f));
  P.forEach(([f,pn],q)=>{ const s=res[key+tgt][q]; if(s) md+=`| ${nm} | ${tgt?'hedef %'+tgt*100:'sabit 1×'} | ${pn} | ${fx(100*s.cagr)} | ${fx(100*s.dd)} | ${fx(s.sh,2)} | ${fx(100*s.vol)} | ${s.m.toFixed(2).replace('.',',')} |\n`; }); }
const pass=[0.10,0.15,0.20].filter(g=>[1,2,3].every(q=>res['p'+g][q].sh>res.p0[q].sh&&res['p'+g][q].dd>res.p0[q].dd));
md+=`\nGeçme (portföy; hedef iki yarıda ve son 12 ayda Sharpe'ı ve düşüşü sabit boydan iyi): ${pass.length?pass.map(g=>'**%'+g*100+'**').join(', '):'**yok**'}.\n`;
fs.writeFileSync(path.join(__dirname,'test70-portfoy-oynaklik-report.md'),md); console.log(md);
