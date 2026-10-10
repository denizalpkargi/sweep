// Test #41 (10 Ekim 2026): çıkış varyantları, aynı girişler (bugünkü giriş kuralını geçen masa kararları, giriş sonraki 15 dk mumun VWAP'ı).
//  a   bugünkü plan: stop sd, 1,5R'de %50 (maker) + stop girişe, runR (3R, karşı trendde 2R) %60, iz 1R / 0,7R (risk0), 8 sa
//  b2  aynı plan, stop 2 × sd (hedefler yeni riskle; canlıdaki stopMult 2 gibi, $ risk aynı → R yeni stopla ölçülür)
//  b3  aynı plan, stop 3 × sd
//  c1  hedef 1 yok: ilk stop sd, baştan iz 2,5 × ATR(1 sa), 8 sa
//  c2  aynı, 24 sa
//  c3  ilk stop sd, baştan iz 2,5 × ATR15 × √24 (6 sa karşılığı), 24 sa
//  d   yalnız zaman çıkışı 4 / 8 sa + felaket stopu 3 / 4 × ATR(1 sa)
// Coin+yön başına tek açık işlem (her varyant kendi dizisiyle). R birimi: a, c, d için sd (bugünkü boy); b için o varyantın stopu.
// Kullanım: node tests/test41-cikis.js → tests/test41-cikis-report.md
const fs=require('fs'), path=require('path');
const L=require('./test40-lib.js'); const {M15,mean,sdev,fx,ny,iso}=L;
const PLAN=d=>({t1R:1.5,t1Part:0.5,t2R:d.rr2,t2Part:0.6,trail1:'risk0',be:true});
const V={
  a:{ad:'a · bugünkü plan',f:(k,d,i)=>({riskU:d.sd,stop:d.sd,cat:null,plan:PLAN(d),holdBars:32})},
  b2:{ad:'b · stop 2× (hedefler 2× ile)',f:(k,d,i)=>({riskU:2*d.sd,stop:2*d.sd,cat:null,plan:PLAN(d),holdBars:32})},
  b3:{ad:'b · stop 3×',f:(k,d,i)=>({riskU:3*d.sd,stop:3*d.sd,cat:null,plan:PLAN(d),holdBars:32})},
  c1:{ad:'c · hedefsiz, iz 2,5 × ATR(1 sa), 8 sa',f:(k,d,i)=>{ const a=L.atr1h(k,k.t[i]+M15); return Number.isFinite(a)?{riskU:d.sd,stop:d.sd,cat:null,plan:null,trailD:2.5*a,holdBars:32}:null; }},
  c2:{ad:'c · hedefsiz, iz 2,5 × ATR(1 sa), 24 sa',f:(k,d,i)=>{ const a=L.atr1h(k,k.t[i]+M15); return Number.isFinite(a)?{riskU:d.sd,stop:d.sd,cat:null,plan:null,trailD:2.5*a,holdBars:96}:null; }},
  c3:{ad:'c · hedefsiz, iz 2,5 × ATR15 × √24, 24 sa',f:(k,d,i)=>({riskU:d.sd,stop:d.sd,cat:null,plan:null,trailD:2.5*L.atr15(k,i)*Math.sqrt(24),holdBars:96})},
  d43:{ad:'d · 4 sa zaman + 3 × ATR(1 sa) felaket',f:(k,d,i)=>{ const a=L.atr1h(k,k.t[i]+M15); return Number.isFinite(a)?{riskU:d.sd,stop:null,cat:3*a,plan:null,holdBars:16}:null; }},
  d44:{ad:'d · 4 sa zaman + 4 × ATR(1 sa)',f:(k,d,i)=>{ const a=L.atr1h(k,k.t[i]+M15); return Number.isFinite(a)?{riskU:d.sd,stop:null,cat:4*a,plan:null,holdBars:16}:null; }},
  d83:{ad:'d · 8 sa zaman + 3 × ATR(1 sa)',f:(k,d,i)=>{ const a=L.atr1h(k,k.t[i]+M15); return Number.isFinite(a)?{riskU:d.sd,stop:null,cat:3*a,plan:null,holdBars:32}:null; }},
  d84:{ad:'d · 8 sa zaman + 4 × ATR(1 sa)',f:(k,d,i)=>{ const a=L.atr1h(k,k.t[i]+M15); return Number.isFinite(a)?{riskU:d.sd,stop:null,cat:4*a,plan:null,holdBars:32}:null; }},
};
async function main(){
  const t0=Date.now(); const {by,all,n}=await L.loadDecisions(); console.log('karar',n);
  const R={}; for(const v in V) R[v]=[];
  const syms=Object.keys(by).sort(); let si=0;
  for(const s of syms){ si++; const k=L.loadCoin(s); if(!k) continue; const list=by[s].sort((a,b)=>a.t-b.t);
    for(const v in V) for(const x of L.takeSeq(list,k,(d,i)=>V[v].f(k,d,i))) R[v].push({t:x.d.t,dir:x.d.dir,score:x.d.score,R:x.r.R,pct:x.r.pct,how:x.r.how,stage:x.r.stage,R0:x.d.R0,hold:(x.r.endT-k.t[x.i]-M15)/36e5});
    if(si%25===0) console.log(si,'/',syms.length,s,((Date.now()-t0)/1e3).toFixed(0)+' sn'); }
  const a=R.a; const T0=Math.min(...a.map(x=>x.t)), T1=Math.max(...a.map(x=>x.t)); const P=L.periods(T0,T1);
  const cell=b=>fx(mean(b.map(x=>x.R)));
  let md=`# Test #41 · Çıkış varyantları, aynı masa girişleri\n\n10 Ekim 2026 · \`node tests/test41-cikis.js\`\n\n`;
  md+=`## Ne yapıldı\n\nBugünkü giriş kuralını geçen ${ny(n)} masa kararı (${iso(T0)} → ${iso(T1)}, ayın ilk 30 coini). Giriş karar mumundan sonraki 15 dk mumun VWAP'ı + kayma %0,03, taker %0,05; hedefler maker %0,02, stop/zaman çıkışları taker + kayma; zaman çıkışı süre dolan mumun VWAP'ı; fonlama arşivden. 15 dk fiyat yolu, her mumda önce ters uç (aynı mumda stop ve hedef → stop). Coin+yön başına tek açık işlem (her varyant kendi dizisiyle; işlem sayıları bu yüzden farklı).\n\nR birimi: a, c, d için masanın stop uzaklığı \`sd\` (bugünkü boy); b'de o varyantın stopu (canlıdaki stopMult gibi $ risk sabit, boy küçülür). Felaket stoplu d'de kayıp 1R'yi aşabilir.\n\n`;
  md+=`## Ortalama R (maliyet + fonlama dahil)\n\n| varyant | işlem | tümü | 1. yarı | 2. yarı | son 12 ay | t (tümü) | % / işlem | kazanma | ort. tutuş sa |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
  for(const v in V){ const b=R[v]; const rr=b.map(x=>x.R); md+=`| ${V[v].ad} | ${ny(b.length)} | ${cell(b)} | ${Object.values(P).map(f=>cell(b.filter(f))).join(' | ')} | ${fx(mean(rr)/sdev(rr)*Math.sqrt(rr.length),1)} | ${fx(100*mean(b.map(x=>x.pct)),3)} % | %${(100*b.filter(x=>x.R>0).length/b.length).toFixed(1)} | ${mean(b.map(x=>x.hold)).toFixed(1).replace('.',',')} |\n`; }
  md+=`\nReferans: örnekteki bot R'si (kapanışta market giriş, fonlamasız) aynı kararlarda ${fx(mean(a.map(x=>x.R0)))}; VWAP girişli bugünkü plan (a) ${cell(a)}.\n\n`;
  md+=`## Long / short ayrı (tümü / 1. yarı / 2. yarı / son 12 ay)\n\n| varyant | long | short |\n|---|---|---|\n`;
  for(const v in V){ const g=dir=>{ const b=R[v].filter(x=>x.dir===dir); return [b,...Object.values(P).map(f=>b.filter(f))].map(cell).join(' / '); }; md+=`| ${V[v].ad} | ${g('long')} | ${g('short')} |\n`; }
  md+=`\n## Puan dilimleri (tümü / 1. yarı / 2. yarı / son 12 ay)\n\n| varyant | 35–45 | 45–55 | 55+ |\n|---|---|---|---|\n`;
  for(const v in V){ md+=`| ${V[v].ad} | ${[[0.35,0.45],[0.45,0.55],[0.55,9]].map(([lo,hi])=>{ const b=R[v].filter(x=>x.score>=lo&&x.score<hi); return [b,...Object.values(P).map(f=>b.filter(f))].map(cell).join(' / ')+` (${ny(b.length)})`; }).join(' | ')} |\n`; }
  const yrs=[...new Set(a.map(x=>new Date(x.t).getUTCFullYear()))].sort();
  md+=`\n## Yıl yıl (R)\n\n| varyant | ${yrs.join(' | ')} |\n|---|${yrs.map(()=>'---:').join('|')}|\n`;
  for(const v in V) md+=`| ${V[v].ad} | ${yrs.map(y=>cell(R[v].filter(x=>new Date(x.t).getUTCFullYear()===y))).join(' | ')} |\n`;
  md+=`\n## Çıkış nedenleri\n\n| varyant | ilk stop / felaket | hedef 1 sonrası stop / iz | zaman | veri sonu |\n|---|---:|---:|---:|---:|\n`;
  for(const v in V){ const b=R[v]; const c=f=>'%'+(100*b.filter(f).length/b.length).toFixed(1); md+=`| ${V[v].ad} | ${c(x=>x.how==='stop')} | ${c(x=>x.how==='stop2')} | ${c(x=>x.how==='zaman')} | ${c(x=>x.how==='son')} |\n`; }
  md+=`\nNot: c varyantlarında iz baştan çalıştığı için "ilk stop" satırı izin kârlı bölgeye geçmeden vurduğu stopları da içerir.\n`;
  md=md.replace(/%(\d+)\.(\d)/g,'%$1,$2');
  fs.writeFileSync(path.join(__dirname,'test41-cikis-report.md'),md); console.log(md);
}
main().catch(e=>{ console.error(e); process.exit(1); });
