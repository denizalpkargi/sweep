// Efsane trader'ların henüz denenmemiş sistemleri, günlük mumlarda (arastirma/efsane-traderlar-2026-10-06.md §6):
//   Kaplumbağa Sistem 1 (20/10, son işlem kazandıysa atla) ve Sistem 2 (55/20), 2N stop, ½N piramit (en çok 4 birim)
//   Larry Williams oynaklık kırılımı (açılış + k × dünkü aralık; gün sonu ya da ertesi açılışta çık), BTC SMA200 kapısı (Jones)
//   Bruce Kovner sıkışma kırılımı (7 günlük aralık son 60 günün en dar %20'sinde, kapanışla kırılım, kapanış stopu, 10 günlük iz)
// Veri: tests/data/daily/<SYM>.csv (BTC·ETH·SOL·BNB 2020–2026) ve tests/data/*.json içindeki k1d (24 coin, ~400 gün).
// Maliyet: her yön taker + kayma %0,08; long günde %0,03 fonlama öder, short alır. R = (getiri − maliyet) ÷ ilk stop uzaklığı.
// Portföy: 100 $, işlem (birim) başı %1 risk, kripto tek grup: aynı anda en çok 6 birim (Kaplumbağa kuralı), bileşik.
// Kullanım: node tests/research-legends.js  → tests/legends-report.txt
const fs=require('fs'), path=require('path');
const DAY=864e5, COST=0.0008, FUND=0.0003;
const L=[]; const say=(...a)=>{ const s=a.join(' '); L.push(s); console.log(s); };
const f2=x=>!isFinite(x)?'–':(x>=0?'+':'')+x.toFixed(2).replace('.',','); const pc=x=>!isFinite(x)?'–':(x*100).toFixed(0)+'%';
const hh=(a,i,n)=>{ let m=-Infinity; for(let k=Math.max(0,i-n+1);k<=i;k++) m=Math.max(m,a[k].h); return m; };
const ll=(a,i,n)=>{ let m=Infinity; for(let k=Math.max(0,i-n+1);k<=i;k++) m=Math.min(m,a[k].l); return m; };
const atr=(a,i,n)=>{ let s=0; for(let k=i-n+1;k<=i;k++) s+=Math.max(a[k].h-a[k].l,Math.abs(a[k].h-a[k-1].c),Math.abs(a[k].l-a[k-1].c)); return s/n; };
const sma=(a,i,n)=>{ if(i<n-1) return NaN; let s=0; for(let k=i-n+1;k<=i;k++) s+=a[k].c; return s/n; };

function loadSets(){ const sets=[]; const DATA=process.env.SWEEP_DATA||path.join(__dirname,'data'); const dd=path.join(DATA,'daily');
  if(fs.existsSync(dd)){ const D={}; for(const f of fs.readdirSync(dd).filter(f=>f.endsWith('.csv'))) D[f.replace('.csv','')]=fs.readFileSync(path.join(dd,f),'utf8').trim().split('\n').map(l=>{ const a=l.split(',').map(Number); return {t:a[0],o:a[1],h:a[2],l:a[3],c:a[4]}; }).filter(b=>isFinite(b.c));
    if(D.BTCUSDT) sets.push({name:'4 büyük coin, günlük 2020–2026',D}); }
  const jd=DATA; const D={}; for(const f of fs.readdirSync(jd).filter(f=>f.endsWith('.json')&&!f.startsWith('_'))){ try{ const r=JSON.parse(fs.readFileSync(path.join(jd,f),'utf8')); if(r.k1d&&r.k1d.length>250) D[r.sym]=r.k1d.map(x=>({t:x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4]})); }catch(e){} }
  if(D.BTCUSDT&&Object.keys(D).length>4) sets.push({name:`${Object.keys(D).length} coin (masanın evreni), günlük son ~400 gün`,D});
  return sets; }

