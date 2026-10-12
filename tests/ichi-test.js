// Ichimoku sepeti (src/ichi.js) birim testi: sinyal, giriş boyu, stop / hedef / Kijun çıkışı, açılış boşluğu, coin başına tek pozisyon, en çok pozisyon.
// --replay: tests/data/sm (sm-fetch.js; 4 sa + fonlama, ayın ilk 50 coini universe-top50.json, sm-aday.js üretir) varsa canlı fonksiyonlarla 2020'den oynatır:
// (1) sınırsız portföyle araştırmayla birebir kıyas (sm-aday.js geniş evren: 10.245 işlem, +0,076R), (2) %0,5 risk / 10 pozisyon / 2× ile bakiye eğrisi,
// (3) Kaplumbağa sepetini (turtle.js, aynı evrenin 1 g mumları) canlı kodla oynatıp günlük getiri korelasyonu ve birleşik bakiye → tests/ichi-replay-report.md
const path=require('path'), fs=require('fs');
const {loadEngine}=require('./engine-node.js');
const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const errors=[]; const ok=(c,m)=>{ if(!c){ errors.push(m); console.log('HATA',m); } };
const H4=E.IC_TF, T0=Date.UTC(2026,0,1);
const bar=(i,o,h,l,c)=>({t:T0+i*H4,o,h,l,c,q:1e6});
// 120 mum yavaş düşüş (bulut yukarıda), 40 mum dip, sonra yükseliş: Tenkan Kijun'u yukarı keser, kapanış bulutun üstüne çıkar
function series(){ const a=[]; let x=100; for(let i=0;i<120;i++){ x-=0.2; a.push(bar(i,x+0.1,x+0.4,x-0.4,x)); } for(let i=120;i<160;i++){ a.push(bar(i,x,x+0.3,x-0.3,x)); } return a; }
const base=series();
// sinyal gelene kadar yükselt
function firstSignal(a,c){ let x=a[a.length-1].c; for(let k=0;k<80;k++){ x+=0.6; a.push(bar(a.length,x-0.5,x+0.2,x-0.6,x)); const sg=E.icSignal(a,a.length-1,c); if(sg) return sg; } return null; }
const C=E.IC_DEF;
const A=base.slice(); const sg=firstSignal(A,C);
ok(sg&&sg.dir===1,'yükselişte long sinyali');
if(sg){ const I=E.icInd(A,A.length-1,C); ok(A[A.length-1].c>I.top&&I.ten>I.kij,'kapanış bulut üstünde, Tenkan > Kijun');
  ok(Math.abs(sg.stop-Math.min(I.kij,I.bot))<1e-9,'stop = Kijun ile bulut alt ucundan uzak olanı');
  ok(Math.abs(sg.tp-(A[A.length-1].c+2*(A[A.length-1].c-sg.stop)))<1e-9,'hedef sinyal kapanışından 2R'); }
