/* ================= UI layer ================= */
const ui={dir:"long",dirPinned:false,drawerOpen:false,drawerTab:"scan",bell:false,snd:false,chart:null,candles:null,vols:null,lines:[],lastPx:null,first:true,symsFilled:false,sessTimer:null,lastF:null};
const LS=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,String(v)); }catch(e){ return null; } };
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const STAGE_TXT={noBias:["neutral","yön yok"],noSweep:["neutral","süpürme yok"],failed:["down","iptal"],waitMSS:["violet","süpürme · MSS bekliyor"],waitEntry:["cyan","MSS · bölge bekliyor"],entry:["up","bölgede"],afterTouch:["neutral","dokundu, dışarıda"],stopped:["down","stop yedi"],done:["up","hedefe gitti"],expired:["neutral","süre doldu"]};
const STAGE_ORD={entry:0,waitEntry:1,afterTouch:2,waitMSS:3,done:4,failed:5,stopped:6,expired:7,noSweep:8,noBias:9};
const GRADE_CLS={A:"up",B:"warn",C:"neutral"};

/* ---- small helpers ---- */
function tween(el,to,fmt,ms=450){
  const from=isFinite(el._v)?el._v:to; el._v=to; if(!isFinite(to)){ el.textContent="—"; return; }
  if(from===to){ el.textContent=fmt(to); return; }
  const t0=performance.now(); cancelAnimationFrame(el._raf);
  const step=now=>{ const p=Math.min(1,(now-t0)/ms); const e=1-Math.pow(1-p,3); el.textContent=fmt(from+(to-from)*e); if(p<1) el._raf=requestAnimationFrame(step); };
  el._raf=requestAnimationFrame(step);
}
function setSeg(id,v){ document.querySelectorAll(`#${id} button`).forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===v))); }
function toast(html){ const t=$("toast"); const d=document.createElement("div"); d.innerHTML=html; t.appendChild(d); setTimeout(()=>{ d.style.opacity="0"; d.style.transition="opacity .4s"; setTimeout(()=>d.remove(),450); },6000); }
function beep(){ if(!ui.snd) return; try{ const C=new (window.AudioContext||window.webkitAudioContext)(); const o=C.createOscillator(), g=C.createGain(); o.type="sine"; o.frequency.value=880; g.gain.value=0.0001; o.connect(g); g.connect(C.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.2,C.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001,C.currentTime+0.5); o.frequency.setValueAtTime(1320,C.currentTime+0.18); o.stop(C.currentTime+0.55); }catch(e){} }
function notify(title,body){ if(!ui.bell||!("Notification" in window)||Notification.permission!=="granted") return; try{ new Notification(title,{body,silent:!ui.snd}); }catch(e){} }
function spark(canvas,data,color,base){
  const dpr=window.devicePixelRatio||1; const W=canvas.clientWidth||72, H=canvas.clientHeight||26; canvas.width=W*dpr; canvas.height=H*dpr; const c=canvas.getContext("2d"); if(!c) return; c.scale(dpr,dpr); c.clearRect(0,0,W,H);
  const d=data.filter(isFinite); if(d.length<2) return; const lo=Math.min(...d,base??Infinity), hi=Math.max(...d,base??-Infinity); const sp=(hi-lo)||1;
  const x=i=>i/(d.length-1)*(W-2)+1, y=v=>H-2-(v-lo)/sp*(H-4);
  if(base!=null){ c.strokeStyle="rgba(255,255,255,.12)"; c.setLineDash([2,3]); c.beginPath(); c.moveTo(0,y(base)); c.lineTo(W,y(base)); c.stroke(); c.setLineDash([]); }
  const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,color.replace(")",",.35)").replace("rgb(","rgba(")); g.addColorStop(1,"rgba(0,0,0,0)");
  c.beginPath(); d.forEach((v,i)=>i?c.lineTo(x(i),y(v)):c.moveTo(x(i),y(v))); c.strokeStyle=color; c.lineWidth=1.6; c.lineJoin="round"; c.stroke();
  c.lineTo(x(d.length-1),H); c.lineTo(x(0),H); c.closePath(); c.fillStyle=g; c.fill();
}

/* ---- session pill ---- */
const ZONES=[{n:"Asya açılışı",a:0,b:2},{n:"Londra",a:7,b:10},{n:"New York",a:12.5,b:16}];
function sessionTick(){
  const now=new Date(); const h=now.getUTCHours()+now.getUTCMinutes()/60; const el=$("sess"); const fmtD=m=>m>=60?`${Math.floor(m/60)} sa ${m%60} dk`:`${m} dk`;
  const z=ZONES.find(z=>h>=z.a&&h<z.b);
  if(z){ el.className="sess on"; el.innerHTML=`<i></i><span><b>${z.n}</b> seansı · ${kzTR[z.n]} · ${fmtD(Math.round((z.b-h)*60))} kaldı</span>`; }
  else { const nx=ZONES.find(z=>z.a>h)||{...ZONES[0],a:24}; el.className="sess"; el.innerHTML=`<i></i><span>Seans dışı · sonraki <b>${nx.n}</b> ${fmtD(Math.round((nx.a-h)*60))} sonra</span>`; }
}

/* ---- head ---- */
function renderHead(A,f){
  $("hSym").firstChild.textContent=state.sym.replace("USDT","")+" "; $("hSym").querySelector("small").textContent="USDT PERP · BINANCE USDⓈ-M · 15 DK";
  const px=$("hPx"); px.classList.remove("sk"); const prev=ui.lastPx; tween(px,A.px,v=>fmtP(v));
  if(prev!=null&&prev!==A.px){ px.classList.remove("flash-up","flash-down"); void px.offsetWidth; px.classList.add(A.px>prev?"flash-up":"flash-down"); setTimeout(()=>px.classList.remove("flash-up","flash-down"),700); } ui.lastPx=A.px;
  const c24=+f.t24.priceChangePercent; $("hChg").innerHTML=chip(c24>0?"up":c24<0?"down":"neutral","24s "+pct(c24))+" "+chip("neutral",`aralık ${fmtP(f.t24.lowPrice)} – ${fmtP(f.t24.highPrice)}`);
  $("kMark").textContent=fmtP(A.mark);
  const fr=A.fund*100; $("kFund").innerHTML=`<span class="${fr>0.03?"warn":fr<-0.03?"up":""}">${fx(fr,4)}%</span>`;
  const mins=Math.max(0,Math.round((A.nextFund-Date.now())/60000)); $("kNext").textContent=tl(A.nextFund)+` (${mins>=60?Math.floor(mins/60)+" sa "+(mins%60)+" dk":mins+" dk"})`;
  $("kOI").innerHTML=`<span class="${A.oi1h>0.01?"up":A.oi1h<-0.01?"down":""}">${pct(A.oi1h*100)}</span>`;
  $("kTk").innerHTML=`<span class="${A.tkNow>1.1?"up":A.tkNow<0.9?"down":""}">${fx(A.tkNow,2)}</span>`;
  $("kTrend").innerHTML=A.trend==="up"?'<span class="up">Yükseliş ↗</span>':A.trend==="down"?'<span class="down">Düşüş ↘</span>':'<span class="muted">Yatay →</span>';
}

/* ---- chart ---- */
function ensureChart(){
  if(ui.chart) return true; const el=$("chart"); const LW=window.LightweightCharts; if(!LW){ el.innerHTML='<div class="empty">Grafik kütüphanesi yüklenemedi (internet?). Analiz çalışmaya devam eder.</div>'; return false; }
  const ch=LW.createChart(el,{layout:{background:{type:"solid",color:"#121821"},textColor:"#9aa7b5",fontFamily:"JetBrains Mono, monospace",fontSize:11},grid:{vertLines:{color:"#182029"},horzLines:{color:"#182029"}},rightPriceScale:{borderColor:"#1d2630"},timeScale:{borderColor:"#1d2630",timeVisible:true,secondsVisible:false,rightOffset:4},crosshair:{mode:0,vertLine:{color:"#39c6f2",labelBackgroundColor:"#1e2833"},horzLine:{color:"#39c6f2",labelBackgroundColor:"#1e2833"}},localization:{locale:"tr-TR"},handleScroll:true,handleScale:true});
  ui.candles=ch.addCandlestickSeries({upColor:"#2ee59d",downColor:"#ff5c6c",borderVisible:false,wickUpColor:"#2ee59d",wickDownColor:"#ff5c6c",priceFormat:{type:"price",precision:5,minMove:0.00001}});
  ui.vols=ch.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"",color:"#2a3542",lastValueVisible:false,priceLineVisible:false});
  ui.vols.priceScale().applyOptions({scaleMargins:{top:0.8,bottom:0}});
  ui.vpPrim=new VPPrim(); try{ ui.candles.attachPrimitive(ui.vpPrim); }catch(e){ ui.vpPrim=null; }
  ui.chart=ch; new ResizeObserver(()=>ch.applyOptions({width:el.clientWidth,height:el.clientHeight})).observe(el); ch.applyOptions({width:el.clientWidth,height:el.clientHeight});
  return true;
}
/* --- hacim profili çizimi: günün (UTC) profili grafiğin sağında yatay çubuklar; değer alanı koyu, POC beyaz. lightweight-charts series primitive --- */
class VPPrim{
  constructor(){ this.d=null; this.series=null; this.req=null; }
  attached(p){ this.series=p.series; this.req=p.requestUpdate; } detached(){ this.series=null; }
  set(d){ this.d=d; if(this.req) this.req(); } updateAllViews(){}
  paneViews(){ const self=this; return [{ zOrder:()=>"bottom", renderer:()=>({ draw:(target)=>{ const d=self.d, S=self.series; if(!d||!S) return;
    target.useBitmapCoordinateSpace(sc=>{ const ctx=sc.context, W=sc.bitmapSize.width, vr=sc.verticalPixelRatio; const max=Math.max(...d.rows.map(r=>r.v))||1; const span=W*0.25;
      for(const r of d.rows){ const y0=S.priceToCoordinate(r.p+d.w/2), y1=S.priceToCoordinate(r.p-d.w/2); if(y0==null||y1==null) continue; const top=Math.min(y0,y1)*vr, h=Math.max(1,Math.abs(y1-y0)*vr-1); const len=span*r.v/max;
        const inVa=r.p>=d.val&&r.p<=d.vah, isPoc=Math.abs(r.p-d.poc)<d.w/2; ctx.fillStyle=isPoc?"rgba(231,237,243,.55)":inVa?"rgba(57,198,242,.38)":"rgba(122,135,148,.24)"; ctx.fillRect(W-len,top,len,h);
        const bl=len*(r.v>0?r.buy/r.v:0.5); ctx.fillStyle=isPoc?"rgba(46,229,157,.0)":"rgba(46,229,157,.10)"; ctx.fillRect(W-len,top,bl,h); } }); } }) }]; }
}
// günün ve dünün 1 dk mumlarından profil (seçili coin, 5 dk önbellek); yoksa 15 dk profili kullanılır
ui.vp1m={};
async function vpRefresh(sym){ const c=ui.vp1m[sym]; if(c&&(c.busy||Date.now()-c.t<300e3)) return; ui.vp1m[sym]={...(c||{}),busy:true};
  try{ const d0=Math.floor(Date.now()/86400e3)*86400e3; const [a,b]=await Promise.all([j(`/fapi/v1/klines?symbol=${sym}&interval=1m&startTime=${d0-86400e3}&limit=1440`),j(`/fapi/v1/klines?symbol=${sym}&interval=1m&startTime=${d0}&limit=1440`)]);
    const k=K([...a,...b].filter((x,i,arr)=>i===0||x[0]>arr[i-1][0])); const P=sessionProfiles(k,k.length,{withCurrent:true,rows:true,bins:60});
    ui.vp1m[sym]={t:Date.now(),busy:false,today:P.find(p=>p.t0===d0)||null,prev:P.find(p=>p.t0===d0-86400e3&&!p.current)||null};
    if(state.lastA&&state.sym===sym&&ui.layers.vp) renderChart(state.lastA,ui.lastF); }
  catch(e){ ui.vp1m[sym]={t:Date.now(),busy:false,err:String(e.message||e)}; } }
const LAYERS={struct:"Yapı (HH/HL/LH/LL)",pools:"Havuzlar",vp:"Hacim profili",long:"Long planı",short:"Short planı",br:"Kırılım · FVG",box:"Kutu · POC",levels:"Seviyeler"};
ui.layers={struct:true,pools:true,vp:true,long:true,short:true,br:true,box:true,levels:true}; try{ Object.assign(ui.layers,JSON.parse(LS("st-layers")||"{}")); }catch(e){}
ui.segs=[];
function structureOf(k){
  // 15 dk mumlarda 3'lü swing'ler; ardışık tepeler HH/LH, dipler HL/LL olarak etiketlenir
  const sw=swingsOf(k,3,0,k.length); const pts=[...sw.H.map(x=>({...x,type:"H"})),...sw.L.map(x=>({...x,type:"L"}))].sort((a,b)=>a.i-b.i);
  const alt=[]; for(const p of pts){ const l=alt[alt.length-1]; if(l&&l.type===p.type){ if((p.type==="H"&&p.p>l.p)||(p.type==="L"&&p.p<l.p)) alt[alt.length-1]=p; } else alt.push(p); }
  let lastH=null,lastL=null; const out=[];
  for(const p of alt){ if(p.type==="H"){ p.lbl=lastH==null?"H":(p.p>lastH?"HH":"LH"); lastH=p.p; } else { p.lbl=lastL==null?"L":(p.p>lastL?"HL":"LL"); lastL=p.p; } out.push(p); }
  return out;
}
function renderChart(A,f){
  if(!ensureChart()) return;
  const k=(A.src.k15L&&A.src.k15L.length>200)?A.src.k15L.slice(-320):f.k15; const px=A.px; const prec=px<0.01?6:px<1?5:px<100?3:px<1000?2:0;
  ui.candles.applyOptions({priceFormat:{type:"price",precision:prec,minMove:Math.pow(10,-prec)}});
  const off=-new Date().getTimezoneOffset()*60; const T=t=>t/1000+off; const tLast=T(k[k.length-1].t);
  ui.candles.setData(k.map(c=>({time:T(c.t),open:c.o,high:c.h,low:c.l,close:c.c})));
  ui.vols.setData(k.map(c=>({time:T(c.t),value:c.q,color:c.c>=c.o?"rgba(46,229,157,.35)":"rgba(255,92,108,.35)"})));
  ui.lines.forEach(l=>ui.candles.removePriceLine(l)); ui.lines=[]; ui.segs.forEach(sr=>{ try{ ui.chart.removeSeries(sr); }catch(e){} }); ui.segs=[];
  const add=(p,color,title,style=2,w=1)=>{ if(!isFinite(p)) return; ui.lines.push(ui.candles.createPriceLine({price:p,color,lineWidth:w,lineStyle:style,axisLabelVisible:true,title})); };
  const seg=(t0,p,color,w=2,style=0)=>{ if(!isFinite(p)) return; const sr=ui.chart.addLineSeries({color,lineWidth:w,lineStyle:style,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false}); sr.setData([{time:t0,value:p},{time:tLast,value:p}]); ui.segs.push(sr); };
  const Ly=ui.layers; const kb=A.src.k15L||f.k15; const marks=[];
  if(Ly.levels){ if(A.R[0]) add(A.R[0],"#5b6b7c","D1",3); if(A.S[0]) add(A.S[0],"#5b6b7c","S1",3); }
  if(Ly.box){ add(A.boxHi,"#7c8794","10g kutu ↑",3); add(A.boxLo,"#7c8794","10g kutu ↓",3); for(const d of ["long","short"]){ const b=A.bt&&A.bt[d]; if(b&&b.stage!=="expired"&&(d==="long"?Ly.long:Ly.short)){ add(b.poc,"#e7edf3","POC "+(d==="long"?"L":"S"),1,1); if(kb[b.s0]) { seg(T(kb[b.s0].t),b.hi,"rgba(231,237,243,.45)",1,2); seg(T(kb[b.s0].t),b.lo,"rgba(231,237,243,.45)",1,2); } } } }
  if(Ly.pools){ const pools=poolsAt(kb,A.src.k1d||[],A.med15,kb.length); const top=t=>pools.filter(p=>p.type===t).sort((a,b)=>b.w-a.w||Math.abs(a.p/px-1)-Math.abs(b.p/px-1)).slice(0,3); for(const p of [...top("low"),...top("high")]) add(p.p,"#a78bfa",(p.type==="low"?"↓ ":"↑ ")+p.name,2,p.w>=3?1:1); }
  if(ui.vpPrim){ let vd=null;
    if(Ly.vp){ const m=ui.vp1m[state.sym]; vpRefresh(state.sym); const P=A.vp||[]; const today=(m&&m.today&&m.today.prof)?{...m.today,src:"1 dk"}:(P.find(p=>p.current)?{...P.find(p=>p.current),src:"15 dk"}:null); const prev=(m&&m.prev)?{...m.prev,src:"1 dk"}:(P.filter(p=>!p.current).slice(-1)[0]||null);
      if(today&&today.prof){ vd={...today.prof}; add(today.poc,"#e7edf3","POC (bugün)",0,1); add(today.vah,"#39c6f2","VAH",2,1); add(today.val,"#39c6f2","VAL",2,1); }
      if(prev){ add(prev.poc,"#c9d3dd","dün POC",1,1); add(prev.vah,"#2b8fb3","dün VAH",3,1); add(prev.val,"#2b8fb3","dün VAL",3,1); }
      for(const p of P.filter(p=>p.naked&&(!prev||p.day!==prev.day)).sort((a,b)=>Math.abs(a.poc/px-1)-Math.abs(b.poc/px-1)).slice(0,2)) add(p.poc,"#f2c94c","çıplak POC "+p.day.slice(5),1,1); }
    ui.vpPrim.set(vd); }
  for(const d of ["long","short"]){
    if(!(d==="long"?Ly.long:Ly.short)) continue; const r=A.amd&&A.amd[d]; if(!r||!r.pool) continue; const isL=d==="long"; const col=isL?"#2ee59d":"#ff8a3d"; const tag=isL?"L":"S";
    if(r.sw!=null&&kb[r.sw]) marks.push({time:T(kb[r.sw].t),position:isL?"belowBar":"aboveBar",color:"#a78bfa",shape:isL?"arrowUp":"arrowDown",text:"süpürme "+tag});
    if(isFinite(r.mssLevel)&&r.mss!=null){ if(kb[r.mss]) marks.push({time:T(kb[r.mss].t),position:isL?"aboveBar":"belowBar",color:"#39c6f2",shape:"circle",text:"MSS "+tag}); }
    if(r.zone&&r.mss!=null&&kb[r.mss]){ const t0=T(kb[r.mss].t); seg(t0,r.zone[0],col,1,2); seg(t0,r.zone[1],col,2,0); seg(t0,r.stop,"#ff5c6c",2,0); seg(t0,r.t1,col,1,3); add(r.zone[1],col,tag+" giriş · OTE 62%",0,1); add(r.zone[0],col,tag+" OTE 79%",2,1); add(r.stop,"#ff5c6c",tag+" stop",2,1); add(r.t1,col,tag+" hedef 1",3,1); if(r.t2) add(r.t2,col,tag+" hedef 2",3,1); }
    else if(r.stage==="waitMSS"&&isFinite(r.mssLevel)) add(r.mssLevel,"#39c6f2",tag+" MSS seviyesi",2,1);
    if(r.touched!=null&&kb[r.touched]) marks.push({time:T(kb[r.touched].t),position:isL?"belowBar":"aboveBar",color:col,shape:"square",text:"giriş "+tag});
  }
  if(Ly.br){ const r=A.br&&A.br[ui.dir]; if(r&&r.box&&kb[r.bo]){ const t0=T(kb[Math.max(0,r.bo-r.boxLen)].t); const tb=T(kb[r.bo].t); const bx=ui.chart.addLineSeries({color:"rgba(57,198,242,.6)",lineWidth:1,lineStyle:2,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false}); bx.setData([{time:t0,value:r.box[1]},{time:tb,value:r.box[1]}]); ui.segs.push(bx); const bx2=ui.chart.addLineSeries({color:"rgba(57,198,242,.6)",lineWidth:1,lineStyle:2,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false}); bx2.setData([{time:t0,value:r.box[0]},{time:tb,value:r.box[0]}]); ui.segs.push(bx2); marks.push({time:tb,position:ui.dir==="long"?"belowBar":"aboveBar",color:"#39c6f2",shape:ui.dir==="long"?"arrowUp":"arrowDown",text:"kırılım"}); if(r.fvg&&kb[r.bo+1]){ const tf=T(kb[r.bo+1].t); seg(tf,r.fvg[1],"#39c6f2",2,0); seg(tf,r.fvg[0],"#39c6f2",1,2); seg(tf,r.stop,"#ff5c6c",1,0); add(r.entry,"#39c6f2","FVG giriş",0,1); add(r.r2,"#39c6f2","2R",3,1); add(r.r3,"#39c6f2","3R",3,1); add(r.stop,"#ff5c6c","FVG stop",2,1); } } }
  if(Ly.struct){ const st=structureOf(k).slice(-16); const i0=kb.length-k.length; for(const p of st){ marks.push({time:T(k[p.i].t),position:p.type==="H"?"aboveBar":"belowBar",color:p.type==="H"?(p.lbl==="HH"?"#2ee59d":"#ff5c6c"):(p.lbl==="HL"?"#2ee59d":"#ff5c6c"),shape:"circle",size:0,text:p.lbl}); } }
  try{ ui.candles.setMarkers(marks.sort((a,b)=>a.time-b.time)); }catch(e){}
  $("legend").innerHTML=Object.keys(LAYERS).map(id=>`<span class="lg ${Ly[id]?"on":""}" data-l="${id}" style="pointer-events:auto;cursor:pointer"><i style="background:${{struct:"#2ee59d",pools:"#a78bfa",vp:"#39c6f2",long:"#2ee59d",short:"#ff8a3d",br:"#39c6f2",box:"#e7edf3",levels:"#5b6b7c"}[id]}"></i>${LAYERS[id]}</span>`).join("");
  $("legend").querySelectorAll(".lg").forEach(el=>el.addEventListener("click",()=>{ ui.layers[el.dataset.l]=!ui.layers[el.dataset.l]; LS("st-layers",JSON.stringify(ui.layers)); if(state.lastA) renderChart(state.lastA,ui.lastF); }));
  if(ui.first){ ui.chart.timeScale().setVisibleLogicalRange({from:k.length-96,to:k.length+6}); ui.first=false; }
}

/* ---- flow tiles ---- */
function renderFlow(A,f){
  const kb=A.src.k15L||f.k15; const cvd=cvdSeries(kb.slice(-64)); const cvdNow=last(cvd), cvdPrev=cvd[Math.max(0,cvd.length-5)];
  const oi=A.oi5, tk=A.tk5, tp=A.tp, fh=A.fundHist, vq=f.k5.map(c=>c.q);
  const tiles=[
    {k:"CVD · 16 saat",v:(cvdNow>=0?"+":"")+fmtUsd(cvdNow),d:cvdNow>cvdPrev?"son 1 saat alıcı":"son 1 saat satıcı",cls:cvdNow>cvdPrev?"up":"down",data:cvd,color:"rgb(57,198,242)"},
    {k:"Açık pozisyon",v:fmtUsd(A.oiNow),d:{newlong:"fiyat↑ OI↑ yeni long",shortcover:"fiyat↑ OI↓ short kapanıyor",newshort:"fiyat↓ OI↑ yeni short",longclose:"fiyat↓ OI↓ long kapanıyor",flat:"yatay"}[A.oiCase]+(A.oiBloat?" · şişiyor":""),cls:A.oiCase==="newlong"?"up":A.oiCase==="newshort"?"down":"",data:oi,color:"rgb(167,139,250)"},
    {k:"Agresif alıcı/satıcı",v:fx(A.tkNow,2),d:A.tk30>1.05?"30 dk alıcı baskın":A.tk30<0.95?"30 dk satıcı baskın":"dengede",cls:A.tk30>1.05?"up":A.tk30<0.95?"down":"",data:tk,color:"rgb(46,229,157)",base:1},
    {k:"Büyük tüccarlar L/S",v:fx(A.tpNow,2),d:A.distrib?"dağıtıyor":A.accum?"topluyor":(A.tpSlope>0.03?"long artırıyor":A.tpSlope<-0.03?"long azaltıyor":"sabit"),cls:A.distrib?"down":A.accum?"up":"",data:tp,color:"rgb(245,181,63)"},
    {k:"Fonlama geçmişi",v:fx(A.fund*100,4)+"%",d:A.fund>0.0003?"longlar ödüyor":A.fund<-0.0003?"shortlar ödüyor":"nötr",cls:A.fund>0.0003?"warn":A.fund<-0.0003?"up":"",data:fh.map(x=>x*100),color:"rgb(255,92,108)",base:0},
    {k:"Hacim 5 dk",v:"×"+fx(A.volRel,1),d:A.volRel>=1.5?"saatlik ortalamanın üstünde":A.volRel<0.6?"düşük hacim":"normal",cls:A.volRel>=1.5?"up":A.volRel<0.6?"down":"",data:vq,color:"rgb(103,116,130)"}
  ];
  const el=$("flow"); if(el.children.length!==tiles.length) el.innerHTML=tiles.map((t,i)=>`<div class="tile"><b></b><span class="v num"></span><canvas></canvas><span class="d"></span></div>`).join("");
  tiles.forEach((t,i)=>{ const d=el.children[i]; d.querySelector("b").textContent=t.k; const v=d.querySelector(".v"); v.textContent=t.v; v.className="v num "+t.cls; d.querySelector(".d").textContent=t.d; spark(d.querySelector("canvas"),t.data,t.color,t.base); });
}

