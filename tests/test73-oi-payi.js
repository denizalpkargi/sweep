// Test #73 (13 Ekim 2026, günlük döngü): altcoin OI payı rejim süzgeci (Delphi Digital fikri).
// Pay = ayın ilk 30 coini (TradFi hariç, universe.json) içinde BTC/ETH dışı açık pozisyon değeri ÷ toplam; arşiv metrics 5 dk sumOpenInterestValue, her gün 00:00 UTC'deki son değer.
// Önceden sabit: önceki 365 günün dağılımında üst %10 (dünkü değerle) → "kalabalık altcoin" günü; kural bu günlerde altcoin longları yarı boy.
// Sınanan longlar: Kaplumbağa 1 long + BTC SMA200 (daily-wide-trades.json, 801 işlem, R) ve Ichimoku sepetinin longları (canlı kod, test70 döngüsü, R).
// Geçme: işaretli günlerde açılan longlar diğerlerinden iki yarıda ve son 12 ayda kötü ve yarı boy portföyün ort. R'sini (boy ağırlıklı toplam R ÷ işlem) üç dönemde de artırıyor.
// Kullanım: node --max-old-space-size=6000 tests/test73-oi-payi.js → tests/test73-oi-payi-report.md
const fs=require('fs'), path=require('path'); const A=path.join(__dirname,'data','arch'), DAY=864e5;
const UM=JSON.parse(fs.readFileSync(path.join(A,'universe.json'),'utf8')); const TF=new Set(UM.tradfi||[]);
const top30={}; for(const m in UM.months) top30[m]=UM.months[m].filter(s=>!TF.has(s)).slice(0,30);
const mk=t=>new Date(t).toISOString().slice(0,7);
const oiDay={}; // sym -> Map(day -> value at last 5m <= day)
for(const s of new Set(Object.values(top30).flat())){ const f=path.join(A,'metrics',s+'.csv'); if(!fs.existsSync(f)) continue; const m=new Map();
  for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const a=l.split(','); const t=+a[0], v=+a[2]; if(!(v>0)) continue; m.set(Math.floor(t/DAY)*DAY+DAY, v); } oiDay[s]=m; }
const share=new Map(); let t0=Infinity,t1=0; for(const s in oiDay) for(const t of oiDay[s].keys()){ t0=Math.min(t0,t); t1=Math.max(t1,t); }
for(let t=t0;t<=t1;t+=DAY){ const u=top30[mk(t-DAY)]||[]; let all=0,alt=0,n=0, hasB=false, hasE=false; for(const s of u){ const v=oiDay[s]&&oiDay[s].get(t); if(!v) continue; all+=v; n++; if(s==='BTCUSDT') hasB=true; else if(s==='ETHUSDT') hasE=true; else alt+=v; }
  if(n>=15&&hasB&&hasE) share.set(t,{p:alt/all,n}); }
