const BASE = "https://fapi.binance.com";
const $ = id => document.getElementById(id);
const state = { sym:"DUSKUSDT", every:10000, mode:"both", lev:5, strat:"hc", bal:0, timer:null, slowAt:0, slow:null, chart:null, candles:null, vols:null, lines:[], helpOpen:false };

/* ---------- helpers ---------- */
const fmtP = p => { p=+p; if(!isFinite(p)) return "—"; if(p>=1000) return p.toLocaleString("tr-TR",{maximumFractionDigits:0}); if(p>=1) return p.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:3}); return p.toPrecision(4).replace(".",","); };
const fmtUsd = v => { v=+v; if(v>=1e9) return (v/1e9).toFixed(2).replace(".",",")+" mlr $"; if(v>=1e6) return (v/1e6).toFixed(2).replace(".",",")+" M$"; if(v>=1e3) return Math.round(v/1e3)+" bin $"; return Math.round(v)+" $"; };
const pct = (v,d=1) => isFinite(v)?(v>0?"+":"")+(+v).toFixed(d).replace(".",",")+"%":"—";
const fx = (v,d=2) => isFinite(v)?(+v).toFixed(d).replace(".",","):"—";
// masa puanı 100 üzerinden gösterilir (iç hesap −1…+1 sürekli; 1000'e çıkarmak için yalnız SCORE_MAX değişir). Ayarlar içte kesir olarak saklanır.
const SCORE_MAX = 100;
const pts = v => isFinite(v)?String(Math.round(v*SCORE_MAX)).replace("-","−"):"—";
const ptsT = v => pts(v)+"/"+SCORE_MAX;
const sma = (a,n) => a.length<n?NaN:a.slice(-n).reduce((x,y)=>x+y,0)/n;
const last = a => a[a.length-1];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const chip=(cls,txt)=>`<span class="chip ${cls}">${txt}</span>`;
const tl = ms => new Date(ms).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
const K = k => k.map(x=>({t:x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],q:+x[7],tb:+x[10]}));
async function j(path){
  let r; try{ r=await fetch(BASE+path); }catch(e){ throw new Error(path.split("?")[0]+" → bağlantı kurulamadı ("+e.message+")"); }
  if(!r.ok){ let t=""; try{ t=(await r.text()).slice(0,120); }catch(e){} throw new Error(path.split("?")[0]+" → HTTP "+r.status+(t?" · "+t:"")); }
  const data=await r.json();
  if(path.startsWith("/futures/data/") && (!Array.isArray(data) || !data.length)) throw new Error(path.split("?")[0]+" → boş yanıt (Binance bu coin için kalabalık/OI verisi vermiyor ya da veri uç noktası geçici olarak kısıtlı)");
  return data;
}

/* ---------- fetch ---------- */
// The /futures/data endpoints (crowd, open interest) are optional: when one fails the page keeps working and says so.
const missing=[];
async function opt(path, fallback){ try{ return await j(path); }catch(e){ missing.push(e.message); return fallback; } }
async function fetchFast(s){
  missing.length=0;
  const [t24,prem,k5,k15,depth,trades]=await Promise.all([
    j(`/fapi/v1/ticker/24hr?symbol=${s}`),
    j(`/fapi/v1/premiumIndex?symbol=${s}`),
    j(`/fapi/v1/klines?symbol=${s}&interval=5m&limit=60`),
    j(`/fapi/v1/klines?symbol=${s}&interval=15m&limit=150`),
    j(`/fapi/v1/depth?symbol=${s}&limit=500`),
    j(`/fapi/v1/aggTrades?symbol=${s}&limit=1000`)
  ]);
  const [taker5,oi5]=await Promise.all([
    opt(`/futures/data/takerlongshortRatio?symbol=${s}&period=5m&limit=24`, null),
    opt(`/futures/data/openInterestHist?symbol=${s}&period=5m&limit=36`, null)
  ]);
  return {t24,prem,k5:K(k5),k15:K(k15),depth,trades,taker5:taker5||[{buySellRatio:"1"}],oi5:oi5||[{sumOpenInterestValue:"0"}],noTaker:!taker5,noOI:!oi5};
}
async function fetchSlow(s){
  const [k1h,k4h,k1d]=await Promise.all([
    j(`/fapi/v1/klines?symbol=${s}&interval=1h&limit=200`),
    j(`/fapi/v1/klines?symbol=${s}&interval=4h&limit=200`),
    j(`/fapi/v1/klines?symbol=${s}&interval=1d&limit=150`)
  ]);
  const [k15L,oi15,taker15,toppos15]=await Promise.all([
    opt(`/fapi/v1/klines?symbol=${s}&interval=15m&limit=1500`, null),
    opt(`/futures/data/openInterestHist?symbol=${s}&period=15m&limit=200`, null),
    opt(`/futures/data/takerlongshortRatio?symbol=${s}&period=15m&limit=200`, null),
    opt(`/futures/data/topLongShortPositionRatio?symbol=${s}&period=15m&limit=200`, null)
  ]);
  const [oi1h,taker1h,toppos,topacc,glob,fund]=await Promise.all([
    opt(`/futures/data/openInterestHist?symbol=${s}&period=1h&limit=48`, null),
    opt(`/futures/data/takerlongshortRatio?symbol=${s}&period=1h&limit=24`, null),
    opt(`/futures/data/topLongShortPositionRatio?symbol=${s}&period=5m&limit=36`, null),
    opt(`/futures/data/topLongShortAccountRatio?symbol=${s}&period=5m&limit=36`, null),
    opt(`/futures/data/globalLongShortAccountRatio?symbol=${s}&period=5m&limit=36`, null),
    opt(`/fapi/v1/fundingRate?symbol=${s}&limit=9`, [])
  ]);
  return {k1h:K(k1h),k4h:K(k4h),k1d:K(k1d),oi1h,taker1h,toppos:toppos||[{longShortRatio:"1"}],topacc,glob:glob||[{longShortRatio:"1"}],fund,noCrowd:!toppos||!glob,k15L:k15L?K(k15L):null,oi15,taker15,toppos15};
}

/* ---------- analysis ---------- */
function pivots(k, w){ const R=[],S=[]; for(let i=w;i<k.length-w;i++){ let ph=true,pl=true; for(let d=1;d<=w;d++){ if(k[i].h<=k[i-d].h||k[i].h<=k[i+d].h) ph=false; if(k[i].l>=k[i-d].l||k[i].l>=k[i+d].l) pl=false; } if(ph) R.push(k[i].h); if(pl) S.push(k[i].l);} return {R,S}; }
function cluster(levels, tol){ const s=[...levels].sort((a,b)=>a-b); const out=[]; for(const v of s){ const g=out[out.length-1]; if(g && Math.abs(v/g.avg-1)<tol){ g.n++; g.sum+=v; g.avg=g.sum/g.n; } else out.push({n:1,sum:v,avg:v}); } return out; }

