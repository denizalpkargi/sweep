// Sıkışma sepeti (src/kovner.js) ve masterplan adım 1 birim testleri: sıkışma + kırılım girişi, sıkışmasız giriş yok, kapanış stopu (fitil saymaz),
// 10 gün dibi, felaket stopu, özet; masanın stopu 2 kat (dolar riski aynı, kaldıraç stopa göre), Arda'nın BTC 200 günlük kapısı.
// Çalıştırma: node tests/kovner-test.js  (çıktıda "errors []" beklenir)
const {loadEngine}=require('./engine-node.js'); const E=loadEngine();
const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
const DAY=864e5, T0=Date.UTC(2026,0,1);
const bar=(t,o,h,l,c)=>({t,o,h,l,c});
// 70 gün geniş zikzak (±%5), sonra 8 gün dar (±%0,5); son gün n: kırılım kapanışı ya da değil
function series(tight,breakC){ const a=[]; for(let i=0;i<70;i++){ const c=100*(1+0.03*Math.sin(i/2)); a.push(bar(T0+i*DAY,c,c*1.05,c*0.95,c)); }
  for(let i=70;i<78;i++){ const c=100; const w=tight?0.005:0.12; a.push(bar(T0+i*DAY,c,c*(1+w),c*(1-w),c)); }
  if(breakC) a.push(bar(T0+78*DAY,100,breakC*1.002,99.8,breakC)); return a; }
// 1. sıkışma + 7 gün tepesinin üstünde kapanış → giriş
{ const a=series(true,101.5); const g=E.kovSignal(a,a.length-1); ok(g&&g.squeeze&&g.go,'sinyal yok: '+JSON.stringify(g));
  const s=E.kovNew({syms:['ETHUSDT']}); const px=101.6; const ev=E.kovClose(s,'ETHUSDT',a,px,a[78].t+DAY+60e3); const p=s.pos.ETHUSDT;
  ok(p&&ev.length===1&&ev[0].type==='fill','giriş yok');
  ok(p&&Math.abs(p.stop0-99.5)<1e-9,'stop 7 gün dibi değil: '+(p&&p.stop0));
  ok(p&&Math.abs(p.qty*(p.e-p.stop0)-1)<0.01,'risk özkaynağın %1i değil: '+(p&&p.qty*(p.e-p.stop0)));
  // 2. ertesi gün fitil stopun altına iner ama kapanış üstünde → kalır; sonraki kapanış stopun altında → çıkar
  const d1=bar(a[78].t+DAY,101.6,102,99,100.5); E.kovIntraday(s,'ETHUSDT',d1,d1.t+3600e3); ok(s.pos.ETHUSDT,'fitil stopu tetikledi');
  E.kovClose(s,'ETHUSDT',a.concat([d1]),100.5,d1.t+DAY+60e3); ok(s.pos.ETHUSDT,'stop üstü kapanışta çıktı');
  const d2=bar(d1.t+DAY,100.5,100.6,99,99.2); E.kovClose(s,'ETHUSDT',a.concat([d1,d2]),99.2,d2.t+DAY+60e3);
  ok(!s.pos.ETHUSDT&&s.trades[0]&&s.trades[0].why==='kapanış stopu'&&s.trades[0].R<-1&&s.trades[0].R>-1.4,'kapanış stopu: '+JSON.stringify(s.trades[0])); }
// 3. sıkışma yoksa giriş yok
{ const a=series(false,107); const s=E.kovNew({syms:['ETHUSDT']}); E.kovClose(s,'ETHUSDT',a,107,a[78].t+DAY); ok(!s.pos.ETHUSDT,'sıkışmasız giriş'); }
// 4. kırılım yoksa giriş yok
{ const a=series(true,100.2); const s=E.kovNew({syms:['ETHUSDT']}); E.kovClose(s,'ETHUSDT',a,100.2,a[78].t+DAY); ok(!s.pos.ETHUSDT,'kırılımsız giriş'); }
// 5. yükselişten sonra kapanış 10 gün dibinin altına → çıkış, artı R
{ const a=series(true,101.5); const s=E.kovNew({syms:['ETHUSDT']}); E.kovClose(s,'ETHUSDT',a,101.6,a[78].t+DAY);
  let b=a.slice(); let c=101.6; for(let k=1;k<=12;k++){ c*=1.02; b.push(bar(a[78].t+k*DAY,c/1.02,c*1.003,c/1.025,c)); E.kovClose(s,'ETHUSDT',b,c,b[b.length-1].t+DAY); }
  ok(s.pos.ETHUSDT,'yükselişte çıktı'); const lo=b[b.length-10].l; const dn=bar(b[b.length-1].t+DAY,c,c,lo*0.98,lo*0.99); b.push(dn); E.kovClose(s,'ETHUSDT',b,lo*0.99,dn.t+DAY);
  ok(!s.pos.ETHUSDT&&s.trades[0]&&s.trades[0].why==='10 gün dibi'&&s.trades[0].R>0.5,'10 gün dibi çıkışı: '+JSON.stringify(s.trades[0])); }
// 6. felaket stopu (stop uzaklığının 2 katı) gün içi
{ const a=series(true,101.5); const s=E.kovNew({syms:['ETHUSDT']}); E.kovClose(s,'ETHUSDT',a,101.6,a[78].t+DAY); const p=s.pos.ETHUSDT;
  E.kovIntraday(s,'ETHUSDT',bar(a[78].t+DAY,101.6,101.7,p.cat*0.99,p.cat),a[78].t+DAY+5e6);
  ok(!s.pos.ETHUSDT&&s.trades[0].why==='felaket'&&s.trades[0].R<-2,'felaket stopu: '+JSON.stringify(s.trades[0])); }
{ const sm=E.kovSummary(E.kovNew(),null); ok(sm.eq===100&&sm.n===0&&sm.open===0,'özet'); }

// --- masa: stop 2 kat, dolar riski aynı, kaldıraç stopa göre ---
ok(E.COM_DEF.stopMult===2&&E.COM_DEF.btc200===true,'COM_DEF stopMult/btc200');
ok(E.levFor(0.015)===20&&E.levFor(0.03)===18&&E.levFor(0.05)<=11,'levFor: '+[E.levFor(0.015),E.levFor(0.03),E.levFor(0.05)]);
for(const sd of [0.012,0.02,0.03,0.054]){ const l=E.levFor(sd); ok(sd<=E.liqDist(l)*0.6||l===1,'stop likidasyondan önce değil: sd '+sd+' lev '+l); }
// --- Arda: BTC 200 günlük ---
{ const now=Date.now(), d0=Math.floor(now/DAY)*DAY; const mk=f=>Array.from({length:260},(_,i)=>{ const c=f(i); return {t:d0-(259-i)*DAY,o:c,h:c,l:c,c,v:1}; });
  E.btcCache.d=mk(i=>50000*Math.exp(0.002*i)); ok(E.btc200Rel()>0,'yükselişte BTC200 eksi');
  E.btcCache.d=mk(i=>50000*Math.exp(-0.002*i)); ok(E.btc200Rel()<0,'düşüşte BTC200 artı');
  E.btcCache.d=null; ok(E.btc200Rel()===null,'veri yokken kapı çalıştı'); }
console.log('kovner-test errors',JSON.stringify(errors));
console.log('errors',JSON.stringify(errors)); if(errors.length) process.exit(1);
