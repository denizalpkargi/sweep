/* ---------- WebSocket veri katmanı (6 Ekim 2026 gecesi, Binance 418 yasağından sonra) ----------
   Amaç: tarama ve masa REST yerine canlı akıştan beslensin; Binance hız sınırına/yasağına takılınca veri aksamasın.
   - Mumlar: istenen her coin için tek bir `<sym>@kline_1m` akışı; REST ilk dolumdan sonra 5m/15m/1h/4h/1d mumları 1 dakikalıklarla
     güncellenir (son mum: dakika kapandıkça tabana eklenir, açık dakika üstüne bindirilir). Akış kesintisizse aynı istek REST'e gitmez.
   - Tüm coinlerin 24 sa özeti ve mark/fonlama: `!ticker@arr`, `!markPrice@arr@1s` → /fapi/v1/ticker/24hr, /ticker/price, /premiumIndex.
   - Diğer GET yanıtları (OI, taker, kalabalık, fonlama geçmişi, exchangeInfo) son başarılı hâliyle saklanır: REST hata verirse ya da
     yasak sürerken (rest.cool) 3 saate kadar son hâl döner; 5 dk/15 dk/1 sa'lik /futures/data yanıtları süresinin bir kısmı boyunca
     yeniden istenmez.
   j() (build.js yaması) bu katmana sorar; wsd.on yalnız arayüzde açılır (ekransız bot ve testlerde kapalı; saklanan yanıt yedeği her yerde).
   Not: Binance 2026'da piyasa akışlarını (kline, markPrice, ticker) /market yoluna taşıdı; eski /stream yolunda trade/depth akıyor. */
const WSD_URL="wss://fstream.binance.com/market/stream?streams=";
const WSD_IV={"1m":6e4,"3m":18e4,"5m":3e5,"15m":9e5,"30m":18e5,"1h":36e5,"2h":72e5,"4h":144e5,"6h":216e5,"8h":288e5,"12h":432e5,"1d":864e5};
const WSD_CFG={perConn:150,maxSyms:240,staleMax:3*3600e3,respMax:3000,fresh:30e3};
const wsd={on:false,k:{},tick:{},tickT:0,mark:{},markT:0,glob:null,conns:[],resp:new Map(),stat:{hit:0,rest:0,stale:0,msg:0,respHit:0}};
const wsdNum=r=>r.map(x=>+x);
function wsdStore(s){ return wsd.k[s]||(wsd.k[s]={ivs:{},wsSince:0,wsFirst:Infinity,last:0,conn:null,req:Date.now()}); }
// akış kesintisizse ve REST dolumu akış başladıktan sonra yapıldıysa mum REST'siz verilebilir
function wsdLive(st){ return !!(wsd.on&&st.conn&&st.conn.ws&&st.conn.ws.readyState===1&&st.wsSince&&Date.now()-st.last<120e3); }
function wsdUsable(st,iv){ return wsdLive(st)&&(iv.fetchT>=st.wsSince||st.wsFirst<=iv.m0+6e4); } // akışın ilk dakikası REST dolumundan sonraki dakikayı geçmiyorsa boşluk yok
// 1 dakikalık mumu (WS kline nesnesi) bir zaman dilimine katla
function wsdFold(iv,ms,m){ const rows=iv.rows; if(!rows.length||m.t<iv.m0) return; const b=Math.floor(m.t/ms)*ms; const lt=rows[rows.length-1][0];
  if(b<lt) return;
  if(b>lt){ iv.base=[b,m.o,-Infinity,Infinity,m.o,0,b+ms-1,0,0,0,0,0]; rows.push(iv.base.slice()); if(rows.length>iv.max) rows.splice(0,rows.length-iv.max); }
  else if(!iv.base) iv.base=rows[rows.length-1].slice();
  const c=iv.base.slice(); c[2]=Math.max(c[2],m.h); c[3]=Math.min(c[3],m.l); c[4]=m.c;
  if(m.t!==iv.m0){ c[5]+=m.v; c[7]+=m.q; c[8]+=m.n; c[9]+=m.V; c[10]+=m.Q; } // REST'in yarısını gördüğü dakikada yalnız fiyat
  rows[rows.length-1]=c; if(m.x) iv.base=c; }
function wsdOnKline(s,k){ const st=wsd.k[s]; if(!st) return; const now=Date.now(); if(!st.wsSince){ st.wsSince=now; st.wsFirst=+k.t; } st.last=now;
  const m={t:+k.t,o:+k.o,h:+k.h,l:+k.l,c:+k.c,v:+k.v,q:+k.q,n:+k.n,V:+k.V,Q:+k.Q,x:!!k.x};
  for(const iv in st.ivs) wsdFold(st.ivs[iv],WSD_IV[iv],m); }