const days=[...share.keys()].sort((a,b)=>a-b); const flag=new Map(), pct=new Map();
for(let i=0;i<days.length;i++){ const t=days[i]; const w=days.filter(d=>d<t&&d>=t-365*DAY).map(d=>share.get(d).p); if(w.length<300) continue; const y=share.get(t-DAY); if(!y) continue; const q=w.filter(x=>x<y.p).length/w.length; pct.set(t,q); flag.set(t,q>=+(process.env.Q||0.9)); }
const dayOf=t=>Math.floor(t/DAY)*DAY;
// Kaplumbağa longları
const DW=JSON.parse(fs.readFileSync(path.join(A,'daily-wide-trades.json'),'utf8')); const T1=Object.values(DW).find(v=>v.name==='T1'&&v.d===1&&!v.pyr&&v.filt);
const turtle=T1.tr.filter(x=>x[0]!=='BTCUSDT'&&x[0]!=='ETHUSDT').map(x=>({sym:x[0],t:x[1],R:x[3]}));
// Ichimoku longları (canlı kod)
const {loadEngine}=require('./engine-node.js'); const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const H4=E.IC_TF; const TR=new Set(fs.readFileSync(path.join(__dirname,'..','src','turtle.js'),'utf8').match(/TT_TRADFI=new Set\("([^"]+)"/)[1].split(' ').map(s=>s+'USDT'));
const U={}; for(const m in UM.months){ const [y,mo]=m.split('-').map(Number); U[y*12+mo-1]=UM.months[m].filter(s=>!TR.has(s)).slice(0,50); }
const MON=t=>{ const x=new Date(t); return x.getUTCFullYear()*12+x.getUTCMonth(); };
const D4={}, FR={}; for(const s of new Set(Object.values(U).flat())){ const f=path.join(A,'1h',s+'.csv'); if(!fs.existsSync(f)) continue; const o=[];
  for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const a=l.split(','); const b={t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; const t=Math.floor(b.t/H4)*H4, L=o[o.length-1]; if(L&&L.t===t){ L.h=Math.max(L.h,b.h); L.l=Math.min(L.l,b.l); L.c=b.c; L.q+=b.q; L.n++; } else o.push({t,o:b.o,h:b.h,l:b.l,c:b.c,q:b.q,n:1}); }
  D4[s]=o.filter(b=>b.n===4&&b.q>0); const ff=path.join(A,'funding',s+'.csv'); if(fs.existsSync(ff)){ const m=new Map(); for(const l of fs.readFileSync(ff,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); m.set(Math.round(+t/(8*36e5)),+r); } FR[s]=m; } }
const I4={}; for(const k in D4) I4[k]=new Map(D4[k].map((b,i)=>[b.t,i])); const tEnd=D4.BTCUSDT[D4.BTCUSDT.length-1].t;
const ichi=[]; { const s=E.icNew({});
  for(let T=Date.UTC(2020,1,1);T<=tEnd;T+=H4){
    for(const k of Object.keys(s.pos)){ const i=I4[k]&&I4[k].get(T); if(i!=null){ E.icIntra(s,k,D4[k][i],T); if(s.pos[k]){ s.pos[k].px=D4[k][i].c; if(i===D4[k].length-1) E.icExit(s,k,D4[k][i].c,'listeden çıktı',T+H4); } } }
    const univ=(U[MON(T)]||[]).filter(k=>I4[k]&&I4[k].has(T)); const need=new Set([...univ,...Object.keys(s.pos)]); const data={}, px={}, fr={};
    for(const k of need){ const i=I4[k]&&I4[k].get(T); if(i==null) continue; data[k]=D4[k].slice(Math.max(0,i-90),i+1); const nx=D4[k][i+1]; if(nx&&nx.t===T+H4) px[k]=nx.o; }
    E.icClose(s,data,univ,px,T+H4,T+H4);
    for(const k in s.pos){ const m=FR[k]; const key=Math.round((T+H4)/(8*36e5)); fr[k]=m&&m.has(key)?m.get(key):0; }
    if(!s.fundT) s.fundT=Math.floor(T/(8*36e5))*8*36e5; E.icFund(s,null,T+H4+1,fr);
    for(const x of s.trades) if(x.dir===1&&x.sym!=='BTCUSDT'&&x.sym!=='ETHUSDT') ichi.push({sym:x.sym,t:x.t,R:x.R}); s.trades.length=0; } }
{ let ep=0,prev=false; for(const t of [...flag.keys()].sort((a,b)=>a-b)){ const f=flag.get(t); if(f&&!prev) ep++; prev=f; } console.log('dönem sayısı',ep); }
console.log('pay günleri',share.size,'işaretli',[...flag.values()].filter(Boolean).length,'Kaplumbağa',turtle.length,'Ichimoku long',ichi.length);
const f2=(x,d=3)=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(d).replace('.',','):'–';
const fl=[...flag.keys()].sort((a,b)=>a-b); const F0=fl[0], FL=fl[fl.length-1], SPLIT=fl[Math.floor(fl.length/2)], L12=FL-365*DAY;
const P=[['tümü',x=>true],['1. yarı',x=>x.t<SPLIT],['2. yarı',x=>x.t>=SPLIT],['son 12 ay',x=>x.t>=L12]];
const st=a=>{ const n=a.length; if(!n) return {n:0}; const m=a.reduce((p,x)=>p+x.R,0)/n; const sd=Math.sqrt(a.reduce((p,x)=>p+(x.R-m)**2,0)/Math.max(1,n-1)); return {n,m,t:m/sd*Math.sqrt(n)}; };
let md=`# Test #73 · Altcoin OI payı rejim süzgeci\n\n13 Ekim 2026 · \`node tests/test73-oi-payi.js\` · pay: ayın ilk 30 coini (TradFi hariç) içinde BTC/ETH dışı açık pozisyon değeri payı, arşiv metrics, günlük ${new Date(days[0]).toISOString().slice(0,10)} → ${new Date(days[days.length-1]).toISOString().slice(0,10)}. İşaret: dünkü pay önceki 365 günün üst %10'unda (${new Date(F0).toISOString().slice(0,10)}'den). Önceden sabit kural: işaretli günde açılan altcoin longu yarı boy.\n\n`;
const ps=days.map(t=>share.get(t).p); md+=`Pay ortalaması %${(ps.reduce((a,b)=>a+b,0)/ps.length*100).toFixed(1).replace('.',',')}, en az %${(Math.min(...ps)*100).toFixed(1).replace('.',',')}, en çok %${(Math.max(...ps)*100).toFixed(1).replace('.',',')}; işaretli gün payı %${([...flag.values()].filter(Boolean).length/flag.size*100).toFixed(1).replace('.',',')}.\n\n`;
const res={};
for(const [nm,tr] of [['Kaplumbağa 1 long + SMA200',turtle],['Ichimoku long',ichi]]){
  md+=`## ${nm}\n\n| dönem | işaretli n | işaretli R | diğer n | diğer R | fark | t (fark) | tam boy ort. R | yarı boy ort. R |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n`; res[nm]=[];
  for(const [pn,f] of P){ const a=tr.filter(x=>flag.has(dayOf(x.t))).filter(f); const on=a.filter(x=>flag.get(dayOf(x.t))), off=a.filter(x=>!flag.get(dayOf(x.t)));
    const A1=st(on), B1=st(off); const se=Math.sqrt((A1.n>1?(on.reduce((p,x)=>p+(x.R-A1.m)**2,0)/(A1.n-1))/A1.n:0)+(B1.n>1?(off.reduce((p,x)=>p+(x.R-B1.m)**2,0)/(B1.n-1))/B1.n:0));
    const full=st(a).m, half=(a.reduce((p,x)=>p+x.R*(flag.get(dayOf(x.t))?0.5:1),0))/a.length; res[nm].push({pn,d:A1.m-B1.m,gain:half-full});
    md+=`| ${pn} | ${A1.n} | ${f2(A1.m)} | ${B1.n} | ${f2(B1.m)} | ${f2(A1.m-B1.m)} | ${f2((A1.m-B1.m)/se,1)} | ${f2(full)} | ${f2(half)} |\n`; }
  md+='\n'; }
const pass=Object.fromEntries(Object.entries(res).map(([k,v])=>[k,v.slice(1).every(x=>x.d<0&&x.gain>0)]));
md+=`## Sonuç\n\nGeçme (işaretli longlar iki yarıda ve son 12 ayda daha kötü ve yarı boy ortalamayı artırıyor): ${Object.entries(pass).map(([k,v])=>`${k} ${v?'**geçti**':'geçmedi'}`).join(', ')}. Yıllık pay serisi ve işaretli günler yalnız ilk 30 coinden (metrics kapsamı); tüm borsa OI'si değil.\n`;
fs.writeFileSync(path.join(__dirname,'test73-oi-payi-report.md'),md); console.log(md);
