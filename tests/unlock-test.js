// Açılım short sepeti (src/unlock.js) testi: DefiLlama takviminin ayrıştırılması, giriş / stop / açılım günü çıkışı, geç kalma,
// en çok N, fonlama, ulRefresh (sahte fetch).
const {loadEngine}=require('./engine-node.js');
const mem={}; const LS={getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}};
const errors=[]; const ok=(c,m)=>{ if(!c){ errors.push(m); console.log('HATA',m); } };
const D=864e5, H=36e5; const day0=Date.UTC(2026,10,20); // açılım günü (UTC gün başı)
const idx={data:[
  {name:'Foo',tokenPrice:[{symbol:'FOO'}],circSupply:1000,unlockEvents:[{timestamp:(day0+12*H)/1000,cliffAllocations:[{category:'insiders',amount:20},{category:'privateSale',amount:15},{category:'publicSale',amount:500},{category:'insiders',amount:-5}]}]},
  {name:'Pepe',tokenPrice:[{symbol:'PEPE'}],circSupply:1e6,unlockEvents:[{timestamp:day0/1000,cliffAllocations:[{category:'insiders',amount:30000}]}]},
  {name:'Küçük',tokenPrice:[{symbol:'TINY'}],circSupply:1000,unlockEvents:[{timestamp:day0/1000,cliffAllocations:[{category:'insiders',amount:5}]}]},
  {name:'Uzak',tokenPrice:[{symbol:'FAR'}],circSupply:1000,unlockEvents:[{timestamp:(day0+90*D)/1000,cliffAllocations:[{category:'insiders',amount:500}]}]},
  {name:'Binance yok',tokenPrice:[{symbol:'NOPE'}],circSupply:1000,unlockEvents:[{timestamp:day0/1000,cliffAllocations:[{category:'insiders',amount:500}]}]}]};
const syms=new Set(['FOOUSDT','1000PEPEUSDT','TINYUSDT','FARUSDT','BTCUSDT']);
const E=loadEngine({localStorage:LS});
// 1) ayrıştırma
const now0=day0-20*D; const ev=E.ulParse(idx,syms,now0);
const foo=ev.find(e=>e.sym==='FOOUSDT'), pepe=ev.find(e=>e.sym==='1000PEPEUSDT');
ok(foo&&Math.abs(foo.size-0.035)<1e-12&&foo.day===day0,'FOO: insider + özel satış payı (halka arz ve eksi miktar hariç) ÷ serbest arz, gün başına yuvarlı');
ok(pepe&&Math.abs(pepe.size-0.03)<1e-12,'PEPE → 1000PEPEUSDT eşleşmesi');
ok(!ev.find(e=>e.sym==='FARUSDT'),'60 günden uzak açılım alınmaz'); ok(!ev.some(e=>/NOPE/.test(e.sym)),'Binance\'te olmayan coin alınmaz');
ok(ev.find(e=>e.sym==='TINYUSDT').size<0.025,'küçük açılım takvimde var ama eşiğin altında');
// 3) sepet: giriş, stop, açılım günü çıkışı, geç kalma
let s=E.ulNew({maxPos:1}); const px={FOOUSDT:10,'1000PEPEUSDT':1};
let r=E.ulStep(s,ev,px,{},day0-7*D); ok(!r.length&&!Object.keys(s.pos).length,'pencere açılmadan giriş yok');
r=E.ulStep(s,ev,px,{},day0-6*D+60e3);
ok(s.pos.FOOUSDT&&Math.abs(s.pos.FOOUSDT.e-10*(1-s.cfg.slip))<1e-9,'gün −6 başında FOO short (kayma dahil)');
const p=s.pos.FOOUSDT; ok(p&&Math.abs(p.qty*p.e*s.cfg.stop-0.005*100)<0.01,'boy: bakiyenin %0,5\'i ÷ %20 stop'); ok(p&&Math.abs(p.stop-p.e*1.2)<1e-9,'stop girişin %20 üstü');
ok(!s.pos['1000PEPEUSDT']&&r.some(e=>e.type==='skip'&&/en çok 1/.test(e.why)),'en çok N short');
const b0=s.bal; E.ulStep(s,ev,{FOOUSDT:9.5},{FOOUSDT:0.001},day0-5*D); ok(s.funding<0&&s.bal>b0,'short pozitif fonlamayı alır');
E.ulStep(s,ev,{FOOUSDT:9},{},day0+D-1); ok(s.pos.FOOUSDT,'açılım günü bitmeden çıkış yok');
E.ulStep(s,ev,{FOOUSDT:9},{},day0+D); ok(!s.pos.FOOUSDT&&s.trades.length===1&&s.trades[0].why==='açılım günü kapanışı'&&s.trades[0].pnl>0,'açılım günü kapanışında kârla çıkış');
s=E.ulNew(); E.ulStep(s,ev,px,{},day0-6*D+H); E.ulStep(s,ev,{FOOUSDT:12.1,'1000PEPEUSDT':1},{},day0-3*D);
ok(!s.pos.FOOUSDT&&s.trades[0]&&s.trades[0].why==='stop'&&s.trades[0].R<-0.9&&s.trades[0].R>-1.2,'stop: yaklaşık −1R');
s=E.ulNew(); r=E.ulStep(s,ev,px,{},day0-4*D); ok(!Object.keys(s.pos).length&&r.some(e=>/kaçtı/.test(e.why)),'giriş zamanından 1 gün sonra girilmez');
r=E.ulStep(s,ev,px,{},day0-4*D+H); ok(!r.length,'kaçan giriş bir kez yazılır');
s=E.ulNew({on:false}); E.ulStep(s,ev,px,{},day0-6*D+H); ok(!Object.keys(s.pos).length,'kapalı sepet girmez');
// 5) ulRefresh: sahte fetch (Binance premiumIndex + DefiLlama)
(async()=>{
  const E3=loadEngine({localStorage:LS,fetch:async(u)=>{ const body=u.includes('defillama')?idx:u.includes('premiumIndex')?[...syms].map(x=>({symbol:x,markPrice:'1',lastFundingRate:'0'})):{};
    return {ok:true,status:200,headers:{get:()=>null},json:async()=>body,text:async()=>JSON.stringify(body)}; }});
  const c=await E3.ulRefresh(now0,true); ok(!c.err&&c.ev.length===3&&c.mapped===3,'ulRefresh takvimi yükler ('+(c.err||c.ev.length)+')');
  const E4=loadEngine({localStorage:LS,fetch:async()=>{ throw new Error('ağ yok'); }}); const c4=await E4.ulRefresh(now0,true); ok(c4.err&&!c4.ev.length,'ağ yoksa hata yazılır, takvim boş kalır');
  console.log('unlock-test',errors.length?'HATA':'tamam'); console.log('errors',JSON.stringify(errors)); if(errors.length) process.exit(1);
})();
