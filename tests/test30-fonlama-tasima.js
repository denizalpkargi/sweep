// Test #30 (9 Ekim 2026, BIS WP 1087'den): fonlama taşıması = spot al + aynı nominalde perp sat, fonlama gelirini topla.
// Veri: arch/funding (8 sa), arch/spot15m (spot mumlar), arch/15m (perp mumlar), universe.json (ayın ilk 100'ü). 2023-06'dan (spot verisi).
// Kural: her fonlama anında (00/08/16 UTC) coinin son F fonlamasının ortalaması "beklenen fonlama". Dengeleme günü (Pazartesi 00:00 ya da her gün 00:00)
//   beklenen fonlaması ≥ eşik olan coinlerden en yüksek K'sı eşit nominalle tutulur; tutulan coinin beklenen fonlaması < 0 olursa ilk fonlama anında çıkılır;
//   evrenden çıkan ya da verisi biten coin kapanır. Giriş/çıkış: fonlama anındaki 15 dk mumun VWAP'ı (spot ve perp ayrı), o mumda fonlama alınmaz.
// P&L (nominal N): her 8 sa fonlama oranı × N (short perp alır) + N × (spot basit getiri − perp basit getiri) (baz değişimi; VWAP → VWAP);
//   maliyet gidiş-dönüş: taker spot %0,1 + perp %0,05 her yönde → %0,30; maker senaryosu %0,20 (spot %0,1 maker + perp %0,02... yuvarlak).
// Sermaye: "1,33N" = spot N + perp teminatı N/3 (3x izole; likidasyon riski 8 sa'lik baz sıçramasında ölçülür); "2N" = teminat tam (kaldıraçsız).
// Ölçü: yıllık getiri (nominal ve sermaye üzerinden), en büyük düşüş, iki yarı, yıl yıl, gelir ayrışımı (fonlama / baz / maliyet), işlem sayısı, ortalama tutuş,
//   en kötü 8 sa baz hareketi (3x teminatla −%33 baz = likidasyon). Varyantlar: K 5/10, eşik %0,01/%0,03 (8 sa), F 9/21 fonlama, dengeleme haftalık/günlük.
// Baz stopu (isteğe bağlı): perp primi (perp/spot − 1) girişe göre %3/%5'ten çok artarsa çık (short perp sıkışması: ALPACA Nisan 2025, LPT Mayıs 2025, BNX Mart 2025 gerçek olaylar).
// Fiyat: 15 dk mumun VWAP'ı, mumun aralığı dışındaysa kapanış (arşivde 2023-09-19 16:00 gibi bozuk q alanları var); perp hacmi 0 ise veri yok sayılır (listeden çıkmış).
// Kullanım: node tests/test30-fonlama-tasima.js [--from 2023-06] [--out tests/test30-fonlama-tasima-report.md]
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'); const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const FROM=String(arg('from','2023-06')), OUT=arg('out',path.join(__dirname,'test30-fonlama-tasima-report.md'));
const H8=288e5, M15=9e5, DAY=864e5; const fixT=t=>t>1e14?Math.floor(t/1000):t;
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const months=Object.keys(U).filter(m=>m>=FROM).sort();
const syms=[...new Set(months.flatMap(m=>U[m].slice(0,100)))].filter(s=>fs.existsSync(path.join(ARCH,'spot15m',s+'.csv'))&&fs.existsSync(path.join(ARCH,'15m',s+'.csv'))&&fs.existsSync(path.join(ARCH,'funding',s+'.csv')));
console.log('coin',syms.length,'ay',months[0],'→',months[months.length-1]);
const T0=Date.UTC(+FROM.slice(0,4),+FROM.slice(5,7)-1,1);
// 15 dk VWAP → fonlama anlarına (8 sa) eşle: vwap[t] = o mumun q/v (yoksa kapanış)
// fiyat = mumun VWAP'ı (q/v), mumun [düşük, yüksek] aralığı dışındaysa (arşivde bozuk q alanı, ör. 2023-09-19 16:00) kapanış; hacim 0 (perp listeden çıkmış, fiyat donmuş) → veri yok
function vwapAt(file){ const m=new Map(); for(const l of fs.readFileSync(file,'utf8').split('\n')){ if(!/^[0-9]/.test(l)) continue; const c=l.split(','); const t=fixT(+c[0]); if(t<T0-DAY) continue; if(t%H8!==0) continue; const v=+c[5], q=+c[7], h=+c[2], lo=+c[3], cl=+c[4]; if(!(v>0)) continue; const vw=q>0?q/v:cl; m.set(t, vw>=lo*0.999&&vw<=h*1.001?vw:cl); } return m; }
const D={};
for(const s of syms){ const f=new Map(); for(const l of fs.readFileSync(path.join(ARCH,'funding',s+'.csv'),'utf8').split('\n')){ if(!/^[0-9]/.test(l)) continue; const c=l.split(','); const t=Math.round(+c[0]/H8)*H8; if(t>=T0-10*DAY) f.set(t,+c[1]); }
  D[s]={f, spot:vwapAt(path.join(ARCH,'spot15m',s+'.csv')), perp:vwapAt(path.join(ARCH,'15m',s+'.csv'))}; }
