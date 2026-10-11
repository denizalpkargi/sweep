// Test #52 (11 Ekim 2026, kullanıcı "2. arşiv testi" dedi): "masa short + 72 sa tut + Ozan işlem kalitesi süzgeci" ayrı aday olarak, stoplu ve fonlamalı.
// Süzgeç: tests/ozan-kalite-model.py hedef g72x (aynı andaki kararların ortalamasından fark, 72 sa kapanıştan kapanışa) örneklem dışı tahmini;
// k30 = en kötü %30 değil, k50 = en kötü %50 değil (eşik her an önceki 90 günün tahminlerinden). Önce: python3 tests/test52-kalite-tahmin.py <ok klasörü>.
// Simülatör test #43 ile aynı: giriş karar mumundan sonraki 15 dk mumun VWAP'ı + kayma %0,03, taker %0,05; çıkış süre dolunca VWAP ya da stop;
// stop 2 × sd, felaket 4 × ATR(1 sa), stopsuz; R birimi 2 × sd × giriş; fonlama arşivden, basit getiri; coin+yön başına tek açık işlem.
// Kümeler kalite tahmini olan kararlarda (2022-01 →, masanın girdiği kararlar); rastgele = aynı dönemde bütün toplantılar.
// Kullanım: node tests/test52-ozan-kalite-72sa.js → tests/test52-ozan-kalite-72sa-report.md
const fs=require('fs'), path=require('path');
const L=require('./test40-lib.js'); const {M15,DAY,SLIP,FEE_T,mean,sdev,fx,ny}=L; const T=require('./test44-birlesim.js');
const T22=Date.UTC(2022,0,1);
function sim(k,i,dir,ru0,stopD,hold){ // test43-72sa.js ile aynı
  const isL=dir==='long', sgn=isL?1:-1, jf=i+1; if(jf>=k.n||!(k.v[jf]>0)) return null; const e=k.vw[jf]*(1+sgn*SLIP);
  const stop=stopD!=null?e*(1-sgn*stopD):null, ru=ru0*e; let pnl=-e*FEE_T, fp=0; const end=Math.min(k.n-1,jf+hold);
  const fin=(px,j,how)=>{ pnl+=sgn*(px-e)-px*FEE_T; return {R:(pnl+fp)/ru,pct:(pnl+fp)/e,e,endT:k.t[j]+M15,how}; };
  const F=k.fund; let fi; { let a=0,b=F.length; const t0=k.t[jf]+M15; while(a<b){ const m=(a+b)>>1; if(F[m][0]<t0) a=m+1; else b=m; } fi=a; }
  for(let j=jf+1;j<=end;j++){
    while(fi<F.length&&F[fi][0]<k.t[j]+M15){ if(F[fi][0]>=k.t[j]) fp-=sgn*k.o[j]*F[fi][1]; fi++; }
    if(!(k.v[j]>0)){ if(j===end) return fin(k.c[j]*(1-sgn*SLIP),j,'son'); continue; }
    if(stop!=null){ if(isL?k.o[j]<=stop:k.o[j]>=stop) return fin(k.o[j]*(1-sgn*SLIP),j,'stop'); if(isL?k.l[j]<=stop:k.h[j]>=stop) return fin(stop*(1-sgn*SLIP),j,'stop'); }
    if(j===end) return fin(k.vw[j]*(1-sgn*SLIP),j,'zaman');
  }
  return fin(k.c[end]*(1-sgn*SLIP),end,'son');
}
function loadKalite(){ const f=path.join(L.ARCH,'_t52-kalite.csv'); if(!fs.existsSync(f)) throw new Error('önce: python3 tests/test52-kalite-tahmin.py <ok klasörü>');
  const m={}; for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const [set,sym,t,dir,p,k30,k50]=l.split(','); ((m[set]=m[set]||new Map())).set(sym+'|'+t+'|'+dir,{p:+p,k30:k30==='1',k50:k50==='1'}); } return m; }
