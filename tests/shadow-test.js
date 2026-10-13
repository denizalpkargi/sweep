// Gölge kural masası birim testleri (src/shadow.js): kapı, iki masanın ayrı kaydı, ortak karar, 60 dk sınırı, 15 dk / 1 sa / 4 sa çözümü, geç ölçüm, işlem kaydı, özet.
// Çalıştırma: node tests/shadow-test.js  (çıktıda "errors []" beklenir)
const {loadEngine}=require('./engine-node.js');
const mem={}; const localStorage={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}};
const E=loadEngine({localStorage}); const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
const T0=Date.UTC(2026,9,13,8), MIN=6e4;
const c=(score,yes,veto,sd)=>({score,yes,veto:veto||null,plan:sd?{sd}:null});
E.shReset();
// model long geçer, kural long geçmez; short: ikisi de geçer; satır 2: comR yok → kural = model
const rows=[{s:"AUSDT",px:10,com:{long:c(0.5,4,null,0.02),short:c(0.4,3,null,0.02)},comR:{long:c(0.2,2,null,0.02),short:c(0.36,3,null,0.02)}},
  {s:"BUSDT",px:5,com:{long:c(0.6,5,"Can",0.02),short:c(0.1,1,null,0.02)}},
  {s:"CUSDT",px:2,com:{long:c(0.45,4,null,0.01),short:c(0,0,null,null)}}];
let px={AUSDT:10,BUSDT:5,CUSDT:2};
let r=E.shTick(rows,s=>px[s],T0,0.35,3); let S=E.getSH();
ok(r.add===5,'kayıt sayısı 5 değil: '+r.add+' '+JSON.stringify(S.pend.map(p=>p.k+p.sym+p.dir)));
ok(S.pend.filter(p=>p.k==="model").length===3&&S.pend.filter(p=>p.k==="rule").length===2,'masa ayrımı yanlış');
ok(!S.pend.some(p=>p.sym==="BUSDT"),'vetolu karar kaydedildi');
ok(S.pend.find(p=>p.k==="model"&&p.sym==="AUSDT"&&p.dir==="long").both===0,'yalnız modelin kararı ortak sayıldı');
ok(S.pend.find(p=>p.k==="rule"&&p.sym==="AUSDT"&&p.dir==="short").both===1,'ortak karar işaretlenmedi');
ok(S.pend.find(p=>p.k==="rule"&&p.sym==="CUSDT").both===1,'comR yokken kural = model değil');
// 60 dk içinde aynı karar yeniden yazılmaz
r=E.shTick(rows,s=>px[s],T0+5*MIN,0.35,3); ok(r.add===0,'60 dk sınırı yok');
// işlem kaydı
E.shAdd({k:"trade",sym:"AUSDT",dir:"long",px:10,sd:0.02,score:0.5,yes:4},T0);
// 15 dk: A +%1, C fiyat yok → beklemede
px={AUSDT:10.1,BUSDT:5}; r=E.shTick([],s=>px[s],T0+15*MIN,0.35,3); S=E.getSH();
const aL=S.pend.find(p=>p.k==="model"&&p.sym==="AUSDT"&&p.dir==="long"), aS=S.pend.find(p=>p.k==="model"&&p.sym==="AUSDT"&&p.dir==="short");
ok(Math.abs(aL.r[15]-1)<1e-6,'long 15 dk yanlış: '+aL.r[15]); ok(Math.abs(aS.r[15]+1)<1e-6,'short 15 dk yanlış: '+aS.r[15]);
ok(S.pend.find(p=>p.sym==="CUSDT").r[15]===undefined,'fiyatsız kayıt çözüldü');
// 15 dk çok geç (> 7,5 dk) → ölçülmedi (null)
r=E.shTick([],s=>px[s],T0+24*MIN,0.35,3); ok(E.getSH().pend.find(p=>p.sym==="CUSDT").r[15]===null,'geç ölçüm null değil');
// 1 sa ve 4 sa
px={AUSDT:9.8,CUSDT:2.1}; E.shTick([],s=>px[s],T0+61*MIN,0.35,3);
px={AUSDT:10.4,CUSDT:2.2}; r=E.shTick([],s=>px[s],T0+242*MIN,0.35,3); S=E.getSH();
ok(S.pend.length===0&&S.done.length===6,'4 sa sonunda bitmedi: '+S.pend.length+'/'+S.done.length); ok(r.fin.length===6,'biten kayıtlar dönmedi');
const t=S.done.find(p=>p.k==="trade"); ok(Math.abs(t.r[60]+2)<1e-6&&Math.abs(t.r[240]-4)<1e-6,'işlem 1 sa / 4 sa yanlış: '+JSON.stringify(t.r));
ok(t.d[240]===2,'gecikme yazılmadı');
// özet
const m=E.shSum(); ok(m.by.model.n===3&&m.by.rule.n===2&&m.by.trade.n===1&&m.by.both.n===2,'özet sayıları: '+JSON.stringify(m.by));
ok(Math.abs(m.by.trade.h240.R-2)<1e-6,'stopsuz R yanlış: '+m.by.trade.h240.R);
ok(m.by["model·tek"]&&m.by["model·tek"].n===1,'yalnız model kırılımı yok');
ok(Math.abs(m.by.model.h15.pct-0)<1e-6&&m.by.model.h15.n===2,'model 15 dk özeti: '+JSON.stringify(m.by.model.h15));
// kalıcılık
ok(JSON.parse(mem["st-shadow"]).done.length===6,'localStorage yazılmadı');
console.log('errors',JSON.stringify(errors)); if(errors.length) process.exit(1);