function analyze(f, s){
  const px=+f.t24.lastPrice, mark=+f.prem.markPrice;
  const d=s.k1d, h4=s.k4h, h1=s.k1h, m15=f.k15, m5=f.k5;
  const A={px,mark};

  // --- trend (daily) ---
  const dc=d.map(x=>x.c);
  const s20=sma(dc,20), s50=sma(dc,50), s20p=sma(dc.slice(0,-5),20);
  const ch7=px/dc[dc.length-8]-1, ch30=px/dc[dc.length-31]-1;
  const lastD=d.slice(-90);
  const lo90=Math.min(...lastD.map(x=>x.l)), hi90=Math.max(...lastD.map(x=>x.h));
  A.pos90=(px-lo90)/(hi90-lo90); A.lo90=lo90; A.hi90=hi90; A.ch7=ch7; A.ch30=ch30;
  // structure: last 10d high/low vs previous 10d
  const r1=d.slice(-10), r0=d.slice(-20,-10);
  const hh=Math.max(...r1.map(x=>x.h))>Math.max(...r0.map(x=>x.h)), hl=Math.min(...r1.map(x=>x.l))>Math.min(...r0.map(x=>x.l));
  let trendScore=0; if(px>s20) trendScore+=1; if(s20>s20p) trendScore+=1; if(px>s50) trendScore+=1; if(hh) trendScore+=1; if(hl) trendScore+=1; if(ch30>0) trendScore+=1;
  if(px<s20) trendScore-=1; if(s20<s20p) trendScore-=1; if(px<s50) trendScore-=1; if(!hh&&!hl) trendScore-=1; if(ch30<0) trendScore-=1;
  A.trend = trendScore>=3?"up":trendScore<=-3?"down":"flat"; A.trendScore=trendScore; A.s20=s20; A.s50=s50; A.hh=hh; A.hl=hl;

  // --- short-term structure (1h) ---
  const hc=h1.map(x=>x.c); const h20=sma(hc,20), h20p=sma(hc.slice(0,-3),20);
  const l1=h1.slice(-6), l0=h1.slice(-12,-6);
  const hl1=Math.min(...l1.map(x=>x.l))>Math.min(...l0.map(x=>x.l));
  A.st = (px>h20?1:-1) + (h20>h20p?1:-1) + (hl1?1:-1); // -3..3

  // --- levels ---
  // box: top = highest high of the last 10 completed days, bottom = lowest low of the last 7
  A.boxHi=Math.max(...d.slice(-11,-1).map(x=>x.h)); A.boxLo=Math.min(...d.slice(-8,-1).map(x=>x.l));
  const p4=pivots(h4.slice(-120),3), p1=pivots(h1.slice(-100),3), pd=pivots(d.slice(-120),3);
  // a broken resistance becomes support and a broken support becomes resistance, so every pivot is a candidate on both sides
  const piv=[...p4.R,...p4.S,...p1.R,...p1.S,...pd.R,...pd.R,...pd.S,...pd.S, A.boxHi, A.boxLo, +f.t24.highPrice, +f.t24.lowPrice];
  const R=cluster(piv.filter(v=>v>px*1.003),0.012), S=cluster(piv.filter(v=>v<px*0.997),0.012);
  A.R=R.slice(0,3).map(g=>g.avg); A.S=S.sort((a,b)=>b.avg-a.avg).slice(0,3).map(g=>g.avg);
  A.distR = A.R[0]?(A.R[0]/px-1):NaN; A.distS = A.S[0]?(1-A.S[0]/px):NaN;

  // --- volatility (ATR% 4h, 14) ---
  const tr=[]; for(let i=h4.length-14;i<h4.length;i++){ const p=h4[i-1].c; tr.push(Math.max(h4[i].h-h4[i].l,Math.abs(h4[i].h-p),Math.abs(h4[i].l-p))); }
  A.atr4=tr.reduce((a,b)=>a+b,0)/tr.length/px;

  // --- volume / momentum ---
  const vol1h=m5.slice(-12).reduce((a,x)=>a+x.q,0); const vol24=+f.t24.quoteVolume; A.vol1h=vol1h; A.vol24=vol24; A.volRel=vol1h/(vol24/24);
  const vol7d = d.slice(-8,-1).reduce((a,x)=>a+x.q,0)/7; A.vol24Rel = vol24/vol7d;
  A.noTaker=!!f.noTaker; A.noOI=!!f.noOI; A.noCrowd=!!s.noCrowd;
  const tk5=f.taker5.map(x=>+x.buySellRatio); A.tk5=tk5; A.tkNow=last(tk5); A.tk30=tk5.length>=6?sma(tk5,6):tk5.reduce((a,b)=>a+b,0)/tk5.length;
  A.tk1h = s.taker1h ? +last(s.taker1h).buySellRatio : (tk5.slice(-12).reduce((a,x)=>a+x,0)/Math.min(12,tk5.length));
  // last 1000 trades flow (detail view only)
  let b=0,sv=0; if(f.trades){ for(const t of f.trades){ const v=+t.p*+t.q; if(t.m) sv+=v; else b+=v; } } A.flowBuy=b; A.flowSell=sv; A.flowFrom=f.trades?f.trades[0].T:Date.now();
  // climax check: last two 15m candles
  const m=m15.slice(-2); const maxQ=Math.max(...m15.slice(-48).map(x=>x.q));
  A.climax = m.some(c=>{ const rng=c.h-c.l; return rng>0 && c.q>=maxQ*0.8 && (c.h-Math.max(c.o,c.c))/rng>0.4; });
  // last 1h change
  A.ch1h = px/h1[h1.length-2].c-1; A.ch4h = px/h4[h4.length-2].c-1;

  // --- open interest ---
  const oi5=f.oi5.map(x=>+x.sumOpenInterestValue), oi1h=(s.oi1h||[]).map(x=>+x.sumOpenInterestValue);
  A.oiNow=last(oi5); A.oi15=A.oiNow/oi5[Math.max(0,oi5.length-4)]-1; A.oi1h=A.oiNow/oi5[Math.max(0,oi5.length-13)]-1; A.oi24=oi1h.length?A.oiNow/oi1h[Math.max(0,oi1h.length-25)]-1:NaN; A.oi5=oi5; A.oi1hSeries=oi1h;
  const dp=A.ch1h, doi=A.oi1h;
  A.oiCase = dp>0.003 && doi>0.01 ? "newlong" : dp>0.003 && doi<-0.01 ? "shortcover" : dp<-0.003 && doi>0.01 ? "newshort" : dp<-0.003 && doi<-0.01 ? "longclose" : "flat";
  A.oiBloat = Math.abs(dp)<0.006 && A.oi15>0.05;

  // --- crowd ---
  A.fund=+f.prem.lastFundingRate; A.nextFund=+f.prem.nextFundingTime; A.fundHist=(s.fund||[]).map(x=>+x.fundingRate);
  const tp=s.toppos.map(x=>+x.longShortRatio), ta=(s.topacc||[]).map(x=>+x.longShortRatio), gl=s.glob.map(x=>+x.longShortRatio);
  A.tp=tp; A.gl=gl; A.tpNow=last(tp); A.glNow=last(gl); A.taNow=ta.length?last(ta):NaN;
  A.tpSlope=last(tp)/tp[Math.max(0,tp.length-7)]-1; A.glSlope=last(gl)/gl[Math.max(0,gl.length-7)]-1;
  A.distrib = A.tpSlope<-0.05 && A.glSlope>0.01; A.accum = A.tpSlope>0.05 && A.glSlope<-0.01;

  // --- order book (detail view only) ---
  const depth=f.depth||{bids:[],asks:[]};
  const band=(side,lo,hi)=>side.filter(([p])=>{const dd=Math.abs(+p/px-1)*100;return dd>=lo&&dd<hi;}).reduce((a,[p,q])=>a+ +p*+q,0);
  A.bid1=band(depth.bids,0,1); A.bid2=band(depth.bids,1,3); A.ask1=band(depth.asks,0,1); A.ask2=band(depth.asks,1,3);
  const walls=side=>side.map(([p,q])=>({p:+p,v:+p*+q})).filter(w=>Math.abs(w.p/px-1)<0.05).sort((a,b)=>b.v-a.v).slice(0,4).sort((a,b)=>a.p-b.p);
  A.bidWalls=walls(depth.bids).reverse(); A.askWalls=walls(depth.asks);

  // --- breakout state (15m, last 48h) ---
  const bh=A.boxHi, bl=A.boxLo; const m48=m15.slice(-192);
  let state="inside", brokeAt=-1, maxAfter=0;
  for(let i=0;i<m48.length;i++){ const c=m48[i]; if(brokeAt<0){ if(c.c>bh) {brokeAt=i; maxAfter=c.h;} } else { maxAfter=Math.max(maxAfter,c.h); if(c.c<bh*0.99 && i>brokeAt){ state="failed"; brokeAt=-1; maxAfter=0; } } }
  if(brokeAt>=0){ const ext=maxAfter/bh-1; if(px<=bh*1.01 && ext>0.015) state="retest"; else state="broke"; }
  if(state==="inside" && px<bl) state="below";
  A.bo=state; A.boExt=maxAfter; A.measured=bh+(bh-bl);

  // --- wind score ---
  const comp=[];
  comp.push({k:"Büyük trend (günlük)", v:clamp(trendScore/6,-1,1)*25});
  comp.push({k:"Kısa vade yapı (1s)", v:clamp(A.st/3,-1,1)*15});
  let mom = clamp((A.tk30-1)*2,-1,1)*0.6 + clamp((A.volRel-1)/2,-1,1)*0.4*(A.ch1h>=0?1:-1); if(A.climax) mom-=0.4;
  if(A.ch1h>0.005 && A.tk1h<0.95) mom-=0.4; // price up without aggressive buyers: weak rally
  // 5-minute structure of the last half hour: lower highs and lower lows after a run cut momentum
  const q6=m5.slice(-6); if(q6.length===6){ const lhll = Math.max(...q6.slice(3).map(c=>c.h))<Math.max(...q6.slice(0,3).map(c=>c.h)) && Math.min(...q6.slice(3).map(c=>c.l))<Math.min(...q6.slice(0,3).map(c=>c.l)); if(lhll) mom-=0.3; }
  comp.push({k:"Momentum ve akış", v:clamp(mom,-1,1)*15});
  let oiS = A.oiCase==="newlong"?0.8:A.oiCase==="shortcover"?0.2:A.oiCase==="newshort"?-0.8:A.oiCase==="longclose"?-0.5:0; if(A.oiBloat) oiS-=0.5;
  comp.push({k:"Açık pozisyon", v:clamp(oiS,-1,1)*15});
  let cr=0; if(A.fund>0.0003) cr-=0.5; else if(A.fund<-0.0003) cr+=0.4; if(A.distrib) cr-=0.7; if(A.accum) cr+=0.5; if(A.tpNow>4) cr-=0.2;
  comp.push({k:"Kalabalık", v:clamp(cr,-1,1)*15});
  let lv=0; if(isFinite(A.distR)&&A.distR<0.015) lv-=0.6; if(isFinite(A.distS)&&A.distS<0.015 && A.tkNow>1) lv+=0.5; if(A.bo==="broke") lv+=0.4; if(A.bo==="retest") lv+=0.2; if(A.bo==="failed") lv-=0.8;
  comp.push({k:"Seviye bağlamı", v:clamp(lv,-1,1)*15});
  A.comp=comp; A.score=Math.round(comp.reduce((a,c)=>a+c.v,0));

  // --- setup type and "fit for entry" flag (used by the scanner) ---
  const nearS = isFinite(A.distS)&&A.distS<0.02, nearR = isFinite(A.distR)&&A.distR<0.015;
  A.setup = A.bo==="retest" ? "retest"
    : (A.bo==="broke" && A.boExt/A.boxHi-1 < 0.04) ? "breakout"
    : (nearS && A.trend!=="down" && A.tkNow>=1) ? "support"
    : (A.trend==="up" && A.ch4h<0 && isFinite(A.distS)&&A.distS<0.03) ? "pullback"
    : "none";
  A.pick = A.score>=25 && A.setup!=="none" && A.st>-3 && !nearR && !A.climax && !A.distrib && A.fund<=0.0003 && A.volRel>=0.5;

  // --- short side: the mirror image ---
  // capitulation candle: one of the last two 15m candles is among the day's biggest and closes with a long LOWER wick (sellers exhausted)
  A.capit = m.some(c=>{ const rng=c.h-c.l; return rng>0 && c.q>=maxQ*0.8 && (Math.min(c.o,c.c)-c.l)/rng>0.4; });
  const belowExt = A.bo==="below" ? (1 - Math.min(...m15.slice(-24).map(c=>c.l))/A.boxLo) : 0;
  A.setupS = A.bo==="failed" ? "failedbreak"
    : (A.bo==="below" && belowExt < 0.04) ? "breakdown"
    : (nearR && A.trend!=="up" && A.tkNow<=1) ? "resistance"
    : (A.trend==="down" && A.ch4h>0 && isFinite(A.distR)&&A.distR<0.03) ? "pullbackdown"
    : "none";
  A.pickS = A.score<=-25 && A.setupS!=="none" && A.st<3 && !nearS && !A.capit && !A.accum && A.fund>=-0.0003 && A.volRel>=0.5;

  // --- leverage math (independent of the chosen multiplier) ---
  // stop for a long sits just under the nearest support, for a short just over the nearest resistance; +0.25% buffer for wicks
  A.stopDistL = isFinite(A.distS) ? A.distS + 0.0025 : NaN;
  A.stopDistS = isFinite(A.distR) ? A.distR + 0.0025 : NaN;
  const MMR=0.005; // approximate maintenance margin for small positions
  const maxLev = sd => isFinite(sd) ? Math.max(1,Math.floor(1/(sd/0.6 + MMR))) : NaN; // stop may use at most 60% of the liquidation distance
  A.maxLevL = maxLev(A.stopDistL); A.maxLevS = maxLev(A.stopDistS);
  // how often a single candle travels further than a given distance (last 48h)
  const r5 = m5.map(c=>(c.h-c.l)/c.c), r15 = m15.slice(-192).map(c=>(c.h-c.l)/c.c);
  A.rangeShare = dist => ({ m5: r5.filter(r=>r>dist).length/r5.length, m15: r15.filter(r=>r>dist).length/r15.length });
  A.med15 = [...r15].sort((a,b)=>a-b)[Math.floor(r15.length/2)] || 0;
  A.src = {k15L:s.k15L||m15, k1h:h1, btc15:s.btc15||null, oi15:s.oi15||null, taker15:s.taker15||null, toppos15:s.toppos15||null, fundTimes:(s.fund||[]).map(x=>+x.fundingTime), nextFund:A.nextFund};
  A.src.k1d=d; // günlük mumlar (havuzlar: önceki gün tepesi/dibi)
  A.src.k4h=h4; A.src.oi5raw=f.oi5; A.src.tp5=s.toppos||null; A.src.gl5=s.glob||null; A.src.fr=f.prem?+f.prem.lastFundingRate:NaN; // sıralama modeli (rankmodel.js rkFeatA)
  A.vp=sessionProfiles(A.src.k15L,A.src.k15L.length,{withCurrent:true,rows:true}).slice(-12).map(p=>({...p,prof:p.current?p.prof:null})); // günlük hacim profilleri (UTC): POC, VAH/VAL, çıplak POC
  const kb=A.src.k15L; A.bt={long:boxTheory(kb,A.med15,"long"),short:boxTheory(kb,A.med15,"short")};
  A.btStats = kb.length>=600 ? {long:boxTheoryStats(kb,A.med15,"long"),short:boxTheoryStats(kb,A.med15,"short")} : {};
  const btReady = d => { const b=A.bt[d]; if(!b) return false; const tolT=Math.max(0.0015,0.3*A.med15); return (b.stage==="retest" && Math.abs(A.px/b.poc-1)<=0.004 && b.rr>=1.5) || (b.stage==="waitRetest" && Math.abs(A.px/b.poc-1)<=tolT); };
  A.btL=btReady("long"); A.btS=btReady("short");
  // --- AMD model (core strategy) ---
  const biasHTF = A.trend==="up" ? "up" : A.trend==="down" ? "down" : (A.trendScore>=1 && px>=last(d).o ? "up" : A.trendScore<=-1 && px<=last(d).o ? "down" : "flat");
  const maps={oi:tsMap(s.oi15,"sumOpenInterestValue"),tk:tsMap(s.taker15,"buySellRatio")};
  A.amd={long:amdDetect(kb,d,A.med15,"long",maps,biasHTF),short:amdDetect(kb,d,A.med15,"short",maps,biasHTF)};
  A.amdStats = kb.length>=600 ? {long:amdStats(kb,d,A.med15,"long"),short:amdStats(kb,d,A.med15,"short")} : null;
  const amdGo = r => r && r.stage==="entry" && (r.grade==="A"||r.grade==="B") && r.rr1>=1.5;
  A.amdL=amdGo(A.amd.long); A.amdS=amdGo(A.amd.short);
  if(A.amdL){ A.setup="amd"; A.setupGrade=A.amd.long.grade; }
  if(A.amdS){ A.setupS="amdS"; A.setupGradeS=A.amd.short.grade; }
  // scanner "giriş" = AMD A/B in the entry zone only; other setups stay visible as information
  A.pick = A.amdL && A.fund<=0.0005 && !A.distrib; A.pickS = A.amdS && A.fund>=-0.0005 && !A.accum;
  // yüksek tutarlılık: yalnızca AMD, not A (kanıtlı coinde B), süpürme kill zone'da, coin bu kurulumda kanıtlı/umut var, 20x'e sığan stop
  A.cons = A.amdStats ? {long:consistencyOf(A.amdStats.long), short:consistencyOf(A.amdStats.short)} : null;
  const hcGo = (r,c,base) => { if(!base||!r||!c) return false; const tierOk=c.tier==="proven"||c.tier==="promising"; const gradeOk=r.grade==="A"||(r.grade==="B"&&c.tier==="proven"); const sd=Math.abs(r.entry/r.stop-1); return tierOk && gradeOk && !!r.kz && sd<=liqDist(HC_MAX_LEV)*0.6; };
  A.pickHC = hcGo(A.amd.long, A.cons&&A.cons.long, A.pick); A.pickHCS = hcGo(A.amd.short, A.cons&&A.cons.short, A.pickS);
  if(A.btL){ A.setup="poc"; A.pick = A.pick || (A.st>-3 && !A.distrib && A.fund<=0.0003); }
  if(A.btS){ A.setupS="pocS"; A.pickS = A.pickS || (A.st<3 && !A.accum && A.fund>=-0.0003); }
  return A;
}
const SETUP_S_TXT={failedbreak:["down","Başarısız kırılım"],breakdown:["down","Taze aşağı kırılım"],resistance:["down","Dirençte"],pullbackdown:["neutral","Düşüşte yükseliş"],pocS:["down","Kutu/POC geri testi"],amdS:["down","AMD · süpürme + MSS"],none:["neutral","—"]};
function liqDist(lev){ return 1/lev - 0.005; }
const SETUP_TXT={retest:["warn","Geri test"],breakout:["up","Taze kırılım"],support:["up","Destekte"],pullback:["neutral","Trendde geri çekilme"],poc:["up","Kutu/POC geri testi"],amd:["up","AMD · süpürme + MSS"],none:["neutral","—"]};


