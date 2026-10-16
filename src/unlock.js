/* ---------- Açılım short sepeti (15 Ekim 2026) ----------
   Kanıt (tests/unlock-etkisi.py, tests/unlock-saglamlik.py; DefiLlama ücretsiz veri dosyaları + Binance 1g arşivi, fonlama ve taker dahil):
   insider / özel satış payının tek günde serbest kalması, büyüklük serbest arzın ≥ %2,5'i. Açılımdan 7 gün önce kapanışta short, açılım günü
   kapanışında kapat: 2022'den 360 olay, 64 coin, +3,16 % / işlem (medyan +4,92 %, t 3,4, kazanma %67), yarılar +1,32 (t 0,7) / +3,59 %,
   son 12 ay +5,55 %; yıllar 2022 +5,3 · 2023 −0,0 · 2024 +0,4 · 2025 +3,6 · 2026 +4,7 %. Etki son haftaya özgü (−14 → −7 ≈ 0, 0 → +7 ≈ 0),
   ilk 3 coin hariç +2,33 %, %20 stopla +2,27 %. Ama aynı coinler açılımdan uzak rastgele haftada da +1,25 % (plasebo): açılıma özgü kısım
   ≈ +1,9 %. Portföy %1 risk, %15 stop, en çok 5 short: yıllık +7,5 %, en büyük düşüş −9,8 %. Kanıt değil, kâğıtta aday. Kullanıcı yalnız sepeti
   istedi (%0,5 risk, %20 stop, en çok 5 short); masaya ve diğer sepetlere long yasağı eklenmedi.
   Sınırlar: DefiLlama listesi bugünkü protokoller; takvim önceden bilinir varsayıldı (vesting sözleşmeleri). Canlıda büyüklük = açılan pay ÷
   bugünkü serbest arz (circSupply; belgelenmiş eğriyle oranı medyan 1,000). Ayrı sanal bakiye, gerçek emir yok. */
const UL_DEF={on:true,bal0:100,risk:0.005,maxPos:5,stop:0.20,minSize:0.025,maxSize:1,preDays:7,lev:3,exLev:20,taker:0.0005,slip:0.0003,fundDef:0.0001,late:DAY_MS};
const UL_KEY="st-ul", UL_URL="https://defillama-datasets.llama.fi/emissionsIndex", UL_CATS=new Set(["insiders","privateSale"]);
const ulCache={ev:[],at:0,day:null,err:null,n:0,mapped:0};   // açılım takvimi
function ulNew(cfg){ cfg=Object.assign({},UL_DEF,cfg||{}); return {cfg,bal:cfg.bal0,start:cfg.bal0,peak:cfg.bal0,pos:{},done:{},trades:[],log:[],fundT:0,fees:0,funding:0}; }
function ulLoad(){ let s=null; try{ s=JSON.parse(localStorage.getItem(UL_KEY)||"null"); }catch(e){} if(!s) s=ulNew(); s.cfg=Object.assign({},UL_DEF,s.cfg||{}); s.done=s.done||{}; return s; }
function ulSave(s){ try{ localStorage.setItem(UL_KEY,JSON.stringify(s)); }catch(e){} }
function ulLog(s,ev){ s.log.push(ev); if(s.log.length>300) s.log.splice(0,s.log.length-300); return ev; }
function ulEq(s,px){ let u=0; for(const k in s.pos){ const p=s.pos[k]; const x=px&&px[k]||p.px; if(x>0) u+=p.qty*(p.e-x); } return s.bal+u; }
// DefiLlama emissionsIndex → [{sym, day (UTC gün başı, ms), size, name}]; syms: Binance USDT vadeli sembolleri (Set). Yalnız [now − 2 gün, now + 60 gün].
function ulParse(idx,syms,now){
  const out={}; const rows=(idx&&idx.data)||idx||[];
  for(const e of rows){ const tp=(e.tokenPrice||[])[0]; const base=tp&&tp.symbol?String(tp.symbol).toUpperCase():null; const cs=+e.circSupply; if(!base||!(cs>0)||!e.unlockEvents) continue;
    const sym=[base+"USDT","1000"+base+"USDT","1000000"+base+"USDT"].find(x=>syms.has(x)); if(!sym) continue;
    for(const u of e.unlockEvents){ const t=u.timestamp*1000; if(!(t>=now-2*DAY_MS&&t<=now+60*DAY_MS)) continue;
      let amt=0; for(const c of u.cliffAllocations||[]) if((+c.amount||0)>0&&UL_CATS.has(c.category)) amt+=+c.amount; if(!(amt>0)) continue;
      const day=Math.floor(t/DAY_MS)*DAY_MS, key=sym+"|"+day; if(!out[key]) out[key]={sym,day,size:0,name:e.name||base}; out[key].size+=amt/cs; } }
  return Object.values(out).sort((a,b)=>a.day-b.day||b.size-a.size); }
