// Test #57 (11 Ekim 2026 gecesi, gece taraması): canlıdaki 24 saatlik long (#47: masa long + BTC 24 sa ≤ 0 + 7 g yönünde) için gün içi çıkış kuralları.
// Girişler aynı (bugünkü L0'ın coin başına tek pozisyon dizisi), her kural aynı girişlerde → eşli fark. Kurallar veriye bakmadan sabitlendi:
//  L0 bugünkü: stop 2 × sd, 24 sa sonra VWAP.
//  L1 +1R görünce stop girişe (R = 2 × sd).
//  L2 +1R'de yarısı (maker), stop girişe, kalanı 24 sa.
//  L3 baştan iz süren stop, uzaklık 2 × sd (tepeden).
//  L4 yalnız felaket stopu 4 × ATR(1 sa) (#43'te 2020+ daha iyiydi).
//  L4b L4, ama boy felaket stopuna göre (R birimi 4 × ATR; ilk koşudan sonra eklendi, dolar riskini eşitlemek için).
//  L5 BTC girişten bu yana %2 düşerse (15 dk kapanış) o mumun ardından VWAP'tan çık.
//  L6 12 sa sonra çık.
//  L7 coin 15 dk kapanışı girişin 1R üstündeyken BTC 1 sa'te −%1 → çık (kârı BTC düşüşünde koru).
// Maliyet test40-lib (taker %0,05 + kayma %0,03, hedef maker %0,02), fonlama arşivden. Geçme: eşli fark iki yarıda ve son 12 ayda > 0, haftalık blok t ≥ 3 (7 test).
// Kullanım: node --max-old-space-size=6000 tests/test57-cikis-24sa.js → tests/test57-cikis-24sa-report.md
const fs=require('fs'), path=require('path');
const L=require('./test40-lib.js'); const {M15,H,DAY,mean,sdev,fx,ny,iso}=L; const T=require('./test44-birlesim.js');
const PL1={t1R:1,t1Part:0,t2R:null,t2Part:0,trail1:null,be:true}, PL2={t1R:1,t1Part:0.5,t2R:null,t2Part:0,trail1:null,be:true};
const btc=L.loadCoin('BTCUSDT');
function cutBtc(k,i,drop,hourly){ // ilk koşulun sağlandığı mum indeksi (k'de), yoksa null
  const j0=i+1, b0=btc.idx.get(k.t[j0]); if(b0==null) return null; const e=btc.c[b0-1];
  for(let q=1;q<=96;q++){ const b=b0+q; if(b>=btc.n) return null; if(hourly){ if(b-4<0) continue; if(btc.c[b]/btc.c[b-4]-1<=-drop) return q; } else if(btc.c[b]/e-1<=-drop) return q; }
  return null; }
