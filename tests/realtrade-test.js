// Gerçek hesap emir katmanı testi: electron/trade.js (sahte Binance ile) + src/realtrade.js rtPlan (uzlaştırma).
// Gerçek ağa istek gitmez. node tests/realtrade-test.js → "errors []"
const fs=require('fs'), os=require('os'), path=require('path'), vm=require('vm');
const {createTrader}=require('../electron/trade.js');
const errors=[]; const ok=(c,m)=>{ if(!c){ errors.push(m); console.log('HATA',m); } };

// ---- sahte Binance ----
function fakeEx(o={}){
  const X={mark:{BTCUSDT:100000,ETHUSDT:4000,XYUSDT:1},bal:o.bal!=null?o.bal:100,pos:{},algo:[],std:[],calls:[],perm:Object.assign({enableWithdrawals:false,ipRestrict:true,enableFutures:true},o.perm||{}),dual:false,algoFail:!!o.algoFail,stdFail:!!o.stdFail,nid:1};
  const res=(status,body)=>({status,ok:status<300,headers:{get:()=>null},json:async()=>body});
  X.fetch=async(url,init)=>{
    const u=new URL(url), p=u.pathname, q=Object.fromEntries(u.searchParams), m=(init&&init.method)||'GET';
    X.calls.push(m+' '+p+(q.type?' '+q.type:'')+(q.reduceOnly?' reduce':''));
    if(p==='/fapi/v1/time') return res(200,{serverTime:Date.now()});
    if(p==='/fapi/v1/exchangeInfo') return res(200,{symbols:Object.keys(X.mark).map(s=>({symbol:s,status:'TRADING',contractType:'PERPETUAL',quoteAsset:'USDT',filters:[{filterType:'PRICE_FILTER',tickSize:s==='XYUSDT'?'0.0001':'0.10'},{filterType:'LOT_SIZE',stepSize:'0.001',minQty:'0.001',maxQty:'1000'},{filterType:'MARKET_LOT_SIZE',stepSize:s==='XYUSDT'?'1':'0.001',minQty:s==='XYUSDT'?'1':'0.001',maxQty:'100000'},{filterType:'MIN_NOTIONAL',notional:'5'}]}))});
    if(p==='/fapi/v1/premiumIndex') return res(200,{markPrice:String(X.mark[q.symbol])});
    if(p.startsWith('/fapi')||p.startsWith('/sapi')){ if(init.headers['X-MBX-APIKEY']!=='K'||!q.signature) return res(401,{code:-2015,msg:'bad key'}); }
    if(p==='/sapi/v1/account/apiRestrictions') return res(200,X.perm);
    if(p==='/fapi/v1/positionSide/dual') return res(200,{dualSidePosition:X.dual});
    if(p==='/fapi/v2/balance') return res(200,[{asset:'USDT',balance:String(X.bal),availableBalance:String(X.bal-Object.values(X.pos).reduce((a,x)=>a+Math.abs(x.amt)*x.e/5,0)),crossUnPnl:'0'}]);
    if(p==='/fapi/v2/positionRisk') return res(200,Object.entries(X.pos).map(([s,x])=>({symbol:s,positionAmt:String(x.amt),entryPrice:String(x.e),markPrice:String(X.mark[s]),unRealizedProfit:String((X.mark[s]-x.e)*x.amt),liquidationPrice:'0',leverage:'5',marginType:'isolated'})));
    if(p==='/fapi/v1/marginType') return res(400,{code:-4046,msg:'No need to change margin type.'});
    if(p==='/fapi/v1/leverage') return res(200,{leverage:+q.leverage});
    if(p==='/fapi/v1/order'&&m==='POST'){
      if(q.type==='MARKET'){ const sgn=q.side==='BUY'?1:-1, qty=+q.quantity, s=q.symbol, cur=X.pos[s];
        if(q.reduceOnly){ if(!cur) return res(400,{code:-2022,msg:'ReduceOnly rejected'}); cur.amt=+(cur.amt+sgn*Math.min(qty,Math.abs(cur.amt))).toFixed(8); if(Math.abs(cur.amt)<1e-9) delete X.pos[s]; }
        else X.pos[s]={amt:(cur?cur.amt:0)+sgn*qty,e:X.mark[s]};
        return res(200,{orderId:X.nid++,executedQty:String(qty),avgPrice:String(X.mark[s])}); }
      if(q.type==='STOP_MARKET'){ if(X.stdFail) return res(400,{code:-4120,msg:'use algo'}); const id=X.nid++; X.std.push({orderId:id,symbol:q.symbol,type:'STOP_MARKET',stopPrice:q.stopPrice,closePosition:true}); return res(200,{orderId:id}); }
    }
    if(p==='/fapi/v1/algoOrder'&&m==='POST'){ if(X.algoFail) return res(404,{code:-1,msg:'not found'}); const id=X.nid++; X.algo.push({algoId:id,symbol:q.symbol,orderType:'STOP_MARKET',triggerPrice:q.triggerPrice}); return res(200,{algoId:id}); }
    if(p==='/fapi/v1/algoOrder'&&m==='DELETE'){ X.algo=X.algo.filter(a=>String(a.algoId)!==q.algoId); return res(200,{}); }
    if(p==='/fapi/v1/order'&&m==='DELETE'){ X.std=X.std.filter(a=>String(a.orderId)!==q.orderId); return res(200,{}); }
    if(p==='/fapi/v1/openAlgoOrders') return res(200,X.algo.filter(a=>a.symbol===q.symbol));
    if(p==='/fapi/v1/openOrders') return res(200,X.std.filter(a=>a.symbol===q.symbol));
    if(p==='/fapi/v1/algoOpenOrders'&&m==='DELETE'){ X.algo=X.algo.filter(a=>a.symbol!==q.symbol); return res(200,{}); }
    if(p==='/fapi/v1/allOpenOrders'&&m==='DELETE'){ X.std=X.std.filter(a=>a.symbol!==q.symbol); return res(200,{}); }
    return res(404,{msg:'yok '+p});
  };
  return X;
}
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'sweep-trade-'));
const writeCfg=(d,c)=>fs.writeFileSync(path.join(d,'trade.json'),JSON.stringify(Object.assign({key:'K',secret:'S'},c)));
const orders=X=>X.calls.filter(c=>/^(POST|DELETE) \/fapi\/v1\/(order|algoOrder)/.test(c));