// işlem: {sym,dir,tIn,tOut,R,ret}
function mk(sym,dir,tIn,pIn,tOut,pOut,risk){ const sg=dir==='long'?1:-1; const days=Math.max(1,(tOut-tIn)/DAY); const ret=sg*(pOut/pIn-1)-2*COST-sg*FUND*days; return {sym,dir,tIn,tOut,ret,R:ret/risk}; }

function turtle(a,sym,btcOk,{entryN,exitN,skipWin,pyramid=true,short=true}){
  const T=[]; let pos=null, lastWin=false;
  for(let i=Math.max(entryN,21);i<a.length;i++){ const b=a[i];
    if(pos){ const sg=pos.dir==='long'?1:-1; let ex=null;
      const xl=sg>0?ll(a,i-1,exitN):hh(a,i-1,exitN);
      if(sg>0?b.l<=pos.stop:b.h>=pos.stop) ex=sg>0?Math.min(b.o,pos.stop):Math.max(b.o,pos.stop);
      else if(sg>0?b.l<=xl:b.h>=xl) ex=sg>0?Math.min(b.o,xl):Math.max(b.o,xl);
      if(ex!=null){ let tot=0; for(const u of pos.units){ const tr=mk(sym,pos.dir,u.t,u.px,b.t,ex,2*pos.N/u.px); T.push(tr); tot+=tr.ret; } lastWin=tot>0; pos=null; continue; }
      if(pyramid&&pos.units.length<4){ const nx=pos.last+sg*0.5*pos.N; if(sg>0?b.h>=nx:b.l<=nx){ const px=sg>0?Math.max(b.o,nx):Math.min(b.o,nx); pos.units.push({t:b.t,px}); pos.last=px; pos.stop=px-sg*2*pos.N; } }
      continue; }
    const up=hh(a,i-1,entryN), dn=ll(a,i-1,entryN); const N=atr(a,i-1,20);
    for(const dir of short?['long','short']:['long']){ const sg=dir==='long'?1:-1; const lv=sg>0?up:dn; if(!(sg>0?b.h>lv:b.l<lv)) continue; if(!btcOk(b.t,dir)) continue;
      if(skipWin&&lastWin){ lastWin=false; break; }
      const px=sg>0?Math.max(b.o,lv):Math.min(b.o,lv); pos={dir,N,units:[{t:b.t,px}],last:px,stop:px-sg*2*N};
      if(sg>0?b.l<=pos.stop:b.h>=pos.stop){ T.push(mk(sym,dir,b.t,px,b.t+DAY,pos.stop,2*N/px)); lastWin=false; pos=null; } break; } }
  return T; }

function williams(a,sym,btcOk,{k,exit,short=true}){ const T=[];
  for(let i=2;i<a.length-1;i++){ const b=a[i], rng=a[i-1].h-a[i-1].l; if(!(rng>0)) continue;
    for(const dir of short?['long','short']:['long']){ const sg=dir==='long'?1:-1; const trig=b.o+sg*k*rng; if(!(sg>0?b.h>=trig:b.l<=trig)) continue; if(!btcOk(b.t,dir)) continue;
      const stop=trig-sg*rng; const risk=rng/trig;
      if(sg>0?b.l<=stop&&b.c<trig:b.h>=stop&&b.c>trig){ T.push(mk(sym,dir,b.t,trig,b.t+DAY,stop,risk)); continue; }
      if(exit==='close') T.push(mk(sym,dir,b.t,trig,b.t+DAY,b.c,risk));
      else { // bailout: ilk kârlı açılışta çık, en çok 3 gün; stop gün içi
        let done=false; for(let j=i+1;j<Math.min(a.length,i+4);j++){ const c=a[j]; if(sg>0?c.o>trig:c.o<trig){ T.push(mk(sym,dir,b.t,trig,c.t,c.o,risk)); done=true; break; } if(sg>0?c.l<=stop:c.h>=stop){ T.push(mk(sym,dir,b.t,trig,c.t+DAY,sg>0?Math.min(c.o,stop):Math.max(c.o,stop),risk)); done=true; break; } }
        if(!done&&i+4<a.length) T.push(mk(sym,dir,b.t,trig,a[i+4].t,a[i+4].o,risk)); }
      break; } }
  return T; }

