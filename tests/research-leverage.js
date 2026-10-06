// Kaldıraç ve risk araştırması: Trend sepeti ve Geri çekilme sepeti, canlı kodla (src/trend.js, src/dip.js), günlük veri 2020-04 → 2026-09.
// Soru: 10–20x kaldıraçla batmadan ne kadar büyür? "Kaldıraç" iki anlamda denenir:
//   a) izole: her coin teminatı özkaynağın ¼'ü × L kaldıraç → toplam nominal = L × özkaynak; likidasyon girişten ≈ −(1/L − %0,5)
//   b) cross + risk boyu: borsa kaldıracı 10–20x (yalnız teminat), toplam nominal = E × özkaynak (E = etkin kaldıraç 1–6)
// Düşüş freni: zirveden %X düşünce yeni boyu yarıya indir.
// Çıktı: yıllık, en büyük düşüş, artı ay oranı, en kötü ay/yıl, son 24 ay yıllığı, bir yıllık kayan hesaplarda 2× ve −%50 oranı.
const fs=require('fs'); const path=require('path'); const {loadEngine}=require('./engine-node.js');
const DIR=path.join(__dirname,'data','daily'); const E=loadEngine(); const SYMS=E.DIP_DEF.syms;
if(!SYMS.every(s=>fs.existsSync(path.join(DIR,s+'.csv')))){ console.log('tests/data/daily yok, atlandı'); process.exit(0); }
const D={}; for(const s of SYMS) D[s]=fs.readFileSync(path.join(DIR,s+'.csv'),'utf8').trim().split('\n').map(l=>{ const a=l.split(',').map(Number); return {t:a[0],o:a[1],h:a[2],l:a[3],c:a[4]}; });
const DAY=864e5, T0=Date.UTC(2020,3,1), T1=Date.UTC(2026,8,30);
const idx={}; for(const k of SYMS){ idx[k]={}; D[k].forEach((b,i)=>idx[k][b.t]=i); }
const days=[]; for(let t=T0;t<T1;t+=DAY) days.push(t);
function curveDip(cfg){ const s=E.dipNew(cfg); const eq=[];
  for(const t of days){ const px={}; for(const k of SYMS){ const i=idx[k][t]; if(i==null) continue; px[k]=D[k][i].c; E.dipIntraday(s,k,D[k][i],t+DAY/2); }
    E.dipFund(s,px,t+DAY-1,null);
    for(const k of SYMS){ const i=idx[k][t]; if(i==null) continue; const data={}; for(const q of SYMS){ const j=idx[q][t]; if(j!=null) data[q]=D[q].slice(Math.max(0,j-130),j+1); } E.dipClose(s,k,D[k][i],data,t+DAY-1); }
    const e=Math.max(0,E.dipEq(s,px)); eq.push(e); if(e<=1) { s.bal=0; s.pos={}; s.ord={}; } }
  return {eq,n:s.trades.length,wr:s.trades.filter(x=>x.r>0).length/s.trades.length,liq:s.trades.filter(x=>x.why==='felaket').length}; }
function curveTrend(cfg){ const s=E.trendNew(cfg); const eq=[];
  for(const t of days){ const data={}, px={}; for(const k of SYMS){ const a=D[k]; const i=idx[k][t]; const j=i==null?a.findIndex(b=>b.t>t):i; data[k]=a.slice(Math.max(0,j-130),j); if(i!=null) px[k]=a[i].o; }
    E.trendMark(s,px,t,null); E.trendRebalance(s,E.trendTargets(data,s.cfg),px,t);
    const cl={}; for(const k of SYMS){ const i=idx[k][t]; if(i!=null) cl[k]=D[k][i].c; } E.trendMark(s,cl,t+DAY-1,null);
    // gün içi en kötü nokta: toplam nominal × en kötü düşük (likidasyon kontrolü, cross: özkaynak sıfırlanırsa biter)
    let worst=s.bal; for(const k in s.pos){ const p=s.pos[k]; const i=idx[k][t]; if(i!=null) worst+=p.qty*(D[k][i].l-p.avg); }
    if(worst<=0){ s.bal=0; s.pos={}; }
    eq.push(Math.max(0,E.trendEq(s,cl))); }
  return {eq}; }
