/* Gerçek hesap emir katmanı (15 Ekim 2026, kullanıcı: "bot masasını kendi Binance hesabımda gerçek parayla çalıştırmak istiyorum").
   Ana süreçte çalışır; anahtar sayfaya hiç gitmez. Sayfa (src/realtrade.js) yalnız niyet gönderir: aç / azalt / stopu taşı / kapat / acil durdur.
   Boyut, kaldıraç, stop ve bütün sınırlar burada hesaplanır ve denetlenir; sayfadaki bir hata bu sınırları aşamaz.

   Ayar: %APPDATA%/SWEEP/trade.json (kullanıcı kendisi düzenler; ilk açılışta şablon yazılır)
     mode     "kapali" (varsayılan) | "kuru" (emirler yalnız günlüğe, sanal defter) | "canli" (gerçek emir)
     key, secret   Binance API anahtarı. Windows'ta ilk okumada safeStorage (DPAPI) ile trade.key'e şifrelenip dosyadan silinir.
     maxUsd   boyut bu özkaynakla hesaplanır (hesapta daha çok para olsa da), varsayılan 100
     maxLev   kaldıraç en çok, varsayılan 5 (izole)
     maxPos   aynı anda en çok pozisyon, varsayılan 2
     riskPct  işlem başı risk (stopta kayıp ÷ özkaynak), varsayılan 0,02
     dayLossPct  UTC günü başındaki özkaynaktan bu kadar düşünce o gün yeni giriş yok, varsayılan 0,05
     floorUsd özkaynak bunun altına inerse acil durdurma (her şey kapanır), varsayılan 70
   Acil durdurma: arayüzdeki düğme ya da %APPDATA%/SWEEP/DUR dosyası. Bütün emirler iptal, bütün pozisyonlar market kapanır, durum "durduruldu" kalır.
   Durum: trade-state.json (gün başı özkaynağı, durdurma, kuru defter, bilinen stoplar). Günlük: logs/trade-YYYY-MM-DD.jsonl (her istek ve yanıt; anahtar yok).
   Canlıya geçmeden önce: anahtarda çekim kapalı ve IP kısıtı açık olmalı (sapi apiRestrictions ile denetlenir, değilse emir gönderilmez),
   hesap tek yönlü pozisyon modunda olmalı (hedge modu reddedilir). */
const crypto=require('crypto'), fs=require('fs'), path=require('path');

const FAPI='https://fapi.binance.com', SAPI='https://api.binance.com';
const DEF={mode:'kapali',key:'',secret:'',maxUsd:100,maxLev:5,maxPos:2,riskPct:0.02,dayLossPct:0.05,floorUsd:70,minStopPct:0.003,maxStopPct:0.15};
const FEE=0.0005, SLIP=0.0003;
const num=(v,d)=>{ const n=+v; return isFinite(n)?n:d; };
const dec=s=>{ const t=String(s); const i=t.indexOf('.'); return i<0?0:t.replace(/0+$/,'').length-i-1; };
const floorTo=(v,step)=>{ const d=dec(step); const n=Math.floor(v/step+1e-9)*step; return +n.toFixed(d); };
const roundTo=(v,step)=>{ const d=dec(step); return +(Math.round(v/step)*step).toFixed(d); };
const utcDay=t=>new Date(t).toISOString().slice(0,10);

