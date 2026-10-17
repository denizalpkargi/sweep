// Test #72 (13 Ekim 2026, günlük döngü): deneme sayısı kaydı + deflated Sharpe (Bailey & López de Prado 2014).
// Kaplumbağa ve Ichimoku sepetleri canlı kodla arşivde (test70 ile aynı döngü) günlük getiri → SR, çarpıklık, basıklık, PSR, DSR.
// DSR = Φ( (SR − SR*)·√(T−1) / √(1 − γ3·SR + (γ4−1)/4·SR²) ), SR* = √V·((1−γ)·Φ⁻¹(1−1/N) + γ·Φ⁻¹(1−1/(N·e))).
// V (denemeler arası SR varyansı) bilinmiyor: boş hipotezde tek denemenin SR hatası, V = (1 − γ3·SR + (γ4−1)/4·SR²)/(T−1) (tutucu değil, alt sınır).
// İşlem başı t ile raporlanan adaylar için aynı formülün normal yaklaşığı: DSR ≈ Φ(t − E[max Z_N]).
// N = deneme kaydından (tests/deneme-kaydi.json): aile N ve tüm proje N. Önceden sabit: DSR < 0,5 → sepet varsayılanı değişmez; ≥ 0,95 → çoklu denemeden sağ çıkar.
// Kullanım: node --max-old-space-size=6000 tests/test72-dsr.js → tests/test72-dsr-report.md
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
// normal dağılım
const erf=x=>{ const s=Math.sign(x); x=Math.abs(x); const t=1/(1+0.3275911*x); const y=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x); return s*y; };
const Phi=x=>0.5*(1+erf(x/Math.SQRT2));
const Pinv=p=>{ let lo=-10,hi=10; for(let i=0;i<100;i++){ const m=(lo+hi)/2; if(Phi(m)<p) lo=m; else hi=m; } return (lo+hi)/2; };
const EG=0.5772156649; const EMAX=N=>N<=1?0:(1-EG)*Pinv(1-1/N)+EG*Pinv(1-1/(N*Math.E));
function mom(a){ const n=a.length, mu=a.reduce((p,x)=>p+x,0)/n; let m2=0,m3=0,m4=0; for(const x of a){ const d=x-mu; m2+=d*d; m3+=d**3; m4+=d**4; } m2/=n; m3/=n; m4/=n; const sd=Math.sqrt(m2*n/(n-1)); return {n,mu,sd,sr:mu/sd,g3:m3/m2**1.5,g4:m4/m2**2}; }
function dsr(a,N){ const m=mom(a); const den=1-m.g3*m.sr+(m.g4-1)/4*m.sr**2; const V=den/(m.n-1); const s0=Math.sqrt(V)*EMAX(N);
  return {...m,psr:Phi(m.sr*Math.sqrt(m.n-1)/Math.sqrt(den)),srStar:s0,dsr:Phi((m.sr-s0)*Math.sqrt(m.n-1)/Math.sqrt(den)),z:m.sr*Math.sqrt(m.n-1)/Math.sqrt(den)}; }
const REG=JSON.parse(fs.readFileSync(path.join(__dirname,'deneme-kaydi.json'),'utf8'));
const f2=(x,d=2)=>Number.isFinite(x)?x.toFixed(d).replace('.',','):'–';
const Ns=REG.N; // {aile adı: N}
let md=`# Test #72 · Deneme sayısı kaydı ve deflated Sharpe\n\n13 Ekim 2026 · \`node tests/test72-dsr.js\` · sepetler canlı kodla arşivde (ayın ilk 50 coini, ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[R.length-1].t).toISOString().slice(0,10)}), günlük getiri. Deneme sayıları \`tests/deneme-kaydi.json\`.\n\n`;
md+=`DSR, gözlenen Sharpe'ın N denemenin en iyisi olmasından beklenen şans Sharpe'ını geçme olasılığıdır. Denemeler arası Sharpe varyansı bilinmediği için boş hipotezdeki tek deneme hatası kullanıldı (denemeler birbirine çok benzer olduğundan gerçek varyans bundan küçük olabilir; o zaman DSR burada yazandan yüksektir).\n\n`;
md+=`| sepet | dönem | gün | yıllık Sharpe | çarpıklık | basıklık | PSR(0) | ${Object.keys(Ns).map(k=>`DSR N=${Ns[k]} (${k})`).join(' | ')} |\n|---|---|---:|---:|---:|---:|---:|${Object.keys(Ns).map(()=>'---:').join('|')}|\n`;
const P=[[()=>true,'tümü'],[x=>x.t<SPLIT,'1. yarı'],[x=>x.t>=SPLIT,'2. yarı'],[x=>x.t>=L12,'son 12 ay']];
const out={};
for(const [key,name] of [['k','Kaplumbağa'],['i','Ichimoku'],['p','50/50']]) for(const [f,pn] of P){ const a=R.filter(f).map(x=>x[key]);
  const row=Object.keys(Ns).map(k=>dsr(a,Ns[k])); const m=row[0]; out[name+' '+pn]=row.map(r=>r.dsr);
  md+=`| ${name} | ${pn} | ${m.n} | ${f2(m.sr*Math.sqrt(365))} | ${f2(m.g3)} | ${f2(m.g4,1)} | ${f2(m.psr,3)} | ${row.map(r=>f2(r.dsr,3)).join(' | ')} |\n`; }
md+=`\n## İşlem başı / haftalık t ile raporlanan adaylar (normal yaklaşık, DSR ≈ Φ(t − E[max Z_N]))\n\nE[max Z_N]: ${Object.keys(Ns).map(k=>`N=${Ns[k]} → ${f2(EMAX(Ns[k]))}`).join(', ')}.\n\n| # | aday | t | kaynak | aile (N) | DSR aile | DSR proje (N=${Ns.proje}) |\n|---|---|---:|---|---|---:|---:|\n`;
for(const c of REG.adaylar) md+=`| ${c.id} | ${c.ad} | ${f2(c.t,1)} | ${c.kaynak} | ${c.aile} (${Ns[c.aile]}) | ${f2(Phi(c.t-EMAX(Ns[c.aile])),3)} | ${f2(Phi(c.t-EMAX(Ns.proje)),3)} |\n`;
md+=`\n## Gereken t\n\nDSR ≥ 0,95 için gereken t: ${Object.keys(Ns).map(k=>`${k} (N=${Ns[k]}) ${f2(EMAX(Ns[k])+1.645,1)}`).join(', ')}. DSR ≥ 0,5 için: ${Object.keys(Ns).map(k=>f2(EMAX(Ns[k]),1)).join(', ')}.\n`;
fs.writeFileSync(path.join(__dirname,'test72-dsr-report.md'),md); console.log(md);