function kovner(a,sym,btcOk,{pct=0.2,trailN=10,short=true}){ const T=[]; let pos=null; const w=[];
  for(let i=8;i<a.length-1;i++){ const b=a[i]; const r7=(hh(a,i,7)-ll(a,i,7))/b.c; w.push(r7); if(w.length>60) w.shift();
    if(pos){ const sg=pos.dir==='long'?1:-1; let ex=null;
      if(sg>0?b.l<=pos.cat:b.h>=pos.cat) ex={t:b.t+DAY,px:sg>0?Math.min(b.o,pos.cat):Math.max(b.o,pos.cat)};
      else if(sg>0?b.c<pos.stop:b.c>pos.stop) ex={t:a[i+1].t,px:a[i+1].o};
      else if(sg>0?b.c<ll(a,i-1,trailN):b.c>hh(a,i-1,trailN)) ex={t:a[i+1].t,px:a[i+1].o};
      if(ex){ T.push(mk(sym,pos.dir,pos.t,pos.px,ex.t,ex.px,pos.risk)); pos=null; } continue; }
    if(w.length<60) continue; const prev=w[w.length-2]; const rank=w.slice(0,-1).filter(x=>x<=prev).length/(w.length-1); if(rank>pct) continue;
    for(const dir of short?['long','short']:['long']){ const sg=dir==='long'?1:-1; const lv=sg>0?hh(a,i-1,7):ll(a,i-1,7); if(!(sg>0?b.c>lv:b.c<lv)) continue; if(!btcOk(b.t,dir)) continue;
      const px=a[i+1].o, stop=sg>0?ll(a,i-1,7):hh(a,i-1,7); const risk=Math.abs(px-stop)/px; if(!(risk>0.005)) continue;
      pos={dir,t:a[i+1].t,px,stop,cat:px-sg*2*Math.abs(px-stop),risk}; break; } }
  return T; }

function summarize(lbl,T,T0,T1){ if(!T.length){ say(`${lbl} | 0 işlem`); return; } T.sort((x,y)=>x.tIn-y.tIn); const mid=(T0+T1)/2;
  const m=a=>a.length?a.reduce((p,x)=>p+x.R,0)/a.length:NaN; const mr=a=>a.length?a.reduce((p,x)=>p+x.ret,0)/a.length:NaN;
  const h1=T.filter(x=>x.tIn<mid), h2=T.filter(x=>x.tIn>=mid); const recent=T.filter(x=>x.tIn>=T1-730*DAY);
  // portföy %1 risk/birim, en çok 6 birim
  let eq=100,pk=100,dd=0; const open=[]; const ev=[...T];
  for(const x of ev){ for(let z=open.length-1;z>=0;z--) if(open[z].tOut<=x.tIn){ eq+=open[z].pnl; pk=Math.max(pk,eq); dd=Math.max(dd,1-eq/pk); open.splice(z,1); } if(open.length>=6) continue; open.push({tOut:x.tOut,pnl:eq*0.01*Math.max(-3,x.R)}); }
  for(const o of open) eq+=o.pnl; pk=Math.max(pk,eq); dd=Math.max(dd,1-eq/pk); const yrs=(T1-T0)/(365*DAY); const cagr=Math.pow(Math.max(eq,1)/100,1/yrs)-1;
  const by={}; for(const x of T){ const y=new Date(x.tIn).getUTCFullYear(); (by[y]=by[y]||[]).push(x); }
  say([lbl,T.length,f2(m(T))+'R',pc(T.filter(x=>x.R>0).length/T.length),f2(m(h1))+' / '+f2(m(h2)),f2(m(recent))+` (${recent.length})`,(mr(T)*100).toFixed(2).replace('.',',')+'%',eq.toFixed(0)+' $',pc(cagr),pc(dd),Object.keys(by).map(y=>y.slice(2)+':'+f2(m(by[y]))).join(' ')].join(' | ')); }

