/* ---------- Kalite short sepeti: masa short + Ozan işlem kalitesi süzgeci, 72 sa tutuş (11 Ekim 2026, test #52) ----------
   Arşiv (tests/test52-ozan-kalite-72sa.js, tests/test52-portfoy.js, tests/test52-birlesik.js; 2022-01 → 2026-10, örneklem dışı): masanın short
   kararlarından (veto yok, puan ≥ 0,35, evet ≥ 3) kalite modelinin en kötü %30'unu atıp 72 sa tutmak, stop 2 × sd: +0,064R (masa short +0,030R,
   rastgele short ≈ 0), yarılar +0,058 / +0,069, son 12 ay +0,081; yıllar 2022 +0,145 · 2023 −0,027 · 2024 +0,056 · 2025 +0,088 · 2026 +0,012;
   haftalık t 1,5 (kanıt değil). %0,5 risk, en çok 5 short: 100 → 196 $, yıllık +%15, düşüş −%25; Kaplumbağa ile korelasyon −0,4, ikisi tam
   bütçeyle yıllık +%25, düşüş −%24, her yıl artı. Model yalnız masa değişkenleriyle (B; tüm değişkenli sürümle aynı sonuç), src/kshort-data.js
   (tests/kalite-model.py). Arşivde masa açık pozisyon, fonlama, kalabalık, emir defteri ve işlem akışı olmadan oynatıldı; canlıda da model için
   masa bu alanlar nötrlenerek ayrıca toplanır (ksNeutral), botun masasına dokunulmaz. Değerlendirme coin başına 4 saatte bir (arşivle aynı sıklık).
   Kullanıcı "evet" dedi (sepet + modelin JS'e taşınması). Ayrı sanal bakiye, gerçek emir yok. */
const KS_DEF={on:true,bal0:100,risk:0.005,maxPos:5,lev:3,exLev:20,holdH:72,stopMult:2,keep:0.3,thrMinN:300,thrDays:90,slotH:4,minScore:0.35,minYes:3,
  taker:0.0005,slip:0.0003,fundDef:0.0001};
