/* ---------- Kurulum 3: rejimli süpürme ----------
   AMD dizisi (süpürme → emir akışı → MSS → OTE) aynen kalır; üstüne, incelenen açık kaynak botlardan (freqtrade/NFI, passivbot)
   kanıtı olan dört koruma eklenir:
   1. BTC rejimi: BTC son 4 saatte / 24 saatte karşı yöne sert gitmiyor ve BTC 15 dk yapısı karşı yöne bakmıyor (NFI'nin BTC bilgi çiftleri + pump/dump korumaları).
   2. Pompa/çöküş filtresi: coin son 24 saatte %12'den fazla koşmuşsa peşinden gidilmez; süpürmeden MSS'e yol ≤ 4 ATR olmalı (hareket taze).
   3. Oynaklığa göre stop: stop en az 0,8 ATR(15 dk, 14), en fazla 3 ATR; gürültü stopu yemesin, 20x'e sığsın.
   4. Zaman stopu ve kademeli çıkış: 1,5R'de yarısı kapanır ve stop girişe çekilir; kalan yarı 2–4R bandındaki karşı havuza (yoksa 3R) gider;
      32 mum içinde sonuçlanmazsa kapanıştan çıkılır (freqtrade ROI tablosu mantığı). Geriye dönük testte komisyon ve kayma düşülür.
   Parametreler veriye uydurulmadı (hyperopt yok); gerekçeyle seçildi, tests/backtest-compare.js ile karşılaştırıldı. */