const med = a => { if(!a.length) return NaN; const b=[...a].sort((x,y)=>x-y); return b[Math.floor(b.length/2)]; };
const pctTxt = v => isFinite(v)?pct(v*100):"—";
function tsMap(series, key){ const m=new Map(); (series||[]).forEach(x=>m.set(+x.timestamp, +x[key])); return m; }
function storyOf(A){
  const k=A.src.k15L; const n=k.length; if(n<120) return null;
  const oiM=tsMap(A.src.oi15,"sumOpenInterestValue"), tkM=tsMap(A.src.taker15,"buySellRatio"), tpM=tsMap(A.src.toppos15,"longShortRatio");
  const avgQ = k.slice(-96).reduce((a,c)=>a+c.q,0)/96;
  const levels=[...A.R.map(v=>({p:v,name:"direnç"})),...A.S.map(v=>({p:v,name:"destek"})),{p:A.boxHi,name:"kutu tepesi"},{p:A.boxLo,name:"kutu dibi"}];
  const nearLevel = p => { let best=null; for(const l of levels){ const d=Math.abs(p/l.p-1); if(d<0.006 && (!best||d<best.d)) best={...l,d}; } return best; };
  // funding times: known history + projected ones from the interval
  const ft=[...A.src.fundTimes].sort((a,b)=>a-b); const iv = ft.length>=2 ? ft[ft.length-1]-ft[ft.length-2] : 8*3600e3; const fundTimes=new Set(ft); if(A.src.nextFund) fundTimes.add(A.src.nextFund);
  const nearFund = t => { for(const f of fundTimes){ if(Math.abs(t+15*60e3-f)<=30*60e3) return true; } return false; };
  // pivots in the last 24h (96 candles), window 2, drop the still-forming last candle
  const w=2, from=Math.max(w,n-97), piv=[];
  for(let i=from;i<n-1-w;i++){ let ph=true,pl=true; for(let d=1;d<=w;d++){ if(k[i].h<=k[i-d].h||k[i].h<=k[i+d].h) ph=false; if(k[i].l>=k[i-d].l||k[i].l>=k[i+d].l) pl=false; } if(ph) piv.push({i,type:"top",p:k[i].h}); if(pl) piv.push({i,type:"bot",p:k[i].l}); }
  // keep alternating extremes: between two tops keep the higher, between two bottoms the lower
  const alt=[]; for(const pv of piv){ const last=alt[alt.length-1]; if(last && last.type===pv.type){ if((pv.type==="top"&&pv.p>last.p)||(pv.type==="bot"&&pv.p<last.p)) alt[alt.length-1]=pv; } else alt.push(pv); }
  // only meaningful swings: at least 1.2% from the previous pivot
  const thr=Math.max(0.012, 1.5*A.med15); const sw=[]; for(const pv of alt){ const last=sw[sw.length-1]; if(!last || Math.abs(pv.p/last.p-1)>=thr) sw.push(pv); else if((pv.type==="top"&&pv.p>last.p)||(pv.type==="bot"&&pv.p<last.p)) sw[sw.length-1]=pv; }
  const items=[];
  for(let j=0;j<sw.length;j++){
    const pv=sw[j], c=k[pv.i]; const rng=c.h-c.l||1e-12;
    const volX=c.q/avgQ; const wick = pv.type==="top" ? (c.h-Math.max(c.o,c.c))/rng : (Math.min(c.o,c.c)-c.l)/rng;
    const ctx=[];
    const lv=nearLevel(pv.p); if(lv) ctx.push(`${lv.name} ${fmtP(lv.p)} seviyesinde`);
    const prev=sw[j-1]; if(prev) ctx.push(`${fmtP(prev.p)} ${prev.type==="bot"?"dibinden":"tepesinden"} ${pctTxt(pv.p/prev.p-1)}, ${(pv.i-prev.i)*15} dk`);
    if(volX>=2.5) ctx.push(`hacim ortalamanın ${fx(volX,1)} katı`); else if(volX<0.6) ctx.push("hacim zayıf");
    if(wick>=0.4) ctx.push(pv.type==="top"?"uzun üst fitil (climax)":"uzun alt fitil (kapitülasyon)");
    const oiNow=oiM.get(c.t), oiPrev=oiM.get(c.t-4*15*60e3); if(oiNow&&oiPrev){ const d=oiNow/oiPrev-1; if(Math.abs(d)>=0.03) ctx.push(`OI 1 saatte ${pctTxt(d)}`); }
    const tk=tkM.get(c.t); if(tk){ if(tk>=1.3) ctx.push(`alıcılar itiyor (${fx(tk,2)})`); else if(tk<=0.8) ctx.push(`satıcılar baskın (${fx(tk,2)})`); else if(pv.type==="top"&&tk<1) ctx.push("tepede agresif alıcı yok"); }
    const tp=tpM.get(c.t), tpPrev=tpM.get(c.t-4*15*60e3); if(tp&&tpPrev){ const d=tp/tpPrev-1; if(d<=-0.08) ctx.push("büyükler long azaltıyor"); else if(d>=0.08) ctx.push("büyükler long artırıyor"); }
    if(nearFund(c.t)) ctx.push("fonlama saatine yakın");
    const next=sw[j+1]; let after;
    if(next) after=`sonra ${fmtP(next.p)} ${next.type==="bot"?"dibine":"tepesine"} ${pctTxt(next.p/pv.p-1)} (${(next.i-pv.i)*15} dk)`;
    else after=`sonra şimdiki fiyata ${pctTxt(A.px/pv.p-1)} (${(n-1-pv.i)*15} dk, devam ediyor)`;
    items.push({t:c.t,type:pv.type,p:pv.p,ctx,after});
  }
  return {items:items.slice(-12), avgQ, thr};
}
function statsOf(A){
  const k=A.src.k15L; const n=k.length; if(n<300) return null;
  const q=k.map(c=>c.q), c=k.map(x=>x.c), h=k.map(x=>x.h), l=k.map(x=>x.l);
  const out={climax:[],capit:[],breakout:[],breakdown:[],oiBloat:[]};
  for(let i=100;i<n-17;i++){
    const avg=q.slice(i-96,i).reduce((a,b)=>a+b,0)/96; const rng=h[i]-l[i]||1e-12;
    const hi24=Math.max(...h.slice(i-96,i)), lo24=Math.min(...l.slice(i-96,i));
    const r1=c[i+4]/c[i]-1, r4=c[i+16]/c[i]-1;
    const minAfter=Math.min(...l.slice(i+1,i+5))/c[i]-1, maxAfter=Math.max(...h.slice(i+1,i+5))/c[i]-1;
    if(q[i]>=3*avg && (h[i]-Math.max(k[i].o,c[i]))/rng>=0.4 && h[i]>=hi24*0.99) out.climax.push({r1,r4,down:minAfter<=-0.01});
    if(q[i]>=3*avg && (Math.min(k[i].o,c[i])-l[i])/rng>=0.4 && l[i]<=lo24*1.01) out.capit.push({r1,r4,up:maxAfter>=0.01});
    if(c[i]>hi24 && c[i-1]<=hi24){ const lvl=hi24; const after=k.slice(i+1,i+17); let ext=false, retest=false; for(const x of after){ if(x.h>=lvl*1.01) ext=true; if(ext && x.l<=lvl*1.005){ retest=true; break; } } const cont=after.some(x=>x.c>=lvl*1.03); const fail=after.some(x=>x.c<lvl*0.99); out.breakout.push({retest,cont,fail,r4}); }
    if(c[i]<lo24 && c[i-1]>=lo24){ const lvl=lo24; const after=k.slice(i+1,i+17); let ext=false, retest=false; for(const x of after){ if(x.l<=lvl*0.99) ext=true; if(ext && x.h>=lvl*0.995){ retest=true; break; } } const cont=after.some(x=>x.c<=lvl*0.97); const fail=after.some(x=>x.c>lvl*1.01); out.breakdown.push({retest,cont,fail,r4}); }
  }
  const oiM=tsMap(A.src.oi15,"sumOpenInterestValue");
  if(oiM.size>20){ for(let i=n-200;i<n-5;i++){ if(i<1) continue; const a=oiM.get(k[i].t), b=oiM.get(k[i-1].t); if(!a||!b) continue; const dOI=a/b-1, dp=Math.abs(c[i]/c[i-1]-1); if(dOI>=0.05 && dp<0.006) out.oiBloat.push({r1:c[i+4]/c[i]-1}); } }
  return out;
}
function entryZones(A){
  // for the chosen leverage: the price band from which a level-based stop still fits inside the liquidation distance
  const lev=state.lev, maxStop=liqDist(lev)*0.6; const z={};
  if(A.S[0]){ const stop=A.S[0]*(1-0.0025); const maxEntry=stop/(1-maxStop); z.long={stop,lo:A.S[0]*1.0005,hi:maxEntry,ok:maxEntry>=A.S[0]*1.0005,inZone:A.px>=A.S[0]*1.0005&&A.px<=maxEntry,tgt:A.R[0]}; }
  if(A.R[0]){ const stop=A.R[0]*(1+0.0025); const minEntry=stop/(1+maxStop); z.short={stop,hi:A.R[0]*0.9995,lo:minEntry,ok:minEntry<=A.R[0]*0.9995,inZone:A.px<=A.R[0]*0.9995&&A.px>=minEntry,tgt:A.S[0]}; }
  return z;
}

