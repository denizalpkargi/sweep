// Bot pazarı testi (10 Ekim 2026, "Bot platformları karşılaştırması" thread'i; kullanıcı "ödünç alınacak 3 ve 4 için çalışma yapar mısın" dedi).
// Pionex / 3Commas / Cryptohopper / Coinrule'un en popüler hazır botlarını arşivde maliyetle sınar.
//  A) grid  : klasik geometrik grid (Pionex tarzı), 15 dk mumlarda. Başta üstteki hücrelerin coini market alınır, alttakilere limit alış;
//             her hücre bir üst seviyede maker satar. Aralık dışına bir adım çıkınca kapanır (stop / tavan), ya da H gün sonra market kapanır.
//             Rejim: başlangıçtan önceki 14 günün Kaufman verimlilik oranı (ER < 0,3 yatay, > 0,5 trend; eşikler sabit, veride seçilmedi).
//             Kıyas: aynı pencerede grid'in ortalama coin payını sabit tutmak (aynı maruziyetle al-tut). Fazla = grid − bu kıyas.
//  B) dca   : 3Commas DCA botu: taban emir + 5 güvenlik emri (sapma %2, adım ×1,2, hacim ×1,5), ortalamanın %1,5 üstünde kâr al, stopsuz;
//             varyantlar: −%25 stop, giriş süzgeci RSI(14, 15 dk) < 30. Bot sermayesi 1 (tüm emirler dolarsa 1x). Aylık piyasa değerli kâr/zarar,
//             kıyas aynı ayın ortalama coin payıyla al-tut.
//  C) sig   : TradingView/Coinrule şablonları, 1 sa ve 4 sa: RSI 30/70, Bollinger(20,2) ortaya dönüş, MACD(12,26,9) kesişimi, EMA 9/21, SuperTrend(10,3).
//             Sinyal mum kapanışında, işlem sonraki mumun açılışında; stopsuz (şablonlar gibi). Kıyas: aynı coin, yön ve süreyle ±30 gün içinde
//             rastgele girişler (işlem başına 3, tohumlu).
// Maliyet: taker + kayma taraf başına %0,08 (gidiş-dönüş %0,16), limit dolumlar maker %0,02; fonlama arşivden (yoksa 8 saatte %0,01). Basit getiri.
// Evren: her ay hacimce ilk --top coin (universe.json, delist dahil, TradFi hariç). Yeni grid/anlaşma/işlem yalnız coin o ayın evrenindeyken açılır.
// Ölçüt: iki yarı (başlangıç zamanına göre) ve son 12 ay ayrı; t aylık ortalamalardan.
// Kullanım: node tests/test-grid-pazar.js [--part grid|dca|sig|all] [--top 30] → tests/test-grid-pazar-<part>-report.md
const fs=require('fs'), path=require('path');
const ARCH=process.env.ARCH||path.join(__dirname,'data','arch');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',30), PART=String(arg('part','all'));
const TK=0.0008, MK=0.0002, FDEF=0.0001, M15=9e5, H1=36e5, DAY=864e5, F8=8*H1;
const T0=Date.UTC(2020,5,1);
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const inU={}; for(const m in U) inU[m]=new Set(U[m].slice(0,TOP));
const mon=t=>new Date(t).toISOString().slice(0,7);
const uOk=(s,t)=>inU[mon(t)]&&inU[mon(t)].has(s);
const SYMS=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)))].sort();
const f2=(x,d=2)=>Number.isFinite(x)?x.toFixed(d).replace('.',','):'–';
const pc=(x,d=2)=>Number.isFinite(x)?(x*100).toFixed(d).replace('.',',')+' %':'–';

function loadK(sym,iv){
  const f=path.join(ARCH,iv,sym+'.csv'); if(!fs.existsSync(f)) return null;
  const L=fs.readFileSync(f,'utf8').split('\n'); const rows=[];
  for(const l of L){ if(!l||l.charCodeAt(0)<48||l.charCodeAt(0)>57) continue; const a=l.split(','); const q=+a[7], o=+a[1],h=+a[2],lo=+a[3],c=+a[4];
    if(!(q>0)||!(o>0)||!(h>=lo)) continue; rows.push([+a[0],o,h,lo,c]); }
  if(rows.length<200) return null; rows.sort((a,b)=>a[0]-b[0]);
  const n=rows.length, k={n,t:new Float64Array(n),o:new Float64Array(n),h:new Float64Array(n),l:new Float64Array(n),c:new Float64Array(n)};
  for(let i=0;i<n;i++){ const r=rows[i]; k.t[i]=r[0]; k.o[i]=r[1]; k.h[i]=r[2]; k.l[i]=r[3]; k.c[i]=r[4]; }
  return k;
}
function loadF(sym){ const m=new Map(); const f=path.join(ARCH,'funding',sym+'.csv'); if(!fs.existsSync(f)) return m;
  for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); if(Number.isFinite(+r)) m.set(Math.round(+t/H1)*H1,+r); } return m; }