const q=(d,s)=>d.kq&&d.kq[s];
const SETS={
  m_s:{ad:'masa short (kalite tahmini olan)',f:d=>d.dir==='short'&&d.pass&&q(d,'HEPSI')},
  m_s_k30:{ad:'masa short ∧ kalite en kötü %30 değil (HEPSI)',f:d=>d.dir==='short'&&d.pass&&q(d,'HEPSI')&&q(d,'HEPSI').k30},
  m_s_k50:{ad:'masa short ∧ kalite en kötü %50 değil (HEPSI)',f:d=>d.dir==='short'&&d.pass&&q(d,'HEPSI')&&q(d,'HEPSI').k50},
  m_s_d30:{ad:'masa short ∧ kalite en kötü %30 (atılanlar, HEPSI)',f:d=>d.dir==='short'&&d.pass&&q(d,'HEPSI')&&!q(d,'HEPSI').k30},
  m_s_b30:{ad:'masa short ∧ en kötü %30 değil (yalnız B)',f:d=>d.dir==='short'&&d.pass&&q(d,'B')&&q(d,'B').k30},
  m_s_hb30:{ad:'masa short ∧ en kötü %30 değil (HEPSI-B)',f:d=>d.dir==='short'&&d.pass&&q(d,'HEPSI-B')&&q(d,'HEPSI-B').k30},
  m_l:{ad:'masa long (kalite tahmini olan)',f:d=>d.dir==='long'&&d.pass&&q(d,'HEPSI')},
  m_l_k30:{ad:'masa long ∧ en kötü %30 değil (HEPSI)',f:d=>d.dir==='long'&&d.pass&&q(d,'HEPSI')&&q(d,'HEPSI').k30},
  r_s:{ad:'rastgele short (2022+, bütün toplantılar)',f:d=>d.dir==='short'&&d.t>=T22},
};
const HS=[24,72], ST=[['sd2','stop 2 × sd'],['cat4','felaket 4 × ATR(1 sa)'],['none','stopsuz']];
(async()=>{
  const t0=Date.now(); const {by}=await T.loadAll(); const KQ=loadKalite(); const R={}; for(const s in SETS) for(const h of HS) for(const [sk] of ST) R[s+'|'+h+'|'+sk]=[];
  const syms=Object.keys(by).sort(); let si=0, nk=0;
  for(const s of syms){ si++; const all=by[s];
    for(const d of all){ const key=s+'|'+d.t+'|'+d.dir; let any=false; d.kq={}; for(const set in KQ){ const v=KQ[set].get(key); if(v){ d.kq[set]=v; any=true; } } if(any) nk++; else d.kq=null; }
    if(!all.some(d=>d.t>=T22)) continue; const k=L.loadCoin(s); if(!k) continue;
    for(const sk in SETS){ const list=all.filter(SETS[sk].f); if(!list.length) continue;
      for(const h of HS) for(const [st] of ST){
        const run=(d,i)=>{ const a=st==='cat4'?L.atr1h(k,k.t[i]+M15):NaN; if(st==='cat4'&&!Number.isFinite(a)) return null; const e=k.c[i]; const stopD=st==='sd2'?2*d.sd:st==='cat4'?4*a/e:null; return sim(k,i,d.dir,2*d.sd,stopD,h*4); };
        for(const x of T.seq(list,k,run)) R[sk+'|'+h+'|'+st].push({sym:s,t:x.d.t,dir:x.d.dir,sd:x.d.sd,e:x.r.e,endT:x.r.endT,R:x.r.R,pct:x.r.pct,how:x.r.how}); } }
    if(si%50===0) console.log(si,'/',syms.length,((Date.now()-t0)/1e3).toFixed(0)+' sn');
  }
  console.log('kalite eşleşen karar',nk);
  const mn=a=>a.reduce((p,q)=>q<p?q:p,Infinity), mx=a=>a.reduce((p,q)=>q>p?q:p,-Infinity);
  const tw=a=>{ const g={}; for(const x of a){ const w=Math.floor(x.t/(7*DAY)); (g[w]=g[w]||[]).push(x.pct); } const v=Object.values(g).map(z=>z.reduce((p,q)=>p+q,0)); return {t:mean(v)/sdev(v)*Math.sqrt(v.length),worst:mn(v)}; };
  const tR=a=>{ const v=a.map(x=>x.R); return mean(v)/sdev(v)*Math.sqrt(v.length); };
  let md=`# Test #52 · masa short + 72 sa + Ozan işlem kalitesi süzgeci (arşiv)\n\n11 Ekim 2026 · \`python3 tests/test52-kalite-tahmin.py <ok> && node tests/test52-ozan-kalite-72sa.js\`\n\n`;
  md+=`Süzgeç: Ozan işlem kalitesi modeli (hedef g72x, LightGBM, ileri yürüyen, 6 ayda bir yeniden eğitim) örneklem dışı tahmini, 2022-01 →; "en kötü %30 değil" eşiği her an önceki 90 günün tahminlerinden (canlıda uygulanabilir). Masa örnekleri düzeltilmiş simülatörle (11 Ekim 2026) yeniden üretildi; işlem sonucu buradaki simülatörden: giriş karar mumundan sonraki 15 dk mumun VWAP'ı + kayma %0,03, taker %0,05; çıkış süre dolunca VWAP (taker + kayma) ya da stop. R birimi 2 × sd × giriş (bugünkü boy; felaket stopta ve stopsuzda kayıp 1R'yi aşabilir). Fonlama arşivden, basit getiri. Coin+yön başına tek açık işlem. "Haftalık t": haftanın işlemlerinin % toplamı (eşit boy), haftalar arası t. "t (işlem)": işlemler bağımsız sayılarak R'nin t'si (iyimser; 72 sa işlemler üst üste biner).\n\n`;
  md+=`| küme | ufuk · stop | işlem | R tümü | t (işlem) | 1. yarı | 2. yarı | son 12 ay | % / işlem | en kötü işlem % | haftalık t | en kötü hafta % |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
  for(const sk in SETS) for(const h of HS) for(const [st,sn] of ST){ const a=R[sk+'|'+h+'|'+st]; if(!a.length) continue; const T0=mn(a.map(x=>x.t)), T1=mx(a.map(x=>x.t)); const P=Object.values(L.periods(T0,T1));
    const w=tw(a); md+=`| ${SETS[sk].ad} | ${h} sa · ${sn} | ${ny(a.length)} | ${fx(mean(a.map(x=>x.R)))} | ${fx(tR(a),1)} | ${P.map(f=>{ const b=a.filter(f); return b.length?fx(mean(b.map(x=>x.R))):'—'; }).join(' | ')} | ${fx(100*mean(a.map(x=>x.pct)),3)} | ${fx(100*mn(a.map(x=>x.pct)),1)} | ${fx(w.t,1)} | ${fx(100*w.worst,1)} |\n`; }
  const yrs=[2022,2023,2024,2025,2026];
  md+=`\n## Yıl yıl, 72 sa (R)\n\n| küme · stop | ${yrs.join(' | ')} |\n|---|${yrs.map(()=>'---:').join('|')}|\n`;
  for(const sk in SETS) for(const [st,sn] of ST){ const a=R[sk+'|72|'+st]; if(!a.length) continue; md+=`| ${SETS[sk].ad} · ${sn} | ${yrs.map(y=>{ const b=a.filter(x=>new Date(x.t).getUTCFullYear()===y); return b.length?fx(mean(b.map(x=>x.R))):'—'; }).join(' | ')} |\n`; }
  md+=`\n## Çıkış nedenleri, 72 sa · stop 2 × sd\n\n`;
  for(const sk in SETS){ const a=R[sk+'|72|sd2']; if(!a.length) continue; const c={}; for(const x of a) c[x.how]=(c[x.how]||0)+1; md+=`- ${SETS[sk].ad}: ${Object.entries(c).map(([k,v])=>`${k} %${(100*v/a.length).toFixed(0)}`).join(', ')}\n`; }
  md=md.replace(/%(\d+)\.(\d)/g,'%$1,$2'); fs.writeFileSync(path.join(__dirname,'test52-ozan-kalite-72sa-report.md'),md); console.log(md);
  // portföy simülasyonu için işlemler (test52-portfoy.js)
  const dump={}; for(const key of ['m_s|72|sd2','m_s_k30|72|sd2','m_s_k50|72|sd2','m_s_b30|72|sd2','r_s|72|sd2']) dump[key]=R[key];
  fs.writeFileSync(path.join(L.ARCH,'_t52-trades.json'),JSON.stringify(dump));
})().catch(e=>{ console.error(e); process.exit(1); });
