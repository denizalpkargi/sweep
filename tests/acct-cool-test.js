// Hesap istekleri (account.js) motorun yasak bekletmesine (rest.cool) uymalı: 418 sürerken Binance'e istek gitmemeli (16 Ekim 2026).
const {loadEngine}=require('./engine-node.js');
const assert=require('assert');
let calls=[], mode="418";
const hdr=h=>({get:k=>h[k.toLowerCase()]??null});
const fetch=async url=>{ calls.push(String(url)); const ban=mode==="418";
  return {ok:!ban,status:ban?418:200,headers:hdr(ban?{"retry-after":"600"}:{"x-mbx-used-weight-1m":"12"}),json:async()=>(url.includes("/time")?{serverTime:Date.now()}:url.includes("listenKey")?{listenKey:"x"}:[]),text:async()=>""}; };
const mem={}; const ls={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{ mem[k]=String(v); },removeItem:k=>{ delete mem[k]; }};
const E=loadEngine({fetch,localStorage:ls,patch:s=>s.replace("return {ksNew,","return {acct,acctSync,acctStart,acctStop,ksNew,")});
(async()=>{
  globalThis.WebSocket=function(){ this.close=()=>{}; };
  // 1) yasak yokken bağlan: ilk istek 418 alır → motorun bekleme süresi kurulur, bağlantı açık kalır
  await E.acctStart("k","s",false);
  assert.ok(E.rest.cool>Date.now()+590e3, "418 rest.cool'u kurmalı");
  assert.ok(+mem["st-rest-cool"]===E.rest.cool, "bekleme kalıcı yazılmalı");
  assert.ok(E.acct.on, "yasakta hesap bağlantısı kapanmamalı");
  const n=calls.length;
  // 2) yasak sürerken eşitleme Binance'e istek atmamalı
  for(let i=0;i<5;i++) await E.acctSync();
  assert.strictEqual(calls.length,n,"yasakta istek gitti: "+calls.slice(n).join(", "));
  assert.ok(/yasağı/.test(E.acct.err));
  // 3) yasak bitince eşitlenir; açık emirler (ağırlık 40) 30 sn'den sık istenmez
  mode="ok"; E.rest.cool=0; calls=[];
  await E.acctSync(); assert.ok(E.acct.lastAt>0 && !E.acct.err, "yasak bitince eşitlenmeli");
  assert.ok(calls.some(u=>u.includes("openOrders")));
  calls=[]; await E.acctSync(); assert.ok(!calls.some(u=>u.includes("openOrders")), "açık emirler 5 sn'de bir istenmemeli");
  calls=[]; await E.acctSync(true); assert.ok(calls.some(u=>u.includes("openOrders")), "akış olayında açık emirler istenmeli");
  E.acctStop(false);
  console.log("acct-cool-test ok · errors []");
  process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