const fundAt=(F,t)=>t%F8===0?(F.has(t)?F.get(t):FDEF):0;
function agg(k,ms){ // daha büyük zaman dilimi (yalnız tam dolu mumlar değil; arşivde boşluk az)
  const o=[]; for(let i=0;i<k.n;i++){ const b=Math.floor(k.t[i]/ms)*ms; const L=o[o.length-1];
    if(L&&L[0]===b){ if(k.h[i]>L[2]) L[2]=k.h[i]; if(k.l[i]<L[3]) L[3]=k.l[i]; L[4]=k.c[i]; } else o.push([b,k.o[i],k.h[i],k.l[i],k.c[i]]); }
  const n=o.length, r={n,t:new Float64Array(n),o:new Float64Array(n),h:new Float64Array(n),l:new Float64Array(n),c:new Float64Array(n)};
  for(let i=0;i<n;i++){ r.t[i]=o[i][0]; r.o[i]=o[i][1]; r.h[i]=o[i][2]; r.l[i]=o[i][3]; r.c[i]=o[i][4]; } return r;
}
const EPS=0.0005; // limit dolumu: fiyat seviyeyi %0,05 geçmeli ("değdi" saymak ters seçilimi gizler, test #44 notu)
const KOT=process.argv.includes('--kotumser'); // fitilleri sayma: mum içinde yalnız açılış → kapanış (grid/DCA için alt sınır)
const path4=(k,i)=>KOT?[k.o[i],k.c[i]]:k.c[i]>=k.o[i]?[k.o[i],k.l[i],k.h[i],k.c[i]]:[k.o[i],k.h[i],k.l[i],k.c[i]]; // mum içi yol varsayımı

// istatistik: kayıtlar {t, x} → aylık ortalamaların ortalaması, t, n
function stat(rows,key='x'){
  const by=new Map(); for(const r of rows){ const m=mon(r.t); const a=by.get(m)||by.set(m,[0,0]).get(m); a[0]+=r[key]; a[1]++; }
  const ms=[...by.values()].map(a=>a[0]/a[1]); const n=ms.length; if(!n) return {n:0,N:0};
  const mu=ms.reduce((a,b)=>a+b,0)/n, sd=Math.sqrt(ms.reduce((a,b)=>a+(b-mu)**2,0)/Math.max(1,n-1));
  const all=rows.reduce((a,r)=>a+r[key],0)/rows.length;
  return {n,N:rows.length,mu,all,t:sd>0?mu/sd*Math.sqrt(n):NaN};
}
let TEND=0, TMID=0, T12=0;
function periods(rows){ return {all:rows, h1:rows.filter(r=>r.t<TMID), h2:rows.filter(r=>r.t>=TMID), y1:rows.filter(r=>r.t>=T12)}; }
const sdStr=s=>s.N?`${pc(s.all)} (ay ort. ${pc(s.mu)}, t ${f2(s.t,1)}, n ${s.N})`:'–';

// Kaufman verimlilik oranı ve 14 gün aralığı: başlangıçtan önceki kapanmış günlük kapanışlardan
function dailyCloses(k){ const m=new Map(); for(let i=0;i<k.n;i++){ const d=Math.floor(k.t[i]/DAY)*DAY; m.set(d,k.c[i]); } return m; }
function erAt(dc,t){ const d0=Math.floor(t/DAY)*DAY; const c=[]; for(let j=15;j>=1;j--){ const v=dc.get(d0-j*DAY); if(v==null) return null; c.push(v); }
  let s=0; for(let j=1;j<c.length;j++) s+=Math.abs(c[j]-c[j-1]); return s>0?Math.abs(c[c.length-1]-c[0])/s:null; }
function range14(k,i){ const n=14*96; if(i<n) return null; let hi=-Infinity,lo=Infinity; for(let j=i-n;j<i;j++){ if(k.h[j]>hi) hi=k.h[j]; if(k.l[j]<lo) lo=k.l[j]; } return (hi-lo)/k.o[i]; }