// takvim günde bir (UTC); sembol listesi Binance premiumIndex'ten
async function ulRefresh(now,force){ now=now||Date.now(); const day=Math.floor(now/DAY_MS);
  if(!force&&ulCache.day===day&&ulCache.ev.length) return ulCache;
  if(!force&&ulCache.err&&now-ulCache.at<3*3600e3) return ulCache;
  try{ const pi=await opt("/fapi/v1/premiumIndex",null); const syms=new Set((pi||[]).map(z=>z.symbol).filter(x=>/USDT$/.test(x)));
    if(!syms.size) throw new Error("Binance sembol listesi yok");
    const r=await fetch(UL_URL); if(!r.ok) throw new Error("DefiLlama HTTP "+r.status); const idx=await r.json();
    const ev=ulParse(idx,syms,now); Object.assign(ulCache,{ev,at:now,day,err:null,n:((idx&&idx.data)||[]).length,mapped:new Set(ev.map(x=>x.sym)).size}); }
  catch(e){ Object.assign(ulCache,{at:now,err:String(e.message||e)}); }
  return ulCache; }
// pencere: açılım gününden preDays − 1 gün önceki gün başı (= gün −preDays kapanışı) → açılım günü kapanışı
const ulWin=(e,pre)=>[e.day-(pre-1)*DAY_MS,e.day+DAY_MS];
function ulExit(s,sym,px,why,now){ const p=s.pos[sym], c=s.cfg; const fill=px*(1+c.slip); const fee=p.qty*fill*c.taker; const pnl=p.qty*(p.e-fill);
  s.bal+=pnl-fee; s.fees+=fee; delete s.pos[sym]; const net=pnl-fee-p.fee-p.fund; const R=net/(p.qty*p.e*c.stop);
  s.trades.push({sym,t:p.t,closeT:now,e:p.e,x:fill,why,R,r:net/(p.qty*p.e),pnl:net,size:p.size,day:p.day}); if(s.trades.length>1000) s.trades.shift();
  return ulLog(s,{t:now,type:"exit",sym,why,px:fill,pnl:net,R}); }