// Volume profile (fixed range k[s0..s1]): each candle's quote volume is spread evenly over the rows its high–low touches
// (the same approximation charting platforms use per lower-timeframe bar; with 1m bars it is close to tick data).
// POC = row with the most volume (tie → the row nearest the profile's centre). Value area = 70% of volume, built from the POC outward
// by the CBOT rule: compare the next two rows above with the next two below and add the larger pair. HVN/LVN: local peaks/troughs
// of the smoothed profile. buy = taker-buy quote volume, so each row also has a delta.
function volProfile(k, s0, s1, opt){
  opt=opt||{}; let lo=Infinity, hi=-Infinity; for(let i=s0;i<=s1;i++){ lo=Math.min(lo,k[i].l); hi=Math.max(hi,k[i].h); }
  const n=opt.bins||48, w=(hi-lo)/n||1e-12, vol=new Array(n).fill(0), buy=new Array(n).fill(0);
  for(let i=s0;i<=s1;i++){ const c=k[i]; const a=Math.max(0,Math.min(n-1,Math.floor((c.l-lo)/w))), b=Math.max(0,Math.min(n-1,Math.ceil((c.h-lo)/w)-1)); const m=Math.max(a,b)-a+1; const sh=c.q/m, sb=(c.tb||0)/m; for(let x=a;x<a+m;x++){ vol[x]+=sh; buy[x]+=sb; } }
  const total=vol.reduce((x,y)=>x+y,0); const mid=(n-1)/2;
  let best=0; for(let x=1;x<n;x++) if(vol[x]>vol[best]+1e-12 || (Math.abs(vol[x]-vol[best])<=1e-12 && Math.abs(x-mid)<Math.abs(best-mid))) best=x;
  let up=best, dn=best, acc=vol[best]; const tgt=(opt.va||0.7)*total;
  while(acc<tgt && (up<n-1||dn>0)){ const u=(up<n-1?vol[up+1]:0)+(up<n-2?vol[up+2]:0), d=(dn>0?vol[dn-1]:0)+(dn>1?vol[dn-2]:0);
    if(u>=d&&up<n-1){ const st=Math.min(2,n-1-up); for(let q=1;q<=st;q++) acc+=vol[up+q]; up+=st; } else if(dn>0){ const st=Math.min(2,dn); for(let q=1;q<=st;q++) acc+=vol[dn-q]; dn-=st; } else { const st=Math.min(2,n-1-up); for(let q=1;q<=st;q++) acc+=vol[up+q]; up+=st; } }
  const sm=vol.map((v,x)=>(vol[x-1]??v)*0.25+v*0.5+(vol[x+1]??v)*0.25); const hvn=[], lvn=[];
  for(let x=1;x<n-1;x++){ if(sm[x]>sm[x-1]&&sm[x]>=sm[x+1]&&sm[x]>=total/n*1.3) hvn.push(lo+(x+0.5)*w); if(sm[x]<sm[x-1]&&sm[x]<=sm[x+1]&&sm[x]<=total/n*0.6&&x>dn&&x<up) lvn.push(lo+(x+0.5)*w); }
  return {lo,hi,w,rows:vol.map((v,x)=>({p:lo+(x+0.5)*w,v,buy:buy[x]})),total,poc:lo+(best+0.5)*w,vah:lo+(up+1)*w,val:lo+dn*w,hvn,lvn,s0,s1};
}
function pocOf(k, s0, s1, bins){ const v=volProfile(k,s0,s1,{bins:bins||24}); return {poc:v.poc, lo:v.lo, hi:v.hi, vah:v.vah, val:v.val}; }
// Daily (UTC session) profiles from candles k: [{day,t0,t1,s0,s1,open,close,poc,vah,val,naked}]. naked: the POC has not been traded
// through by any later candle up to `at` (a "virgin"/naked POC). Only complete sessions, plus the running one when withCurrent.
function sessionProfiles(k, at, opt){
  opt=opt||{}; at=at??k.length; const out=[]; let s0=0;
  for(let i=1;i<=at;i++){ const d0=Math.floor(k[i-1].t/86400e3), d1=i<at?Math.floor(k[i].t/86400e3):null;
    if(d1!==d0){ const done=i<at || k[i-1].t+ (k[1]?k[1].t-k[0].t:9e5) >= (d0+1)*86400e3; if((done||opt.withCurrent) && i-s0>=Math.max(4,opt.minBars||0)){ const v=volProfile(k,s0,i-1,{bins:opt.bins||48}); out.push({day:new Date(d0*86400e3).toISOString().slice(0,10),t0:d0*86400e3,s0,s1:i-1,open:k[s0].o,close:k[i-1].c,poc:v.poc,vah:v.vah,val:v.val,hvn:v.hvn,lvn:v.lvn,current:!done,prof:opt.rows?v:null}); } s0=i; } }
  for(const p of out){ if(p.current){ p.naked=null; continue; } let hit=false; for(let j=p.s1+1;j<at;j++){ if(k[j].l<=p.poc&&k[j].h>=p.poc){ hit=true; break; } } p.naked=!hit; }
  return out;
}
// Finds the latest box-theory sequence for one direction in candles k (15m). Returns the stage reached and the trade plan.
function boxTheory(k, med15, dir, from, to){
  const isL=dir==="long"; const n=to??k.length; const start=from??Math.max(30,n-220);
  const W=20, tol=Math.max(0.012, 2.5*med15); // box: 20 candles whose total range stays within tol
  let best=null;
  for(let e=start+W; e<n-2; e++){
    const s0=e-W+1; let lo=Infinity,hi=-Infinity; for(let i=s0;i<=e;i++){ lo=Math.min(lo,k[i].l); hi=Math.max(hi,k[i].h); }
    const mid=(lo+hi)/2; if((hi-lo)/mid>tol) continue;
    const prof=pocOf(k,s0,e); const poc=prof.poc;
    // manipulation: within the next 12 candles a sweep beyond the box edge by at least 0.3×tol
    let sw=-1, swPx=null;
    for(let j=e+1;j<Math.min(n,e+13);j++){ if(isL ? k[j].l<lo*(1-0.3*tol) : k[j].h>hi*(1+0.3*tol)){ const px=isL?k[j].l:k[j].h; if(sw<0 || (isL? px<swPx : px>swPx)){ sw=j; swPx=px; } } if(sw>=0 && (isL? k[j].c>poc : k[j].c<poc)) break; }
    if(sw<0) continue;
    // extend the sweep extreme while price keeps going
    for(let j=sw+1;j<Math.min(n,sw+8);j++){ if(isL? k[j].l<swPx : k[j].h>swPx){ swPx=isL?k[j].l:k[j].h; sw=j; } else break; }
    // reclaim: a close back across the POC within 12 candles after the sweep
    let rc=-1; for(let j=sw+1;j<Math.min(n,sw+13);j++){ if(isL? k[j].c>poc : k[j].c<poc){ rc=j; break; } }
    const cand={s0,e,lo,hi,poc,sw,swPx,rc,stage:rc<0?"manip":"reclaim",rt:-1,entry:null,stop:null,target:null};
    if(rc>=0){
      // retest: within 16 candles after the reclaim, price touches the POC (±0.15% / within 0.3×median range) and closes on the right side
      const tolT=Math.max(0.0015, 0.3*med15);
      for(let j=rc+1;j<Math.min(n,rc+17);j++){ const touch = isL ? (k[j].l<=poc*(1+tolT) && k[j].c>=poc*(1-tolT)) : (k[j].h>=poc*(1-tolT) && k[j].c<=poc*(1+tolT)); if(touch){ cand.rt=j; break; } if(isL? k[j].c<poc*(1-2*tolT) : k[j].c>poc*(1+2*tolT)) break; }
      if(cand.rt>=0){ cand.stage="retest"; const t=k[cand.rt]; cand.entry=poc; cand.stop = isL ? Math.min(t.l, poc*(1-0.002))*(1-0.0005) : Math.max(t.h, poc*(1+0.002))*(1+0.0005); cand.target = isL ? hi : lo; cand.rr = Math.abs(cand.target-cand.entry)/Math.abs(cand.entry-cand.stop); }
      else if(n-1-rc<=16) cand.stage="waitRetest"; else cand.stage="expired";
    } else if(n-1-sw>12) cand.stage="expired";
    best=cand; // keep the latest sequence
  }
  return best;
}
// Backtest the sequence over the whole 15m history: did the target hit before the stop (within 48 candles after the retest)?
function boxTheoryStats(k, med15, dir){
  const isL=dir==="long"; const n=k.length; const out={n:0,win:0,lose:0,open:0,rrs:[]};
  let i=50;
  while(i<n-60){
    const b=boxTheory(k,med15,dir,i,Math.min(n,i+120));
    if(!b || b.stage!=="retest"){ i+=20; continue; }
    if(b.rr<1.2){ i=b.rt+1; continue; }
    out.n++; out.rrs.push(b.rr);
    let res="open";
    for(let j=b.rt+1;j<Math.min(n,b.rt+49);j++){ const c=k[j]; if(isL){ if(c.l<=b.stop){ res="lose"; break; } if(c.h>=b.target){ res="win"; break; } } else { if(c.h>=b.stop){ res="lose"; break; } if(c.l<=b.target){ res="win"; break; } } }
    out[res]++; i=b.rt+1;
  }
  return out;
}

