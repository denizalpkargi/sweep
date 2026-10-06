// Trend sepeti birim testleri (src/trend.js): sinyal, BTC rejimi, oynaklığa göre boy, bant, işlem muhasebesi, fonlama, canlı tur (sahte fetch).
// Çalıştırma: node tests/trend-test.js  (çıktıda "errors []" beklenir)
const {loadEngine}=require('./engine-node.js');
const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); }; const near=(a,b,e)=>Math.abs(a-b)<=(e||1e-9);
const DAY=864e5, T0=Date.UTC(2026,0,1);
// yapay günlük seri: eğim (günlük getiri) + sabit dalga (oynaklık)
const series=(n,drift,amp,p0)=>Array.from({length:n},(_,i)=>{ const c=p0*Math.exp(drift*i+amp*Math.sin(i*1.7)); return {t:T0+i*DAY,o:c,h:c*1.01,l:c*0.99,c}; });
const raw=a=>a.map(b=>[b.t,String(b.o),String(b.h),String(b.l),String(b.c),"1",b.t+DAY-1,"1","1","1","1","0"]);
let feed={};
const fetch=async url=>{ const u=String(url); const m=u.match(/symbol=(\w+)&interval=1d/);
  const body=m? raw(feed[m[1]]||[]) : u.includes('premiumIndex')? Object.entries(feed).map(([s,a])=>({symbol:s,markPrice:String(a[a.length-1].c*1.001),lastFundingRate:"0.0001"})) : {};
  return {ok:true,status:200,headers:{get:()=>null},json:async()=>body,text:async()=>JSON.stringify(body)}; };
const mem={}; const localStorage={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}};
const E=loadEngine({fetch,localStorage});