// ayna seri: short sinyali
const Bm=A.map(b=>({...b,o:200-b.o,h:200-b.l,l:200-b.h,c:200-b.c}));
const sgS=E.icSignal(Bm,Bm.length-1,C); ok(sgS&&sgS.dir===-1,'ayna seride short sinyali');
// giriş
const i=A.length-1, last=A[i]; const nx=last.c+0.1; const bar0=A[i].t+H4;
let s=E.icNew({}); let ev=E.icClose(s,{X:A},['X'],{X:nx},bar0,bar0);
ok(ev.length===1&&ev[0].type==='entry'&&s.pos.X&&s.pos.X.dir===1,'sinyalde giriş');
const p=s.pos.X; ok(p&&Math.abs(p.e-nx*(1+s.cfg.slip))<1e-9,'giriş fiyatı sonraki açılış + kayma');
ok(p&&Math.abs(p.qty*p.e-Math.min(s.cfg.risk*100/p.risk0,s.cfg.lev*100))<1e-6,'boy: %0,5 risk / stop uzaklığı, 2× sınırı');
// aynı coinde ikinci sinyal yok sayılır
ev=E.icClose(s,{X:A},['X'],{X:nx},bar0,bar0); ok(ev.length===0,'coin başına tek pozisyon');
// giriş mumunda açılış boşluğu sayılmaz, mum içi stop sayılır
let s2=E.icNew({}); E.icClose(s2,{X:A},['X'],{X:nx},bar0,bar0); const st=s2.pos.X.stop;
ok(E.icIntra(s2,'X',{t:bar0,o:st-1,h:nx,l:nx-0.01},bar0)===null,'giriş mumunda açılış boşluğu yok');
ev=E.icIntra(s2,'X',{t:bar0+H4,o:st-1,h:st,l:st-2},bar0+H4); ok(ev&&/boşluğu/.test(ev.why)&&Math.abs(s2.trades[0].x-(st-1)*(1-s2.cfg.slip))<1e-9,'sonraki mumda açılış boşluğu → açılıştan stop');
// aynı mumda stop ve hedef → stop
let s3=E.icNew({}); E.icClose(s3,{X:A},['X'],{X:nx},bar0,bar0); const P3=s3.pos.X;
ev=E.icIntra(s3,'X',{t:bar0+H4,o:nx,h:P3.tp+1,l:P3.stop-1},bar0+H4); ok(ev&&ev.why==='stop'&&s3.trades[0].R<-0.9,'aynı mumda stop + hedef → stop, R ≈ −1: '+(s3.trades[0]&&s3.trades[0].R));
// hedef
let s4=E.icNew({}); E.icClose(s4,{X:A},['X'],{X:nx},bar0,bar0); const P4=s4.pos.X;
ev=E.icIntra(s4,'X',{t:bar0+H4,o:nx,h:P4.tp+0.01,l:nx-0.01},bar0+H4); ok(ev&&/hedef/.test(ev.why)&&s4.trades[0].R>1.5,'hedefte çıkış, R > 1,5: '+(s4.trades[0]&&s4.trades[0].R));
// stop/hedef çıkışından sonra aynı mumun sinyali alınmaz
ev=E.icClose(s4,{X:A.concat([{...A[i],t:bar0+H4}])},['X'],{X:nx},bar0+2*H4,bar0+2*H4); ok(!s4.pos.X,'çıkış mumunda yeni giriş yok');
// Kijun çıkışı: kapanış Kijun altında → sonraki fiyattan çık
let s5=E.icNew({}); E.icClose(s5,{X:A},['X'],{X:nx},bar0,bar0); const kij=E.icMid(A,i,C.kij);
const A5=A.concat([bar(A.length,nx,nx+0.1,kij-1,Math.max(s5.pos.X.stop+0.01,kij-0.5))]);
ev=E.icClose(s5,{X:A5},['X'],{X:kij-0.5},bar0+H4,bar0+H4); ok(!s5.pos.X&&/Kijun/.test(s5.trades[0].why),'kapanış Kijun altında → çık');
// en çok pozisyon
let s6=E.icNew({maxPos:2}); const data={A,B:A,C:A}; E.icClose(s6,data,['A','B','C'],{A:nx,B:nx,C:nx},bar0,bar0); ok(Object.keys(s6.pos).length===2,'en çok pozisyon sınırı');
// evren dışı coin girmez
let s7=E.icNew({}); E.icClose(s7,{X:A},[],{X:nx},bar0,bar0); ok(!s7.pos.X,'evren dışı coin girmez');
// fonlama: long öder (artı oran)
let s8=E.icNew({}); E.icClose(s8,{X:A},['X'],{X:nx},bar0,bar0); s8.fundT=Math.floor(bar0/(8*36e5))*8*36e5; const b8=s8.bal; E.icFund(s8,{X:nx},s8.fundT+8*36e5+1,{X:0.001}); ok(s8.bal<b8,'long artı fonlamada öder');

if(process.argv.includes('--replay')) replay();
console.log('ichi-test errors',JSON.stringify(errors));
if(errors.length) process.exitCode=1;

