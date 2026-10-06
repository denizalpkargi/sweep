// WebSocket veri katmanı (src/wsdata.js): REST dolumu + 1 dk akışla güncellenen mumlar, akıştan 24 sa/mark, yasakta saklanan yanıt.
// Sahte saat, sahte fetch ve sahte WebSocket; gerçek ağ yok.
let NOW=Date.UTC(2026,9,6,20,7,0); const realNow=Date.now; Date.now=()=>NOW;
const sockets=[];
class FakeWS{ constructor(url){ this.url=url; this.readyState=0; this.sent=[]; sockets.push(this); setTimeout(()=>{ this.readyState=1; this.onopen&&this.onopen(); },0); } send(m){ this.sent.push(m); } close(){ this.readyState=3; this.onclose&&this.onclose(); } emit(o){ this.onmessage&&this.onmessage({data:JSON.stringify(o)}); } }
globalThis.WebSocket=FakeWS;
const {loadEngine}=require('./engine-node.js');
const errors=[]; const ok=(c,m)=>{ console.log((c?'✓ ':'✗ ')+m); if(!c) errors.push(m); };
// yapay 1 dk mumlar
const M=6e4, T0=Date.UTC(2026,9,6,16,0,0); const ones=[]; let px=100;
for(let t=T0;t<Date.UTC(2026,9,6,23,0,0);t+=M){ const o=px; px*=1+Math.sin(t/7e6)*0.002+(((t/M)*7919)%13-6)/4000; const h=Math.max(o,px)*1.001, l=Math.min(o,px)*0.999; const v=1+((t/M)%17), q=v*px, n=10+((t/M)%5); ones.push({t,o,h,l,c:px,v,q,n,V:v*0.5,Q:q*0.5}); }
const agg=(ms,upTo)=>{ const out=[]; for(const m of ones){ if(m.t>upTo) break; const b=Math.floor(m.t/ms)*ms; let c=out[out.length-1]; if(!c||c[0]!==b){ c=[b,m.o,m.h,m.l,m.c,0,b+ms-1,0,0,0,0,0]; out.push(c); } c[2]=Math.max(c[2],m.h); c[3]=Math.min(c[3],m.l); c[4]=m.c; c[5]+=m.v; c[7]+=m.q; c[8]+=m.n; c[9]+=m.V; c[10]+=m.Q; } return out; };
const IV={"15m":9e5,"1h":36e5,"5m":3e5};
let calls=[]; let fail=false;
const fetch=async(url)=>{ const u=new URL(url); calls.push(u.pathname+u.search); const res=(d,st=200)=>({ok:st===200,status:st,headers:{get:()=>null},json:async()=>d,text:async()=>JSON.stringify(d)});
  if(fail) return res({msg:'banned'},418);
  if(u.pathname==='/fapi/v1/klines'){ const ms=IV[u.searchParams.get('interval')]; const lim=+u.searchParams.get('limit'); const st=+u.searchParams.get('startTime')||0; let a=agg(ms,NOW); if(st) a=a.filter(r=>r[0]>=st); return res(a.slice(-lim).map(r=>r.map(String))); }
  if(u.pathname.startsWith('/futures/data/')) return res([{sumOpenInterestValue:'123',t:NOW}]);
  return res({},404); };