function killZone(ms){ const h=new Date(ms).getUTCHours()+new Date(ms).getUTCMinutes()/60; if(h>=7&&h<10) return "Londra"; if(h>=12.5&&h<16) return "New York"; if(h>=0&&h<2) return "Asya açılışı"; return null; }
function swingsOf(k, w, from, to){ const H=[],L=[]; for(let i=Math.max(w,from);i<to-w;i++){ let ph=true,pl=true; for(let d=1;d<=w;d++){ if(k[i].h<=k[i-d].h||k[i].h<=k[i+d].h) ph=false; if(k[i].l>=k[i-d].l||k[i].l>=k[i+d].l) pl=false; } if(ph) H.push({i,p:k[i].h}); if(pl) L.push({i,p:k[i].l}); } return {H,L}; }
// Liquidity pools visible at candle index `at` (exclusive): equal lows/highs, single swings, previous-day high/low, Asian range, accumulation box.
// Each pool carries `i` = the candle that formed its extreme, and only untaken liquidity is returned: if any candle after `i` and before `at`
// already traded beyond the level (≥0.05%), the stops resting there are gone and the level is no longer a pool (6 Oct 2026 audit:
// 72% of detected "sweeps" were of already-taken levels; previous-day, Asian and box pools carried i=at-1 and could never be swept).
function poolsAt(k, k1d, med15, at){
  const tolEq=Math.max(0.001,0.25*med15); const out=[];
  const sw=swingsOf(k,3,Math.max(0,at-192),at);
  const cluster=(arr,type)=>{ const s=[...arr].sort((a,b)=>a.p-b.p); let g=[]; const flush=()=>{ if(!g.length) return; const avg=g.reduce((a,x)=>a+x.p,0)/g.length; out.push({p:avg,type,name:g.length>=2?(type==="low"?"eşit dipler":"eşit tepeler")+" ×"+g.length:(type==="low"?"swing dip":"swing tepe"),w:g.length>=2?3:1,i:Math.max(...g.map(x=>x.i))}); g=[]; }; for(const x of s){ if(g.length && Math.abs(x.p/g[0].p-1)>tolEq) flush(); g.push(x); } flush(); };
  cluster(sw.L,"low"); cluster(sw.H,"high");
  const tAt=k[Math.min(at,k.length-1)].t;
  // index of the 15m candle that printed extreme p inside [t0,t1); -1 when that stretch is not in the 15m history
  const idxOf=(t0,t1,p,isLow)=>{ let f=-1; for(let i=Math.max(0,at-200);i<Math.min(at,k.length);i++){ const c=k[i]; if(c.t<t0) continue; if(c.t>=t1) break; if(f<0) f=i; if(isLow? c.l<=p*(1+1e-9) : c.h>=p*(1-1e-9)) return i; } return f; };
  // previous UTC day high/low from daily candles that closed before `at`
  const prevD=k1d.filter(d=>d.t+86400e3<=tAt).slice(-1)[0];
  if(prevD){ const il=idxOf(prevD.t,prevD.t+86400e3,prevD.l,true), ih=idxOf(prevD.t,prevD.t+86400e3,prevD.h,false);
    if(il>=0) out.push({p:prevD.l,type:"low",name:"önceki gün dibi",w:3,i:il}); if(ih>=0) out.push({p:prevD.h,type:"high",name:"önceki gün tepesi",w:3,i:ih}); }
  // Asian range (00:00–07:00 UTC) of the current day, only once the session has closed: a new low during Asia is not a sweep of Asia
  const dayStart=Math.floor(tAt/86400e3)*86400e3;
  if(tAt>=dayStart+7*3600e3){ let lo=-1,hi=-1; for(let i=Math.max(0,at-130);i<Math.min(at,k.length);i++){ const c=k[i]; if(c.t<dayStart||c.t>=dayStart+7*3600e3) continue; if(lo<0||c.l<k[lo].l) lo=i; if(hi<0||c.h>k[hi].h) hi=i; }
    if(lo>=0&&hi>=0&&(k[lo].t-dayStart)>=0){ out.push({p:k[lo].l,type:"low",name:"Asya dibi",w:3,i:lo}); out.push({p:k[hi].h,type:"high",name:"Asya tepesi",w:3,i:hi}); } }
  // adaptive accumulation box ending just before `at`: extend backwards while the range stays within tol (16–60 candles)
  const tol=Math.max(0.012,2.5*med15); let lo=Infinity,hi=-Infinity,len=0,ilo=-1,ihi=-1;
  for(let i=at-1;i>=Math.max(0,at-60);i--){ const nlo=Math.min(lo,k[i].l), nhi=Math.max(hi,k[i].h); if((nhi-nlo)/((nhi+nlo)/2)>tol) break; if(k[i].l<lo) ilo=i; if(k[i].h>hi) ihi=i; lo=nlo; hi=nhi; len++; }
  if(len>=16){ out.push({p:lo,type:"low",name:"kutu dibi ("+len+" mum)",w:2,i:ilo,box:{lo,hi,len,s0:at-len,e:at-1}}); out.push({p:hi,type:"high",name:"kutu tepesi ("+len+" mum)",w:2,i:ihi}); }
  // drop taken liquidity
  return out.filter(p=>{ const isL=p.type==="low"; const lv=isL?p.p*(1-0.0005):p.p*(1+0.0005); for(let j=Math.max(0,p.i+1);j<Math.min(at,k.length);j++){ if(isL? k[j].l<lv : k[j].h>lv) return false; } return true; });
}
function cvdSeries(k){ const c=new Array(k.length); let s=0; for(let i=0;i<k.length;i++){ s+= (2*(k[i].tb||0) - k[i].q); c[i]=s; } return c; }
// Detects the latest AMD sequence for one direction. maps: {oi:Map ts→OI value, tk:Map ts→taker ratio} (may be empty).
function amdDetect(k, k1d, med15, dir, maps, bias, nowIdx, lock){
  const isL=dir==="long"; const n=nowIdx??k.length; const cvd=cvdSeries(k);
  const bodyMed=(()=>{ const a=k.slice(Math.max(0,n-96),n).map(c=>Math.abs(c.c-c.o)/c.c).sort((x,y)=>x-y); return a[Math.floor(a.length/2)]||1e-9; })();
  const res={dir,bias,stage:"none",checks:[],grade:"C"};
  if(bias!==(isL?"up":"down")){ res.stage="noBias"; return res; }
  // scan the last 48 candles for the most recent valid sweep of a pool on the manipulation side
  let best=lock?{pool:lock.pool,sw:lock.sw,back:lock.back,ext:lock.ext}:null;
  for(let i=Math.max(20,n-48);!lock && i<n-1;i++){
    const pools=poolsAt(k,k1d,med15,i).filter(p=>p.type===(isL?"low":"high") && p.i<i-1);
    for(const p of pools){
      const beyond = isL ? k[i].l<p.p*(1-0.0005) : k[i].h>p.p*(1+0.0005);
      if(!beyond) continue;
      // close back on the inside within 2 candles (the sweep candle itself or the next)
      let back=-1; for(let j=i;j<=Math.min(n-1,i+1);j++){ if(isL? k[j].c>p.p : k[j].c<p.p){ back=j; break; } }
      if(back<0) continue;
      let ext=isL?k[i].l:k[i].h; for(let j=i+1;j<=back;j++){ ext=isL?Math.min(ext,k[j].l):Math.max(ext,k[j].h); }
      const cand={pool:p,sw:i,back,ext};
      // the same sweep seen from a later candle (reclaim bar still beyond the pool): keep the first candle, extend the extreme
      if(best && Math.abs(p.p/best.pool.p-1)<=0.002 && i-best.back<=1){ best.ext=isL?Math.min(best.ext,ext):Math.max(best.ext,ext); best.back=Math.max(best.back,back); continue; }
      if(!best || p.w>best.pool.w || (p.w===best.pool.w && i>best.sw)) best=cand;
    }
  }
  if(!best){ res.stage="noSweep"; return res; }
  Object.assign(res,{pool:best.pool,sw:best.sw,back:best.back,swPx:best.ext,kz:killZone(k[best.sw].t)});
  // --- order-flow checks at the sweep ---
  const checks=[]; let ofScore=0;
  // CVD absorption: price takes out the pool low but CVD at the sweep is not lower than at the pool's own low
  const pi=Math.max(0,best.pool.i); const absorb = isL ? cvd[best.back]>=cvd[pi] : cvd[best.back]<=cvd[pi]; // price took the pool, but by the reclaim the cumulative delta is back above where it stood at the pool
  checks.push({k:"CVD emilimi",ok:absorb,txt:absorb?"fiyat havuzu aldı ama CVD yeni dip yapmadı: satış emiliyor":"CVD fiyatla birlikte yeni dip yaptı: satış gerçek"}); if(absorb) ofScore++;
  // delta flip on the reclaim candle
  const rb=k[best.back]; const flip = rb.q>0 && (isL ? rb.tb/rb.q>0.52 : rb.tb/rb.q<0.48);
  checks.push({k:"Geri alım mumunda delta",ok:flip,txt:flip?(isL?"alıcı taraf baskın":"satıcı taraf baskın"):"geri alım mumunda agresif taraf zayıf"}); if(flip) ofScore++;
  // open interest flushed during the sweep (positions forced out) and not expanding against
  const oiA=maps.oi.get(k[best.sw].t), oiB=maps.oi.get(k[Math.max(0,best.sw-4)].t), oiC=maps.oi.get(k[Math.min(n-1,best.back+1)].t);
  if(oiA&&oiB){ const flushed=oiA<oiB*0.995; checks.push({k:"OI",ok:flushed,txt:flushed?"süpürmede OI düştü: pozisyonlar temizlendi (likidasyon)":"süpürmede OI düşmedi: temizlenme yok, kırılma riski"}); if(flushed) ofScore++; if(oiC&&oiC>oiA*1.003) { checks.push({k:"OI (sonrası)",ok:true,txt:"geri alımdan sonra OI artıyor: yeni pozisyon giriyor"}); } }
  else checks.push({k:"OI",ok:null,txt:"OI verisi bu mum için yok"});
  const tk=maps.tk.get(rb.t); if(tk){ const ok=isL?tk>1:tk<1; checks.push({k:"Agresif alıcı/satıcı",ok,txt:(isL?"alıcı":"satıcı")+" oranı "+fx(tk,2)}); if(ok) ofScore++; }
  res.checks=checks; res.ofScore=ofScore;
  // --- MSS: close beyond the intermediate high (long) formed before the sweep, with displacement ---
  const lookA=Math.max(0,best.sw-12), lookB=best.sw;
  let ih=isL?-Infinity:Infinity, ihi=-1; for(let j=lookA;j<=lookB;j++){ if(isL? k[j].h>ih : k[j].l<ih){ ih=isL?k[j].h:k[j].l; ihi=j; } }
  res.mssLevel=ih;
  let m=-1; for(let j=best.back;j<n;j++){ const c=k[j]; const disp=(Math.abs(c.c-c.o)/c.c)>=1.5*bodyMed; if((isL? c.c>ih : c.c<ih) && disp){ m=j; break; } if(isL? c.l<best.ext : c.h>best.ext){ res.stage="failed"; res.failAt=j; return res; } }
  if(m<0){ res.stage="waitMSS"; res.ext=best.ext; return res; }
  res.mss=m;
  // FVG left by the displacement (3-candle gap)
  const fvg = m>=1 && m+1<n && (isL ? k[m+1].l>k[m-1].h : k[m+1].h<k[m-1].l);
  res.fvg=fvg; if(fvg) res.fvgZone=isL?[k[m-1].h,k[m+1].l]:[k[m+1].h,k[m-1].l];
  // leg from the sweep extreme to the running post-MSS extreme; the OTE zone is recomputed causally as the leg grows,
  // so the first candle that dips into the zone is the touch (no look-ahead: targets come from the pools known at the MSS)
  const L=best.ext; let H=isL?k[m].h:k[m].l, legIdx=m;
  const zoneFor=(HH)=>{ const a=isL? HH-0.79*(HH-L) : HH+0.79*(L-HH), b=isL? HH-0.62*(HH-L) : HH+0.62*(L-HH); return [Math.min(a,b), Math.max(a,b)]; }; // OTE band only: a limit order sits at the 62% level
  const tp=poolsAt(k,k1d,med15,m+1).filter(p=>p.type===(isL?"high":"low") && (isL? p.p>H*1.001 : p.p<H*0.999)).sort((a,b)=>isL?a.p-b.p:b.p-a.p);
  let touched=-1, zone=zoneFor(H);
  for(let j=m+1;j<n;j++){ const c=k[j]; if(isL? c.h>H : c.l<H){ H=isL?c.h:c.l; legIdx=j; zone=zoneFor(H); continue; } if(j>legIdx && (isL? c.l<=zone[1] : c.h>=zone[0])){ touched=j; break; } }
  res.zone=zone; res.stop=isL? L*(1-0.0015) : L*(1+0.0015); res.legHigh=H;
  // targets must still lie beyond the leg's final extreme (a pool the leg already ran through is consumed)
  const tpLeft=tp.filter(p=>isL? p.p>H*1.001 : p.p<H*0.999);
  res.t1=tpLeft[0]?tpLeft[0].p:(isL?H*1.01:H*0.99); res.t1name=tpLeft[0]?tpLeft[0].name:"leg ucu +1%"; const tp2=tpLeft.find(p=>Math.abs(p.p/res.t1-1)>0.003); res.t2=tp2?tp2.p:null; res.t2name=tp2?tp2.name:null;
  const entryRef=isL? zone[1] : zone[0]; res.entry=entryRef; /* fill reference: the 62% level, where the limit order rests */ res.rr1=Math.abs(res.t1-entryRef)/Math.abs(entryRef-res.stop); res.rr2=res.t2?Math.abs(res.t2-entryRef)/Math.abs(entryRef-res.stop):NaN;
  const px=k[n-1].c; const [zLo,zHi]=zone;
  if(touched>=0){ res.touched=touched; for(let j=touched;j<n;j++){ const c=k[j]; if(isL? c.l<=res.stop : c.h>=res.stop){ res.stage="stopped"; res.endAt=j; return res; } if(isL? c.h>=res.t1 : c.l<=res.t1){ res.stage="done"; res.endAt=j; return res; } } res.stage=(isL? (px>=zLo*0.998 && px<=zHi*1.004) : (px<=zHi*1.002 && px>=zLo*0.996))?"entry":"afterTouch"; }
  else res.stage = (n-1-m)<=16 ? "waitEntry" : "expired";
  // --- grade ---
  let g=0; if(best.pool.w>=3) g++; if(ofScore>=2) g++; if(absorb||flip) g++; if(res.kz) g++; if(res.rr1>=1.5) g++; if(fvg) g++;
  res.grade = (g>=5 && ofScore>=2 && res.rr1>=1.5) ? "A" : (g>=3 && ofScore>=1 && res.rr1>=1.2) ? "B" : "C"; res.gradePts=g;
  return res;
}
// backtest: every completed sequence in the history, graded with CVD-only order flow (OI/taker series are too short), outcome within 48 candles after the entry touch
function amdStats(k, k1d, med15, dir){
  const out={A:{n:0,win:0,rr:0},B:{n:0,win:0,rr:0},C:{n:0,win:0,rr:0},trades:[]}; const empty={oi:new Map(),tk:new Map()}; const seen=new Set();
  let i=120;
  while(i<k.length-60){
    const bias=(()=>{ const c=k.slice(i-96,i).map(x=>x.c); const a=c.slice(-20).reduce((x,y)=>x+y,0)/20, b=c.slice(-60,-40).reduce((x,y)=>x+y,0)/20; return a>b*1.005?"up":a<b*0.995?"down":"flat"; })();
    const r=amdDetect(k,k1d,med15,dir,empty,bias,i);
    if(!r.mss || r.stage==="failed" || r.stage==="noBias" || r.stage==="noSweep" || r.stage==="waitMSS" || !(r.rr1>=1.2)){ i+=4; continue; }
    const key=String(r.sw); if(seen.has(key)){ i+=4; continue; } seen.add(key); // one trade per sweep
    // run the same detector with the horizon extended by 48 candles: its own stage says how the trade ended (no look-ahead inside the detector)
    const rr=amdDetect(k,k1d,med15,dir,empty,bias,Math.min(k.length,i+48),{pool:r.pool,sw:r.sw,back:r.back,ext:r.swPx});
    const same = rr && rr.mss===r.mss;
    const t = same && rr.touched!=null ? rr.touched : -1;
    if(t<0){ i=Math.max(i+4, r.mss+1); continue; }
    const res = rr.stage==="done" ? "win" : rr.stage==="stopped" ? "lose" : "open";
    if(res!=="open"){ out[r.grade].n++; out[r.grade].rr+=r.rr1; if(res==="win") out[r.grade].win++; out.trades.push({g:r.grade,res,rr:r.rr1,kz:r.kz||null,t:k[r.sw].t}); }
    i=Math.max(i+4, t+1);
  }
  return out;
}

