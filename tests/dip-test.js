// Geri çekilme sepeti birim testleri (src/dip.js): emir, dolum, giriş günü kâr yok, kâr al, fitil stopu saymaz, kapanış stopu, felaket, zaman, BTC rejimi.
// Çalıştırma: node tests/dip-test.js  (çıktıda "errors []" beklenir)
const {loadEngine}=require('./engine-node.js'); const E=loadEngine();
const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
const DAY=864e5, T0=Date.UTC(2026,0,1);
const up=(n,p0)=>Array.from({length:n},(_,i)=>{ const c=p0*Math.exp(0.003*i); return {t:T0+i*DAY,o:c,h:c*1.005,l:c*0.995,c}; });
const base={BTCUSDT:up(120,60000),ETHUSDT:up(120,3000),SOLUSDT:up(120,150),BNBUSDT:up(120,600)};
const C=E.DIP_DEF;
function setup(){ const s=E.dipNew({syms:['ETHUSDT']}); const data={BTCUSDT:base.BTCUSDT,ETHUSDT:base.ETHUSDT.slice()}; const last=data.ETHUSDT[119];
  E.dipClose(s,'ETHUSDT',last,data,last.t+DAY-1); return {s,last}; }
const bar=(t,o,h,l,c)=>({t,o,h,l,c});
// 1. yukarı trendde emir: önceki kapanışın %2 altı, ertesi gün için
{ const {s,last}=setup(); const o=s.ord.ETHUSDT; ok(o&&Math.abs(o.px-last.c*0.98)<1e-9&&o.day===last.t+DAY,'emir yok ya da yanlış: '+JSON.stringify(o)); }
// 2. BTC aşağıdayken emir yok
{ const s=E.dipNew({syms:['ETHUSDT']}); const dn=Array.from({length:120},(_,i)=>{ const c=60000*Math.exp(-0.003*i); return {t:T0+i*DAY,o:c,h:c,l:c,c}; });
  const data={BTCUSDT:dn,ETHUSDT:base.ETHUSDT}; E.dipClose(s,'ETHUSDT',base.ETHUSDT[119],data,0); ok(!s.ord.ETHUSDT,'BTC aşağıyken emir verildi'); }
// 3. dolum, giriş günü kâr alınmaz, ertesi gün +%3'te kâr
{ const {s,last}=setup(); const px=s.ord.ETHUSDT.px; const d1=last.t+DAY;
  E.dipIntraday(s,'ETHUSDT',bar(d1,last.c,px*1.05,px*0.999,px*1.01),d1+3600e3); const p=s.pos.ETHUSDT;
  ok(p&&Math.abs(p.e-px)<1e-9,'dolum yok'); ok(p&&Math.abs(p.qty*p.e-25)<1e-6,'boy özkaynağın ¼ü değil: '+(p&&p.qty*p.e));
  ok(s.pos.ETHUSDT,'giriş günü kâr alındı');
  E.dipClose(s,'ETHUSDT',bar(d1,last.c,px*1.05,px*0.999,px*1.01),{BTCUSDT:base.BTCUSDT,ETHUSDT:base.ETHUSDT},d1+DAY-1);
  E.dipIntraday(s,'ETHUSDT',bar(d1+DAY,px,px*1.031,px*0.99,px*1.02),d1+DAY+3600e3);
  ok(!s.pos.ETHUSDT&&s.trades.length===1&&s.trades[0].why==='kâr'&&s.trades[0].r>0.02,'kâr alınmadı: '+JSON.stringify(s.trades[0])); }
// 4. fitil stopu saymaz (gün içi −%12, kapanış −%5), kapanış −%11 stop
{ const {s,last}=setup(); const px=s.ord.ETHUSDT.px; const d1=last.t+DAY; const D2={BTCUSDT:base.BTCUSDT,ETHUSDT:base.ETHUSDT};
  E.dipIntraday(s,'ETHUSDT',bar(d1,last.c,last.c,px,px),d1+1); E.dipClose(s,'ETHUSDT',bar(d1,last.c,last.c,px,px),D2,d1+DAY-1);
  const b2=bar(d1+DAY,px,px*1.01,px*0.88,px*0.95); E.dipIntraday(s,'ETHUSDT',b2,d1+DAY+1); E.dipClose(s,'ETHUSDT',b2,D2,d1+2*DAY-1);
  ok(s.pos.ETHUSDT,'fitil stopu tetikledi');
  const b3=bar(d1+2*DAY,px*0.95,px*0.96,px*0.88,px*0.89); E.dipIntraday(s,'ETHUSDT',b3,d1+2*DAY+1); E.dipClose(s,'ETHUSDT',b3,D2,d1+3*DAY-1);
  ok(!s.pos.ETHUSDT&&s.trades[0]&&s.trades[0].why==='kapanış stopu','kapanış stopu çalışmadı'); }
// 5. felaket stopu gün içi −%25
{ const {s,last}=setup(); const px=s.ord.ETHUSDT.px; const d1=last.t+DAY; E.dipIntraday(s,'ETHUSDT',bar(d1,last.c,last.c,px,px),d1+1);
  E.dipIntraday(s,'ETHUSDT',bar(d1,px,px,px*0.7,px*0.8),d1+2); ok(!s.pos.ETHUSDT&&s.trades[0].why==='felaket'&&s.trades[0].r<-0.25,'felaket stopu yok'); }
// 6. zaman stopu 20 gün
{ const {s,last}=setup(); const px=s.ord.ETHUSDT.px; const d1=last.t+DAY; const D2={BTCUSDT:base.BTCUSDT,ETHUSDT:base.ETHUSDT};
  E.dipIntraday(s,'ETHUSDT',bar(d1,last.c,last.c,px,px),d1+1);
  for(let k=0;k<=20&&s.pos.ETHUSDT;k++){ const b=bar(d1+k*DAY,px,px*1.01,px*0.99,px); E.dipIntraday(s,'ETHUSDT',b,d1+k*DAY+1); E.dipClose(s,'ETHUSDT',b,D2,d1+(k+1)*DAY-1); }
  ok(s.trades[0]&&s.trades[0].why==='zaman'&&s.trades[0].days===20,'zaman stopu 20 günde değil: '+JSON.stringify(s.trades[0])); }
const sm=E.dipSummary(E.dipNew(),null); ok(sm.eq===100&&sm.n===0,'özet');
console.log('errors',JSON.stringify(errors)); process.exit(errors.length?1:0);