/* ---- gates / plan / context ---- */
function pickDir(A){
  if(ui.dirPinned||state.mode!=="both"){ if(state.mode!=="both") ui.dir=state.mode; return; }
  const gl=hcGates(A,"long").open, gs=hcGates(A,"short").open; ui.dir = gs>gl ? "short" : gl>gs ? "long" : (A.trend==="down"?"short":"long");
}
function renderGates(A){
  document.querySelectorAll("#dirsw button").forEach(b=>{ b.setAttribute("aria-pressed",String(b.dataset.d===ui.dir)); b.disabled=state.mode!=="both"&&b.dataset.d!==state.mode; });
  const G=hcGates(A,ui.dir); const C=194.8; $("ringFg").style.strokeDashoffset=String(C*(1-G.open/10)); $("ringFg").style.stroke=G.all?"#2ee59d":G.open>=7?"#f5b53f":"#39c6f2"; $("ringTxt").textContent=G.open+"/10";
  const missing=G.gates.filter(g=>g.ok!==true).map(g=>g.k.toLowerCase());
  $("permit").innerHTML=G.all?`<span class="up">İşlem izni var</span><small>${ui.dir==="long"?"Long":"Short"} · plan sağda, limit emri koy</small>`:`Bekle<small>${missing.length<=3?"eksik: "+missing.join(", "):missing.length+" kapı kapalı"}</small>`;
  if(G.r&&G.r.pool&&live.sym===state.sym){ const side=ui.dir==="long"?"SELL":"BUY"; const lv=liqSum(live.liq,side,15*60e3); if(lv>0) G.gates[1].txt+=` · son 15 dk ${fmtUsd(lv)} ${ui.dir==="long"?"long":"short"} likide`; }
  $("gates").innerHTML=G.gates.map(g=>`<li class="${g.ok===true?"ok":g.ok===false?"no":""}"><i>${g.ok===true?"✓":g.ok===false?"✗":"·"}</i><div><b>${g.k}</b><span>${g.txt}</span></div></li>`).join("");
  return G;
}
function renderPlan(A,G){
  const r=G.r; const el=$("planBody"); const isL=ui.dir==="long"; $("planGrade").innerHTML=r&&r.mss!=null?chip(GRADE_CLS[r.grade],"Not "+r.grade+" · "+r.gradePts+" puan"):"";
  if(!r||!r.zone){
    const st=r?STAGE_TXT[r.stage]:null;
    el.innerHTML=`<div class="empty">${r&&r.stage==="waitMSS"?`Süpürme oldu (${fmtP(r.swPx)}). Şimdi ${fmtP(r.mssLevel)} seviyesinin gövdeyle ve yer değiştirmeyle kırılması bekleniyor; kırılmadan giriş yok. Süpürme dibi ${isL?"altına":"üstüne"} kapanış gelirse dizi iptal.`:r&&r.stage==="noBias"?"Günlük yön belirsiz: model geçersiz, bu coinde bugün izleme yok.":r&&r.stage==="noSweep"?"Son 12 saatte havuz süpürmesi yok. Manipülasyon olmadan giriş yok; eşit dipler/tepeler, önceki gün ucu ya da Asya aralığı süpürülünce dizi başlar.":r&&r.stage==="failed"?"Süpürme ucu kaybedildi: dizi iptal. Yeni bir süpürme bekle.":"Plan için önce süpürme ve yapı kırılımı gerekir."}</div>`; return;
  }
  const sd=G.sd, lev=G.lev, ps=posSize(sd); const st=STAGE_TXT[r.stageLive||r.stage];
  const already=jrToday().openList.some(e=>e.sym===state.sym&&e.dir===ui.dir);
  const jr=esc(JSON.stringify({sym:state.sym,dir:ui.dir,lev,entry:r.entry,stop:r.stop,t1:r.t1,t2:r.t2,rr1:r.rr1,rr2:isFinite(r.rr2)?r.rr2:null}));
  el.innerHTML=`<div style="margin-bottom:8px">${chip(st[0],st[1])} ${r.kz?chip("cyan",r.kz+" seansı"):chip("neutral","seans dışı süpürme")} ${r.fvg?chip("violet","FVG"):""}</div>
  <div class="plan">
    <div class="pv"><b>Giriş · limit</b><span>${fmtP(r.entry)}</span><small>OTE ${fmtP(r.zone[0])} – ${fmtP(r.zone[1])}</small></div>
    <div class="pv"><b>Stop</b><span class="down">${fmtP(r.stop)}</span><small>${fx(sd*100,2)}% · süpürme ucunun arkası</small></div>
    <div class="pv"><b>Hedef 1 · yarısı</b><span class="up">${fmtP(r.t1)}</span><small>${r.t1name} · 1'e ${fx(r.rr1,1)}</small></div>
    <div class="pv"><b>Hedef 2 · %30</b><span class="up">${r.t2?fmtP(r.t2):"—"}</span><small>${r.t2?r.t2name+" · 1'e "+fx(r.rr2,1):"kalan iz süren stop ile"}</small></div>
    <div class="pv"><b>Kaldıraç</b><span>${lev}x</span><small>${state.strat==="hc"&&state.lev>HC_MAX_LEV?"tutarlılık modu: en fazla "+HC_MAX_LEV+"x":"stop mesafesine göre"}</small></div>
    <div class="pv"><b>Pozisyon</b><span>${ps?fmtUsd(ps.notional):"—"}</span><small>${ps?`teminat ${fmtUsd(ps.margin)} · risk ${fmtUsd(ps.risk)} (%${Math.round(ps.riskPct*100)})`:"üstte bakiye yaz"}</small></div>
  </div>
  <dl class="kv" style="margin-top:8px"><dt>2R / 3R</dt><dd>${fmtP(isL?r.entry+2*Math.abs(r.entry-r.stop):r.entry-2*Math.abs(r.entry-r.stop))} / ${fmtP(isL?r.entry+3*Math.abs(r.entry-r.stop):r.entry-3*Math.abs(r.entry-r.stop))}</dd>${r.pivotZone?`<dt>Pivot bölgesi</dt><dd>${fmtP(r.pivotZone[0])} – ${fmtP(r.pivotZone[1])}</dd>`:""}${r.refZone?`<dt>Rafine bölge</dt><dd>${fmtP(r.refZone[0])} – ${fmtP(r.refZone[1])}</dd>`:""}${r.fvgZone?`<dt>MSS FVG · %50</dt><dd>${fmtP(r.fvgZone[0])} – ${fmtP(r.fvgZone[1])} · ${fmtP((r.fvgZone[0]+r.fvgZone[1])/2)}${(r.fvgZone[0]<=r.zone[1]&&r.fvgZone[1]>=r.zone[0])?' <span class="up">OTE ile çakışıyor</span>':""}</dd>`:""}</dl>
  <ul class="steps"><li>Limit emri ${fmtP(r.entry)}'e koy; kovalama, dolmazsa işlem yok.${r.refZone?" Daha derin ikinci emir: rafine bölge "+fmtP(isL?r.refZone[1]:r.refZone[0])+".":""}</li><li>Hedef 1'de yarısını kapat, stop'u girişe çek.</li><li>${r.t2?"Hedef 2'de %30 kapat; ":""}kalan %20 son 15 dk swing ${isL?"dibinin altında":"tepesinin üstünde"} iz süren stop.</li><li>Ekleme yalnızca hedef 1'den sonra, bir kez, yarım boy. Ortalama düşürme yok.</li></ul>
  <div style="margin-top:10px;display:flex;gap:8px;align-items:center">${already?'<span class="muted" style="font-size:12px">Bu plan günlükte açık.</span>':`<button type="button" class="primary" data-jr="${jr}">Günlüğe yaz</button>`}${G.all?"":'<span class="muted" style="font-size:11.5px">İzin yok; plan bilgi amaçlı.</span>'}</div>`;
}
const BR_STAGE={noBox:["neutral","Kutu kırılımı yok"],waitNext:["warn","Kırılım mumu · sonraki mum bekleniyor"],noFVG:["neutral","Kırılım var ama boşluk (FVG) yok · işlem yok"],failed:["down","Geri test FVG'yi geçti · iptal"],expired:["neutral","Geri test gelmedi · süre doldu"],waitRetest:["cyan","Kırıldı · FVG'ye geri test bekleniyor"],entry:["up","FVG'de · giriş"],afterTouch:["neutral","FVG'ye dokundu, dışarıda"],stopped:["down","Stop yedi"],done:["up","2R hedefe gitti"]};
function renderBR(A){
  const r=A.br&&A.br[ui.dir]; const el=$("brBody"); const k=A.src.k15L; const isL=ui.dir==="long";
  if(!r||r.stage==="noBox"){ el.innerHTML='<div class="empty">Son 18 saatte dar kutu + momentum kırılımı yok.</div>'; $("brGrade").innerHTML=""; return; }
  const st=BR_STAGE[r.stage]||["neutral",r.stage]; $("brGrade").innerHTML=r.fvg?chip(GRADE_CLS[r.grade],"Not "+r.grade):"";
  let html=`<div style="margin-bottom:6px">${chip(st[0],st[1])} ${r.aligned?chip("up sm","günlük yönle uyumlu"):chip("down sm","yöne karşı · alınmaz")} ${r.kz?chip("cyan sm",r.kz):""} ${r.volX?chip("neutral sm","hacim ×"+fx(r.volX,1)):""}</div><dl class="kv"><dt>Kutu (${r.boxLen} mum)</dt><dd>${fmtP(r.box[0])} – ${fmtP(r.box[1])}</dd><dt>Kırılım mumu</dt><dd>${k&&k[r.bo]?tl(k[r.bo].t):"—"}</dd>`;
  if(r.fvg){ const ps=posSize(r.sd); const lev=effLev(r.sd); html+=`<dt>FVG</dt><dd>${fmtP(r.fvg[0])} – ${fmtP(r.fvg[1])}</dd><dt>Giriş · limit (kenar)</dt><dd>${fmtP(r.entry)}</dd><dt>2. emir · %50</dt><dd>${fmtP(r.entry50)}</dd><dt>Stop</dt><dd class="down">${fmtP(r.stop)} (${fx(r.sd*100,2)}%)</dd><dt>Hedef 2R / 3R</dt><dd class="up">${fmtP(r.r2)} / ${fmtP(r.r3)}</dd><dt>Kaldıraç</dt><dd>${lev}x${ps?` · pozisyon ${fmtUsd(ps.notional)}`:""}</dd>`; }
  html+=`</dl>`;
  const S=A.brStats&&A.brStats[ui.dir]; if(S){ const ab={n:S.A.n+S.B.n,win:S.A.win+S.B.win}; if(ab.n) html+=`<p class="muted" style="margin:6px 0 0;font-size:11.5px">Bu coinde 15 günde ${ab.n} A/B kırılım geri testi, 2R'ye ulaşan %${Math.round(ab.win/ab.n*100)}${S.C.n?` · C: ${S.C.n} kurulum, %${Math.round(S.C.win/S.C.n*100)}`:""}.</p>`; }
  if(r.stage==="entry"){ const already=jrToday().openList.some(e=>e.sym===state.sym&&e.dir===ui.dir); const jr=esc(JSON.stringify({sym:state.sym,dir:ui.dir,lev:effLev(r.sd),entry:r.entry,stop:r.stop,t1:r.r2,t2:r.r3,rr1:2,rr2:3})); html+=`<div style="margin-top:8px">${already?'<span class="muted" style="font-size:12px">Günlükte açık.</span>':`<button type="button" class="primary" data-jr="${jr}">Günlüğe yaz</button>`} <span class="muted" style="font-size:11.5px">${r.aligned?"":"Yöne karşı: kurs kuralı gereği alınmaz."}</span></div>`; }
  el.innerHTML=html;
}
function renderRS(A){
  const r=A.rs&&A.rs[ui.dir]; const el=$("rsBody"); const gEl=$("rsGrade");
  if(!A.rs){ el.innerHTML='<div class="empty">BTC 15 dk verisi gelmedi; rejim kapıları hesaplanamıyor.</div>'; gEl.innerHTML=""; return; }
  if(!r||r.mss==null||!isFinite(r.entry)||!r.gates||!r.gates.length){ const st=(r&&STAGE_TXT[r.stage])||["neutral","—"]; el.innerHTML=`<div class="empty">Süpürme + yapı kırılımı dizisi tamamlanmadı (${st[1]}). Kurulum 3 ancak MSS'den sonra değerlendirilir.</div>`; gEl.innerHTML=""; return; }
  const stage=r.stageLive||r.stage; const st=STAGE_TXT[stage]||["neutral",stage]; gEl.innerHTML=chip(GRADE_CLS[r.grade],"Not "+r.grade);
  const gates=r.gates.map(g=>`<div style="display:flex;gap:8px;align-items:baseline;font-size:12px;margin:3px 0"><span class="${g.ok===true?"up":g.ok===false?"down":"muted"}" style="font-weight:700;min-width:12px">${g.ok===true?"✓":g.ok===false?"✗":"?"}</span><b style="min-width:150px">${g.k}</b><span class="muted">${g.txt}</span></div>`).join("");
  const ps=posSize(r.sd); const lev=effLev(r.sd);
  let html=`<div style="margin-bottom:6px">${chip(st[0],st[1])} ${chip(r.rsOk?"up sm":"down sm",r.rsOk?"rejim kapıları tamam":"kapı eksik · alınmaz")} ${r.kz?chip("cyan sm",r.kz):""}</div>${gates}
  <dl class="kv" style="margin-top:8px"><dt>Giriş · limit (OTE %62)</dt><dd>${fmtP(r.entry)}</dd><dt>Stop</dt><dd class="down">${fmtP(r.stop)} (${fx(r.sd*100,2)}% · ${fx(r.sd/r.atrRel,1)} ATR)</dd><dt>Hedef 1 · %50 · 1,5R</dt><dd class="up">${fmtP(r.tp1)} <span class="muted">sonra stop girişe</span></dd><dt>Koşucu · ${esc(r.runName||"")}</dt><dd class="up">${fmtP(r.run)} (1'e ${fx(r.rr2,1)})</dd><dt>Zaman stopu</dt><dd>dolumdan 32 mum (8 saat) sonra kapanıştan çık</dd><dt>Kaldıraç</dt><dd>${lev}x${ps?` · pozisyon ${fmtUsd(ps.notional)} · risk ${fmtUsd(ps.risk)}`:" · üstte bakiye yaz"}</dd></dl>`;
  const Q=A.rsStats&&A.rsStats[ui.dir]; if(Q){ const n=Q.A.n+Q.B.n, win=Q.A.win+Q.B.win, sum=(Q.A.sum||0)+(Q.B.sum||0); html+=`<p class="muted" style="margin:6px 0 0;font-size:11.5px">${n?`Bu coinde 15 günde ${n} kurulum 3 işlemi (komisyon dahil): hedef %${Math.round(win/n*100)} · toplam ${sum>=0?"+":""}${fx(sum,1)}R.`:"Bu coinde 15 günde kapıları geçen kurulum 3 işlemi yok."} 24 coinlik ortak test: +0,13R/işlem.</p>`; }
  if(r.rsOk&&stage==="entry"){ const already=jrToday().openList.some(e=>e.sym===state.sym&&e.dir===ui.dir); const jr=esc(JSON.stringify({sym:state.sym,dir:ui.dir,lev,entry:r.entry,stop:r.stop,t1:r.tp1,t2:r.run,rr1:1.5,rr2:r.rr2})); html+=`<div style="margin-top:8px">${already?'<span class="muted" style="font-size:12px">Günlükte açık.</span>':`<button type="button" class="primary" data-jr="${jr}">Günlüğe yaz</button>`}</div>`; }
  el.innerHTML=html;
}
function renderCtx(A){
  const tr={up:["up","Yükseliş"],down:["down","Düşüş"],flat:["neutral","Yatay"]}[A.trend]; const stT=A.st>=2?["up","yükselen dip/tepe"]:A.st<=-2?["down","alçalan dip/tepe"]:["neutral","karışık"];
  const bo={inside:"kutunun içinde",broke:"kutu tepesini kırdı",retest:"kırılımı geri test ediyor",failed:"kırılım başarısız oldu",below:"kutu dibinin altında"}[A.bo];
  $("ctxBody").innerHTML=`<dl class="kv">
    <dt>Günlük trend</dt><dd>${chip(tr[0],tr[1])}</dd>
    <dt>1 saatlik yapı</dt><dd>${chip(stT[0],stT[1])}</dd>
    <dt>Direnç / destek</dt><dd>${A.R[0]?fmtP(A.R[0])+" <span class='muted'>("+pct(A.distR*100)+")</span>":"—"} · ${A.S[0]?fmtP(A.S[0])+" <span class='muted'>(−"+fx(A.distS*100,1)+"%)</span>":"—"}</dd>
    <dt>10 günlük kutu</dt><dd>${fmtP(A.boxLo)} – ${fmtP(A.boxHi)} <span class="muted">· ${bo}</span></dd>
    <dt>90 gün aralığında</dt><dd>%${Math.round(A.pos90*100)} <span class="muted">(${A.pos90<0.3?"dibe yakın":A.pos90>0.7?"tepeye yakın":"ortada"})</span></dd>
    <dt>Emir defteri ±1%</dt><dd>${fmtUsd(A.bid1)} / ${fmtUsd(A.ask1)} ${(A.bid1+A.ask1)<6e5?'<span class="warn">ince</span>':""}</dd>
    <dt>Kalabalık</dt><dd>${A.distrib?'<span class="down">büyükler dağıtıyor</span>':A.accum?'<span class="up">büyükler topluyor</span>':"nötr"}${A.climax?' · <span class="warn">climax</span>':""}${A.capit?' · <span class="warn">kapitülasyon</span>':""}</dd>
    <dt>Tipik 15 dk mum</dt><dd>${fx(A.med15*100,2)}% <span class="muted">· 4s ${fx(A.atr4*100,1)}%</span></dd>
  </dl>`;
}
function renderBoxCard(A){
  const b=A.bt&&A.bt[ui.dir]; const k=A.src.k15L; const el=$("boxBody");
  if(!b||!k){ el.innerHTML='<div class="empty">Son ~55 saatte dar bir birikim kutusu ve kenar süpürmesi yok.</div>'; return; }
  const st=BT_STAGE[b.stage]; const S=A.btStats&&A.btStats[ui.dir];
  el.innerHTML=`<div style="margin-bottom:6px">${chip(st[0],st[1])}</div><dl class="kv"><dt>Kutu</dt><dd>${fmtP(b.lo)} – ${fmtP(b.hi)}</dd><dt>POC</dt><dd>${fmtP(b.poc)}</dd><dt>Süpürme</dt><dd>${fmtP(b.swPx)} <span class="muted">${tl(k[b.sw].t)}</span></dd>${b.entry?`<dt>Giriş / stop / hedef</dt><dd>${fmtP(b.entry)} / <span class="down">${fmtP(b.stop)}</span> / <span class="up">${fmtP(b.target)}</span> · 1'e ${fx(b.rr,1)}</dd>`:""}</dl>${S&&S.n>=5?`<p class="muted" style="margin:6px 0 0;font-size:11.5px">Bu coinde 15 günde ${S.n} POC geri testi, hedefe ulaşan %${Math.round(S.win/Math.max(1,S.win+S.lose)*100)}.</p>`:""}`;
}
const BT_STAGE={manip:["warn","Süpürme oldu · POC geri alımı bekleniyor"],reclaim:["neutral","POC geri alındı"],waitRetest:["cyan","Geri test bekleniyor"],retest:["up","Geri test · giriş"],expired:["neutral","Süre doldu"]};

/* ---- story & stats (drawer) ---- */
function renderStory(A){
  const st=storyOf(A); const el=$("story");
  if(!st||!st.items.length){ el.innerHTML='<li><span class="when">—</span><span></span><span class="ctx">Son 24 saatte anlamlı dönüş yok ya da geçmiş yetersiz.</span></li>'; return; }
  el.innerHTML=st.items.map(it=>`<li><span class="when">${tl(it.t)}</span><span>${chip(it.type==="top"?"down":"up",(it.type==="top"?"Tepe ":"Dip ")+fmtP(it.p))}</span><span class="ctx">${it.ctx.length?it.ctx.join(" · "):"belirgin bağlam yok"}<span class="next">→ ${it.after}</span></span></li>`).join("");
}
function renderStats(A){
  const S=statsOf(A); const el=$("stats"); const pc=(arr,f)=>Math.round(arr.filter(f).length/arr.length*100);
  const row=(label,arr,fn)=>{ const nn=arr.length; return nn<5?`<div class="stat"><b class="muted">${nn}</b><span>${label}: az veri.</span></div>`:`<div class="stat"><b>${nn}</b><span>${label}: ${fn(arr)}</span></div>`; };
  el.innerHTML=!S?'<div class="empty">Yeterli geçmiş yok.</div>':[
    row("Climax mumu (tepede, hacim 3×)",S.climax,a=>`%${pc(a,x=>x.down)}'inde 1 saatte ≥%1 geri çekilme; 4s medyan ${pctTxt(med(a.map(x=>x.r4)))}.`),
    row("Kapitülasyon mumu (dipte, hacim 3×)",S.capit,a=>`%${pc(a,x=>x.up)}'inde 1 saatte ≥%1 toparlanma; 4s medyan ${pctTxt(med(a.map(x=>x.r4)))}.`),
    row("24s tepe kırılımı",S.breakout,a=>`%${pc(a,x=>x.retest)} geri test · %${pc(a,x=>x.cont)} +%3 devam · %${pc(a,x=>x.fail)} başarısız.`),
    row("24s dip kırılımı",S.breakdown,a=>`%${pc(a,x=>x.retest)} geri test · %${pc(a,x=>x.cont)} −%3 devam · %${pc(a,x=>x.fail)} başarısız.`),
    row("OI şişmesi (fiyat yatay, OI +%5)",S.oiBloat,a=>`sonraki 1 saat medyan ${pctTxt(med(a.map(x=>x.r1)))}; %${pc(a,x=>x.r1<0)} düşüş.`)
  ].join("");
  const M=A.amdStats; const box=$("amdStatsBox"); if(!M){ box.innerHTML=""; return; }
  const line=d=>{ const o=M[d]; const f=g=>{ const x=o[g]; if(!x.n) return `${g}: yok`; const wr=x.win/x.n, rr=x.rr/x.n, ev=wr*rr-(1-wr); return `${g}: ${x.n} kurulum · hedef %${Math.round(wr*100)} · 1'e ${fx(rr,1)} · <span class="${ev>0.2?"up":ev<0?"down":"warn"}">${ev>0?"+":""}${fx(ev,2)}R</span>`; }; return `<b style="color:var(--ink)">${d==="long"?"Long":"Short"}</b> · ${f("A")} · ${f("B")} · ${f("C")}`; };
  const kzm={}; for(const d of ["long","short"]){ const z=kzStats(M[d].trades); for(const k in z){ kzm[k]=kzm[k]||{n:0,win:0}; kzm[k].n+=z[k].n; kzm[k].win+=z[k].win; } }
  const kzl=Object.keys(kzm).sort((a,b)=>kzm[b].n-kzm[a].n).map(k=>`${k}: ${kzm[k].n} kurulum, hedef %${Math.round(kzm[k].win/kzm[k].n*100)}`).join(" · ");
  const Q=A.rsStats; const rsLine=d=>{ const o=Q[d]; const n=o.A.n+o.B.n, win=o.A.win+o.B.win, sum=(o.A.sum||0)+(o.B.sum||0); return `<b style="color:var(--ink)">${d==="long"?"Long":"Short"}</b> · ${n?`${n} işlem · hedef %${Math.round(win/n*100)} · toplam <span class="${sum>0?"up":sum<0?"down":"warn"}">${sum>=0?"+":""}${fx(sum,1)}R</span>`:"kapıları geçen işlem yok"}`; };
  box.innerHTML=`<b style="color:var(--ink)">AMD · bu coinin son 15 günü (CVD teyidiyle):</b><br>${line("long")}<br>${line("short")}${kzl?`<br><b style="color:var(--ink)">Seansa göre (A/B):</b> ${kzl}`:""}<br><span class="muted">Beklenti = kazanma × ortalama oran − kaybetme (R). Gerçek kenar için +0,7R üstü ve 10+ örnek iste.</span>${Q?`<br><b style="color:var(--ink)">Kurulum 3 · rejimli süpürme, komisyon dahil (son 15 gün):</b><br>${rsLine("long")}<br>${rsLine("short")}`:""}`;
}

/* ---- feed ---- */
const feed={items:[],seen:{}}; try{ const f=JSON.parse(LS("st-feed")||"{}"); if(Array.isArray(f.items)) feed.items=f.items.slice(0,60); feed.seen=f.seen||{}; }catch(e){}
function feedSave(){ LS("st-feed",JSON.stringify({items:feed.items.slice(0,60),seen:feed.seen})); }
const KIND={entry:"GİRİŞ",near:"YAKIN",zone:"BÖLGE",sweep:"SÜPÜRME",liq:"LİKİDASYON",breakout:"KIRILIM",rejim:"REJİM"};
function pushSignal(s){
  const key=s.sym+"|"+s.dir+"|"+s.kind; const now=Date.now(); if(feed.seen[key]&&now-feed.seen[key]<2*3600e3) return false; feed.seen[key]=now;
  for(const k in feed.seen) if(now-feed.seen[k]>12*3600e3) delete feed.seen[k];
  feed.items.unshift({...s,t:now,fresh:true}); feed.items=feed.items.slice(0,60); feedSave();
  if(s.kind==="entry"){ toast(`<b>${s.sym.replace("USDT","")} ${s.dir==="long"?"long":"short"}</b> · giriş izni · not ${s.grade} · ${s.meta}`); beep(); notify(`SWEEP · ${s.sym.replace("USDT","")} ${s.dir==="long"?"LONG":"SHORT"} giriş`,s.meta); }
  return true;
}
function renderFeed(){
  const el=$("feed"); if(!feed.items.length){ el.innerHTML='<li class="empty" style="display:block;border:0;background:transparent">Tarayıcı ilk turunu bitirince sinyaller burada akar. Giriş izni (yeşil), yakın (sarı), bölge bekleyen (mavi), süpürme (mor).</li>'; return; }
  const now=Date.now();
  el.innerHTML=feed.items.map(s=>`<li class="k-${s.kind}" data-s="${s.sym}" data-d="${s.dir}"><span class="kind">${KIND[s.kind]}</span><span class="sym">${now-s.t<10*60e3?'<span class="new"></span>':""}${s.sym.replace("USDT","")} <span class="${s.dir==="long"?"up":"down"}" style="font-weight:600">${s.dir==="long"?"LONG":"SHORT"}</span></span><span class="when">${tl(s.t)}</span><span class="meta">${s.grade?chip(GRADE_CLS[s.grade]+" sm","Not "+s.grade):""}${s.kz?chip("cyan sm",s.kz):""}${s.cons?chip(CONS_TXT[s.cons][0]+" sm",CONS_TXT[s.cons][1]):""}<span>${s.meta||""}</span></span></li>`).join("");
}
function signalsFromRows(rows){
  let n=0;
  for(const r of rows){
    for(const [dir,stage,grade,ok,base,kz,cons,rr,px]of[["long",r.stageL,r.gradeL,r.pickHC,r.pick,r.kzL,r.consL,r.rrL,r.px],["short",r.stageS,r.gradeS,r.pickHCS,r.pickS,r.kzS,r.consS,r.rrS,r.px]]){
      const hc=state.strat==="hc"; const okNow=hc?ok:base; const tier=cons?cons.tier:null;
      if(okNow) n+=pushSignal({sym:r.s,dir,kind:"entry",grade,kz,cons:tier,meta:`fiyat ${fmtP(px)} · oran 1'e ${fx(rr,1)}`});
      else if(hc&&base){ const miss=[]; if(!(grade==="A"||(grade==="B"&&tier==="proven"))) miss.push("not "+grade); if(!kz) miss.push("seans dışı"); if(!(tier==="proven"||tier==="promising")) miss.push("coin kanıtsız"); n+=pushSignal({sym:r.s,dir,kind:"near",grade,kz,cons:tier,meta:"AMD dizisi tamam · eksik: "+(miss.join(", ")||"disiplin")}); }
      else if(stage==="waitEntry"&&(grade==="A"||grade==="B")) n+=pushSignal({sym:r.s,dir,kind:"zone",grade,kz,cons:tier,meta:"MSS oldu · OTE'ye dönüş bekleniyor · limit emir"});
      else if(stage==="waitMSS"&&r.deep) n+=pushSignal({sym:r.s,dir,kind:"sweep",kz,cons:tier,meta:"havuz süpürüldü · yapı kırılımı bekleniyor"});
      const br=dir==="long"?r.brL:r.brS; if(br&&br.aligned&&(br.grade==="A"||br.grade==="B")&&(br.stage==="entry"||br.stage==="waitRetest")) n+=pushSignal({sym:r.s,dir,kind:"breakout",grade:br.grade,meta:br.stage==="entry"?"kutu kırıldı · fiyat FVG'de · kurulum 2 girişi":"kutu kırıldı · FVG'ye geri test bekleniyor"});
      const rp=dir==="long"?r.rsPlanL:r.rsPlanS; if(rp&&(rp.stage==="entry"||rp.stage==="waitEntry")) n+=pushSignal({sym:r.s,dir,kind:"rejim",grade:rp.grade,kz:rp.kz,meta:rp.stage==="entry"?"rejim kapıları tamam · fiyat OTE'de · kurulum 3 girişi":"rejim kapıları tamam · OTE'ye dönüş bekleniyor · limit emir"});
    }
  }
  return n;
}
function signalsFromA(A){
  for(const d of (state.mode==="both"?["long","short"]:[state.mode])){ const G=hcGates(A,d); const r=G.r; if(G.all) pushSignal({sym:state.sym,dir:d,kind:"entry",grade:r.grade,kz:r.kz,cons:A.cons?A.cons[d].tier:null,meta:`10/10 kapı · fiyat ${fmtP(A.px)} · oran 1'e ${fx(r.rr1,1)}`});
    const b=A.br&&A.br[d]; if(b&&b.stage==="entry"&&b.aligned&&(b.grade==="A"||b.grade==="B")) pushSignal({sym:state.sym,dir:d,kind:"breakout",grade:b.grade,kz:b.kz,meta:`fiyat FVG'de ${fmtP(b.fvg[0])} – ${fmtP(b.fvg[1])} · stop ${fmtP(b.stop)} · 2R ${fmtP(b.r2)}`});
    const q=A.rs&&A.rs[d]; if(q&&q.rsOk&&(q.stageLive||q.stage)==="entry") pushSignal({sym:state.sym,dir:d,kind:"rejim",grade:q.grade,kz:q.kz,meta:`kurulum 3 · limit ${fmtP(q.entry)} · stop ${fmtP(q.stop)} (${fx(q.sd*100,2)}%) · 1,5R ${fmtP(q.tp1)} · koşucu ${fmtP(q.run)}`}); }
}

/* ---- watch & proven ---- */
function renderWatch(){
  const rows=scan.rows||[]; const items=[];
  for(const r of rows){ for(const [dir,stage,grade,kz] of [["long",r.stageL,r.gradeL,r.kzL],["short",r.stageS,r.gradeS,r.kzS]]){ if(["waitMSS","waitEntry","afterTouch"].includes(stage)) items.push({s:r.s,dir,stage,grade,kz,px:r.px}); } }
  items.sort((a,b)=>STAGE_ORD[a.stage]-STAGE_ORD[b.stage]);
  const el=$("watch"); el.innerHTML=items.length?items.slice(0,30).map(i=>`<li data-s="${i.s}" data-d="${i.dir}"><span class="s">${i.s.replace("USDT","")}</span>${chip(i.dir==="long"?"up sm":"down sm",i.dir==="long"?"L":"S")}<span class="m">${STAGE_TXT[i.stage][1]}${i.stage!=="waitMSS"?" · not "+i.grade:""}${i.kz?" · "+i.kz:""}</span></li>`).join(""):'<li class="empty">Dizisi ilerleyen coin yok.</li>';
  const pr=[]; for(const s in scan.cons){ const c=scan.cons[s]; for(const [d,x] of [["long",c.L],["short",c.S]]) if(x&&(x.tier==="proven"||x.tier==="promising")) pr.push({s,d,x}); }
  pr.sort((a,b)=>consRank(b.x)-consRank(a.x)||b.x.ev-a.x.ev);
  $("proven").innerHTML=pr.length?pr.slice(0,20).map(i=>`<li data-s="${i.s}" data-d="${i.d}"><span class="s">${i.s.replace("USDT","")}</span>${chip(i.d==="long"?"up sm":"down sm",i.d==="long"?"L":"S")}${chip(CONS_TXT[i.x.tier][0]+" sm",CONS_TXT[i.x.tier][1])}<span class="m">${i.x.n} kurulum · ${i.x.ev>0?"+":""}${fx(i.x.ev,1)}R</span></li>`).join(""):'<li class="empty">Henüz kanıtlı coin yok; derin tarama doldurur.</li>';
}

/* ---- scanner ---- */
async function runScan(){
  if(scan.running) return; scan.running=true; $("scanNow").disabled=true; const bar=$("scanBar"), st=$("scanStamp");
  try{
    st.textContent="evren hazırlanıyor…"; bar.style.width="3%";
    const list=await universe(+$("minVol").value);
    if(!ui.symsFilled){ $("symList").innerHTML=list.map(u=>`<option value="${u.t24.symbol}">`).join(""); ui.symsFilled=true; }
    const out=[]; let done=0, failed=0; const q=[...list];
    const hold=async()=>{ while(ui.loading) await new Promise(r=>setTimeout(r,150)); };
    const worker=async()=>{ while(q.length){ await hold(); const u=q.shift(); try{ const r=await scanOne(u); if(r) out.push(r); }catch(e){ failed++; if(/hız sınırı/.test(e.message)){ st.textContent="hız sınırı · bekleniyor"; await new Promise(r=>setTimeout(r,15000)); q.unshift(u); continue; } } done++; bar.style.width=(3+done/list.length*60)+"%"; st.textContent=`${done}/${list.length} tarandı`; } };
    await Promise.all(Array.from({length:3},worker));
    const cand=out.filter(r=>DEEP_STAGES.has(r.stageL)||DEEP_STAGES.has(r.stageS)||r.pick||r.pickS).sort((a,b)=>b.qv-a.qv).slice(0,24);
    if(cand.length){ let d2=0; const q2=[...cand]; const w2=async()=>{ while(q2.length){ await hold(); const r=q2.shift(); try{ const deep=await scanDeep(r); if(deep) Object.assign(r,deep); }catch(e){} d2++; bar.style.width=(63+d2/cand.length*37)+"%"; st.textContent=`${d2}/${cand.length} aday derin tarandı`; } }; await Promise.all(Array.from({length:2},w2)); }
    scan.rows=out; const now=Date.now(); scan.at=now; const prev={}; out.forEach(r=>prev[r.s]={score:r.score,t:now}); scan.prev=prev; LS("rp-scan-prev",JSON.stringify(prev));
    const n=signalsFromRows(out); renderFeed(); renderWatch(); renderScanTable(); try{ botDecide("scan"); }catch(e){ console.error("SWEEP · bot",e); } try{ lmdScanAsk(out); }catch(e){}
    st.textContent=`${out.length} coin · ${new Date().toLocaleTimeString("tr-TR")}${failed?" · "+failed+" okunamadı":""}${n?" · "+n+" yeni sinyal":""}`;
  }catch(e){ st.textContent="tarama hatası: "+e.message; }
  finally{ scan.running=false; $("scanNow").disabled=false; setTimeout(()=>bar.style.width="0",600); }
}
const scanUI={k:"stage",dir:1};
function renderScanTable(){
  const only=$("onlyPick").checked; const hc=state.strat==="hc"; const lev=state.lev; let rows=[];
  for(const r of scan.rows){
    const mk=(dir)=>{ const L=dir==="long"; return {...r,dir,stage:L?r.stageL:r.stageS,grade:L?r.gradeL:r.gradeS,kz:L?r.kzL:r.kzS,cons:L?r.consL:r.consS,consRank:consRank(L?r.consL:r.consS),rr:L?r.rrL:r.rrS,maxLev:L?r.maxLevL:r.maxLevS,ok:hc?!!(L?r.pickHC:r.pickHCS):!!(L?r.pick:r.pickS),base:!!(L?r.pick:r.pickS)}; };
    const cands=[]; if(state.mode!=="short") cands.push(mk("long")); if(state.mode!=="long") cands.push(mk("short"));
    const live=cands.filter(c=>c.ok||!(c.stage==="noBias"||c.stage==="noSweep"));
    if(live.length) rows.push(...live); else rows.push(cands[0]);
  }
  if(only) rows=rows.filter(r=>r.ok||(hc&&r.base));
  const k=scanUI.k, dir=scanUI.dir;
  rows.sort((a,b)=>{ if(a.ok!==b.ok) return a.ok?-1:1; let x=a[k],y=b[k]; if(k==="stage"){ x=STAGE_ORD[x]??9; y=STAGE_ORD[y]??9; return dir*(x-y)||b.consRank-a.consRank; } if(k==="kz"){ x=x?1:0; y=y?1:0; } if(typeof x==="string") return dir*x.localeCompare(y); x=isFinite(x)?x:-Infinity; y=isFinite(y)?y:-Infinity; return dir*(x-y); });
  document.querySelectorAll("#scanTable th").forEach(th=>th.classList.toggle("sorted",th.dataset.k===k));
  const tb=$("scanBody"); if(!rows.length){ tb.innerHTML=`<tr><td colspan="14" class="empty">${scan.rows.length?"Bu filtreyle eşleşen coin yok; piyasada şu an kurulum az.":"Tarama henüz yapılmadı."}</td></tr>`; return; }
  const trT={up:["up","Yükseliş"],down:["down","Düşüş"],flat:["neutral","Yatay"]};
  tb.innerHTML=rows.map(r=>{ const st=STAGE_TXT[r.stage]||["neutral","—"]; const c=r.cons; const ct=CONS_TXT[c?c.tier:"unknown"]; const levOk=isFinite(r.maxLev)&&r.maxLev>=lev; const tt=trT[r.trend];
    return `<tr class="r ${r.ok?"pick":(hc&&r.base?"near":"")}" data-s="${r.s}" data-d="${r.dir}"><td><b>${r.s.replace("USDT","")}</b> ${r.ok?chip("up sm","giriş"):hc&&r.base?chip("warn sm","yakın"):""}</td><td>${chip(r.dir==="long"?"up sm":"down sm",r.dir==="long"?"Long":"Short")}</td><td class="num">${fmtP(r.px)}</td><td class="num ${r.c24>0?"up":r.c24<0?"down":""}">${pct(r.c24)}</td><td>${chip(st[0]+" sm",st[1])}${(()=>{ const b=r.dir==="long"?r.brL:r.brS; return b&&b.aligned&&(b.stage==="entry"||b.stage==="waitRetest")?" "+chip("cyan sm","kırılım "+(b.stage==="entry"?"FVG'de":"bekliyor")+" · "+b.grade):""; })()}${(()=>{ const q=r.dir==="long"?r.rsPlanL:r.rsPlanS; return q&&(q.stage==="entry"||q.stage==="waitEntry")?" "+chip("pink sm","K3 "+(q.stage==="entry"?"OTE'de":"bekliyor")+" · "+q.grade):""; })()}</td><td>${r.grade&&r.stage!=="noSweep"&&r.stage!=="noBias"&&r.stage!=="waitMSS"?chip(GRADE_CLS[r.grade]+" sm",r.grade):'<span class="muted">—</span>'}</td><td>${c&&c.n?chip(ct[0]+" sm",ct[1])+` <span class="muted num">${c.n}·${c.ev>0?"+":""}${fx(c.ev,1)}R</span>`:r.deep?chip("neutral sm","zayıf"):'<span class="muted">—</span>'}</td><td>${r.kz?chip("cyan sm",r.kz):'<span class="muted">—</span>'}</td><td class="num">${isFinite(r.rr)?"1'e "+fx(r.rr,1):"—"}</td><td class="num ${levOk?"up":"down"}">${isFinite(r.maxLev)?"≤"+r.maxLev+"x":"—"}</td><td class="num ${r.fund>0.03?"warn":r.fund<-0.03?"up":""}">${fx(r.fund,3)}%</td><td class="num ${r.oi1h>1?"up":r.oi1h<-1?"down":""}">${pct(r.oi1h)}</td><td>${chip(tt[0]+" sm",tt[1])}</td><td class="num muted">${fmtUsd(r.qv)}</td></tr>`; }).join("");
}
function openSym(s,d){ $("sym").value=s; if(d&&state.mode==="both"){ ui.dir=d; ui.dirPinned=true; } start(); window.scrollTo({top:0,behavior:"smooth"}); }

/* ---- journal (drawer) ---- */
function renderJournal(){
  const el=$("dJournal"); const td=jrToday(); const hc=state.strat==="hc";
  const permit=!hc||(td.opens<HC_MAX_OPENS&&td.losses<HC_MAX_LOSSES&&td.open===0);
  const why=td.open>0?"açık pozisyon var: bir işlem, bir karar":td.losses>=HC_MAX_LOSSES?"bugün "+HC_MAX_LOSSES+" kayıp: gün kapandı":td.opens>=HC_MAX_OPENS?"bugün "+HC_MAX_OPENS+" işlem açıldı: gün kapandı":"";
  const st=jrStats();
  const head=`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:12.5px">Bugün: <b class="num">${td.opens}/${HC_MAX_OPENS}</b> işlem · <b class="num ${td.losses?"down":""}">${td.losses}/${HC_MAX_LOSSES}</b> kayıp · <b class="num">${td.open}</b> açık ${chip(permit?"up":"down",permit?"Yeni işleme izin var":"Bugün yeni işlem yok")}${why&&!permit?`<span class="muted">${why}</span>`:""}</div>
  <p style="margin:6px 0 10px;font-size:12px;color:var(--ink-2)">${st?`Son ${st.n} kapanmış işlem: hedef %${Math.round(st.wr*100)}, toplam <b class="num ${st.sum>0?"up":"down"}">${st.sum>0?"+":""}${fx(st.sum,1)}R</b>, işlem başına ${st.avg>0?"+":""}${fx(st.avg,2)}R. ${st.n>=10?(st.avg>=0.3?"Sistemi uyguluyorsun; boyutu bir kademe artırmayı düşünebilirsin.":st.avg>=0?"Başabaş: kapıları tam açılmadan girilen işlemleri ayıkla.":"Zarardasın: bir hafta yalnızca A notlu ve 10/10 kapılı işlem."):"10 işlemden önce yorum yok."}`:"Henüz kapanmış işlem yok. Plan kartındaki \"Günlüğe yaz\" planı buraya ekler; sonuçlandığında TP1 / Hedef 2 / Stop / Başabaş'a bas."}</p>`;
  const rows=journal.slice(-15).reverse().map(e=>{ const btn=(a,l)=>`<button type="button" class="jr" data-id="${e.id}" data-act="${a}" style="padding:2px 8px;font-size:11px">${l}</button>`;
    const acts=e.status==="open"?btn("tp1","TP1 · yarısı")+" "+btn("stop","Stop")+" "+btn("be","Başabaş"):e.status==="tp1"?btn("tp2","Hedef 2")+" "+btn("stop","Kalan stop")+" "+btn("be","Kalan başabaş"):`<span class="num ${e.r>0?"up":e.r<0?"down":"muted"}">${e.r>0?"+":""}${fx(e.r,2)}R</span>`;
    return `<tr><td class="num muted">${new Date(e.t).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</td><td><b>${e.sym.replace("USDT","")}</b> ${chip(e.dir==="long"?"up sm":"down sm",e.dir==="long"?"L":"S")} <span class="muted num">${e.lev}x</span></td><td class="num">${fmtP(e.entry)}</td><td class="num">${fmtP(e.stop)}</td><td class="num">${fmtP(e.t1)}${e.t2?" / "+fmtP(e.t2):""}</td><td>${chip(e.status==="closed"?"neutral sm":e.status==="tp1"?"warn sm":"up sm",e.status==="closed"?"kapandı":e.status==="tp1"?"TP1 alındı":"açık")}</td><td>${acts} ${btn("del","sil")}</td></tr>`; }).join("");
  el.innerHTML=head+(rows?`<table class="t"><thead><tr><th>Zaman</th><th>İşlem</th><th>Giriş</th><th>Stop</th><th>Hedef</th><th>Durum</th><th>Sonuç</th></tr></thead><tbody>${rows}</tbody></table>`:"");
}

