// Test #49 (10 Ekim 2026): likidasyon dalgası sonrası 24–72 sa ters yön (Coval & Stafford 2007 zorunlu satış analoğu; kripto için kurallı
// olay çalışması bulunamadı, bkz. arastirma/dongu/2026-10-10-pozitif-r-olgulari.md). Eşikler önceden sabit, veride seçilmedi.
// Veri: arşiv metrics (5 dk OI, ayın ilk 30 coini) + 1 sa mumlar + fonlama.
// Olay (saat kapanışında): OI son 1 sa'te ≤ −X (X ∈ {%3, %5}) ve aynı saatte fiyat hareketi |kapanış − açılış| ≥ K × ATR(1 sa, 24) (K ∈ {1,5, 2,5}).
//   Fiyat düştüyse "long tasfiyesi" → long; yükseldiyse "short sıkışması" → short. Coin başına 24 sa'te bir olay.
// Giriş: olaydan sonraki saatin VWAP'ı (q/v, [düşük, yüksek] içine kırpılır); çıkış giriş saatinden H ∈ {4, 24, 72} sa sonraki saatin VWAP'ı.
// Getiri basit, taraf başı %0,08 maliyet, arşiv fonlaması (long öder, short alır). R = getiri ÷ (günlük ATR% ≈ ATR(1 sa,24) × √24 ÷ fiyat).
// Taban: aynı coin, aynı yön, tüm saatlerden aynı ölçü (koşulsuz). Kümelenme: aynı UTC gününün olayları gün ortalamasına indirilip t gün sayısıyla.
// Kullanım: node tests/test49-likidasyon-sonrasi.js → tests/test49-likidasyon-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'), HR=36e5, DAY=864e5, SIDE=0.0008, FDEF=0.0001;
const OUT=path.join(__dirname,'test49-likidasyon-report.md');
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const mon=t=>new Date(t).toISOString().slice(0,7);
const inU={}; for(const m in U) inU[m]=new Set(U[m].slice(0,30));
const syms=fs.readdirSync(path.join(ARCH,'metrics')).filter(f=>f.endsWith('.csv')).map(f=>f.slice(0,-4)).filter(s=>fs.existsSync(path.join(ARCH,'1h',s+'.csv'))).sort();
const XS=[0.03,0.05], KS=[1.5,2.5], HS=[4,24,72];
const ev={}; for(const X of XS) for(const K of KS) for(const d of [1,-1]) ev[`${X}|${K}|${d}`]=[];
const base={}; for(const d of [1,-1]) for(const H of HS) base[`${d}|${H}`]={s:0,n:0};
let nCoin=0;
for(const s of syms){
  const k=fs.readFileSync(path.join(ARCH,'1h',s+'.csv'),'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); const o=+a[1],h=+a[2],lo=+a[3],c=+a[4],v=+a[5],q=+a[7];
    let vw=v>0?q/v:c; if(!(vw>=lo&&vw<=h)) vw=c; return {t:+a[0],o,h,l:lo,c,v,vw}; });
  if(k.length<200) continue; const idx=new Map(k.map((b,i)=>[b.t,i]));
  // OI saat sonu (5 dk satırlarından saatin son değeri)
  const oi=new Map(); for(const l of fs.readFileSync(path.join(ARCH,'metrics',s+'.csv'),'utf8').split('\n')){ if(!l) continue; const a=l.split(','); const t=+a[0], v=+a[1]; if(!(v>0)) continue; const hEnd=Math.floor((t-1)/HR)*HR; oi.set(hEnd,v); }
  // oi.get(hStart) = o saatin içindeki son kayıt (saat sonu ≈ hStart+1h)
  const fm=new Map(); const ff=path.join(ARCH,'funding',s+'.csv'); if(fs.existsSync(ff)) for(const l of fs.readFileSync(ff,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); fm.set(Math.floor(+t/HR)*HR,+r); }
  const fundBetween=(t0,t1)=>{ let f=0, any=false; for(let t=Math.ceil(t0/HR)*HR;t<t1;t+=HR){ if(fm.has(t)){ f+=fm.get(t); any=true; } } return any?f:FDEF*(t1-t0)/(8*HR); };
  const atr=new Array(k.length).fill(NaN); { let sm=0; const tr=i=>Math.max(k[i].h-k[i].l,Math.abs(k[i].h-k[i-1].c),Math.abs(k[i].l-k[i-1].c)); for(let i=1;i<k.length;i++){ sm+=tr(i); if(i>24) sm-=tr(i-24); if(i>=24) atr[i]=sm/24; } }
  const ret=(i,H,d)=>{ const j=i+H; if(j>=k.length||k[j].t!==k[i].t+H*HR) return null; const e=k[i].vw, x=k[j].vw; return d*(x/e-1)-2*SIDE-d*fundBetween(k[i].t,k[j].t); };
  let used=false; const last={};
  for(let i=25;i<k.length-1;i++){ const t=k[i].t; if(!inU[mon(t)]||!inU[mon(t)].has(s)) continue; const o1=oi.get(t), o0=oi.get(t-HR); if(!(o1>0&&o0>0)||!(atr[i-1]>0)) continue; used=true;
    const dOI=o1/o0-1, mv=(k[i].c-k[i].o)/atr[i-1], dRisk=atr[i-1]*Math.sqrt(24)/k[i].c;
    // taban (her saat; giriş sonraki saat)
    for(const d of [1,-1]) for(const H of HS){ const r=ret(i+1,H,d); if(r!=null){ const b=base[`${d}|${H}`]; b.s+=r; b.n++; } }
    for(const X of XS) for(const K of KS){ if(dOI>-X||Math.abs(mv)<K) continue; const d=mv<0?1:-1; const key=`${X}|${K}|${d}`; if(last[key]!=null&&t-last[key]<DAY) continue; last[key]=t;
      const r={}; for(const H of HS){ const x=ret(i+1,H,d); r[H]=x; r['R'+H]=x==null?null:x/dRisk; }
      ev[key].push({s,t,dOI,mv,...r}); }
  }
  if(used) nCoin++;
}
const tEnd=Math.max(...Object.values(ev).flat().map(e=>e.t)), tStart=Math.min(...Object.values(ev).flat().map(e=>e.t)); const tMid=(tStart+tEnd)/2, t24=tEnd-730*DAY;
const pc=x=>Number.isFinite(x)?(x>=0?'+':'')+(100*x).toFixed(2)+'%':'–', fx=(x,d=2)=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(d):'–';
function agg(list,H){ const v=list.filter(e=>e[H]!=null); if(!v.length) return {n:0}; const m=v.reduce((a,e)=>a+e[H],0)/v.length, mR=v.reduce((a,e)=>a+e['R'+H],0)/v.length;
  const byD=new Map(); for(const e of v){ const d=Math.floor(e.t/DAY); (byD.get(d)||byD.set(d,[]).get(d)).push(e[H]); } const dm=[...byD.values()].map(a=>a.reduce((x,y)=>x+y,0)/a.length);
  const mm=dm.reduce((a,b)=>a+b,0)/dm.length, sd=Math.sqrt(dm.reduce((a,b)=>a+(b-mm)**2,0)/Math.max(1,dm.length-1)); return {n:v.length,days:dm.length,m,mR,t:sd>0?mm/sd*Math.sqrt(dm.length):NaN,win:v.filter(e=>e[H]>0).length/v.length}; }