const HC_MAX_LEV=20, HC_RISK=0.01, FREE_RISK=0.02, HC_MAX_OPENS=2, HC_MAX_LOSSES=2;
const CONS_TXT={proven:["up","Kanıtlı"],promising:["warn","Umut var"],weak:["neutral","Zayıf"],avoid:["down","Kaçın"],unknown:["neutral","?"]};
// A+B kurulumların birleşik sonucu: bu coin bu yönde bu stratejiyle gerçekten para kazandırmış mı?
function consistencyOf(o){
  if(!o) return {tier:"unknown",n:0,wr:NaN,ev:NaN,lastT:null};
  const n=o.A.n+o.B.n, win=o.A.win+o.B.win, rr=o.A.rr+o.B.rr;
  const tr=(o.trades||[]).filter(t=>t.g!=="C"); const lastT=tr.length?Math.max(...tr.map(t=>t.t)):null;
  if(!n) return {tier:"weak",n:0,wr:NaN,ev:NaN,lastT};
  const wr=win/n, avg=rr/n, ev=wr*avg-(1-wr);
  const tier = (n>=5 && ev>=0.6 && wr>=0.45) ? "proven" : (n>=3 && ev>=0.25) ? "promising" : (n>=3 && ev<0) ? "avoid" : "weak";
  return {tier,n,wr,ev,lastT};
}
const consRank=c=>({proven:3,promising:2,weak:1,unknown:0,avoid:-1}[c?c.tier:"unknown"]);
function kzStats(trades){ const m={}; for(const t of (trades||[])){ if(t.g==="C") continue; const z=t.kz||"Kill zone dışı"; m[z]=m[z]||{n:0,win:0}; m[z].n++; if(t.res==="win") m[z].win++; } return m; }
const kzTR={"Londra":"10:00–13:00 TR","New York":"15:30–19:00 TR","Asya açılışı":"03:00–05:00 TR"};
function nextKillZone(){ const now=new Date(); const h=now.getUTCHours()+now.getUTCMinutes()/60; const zones=[[0,"Asya açılışı"],[7,"Londra"],[12.5,"New York"],[24,"Asya açılışı"]]; for(const [s,name] of zones){ if(s>h){ const mins=Math.round((s-h)*60); return name+" · "+(mins>=60?Math.floor(mins/60)+" sa "+(mins%60)+" dk":mins+" dk")+" sonra"; } } return ""; }
// stop mesafesine göre kaldıraç ve pozisyon büyüklüğü
function effLev(sd){ const cap = state.strat==="hc" ? Math.min(state.lev,HC_MAX_LEV) : state.lev; const ml = isFinite(sd) ? Math.max(1,Math.floor(1/(sd/0.6+0.005))) : cap; return Math.max(1,Math.min(cap,ml)); }
function posSize(sd){ const bal=state.bal||0; if(!(bal>0)||!isFinite(sd)||sd<=0) return null; const riskPct = state.strat==="hc"?HC_RISK:FREE_RISK; const risk=bal*riskPct; const lev=effLev(sd); const notional=risk/sd; const margin=notional/lev; return {risk,riskPct,lev,notional,margin}; }
/* --- işlem günlüğü (tarayıcıda saklanır) --- */
let journal=[]; try{ journal=JSON.parse(localStorage.getItem("rp-journal")||"[]"); if(!Array.isArray(journal)) journal=[]; }catch(e){ journal=[]; }
function jrSave(){ try{ localStorage.setItem("rp-journal",JSON.stringify(journal.slice(-200))); }catch(e){} }
const dayKey = ms => new Date(ms).toLocaleDateString("tr-TR");
function jrToday(){ const today=dayKey(Date.now()); const opens=journal.filter(e=>dayKey(e.t)===today); const losses=journal.filter(e=>e.closedAt && dayKey(e.closedAt)===today && e.r<0); const open=journal.filter(e=>e.status==="open"||e.status==="tp1"); return {opens:opens.length,losses:losses.length,open:open.length,openList:open}; }
function jrAdd(p){ journal.push({id:Date.now()+"-"+Math.random().toString(36).slice(2,6),t:Date.now(),sym:p.sym,dir:p.dir,lev:p.lev,entry:p.entry,stop:p.stop,t1:p.t1,t2:p.t2,rr1:p.rr1,rr2:p.rr2,status:"open",r:null,closedAt:null}); jrSave(); }
function jrSet(id,act){
  const e=journal.find(x=>x.id===id); if(!e) return;
  const rr1=e.rr1||1.5, rr2=e.rr2||rr1*1.5;
  if(act==="del"){ journal=journal.filter(x=>x.id!==id); }
  else if(act==="tp1"){ e.status="tp1"; }
  else if(act==="stop"){ e.r = e.status==="tp1" ? 0.5*rr1 : -1; e.status="closed"; e.closedAt=Date.now(); }
  else if(act==="tp2"){ e.r = e.status==="tp1" ? 0.5*rr1+0.5*rr2 : rr2; e.status="closed"; e.closedAt=Date.now(); }
  else if(act==="be"){ e.r = e.status==="tp1" ? 0.5*rr1 : 0; e.status="closed"; e.closedAt=Date.now(); }
  jrSave();
}
function jrStats(){ const c=journal.filter(e=>e.status==="closed"&&isFinite(e.r)).slice(-30); const n=c.length; if(!n) return null; const win=c.filter(e=>e.r>0).length; const sum=c.reduce((a,e)=>a+e.r,0); return {n,win,wr:win/n,sum,avg:sum/n}; }