/* ---- loop ---- */
let busy=false, probing=false;
async function probe(eb){
  if(probing) return; probing=true;
  const tests=[["Binance vadeli · fiyat","https://fapi.binance.com/fapi/v1/ticker/price?symbol=BTCUSDT"],["Binance vadeli · mumlar","https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT&interval=15m&limit=2"],["Binance vadeli · OI/kalabalık","https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=BTCUSDT&period=5m&limit=2"],["Grafik kütüphanesi","https://cdn.jsdelivr.net/npm/lightweight-charts@4.2.0/package.json"]];
  const lines=[]; for(const [name,url] of tests){ const t0=Date.now(); try{ const r=await fetch(url,{cache:"no-store"}); const t=await r.text(); lines.push(`${name}: HTTP ${r.status} (${Date.now()-t0} ms, ${t.length} bayt)`); }catch(e){ lines.push(`${name}: BAĞLANTI YOK (${e.message})`); } }
  eb.textContent+="\n\nBağlantı testi · "+new Date().toLocaleTimeString("tr-TR")+" · "+location.protocol+"\n"+lines.join("\n")+"\nBu kutuyu kopyalayıp gönder."; probing=false;
}
async function tick(){
  if(busy) return; busy=true; $("dot").className="busy";
  try{
    const s=state.sym; const fresh = !state.slow || state.slowSym!==s;
    ui.loading=fresh;
    const pFast=fetchFast(s); const pSlow=(fresh||Date.now()-state.slowAt>60000)?fetchSlow(s):null; if(pSlow) pSlow.catch(()=>{}); // hızlı istek düşerse yavaş isteğin hatası sahipsiz kalmasın
    const f=await pFast; ui.lastF=f;
    if(fresh){ try{ renderQuick(f); }catch(e){} }   // fiyat ve mumlar hemen, analiz hemen arkasından
    if(pSlow){ const sl=await pSlow; if(state.sym!==s) return; state.slow=sl; state.slowAt=Date.now(); state.slowSym=s; }
    ui.loading=false;
    const A=analyze(f,state.slow); state.lastA=A;
    consPut(s,A); pickDir(A);
    const parts=[["Başlık",()=>renderHead(A,f)],["Grafik",()=>renderChart(A,f)],["Akış",()=>renderFlow(A,f)],["Kapılar",()=>{ const G=renderGates(A); renderPlan(A,G); }],["Bağlam",()=>renderCtx(A)],["Kurulum 2",()=>renderBR(A)],["Kurulum 3",()=>renderRS(A)],["Kutu",()=>renderBoxCard(A)],["Sinyal",()=>{ signalsFromA(A); renderFeed(); }],["Bant",()=>renderTape(A)],["Çekmece",()=>renderDrawer(A)]];
    const fails=[]; for(const [n,fn] of parts){ try{ fn(); }catch(e){ fails.push(n+": "+e.message); console.error("SWEEP · "+n,e); } }
    const eb=$("errbox"); if(fails.length){ eb.hidden=false; eb.textContent="Bazı kartlar çizilemedi → "+fails.join(" | "); } else eb.hidden=true;
    $("dot").className=fails.length?"busy":"ok"; $("stamp").textContent=new Date().toLocaleTimeString("tr-TR")+" · "+(state.every/1000)+" sn";
    document.title=`${s.replace("USDT","")} ${fmtP(A.px)} · SWEEP`;
    rest.fails=0;
  }catch(e){
    rest.fails++; const eb=$("errbox"); console.warn("SWEEP · veri",e.message);
    if(/HTTP 400|HTTP 404/.test(e.message)){ $("dot").className="err"; $("stamp").textContent="hata"; eb.hidden=false; eb.textContent=`"${state.sym}" Binance vadeli piyasasında yok. Sembolü USDT ile yaz (örn. BTCUSDT).`; }
    else if(rest.fails<3){ $("dot").className="busy"; $("stamp").textContent=`veri gecikti (${rest.fails}) · canlı akış sürüyor`; }
    else { $("dot").className="err"; $("stamp").textContent="REST hatası · canlı akış sürüyor"; eb.hidden=false; eb.textContent=`Geçmiş/türev verisi ${rest.fails} kezdir alınamıyor: ${e.message}. Fiyat ve bant WebSocket'ten akmaya devam eder; analiz son başarılı turda kalır.`; if(rest.fails===3) probe(eb); }
  } finally{ busy=false; ui.loading=false; }
}
function renderQuick(f){
  const px=+f.t24.lastPrice; const el=$("hPx"); el.classList.remove("sk"); el._v=px; el.textContent=fmtP(px); ui.lastPx=px;
  $("hSym").firstChild.textContent=state.sym.replace("USDT","")+" "; const c24=+f.t24.priceChangePercent; $("hChg").innerHTML=chip(c24>0?"up":c24<0?"down":"neutral","24s "+pct(c24));
  if(ensureChart()){ const off=-new Date().getTimezoneOffset()*60; ui.candles.setData(f.k15.map(c=>({time:c.t/1000+off,open:c.o,high:c.h,low:c.l,close:c.c}))); ui.vols.setData(f.k15.map(c=>({time:c.t/1000+off,value:c.q,color:c.c>=c.o?"rgba(46,229,157,.35)":"rgba(255,92,108,.35)"}))); ui.lines.forEach(l=>ui.candles.removePriceLine(l)); ui.lines=[]; ui.segs.forEach(sr=>{ try{ ui.chart.removeSeries(sr); }catch(e){} }); ui.segs=[]; try{ ui.candles.setMarkers([]); }catch(e){} ui.chart.timeScale().setVisibleLogicalRange({from:f.k15.length-90,to:f.k15.length+4}); }
  $("permit").innerHTML='Hesaplanıyor…<small>geçmiş ve türev verisi yükleniyor</small>'; $("stamp").textContent="yükleniyor…";
}
function renderDrawer(A){
  if(!ui.drawerOpen) return;
  if(ui.drawerTab==="story") renderStory(A); else if(ui.drawerTab==="stats") renderStats(A); else if(ui.drawerTab==="journal") renderJournal(); else if(ui.drawerTab==="bot") renderBot(); else if(ui.drawerTab==="account") renderAccount(); else if(ui.drawerTab==="lab") renderLab();
}
function start(){
  clearInterval(state.timer); state.sym=$("sym").value.trim().toUpperCase().replace(/[^A-Z0-9]/g,""); if(!state.sym.endsWith("USDT")) state.sym+="USDT"; $("sym").value=state.sym;
  state.every=10000; state.lev=+$("lev").value; state.bal=+$("bal").value||0; if(state.slowSym!==state.sym){ state.slow=null; ui.first=true; ui.lastPx=null; $("hPx").classList.add("sk"); }
  LS("st-sym",state.sym); LS("st-lev",state.lev); LS("st-bal",state.bal);
  tick(); state.timer=setInterval(tick,state.every); wsConnect(state.sym);
}
function rerender(){ if(!state.lastA) return; const A=state.lastA; pickDir(A); const G=renderGates(A); renderPlan(A,G); renderBoxCard(A); renderBR(A); renderRS(A); renderChart(A,ui.lastF); renderScanTable(); renderDrawer(A); }

/* ---- events ---- */
$("sym").addEventListener("change",()=>{ ui.dirPinned=false; start(); });
$("sym").addEventListener("keydown",e=>{ if(e.key==="Enter"){ ui.dirPinned=false; start(); } });
$("lev").addEventListener("change",()=>{ state.lev=+$("lev").value; LS("st-lev",state.lev); rerender(); });
$("bal").addEventListener("change",()=>{ state.bal=+$("bal").value||0; LS("st-bal",state.bal); rerender(); });
document.querySelectorAll("#modeSeg button").forEach(b=>b.addEventListener("click",()=>{ state.mode=b.dataset.v; setSeg("modeSeg",state.mode); LS("st-mode",state.mode); ui.dirPinned=false; rerender(); }));
document.querySelectorAll("#stratSeg button").forEach(b=>b.addEventListener("click",()=>{ state.strat=b.dataset.v; setSeg("stratSeg",state.strat); LS("st-strat",state.strat); rerender(); renderJournal(); }));
document.querySelectorAll("#dirsw button").forEach(b=>b.addEventListener("click",()=>{ ui.dir=b.dataset.d; ui.dirPinned=true; rerender(); }));
$("bell").addEventListener("click",async()=>{ if(!("Notification" in window)){ toast("Bu tarayıcı bildirim desteklemiyor."); return; } if(!ui.bell){ const p=await Notification.requestPermission(); if(p!=="granted"){ toast("Bildirim izni verilmedi."); return; } } ui.bell=!ui.bell; $("bell").setAttribute("aria-pressed",String(ui.bell)); LS("st-bell",ui.bell?1:0); });
$("snd").addEventListener("click",()=>{ ui.snd=!ui.snd; $("snd").setAttribute("aria-pressed",String(ui.snd)); LS("st-snd",ui.snd?1:0); if(ui.snd) beep(); });
$("helpAll").addEventListener("click",()=>{ const on=$("helpAll").getAttribute("aria-pressed")!=="true"; $("helpAll").setAttribute("aria-pressed",String(on)); document.querySelectorAll(".card").forEach(c=>c.classList.toggle("hint-open",on)); });
document.querySelectorAll(".card .q").forEach(b=>b.addEventListener("click",()=>b.closest(".card").classList.toggle("hint-open")));
$("tabFeed").addEventListener("click",()=>{ $("tabFeed").setAttribute("aria-selected","true"); $("tabWatch").setAttribute("aria-selected","false"); $("feedWrap").hidden=false; $("watchWrap").hidden=true; });
$("tabWatch").addEventListener("click",()=>{ $("tabFeed").setAttribute("aria-selected","false"); $("tabWatch").setAttribute("aria-selected","true"); $("feedWrap").hidden=true; $("watchWrap").hidden=false; renderWatch(); });
$("feed").addEventListener("click",e=>{ const li=e.target.closest("li[data-s]"); if(li) openSym(li.dataset.s,li.dataset.d); });
["watch","proven"].forEach(id=>$(id).addEventListener("click",e=>{ const li=e.target.closest("li[data-s]"); if(li) openSym(li.dataset.s,li.dataset.d); }));
$("scanBody").addEventListener("click",e=>{ const tr=e.target.closest("tr[data-s]"); if(tr) openSym(tr.dataset.s,tr.dataset.d); });
document.querySelectorAll("#scanTable th").forEach(th=>th.addEventListener("click",()=>{ const k=th.dataset.k; if(scanUI.k===k) scanUI.dir*=-1; else { scanUI.k=k; scanUI.dir=(k==="s"||k==="stage"||k==="dir"||k==="trend")?1:-1; } renderScanTable(); }));
$("scanNow").addEventListener("click",runScan); $("onlyPick").addEventListener("change",renderScanTable); $("minVol").addEventListener("change",()=>{ if(!scan.running) runScan(); });
function scheduleScan(){ clearInterval(scan.timer); const ev=+$("scanEvery").value; if(ev>0) scan.timer=setInterval(()=>{ if(!document.hidden||bot.on) runScan(); },ev); } // bot açıkken pencere küçük/örtülü olsa da tarama sürer (masa bayat satırlarla karar vermesin)
$("scanEvery").addEventListener("change",scheduleScan);
function setDrawer(open,tab){ ui.drawerOpen=open; if(tab) ui.drawerTab=tab; $("drawer").classList.toggle("closed",!open); $("drawerTgl").textContent=open?"▾":"▴"; document.querySelectorAll("#drawer .bar [role=tab]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.t===ui.drawerTab))); ["scan","journal","story","stats","strategy","bot","lab","ask","account"].forEach(t=>{ const el=$("d"+t[0].toUpperCase()+t.slice(1)); el.hidden=t!==ui.drawerTab; }); LS("st-drawer",open?ui.drawerTab:""); if(open&&state.lastA) renderDrawer(state.lastA); if(open&&ui.drawerTab==="journal") renderJournal(); if(open&&ui.drawerTab==="bot") renderBot(); if(open&&ui.drawerTab==="account") renderAccount(); if(open&&ui.drawerTab==="lab") renderLab(); if(open&&ui.drawerTab==="ask") renderAsk(); }
document.querySelectorAll("#drawer .bar [role=tab]").forEach(b=>b.addEventListener("click",()=>setDrawer(true,b.dataset.t)));
$("drawerTgl").addEventListener("click",()=>setDrawer(!ui.drawerOpen));
$("dJournal").addEventListener("click",e=>{ const b=e.target.closest("button.jr"); if(!b) return; jrSet(b.dataset.id,b.dataset.act); renderJournal(); rerender(); });
$("brBody").addEventListener("click",e=>{ const b=e.target.closest("button[data-jr]"); if(!b) return; try{ jrAdd(JSON.parse(b.dataset.jr)); toast("Kırılım planı günlüğe yazıldı."); }catch(err){} rerender(); renderJournal(); });
$("planBody").addEventListener("click",e=>{ const b=e.target.closest("button[data-jr]"); if(!b) return; try{ jrAdd(JSON.parse(b.dataset.jr)); toast("Plan günlüğe yazıldı. Sonucu Günlük sekmesinden işle."); }catch(err){} rerender(); renderJournal(); });
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") tick(); });

/* ================= canlı veri: Binance vadeli WebSocket ================= */
const WS_BASE="wss://fstream.binance.com/stream?streams=";
const live={ws:null,sym:null,px:null,mark:null,fund:null,nextFund:null,cvd:0,cvdT0:0,tape:[],liq:[],depth:null,allLiq:{},tries:0,timer:null,lastRender:0,ok:false,msgs:0,lastMsg:0,wantSym:null};
const LIQ_WAVE=250000; // 5 dakikada tek tarafta bu kadar likidasyon = dalga
function wsConnect(sym){
  const s=sym.toLowerCase(); live.wantSym=sym; if(live.ws){ try{ live.ws.onclose=null; live.ws.close(); }catch(e){} live.ws=null; }
  if(live.sym!==sym){ live.sym=sym; live.px=null; live.cvd=0; live.cvdT0=Date.now(); live.tape=[]; live.liq=[]; live.depth=null; }
  const streams=[`${s}@trade`,`${s}@depth20@500ms`]; // eski yol: yalnız trade/depth akıyor (6 Ekim 2026 ölçümü)
  wsMarket(sym,[`${s}@kline_15m`,`${s}@markPrice@1s`,`${s}@forceOrder`,"!forceOrder@arr"]); // kline/mark/likidasyon Binance'in /market yolunda
  let ws; try{ ws=new WebSocket(WS_BASE+streams.join("/")); }catch(e){ wsStatus(false,"ws açılamadı"); return; }
  live.ws=ws;
  ws.onopen=()=>{ live.tries=0; live.ok=true; wsStatus(true); };
  ws.onmessage=ev=>{ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } live.msgs++; live.lastMsg=Date.now(); const d=m.data||m; const st=m.stream||""; try{ wsDispatch(st,d); }catch(e){ console.error("SWEEP · ws",e); } };
  ws.onerror=()=>{};
  ws.onclose=()=>{ live.ok=false; wsStatus(false,"bağlantı koptu, yeniden deneniyor"); if(live.wantSym!==sym) return; const wait=Math.min(30000,1000*Math.pow(2,live.tries++)); clearTimeout(live.timer); live.timer=setTimeout(()=>{ if(live.wantSym===sym) wsConnect(sym); },wait); };
}
// /market yolundaki piyasa akışları (src/wsdata.js WSD_URL): seçili coinin 15 dk mumu, mark/fonlama, likidasyonlar
let liveWs2=null;
function wsMarket(sym,streams){ if(liveWs2){ try{ liveWs2.onclose=null; liveWs2.close(); }catch(e){} liveWs2=null; } let ws; try{ ws=new WebSocket(WSD_URL+streams.join("/")); }catch(e){ return; } liveWs2=ws;
  ws.onmessage=ev=>{ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } const d=m.data||m; const st=m.stream||""; try{ wsDispatch(st,d); }catch(e){ console.error("SWEEP · ws",e); } };
  ws.onerror=()=>{}; ws.onclose=()=>{ if(liveWs2!==ws) return; liveWs2=null; setTimeout(()=>{ if(live.wantSym===sym&&!liveWs2) wsMarket(sym,streams); },5000); }; }
function wsStatus(ok,txt){ const el=$("wsDot"); if(!el) return; el.className="wsdot "+(ok?"ok":"off"); el.title=ok?"Canlı akış bağlı (WebSocket)":"Canlı akış kapalı · "+(txt||""); const lbl=$("wsTxt"); if(lbl) lbl.textContent=ok?"canlı":"canlı yok"; }
function wsDispatch(stream,d){
  if(stream.endsWith("@aggTrade")||stream.endsWith("@trade")){ const p=+d.p,q=+d.q,v=p*q,sell=!!d.m; live.px=p; live.cvd+=sell?-v:v; if(v>=tapeMin()) tapePush({t:d.T,kind:sell?"sell":"buy",p,v}); onLivePrice(); }
  else if(stream.endsWith("@kline_15m")){ const k=d.k; if(ui.candles){ const off=-new Date().getTimezoneOffset()*60; const time=k.t/1000+off; try{ ui.candles.update({time,open:+k.o,high:+k.h,low:+k.l,close:+k.c}); ui.vols.update({time,value:+k.q,color:+k.c>=+k.o?"rgba(46,229,157,.35)":"rgba(255,92,108,.35)"}); }catch(e){} } }
  else if(stream.endsWith("@markPrice@1s")){ live.mark=+d.p; live.fund=+d.r; live.nextFund=+d.T; }
  else if(stream.includes("@depth20")){ live.depth={bids:d.b,asks:d.a,t:d.E}; }
  else if(stream.endsWith("@forceOrder")){ const o=d.o; const v=+o.ap*+o.q; tapePush({t:o.T,kind:"liq",side:o.S,p:+o.ap,v}); live.liq.push({t:o.T,side:o.S,v}); live.liq=live.liq.filter(x=>Date.now()-x.t<30*60e3); }
  else if(stream==="!forceOrder@arr"){ const o=d.o; const s=o.s; if(!s||!s.endsWith("USDT")) return; const v=+o.ap*+o.q; const a=live.allLiq[s]=live.allLiq[s]||[]; a.push({t:o.T,side:o.S,v}); const cut=Date.now()-15*60e3; while(a.length&&a[0].t<cut) a.shift(); liqWave(s,a); }
}
function tapeMin(){ const A=state.lastA; return A?Math.max(5000,A.vol24/24/60/60*20):10000; } // 20 saniyelik ortalama hacim kadar büyük emirler
function tapePush(x){ live.tape.unshift(x); live.tape=live.tape.slice(0,40); }
function liqSum(arr,side,ms){ const cut=Date.now()-ms; let s=0; for(const x of arr) if(x.t>=cut&&(!side||x.side===side)) s+=x.v; return s; }
// bir coinde 5 dakikada tek tarafta büyük likidasyon dalgası: süpürme adayı → sinyal + anında derin tarama
function liqWave(s,arr){
  const L=liqSum(arr,"SELL",5*60e3), S=liqSum(arr,"BUY",5*60e3); // SELL emri = long likidasyonu, BUY emri = short likidasyonu
  if(L<LIQ_WAVE&&S<LIQ_WAVE) return;
  const side=L>=S?"long":"short"; const v=Math.max(L,S);
  if(pushSignal({sym:s,dir:side==="long"?"long":"short",kind:"liq",meta:`${fmtUsd(v)} ${side==="long"?"long":"short"} likide oldu (5 dk) · ${side==="long"?"dip":"tepe"} süpürmesi adayı`})){ renderFeed(); quickScan(s); }
}
async function quickScan(sym){
  try{ if(!scan.info) return; const [t24,prem]=await Promise.all([j(`/fapi/v1/ticker/24hr?symbol=${sym}`),j(`/fapi/v1/premiumIndex?symbol=${sym}`)]); const r=await scanOne({t24,prem}); if(!r) return; const deep=await scanDeep(r); if(deep) Object.assign(r,deep); const i=scan.rows.findIndex(x=>x.s===sym); if(i>=0) scan.rows[i]=r; else scan.rows.push(r); signalsFromRows([r]); renderFeed(); renderWatch(); renderScanTable(); try{ botDecide("scan"); }catch(e){} }catch(e){}
}
// canlı fiyat: başlık, giriş bölgesi kapısı ve bant 1 saniyede bir yenilenir
function onLivePrice(){
  const now=Date.now(); if(now-live.lastRender<1000) return; live.lastRender=now; const A=state.lastA; if(!A||live.px==null) return;
  const px=$("hPx"); const prev=ui.lastPx; tween(px,live.px,v=>fmtP(v),300);
  if(prev!=null&&prev!==live.px){ px.classList.remove("flash-up","flash-down"); void px.offsetWidth; px.classList.add(live.px>prev?"flash-up":"flash-down"); setTimeout(()=>px.classList.remove("flash-up","flash-down"),600); } ui.lastPx=live.px;
  if(live.mark!=null){ $("kMark").textContent=fmtP(live.mark); const fr=live.fund*100; $("kFund").innerHTML=`<span class="${fr>0.03?"warn":fr<-0.03?"up":""}">${fx(fr,4)}%</span>`; }
  // giriş bölgesi kapısı canlı: MSS sonrası fiyat bölgeye girdi/çıktı mı?
  let changed=false; for(const d of ["long","short"]){ const r=A.amd&&A.amd[d]; if(!r||!r.zone||["stopped","done","failed","expired"].includes(r.stage)) continue; const isL=d==="long"; const [lo,hi]=r.zone; const inZ=isL?(live.px>=lo*0.998&&live.px<=hi*1.004):(live.px<=hi*1.002&&live.px>=lo*0.996); const hit=isL?live.px<=r.stop:live.px>=r.stop; const tgt=isL?live.px>=r.t1:live.px<=r.t1; const ns=hit?"stopped":tgt?"done":inZ?"entry":(r.stage==="entry"?"afterTouch":r.stage); if(ns!==(r.stageLive||r.stage)){ r.stageLive=ns; changed=true; } }
  if(changed){ const G=renderGates(A); renderPlan(A,G); signalsFromA(A); renderFeed(); }
  renderTape(A);
}
function renderTape(A){
  const el=$("tape"); if(!el) return; const L5=liqSum(live.liq,"SELL",5*60e3), S5=liqSum(live.liq,"BUY",5*60e3);
  const cvdMin=live.cvd; const age=Math.round((Date.now()-live.cvdT0)/60000);
  $("tapeHead").innerHTML=`<span>CVD <b class="num ${cvdMin>=0?"up":"down"}">${cvdMin>=0?"+":""}${fmtUsd(cvdMin)}</b> <span class="muted">(${age} dk)</span></span><span>Likidasyon 5 dk: <b class="num down">${fmtUsd(L5)} long</b> · <b class="num up">${fmtUsd(S5)} short</b></span>${live.depth?`<span>Defter 20 kademe: <b class="num">${(()=>{ const b=live.depth.bids.reduce((a,[p,q])=>a+p*q,0), a=live.depth.asks.reduce((x,[p,q])=>x+p*q,0); const r=b/(a+b); return `<span class="${r>0.58?"up":r<0.42?"down":""}">%${Math.round(r*100)} alıcı</span>`; })()}</b></span>`:""}`;
  if(!live.tape.length){ el.innerHTML='<div class="empty">Büyük emirler ve likidasyonlar burada akar (eşik: 20 saniyelik ortalama hacim).</div>'; return; }
  el.innerHTML=live.tape.slice(0,14).map(x=>`<div class="tp ${x.kind}${x.kind==="liq"?(x.side==="SELL"?" lq-long":" lq-short"):""}"><span class="when">${new Date(x.t).toLocaleTimeString("tr-TR")}</span><span class="k">${x.kind==="liq"?(x.side==="SELL"?"LONG LİKİDE":"SHORT LİKİDE"):x.kind==="buy"?"ALIŞ":"SATIŞ"}</span><span class="num">${fmtP(x.p)}</span><span class="num v">${fmtUsd(x.v)}</span></div>`).join("");
}

/* ================= kâğıt bot: gerçek fiyat, sanal bakiye · komite modu (çoklu pozisyon, market giriş) ya da kapı modu ================= */
const fmtB=v=>(isFinite(v)?(+v).toFixed(2).replace(".",","):"—")+" $";
const bot={on:false,startT:null,bal:100,start:100,positions:[],orders:[],trades:[],log:[],eq:[],day:{key:null,opens:0,losses:0},ws:null,wsKey:null,px:{},mark:{},book:{},fund:{},cool:{},lastTick:0,lastMark:0,_lastTrade:{},cfg:{...BOT_CFG_DEF},lastDecision:0,lastVotes:[]};
try{ const saved=JSON.parse(LS("st-bot")||"null"); if(saved){ const cfg=cfgMigrate(saved.cfg,{...BOT_CFG_DEF,...(saved.cfg||{})}); comMigrate(cfg); if(!saved.cfg||saved.cfg.mode===undefined){ Object.assign(cfg,{mode:"komite",risk:BOT_CFG_DEF.risk,maxOpens:BOT_CFG_DEF.maxOpens,maxLosses:BOT_CFG_DEF.maxLosses,maxPos:BOT_CFG_DEF.maxPos,strict:false}); } Object.assign(bot,saved); bot.cfg=cfg; bot.ws=null; bot.wsKey=null;
  if(!Array.isArray(bot.positions)) bot.positions=[]; if(!Array.isArray(bot.orders)) bot.orders=[]; if(saved.pos) bot.positions.push(saved.pos); if(saved.order) bot.orders.push(saved.order); delete bot.pos; delete bot.order;
  bot.px=bot.px||{}; bot.mark=bot.mark||{}; bot.book=bot.book||{}; bot.fund=bot.fund||{}; bot.cool=bot.cool||{}; bot._lastTrade={};
  // eski kayıtlardaki ajan isimleri (5 Ekim 2026'da yeniden adlandırıldı)
  const RN={"Ayşe":"Emre","Elif":"Arda","Selin":"Onur"}; const fixA=a=>{ if(!a) return; if(RN[a.name]){ a.k=String(a.k||"").replace(a.name,RN[a.name]); a.name=RN[a.name]; } }; const fixT=t=>{ if(t&&RN[t.who]) t.who=RN[t.who]; };
  for(const v of bot.lastVotes||[]){ (v.agents||[]).forEach(fixA); (v.talk||[]).forEach(fixT); } for(const p of bot.positions||[]){ (p.agents||[]).forEach(fixA); (p.talk||[]).forEach(fixT); if(Array.isArray(p.votes)) p.votes=p.votes.map(x=>x.replace(/^(Ayşe|Elif|Selin)/,m=>RN[m])); } bot.lastVotes=bot.lastVotes||[]; for(const p of bot.positions){ if(!p.expiresAt) p.expiresAt=(p.openT||Date.now())+cfg.holdH*3600e3; } } }catch(e){}
const BOOT_T=Date.now();
try{ AUD=auditRun(bot.trades,bot.log,{thr:bot.cfg.threshold,minYes:bot.cfg.minYes}); }catch(e){ AUD=null; }
function botSave(){ const {ws,...rest}=bot; try{ localStorage.setItem("st-bot",JSON.stringify({...rest,log:bot.log,eq:bot.eq.slice(-2000),lastVotes:bot.lastVotes.slice(0,24)})); }catch(e){ console.error("SWEEP · bot kaydı yazılamadı: "+e.message); } }
function botLogTrim(){ if(bot.log.length<=300) return; let drop=bot.log.length-300; bot.log=bot.log.filter((l,i)=>{ if(drop>0&&l.type==="skip"&&i<bot.log.length-60){ drop--; return false; } return true; }); if(bot.log.length>300) bot.log=bot.log.slice(-300); }
function botLog(type,sym,text){ bot.log.push({t:Date.now(),type,sym:sym||"",text}); botLogTrim(); botSave(); if(ui.drawerTab==="bot") renderBot(); }
function botDay(){ const k=dayKey(Date.now()); if(bot.day.key!==k){ bot.day={key:k,opens:0,losses:0}; } return bot.day; }
function botPnl(p,px){ return (p.dir==="long"?(px-p.entry):(p.entry-px))*p.qty; }
function botMk(sym){ return bot.mark[sym]||bot.px[sym]; }
function botEquity(){ let eq=bot.bal; for(const p of bot.positions){ const px=botMk(p.sym); if(px) eq+=botPnl(p,px); } return eq; }
function botHas(sym){ return bot.positions.some(p=>p.sym===sym)||bot.orders.some(o=>o.sym===sym); }
function botMarginUsed(){ return bot.positions.reduce((a,p)=>a+p.margin,0)+bot.orders.reduce((a,o)=>a+o.margin,0); }
/* --- hedef (200 $), aşamalı giriş, yer açma ve dinamik hedefler: src/goal.js (ekransız botla ortak) --- */
function botCtx(){ return {cfg:bot.cfg,bal:bot.bal,start:bot.start,eq:botEquity(),peak:bot.peak,goalHit:bot.goalHit,positions:bot.positions,trades:bot.trades,now:Date.now(),thr:botThr(),minYes:botMinYes(),aud:AUD,lev:bot.cfg.lev,px:botMk,reserved:bot.orders.reduce((a,o)=>a+o.margin,0)}; }
function botGoal(){ return goalState({...bot,eq:botEquity()},bot.cfg); }
function botGoalWatch(){ if(bot.cfg.mode!=="komite") return; const eq=botEquity(); const g=goalTick(bot,eq,bot.cfg);
  if(g.gs.mode!==bot.goalMode){ if(bot.goalMode) botLog("goal","",`Hedef modu: ${bot.goalMode} → ${g.gs.mode}. ${g.gs.why}.`); bot.goalMode=g.gs.mode; }
  if(!g.lock) return; bot.goalHit=Date.now(); botLog("goal","",`Can: özkaynak ${fmtB(eq)}, ${fmtB(g.gs.goal)} hedefi tamam. Tüm pozisyonları kapatıp kârı kilitliyorum; bundan sonra risk yarıya iniyor.`);
  for(const p of [...bot.positions]){ const px=botMk(p.sym); if(!(px>0)) continue; deskNote(p,"goal",px,1,Date.now()); botCloseAt(p,1,p.dir==="long"?px*(1-bot.cfg.slip):px*(1+bot.cfg.slip),{k:"desk",dec:"goal",t:"Masa kararı · 200 $ kilidi"},true); }
  botSave(); }
