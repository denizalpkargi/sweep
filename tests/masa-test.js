// Masa ikna turu ve kalibrasyon birim testi: çekimserler puana girmez, güveni düşük üye ikna olur, güveni yüksek üye yerinde kalır,
// eski kayıtlı ayar yeni varsayılana taşınır. Çalıştırma: node tests/masa-test.js  (npm test içinde)
const assert=require('assert'); const {loadEngine}=require('./engine-node.js'); const E=loadEngine();
const errors=[]; const t=(name,fn)=>{ try{ fn(); }catch(e){ errors.push(name+': '+e.message); } };
const mk=(id,v,c,abst,base)=>({id,name:id,role:id,v,c,abst:!!abst,base:base||1,m:1,txt:id+' metni'});
t('çekimser paydaya girmez',()=>{ const a=E.comTally([mk('a',1,1),mk('b',1,1),mk('c',0,0.2,true),mk('d',0,0.2,true)],{pull:0}); assert.strictEqual(a.nAct,2); assert.ok(Math.abs(a.score-1)<1e-9,'puan '+a.score); assert.strictEqual(a.yes,2);
  const b=E.comTally([mk('a',1,1),mk('b',1,1),mk('c',0,0.2),mk('d',0,0.2)],{pull:0}); assert.ok(b.score<0.6,'çekimser olmayan kararsızlar sulandırır: '+b.score); });
t('güveni düşük üye ikna olur, yüksek kalır',()=>{ const T=E.comTally([mk('a',0.9,0.95,false,2),mk('b',0.8,0.9,false,1.5),mk('c',-0.6,0.2),mk('d',-0.7,0.95)],{pull:0.5,rounds:2});
  const c=T.L.find(x=>x.id==='c'), d=T.L.find(x=>x.id==='d'); assert.ok(c.v>-0.3&&c.v>c.v0,'c ikna olmalı: '+c.v); assert.ok(Math.abs(d.v-d.v0)<0.1,'d yerinde kalmalı: '+d.v);
  const mv=T.moves.find(m=>m.id==='c'); assert.ok(mv&&mv.by==='a','ikna eden a olmalı: '+JSON.stringify(mv)); assert.ok(T.L.every(x=>x.v<=1&&x.v>=-1)); });
t('ağırlık = taban × çarpan, dışarıdan verilen katsayı kazanır',()=>{ const T=E.comTally([mk('a',1,1,false,2),mk('b',-1,1,false,1)],{pull:0}); assert.ok(Math.abs(T.score-(2-1)/3)<1e-9,'puan '+T.score);
  const U=E.comTally([mk('a',1,1,false,2),mk('b',-1,1,false,1)],{pull:0,weights:{a:1,b:1}}); assert.ok(Math.abs(U.score)<1e-9,'eşit katsayıda sıfır: '+U.score);
  const V=E.comTally([Object.assign(mk('a',1,1,false,1),{m:1.5}),mk('b',-1,1,false,1)],{pull:0}); assert.ok(V.L.find(x=>x.id==='a').w===1.5); });
t('tartışma dökümü: tez, karşı tez, ikna olan',()=>{ const T=E.comTally([mk('a',0.9,0.95,false,2),mk('b',-0.6,0.2),mk('c',-0.7,0.95)],{pull:0.5,rounds:2}); const L=E.comTalkLines(T,'long'); const st=L.map(x=>x.stage); assert.ok(st.every(s=>s==='ikna'));
  assert.ok(L[0].id==='a'&&/Tez/.test(L[0].text),'ilk satır tez'); assert.ok(L.some(x=>/Karşı tez/.test(x.text)),'karşı tez var'); assert.ok(L.some(x=>x.id==='b'&&/→/.test(x.text)),'b fikir değiştirdi'); });
t('eski ayar taşınır',()=>{ const cfg={threshold:0.3,minYes:4,risk:0.03}; E.comMigrate(cfg); assert.strictEqual(cfg.threshold,E.BOT_CFG_DEF.threshold); assert.strictEqual(cfg.minYes,E.BOT_CFG_DEF.minYes); assert.strictEqual(cfg.risk,0.03,'risk taşınmaz'); assert.strictEqual(cfg.comV,E.COM_DEF.v);
  const own={threshold:0.3,minYes:4,risk:0.02}; E.comMigrate(own); assert.strictEqual(own.risk,0.02,'elle girilen risk korunur'); const done={threshold:0.5,minYes:2,risk:0.03,comV:E.COM_DEF.v}; E.comMigrate(done); assert.strictEqual(done.threshold,0.5,'taşınmış ayar bir daha ellenmez'); });
t('varsayılanlar geriye dönük testten',()=>{ assert.strictEqual(E.COM_DEF.threshold,0.35); assert.strictEqual(E.COM_DEF.minYes,3); const w=Object.fromEntries(E.DESK.map(d=>[d.id,d.w])); assert.ok(w.mom>w.trend&&w.trend>w.macro&&w.macro>w.risk&&w.risk>w.liq&&w.liq===w.flow,'sıra: Baran > Emre > Arda > Can > Kerem = Mert'); });
console.log('masa-test errors',JSON.stringify(errors)); if(errors.length) process.exit(1);