const tEnd=Math.max(...syms.map(s=>Math.max(...[...D[s].perp.keys()],0)));
const times=[]; for(let t=T0;t<=tEnd;t+=H8) times.push(t);
const inUni=(s,t)=>{ const m=new Date(t).toISOString().slice(0,7); return (U[m]||[]).slice(0,100).includes(s); };
const uniCache=new Map(); const uniAt=t=>{ const m=new Date(t).toISOString().slice(0,7); if(!uniCache.has(m)) uniCache.set(m,new Set((U[m]||[]).slice(0,100))); return uniCache.get(m); };
// beklenen fonlama: son F fonlamanın ortalaması (t anındaki dahil değil; t'de ödenecek oran zaten biliniyor ama muhafazakâr)
function expF(s,t,F){ const f=D[s].f; let sum=0,n=0; for(let k=1;k<=F;k++){ const r=f.get(t-k*H8); if(r!==undefined){ sum+=r; n++; } } return n>=Math.min(F,3)?sum/n:NaN; }
function run(cfg){
  const {K,thr,F,daily,cost}=cfg; const pos=new Map(); // s → {spot0,perp0,t0,fund,basis}
  const eq=[], trades=[], flow={fund:0,basis:0,cost:0}; let nomPnl=0, worst8=0;
  for(const t of times){ const uni=uniAt(t); const day=new Date(t);
    // 1) açık pozisyonlar: fonlama + baz (önceki 8 sa'ten bu ana)
    for(const [s,p] of pos){ const sp=D[s].spot.get(t), pp=D[s].perp.get(t), r=D[s].f.get(t);
      if(sp===undefined||pp===undefined){ p.dead=true; continue; }
      const b=(sp/p.spotL-1)-(pp/p.perpL-1); if(b<worst8) worst8=b; const fr=r===undefined?0:r;
      p.fund+=fr; p.basis+=b; flow.fund+=fr; flow.basis+=b; nomPnl+=fr+b; p.spotL=sp; p.perpL=pp; }
    // 2) çıkışlar: beklenen fonlama < 0, evren dışı, veri yok
    const rebal=day.getUTCHours()===0&&(daily||day.getUTCDay()===1);
    for(const [s,p] of [...pos]){ const e=expF(s,t,F); const prem=p.dead?0:(D[s].perp.get(t)/D[s].spot.get(t)-1)-p.prem0; const bstopHit=cfg.bstop&&prem>cfg.bstop; const out=p.dead||!uni.has(s)||(isFinite(e)&&e<0)||bstopHit;
      if(out||(rebal&&isFinite(e)&&e<thr/2)){ const c=p.dead?cost/2:cost; flow.cost-=c; nomPnl-=c; trades.push({s,t0:p.t0,t1:t,fund:p.fund,basis:p.basis,net:p.fund+p.basis-cost,hold:(t-p.t0)/DAY,why:p.dead?'veri':!uni.has(s)?'evren':bstopHit?'baz stopu':e<0?'fonlama eksi':'dengeleme'}); pos.delete(s); } }
    // 3) dengeleme günü: eşik üstü en yüksek K
    if(rebal){ const cand=[]; for(const s of uni){ if(pos.has(s)||!D[s]) continue; const e=expF(s,t,F); if(isFinite(e)&&e>=thr&&D[s].spot.has(t)&&D[s].perp.has(t)) cand.push([s,e]); }
      cand.sort((a,b)=>b[1]-a[1]); for(const [s] of cand){ if(pos.size>=K) break; pos.set(s,{t0:t,spotL:D[s].spot.get(t),perpL:D[s].perp.get(t),prem0:D[s].perp.get(t)/D[s].spot.get(t)-1,fund:0,basis:0}); flow.cost-=0; } }
    eq.push([t,nomPnl/K]); // K yuva, her yuva nominal 1 → portföy getirisi nominal başına
  }
  for(const [s,p] of pos){ flow.cost-=cost; nomPnl-=cost; trades.push({s,t0:p.t0,t1:times[times.length-1],fund:p.fund,basis:p.basis,net:p.fund+p.basis-cost,hold:(times[times.length-1]-p.t0)/DAY,why:'açık'}); }
  eq[eq.length-1][1]=nomPnl/K;
  return {eq,trades,flow,worst8};
}
const pct=(x,d=2)=>(100*x).toFixed(d).replace('.',',')+' %'; const fx=(x,d=2)=>x.toFixed(d).replace('.',',');
function stats(r,cap){ const eq=r.eq; const y=(eq[eq.length-1][0]-eq[0][0])/(365*DAY); const tot=eq[eq.length-1][1]; let pk=0, dd=0; for(const [,v] of eq){ if(v>pk) pk=v; if(pk-v>dd) dd=pk-v; }
  const mid=eq[Math.floor(eq.length/2)][0]; const h1=eq.filter(e=>e[0]<mid), h2=eq.filter(e=>e[0]>=mid);
  const yr={}; for(let i=1;i<eq.length;i++){ const k=new Date(eq[i][0]).getUTCFullYear(); yr[k]=(yr[k]||0)+eq[i][1]-eq[i-1][1]; }
  const tr=r.trades; const n=tr.length;
  return {ann:tot/y/cap, dd:dd/cap, h1:(h1[h1.length-1][1]-h1[0][1])/cap, h2:(h2[h2.length-1][1]-h2[0][1])/cap, yr:Object.fromEntries(Object.entries(yr).map(([k,v])=>[k,v/cap])), n, hold:n?tr.reduce((a,x)=>a+x.hold,0)/n:0, win:n?tr.filter(x=>x.net>0).length/n:0, fund:r.flow.fund, basis:r.flow.basis, cost:r.flow.cost, worst8:r.worst8, netTr:n?tr.reduce((a,x)=>a+x.net,0)/n:0}; }