// ---------------- A) grid ----------------
const GRID_V=[];
for(const W of [0.05,0.10,0.20,'oto']) for(const N of [10,30]) for(const Hd of [7,30]) GRID_V.push({W,N,Hd,stop:true});
GRID_V.push({W:0.10,N:30,Hd:30,stop:false},{W:'oto',N:30,Hd:30,stop:false});
const gname=v=>`±${v.W==='oto'?'oto':Math.round(v.W*100)+'%'} · ${v.N} hücre · ${v.Hd} g${v.stop?'':' · stopsuz'}`;
function gridRun(k,F,i0,W,N,Hb,stop){
  const P0=k.o[i0], lo=P0*(1-W), up=P0*(1+W), lr=Math.log(up/lo)/N, r=Math.exp(lr);
  const g=new Float64Array(N+1); for(let j=0;j<=N;j++) g[j]=lo*Math.exp(lr*j);
  const q=new Float64Array(N), fl=new Uint8Array(N); let cash=1, inv=0, cyc=0;
  for(let j=0;j<N;j++){ q[j]=(1/N)/g[j]; if(g[j+1]>P0){ fl[j]=1; inv+=q[j]; cash-=q[j]*P0*(1+TK); } }
  const exp0=inv*P0, iE=Math.min(k.n-1,i0+Hb-1); let prev=P0, done=false, expS=0, fund=0, minEq=1, why='süre';
  const dnStop=lo/r, upEnd=up*r;
  for(let i=i0;i<=iE;i++){
    if(!done){ const fr=fundAt(F,k.t[i]); if(fr){ cash-=inv*k.o[i]*fr; fund+=fr; } }
    if(!done) for(const p of path4(k,i)){
      if(p<prev){ const jHi=Math.min(N-1,Math.floor(Math.log(prev/lo)/lr+1e-9)), jLo=Math.max(0,Math.ceil(Math.log(Math.max(p,1e-300)/lo)/lr-1e-9));
        for(let j=jHi;j>=jLo;j--) if(!fl[j]&&g[j]<prev&&g[j]*(1-EPS)>=p){ fl[j]=1; inv+=q[j]; cash-=q[j]*g[j]*(1+MK); } }
      else if(p>prev){ const jLo=Math.max(0,Math.ceil(Math.log(prev/lo)/lr-1e-9)-1), jHi=Math.min(N-1,Math.floor(Math.log(p/lo)/lr+1e-9)-1);
        for(let j=jLo;j<=jHi;j++) if(fl[j]&&g[j+1]>prev&&g[j+1]*(1+EPS)<=p){ fl[j]=0; inv-=q[j]; cash+=q[j]*g[j+1]*(1-MK); cyc+=q[j]*(g[j+1]-g[j])-q[j]*(g[j+1]+g[j])*MK; } }
      prev=p;
      if(stop&&p<=dnStop){ cash+=inv*dnStop*(1-TK); inv=0; done=true; why='stop'; break; }
      if(stop&&p>=upEnd){ cash+=inv*p*(1-TK); inv=0; done=true; why='tavan'; break; }
    }
    const eq=cash+inv*k.c[i]; if(eq<minEq) minEq=eq; expS+=inv*k.c[i];
  }
  if(!done){ cash+=inv*k.c[iE]*(1-TK); inv=0; }
  const nb=Hb, avgExp=expS/nb, coin=k.c[iE]/P0-1; let fW=0; for(let i=i0;i<=iE;i++) fW+=fundAt(F,k.t[i]);
  const bench=exp0*(coin-2*TK-fW); // başlangıçtaki coin payını sabit tutmak (önceden bilinen; ortalama pay sonradan bilinir ve düşüşte büyüdüğü için kıyası bozar)
  return {ret:cash-1, cyc, avgExp, exp0, coin, bench, ex:cash-1-bench, dd:1-minEq, why};
}
function partGrid(){
  const res=GRID_V.map(()=>[]); const btc=loadK('BTCUSDT','15m');
  for(const s of SYMS){ const k=loadK(s,'15m'); if(!k) continue; const F=loadF(s), dc=dailyCloses(k);
    TEND=Math.max(TEND,k.t[k.n-1]);
    for(let i=0;i<k.n;i++){ const t=k.t[i]; if(t<T0||new Date(t).getUTCDay()!==1||t%DAY!==0) continue; // pazartesi 00:00 UTC
      if(!uOk(s,t)) continue; const er=erAt(dc,t); if(er==null) continue; const rr=range14(k,i); if(rr==null) continue;
      const wk=Math.floor((t-T0)/DAY/7);
      GRID_V.forEach((v,vi)=>{ if(v.Hd===30&&wk%2) return; // 30 günlükler iki haftada bir
        const Hb=v.Hd*96; if(i+Hb>k.n) return; const W=v.W==='oto'?Math.min(0.5,Math.max(0.03,rr/2)):v.W;
        const x=gridRun(k,F,i,W,v.N,Hb,v.stop); x.t=t; x.s=s; x.er=er; res[vi].push(x); }); }
    process.stdout.write('.'); }
  console.log('');
  TMID=T0+(TEND-T0)/2; T12=TEND-365*DAY;
  const L=['# Grid botu (Pionex tarzı) · arşiv testi','',`Evren: ayın hacimce ilk ${TOP} coini, 15 dk, ${mon(T0)} → ${mon(TEND)}. Her pazartesi 00:00 UTC'de her coinde bir grid (30 günlükler iki haftada bir). Sermaye 1, kaldıraç yok. Maliyet: başlangıç alımı ve stop/kapanış taker+kayma %0,08, grid dolumları maker %0,02 ve yalnız fiyat seviyeyi %0,05 geçerse, fonlama arşivden. Mum içi yol: yeşil mumda açılış→dip→tepe→kapanış, kırmızıda açılış→tepe→dip→kapanış (her mumda bir tam salınım varsayar, grid lehine iyimser).${KOT?' **Bu koşu kötümser: fitiller sayılmaz, mum içinde yalnız açılış → kapanış.**':''}`,'',
    '**Fazla** = grid getirisi − başlangıçta aldığı coin payını pencere boyunca tutmak (aynı başlangıç maruziyeti, maliyet ve fonlama dahil). Grid gerçekten bir şey kazanıyorsa fazla artıdır; yalnız coin yükseldiği için kazanıyorsa sıfırdır.','',
    '"oto" aralık = başlangıçtan önceki 14 günün aralığının yarısı (en az %3). Rejim = önceki 14 günlük kapanışların Kaufman verimlilik oranı: < 0,3 yatay, > 0,5 trend.',''];
  L.push('## Tüm başlangıçlar','','| Ayar | n | Getiri ort. | Fazla: tümü | 1. yarı | 2. yarı | Son 12 ay | Kazanan % | Grid kârı ort. | En kötü | Stop % |','|---|---|---|---|---|---|---|---|---|---|---|');
  GRID_V.forEach((v,vi)=>{ const R=res[vi]; if(!R.length) return; const P=periods(R), S=k=>stat(P[k],'ex');
    const win=R.filter(x=>x.ret>0).length/R.length, cy=R.reduce((a,x)=>a+x.cyc,0)/R.length, worst=Math.min(...R.map(x=>x.ret)), st=R.filter(x=>x.why==='stop').length/R.length;
    L.push(`| ${gname(v)} | ${R.length} | ${pc(stat(R,'ret').all)} | ${sdStr(S('all'))} | ${sdStr(S('h1'))} | ${sdStr(S('h2'))} | ${sdStr(S('y1'))} | ${pc(win,0)} | ${pc(cy)} | ${pc(worst,0)} | ${pc(st,0)} |`); });
  L.push('','## Rejime göre (fazla)','','| Ayar | Yatay (ER<0,3): tümü | yatay 1. yarı | yatay 2. yarı | yatay son 12 ay | Ara | Trend (ER>0,5) |','|---|---|---|---|---|---|---|');
  GRID_V.forEach((v,vi)=>{ const R=res[vi]; if(!R.length) return; const Y=R.filter(x=>x.er<0.3), A=R.filter(x=>x.er>=0.3&&x.er<=0.5), T=R.filter(x=>x.er>0.5); const P=periods(Y);
    L.push(`| ${gname(v)} | ${sdStr(stat(Y,'ex'))} | ${sdStr(stat(P.h1,'ex'))} | ${sdStr(stat(P.h2,'ex'))} | ${sdStr(stat(P.y1,'ex'))} | ${sdStr(stat(A,'ex'))} | ${sdStr(stat(T,'ex'))} |`); });
  L.push('','## Yatay rejimde ham getiri ve risk','','| Ayar | n | Getiri ort. | Medyan | Kazanan % | Başlangıç / ort. coin payı | En büyük pencere içi düşüş (ort. / en kötü) |','|---|---|---|---|---|---|---|');
  GRID_V.forEach((v,vi)=>{ const Y=res[vi].filter(x=>x.er<0.3); if(!Y.length) return; const r=Y.map(x=>x.ret).sort((a,b)=>a-b);
    L.push(`| ${gname(v)} | ${Y.length} | ${pc(r.reduce((a,b)=>a+b,0)/r.length)} | ${pc(r[r.length>>1])} | ${pc(Y.filter(x=>x.ret>0).length/Y.length,0)} | ${pc(Y.reduce((a,x)=>a+x.exp0,0)/Y.length,0)} / ${pc(Y.reduce((a,x)=>a+x.avgExp,0)/Y.length,0)} | ${pc(Y.reduce((a,x)=>a+x.dd,0)/Y.length,1)} / ${pc(Math.max(...Y.map(x=>x.dd)),0)} |`); });
  return L.join('\n');
}

