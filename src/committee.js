/* ---------- Komite: altı sanal trader, her biri stratejinin bir tarafına bakar, ortak karar ----------
   Her ajan {v: −1..+1 destek, c: 0..1 güven, txt} verir. Puan = Σ ağırlık·v·c / Σ ağırlık. Risk ajanı veto edebilir.
   Bot: puan ≥ eşik ve "evet" diyen ajan sayısı ≥ asgari ve veto yok → market giriş; stop 1,2 ATR (en az %1,2), 1,5R'de yarısı + stop girişe, 3R koşucu, zaman stopu. */
const COM_W={"Trend":1,"Likidite":1.3,"Emir akışı":1,"Momentum":0.8,"Rejim (BTC)":1,"Risk":1};
function committee(A, dir, c24){
  const isL=dir==="long"; const sg=isL?1:-1; const ag=[]; let veto=null; c24=isFinite(c24)?c24:0;
  const put=(k,v,c,txt)=>ag.push({k,v:+clamp(v,-1,1).toFixed(2),c:+clamp(c,0,1).toFixed(2),txt});
  // 1 Trend: günlük puan + 1 saatlik yapı
  const tv=sg*(clamp(A.trendScore/6,-1,1)*0.6+clamp(A.st/3,-1,1)*0.4);
  put("Trend",tv,0.4+0.6*Math.abs(tv),`günlük ${A.trend==="up"?"yukarı":A.trend==="down"?"aşağı":"yatay"} (${A.trendScore>0?"+":""}${A.trendScore}/6) · 1 sa yapı ${A.st>0?"+":""}${A.st}`);
  // 2 Likidite: AMD dizisinin aşaması, havuz ağırlığı, Kurulum 3 kapıları
  const r=A.amd&&A.amd[dir]; const q=A.rs&&A.rs[dir];
  const stv={entry:1,waitEntry:0.7,afterTouch:0.4,waitMSS:0.35,done:0.15,expired:0.1,noSweep:-0.3,noBias:-0.2,stopped:-0.5,failed:-0.6};
  let lv=r?(stv[r.stage]!=null?stv[r.stage]:0):-0.3; if(r&&r.grade==="A") lv+=0.15; if(q&&q.rsOk) lv+=0.25; if(r&&r.pool&&r.pool.w>=3) lv+=0.1;
  put("Likidite",lv,r&&r.pool?0.9:0.5,r&&r.pool?`${r.pool.name} süpürüldü · aşama ${r.stage}${r.kz?" · "+r.kz:""}${q&&q.rsOk?" · K3 kapıları tamam":""}`:"süpürme yok");
  // 3 Emir akışı: süpürme teyitleri, taker oranı, OI durumu
  const of=r&&r.ofScore!=null?r.ofScore:0; const tk=isL?(A.tk30-1):(1-A.tk30);
  let fv=clamp(of/3,0,1)*0.6+clamp(tk*3,-1,1)*0.4;
  const oiGood=isL?(A.oiCase==="newlong"||A.oiCase==="shortcover"):(A.oiCase==="newshort"||A.oiCase==="longclose");
  const oiBad=isL?(A.oiCase==="newshort"||A.oiCase==="longclose"):(A.oiCase==="newlong"||A.oiCase==="shortcover");
  if(oiGood) fv+=0.2; if(oiBad) fv-=0.3; if(A.oiBloat) fv-=0.2;
  put("Emir akışı",fv,A.noTaker?0.3:0.8,`${of} süpürme teyidi · taker 30 dk ${fx(A.tk30,2)} · OI ${({newlong:"yeni long",shortcover:"short kapanışı",newshort:"yeni short",longclose:"long kapanışı",flat:"yatay"})[A.oiCase]||A.oiCase}`);
  // 4 Momentum: rüzgâr puanı, hacim, climax/kapitülasyon
  let mv=sg*clamp(A.score/40,-1,1); if(isL&&A.climax) mv-=0.5; if(!isL&&A.capit) mv-=0.5; if(A.volRel>=1.5) mv+=0.1*(mv>=0?1:-1);
  put("Momentum",mv,0.5+0.5*clamp(A.volRel/2,0,1),`rüzgâr ${A.score>0?"+":""}${A.score} · hacim ×${fx(A.volRel,1)}${A.climax&&isL?" · climax":""}${A.capit&&!isL?" · kapitülasyon":""}`);
  // 5 Rejim: BTC şu an
  const B=A.btcReg&&A.btcReg[dir]; let bv=0,bc=0,btxt="BTC verisi yok";
  if(B){ bv=B.agree?1:B.ok?0.5:B.dump?-1:-0.6; bc=0.9; btxt=`BTC 4 sa ${pct(B.ch4*100)} · 24 sa ${pct(B.ch24*100)} · yapı ${B.bias==="up"?"yukarı":B.bias==="down"?"aşağı":"yatay"}`; }
  put("Rejim (BTC)",bv,bc,btxt);
  // 6 Risk: stop 20x'e sığmalı, pompa kovalanmaz, fonlama aşırı olmamalı
  const kb=A.src&&A.src.k15L; const atrRel=kb&&kb.length>20?atrAt(kb,kb.length)/A.px:A.med15; const sd=Math.max(0.012,1.2*(atrRel||0.01)); const cap=liqDist(20)*0.6;
  const pump=isL?c24>15:c24<-15; const fundBad=isL?A.fund>0.001:A.fund<-0.001;
  if(sd>cap) veto=`oynaklık 20x stopuna sığmıyor (${fx(sd*100,1)}%)`; else if(pump) veto=`24 saatte ${pct(c24)}: kovalama`; else if(fundBad) veto=`fonlama aşırı (${fx(A.fund*100,3)}%)`;
  let rv=veto?-1:0.6; if(!veto){ if(isL&&A.distrib) rv-=0.4; if(!isL&&A.accum) rv-=0.4; if(isL?A.fund>0.0005:A.fund<-0.0005) rv-=0.2; if(isL&&A.climax) rv-=0.2; if(!isL&&A.capit) rv-=0.2; }
  put("Risk",rv,0.8,veto?"VETO: "+veto:`stop ${fx(sd*100,2)}% (1,2 ATR) · 20x'e sığar · fonlama ${fx(A.fund*100,4)}%${isL&&A.distrib?" · büyükler dağıtıyor":""}${!isL&&A.accum?" · büyükler topluyor":""}`);
  let num=0,den=0,yes=0; for(const a of ag){ const w=COM_W[a.k]||1; num+=w*a.v*a.c; den+=w; if(a.v>0.15) yes++; }
  const score=den?num/den:0; const px=A.px;
  const plan=veto?null:{entry:px,sd,stop:isL?px*(1-sd):px*(1+sd),t1:isL?px*(1+1.5*sd):px*(1-1.5*sd),t2:isL?px*(1+3*sd):px*(1-3*sd),rr1:1.5,rr2:3};
  return {dir,score:+score.toFixed(3),yes,n:ag.length,veto,agents:ag,plan};
}