const E=loadEngine({fetch});
(async()=>{
  E.wsd.on=true;
  const P15='/fapi/v1/klines?symbol=XUSDT&interval=15m&limit=8', P1h='/fapi/v1/klines?symbol=XUSDT&interval=1h&limit=4';
  const a1=await E.j(P15); await E.j(P1h); ok(calls.length===2,'ilk istekler REST\'ten ('+calls.length+')');
  ok(JSON.stringify(a1.map(r=>r[0]))===JSON.stringify(agg(9e5,NOW).slice(-8).map(r=>r[0])),'ilk dolum doğru');
  await new Promise(r=>setTimeout(r,5)); const ws=sockets.find(s=>s.url.includes('xusdt@kline_1m')); ok(!!ws&&ws.url.includes('/market/stream'),'1 dk akışına /market yolundan abone olundu');
  // fetch anındaki dakika (m0) REST'te tam; akış m0'dan itibaren
  const m0=Math.floor(NOW/M)*M; const send=(m,x)=>ws.emit({stream:'xusdt@kline_1m',data:{e:'kline',s:'XUSDT',k:{t:m.t,T:m.t+M-1,s:'XUSDT',i:'1m',o:String(m.o),c:String(m.c),h:String(m.h),l:String(m.l),v:String(m.v),n:m.n,x,q:String(m.q),V:String(m.V),Q:String(m.Q)}}});
  const upto=Date.UTC(2026,9,6,22,41,30);
  for(const m of ones){ if(m.t<m0||m.t>upto) continue; NOW=m.t+30e3; send({...m,c:m.o,h:m.o,l:m.o,v:0,q:0,n:0,V:0,Q:0},false); send(m,false); if(m.t+M<=upto){ NOW=m.t+M; send(m,true); } }
  NOW=upto; const before=calls.length;
  const b15=await E.j(P15), b1h=await E.j(P1h);
  ok(calls.length===before,'akış kesintisizken mum isteği REST\'e gitmedi');
  const close=(a,b)=>a.length===b.length&&a.every((r,i)=>r.slice(0,11).every((v,k)=>Math.abs(v-b[i][k])<=1e-6*Math.max(1,Math.abs(b[i][k]))));
  ok(close(b15,agg(9e5,upto).slice(-8)),'15 dk mumlar 1 dk akıştan doğru kuruldu (açık mum dahil)');
  ok(close(b1h,agg(36e5,upto).slice(-4)),'1 sa mumlar 1 dk akıştan doğru kuruldu');
  // daha uzun istek → REST (yalnız bir kez)
  await E.j('/fapi/v1/klines?symbol=XUSDT&interval=15m&limit=20'); ok(calls.length===before+1,'daha uzun geçmiş için bir kez REST');
  // akış koparsa: yasak sırasında son hâl, yasak yoksa REST
  ws.close(); E.rest.cool=NOW+3600e3; fail=true; const c0=calls.length;
  const s15=await E.j(P15); ok(calls.length===c0&&s15.length===8,'yasakta akış kopuk olsa da saklanan mum döndü, REST denenmedi');
  let threw=''; try{ await E.j('/fapi/v1/klines?symbol=YUSDT&interval=15m&limit=8'); }catch(e){ threw=e.message; } ok(/yasağı/.test(threw)&&calls.length===c0,'saklanmamış coinde hemen hata (bekleme yok): '+threw.slice(0,60));
  // saklanan /futures/data yanıtı
  E.rest.cool=0; fail=false; const FP='/futures/data/openInterestHist?symbol=XUSDT&period=5m&limit=24'; await E.j(FP); const c1=calls.length;
  await E.j(FP); ok(calls.length===c1,'5 dk /futures/data yanıtı 2 dk içinde yeniden istenmedi');
  NOW+=10*60e3; E.rest.cool=NOW+3600e3; const st=await E.j(FP); ok(st&&st[0].sumOpenInterestValue==='123'&&calls.length===c1,'yasakta /futures/data son hâli döndü');
  // akıştan 24 sa özeti ve mark
  const g=sockets.find(s=>s.url.includes('!ticker@arr')); ok(!!g,'tüm coin akışı açık');
  const syms=Array.from({length:60},(_,i)=>'C'+i+'USDT');
  g.emit({stream:'!ticker@arr',data:syms.map(s=>({e:'24hrTicker',s,p:'1',P:'2.5',w:'10',c:'10.5',Q:'1',o:'10',h:'11',l:'9',v:'100',q:'1000',O:1,C:2,F:1,L:2,n:5}))});
  g.emit({stream:'!markPrice@arr@1s',data:syms.map(s=>({e:'markPriceUpdate',E:NOW,s,p:'10.4',i:'10.3',P:'10.3',r:'0.0001',T:NOW+3600e3}))});
  const c2=calls.length; const t=await E.j('/fapi/v1/ticker/24hr'), pm=await E.j('/fapi/v1/premiumIndex?symbol=C3USDT'), tp=await E.j('/fapi/v1/ticker/price');
  ok(calls.length===c2&&t.length===60&&t[0].quoteVolume==='1000'&&t[0].priceChangePercent==='2.5','24 sa özeti akıştan, REST\'siz');
  ok(pm&&pm.markPrice==='10.4'&&pm.lastFundingRate==='0.0001','mark/fonlama akıştan'); ok(tp.length===60&&tp[0].price==='10.5','son fiyat akıştan');
  console.log('özet',JSON.stringify(E.wsdSummary()));
  Date.now=realNow; console.log('wsdata-test errors',JSON.stringify(errors)); process.exit(errors.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