const L=['# Test #49 · Likidasyon dalgası sonrası ters yön',`Veri: arşiv metrics 5 dk OI + 1 sa mumlar, ayın ilk 30 coini, ${nCoin} coin, ${new Date(tStart).toISOString().slice(0,10)} → ${new Date(tEnd).toISOString().slice(0,10)}. Giriş olaydan sonraki saatin VWAP'ı, çıkış H saat sonraki saatin VWAP'ı; taraf başı %0,08 + fonlama. R = getiri ÷ günlük ATR%. t: aynı günün olayları tek gözlem.`,'',
 '## Taban (koşulsuz, her saat)','','| Yön | H | Ort. getiri |','|---|---|---|'];
for(const d of [1,-1]) for(const H of HS){ const b=base[`${d}|${H}`]; L.push(`| ${d>0?'long':'short'} | ${H} sa | ${pc(b.s/b.n)} |`); }
L.push('','## Olaylar','','| OI düşüşü | Hareket | Yön | H | Olay | Gün | Ort. getiri | Tabana göre | Ort. R | t (gün) | Kazanma | 1. yarı | 2. yarı | Son 24 ay | BTC+ETH | Diğer |','|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for(const X of XS) for(const K of KS) for(const d of [1,-1]) for(const H of HS){ const all=ev[`${X}|${K}|${d}`]; const a=agg(all,H), b=base[`${d}|${H}`];
  const h1=agg(all.filter(e=>e.t<tMid),H), h2=agg(all.filter(e=>e.t>=tMid),H), l=agg(all.filter(e=>e.t>=t24),H), mj=agg(all.filter(e=>/^(BTC|ETH)USDT$/.test(e.s)),H), ot=agg(all.filter(e=>!/^(BTC|ETH)USDT$/.test(e.s)),H);
  L.push(`| ≥%${X*100} | ≥${K} ATR | ${d>0?'long (düşüş sonrası)':'short (sıkışma sonrası)'} | ${H} sa | ${a.n} | ${a.days||0} | ${pc(a.m)} | ${pc(a.m-b.s/b.n)} | ${fx(a.mR)} | ${fx(a.t,1)} | %${a.n?(100*a.win).toFixed(0):'–'} | ${pc(h1.m)} (${h1.n}) | ${pc(h2.m)} (${h2.n}) | ${pc(l.m)} (${l.n}) | ${pc(mj.m)} (${mj.n}) | ${pc(ot.m)} (${ot.n}) |`);
  console.log(X,K,d,H,a.n,pc(a.m),fx(a.t,1),'yarılar',pc(h1.m),pc(h2.m),'l24',pc(l.m)); }
L.push('','## Yıl yıl (OI ≥%3, ≥1,5 ATR, 24 sa)','','| Yön | '+[2020,2021,2022,2023,2024,2025,2026].join(' | ')+' |','|---|'+'---|'.repeat(7));
for(const d of [1,-1]){ const all=ev[`0.03|1.5|${d}`]; L.push(`| ${d>0?'long':'short'} | `+[2020,2021,2022,2023,2024,2025,2026].map(y=>{ const a=agg(all.filter(e=>new Date(e.t).getUTCFullYear()===y),24); return a.n?`${pc(a.m)} (${a.n})`:'–'; }).join(' | ')+' |'); }
fs.writeFileSync(OUT,L.join('\n')+'\n'); console.log('yazıldı',OUT);