const CFGS=[]; for(const K of [5,10]) for(const thr of [1e-4,3e-4]) for(const F of [9,21]) for(const daily of [false,true]) CFGS.push({K,thr,F,daily,cost:0.003});
for(const bstop of [0.03,0.05]) for(const K of [5,10]) for(const thr of [1e-4,3e-4]) CFGS.push({K,thr,F:9,daily:false,cost:0.003,bstop});
CFGS.push({K:5,thr:3e-4,F:9,daily:false,cost:0.002}); CFGS.push({K:10,thr:1e-4,F:21,daily:false,cost:0.002}); CFGS.push({K:10,thr:3e-4,F:9,daily:false,cost:0.002,bstop:0.05});
const L=[`# Test #30 · Fonlama taşıması (spot al + perp sat) · ${new Date().toISOString().slice(0,10)}`,'',`${syms.length} coin (ayın ilk 100'ü ∩ spot verisi), ${months[0]} → ${months[months.length-1]}, 8 saatlik adım. Nominal başına getiri (N = bir yuvanın spot nominali); sermaye sütunları: 1,33N (perp teminatı 3x) ve 2N (kaldıraçsız). Maliyet gidiş-dönüş %0,30 (taker) / %0,20 (maker). Beklenen fonlama = son F fonlamanın ortalaması; eşik 8 saatlik oran.`,'',
 '| K | Eşik | F | Dengeleme | Baz stopu | Maliyet | Yıllık (N) | Yıllık (1,33N) | Yıllık (2N) | Düşüş (N) | 1. yarı | 2. yarı | İşlem | Tutuş g | Kazanma | Fonlama Σ | Baz Σ | Maliyet Σ | İşlem başı net | En kötü 8 sa baz |','|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
const RES=[];
for(const c of CFGS){ const r=run(c); const s=stats(r,1); RES.push({c,r,s});
  L.push(`| ${c.K} | ${pct(c.thr,2)} | ${c.F} | ${c.daily?'günlük':'haftalık'} | ${c.bstop?pct(c.bstop,0):'—'} | ${pct(c.cost,1)} | ${pct(s.ann)} | ${pct(s.ann/1.333)} | ${pct(s.ann/2)} | ${pct(s.dd)} | ${pct(s.h1)} | ${pct(s.h2)} | ${s.n} | ${fx(s.hold,1)} | ${pct(s.win,0)} | ${pct(s.fund/c.K)} | ${pct(s.basis/c.K)} | ${pct(s.cost/c.K)} | ${pct(s.netTr)} | ${pct(s.worst8)} |`);
  console.log(JSON.stringify(c), 'yıllık', pct(s.ann), 'dd', pct(s.dd), 'işlem', s.n, 'yarılar', pct(s.h1), pct(s.h2)); }
const best=RES.slice().sort((a,b)=>b.s.ann-a.s.ann)[0];
L.push('', `## Yıl yıl (en iyi ayar: K ${best.c.K}, eşik ${pct(best.c.thr)}, F ${best.c.F}, ${best.c.daily?'günlük':'haftalık'}, maliyet ${pct(best.c.cost,1)}; nominal başına)`,'', '| Yıl | Getiri |','|---|---|');
for(const [k,v] of Object.entries(best.s.yr)) L.push(`| ${k} | ${pct(v)} |`);
L.push('', '## En iyi ayarın işlemleri: çıkış nedenine göre','', '| Neden | İşlem | Ort. net | Ort. fonlama | Ort. baz | Ort. tutuş g |','|---|---|---|---|---|---|');
const byWhy={}; for(const t of best.r.trades){ (byWhy[t.why]=byWhy[t.why]||[]).push(t); }
for(const [w,a] of Object.entries(byWhy)) L.push(`| ${w} | ${a.length} | ${pct(a.reduce((x,y)=>x+y.net,0)/a.length)} | ${pct(a.reduce((x,y)=>x+y.fund,0)/a.length)} | ${pct(a.reduce((x,y)=>x+y.basis,0)/a.length)} | ${fx(a.reduce((x,y)=>x+y.hold,0)/a.length,1)} |`);
L.push('', '## En kötü 10 işlem (en iyi ayar)','', '| Coin | Giriş | Çıkış | Net | Fonlama | Baz | Neden |','|---|---|---|---|---|---|---|');
for(const t of best.r.trades.slice().sort((a,b)=>a.net-b.net).slice(0,10)) L.push(`| ${t.s} | ${new Date(t.t0).toISOString().slice(0,10)} | ${new Date(t.t1).toISOString().slice(0,10)} | ${pct(t.net)} | ${pct(t.fund)} | ${pct(t.basis)} | ${t.why} |`);
// aylık fonlama ortamı: evrendeki medyan ve ilk 5 ortalaması
L.push('', '## Fonlama ortamı: ay ay evren medyanı ve en yüksek 5 coinin ortalaması (8 sa oranı)','', '| Ay | Medyan | İlk 5 ort. | Eksi fonlamalı coin payı |','|---|---|---|---|');
const mon={}; for(const t of times){ const m=new Date(t).toISOString().slice(0,7); const uni=uniAt(t); const v=[]; for(const s of uni){ const r=D[s]&&D[s].f.get(t); if(r!==undefined) v.push(r); } if(!v.length) continue; v.sort((a,b)=>b-a); const o=mon[m]=mon[m]||{med:[],top:[],neg:[]}; o.med.push(v[Math.floor(v.length/2)]); o.top.push(v.slice(0,5).reduce((a,b)=>a+b,0)/Math.min(5,v.length)); o.neg.push(v.filter(x=>x<0).length/v.length); }
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
for(const [m,o] of Object.entries(mon)) L.push(`| ${m} | ${pct(avg(o.med),3)} | ${pct(avg(o.top),3)} | ${pct(avg(o.neg),0)} |`);
fs.writeFileSync(OUT,L.join('\n')+'\n'); console.log('yazıldı',OUT);