// ---------------- B) DCA ----------------
const DCA_V=[{ad:'3Commas varsayılanı (stopsuz)',sl:null,rsi:false},{ad:'−%25 stop',sl:0.25,rsi:false},{ad:'RSI(14) < 30 ile başla, stopsuz',sl:null,rsi:true}];
const SO=(()=>{ const dev=[], vol=[]; let d=0, step=0.02, v=1; for(let k=0;k<5;k++){ d+=step; dev.push(d); vol.push(v); step*=1.2; v*=1.5; } const tot=1+vol.reduce((a,b)=>a+b,0); return {dev,vol:vol.map(x=>x/tot),bo:1/tot}; })();
function rsiArr(c,n=14){ const r=new Float64Array(c.length).fill(NaN); let g=0,l=0; for(let i=1;i<c.length;i++){ const d=c[i]-c[i-1], up=Math.max(d,0), dn=Math.max(-d,0);
  if(i<=n){ g+=up/n; l+=dn/n; if(i===n) r[i]=l>0?100-100/(1+g/l):100; } else { g=(g*(n-1)+up)/n; l=(l*(n-1)+dn)/n; r[i]=l>0?100-100/(1+g/l):100; } } return r; }
function dcaCoin(k,F,v,s){
  const rsi=v.rsi?rsiArr(k.c):null, deals=[], months=new Map(); let st=null, pnlC=0; // pnlC: kapanmış anlaşmaların toplam kârı
  let mKey=null, mStart=0, mExp=0, mBars=0, mP0=0, mFund=0;
  const mtm=i=>pnlC+(st?st.qty*k.c[i]-st.cost-st.fund:0);
  for(let i=1;i<k.n;i++){ const t=k.t[i]; if(t<T0) continue; const mk=mon(t);
    if(mk!==mKey){ if(mKey&&mBars){ months.get(mKey).x=mtm(i-1)-mStart; months.get(mKey).exp=mExp/mBars; months.get(mKey).coin=k.c[i-1]/mP0-1; months.get(mKey).fund=mFund; }
      mKey=mk; mStart=mtm(i-1); mExp=0; mBars=0; mP0=k.c[i-1]; mFund=0; months.set(mk,{t,s,x:0,exp:0,e0:st?st.qty*k.c[i-1]:0,coin:0,active:uOk(s,t)}); }
    if(!st&&uOk(s,t)&&(!v.rsi||rsi[i-1]<30)){ const B=k.o[i]; st={B,i0:i,t0:t,qty:SO.bo/B,cost:SO.bo*(1+TK),fill:0,fund:0,so:SO.dev.map(d=>B*(1-d)),minEq:0}; st.tp=(st.cost/(1+TK))/st.qty*1.015; }
    if(st){ const fr=fundAt(F,t); if(fr){ st.fund+=st.qty*k.o[i]*fr; } mFund+=fr; let prev=k.o[i], closed=false;
      for(const p of path4(k,i)){
        if(p<prev) while(st.fill<5&&st.so[st.fill]*(1-EPS)>=p&&st.so[st.fill]<prev+1e-12){ const L=st.so[st.fill], u=SO.vol[st.fill]; st.qty+=u/L; st.cost+=u*(1+MK); st.fill++;
          st.tp=avgPx(st)*1.015; }
        if(v.sl&&p<=st.B*(1-v.sl)){ const X=st.B*(1-v.sl); closeDeal(X,TK,'stop',i); closed=true; break; }
        if(p>prev&&p>=st.tp*(1+EPS)){ closeDeal(st.tp,MK,'kâr',i); closed=true; break; }
        prev=p; }
      if(!closed&&st){ const eq=st.qty*k.c[i]-st.cost-st.fund; if(eq<st.minEq) st.minEq=eq; }
    }
    mExp+=st?st.qty*k.c[i]:0; mBars++;
  }
  function avgPx(d){ let q=0,c=0; q=d.qty; c=SO.bo; for(let j=0;j<d.fill;j++) c+=SO.vol[j]; return c/q; }
  function closeDeal(X,fee,why,i){ const pnl=st.qty*X*(1-fee)-st.cost-st.fund; pnlC+=pnl; deals.push({s,t:st.t0,ret:pnl,why,bars:i-st.i0,fill:st.fill,dd:-st.minEq}); st=null; }
  if(mKey&&mBars){ const m=months.get(mKey); m.x=mtm(k.n-1)-mStart; m.exp=mExp/mBars; m.coin=k.c[k.n-1]/mP0-1; m.fund=mFund; }
  const open=st?{s,t:st.t0,ret:st.qty*k.c[k.n-1]-st.cost-st.fund,fill:st.fill,bars:k.n-1-st.i0}:null;
  return {deals,months:[...months.values()].filter(m=>m.active||m.exp>0).map(m=>({...m,ex:m.x-m.e0*(m.coin-m.fund)})),open};
}
function partDca(){
  const R=DCA_V.map(()=>({deals:[],months:[],open:[]}));
  for(const s of SYMS){ const k=loadK(s,'15m'); if(!k) continue; const F=loadF(s); TEND=Math.max(TEND,k.t[k.n-1]);
    DCA_V.forEach((v,vi)=>{ const x=dcaCoin(k,F,v,s); R[vi].deals.push(...x.deals); R[vi].months.push(...x.months); if(x.open) R[vi].open.push(x.open); }); process.stdout.write('.'); }
  console.log(''); TMID=T0+(TEND-T0)/2; T12=TEND-365*DAY;
  const L=['# DCA botu (3Commas tarzı) · arşiv testi','',`Evren: ayın hacimce ilk ${TOP} coini, 15 dk, ${mon(T0)} → ${mon(TEND)}. Her coinde bir long bot; anlaşma kapanınca sonraki mumda yenisi (coin evrendeyken). Taban emir + 5 güvenlik emri: sapmalar ${SO.dev.map(d=>pc(d,1)).join(', ')}; boylar sermayenin ${pc(SO.bo,1)}, ${SO.vol.map(x=>pc(x,1)).join(', ')}. Kâr al ortalamanın %1,5 üstünde (maker). Limit emirler fiyat seviyeyi %0,05 geçerse dolar. Taban emir taker+kayma, güvenlik emirleri maker. Fonlama arşivden.`,'',
    '**Aylık fazla** = botun o ayki piyasa değerli kâr/zararı − ay başındaki coin payını ay boyunca tutmak (ay başında boştaysa kıyas sıfır). Sermaye 1 = tüm güvenlik emirleri dolduğunda kullanılan para.',''];
  L.push('| Varyant | Anlaşma | Kazanan % | Anlaşma ort. | Bot aylık getirisi | Aylık fazla: tümü | 1. yarı | 2. yarı | Son 12 ay | En kötü anlaşma | Bitmemiş (veri sonu) |','|---|---|---|---|---|---|---|---|---|---|---|');
  DCA_V.forEach((v,vi)=>{ const D=R[vi].deals, M=R[vi].months, P=periods(M); if(!M.length) return;
    const win=D.filter(x=>x.ret>0).length/D.length, avg=D.reduce((a,x)=>a+x.ret,0)/D.length, worst=D.reduce((a,x)=>Math.min(a,x.ret),Infinity), op=R[vi].open;
    L.push(`| ${v.ad} | ${D.length} | ${pc(win,1)} | ${pc(avg)} | ${sdStr(stat(M,'x'))} | ${sdStr(stat(P.all,'ex'))} | ${sdStr(stat(P.h1,'ex'))} | ${sdStr(stat(P.h2,'ex'))} | ${sdStr(stat(P.y1,'ex'))} | ${pc(worst,0)} | ${op.length} (ort. ${pc(op.reduce((a,x)=>a+x.ret,0)/Math.max(1,op.length),0)}) |`); });
  L.push('','## Anlaşmaların dağılımı (stopsuz varyant)','');
  const D=R[0].deals; if(D.length){ const byF=[0,1,2,3,4,5].map(f=>D.filter(x=>x.fill===f)); L.push('| Dolan güvenlik emri | Anlaşma | Ort. kâr | Ort. süre (sa) | Ort. en derin zarar |','|---|---|---|---|---|');
    byF.forEach((A,f)=>{ if(A.length) L.push(`| ${f} | ${A.length} | ${pc(A.reduce((a,x)=>a+x.ret,0)/A.length)} | ${f2(A.reduce((a,x)=>a+x.bars,0)/A.length/4,0)} | ${pc(A.reduce((a,x)=>a+x.dd,0)/A.length,1)} |`); });
    const yrs=[...new Set(R[0].months.map(m=>mon(m.t).slice(0,4)))].sort(); L.push('','| Yıl | Bot aylık getirisi (ort.) | Aylık fazla |','|---|---|---|');
    for(const y of yrs){ const M=R[0].months.filter(m=>mon(m.t).startsWith(y)); L.push(`| ${y} | ${sdStr(stat(M,'x'))} | ${sdStr(stat(M,'ex'))} |`); } }
  return L.join('\n');
}