(async()=>{
  // 1) varsayılan kapalı: şablon yazılır, emir gitmez
  { const d=tmp(), X=fakeEx(); const t=createTrader({dir:d,fetch:X.fetch});
    ok(JSON.parse(fs.readFileSync(path.join(d,'trade.json'),'utf8')).mode==='kapali','şablon kapalı yazılmalı');
    const r=await t.open({sym:'BTCUSDT',dir:'long',stop:98000}); ok(!r.ok&&/kapalı/.test(r.err),'kapalı modda açılmamalı');
    ok(orders(X).length===0,'kapalı modda emir isteği olmamalı'); }

  // 2) kuru: sanal defter, boyut, sınırlar, emir isteği yok
  { const d=tmp(), X=fakeEx(); writeCfg(d,{mode:'kuru',key:'',secret:''}); const t=createTrader({dir:d,fetch:X.fetch});
    const r=await t.open({sym:'BTCUSDT',dir:'long',stop:98000});
    // 100 $ × %2 = 2 $ risk / (2000 $ mesafe + maliyet) ≈ 0,000994 BTC → adım 0,001 aşağı = 0 → borsanın en küçüğünün altında
    ok(!r.ok&&/en küçük/.test(r.err),'çok küçük BTC reddedilmeli: '+r.err);
    const r2=await t.open({sym:'ETHUSDT',dir:'short',stop:4100});
    ok(r2.ok&&Math.abs(r2.qty-0.018)<1e-9,'kuru ETH short boyu 0,018 olmalı: '+JSON.stringify(r2));
    ok(r2.stop===4100,'stop 4100');
    const r4=await t.open({sym:'XYUSDT',dir:'long',stop:0.98}); ok(r4.ok,'ikinci pozisyon: '+r4.err);
    let st=await t.state(); ok(st.pos.length===2,'kuru pozisyon sayısı');
    const r3=await t.open({sym:'BTCUSDT',dir:'long',stop:90000}); ok(!r3.ok&&/en çok 2/.test(r3.err),'en çok 2 pozisyon: '+r3.err);
    await t.close({sym:'XYUSDT'}); const bad=await t.open({sym:'XYUSDT',dir:'long',stop:1.02}); ok(!bad.ok&&/yanlış/.test(bad.err),'yanlış taraftaki stop reddedilmeli: '+bad.err);
    ok(orders(X).length===0,'kuru modda emir isteği olmamalı');
    const s1=await t.setStop({sym:'ETHUSDT',stop:4050}); ok(s1.ok&&s1.stop===4050,'kuru stop taşıma');
    X.mark.ETHUSDT=4060; st=await t.state(); ok(!st.pos.find(p=>p.sym==='ETHUSDT'),'kuru stop markla vurmalı');
    
    st=await t.state(); ok(st.pos.length===0&&st.wallet<100&&st.wallet>97,'kuru bakiye maliyet ve kayıpla düşmeli: '+st.wallet); }

  // 3) kuru: DUR dosyası → bekçi her şeyi kapatır, yeni giriş yok
  { const d=tmp(), X=fakeEx(); writeCfg(d,{mode:'kuru'}); const t=createTrader({dir:d,fetch:X.fetch});
    await t.open({sym:'ETHUSDT',dir:'long',stop:3900}); fs.writeFileSync(path.join(d,'DUR'),'');
    await t.guard(); const st=await t.state(); ok(st.killed&&st.pos.length===0,'DUR ile acil durdurma');
    fs.unlinkSync(path.join(d,'DUR')); const r=await t.open({sym:'ETHUSDT',dir:'long',stop:3900}); ok(!r.ok&&/acil/.test(r.err),'durdurulmuşken açılmamalı');
    await t.rearm(); const r2=await t.open({sym:'ETHUSDT',dir:'long',stop:3900}); ok(r2.ok,'yeniden kurulunca açılmalı'); }

  // 4) kuru: günlük zarar sınırı
  { const d=tmp(), X=fakeEx(); writeCfg(d,{mode:'kuru',dayLossPct:0.01}); const t=createTrader({dir:d,fetch:X.fetch});
    await t.state(); await t.open({sym:'ETHUSDT',dir:'long',stop:3900}); X.mark.ETHUSDT=3890; await t.state();
    const r=await t.open({sym:'ETHUSDT',dir:'long',stop:3800}); ok(!r.ok&&/günlük zarar/.test(r.err),'günlük zarar sınırı: '+r.err); }

  // 5) canlı: çekim izni açık anahtar reddedilir
  { const d=tmp(), X=fakeEx({perm:{enableWithdrawals:true}}); writeCfg(d,{mode:'canli'}); const t=createTrader({dir:d,fetch:X.fetch});
    const r=await t.open({sym:'ETHUSDT',dir:'long',stop:3900}); ok(!r.ok&&/çekim/.test(r.err),'çekim izinli anahtar reddedilmeli: '+r.err); ok(orders(X).length===0,'reddedilince emir yok'); }
  { const d=tmp(), X=fakeEx({perm:{ipRestrict:false}}); writeCfg(d,{mode:'canli'}); const t=createTrader({dir:d,fetch:X.fetch});
    const r=await t.open({sym:'ETHUSDT',dir:'long',stop:3900}); ok(!r.ok&&/IP/.test(r.err),'IP kısıtsız anahtar reddedilmeli'); }

  // 6) canlı: market + algo stop; stop taşıma eskisini iptal eder; azaltma ve kapanış reduceOnly
  { const d=tmp(), X=fakeEx(); writeCfg(d,{mode:'canli'}); const t=createTrader({dir:d,fetch:X.fetch});
    const r=await t.open({sym:'ETHUSDT',dir:'long',stop:3900}); ok(r.ok&&Math.abs(r.qty-0.018)<1e-9,'canlı açılış: '+JSON.stringify(r));
    ok(X.calls.includes('POST /fapi/v1/leverage')&&X.calls.includes('POST /fapi/v1/order MARKET')&&X.algo.length===1,'canlı: kaldıraç, market, algo stop');
    const s=await t.setStop({sym:'ETHUSDT',stop:3950}); ok(s.ok&&X.algo.length===1&&+X.algo[0].triggerPrice===3950,'stop taşıma eskisini iptal etmeli');
    const rd=await t.reduce({sym:'ETHUSDT',qty:0.01}); ok(rd.ok&&Math.abs(X.pos.ETHUSDT.amt-0.008)<1e-9,'azaltma reduceOnly');
    const c=await t.close({sym:'ETHUSDT'}); ok(c.ok&&!X.pos.ETHUSDT&&X.algo.length===0,'kapanış: pozisyon ve stop gitmeli'); }

  // 7) canlı: algo yoksa eski uç nokta; ikisi de yoksa pozisyon hemen kapanır
  { const d=tmp(), X=fakeEx({algoFail:true}); writeCfg(d,{mode:'canli'}); const t=createTrader({dir:d,fetch:X.fetch});
    const r=await t.open({sym:'ETHUSDT',dir:'long',stop:3900}); ok(r.ok&&X.std.length===1,'algo yoksa STOP_MARKET /order'); }
  { const d=tmp(), X=fakeEx({algoFail:true,stdFail:true}); writeCfg(d,{mode:'canli'}); const t=createTrader({dir:d,fetch:X.fetch});
    const r=await t.open({sym:'ETHUSDT',dir:'long',stop:3900}); ok(!r.ok&&!X.pos.ETHUSDT,'stop yazılamazsa pozisyon kapanmalı'); }

  // 8) canlı bekçi: stopu silinen pozisyona stop geri yazılır; bilinmeyen stopsuz pozisyon kapanır; taban
  { const d=tmp(), X=fakeEx(); writeCfg(d,{mode:'canli'}); const t=createTrader({dir:d,fetch:X.fetch});
    await t.open({sym:'ETHUSDT',dir:'long',stop:3900}); X.algo=[]; await t.guard(); ok(X.algo.length===1,'bekçi stopu geri yazmalı');
    X.pos.XYUSDT={amt:50,e:1}; await t.guard(); ok(!X.pos.XYUSDT,'stopsuz bilinmeyen pozisyon kapanmalı');
    X.bal=60; await t.guard(); const st=await t.state(); ok(st.killed&&!X.pos.ETHUSDT,'taban altında acil durdurma'); }

  // 9) hedge modu reddedilir
  { const d=tmp(), X=fakeEx(); X.dual=true; writeCfg(d,{mode:'canli'}); const t=createTrader({dir:d,fetch:X.fetch});
    const r=await t.open({sym:'ETHUSDT',dir:'long',stop:3900}); ok(!r.ok&&/hedge/.test(r.err),'hedge modu reddedilmeli'); }

  // 10) anahtar şifreleme (safeStorage benzeri): trade.json'dan silinir, trade.key'den okunur
  { const d=tmp(), X=fakeEx(); writeCfg(d,{mode:'kuru'}); const safe={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from('x'+s),decryptString:b=>b.toString().slice(1)};
    createTrader({dir:d,fetch:X.fetch,safeStorage:safe}); const raw=JSON.parse(fs.readFileSync(path.join(d,'trade.json'),'utf8'));
    ok(!raw.key&&!raw.secret&&fs.existsSync(path.join(d,'trade.key')),'anahtar trade.json\'dan silinmeli');
    const t2=createTrader({dir:d,fetch:X.fetch,safeStorage:safe}); ok(t2._T.key==='K'&&t2._T.secret==='S','anahtar trade.key\'den okunmalı'); }

  // 11) rtPlan: masanın pozisyonlarını uzlaştırma
  { const src=fs.readFileSync(path.join(__dirname,'../src/realtrade.js'),'utf8');
    const ctx={localStorage:{getItem:()=>null,setItem:()=>{}},window:{},console}; vm.createContext(ctx); vm.runInContext(src+';this.rtPlan=rtPlan;',ctx); const P=ctx.rtPlan;
    const now=1e12, lv={mode:'kuru',since:now-60e3,map:{}};
    let a=P(lv,[{sym:'AUSDT',dir:'long',stop:9,openT:now-10e3,qty:10,qty0:10}],{pos:[]},now,true); ok(a.length===1&&a[0].k==='open','taze pozisyon açılmalı');
    a=P(lv,[{sym:'AUSDT',dir:'long',stop:9,openT:now-120e3,qty:10,qty0:10}],{pos:[]},now,true); ok(a[0].k==='skip','katmandan önce açılan kopyalanmamalı');
    a=P(lv,[{sym:'AUSDT',dir:'long',stop:9,openT:now-10e3,qty:10,qty0:10}],{pos:[]},now,false); ok(a[0].k==='skip','bot kapalıyken açılmamalı');
    lv.map.AUSDT={openT:now-10e3,dir:'long',q0:4,stop:9};
    a=P(lv,[{sym:'AUSDT',dir:'long',stop:10,openT:now-10e3,qty:5,qty0:10}],{pos:[{sym:'AUSDT',qty:4}]},now,true);
    ok(a.some(x=>x.k==='reduce'&&Math.abs(x.qty-2)<1e-9)&&a.some(x=>x.k==='stop'&&x.stop===10),'yarı kapanış ve stop taşıma yansımalı');
    a=P(lv,[{sym:'AUSDT',dir:'long',stop:10,openT:now-10e3,qty:15,qty0:10}],{pos:[{sym:'AUSDT',qty:4}]},now,true); ok(!a.some(x=>x.k==='reduce'),'ekleme kopyalanmamalı ve azaltma olmamalı');
    a=P(lv,[],{pos:[{sym:'AUSDT',qty:4}]},now,true); ok(a.some(x=>x.k==='close')&&a.some(x=>x.k==='forget'),'masa kapatınca kapanmalı');
    a=P(lv,[{sym:'AUSDT',dir:'long',stop:9,openT:now-10e3,qty:10,qty0:10}],{pos:[]},now,true); ok(a[0].k==='gone','borsada stop olduysa işaretlenmeli');
    a=P(lv,[],{pos:[{sym:'BUSDT',qty:1}]},now,true); ok(!a.some(x=>x.sym==='BUSDT'),'katmanın açmadığı pozisyona dokunulmamalı'); }

  console.log('errors',errors);
  process.exit(errors.length?1:0);
})().catch(e=>{ console.log('errors',[String(e&&e.stack||e)]); process.exit(1); });