const V={
  L0:{ad:'bugünkü: stop 2 × sd, 24 sa',f:(k,d,i)=>({riskU:2*d.sd,stop:2*d.sd,cat:null,plan:null,holdBars:96})},
  L1:{ad:'+1R → stop girişe',f:(k,d,i)=>({riskU:2*d.sd,stop:2*d.sd,cat:null,plan:PL1,holdBars:96})},
  L2:{ad:'+1R → yarısı + stop girişe',f:(k,d,i)=>({riskU:2*d.sd,stop:2*d.sd,cat:null,plan:PL2,holdBars:96})},
  L3:{ad:'baştan iz 2 × sd',f:(k,d,i)=>({riskU:2*d.sd,stop:2*d.sd,cat:null,plan:null,trailD:2*d.sd*k.vw[i+1],holdBars:96})},
  L4:{ad:'yalnız felaket 4 × ATR(1 sa)',f:(k,d,i)=>{ const a=L.atr1h(k,k.t[i]+M15); return a>0?{riskU:2*d.sd,stop:null,cat:4*a,plan:null,holdBars:96}:null; }},
  L4b:{ad:'felaket 4 × ATR(1 sa), boy stopa göre (dolar riski eşit)',f:(k,d,i)=>{ const a=L.atr1h(k,k.t[i]+M15); return a>0?{riskU:4*a/k.vw[i+1],stop:null,cat:4*a,plan:null,holdBars:96}:null; }},
  L5:{ad:'BTC girişten −%2 → çık',f:(k,d,i)=>{ const c=cutBtc(k,i,0.02,false); return {riskU:2*d.sd,stop:2*d.sd,cat:null,plan:null,holdBars:c?Math.min(96,c+1):96}; }},
  L6:{ad:'12 sa sonra çık',f:(k,d,i)=>({riskU:2*d.sd,stop:2*d.sd,cat:null,plan:null,holdBars:48})},
  L7:{ad:'kârda (≥1R) BTC 1 sa −%1 → çık',f:(k,d,i)=>{ const j0=i+1, e=k.vw[j0], b0=btc.idx.get(k.t[j0]); let cut=null;
    if(b0!=null) for(let q=1;q<=96&&j0+q<k.n;q++){ const b=b0+q; if(b>=btc.n||b<4) break; if(k.c[j0+q]>=e*(1+2*d.sd)&&btc.c[b]/btc.c[b-4]-1<=-0.01){ cut=q; break; } if(k.l[j0+q]<=e*(1-2*d.sd)) break; }
    return {riskU:2*d.sd,stop:2*d.sd,cat:null,plan:null,holdBars:cut?cut+1:96}; }},
};
(async()=>{
  const t0=Date.now(); const {by}=await T.loadAll(); const R={}; for(const v in V) R[v]=[];
  for(const s of Object.keys(by).sort()){ const list=by[s].filter(d=>d.dir==='long'&&d.pass&&T.F1(d)&&T.F2(d)); if(!list.length) continue; const k=L.loadCoin(s); if(!k) continue;
    const base=L.takeSeq(list,k,(d,i)=>V.L0.f(k,d,i));
    for(const x of base){ const row={t:x.d.t,s}; let ok=true; for(const v in V){ const sp=V[v].f(k,x.d,x.i); const r=sp?L.sim(k,x.i,'long',sp):null; if(!r){ ok=false; break; } row[v]=r.R; } if(ok) for(const v in V) R[v].push({t:row.t,R:row[v],d:row[v]-row.L0}); }
  }
  const a=R.L0, T0=Math.min(...a.map(x=>x.t)), T1=Math.max(...a.map(x=>x.t)), P=Object.values(L.periods(T0,T1));
  const wt=b=>{ const g=new Map(); for(const x of b){ const w=Math.floor(x.t/(7*DAY)); g.set(w,(g.get(w)||0)+x.d); } const v=[...g.values()]; return mean(v)/sdev(v)*Math.sqrt(v.length); };
  let md=`# Test #57 · 24 saatlik long için gün içi çıkış kuralları (arşiv)\n\n11 Ekim 2026 gecesi · \`node tests/test57-cikis-24sa.js\` · ${ny(a.length)} long, ${iso(T0)} → ${iso(T1)}\n\nGirişler canlı kuralla aynı (masa long + BTC 24 sa ≤ 0 + 7 g yönünde; Ozan süzgeci 2024-06 öncesi yok), giriş sonraki 15 dk VWAP. Her kural aynı girişlerde; fark = kural R − bugünkü R (R birimi 2 × sd). Haftalık t eşli farkın haftalık toplamları üzerinden.\n\n| kural | ort. R | 1. yarı | 2. yarı | son 12 ay | fark tümü | fark yarılar / son 12 ay | fark haftalık t | geçti |\n|---|---:|---:|---:|---:|---:|---|---:|---|\n`;
  const pass=[];
  for(const v in V){ const b=R[v]; const pr=P.map(f=>mean(b.filter(f).map(x=>x.R))), dp=P.map(f=>mean(b.filter(f).map(x=>x.d))), t=v==='L0'?NaN:wt(b);
    const ok=v!=='L0'&&dp.every(z=>z>0)&&t>=3; if(ok) pass.push(V[v].ad);
    md+=`| ${v} ${V[v].ad} | ${fx(mean(b.map(x=>x.R)))} | ${pr.map(z=>fx(z)).join(' | ')} | ${v==='L0'?'–':fx(mean(b.map(x=>x.d)))} | ${v==='L0'?'–':dp.map(z=>fx(z)).join(' / ')} | ${fx(t,1)} | ${v==='L0'?'–':ok?'**evet**':'hayır'} |\n`;
    console.log(v,fx(mean(b.map(x=>x.R))),pr.map(z=>fx(z)).join('/'),'fark',dp.map(z=>fx(z)).join('/'),'t',fx(t,1)); }
  md+=`\n## Geçenler\n\n${pass.length?pass.map(x=>'- '+x).join('\n'):'- Geçen yok.'}\n`;
  fs.writeFileSync(path.join(__dirname,'test57-cikis-24sa-report.md'),md); console.log('yazıldı',((Date.now()-t0)/1e3).toFixed(0)+' sn');
})().catch(e=>{ console.error(e); process.exit(1); });