function createTrader(o){
  const dir=o.dir, now=o.now||Date.now, fetchFn=o.fetch||fetch, log=o.log||(()=>{}), safe=o.safeStorage||null;
  const cfgF=path.join(dir,'trade.json'), keyF=path.join(dir,'trade.key'), stF=path.join(dir,'trade-state.json'), durF=path.join(dir,'DUR'), logD=path.join(dir,'logs');
  const T={cfg:Object.assign({},DEF), key:'', secret:'', st:null, info:null, infoT:0, offset:0, cool:0, snap:null, snapT:0, err:null, checks:null, lastGuard:0, busy:false, events:[]};

  function jlog(rec){ try{ fs.mkdirSync(logD,{recursive:true}); fs.appendFileSync(path.join(logD,'trade-'+utcDay(now())+'.jsonl'),JSON.stringify(Object.assign({t:new Date(now()).toISOString()},rec))+'\n'); }catch(e){} }
  function event(txt,kind){ T.events.unshift({t:now(),txt,kind:kind||'info'}); T.events=T.events.slice(0,60); jlog({ev:kind||'info',txt}); log('işlem katmanı: '+txt); }

  function loadCfg(){
    let raw=null; try{ raw=JSON.parse(fs.readFileSync(cfgF,'utf8')); }catch(e){}
    if(!raw){ raw={mode:'kapali',key:'',secret:'',maxUsd:100,maxLev:5,maxPos:2,riskPct:0.02,dayLossPct:0.05,floorUsd:70,
      _not:'mode: kapali | kuru | canli. key/secret: Binance API anahtarı (yalnız Reading + Futures, çekim kapalı, IP kısıtlı). Kaydedince anahtar şifrelenip bu dosyadan silinir.'};
      try{ fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(cfgF,JSON.stringify(raw,null,2)); }catch(e){} }
    const c=Object.assign({},DEF);
    c.mode=['kapali','kuru','canli'].includes(raw.mode)?raw.mode:'kapali';
    for(const k of ['maxUsd','maxLev','maxPos','riskPct','dayLossPct','floorUsd']) c[k]=num(raw[k],DEF[k]);
    // elle yazılmış uç değerlere karşı mutlak tavanlar
    c.maxLev=Math.max(1,Math.min(10,Math.floor(c.maxLev))); c.maxPos=Math.max(1,Math.min(6,Math.floor(c.maxPos)));
    c.riskPct=Math.max(0.001,Math.min(0.05,c.riskPct)); c.dayLossPct=Math.max(0.01,Math.min(0.3,c.dayLossPct)); c.maxUsd=Math.max(10,c.maxUsd); c.floorUsd=Math.max(0,c.floorUsd);
    let key=String(raw.key||'').trim(), secret=String(raw.secret||'').trim();
    if(key&&secret&&safe&&safe.isEncryptionAvailable&&safe.isEncryptionAvailable()){
      try{ fs.writeFileSync(keyF,safe.encryptString(JSON.stringify({key,secret}))); raw.key=''; raw.secret=''; fs.writeFileSync(cfgF,JSON.stringify(raw,null,2)); event('API anahtarı şifrelenip trade.key dosyasına taşındı; trade.json\'dan silindi.'); }catch(e){ event('anahtar şifrelenemedi: '+e.message,'error'); }
    }
    if(!key&&safe&&fs.existsSync(keyF)){ try{ const k=JSON.parse(safe.decryptString(fs.readFileSync(keyF))); key=k.key||''; secret=k.secret||''; }catch(e){ event('trade.key okunamadı: '+e.message,'error'); } }
    if(c.mode!==T.cfg.mode) event('mod: '+c.mode);
    T.cfg=c; T.key=key; T.secret=secret;
  }
  function loadSt(){ let s=null; try{ s=JSON.parse(fs.readFileSync(stF,'utf8')); }catch(e){}
    T.st=Object.assign({day:null,day0:null,killed:null,dry:{bal:null,pos:{}},stops:{},block:null},s||{}); if(!T.st.dry) T.st.dry={bal:null,pos:{}}; if(!T.st.stops) T.st.stops={}; }
  function saveSt(){ try{ fs.writeFileSync(stF+'.tmp',JSON.stringify(T.st)); fs.renameSync(stF+'.tmp',stF); }catch(e){} }

  /* ---- HTTP ---- */
  async function http(base,method,p,params,signed){
    if(T.cool>now()) throw Object.assign(new Error('Binance bekleme süresi ('+Math.ceil((T.cool-now())/1000)+' sn)'),{cool:true});
    let q='';
    if(signed){ if(!T.key||!T.secret) throw new Error('API anahtarı yok'); const pp=Object.assign({},params||{},{recvWindow:10000,timestamp:now()-T.offset}); q=new URLSearchParams(pp).toString(); q+='&signature='+crypto.createHmac('sha256',T.secret).update(q).digest('hex'); }
    else if(params&&Object.keys(params).length) q=new URLSearchParams(params).toString();
    const url=base+p+(q?'?'+q:''), mut=method!=='GET';
    let r, body=null;
    try{ r=await fetchFn(url,{method,headers:signed?{'X-MBX-APIKEY':T.key}:{}}); }catch(e){ if(mut) jlog({req:method+' '+p,params,err:'bağlantı'}); throw new Error(p+' → bağlantı kurulamadı'); }
    try{ body=await r.json(); }catch(e){}
    if(r.status===418||r.status===429){ const ra=num(r.headers&&r.headers.get&&r.headers.get('retry-after'),60); T.cool=now()+(ra+(r.status===418?300:5))*1000; event('Binance HTTP '+r.status+' · '+p+' · '+ra+' sn bekleme','error'); }
    if(mut) jlog({req:method+' '+p,params,status:r.status,res:body});
    if(!r.ok){ const e=new Error(p+' → '+((body&&body.msg)||('HTTP '+r.status))); e.code=body&&body.code; e.status=r.status; throw e; }
    return body;
  }
  const fapi=(m,p,params,signed=true)=>http(FAPI,m,p,params,signed);
  async function syncTime(){ try{ const t=await http(FAPI,'GET','/fapi/v1/time',null,false); T.offset=now()-t.serverTime; }catch(e){} }
  async function exInfo(){
    if(T.info&&now()-T.infoT<6*3600e3) return T.info;
    const r=await http(FAPI,'GET','/fapi/v1/exchangeInfo',null,false); const m={};
    for(const s of r.symbols||[]){ if(s.contractType!=='PERPETUAL'||s.quoteAsset!=='USDT') continue; const f={}; for(const x of s.filters||[]) f[x.filterType]=x;
      m[s.symbol]={status:s.status,tick:+(f.PRICE_FILTER||{}).tickSize||0,step:+((f.MARKET_LOT_SIZE&&+f.MARKET_LOT_SIZE.stepSize?f.MARKET_LOT_SIZE:f.LOT_SIZE)||{}).stepSize||0,minQty:+((f.MARKET_LOT_SIZE||f.LOT_SIZE)||{}).minQty||0,maxQty:+((f.MARKET_LOT_SIZE||f.LOT_SIZE)||{}).maxQty||Infinity,minNot:+((f.MIN_NOTIONAL||{}).notional)||5,tickS:(f.PRICE_FILTER||{}).tickSize,stepS:((f.MARKET_LOT_SIZE&&+f.MARKET_LOT_SIZE.stepSize?f.MARKET_LOT_SIZE:f.LOT_SIZE)||{}).stepSize}; }
    T.info=m; T.infoT=now(); return m;
  }
  async function markOf(sym){ const r=await http(FAPI,'GET','/fapi/v1/premiumIndex',{symbol:sym},false); return +r.markPrice; }

  /* ---- canlıya geçiş denetimi: çekim kapalı, IP kısıtlı, vadeli açık, tek yönlü mod ---- */
  async function checks(force){
    if(T.checks&&!force&&now()-T.checks.t<6*3600e3) return T.checks;
    const c={t:now(),ok:false,why:[]};
    try{ const a=await http(SAPI,'GET','/sapi/v1/account/apiRestrictions',null,true);
      if(a.enableWithdrawals) c.why.push('anahtarda çekim izni açık');
      if(!a.ipRestrict) c.why.push('anahtarda IP kısıtı yok');
      if(!a.enableFutures) c.why.push('anahtarda Futures izni kapalı');
      c.perm={withdraw:!!a.enableWithdrawals,ip:!!a.ipRestrict,futures:!!a.enableFutures};
    }catch(e){ c.why.push('anahtar izinleri okunamadı ('+e.message+')'); }
    try{ const d=await fapi('GET','/fapi/v1/positionSide/dual',{}); if(d.dualSidePosition) c.why.push('hesap hedge modunda (tek yönlü olmalı)'); }catch(e){ c.why.push('pozisyon modu okunamadı ('+e.message+')'); }
    c.ok=!c.why.length; T.checks=c; if(!c.ok) event('canlı denetim geçmedi: '+c.why.join('; '),'error'); return c;
  }

  /* ---- hesap anlık görüntüsü (canlı: Binance, kuru: sanal defter) ---- */
  async function liveSnap(){
    const [bal,pr]=await Promise.all([fapi('GET','/fapi/v2/balance',{}),fapi('GET','/fapi/v2/positionRisk',{})]);
    const u=(bal||[]).find(x=>x.asset==='USDT')||{};
    const pos=(pr||[]).filter(p=>+p.positionAmt!==0).map(p=>({sym:p.symbol,dir:+p.positionAmt>0?'long':'short',qty:Math.abs(+p.positionAmt),entry:+p.entryPrice,mark:+p.markPrice,upnl:+p.unRealizedProfit,liq:+p.liquidationPrice,lev:+p.leverage,iso:p.marginType==='isolated'}));
    const wallet=num(u.balance,0), upnl=pos.reduce((a,p)=>a+p.upnl,0);
    const stops={};
    for(const p of pos){ stops[p.sym]=await openStops(p.sym).catch(()=>null); }
    return {wallet,avail:num(u.availableBalance,0),eq:wallet+upnl,pos,stops};
  }
  async function drySnap(){
    const d=T.st.dry; if(d.bal==null) d.bal=T.cfg.maxUsd;
    const pos=[]; let upnl=0;
    for(const [sym,p] of Object.entries(d.pos)){ let mk=p.mark; try{ mk=await markOf(sym); }catch(e){} p.mark=mk;
      // kuru defterde stop mark fiyatla, tur aralığında denetlenir
      if(p.stop&&((p.dir==='long'&&mk<=p.stop)||(p.dir==='short'&&mk>=p.stop))){ dryFill(sym,p.qty,p.stop,'stop'); continue; }
      const u=(p.dir==='long'?mk-p.entry:p.entry-mk)*p.qty; upnl+=u;
      pos.push({sym,dir:p.dir,qty:p.qty,entry:p.entry,mark:mk,upnl:u,liq:0,lev:p.lev,iso:true}); }
    const used=pos.reduce((a,p)=>a+p.qty*p.entry/p.lev,0);
    const stops={}; for(const p of pos){ const s=d.pos[p.sym].stop; stops[p.sym]=s?[{kind:'dry',id:'dry',px:s}]:[]; }
    return {wallet:d.bal,avail:d.bal-used,eq:d.bal+upnl,pos,stops};
  }
  function dryFill(sym,qty,px,why){ const d=T.st.dry, p=d.pos[sym]; if(!p) return; const q=Math.min(qty,p.qty); const fill=p.dir==='long'?px*(1-SLIP):px*(1+SLIP);
    const pnl=(p.dir==='long'?fill-p.entry:p.entry-fill)*q-q*fill*FEE; d.bal+=pnl; p.qty=+(p.qty-q).toFixed(10); if(p.qty<=1e-12) delete d.pos[sym];
    event(`KURU ${sym} ${why}: ${q} @ ${fill.toPrecision(6)} · ${pnl>=0?'+':''}${pnl.toFixed(2)} $`); saveSt(); }
  async function snap(force){
    if(!force&&T.snap&&now()-T.snapT<4000) return T.snap;
    const s=T.cfg.mode==='canli'?await liveSnap():await drySnap(); T.snap=s; T.snapT=now(); T.err=null; return s;
  }

  /* ---- stoplar: önce Algo emir servisi (koşullu emirler 2025 sonunda buraya taşındı), olmazsa eski /fapi/v1/order ---- */
  async function openStops(sym){
    const out=[];
    try{ const a=await fapi('GET','/fapi/v1/openAlgoOrders',{symbol:sym}); for(const x of (Array.isArray(a)?a:(a&&a.orders)||[])){ const ty=x.orderType||x.type; if(/STOP/.test(ty||'')) out.push({kind:'algo',id:x.algoId,px:+(x.triggerPrice||x.stopPrice)}); } }catch(e){}
    try{ const a=await fapi('GET','/fapi/v1/openOrders',{symbol:sym}); for(const x of a||[]) if(/STOP/.test(x.type||'')&&(x.closePosition||x.reduceOnly)) out.push({kind:'std',id:x.orderId,px:+x.stopPrice}); }catch(e){}
    return out;
  }
  async function placeStop(sym,dir,stop){
    const inf=(await exInfo())[sym]; const px=roundTo(stop,inf.tick); const side=dir==='long'?'SELL':'BUY';
    if(T.cfg.mode!=='canli'){ T.st.dry.pos[sym].stop=px; T.st.stops[sym]=px; saveSt(); jlog({dry:'stop',sym,side,px}); return {kind:'dry',id:'dry',px}; }
    try{ const r=await fapi('POST','/fapi/v1/algoOrder',{algoType:'CONDITIONAL',symbol:sym,side,type:'STOP_MARKET',triggerPrice:inf.tickS?px.toFixed(dec(inf.tickS)):px,closePosition:'true',workingType:'MARK_PRICE',priceProtect:'TRUE'});
      T.st.stops[sym]=px; saveSt(); return {kind:'algo',id:r.algoId,px}; }
    catch(e){ if(e.cool) throw e; jlog({note:'algo stop olmadı, eski uç nokta deneniyor',err:e.message}); }
    const r=await fapi('POST','/fapi/v1/order',{symbol:sym,side,type:'STOP_MARKET',stopPrice:inf.tickS?px.toFixed(dec(inf.tickS)):px,closePosition:'true',workingType:'MARK_PRICE',priceProtect:'TRUE'});
    T.st.stops[sym]=px; saveSt(); return {kind:'std',id:r.orderId,px};
  }
  async function cancelStop(sym,s){ if(s.kind==='dry') return; if(s.kind==='algo') await fapi('DELETE','/fapi/v1/algoOrder',{algoId:s.id}).catch(()=>{}); else await fapi('DELETE','/fapi/v1/order',{symbol:sym,orderId:s.id}).catch(()=>{}); }
  async function cancelAll(sym){ if(T.cfg.mode!=='canli'){ if(T.st.dry.pos[sym]) T.st.dry.pos[sym].stop=null; return; }
    await fapi('DELETE','/fapi/v1/algoOpenOrders',{symbol:sym}).catch(()=>{}); await fapi('DELETE','/fapi/v1/allOpenOrders',{symbol:sym}).catch(()=>{}); }
  async function market(sym,side,qty,reduce){
    const inf=(await exInfo())[sym]; const q=floorTo(qty,inf.step); if(!(q>0)) throw new Error('miktar adım altında');
    if(T.cfg.mode!=='canli'){ const mk=await markOf(sym); const d=T.st.dry;
      if(reduce){ const p=d.pos[sym]; if(!p) return {qty:0,avg:mk}; dryFill(sym,q,mk,'kapanış'); return {qty:q,avg:mk}; }
      const fill=side==='BUY'?mk*(1+SLIP):mk*(1-SLIP); d.bal-=q*fill*FEE; d.pos[sym]={dir:side==='BUY'?'long':'short',qty:q,entry:fill,mark:mk,lev:T.cfg.maxLev,stop:null}; saveSt(); jlog({dry:'market',sym,side,q,fill}); return {qty:q,avg:fill}; }
    const p={symbol:sym,side,type:'MARKET',quantity:inf.stepS?q.toFixed(dec(inf.stepS)):q,newOrderRespType:'RESULT'}; if(reduce) p.reduceOnly='true';
    const r=await fapi('POST','/fapi/v1/order',p); return {qty:+r.executedQty||q,avg:+r.avgPrice||0};
  }

  /* ---- gün, taban, acil durdurma ---- */
  function dayCheck(eq){
    const d=utcDay(now()); if(T.st.day!==d){ T.st.day=d; T.st.day0=eq; T.st.block=null; saveSt(); }
    if(!T.st.block&&eq<=T.st.day0*(1-T.cfg.dayLossPct)){ T.st.block='günlük zarar sınırı (%'+(T.cfg.dayLossPct*100).toFixed(1)+')'; saveSt(); event('Günlük zarar sınırı: özkaynak '+eq.toFixed(2)+' $, gün başı '+T.st.day0.toFixed(2)+' $. Bugün yeni giriş yok.','warn'); }
  }
  async function kill(why){
    T.st.killed={t:now(),why}; saveSt(); event('ACİL DURDURMA: '+why,'error');
    let s=null; try{ s=await snap(true); }catch(e){ event('durdurmada hesap okunamadı: '+e.message,'error'); }
    const syms=new Set([...(s?s.pos.map(p=>p.sym):[]),...Object.keys(T.st.stops)]);
    for(const sym of syms){ try{ await cancelAll(sym); }catch(e){} }
    for(const p of (s?s.pos:[])){ try{ await market(p.sym,p.dir==='long'?'SELL':'BUY',p.qty,true); event(p.sym+' kapatıldı (acil durdurma)'); }catch(e){ event(p.sym+' kapatılamadı: '+e.message+' — Binance\'te elle kapat','error'); } }
    T.st.stops={}; saveSt(); T.snapT=0; return {ok:true};
  }
  // 15 sn'de bir: ayar, DUR dosyası, gün sınırı, taban, her pozisyonda stop var mı
  async function guard(){
    if(T.busy) return; T.busy=true;
    try{
      loadCfg(); if(T.cfg.mode==='kapali') return;
      if(fs.existsSync(durF)&&!T.st.killed){ await kill('DUR dosyası'); return; }
      const s=await snap(true);
      dayCheck(s.eq);
      if(!T.st.killed&&s.eq<T.cfg.floorUsd&&(T.cfg.mode==='canli'||T.st.dry.bal!=null)){ await kill('özkaynak '+s.eq.toFixed(2)+' $ < taban '+T.cfg.floorUsd+' $'); return; }
      for(const p of s.pos){
        const st=s.stops[p.sym]; if(st&&st.length) continue; if(st===null) continue; // okunamadıysa sonraki tur
        const want=T.st.stops[p.sym];
        if(want&&((p.dir==='long'&&want<p.mark)||(p.dir==='short'&&want>p.mark))){ try{ await placeStop(p.sym,p.dir,want); event(p.sym+' stopu borsada yoktu, yeniden yazıldı ('+want+')','warn'); }catch(e){ event(p.sym+' stop yazılamadı, pozisyon kapatılıyor: '+e.message,'error'); await market(p.sym,p.dir==='long'?'SELL':'BUY',p.qty,true).catch(()=>{}); } }
        else { event(p.sym+' stopsuz pozisyon (stop bilinmiyor ya da geçilmiş), kapatılıyor','error'); await market(p.sym,p.dir==='long'?'SELL':'BUY',p.qty,true).catch(e=>event(p.sym+' kapatılamadı: '+e.message,'error')); }
      }
    }catch(e){ T.err=e.message; }
    finally{ T.busy=false; T.lastGuard=now(); }
  }

  /* ---- sayfanın niyetleri ---- */
  async function open(a){
    loadCfg(); const c=T.cfg, sym=String(a&&a.sym||''), dir=a&&a.dir, stop=num(a&&a.stop,NaN);
    const no=why=>{ jlog({open:'red',sym,dir,why}); return {ok:false,err:why}; };
    if(c.mode==='kapali') return no('mod kapalı');
    if(T.st.killed) return no('acil durdurma açık');
    if(fs.existsSync(durF)) return no('DUR dosyası var');
    if(!/^[A-Z0-9]{2,20}USDT$/.test(sym)||!['long','short'].includes(dir)||!(stop>0)) return no('geçersiz istek');
    if(c.mode==='canli'){ const ck=await checks(); if(!ck.ok) return no('canlı denetim: '+ck.why.join('; ')); }
    let s; try{ s=await snap(true); }catch(e){ return no('hesap okunamadı: '+e.message); }
    dayCheck(s.eq); if(T.st.block) return no(T.st.block);
    if(s.eq<c.floorUsd) return no('özkaynak tabanın altında');
    if(s.pos.length>=c.maxPos) return no('en çok '+c.maxPos+' pozisyon');
    if(s.pos.some(p=>p.sym===sym)) return no('bu coinde pozisyon var');
    let inf; try{ inf=(await exInfo())[sym]; }catch(e){ return no('exchangeInfo: '+e.message); } if(!inf||inf.status!=='TRADING') return no('coin işlemde değil');
    let mk; try{ mk=await markOf(sym); }catch(e){ return no('mark fiyat: '+e.message); }
    const dist=dir==='long'?mk-stop:stop-mk; const dp=dist/mk;
    if(!(dist>0)) return no('stop yanlış tarafta');
    if(dp<c.minStopPct||dp>c.maxStopPct) return no('stop uzaklığı %'+(dp*100).toFixed(2)+' sınır dışı');
    const eqS=Math.min(s.eq,c.maxUsd); const riskUsd=eqS*c.riskPct;
    let qty=riskUsd/(dist+mk*(FEE*2+SLIP*2));
    const capNot=Math.min(eqS*c.maxLev, s.avail*0.9*c.maxLev); if(qty*mk>capNot) qty=capNot/mk;
    qty=Math.min(floorTo(qty,inf.step),inf.maxQty);
    if(!(qty>=inf.minQty)||qty*mk<inf.minNot) return no('pozisyon borsanın en küçük büyüklüğünün altında ('+(qty*mk).toFixed(2)+' $ < '+inf.minNot+' $)');
    if(c.mode==='canli'){
      try{ await fapi('POST','/fapi/v1/marginType',{symbol:sym,marginType:'ISOLATED'}); }catch(e){ if(e.code!==-4046) return no('izole marjin ayarlanamadı: '+e.message); }
      try{ await fapi('POST','/fapi/v1/leverage',{symbol:sym,leverage:c.maxLev}); }catch(e){ return no('kaldıraç ayarlanamadı: '+e.message); }
    }
    let f; try{ f=await market(sym,dir==='long'?'BUY':'SELL',qty,false); }catch(e){ return no('market emir: '+e.message); }
    let st=null; try{ st=await placeStop(sym,dir,stop); }catch(e){ event(sym+' stop yazılamadı ('+e.message+'), pozisyon hemen kapatılıyor','error'); }
    if(!st){ await market(sym,dir==='long'?'SELL':'BUY',f.qty,true).catch(e2=>event(sym+' kapatılamadı: '+e2.message+' — Binance\'te elle kapat','error')); T.snapT=0; return {ok:false,err:'stop yazılamadı, pozisyon kapatıldı'}; }
    T.snapT=0; event(`${c.mode==='canli'?'':'KURU '}${sym} ${dir.toUpperCase()} açıldı · ${f.qty} @ ${(f.avg||mk).toPrecision(6)} · nominal ${(f.qty*(f.avg||mk)).toFixed(2)} $ · stop ${st.px} · risk ≈ ${riskUsd.toFixed(2)} $ · kaldıraç ${c.maxLev}x izole`,'fill');
    return {ok:true,qty:f.qty,avg:f.avg||mk,stop:st.px,lev:c.maxLev,riskUsd};
  }
  async function reduce(a){
    loadCfg(); if(T.cfg.mode==='kapali') return {ok:false,err:'mod kapalı'};
    const s=await snap(true); const p=s.pos.find(x=>x.sym===a.sym); if(!p) return {ok:false,err:'pozisyon yok'};
    const q=Math.min(p.qty,num(a.qty,0)); if(!(q>0)) return {ok:false,err:'miktar yok'};
    try{ const f=await market(p.sym,p.dir==='long'?'SELL':'BUY',q,true); T.snapT=0; event(`${T.cfg.mode==='canli'?'':'KURU '}${p.sym} azaltıldı ${f.qty}${a.why?' ('+a.why+')':''}`); return {ok:true,qty:f.qty}; }
    catch(e){ return {ok:false,err:e.message}; }
  }
  async function setStop(a){
    loadCfg(); if(T.cfg.mode==='kapali') return {ok:false,err:'mod kapalı'};
    const s=await snap(true); const p=s.pos.find(x=>x.sym===a.sym); if(!p) return {ok:false,err:'pozisyon yok'};
    const stop=num(a.stop,NaN); if(!(stop>0)) return {ok:false,err:'geçersiz stop'};
    if((p.dir==='long'&&stop>=p.mark)||(p.dir==='short'&&stop<=p.mark)){ const r=await reduce({sym:p.sym,qty:p.qty,why:'stop fiyatın öbür yanında'}); return Object.assign(r,{closed:true}); }
    const old=s.stops[p.sym]||[];
    let st; try{ st=await placeStop(p.sym,p.dir,stop); }catch(e){ return {ok:false,err:e.message}; }
    for(const o of old) if(!(o.kind===st.kind&&String(o.id)===String(st.id))) await cancelStop(p.sym,o);
    T.snapT=0; event(`${T.cfg.mode==='canli'?'':'KURU '}${p.sym} stop → ${st.px}`); return {ok:true,stop:st.px};
  }
  async function close(a){
    loadCfg(); if(T.cfg.mode==='kapali') return {ok:false,err:'mod kapalı'};
    const s=await snap(true); const p=s.pos.find(x=>x.sym===a.sym);
    try{ await cancelAll(a.sym); }catch(e){}
    delete T.st.stops[a.sym]; saveSt();
    if(!p) return {ok:true,qty:0};
    try{ const f=await market(p.sym,p.dir==='long'?'SELL':'BUY',p.qty,true); T.snapT=0; event(`${T.cfg.mode==='canli'?'':'KURU '}${p.sym} kapatıldı${a.why?' ('+a.why+')':''}`); return {ok:true,qty:f.qty}; }
    catch(e){ return {ok:false,err:e.message}; }
  }
  async function state(){
    loadCfg(); const c=T.cfg; let s=null;
    if(c.mode!=='kapali'){ try{ s=await snap(false); dayCheck(s.eq); }catch(e){ T.err=e.message; } }
    return {mode:c.mode,caps:{maxUsd:c.maxUsd,maxLev:c.maxLev,maxPos:c.maxPos,riskPct:c.riskPct,dayLossPct:c.dayLossPct,floorUsd:c.floorUsd},hasKey:!!(T.key&&T.secret),
      killed:T.st.killed,block:T.st.block,day0:T.st.day0,checks:T.checks?{ok:T.checks.ok,why:T.checks.why,perm:T.checks.perm}:null,cool:T.cool>now()?T.cool:0,err:T.err,
      eq:s?s.eq:null,wallet:s?s.wallet:null,avail:s?s.avail:null,pos:s?s.pos.map(p=>Object.assign({},p,{stop:(s.stops[p.sym]||[]).map(x=>x.px)[0]||null})):[],events:T.events.slice(0,20)};
  }
  async function rearm(){ T.st.killed=null; saveSt(); event('acil durdurma kaldırıldı (yeniden kuruldu)'); return {ok:true}; }

  // bütün niyetler ve bekçi sırayla çalışır: bekçi, açılışla stop arasındaki anı "stopsuz pozisyon" sanıp kapatmasın
  let chain=Promise.resolve();
  const serial=f=>(...a)=>{ const r=chain.then(()=>f(...a)); chain=r.catch(()=>{}); return r; };
  loadSt(); loadCfg();
  return {open:serial(open),reduce:serial(reduce),setStop:serial(setStop),close:serial(close),state:serial(state),kill:serial(a=>kill((a&&a.why)||'arayüzden')),rearm:serial(rearm),guard:serial(guard),checks:serial(()=>checks(true)),_T:T};
}

// Electron bağlantısı: IPC uçları + 15 sn'lik bekçi
function attach({app,ipcMain,safeStorage,log}){
  const tr=createTrader({dir:app.getPath('userData'),safeStorage,log});
  const h=(n,f)=>ipcMain.handle('trade-'+n,async(e,a)=>{ try{ return await f(a); }catch(err){ return {ok:false,err:String(err&&err.message||err)}; } });
  h('state',()=>tr.state()); h('open',tr.open); h('reduce',tr.reduce); h('setStop',tr.setStop); h('close',tr.close); h('kill',tr.kill); h('rearm',tr.rearm); h('checks',tr.checks);
  setInterval(()=>{ tr.guard().catch(()=>{}); },15e3);
  return tr;
}
module.exports={createTrader,attach,DEF};
