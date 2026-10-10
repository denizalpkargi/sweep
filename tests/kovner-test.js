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
ok(E.COM_DEF.stopMult===2&&E.COM_DEF.btc200===false,'COM_DEF stopMult/btc200 (10 Ekim 2026: kapı varsayılan kapalı)');
// --- kayıp süzgeci (10 Ekim 2026): long yalnız BTC 24 saatte düşmüşken, 7 günlük trende karşı giriş yok ---
ok(E.COM_DEF.lf&&E.COM_DEF.lf.longBtc24Max===null&&E.COM_DEF.lf.r7dMin===0,'COM_DEF.lf varsayılanı');
{ const now=Date.UTC(2026,9,10,12,0), d0=Math.floor(now/DAY)*DAY;
  const mkA=g=>{ const d=Array.from({length:30},(_,i)=>{ const c=100*Math.exp(g*(i-29)); return {t:d0-(29-i)*DAY,o:c,h:c,l:c,c,v:1,q:c}; }); // son eleman bugünün açık mumu
    const px=d[d.length-1].c; const k=Array.from({length:120},(_,i)=>({t:now-(120-i)*9e5,o:px,h:px*1.001,l:px*0.999,c:px,v:1,q:px,tb:px/2}));
    return {px,fund:0,trendScore:0,st:0,trend:"flat",score:0,volRel:1,tk30:1,med15:0.004,src:{k15L:k,k1h:k,k4h:k,k1d:d}}; };
  const btc=g=>Array.from({length:200},(_,i)=>{ const c=50000*Math.exp(g*(i-199)); return {t:now-(200-i)*9e5,o:c,h:c,l:c,c,v:1}; }).concat([{t:now,o:1,h:1,l:1,c:1,v:1}]); // son mum açık (sayılmaz)
  const up=mkA(0.01), dn=mkA(-0.01);
  ok(E.btc24Of({src:{btc15:btc(0.001),k15L:up.src.k15L}})>0.0959&&E.btc24Of({src:{btc15:btc(0.001),k15L:up.src.k15L}})<0.0961,'btc24Of: 96 kapanmış mum: '+E.btc24Of({src:{btc15:btc(0.001),k15L:up.src.k15L}}));
  ok(E.btc24Of({src:{btc15:btc(0.001).slice(-50),k15L:up.src.k15L}})===null,'az mumda btc24Of null');
  const upB=Object.assign({},up,{src:Object.assign({},up.src,{btc15:btc(0.0005)})}), upD=Object.assign({},up,{src:Object.assign({},up.src,{btc15:btc(-0.0005)})});
  ok(Math.abs(E.r7dOf(up)-0.08)<1e-9,'r7dOf: fiyat ÷ 7 kapanmış gün önceki kapanış (masa-archive ile aynı): '+E.r7dOf(up)); ok(Math.abs(E.r7dOf(dn)+0.08)<1e-9,'r7dOf düşüşte');
  ok(E.r7dOf({src:{k1d:up.src.k1d.slice(-5),k15L:up.src.k15L}})===null,'az günde r7dOf null');
  const v=(A,dir,o)=>{ try{ return E.committee(A,dir,0,Object.assign({sym:'TSTUSDT'},o||{})).veto||''; }catch(e){ return 'hata: '+e.message; } };
  ok(!/kayıp süzgeci: BTC 24 saatte/.test(v(upB,'long')),'BTC kuralı varsayılanda kapalı olmalı: '+v(upB,'long'));
  ok(/kayıp süzgeci: BTC 24 saatte/.test(v(upB,'long',{lf:{longBtc24Max:0,r7dMin:0}})),'BTC yükselirken long (kural açık) süzgece takılmadı: '+v(upB,'long',{lf:{longBtc24Max:0,r7dMin:0}}));
  ok(!/kayıp süzgeci/.test(v(upD,'long',{lf:{longBtc24Max:0,r7dMin:0}})),'BTC düşmüşken trend yönünde long süzgece takıldı: '+v(upD,'long'));
  ok(/7 günlük trend karşı/.test(v(Object.assign({},dn,{src:Object.assign({},dn.src,{btc15:btc(-0.0005)})}),'long')),'düşen coinde long süzgece takılmadı');
  ok(/7 günlük trend karşı/.test(v(up,'short')),'yükselişte short süzgece takılmadı: '+v(up,'short'));
  ok(!/kayıp süzgeci/.test(v(dn,'short')),'düşüşte short süzgece takıldı: '+v(dn,'short'));
  ok(!/kayıp süzgeci/.test(v(up,'long',{lf:false})),'lf:false süzgeci kapatmadı'); }
ok(E.levFor(0.015)===20&&E.levFor(0.03)===18&&E.levFor(0.05)<=11,'levFor: '+[E.levFor(0.015),E.levFor(0.03),E.levFor(0.05)]);
for(const sd of [0.012,0.02,0.03,0.054]){ const l=E.levFor(sd); ok(sd<=E.liqDist(l)*0.6||l===1,'stop likidasyondan önce değil: sd '+sd+' lev '+l); }
// --- Arda: BTC 200 günlük ---
{ const now=Date.now(), d0=Math.floor(now/DAY)*DAY; const mk=f=>Array.from({length:260},(_,i)=>{ const c=f(i); return {t:d0-(259-i)*DAY,o:c,h:c,l:c,c,v:1}; });
  E.btcCache.d=mk(i=>50000*Math.exp(0.002*i)); ok(E.btc200Rel()>0,'yükselişte BTC200 eksi');
  E.btcCache.d=mk(i=>50000*Math.exp(-0.002*i)); ok(E.btc200Rel()<0,'düşüşte BTC200 artı');
  E.btcCache.d=null; ok(E.btc200Rel()===null,'veri yokken kapı çalıştı'); }
console.log('kovner-test errors',JSON.stringify(errors));
console.log('errors',JSON.stringify(errors)); if(errors.length) process.exit(1);
