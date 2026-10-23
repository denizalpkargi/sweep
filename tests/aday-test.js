// Aday gölgesi birim testleri (src/adaylar.js): negatif fonlama ödemesi, fonlama tavanı (aralık 8 → 1 sa), ufuk çözümü, geç ölçüm, korelasyon, özet.
// Çalıştırma: node tests/aday-test.js  (çıktıda "errors []" beklenir)
const {loadEngine}=require('./engine-node.js');
const mem={}; const localStorage={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}};
const E=loadEngine({localStorage}); const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
const H=36e5, T0=Date.UTC(2026,9,16,7,55);
const s=E.adLoad(); s.uni={t:T0,top:["AUSDT","BUSDT"],cap:["AUSDT","BUSDT","CUSDT"]};
const pi=(t,a)=>Object.entries(a).map(([symbol,[px,r,nft]])=>({symbol,markPrice:String(px),lastFundingRate:String(r),nextFundingTime:nft}));
// ilk tur: durum kurulur, olay yok
let r=E.adStep(s,pi(T0,{AUSDT:[10,-0.0008,T0+5*6e4],BUSDT:[5,-0.0002,T0+5*6e4],CUSDT:[2,-0.002,T0+5*6e4]}),{},T0);
ok(r.ev.length===0,'ilk turda olay: '+JSON.stringify(r.ev));
// ödeme geçti (nft ilerledi): A ≤ −%0,05 → long kaydı; B eşiğin üstünde; C ilk 30'da değil. C'nin aralığı 8 → 1 sa: tavan olayı, oran eksi → long
const T1=T0+6*6e4;
r=E.adStep(s,pi(T1,{AUSDT:[10,-0.0001,T0+5*6e4+8*H],BUSDT:[5,-0.0001,T0+5*6e4+8*H],CUSDT:[2,-0.002,T0+5*6e4+H]}),{CUSDT:1},T1);
ok(r.ev.length===2,'olay sayısı 2 değil: '+JSON.stringify(r.ev));
const nf=s.pend.find(p=>p.k==="negfund"), cp=s.pend.find(p=>p.k==="cap");
ok(nf&&nf.sym==="AUSDT"&&nf.dir==="long"&&Math.abs(nf.fr+0.08)<1e-9,'negatif fonlama kaydı yanlış: '+JSON.stringify(nf));
ok(cp&&cp.sym==="CUSDT"&&cp.dir==="long","tavan kaydı yanlış: "+JSON.stringify(cp));
// aralık 1'de kalınca yeni olay yok
r=E.adStep(s,pi(T1+6e4,{CUSDT:[2,-0.002,T0+5*6e4+H]}),{CUSDT:1},T1+6e4); ok(!r.ev.some(e=>e.k==="cap"),'tavan olayı tekrarlandı');
// 24 sa: A +%2, C −%10 (long)
r=E.adStep(s,pi(T1+24*H,{AUSDT:[10.2,0,T1+30*H],CUSDT:[1.8,0,T1+30*H]}),null,T1+24*H);
ok(Math.abs(nf.r[24]-2)<1e-6,'24 sa A yanlış: '+nf.r[24]); ok(r.fin.length===1&&r.fin[0].k==="negfund",'negfund bitmedi');
ok(Math.abs(cp.r[24]+10)<1e-6,'24 sa C yanlış: '+cp.r[24]); ok(s.pend.includes(cp),'72 sa beklemeden bitti');
// 72 sa çok geç (> 36 sa) → null
r=E.adStep(s,pi(T1+110*H,{CUSDT:[3,0,T1+120*H]}),null,T1+110*H); ok(cp.r[72]===null&&r.fin.length===1,'geç ölçüm null değil');
// korelasyon: 20 coin aynı yön → ≈ 1; bağımsız → küçük; 19 coin → null
const mk=(n,f)=>{ const o={}; for(let i=0;i<n;i++){ const c=[100]; for(let k=1;k<25;k++) c.push(c[k-1]*(1+f(i,k))); o["S"+i]=c; } return o; };
const c1=E.adCorr(mk(20,(i,k)=>0.01*Math.sin(k)+0.0001*Math.cos(i*k)));
ok(c1>0.9,'ortak hareket korelasyonu düşük: '+c1);
let seed=1; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647-0.5;
const c2=E.adCorr(mk(25,()=>0.01*rnd())); ok(Math.abs(c2)<0.15,'bağımsız seriler korelasyonu yüksek: '+c2);
ok(E.adCorr(mk(19,(i,k)=>0.01*Math.sin(k)))===null,'19 coinle korelasyon hesaplandı');
const fr=mk(21,(i,k)=>0.01*Math.sin(k)); fr.S0=fr.S0.map(()=>100); ok(E.adCorr(fr)>0.9,'donmuş fiyat dışarıda kalmadı');
ok(E.adThr(s).src==="arşiv"&&E.adThr(s).thr===E.AD_DEF.corrThr,'eşik arşivden değil');
const sm=E.adSummary(s); ok(sm.by.negfund.h24.n===1&&sm.by.cap.h24.n===1&&sm.by.cap.h72==null,'özet yanlış: '+JSON.stringify(sm.by));
console.log('errors',errors);
