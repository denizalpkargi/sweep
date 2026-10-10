// Test #43 (10 Ekim 2026 akşamı, kullanıcı araştırma önerisine "devam edelim" dedi: 72 saat ve günlük ufka kaydır). Masa örnekleri + Ozan örneklem dışı
// tahminleri (2024-06'dan; önce python3 tests/test46-ozan-dok.py) ile 24 / 72 sa tutuş. Giriş sonraki 15 dk mumun VWAP'ı (market, taker + kayma),
// çıkış süre dolunca VWAP; stop: 2 × sd (bugünkü), 4 × ATR(1 sa) felaket, stopsuz. R birimi 2 × sd × giriş (bugünkü boy). Fonlama arşivden.
// Kümeler: Ozan alt onluk short (masasız), masa short ∧ Ozan alt onluk, masa short, Ozan üst onluk long (masasız), masa long #47 (BTC 24 sa ≤ 0 +
// 7 g yönünde + Ozan en kötü onluk değil), masa long (2), rastgele (Ozan saatlerinde bütün toplantılar). Ayrıca 2020'den masa kümeleri.
// Kullanım: node tests/test43-72sa.js → tests/test43-72sa-report.md
const fs=require('fs'), path=require('path');
const L=require('./test40-lib.js'); const {M15,H,DAY,FEE_T,SLIP,mean,sdev,fx,ny,iso}=L; const T=require('./test44-birlesim.js');
const OZ0=1717200000000;
function sim(k,i,dir,ru0,stopD,hold){ // stopD: giriş fiyatına oran ya da null
  const isL=dir==='long', sgn=isL?1:-1, jf=i+1; if(jf>=k.n||!(k.v[jf]>0)) return null; const e=k.vw[jf]*(1+sgn*SLIP);
  const stop=stopD!=null?e*(1-sgn*stopD):null, ru=ru0*e; let pnl=-e*FEE_T, fp=0; const end=Math.min(k.n-1,jf+hold);
  const fin=(px,j,how)=>{ pnl+=sgn*(px-e)-px*FEE_T; return {R:(pnl+fp)/ru,pct:(pnl+fp)/e,endT:k.t[j]+M15,how}; };
  const F=k.fund; let fi; { let a=0,b=F.length; const t0=k.t[jf]+M15; while(a<b){ const m=(a+b)>>1; if(F[m][0]<t0) a=m+1; else b=m; } fi=a; }
  for(let j=jf+1;j<=end;j++){
    while(fi<F.length&&F[fi][0]<k.t[j]+M15){ if(F[fi][0]>=k.t[j]) fp-=sgn*k.o[j]*F[fi][1]; fi++; }
    if(!(k.v[j]>0)){ if(j===end) return fin(k.c[j]*(1-sgn*SLIP),j,'son'); continue; }
    if(stop!=null){ if(isL?k.o[j]<=stop:k.o[j]>=stop) return fin(k.o[j]*(1-sgn*SLIP),j,'stop'); if(isL?k.l[j]<=stop:k.h[j]>=stop) return fin(stop*(1-sgn*SLIP),j,'stop'); }
    if(j===end) return fin(k.vw[j]*(1-sgn*SLIP),j,'zaman');
  }
  return fin(k.c[end]*(1-sgn*SLIP),end,'son');
}
const oz=d=>Number.isFinite(d.oq);
const SETS={
  oz_s:{ad:'Ozan alt onluk short (masasız)',f:d=>d.dir==='short'&&oz(d)&&d.oq>=0.9},
  m_oz_s:{ad:'masa short ∧ Ozan alt onluk',f:d=>d.dir==='short'&&d.pass&&oz(d)&&d.oq>=0.9},
  m_s_oz:{ad:'masa short (Ozan saatleri)',f:d=>d.dir==='short'&&d.pass&&oz(d)},
  oz_l:{ad:'Ozan üst onluk long (masasız)',f:d=>d.dir==='long'&&oz(d)&&d.oq>=0.9},
  m_l47:{ad:'masa long #47 (BTC 24 sa ≤ 0, 7 g yönünde, Ozan en kötü onluk değil)',f:d=>d.dir==='long'&&d.pass&&T.F1(d)&&T.F2(d)&&oz(d)&&d.oq>=0.1},
  m_l2_oz:{ad:'masa long, 7 g yönünde (Ozan saatleri)',f:d=>d.dir==='long'&&d.pass&&T.F2(d)&&oz(d)},
  r_oz:{ad:'rastgele (Ozan saatlerinde bütün toplantılar)',f:d=>oz(d)},
  m_all:{ad:'2020+ · masa (bugünkü kural)',f:d=>d.pass,full:true},
  m_s:{ad:'2020+ · masa short',f:d=>d.dir==='short'&&d.pass,full:true},
  m_l12:{ad:'2020+ · masa long, BTC 24 sa ≤ 0 + 7 g yönünde',f:d=>d.dir==='long'&&d.pass&&T.F1(d)&&T.F2(d),full:true},
  r_all:{ad:'2020+ · rastgele (bütün toplantılar)',f:d=>true,full:true},
};
const HS=[24,72], ST=[['sd2','stop 2 × sd'],['cat4','felaket 4 × ATR(1 sa)'],['none','stopsuz']];
(async()=>{
  const t0=Date.now(); const {by}=await T.loadAll(); const OZM=T.loadOzan(); const R={}; for(const s in SETS) for(const h of HS) for(const [sk] of ST) R[s+'|'+h+'|'+sk]=[];
  const syms=Object.keys(by).sort(); let si=0;
  for(const s of syms){ si++; const k=L.loadCoin(s); if(!k) continue; const all=by[s];
    for(const d of all){ const qq=OZM[s]&&OZM[s].get(Math.floor((d.t+M15)/H)*H); d.oq=qq?(d.dir==='long'?qq[0]:1-qq[0]):NaN; }
    for(const sk in SETS){ const list=all.filter(SETS[sk].f); if(!list.length) continue;
      for(const h of HS) for(const [st] of ST){
        const run=(d,i)=>{ const a=st==='cat4'?L.atr1h(k,k.t[i]+M15):NaN; if(st==='cat4'&&!Number.isFinite(a)) return null; const e=k.c[i]; const stopD=st==='sd2'?2*d.sd:st==='cat4'?4*a/e:null; return sim(k,i,d.dir,2*d.sd,stopD,h*4); };
        for(const x of T.seq(list,k,run)) R[sk+'|'+h+'|'+st].push({t:x.d.t,dir:x.d.dir,R:x.r.R,pct:x.r.pct,how:x.r.how}); } }
    if(si%50===0) console.log(si,'/',syms.length,((Date.now()-t0)/1e3).toFixed(0)+' sn');
  }
  const mn=a=>a.reduce((p,q)=>q<p?q:p,Infinity), mx=a=>a.reduce((p,q)=>q>p?q:p,-Infinity);
  const tw=a=>{ const g={}; for(const x of a){ const w=Math.floor(x.t/(7*DAY)); (g[w]=g[w]||[]).push(x.pct); } const v=Object.values(g).map(z=>z.reduce((p,q)=>p+q,0)); return {t:mean(v)/sdev(v)*Math.sqrt(v.length),worst:mn(v)}; };
  let md=`# Test #43 · 72 saat: Ozan alt onluk short, masa ve rastgele (arşiv)\n\n10 Ekim 2026 · \`python3 tests/test46-ozan-dok.py && node tests/test43-72sa.js\`\n\nGiriş karar mumundan sonraki 15 dk mumun VWAP'ı + kayma %0,03, taker %0,05; çıkış 24 / 72 sa sonra o mumun VWAP'ı (taker + kayma) ya da stop. R birimi 2 × sd × giriş (bugünkü boy; felaket stopta ve stopsuzda kayıp 1R'yi aşabilir). Fonlama arşivden, basit getiri. Coin+yön başına tek açık işlem. Ozan kümeleri ${iso(OZ0)} → (örneklem dışı tahminler), yarılar her kümenin kendi döneminde. "Haftalık t": haftanın işlemlerinin % toplamı (eşit boy), haftalar arası t; "en kötü hafta" aynı toplam.\n\n`;
  md+=`| küme | ufuk · stop | işlem | R tümü | 1. yarı | 2. yarı | son 12 ay | % / işlem | en kötü işlem % | haftalık t | en kötü hafta % |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
  for(const sk in SETS) for(const h of HS) for(const [st,sn] of ST){ const a=R[sk+'|'+h+'|'+st]; if(!a.length) continue; const T0=mn(a.map(x=>x.t)), T1=mx(a.map(x=>x.t)); const P=Object.values(L.periods(T0,T1));
    const w=tw(a); md+=`| ${SETS[sk].ad} | ${h} sa · ${sn} | ${ny(a.length)} | ${fx(mean(a.map(x=>x.R)))} | ${P.map(f=>{ const b=a.filter(f); return b.length?fx(mean(b.map(x=>x.R))):'—'; }).join(' | ')} | ${fx(100*mean(a.map(x=>x.pct)),3)} | ${fx(100*mn(a.map(x=>x.pct)),1)} | ${fx(w.t,1)} | ${fx(100*w.worst,1)} |\n`; }
  const yrs=[2020,2021,2022,2023,2024,2025,2026];
  md+=`\n## Yıl yıl, 72 sa (R)\n\n| küme · stop | ${yrs.join(' | ')} |\n|---|${yrs.map(()=>'---:').join('|')}|\n`;
  for(const sk in SETS) for(const [st,sn] of ST){ const a=R[sk+'|72|'+st]; if(!a.length) continue; md+=`| ${SETS[sk].ad} · ${sn} | ${yrs.map(y=>{ const b=a.filter(x=>new Date(x.t).getUTCFullYear()===y); return b.length?fx(mean(b.map(x=>x.R))):'—'; }).join(' | ')} |\n`; }
  md=md.replace(/%(\d+)\.(\d)/g,'%$1,$2'); fs.writeFileSync(path.join(__dirname,'test43-72sa-report.md'),md); console.log(md);
})().catch(e=>{ console.error(e); process.exit(1); });