// ---------------- C) sinyal şablonları ----------------
function ema(c,n){ const r=new Float64Array(c.length), a=2/(n+1); r[0]=c[0]; for(let i=1;i<c.length;i++) r[i]=a*c[i]+(1-a)*r[i-1]; return r; }
function sma(c,n){ const r=new Float64Array(c.length).fill(NaN); let s=0; for(let i=0;i<c.length;i++){ s+=c[i]; if(i>=n) s-=c[i-n]; if(i>=n-1) r[i]=s/n; } return r; }
function sdv(c,n,m){ const r=new Float64Array(c.length).fill(NaN); for(let i=n-1;i<c.length;i++){ let s=0; for(let j=i-n+1;j<=i;j++) s+=(c[j]-m[i])**2; r[i]=Math.sqrt(s/n); } return r; }
function superTrend(k,n=10,mult=3){ const d=new Int8Array(k.n), tr=new Float64Array(k.n); for(let i=1;i<k.n;i++) tr[i]=Math.max(k.h[i]-k.l[i],Math.abs(k.h[i]-k.c[i-1]),Math.abs(k.l[i]-k.c[i-1]));
  let atr=0, ub=0, lb=0, dir=1; for(let i=1;i<k.n;i++){ atr=i<=n?(atr*(i-1)+tr[i])/i:(atr*(n-1)+tr[i])/n; const m=(k.h[i]+k.l[i])/2, bu=m+mult*atr, bl=m-mult*atr;
    ub=(bu<ub||k.c[i-1]>ub)?bu:ub; lb=(bl>lb||k.c[i-1]<lb)?bl:lb; if(i<=n){ ub=bu; lb=bl; } if(dir===1&&k.c[i]<lb) dir=-1; else if(dir===-1&&k.c[i]>ub) dir=1; d[i]=i>n?dir:0; } return d; }