(async()=>{
  const C=Object.assign({},E.TREND_DEF);
  // 1. hepsi yukarı, BTC yukarı → dört coinde long, oynak coin daha küçük ağırlık
  const up={BTCUSDT:series(140,0.004,0.01,60000),ETHUSDT:series(140,0.004,0.01,3000),SOLUSDT:series(140,0.004,0.04,150),BNBUSDT:series(140,0.004,0.01,600)};
  let tg=E.trendTargets(up,C);
  ok(tg.btcOk,'BTC yukarıda rejim kapalı');
  ok(C.syms.every(s=>tg.w[s].score>=0.75&&tg.w[s].w>0),'yukarı trendde puan/ağırlık yok: '+JSON.stringify(tg.w));
  ok(tg.w.SOLUSDT.w<tg.w.ETHUSDT.w,'oynak coin daha küçük olmalı');
  ok(C.syms.every(s=>tg.w[s].w<=C.cap/C.syms.length+1e-12),'üst sınır aşıldı');
  // 2. BTC aşağı → hepsi nakit
  const btcDn=Object.assign({},up,{BTCUSDT:series(140,-0.004,0.01,60000)}); tg=E.trendTargets(btcDn,C);
  ok(!tg.btcOk&&C.syms.every(s=>tg.w[s].w===0),'BTC aşağıyken pozisyon');
  // 3. tek coin aşağı → o coin 0
  const solDn=Object.assign({},up,{SOLUSDT:series(140,-0.004,0.01,150)}); tg=E.trendTargets(solDn,C);
  ok(tg.w.SOLUSDT.w===0&&tg.w.ETHUSDT.w>0,'aşağı trenddeki coin nakit değil');
  // 4. dengeleme, bant, muhasebe
  const s=E.trendNew({}); const px={BTCUSDT:60000,ETHUSDT:3000,SOLUSDT:150,BNBUSDT:600};
  tg=E.trendTargets(up,C); let ev=E.trendRebalance(s,tg,px,T0);
  ok(ev.length===4&&ev.every(e=>e.side==='AL'),'ilk dengelemede 4 alım yok');
  const fees1=s.fees; ok(near(s.bal,100-fees1),'komisyon bakiyeden düşmedi');
  ok(near(E.trendEq(s,px),100-fees1-ev.reduce((a,e)=>a+e.qty*(e.px-px[e.sym]),0),1e-9),'özkaynak hesabı (kayma dahil) tutmadı');
  ev=E.trendRebalance(s,tg,px,T0+DAY); ok(ev.length===0,'bant içinde gereksiz işlem: '+ev.length);
  // fiyat %10 yükselince ETH'yi kapat: gerçekleşen kâr ≈ qty × fark
  const q=s.pos.ETHUSDT.qty, avg=s.pos.ETHUSDT.avg; const tg0={w:Object.assign({},tg.w,{ETHUSDT:{w:0,why:"test"}}),btcOk:true};
  const px2=Object.assign({},px,{ETHUSDT:3300}); ev=E.trendRebalance(s,tg0,px2,T0+2*DAY);
  const e=ev.find(x=>x.sym==='ETHUSDT'); ok(e&&e.side==='SAT'&&!s.pos.ETHUSDT,'ETH kapanmadı');
  ok(e&&near(e.pnl,q*(3300*(1-C.slip)-avg),1e-9),'gerçekleşen PnL yanlış');
  // 5. fonlama: 8 saatlik sınır başına long öder
  const s2=E.trendNew({}); E.trendRebalance(s2,E.trendTargets(up,C),px,T0); E.trendMark(s2,px,T0,null); const b0=s2.bal;
  E.trendMark(s2,px,T0+24*3600e3+1,null); const gross=Object.entries(s2.pos).reduce((a,[k,p])=>a+p.qty*p.px,0);
  ok(near(b0-s2.bal,gross*C.fundDef*3,1e-9),'fonlama 3 kez uygulanmadı: '+(b0-s2.bal)+' vs '+gross*C.fundDef*3);
  // 6. canlı tur: kapanmamış bugünkü mum sinyale girmez, gün başına bir dengeleme
  feed=up; E.trendCache.data=null; const now=up.BTCUSDT[139].t+3600e3; // son mum bugünün mumu (kapanmadı)
  const s3=E.trendNew({}); const r=await E.trendTick(s3,now); ok(r.evs.length===4&&s3.day,'canlı turda dengeleme yok');
  ok(E.trendCache.data.BTCUSDT.length===139,'kapanmamış mum çıkarılmadı');
  const r2=await E.trendTick(s3,now+600e3); ok(r2.evs.length===0,'aynı gün ikinci dengeleme');
  const sm=E.trendSummary(s3,r2.px); ok(sm.lev>0&&sm.lev<=C.cap+1e-9&&isFinite(sm.eq),'özet hatalı');
  // 7. hedef modu: bakiye 200 $'a varınca korumacı ayara (tvGoal) iner; eski kayıt yeni varsayılana taşınır
  const s4=E.trendNew({}); s4.bal=205; const r4=await E.trendTick(s4,now,{force:true}); const sm4=E.trendSummary(s4,r4.px);
  ok(s4.goalHit&&sm4.tvNow===C.tvGoal,'hedefte ayar inmedi');
  const s5=E.trendNew({}); await E.trendTick(s5,now,{force:true}); const g5=Object.values(s5.pos).reduce((a,p)=>a+p.qty*p.px,0);
  const s6=E.trendNew({}); s6.goalHit=1; await E.trendTick(s6,now,{force:true}); const g6=Object.values(s6.pos).reduce((a,p)=>a+p.qty*p.px,0);
  ok(g6<g5,'korumacı ayar boyu küçültmedi: '+g6+' vs '+g5);
  localStorage.setItem('st-trend',JSON.stringify({cfg:{tv:1.2,cap:6},bal:100,start:100,peak:100,pos:{},log:[],eqHist:[]})); const L=E.trendLoad(); ok(L.cfg.tv===C.tv&&L.cfg.goal===200,'eski kayıt taşınmadı');
  console.log('errors',JSON.stringify(errors)); process.exit(errors.length?1:0);
})().catch(e=>{ console.error(e); console.log('errors',JSON.stringify([String(e)])); process.exit(1); });