const KS_KEY="st-ks";
const KS_AG=["trend","liq","flow","macro","quant","mom","vol","check","fac","risk"];
const KS_SIGNED=["r1","r4","r24","r7d","r30d","s20","s50","s200","b4","b24","bs200","bs50","fr"]; // short için eksi (masa-archive.js ile aynı)
function ksNew(cfg){ cfg=Object.assign({},KS_DEF,cfg||{}); return {cfg,bal:cfg.bal0,start:cfg.bal0,peak:cfg.bal0,pos:{},trades:[],log:[],preds:[],slots:{},fundT:0,fees:0,funding:0,last:null}; }
function ksLoad(){ let s=null; try{ s=JSON.parse(localStorage.getItem(KS_KEY)||"null"); }catch(e){} if(!s) s=ksNew(); s.cfg=Object.assign({},KS_DEF,s.cfg||{}); s.preds=s.preds||[]; s.slots=s.slots||{}; return s; }
function ksSave(s){ try{ localStorage.setItem(KS_KEY,JSON.stringify(s)); }catch(e){} }
function ksEq(s,px){ let u=0; for(const k in s.pos){ const p=s.pos[k]; const x=px&&px[k]||p.px; if(x>0) u+=p.qty*(p.e-x); } return s.bal+u; }
function ksLog(s,ev){ s.log.push(ev); if(s.log.length>400) s.log.splice(0,s.log.length-400); return ev; }
const ksR4=x=>Number.isFinite(x)?+x.toFixed(4):NaN; // arşiv örnekleri 4 ondalığa yuvarlı
function ksLb(a,t){ let lo=0,hi=a.length-1,r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(a[m].t<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function ksSma(a,i,n){ if(i+1<n) return NaN; let s=0; for(let j=i-n+1;j<=i;j++) s+=a[j].c; return s/n; }
// masa-archive.js feats() ile aynı tanım. k: coinin kapanmış 15 dk mumları (son eleman karar mumu), d1: günlük (açık gün olabilir), btc: BTC 15 dk, btcD: BTC günlük, fr: son fonlama
function ksFeatX(k,d1,btc,btcD,fr,dir){
  const L=Math.log, i=k.length-1; if(i<97) return null; const px=k[i].c, atr=atrAt(k,i+1,14); const d=ksLb(d1,k[i].t-DAY_MS);
  const bi=btc&&btc.length?ksLb(btc,k[i].t):-1, bd=btcD&&btcD.length?ksLb(btcD,k[i].t-DAY_MS):-1;
  let q4=0,q96=0; for(let j=i-3;j<=i;j++) q4+=k[j].q; for(let j=i-95;j<=i;j++) q96+=k[j].q;
  let tb=0,qq=0; for(let j=i-3;j<=i;j++){ tb+=k[j].tb; qq+=k[j].q; }
  let hi=-Infinity,lo=Infinity; for(let j=i-95;j<=i;j++){ if(k[j].h>hi) hi=k[j].h; if(k[j].l<lo) lo=k[j].l; }
  const x={ atrp:atr/px, r1:L(px/k[i-4].c), r4:L(px/k[i-16].c), r24:L(px/k[i-96].c), r7d:d>=7?L(px/d1[d-7].c):NaN, r30d:d>=30?L(px/d1[d-30].c):NaN,
    s20:L(px/ksSma(d1,d,20)), s50:L(px/ksSma(d1,d,50)), s200:L(px/ksSma(d1,d,200)), pos24:(px-lo)/Math.max(1e-12,hi-lo), vq:q4/(q96/24), tk:qq>0?tb/qq:0.5,
    vol30:d>=30?(()=>{ let s=0,s2=0; for(let j=d-29;j<=d;j++){ const y=L(d1[j].c/d1[j-1].c); s+=y; s2+=y*y; } return Math.sqrt(Math.max(0,s2/30-(s/30)**2)); })():NaN,
    b4:bi>=16?L(btc[bi].c/btc[bi-16].c):NaN, b24:bi>=96?L(btc[bi].c/btc[bi-96].c):NaN, bs200:bi>=0&&bd>=0?L(btc[bi].c/ksSma(btcD,bd,200)):NaN, bs50:bi>=0&&bd>=0?L(btc[bi].c/ksSma(btcD,bd,50)):NaN,
    fr:Number.isFinite(fr)?fr:NaN, hr:new Date(k[i].t+9e5).getUTCHours(), dow:new Date(k[i].t+9e5).getUTCDay() };
  const sg=dir==="long"?1:-1; for(const key of KS_SIGNED) if(Number.isFinite(x[key])) x[key]*=sg;
  for(const key in x) x[key]=ksR4(x[key]); return x;
}
// modelin girdi satırı (KS_MODEL.feats sırası): c = committee() sonucu (raw, lf:false, l24:false), x = ksFeatX
function ksRow(c,x,dir){ const M=KS_MODEL; const pre=c.pre||c.agents||[]; const ag={}; for(const z of pre) ag[z.id]=z;
  const plan=c.plan||{sd:c.feat&&c.feat.sd}; const st=(c.feat&&c.feat.stage)||"yok"; const si=M.stages.indexOf(st);
  const v={L:dir==="long"?1:0,score:c.score==null?0:ksR4(+c.score),yes:+c.yes,sd:ksR4(+plan.sd),kz:c.feat&&c.feat.kz?1:0,stage:si<0?NaN:si};
  for(const id of KS_AG){ const z=ag[id]; const ab=!z||z.abst; v["v_"+id]=ab?NaN:ksR4(+z.v); v["c_"+id]=ab?NaN:ksR4(+z.c); }
  return M.feats.map(f=>f in v?v[f]:(x&&f in x?x[f]:NaN)); }
function ksPredict(row){ return rkPredict(KS_MODEL,row); }
// eşik: son thrDays günün canlı tahminlerinden keep yüzdeliği (≥ thrMinN), yoksa arşivden
function ksThr(s,now){ const c=s.cfg; const t0=now-c.thrDays*DAY_MS; const a=s.preds.filter(z=>z[0]>=t0).map(z=>z[1]).sort((x,y)=>x-y);
  if(a.length>=c.thrMinN){ const q=c.keep*(a.length-1), i=Math.floor(q); return {thr:a[i]+(a[Math.min(i+1,a.length-1)]-a[i])*(q-i),src:"canlı",n:a.length}; }
  return {thr:c.keep>=0.5?KS_MODEL.thr50:KS_MODEL.thr30,src:"arşiv",n:a.length}; }
// arşivdeki masa girdileriyle aynı bilgi: açık pozisyon, fonlama, kalabalık, emir defteri, işlem akışı nötr
function ksNeutral(f,s){
  const f2=Object.assign({},f,{prem:Object.assign({},f.prem,{lastFundingRate:"0"}),depth:null,trades:null,oi5:[{sumOpenInterestValue:"0",sumOpenInterest:"0"}],noOI:true});
  const s2=Object.assign({},s,{oi1h:null,toppos:[{longShortRatio:"1"}],topacc:null,glob:[{longShortRatio:"1"}],fund:[],noCrowd:true,oi15:null,taker15:null,toppos15:null});
  return [f2,s2]; }
function ksExit(s,sym,px,why,now){ const p=s.pos[sym]; const c=s.cfg; const fill=px*(1+c.slip); const fee=p.qty*fill*c.taker; const pnl=p.qty*(p.e-fill);
  s.bal+=pnl-fee; s.fees+=fee; delete s.pos[sym]; const net=pnl-fee-p.fee-p.fund; const R=net/(p.qty*p.e*c.stopMult*p.sd);
  const tr={sym,t:p.t,closeT:now,e:p.e,x:fill,why,R,r:net/(p.qty*p.e),pnl:net,p:p.p}; s.trades.push(tr); if(s.trades.length>1000) s.trades.shift();
  return ksLog(s,{t:now,type:"exit",sym,why,px:fill,pnl:net,R}); }
// karar: cands = [{dir, c (committee), x (ksFeatX)}] geçen kararlar; tahminler eşik defterine, short ve tahmin ≥ eşik ise giriş
function ksDecide(s,sym,cands,px,now){ const c=s.cfg, evs=[]; const th=ksThr(s,now); let best=null;
  for(const z of cands){ const p=ksPredict(ksRow(z.c,z.x,z.dir)); if(!Number.isFinite(p)) continue; s.preds.push([now,+p.toFixed(5)]); if(z.dir==="short") best={z,p}; }
  const t0=now-c.thrDays*DAY_MS; if(s.preds.length&&s.preds[0][0]<t0) s.preds=s.preds.filter(z=>z[0]>=t0);
  if(!best) return evs; const sd=+(best.z.c.plan||best.z.c.feat||{}).sd; const ok=best.p>=th.thr;
  s.last={t:now,sym,p:best.p,thr:th.thr,src:th.src,ok}; if(!ok||!c.on){ evs.push(ksLog(s,{t:now,type:"skip",sym,p:best.p,thr:th.thr,why:ok?"kapalı":"kalite eşiğin altında"})); return evs; }
  if(s.pos[sym]){ evs.push(ksLog(s,{t:now,type:"skip",sym,p:best.p,thr:th.thr,why:"açık pozisyon var"})); return evs; }
  if(Object.keys(s.pos).length>=c.maxPos){ evs.push(ksLog(s,{t:now,type:"skip",sym,p:best.p,thr:th.thr,why:`en çok ${c.maxPos} short`})); return evs; }
  if(!(px>0)||!(sd>0)) return evs; const eq=ksEq(s,null); const e=px*(1-c.slip); const risk=c.risk*eq, ru=e*c.stopMult*sd; const qty=risk/ru;
  const gross=Object.values(s.pos).reduce((a,p)=>a+p.qty*p.px,0); if(gross+qty*e>c.lev*eq){ evs.push(ksLog(s,{t:now,type:"skip",sym,p:best.p,thr:th.thr,why:`nominal ${c.lev}× sınırı`})); return evs; }
  const fee=qty*e*c.taker; s.bal-=fee; s.fees+=fee;
  s.pos[sym]={e,qty,sd,stop:e*(1+c.stopMult*sd),t:now,until:now+c.holdH*3600e3,p:best.p,thr:th.thr,score:best.z.c.score,yes:best.z.c.yes,fee,fund:0,px};
  evs.push(ksLog(s,{t:now,type:"fill",sym,px:e,usd:qty*e,fee,stop:s.pos[sym].stop,p:best.p,thr:th.thr,score:best.z.c.score}));
  return evs; }
// fiyat adımı: fonlama (short alır), stop (fiyat stopun üstünde), 72 sa zaman çıkışı. px: {sym: fiyat}, fr: {sym: oran}
function ksStep(s,px,now,fr){ const c=s.cfg, evs=[]; const F=8*3600e3; const slot=Math.floor(now/F)*F; if(!s.fundT) s.fundT=slot;
  while(s.fundT<slot){ s.fundT+=F; for(const k in s.pos){ const p=s.pos[k]; if(p.t>s.fundT) continue; const r=fr&&Number.isFinite(fr[k])?fr[k]:c.fundDef; const cst=-p.qty*(px&&px[k]||p.px)*r; s.bal-=cst; s.funding+=cst; p.fund+=cst; } }
  for(const k of Object.keys(s.pos)){ const p=s.pos[k]; const x=px&&px[k]; if(x>0) p.px=x; else continue;
    if(x>=p.stop) evs.push(ksExit(s,k,x,"stop",now)); else if(now>=p.until) evs.push(ksExit(s,k,x,"72 sa",now)); }
  s.peak=Math.max(s.peak||s.start,ksEq(s,px)); return evs; }
// tarama satırlarından (row._f, row._s) karar: coin başına slotH saatte bir, masa nötr girdilerle; günlük mumlar coin başına günde bir
const ksMem={d1:{},day:null};
async function ksDaily(sym,now){ const day=Math.floor(now/DAY_MS); if(ksMem.day!==day){ ksMem.d1={}; ksMem.day=day; }
  if(!ksMem.d1[sym]){ const r=await opt(`/fapi/v1/klines?symbol=${sym}&interval=1d&limit=230`,null); ksMem.d1[sym]=r?K(r):[]; } return ksMem.d1[sym]; }
async function ksScan(s,rows,now){ now=now||Date.now(); const c=s.cfg, evs=[]; const slot=Math.floor(now/(c.slotH*3600e3)); let btc=null;
  for(const r of rows||[]){ const sym=r&&r.s; if(!sym||!r._f||!r._s||s.slots[sym]===slot) continue; s.slots[sym]=slot;
    let cands=[]; try{ const [f2,s2]=ksNeutral(r._f,r._s); const A=analyze(f2,s2);
      for(const dir of ["long","short"]){ const cm=committee(A,dir,r.c24,{sym,raw:true,lf:false,l24:false}); if(!cm.veto&&cm.score>=c.minScore&&cm.yes>=c.minYes) cands.push({dir,c:cm}); }
      if(!cands.length) continue;
      if(!btc){ const bk=await btcKlines(); btc={k:(bk||[]).filter(b=>b.t+9e5<=now),d:btcCache.d||[]}; }
      const k15=(r._f.k15||[]).filter(b=>b.t+9e5<=now); const d1=await ksDaily(sym,now); const fr=r._f.prem?+r._f.prem.lastFundingRate:NaN;
      for(const z of cands) z.x=ksFeatX(k15,d1,btc.k,btc.d,fr,z.dir); cands=cands.filter(z=>z.x);
    }catch(e){ evs.push(ksLog(s,{t:now,type:"error",sym,text:String(e.message||e)})); continue; }
    if(cands.length) evs.push(...ksDecide(s,sym,cands,r.px,now)); }
  for(const k in s.slots) if(s.slots[k]<slot-1) delete s.slots[k];
  return evs; }
// fiyat turu: tüm coinlerin mark fiyatı ve fonlaması (premiumIndex; arayüzde WebSocket önbelleğinden)
async function ksTick(s,now){ now=now||Date.now(); const px={}, fr={}; if(Object.keys(s.pos).length){ const a=await opt(`/fapi/v1/premiumIndex`,null);
  if(Array.isArray(a)) for(const z of a){ if(s.pos[z.symbol]){ px[z.symbol]=+z.markPrice; fr[z.symbol]=+z.lastFundingRate; } } }
  const evs=ksStep(s,px,now,fr); return {evs,px,eq:ksEq(s,px)}; }
function ksSummary(s,px){ const eq=ksEq(s,px); const tr=s.trades; const w=tr.filter(t=>t.R>0).length; const gross=Object.entries(s.pos).reduce((a,[k,p])=>a+p.qty*((px&&px[k])||p.px),0);
  return {eq,roi:(eq/s.start-1)*100,dd:s.peak>0?Math.max(0,1-eq/s.peak):0,n:tr.length,wr:tr.length?w/tr.length:null,avgR:tr.length?tr.reduce((a,t)=>a+t.R,0)/tr.length:null,
    open:Object.keys(s.pos).length,gross,margin:gross/(s.cfg.exLev||20),fees:s.fees,funding:s.funding,thr:ksThr(s,Date.now())}; }