// her şablon: i mumunun kapanışında istenen pozisyon (−1/0/+1), önceki pozisyona bağlı olabilir
const SIGS={
  'RSI 30/70':k=>{ const r=rsiArr(k.c); return (i,p)=>p===0?(r[i]<30?1:r[i]>70?-1:0):p===1?(r[i]>70?0:1):(r[i]<30?0:-1); },
  'Bollinger ortaya dönüş':k=>{ const m=sma(k.c,20), s=sdv(k.c,20,m); return (i,p)=>{ if(!(s[i]>0)) return 0; if(p===0) return k.c[i]<m[i]-2*s[i]?1:k.c[i]>m[i]+2*s[i]?-1:0; return p===1?(k.c[i]>=m[i]?0:1):(k.c[i]<=m[i]?0:-1); }; },
  'MACD kesişimi':k=>{ const a=ema(k.c,12), b=ema(k.c,26), m=new Float64Array(k.n); for(let i=0;i<k.n;i++) m[i]=a[i]-b[i]; const sg=ema(m,9); return i=>i<35?0:(m[i]>sg[i]?1:-1); },
  'EMA 9/21':k=>{ const a=ema(k.c,9), b=ema(k.c,21); return i=>i<30?0:(a[i]>b[i]?1:-1); },
  'SuperTrend(10,3)':k=>{ const d=superTrend(k); return i=>d[i]; },
};
let seed=52; const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
function sigCoin(k,F,s,fn){
  const cum=new Float64Array(k.n+1); for(let i=0;i<k.n;i++) cum[i+1]=cum[i]+fundAt(F,k.t[i]); // fonlama: [ie, ix) mumlarının açılışları
  const tr=(d,ie,ix)=>d*(k.o[ix]/k.o[ie]-1)-2*TK-d*(cum[ix]-cum[ie]);
  const out=[]; let p=0, ie=0;
  for(let i=1;i<k.n-1;i++){ let w=fn(i,p); if(p===0&&w!==0&&(k.t[i]<T0||!uOk(s,k.t[i+1]))) w=0;
    if(w!==p){ if(p!==0){ out.push({s,t:k.t[ie],d:p,ie,ix:i+1,ret:tr(p,ie,i+1)}); }
      if(w!==0&&(k.t[i]>=T0&&uOk(s,k.t[i+1]))){ ie=i+1; p=w; } else p=0; } }
  // rastgele kıyas: aynı yön ve süre, ±30 gün içinde, coin evrendeyken
  const bars=Math.round(DAY/(k.t[1]-k.t[0]))||24;
  for(const x of out){ const len=x.ix-x.ie; let s2=0,c2=0; for(let a=0;a<12&&c2<3;a++){ const j=x.ie+Math.round((rnd()*2-1)*30*bars); if(j<1||j+len>=k.n||!uOk(s,k.t[j])) continue; s2+=tr(x.d,j,j+len); c2++; }
    x.rnd=c2?s2/c2:NaN; x.ex=x.ret-x.rnd; x.hold=len; }
  return out.filter(x=>Number.isFinite(x.ex));
}
function partSig(){
  const R={}; for(const iv of ['1h','4h']) for(const nm in SIGS) R[iv+' '+nm]=[];
  for(const s of SYMS){ const k1=loadK(s,'1h'); if(!k1) continue; const F=loadF(s); TEND=Math.max(TEND,k1.t[k1.n-1]); const k4=agg(k1,4*H1);
    for(const [iv,k] of [['1h',k1],['4h',k4]]) for(const nm in SIGS) R[iv+' '+nm].push(...sigCoin(k,F,s,SIGS[nm](k))); process.stdout.write('.'); }
  console.log(''); TMID=T0+(TEND-T0)/2; T12=TEND-365*DAY;
  const L=['# Pazar şablonları (RSI, Bollinger, MACD, EMA, SuperTrend) · arşiv testi','',`Evren: ayın hacimce ilk ${TOP} coini, ${mon(T0)} → ${mon(TEND)}. Sinyal mum kapanışında, giriş ve çıkış sonraki mumun açılışında, stopsuz. Gidiş-dönüş %0,16 + fonlama. Rastgele: aynı coin, yön ve sürede ±30 gün içinde 3 rastgele giriş. **Fark** = işlem − rastgele kıyası.`,'',
    '| Şablon | İşlem | Ort. tutuş (mum) | Kazanan % | İşlem ort. | Rastgele ort. | Fark: tümü | 1. yarı | 2. yarı | Son 12 ay | Long fark | Short fark |','|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for(const key in R){ const X=R[key]; if(!X.length) continue; const P=periods(X);
    L.push(`| ${key} | ${X.length} | ${f2(X.reduce((a,x)=>a+x.hold,0)/X.length,1)} | ${pc(X.filter(x=>x.ret>0).length/X.length,0)} | ${pc(stat(X,'ret').all,3)} | ${pc(stat(X,'rnd').all,3)} | ${sdStr(stat(P.all,'ex'))} | ${sdStr(stat(P.h1,'ex'))} | ${sdStr(stat(P.h2,'ex'))} | ${sdStr(stat(P.y1,'ex'))} | ${sdStr(stat(X.filter(x=>x.d>0),'ex'))} | ${sdStr(stat(X.filter(x=>x.d<0),'ex'))} |`); }
  L.push('','Maliyetsiz işlem ortalaması = işlem ort. + %0,16 (fonlama hariç).');
  return L.join('\n');
}

const parts=PART==='all'?['grid','dca','sig']:[PART];
for(const p of parts){ const t=Date.now(); console.log('bölüm',p); const md=p==='grid'?partGrid():p==='dca'?partDca():partSig();
  const f=path.join(__dirname,`test-grid-pazar-${p}${KOT?'-kotumser':''}-report.md`); fs.writeFileSync(f,md+`\n\n_Süre ${((Date.now()-t)/1000).toFixed(0)} sn · node tests/test-grid-pazar.js --part ${p} --top ${TOP}${KOT?' --kotumser':''}_\n`); console.log('yazıldı',f); }
