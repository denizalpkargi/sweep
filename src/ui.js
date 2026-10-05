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
  ui.chart=ch; new ResizeObserver(()=>ch.applyOptions({width:el.clientWidth,height:el.clientHeight})).observe(el); ch.applyOptions({width:el.clientWidth,height:el.clientHeight});
  return true;
}
const LAYERS={struct:"Yapı (HH/HL/LH/LL)",pools:"Havuzlar",long:"Long planı",short:"Short planı",br:"Kırılım · FVG",box:"Kutu · POC",levels:"Seviyeler"};
ui.layers={struct:true,pools:true,long:true,short:true,br:true,box:true,levels:true}; try{ Object.assign(ui.layers,JSON.parse(LS("st-layers")||"{}")); }catch(e){}
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
  if(Ly.pools){ const pools=poolsAt(kb,A.src.k15L?A.src.k15L:kb,A.med15,kb.length); const top=t=>pools.filter(p=>p.type===t).sort((a,b)=>b.w-a.w||Math.abs(a.p/px-1)-Math.abs(b.p/px-1)).slice(0,3); for(const p of [...top("low"),...top("high")]) add(p.p,"#a78bfa",(p.type==="low"?"↓ ":"↑ ")+p.name,2,p.w>=3?1:1); }
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
  $("legend").innerHTML=Object.keys(LAYERS).map(id=>`<span class="lg ${Ly[id]?"on":""}" data-l="${id}" style="pointer-events:auto;cursor:pointer"><i style="background:${{struct:"#2ee59d",pools:"#a78bfa",long:"#2ee59d",short:"#ff8a3d",br:"#39c6f2",box:"#e7edf3",levels:"#5b6b7c"}[id]}"></i>${LAYERS[id]}</span>`).join("");
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
    scan.rows=out; const now=Date.now(); const prev={}; out.forEach(r=>prev[r.s]={score:r.score,t:now}); scan.prev=prev; LS("rp-scan-prev",JSON.stringify(prev));
    const n=signalsFromRows(out); renderFeed(); renderWatch(); renderScanTable(); try{ botDecide("scan"); }catch(e){ console.error("SWEEP · bot",e); }
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
    const pFast=fetchFast(s); const pSlow=(fresh||Date.now()-state.slowAt>60000)?fetchSlow(s):null;
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
  if(ui.drawerTab==="story") renderStory(A); else if(ui.drawerTab==="stats") renderStats(A); else if(ui.drawerTab==="journal") renderJournal(); else if(ui.drawerTab==="bot") renderBot();
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
function scheduleScan(){ clearInterval(scan.timer); const ev=+$("scanEvery").value; if(ev>0) scan.timer=setInterval(()=>{ if(!document.hidden) runScan(); },ev); }
$("scanEvery").addEventListener("change",scheduleScan);
function setDrawer(open,tab){ ui.drawerOpen=open; if(tab) ui.drawerTab=tab; $("drawer").classList.toggle("closed",!open); $("drawerTgl").textContent=open?"▾":"▴"; document.querySelectorAll("#drawer .bar [role=tab]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.t===ui.drawerTab))); ["scan","journal","story","stats","strategy","bot"].forEach(t=>{ const el=$("d"+t[0].toUpperCase()+t.slice(1)); el.hidden=t!==ui.drawerTab; }); LS("st-drawer",open?ui.drawerTab:""); if(open&&state.lastA) renderDrawer(state.lastA); if(open&&ui.drawerTab==="journal") renderJournal(); if(open&&ui.drawerTab==="bot") renderBot(); }
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
  const streams=[`${s}@aggTrade`,`${s}@kline_15m`,`${s}@markPrice@1s`,`${s}@depth20@500ms`,`${s}@forceOrder`,"!forceOrder@arr"];
  let ws; try{ ws=new WebSocket(WS_BASE+streams.join("/")); }catch(e){ wsStatus(false,"ws açılamadı"); return; }
  live.ws=ws;
  ws.onopen=()=>{ live.tries=0; live.ok=true; wsStatus(true); };
  ws.onmessage=ev=>{ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } live.msgs++; live.lastMsg=Date.now(); const d=m.data||m; const st=m.stream||""; try{ wsDispatch(st,d); }catch(e){ console.error("SWEEP · ws",e); } };
  ws.onerror=()=>{};
  ws.onclose=()=>{ live.ok=false; wsStatus(false,"bağlantı koptu, yeniden deneniyor"); if(live.wantSym!==sym) return; const wait=Math.min(30000,1000*Math.pow(2,live.tries++)); clearTimeout(live.timer); live.timer=setTimeout(()=>{ if(live.wantSym===sym) wsConnect(sym); },wait); };
}
function wsStatus(ok,txt){ const el=$("wsDot"); if(!el) return; el.className="wsdot "+(ok?"ok":"off"); el.title=ok?"Canlı akış bağlı (WebSocket)":"Canlı akış kapalı · "+(txt||""); const lbl=$("wsTxt"); if(lbl) lbl.textContent=ok?"canlı":"canlı yok"; }
function wsDispatch(stream,d){
  if(stream.endsWith("@aggTrade")){ const p=+d.p,q=+d.q,v=p*q,sell=!!d.m; live.px=p; live.cvd+=sell?-v:v; if(v>=tapeMin()) tapePush({t:d.T,kind:sell?"sell":"buy",p,v}); onLivePrice(); }
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
const BOT_CFG_DEF={mode:"komite",risk:0.03,lev:20,maxLev:20,maxPos:3,maxOpens:12,maxLosses:6,threshold:0.3,minYes:4,holdH:8,cooldownMin:90,strict:false,useBR:true,useRS:true,feeMaker:0.0002,feeTaker:0.0005,slip:0.0003};
const bot={on:false,startT:null,bal:100,start:100,positions:[],orders:[],trades:[],log:[],eq:[],day:{key:null,opens:0,losses:0},ws:null,wsKey:null,px:{},mark:{},fund:{},cool:{},lastTick:0,cfg:{...BOT_CFG_DEF},lastDecision:0,lastVotes:[]};
try{ const saved=JSON.parse(LS("st-bot")||"null"); if(saved){ const cfg={...BOT_CFG_DEF,...(saved.cfg||{})}; if(!saved.cfg||saved.cfg.mode===undefined){ Object.assign(cfg,{mode:"komite",risk:BOT_CFG_DEF.risk,maxOpens:BOT_CFG_DEF.maxOpens,maxLosses:BOT_CFG_DEF.maxLosses,maxPos:BOT_CFG_DEF.maxPos,strict:false}); } Object.assign(bot,saved); bot.cfg=cfg; bot.ws=null; bot.wsKey=null;
  if(!Array.isArray(bot.positions)) bot.positions=[]; if(!Array.isArray(bot.orders)) bot.orders=[]; if(saved.pos) bot.positions.push(saved.pos); if(saved.order) bot.orders.push(saved.order); delete bot.pos; delete bot.order;
  bot.px=bot.px||{}; bot.mark=bot.mark||{}; bot.fund=bot.fund||{}; bot.cool=bot.cool||{}; bot.lastVotes=bot.lastVotes||[]; for(const p of bot.positions){ if(!p.expiresAt) p.expiresAt=(p.openT||Date.now())+cfg.holdH*3600e3; } } }catch(e){}
function botSave(){ const {ws,...rest}=bot; try{ localStorage.setItem("st-bot",JSON.stringify({...rest,log:bot.log.slice(-300),eq:bot.eq.slice(-2000),lastVotes:bot.lastVotes.slice(0,24)})); }catch(e){} }
function botLog(type,sym,text){ bot.log.push({t:Date.now(),type,sym:sym||"",text}); bot.log=bot.log.slice(-300); botSave(); if(ui.drawerTab==="bot") renderBot(); }
function botDay(){ const k=dayKey(Date.now()); if(bot.day.key!==k){ bot.day={key:k,opens:0,losses:0}; } return bot.day; }
function botPnl(p,px){ return (p.dir==="long"?(px-p.entry):(p.entry-px))*p.qty; }
function botMk(sym){ return bot.mark[sym]||bot.px[sym]; }
function botEquity(){ let eq=bot.bal; for(const p of bot.positions){ const px=botMk(p.sym); if(px) eq+=botPnl(p,px); } return eq; }
function botHas(sym){ return bot.positions.some(p=>p.sym===sym)||bot.orders.some(o=>o.sym===sym); }
function botMarginUsed(){ return bot.positions.reduce((a,p)=>a+p.margin,0)+bot.orders.reduce((a,o)=>a+o.margin,0); }
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
/* --- adaylar: komite modu (altı ajanın ortak puanı) --- */
function botCandidatesCommittee(){
  const out=[]; const now=Date.now();
  for(const r of scan.rows){ if(!r.com) continue;
    for(const dir of ["long","short"]){ const c=r.com[dir]; if(!c) continue;
      const held=botHas(r.s), cool=bot.cool[r.s]&&now<bot.cool[r.s];
      const go=!!c.plan&&c.score>=bot.cfg.threshold&&c.yes>=bot.cfg.minYes&&!c.veto&&!held&&!cool;
      out.push({sym:r.s,dir,model:"KOMİTE",grade:c.score>=0.5?"A":c.score>=bot.cfg.threshold?"B":"C",kz:null,entry:bot.px[r.s]||r.px,sd:c.plan?c.plan.sd:NaN,stop:c.plan?c.plan.stop:NaN,t1:c.plan?c.plan.t1:NaN,t2:c.plan?c.plan.t2:NaN,rr1:1.5,rr2:3,com:c,go,held,cool:!!cool,score:c.score,yes:c.yes,veto:c.veto});
    }
  }
  return out.sort((a,b)=>b.score-a.score);
}
function botOpenMarket(x){
  const cfg=bot.cfg; const isL=x.dir==="long"; const px=bot.px[x.sym]||x.entry; if(!(px>0)||!(x.sd>0)) return false;
  const sd=x.sd; const stop=isL?px*(1-sd):px*(1+sd), t1=isL?px*(1+1.5*sd):px*(1-1.5*sd), t2=isL?px*(1+3*sd):px*(1-3*sd);
  const lev=cfg.lev||20; const risk=bot.bal*cfg.risk; const notional=risk/sd; const margin=notional/lev;
  if(margin+botMarginUsed()>bot.bal*0.95){ botLog("skip",x.sym,`Teminat yetmiyor: ${fmtB(margin)} gerekli, kullanılabilir ${fmtB(Math.max(0,bot.bal*0.95-botMarginUsed()))}.`); return false; }
  const fill=isL?px*(1+cfg.slip):px*(1-cfg.slip); const qty=notional/fill; const fee=notional*cfg.feeTaker; bot.bal-=fee; botDay().opens++;
  const votes=x.com.agents.map(a=>`${a.name||a.k} ${a.v>0?"+":""}${fx(a.v,1)}`);
  bot.positions.push({sym:x.sym,dir:x.dir,model:"KOMİTE",grade:x.grade,agents:x.com.agents,talk:x.com.talk,entry:fill,stop,t1,t2,rr1:1.5,rr2:x.com.plan?x.com.plan.rr2:3,lev,notional,margin,risk,qty,qty0:qty,fees:fee,openT:Date.now(),expiresAt:Date.now()+cfg.holdH*3600e3,stage:"open",hi:fill,lo:fill,realized:0,score:x.score,votes});
  botLog("fill",x.sym,`MASA ${isL?"LONG":"SHORT"} · Can'ın kararı · puan ${fx(x.score,2)} · ${x.yes}/7 evet · market ${fmtP(fill)} · stop ${fmtP(stop)} (${fx(sd*100,2)}%) · 1,5R ${fmtP(t1)} · 3R ${fmtP(t2)} · ${lev}x · pozisyon ${fmtB(notional)} · teminat ${fmtB(margin)} · risk ${fmtB(risk)}. Oylar: ${votes.join(", ")}.`);
  botSave(); botWsSync(); return true;
}
/* --- karar döngüsü: tarama bitince ve her dakika --- */
function botDecide(reason){
  if(!bot.on) return; const d=botDay(); const now=Date.now(); const cfg=bot.cfg;
  bot.orders=bot.orders.filter(o=>{ if(now>o.expires){ botLog("cancel",o.sym,`Limit emir süresi doldu (${o.model}), iptal.`); return false; } return true; });
  if(d.opens>=cfg.maxOpens){ if(reason==="scan") botLog("skip","",`Bugün ${d.opens}/${cfg.maxOpens} işlem açıldı: gün kapalı.`); return; }
  if(d.losses>=cfg.maxLosses){ if(reason==="scan") botLog("skip","",`Bugün ${d.losses}/${cfg.maxLosses} kayıp: gün kapalı.`); return; }
  const slots=cfg.maxPos-bot.positions.length-bot.orders.length; if(slots<=0) return;
  if(!scan.rows.length){ if(reason==="scan"||now-(bot._emptyWarn||0)>600e3){ bot._emptyWarn=now; botLog("skip","",'Tarama boş: Binance\'e ulaşılamıyor ya da ilk tur bitmedi. Üstteki akış noktası kırmızıysa bağlantı (VPN) sorunudur; veri gelmeden masa toplanamaz.'); } return; }
  if(cfg.mode==="komite"){
    const c=botCandidatesCommittee(); bot.lastVotes=c.slice(0,24).map(x=>({sym:x.sym,dir:x.dir,score:x.score,yes:x.yes,veto:x.veto,go:x.go,held:x.held,cool:x.cool,agents:x.com.agents,talk:x.com.talk,decision:x.com.decision}));
    const go=c.filter(x=>x.go);
    if(!go.length){ if(reason==="scan") botLog("skip","",`Komite ${scan.rows.length} coin × 2 yön puanladı; eşik ${fx(cfg.threshold,2)} ve ${cfg.minYes}/7 oyu sağlayan yok. En iyi: ${c.slice(0,3).map(x=>x.sym.replace("USDT","")+" "+(x.dir==="long"?"L":"S")+" "+fx(x.score,2)+(x.veto?" (veto)":"")).join(", ")||"—"}.`); botSave(); return; }
    let opened=0; const seen=new Set(); for(const x of go){ if(opened>=slots) break; if(seen.has(x.sym)) continue; seen.add(x.sym); if(botOpenMarket(x)) opened++; }
    if(!opened&&reason==="scan") botLog("skip","",`Komite ${go.length} giriş onayladı ama teminat/slot yetmedi.`);
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
function botWsSync(){
  const syms=Array.from(new Set([...bot.positions.map(p=>p.sym),...bot.orders.map(o=>o.sym)])).sort(); const key=syms.join(",");
  if(bot.wsKey===key && bot.ws && bot.ws.readyState<=1) return;
  if(bot.ws){ try{ bot.ws.onclose=null; bot.ws.close(); }catch(e){} bot.ws=null; } bot.wsKey=key; if(!syms.length) return;
  let ws; try{ ws=new WebSocket(WS_BASE+syms.map(s=>s.toLowerCase()).flatMap(s=>[`${s}@aggTrade`,`${s}@markPrice@1s`]).join("/")); }catch(e){ return; } bot.ws=ws;
  ws.onmessage=ev=>{ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } const d=m.data||m; const st=m.stream||""; const sym=(d.s||st.split("@")[0]||"").toUpperCase(); if(!sym) return;
    if(st.endsWith("@aggTrade")) botOnPrice(sym,+d.p,d.T);
    else if(st.endsWith("@markPrice@1s")){ if(+d.p>0){ bot.mark[sym]=+d.p; bot.lastTick=Date.now(); } const T=+d.T; const f=bot.fund[sym]||{r:0,T:0}; if(f.T&&T>f.T+60e3&&Date.now()>=f.T-5000) botFunding(sym,f.r); bot.fund[sym]={r:+d.r,T}; } };
  ws.onclose=()=>{ if(bot.wsKey===key&&bot.on) setTimeout(()=>{ if(bot.wsKey===key){ bot.ws=null; bot.wsKey=null; botWsSync(); } },3000); };
}
function botFunding(sym,rate){ for(const p of bot.positions){ if(p.sym!==sym) continue; const fee=p.notional*rate*(p.dir==="long"?1:-1); bot.bal-=fee; p.fees+=fee; botLog("fund",p.sym,`Fonlama ${fx(rate*100,4)}% → ${fee>=0?"ödendi":"alındı"} ${fmtB(Math.abs(fee))}.`); } }
function botOnPrice(sym,px,T){
  if(!(px>0)) return; bot.px[sym]=px; bot.lastTick=Date.now(); const cfg=bot.cfg; const now=Date.now();
  for(const o of [...bot.orders]){ if(o.sym!==sym) continue; const isL=o.dir==="long"; if(!(isL? px<=o.entry : px>=o.entry)) continue;
    bot.orders=bot.orders.filter(x=>x!==o);
    if(isL? px<=o.stop : px>=o.stop){ botLog("cancel",o.sym,`Fiyat stop seviyesine giriş olmadan geldi; emir iptal.`); botWsSync(); continue; }
    const fill=o.entry; const qty=o.notional/fill; const fee=o.notional*cfg.feeMaker; bot.bal-=fee; botDay().opens++;
    bot.positions.push({...o,entry:fill,qty,qty0:qty,fees:fee,openT:T||now,expiresAt:now+cfg.holdH*3600e3,stage:"open",hi:fill,lo:fill,realized:0});
    botLog("fill",o.sym,`Limit doldu ${fmtP(fill)} · ${o.dir==="long"?"LONG":"SHORT"} ${o.lev}x · ${fmtB(o.notional)} · komisyon ${fmtB(fee)}.`); botSave(); }
  for(const p of [...bot.positions]){ if(p.sym!==sym) continue; const isL=p.dir==="long"; p.hi=Math.max(p.hi,px); p.lo=Math.min(p.lo,px);
    const close=(part,price,why,taker)=>{ const q=p.qty*part; const pnl=(isL?(price-p.entry):(p.entry-price))*q; const fee=q*price*(taker?cfg.feeTaker:cfg.feeMaker); bot.bal+=pnl-fee; p.realized+=pnl-fee; p.fees+=fee; p.qty-=q; botLog(why.k,p.sym,`${why.t} ${fmtP(price)} · %${Math.round(part*100)} kapandı · ${pnl-fee>=0?"+":""}${fmtB(pnl-fee)}.`); };
    const risk=Math.abs(p.entry-p.stop);
    if(isL? px<=p.stop : px>=p.stop){ const price=isL?p.stop*(1-cfg.slip):p.stop*(1+cfg.slip); close(1,price,{k:"stop",t:p.stage==="open"?"Stop":"Kalan stop"},true); botClosePos(p); continue; }
    if(p.stage==="open" && (isL? px>=p.t1 : px<=p.t1)){ close(0.5,p.t1,{k:"tp1",t:"Hedef 1"},false); p.stage="tp1"; p.stop=p.entry; botLog("move",p.sym,`Stop girişe çekildi (${fmtP(p.entry)}).`); botSave(); continue; }
    if(p.stage==="tp1"){ if(p.t2 && (isL? px>=p.t2 : px<=p.t2)){ close(0.6,p.t2,{k:"tp2",t:"Hedef 2"},false); p.stage="tp2"; }
      const trail = isL ? p.hi-1*risk : p.lo+1*risk; if(isL? trail>p.stop : trail<p.stop){ p.stop=trail; } }
    if(p.stage==="tp2"){ const trail = isL ? p.hi-0.7*risk : p.lo+0.7*risk; if(isL? trail>p.stop : trail<p.stop) p.stop=trail; }
    if(p.expiresAt && now>p.expiresAt){ const price=isL?px*(1-cfg.slip):px*(1+cfg.slip); close(1,price,{k:"time",t:"Zaman stopu"},true); botClosePos(p); continue; }
  }
  const eq=botEquity(); const last=bot.eq[bot.eq.length-1]; if(!last||now-last.t>60e3){ bot.eq.push({t:now,v:eq}); }
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
  const rv=$("botRoiV"); if(rv){ rv.textContent=pct(roi,1); rv.className=roi>=100?"up":roi>=0?"":"down"; } const rb=$("botRoiBar"); if(rb) rb.style.width=clamp(roi,0,100)+"%"; const rr=$("botRoiRem"); if(rr) rr.textContent=roi>=100?"ulaşıldı":"kalan "+pct(100-roi,1);
}
/* --- masa: yedi kişilik, açılış → tartışma → karar dökümü --- */
const DESK_COL={trend:"#39c6f2",liq:"#a78bfa",flow:"#2ee59d",macro:"#f5b53f",quant:"#f9a8d4",mom:"#ff8a3d",risk:"#ff5c6c"};
function talkHtml(talk){
  if(!talk||!talk.length) return "";
  const stages=[["açılış","1. tur · açılış görüşleri"],["tartışma","2. tur · tartışma"],["karar","3. tur · karar"]];
  return `<div style="margin-top:10px;display:grid;gap:8px">${stages.map(([st,title])=>{ const rows=talk.filter(t=>t.stage===st); if(!rows.length) return st==="tartışma"?`<div><div class="muted" style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px">${title}</div><div class="muted" style="font-size:11.5px">Kimse itiraz etmedi.</div></div>`:""; return `<div><div class="muted" style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px">${title}</div>${rows.map(t=>`<div style="display:flex;gap:8px;align-items:flex-start;margin:4px 0"><span style="flex:0 0 26px;height:26px;border-radius:50%;background:${DESK_COL[t.id]||"#888"};color:#0a0e13;font-weight:800;font-size:12px;display:inline-flex;align-items:center;justify-content:center">${esc((t.who||"?")[0])}</span><div style="font-size:12px;line-height:1.45"><b>${esc(t.who)}</b> <span class="muted">${esc(t.role)}</span><br>${esc(t.text)}</div></div>`).join("")}</div>`; }).join("")}</div>`;
}
/* --- masa şeması: yedi kişi, merkeze akan katkılar, çelişkiler, veto --- */
function renderRoom(){
  const opts=[]; for(const p of bot.positions){ if(p.agents) opts.push({key:"pos:"+p.sym,label:`${p.sym.replace("USDT","")} ${p.dir==="long"?"L":"S"} · açık pozisyon (giriş anı)`,agents:p.agents,talk:p.talk,score:p.score,yes:null,veto:null,go:true,dir:p.dir,sym:p.sym}); }
  for(const v of bot.lastVotes){ opts.push({key:v.sym+"|"+v.dir,label:`${v.sym.replace("USDT","")} ${v.dir==="long"?"L":"S"} · puan ${fx(v.score,2)}${v.go?" · giriş":v.veto?" · veto":""}`,agents:v.agents,talk:v.talk,score:v.score,yes:v.yes,veto:v.veto,go:v.go,dir:v.dir,sym:v.sym}); }
  if(!opts.length) return `<div class="card" style="margin-bottom:10px"><h4 style="margin:0 0 4px">Masa</h4><div class="empty">İlk tarama bitince yedi kişilik masanın tartışması burada canlanır.</div></div>`;
  let sel=opts.find(o=>o.key===bot.roomSel)||opts.find(o=>o.go)||opts[0]; const ag=sel.agents; const thr=bot.cfg.threshold;
  const W=400,H=300,cx=200,cy=150,R=108; const n=ag.length; const posOf=i=>{ const a=-Math.PI/2+i*2*Math.PI/n; return [cx+R*Math.cos(a),cy+R*Math.sin(a)]; };
  const col=v=>v>0.15?"var(--long)":v<-0.15?"var(--short)":"var(--ink-2)";
  let num=0,den=0; for(const a of ag){ const w=a.w||COM_W[a.k]||1; num+=w*a.v*a.c; den+=w; } const score=sel.score!=null?sel.score:(den?num/den:0);
  let lines="",nodes="",conf="";
  ag.forEach((a,i)=>{ const [x,y]=posOf(i); const w=a.w||COM_W[a.k]||1; const k=w*a.v*a.c; const sw=0.6+Math.abs(k)*7; const flow=Math.abs(a.v)>0.15;
    lines+=`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${cx}" y2="${cy}" stroke="${col(a.v)}" stroke-width="${sw.toFixed(1)}" stroke-opacity="${(0.25+0.6*a.c).toFixed(2)}" class="${flow?(a.v>0?"flow-in":"flow-out"):""}"/>`;
    const r=16+10*a.c; nodes+=`<g class="agent" data-i="${i}"><title>${esc(a.name||a.k)} · ${esc(a.role||"")}: oy ${a.v>0?"+":""}${fx(a.v,2)} · güven ${fx(a.c,2)} · ağırlık ${w} · ${esc(a.txt)}</title><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${col(a.v)}" fill-opacity="${(0.15+0.55*Math.abs(a.v)).toFixed(2)}" stroke="${col(a.v)}" stroke-width="${(1+3*a.c).toFixed(1)}"/><text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${a.v>0?"+":""}${fx(a.v,1)}</text><text x="${x.toFixed(1)}" y="${(y+r+13).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${esc(a.name||a.k)}</text><text x="${x.toFixed(1)}" y="${(y+r+24).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="var(--ink-2)">${esc((a.role||"").split(" · ")[0].replace(" analisti","").replace(" araştırmacısı","").replace("Baş trader","baş trader"))}</text></g>`; });
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const a=ag[i],b=ag[j]; if((a.v>0.4&&b.v<-0.4)||(a.v<-0.4&&b.v>0.4)){ const [x1,y1]=posOf(i),[x2,y2]=posOf(j); conf+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="4 4" stroke-opacity=".8"><title>Çelişki: ${esc(a.name||a.k)} ${a.v>0?"+":""}${fx(a.v,1)} ↔ ${esc(b.name||b.k)} ${b.v>0?"+":""}${fx(b.v,1)}</title></line>`; } }
  const veto=sel.veto; const pctArc=clamp((score+1)/2,0,1); const circ=2*Math.PI*34; const decision=veto?"VETO":sel.go?"GİRİŞ":score>=thr?"EŞİKTE":"BEKLE"; const dcol=veto?"var(--short)":sel.go?"var(--long)":"var(--ink-2)";
  const center=`<circle cx="${cx}" cy="${cy}" r="40" fill="var(--bg-2, #111822)" stroke="${dcol}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6"/><circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="${score>=thr?"var(--long)":"var(--ink-2)"}" stroke-width="6" stroke-dasharray="${(circ*pctArc).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/><text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="15" font-weight="800" fill="var(--ink)">${score>=0?"+":""}${fx(score,2)}</text><text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="10" font-weight="700" fill="${dcol}">${decision}</text>${veto?`<text x="${cx}" y="${cy+58}" text-anchor="middle" font-size="10.5" fill="var(--short)">${esc(veto)}</text>`:""}`;
  const yes=ag.filter(a=>a.v>0.15).length, no=ag.filter(a=>a.v<-0.15).length;
  const list=ag.map(a=>`<div style="display:flex;gap:8px;align-items:baseline;font-size:11.5px;margin:2px 0"><span style="min-width:150px;font-weight:700;color:${col(a.v)}">${esc(a.name||a.k)} <span class="muted" style="font-weight:400">${esc(a.role||"")}</span></span><span class="num" style="min-width:36px">${a.v>0?"+":""}${fx(a.v,1)}</span><span class="muted" style="min-width:52px">güven ${fx(a.c,1)}</span><span class="muted">${esc(a.txt)}</span></div>`).join("");
  return `<div class="card" style="margin-bottom:10px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:4px"><h4 style="margin:0">Masa</h4><select id="botRoomSel">${opts.map(o=>`<option value="${o.key}" ${o.key===sel.key?"selected":""}>${esc(o.label)}</option>`).join("")}</select><span class="muted" style="font-size:11.5px">${yes} evet · ${no} hayır · eşik ${fx(thr,2)} · ${bot.cfg.minYes}/7 oy gerekli${sel.yes!=null?" · "+sel.yes+"/7 evet":""}</span></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;align-items:start"><svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:420px;height:auto" role="img" aria-label="Komite odası">${lines}${conf}${nodes}${center}</svg><div>${list}<p class="muted" style="font-size:11px;margin:6px 0 0">Daire boyu ve çerçeve = güven; renk ve dolgu = oy; çizgi kalınlığı = karara katkı (ağırlık × oy × güven); turuncu kesikli çizgi = çelişki. Merkez: ağırlıklı puan ve Can'ın kararı. Oylar tartışma sonrası değerler.</p></div></div>${talkHtml(sel.talk)}</div>`;
}
function botClosePos(p){
  const r=p.realized/p.risk; const rec={sym:p.sym,dir:p.dir,model:p.model,grade:p.grade,lev:p.lev,entry:p.entry,openT:p.openT,closeT:Date.now(),pnl:p.realized,fees:p.fees,r,score:p.score};
  bot.trades.push(rec); if(p.realized<0) botDay().losses++; bot.cool[p.sym]=Date.now()+bot.cfg.cooldownMin*60e3;
  botLog("close",p.sym,`İşlem kapandı: ${p.realized>=0?"+":""}${fmtB(p.realized)} (${r>=0?"+":""}${fx(r,2)}R) · bakiye ${fmtB(bot.bal)} · ROI ${pct((bot.bal/bot.start-1)*100,1)}.`);
  bot.positions=bot.positions.filter(x=>x!==p); bot.eq.push({t:Date.now(),v:bot.bal}); if(bot.bal>=bot.start*2&&!bot.goalHit){ bot.goalHit=Date.now(); botLog("sys","",`Hedef tamam: bakiye ikiye katlandı (${fmtB(bot.bal)}). Bot devam ediyor.`); } botSave(); botWsSync();
  if(bot.on) setTimeout(()=>botDecide("tick"),500);
}
function botStart(){ if(bot.on) return; bot.on=true; if(!bot.startT) bot.startT=Date.now(); const c=bot.cfg; botLog("sys","",c.mode==="komite"?`Bot başladı · KOMİTE modu · sanal ${fmtB(bot.bal)} · risk %${c.risk*100} · ${c.lev}x sabit · aynı anda ${c.maxPos} pozisyon · eşik ${fx(c.threshold,2)}, ${c.minYes}/7 oy · zaman stopu ${c.holdH} sa · hedef %100 ROI.`:`Bot başladı · KAPI modu · sanal ${fmtB(bot.bal)} · risk %${c.risk*100} · en fazla ${c.maxLev}x · ${c.strict?"yüksek tutarlılık kuralları":"serbest kurallar"} · Kurulum 2 ${c.useBR?"açık":"kapalı"} · Kurulum 3 ${c.useRS!==false?"açık":"kapalı"}.`); botWsSync(); if(!scan.rows.length&&!scan.running) runScan(); else botDecide("scan"); botSave(); }
function botStop(){ bot.on=false; botLog("sys","","Bot durduruldu (açık pozisyonlar ve emirler korunur; başlatınca devam eder)."); botSave(); }
function botReset(){ if(bot.positions.length||bot.orders.length){ toast("Önce açık pozisyonlar/emirler kapanmalı."); return; } Object.assign(bot,{on:false,startT:null,bal:100,start:100,positions:[],orders:[],trades:[],log:[],eq:[],day:{key:null,opens:0,losses:0},px:{},cool:{},lastVotes:[],goalHit:null}); botSave(); renderBot(); }
function botCloseAll(){ for(const p of [...bot.positions]){ const px=bot.px[p.sym]; if(!px) continue; const isL=p.dir==="long"; const price=isL?px*(1-bot.cfg.slip):px*(1+bot.cfg.slip); const q=p.qty; const pnl=(isL?(price-p.entry):(p.entry-price))*q; const fee=q*price*bot.cfg.feeTaker; bot.bal+=pnl-fee; p.realized+=pnl-fee; p.fees+=fee; p.qty=0; botLog("close",p.sym,`Elle kapatıldı ${fmtP(price)} · ${pnl-fee>=0?"+":""}${fmtB(pnl-fee)}.`); botClosePos(p); } bot.orders=[]; botSave(); botWsSync(); renderBot(); }
function botCsv(){ const rows=[["acilis","kapanis","coin","yon","model","not","kaldirac","giris","pnl_usdt","komisyon","R","komite_puan"]].concat(bot.trades.map(t=>[new Date(t.openT).toISOString(),new Date(t.closeT).toISOString(),t.sym,t.dir,t.model,t.grade,t.lev,t.entry,t.pnl.toFixed(4),t.fees.toFixed(4),t.r.toFixed(2),t.score!=null?t.score:""])); const logRows=[[],["zaman","tur","coin","mesaj"]].concat(bot.log.map(l=>[new Date(l.t).toISOString(),l.type,l.sym,'"'+l.text.replace(/"/g,"'")+'"'])); const csv=rows.concat(logRows).map(r=>r.join(",")).join("\n"); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv"})); a.download="sweep-bot-"+new Date().toISOString().slice(0,10)+".csv"; a.click(); }
function botNetTxt(){ const fresh=bot.lastTick&&Date.now()-bot.lastTick<15000; const has=bot.positions.length||bot.orders.length; const a=has?(fresh?'<span class="up">● fiyat akışı canlı</span>':'<span class="down">● fiyat akışı yok</span>'):(live.ok?'<span class="up">● Binance bağlı</span>':'<span class="down">● Binance\'e ulaşılamıyor</span>'); return `<span id="botNet">${a} · tarama ${scan.rows.length} coin</span>`; }
function renderBot(){
  const el=$("dBot"); if(!el) return; const eq=botEquity(); const d=botDay(); const c=bot.cfg; const roi=(eq/bot.start-1)*100;
  const st=bot.trades.length?{n:bot.trades.length,win:bot.trades.filter(t=>t.pnl>0).length,sum:bot.trades.reduce((a,t)=>a+t.r,0)}:null;
  const inp=(id,label,val,step,min,max,w)=>`<label style="font-size:12px;color:var(--ink-2);display:inline-flex;gap:4px;align-items:center">${label} <input type="number" id="${id}" value="${val}" step="${step}" min="${min}" max="${max}" style="width:${w||64}px"></label>`;
  const head=`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
    <button type="button" class="${bot.on?"":"primary"}" id="botTgl">${bot.on?"Durdur":"Başlat"}</button><button type="button" class="ghost" id="botCsv">CSV indir</button><button type="button" class="ghost" id="botCloseAll" ${bot.positions.length?"":"disabled"}>Hepsini kapat</button><button type="button" class="ghost" id="botReset">Sıfırla</button>
    <label style="font-size:12px;color:var(--ink-2)">Mod <select id="botMode"><option value="komite" ${c.mode==="komite"?"selected":""}>Masa (7 kişi tartışır, market giriş, çoklu pozisyon)</option><option value="kapi" ${c.mode!=="komite"?"selected":""}>Kapı (AMD/K2/K3 limit planları)</option></select></label>
    <span class="muted" style="font-size:11.5px">${botNetTxt()} · ${bot.on?'<span class="up">● çalışıyor</span>':"● durdu"}${bot.startT?" · başlangıç "+new Date(bot.startT).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):""}</span></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
    ${inp("botRisk","Risk %",(c.risk*100).toFixed(1),0.5,0.5,25)} ${inp("botLev","Kaldıraç",c.lev,1,1,50,56)} ${inp("botMaxPos","Aynı anda",c.maxPos,1,1,10,52)} ${inp("botThr","Eşik",c.threshold,0.05,0,1,60)} ${inp("botMinYes","Asgari oy",c.minYes,1,1,7,52)} ${inp("botHold","Zaman stopu (sa)",c.holdH,1,1,72,56)} ${inp("botMaxOpens","Gün/işlem",c.maxOpens,1,1,50,56)} ${inp("botMaxLosses","Gün/kayıp",c.maxLosses,1,1,50,56)}
    ${c.mode!=="komite"?`<label style="font-size:12px;color:var(--ink-2)"><input type="checkbox" id="botStrict" ${c.strict?"checked":""} style="width:auto"> 10 kapı kuralı</label><label style="font-size:12px;color:var(--ink-2)"><input type="checkbox" id="botBR" ${c.useBR?"checked":""} style="width:auto"> Kurulum 2</label><label style="font-size:12px;color:var(--ink-2)"><input type="checkbox" id="botRS" ${c.useRS!==false?"checked":""} style="width:auto"> Kurulum 3</label>`:""}
  </div>
  <div class="plan" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:10px">
    <div class="pv"><b>Bakiye</b><span class="${bot.bal>=bot.start?"up":"down"}">${fmtB(bot.bal)}</span><small>başlangıç ${fmtB(bot.start)}</small></div>
    <div class="pv"><b>Özkaynak (canlı)</b><span id="botEqV" class="${eq>=bot.start?"up":"down"}">${fx(eq,2)} $</span><small id="botEqP">${pct(roi,2)} · açık PnL ${eq-bot.bal>=0?"+":""}${fx(eq-bot.bal,2)} $</small></div>
    <div class="pv"><b>Hedef %100 ROI</b><span id="botRoiV" class="${roi>=100?"up":roi>=0?"":"down"}">${pct(roi,1)}</span><small><span style="display:block;height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden;margin-top:4px"><span id="botRoiBar" style="display:block;height:100%;width:${clamp(roi,0,100)}%;background:var(--long)"></span></span><span id="botRoiRem">${roi>=100?"ulaşıldı":"kalan "+pct(100-roi,1)}</span></small></div>
    <div class="pv"><b>Bugün</b><span>${d.opens}/${c.maxOpens}</span><small>${d.losses}/${c.maxLosses} kayıp</small></div>
    <div class="pv"><b>İşlemler</b><span>${st?st.n:0}</span><small>${st?`hedef %${Math.round(st.win/st.n*100)} · ${st.sum>=0?"+":""}${fx(st.sum,1)}R`:"henüz yok"}</small></div>
    <div class="pv"><b>Açık</b><span>${bot.positions.length}/${c.maxPos}</span><small>${bot.orders.length} bekleyen emir · teminat ${fmtB(botMarginUsed())}</small></div>
  </div>`;
  const pos=bot.positions.map(p=>{ const px=botMk(p.sym); const pnl=px?botPnl(p,px):0; const roe=pnl/p.margin*100; const age=Math.round((Date.now()-p.openT)/60000); return `<tr data-pos="${p.sym}"><td><b>${p.sym.replace("USDT","")}</b> ${chip(p.dir==="long"?"up sm":"down sm",p.dir==="long"?"L":"S")} <span class="muted">${p.model} ${p.grade} ${p.lev}x</span></td><td class="num">${fmtB(p.notional)}<br><span class="muted" style="font-size:10.5px">teminat ${fmtB(p.margin)}</span></td><td class="num">${fmtP(p.entry)}</td><td class="num bpx">${px?fmtP(px):"—"}</td><td class="num warn">${fmtP(botLiqPx(p))}</td><td class="num down bstop">${fmtP(p.stop)}</td><td class="num up">${fmtP(p.t1)} / ${fmtP(p.t2)}</td><td class="num bpnl ${pnl>=0?"up":"down"}">${pnl>=0?"+":""}${fx(pnl,2)} $<br><span style="font-size:11px">${roe>=0?"+":""}${fx(roe,1)}%</span></td><td class="muted bst">${p.stage} · ${age} dk</td></tr>`; }).join("");
  const ord=bot.orders.map(o=>`<tr data-ord="${o.sym}"><td><b>${o.sym.replace("USDT","")}</b> ${chip(o.dir==="long"?"up sm":"down sm",o.dir==="long"?"L":"S")} <span class="muted">${o.model} ${o.grade} · bekleyen limit</span></td><td class="num">${fmtB(o.notional)}</td><td class="num">${fmtP(o.entry)}</td><td class="num bpx">${bot.px[o.sym]?fmtP(bot.px[o.sym]):"—"}</td><td></td><td class="num down">${fmtP(o.stop)}</td><td class="num up">${fmtP(o.t1)}</td><td></td><td class="muted">${Math.max(0,Math.round((o.expires-Date.now())/60000))} dk kaldı</td></tr>`).join("");
  const votes=c.mode==="komite"&&bot.lastVotes.length?`<details style="margin-bottom:10px"${bot.positions.length?"":" open"}><summary class="muted" style="cursor:pointer;font-size:12px">Komite son oylaması · ${bot.lastVotes.length} aday</summary><table class="t" style="margin-top:6px"><thead><tr><th>Coin</th><th>Puan</th><th>Oy</th>${bot.lastVotes[0].agents.map(a=>`<th>${a.k}</th>`).join("")}<th>Karar</th></tr></thead><tbody>${bot.lastVotes.map(v=>`<tr class="${v.go?"pick":""}"><td><b>${v.sym.replace("USDT","")}</b> ${chip(v.dir==="long"?"up sm":"down sm",v.dir==="long"?"L":"S")}</td><td class="num ${v.score>=c.threshold?"up":""}">${fx(v.score,2)}</td><td class="num">${v.yes}/7</td>${v.agents.map(a=>`<td class="num ${a.v>0.15?"up":a.v<-0.15?"down":"muted"}" title="${esc(a.txt)}">${a.v>0?"+":""}${fx(a.v,1)}</td>`).join("")}<td class="muted">${v.veto?"veto: "+esc(v.veto):v.held?"açık":v.cool?"bekleme":v.go?'<span class="up">giriş</span>':"eşik altı"}</td></tr>`).join("")}</tbody></table><p class="muted" style="font-size:11px;margin:4px 0 0">Hücrenin üstüne gel: ajanın gerekçesi. Puan = ağırlıklı oy; Kerem 1,3, Selin ve Baran 0,8, diğerleri 1. Oylar tartışma sonrası değerler.</p></details>`:"";
  const room=c.mode==="komite"?renderRoom():"";
  const tr=bot.trades.slice(-12).reverse().map(t=>`<tr><td class="num muted">${new Date(t.closeT).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</td><td><b>${t.sym.replace("USDT","")}</b> ${chip(t.dir==="long"?"up sm":"down sm",t.dir==="long"?"L":"S")} <span class="muted">${t.model} ${t.grade} ${t.lev}x</span></td><td class="num">${fmtP(t.entry)}</td><td class="num ${t.pnl>=0?"up":"down"}">${t.pnl>=0?"+":""}${fx(t.pnl,2)} $</td><td class="num ${t.r>=0?"up":"down"}">${t.r>=0?"+":""}${fx(t.r,2)}R</td></tr>`).join("");
  const lg=bot.log.slice(-40).reverse().map(l=>`<div class="tp ${{fill:"buy",tp1:"buy",tp2:"buy",stop:"sell",time:"",cancel:"",skip:"",order:"",close:"",sys:"",move:"",fund:""}[l.type]||""}" style="grid-template-columns:110px 70px 1fr"><span class="when">${new Date(l.t).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span><span class="k ${{fill:"up",tp1:"up",tp2:"up",close:"",stop:"down",time:"warn",cancel:"warn",skip:"muted",order:"cyan",sys:"muted",move:"cyan",fund:"muted"}[l.type]||""}">${{fill:"DOLDU",tp1:"HEDEF 1",tp2:"HEDEF 2",stop:"STOP",time:"ZAMAN",cancel:"İPTAL",skip:"BEKLE",order:"EMİR",close:"KAPANDI",sys:"SİSTEM",move:"STOP↑",fund:"FONLAMA"}[l.type]||l.type}</span><span>${l.sym?"<b>"+l.sym.replace("USDT","")+"</b> · ":""}${l.text}</span></div>`).join("");
  el.innerHTML=head+room+((pos||ord)?`<table class="t" style="margin-bottom:10px"><thead><tr><th>Pozisyon</th><th>Boyut</th><th>Giriş</th><th>Mark</th><th>Likid.</th><th>Stop</th><th>Hedef 1 / 2</th><th>PnL (ROE)</th><th>Durum</th></tr></thead><tbody>${pos}${ord}</tbody></table>`:"")+votes+(tr?`<table class="t" style="margin-bottom:10px"><thead><tr><th>Kapanış</th><th>İşlem</th><th>Giriş</th><th>PnL</th><th>R</th></tr></thead><tbody>${tr}</tbody></table>`:"")+`<div class="tape" style="max-height:320px">${lg||'<div class="empty">Karar günlüğü boş. Başlat\'a bas; her tarama turunda ne yaptığını ve neden yapmadığını buraya yazar.</div>'}</div>`;
  $("botTgl").addEventListener("click",()=>{ bot.on?botStop():botStart(); renderBot(); }); $("botCsv").addEventListener("click",botCsv); $("botReset").addEventListener("click",botReset); $("botCloseAll").addEventListener("click",botCloseAll);
  $("botMode").addEventListener("change",e=>{ bot.cfg.mode=e.target.value; botSave(); renderBot(); });
  const rs=$("botRoomSel"); if(rs) rs.addEventListener("change",e=>{ bot.roomSel=e.target.value; renderBot(); });
  const num=(id,key,f)=>{ const n=$(id); if(n) n.addEventListener("change",e=>{ const v=+e.target.value; if(isFinite(v)){ bot.cfg[key]=f?f(v):v; botSave(); } }); };
  num("botRisk","risk",v=>clamp(v,0.5,25)/100); num("botLev","lev",v=>clamp(Math.round(v),1,50)); num("botMaxPos","maxPos",v=>clamp(Math.round(v),1,10)); num("botThr","threshold",v=>clamp(v,0,1)); num("botMinYes","minYes",v=>clamp(Math.round(v),1,7)); num("botHold","holdH",v=>clamp(Math.round(v),1,72)); num("botMaxOpens","maxOpens",v=>clamp(Math.round(v),1,50)); num("botMaxLosses","maxLosses",v=>clamp(Math.round(v),1,50));
  const s=$("botStrict"); if(s) s.addEventListener("change",e=>{ bot.cfg.strict=e.target.checked; botSave(); }); const b=$("botBR"); if(b) b.addEventListener("change",e=>{ bot.cfg.useBR=e.target.checked; botSave(); }); const q=$("botRS"); if(q) q.addEventListener("change",e=>{ bot.cfg.useRS=e.target.checked; botSave(); });
}
setInterval(()=>{ if(bot.on){ botDecide("tick"); if(ui.drawerTab==="bot") renderBot(); } },60000);
if(bot.on||bot.positions.length||bot.orders.length){ botWsSync(); }

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
  renderFeed(); renderWatch(); renderJournal(); scheduleScan();
  start(); setTimeout(()=>{ if(!scan.rows.length&&!scan.running) runScan(); },2500);
  // PWA: installable when served over https
  try{ const icon=document.querySelector('link[rel="icon"]')?.href; const man={name:"SWEEP · Likidite Terminali",short_name:"SWEEP",start_url:location.pathname||"./",display:"standalone",background_color:"#0a0e13",theme_color:"#0a0e13",icons:icon?[{src:icon,sizes:"512x512",type:"image/png",purpose:"any"}]:[]}; const l=document.createElement("link"); l.rel="manifest"; l.href=location.protocol==="https:"?"manifest.webmanifest":"data:application/manifest+json,"+encodeURIComponent(JSON.stringify(man)); document.head.appendChild(l); if("serviceWorker" in navigator&&location.protocol==="https:") navigator.serviceWorker.register("sw.js").catch(()=>{}); }catch(e){}
})();