function hcGates(A, dir){
  const isL=dir==="long"; const r=A.amd?A.amd[dir]:null; const g=[]; const td=jrToday(); const hc=state.strat==="hc";
  const trendOk = A.trend===(isL?"up":"down");
  g.push({k:"Günlük yön net",ok:trendOk,txt:trendOk?(isL?"günlük trend yukarı":"günlük trend aşağı"):A.trend==="flat"?"günlük trend yatay: model geçersiz":"günlük trend karşı yöne bakıyor"});
  const swept = !!(r&&r.pool);
  g.push({k:"Likidite süpürmesi",ok:swept,txt:swept?`${r.pool.name} süpürüldü (${tl(A.src.k15L[r.sw].t)})`:"son 12 saatte havuz süpürmesi yok: manipülasyon olmadan giriş yok"});
  const of=r&&r.ofScore>=2;
  g.push({k:"Emir akışı · 2+ teyit",ok:!!of,txt:r&&r.checks&&r.checks.length?`${r.ofScore} teyit (${r.checks.filter(c=>c.ok===true).map(c=>c.k).join(", ")||"yok"})`:"süpürme yokken ölçülemez"});
  const mss=!!(r&&r.mss!=null);
  g.push({k:"Yapı kırılımı (MSS)",ok:mss,txt:mss?`${fmtP(r.mssLevel)} gövdeyle kırıldı${r.fvg?", FVG var":""}`:r&&r.stage==="waitMSS"?"süpürme oldu, kırılım bekleniyor: erken girme":"kırılım yok"});
  const inZone=!!(r&&r.stage==="entry");
  g.push({k:"Fiyat giriş bölgesinde",ok:inZone,txt:inZone?`OTE ${fmtP(r.zone[0])} – ${fmtP(r.zone[1])}`:r&&r.stage==="waitEntry"?"MSS oldu, bölgeye dönüş bekleniyor: limit emir koy, kovalamak yok":r&&r.stage==="afterTouch"?"bölgeye dokundu ve çıktı: ilk dokunuş kaçtı":"bölge yok"});
  const kzNow=killZone(Date.now());
  const kzOk=!!(r&&r.kz);
  g.push({k:"Kill zone",ok:kzOk,txt:(kzOk?`süpürme ${r.kz} seansında`:"süpürme kill zone dışında: zayıf")+" · şu an "+(kzNow?kzNow+" ("+kzTR[kzNow]+")":"seans dışı, sonraki: "+nextKillZone())});
  const sd=r&&r.entry&&r.stop?Math.abs(r.entry/r.stop-1):NaN; const lev=effLev(sd); const fits=isFinite(sd)&&sd<=liqDist(lev)*0.6; const rrOk=!!(r&&r.rr1>=1.5);
  g.push({k:"Oran ≥ 1,5 ve stop sığıyor",ok:rrOk&&fits,txt:isFinite(sd)?`1'e ${fx(r.rr1,1)} · stop ${fx(sd*100,2)}% · ${lev}x ile ${fits?"sığıyor":"sığmıyor"}${hc&&state.lev>HC_MAX_LEV?" · tutarlılık modunda kaldıraç "+HC_MAX_LEV+"x ile sınırlı":""}`:"plan yok"});
  const c=A.cons?A.cons[dir]:null; const cOk=!!(c&&(c.tier==="proven"||c.tier==="promising"));
  g.push({k:"Coin tutarlılığı",ok:A.cons?cOk:null,txt:c&&c.n?`${CONS_TXT[c.tier][1]}: son 15 günde ${c.n} A/B kurulum, hedef %${Math.round(c.wr*100)}, beklenti ${c.ev>0?"+":""}${fx(c.ev,2)}R${c.lastT?" · son kurulum "+Math.round((Date.now()-c.lastT)/864e5)+" gün önce":""}`:"bu coinde kanıt yok: stratejinin çalıştığı coinlere sadık kal"});
  const crowdOk = isL ? (A.fund<=0.0005 && !A.distrib && !A.climax) : (A.fund>=-0.0005 && !A.accum && !A.capit);
  g.push({k:"Kalabalık karşı değil",ok:crowdOk,txt:crowdOk?"fonlama, büyük tüccarlar ve son mumlar engel değil":(isL?[A.fund>0.0005?"fonlama ısınmış":"",A.distrib?"büyükler dağıtıyor":"",A.climax?"climax mumu":""]:[A.fund<-0.0005?"shortlar fonlamada eziliyor":"",A.accum?"büyükler topluyor":"",A.capit?"kapitülasyon mumu":""]).filter(Boolean).join(", ")});
  const disc = !hc || (td.opens<HC_MAX_OPENS && td.losses<HC_MAX_LOSSES && td.open===0);
  g.push({k:"Günlük disiplin",ok:disc,txt:`bugün ${td.opens}/${HC_MAX_OPENS} işlem, ${td.losses}/${HC_MAX_LOSSES} kayıp, ${td.open} açık pozisyon${disc?"":" · bugün yeni işlem yok"}`});
  const open=g.filter(x=>x.ok===true).length; const all=g.every(x=>x.ok===true);
  return {gates:g,open,all,r,sd,lev};
}