// fiyat adımı: fonlama (short alır), stop, açılım günü kapanışında çıkış, pencere açılınca giriş. ev: takvim, px/fr: {sym: değer}
function ulStep(s,ev,px,fr,now){ const c=s.cfg, evs=[]; const F=8*3600e3; const slot=Math.floor(now/F)*F; if(!s.fundT) s.fundT=slot;
  while(s.fundT<slot){ s.fundT+=F; for(const k in s.pos){ const p=s.pos[k]; if(p.t>s.fundT) continue; const r=fr&&Number.isFinite(fr[k])?fr[k]:c.fundDef; const cst=-p.qty*(px&&px[k]||p.px)*r; s.bal-=cst; s.funding+=cst; p.fund+=cst; } }
  for(const k of Object.keys(s.pos)){ const p=s.pos[k]; const x=px&&px[k]; if(x>0) p.px=x; else continue;
    if(x>=p.stop) evs.push(ulExit(s,k,x,"stop",now)); else if(now>=p.until) evs.push(ulExit(s,k,x,"açılım günü kapanışı",now)); }
  for(const e of ev||[]){ if(e.size<c.minSize||e.size>c.maxSize) continue; const [a,b]=ulWin(e,c.preDays), key=e.sym+"|"+e.day;
    if(now<a||s.done[key]) continue;
    if(now>=Math.min(b,a+c.late)){ s.done[key]="geç"; evs.push(ulLog(s,{t:now,type:"skip",sym:e.sym,why:"giriş zamanı kaçtı (uygulama kapalıydı)",size:e.size,day:e.day})); continue; }
    if(!c.on) continue;
    const x=px&&px[e.sym]; if(!(x>0)) continue;
    if(s.pos[e.sym]){ s.done[key]="açık"; continue; }
    if(Object.keys(s.pos).length>=c.maxPos){ s.done[key]="dolu"; evs.push(ulLog(s,{t:now,type:"skip",sym:e.sym,why:`en çok ${c.maxPos} short`,size:e.size,day:e.day})); continue; }
    const eq=ulEq(s,px), en=x*(1-c.slip), qty=c.risk*eq/(en*c.stop);
    const gross=Object.entries(s.pos).reduce((m,[k,p])=>m+p.qty*(px[k]||p.px),0);
    if(gross+qty*en>c.lev*eq){ s.done[key]="nominal"; evs.push(ulLog(s,{t:now,type:"skip",sym:e.sym,why:`nominal ${c.lev}× sınırı`,size:e.size,day:e.day})); continue; }
    const fee=qty*en*c.taker; s.bal-=fee; s.fees+=fee; s.done[key]="girdi";
    s.pos[e.sym]={e:en,qty,t:now,day:e.day,until:b,size:e.size,name:e.name,stop:en*(1+c.stop),fee,fund:0,px:x};
    evs.push(ulLog(s,{t:now,type:"fill",sym:e.sym,px:en,usd:qty*en,fee,stop:en*(1+c.stop),size:e.size,day:e.day})); }
  for(const k in s.done){ const d=+k.split("|")[1]; if(d<now-30*DAY_MS) delete s.done[k]; }
  s.peak=Math.max(s.peak||s.start,ulEq(s,px)); return evs; }
// canlı tur: takvim (günde bir) + mark fiyat ve fonlama (premiumIndex)
async function ulTick(s,now){ now=now||Date.now(); await ulRefresh(now); const px={}, fr={};
  const need=new Set([...Object.keys(s.pos),...ulCache.ev.map(e=>e.sym)]);
  if(need.size){ const a=await opt("/fapi/v1/premiumIndex",null); if(Array.isArray(a)) for(const z of a) if(need.has(z.symbol)){ px[z.symbol]=+z.markPrice; fr[z.symbol]=+z.lastFundingRate; } }
  const evs=ulStep(s,ulCache.ev,px,fr,now); return {evs,px,eq:ulEq(s,px)}; }
function ulSummary(s,px){ const eq=ulEq(s,px), tr=s.trades, w=tr.filter(t=>t.R>0).length; const gross=Object.entries(s.pos).reduce((a,[k,p])=>a+p.qty*((px&&px[k])||p.px),0); const now=Date.now();
  const next=ulCache.ev.filter(e=>e.size>=s.cfg.minSize&&e.size<=s.cfg.maxSize&&e.day+DAY_MS>now).slice(0,12);
  return {eq,roi:(eq/s.start-1)*100,dd:s.peak>0?Math.max(0,1-eq/s.peak):0,n:tr.length,wr:tr.length?w/tr.length:null,avgR:tr.length?tr.reduce((a,t)=>a+t.R,0)/tr.length:null,
    avgPct:tr.length?tr.reduce((a,t)=>a+t.r,0)/tr.length*100:null,open:Object.keys(s.pos).length,gross,fees:s.fees,funding:s.funding,
    cal:{at:ulCache.at,err:ulCache.err,n:ulCache.n,mapped:ulCache.mapped,ev:ulCache.ev.length},next}; }