/* --- adaylar: kapı modu (AMD/K2/K3 limit planları) --- */
function botCandidatesGate(){
  const out=[]; const hc=bot.cfg.strict;
  for(const r of scan.rows){ if(botHas(r.s)) continue;
    for(const dir of ["long","short"]){ const L=dir==="long";
      const ok = hc ? (L?r.pickHC:r.pickHCS) : (L?r.pick:r.pickS); const plan=L?r.planL:r.planS;
      if(ok&&plan&&(plan.stage==="entry"||plan.stage==="waitEntry")&&plan.rr1>=1.5) out.push({sym:r.s,dir,model:"AMD",grade:plan.grade,cons:L?r.consL:r.consS,kz:plan.kz,...plan,score:(plan.grade==="A"?2:1)+consRank(L?r.consL:r.consS)*0.5+(plan.kz?0.5:0)});
      const b=L?r.brPlanL:r.brPlanS;
      if(bot.cfg.useBR&&b&&b.aligned&&(b.grade==="A"||b.grade==="B")&&(b.stage==="entry"||b.stage==="waitRetest")&&(!hc||(L?r.consL:r.consS)&&consRank(L?r.consL:r.consS)>=1)) out.push({sym:r.s,dir,model:"KIRILIM",grade:b.grade,cons:L?r.consL:r.consS,kz:b.kz,entry:b.entry,stop:b.stop,t1:b.t1,t2:b.t2,rr1:2,rr2:3,expires:b.expires,stage:b.stage,score:(b.grade==="A"?1.5:0.8)+(b.kz?0.3:0)});
      const q=L?r.rsPlanL:r.rsPlanS;
      if(bot.cfg.useRS!==false&&q&&(q.stage==="entry"||q.stage==="waitEntry")&&(!hc||consRank(L?r.consL:r.consS)>=0)) out.push({sym:r.s,dir,model:"REJİM",grade:q.grade,cons:L?r.consL:r.consS,kz:q.kz,entry:q.entry,stop:q.stop,t1:q.t1,t2:q.t2,rr1:q.rr1,rr2:q.rr2,expires:q.expires,stage:q.stage,score:(q.grade==="A"?2.4:1.8)+(q.kz?0.3:0)});
    }
  }
  return out.sort((a,b)=>b.score-a.score);
}
/* --- denetçinin kolları: eşik, asgari oy, aynı yön sınırı, kayıp sonrası ara --- */
function botThr(){ return bot.cfg.threshold+(AUD?AUD.thrBump:0); }
function botMinYes(){ return Math.min(DESK.length,bot.cfg.minYes+(AUD?AUD.minYesBump:0)); }
function botAudit(rec){
  const prev=AUD?AUD.lessons.map(l=>l.k).join(","):""; AUD=auditRun(bot.trades,bot.log,{thr:bot.cfg.threshold,minYes:bot.cfg.minYes});
  if(rec){ const f=AUD.findings.find(x=>x.openT===rec.openT&&x.sym===rec.sym); if(f&&f.tags.length) botLog("audit",rec.sym,`Murat: ${fx(rec.r,2)}R · ${f.tags.map(k=>AUD_TAGS[k].t.toLowerCase()).join(", ")}.${isFinite(rec.mfe)?` En iyi gidiş +${fx(rec.mfe,1)}R.`:""}`); }
  const now=AUD.lessons.map(l=>l.k).join(","); if(now!==prev){ const add=AUD.lessons.filter(l=>!prev.split(",").includes(l.k)); for(const l of add) botLog("audit","",`Murat yeni ders: ${l.t} · ${l.n} işlemde ort. ${fx(l.avg,2)}R (diğerleri ${fx(l.avgNot,2)}R) → ${l.lever}.`); }
}
/* --- adaylar: komite modu (altı ajanın ortak puanı) --- */
function botCandidatesCommittee(){
  const out=[]; const now=Date.now();
  for(const r of scan.rows){ if(!r.com) continue;
    for(const dir of ["long","short"]){ const c=r.com[dir]; if(!c) continue;
      const held=botHas(r.s), cool=bot.cool[r.s]&&now<bot.cool[r.s];
      const go=!!c.plan&&c.score>=botThr()&&c.yes>=botMinYes()&&!c.veto&&!held&&!cool;
      out.push({sym:r.s,dir,model:"KOMİTE",grade:c.score>=0.5?"A":c.score>=bot.cfg.threshold?"B":"C",kz:null,entry:botLivePx(r.s)||r.px,sd:c.plan?c.plan.sd:NaN,stop:c.plan?c.plan.stop:NaN,t1:c.plan?c.plan.t1:NaN,t2:c.plan?c.plan.t2:NaN,rr1:1.5,rr2:3,com:c,go,held,cool:!!cool,score:c.score,yes:c.yes,veto:c.veto});
    }
  }
  return out.sort((a,b)=>b.score-a.score);
}
/* market giriş fiyatı yalnız taze olmalı (9 Ekim 2026, JUP: bot.px'te saatler önceki fiyat kalmıştı; 0,3804'ten girildi, ilk canlı fiyat 0,3744 stopu 1,4 sn'de vurdu, −13,07 $).
   Sıra: bu coinin işlem akışı (≤60 sn) → tüm coin ticker akışı (≤30 sn) → mark fiyat akışı (≤30 sn); hiçbiri yoksa giriş yok. */
function botLivePx(sym){ const now=Date.now();
  if(bot.px[sym]>0&&bot.pxT&&now-(bot.pxT[sym]||0)<=60e3) return bot.px[sym];
  try{ const t=wsd.tick[sym]; if(t&&now-wsd.tickT<=30e3&&+t.lastPrice>0) return +t.lastPrice; }catch(e){}
  try{ const m=wsd.mark[sym]; if(m&&now-wsd.markT<=30e3&&+m.markPrice>0) return +m.markPrice; }catch(e){}
  return NaN; }
