/* ---------- Masa: yedi kişilik, üç tur ----------
   Analistler: Ayşe (trend), Kerem (likidite / ICT), Mert (emir akışı). Araştırmacılar: Elif (makro · BTC rejimi, kalabalık), Selin (kantitatif · kanıt, maliyet).
   Traderlar: Baran (agresif, momentum), Can (baş trader · risk ve boy; veto hakkı).
   1. tur açılış: herkes verisine bakıp oy (v −1..+1) ve güven (c 0..1) verir. 2. tur tartışma: kurallı karşılıklı itirazlar oyları ve güvenleri değiştirir, plan kısalabilir.
   3. tur karar: Can veto eder ya da boyu ve planı yazar. Puan = Σ w·v·c / Σ w. Bot: puan ≥ eşik ve evet oyu ≥ asgari ve veto yok → market giriş. */
const DESK=[
  {id:"trend",name:"Ayşe",role:"Trend analisti",w:1},
  {id:"liq",name:"Kerem",role:"Likidite analisti",w:1.3},
  {id:"flow",name:"Mert",role:"Emir akışı analisti",w:1},
  {id:"macro",name:"Elif",role:"Makro araştırmacısı",w:1},
  {id:"quant",name:"Selin",role:"Kantitatif araştırmacı",w:0.8},
  {id:"mom",name:"Baran",role:"Trader · agresif",w:0.8},
  {id:"risk",name:"Can",role:"Baş trader · risk",w:1}];