const RS_CFG={n4h:16, n24h:96, optimistic:false, atrLen:14, stopAtr:0.8, maxStopAtr:3.0, minStop:0.015, floorStop:0.015, tp1R:1.5, part:0.5, runMinR:2, runMaxR:4, maxHold:32, maxWait:16, pump24:0.12, btcDump4h:0.02, btcDump24h:0.04, extAtr:4};
const SIM_FEE={maker:0.0002, taker:0.0005, slip:0.0003};
// ATR(len) — n indeksindeki mum hariç, öncesindeki kapanmış mumlarla (bakış ileri yok)
function atrAt(k, n, len){ len=len||RS_CFG.atrLen; let s=0,c=0; for(let i=Math.max(1,n-len);i<n;i++){ const p=k[i-1].c; s+=Math.max(k[i].h-k[i].l,Math.abs(k[i].h-p),Math.abs(k[i].l-p)); c++; } return c? s/c : NaN; }
// BTC rejimi: t anında (o mum dahil) bilinen BTC 15 dk mumlarıyla 4 saat / 24 saat değişim ve kısa yapı
function btcRegimeAt(btc, t, dir){
  if(!btc||btc.length<120) return null;
  let lo=0,hi=btc.length-1,ib=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(btc[m].t<=t){ ib=m; lo=m+1; } else hi=m-1; }
  if(ib<100) return null;
  const c=btc[ib].c; const ch4=c/btc[ib-RS_CFG.n4h].c-1, ch24=c/btc[ib-RS_CFG.n24h].c-1;
  const cl=btc.slice(ib-95,ib+1).map(x=>x.c); const a=cl.slice(-20).reduce((x,y)=>x+y,0)/20, b=cl.slice(-60,-40).reduce((x,y)=>x+y,0)/20; const bias=a>b*1.005?"up":a<b*0.995?"down":"flat";
  const isL=dir==="long";
  const dump = isL ? (ch4<-RS_CFG.btcDump4h || ch24<-RS_CFG.btcDump24h) : (ch4>RS_CFG.btcDump4h || ch24>RS_CFG.btcDump24h);
  const against = bias===(isL?"down":"up");
  return {ch4,ch24,bias,ok:!dump&&!against,agree:bias===(isL?"up":"down"),dump,against,stale:(t-btc[ib].t)>2*9e5};
}
// Ortak işlem simülatörü: limit giriş, stop, 1,5R'de kısmi çıkış + başabaş, koşucu hedef, zaman stopu; komisyon ve kayma R cinsinden düşülür.
// p: {dir, entry, stop, tp1 (null = yok), tgt, part, be}. from: emrin konduğu mum. Aynı mumda stop ve hedef görülürse stop sayılır (muhafazakâr).
function simTrade(k, p, from, maxWait, maxHold){
  const isL=p.dir==="long"; const n=k.length; const risk=Math.abs(p.entry-p.stop); if(!(risk>0)||!isFinite(p.entry)) return null;
  const costR=fee=>fee*p.entry/risk;
  let fill=-1; for(let j=from;j<Math.min(n,from+maxWait);j++){ const c=k[j]; if(isL? c.l<=p.entry : c.h>=p.entry){ fill=j; break; } if(isL? c.c<p.stop : c.c>p.stop) return {res:"nofill",why:"stopBeforeFill"}; }
  if(fill<0) return {res:"nofill"};
  let stop=p.stop, qty=1, r=-costR(SIM_FEE.maker), stage="open";
  const c0=k[fill]; if(isL? c0.l<=stop : c0.h>=stop){ r += -1 - costR(SIM_FEE.taker+SIM_FEE.slip); return {res:"lose",r,fill,end:fill,how:"stop"}; }
  for(let j=fill+1;j<n;j++){
    const c=k[j];
    const hitStop = isL? c.l<=stop : c.h>=stop;
    const hitTp1 = stage==="open" && p.tp1!=null && (isL? c.h>=p.tp1 : c.l<=p.tp1);
    const hitTgt = isL? c.h>=p.tgt : c.l<=p.tgt;
    if(hitStop && !(RS_CFG.optimistic && (hitTp1||hitTgt))){ const rr=(isL?(stop-p.entry):(p.entry-stop))/risk; r += qty*(rr-costR(SIM_FEE.taker+SIM_FEE.slip)); return {res:r>0?"win":"lose",r,fill,end:j,how:"stop"}; }
    if(hitTp1){ const part=p.part==null?0.5:p.part; const rr=(isL?(p.tp1-p.entry):(p.entry-p.tp1))/risk; r += part*(rr-costR(SIM_FEE.maker)); qty-=part; stage="tp1"; if(p.be) stop=p.entry;
      if(hitTgt && qty>0){ const rr2=(isL?(p.tgt-p.entry):(p.entry-p.tgt))/risk; r+=qty*(rr2-costR(SIM_FEE.maker)); return {res:"win",r,fill,end:j,how:"tgt"}; } continue; }
    if(hitTgt){ const rr2=(isL?(p.tgt-p.entry):(p.entry-p.tgt))/risk; r+=qty*(rr2-costR(SIM_FEE.maker)); return {res:"win",r,fill,end:j,how:"tgt"}; }
    if(j-fill>=maxHold){ const rr=(isL?(c.c-p.entry):(p.entry-c.c))/risk; r+=qty*(rr-costR(SIM_FEE.taker+SIM_FEE.slip)); return {res:r>0?"win":"lose",r,fill,end:j,how:"time"}; }
  }
  return {res:"open",r,fill,end:n-1};
}
// Kurulum 3 tespiti: AMD sonucu + rejim kapıları + oynaklık stopu + kademeli plan. btc: BTCUSDT 15 dk mumları (null ise BTC kapısı bilinmiyor).
function regimeSweep(k, k1d, med15, dir, maps, bias, btc, nowIdx, lock){
  const r=amdDetect(k,k1d,med15,dir,maps,bias,nowIdx,lock); const n=nowIdx??k.length; const isL=dir==="long";
  const res=Object.assign({},r,{model:"RS",gates:[],rsOk:false});
  if(r.mss==null || !isFinite(r.entry)) return res;
  const m=r.mss; const atr=atrAt(k,m+1); const atrRel=atr/k[m].c; res.atr=atr; res.atrRel=atrRel;
  if(!(atrRel>0)) return res;
  const g=[];
  const B=btcRegimeAt(btc,k[m].t,dir); res.btc=B;
  g.push({k:"BTC rejimi",ok:B?B.ok:null,txt:B?(B.ok?`BTC 4s ${pct(B.ch4*100)} · 24s ${pct(B.ch24*100)} · yapı ${B.bias==="up"?"yukarı":B.bias==="down"?"aşağı":"yatay"}${B.agree?" · aynı yönde":""}`:(B.dump?`BTC ${isL?"düşüyor":"yükseliyor"}: 4s ${pct(B.ch4*100)} · 24s ${pct(B.ch24*100)} · ${isL?"long":"short"} için zemin kaygan`:"BTC 15 dk yapısı karşı yöne bakıyor")):"BTC verisi yok"});
  const ch24=k[m].c/k[Math.max(0,m-RS_CFG.n24h)].c-1; res.ch24=ch24; const pumpOk = isL ? ch24<=RS_CFG.pump24 : ch24>=-RS_CFG.pump24;
  g.push({k:"Pompa/çöküş yok",ok:pumpOk,txt:`coin 24s ${pct(ch24*100)}${pumpOk?"":" · aşırı koşmuş: kovalama"}`});
  const ext=Math.abs(k[m].c-r.swPx)/atr; res.extAtr=ext; const freshOk=ext<=RS_CFG.extAtr;
  g.push({k:"Hareket taze",ok:freshOk,txt:`süpürme ucundan MSS kapanışına ${fx(ext,1)} ATR${freshOk?"":" · yolun çoğu gitmiş"}`});
  const entry=r.entry; const sdBase=Math.abs(entry-r.stop)/entry; const sd=Math.max(sdBase,RS_CFG.stopAtr*atrRel,RS_CFG.floorStop||0); res.sd=sd; res.entry=entry;
  res.stop = isL? entry*(1-sd) : entry*(1+sd); res.stopWidened = sd>sdBase*1.0001;
  const risk=sd*entry; res.tp1 = isL? entry+RS_CFG.tp1R*risk : entry-RS_CFG.tp1R*risk;
  let run=null, runName=null; for(const [p,name] of [[r.t1,r.t1name],[r.t2,r.t2name]]){ if(!isFinite(p)||!p) continue; const rr=Math.abs(p-entry)/risk; if(rr>=RS_CFG.runMinR){ run=p; runName=name; break; } }
  if(run==null){ run = isL? entry+3*risk : entry-3*risk; runName="3R"; }
  if(Math.abs(run-entry)/risk>RS_CFG.runMaxR){ run = isL? entry+RS_CFG.runMaxR*risk : entry-RS_CFG.runMaxR*risk; runName=RS_CFG.runMaxR+"R"; }
  res.run=run; res.runName=runName; res.rr1=RS_CFG.tp1R; res.rr2=Math.abs(run-entry)/risk; res.t1=res.tp1; res.t2=run; res.t1name="1,5R"; res.t2name=runName;
  const sdOk = sd<=RS_CFG.maxStopAtr*atrRel && sd<=liqDist(HC_MAX_LEV)*0.6; const sdWide = sd>=RS_CFG.minStop;
  g.push({k:"Stop yeterince geniş",ok:sdOk&&sdWide,txt:`stop ${fx(sd*100,2)}% = ${fx(sd/atrRel,1)} ATR${res.stopWidened?" · süpürme ucundan geniş tutuldu":""}${!sdWide?" · %"+fx(RS_CFG.minStop*100,1)+" altı: komisyon ve gürültü yer":""}${sdOk?"":" · çok geniş, 20x'e sığmıyor"}`});
  const ofOk=(r.ofScore||0)>=1; g.push({k:"Emir akışı",ok:ofOk,txt:ofOk?`${r.ofScore} teyit`:"süpürmede emilim ya da delta teyidi yok"});
  res.gates=g; res.rsOk=g.every(x=>x.ok===true);
  res.grade = !res.rsOk ? "C" : (B&&B.agree && (r.ofScore||0)>=2 && r.kz) ? "A" : "B";
  return res;
}
// Geriye dönük test: her süpürme için bir işlem; plan MSS tespit edildiği anda sabitlenir, dolum oradan aranır; simTrade ile sonuç (komisyon dahil R).
function regimeStats(k, k1d, med15, dir, btc){ let had=false; try{ had = typeof _poolCache!=="undefined"; }catch(e){} if(had) _poolCache=new Map(); try{ return regimeStats_(k,k1d,med15,dir,btc); } finally{ if(had) _poolCache=null; } }
function regimeStats_(k, k1d, med15, dir, btc){
  const out={A:{n:0,win:0,rr:0,sum:0},B:{n:0,win:0,rr:0,sum:0},C:{n:0,win:0,rr:0,sum:0},trades:[],sumR:0}; const empty={oi:new Map(),tk:new Map()}; const seen=new Set();
  let i=120;
  while(i<k.length-20){
    const bias=(()=>{ const c=k.slice(i-96,i).map(x=>x.c); const a=c.slice(-20).reduce((x,y)=>x+y,0)/20, b=c.slice(-60,-40).reduce((x,y)=>x+y,0)/20; return a>b*1.005?"up":a<b*0.995?"down":"flat"; })();
    const r=regimeSweep(k,k1d,med15,dir,empty,bias,btc,i);
    if(r.mss==null || r.stage==="failed" || r.stage==="expired" || seen.has(r.sw) || !(r.rr2>=RS_CFG.runMinR)){ i+=3; continue; }
    seen.add(r.sw);
    const sim=simTrade(k,{dir,entry:r.entry,stop:r.stop,tp1:r.tp1,tgt:r.run,part:RS_CFG.part,be:true}, i, RS_CFG.maxWait, RS_CFG.maxHold);
    if(!sim||sim.res==="nofill"||sim.res==="open"){ i+=3; continue; }
    const g=r.grade; out[g].n++; out[g].rr+=r.rr2; out[g].sum+=sim.r; if(sim.r>0) out[g].win++; out.sumR+=sim.r;
    out.trades.push({g,res:sim.r>0?"win":"lose",r:sim.r,rr:r.rr2,kz:r.kz||null,t:k[r.sw].t,how:sim.how});
    i=Math.max(i+3, sim.end+1);
  }
  return out;
}
function rsPlanOf(r,k){ if(!r||!r.rsOk||!isFinite(r.entry)||!(r.stage==="entry"||r.stage==="waitEntry")) return null; return {stage:r.stage,grade:r.grade,kz:r.kz||null,entry:r.entry,stop:r.stop,t1:r.tp1,t2:r.run,rr1:RS_CFG.tp1R,rr2:r.rr2,expires:(k&&r.mss!=null&&k[r.mss]?k[r.mss].t:Date.now())+(RS_CFG.maxWait+1)*9e5}; }