function botOpenMarket(x,es){
  const cfg=bot.cfg; const isL=x.dir==="long"; const px=botLivePx(x.sym); if(!(px>0)){ botLog("skip",x.sym,"Taze fiyat yok (akış ve ticker 30 sn'den eski): market giriş yapılmadı."); return false; } if(!(x.sd>0)) return false;
  const sd=x.sd; const stop=isL?px*(1-sd):px*(1+sd), t1=isL?px*(1+1.5*sd):px*(1-1.5*sd), t2=isL?px*(1+3*sd):px*(1-3*sd);
  const lev=cfg.lev||20; const risk=es?es.riskUsd:bot.bal*cfg.risk; const notional=risk/sd; const margin=notional/lev;
  if(margin+botMarginUsed()>bot.bal*0.95){ bot._noMargin={need:margin,free:Math.max(0,bot.bal*0.95-botMarginUsed())}; return false; }
  const fill=isL?px*(1+cfg.slip):px*(1-cfg.slip); const qty=notional/fill; const fee=notional*cfg.feeTaker; bot.bal-=fee; botDay().opens++;
  const votes=x.com.agents.map(a=>`${a.name||a.k} ${a.v>0?"+":""}${fx(a.v,1)}`);
  bot.positions.push({sym:x.sym,dir:x.dir,model:"KOMİTE",grade:x.grade,agents:x.com.agents,talk:x.com.talk,entry:fill,stop,t1,t2,rr1:1.5,rr2:x.com.plan?x.com.plan.rr2:3,lev,notional,margin,risk,risk0:Math.abs(fill-stop),stop0:stop,qty,qty0:qty,fees:fee,openT:Date.now(),expiresAt:Date.now()+((x.com.plan&&x.com.plan.holdH)||cfg.holdH)*3600e3,stage:"open",hi:fill,lo:fill,realized:0,score:x.score,yes:x.yes,votes,
    entry0:fill,stages:es?es.stages:null,warn:es?es.warn:0,quality:es?es.grade:null,mode:es?es.gs.mode:null,freed:!!x.freed,decs:[],xs:[],labHold:!!(x.com.plan&&x.com.plan.holdH)});
  botLog("fill",x.sym,`MASA ${isL?"LONG":"SHORT"} · Can'ın kararı · puan ${ptsT(x.score)} · ${x.yes}/${DESK.length} evet · market ${fmtP(fill)} · stop ${fmtP(stop)} (${fx(sd*100,2)}%) · 1,5R ${fmtP(t1)} · 3R ${fmtP(t2)} · ${lev}x · pozisyon ${fmtB(notional)} · teminat ${fmtB(margin)} · risk ${fmtB(risk)}${es?` · not ${es.grade}${x.freed?" · yer açılarak":""}`:""}. Oylar: ${votes.join(", ")}.${es?" Aşamalar: "+stagesTxt(es):""}`);
  botSave(); botWsSync(); return true;
}
/* --- karar döngüsü: tarama bitince ve her dakika --- */
function botDecide(reason){
  if(!bot.on) return; const d=botDay(); const now=Date.now(); const cfg=bot.cfg;
  bot.orders=bot.orders.filter(o=>{ if(now>o.expires){ botLog("cancel",o.sym,`Limit emir süresi doldu (${o.model}), iptal.`); return false; } return true; });
  if(d.opens>=cfg.maxOpens){ if(reason==="scan") botLog("skip","",`Bugün ${d.opens}/${cfg.maxOpens} işlem açıldı: gün kapalı.`); return; }
  if(d.losses>=cfg.maxLosses&&!cfg.aggr){ if(reason==="scan") botLog("skip","",`Bugün ${d.losses}/${cfg.maxLosses} kayıp: gün kapalı.`); return; }
  const slots=cfg.maxPos-bot.positions.length-bot.orders.length; if(slots<=0&&cfg.mode!=="komite") return;
  if(!scan.rows.length){ if(reason==="scan"||now-(bot._emptyWarn||0)>600e3){ bot._emptyWarn=now; botLog("skip","",'Tarama boş: Binance\'e ulaşılamıyor ya da ilk tur bitmedi. Üstteki akış noktası kırmızıysa bağlantı (VPN) sorunudur; veri gelmeden masa toplanamaz.'); } return; }
  // bayat tarama: satırlar 15 dk'dan (ya da 3 tarama aralığından) eskiyse masa giriş kararı vermez (eski oyla güncel fiyattan market giriş olmasın)
  const scanAge=now-(scan.at||0), scanMax=Math.max(15*60e3,3*(+(($("scanEvery")||{}).value)||300e3));
  if(scanAge>scanMax){ if(reason==="scan"||now-(bot._staleWarn||0)>600e3){ bot._staleWarn=now; botLog("skip","",`Tarama ${Math.round(scanAge/6e4)} dk önce bitti (bayat): yeni giriş yok, tarama yenilenince masa yeniden toplanır.`); if(!scan.running) runScan(); } return; }
  if(cfg.mode==="komite"){
    const c=botCandidatesCommittee(); bot.lastVotes=c.slice(0,24).map(x=>({sym:x.sym,dir:x.dir,score:x.score,yes:x.yes,veto:x.veto,go:x.go,held:x.held,cool:x.cool,agents:x.com.agents,talk:x.com.talk,decision:x.com.decision}));
    botGoalWatch(); const go=c.filter(x=>x.go);
    if(!go.length){ if(reason==="scan") botLog("skip","",`Komite ${scan.rows.length} coin × 2 yön puanladı; eşik ${pts(botThr())} ve ${botMinYes()}/${DESK.length} oyu sağlayan yok. En iyi: ${c.slice(0,3).map(x=>x.sym.replace("USDT","")+" "+(x.dir==="long"?"L":"S")+" "+pts(x.score)+(x.veto?" (veto)":"")).join(", ")||"—"}.`); botSave(); return; }
    // aşamalı giriş: rejim → kalite → bütçe → korelasyon → son oy; yer yoksa açıktakilerden kâr alıp yer açma
    let opened=0, shown=0; const seen=new Set(); const fails={};
    for(const x of go){ if(botDay().opens>=cfg.maxOpens) break; if(seen.has(x.sym)||botHas(x.sym)) continue; seen.add(x.sym);
      let es=entryStages(x,botCtx()); const lv=bot.lastVotes.find(v=>v.sym===x.sym&&v.dir===x.dir); if(lv) lv.stages=es.stages;
      if(!es.ok){ const f=es.stages.find(z=>z.st==="fail")||es.stages[es.stages.length-1]; fails[f.k]=(fails[f.k]||0)+1; if(lv) lv.go=false; if(reason==="scan"&&shown++<3) botLog("skip",x.sym,`${x.dir} · ${f.who}: ${f.txt}.`); continue; }
      if(es.need>0||es.slot){ const fp=freePlan(x,es,botCtx());
        if(!fp){ fails.teminat=(fails.teminat||0)+1; if(reason==="scan"&&shown++<3) botLog("skip",x.sym,`${x.dir} · Can: ${es.slot?`${bot.positions.length}/${cfg.maxPos} yer dolu`:`teminat ${fmtB(es.margin)} gerekli, boş ${fmtB(Math.max(0,es.free))}`}; yer açmaya değecek kârlı ya da sönmüş pozisyon yok (yeni kurulum puanı ${pts(x.score)}).`); continue; }
        for(const o of fp){ const p=o.p; const xp=botMk(p.sym); if(!(xp>0)||!bot.positions.includes(p)) continue; deskNote(p,o.kind,xp,o.part,Date.now()); botLog("desk",p.sym,`Can: ${o.why}.`);
          botCloseAt(p,o.part,p.dir==="long"?xp*(1-cfg.slip):xp*(1+cfg.slip),{k:"desk",dec:o.kind,t:`Masa kararı · ${DEC_KIND[o.kind].toLowerCase()}`},true); }
        es=entryStages(x,botCtx()); if(!es.ok||es.need>0||es.slot){ botLog("skip",x.sym,"Yer açıldı ama yine de sığmadı (fiyat oynadı)."); continue; } x.freed=true; }
      if(botOpenMarket(x,es)) opened++; }
    if(!opened&&reason==="scan") botLog("skip","",`Komite ${go.length} kuruluma onay verdi; aşamalardan geçen olmadı (${Object.entries(fails).map(([k,n])=>k+" "+n).join(", ")||"—"}${bot._noMargin?`; en az ${fmtB(bot._noMargin.need)} teminat gerekli, boş ${fmtB(bot._noMargin.free)}`:""}).`); bot._noMargin=null;
    botSave(); return;
  }
  const c=botCandidatesGate();
  if(!c.length){ if(reason==="scan") botLog("skip","",`Tarama ${scan.rows.length} coin: ${cfg.strict?"10 kapıyı geçen":"A/B girişli"} aday yok.`); return; }
  let placed=0; const seen=new Set();
  for(const best of c){ if(placed>=slots) break; if(seen.has(best.sym)) continue; seen.add(best.sym);
    const sd=Math.abs(best.entry/best.stop-1); const lev=Math.max(1,Math.min(cfg.maxLev,Math.floor(1/(sd/0.6+0.005))));
    const risk=bot.bal*cfg.risk; const notional=risk/sd; const margin=notional/lev;
    if(margin+botMarginUsed()>bot.bal*0.95){ botLog("skip",best.sym,`Teminat (${fmtB(margin)}) kullanılabilir bakiyeyi aşıyor.`); continue; }
    bot.orders.push({sym:best.sym,dir:best.dir,model:best.model,grade:best.grade,entry:best.entry,stop:best.stop,t1:best.t1,t2:best.t2,rr1:best.rr1,rr2:best.rr2,lev,notional,margin,risk,placed:now,expires:best.expires||now+4*3600e3,kz:best.kz}); placed++;
    botLog("order",best.sym,`${best.model} ${best.dir==="long"?"LONG":"SHORT"} not ${best.grade}${best.kz?" · "+best.kz:""} · limit ${fmtP(best.entry)} · stop ${fmtP(best.stop)} (${fx(sd*100,2)}%) · hedef ${fmtP(best.t1)} (1'e ${fx(best.rr1,1)}) · ${lev}x · pozisyon ${fmtB(notional)} · teminat ${fmtB(margin)} · risk ${fmtB(risk)}.`);
  }
  botSave(); botWsSync();
}
/* --- bot için ayrı canlı akış: tüm pozisyon ve emir sembolleri tek bağlantıda --- */
let botWs2=null;
function botWsSync(){
  const syms=Array.from(new Set([...bot.positions.map(p=>p.sym),...bot.orders.map(o=>o.sym)])).sort(); const key=syms.join(",");
  if(bot.wsKey===key && bot.ws && bot.ws.readyState<=1) return;
  if(bot.ws){ try{ bot.ws.onclose=null; bot.ws.close(); }catch(e){} bot.ws=null; } if(botWs2){ try{ botWs2.onclose=null; botWs2.close(); }catch(e){} botWs2=null; } bot.wsKey=key; if(!syms.length) return;
  let ws; try{ ws=new WebSocket(WS_BASE+syms.map(s=>s.toLowerCase()).flatMap(s=>[`${s}@trade`,`${s}@bookTicker`]).join("/")); }catch(e){ return; } bot.ws=ws; bot.wsAt=Date.now();
  // mark fiyatı ve fonlama yalnız /market yolunda akıyor: eski yolda sessizdi, 5 Ekim'den beri kâğıt pozisyonlardan fonlama kesilmiyordu
  try{ botWs2=new WebSocket(WSD_URL+syms.map(s=>s.toLowerCase()+"@markPrice@1s").join("/")); botWs2.onmessage=ev=>ws.onmessage(ev); botWs2.onerror=()=>{}; const me=botWs2; botWs2.onclose=()=>{ if(botWs2!==me) return; botWs2=null; setTimeout(()=>{ if(bot.wsKey===key&&!botWs2){ bot.wsKey=null; botWsSync(); } },5000); }; }catch(e){}
  ws.onmessage=ev=>{ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } const d=m.data||m; const st=m.stream||""; const sym=(d.s||st.split("@")[0]||"").toUpperCase(); if(!sym) return;
    if(st.endsWith("@aggTrade")||st.endsWith("@trade")){ bot.src="ws"; bot._lastTrade[sym]=Date.now(); botOnPrice(sym,+d.p,d.T); }
    else if(st.endsWith("@bookTicker")){ const b=+d.b,a=+d.a; if(b>0&&a>0){ bot.book[sym]={b,a}; const now=Date.now(); if(!bot._lastTrade[sym]||now-bot._lastTrade[sym]>3000){ bot.src="ws"; botOnPrice(sym,(b+a)/2,now); } } }
    else if(st.endsWith("@markPrice@1s")){ if(+d.p>0){ bot.mark[sym]=+d.p; bot.lastMark=Date.now(); bot.lastTick=Date.now(); } const T=+d.T; const f=bot.fund[sym]||{r:0,T:0}; if(f.T&&T>f.T+60e3&&Date.now()>=f.T-5000) botFunding(sym,f.r); bot.fund[sym]={r:+d.r,T}; } };
  ws.onclose=()=>{ if(bot.wsKey===key&&bot.on) setTimeout(()=>{ if(bot.wsKey===key){ bot.ws=null; bot.wsKey=null; botWsSync(); } },3000); };
}
function botFunding(sym,rate){ for(const p of bot.positions){ if(p.sym!==sym) continue; const fee=p.notional*rate*(p.dir==="long"?1:-1); bot.bal-=fee; p.fees+=fee; botLog("fund",p.sym,`Fonlama ${fx(rate*100,4)}% → ${fee>=0?"ödendi":"alındı"} ${fmtB(Math.abs(fee))}.`); } }
function botOnPrice(sym,px,T){
  if(!(px>0)) return; bot.px[sym]=px; (bot.pxT||(bot.pxT={}))[sym]=Date.now(); bot.lastTick=Date.now(); const cfg=bot.cfg; const now=Date.now();
  for(const o of [...bot.orders]){ if(o.sym!==sym) continue; const isL=o.dir==="long"; if(!(isL? px<=o.entry : px>=o.entry)) continue;
    bot.orders=bot.orders.filter(x=>x!==o);
    if(isL? px<=o.stop : px>=o.stop){ botLog("cancel",o.sym,`Fiyat stop seviyesine giriş olmadan geldi; emir iptal.`); botWsSync(); continue; }
    const fill=o.entry; const qty=o.notional/fill; const fee=o.notional*cfg.feeMaker; bot.bal-=fee; botDay().opens++;
    bot.positions.push({...o,entry:fill,qty,qty0:qty,risk0:Math.abs(fill-o.stop),stop0:o.stop,fees:fee,openT:T||now,expiresAt:now+cfg.holdH*3600e3,stage:"open",hi:fill,lo:fill,realized:0});
    botLog("fill",o.sym,`Limit doldu ${fmtP(fill)} · ${o.dir==="long"?"LONG":"SHORT"} ${o.lev}x · ${fmtB(o.notional)} · komisyon ${fmtB(fee)}.`); botSave(); }
  for(const p of [...bot.positions]){ if(p.sym!==sym) continue; const isL=p.dir==="long";
    const close=(part,price,why,taker)=>{ const q=p.qty*part; const pnl=(isL?(price-p.entry):(p.entry-price))*q; const fee=q*price*(taker?cfg.feeTaker:cfg.feeMaker); bot.bal+=pnl-fee; p.realized+=pnl-fee; p.fees+=fee; p.qty-=q; (p.exits=p.exits||[]).push(why.k); deskFill(p,why.k,price,q,now); botLog(why.k,p.sym,`${why.t} ${fmtP(price)} · %${Math.round(part*100)} kapandı · ${pnl-fee>=0?"+":""}${fmtB(pnl-fee)}.`); };
    const acts=paperStep(p,px,now,cfg); let fin=false;
    for(const a of acts){ if(a.k==="move"){ botLog("move",p.sym,a.t); continue; } close(a.part,a.price,{k:a.k,t:a.t},a.taker); if(a.final){ fin=true; break; } }
    if(fin) botClosePos(p); else if(acts.length) botSave();
  }
  if(bot.positions.length&&!bot.goalHit) botGoalWatch();
  const eq=botEquity(); const last=bot.eq[bot.eq.length-1]; if(!last||now-last.t>60e3){ bot.eq.push({t:now,v:eq}); if(bot.eq.length>4000) bot.eq=bot.eq.slice(-2000); }
  botLive();
}
/* --- canlı yenileme: panel yeniden kurulmadan fiyat, PnL, ROE ve özkaynak hücreleri güncellenir (saniyede bir) --- */
function botLiqPx(p){ const d=1/p.lev-0.005; return p.dir==="long"?p.entry*(1-d):p.entry*(1+d); }
function botLive(){
  const now=Date.now(); if(now-(bot._lr||0)<800) return; bot._lr=now; if(!ui.drawerOpen||ui.drawerTab!=="bot") return; const el=$("dBot"); if(!el) return;
  for(const tr of el.querySelectorAll("tr[data-pos]")){ const p=bot.positions.find(x=>x.sym===tr.dataset.pos); if(!p) continue; const px=botMk(p.sym); if(!px) continue; const pnl=botPnl(p,px); const roe=pnl/p.margin*100;
    const c=tr.querySelector(".bpx"); if(c){ const prev=c.dataset.v; c.textContent=fmtP(px); if(prev&&+prev!==px){ c.classList.remove("flash-up","flash-down"); void c.offsetWidth; c.classList.add(px>+prev?"flash-up":"flash-down"); } c.dataset.v=px; }
    const q=tr.querySelector(".bpnl"); if(q){ q.className="num bpnl "+(pnl>=0?"up":"down"); q.innerHTML=`${pnl>=0?"+":""}${fx(pnl,2)} $<br><span style="font-size:11px">${roe>=0?"+":""}${fx(roe,1)}%</span>`; }
    const s=tr.querySelector(".bstop"); if(s) s.textContent=fmtP(p.stop); const st=tr.querySelector(".bst"); if(st) st.textContent=`${p.stage} · ${Math.round((now-p.openT)/60000)} dk`; }
  for(const tr of el.querySelectorAll("tr[data-ord]")){ const px=bot.px[tr.dataset.ord]; const c=tr.querySelector(".bpx"); if(c&&px) c.textContent=fmtP(px); }
  const eq=botEquity(); const roi=(eq/bot.start-1)*100; const v=$("botEqV"); if(v){ v.textContent=fx(eq,2)+" $"; v.className=eq>=bot.start?"up":"down"; } const ep=$("botEqP"); if(ep) ep.textContent=`${pct(roi,2)} · açık PnL ${eq-bot.bal>=0?"+":""}${fx(eq-bot.bal,2)} $`;
  const bn=$("botNet"); if(bn) bn.outerHTML=botNetTxt();
  const gs=botGoal(); const rv=$("botRoiV"); if(rv){ rv.textContent="%"+Math.round(clamp(gs.prog,-9,9)*100); rv.className=gs.prog>=1?"up":gs.prog>=0?"":"down"; } const rb=$("botRoiBar"); if(rb) rb.style.width=clamp(gs.prog*100,0,100)+"%"; const rr=$("botRoiRem"); if(rr) rr.textContent=gs.need<=0||bot.goalHit?"ulaşıldı, kâr kilitli":"kalan "+fmtB(gs.need);
}
/* --- masa: sekiz kişilik, açılış → tartışma → karar dökümü --- */
const DESK_COL={trend:"#39c6f2",liq:"#a78bfa",flow:"#2ee59d",macro:"#f5b53f",quant:"#f9a8d4",mom:"#ff8a3d",copy:"#60a5fa",audit:"#e2e8f0",lab:"#c4b5fd",vol:"#22d3ee",check:"#facc15",risk:"#ff5c6c"};
function talkHtml(talk){
  if(!talk||!talk.length) return "";
  const stages=[["açılış","1. tur · açılış görüşleri"],["tartışma","2. tur · itirazlar"],["ikna","3. tur · ikna (tez, karşı tez, fikir değiştirenler)"],["karar","4. tur · karar"]];
  return `<div style="margin-top:10px;display:grid;gap:8px">${stages.map(([st,title])=>{ const rows=talk.filter(t=>t.stage===st); if(!rows.length) return st==="tartışma"?`<div><div class="muted" style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px">${title}</div><div class="muted" style="font-size:11.5px">Kimse itiraz etmedi.</div></div>`:""; return `<div><div class="muted" style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px">${title}</div>${rows.map(t=>`<div style="display:flex;gap:8px;align-items:flex-start;margin:4px 0"><span style="flex:0 0 26px;height:26px;border-radius:50%;background:${DESK_COL[t.id]||"#888"};color:#0a0e13;font-weight:800;font-size:12px;display:inline-flex;align-items:center;justify-content:center">${esc((t.who||"?")[0])}</span><div style="font-size:12px;line-height:1.45"><b>${esc(t.who)}</b> <span class="muted">${esc(t.role)}</span><br>${esc(t.text)}</div></div>`).join("")}</div>`; }).join("")}</div>`;
}
/* --- giriş aşamaları (rejim → kalite → bütçe → korelasyon → karar) ve açık pozisyonda masanın sonraki kararları --- */
function stagesHtml(st,decs){
  if(!st||!st.length) return ""; const ic={ok:'<span class="up">✓</span>',warn:'<span class="warn">!</span>',fail:'<span class="down">✗</span>'}; const nm={rejim:"1 · Rejim (BTC, short)",kalite:"2 · Kurulum kalitesi",bütçe:"3 · Risk ve teminat",korelasyon:"4 · Korelasyon ve bekleme",karar:"5 · Son oy"};
  const d=(decs||[]).map(x=>`<div style="font-size:11.5px;margin:2px 0"><span class="muted">${new Date(x.t).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</span> <b>${esc(x.who||"Can")}</b> · ${esc(DEC_KIND[x.k]||x.k)} <span class="muted">(${x.rAt>=0?"+":""}${fx(x.rAt,2)}R${x.to!=null?" · "+fmtP(x.from)+" → "+fmtP(x.to):""})</span></div>`).join("");
  return `<div style="margin-top:10px"><div class="muted" style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px">Giriş aşamaları</div>${st.map(x=>`<div style="display:flex;gap:8px;font-size:12px;margin:3px 0"><span style="flex:0 0 14px">${ic[x.st]||""}</span><span style="flex:0 0 170px"><b>${esc(nm[x.k]||x.k)}</b> <span class="muted">${esc(x.who)}</span></span><span>${esc(x.txt)}</span></div>`).join("")}${d?`<div class="muted" style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:8px 0 4px">Pozisyondaki kararlar</div>${d}`:""}</div>`;
}
/* --- masa şeması: yedi kişi, merkeze akan katkılar, çelişkiler, veto --- */
function renderRoom(){
  const opts=[]; for(const p of bot.positions){ if(p.agents) opts.push({key:"pos:"+p.sym,label:`${p.sym.replace("USDT","")} ${p.dir==="long"?"L":"S"} · açık pozisyon (giriş anı)`,agents:p.agents,talk:p.talk,score:p.score,yes:null,veto:null,go:true,dir:p.dir,sym:p.sym,stages:p.stages,decs:p.decs}); }
  for(const v of bot.lastVotes){ opts.push({key:v.sym+"|"+v.dir,label:`${v.sym.replace("USDT","")} ${v.dir==="long"?"L":"S"} · puan ${pts(v.score)}${v.go?" · giriş":v.veto?" · veto":v.stages?" · aşamada kaldı":""}`,agents:v.agents,talk:v.talk,score:v.score,yes:v.yes,veto:v.veto,go:v.go,dir:v.dir,sym:v.sym,stages:v.stages}); }
  if(!opts.length) return `<div class="card" style="margin-bottom:10px"><h4 style="margin:0 0 4px">Masa</h4><div class="empty">İlk tarama bitince on kişilik masanın tartışması burada canlanır.</div></div>`;
  let sel=opts.find(o=>o.key===bot.roomSel)||opts.find(o=>o.go)||opts[0]; const ag=sel.agents; const thr=bot.cfg.threshold;
  const W=400,H=300,cx=200,cy=150,R=108; const n=ag.length; const posOf=i=>{ const a=-Math.PI/2+i*2*Math.PI/n; return [cx+R*Math.cos(a),cy+R*Math.sin(a)]; };
  const col=v=>v>0.15?"var(--long)":v<-0.15?"var(--short)":"var(--ink-2)";
  let num=0,den=0; for(const a of ag){ const w=a.w!=null?a.w:(COM_W[a.k]||1); num+=w*a.v*a.c; den+=w; } const score=sel.score!=null?sel.score:(den?num/den:0);
  let lines="",nodes="",conf="";
  ag.forEach((a,i)=>{ const [x,y]=posOf(i); const w=a.w!=null?a.w:(COM_W[a.k]||1); const k=w*a.v*a.c; const sw=0.6+Math.abs(k)*7; const flow=Math.abs(a.v)>0.15;
    lines+=`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${cx}" y2="${cy}" stroke="${col(a.v)}" stroke-width="${sw.toFixed(1)}" stroke-opacity="${(0.25+0.6*a.c).toFixed(2)}" class="${flow?(a.v>0?"flow-in":"flow-out"):""}"/>`;
    const r=16+10*a.c; nodes+=`<g class="agent" data-i="${i}"><title>${esc(a.name||a.k)} · ${esc(a.role||"")}: oy ${a.v>0?"+":""}${fx(a.v,2)} · güven ${fx(a.c,2)} · ağırlık ${w} · ${esc(a.txt)}</title><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${col(a.v)}" fill-opacity="${(0.15+0.55*Math.abs(a.v)).toFixed(2)}" stroke="${col(a.v)}" stroke-width="${(1+3*a.c).toFixed(1)}"/><text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${a.v>0?"+":""}${fx(a.v,1)}</text><text x="${x.toFixed(1)}" y="${(y+r+13).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${esc(a.name||a.k)}</text><text x="${x.toFixed(1)}" y="${(y+r+24).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="var(--ink-2)">${esc((a.role||"").split(" · ")[0].replace(" analisti","").replace(" araştırmacısı","").replace("Baş trader","baş trader"))}</text></g>`; });
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const a=ag[i],b=ag[j]; if((a.v>0.4&&b.v<-0.4)||(a.v<-0.4&&b.v>0.4)){ const [x1,y1]=posOf(i),[x2,y2]=posOf(j); conf+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="4 4" stroke-opacity=".8"><title>Çelişki: ${esc(a.name||a.k)} ${a.v>0?"+":""}${fx(a.v,1)} ↔ ${esc(b.name||b.k)} ${b.v>0?"+":""}${fx(b.v,1)}</title></line>`; } }
  const veto=sel.veto; const pctArc=clamp((score+1)/2,0,1); const circ=2*Math.PI*34; const decision=veto?"VETO":sel.go?"GİRİŞ":score>=thr?"EŞİKTE":"BEKLE"; const dcol=veto?"var(--short)":sel.go?"var(--long)":"var(--ink-2)";
  const center=`<circle cx="${cx}" cy="${cy}" r="40" fill="var(--bg-2, #111822)" stroke="${dcol}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6"/><circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="${score>=thr?"var(--long)":"var(--ink-2)"}" stroke-width="6" stroke-dasharray="${(circ*pctArc).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/><text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="15" font-weight="800" fill="var(--ink)">${score>=0?"+":""}${pts(score)}</text><text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="10" font-weight="700" fill="${dcol}">${decision}</text>${veto?`<text x="${cx}" y="${cy+58}" text-anchor="middle" font-size="10.5" fill="var(--short)">${esc(veto)}</text>`:""}`;
  const act=ag.filter(a=>!a.abst&&a.w!==0), yes=act.filter(a=>a.v>0.15).length, no=act.filter(a=>a.v<-0.15).length;
  const list=ag.map(a=>`<div style="display:flex;gap:8px;align-items:baseline;font-size:11.5px;margin:2px 0"><span style="min-width:150px;font-weight:700;color:${col(a.v)}">${esc(a.name||a.k)} <span class="muted" style="font-weight:400">${esc(a.role||"")}</span></span><span class="num" style="min-width:36px">${a.abst?"—":(a.v>0?"+":"")+fx(a.v,1)}</span><span class="muted" style="min-width:52px">${a.abst?"çekimser":"güven "+fx(a.c,1)}</span><span class="muted" style="min-width:44px">${a.abst?"":"× "+fx(a.w,2)}</span><span class="muted">${a.v0!=null&&Math.abs(a.v0-a.v)>=0.05?`<b>ikna: ${a.v0>0?"+":""}${fx(a.v0,1)} → ${a.v>0?"+":""}${fx(a.v,1)}</b> · `:""}${esc(a.txt)}</span></div>`).join("");
  return `<div class="card" style="margin-bottom:10px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:4px"><h4 style="margin:0">Masa</h4><select id="botRoomSel">${opts.map(o=>`<option value="${o.key}" ${o.key===sel.key?"selected":""}>${esc(o.label)}</option>`).join("")}</select><span class="muted" style="font-size:11.5px">${yes} evet · ${no} hayır · ${ag.length-act.length} çekimser · eşik ${pts(thr)} · en az ${botMinYes()} evet gerekli</span></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;align-items:start"><svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:420px;height:auto" role="img" aria-label="Komite odası">${lines}${conf}${nodes}${center}</svg><div>${list}<p class="muted" style="font-size:11px;margin:6px 0 0">Daire boyu ve çerçeve = güven; renk ve dolgu = oy; çizgi kalınlığı = karara katkı (ağırlık × oy × güven); turuncu kesikli çizgi = çelişki. Merkez: ağırlıklı puan ve Can'ın kararı. Oylar ikna turu sonrası değerler; ağırlıklar (× katsayı) geriye dönük testten. Verisi olmayan üye çekimserdir, puana girmez.</p></div></div>${stagesHtml(sel.stages,sel.decs)}${talkHtml(sel.talk)}</div>`;
}
function botClosePos(p){
  const r=p.realized/p.risk; const isL=p.dir==="long"; const r0=p.risk0||Math.abs(p.entry-(p.stop0||p.stop));
  const rec={sym:p.sym,dir:p.dir,model:p.model,grade:p.grade,lev:p.lev,entry:p.entry,openT:p.openT,closeT:Date.now(),pnl:p.realized,fees:p.fees,risk:p.risk,r,score:p.score,exits:p.exits||[],offline:p.openT<BOOT_T&&Date.now()-BOOT_T<180e3,
    mfe:r0>0?+((isL?p.hi-p.entry:p.entry-p.lo)/r0).toFixed(2):NaN,mae:r0>0?+((isL?p.entry-p.lo:p.hi-p.entry)/r0).toFixed(2):NaN,
    snap:p.agents?{v:Object.fromEntries(p.agents.map(a=>[a.id,a.v])),sd:r0/p.entry,score:p.score,yes:p.yes!=null?p.yes:p.agents.filter(a=>a.v>0.15).length,warn:p.warn||0,quality:p.quality||null,mode:p.mode||null}:undefined,
    decs:p.decs&&p.decs.length?p.decs:undefined,xs:p.xs&&p.xs.length?p.xs:undefined,r0,freed:!!p.freed};
  bot.trades.push(rec); if(p.realized<0) botDay().losses++; bot.cool[p.sym]=Date.now()+bot.cfg.cooldownMin*60e3;
  botLog("close",p.sym,`İşlem kapandı: ${p.realized>=0?"+":""}${fmtB(p.realized)} (${r>=0?"+":""}${fx(r,2)}R) · bakiye ${fmtB(bot.bal)} · ROI ${pct((bot.bal/bot.start-1)*100,1)}.`);
  bot.positions=bot.positions.filter(x=>x!==p); bot.eq.push({t:Date.now(),v:bot.bal}); if(bot.eq.length>4000) bot.eq=bot.eq.slice(-2000); botAudit(rec); if(bot.bal>=botGoal().goal&&!bot.goalHit){ bot.goalHit=Date.now(); botLog("goal","",`Hedef tamam: bakiye ${fmtB(bot.bal)}. Bot korumalı modda (risk yarıya) devam ediyor.`); } botSave(); botWsSync();
  if(bot.on) setTimeout(()=>botDecide("tick"),500);
}
function botStart(){ if(bot.on) return; bot.on=true; if(!bot.startT) bot.startT=Date.now(); const c=bot.cfg; botLog("sys","",c.mode==="komite"?`Bot başladı · KOMİTE modu · sanal ${fmtB(bot.bal)} · risk %${fx(c.risk*100,1)}–%${fx(Math.max(c.risk,c.riskMax||0)*100,1)} (masanın güvenine göre) · ${c.lev}x sabit · aynı anda ${c.maxPos} pozisyon · eşik ${pts(c.threshold)}, ${c.minYes}/${DESK.length} oy · zaman stopu ${c.holdH} sa · hedef %100 ROI.`:`Bot başladı · KAPI modu · sanal ${fmtB(bot.bal)} · risk %${c.risk*100} · en fazla ${c.maxLev}x · ${c.strict?"yüksek tutarlılık kuralları":"serbest kurallar"} · Kurulum 2 ${c.useBR?"açık":"kapalı"} · Kurulum 3 ${c.useRS!==false?"açık":"kapalı"}.`); botWsSync(); if(!scan.rows.length&&!scan.running) runScan(); else botDecide("scan"); botSave(); }
function botStop(){ bot.on=false; botLog("sys","","Bot durduruldu (açık pozisyonlar ve emirler korunur; başlatınca devam eder)."); botSave(); }
function botReset(){ if(bot.positions.length||bot.orders.length){ if(!confirm(`${bot.positions.length} açık pozisyon ve ${bot.orders.length} emir var. Hepsi silinip bakiye 100 $'a dönsün mü?`)) return; } Object.assign(bot,{on:false,startT:null,bal:100,start:100,positions:[],orders:[],trades:[],log:[],eq:[],day:{key:null,opens:0,losses:0},px:{},cool:{},lastVotes:[],goalHit:null,peak:100,goalMode:null}); botSave(); renderBot(); }
function botCloseAll(){ for(const p of [...bot.positions]){ const px=bot.px[p.sym]; if(!px) continue; const isL=p.dir==="long"; const price=isL?px*(1-bot.cfg.slip):px*(1+bot.cfg.slip); const q=p.qty; const pnl=(isL?(price-p.entry):(p.entry-price))*q; const fee=q*price*bot.cfg.feeTaker; bot.bal+=pnl-fee; p.realized+=pnl-fee; p.fees+=fee; p.qty=0; botLog("close",p.sym,`Elle kapatıldı ${fmtP(price)} · ${pnl-fee>=0?"+":""}${fmtB(pnl-fee)}.`); botClosePos(p); } bot.orders=[]; botSave(); botWsSync(); renderBot(); }
function botCsv(){ const rows=[["acilis","kapanis","coin","yon","model","not","kaldirac","giris","pnl_usdt","komisyon","R","komite_puan","en_iyi_R","cikis","denetci","uyari","kalite","mod","yer_acildi","kararlar"]].concat(bot.trades.map(t=>[new Date(t.openT).toISOString(),new Date(t.closeT).toISOString(),t.sym,t.dir,t.model,t.grade,t.lev,t.entry,t.pnl.toFixed(4),t.fees.toFixed(4),t.r.toFixed(2),t.score!=null?t.score:"",isFinite(t.mfe)?t.mfe:"",(t.exits||[]).join(" "),(()=>{ try{ return audTagsOf(t,bot.trades,{thr:bot.cfg.threshold,minYes:bot.cfg.minYes}).join(" "); }catch(e){ return ""; } })(),t.snap&&t.snap.warn||0,t.snap&&t.snap.quality||"",t.snap&&t.snap.mode||"",t.freed?1:0,(t.decs||[]).map(d=>d.k+"@"+fx(d.rAt,2)).join(" ")])); const logRows=[[],["zaman","tur","coin","mesaj"]].concat(bot.log.map(l=>[new Date(l.t).toISOString(),l.type,l.sym,'"'+l.text.replace(/"/g,"'")+'"'])); const csv=rows.concat(logRows).map(r=>r.join(",")).join("\n"); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv"})); a.download="sweep-bot-"+new Date().toISOString().slice(0,10)+".csv"; a.click(); }
function botNetTxt(){ const fresh=bot.lastTick&&Date.now()-bot.lastTick<15000; const has=bot.positions.length||bot.orders.length; const mk=has&&bot.markSrc==="rest"&&!(bot.lastMark&&Date.now()-bot.lastMark<10000)?' · mark REST (5 sn)':''; const a=has?(fresh?(bot.src==="rest"?'<span class="warn">● fiyat REST yedeğinden (3 sn)</span>':'<span class="up">● fiyat akışı canlı</span>'+mk):'<span class="down">● fiyat akışı yok</span>'):(live.ok?'<span class="up">● Binance bağlı</span>':'<span class="down">● Binance\'e ulaşılamıyor</span>'); const cool=typeof rest!=="undefined"&&Date.now()<rest.cool?` · <span class="warn">hız sınırı, ${Math.ceil((rest.cool-Date.now())/1000)} sn</span>`:""; const err=bot.pollErr&&Date.now()-bot.pollErrAt<60000?` · <span class="down">yedek: ${esc(bot.pollErr)}</span>`:""; return `<span id="botNet">${a}${has&&!fresh?mk:""} · tarama ${scan.rows.length} coin${cool}${err}</span>`; }
/* --- araştırma ekibi paneli: lider geçmişi, faktörler, aday stratejiler, ileri test, notlar --- */
function labOnProgress(){ if(ui.drawerOpen&&ui.drawerTab==="lab") renderLab(); }
function renderLab(){
  const el=$("dLab"); if(!el) return; const B=lab.base; const dl=d=>d==="long"?chip("up sm","L"):chip("down sm","S");
  const pending=lab.trades.filter(x=>x.f===null).length; const feat=lab.trades.filter(x=>x.f&&typeof x.f==="object").length;
  const desk=typeof ld!=="undefined"&&ld.at; const st=lab.busy?`<span class="warn">● çalışıyor ${esc(lab.prog)}</span>`:lab.err?`<span class="down">● ${esc(lab.err)}</span>`:lab.at?`<span class="up">● son analiz ${tl(lab.at)}</span>`:'<span class="muted">● analiz için yeterli işlem yok</span>';
  const sgn=v=>isFinite(v)?(v>0?"+":"")+fx(v,2):"—"; const cls=v=>v>0?"up":v<0?"down":"";
  const stBadge=s=>`<span class="chip ${s==="onaylı"?"up":s==="zayıf"?"down":s==="izlemede"?"warn":"neutral"} sm">${s}</span>`;
  const fw=k=>{ const f=lab.fwd[k]; return f&&f.n?`${f.n} sinyal · ${sgn(f.sum/f.n)} ATR · %${Math.round(f.win/f.n*100)}`:'<span class="muted">henüz yok</span>'; };
  const cRow=c=>`<tr><td>${dl(c.dir)} ${esc(c.name)}</td><td class="num">${c.n}<br><span class="muted" style="font-size:10.5px">${c.leaders} lider</span></td><td class="num">%${Math.round(c.wr*100)}</td><td class="num ${cls(c.mean)}">${sgn(c.mean)}<br><span class="muted ${cls(c.lift)}" style="font-size:10.5px">${sgn(c.lift)} tabana göre</span></td><td class="num"><span class="${cls(c.h1)}">${sgn(c.h1)}</span> / <span class="${cls(c.h2)}">${sgn(c.h2)}</span></td><td class="num">${fx(isFinite(c.tl)?c.tl:c.t,1)}</td><td class="num">${fx(c.hold,1)} sa<br><span class="muted" style="font-size:10.5px">${isFinite(c.lev)?c.lev+"x":""}</span></td><td style="font-size:11px">${fw(c.key)}</td><td>${stBadge(c.status||"aday")}</td></tr>`;
  const head=`<tr><th>Kural</th><th>İşlem</th><th>Kazanma</th><th>Ort ATR</th><th>1. / 2. yarı</th><th>t (fark)</th><th>Tutuş</th><th>İleri test</th><th>Durum</th></tr>`;
  const cands=lab.cands.length?`<table class="t"><thead>${head}</thead><tbody>${lab.cands.map(cRow).join("")}</tbody></table>`:`<div class="empty">Henüz aday yok. Bir kuralın aday olması için ≥ ${LAB_CFG.minN} işlem, ≥ ${LAB_CFG.minLeaders} farklı lider ve aynı yöndeki tüm işlemlerden iki yarıda da iyi olması (fark ≥ +${fx(LAB_CFG.minLift,2)} ATR, farkın t değeri ≥ 1,5) gerekir.</div>`;
  const avoid=lab.avoid.length?`<table class="t"><thead>${head}</thead><tbody>${lab.avoid.map(cRow).join("")}</tbody></table>`:'<div class="empty">Kaçınılacak kalıp bulunmadı.</div>';
  let fac=""; if(lab.factors&&lab.factors.length){ fac=LAB_FEATS.map(F=>{ const cells=Object.keys(F.vals).map(v=>{ const g=d=>lab.factors.find(x=>x.f===F.k&&x.v===v&&x.dir===d); const L=g("long"),S=g("short"); const c=x=>x?`<span class="${cls(x.mean)}">${sgn(x.mean)}</span> <span class="muted" style="font-size:10.5px">${x.n} · %${Math.round(x.wr*100)}</span>`:'<span class="muted">—</span>'; return `<tr><td>${esc(F.vals[v])}</td><td class="num">${c(L)}</td><td class="num">${c(S)}</td></tr>`; }).join(""); return `<div><div class="muted" style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:4px 0">${esc(F.name)}</div><table class="t"><thead><tr><th></th><th>Long · ATR · n · kazanma</th><th>Short</th></tr></thead><tbody>${cells}</tbody></table></div>`; }).join(""); fac=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px">${fac}</div>`; }
  const sty=Object.values(lab.styles||{}).sort((a,b)=>b.mean-a.mean).map(s=>`<tr><td><b>${esc(s.nick)}</b><br><span class="muted" style="font-size:10.5px">${esc(s.tags.join(" · "))}</span></td><td class="num">${s.n}</td><td class="num">%${Math.round(s.wr*100)}</td><td class="num ${cls(s.mean)}">${sgn(s.mean)}</td><td class="num">${fx(s.hold,1)} sa</td><td class="num">${isFinite(s.lev)?s.lev+"x":"—"}</td><td class="num">%${Math.round(s.trendSh*100)} / %${Math.round(s.dipSh*100)} / %${Math.round(s.swSh*100)}</td><td class="num">%${Math.round(s.longSh*100)}</td></tr>`).join("");
  const notes=lab.notes.slice(-12).reverse().map(n=>`<div style="display:flex;gap:8px;font-size:11.5px;margin:3px 0"><span class="muted" style="min-width:92px">${new Date(n.t).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span><b style="min-width:44px">${esc(n.who)}</b><span>${esc(n.text)}</span></div>`).join("");
  el.innerHTML=`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><button type="button" class="primary" id="labNow" ${lab.busy?"disabled":""}>Şimdi araştır</button><span class="muted" style="font-size:11.5px">${st} · ${lab.trades.length} lider işlemi saklı · ${feat} zenginleştirildi${pending?" · "+pending+" sırada":""} · ${lab.shadows.length} gölge sinyal izleniyor</span></div>
  ${desk?"":`<p class="warn" style="font-size:12px;margin:0 0 8px">Lider verisi yalnızca masaüstü uygulamasında çekilir (Binance tarayıcı erişimine izin vermez). Burada daha önce toplanmış geçmiş varsa analiz ve ileri test yine çalışır.</p>`}
  <div class="plan" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:10px">
    <div class="pv"><b>Tolga · veri</b><span>${B?B.leaders:Object.keys(lab.harvestAt).length} lider</span><small>${B?`${new Date(B.from).toLocaleDateString("tr-TR")} – ${new Date(B.to).toLocaleDateString("tr-TR")}`:"geçmiş toplanıyor"} · liderler 6 saatte bir, liste saatte bir</small></div>
    <div class="pv"><b>Burak · strateji</b><span>${lab.cands.length} aday · ${lab.avoid.length} kaçın</span><small>${B?`taban: long ${sgn(B.long.mean)} ATR (%${Math.round((B.long.wr||0)*100)}), short ${sgn(B.short.mean)} ATR (%${Math.round((B.short.wr||0)*100)})`:"en az "+LAB_CFG.minN+" zenginleşmiş işlem gerekir"}</small></div>
    <div class="pv"><b>Onur · ileri test</b><span>${Object.values(lab.fwd).reduce((a,f)=>a+f.n,0)} sonuç</span><small>${lab.cands.filter(c=>c.status==="onaylı").length} onaylı · ${lab.cands.filter(c=>c.status==="zayıf").length} zayıf · onay için ${LAB_CFG.promoteN} ileri sinyal</small></div>
  </div>
  <h4 style="margin:6px 0">Aday stratejiler <span class="muted" style="font-weight:400;font-size:11.5px">liderlerin kazandığı koşullar · masada Burak bunlarla oy verir</span></h4>${cands}
  <h4 style="margin:12px 0 6px">Kaçınılacak kalıplar <span class="muted" style="font-weight:400;font-size:11.5px">liderlerin iki yarıda da kaybettiği koşullar · Burak karşı oy verir, Baran'ı uyarır</span></h4>${avoid}
  ${selHtml()}
  ${notes?`<h4 style="margin:12px 0 6px">Ekip notları</h4>${notes}`:""}
  ${sty?`<details style="margin-top:10px"><summary class="muted" style="cursor:pointer;font-size:12px">Lider stilleri · ${Object.keys(lab.styles).length} lider</summary><table class="t" style="margin-top:6px"><thead><tr><th>Lider</th><th>İşlem</th><th>Kazanma</th><th>Ort ATR</th><th>Tutuş</th><th>Kaldıraç</th><th>Trend / geri çekilme / süpürme</th><th>Long payı</th></tr></thead><tbody>${sty}</tbody></table></details>`:""}
  ${fac?`<details style="margin-top:10px"><summary class="muted" style="cursor:pointer;font-size:12px">Faktör tablosu · her koşulda liderlerin ortalama sonucu</summary>${fac}</details>`:""}
  <p class="muted" style="font-size:11px;margin:10px 0 0">Ölçü (kopya ölçüsü): liderin açtığı saatin kapanışında girip liderin kapanış fiyatından çıksaydık kaldıraçsız hareket ÷ girişteki 1 saatlik ATR; liderin ortalama düşürmesi hariç, kazanma da bu ölçüyle. Kural kapısı tabana göre (aynı yöndeki tüm lider işlemleri), çünkü liderlerin kapanmış işlemleri zaten ortalama artı. Faktörler girişten önce kapanmış 1 saatlik mumlardan: seans (UTC), SMA20/50 trendi, 24 saatlik aralıktaki yer, coinin 24 saatlik hareketi, BTC 4 saat, son 6 saatte süpürme, 3 saatlik hacim. Çok işlem yapan liderin ağırlığı 25 işleme kısılır. Liderlerin kazandığı koşul bizim için kanıt değildir; aday, canlı taramada eşleştikçe gölge sinyalle ileriye dönük test edilir ve ${LAB_CFG.promoteN} sonuçtan sonra onaylanır ya da düşer.</p>`;
  $("labNow").addEventListener("click",()=>{ labTick(true).then(()=>{ if(lab.dirty) labAnalyze(); renderLab(); }); renderLab(); });
  selBind();
}
/* --- Selim (LLM lider analisti) kartı: sağlayıcı ayarı, hipotezler, açık pozisyonlarımızda liderlerin görüşü, günlük rapor --- */
function selHtml(){
  const c=llm.cfg; const lr=sel.runs.filter(r=>!r.err).slice(-1)[0]; const sgn=v=>isFinite(v)?(v>0?"+":"")+fx(v,2):"—"; const cls=v=>v>0?"up":v<0?"down":"";
  const st=sel.busy?`<span class="warn">● Selim düşünüyor (${esc(llmLabel())})</span>`:sel.err?`<span class="down">● ${esc(sel.err)}</span>`:lr?`<span class="up">● son koşu ${tl(lr.t)} · ${esc(lr.model)} · ${lr.hyps} hipotez, ${lr.kept} tuttu${lr.usage&&lr.usage.cost?` · ${fx(lr.usage.cost,2)} $`:lr.provider==="manual"?"":" · ücretsiz"}</span>`:llmReady()?`<span class="muted">● henüz koşmadı · ${esc(llmLabel())} · en az ${SEL_CFG.minTrades} zenginleşmiş işlem gerekir, sonra günde bir</span>`:'<span class="muted">● LLM kapalı ya da anahtar yok</span>';
  const fw=k=>{ const f=lab.fwd[k]; return f&&f.n?`${f.n} sinyal · ${sgn(f.sum/f.n)} ATR`:'<span class="muted">henüz yok</span>'; };
  const badge=h=>{ const s=h.status==="elendi"?"elendi":labStatus(h.key); return `<span class="chip ${s==="onaylı"?"up":s==="zayıf"||s==="elendi"?"down":s==="izlemede"?"warn":"neutral"} sm">${h.avoid&&s!=="elendi"?"kaçın":s}</span>`; };
  const rows=sel.hyps.map(h=>`<tr><td>${h.dir==="long"?chip("up sm","L"):chip("down sm","S")} <b>${esc(h.ad||"")}</b><br><span class="muted" style="font-size:10.5px">${esc(h.name.replace(/^Selim · /,""))}</span>${h.why?`<br><span style="font-size:11px">${esc(h.why)}</span>`:""}</td><td class="num">${h.n||0}</td><td class="num ${cls(h.mean)}">${sgn(h.mean)}</td><td class="num ${cls(h.lift)}">${sgn(h.lift)}</td><td class="num">${isFinite(h.tl)?fx(h.tl,1):"—"}</td><td style="font-size:11px">${fw(h.key)}</td><td>${badge(h)}</td></tr>`).join("");
  const pos=(typeof bot!=="undefined"?bot.positions:[]).map(p=>{ const w=ldPosView(p.sym,p.dir); return `<div style="font-size:11.5px;margin:2px 0">${p.dir==="long"?chip("up sm","L"):chip("down sm","S")} <b>${esc(p.sym.replace("USDT",""))}</b> · ${esc(w.txt)}</div>`; }).join("");
  const opt=(v,t)=>`<option value="${v}" ${c.provider===v?"selected":""}>${t}</option>`;
  return `<h4 style="margin:12px 0 6px">Selim · LLM lider analisti <span class="muted" style="font-weight:400;font-size:11.5px">liderlerin işlemlerini okuyup test edilebilir kural önerir · tutmayan elenir, tutan ileri teste girer, onaylanınca Burak onunla oy verir</span></h4>
  <div style="font-size:11.5px;margin-bottom:6px">${st}</div>
  ${sel.summary?`<p style="font-size:12px;margin:4px 0 8px">${esc(sel.summary)}</p>`:""}
  ${rows?`<table class="t"><thead><tr><th>Hipotez</th><th>İşlem</th><th>Ort ATR</th><th>Tabana göre</th><th>t</th><th>İleri test</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table>`:""}
  ${sel.dataAsks.length?`<p class="muted" style="font-size:11px;margin:6px 0 0">Selim'in istediği ek veri: ${esc(sel.dataAsks.join(" · "))}</p>`:""}
  ${pos?`<h4 style="margin:12px 0 6px">Açık pozisyonlarımız · liderler ne yapıyor <span class="muted" style="font-weight:400;font-size:11.5px">saatte bir, değişince Tolga not düşer</span></h4>${pos}`:""}
  <details style="margin-top:10px"><summary class="muted" style="cursor:pointer;font-size:12px">LLM ayarı · ${esc(llmLabel())}</summary>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px;font-size:12px">
      <label><input type="checkbox" id="llmOn" ${c.on?"checked":""}> açık</label>
      <select id="llmProv">${opt("ollama","Ollama (yerel, ücretsiz)")}${opt("openai","OpenAI uyumlu yerel sunucu (LM Studio, llama.cpp)")}${opt("claude","Claude API (ücretli)")}</select>
      <input id="llmUrl" placeholder="http://localhost:11434" value="${esc(c.url)}" style="width:190px" ${c.provider==="claude"?"hidden":""}>
      <input id="llmModel" placeholder="qwen3:8b" value="${esc(c.provider==="claude"?c.claudeModel:c.model)}" style="width:150px">
      <span ${c.provider==="claude"?"":"hidden"}><input id="llmKey" type="password" placeholder="${llmKey()?"anahtar kayıtlı":"sk-ant-…"}" style="width:170px" autocomplete="off"> <label><input type="checkbox" id="llmRem" checked> bu cihazda hatırla</label></span>
      <button type="button" id="llmSave">Kaydet</button> <button type="button" id="llmTest">Bağlantıyı sına</button> <button type="button" class="primary" id="selNow" ${sel.busy||!llmReady()?"disabled":""}>Selim'i şimdi çalıştır</button>
      <span id="llmMsg" class="muted"></span></div>
    <p class="muted" style="font-size:11px;margin:6px 0 0">Ücretsiz yol: ollama.com'dan Ollama'yı kur, komut satırında <code>ollama pull qwen3:8b</code>. Masaüstü uygulaması http://localhost:11434 adresine bağlanır. Daha güçlü ekran kartı varsa daha büyük bir model adı yaz. Claude API anahtarı yalnız bu cihazda saklanır; hiçbir yere gönderilmez, yalnız api.anthropic.com'a başlıkta gider.</p></details>
  <div style="margin-top:8px"><button type="button" id="labReport">Günlük raporu indir (.md)</button></div>`;
}
function selBind(){
  const g=id=>$(id); if(!g("llmSave")) return; const msg=t=>{ g("llmMsg").textContent=t; };
  const save=()=>{ const prov=g("llmProv").value; const p={on:g("llmOn").checked,provider:prov}; if(prov==="claude") p.claudeModel=g("llmModel").value.trim()||LLM_DEF.claudeModel; else { p.url=g("llmUrl").value.trim()||LLM_DEF.url; p.model=g("llmModel").value.trim()||LLM_DEF.model; }
    llmSetCfg(p); const k=g("llmKey")&&g("llmKey").value.trim(); if(prov==="claude"&&k) llmSetKey(k,g("llmRem").checked); };
  g("llmProv").addEventListener("change",()=>{ llmSetCfg({provider:g("llmProv").value}); renderLab(); const d=document.querySelector("#dLab details:last-of-type"); if(d) d.open=true; });
  g("llmSave").addEventListener("click",()=>{ save(); renderLab(); });
  g("llmTest").addEventListener("click",()=>{ save(); msg("sınanıyor…"); llmModels().then(m=>msg(llm.cfg.provider==="claude"?"anahtar kayıtlı":`bağlandı · ${m.length} model${m.length?": "+m.slice(0,6).join(", "):""}${m.length&&!m.includes(llm.cfg.model)?` · "${llm.cfg.model}" yok, önce ollama pull`:""}`)).catch(e=>msg(e.message)); });
  g("selNow").addEventListener("click",()=>{ save(); selTick(true).then(()=>renderLab()); renderLab(); });
  g("labReport").addEventListener("click",()=>{ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([labReport()],{type:"text/markdown"})); a.download="lider-arastirmasi-"+new Date().toISOString().slice(0,10)+".md"; a.click(); });
}
/* --- liderler paneli: en iyi 20 kopya trader lideri, davranış profili, coin uzlaşısı --- */
function ldOnProgress(){ if(ui.drawerOpen&&ui.drawerTab==="bot"){ const b=$("ldBox"); if(b) b.outerHTML=renderLeaders(); const r=$("ldRefresh"); if(r) r.addEventListener("click",()=>{ ldRefresh(true); }); } }
function renderLeaders(){
  const P=ld.profile; const rows=ld.list.map(L=>{ const d=ld.leaders[L.id]||{}; return `<tr><td><b>${esc(L.nick)}</b><br><span class="muted" style="font-size:10.5px">${L.copiers} kopyalayan · ${fmtUsd(L.aum)}</span></td><td class="num ${L.roi>0?"up":"down"}">${pct(L.roi,0)}</td><td class="num">${fmtUsd(L.pnl)}</td><td class="num warn">${fx(L.mdd,0)}%</td><td class="num">${d.n?Math.round(d.wr*100)+"%":"—"}<br><span class="muted" style="font-size:10.5px">${d.n||0} işlem</span></td><td class="num">${d.n?fx(d.medHold,1)+" sa":"—"}</td><td class="num">${d.n?Math.round((d.addRate||0)*100)+"% / "+Math.round((d.partialRate||0)*100)+"%":"—"}</td><td style="font-size:11px">${(d.open||[]).slice(0,4).map(o=>`<span class="chip ${o.dir==="long"?"up":"down"} sm">${o.sym.replace("USDT","")} ${o.dir==="long"?"L":"S"}</span>`).join(" ")||'<span class="muted">—</span>'}</td></tr>`; }).join("");
  const cons=Object.entries(ld.sym||{}).map(([s,v])=>({s,l:v.long.n,sh:v.short.n,w:v.long.w-v.short.w})).filter(x=>x.l+x.sh>=2).sort((a,b)=>Math.abs(b.w)-Math.abs(a.w)).slice(0,14).map(x=>`<span class="chip ${x.w>0?"up":x.w<0?"down":"neutral"} sm">${x.s.replace("USDT","")} ${x.l}L/${x.sh}S</span>`).join(" ");
  const st=ld.busy?`<span class="warn">● çekiliyor ${esc(ld.prog)}</span>`:ld.err?`<span class="down">● ${esc(ld.err)}</span>`:ld.at?`<span class="up">● ${ld.list.length} lider · ${tl(ld.at)}</span>`:'<span class="muted">● henüz çekilmedi</span>';
  return `<details id="ldBox" style="margin-bottom:10px"><summary class="muted" style="cursor:pointer;font-size:12px">Liderler · Binance kopya trader · ${st} <button type="button" class="ghost" id="ldRefresh" style="margin-left:8px;font-size:11px;padding:2px 8px" ${ld.busy?"disabled":""}>Yenile</button></summary>
  <p class="muted" style="font-size:11.5px;margin:6px 0">Elek: 90 günlük ROI sırasıyla ilk 60 liderden AUM ≥ 20 bin $, ≥ 50 kopyalayan, maksimum düşüş ≤ %60, kazanma ≥ %50. Her lider için son 50 kapanmış pozisyon ve 100 emir. Açık pozisyon tahmini emir akışından (net miktar). Tolga bu veriyle oy verir; Can zaman stopunu liderlerin medyan tutuşuna göre ayarlar.${location.protocol==="https:"||location.protocol==="http:"?" Web sürümünde Binance tarayıcı erişimine izin vermez; masaüstü uygulamasında çekilir.":""}</p>
  ${P?`<div class="plan" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:8px"><div class="pv"><b>Kazanma</b><span>${Math.round(P.wr*100)}%</span><small>${P.n} liderin medyanı</small></div><div class="pv"><b>Ort. ROI / işlem</b><span>${pct(P.avgRoi*100,0)}</span><small>kaldıraçlı</small></div><div class="pv"><b>Medyan tutuş</b><span>${fx(P.medHold,1)} sa</span><small>%${Math.round(P.quick*100)}'i 1 saatten kısa</small></div><div class="pv"><b>Ekleme / kısmi</b><span>${Math.round(P.addRate*100)}% / ${Math.round(P.partialRate*100)}%</span><small>pozisyon başına</small></div><div class="pv"><b>Kaldıraç</b><span>${fx(P.avgLev,0)}x</span><small>short payı %${Math.round(P.shortShare*100)}</small></div></div>`:""}
  ${cons?`<div style="margin-bottom:8px;font-size:11.5px"><span class="muted">Coin uzlaşısı (açık ×2 + son 72 sa):</span> ${cons}</div>`:""}
  ${rows?`<table class="t"><thead><tr><th>Lider</th><th>ROI 90g</th><th>PnL</th><th>MDD</th><th>Kazanma</th><th>Tutuş</th><th>Ekleme / kısmi</th><th>Açık (tahmin)</th></tr></thead><tbody>${rows}</tbody></table>`:""}</details>`;
}
/* --- denetçi paneli: Murat'ın raporu --- */
/* --- tahmin defteri (forecast.js): masanın her görüşü 4 saat sonra puanlanır; isabet, puan kalibrasyonu, üye becerisi, dersler --- */
const tlHM=t=>new Date(t).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
/* --- açık pozisyon toplantısının son hali: 13 üyenin pozisyon görüşü ve (varsa) yapay zekâ masasının konuşması --- */
function botRevRow(p){ const rv=p.lastReview; if(!rv||!rv.views) return ""; const L=rv.llm;
  const chips=rv.views.map(a=>`<span class="chip ${a.abst?"neutral":a.v>0.15?"up":a.v<-0.15?"down":"neutral"} sm" title="${esc((a.act||"")+": "+(a.txt||""))}">${esc(a.name)} ${a.abst?"—":(a.act&&a.act!=="tut"?esc(a.act):(a.v>0?"+":"")+fx(a.v,1))}</span>`).join(" ");
  const ai=L?`<div style="font-size:11.5px;margin-top:4px"><b>Yapay zekâ masası</b> <span class="muted">(${esc(L.model)}, ${Math.round(L.ms/1000)} sn, ${tlHM(L.t)})</span>: <b>${esc(L.dec.act.toUpperCase())}</b> · ${esc(L.dec.why)}<details><summary class="muted" style="cursor:pointer">konuşma</summary>${lmdLines(L).map(l=>`<div style="display:flex;gap:6px;margin:2px 0"><b style="min-width:52px;color:${DESK_COL[l.id]||"var(--ink)"}">${esc(l.who)}</b><span>${esc(l.text)}</span></div>`).join("")}</details></div>`:"";
  return `<tr><td colspan="9" style="padding:2px 8px 8px;font-size:11.5px"><span class="muted">Masa ${tlHM(rv.t)}: <b>${esc(String(rv.verdict).toUpperCase())}</b> · tutma ${ptsT(rv.hold)} · ${rv.rNow>=0?"+":""}${fx(rv.rNow,2)}R</span> ${chips}${ai}</td></tr>`; }
/* --- Yapay zekâ masası kartı (src/llmdesk.js; model ayarı src/llm.js, Araştırma sekmesinde Selim ile ortak) --- */
function renderLmd(){ const C=lmdCfg(); const S=lmd.stats; const rd=lmdReady(); const L=(typeof FC!=="undefined"&&FC&&FC.learn)?FC.learn:null; const K=L&&L.kinds&&L.kinds.llm; const ag=k=>L&&L.agents[k];
  const sk=k=>{ const a=ag(k); return a?`${a.n} görüş · beceri ${a.skill>=0?"+":""}${fx(a.skill,2)}${a.n>=C.minN?(a.m>1?' · <span class="up">oya hazır</span>':' · <span class="muted">artı değil</span>'):` · ${a.n}/${C.minN}`}`:"henüz sonuç yok"; };
  const last=lmd.last.slice(0,4).map(v=>`<details style="margin:4px 0"><summary style="cursor:pointer;font-size:12px">${tlHM(v.t)} · <b>${esc(v.sym.replace("USDT",""))}</b> ${v.dir} · ${v.kind==="pozisyon"?"açık pozisyon":"giriş"} → <b>${esc(v.dec.act.toUpperCase())}</b> <span class="muted">(kural masası: ${v.kind==="pozisyon"?esc(v.rule.verdict||"")+" "+pts(v.rule.hold||0):esc(v.rule.decision||"")+" "+pts(v.rule.score||0)} · ${Math.round(v.ms/1000)} sn)</span></summary>${lmdLines(v).map(l=>`<div style="display:flex;gap:6px;font-size:11.5px;margin:2px 0"><b style="min-width:56px;color:${DESK_COL[l.id]||"var(--ink)"}">${esc(l.who)}</b><span>${esc(l.text)}</span></div>`).join("")}</details>`).join("");
  return `<div class="card" style="margin-bottom:10px"><h4 style="margin:0 0 4px">Yapay zekâ masası · ${esc(llmLabel())}</h4>
  <div class="muted" style="font-size:12px;margin-bottom:6px">Kural masasının ölçümlerini ve piyasa verisini dil modeline verir; on üç üye kendi uzmanlığıyla konuşur, itiraz eder, Can karar verir. Hem giriş adaylarında hem açık pozisyonlarda toplanır. Görüşü tahmin defterinde ayrıca puanlanır; ${C.minN} görüşte becerisi artıysa ve "oy" açıksa küçük ağırlıkla puana girer. Model ayarı Araştırma sekmesinde (Selim ile ortak). Model yoksa masa kuralla çalışır.</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px">
    <label style="font-size:12px"><input type="checkbox" id="lmdOn" ${C.on?"checked":""} style="width:auto"> masada konuşsun</label>
    <label style="font-size:12px;color:var(--ink-2)">Saatte en çok <input type="number" id="lmdPerHour" value="${C.perHour}" min="1" max="200" style="width:52px"> toplantı</label>
    <label style="font-size:12px"><input type="checkbox" id="lmdVote" ${C.vote?"checked":""} style="width:auto"> kanıtlanınca oy versin</label>
    <button type="button" class="ghost" id="lmdPing">Bağlantıyı dene</button> <span class="muted" id="lmdPingR" style="font-size:11.5px"></span></div>
  <div style="font-size:12px;margin-bottom:4px">Durum: <b>${rd?esc(rd):'<span class="up">hazır</span>'}</b>${lmd.busy?" · toplantıda":""}${lmd.q.length?` · sırada ${lmd.q.length}`:""} · ${S.n} çağrı, ${S.ok} geçerli${S.bad?`, ${S.bad} bozuk`:""}${S.ok?` · ortalama ${Math.round(S.ms/S.ok/1000)} sn`:""}${lmd.err?` · <span class="down">${esc(lmd.err)}</span>`:""}</div>
  <div style="font-size:12px;margin-bottom:4px">Tahmin defteri: giriş görüşü ${sk("llm")} · pozisyon görüşü ${sk("llm:pos")}${K&&K.n?` · ${K.n} sonuç, isabet %${Math.round(K.hit*100)}`:""}</div>${last||'<div class="empty">Henüz toplantı yok.</div>'}</div>`; }
function lmdBind(){ const on=$("lmdOn"); if(!on) return; const save=()=>{ lmdSetCfg({on:$("lmdOn").checked,perHour:clamp(+$("lmdPerHour").value||8,1,200),vote:$("lmdVote").checked}); };
  for(const id of ["lmdOn","lmdPerHour","lmdVote"]) $(id).addEventListener("change",()=>{ save(); if(id!=="lmdPerHour") renderBot(); });
  $("lmdPing").addEventListener("click",async()=>{ const o=$("lmdPingR"); o.textContent="deneniyor (ilk yükleme 15–30 sn sürebilir)…"; const r=await lmdPing(); o.textContent=r.ok?`cevap ${fx(r.ms/1000,1)} sn: "${String(r.text||"").trim().slice(0,40)}"`:`hata: ${r.err}`; }); }
lmd.onView=v=>{ botLog("llm",v.sym,`Yapay zekâ masası · ${v.kind==="pozisyon"?"açık pozisyon":"giriş"} ${v.dir} → ${v.dec.act.toUpperCase()} (oy ${v.dec.v>0?"+":""}${fx(v.dec.v,2)}, ${Math.round(v.ms/1000)} sn): ${v.dec.why}`); if(ui.drawerOpen&&ui.drawerTab==="bot") renderBot(); };
function renderForecast(){
  const F=fcLoad(); const L=F.learn; const head=`<h4 style="margin:0 0 4px">Tahmin defteri · masa doğru mu görüyor?</h4>`;
  const intro=`<div class="muted" style="font-size:12px;margin-bottom:6px">İşlem açılsın açılmasın, taranan her coinde masanın long ve short görüşü saatte bir kaydedilir; 4 saat sonra bakılır: fiyat önce 1 ATR lehe mi gitti, 1 ATR aleyhe mi? Rastgele mumda isabet %48–50 (6 aylık veri). Masanın puanı yükseldikçe isabet artmıyorsa sinyal yok demektir. Üyelerin ağırlığı ve Murat'ın dersleri buradan da öğrenir.</div>`;
  if(!L||!L.n) return `<div class="card" style="margin-bottom:10px">${head}${intro}<div class="empty">${F.pend.length} tahmin bekliyor; ilk sonuçlar 4 saat sonra.</div></div>`;
  const pc=h=>h==null?"—":"%"+Math.round(h*100); const cls=h=>h==null?"":h>=0.55?"up":h<=0.45?"down":"";
  const bk=L.buckets.map(b=>`<tr><td>${b.t}</td><td class="num">${b.n}</td><td class="num ${cls(b.hit)}">${pc(b.hit)}</td></tr>`).join("");
  const ags=DESK.filter(d=>L.agents[d.id]).map(d=>{ const a=L.agents[d.id]; return `<tr><td><b>${esc(d.name)}</b> <span class="muted" style="font-size:10.5px">${esc(d.role)}</span></td><td class="num">${a.n}</td><td class="num ${a.skill>0.03?"up":a.skill<-0.03?"down":""}">${a.skill>=0?"+":""}${fx(a.skill,2)}</td><td class="num">${a.yesN?pc(a.yesHit)+" · "+a.yesN:"—"}</td><td class="num">${a.noN?pc(1-a.noHit)+" · "+a.noN:"—"}</td><td class="num">${a.m===1&&a.n<FC_DEF.minAgent?`<span class="muted">${a.n}/${FC_DEF.minAgent}</span>`:"×"+fx(a.m,2)}</td></tr>`; }).join("");
  // faktör kütüphanesi (factors.js): geçmiş ölçümü (iki yarının IC'si) + canlı tahmin defteri; ağırlık = facWeight (Kaan'ın oyunda)
  const fac=FACTORS.map(f=>{ const a=L.agents["f:"+f.id]; const ft=FAC_FIT[f.id]||{}; const w=facWeight(f.id); const ic=v=>v==null?"—":(v>=0?"+":"")+fx(v,3);
    return `<tr><td><b>${esc(f.ad)}</b><br><span class="muted" style="font-size:10.5px">${esc(f.kaynak)}</span></td><td>${ft.st==="aktif"?'<span class="up">aktif</span>':'<span class="muted">izlemede</span>'}</td><td class="num">${ft.n?ic(ft.ic1)+" / "+ic(ft.ic2):'<span class="muted">canlı veri</span>'}</td><td class="num">${a?a.n:0}</td><td class="num">${a&&a.yesN?pc(a.yesHit)+" · "+a.yesN:"—"}</td><td class="num">${w>0?"×"+fx(w,2):"—"}</td></tr>`; }).join("");
  const les=L.lessons.map(l=>`<li>${l.dir==="long"?"Long":"Short"} · ${esc(l.k)} = <b>${esc(l.v)}</b>: ${l.n} tahminde isabet ${pc(l.hit)} (taban ${pc(l.base)}) → Murat karşı oy verir</li>`).join("");
  return `<div class="card" style="margin-bottom:10px">${head}${intro}
  <div style="font-size:12px;margin-bottom:6px"><b>${L.n}</b> sonuçlanmış tahmin (${F.pend.length} bekliyor) · genel isabet <b class="${cls(L.base)}">${pc(L.base)}</b> · long ${pc(L.dir.long&&L.dir.long.hit)} · short ${pc(L.dir.short&&L.dir.short.hit)} · masanın "giriş" dediği ${L.go.n} tahminde <b class="${cls(L.go.hit)}">${pc(L.go.hit)}</b></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;align-items:start">
  <table class="t"><thead><tr><th>Masa puanı</th><th>Tahmin</th><th>İsabet</th></tr></thead><tbody>${bk}</tbody></table>
  <table class="t"><thead><tr><th>Üye</th><th>Tahmin</th><th>Beceri</th><th>Evet → doğru</th><th>Hayır → doğru</th><th>Ağırlık</th></tr></thead><tbody>${ags}</tbody></table></div>
  <details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:12px">Faktörler (Kaan · ${FACTORS.length} faktör, ${FACTORS.filter(f=>facWeight(f.id)>0).length} oyda)</summary>
  <table class="t" style="margin-top:6px"><thead><tr><th>Faktör</th><th>Durum</th><th>Geçmiş IC (1. / 2. yarı)</th><th>Canlı tahmin</th><th>Evet → doğru</th><th>Ağırlık</th></tr></thead><tbody>${fac}</tbody></table>
  <div class="muted" style="font-size:11px;margin-top:4px">Aktif: 6 aylık veride iki yarıda da bilgi katsayısı artı ve "evet" isabeti tabanın üstünde. İzlemede: tutmadı ya da geçmiş verisi yok; oy vermez ama her görüşü burada puanlanır, 200 canlı tahminde becerisi artıysa küçük ağırlıkla oya girer.</div></details>
  <details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:12px">En yüksek puanlı tahminler</summary>
  <table class="t" style="margin-top:6px"><thead><tr><th>Zaman</th><th>Coin</th><th>Yön</th><th>Puan</th><th>Sonuç</th><th>Evet diyenler</th></tr></thead><tbody>${fcTop(F,5).map(x=>`<tr><td>${new Date(x.t).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</td><td>${esc(x.sym.replace(/USDT$/,""))}</td><td>${x.dir}${x.go?" · giriş":""}</td><td class="num">${pts(x.score)}</td><td class="${x.y===1?"up":x.y===0?"down":""}">${x.y===1?"tuttu":x.y===0?"tutmadı":"süre doldu"}</td><td style="font-size:11px">${x.yes.map(id=>{ const d=DESK.find(m=>m.id===id); return esc(d?d.name:id); }).join(", ")}</td></tr>`).join("")}</tbody></table></details>
  <div style="font-size:12px;margin-top:6px"><b>Dersler:</b> ${les?`<ul style="margin:4px 0 0 18px;padding:0">${les}</ul>`:`henüz yok (bir kalıp en az ${FC_DEF.minLesson} tahminde tabandan ${Math.round(FC_DEF.lessonGap*100)} puan kötü ve iki yarıda da altında olmalı)`}</div>
  <div class="muted" style="font-size:11px;margin-top:4px">Beceri = oy × sonuç (+1 doğru, −1 yanlış, 0 süre doldu) ortalaması; 0 = yazı tura. Ağırlık en az ${FC_DEF.minAgent} tahminden sonra değişir.</div></div>`;
}
function renderAudit(){
  const A=AUD; const S=A&&A.summary; const head=`<h4 style="margin:0 0 4px">Denetçi · Murat</h4>`;
  if(!S) return `<div class="card" style="margin-bottom:10px">${head}<div class="empty">Kapanan her işlemi inceler: girişte kim ne dedi, fiyat lehimize ne kadar gitti, nasıl kapandı. Hataları etiketler; aynı hata en az ${AUD_MIN} işlemde tekrar edip zarar ettirirse masaya kural olarak geri verir.</div></div>`;
  const rows=Object.keys(AUD_TAGS).map(k=>({k,...A.tags[k]})).filter(x=>x.n>0).sort((a,b)=>a.shr-b.shr).map(x=>{ const L=A.lessons.find(l=>l.k===x.k); return `<tr><td><b>${esc(AUD_TAGS[x.k].t)}</b><br><span class="muted" style="font-size:10.5px">${esc(AUD_TAGS[x.k].why)}</span></td><td class="num">${x.n}</td><td class="num ${x.avg>=0?"up":"down"}">${x.avg>=0?"+":""}${fx(x.avg,2)}R</td><td class="num muted">${x.nNot?(x.avgNot>=0?"+":"")+fx(x.avgNot,2)+"R":"—"}</td><td style="font-size:11.5px">${L?`<span class="warn">ders: ${esc(L.lever)}</span>`:x.n<AUD_MIN?`<span class="muted">izleniyor (${x.n}/${AUD_MIN})</span>`:'<span class="muted">zarar farkı yok</span>'}</td></tr>`; }).join("");
  const mult=Object.entries(A.mult).map(([id,m])=>{ const d=DESK.find(x=>x.id===id); return `<span class="chip sm ${m.m>1.02?"up":m.m<0.98?"down":""}" title="oy ile sonuç arasındaki ilişki ${fx(m.corr,2)} · ${m.n} işlem">${esc(d?d.name:id)} ×${fx(m.m,2)}</span>`; }).join(" ");
  const tl=t=>new Date(t).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
  const fnd=A.findings.map(f=>`<tr><td class="num muted">${tl(f.closeT)}</td><td><b>${f.sym.replace("USDT","")}</b> ${chip(f.dir==="long"?"up sm":"down sm",f.dir==="long"?"L":"S")}</td><td class="num down">${fx(f.r,2)}R</td><td class="num">${isFinite(f.mfe)?"+"+fx(f.mfe,1)+"R":"—"}</td><td class="muted">${Math.round((f.closeT-f.openT)/60e3)} dk · ${esc((f.exits||[]).join(" → ")||"—")}</td><td style="font-size:11.5px">${f.tags.map(k=>esc(AUD_TAGS[k].t)).join(", ")||'<span class="muted">belirgin hata yok</span>'}</td></tr>`).join("");
  const levers=[A.thrBump?`eşik ${pts(bot.cfg.threshold)} → ${pts(botThr())}`:"",A.minYesBump?`asgari oy ${bot.cfg.minYes} → ${botMinYes()}`:"",A.maxSameDir?`aynı yönde en fazla ${A.maxSameDir} pozisyon`:"",A.pauseMin?`kayıptan sonra ${A.pauseMin} dk ara`:"",A.sdMin>0.015?`stop tabanı %${fx(A.sdMin*100,1)}`:"",A.lockEarly?"1R görüp geri gelirse yarısı alınır":"",A.warnBlock?"uyarılı kurulumla girilmez":"",...Object.keys(A.off||{}).map(k=>`"${(DEC_KIND[k]||k).toLowerCase()}" kapalı`)].filter(Boolean);
  return `<div class="card" style="margin-bottom:10px">${head}
  <div class="muted" style="font-size:12px;margin-bottom:6px">${S.n} kapanmış işlem · kazanma %${Math.round(S.wr*100)} · ortalama ${S.avg>=0?"+":""}${fx(S.avg,2)}R · toplam ${S.sum>=0?"+":""}${fx(S.sum,1)}R · komisyon+fonlama işlem başına ${fx(S.feeR,2)}R · ${S.snap} işlemde girişteki oylar kayıtlı${S.snap<S.n?" (öncekiler karar günlüğünden okunabildiği kadar)":""}.</div>
  <div style="font-size:12px;margin-bottom:6px"><b>Masaya etkisi:</b> ${levers.length?levers.join(" · "):"henüz kural yok"}${Object.keys(A.vote).length?" · Murat şu kalıplara karşı oy verir: "+Object.keys(A.vote).map(k=>AUD_TAGS[k].t.toLowerCase()+(A.veto[k]?" (veto)":"")).join(", "):""}</div>
  ${mult?`<div style="font-size:12px;margin-bottom:6px"><b>Ağırlıklar:</b> ${mult}</div>`:""}
  ${rows?`<table class="t" style="margin-bottom:8px"><thead><tr><th>Hata</th><th>İşlem</th><th>Ort. R</th><th>Diğerleri</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table>`:""}
  ${A.decs&&Object.keys(A.decs).length?`<table class="t" style="margin-bottom:8px"><thead><tr><th>Masa kararı</th><th>Puanlanan</th><th>İyi çıkan</th><th>Ort. etki</th><th>Durum</th></tr></thead><tbody>${Object.entries(A.decs).map(([k,o])=>`<tr><td><b>${esc(DEC_KIND[k]||k)}</b></td><td class="num">${o.n}</td><td class="num">${o.good}/${o.n}</td><td class="num ${o.avg>=0?"up":"down"}">${o.avg>=0?"+":""}${fx(o.avg,2)}R</td><td style="font-size:11.5px">${A.off&&A.off[k]?'<span class="warn">kol kapatıldı</span>':o.n<AUD_MIN?`<span class="muted">izleniyor (${o.n}/${AUD_MIN})</span>`:'<span class="muted">açık</span>'}</td></tr>`).join("")}</tbody></table>`:""}
  ${fnd?`<details><summary class="muted" style="cursor:pointer;font-size:12px">Son kayıpların teşhisi · ${A.findings.length}</summary><table class="t" style="margin-top:6px"><thead><tr><th>Kapanış</th><th>İşlem</th><th>R</th><th>En iyi</th><th>Süre · çıkış</th><th>Hata</th></tr></thead><tbody>${fnd}</tbody></table></details>`:""}
  <p class="muted" style="font-size:11px;margin:6px 0 0">Ortalama R küçültülerek okunur (toplam / (işlem + 4)); bir hata en az ${AUD_MIN} işlemde görülüp diğerlerinden 0,25R daha kötüyse ders olur, 10 işlemde −0,5R altındaysa veto olur. Az örnekte dersler yanılabilir; kâğıt bot bu yüzden var.</p></div>`;
}
function renderBot(){
  const el=$("dBot"); if(!el) return; const eq=botEquity(); const d=botDay(); const c=bot.cfg; const roi=(eq/bot.start-1)*100; const gs=botGoal();
  const st=bot.trades.length?{n:bot.trades.length,win:bot.trades.filter(t=>t.pnl>0).length,sum:bot.trades.reduce((a,t)=>a+t.r,0)}:null;
  const inp=(id,label,val,step,min,max,w)=>`<label style="font-size:12px;color:var(--ink-2);display:inline-flex;gap:4px;align-items:center">${label} <input type="number" id="${id}" value="${val}" step="${step}" min="${min}" max="${max}" style="width:${w||64}px"></label>`;
  const head=`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
    <button type="button" class="${bot.on?"":"primary"}" id="botTgl">${bot.on?"Durdur":"Başlat"}</button><button type="button" class="ghost" id="botCsv">CSV indir</button><button type="button" class="ghost" id="botCloseAll" ${bot.positions.length?"":"disabled"}>Hepsini kapat</button><button type="button" class="ghost" id="botReset">Sıfırla</button>
    <label style="font-size:12px;color:var(--ink-2)">Mod <select id="botMode"><option value="komite" ${c.mode==="komite"?"selected":""}>Masa (10 kişi tartışır, market giriş, çoklu pozisyon)</option><option value="kapi" ${c.mode!=="komite"?"selected":""}>Kapı (AMD/K2/K3 limit planları)</option></select></label>
    <span class="muted" style="font-size:11.5px">${botNetTxt()} · ${bot.on?'<span class="up">● çalışıyor</span>':"● durdu"}${bot.startT?" · başlangıç "+new Date(bot.startT).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):""}</span></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
    ${inp("botRisk","Taban risk %",(c.risk*100).toFixed(1),0.5,0.5,25)} ${inp("botRiskMax","Güvenle risk en çok %",((c.riskMax!=null?c.riskMax:c.risk)*100).toFixed(1),0.5,0.5,25)}${inp("botLev","Kaldıraç",c.lev,1,1,50,56)} ${inp("botMaxPos","Aynı anda",c.maxPos,1,1,10,52)} ${inp("botThr","Eşik /"+SCORE_MAX,Math.round(c.threshold*SCORE_MAX),1,0,SCORE_MAX,60)} ${inp("botMinYes","Asgari oy",c.minYes,1,1,DESK.length,52)} ${inp("botHold","Zaman stopu (sa)",c.holdH,1,1,72,56)} ${inp("botMaxOpens","Gün/işlem",c.maxOpens,1,1,50,56)} ${inp("botMaxLosses","Gün/kayıp",c.maxLosses,1,1,50,56)}
    ${c.mode==="komite"?`${inp("botGoal","Hedef $",c.goal,10,110,100000,70)} ${inp("botSameDir","Aynı yönde",c.maxSameDir,1,1,10,48)} ${inp("botBeR","Başabaş R (0 kapalı)",c.beR,0.1,0,3,52)} <label style="font-size:12px;color:var(--ink-2)">Short <select id="botShort"><option value="warn" ${c.shortRule==="warn"?"selected":""}>uyarıyla (boy ×0,75)</option><option value="off" ${c.shortRule==="off"?"selected":""}>serbest</option><option value="fail" ${c.shortRule==="fail"?"selected":""}>kapalı</option></select></label> <label style="font-size:12px;color:var(--ink-2)"><input type="checkbox" id="botFree" ${c.freeMargin?"checked":""} style="width:auto"> Yer açmak için kâr al</label> <label style="font-size:12px;color:var(--ink-2)"><input type="checkbox" id="botDyn" ${c.dyn?"checked":""} style="width:auto"> Dinamik hedef/stop</label> <label style="font-size:12px;color:var(--ink-2)" title="Bakiye düşse de masa işlem açmaya devam eder: koru modu (risk ×0,6, eşik +5), kayıptan sonra soğuma ve günlük kayıp sınırı kalkar. Stoplar, eşik, oy, veto, yer ve aynı yön sınırları aynen kalır."><input type="checkbox" id="botAggr" ${c.aggr?"checked":""} style="width:auto"> Agresif mod (düşüşte fren yok)</label>`:""}
    ${c.mode!=="komite"?`<label style="font-size:12px;color:var(--ink-2)"><input type="checkbox" id="botStrict" ${c.strict?"checked":""} style="width:auto"> 10 kapı kuralı</label><label style="font-size:12px;color:var(--ink-2)"><input type="checkbox" id="botBR" ${c.useBR?"checked":""} style="width:auto"> Kurulum 2</label><label style="font-size:12px;color:var(--ink-2)"><input type="checkbox" id="botRS" ${c.useRS!==false?"checked":""} style="width:auto"> Kurulum 3</label>`:""}
  </div>
  <div class="plan" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:10px">
    <div class="pv"><b>Bakiye</b><span class="${bot.bal>=bot.start?"up":"down"}">${fmtB(bot.bal)}</span><small>başlangıç ${fmtB(bot.start)}</small></div>
    <div class="pv"><b>Özkaynak (canlı)</b><span id="botEqV" class="${eq>=bot.start?"up":"down"}">${fx(eq,2)} $</span><small id="botEqP">${pct(roi,2)} · açık PnL ${eq-bot.bal>=0?"+":""}${fx(eq-bot.bal,2)} $</small></div>
    <div class="pv"><b>Hedef ${fx(gs.goal,0)} $</b><span id="botRoiV" class="${gs.prog>=1?"up":gs.prog>=0?"":"down"}">%${Math.round(clamp(gs.prog,-9,9)*100)}</span><small><span style="display:block;height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden;margin-top:4px"><span id="botRoiBar" style="display:block;height:100%;width:${clamp(gs.prog*100,0,100)}%;background:var(--long)"></span></span><span id="botRoiRem">${gs.need<=0||bot.goalHit?"ulaşıldı, kâr kilitli":"kalan "+fmtB(gs.need)}</span></small></div>
    <div class="pv"><b>Masanın modu</b><span class="${gs.mode==="normal"?"":gs.mode==="tamam"?"up":"warn"}">${{normal:"normal",koru:"koru",agresif:"agresif",yakın:"hedefe yakın",tamam:"hedef tamam"}[gs.mode]}</span><small>${esc(gs.why)} · zirve ${fmtB(gs.peak)}</small></div>
    <div class="pv"><b>Bugün</b><span>${d.opens}/${c.maxOpens}</span><small>${d.losses}/${c.maxLosses} kayıp</small></div>
    <div class="pv"><b>İşlemler</b><span>${st?st.n:0}</span><small>${st?`hedef %${Math.round(st.win/st.n*100)} · ${st.sum>=0?"+":""}${fx(st.sum,1)}R`:"henüz yok"}</small></div>
    <div class="pv"><b>Açık</b><span>${bot.positions.length}/${c.maxPos}</span><small>${bot.orders.length} bekleyen emir · teminat ${fmtB(botMarginUsed())}</small></div>
  </div>`;
  const pos=bot.positions.map(p=>{ const px=botMk(p.sym); const pnl=px?botPnl(p,px):0; const roe=pnl/p.margin*100; const age=Math.round((Date.now()-p.openT)/60000); return `<tr data-pos="${p.sym}"><td><b>${p.sym.replace("USDT","")}</b> ${chip(p.dir==="long"?"up sm":"down sm",p.dir==="long"?"L":"S")} <span class="muted">${p.model} ${p.grade} ${p.lev}x</span></td><td class="num">${fmtB(p.notional)}<br><span class="muted" style="font-size:10.5px">teminat ${fmtB(p.margin)}</span></td><td class="num">${fmtP(p.entry)}</td><td class="num bpx">${px?fmtP(px):"—"}</td><td class="num warn">${fmtP(botLiqPx(p))}</td><td class="num down bstop">${fmtP(p.stop)}</td><td class="num up">${fmtP(p.t1)} / ${fmtP(p.t2)}</td><td class="num bpnl ${pnl>=0?"up":"down"}">${pnl>=0?"+":""}${fx(pnl,2)} $<br><span style="font-size:11px">${roe>=0?"+":""}${fx(roe,1)}%</span></td><td class="muted bst">${p.stage} · ${age} dk</td></tr>${botRevRow(p)}`; }).join("");
  const ord=bot.orders.map(o=>`<tr data-ord="${o.sym}"><td><b>${o.sym.replace("USDT","")}</b> ${chip(o.dir==="long"?"up sm":"down sm",o.dir==="long"?"L":"S")} <span class="muted">${o.model} ${o.grade} · bekleyen limit</span></td><td class="num">${fmtB(o.notional)}</td><td class="num">${fmtP(o.entry)}</td><td class="num bpx">${bot.px[o.sym]?fmtP(bot.px[o.sym]):"—"}</td><td></td><td class="num down">${fmtP(o.stop)}</td><td class="num up">${fmtP(o.t1)}</td><td></td><td class="muted">${Math.max(0,Math.round((o.expires-Date.now())/60000))} dk kaldı</td></tr>`).join("");
  const votes=c.mode==="komite"&&bot.lastVotes.length?`<details style="margin-bottom:10px"${bot.positions.length?"":" open"}><summary class="muted" style="cursor:pointer;font-size:12px">Komite son oylaması · ${bot.lastVotes.length} aday</summary><table class="t" style="margin-top:6px"><thead><tr><th>Coin</th><th>Puan</th><th>Oy</th>${bot.lastVotes[0].agents.map(a=>`<th>${a.k}</th>`).join("")}<th>Karar</th></tr></thead><tbody>${bot.lastVotes.map(v=>`<tr class="${v.go?"pick":""}"><td><b>${v.sym.replace("USDT","")}</b> ${chip(v.dir==="long"?"up sm":"down sm",v.dir==="long"?"L":"S")}</td><td class="num ${v.score>=c.threshold?"up":""}">${pts(v.score)}</td><td class="num">${v.yes}/${DESK.length}</td>${v.agents.map(a=>`<td class="num ${a.v>0.15?"up":a.v<-0.15?"down":"muted"}" title="${esc(a.txt)}">${a.v>0?"+":""}${fx(a.v,1)}</td>`).join("")}<td class="muted">${v.veto?"veto: "+esc(v.veto):v.held?"açık":v.cool?"bekleme":v.go?'<span class="up">giriş</span>':"eşik altı"}</td></tr>`).join("")}</tbody></table><p class="muted" style="font-size:11px;margin:4px 0 0">Hücrenin üstüne gel: ajanın gerekçesi. Puan = ağırlıklı oy; Kerem 1,3, Onur ve Baran 0,8, diğerleri 1; Murat'ın derslerine göre her ajanın ağırlığı 0,6–1,4 kat değişebilir, Murat de en az 5 oylu kapanmış işlem birikene kadar oya girmez. Oylar tartışma sonrası değerler.</p></details>`:"";
  const room=c.mode==="komite"?renderRoom():"";
  const audit=renderAudit();
  const tr=bot.trades.slice(-12).reverse().map(t=>`<tr><td class="num muted">${new Date(t.closeT).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</td><td><b>${t.sym.replace("USDT","")}</b> ${chip(t.dir==="long"?"up sm":"down sm",t.dir==="long"?"L":"S")} <span class="muted">${t.model} ${t.grade} ${t.lev}x</span></td><td class="num">${fmtP(t.entry)}</td><td class="num ${t.pnl>=0?"up":"down"}">${t.pnl>=0?"+":""}${fx(t.pnl,2)} $</td><td class="num ${t.r>=0?"up":"down"}">${t.r>=0?"+":""}${fx(t.r,2)}R</td></tr>`).join("");
  const lg=bot.log.slice(-40).reverse().map(l=>`<div class="tp ${{fill:"buy",tp1:"buy",tp2:"buy",stop:"sell",time:"",desk:"",audit:"",goal:"buy",add:"buy",cancel:"",skip:"",order:"",close:"",sys:"",move:"",fund:""}[l.type]||""}" style="grid-template-columns:110px 70px 1fr"><span class="when">${new Date(l.t).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span><span class="k ${{fill:"up",tp1:"up",tp2:"up",close:"",stop:"down",time:"warn",desk:"cyan",audit:"warn",goal:"up",add:"up",cancel:"warn",skip:"muted",order:"cyan",sys:"muted",move:"cyan",fund:"muted"}[l.type]||""}">${{fill:"DOLDU",tp1:"HEDEF 1",tp2:"HEDEF 2",stop:"STOP",time:"ZAMAN",desk:"MASA",audit:"DENETÇİ",goal:"HEDEF",add:"EKLEME",cancel:"İPTAL",skip:"BEKLE",order:"EMİR",close:"KAPANDI",sys:"SİSTEM",move:"STOP↑",fund:"FONLAMA"}[l.type]||l.type}</span><span>${l.sym?"<b>"+l.sym.replace("USDT","")+"</b> · ":""}${l.text}</span></div>`).join("");
  el.innerHTML=head+room+renderForecast()+renderLmd()+audit+(c.mode==="komite"?renderLeaders():"")+((pos||ord)?`<table class="t" style="margin-bottom:10px"><thead><tr><th>Pozisyon</th><th>Boyut</th><th>Giriş</th><th>Mark</th><th>Likid.</th><th>Stop</th><th>Hedef 1 / 2</th><th>PnL (ROE)</th><th>Durum</th></tr></thead><tbody>${pos}${ord}</tbody></table>`:"")+votes+(tr?`<table class="t" style="margin-bottom:10px"><thead><tr><th>Kapanış</th><th>İşlem</th><th>Giriş</th><th>PnL</th><th>R</th></tr></thead><tbody>${tr}</tbody></table>`:"")+`<div class="tape" style="max-height:320px">${lg||'<div class="empty">Karar günlüğü boş. Başlat\'a bas; her tarama turunda ne yaptığını ve neden yapmadığını buraya yazar.</div>'}</div>`+renderTurtle()+renderTrend()+renderDip();
  $("botTgl").addEventListener("click",()=>{ bot.on?botStop():botStart(); renderBot(); }); $("botCsv").addEventListener("click",botCsv); $("botReset").addEventListener("click",botReset); $("botCloseAll").addEventListener("click",botCloseAll);
  $("botMode").addEventListener("change",e=>{ bot.cfg.mode=e.target.value; botSave(); });
  const rs=$("botRoomSel"); if(rs) rs.addEventListener("change",e=>{ bot.roomSel=e.target.value; renderBot(); });
  trendBind(); dipBind(); ttBind(); lmdBind();
  const lr=$("ldRefresh"); if(lr) lr.addEventListener("click",()=>{ ldRefresh(true); });
  const num=(id,key,f)=>{ const n=$(id); if(n) n.addEventListener("change",e=>{ const v=+e.target.value; if(isFinite(v)){ bot.cfg[key]=f?f(v):v; botSave(); } }); };
  num("botRisk","risk",v=>clamp(v,0.5,25)/100); num("botRiskMax","riskMax",v=>clamp(v,0.5,25)/100);num("botLev","lev",v=>clamp(Math.round(v),1,50)); num("botMaxPos","maxPos",v=>clamp(Math.round(v),1,10)); num("botThr","threshold",v=>clamp(v,0,SCORE_MAX)/SCORE_MAX); num("botMinYes","minYes",v=>clamp(Math.round(v),1,DESK.length)); num("botHold","holdH",v=>clamp(Math.round(v),1,72)); num("botMaxOpens","maxOpens",v=>clamp(Math.round(v),1,50)); num("botMaxLosses","maxLosses",v=>clamp(Math.round(v),1,50)); num("botGoal","goal",v=>clamp(v,110,100000)); num("botSameDir","maxSameDir",v=>clamp(Math.round(v),1,10)); num("botBeR","beR",v=>clamp(v,0,3));
  const bs=$("botShort"); if(bs) bs.addEventListener("change",e=>{ bot.cfg.shortRule=e.target.value; botSave(); }); const bf=$("botFree"); if(bf) bf.addEventListener("change",e=>{ bot.cfg.freeMargin=e.target.checked; botSave(); }); const bd=$("botDyn"); if(bd) bd.addEventListener("change",e=>{ bot.cfg.dyn=e.target.checked; botSave(); }); const ba=$("botAggr"); if(ba) ba.addEventListener("change",e=>{ bot.cfg.aggr=e.target.checked; botLog("sys","",e.target.checked?"Agresif mod açık: bakiye düşse de masa işlem açar (koru modu, kayıp soğuması ve günlük kayıp sınırı kapalı).":"Agresif mod kapalı: düşüş frenleri yeniden çalışıyor."); botSave(); });
  const s=$("botStrict"); if(s) s.addEventListener("change",e=>{ bot.cfg.strict=e.target.checked; botSave(); }); const b=$("botBR"); if(b) b.addEventListener("change",e=>{ bot.cfg.useBR=e.target.checked; botSave(); }); const q=$("botRS"); if(q) q.addEventListener("change",e=>{ bot.cfg.useRS=e.target.checked; botSave(); });
}
/* --- REST yedeği: WebSocket 6 saniye susarsa mark (premiumIndex) ve son fiyat (ticker/price) 3 saniyede bir çekilir; pozisyonlar yürümeye devam eder --- */
async function botPoll(){
  const need=bot.positions.length||bot.orders.length; if(!need||bot._polling) return; const now0=Date.now();
  const stalePx=!(bot.lastTick&&now0-bot.lastTick<6000)||bot.src==="rest"; const staleMk=!(bot.lastMark&&now0-bot.lastMark<10000)&&now0-(bot._mkAt||0)>=5000;
  if(!stalePx&&!staleMk) return;
  bot._polling=true;
  try{ const syms=new Set([...bot.positions.map(p=>p.sym),...bot.orders.map(o=>o.sym)]);
    const [prem,tick]=await Promise.all([staleMk?j("/fapi/v1/premiumIndex"):null,stalePx?j("/fapi/v1/ticker/price"):null]); const now=Date.now();
    if(prem){ for(const x of prem){ if(syms.has(x.symbol)&&+x.markPrice>0) bot.mark[x.symbol]=+x.markPrice; } bot._mkAt=now; bot.markSrc="rest"; }
    if(tick){ for(const t of tick){ if(syms.has(t.symbol)&&+t.price>0) botOnPrice(t.symbol,+t.price,now); } bot.lastTick=now; bot.src="rest"; if(!bot._restNoted){ bot._restNoted=true; botLog("sys","","Fiyat akışı (WebSocket) sustu; fiyatlar REST'ten 3 saniyede bir alınıyor. Pozisyonlar normal yürür."); } }
    bot.pollErr=null; bot._lr=0; botLive();
  }catch(e){ bot.pollErr=String(e.message||e).slice(0,120); bot.pollErrAt=Date.now(); if(Date.now()-(bot._pollLogAt||0)>300e3){ bot._pollLogAt=Date.now(); botLog("skip","",`Fiyat yedeği (REST) hata verdi: ${bot.pollErr}. 3 saniyede bir yeniden denenir.`); } }
  finally{ bot._polling=false; }
}
/* --- traderların pozisyon yönetimi: her 2 dakikada bir, her açık kâğıt pozisyon için masa yeniden toplanır; Can analistlere danışıp ekler, küçültür, erken kapatır --- */
function botCloseAt(p,part,price,why,taker){ const cfg=bot.cfg; const isL=p.dir==="long"; const q=p.qty*part; if(!(q>0)) return 0; const pnl=(isL?(price-p.entry):(p.entry-price))*q; const fee=q*price*(taker?cfg.feeTaker:cfg.feeMaker); bot.bal+=pnl-fee; p.realized+=pnl-fee; p.fees+=fee; p.qty-=q; (p.exits=p.exits||[]).push(why.k); deskFill(p,why.dec||why.k,price,q,Date.now()); p.notional=p.qty*p.entry; p.margin=p.notional/p.lev; botLog(why.k,p.sym,`${why.t} ${fmtP(price)} · %${Math.round(part*100)} kapandı · ${pnl-fee>=0?"+":""}${fmtB(pnl-fee)}.`); if(p.qty<=1e-12||part>=1){ p.qty=0; botClosePos(p); } return pnl-fee; }
async function botManage(){
  if(bot._managing&&Date.now()-(bot._manT||0)>5*60e3){ console.warn("SWEEP · pozisyon toplantısı 5 dk'dır bitmedi, kilit açılıyor"); bot._managing=false; }
  if(!bot.on||bot.cfg.mode!=="komite"||!bot.positions.length||bot._managing) return; bot._managing=true; const run=bot._manT=Date.now();
  try{ for(const p of [...bot.positions]){ if(!bot.positions.includes(p)) continue; if(Date.now()-(p.lastMan||p.openT)<120e3) continue; p.lastMan=Date.now();
    let A,c24=0; try{ const [t24,prem]=await Promise.all([j(`/fapi/v1/ticker/24hr?symbol=${p.sym}`),j(`/fapi/v1/premiumIndex?symbol=${p.sym}`)]); const r=await scanOne({t24,prem}); if(!r){ p.manErr="analiz boş döndü"; continue; } A=analyze(r._f,r._s); c24=+t24.priceChangePercent; p.manErr=null; }catch(e){ p.manErr=String(e&&e.message||e).slice(0,120); continue; }
    if(bot._manT!==run) return;
    const isL=p.dir==="long"; const px=botMk(p.sym)||A.px; const risk0=p.risk0||Math.abs(p.entry-(p.stop0||p.stop)); if(!(risk0>0)) continue;
    const rv=positionReview(A,posCtx(p,botLiqPx(p)),[],c24,{sym:p.sym});
    const rNow=rv.rNow, peakR=rv.peakR, held=rv.held; const medHold=(typeof ld!=="undefined"&&ld.profile&&isFinite(ld.profile.medHold))?ld.profile.medHold:bot.cfg.holdH/2;
    const against=rv.views.filter(a=>a.w&&a.v<-0.15).map(a=>a.name).join(", ")||"kimse"; const say=(who,t)=>botLog("desk",p.sym,`${who}: ${t}`);
    p.lastReview={t:Date.now(),verdict:rv.verdict,hold:rv.hold,score:rv.score,oppScore:rv.oppScore,rNow:+rNow.toFixed(2),views:rv.views.map(x=>({id:x.id,name:x.name,v:x.v,c:x.c,act:x.act,abst:x.abst,txt:x.txt})),llm:p.lastReview&&p.lastReview.llm};
    fcPosNote(p.id,p.sym,p.dir,A,rv); lmdPosAsk(p,rv,A,c24);
    const taker=isL?px*(1-bot.cfg.slip):px*(1+bot.cfg.slip);
    // dinamik hedef/stop (goal.js): başabaş, dirence göre hedef 1, koşucuyu uzat/kısalt, yapısal stop, 200 $'a taşıyan hedef 1'de tamamı
    const adj=deskAdjust(p,{cfg:bot.cfg,px,rv,lvl:isL?(A.R&&A.R[0]):(A.S&&A.S[0]),thr:botThr(),gs:botGoal(),aud:AUD}); for(const a of adj){ deskApply(p,a,px,Date.now()); say(a.who,a.txt); } if(adj.length) botSave();
    const act=posAct(p,rv,{thr:bot.cfg.threshold,medHold,lockEarly:!!(AUD&&AUD.lockEarly)});
    if(act==="exit"){ say("Can",`masa pozisyonu bırakıyor (tutma puanı ${pts(rv.hold)}, ters yön ${pts(rv.oppScore)}; karşı: ${against}). ${rNow>=0?"Kârla":"Zararla"} kapatıyorum, ${fx(rNow,2)}R.`); botCloseAt(p,1,taker,{k:"desk",t:"Masa kararı · çık"},true); continue; }
    if(act==="reduce"){ p.reduced=true; say("Can",`analistler ikna değil (karşı: ${against}); yarısını kapatıyorum${rNow>0.5?", stop girişe":""}.`); botCloseAt(p,0.5,taker,{k:"desk",t:"Masa kararı · azalt"},true); if(bot.positions.includes(p)&&rNow>0.5&&(isL?p.entry>p.stop:p.entry<p.stop)) p.stop=p.entry; botSave(); continue; }
    if(act==="time"){ say("Onur",`${fx(held,1)} saattir ${rNow>=0?"+":""}${fx(rNow,2)}R'de sürünüyor; liderlerin medyan tutuşu ${fx(medHold,1)} saat. Zaman maliyeti var.`); say("Can",`Kabul, süreç uzadı ve masa ikna değil (tutma ${pts(rv.hold)}); kapatıp sermayeyi boşa çıkarıyorum.`); botCloseAt(p,1,taker,{k:"desk",t:"Masa kararı · süre doldu"},true); continue; }
    if(act==="lock"){ p.locked=true; const tpBy=rv.views.filter(x=>x.w&&x.act==="kâr al"); if(rv.takeProfit) say(tpBy.map(x=>x.name).join(", "),`${fx(rNow,2)}R kârdayız, kâr al diyoruz: ${tpBy.map(x=>x.txt).join(" · ")}.`); else say("Baran",`${fx(peakR,1)}R görüp ${fx(rNow,1)}R'ye geri geldi, momentum söndü.`); say("Can",`Yarısını alıyorum, stop girişe; kalan koşsun.`); botCloseAt(p,0.5,taker,{k:"desk",t:"Masa kararı · kârı kilitle"},true); if(bot.positions.includes(p)){ p.stop=p.entry; p.stage="tp1"; } botSave(); continue; }
    if(act==="add"){
      const addQty=p.qty0*0.5; const addNotional=addQty*px; const addMargin=addNotional/p.lev; if(addMargin+botMarginUsed()<=bot.bal*0.95){ p.added=true; const fill=isL?px*(1+bot.cfg.slip):px*(1-bot.cfg.slip); const fee=addNotional*bot.cfg.feeTaker; bot.bal-=fee; p.fees+=fee;
        const newQty=p.qty+addQty; p.entry=(p.entry*p.qty+fill*addQty)/newQty; p.qty=newQty; p.notional=p.qty*p.entry; p.margin=p.notional/p.lev; const stop0=p.stop; if(isL? p.stop<p.entry : p.stop>p.entry) p.stop=p.entry; // eklemeden sonra stop en az yeni ortalamada: hedef 1 kârı eklemeyle geri verilmesin (WLFI 8 Eki)
        
        const lp=(typeof ld!=="undefined"&&ld.profile)?` Tolga: liderlerin %${Math.round((ld.profile.addRate||0)*100)}'i kazanan pozisyona ekliyor.`:""; say("Baran",`hedef 1 alındı, masa hâlâ tut diyor (puan ${pts(rv.score)}); yarım boy ekliyorum.`+lp); say("Can",`Onay: ekleme bir kez, yarım boy. Ortalama giriş ${fmtP(p.entry)}, stop ${p.stop!==stop0?fmtP(stop0)+" → ":""}${fmtP(p.stop)}.`); botLog("add",p.sym,`Ekleme ${fmtP(fill)} · ${fmtB(addNotional)} · toplam ${fmtB(p.notional)} · teminat ${fmtB(p.margin)}.`); botSave(); continue; }
    }
    if(rv.verdict==="tut"&&!p.heldNoted){ p.heldNoted=true; say("Can",`masa tut diyor (tutma puanı ${pts(rv.hold)}, ${rv.views.filter(a=>a.w&&a.v>0.15).length}/${rv.views.filter(a=>a.w).length} destek). Plan aynen: stop ${fmtP(p.stop)}, hedef ${fmtP(p.t1)} / ${fmtP(p.t2)}.`); }
  } } finally{ if(bot._manT===run) bot._managing=false; }
}
/* --- Trend sepeti (src/trend.js): Masa'dan ayrı sanal bakiye, günde bir dengeleme, 5 dk'da bir işaretleme --- */
const trend={s:trendLoad(),busy:false,err:null,px:{}};
async function trendRun(opts){ if(trend.busy) return; trend.busy=true;
  try{ const r=await trendTick(trend.s,Date.now(),opts); trend.px=r.px; trend.err=null; trendSave(trend.s); if(r.evs.length&&ui.drawerTab==="bot") renderBot(); }
  catch(e){ trend.err=e.message; } finally{ trend.busy=false; } if(ui.drawerTab==="bot"){ const el=$("trendEq"); if(el) renderBot(); } }
function renderTrend(){
  const s=trend.s, c=s.cfg, sm=trendSummary(s,trend.px); const sig=s.lastSig;
  const rows=c.syms.map(k=>{ const p=s.pos[k]; const w=sig&&sig.w[k]; const px=trend.px[k]||(p&&p.px); const pnl=p&&px?p.qty*(px-p.avg):0;
    return `<tr><td><b>${k.replace("USDT","")}</b></td><td class="num">${w?Math.round(w.score*c.smas.length)+"/"+c.smas.length:"—"}</td><td class="num">${w&&w.vol?"%"+fx(w.vol*100,0):"—"}</td><td class="num">${w?"%"+fx(w.w*100,0):"—"}</td><td class="num">${p?fmtB(Math.abs(p.qty*px)):"nakit"}</td><td class="num">${p?fmtP(p.avg):"—"}</td><td class="num ${pnl>=0?"up":"down"}">${p?(pnl>=0?"+":"")+fx(pnl,2)+" $":"—"}</td><td class="muted">${w?esc(w.why):""}</td></tr>`; }).join("");
  const lg=s.log.filter(l=>l.type==="trade").slice(-8).reverse().map(l=>`<div class="tp ${l.side==="AL"?"buy":"sell"}" style="grid-template-columns:110px 50px 1fr"><span class="when">${new Date(l.t).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span><span class="k ${l.side==="AL"?"up":"down"}">${l.side}</span><span><b>${l.sym.replace("USDT","")}</b> · ${fmtB(l.usd)} @ ${fmtP(l.px)} · komisyon ${fx(l.fee,2)} $${l.pnl?` · gerçekleşen ${l.pnl>=0?"+":""}${fx(l.pnl,2)} $`:""} · ${esc(l.why||"")}</span></div>`).join("");
  return `<details class="card" style="margin-bottom:10px;padding:10px" ${s.trades||c.on?"open":""}><summary style="cursor:pointer"><b>Trend sepeti</b> <span class="muted" style="font-size:12px">· günlük trend, ${c.syms.map(k=>k.replace("USDT","")).join(" ")} · ayrı sanal bakiye · ${c.on?'<span class="up">● açık</span>':"● kapalı"}</span></summary>
  <p class="muted" style="font-size:12px;margin:6px 0">Her coin kapanışı 10/20/50/100 günlük ortalamaların kaçının üstündeyse o oranda long; BTC 50 günlük ortalamanın altındaysa hepsi nakit. Boy 30 günlük oynaklığa göre (oynak coin daha küçük). Günde bir, UTC 00:00'dan sonra dengelenir; stop yok, trend dönünce satar. Borsa kaldıracı 20x cross (teminat az bağlanır), etkin kaldıraç oynaklıktan gelir. Hedef modu: bakiye 200 $'a varana kadar hızlı ayar (1,4), varınca 0,8'e iner. 2020–2026 testinde 1,4: yıllık %192, en büyük düşüş −%64, 100 $ → 200 $ medyan 116 gün (başlangıçların %78'i yarılanmadan 2× yaptı, %7'si önce yarıya düştü); 1,2: medyan 175 gün, %1 yarılanma. Pozisyon başına izole 10–20x aynı testte hesabı bitirdi. Masa'dan bağımsızdır.</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><button type="button" class="${c.on?"":"primary"}" id="trendTgl">${c.on?"Durdur":"Başlat"}</button><button type="button" class="ghost" id="trendNow">Şimdi dengele</button><button type="button" class="ghost" id="trendReset">Sıfırla</button>
    <label style="font-size:12px;color:var(--ink-2)">Hedef oynaklık <select id="trendTv">${[[0.4,"0,4 · sakin (etkin ≈0,6x, düşüş ≈ −%24)"],[0.8,"0,8 · orta (≈1,1x, −%43)"],[1.2,"1,2 · agresif (≈1,6x, −%58)"],[1.4,"1,4 · hızlı, varsayılan (≈1,9x, −%64)"],[1.6,"1,6 · çok agresif (≈2,2x, −%70)"]].map(([v,t])=>`<option value="${v}" ${c.tv===v?"selected":""}>${t}</option>`).join("")}</select></label>
    <span class="muted" style="font-size:11.5px">${trend.err?'<span class="down">'+esc(trend.err)+"</span> · ":""}${s.day?"son dengeleme "+s.day:"henüz dengelenmedi"}</span></div>
  <div class="plan" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:8px">
    <div class="pv"><b>Özkaynak</b><span id="trendEq" class="${sm.eq>=s.start?"up":"down"}">${fx(sm.eq,2)} $</span><small>${pct(sm.roi,1)} · başlangıç ${fmtB(s.start)}</small></div>
    <div class="pv"><b>Zirveden</b><span class="${sm.dd>0.2?"down":""}">−%${fx(sm.dd*100,1)}</span><small>zirve ${fmtB(s.peak)}</small></div>
    <div class="pv"><b>Hedef</b><span>${fmtB(sm.eq)} / ${fmtB(sm.goal||200)}</span><small>${sm.goalHit?`ulaşıldı · korumacı ayar ${fx(sm.tvNow,1)}`:`hızlı ayar ${fx(sm.tvNow,1)} · hedefte ${fx(c.tvGoal||0.8,1)} olur`}</small></div>
    <div class="pv"><b>Kaldıraç</b><span>${sm.exLev}x cross · etkin ${fx(sm.lev,2)}x</span><small>${fmtB(sm.gross)} nominal · teminat ${fmtB(sm.margin)}${sm.liqMove?` · sepet %${fx(sm.liqMove*100,0)} düşerse likidasyon`:""}</small></div>
    <div class="pv"><b>BTC rejimi</b><span class="${sm.btcOk?"up":sm.btcOk===false?"down":""}">${sm.btcOk?"yukarı":sm.btcOk===false?"aşağı · nakit":"—"}</span><small>${sig&&sig.btc&&sig.btc.sma?`BTC ${fmtP(sig.btc.c)} · SMA${c.btcSma} ${fmtP(sig.btc.sma)}`:""}</small></div>
    <div class="pv"><b>Maliyet</b><span>${fx(sm.fees+sm.funding,2)} $</span><small>komisyon ${fx(sm.fees,2)} · fonlama ${fx(sm.funding,2)} · ${sm.trades} işlem</small></div>
  </div>
  <table class="t" style="margin-bottom:8px"><thead><tr><th>Coin</th><th>Ortalama</th><th>Oynaklık</th><th>Ağırlık</th><th>Pozisyon</th><th>Ort. giriş</th><th>PnL</th><th>Neden</th></tr></thead><tbody>${rows}</tbody></table>
  ${lg?`<div class="tape" style="max-height:200px">${lg}</div>`:""}</details>`;
}
function trendBind(){
  const t=$("trendTgl"); if(t) t.addEventListener("click",()=>{ trend.s.cfg.on=!trend.s.cfg.on; trendSave(trend.s); if(trend.s.cfg.on) trendRun({}); renderBot(); });
  const n=$("trendNow"); if(n) n.addEventListener("click",()=>{ trendRun({force:true,refresh:true}); });
  const r=$("trendReset"); if(r) r.addEventListener("click",()=>{ if(Object.keys(trend.s.pos).length&&!confirm("Trend sepetindeki pozisyonlar silinip bakiye 100 $'a dönsün mü?")) return; const on=trend.s.cfg.on, tv=trend.s.cfg.tv; trend.s=trendNew({on,tv,cap:tv*5}); trendSave(trend.s); renderBot(); });
  const v=$("trendTv"); if(v) v.addEventListener("change",e=>{ const tv=+e.target.value; trend.s.cfg.tv=tv; trend.s.cfg.cap=tv*5; renderBot(); trendSave(trend.s); });
}
/* --- Geri çekilme sepeti (src/dip.js): trend içinde düşüşte al, +%3 kâr, kapanış stopu; ayrı sanal bakiye --- */
const dip={s:dipLoad(),busy:false,err:null,px:{}};
async function dipRun(){ if(dip.busy||!dip.s.cfg.on) return; dip.busy=true;
  try{ const r=await dipTick(dip.s,Date.now()); dip.px=r.px; dip.err=null; dipSave(dip.s); if(r.evs.length&&ui.drawerTab==="bot") renderBot(); }
  catch(e){ dip.err=e.message; } finally{ dip.busy=false; } }
function renderDip(){
  const s=dip.s, c=s.cfg, sm=dipSummary(s,dip.px);
  const rows=c.syms.map(k=>{ const p=s.pos[k], o=s.ord[k]; const px=dip.px[k]||(p&&p.px); const pnl=p&&px?p.qty*(px-p.e):0;
    return `<tr><td><b>${k.replace("USDT","")}</b></td><td>${p?'<span class="up">açık</span>':o?"limit bekliyor":'<span class="muted">bekle</span>'}</td><td class="num">${p?fmtP(p.e):o?fmtP(o.px):"—"}</td><td class="num up">${p?fmtP(p.e*(1+c.tp)):"—"}</td><td class="num down">${p?fmtP(p.e*(1-c.stop))+" kapanış":"—"}</td><td class="num ${pnl>=0?"up":"down"}">${p?(pnl>=0?"+":"")+fx(pnl,2)+" $":"—"}</td><td class="muted">${p?p.age+". gün / "+c.hold:""}</td></tr>`; }).join("");
  const tr=s.trades.slice(-8).reverse().map(t=>`<tr><td class="num muted">${new Date(t.closeT).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</td><td><b>${t.sym.replace("USDT","")}</b></td><td class="num">${fmtP(t.e)} → ${fmtP(t.x)}</td><td class="num ${t.r>=0?"up":"down"}">${t.r>=0?"+":""}${fx(t.r*100,2)}%</td><td class="num ${t.pnl>=0?"up":"down"}">${t.pnl>=0?"+":""}${fx(t.pnl,2)} $</td><td class="muted">${esc(t.why)} · ${t.days} gün</td></tr>`).join("");
  return `<details class="card" style="margin-bottom:10px;padding:10px" ${s.trades.length||c.on?"open":""}><summary style="cursor:pointer"><b>Geri çekilme sepeti</b> <span class="muted" style="font-size:12px">· trend içinde düşüşte al, +%${fx(c.tp*100,0)} kâr · ayrı sanal bakiye · ${c.on?'<span class="up">● açık</span>':"● kapalı"}</span></summary>
  <p class="muted" style="font-size:12px;margin:6px 0">BTC 50 günlük ortalamanın üstünde ve coin ortalamaların en az yarısının üstündeyken önceki kapanışın %${fx(c.pull*100,0)} altına bir günlük limit. Kâr +%${fx(c.tp*100,0)}; stop gün sonu kapanışı girişin %${fx(c.stop*100,0)} altındaysa (gün içi fitil saymaz, stop avına yakalanmaz); gün içi −%${fx(c.cat*100,0)} felaket stopu; ${c.hold} günde kapanmazsa çıkar. Coin başına özkaynağın ¼'ü × etkin ${c.lev}x; borsa kaldıracı ${c.exLev}x cross yalnız teminatı küçültür (izole 10–20x'te −%10 stop likidasyondan önce gelmez, testte hesap bitti). 2020–2026 testi: 978 işlem, kazanma %83, işlem başı +%1,14, yıllık %47, en büyük düşüş −%37; son yıllar ince (2024 +%0,37, 2025 +%0,16, 2026 +%0,03 işlem başı).</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><button type="button" class="${c.on?"":"primary"}" id="dipTgl">${c.on?"Durdur":"Başlat"}</button><button type="button" class="ghost" id="dipReset">Sıfırla</button>
    <label style="font-size:12px;color:var(--ink-2)">Kaldıraç <select id="dipLev">${[[1,"etkin 1x (düşüş ≈ −%37)"],[2,"etkin 2x + düşüş freni (≈ −%50)"]].map(([v,t])=>`<option value="${v}" ${c.lev===v?"selected":""}>${t}</option>`).join("")}</select></label>
    <span class="muted" style="font-size:11.5px">${dip.err?'<span class="down">'+esc(dip.err)+"</span> · ":""}${s.day?"son gün kapanışı "+s.day:"henüz çalışmadı"}</span></div>
  <div class="plan" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:8px">
    <div class="pv"><b>Özkaynak</b><span class="${sm.eq>=s.start?"up":"down"}">${fx(sm.eq,2)} $</span><small>${pct(sm.roi,1)} · başlangıç ${fmtB(s.start)}</small></div>
    <div class="pv"><b>Kazanma</b><span>${sm.n?"%"+Math.round(sm.wr*100):"—"}</span><small>${sm.n} işlem${sm.n?` · ort. ${sm.avg>=0?"+":""}${fx(sm.avg*100,2)}%`:""}</small></div>
    <div class="pv"><b>Zirveden</b><span class="${sm.dd>0.2?"down":""}">−%${fx(sm.dd*100,1)}</span><small>zirve ${fmtB(s.peak)}</small></div>
    <div class="pv"><b>Açık / emir</b><span>${sm.open} / ${sm.orders}</span><small>${c.exLev}x cross · teminat ${fmtB(sm.margin)} · maliyet ${fx(sm.fees+sm.funding,2)} $</small></div>
  </div>
  <table class="t" style="margin-bottom:8px"><thead><tr><th>Coin</th><th>Durum</th><th>Giriş / limit</th><th>Kâr</th><th>Stop</th><th>PnL</th><th>Süre</th></tr></thead><tbody>${rows}</tbody></table>
  ${tr?`<table class="t"><thead><tr><th>Kapanış</th><th>Coin</th><th>Fiyat</th><th>Getiri</th><th>PnL</th><th>Neden</th></tr></thead><tbody>${tr}</tbody></table>`:""}</details>`;
}
function dipBind(){
  const t=$("dipTgl"); if(t) t.addEventListener("click",()=>{ dip.s.cfg.on=!dip.s.cfg.on; dipSave(dip.s); if(dip.s.cfg.on) dipRun(); renderBot(); });
  const r=$("dipReset"); if(r) r.addEventListener("click",()=>{ if(Object.keys(dip.s.pos).length&&!confirm("Geri çekilme sepetindeki pozisyonlar silinip bakiye 100 $'a dönsün mü?")) return; const on=dip.s.cfg.on, lev=dip.s.cfg.lev; dip.s=dipNew({on,lev}); dipSave(dip.s); renderBot(); });
  const v=$("dipLev"); if(v) v.addEventListener("change",e=>{ dip.s.cfg.lev=+e.target.value; dip.s.cfg.brakeDD=dip.s.cfg.lev>1?0.2:0; dipSave(dip.s); renderBot(); });
}
/* --- Kaplumbağa sepeti (src/turtle.js): 20 günlük kırılım, yalnız long, BTC > SMA200; geniş evren, ayrı sanal bakiye --- */
const tt={s:ttLoad(),busy:false,err:null,px:{}};
async function ttRun(opts){ if(tt.busy||!tt.s.cfg.on) return; tt.busy=true;
  try{ const r=await ttTick(tt.s,Date.now(),opts); tt.px=r.px; tt.err=null; ttSave(tt.s); if(r.evs.length&&ui.drawerTab==="bot") renderBot(); }
  catch(e){ tt.err=e.message; } finally{ tt.busy=false; } }
function renderTurtle(){
  const s=tt.s, c=s.cfg, sm=ttSummary(s,tt.px), b=s.btc;
  const rows=Object.entries(s.pos).map(([k,p])=>{ const px=tt.px[k]||p.px; const pnl=p.qty*(px-p.e); const r=(px-p.e)/(p.e*p.risk0);
    return `<tr><td><b>${k.replace("USDT","")}</b></td><td class="num">${fmtP(p.e)}</td><td class="num">${fmtP(px)}</td><td class="num">${fmtB(p.qty*px)}</td><td class="num down">${fmtP(p.stop)} kapanış · ${fmtP(p.cat)} gün içi</td><td class="num ${pnl>=0?"up":"down"}">${pnl>=0?"+":""}${fx(pnl,2)} $ · ${r>=0?"+":""}${fx(r,2)}R</td><td class="muted">${p.age||0}. gün</td></tr>`; }).join("");
  const tr=s.trades.slice(-8).reverse().map(t=>`<tr><td class="num muted">${new Date(t.closeT).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</td><td><b>${t.sym.replace("USDT","")}</b></td><td class="num">${fmtP(t.e)} → ${fmtP(t.x)}</td><td class="num ${t.R>=0?"up":"down"}">${t.R>=0?"+":""}${fx(t.R,2)}R</td><td class="num ${t.pnl>=0?"up":"down"}">${t.pnl>=0?"+":""}${fx(t.pnl,2)} $</td><td class="muted">${esc(t.why)} · ${t.days} gün</td></tr>`).join("");
  return `<details class="card" style="margin-bottom:10px;padding:10px" ${s.trades.length||c.on?"open":""}><summary style="cursor:pointer"><b>Kaplumbağa sepeti</b> <span class="muted" style="font-size:12px">· ${c.entryN} günlük kırılım, yalnız long, hacimce ilk ${c.top} coin · ayrı sanal bakiye · ${c.on?'<span class="up">● açık</span>':"● kapalı"}</span></summary>
  <p class="muted" style="font-size:12px;margin:6px 0">BTC 200 günlük ortalamanın üstündeyken bir coinin gün kapanışı önceki ${c.entryN} günün tepesini geçerse long. Çıkış: kapanış önceki ${c.exitN} günün dibinin altında ya da giriş − ${c.stopN}N altında (N = 20 günlük ortalama aralık); gün içi giriş − ${c.catN}N felaket stopu. İşlem başına bakiyenin %${fx(c.risk*100,1)}'i risk, en çok ${c.maxPos} pozisyon, toplam ${c.lev}x nominal. 2020–2026 arşiv testi (433 coin, batanlar dahil): 801 işlem, işlem başı +0,94R, yıllık +%25, en büyük düşüş −%31; kazanç az sayıda büyük işlemden gelir, tipik işlem kaybeder (2024 −%3, 2025 −%9). Masa'dan bağımsızdır.</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><button type="button" class="${c.on?"":"primary"}" id="ttTgl">${c.on?"Durdur":"Başlat"}</button><button type="button" class="ghost" id="ttReset">Sıfırla</button>
    <span class="muted" style="font-size:11.5px">${tt.err?'<span class="down">'+esc(tt.err)+"</span> · ":""}${s.day?"son gün kapanışı "+s.day+" · evren "+sm.univ+" coin":"henüz çalışmadı"}</span></div>
  <div class="plan" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:8px">
    <div class="pv"><b>Özkaynak</b><span class="${sm.eq>=s.start?"up":"down"}">${fx(sm.eq,2)} $</span><small>${pct(sm.roi,1)} · başlangıç ${fmtB(s.start)}</small></div>
    <div class="pv"><b>İşlemler</b><span>${sm.n?(sm.avgR>=0?"+":"")+fx(sm.avgR,2)+"R":"—"}</span><small>${sm.n} işlem${sm.n?` · kazanma %${Math.round(sm.wr*100)}`:""}</small></div>
    <div class="pv"><b>Zirveden</b><span class="${sm.dd>0.2?"down":""}">−%${fx(sm.dd*100,1)}</span><small>zirve ${fmtB(s.peak)}</small></div>
    <div class="pv"><b>Açık</b><span>${sm.open} / ${c.maxPos}</span><small>${fmtB(sm.gross)} nominal · etkin ${fx(sm.lev,2)}x · maliyet ${fx(sm.fees+sm.funding,2)} $</small></div>
    <div class="pv"><b>BTC rejimi</b><span class="${b&&b.ok?"up":b?"down":""}">${b?(b.ok?"yukarı · giriş serbest":"aşağı · yeni giriş yok"):"—"}</span><small>${b?`BTC ${fmtP(b.c)} · SMA200 ${fmtP(b.sma)}`:""}</small></div>
  </div>
  ${rows?`<table class="t" style="margin-bottom:8px"><thead><tr><th>Coin</th><th>Giriş</th><th>Mark</th><th>Nominal</th><th>Stop</th><th>PnL</th><th>Süre</th></tr></thead><tbody>${rows}</tbody></table>`:`<div class="empty" style="margin-bottom:8px">Açık pozisyon yok. Girişler UTC 00:00'dan (TSİ 03:00) sonraki ilk turda.</div>`}
  ${tr?`<table class="t"><thead><tr><th>Kapanış</th><th>Coin</th><th>Fiyat</th><th>R</th><th>PnL</th><th>Neden</th></tr></thead><tbody>${tr}</tbody></table>`:""}</details>`;
}
function ttBind(){
  const t=$("ttTgl"); if(t) t.addEventListener("click",()=>{ tt.s.cfg.on=!tt.s.cfg.on; ttSave(tt.s); if(tt.s.cfg.on) ttRun({}); renderBot(); });
  const r=$("ttReset"); if(r) r.addEventListener("click",()=>{ if(Object.keys(tt.s.pos).length&&!confirm("Kaplumbağa sepetindeki pozisyonlar silinip bakiye 100 $'a dönsün mü?")) return; tt.s=ttNew({on:tt.s.cfg.on}); ttSave(tt.s); renderBot(); });
}
setTimeout(()=>{ if(tt.s.cfg.on) ttRun({}); },16000); setInterval(()=>{ if(tt.s.cfg.on) ttRun({}); },5*60e3);
setTimeout(()=>{ if(dip.s.cfg.on) dipRun(); },12000); setInterval(()=>{ if(dip.s.cfg.on) dipRun(); },5*60e3);
setTimeout(()=>{ if(trend.s.cfg.on) trendRun({}); },8000); setInterval(()=>{ if(trend.s.cfg.on) trendRun({}); },5*60e3);
setInterval(()=>{ botManage().then(()=>{ bot.manErr=null; },e=>{ const m=String(e&&e.stack||e).slice(0,300); if(bot.manErr!==m) console.warn("SWEEP · pozisyon toplantısı hata: "+m); bot.manErr=m; }); },30000);
setInterval(botPoll,3000);
setInterval(()=>{ if(bot.on){ botDecide("tick"); if(ui.drawerTab==="bot") renderBot(); } },60000);
/* --- durum özeti (6 Ekim 2026, gece nöbeti): Electron bunu %APPDATA%/SWEEP/logs/bot-YYYY-MM-DD.jsonl dosyasına yazar; uzaktan izlemek için. Anahtar/hesap bilgisi yok. --- */
wsd.on=true; wsdStart(); // WebSocket veri katmanı (src/wsdata.js): tarama ve masa REST yerine akıştan beslenir
const botDig={lastN:null,lastT:0};
// "gir" tahminlerinin kırılımı: puan aralığı, evet diyen üye, bu açılıştan önce/sonra (eski veriyle oylanan toplantıları ayırmak için)
function botDigGo(F){ const G=F.done.filter(f=>f.go&&f.y!=null); const h=a=>a.length?a.length+"/"+Math.round(fcHit(a)*100):"0"; const by={score:{},yes:{},boot:{once:h(G.filter(f=>f.t<BOOT_T)),sonra:h(G.filter(f=>f.t>=BOOT_T))},dir:{long:h(G.filter(f=>f.dir==="long")),short:h(G.filter(f=>f.dir==="short"))}};
  const sb={}; for(const f of G){ const k=Math.floor(f.score*10)*10; (sb[k]=sb[k]||[]).push(f); } for(const k in sb) by.score[k]=h(sb[k]);
  const yb={}; for(const f of G) for(const id in f.v){ if(f.v[id]>0.3) (yb[id]=yb[id]||[]).push(f); } for(const id in yb) by.yes[id]=h(yb[id]);
  return by; }
function botDigest(){ try{ const now=Date.now(); if(botDig.lastN==null) botDig.lastN=bot.trades.length;
    const r2=v=>isFinite(v)?Math.round(v*100)/100:null; const d24=bot.trades.filter(t=>now-t.closeT<864e5);
    const pos=bot.positions.map(p=>{ const px=botMk(p.sym); const r=px&&p.risk0?((p.dir==="long"?px-p.entry0:p.entry0-px)/p.risk0):NaN; return {sym:p.sym,dir:p.dir,entry:p.entry,px:px||null,r:r2(r),stop:p.stop,risk:r2(p.risk),score:r2(p.score),yes:p.yes,ageMin:Math.round((now-p.openT)/6e4),stage:p.stage,realized:r2(p.realized),rev:p.lastReview?{min:Math.round((now-p.lastReview.t)/6e4),v:p.lastReview.verdict,hold:pts(p.lastReview.hold),llm:!!p.lastReview.llm}:null,manMin:p.lastMan?Math.round((now-p.lastMan)/6e4):null,manErr:p.manErr||null}; });
    const closed=bot.trades.slice(botDig.lastN).map(t=>({sym:t.sym,dir:t.dir,r:r2(t.r),pnl:r2(t.pnl),fees:r2(t.fees),score:r2(t.score),exits:t.exits||[],holdMin:Math.round((t.closeT-t.openT)/6e4),mfe:r2(t.mfe)})); botDig.lastN=bot.trades.length;
    const logs=bot.log.filter(l=>l.t>botDig.lastT); const types={}; for(const l of logs) types[l.type]=(types[l.type]||0)+1;
    const ab={}, yes={}; for(const v of bot.lastVotes||[]) for(const a of v.agents||[]){ const k=a.id||a.name; ab[k]=(ab[k]||0)+(a.abst?1:0); yes[k]=(yes[k]||0)+(!a.abst&&a.v>0.3?1:0); }
    const F=FC||fcLoad(), L=F.learn;
    const out={t:new Date(now).toISOString(),on:bot.on,mode:bot.cfg.mode,bal:r2(bot.bal),eq:r2(botEquity()),start:bot.start,goalMode:bot.goalMode||null,aggr:!!bot.cfg.aggr,day:bot.day,thr:r2(botThr()),minYes:botMinYes(),
      scan:{rows:scan.rows.length,ageMin:scan.at?Math.round((now-scan.at)/6e4):null,running:!!scan.running,hidden:document.hidden},rest:{fails:rest.fails||0},
      pos,orders:bot.orders.length,trades:bot.trades.length,all:{n:bot.trades.length,win:bot.trades.filter(t=>t.pnl>0).length,R:r2(bot.trades.reduce((a,t)=>a+t.r,0))},d24:{n:d24.length,win:d24.filter(t=>t.pnl>0).length,R:r2(d24.reduce((a,t)=>a+t.r,0)),pnl:r2(d24.reduce((a,t)=>a+t.pnl,0))},closed,
      logTypes:types,log:logs.filter(l=>l.type!=="skip"||/bayat|boş|hata/.test(l.text)).slice(-25).map(l=>new Date(l.t).toISOString().slice(11,16)+" "+l.type+" "+l.sym+" "+String(l.text).slice(0,260)),lastSkip:(logs.filter(l=>l.type==="skip").pop()||{}).text||null,
      votes:{n:(bot.lastVotes||[]).length,abst:ab,yes,top:(bot.lastVotes||[]).slice(0,5).map(v=>v.sym+" "+v.dir+" "+pts(v.score)+" "+v.yes+"e"+(v.go?" go":"")+(v.veto?" veto":""))},
      fc:{pend:F.pend.length,done:F.done.length,base:L?r2(L.base):null,go:L&&L.go?{n:L.go.n,hit:r2(L.go.hit)}:null,buckets:L?L.buckets.filter(b=>b.n).map(b=>b.t+":"+b.n+"/"+(b.hit!=null?Math.round(b.hit*100):"-")):[],lessons:L?L.lessons.length:0,goBy:botDigGo(F),top:fcTop(F,5).map(x=>({...x,t:new Date(x.t).toISOString(),score:pts(x.score)}))},
      aud:AUD?{lessons:(AUD.lessons||[]).map(l=>l.k)}:null,caps:{maxPos:bot.cfg.maxPos,maxSameDir:bot.cfg.maxSameDir},man:{err:bot.manErr||null,busyMin:bot._managing?Math.round((now-(bot._manT||now))/6e4):null},lmd:typeof lmd!=="undefined"?{...lmd.stats,q:lmd.q.length,busy:lmd.busy,err:lmd.err,wait:lmdReady()}:null,wsd:wsdSummary(),restCoolMin:rest.cool>now?Math.round((rest.cool-now)/6e4):0,used:rest.used};
    botDig.lastT=now; console.info("SWEEP · durum "+JSON.stringify(out)); }catch(e){ console.warn("SWEEP · durum özeti yazılamadı: "+e.message); } }
setTimeout(botDigest,90e3); setInterval(botDigest,10*60e3);
/* Canlı panel (electron/live.js): telefondan açılan salt okunur sayfa bunu birkaç saniyede bir ister. Anahtar, emir ya da ayar yok. */
window.sweepLive=function(){ const now=Date.now(), r2=v=>isFinite(v)?Math.round(v*100)/100:null, day0=now-864e5;
  const pos=bot.positions.map(p=>{ const px=botMk(p.sym); const r=px&&p.risk0?((p.dir==="long"?px-p.entry0:p.entry0-px)/p.risk0):null; const lr=p.lastReview;
    return {sym:p.sym,dir:p.dir,entry:p.entry,px:px||null,stop:p.stop,t1:p.t1,t2:p.t2,r:r2(r),pnl:r2((px?botPnl(p,px):0)+(p.realized||0)),margin:r2(p.margin),ageMin:Math.round((now-p.openT)/6e4),stage:p.stage,score:pts(p.score),yes:p.yes,rev:lr?{v:lr.verdict,hold:pts(lr.hold),min:Math.round((now-lr.t)/6e4)}:null}; });
  const d24=bot.trades.filter(t=>t.closeT>day0); const sum=a=>({n:a.length,win:a.filter(t=>t.pnl>0).length,R:r2(a.reduce((x,t)=>x+t.r,0)),pnl:r2(a.reduce((x,t)=>x+t.pnl,0))});
  const eqs=(bot.eq||[]).filter(e=>e.t>day0); const step=Math.max(1,Math.ceil(eqs.length/120));
  return {t:now,on:bot.on,bal:r2(bot.bal),eq:r2(botEquity()),start:bot.start,peak:r2(bot.peak),goalMode:bot.goalMode||null,aggr:!!bot.cfg.aggr,
    day:bot.day,d24:sum(d24),all:sum(bot.trades),pos,
    closed:bot.trades.slice(-12).reverse().map(t=>({sym:t.sym,dir:t.dir,r:r2(t.r),pnl:r2(t.pnl),closeT:t.closeT,holdMin:Math.round((t.closeT-t.openT)/6e4),exits:t.exits||[]})),
    curve:eqs.filter((e,i)=>i%step===0||i===eqs.length-1).map(e=>[e.t,r2(e.v)]),
    scanMin:scan.at?Math.round((now-scan.at)/6e4):null,feed:(()=>{ const w=wsdSummary(); return {ok:!!w.glob,tickS:w.tickAgeS}; })(),
    log:bot.log.filter(l=>l.type!=="skip"&&l.type!=="fund").slice(-10).reverse().map(l=>({t:l.t,type:l.type,sym:l.sym,text:String(l.text).slice(0,180)}))}; };
if(bot.on||bot.positions.length||bot.orders.length){ botWsSync(); }

/* ================= masaya sor: hesap bağlamadan, elle girilen plan ya da açık işlem ================= */
const ask={busy:false,res:null,err:"",hist:(()=>{ try{ return JSON.parse(LS("st-ask-h")||"[]"); }catch(e){ return []; } })()};
const ASK_F=["sym","open","dir","entry","liq","sl","tp","margin","lev","size","bal"];
const askNum=v=>{ v=String(v||"").trim().replace(/\s/g,""); if(v.includes(",")) v=v.replace(/\./g,"").replace(",","."); const n=parseFloat(v); return isFinite(n)?n:NaN; };
function askForm(){ const g=id=>$("ask_"+id); return {sym:(g("sym").value||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/^(?!.*USDT$)(.+)$/,"$1USDT"),open:g("open").value==="1",dir:g("dir").value,entry:askNum(g("entry").value),liq:askNum(g("liq").value),sl:askNum(g("sl").value),tp:askNum(g("tp").value),margin:g("margin").value,lev:askNum(g("lev").value),size:askNum(g("size").value),bal:askNum(g("bal").value)}; }
function renderAsk(){
  const el=$("dAsk"); if(!el) return;
  if(!$("askForm")){
    let sv={}; try{ sv=JSON.parse(LS("st-ask")||"{}"); }catch(e){}
    const inp=(id,ph,w)=>`<label class="askf" style="display:grid;gap:2px;font-size:11px;color:var(--ink-2);min-width:${w||110}px;flex:1">${ph}<input id="ask_${id}" inputmode="decimal" autocomplete="off" spellcheck="false" style="width:100%;box-sizing:border-box;min-width:0"></label>`;
    const sel=(id,label,opts)=>`<label style="display:grid;gap:2px;font-size:11px;color:var(--ink-2);min-width:100px;flex:1">${label}<select id="ask_${id}" style="width:100%;box-sizing:border-box;min-width:0">${opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join("")}</select></label>`;
    el.innerHTML=`<div id="askForm" class="card" style="margin-bottom:10px"><h4 style="margin:0 0 4px">Masaya sor</h4><p class="muted" style="margin:0 0 8px;font-size:12px;line-height:1.45">Hesabı bağlamadan işlemini yaz; masa o coinin canlı verisine bakıp oylar. Açık işlemde "devam et / azalt / çık", planda "gir / bekle / girme" der. Stop ve likidasyon uzaklığını, ödül/riski ve botun kurallarıyla kıyası da gösterir. Fiyatlar virgüllü ya da noktalı yazılabilir.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end">${`<label style="display:grid;gap:2px;font-size:11px;color:var(--ink-2);min-width:110px;flex:1">Coin<input id="ask_sym" list="symList" spellcheck="false" autocomplete="off" style="width:100%;box-sizing:border-box;min-width:0"></label>`}${sel("open","Durum",[["1","Açık işlem"],["0","Plan · henüz girmedim"]])}${sel("dir","Yön",[["long","Long"],["short","Short"]])}${sel("margin","Marjin",[["cross","Cross"],["isolated","İzole"]])}${inp("lev","Kaldıraç (x)",80)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin-top:6px">${inp("entry","Giriş")}${inp("liq","Likidasyon")}${inp("sl","Stop (SL)")}${inp("tp","Hedef (TP)")}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin-top:6px">${inp("size","Teminat $ · isteğe bağlı")}${inp("bal","Bakiye $ · isteğe bağlı")}<button type="button" class="ghost" id="askPx" style="flex:0 0 auto">Girişe şu anki fiyat</button><button type="button" class="primary" id="askGo" style="flex:0 0 auto">Masaya sor</button></div>
      <div id="askStatus" class="muted" style="font-size:12px;margin-top:6px"></div></div><div id="askOut"></div><div id="askHist"></div>`;
    for(const k of ASK_F){ const e=$("ask_"+k); if(!e) continue; e.value=sv[k]!=null?sv[k]:k==="sym"?state.sym:k==="lev"?"20":k==="open"?"1":k==="dir"?"long":k==="margin"?"cross":""; }
    $("askGo").addEventListener("click",()=>askRun());
    $("askPx").addEventListener("click",async()=>{ const f=askForm(); if(!f.sym) return; try{ const p=f.sym===state.sym&&state.lastA?state.lastA.px:+(await j(`/fapi/v1/premiumIndex?symbol=${f.sym}`)).markPrice; if(p>0) $("ask_entry").value=String(p).replace(".",","); }catch(e){ $("askStatus").textContent="Fiyat alınamadı: "+(e.message||e); } });
    el.querySelectorAll("#askForm input").forEach(i=>i.addEventListener("keydown",e=>{ if(e.key==="Enter") askRun(); }));
  }
  $("askGo").disabled=ask.busy; $("askGo").textContent=ask.busy?"Masa toplanıyor…":"Masaya sor";
  $("askStatus").innerHTML=ask.err?`<span class="down">${esc(ask.err)}</span>`:ask.res?`Son soru ${tl(ask.res.t)} · fiyat ${fmtP(ask.res.px)}`:"";
  $("askOut").innerHTML=ask.res?askHtml(ask.res):"";
  $("askHist").innerHTML=ask.hist.length?`<div class="card"><h4 style="margin:0 0 4px">Son sorular</h4>${ask.hist.map((h,i)=>`<div style="display:flex;gap:6px 8px;flex-wrap:wrap;align-items:center;font-size:11.5px;margin:5px 0"><span class="muted" style="min-width:90px">${new Date(h.t).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span><b>${esc(h.sym.replace("USDT",""))}</b> ${chip(h.dir==="long"?"up sm":"down sm",h.dir==="long"?"L":"S")} <span class="muted">${h.open?"açık":"plan"} · ${h.lev}x · giriş ${fmtP(h.entry)}</span> ${chip(h.kind+" sm",h.verdict)} <span class="muted">puan ${pts(h.score)}</span><button type="button" class="ghost" data-ask-h="${i}" style="padding:1px 8px;font-size:11px">Forma al</button></div>`).join("")}</div>`:"";
  $("askHist").querySelectorAll("[data-ask-h]").forEach(b=>b.addEventListener("click",()=>{ const h=ask.hist[+b.dataset.askH]; if(!h||!h.f) return; for(const k of ASK_F){ const e=$("ask_"+k); if(e&&h.f[k]!=null) e.value=h.f[k]; } }));
}
async function askRun(){
  if(ask.busy) return; const f=askForm(); const raw={}; for(const k of ASK_F){ const e=$("ask_"+k); if(e) raw[k]=e.value; } LS("st-ask",JSON.stringify(raw));
  ask.err=""; if(!/^[A-Z0-9]{2,}USDT$/.test(f.sym)) ask.err="Coin adı geçersiz (örnek: ENAUSDT ya da ENA).";
  else if(!(f.entry>0)) ask.err="Giriş fiyatını yaz (ya da \"Girişe şu anki fiyat\").";
  else if(!(f.lev>=1&&f.lev<=125)) ask.err="Kaldıraç 1–125 arası olmalı.";
  if(ask.err){ renderAsk(); return; }
  ask.busy=true; renderAsk();
  try{
    let A, c24;
    if(f.sym===state.sym&&state.lastA&&state.slow&&state.slowSym===f.sym&&ui.lastF&&ui.lastF.t24&&ui.lastF.t24.symbol===f.sym){ /* ana ekran bu coini zaten 10 sn'de bir analiz ediyor */ A=state.lastA; c24=+ui.lastF.t24.priceChangePercent; }
    else { const [fs,sl]=await Promise.all([fetchFast(f.sym),fetchSlow(f.sym)]); A=analyze(fs,sl); c24=+fs.t24.priceChangePercent; }
    const r=askDesk(A,f,c24,{sym:f.sym}); ask.res=r;
    ask.hist.unshift({t:r.t,sym:f.sym,dir:r.dir,open:r.open,lev:r.lev,entry:r.entry,verdict:r.verdict,kind:r.kind,score:r.score,f:raw}); ask.hist=ask.hist.slice(0,10); LS("st-ask-h",JSON.stringify(ask.hist));
  }catch(e){ ask.err="Masa toplanamadı: "+String(e.message||e).slice(0,140); console.warn("SWEEP · masaya sor",e); }
  finally{ ask.busy=false; renderAsk(); }
}
function askHtml(r){
  const D=r.dir==="long"?"Long":"Short"; const sgn=v=>(v>=0?"+":"")+fx(v,2);
  const tile=(b,v,s,c)=>`<div class="pv"><b>${b}</b><span class="${c||""}">${v}</span><small>${s||""}</small></div>`;
  const tiles=[
    tile("Fiyat şimdi",fmtP(r.px),r.open?`PnL ${pct(r.pnlPct,2)} · ROE ${pct(r.roeNow,1)}`:`girişe ${pct((r.entry/r.px-1)*100,2)}`,r.open?(r.pnlPct>=0?"up":"down"):""),
    tile("Stop",isFinite(r.sl)?fmtP(r.sl):"yok",isFinite(r.stopPct)?`%${fx(r.stopPct*100,2)} · ${fx(r.slAtr,2)} ATR · ROE ${fx(r.roeSl,0)}%`:"masanın önerisi "+fmtP(r.deskStop),isFinite(r.sl)?"down":"warn"),
    tile("Hedef",isFinite(r.tp)?fmtP(r.tp):"yok",isFinite(r.rr)?`${fx(r.rr,2)}R · komisyon ${fx(r.costR,2)}R · ROE +${fx(r.roeTp,0)}%`:"masa: 1,5R "+fmtP(r.deskT1),isFinite(r.tp)?"up":""),
    tile("Likidasyon",fmtP(r.liq),`${r.liqGiven?"":"tahmini · "}%${fx(r.liqPct*100,2)} · ${fx(r.liqAtr,1)} ATR uzakta`,r.liqAtr<1.5?"down":r.liqAtr<3?"warn":""),
    tile("Pozisyon",`${r.lev}x ${r.iso?"izole":"cross"}`,isFinite(r.notional)?`büyüklük ${fmtB(r.notional)}${isFinite(r.lossUsd)?" · stopta −"+fmtB(r.lossUsd):""}${isFinite(r.riskPct)?" (%"+fx(r.riskPct*100,1)+")":""}`:`başabaş ${fmtP(r.be)} · ATR %${fx(r.atrPct,2)}`)];
  const notes=[...r.red.map(t=>["down","●",t]),...r.warn.map(t=>["warn","●",t]),...r.ok.map(t=>["up","✓",t])];
  const chips=r.agents.map(a=>`<span class="chip ${a.v>0.15?"up":a.v<-0.15?"down":"neutral"} sm" title="${esc(a.txt)}">${esc(a.name)} ${a.v>0?"+":""}${fx(a.v,1)}</span>`).join(" ");
  const yes=r.agents.filter(a=>a.v>0.15).length, no=r.agents.filter(a=>a.v<-0.15).length;
  const desk=r.talk?talkHtml(r.talk):`<div style="margin-top:8px">${r.lines.map(l=>`<div style="display:flex;gap:6px;font-size:12px;line-height:1.45;margin:3px 0"><b style="min-width:56px;color:${DESK_COL[l.id]||"var(--ink)"}">${esc(l.who)}</b><span>${esc(l.text)}</span></div>`).join("")}</div>`;
  return `<div class="card" style="margin-bottom:10px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><b style="font-size:15px">${esc(r.sym.replace("USDT",""))} ${D}</b> <span class="muted">${r.open?"açık işlem":"plan"} · giriş ${fmtP(r.entry)}</span> <span class="chip ${r.kind}" id="askVerdict" style="font-size:13px;font-weight:800">${esc(r.verdict)}</span> <span class="muted" style="font-size:11.5px">puan ${(r.score>=0?"+":"")+ptsT(r.score)} · ${yes} evet · ${no} hayır${r.oppDecision==="giriş"?" · ters yön giriş "+(r.oppScore>=0?"+":"")+pts(r.oppScore):""}</span></div>
    <div style="font-size:12.5px;line-height:1.5;margin-bottom:8px"><b style="color:${DESK_COL.risk}">Can</b> <span class="muted">Baş trader</span> · ${esc(r.canSay)}</div>
    <div class="plan" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:8px">${tiles.join("")}</div>
    ${notes.length?`<div style="display:grid;gap:3px;margin-bottom:8px">${notes.map(([c,i,t])=>`<div style="display:flex;gap:6px;font-size:12px;line-height:1.4"><span class="${c}" style="flex:0 0 12px">${i}</span><span>${esc(t)}</span></div>`).join("")}</div>`:""}
    <div style="display:flex;gap:4px;flex-wrap:wrap">${chips}</div>${desk}
    <p class="muted" style="font-size:11px;margin:8px 0 0">Masa kuralla oy verir; kanıt kâğıt botun ileriye dönük sonuçlarında. Coin 24 sa ${pct(r.c24,1)}. ${r.open?"Açık işlemde stop ve hedef emrin varsa yazdığın değerler emir sayılır.":"Plan modunda masa şu anki fiyata bakar; limit girişin uzaksa fiyat oraya gelince yeniden sor."}</p></div>`;
}
/* ================= gerçek hesap: Binance USDⓈ-M, salt okunur ================= */
function renderAccount(){
  const el=$("dAccount"); if(!el) return;
  if(!$("acctForm")){
    el.innerHTML=`<div id="acctForm" class="card" style="margin-bottom:10px"><h4 style="margin:0 0 6px">Binance hesabı · salt okunur</h4><p class="hint">Binance'te API Management'tan anahtar oluştur: "Enable Reading" ve "Enable Futures" açık, spot işlem ve çekim yetkileri kapalı, mümkünse IP kısıtı. Anahtar yalnızca bu cihazda kalır ve yalnızca Binance'e gider; SWEEP emir göndermez, pozisyon kapatmaz, kaldıraç değiştirmez (kodunda emir uç noktası yoktur).</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="acctKey" type="password" placeholder="API Key" autocomplete="off" style="flex:1;min-width:200px"><input id="acctSecret" type="password" placeholder="Secret Key" autocomplete="off" style="flex:1;min-width:200px"><label style="font-size:12px;color:var(--ink-2)"><input type="checkbox" id="acctRemember" style="width:auto"> bu cihazda hatırla</label><button type="button" class="primary" id="acctConnect">Bağlan</button><button type="button" class="ghost" id="acctForget">Unut</button></div><div id="acctStatus" class="muted" style="font-size:12px;margin-top:6px"></div></div><div id="acctData"></div>`;
    $("acctKey").value=acct.key; $("acctSecret").value=acct.secret; $("acctRemember").checked=acct.remember;
    $("acctConnect").addEventListener("click",async()=>{ if(acct.on){ acctStop(false); renderAccount(); return; } $("acctStatus").textContent="bağlanıyor…"; const ok=await acctStart($("acctKey").value,$("acctSecret").value,$("acctRemember").checked); renderAccount(); if(ok){ toast("Binance hesabı bağlandı · salt okunur."); acctReview(true); } });
    $("acctForget").addEventListener("click",()=>{ acctStop(true); $("acctKey").value=""; $("acctSecret").value=""; $("acctRemember").checked=false; renderAccount(); });
  }
  $("acctConnect").textContent=acct.on?"Kes":"Bağlan"; $("acctConnect").className=acct.on?"":"primary";
  $("acctStatus").innerHTML=acct.on?`<span class="up">● bağlı</span> · ${acct.src==="ws"?"anlık akış":"REST 5 sn"} · son ${acct.lastAt?tl(acct.lastAt):"—"}${acct.err?` · <span class="down">${esc(acct.err)}</span>`:""}`:(acct.err?`<span class="down">${esc(acct.err)}</span>`:"bağlı değil");
  const d=$("acctData"); if(!acct.on||!acct.bal){ d.innerHTML=""; return; }
  const b=acct.bal; const upnl=acct.positions.reduce((a,p)=>a+p.upnl,0); const marg=acct.positions.reduce((a,p)=>a+p.margin,0); const eq=b.wallet+upnl;
  const cards=`<div class="plan" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:10px">
    <div class="pv"><b>Cüzdan (USDT)</b><span>${fx(b.wallet,2)} $</span><small>kullanılabilir ${fx(b.avail,2)} $</small></div>
    <div class="pv"><b>Teminat bakiyesi</b><span class="${eq>=b.wallet?"up":"down"}">${fx(eq,2)} $</span><small>cüzdan + açık PnL</small></div>
    <div class="pv"><b>Açık PnL</b><span class="${upnl>=0?"up":"down"}">${upnl>=0?"+":""}${fx(upnl,2)} $</span><small>${marg>0?pct(upnl/marg*100,1)+" teminata göre":"pozisyon yok"}</small></div>
    <div class="pv"><b>Pozisyon</b><span>${acct.positions.length}</span><small>teminatta ${fx(marg,2)} $ · ${acct.orders.length} açık emir</small></div></div>`;
  const row=p=>{ const r=scan.rows.find(x=>x.s===p.sym); const c=r&&r.com?r.com[p.dir]:null; const opp=r&&r.com?r.com[p.dir==="long"?"short":"long"]:null;
    const masa=c?`${c.decision==="giriş"?'<span class="up">masa aynı yönde: giriş</span>':c.veto?'<span class="down">masa veto: '+esc(c.veto)+'</span>':'<span class="muted">masa '+esc(c.decision)+' · puan '+ptsT(c.score)+'</span>'}${opp&&opp.decision==="giriş"?' · <span class="down">ters yöne giriş diyor</span>':""}`:'<span class="muted">tarama bu coini içermiyor</span>';
    const ld=isFinite(p.liqDist)?pct(p.liqDist*100,1):"—";
    const rv=acct.reviews[p.sym]; const VC={"tut":"up","tut, stop sık":"warn","azalt":"warn","çık":"down"};
    const review=rv?(rv.err?`<tr><td colspan="7" class="muted" style="font-size:11.5px">Masa yorumu alınamadı: ${esc(rv.err)}</td></tr>`:`<tr><td colspan="7" style="padding:6px 8px 10px"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:4px">${chip(VC[rv.verdict]||"neutral","Masa: "+rv.verdict.toUpperCase())} <span class="muted" style="font-size:11.5px">tutma puanı ${ptsT(rv.hold)}${rv.oppDecision==="giriş"?" · ters yön giriş "+pts(rv.oppScore):""} · ${tl(rv.t)}</span> ${(rv.views||rv.agents).map(a=>`<span class="chip ${a.abst?"neutral":a.v>0.15?"up":a.v<-0.15?"down":"neutral"} sm" title="${esc((a.act?a.act+": ":"")+a.txt)}">${esc(a.name)} ${a.abst?"—":(a.v>0?"+":"")+fx(a.v,1)}</span>`).join(" ")}</div>${rv.lines.map(l=>`<div style="display:flex;gap:6px;font-size:11.5px;line-height:1.4;margin:2px 0"><b style="min-width:52px;color:${DESK_COL[l.id]||"var(--ink)"}">${esc(l.who)}</b><span>${esc(l.text)}</span></div>`).join("")}</td></tr>`):`<tr><td colspan="7" class="muted" style="font-size:11.5px">Masa yorumu hazırlanıyor…</td></tr>`;
    return `<tr><td><b>${p.sym.replace("USDT","")}</b> ${chip(p.dir==="long"?"up sm":"down sm",p.dir==="long"?"L":"S")} <span class="muted">${p.lev}x ${p.iso?"izole":"cross"}</span></td><td class="num">${fmtB(p.notional)}<br><span class="muted" style="font-size:10.5px">${p.amt} adet · teminat ${fmtB(p.margin)}</span></td><td class="num">${fmtP(p.entry)}</td><td class="num">${fmtP(p.mark)}</td><td class="num warn">${p.liq?fmtP(p.liq):"—"}<br><span class="muted" style="font-size:10.5px">${ld} uzakta</span></td><td class="num ${p.upnl>=0?"up":"down"}">${p.upnl>=0?"+":""}${fx(p.upnl,2)} $<br><span style="font-size:11px">${p.roe>=0?"+":""}${fx(p.roe,1)}%</span></td><td style="font-size:11.5px">${masa}</td></tr>${review}`; };
  const pos=acct.positions.length?`<table class="t" style="margin-bottom:10px"><thead><tr><th>Pozisyon</th><th>Boyut</th><th>Giriş</th><th>Mark</th><th>Likidasyon</th><th>PnL (ROE)</th><th>Masanın görüşü</th></tr></thead><tbody>${acct.positions.map(row).join("")}</tbody></table>`:'<div class="empty" style="margin-bottom:10px">Açık pozisyon yok.</div>';
  const ord=acct.orders.length?`<table class="t" style="margin-bottom:10px"><thead><tr><th>Açık emir</th><th>Tür</th><th>Fiyat / tetik</th><th>Miktar</th><th>Not</th></tr></thead><tbody>${acct.orders.map(o=>`<tr><td><b>${o.sym.replace("USDT","")}</b> ${chip(o.side==="BUY"?"up sm":"down sm",o.side==="BUY"?"Alış":"Satış")}</td><td>${esc(o.type)}</td><td class="num">${o.px?fmtP(o.px):"—"}${o.stop?" / "+fmtP(o.stop):""}</td><td class="num">${o.qty}${o.filled?" ("+o.filled+" doldu)":""}</td><td class="muted">${o.cp?"pozisyonu kapatır":o.ro?"yalnızca azaltır":""}</td></tr>`).join("")}</tbody></table>`:"";
  const ev=acct.events.length?`<div class="tape" style="max-height:200px">${acct.events.map(e=>`<div class="tp" style="grid-template-columns:70px 1fr"><span class="when">${tl(e.t)}</span><span>${esc(e.txt)}</span></div>`).join("")}</div>`:"";
  d.innerHTML=cards+pos+ord+ev;
}
function acctOnEvent(ev){ if(ev==="ACCOUNT_UPDATE") acctReview(true); if(ui.drawerOpen&&ui.drawerTab==="account") renderAccount(); }
/* --- masa yorumu: her gerçek pozisyon için 20 sn'de bir bakılır, analiz 60 sn'de bir tazelenir --- */
async function acctReview(force){
  if(!acct.on||!acct.positions.length) return; const now=Date.now();
  for(const p of [...acct.positions]){ const rv=acct.reviews[p.sym]; if(!force&&rv&&now-rv.t<60000&&rv.dir===p.dir) continue; if(acct._reviewing[p.sym]) continue; acct._reviewing[p.sym]=1;
    try{ const [t24,prem]=await Promise.all([j(`/fapi/v1/ticker/24hr?symbol=${p.sym}`),j(`/fapi/v1/premiumIndex?symbol=${p.sym}`)]); const r=await scanOne({t24,prem}); if(!r) throw new Error("veri eksik (OI/taker)"); const A=analyze(r._f,r._s); acct.reviews[p.sym]={...positionReview(A,p,acct.orders,+t24.priceChangePercent,{sym:p.sym}),dir:p.dir,sym:p.sym}; }
    catch(e){ acct.reviews[p.sym]={err:String(e.message||e).slice(0,120),t:now,dir:p.dir}; }
    finally{ delete acct._reviewing[p.sym]; } }
  for(const k in acct.reviews) if(!acct.positions.some(p=>p.sym===k)) delete acct.reviews[k];
  if(ui.drawerOpen&&ui.drawerTab==="account") renderAccount();
}
setInterval(()=>acctReview(false),20000);
function acctOnSync(){ if(ui.drawerOpen&&ui.drawerTab==="account") renderAccount(); }
if(acct.key&&acct.secret&&acct.remember){ acctStart(acct.key,acct.secret,true).then(()=>{ acctReview(true); if(ui.drawerTab==="account") renderAccount(); }).catch(()=>{}); }

/* ---- boot ---- */
(function boot(){
  const s=LS("st-sym")||LS("rp-sym"); if(s) $("sym").value=s;
  const m=LS("st-mode"); if(m){ state.mode=m; } setSeg("modeSeg",state.mode);
  const st=LS("st-strat"); if(st){ state.strat=st; } setSeg("stratSeg",state.strat);
  const lv=LS("st-lev")||LS("rp-lev"); if(lv) $("lev").value=lv; const bv=LS("st-bal")||LS("rp-bal"); if(bv&&+bv>0) $("bal").value=bv;
  ui.bell=LS("st-bell")==="1"&&("Notification" in window)&&Notification.permission==="granted"; $("bell").setAttribute("aria-pressed",String(ui.bell));
  ui.snd=LS("st-snd")==="1"; $("snd").setAttribute("aria-pressed",String(ui.snd));
  const dr=LS("st-drawer"); if(dr) setDrawer(true,dr); else setDrawer(false,"scan");
  sessionTick(); ui.sessTimer=setInterval(sessionTick,15000);
  setInterval(()=>{ if(live.ws&&live.ok&&Date.now()-live.lastMsg>25000){ wsStatus(false,"akış sustu, yenileniyor"); try{ live.ws.close(); }catch(e){} } },10000);
  // bot akışı da susabiliyor (uyku/ağ kopması, onclose gelmiyor): mark 30 sn gelmezse bağlantıyı baştan kur (en çok 30 sn'de bir; REST'e gitmez)
  setInterval(()=>{ const now=Date.now(); if(bot.ws&&(bot.positions.length||bot.orders.length)&&now-Math.max(bot.lastMark||0,bot.wsAt||0)>30000&&now-(bot.wsKick||0)>30000){ bot.wsKick=now; bot.wsKey=null; botWsSync(); } },10000);
  renderFeed(); renderWatch(); renderJournal(); scheduleScan();
  setTimeout(()=>{ ldRefresh(false).catch(()=>{}); },3000); setInterval(()=>{ ldRefresh(false).catch(()=>{}); },10*60e3);
  sel.posProvider=()=>bot.positions.map(p=>({sym:p.sym,dir:p.dir})); // Tolga açık pozisyonlarımızın coininde liderleri izler
  setTimeout(()=>{ labTick(false).catch(()=>{}); },20000); setInterval(()=>{ labTick(false).catch(()=>{}); },60e3);
  start(); setTimeout(()=>{ if(!scan.rows.length&&!scan.running) runScan(); },2500);
  // sayfa yeniden yüklendiyse (çökme/donma/bellek sonrası) bot kaldığı yerden devam etsin
  if(bot.on){ botLog("sys","","Sayfa yeniden yüklendi; bot kaldığı yerden devam ediyor."); setTimeout(()=>{ try{ botWsSync(); }catch(e){} },1500); }
  window.addEventListener("beforeunload",()=>{ try{ botSave(); }catch(e){} });
  window.addEventListener("error",e=>{ console.error("SWEEP · hata: "+(e.message||e)+(e.filename?" @"+e.filename+":"+e.lineno:"")); });
  window.addEventListener("unhandledrejection",e=>{ const r=e.reason; console.error("SWEEP · yakalanmamış söz: "+(r&&r.stack||r)); });
  // PWA: installable when served over https
  try{ const icon=document.querySelector('link[rel="icon"]')?.href; const man={name:"SWEEP · Likidite Terminali",short_name:"SWEEP",start_url:location.pathname||"./",display:"standalone",background_color:"#0a0e13",theme_color:"#0a0e13",icons:icon?[{src:icon,sizes:"512x512",type:"image/png",purpose:"any"}]:[]}; const l=document.createElement("link"); l.rel="manifest"; l.href=location.protocol==="https:"?"manifest.webmanifest":"data:application/manifest+json,"+encodeURIComponent(JSON.stringify(man)); document.head.appendChild(l); if("serviceWorker" in navigator&&location.protocol==="https:") navigator.serviceWorker.register("sw.js").catch(()=>{}); }catch(e){}
})();
