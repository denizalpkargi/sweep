// Hedef katmanı (src/goal.js) birim testi: mod, aşamalı giriş, yer açma, dinamik hedef, Murat'ın karar puanlaması.
// Çalıştırma: node tests/goal-test.js  (çıktıda "errors []" beklenir)
const {loadEngine}=require('./engine-node.js'); const E=loadEngine(); const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
const cfg={...E.BOT_CFG_DEF,risk:0.03,threshold:0.3,minYes:4}; // hedef testleri %3 taban risk ve eski eşikle kuruldu; varsayılan (6 Ekim 2026) eşik 0,35, güvenle en çok %10 (riskMax)
const now=Date.now();
// 1. mod
ok(E.goalState({start:100,eq:150},cfg).mode==="normal",'normal mod'); ok(E.goalState({start:100,eq:120,peak:140},cfg).mode==="koru",'zirveden %14 düşüşte koru');
ok(E.goalState({start:100,eq:190},cfg).mode==="yakın",'190 $ hedefe yakın'); ok(E.goalState({start:100,eq:201},cfg).mode==="tamam",'201 $ tamam');
ok(Math.abs(E.goalRisk(E.goalState({start:100,eq:196},cfg),196,cfg)-196*0.03*0.7)<1e-9||E.goalRisk(E.goalState({start:100,eq:196},cfg),196,cfg)<196*0.03,'hedefe yakın risk kısılmalı');
// 2. aşamalar
const ag=[{id:"liq",v:0.8},{id:"flow",v:0.5}]; const X=(o)=>({sym:"AUSDT",dir:"long",score:0.5,yes:6,veto:null,sd:0.015,feat:{btc:{ch4:0.002,ch24:0.01,bias:"up",ok:true,dump:false}},com:{agents:ag},...o});
const ctx=(o)=>({cfg,bal:100,start:100,eq:100,peak:100,positions:[],trades:[],now,thr:0.3,minYes:4,aud:null,lev:20,px:()=>1,...o});
let es=E.entryStages(X(),ctx()); ok(es.ok&&es.stages.length===5&&es.grade==="A"&&Math.abs(es.riskUsd-100*es.riskPct)<1e-9&&es.riskUsd>3&&es.riskUsd<10,'temiz long: '+E.stagesTxt(es));
// masanın güveni: eşikte taban (%3), güçlü ve oybirliğiyle %10, not C'de taban
const ag10=Array.from({length:10},(_,i)=>({id:i===0?"liq":i===1?"flow":"a"+i,v:0.8}));
es=E.entryStages(X({score:0.3,yes:4,com:{agents:ag10}}),ctx()); ok(es.ok&&es.riskPct<0.045,'eşikte güven düşük, risk tabana yakın: %'+(es.riskPct*100).toFixed(2));
es=E.entryStages(X({score:0.7,yes:10,com:{agents:ag10}}),ctx()); ok(es.ok&&Math.abs(es.conf-1)<1e-9&&Math.abs(es.riskUsd-10)<1e-9,'tam güven → %10: '+E.stagesTxt(es));
es=E.entryStages(X({score:0.7,yes:10,com:{agents:ag10.map(a=>({...a,v:a.id==="liq"||a.id==="flow"?-0.5:a.v}))},feat:{btc:{ch4:0.002,ch24:0.01,bias:"up",ok:true,dump:false}}}),ctx()); ok(es.grade==="C"&&Math.abs(es.riskPct-0.03)<1e-9,'not C → taban risk');
ok(E.cfgMigrate({risk:0.03,maxOpenRisk:0.09},{maxOpenRisk:0.09}).maxOpenRisk===0.15&&E.cfgMigrate({riskMax:0.1,maxOpenRisk:0.12},{maxOpenRisk:0.12}).maxOpenRisk===0.12,'eski kayıtta açık risk sınırı taşınmalı');
// güven bileşenleri (gerçek oylarla seçildi): oy birliği etkisiz, not B güveni yarıya indirir, üst sınır tabanın altındaysa taban
ok(Math.abs(E.entryStages(X({score:0.7,yes:4,com:{agents:ag10}}),ctx()).riskPct-E.entryStages(X({score:0.7,yes:10,com:{agents:ag10}}),ctx()).riskPct)<1e-9,'oy birliği riski değiştirmemeli');
es=E.entryStages(X({score:0.7,yes:10,com:{agents:ag10.map(a=>({...a,v:a.id==="flow"?-0.5:a.v}))}}),ctx()); ok(es.grade==="B"&&Math.abs(es.riskPct-0.065)<1e-9,'not B → güven yarım → %6,5: %'+(es.riskPct*100).toFixed(2));
const dc=E.deskConf({score:0.7},0.35,3,"A",{risk:0.03,riskMax:0.10}); ok(Math.abs(dc.conf-1)<1e-9&&Math.abs(dc.pct-0.10)<1e-9,'deskConf tam güven → %10'); ok(Math.abs(E.deskConf({score:0.35},0.35,3,"A",{risk:0.03,riskMax:0.10}).pct-0.03)<1e-9,'eşikte taban'); ok(Math.abs(E.deskConf({score:0.9},0.35,3,"A",{risk:0.03,riskMax:0.02}).pct-0.03)<1e-9,'üst sınır tabanın altındaysa taban');
const longRisk=E.entryStages(X(),ctx()).riskUsd; es=E.entryStages(X({dir:"short"}),ctx()); ok(es.ok&&es.warn===1&&es.riskUsd<longRisk,'short uyarıyla küçülmeli');
es=E.entryStages(X({dir:"short"}),ctx({cfg:{...cfg,shortRule:"fail"}})); ok(!es.ok,'short kapalıyken girmemeli');
es=E.entryStages(X({feat:{btc:{ch4:-0.03,ch24:-0.05,bias:"down",ok:false,dump:true}}}),ctx()); ok(!es.ok&&es.stages[0].st==="fail",'BTC çöküşünde long girmemeli');
const P=(o)=>({sym:"BUSDT",dir:"long",entry:1,stop:0.985,stop0:0.985,risk0:0.015,qty:200,qty0:200,margin:10,risk:3,stage:"open",openT:now-3600e3,score:0.4,t1:1.0225,t2:1.045,...o});
es=E.entryStages(X(),ctx({positions:[P({openT:now-5*60e3})]})); ok(!es.ok&&es.stages.find(s=>s.k==="korelasyon").st==="fail",'5 dk önce aynı yönde giriş → beklemeli');
es=E.entryStages(X(),ctx({positions:[P(),P({sym:"CUSDT"})]})); ok(!es.ok,'aynı yönde 2 açıkken üçüncü long olmamalı');
es=E.entryStages(X(),ctx({trades:[{r:-1,closeT:now-10*60e3,openT:now-60*60e3,dir:"short"}]})); ok(!es.ok,'kayıptan 10 dk sonra girmemeli');
// 3. yer açma: teminat dolu, kârdaki pozisyondan yarısı alınır
const full=[P({dir:"short",sym:"DUSDT",entry:1,stop:1.015,risk0:0.015,margin:90})];
es=E.entryStages(X({score:0.6}),ctx({positions:full,px:()=>0.99})); ok(es.ok&&es.need>0,'teminat açığı görülmeli');
let fp=E.freePlan(X({score:0.6}),es,ctx({positions:full,px:()=>0.99})); ok(fp&&fp[0].kind==="free"&&fp[0].part===0.5,'kârdaki pozisyondan yarısı alınmalı: '+JSON.stringify(fp&&fp.map(o=>[o.kind,o.part])));
fp=E.freePlan(X({score:0.6}),es,ctx({positions:full,px:()=>1.01})); ok(!fp,'zarardaki pozisyon yer açmak için kesilmemeli');
fp=E.freePlan(X({score:0.33}),es,ctx({positions:full,px:()=>0.99})); ok(!fp,'eşiğe yakın kurulum için yer açılmamalı');
// 4. dinamik hedef
const gs=E.goalState({start:100,eq:198},cfg); let p=P(); let adj=E.deskAdjust(p,{cfg,px:1.01,rv:null,lvl:null,gs}); ok(adj.some(a=>a.k==="t1full"),'hedef 1 200 $a taşıyorsa tamamı');
p=P(); adj=E.deskAdjust(p,{cfg,px:1.005,rv:null,lvl:1.018,gs:E.goalState({start:100,eq:110},cfg)}); const pull=adj.find(a=>a.k==="t1pull"); ok(pull&&pull.t1<1.018,'direnç önünde hedef 1 çekilmeli');
p=P({stage:"tp1",stop:1}); adj=E.deskAdjust(p,{cfg,px:1.03,rv:{score:0.6,agents:[{id:"mom",v:0.5}]},lvl:null,thr:0.3,gs:E.goalState({start:100,eq:110},cfg)}); ok(adj.some(a=>a.k==="t2ext"),'güçlü masada koşucu uzamalı');
// paperStep: t1Part=1 → hedef 1'de tamamı
p=P({hi:1,lo:1,t1Part:1}); const acts=E.paperStep(p,1.0225,now,cfg); ok(acts.length===1&&acts[0].part===1&&acts[0].final,'t1Part=1 tamamını kapatmalı');
// 5. Murat: yer açma kararı, kalan sonra stop olduysa iyi; kalan hedefe gittiyse kötü
const tr=(after)=>({sym:"BUSDT",dir:"long",openT:now-7200e3,closeT:now,r:0.2,r0:0.015,risk:3,exits:["desk","stop"],decs:[{k:"free",t:now-3600e3,px:1.01,rAt:0.67}],xs:[{k:"free",t:now-3600e3,px:1.01,q:100},{k:"stop",t:now-60e3,px:after,q:100}]});
let D=E.audDecisions([tr(1.0)]); ok(D.free&&D.free.good===1,'yer açma iyi puanlanmalı'); D=E.audDecisions([tr(1.04)]); ok(D.free&&D.free.good===0,'yer açma kötü puanlanmalı');
const A=E.auditRun(Array.from({length:6},(_,i)=>({...tr(1.05),openT:now-7200e3-i*1e6,closeT:now-i*1e6})),[],{}); ok(A.off.free,'kötü çıkan yer açma kolu kapanmalı: '+JSON.stringify(A.decs));
console.log('errors',JSON.stringify(errors)); process.exit(errors.length?1:0);