const scan={ running:false, rows:[], prev:{}, cons:{}, sortK:"score", sortDir:-1, timer:null, info:null, infoAt:0 };
try{ scan.prev=JSON.parse(localStorage.getItem("rp-scan-prev")||"{}"); }catch(e){}
try{ scan.cons=JSON.parse(localStorage.getItem("rp-cons")||"{}"); const cut=Date.now()-6*3600e3; for(const k in scan.cons){ if(!scan.cons[k]||scan.cons[k].t<cut) delete scan.cons[k]; } }catch(e){ scan.cons={}; }
function consSave(){ try{ localStorage.setItem("rp-cons",JSON.stringify(scan.cons)); }catch(e){} }
function consPut(sym,A){ if(!A.cons) return; const slim=c=>({tier:c.tier,n:c.n,wr:c.wr,ev:c.ev,lastT:c.lastT}); scan.cons[sym]={L:slim(A.cons.long),S:slim(A.cons.short),t:Date.now()}; consSave(); }
async function universe(minVol){
  if(!scan.info || Date.now()-scan.infoAt>3600e3){ try{ scan.info=await j("/fapi/v1/exchangeInfo"); scan.infoAt=Date.now(); }catch(e){ if(!scan.info) scan.info={symbols:[]}; } }
  const ok=new Set(scan.info.symbols.filter(x=>x.contractType==="PERPETUAL"&&x.quoteAsset==="USDT"&&x.status==="TRADING").map(x=>x.symbol));
  if(!ok.size) for(const p of await j("/fapi/v1/premiumIndex")) if(/USDT$/.test(p.symbol)) ok.add(p.symbol); // exchangeInfo yoksa (yasak) mark listesinden
  const [tick,prem]=await Promise.all([j("/fapi/v1/ticker/24hr"),j("/fapi/v1/premiumIndex")]);
  const pm={}; prem.forEach(p=>pm[p.symbol]=p);
  return tick.filter(t=>ok.has(t.symbol)&&+t.quoteVolume>=minVol).sort((a,b)=>+b.quoteVolume-+a.quoteVolume).slice(0,120).map(t=>({t24:t,prem:pm[t.symbol]})).filter(x=>x.prem);
}
// yasak/bağlantı hatasında nötr değer (boş yanıt = Binance bu coinde veri vermiyor → yine atlanır)
async function jOr(path,def){ try{ return await j(path); }catch(e){ if(/yasağı|hız sınırı|bağlantı kurulamadı/.test(e.message)) return def; throw e; } }
async function scanOne(u){
  const s=u.t24.symbol;
  const [k1d,k4h,k1h,k15,k5,oi5,taker5,toppos,glob]=await Promise.all([
    j(`/fapi/v1/klines?symbol=${s}&interval=1d&limit=120`),
    j(`/fapi/v1/klines?symbol=${s}&interval=4h&limit=60`),
    j(`/fapi/v1/klines?symbol=${s}&interval=1h&limit=60`),
    j(`/fapi/v1/klines?symbol=${s}&interval=15m&limit=100`),
    j(`/fapi/v1/klines?symbol=${s}&interval=5m&limit=24`),
    jOr(`/futures/data/openInterestHist?symbol=${s}&period=5m&limit=24`,[{sumOpenInterestValue:"0",sumOpenInterest:"0"}]),
    jOr(`/futures/data/takerlongshortRatio?symbol=${s}&period=5m&limit=12`,[{buySellRatio:"1"}]),
    jOr(`/futures/data/topLongShortPositionRatio?symbol=${s}&period=5m&limit=8`,[{longShortRatio:"1"}]),
    jOr(`/futures/data/globalLongShortAccountRatio?symbol=${s}&period=5m&limit=8`,[{longShortRatio:"1"}])
  ]);
  if(k1d.length<60 || !oi5.length || !taker5.length || !toppos.length || !glob.length) return null;
  const f={t24:u.t24,prem:u.prem,k5:K(k5),k15:K(k15),oi5,taker5}, sl={k1d:K(k1d),k4h:K(k4h),k1h:K(k1h),toppos,glob};
  const A=analyze(f,sl);
  const row=rowOf(A,u); row._f=f; row._s=sl; if(typeof fcObserve==='function') fcObserve(u.t24.symbol,A,row.com); return row;
}
function rowOf(A,u){
  const s=u.t24.symbol; const p=scan.prev[s]; const delta=(p && Date.now()-p.t<90*60e3)?A.score-p.score:NaN;
  const cached=scan.cons[s]; const consL=A.cons?A.cons.long:(cached?cached.L:null), consS=A.cons?A.cons.short:(cached?cached.S:null);
  const L=A.amd&&A.amd.long, S=A.amd&&A.amd.short;
  return {s,px:A.px,c24:+u.t24.priceChangePercent,score:A.score,delta,setup:A.setup,pick:A.pick,setupS:A.setupS,pickS:A.pickS,pickHC:A.pickHC,pickHCS:A.pickHCS,deep:!!A.amdStats,
    gradeL:L?L.grade:null,stageL:L?L.stage:null,kzL:L?L.kz||null:null,gradeS:S?S.grade:null,stageS:S?S.stage:null,kzS:S?S.kz||null:null,consL,consS,
    maxLevL:A.maxLevL,maxLevS:A.maxLevS,capit:A.capit,trend:A.trend,distR:isFinite(A.distR)?A.distR*100:NaN,distS:isFinite(A.distS)?A.distS*100:NaN,fund:A.fund*100,oi1h:A.oi1h*100,volRel:A.volRel,qv:+u.t24.quoteVolume,bo:A.bo,climax:A.climax,distrib:A.distrib};
}
// ikinci geçiş: AMD dizisi ilerlemiş adaylar 15 günlük 15 dakikalık geçmişle yeniden analiz edilir (tutarlılık + tam havuz haritası)
const DEEP_STAGES=new Set(["entry","waitEntry","waitMSS","afterTouch"]);
async function scanDeep(r){
  const s=r.s;
  const [k15L,oi15,taker15]=await Promise.all([ j(`/fapi/v1/klines?symbol=${s}&interval=15m&limit=1500`), opt(`/futures/data/openInterestHist?symbol=${s}&period=15m&limit=200`), opt(`/futures/data/takerlongshortRatio?symbol=${s}&period=15m&limit=200`) ]);
  const kb=K(k15L); if(kb.length<600) return null;
  const A=analyze({...r._f,k15:kb},{...r._s,k15L:kb,oi15:oi15||null,taker15:taker15||null});
  consPut(s,A);
  const u={t24:r._f.t24,prem:r._f.prem}; const row=rowOf(A,u); row._f=r._f; row._s=r._s; if(typeof fcObserve==='function') fcObserve(s,A,row.com); return row;
}