const COM_W={}; for(const d of DESK) COM_W[d.name+" · "+d.role.split(" ")[0]]=d.w;
const COM_DEF={threshold:0.3,minYes:4};
function committee(A, dir, c24, opts){
  opts=Object.assign({},COM_DEF,opts||{}); const isL=dir==="long"; const sg=isL?1:-1; c24=isFinite(c24)?c24:0; const D=isL?"long":"short";
  const ag={}; const talk=[]; const say=(id,stage,text)=>{ const d=DESK.find(x=>x.id===id); talk.push({who:d.name,role:d.role,id,stage,text}); };
  const set=(id,v,c,txt)=>{ ag[id]={id,v:clamp(v,-1,1),c:clamp(c,0,1),txt}; };
  /* ---- 1. tur: açılış görüşleri ---- */
  const tv=sg*(clamp(A.trendScore/6,-1,1)*0.6+clamp(A.st/3,-1,1)*0.4);
  const trTxt=`günlük ${A.trend==="up"?"yukarı":A.trend==="down"?"aşağı":"yatay"} (${A.trendScore>0?"+":""}${A.trendScore}/6) · 1 sa yapı ${A.st>0?"+":""}${A.st}`;
  set("trend",tv,0.4+0.6*Math.abs(tv),trTxt);
  say("trend","açılış",tv>0.3?`Büyük resim ${D} tarafında: ${trTxt}. Yönle işlem yapıyoruz.`:tv<-0.3?`Günlük yön ${D} için karşı duruyor: ${trTxt}. Bu bir karşı-trend fikri olur.`:`Yön net değil: ${trTxt}. Trend bize yardım etmez, zarar da vermez.`);
  const r=A.amd&&A.amd[dir]; const q=A.rs&&A.rs[dir];
  const stv={entry:1,waitEntry:0.7,afterTouch:0.4,waitMSS:0.35,done:0.15,expired:0.1,noSweep:-0.3,noBias:-0.2,stopped:-0.5,failed:-0.6};
  let lv=r?(stv[r.stage]!=null?stv[r.stage]:0):-0.3; if(r&&r.grade==="A") lv+=0.15; if(q&&q.rsOk) lv+=0.25; if(r&&r.pool&&r.pool.w>=3) lv+=0.1;
  const stTR={entry:"fiyat OTE bölgesinde",waitEntry:"MSS oldu, bölgeye dönüş bekleniyor",afterTouch:"bölgeye dokundu ve çıktı",waitMSS:"süpürme var, yapı kırılımı yok",done:"hedefe gitmiş",expired:"süre dolmuş",noSweep:"süpürme yok",noBias:"yön yok",stopped:"stop yemiş",failed:"dizi bozulmuş"};
  set("liq",lv,r&&r.pool?0.9:0.5,r&&r.pool?`${r.pool.name} süpürüldü · ${stTR[r.stage]||r.stage}${r.kz?" · "+r.kz:""}${q&&q.rsOk?" · K3 kapıları tamam":""}`:"süpürme yok");
  say("liq","açılış",r&&r.pool?`${r.pool.name} süpürüldü, ${stTR[r.stage]||r.stage}${r.kz?", süpürme "+r.kz+" seansında":""}${q&&q.rsOk?". Kurulum 3 kapıları da tamam":""}${r.grade==="A"?". Kalite A":""}. ${lv>0.6?"Benim gözümde bu bir giriş.":lv>0.3?"Kurulum var ama fiyat henüz yerinde değil.":"Elimde giriş yok."}`:`Bu coinde ${D} için süpürülmüş havuz görmüyorum. Manipülasyon olmadan giriş istemem.`);
  const of=r&&r.ofScore!=null?r.ofScore:0; const tk=isL?(A.tk30-1):(1-A.tk30);
  let fv=clamp(of/3,0,1)*0.6+clamp(tk*3,-1,1)*0.4;
  const oiTR={newlong:"yeni long giriyor",shortcover:"shortlar kapanıyor",newshort:"yeni short giriyor",longclose:"longlar kapanıyor",flat:"OI yatay"};
  const oiGood=isL?(A.oiCase==="newlong"||A.oiCase==="shortcover"):(A.oiCase==="newshort"||A.oiCase==="longclose");
  const oiBad=isL?(A.oiCase==="newshort"||A.oiCase==="longclose"):(A.oiCase==="newlong"||A.oiCase==="shortcover");
  if(oiGood) fv+=0.2; if(oiBad) fv-=0.3; if(A.oiBloat) fv-=0.2;
  set("flow",fv,A.noTaker?0.3:0.8,`${of} süpürme teyidi · taker 30 dk ${fx(A.tk30,2)} · ${oiTR[A.oiCase]||A.oiCase}`);
  say("flow","açılış",`Süpürmede ${of} teyit${of>=2?" (emilim var)":of===1?" (zayıf)":" (emilim yok)"}, 30 dakikalık taker oranı ${fx(A.tk30,2)}, ${oiTR[A.oiCase]||A.oiCase}${A.oiBloat?", OI şişmiş":""}. ${fv>0.4?"Akış bizimle.":fv<0?"Akış karşı tarafta.":"Akış kararsız."}`);
  const B=A.btcReg&&A.btcReg[dir]; let bv=0,bc=0,btxt="BTC verisi yok";
  if(B){ bv=B.agree?1:B.ok?0.5:B.dump?-1:-0.6; bc=0.9; btxt=`BTC 4 sa ${pct(B.ch4*100)} · 24 sa ${pct(B.ch24*100)} · yapı ${B.bias==="up"?"yukarı":B.bias==="down"?"aşağı":"yatay"}`; }
  const crowd=isL?(A.fund>0.0005?"fonlama ısınmış":A.distrib?"büyükler dağıtıyor":""):(A.fund<-0.0005?"shortlar fonlamada eziliyor":A.accum?"büyükler topluyor":"");
  if(crowd){ bv-=0.2; }
  set("macro",bv,bc,btxt+(crowd?" · "+crowd:""));
  say("macro","açılış",B?`${btxt}. ${B.agree?"Piyasa geneli aynı yöne bakıyor, zemin sağlam.":B.ok?"BTC karşı değil ama destek de vermiyor.":B.dump?"BTC sert gidiyor; "+D+" için zemin kaygan.":"BTC yapısı karşı yöne bakıyor."}${crowd?" Ayrıca "+crowd+".":""}`:"BTC verisi elimde yok, rejim hakkında konuşamam.");
  const S=A.rsStats&&A.rsStats[dir]; const n=S?S.A.n+S.B.n:0; const sum=S?(S.A.sum||0)+(S.B.sum||0):0;
  let qv=0,qc=0.5,qtxt="bu coinde kanıt yok"; if(n>=3){ qv=sum>0?0.35:sum<0?-0.35:0; qc=0.6+Math.min(0.3,n/30); qtxt=`K3 bu coinde ${n} işlem, toplam ${sum>=0?"+":""}${fx(sum,1)}R`; } else if(n>0){ qtxt=`K3 bu coinde ${n} işlem (az örnek)`; }
  const kb=A.src&&A.src.k15L; const atrRel=kb&&kb.length>20?atrAt(kb,kb.length)/A.px:A.med15; let sd=Math.max(0.012,1.2*(atrRel||0.01)); const costR=(0.0005+0.0005+0.0003)/sd;
  set("quant",qv,qc,qtxt+` · stop ${fx(sd*100,2)}% → komisyon+kayma ≈ ${fx(costR,2)}R`);
  say("quant","açılış",`${n>=3?`Bu coinde Kurulum 3 geçmişi: ${n} işlem, toplam ${sum>=0?"+":""}${fx(sum,1)}R.`:"Bu coinde istatistik yok; 24 coinlik ortak test +0,13R/işlem, iki yarıda da artı."} Stop ${fx(sd*100,2)}% olursa komisyon ve kayma işlem başına ${fx(costR,2)}R yer${costR>0.1?"; bu pahalı":""}. Unutmayın, 100 işlemden önce yargı yok.`);
  let mv=sg*clamp(A.score/40,-1,1); if(isL&&A.climax) mv-=0.5; if(!isL&&A.capit) mv-=0.5; if(A.volRel>=1.5) mv+=0.1*(mv>=0?1:-1);
  set("mom",mv,0.5+0.5*clamp(A.volRel/2,0,1),`rüzgâr ${A.score>0?"+":""}${A.score} · hacim ×${fx(A.volRel,1)}${A.climax&&isL?" · climax":""}${A.capit&&!isL?" · kapitülasyon":""}`);
  say("mom","açılış",`Rüzgâr puanı ${A.score>0?"+":""}${A.score}, hacim ×${fx(A.volRel,1)}. ${mv>0.4?"Hareket var, beklemeyelim.":mv>0?"Momentum ılık, ben yine de varım.":"Momentum karşı tarafta, kovalamam."}${A.climax&&isL?" Climax mumu gördüm, tepede alıcı olmak istemem.":""}${A.capit&&!isL?" Kapitülasyon mumu var, dipte satmam.":""}`);
  const cap=liqDist(20)*0.6; const pump=isL?c24>15:c24<-15; const fundBad=isL?A.fund>0.001:A.fund<-0.001;
  let veto=null; if(sd>cap) veto=`oynaklık 20x stopuna sığmıyor (${fx(sd*100,1)}%)`; else if(pump) veto=`24 saatte ${pct(c24)}: kovalama`; else if(fundBad) veto=`fonlama aşırı (${fx(A.fund*100,3)}%)`;
  let rv=veto?-1:0.6; if(!veto){ if(isL&&A.distrib) rv-=0.4; if(!isL&&A.accum) rv-=0.4; if(isL?A.fund>0.0005:A.fund<-0.0005) rv-=0.2; if(isL&&A.climax) rv-=0.2; if(!isL&&A.capit) rv-=0.2; }
  set("risk",rv,0.8,veto?"VETO: "+veto:`stop ${fx(sd*100,2)}% · 20x'e sığar · fonlama ${fx(A.fund*100,4)}%`);
  say("risk","açılış",veto?`Daha dinlemeden söyleyeyim: ${veto}. Bu masadan ${D} çıkmaz.`:`Stop ${fx(sd*100,2)}% ile 20x'e sığıyor, likidasyon uzak. Boyu risk yüzdesinden hesaplarım. Önce sizi dinleyeyim.`);
  /* ---- 2. tur: tartışma (oyları gerçekten değiştirir) ---- */
  let runR=3; const chg=[];
  if(!veto){
    if(ag.macro.v<-0.3&&ag.mom.v>0.3){ say("macro","tartışma",`Baran, BTC ${isL?"düşerken":"yükselirken"} momentum kovalamak son 15 günde en çok kaybettiren şey. Oyunu kıs.`); if(A.volRel>=1.8){ ag.mom.v-=0.1; say("mom","tartışma",`Hacim ×${fx(A.volRel,1)}, bu coin BTC'yi dinlemiyor. Biraz kısıyorum ama tutuyorum.`); } else { ag.mom.v-=0.3; say("mom","tartışma","Haklısın, hacim de sıradan. Oyumu düşürüyorum."); } chg.push("mom"); }
    if(ag.trend.v<-0.3&&ag.liq.v>0.5){ say("trend","tartışma","Kerem, süpürme güzel ama günlük yön karşı. Karşı-trend işlemde hedef kısa tutulur."); ag.liq.c-=0.2; runR=2; say("liq","tartışma","Kabul: süpürme + MSS karşı trendde de çalışır ama koşucuyu 2R'de keselim, güvenimi düşürüyorum."); chg.push("liq"); }
    else if(ag.trend.v>0.3&&ag.liq.v>0.5){ say("liq","tartışma","Trend de bizimle; süpürme trend yönünde olunca en iyi örnekler bunlar."); ag.liq.c=Math.min(1,ag.liq.c+0.1); chg.push("liq"); }
    if(ag.liq.v>0.5&&ag.flow.v<0){ say("flow","tartışma","Kerem, süpürmede emilim yok: CVD fiyatla birlikte dip yaptı. Satış gerçek olabilir, fiyat yeniden süpürebilir."); ag.liq.v-=0.2; say("liq","tartışma","Teyit zayıfsa ikinci süpürme riski var, oyumu bir kademe düşürüyorum."); chg.push("liq"); }
    if(n>=3&&sum<0){ say("quant","tartışma",`Bu coinde K3 geçmişi ${fx(sum,1)}R, yani eksi. Herkesin güvenini %15 kısıyorum; kanıtsız yere kalite A demeyelim.`); for(const k in ag) if(k!=="risk") ag[k].c*=0.85; chg.push("all"); }
    if(sd<0.015){ say("quant","tartışma",`Stop ${fx(sd*100,2)}% dar; testte %1,5 altı stoplar eksiydi. Stopu %1,5 tabanına çekelim, boy ona göre küçülür.`); sd=0.015; say("risk","tartışma","Tamam, stop %1,5; pozisyon boyu buna göre."); }
  }
  /* ---- puan ---- */
  const agents=DESK.map(d=>{ const a=ag[d.id]; return {id:d.id,k:d.name+" · "+d.role.split(" ")[0],name:d.name,role:d.role,w:d.w,v:+a.v.toFixed(2),c:+a.c.toFixed(2),txt:a.txt}; });
  let num=0,den=0,yes=0,no=0; for(const a of agents){ num+=a.w*a.v*a.c; den+=a.w; if(a.v>0.15) yes++; if(a.v<-0.15) no++; }
  let score=den?num/den:0;
  if(!veto&&score>=opts.threshold-0.06&&score<opts.threshold&&yes>=opts.minYes&&ag.mom.v>0){ say("mom","tartışma",`Eşiğin dibindeyiz (${fx(score,2)}), ${yes} evet var. Ben küçük boyla girerim; fırsatı kaçırmayalım.`); const m=agents.find(a=>a.id==="mom"); m.v=+Math.min(1,m.v+0.15).toFixed(2); num=0; for(const a of agents) num+=a.w*a.v*a.c; score=num/den; }
  score=+score.toFixed(3);
  /* ---- 3. tur: karar ---- */
  const px=A.px; const plan=veto?null:{entry:px,sd,stop:isL?px*(1-sd):px*(1+sd),t1:isL?px*(1+1.5*sd):px*(1-1.5*sd),t2:isL?px*(1+runR*sd):px*(1-runR*sd),rr1:1.5,rr2:runR};
  const go=!veto&&score>=opts.threshold&&yes>=opts.minYes;
  const decision=veto?"veto":go?"giriş":score>=opts.threshold?"oy eksik":"bekle";
  say("risk","karar",veto?`Karar: veto. ${veto}.`:go?`Karar: ${D} giriş. Puan ${fx(score,2)}, ${yes}/7 evet. Market ${fmtP(px)}, stop ${fmtP(plan.stop)} (${fx(sd*100,2)}%), 1,5R'de yarısı ${fmtP(plan.t1)} ve stop girişe, kalan ${runR}R ${fmtP(plan.t2)}. Zaman stopu 8 saat. Boy risk yüzdesinden, 20x.`:score>=opts.threshold?`Puan ${fx(score,2)} eşiği geçiyor ama ${yes} evet var, ${opts.minYes} gerekli. Bekliyoruz.`:`Puan ${fx(score,2)}, eşik ${fx(opts.threshold,2)}. Masa ikna olmadı, bekliyoruz.`);
  return {dir,score,yes,no,n:agents.length,veto,agents,talk,plan,decision,changed:chg};
}
/* ---------- Açık pozisyon yorumu: masa, elde tutulan pozisyonu kendi yönünde yeniden değerlendirir (tut / azalt / çık / stop sık) ---------- */
function positionReview(A, pos, orders, c24){
  const dir=pos.dir; const isL=dir==="long"; c24=isFinite(c24)?c24:0;
  const c=committee(A,dir,c24); const opp=committee(A,isL?"short":"long",c24);
  const kb=A.src&&A.src.k15L; const atr=kb&&kb.length>20?atrAt(kb,kb.length):A.med15*A.px; const atrRel=atr/A.px;
  const px=A.px; const pnlPct=(isL?(px/pos.entry-1):(1-px/pos.entry))*100; const liqAtr=pos.liq>0?Math.abs(px-pos.liq)/atr:NaN;
  const so=(orders||[]).filter(o=>o.sym===pos.sym&&(o.ro||o.cp)); const hasStop=so.some(o=>/STOP/.test(o.type)); const hasTp=so.some(o=>/TAKE_PROFIT/.test(o.type)||(o.px>0&&!/STOP/.test(o.type)));
  const sd=Math.max(0.012,1.2*atrRel); const r=A.amd&&A.amd[dir];
  let stopLv=isL?px*(1-sd):px*(1+sd), stopWhy="1,2 ATR arkası";
  if(r&&isFinite(r.stop)&&(isL?r.stop<px:r.stop>px)){ const d=Math.abs(px-r.stop)/atr; if(d>=0.6&&d<=3){ stopLv=r.stop; stopWhy="süpürme ucunun arkası"; } }
  const sup=isL?(A.S&&A.S[0]):(A.R&&A.R[0]); if(sup&&Math.abs(px-sup)/atr<=3&&Math.abs(px-sup)/atr>=0.6){ const lv=isL?sup*(1-0.0025):sup*(1+0.0025); if(isL?lv>stopLv:lv<stopLv){ stopLv=lv; stopWhy="en yakın "+(isL?"desteğin altı":"direncin üstü"); } }
  const risk=Math.abs(pos.entry-stopLv); const tp1=isL?pos.entry+1.5*risk:pos.entry-1.5*risk, tp2=isL?pos.entry+3*risk:pos.entry-3*risk;
  let verdict="tut"; if(opp.decision==="giriş"&&c.score<0) verdict="çık"; else if(opp.decision==="giriş"||c.score<-0.15) verdict="azalt"; else if(c.score>=COM_DEF.threshold) verdict="tut"; else verdict="tut, stop sık";
  if(isFinite(liqAtr)&&liqAtr<1.5&&verdict==="tut") verdict="tut, stop sık";
  const lines=[]; const add=(id,text)=>{ const d=DESK.find(x=>x.id===id); lines.push({who:d.name,role:d.role,id,text}); };
  const st=a=>a.v>0.15?"destekliyor":a.v<-0.15?"karşı":"kararsız"; const g=id=>c.agents.find(a=>a.id===id);
  add("trend",`${st(g("trend"))}: ${g("trend").txt}.`);
  add("liq",`${st(g("liq"))}: ${g("liq").txt}. ${r&&r.pool?`Stop için doğal yer ${stopWhy} (${fmtP(stopLv)}).`:`Elde süpürme yok; stop ${stopWhy} (${fmtP(stopLv)}).`}`);
  add("flow",`${st(g("flow"))}: ${g("flow").txt}.`);
  add("macro",`${st(g("macro"))}: ${g("macro").txt}.${opp.decision==="giriş"?" Masa ters yöne giriş diyor; pozisyon rüzgâra karşı.":""}`);
  const be=isL?pos.entry*(1+0.0013):pos.entry*(1-0.0013);
  add("quant",`Başabaş (komisyon dahil) ${fmtP(be)}. 1,5R ${fmtP(tp1)}, 3R ${fmtP(tp2)} (stop ${fmtP(stopLv)} alınırsa). ${g("quant").txt}.`);
  add("mom",`${st(g("mom"))}: ${g("mom").txt}.${pnlPct>0&&g("mom").v>0.3?" Hareket devam ediyor, kârı erken kesme.":""}`);
  const canParts=[];
  if(isFinite(liqAtr)) canParts.push(liqAtr<1.5?`likidasyon ${fx(liqAtr,1)} ATR uzakta, tehlikeli: boyu küçült, teminat ekleme`:liqAtr<3?`likidasyon ${fx(liqAtr,1)} ATR uzakta, tek dalga yeter`:`likidasyon ${fx(liqAtr,1)} ATR uzakta`);
  canParts.push(hasStop?"stop emri var":`stop emri YOK; ${fmtP(stopLv)} (${stopWhy}) koy`);
  if(pnlPct>=1.5*risk/pos.entry*100&&!hasTp) canParts.push("1,5R geçildi: yarısını al, stopu girişe çek");
  else if(pnlPct>0&&!hasTp) canParts.push(`hedef ${fmtP(tp1)} için emir yok`);
  if(verdict==="çık") canParts.push("masa karşı yöne dönmüş: çık"); else if(verdict==="azalt") canParts.push("masa ikna değil: boyu azalt"); else canParts.push("tut");
  add("risk",`Karar: ${verdict.toUpperCase()}. ${canParts.join(" · ")}.`);
  return {verdict,score:c.score,oppScore:opp.score,oppDecision:opp.decision,agents:c.agents,lines,stopLv,stopWhy,tp1,tp2,be,liqAtr,pnlPct,hasStop,hasTp,atrRel,t:Date.now()};
}