const WSD_T=d=>({symbol:d.s,priceChange:d.p,priceChangePercent:d.P,weightedAvgPrice:d.w,lastPrice:d.c,lastQty:d.Q,openPrice:d.o,highPrice:d.h,lowPrice:d.l,volume:d.v,quoteVolume:d.q,openTime:d.O,closeTime:d.C,firstId:d.F,lastId:d.L,count:d.n});
const WSD_M=d=>({symbol:d.s,markPrice:d.p,indexPrice:d.i,estimatedSettlePrice:d.P,lastFundingRate:d.r,interestRate:"0.00010000",nextFundingTime:d.T,time:d.E});
function wsdMsg(conn,ev){ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } const st=m.stream||"", d=m.data; if(!d) return; wsd.stat.msg++; const now=Date.now();
  if(st==="!ticker@arr"){ for(const x of d) wsd.tick[x.s]=WSD_T(x); wsd.tickT=now; }
  else if(st.startsWith("!markPrice@arr")){ for(const x of d) wsd.mark[x.s]=WSD_M(x); wsd.markT=now; }
  else if(st.endsWith("@kline_1m")&&d.k) wsdOnKline(d.s||d.k.s,d.k); }
function wsdOpen(conn){ if(typeof WebSocket==="undefined") return; const streams=[...conn.streams]; if(!streams.length) return;
  let ws; try{ ws=new WebSocket(WSD_URL+streams.join("/")); }catch(e){ return; } conn.ws=ws; conn.sent=new Set(streams);
  ws.onopen=()=>{ conn.tries=0; };
  ws.onmessage=ev=>wsdMsg(conn,ev);
  ws.onclose=()=>{ for(const s of conn.syms){ const x=wsd.k[s]; if(x){ x.wsSince=0; } } conn.ws=null; const wait=Math.min(60e3,5e3*Math.pow(2,conn.tries++||0)); setTimeout(()=>{ if(wsd.on&&!conn.ws) wsdOpen(conn); },wait); };
  ws.onerror=()=>{}; }
// sonradan eklenen akışlar açık bağlantıya SUBSCRIBE ile girer (kapalıysa açılışta URL'ye eklenir)
function wsdSub(conn,stream){ conn.streams.add(stream); if(conn.ws&&conn.ws.readyState===1){ if(!conn.sent.has(stream)){ try{ conn.ws.send(JSON.stringify({method:"SUBSCRIBE",params:[stream],id:Date.now()%1e9})); conn.sent.add(stream); }catch(e){} } } else if(!conn.ws) wsdOpen(conn); }
function wsdUnsub(conn,stream){ conn.streams.delete(stream); if(conn.ws&&conn.ws.readyState===1&&conn.sent.has(stream)){ try{ conn.ws.send(JSON.stringify({method:"UNSUBSCRIBE",params:[stream],id:Date.now()%1e9})); }catch(e){} conn.sent.delete(stream); } }
function wsdStart(){ if(!wsd.on||wsd.glob||typeof WebSocket==="undefined") return; wsd.glob={streams:new Set(["!ticker@arr","!markPrice@arr@1s"]),syms:new Set(),ws:null,tries:0,sent:new Set()}; wsdOpen(wsd.glob); }
function wsdWant(s){ if(!wsd.on||typeof WebSocket==="undefined") return; wsdStart(); const st=wsdStore(s); st.req=Date.now(); if(st.conn) return;
  const all=Object.keys(wsd.k).filter(x=>wsd.k[x].conn);
  if(all.length>=WSD_CFG.maxSyms){ const old=all.sort((a,b)=>wsd.k[a].req-wsd.k[b].req)[0]; const o=wsd.k[old]; wsdUnsub(o.conn,old.toLowerCase()+"@kline_1m"); o.conn.syms.delete(old); delete wsd.k[old]; }
  let conn=wsd.conns.find(c=>c.syms.size<WSD_CFG.perConn); if(!conn){ conn={streams:new Set(),syms:new Set(),ws:null,tries:0,sent:new Set()}; wsd.conns.push(conn); }
  conn.syms.add(s); st.conn=conn; st.wsSince=0; wsdSub(conn,s.toLowerCase()+"@kline_1m"); }
