/* ---------- Hesap: Binance USDⓈ-M vadeli hesabını salt okunur izler ----------
   Anahtar ve gizli anahtar yalnızca bu cihazda tutulur (isteğe bağlı localStorage), imza tarayıcıda WebCrypto ile atılır, istekler doğrudan Binance'e gider.
   Yalnızca okuma uç noktaları: /fapi/v2/balance, /fapi/v2/positionRisk, /fapi/v1/openOrders, /fapi/v1/listenKey (kullanıcı veri akışı). Emir gönderen kod yoktur. */
const acct={key:"",secret:"",remember:false,on:false,offset:0,bal:null,positions:[],orders:[],ws:null,listenKey:null,kaTimer:null,timer:null,lastAt:0,err:null,src:"",events:[],reviews:{},_reviewing:{}};
try{ const sv=JSON.parse(localStorage.getItem("st-acct")||"null"); if(sv&&sv.key&&sv.secret){ acct.key=sv.key; acct.secret=sv.secret; acct.remember=true; } }catch(e){}
function acctSave(){ try{ if(acct.remember&&acct.key&&acct.secret) localStorage.setItem("st-acct",JSON.stringify({key:acct.key,secret:acct.secret})); else localStorage.removeItem("st-acct"); }catch(e){} }
async function hmacHex(secret,msg){ const enc=new TextEncoder(); const k=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]); const sig=await crypto.subtle.sign("HMAC",k,enc.encode(msg)); return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function acctFetch(method,path,params,signed){
  let url=BASE+path, q="";
  if(signed){ const p=Object.assign({},params||{},{timestamp:Date.now()-acct.offset,recvWindow:10000}); q=new URLSearchParams(p).toString(); q+="&signature="+await hmacHex(acct.secret,q); }
  else if(params&&Object.keys(params).length) q=new URLSearchParams(params).toString();
  if(q) url+="?"+q;
  let r; try{ r=await fetch(url,{method,headers:{"X-MBX-APIKEY":acct.key}}); }catch(e){ throw new Error(path+" → bağlantı kurulamadı"); }
  if(!r.ok){ let m=""; try{ const jj=await r.json(); m=jj.msg||""; if(jj.code===-2015) m="anahtar, IP ya da yetki hatası: Binance'te bu anahtar için \"Enable Futures\" açık olmalı ve IP kısıtı varsa bu bilgisayarın IP'si listede olmalı"; if(jj.code===-1021) m="saat farkı; yeniden deneniyor"; }catch(e){} if(r.status===429||r.status===418) m="hız sınırı"; throw new Error(path+" → HTTP "+r.status+(m?" · "+m:"")); }
  return r.json();
}
async function acctSyncTime(){ try{ const t=await (await fetch(BASE+"/fapi/v1/time")).json(); acct.offset=Date.now()-t.serverTime; }catch(e){} }
// bakiye + pozisyonlar + açık emirler (ağırlık 5+5+40 → 5 sn'de bir güvenli)
async function acctSync(){
  if(!acct.on) return;
  try{
    const [bal,pr,oo]=await Promise.all([acctFetch("GET","/fapi/v2/balance",{},true),acctFetch("GET","/fapi/v2/positionRisk",{},true),acctFetch("GET","/fapi/v1/openOrders",{},true)]);
    const u=(bal||[]).find(x=>x.asset==="USDT")||{}; const all=(bal||[]).filter(x=>+x.balance!==0);
    acct.bal={wallet:+u.balance||0,avail:+u.availableBalance||0,crossUnPnl:+u.crossUnPnl||0,assets:all.map(x=>({a:x.asset,b:+x.balance,avail:+x.availableBalance,upnl:+x.crossUnPnl}))};
    acct.positions=(pr||[]).filter(p=>+p.positionAmt!==0).map(p=>{ const amt=+p.positionAmt, dir=amt>0?"long":"short", entry=+p.entryPrice, mark=+p.markPrice, lev=+p.leverage||1, notional=Math.abs(amt*mark), upnl=+p.unRealizedProfit, iso=p.marginType==="isolated"; const margin=iso&&+p.isolatedMargin>0?+p.isolatedMargin:notional/lev; return {sym:p.symbol,dir,amt:Math.abs(amt),entry,mark,liq:+p.liquidationPrice||0,lev,iso,margin,notional,upnl,roe:margin>0?upnl/margin*100:0,liqDist:+p.liquidationPrice>0?(dir==="long"?(mark-+p.liquidationPrice)/mark:(+p.liquidationPrice-mark)/mark):NaN,t:+p.updateTime||0}; });
    acct.orders=(oo||[]).map(o=>({sym:o.symbol,side:o.side,type:o.type,px:+o.price||0,stop:+o.stopPrice||0,qty:+o.origQty,filled:+o.executedQty,ro:!!o.reduceOnly,cp:!!o.closePosition,t:+o.time}));
    acct.lastAt=Date.now(); acct.err=null; acct.src=acct.src||"rest"; if(typeof acctOnSync==="function") acctOnSync();
  }catch(e){ acct.err=e.message; if(/-1021|saat/.test(e.message)) await acctSyncTime(); }
}
// kullanıcı veri akışı: ACCOUNT_UPDATE / ORDER_TRADE_UPDATE olayları anında işlenir (akış susarsa REST turu zaten 5 sn'de bir)
async function acctStream(){
  try{ const lk=await acctFetch("POST","/fapi/v1/listenKey",{},false); acct.listenKey=lk.listenKey; }catch(e){ acct.err=e.message; return; }
  clearInterval(acct.kaTimer); acct.kaTimer=setInterval(()=>{ acctFetch("PUT","/fapi/v1/listenKey",{},false).catch(()=>{}); },25*60e3);
  if(acct.ws){ try{ acct.ws.onclose=null; acct.ws.close(); }catch(e){} }
  let ws; try{ ws=new WebSocket("wss://fstream.binance.com/ws/"+acct.listenKey); }catch(e){ return; } acct.ws=ws;
  ws.onmessage=ev=>{ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } acct.src="ws"; const t=Date.now();
    if(m.e==="ACCOUNT_UPDATE"){ const a=m.a||{}; for(const b of (a.B||[])){ if(b.a==="USDT"&&acct.bal){ acct.bal.wallet=+b.wb; } } for(const p of (a.P||[])){ const i=acct.positions.findIndex(x=>x.sym===p.s); const amt=+p.pa; if(amt===0){ if(i>=0) acct.positions.splice(i,1); acct.events.unshift({t,txt:`${p.s} pozisyon kapandı${p.cr?" · gerçekleşen "+fx(+p.cr,2)+" $":""}`}); } else if(i>=0){ Object.assign(acct.positions[i],{amt:Math.abs(amt),entry:+p.ep,upnl:+p.up,dir:amt>0?"long":"short"}); } else { acct.events.unshift({t,txt:`${p.s} yeni pozisyon ${amt>0?"long":"short"} · giriş ${fmtP(+p.ep)}`}); } } acct.events=acct.events.slice(0,40); acctSync(); }
    else if(m.e==="ORDER_TRADE_UPDATE"){ const o=m.o||{}; if(o.X==="FILLED"||o.X==="PARTIALLY_FILLED"||o.X==="CANCELED"||o.X==="EXPIRED"){ acct.events.unshift({t,txt:`${o.s} ${o.S==="BUY"?"alış":"satış"} ${o.o} ${({FILLED:"doldu",PARTIALLY_FILLED:"kısmen doldu",CANCELED:"iptal",EXPIRED:"süresi doldu"})[o.X]}${+o.ap?" · "+fmtP(+o.ap):""}${+o.rp?" · gerçekleşen "+fx(+o.rp,2)+" $":""}`}); acct.events=acct.events.slice(0,40); acctSync(); } }
    else if(m.e==="MARGIN_CALL"){ acct.events.unshift({t,txt:"TEMİNAT ÇAĞRISI: "+(m.p||[]).map(p=>p.s).join(", ")}); }
    else if(m.e==="listenKeyExpired"){ acctStream(); }
    if(typeof acctOnEvent==="function") acctOnEvent(m.e);
  };
  ws.onclose=()=>{ if(acct.on) setTimeout(()=>{ if(acct.on) acctStream(); },5000); };
}
async function acctStart(key,secret,remember){
  acct.key=(key||"").trim(); acct.secret=(secret||"").trim(); acct.remember=!!remember; acctSave();
  if(!acct.key||!acct.secret){ acct.err="anahtar ve gizli anahtar gerekli"; return false; }
  acct.on=true; acct.err=null; await acctSyncTime(); await acctSync();
  if(acct.err&&!acct.lastAt){ acct.on=false; return false; }
  clearInterval(acct.timer); acct.timer=setInterval(acctSync,5000); acctStream(); return true;
}
function acctStop(forget){ acct.on=false; clearInterval(acct.timer); clearInterval(acct.kaTimer); if(acct.ws){ try{ acct.ws.onclose=null; acct.ws.close(); }catch(e){} acct.ws=null; } if(acct.listenKey){ acctFetch("DELETE","/fapi/v1/listenKey",{},false).catch(()=>{}); acct.listenKey=null; } if(forget){ acct.key=""; acct.secret=""; acct.remember=false; acctSave(); } acct.src=""; }