const sets=loadSets(); if(!sets.length){ console.log('günlük veri yok'); process.exit(0); }
for(const S of sets){ const D=S.D, btc=D.BTCUSDT; const bIdx=new Map(btc.map((b,i)=>[b.t,i]));
  const T0=Math.min(...Object.values(D).map(a=>a[60]?a[60].t:Infinity)), T1=btc[btc.length-1].t;
  const gate200=(t,dir)=>{ const i=bIdx.get(t); if(i==null||i<201) return false; const s=sma(btc,i-1,200); return dir==='long'?btc[i-1].c>s:btc[i-1].c<s; };
  const gate50=(t,dir)=>{ const i=bIdx.get(t); if(i==null||i<51) return false; const s=sma(btc,i-1,50); return dir==='long'?btc[i-1].c>s:btc[i-1].c<s; };
  const any=()=>true;
  say(`\n===== ${S.name}: ${Object.keys(D).length} coin, ${new Date(T0).toISOString().slice(0,10)} – ${new Date(T1).toISOString().slice(0,10)} =====`);
  say(['sistem','işlem','ort. R','kazanan','1. yarı / 2. yarı','son 2 yıl','işlem başı getiri','100 $ → (%1 risk, 6 birim)','yıllık','en büyük düşüş','yıllara göre R'].join(' | '));
  const run=(lbl,fn)=>{ let T=[]; for(const s in D) T=T.concat(fn(D[s],s)); summarize(lbl,T,T0,T1); };
  run('Donchian 20/10 long (karşılaştırma)',(a,s)=>turtle(a,s,any,{entryN:20,exitN:10,pyramid:false,short:false}));
  run('Kaplumbağa S1 20/10, piramit, long',(a,s)=>turtle(a,s,any,{entryN:20,exitN:10,short:false}));
  run('Kaplumbağa S1 + "kazandıysa atla", long',(a,s)=>turtle(a,s,any,{entryN:20,exitN:10,skipWin:true,short:false}));
  run('Kaplumbağa S2 55/20, piramit, long',(a,s)=>turtle(a,s,any,{entryN:55,exitN:20,short:false}));
  run('Kaplumbağa S2 55/20, piramit, long+short',(a,s)=>turtle(a,s,any,{entryN:55,exitN:20}));
  run('Kaplumbağa S2 + BTC SMA200 kapısı, long+short',(a,s)=>turtle(a,s,gate200,{entryN:55,exitN:20}));
  run('Kaplumbağa S1 + BTC SMA200 kapısı, long+short',(a,s)=>turtle(a,s,gate200,{entryN:20,exitN:10}));
  for(const k of [0.25,0.4,0.6]){ run(`Williams k=${k}, gün sonu çık, long`,(a,s)=>williams(a,s,any,{k,exit:'close',short:false}));
    run(`Williams k=${k}, gün sonu, BTC>SMA200 long / altında short`,(a,s)=>williams(a,s,gate200,{k,exit:'close'}));
    run(`Williams k=${k}, ilk kârlı açılışta çık, SMA200 kapısı`,(a,s)=>williams(a,s,gate200,{k,exit:'bailout'})); }
  run('Kovner sıkışma, long',(a,s)=>kovner(a,s,any,{short:false}));
  run('Kovner sıkışma, BTC SMA50 kapısı, long+short',(a,s)=>kovner(a,s,gate50,{}));
  run('Kovner sıkışma, BTC SMA200 kapısı, long+short',(a,s)=>kovner(a,s,gate200,{}));
  run('Kovner sıkışma (en dar %10), SMA200 kapısı',(a,s)=>kovner(a,s,gate200,{pct:0.1}));
}
fs.writeFileSync(path.join(__dirname,'legends-report.txt'),L.join('\n')+'\n'); console.log('\nyazıldı tests/legends-report.txt');