// j() içinden: mum isteği. undefined dönerse çağıran normal REST'e gider.
async function wsdKlines(path,raw){ const q=new URLSearchParams(path.split("?")[1]||""); const s=q.get("symbol"), iv=q.get("interval"), lim=Math.min(1500,+(q.get("limit")||500));
  if(!s||!WSD_IV[iv]||q.has("startTime")||q.has("endTime")) return undefined;
  const st=wsdStore(s); wsdWant(s); const ms=WSD_IV[iv]; let x=st.ivs[iv]; const now=Date.now();
  if(x&&x.rows.length>=lim&&wsdUsable(st,x)){ wsd.stat.hit++; return x.rows.slice(-lim); }
  const cooling=now<rest.cool;
  if(cooling&&x&&x.rows.length){ wsd.stat.stale++; return x.rows.slice(-lim); }
  try{ let rows;
    if(x&&x.rows.length>=lim&&!cooling){ const from=x.rows[Math.max(0,x.rows.length-2)][0]; const need=Math.ceil((now-from)/ms)+2;
      if(need<=99){ const d=(await raw(`/fapi/v1/klines?symbol=${s}&interval=${iv}&startTime=${from}&limit=${need}`)).map(wsdNum); rows=x.rows.filter(r=>r[0]<d[0][0]).concat(d); } }
    if(!rows){ const L=Math.min(1500,Math.max(lim,x?x.max:0)); rows=(await raw(`/fapi/v1/klines?symbol=${s}&interval=${iv}&limit=${L}`)).map(wsdNum); }
    wsd.stat.rest++;
    const max=Math.max(lim,x?x.max:0,rows.length); if(rows.length>max) rows=rows.slice(-max);
    x=st.ivs[iv]={rows,max,fetchT:Date.now(),m0:Math.floor(Date.now()/6e4)*6e4,base:null};
    return rows.slice(-lim); }
  catch(e){ if(x&&x.rows.length){ wsd.stat.stale++; return x.rows.slice(-lim); } throw e; } }
// j() içinden: 24 sa özeti / fiyat / mark akıştan
function wsdTicker(path){ if(!wsd.on) return undefined; const now=Date.now(); const q=new URLSearchParams(path.split("?")[1]||""); const s=q.get("symbol"); const p=path.split("?")[0];
  if(p==="/fapi/v1/ticker/24hr"||p==="/fapi/v1/ticker/price"){ wsdStart(); if(now-wsd.tickT>WSD_CFG.fresh||Object.keys(wsd.tick).length<50) return undefined;
    const sh=t=>p.endsWith("/price")?{symbol:t.symbol,price:t.lastPrice,time:now}:t;
    if(s) return wsd.tick[s]?sh(wsd.tick[s]):undefined; return Object.values(wsd.tick).map(sh); }
  if(p==="/fapi/v1/premiumIndex"){ wsdStart(); if(now-wsd.markT>WSD_CFG.fresh||Object.keys(wsd.mark).length<50) return undefined; if(s) return wsd.mark[s]; return Object.values(wsd.mark); }
  return undefined; }
// saklanan yanıtlar: hata/yasakta son hâl; /futures/data süresinin bir kısmı boyunca yeniden istenmez
const WSD_TTL={"5m":120e3,"15m":300e3,"30m":600e3,"1h":900e3,"2h":1800e3,"4h":3600e3,"1d":3*3600e3};
function wsdRespKey(path){ const p=path.split("?")[0]; if(p==="/fapi/v1/klines"||p==="/fapi/v1/depth"||p==="/fapi/v1/aggTrades"||p==="/fapi/v1/trades"||p.startsWith("/fapi/v1/ticker")||p==="/fapi/v1/premiumIndex") return null; return path; }
function wsdRespGet(path,anyAge){ const k=wsdRespKey(path); if(!k) return undefined; const r=wsd.resp.get(k); if(!r) return undefined; const age=Date.now()-r.t;
  if(anyAge) return age<WSD_CFG.staleMax?r.d:undefined;
  if(!wsd.on||!path.startsWith("/futures/data/")) return undefined; const per=new URLSearchParams(path.split("?")[1]||"").get("period"); const ttl=WSD_TTL[per]; return ttl&&age<ttl?r.d:undefined; }
function wsdRespPut(path,d){ const k=wsdRespKey(path); if(!k) return; wsd.resp.delete(k); wsd.resp.set(k,{t:Date.now(),d}); if(wsd.resp.size>WSD_CFG.respMax) wsd.resp.delete(wsd.resp.keys().next().value); }
function wsdSummary(){ const syms=Object.keys(wsd.k); return {on:wsd.on,glob:!!(wsd.glob&&wsd.glob.ws&&wsd.glob.ws.readyState===1),tickAgeS:wsd.tickT?Math.round((Date.now()-wsd.tickT)/1e3):null,markAgeS:wsd.markT?Math.round((Date.now()-wsd.markT)/1e3):null,syms:syms.length,live:syms.filter(s=>wsdLive(wsd.k[s])).length,conns:wsd.conns.length,...wsd.stat,resp:wsd.resp.size}; }