function metr(eq,start){ start=start||100; const n=eq.length; const end=eq[n-1]; const yrs=n/365; let pk=start,dd=0; for(const e of eq){ pk=Math.max(pk,e); dd=Math.min(dd,pk>0?e/pk-1:-1); }
  const mon=[]; let prev=start; for(let i=29;i<n;i+=30){ mon.push(prev>0?eq[i]/prev-1:0); prev=eq[i]; }
  const yr=[]; prev=start; for(let i=364;i<n;i+=365){ yr.push(prev>0?eq[i]/prev-1:0); prev=eq[i]; }
  const last=eq[n-1-730]>0?(end/eq[n-1-730])**(1/2)-1:-1;
  let k2=0,kb=0,c=0; for(let s=0;s+365<n;s+=30){ c++; if(!(eq[s]>0)){ kb++; continue; } let hit=0,bust=0; for(let i=s;i<=s+365;i++){ if(eq[i]>=2*eq[s]) hit=1; if(eq[i]<=0.5*eq[s]) bust=1; } k2+=hit; kb+=bust; }
  const pc=v=>Math.round(v*100);
  return {end:Math.round(end),cagr:end>0?pc((end/start)**(1/yrs)-1):-100,maxDD:pc(dd),posMon:pc(mon.filter(x=>x>0).length/mon.length),medMon:+(100*mon.slice().sort((a,b)=>a-b)[mon.length>>1]).toFixed(1),worstMon:pc(Math.min(...mon)),worstYr:pc(Math.min(...yr)),last24:pc(last),p2x:pc(k2/c),pHalf:pc(kb/c),dead:end<1}; }
const out={dip:{},trend:{},mix:{}};
for(const L of [1,2,3,4,6]) for(const br of [0,0.2]){ const c=curveDip({lev:L,brakeDD:br}); out.dip[`cross_E${L}${br?'_fren':''}`]={...metr(c.eq),n:c.n,wr:Math.round(c.wr*100)}; }
for(const L of [10,20]){ const cat=1/L-0.005; const c=curveDip({lev:L,cat,stop:Math.min(0.10,cat*0.99)}); out.dip[`izole_${L}x`]={...metr(c.eq),n:c.n,wr:Math.round(c.wr*100),liq:c.liq}; }
const tvs=[0.8,1.2,1.6,2.0,2.4];
for(const tv of [...tvs,1.4].sort()) for(const br of [0,0.2]){ const c=curveTrend({tv,cap:tv*5,brakeDD:br}); out.trend[`tv${tv}${br?'_fren':''}`]=metr(c.eq); }
// karışım: iki ayrı 50 $ hesap
for(const [tv,L] of [[0.8,1],[1.2,2],[1.6,2],[1.6,3],[2.0,3]]) for(const br of [0,0.2]){ const a=curveTrend({tv,cap:tv*5,brakeDD:br,bal0:50}).eq, b=curveDip({lev:L,brakeDD:br,bal0:50}).eq; out.mix[`trend${tv}+dip${L}${br?'_fren':''}`]=metr(a.map((x,i)=>x+b[i])); }
// 2× süresi: her 7 günde başlayan hesap, yarıya inmeden 2× yaptı mı, kaç günde (Ana strateji kartı)
function t2x(eq){ const res=[]; for(let s=0;s<eq.length-30;s+=7){ const e0=eq[s]; if(!(e0>0)) continue; let d=null,half=false; for(let i=s;i<eq.length;i++){ if(eq[i]<=0.5*e0){half=true;break;} if(eq[i]>=2*e0){d=i-s;break;} } res.push({d,half,s}); }
  const ok=res.filter(r=>r.d!=null).map(r=>r.d).sort((a,b)=>a-b); const q=p=>ok[Math.floor(p*(ok.length-1))]; const rec=res.filter(r=>r.s>=eq.length-1100); const okr=rec.filter(r=>r.d!=null).map(r=>r.d).sort((a,b)=>a-b);
  return {n:res.length,hit:Math.round(ok.length/res.length*100),half:Math.round(res.filter(r=>r.half).length/res.length*100),med:q(0.5),p75:q(0.75),p90:q(0.9),recentHit:Math.round(okr.length/rec.length*100),recentHalf:Math.round(rec.filter(r=>r.half).length/rec.length*100),recentMed:okr[okr.length>>1]}; }
out.t2x={}; for(const tv of [0.8,1.0,1.2,1.4,1.6,2.0]) for(const br of [0,0.2]) out.t2x[`tv${tv}${br?'_fren':''}`]=t2x(curveTrend({tv,cap:tv*5,brakeDD:br}).eq);
fs.writeFileSync(path.join(__dirname,'backtest-leverage.json'),JSON.stringify(out,null,1));
for(const g in out){ console.log('---',g); for(const k in out[g]) console.log(k.padEnd(22),JSON.stringify(out[g][k])); }