function replay(){
  const DIR=path.join(__dirname,'data','sm'), UF=path.join(DIR,'universe-top50.json');
  if(!fs.existsSync(UF)){ console.log('tests/data/sm/universe-top50.json yok (önce node tests/sm-aday.js), tekrar oynatma atlandı'); return; }
  const U=JSON.parse(fs.readFileSync(UF,'utf8')); const MON=t=>{ const x=new Date(t); return x.getUTCFullYear()*12+x.getUTCMonth(); };
  const syms=[...new Set(Object.values(U).flat())];
  const csv=(iv,s)=>{ const f=path.join(DIR,iv,s+'.csv'); if(!fs.existsSync(f)) return null; return fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[6]}; }); };
  const D4={}, D1={}, FR={}; for(const s of syms){ const a=csv('4h',s); if(a&&a.length) D4[s]=a; const b=csv('1d',s); if(b&&b.length) D1[s]=b.filter(x=>x.q>0);
    const f=path.join(DIR,'funding',s+'.csv'); if(fs.existsSync(f)){ const m=new Map(); for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); m.set(Math.round(+t/(8*36e5)),+r); } FR[s]=m; } }
  const ix=D=>{ const o={}; for(const k in D) o[k]=new Map(D[k].map((b,i)=>[b.t,i])); return o; }; const I4=ix(D4), I1=ix(D1);
  const DAY=864e5, t0=Date.UTC(2020,1,1), t1=D4.BTCUSDT[D4.BTCUSDT.length-1].t;
  // --- Ichimoku: canlı fonksiyonlarla 4 saatte bir ---
  function runIchi(cfg){ const s=E.icNew(cfg); const daily=new Map(); let peak=100,mdd=0; const all=[];
    for(let T=t0;T<=t1;T+=H4){
      for(const k of Object.keys(s.pos)){ const i=I4[k]&&I4[k].get(T); if(i!=null){ E.icIntra(s,k,D4[k][i],T); if(s.pos[k]){ s.pos[k].px=D4[k][i].c; if(i===D4[k].length-1) E.icExit(s,k,D4[k][i].c,'listeden çıktı',T+H4); } } }
      const univ=(U[MON(T)]||[]).filter(k=>I4[k]&&I4[k].has(T)); const need=new Set([...univ,...Object.keys(s.pos)]); const data={}, px={}, fr={};
      for(const k of need){ const i=I4[k]&&I4[k].get(T); if(i==null) continue; data[k]=D4[k].slice(Math.max(0,i-90),i+1); const nx=D4[k][i+1]; if(nx&&nx.t===T+H4) px[k]=nx.o; }
      E.icClose(s,data,univ,px,T+H4,T+H4);
      for(const k in s.pos){ const m=FR[k]; fr[k]=m&&m.has(Math.round((T+H4)/(8*36e5)))?m.get(Math.round((T+H4)/(8*36e5))):0; }
      if(!s.fundT) s.fundT=Math.floor(T/(8*36e5))*8*36e5; E.icFund(s,null,T+H4+1,fr);
      all.push(...s.trades.splice(0));
      if((T+H4)%DAY===0){ const eq=E.icEq(s,null); daily.set(T+H4,eq); peak=Math.max(peak,eq); mdd=Math.max(mdd,1-eq/peak); } }
    s.trades=all; return {s,daily,mdd}; }
  // --- Kaplumbağa: turtle-test.js --replay döngüsü, aynı evren (ayın ilk 50'si) ---
  function runTurtle(){ const s=E.ttNew({fee:0.0005,slip:0.0003}); const daily=new Map(); let peak=100,mdd=0;
    for(let t=Date.UTC(2020,5,1);t<t1;t+=DAY){
      for(const k of Object.keys(s.pos)){ const i=I1[k]&&I1[k].get(t); if(i!=null) E.ttIntraday(s,k,D1[k][i],t); }
      const univ=(U[MON(t)]||[]).filter(k=>I1[k]&&I1[k].has(t)); const need=new Set([...univ,...Object.keys(s.pos),'BTCUSDT']); const data={}, px={};
      for(const k of need){ const i=I1[k]&&I1[k].get(t); if(i==null||i<130) continue; data[k]=D1[k].slice(Math.max(0,i-215),i+1); const nx=D1[k][i+1]; if(nx) px[k]=nx.o; }
      for(const k of Object.keys(s.pos)){ const i=I1[k]&&I1[k].get(t); if(i!=null&&i===D1[k].length-1) E.ttExit(s,k,D1[k][i].c,'listeden çıktı',t); }
      E.ttClose(s,data,univ,px,t+DAY);
      for(const k of Object.keys(s.pos)){ const i=I1[k]&&I1[k].get(t); if(i!=null) s.pos[k].px=D1[k][i].c; }
      const eq=E.ttEq(s,null); daily.set(t+DAY,eq); peak=Math.max(peak,eq); mdd=Math.max(mdd,1-eq/peak); }
    return {s,daily,mdd}; }
  const SPLIT=Date.UTC(2023,4,15), L12=Date.UTC(2025,9,11); const f=(x,k=3)=>Number.isFinite(x)?x.toFixed(k).replace('.',','):'–';
  const mean=a=>a.length?a.reduce((p,q)=>p+q,0)/a.length:NaN; const st=(tr,fl)=>{ const a=tr.filter(fl).map(x=>x.R); return [mean(a),a.length]; };
  const Y=[2020,2021,2022,2023,2024,2025,2026];
  let md=`# Ichimoku sepeti · canlı kodla tekrar oynatma\n\n11 Ekim 2026 · \`node tests/ichi-test.js --replay\` (veri: tests/sm-fetch.js; evren: her ayın önceki 30 gününün hacmine göre ilk 50 COIN perp'i, delist dahil, tests/sm-aday.js). src/ichi.js ve src/turtle.js fonksiyonları doğrudan; 4 sa mum içinde stop/hedef, kapanışta Kijun çıkışı ve yeni giriş sonraki açılıştan; taker %0,05 + kayma %0,03 her tarafta; fonlama arşivden. Bakiye eğrileri gün sonu değerlemeli (açık pozisyonlar kapanışla).\n\n`;
  const free=runIchi({maxPos:1e9,lev:1e9}); const tf=free.s.trades;
  md+=`## 1. Araştırmayla kıyas (sınırsız portföy)\n\n| | İşlem | Ort. R | 1. yarı | 2. yarı | Son 12 ay | Long | Short |\n|---|---|---|---|---|---|---|---|\n`;
  md+=`| canlı kod (src/ichi.js) | ${tf.length} | ${f(mean(tf.map(x=>x.R)))} | ${f(st(tf,x=>x.t<SPLIT)[0])} | ${f(st(tf,x=>x.t>=SPLIT)[0])} | ${f(st(tf,x=>x.t>=L12)[0])} | ${f(st(tf,x=>x.dir>0)[0])} (${st(tf,x=>x.dir>0)[1]}) | ${f(st(tf,x=>x.dir<0)[0])} |\n| araştırma (sm-aday.js, geniş evren) | 10.245 | 0,076 | 0,095 | 0,061 | 0,066 | | |\n\n`;
  console.log('ichi sınırsız',tf.length,f(mean(tf.map(x=>x.R))));
  const runs=[['%0,5 risk · 10 pozisyon · 2×',{}],['%1 risk · 10 pozisyon · 2×',{risk:0.01}],['%0,5 risk · 20 pozisyon · 3×',{maxPos:20,lev:3}]].map(([ad,c])=>[ad,runIchi(c)]);
  const tt=runTurtle(); console.log('kaplumbağa',tt.s.trades.length);
  const curve=(daily)=>{ const ks=[...daily.keys()].sort((a,b)=>a-b); return ks.map(k=>[k,daily.get(k)]); };
  const yr=(c)=>Y.map(y=>{ const a=Date.UTC(y,0,1), b=Date.UTC(y+1,0,1); let e0=null,e1=null; for(const [t,e] of c){ if(t<=a) e0=e; if(t<=b) e1=e; } if(e0==null) e0=c[0][1]; return e1==null||e0==null?NaN:e1/e0-1; });
  const ann=(c)=>{ const yrs=(c[c.length-1][0]-c[0][0])/(365.25*DAY); return Math.pow(c[c.length-1][1]/c[0][1],1/yrs)-1; };
  const dd=(c)=>{ let p=0,m=0; for(const [,e] of c){ p=Math.max(p,e); m=Math.max(m,1-e/p); } return m; };
  const wmon=(c)=>{ const last=new Map(); for(const [t,e] of c){ const d=new Date(t); last.set(d.getUTCFullYear()*12+d.getUTCMonth(),e); } let prev=c[0][1], w=0; for(const [,e] of [...last].sort((a,b)=>a[0]-b[0])){ w=Math.min(w,e/prev-1); prev=e; } return w; };
  const row=(ad,c,n,R)=>`| ${ad} | ${n??''} | ${R!=null?f(R):''} | ${f(c[c.length-1][1],0)} | ${f(100*ann(c),0)} % | −%${(100*dd(c)).toFixed(0)} | ${f(100*wmon(c),1)} % | ${yr(c).map(v=>Number.isFinite(v)?f(100*v,0)+' %':'–').join(' | ')} |\n`;
  md+=`## 2. Bakiye (100 $'dan bileşik, gün sonu değerlemeli)\n\n| Sepet | İşlem | Ort. R | Son $ | Yıllık | En büyük düşüş | En kötü ay | ${Y.join(' | ')} |\n|---|---|---|---|---|---|---|${'---|'.repeat(Y.length)}\n`;
  for(const [ad,r] of runs) md+=row('Ichimoku · '+ad,curve(r.daily),r.s.trades.length,mean(r.s.trades.map(x=>x.R)));
  md+=row('Kaplumbağa (canlı kod, aynı evren, %0,5 · 10 · 2×)',curve(tt.daily),tt.s.trades.length,mean(tt.s.trades.map(x=>x.R)));
  // birleşik: ortak dönem, günlük getiriler; "ikisi tam" = aynı bakiyede iki sepet (getiriler toplanır), 50/50 = her gün dengelenmiş
  const ic=curve(runs[0][1].daily), tc=curve(tt.daily); const tm=new Map(tc); const common=ic.filter(([t])=>tm.has(t)&&t>=Date.UTC(2020,5,2));
  const rets=[]; for(let k=1;k<common.length;k++){ const [t,e]=common[k], [tp,ep]=common[k-1]; rets.push([t,e/ep-1,tm.get(t)/tm.get(tp)-1]); }
  const corr=(a,b)=>{ const ma=mean(a),mb=mean(b); let x=0,y=0,z=0; for(let i=0;i<a.length;i++){ x+=(a[i]-ma)*(b[i]-mb); y+=(a[i]-ma)**2; z+=(b[i]-mb)**2; } return x/Math.sqrt(y*z); };
  const wk=(rs)=>{ const g=new Map(); for(const [t,a,b] of rs){ const w=Math.floor((t-Date.UTC(2020,0,6))/(7*DAY)); const o=g.get(w)||[1,1]; g.set(w,[o[0]*(1+a),o[1]*(1+b)]); } return [...g.values()].map(([a,b])=>[a-1,b-1]); };
  const W=wk(rets); const cD=corr(rets.map(x=>x[1]),rets.map(x=>x[2])), cW=corr(W.map(x=>x[0]),W.map(x=>x[1]));
  const comb=(wa,wb)=>{ let e=100; const c=[[rets.length?common[0][0]:0,100]]; for(const [t,a,b] of rets){ e*=1+wa*a+wb*b; c.push([t,e]); } return c; };
  md+=row('Ichimoku + Kaplumbağa · 50/50 (her gün dengelenmiş)',comb(0.5,0.5));
  md+=row('Ichimoku + Kaplumbağa · ikisi tam (aynı bakiye, nominal ≤ 4×)',comb(1,1));
  md+=`\nIchimoku (%0,5 · 10 · 2×) ↔ Kaplumbağa günlük getiri korelasyonu **${f(cD,2)}**, haftalık **${f(cW,2)}** (${rets.length} gün, 2020-06 → ${new Date(t1).toISOString().slice(0,10)}).\n\n`;
  // kalite short sepeti: arşiv işlemleri bu ortamda yok; test52-birlesik-report.md'deki yıllık getirilerle kıyas
  const KS={2022:0.51,2023:-0.04,2024:0.04,2025:0.22,2026:0.07}; const iy=yr(ic), ty=yr(tc); const ys=[2022,2023,2024,2025,2026];
  const ia=ys.map(y=>iy[Y.indexOf(y)]), ka=ys.map(y=>KS[y]);
  md+=`## 3. Kalite short sepetiyle (yıllık)\n\nKalite short sepetinin işlem verisi (tests/data/arch/_t52-trades.json) bu ortamda yok; yıllık getirileri tests/test52-birlesik-report.md'den (%0,5 risk, en çok 5 short). 5 yıllık nokta korelasyon için az; yalnız yön.\n\n| Yıl | Ichimoku (%0,5 · 10 · 2×) | Kaplumbağa (bu koşu) | Kalite short |\n|---|---|---|---|\n`;
  ys.forEach((y,k)=>{ md+=`| ${y} | ${f(100*ia[k],0)} % | ${f(100*ty[Y.indexOf(y)],0)} % | ${f(100*ka[k],0)} % |\n`; });
  md+=`\nYıllık korelasyon Ichimoku ↔ kalite short ${f(corr(ia,ka),2)} (5 nokta).\n`;
  // yıl yıl R
  md+=`\n## 4. Yıl yıl ortalama R (sınırsız portföy)\n\n| ${Y.join(' | ')} |\n|${'---|'.repeat(Y.length)}\n| ${Y.map(y=>{ const a=tf.filter(x=>new Date(x.t).getUTCFullYear()===y).map(x=>x.R); return f(mean(a),2)+` (${a.length})`; }).join(' | ')} |\n`;
  fs.writeFileSync(path.join(__dirname,'ichi-replay-report.md'),md); console.log(md);
}
