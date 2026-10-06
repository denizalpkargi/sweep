/* ---------- Masa: yedi kişilik, üç tur ----------
   Analistler: Emre (trend), Kerem (likidite / ICT), Mert (emir akışı). Araştırmacılar: Arda (makro · BTC rejimi, kalabalık), Onur (kantitatif · kanıt, maliyet).
   Araştırma ekibi (research.js): Tolga (liderlerin coin uzlaşısı), Burak (liderlerin geçmişinden çıkan aday stratejiler ve kaçınılacak kalıplar).
   Traderlar: Baran (agresif, momentum), Can (baş trader · risk ve boy; veto hakkı).
   1. tur açılış: herkes verisine bakıp oy (v −1..+1) ve güven (c 0..1) verir. 2. tur tartışma: kurallı karşılıklı itirazlar oyları ve güvenleri değiştirir, plan kısalabilir.
   3. tur karar: Can veto eder ya da boyu ve planı yazar. Puan = Σ w·v·c / Σ w. Bot: puan ≥ eşik ve evet oyu ≥ asgari ve veto yok → market giriş. */
const DESK=[
  {id:"trend",name:"Emre",role:"Trend analisti",w:1},
  {id:"liq",name:"Kerem",role:"Likidite analisti",w:1.3},
  {id:"flow",name:"Mert",role:"Emir akışı analisti",w:1},
  {id:"macro",name:"Arda",role:"Makro araştırmacısı",w:1},
  {id:"quant",name:"Onur",role:"Kantitatif araştırmacı",w:0.8},
  {id:"mom",name:"Baran",role:"Trader · agresif",w:0.8},
  {id:"copy",name:"Tolga",role:"Kopya trader araştırmacısı",w:1},
  {id:"lab",name:"Burak",role:"Strateji araştırmacısı",w:0.9},
  {id:"audit",name:"Murat",role:"Denetçi · hatalardan ders",w:1},
  {id:"risk",name:"Can",role:"Baş trader · risk",w:1}];
const COM_W={}; for(const d of DESK) COM_W[d.name+" · "+d.role.split(" ")[0]]=d.w;
const COM_DEF={threshold:0.3,minYes:4};
// kâğıt bot varsayılanları (ui.js ve ekransız çalıştırıcı headless/ ortak kullanır)
const BOT_CFG_DEF={mode:"komite",risk:0.03,lev:20,maxLev:20,maxPos:3,maxOpens:12,maxLosses:6,threshold:0.3,minYes:4,holdH:8,cooldownMin:90,strict:false,useBR:true,useRS:true,feeMaker:0.0002,feeTaker:0.0005,slip:0.0003};
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
  const sym=opts.sym||null; const LD=(typeof ld!=="undefined")?ld:null; const cs=sym&&LD&&LD.sym?LD.sym[sym]:null;
  let cv=0,cc=0.2,ctxt=LD&&LD.at?"liderler bu coinde işlem yapmadı":"lider verisi yok (masaüstü uygulamasında saatte bir çekilir)";
  if(cs){ const me=cs[dir]||{n:0,w:0,leaders:[]}, ot=cs[isL?"short":"long"]||{n:0,w:0,leaders:[]}; const tot=me.w+ot.w; if(tot>0){ cv=(me.w-ot.w)/tot; cc=Math.min(0.9,0.4+0.1*(me.n+ot.n)); ctxt=`${me.n} lider ${D} (${(me.leaders||[]).slice(0,3).join(", ")||"—"}), ${ot.n} lider ters yönde`; } }
  set("copy",cv,cc,ctxt);
  say("copy","açılış",cs&&(cs.long.n||cs.short.n)?`En iyi liderlerden ${ctxt}. ${cv>0.3?"Büyük paralar bizimle.":cv<-0.3?"Büyük paralar ters tarafta; dikkat.":"Liderler bölünmüş."}`:(LD&&LD.at?`Liderler ${sym?sym.replace("USDT",""):"bu coin"} ile ilgilenmiyor; ne destek ne engel.`:"Lider verisi henüz yok, bu turda çekimserim."));
  const LM=(typeof labMatch==="function")?labMatch(A,dir,sym):null; const best=LM&&LM.hits.length?[...LM.hits].sort((a,b)=>b.sw*b.t-a.sw*a.t)[0]:null; const bad=LM&&LM.avoid.length?LM.avoid[0]:null;
  let lbv=0,lbc=0.2,lbtxt=(typeof lab!=="undefined"&&lab.base)?"liderlerin kalıplarından biri eşleşmiyor":"araştırma henüz aday çıkarmadı";
  if(best){ lbv=clamp((0.3+0.4*Math.min(1,best.t/4))*best.sw,0,0.9); lbc=0.3+0.5*Math.min(1,best.n/80); lbtxt=`aday eşleşti: ${best.name} (${best.n} işlem, ${best.leaders} lider, ort ${fx(best.mean,2)} ATR, ${best.status})`; }
  if(bad){ lbv-=0.5; lbc=Math.max(lbc,0.3+0.5*Math.min(1,bad.n/80)); lbtxt=(best?lbtxt+" · ":"")+`kaçınılacak kalıp: ${bad.name} (ort ${fx(bad.mean,2)} ATR)`; }
  set("lab",lbv,lbc,lbtxt+(!best&&!bad?" · çekimser, puana girmez":""));
  say("lab","açılış",best?`Liderlerin geçmişinde bu durum var: ${best.name}. ${best.n} işlem, ${best.leaders} farklı lider, kazanma %${Math.round(best.wr*100)}, ortalama ${fx(best.mean,2)} ATR; iki yarıda da artı. Medyan tutuş ${fx(best.hold,1)} saat. Durum: ${best.status}${best.status==="zayıf"?", bu yüzden oyum yok":""}.${bad?` Ama kaçınılacak bir kalıp da eşleşiyor: ${bad.name}.`:""}`:bad?`Liderler bu durumda kaybediyor: ${bad.name}, ${bad.n} işlemde ortalama ${fx(bad.mean,2)} ATR. Karşıyım.`:LM?"Şu anki tablo liderlerin kanıtlı kalıplarından hiçbirine uymuyor; ne destek ne engel.":(typeof lab!=="undefined"&&lab.base?"Bu coin için 1 saatlik veri yetmiyor, çekimserim.":"Araştırma ekibi henüz yeterli lider işlemi toplamadı; çekimserim."));
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
  if(typeof AUD!=="undefined"&&AUD&&AUD.summary){ const S=AUD.summary; say("audit","açılış",`Kayıtta ${S.n} kapanmış işlem: kazanma %${Math.round(S.wr*100)}, ortalama ${S.avg>=0?"+":""}${fx(S.avg,2)}R.${AUD.lessons.length?" Çıkardığımız dersler: "+AUD.lessons.map(l=>l.t.toLowerCase()).join(", ")+".":" Henüz kesin bir ders yok."} Tartışmada kurulumu bunlarla karşılaştıracağım.`); }
  set("risk",rv,0.8,veto?"VETO: "+veto:`stop ${fx(sd*100,2)}% · 20x'e sığar · fonlama ${fx(A.fund*100,4)}%`);
  say("risk","açılış",veto?`Daha dinlemeden söyleyeyim: ${veto}. Bu masadan ${D} çıkmaz.`:`Stop ${fx(sd*100,2)}% ile 20x'e sığıyor, likidasyon uzak. Boyu risk yüzdesinden hesaplarım. Önce sizi dinleyeyim.`);
  /* ---- 2. tur: tartışma (oyları gerçekten değiştirir) ---- */
  let runR=3; const chg=[];
  if(!veto){
    if(ag.copy.v<-0.4&&ag.liq.v>0.5){ say("copy","tartışma","Kerem, liderlerin çoğu ters yönde; süpürme ikinci kez de gelebilir, güvenini biraz kıs."); ag.liq.c=Math.max(0,ag.liq.c-0.1); chg.push("liq"); }
    if(ag.copy.v>0.5&&ag.mom.v>0){ say("mom","tartışma","Liderler de bizim tarafta; boyu tam tutarım."); ag.mom.v=Math.min(1,ag.mom.v+0.1); chg.push("mom"); }
    if(ag.macro.v<-0.3&&ag.mom.v>0.3){ say("macro","tartışma",`Baran, BTC ${isL?"düşerken":"yükselirken"} momentum kovalamak son 15 günde en çok kaybettiren şey. Oyunu kıs.`); if(A.volRel>=1.8){ ag.mom.v-=0.1; say("mom","tartışma",`Hacim ×${fx(A.volRel,1)}, bu coin BTC'yi dinlemiyor. Biraz kısıyorum ama tutuyorum.`); } else { ag.mom.v-=0.3; say("mom","tartışma","Haklısın, hacim de sıradan. Oyumu düşürüyorum."); } chg.push("mom"); }
    if(ag.trend.v<-0.3&&ag.liq.v>0.5){ say("trend","tartışma","Kerem, süpürme güzel ama günlük yön karşı. Karşı-trend işlemde hedef kısa tutulur."); ag.liq.c-=0.2; runR=2; say("liq","tartışma","Kabul: süpürme + MSS karşı trendde de çalışır ama koşucuyu 2R'de keselim, güvenimi düşürüyorum."); chg.push("liq"); }
    else if(ag.trend.v>0.3&&ag.liq.v>0.5){ say("liq","tartışma","Trend de bizimle; süpürme trend yönünde olunca en iyi örnekler bunlar."); ag.liq.c=Math.min(1,ag.liq.c+0.1); chg.push("liq"); }
    if(ag.liq.v>0.5&&ag.flow.v<0){ say("flow","tartışma","Kerem, süpürmede emilim yok: CVD fiyatla birlikte dip yaptı. Satış gerçek olabilir, fiyat yeniden süpürebilir."); ag.liq.v-=0.2; say("liq","tartışma","Teyit zayıfsa ikinci süpürme riski var, oyumu bir kademe düşürüyorum."); chg.push("liq"); }
    if(bad&&LM.f.yer==="kova"&&ag.mom.v>0.3){ say("lab","tartışma",`Baran, liderler bu konumda kovaladığında ortalama ${fx(bad.mean,2)} ATR kaybediyor. Fiyat 24 saatlik aralığın ucunda.`); ag.mom.v-=0.25; say("mom","tartışma","Veri bunu söylüyorsa oyumu kısıyorum."); chg.push("mom"); }
    if(best&&LM.f.sw==="var"&&ag.liq.v>0.5){ say("lab","tartışma","Kerem, liderlerin kazanan işlemleri de süpürmeden sonra geliyor; senin okumanı destekliyor."); ag.liq.c=Math.min(1,ag.liq.c+0.1); chg.push("liq"); }
    if(best&&best.conds.some(c=>c[0]==="btc")&&ag.macro.v>0){ say("macro","tartışma","Burak'ın adayı BTC yönüne bağlı; BTC tarafı da bizimle, güvenimi artırıyorum."); ag.macro.c=Math.min(1,ag.macro.c+0.1); chg.push("macro"); }
    if(n>=3&&sum<0){ say("quant","tartışma",`Bu coinde K3 geçmişi ${fx(sum,1)}R, yani eksi. Herkesin güvenini %15 kısıyorum; kanıtsız yere kalite A demeyelim.`); for(const k in ag) if(k!=="risk") ag[k].c*=0.85; chg.push("all"); }
    const sdMin=AUD&&AUD.sdMin>0.015?AUD.sdMin:0.015;
    if(sd<sdMin){ if(sdMin>0.015) say("audit","tartışma",`Kayıplarımızın çoğu gürültü stopu: fiyat lehimize gitmeden 45 dakikada stop oluyoruz. Stop tabanı %${fx(sdMin*100,1)}, boy ona göre küçülsün.`); else say("quant","tartışma",`Stop ${fx(sd*100,2)}% dar; testte %1,5 altı stoplar eksiydi. Stopu %1,5 tabanına çekelim, boy ona göre küçülür.`); sd=sdMin; say("risk","tartışma",`Tamam, stop %${fx(sdMin*100,1)}; pozisyon boyu buna göre.`); }
  }
  /* ---- denetçi: kurulumu kapanmış işlemlerden çıkan derslerle karşılaştırır ---- */
  const au=audVoteFor(ag); ag.audit={id:"audit",v:au.v,c:au.c,txt:au.txt};
  if(!veto&&au.w){ if(au.hits.length){ say("audit","tartışma",`Bu kurulum daha önce kaybettiğimiz kalıba benziyor: ${au.txt}. ${au.veto?"Bu ders kesinleşti, veto istiyorum.":"Oyum karşı."}`); if(au.veto){ veto=`denetçi: ${AUD_TAGS[au.veto].t.toLowerCase()} kalıbı ${AUD.tags[au.veto].n} işlemde ort. ${fx(AUD.tags[au.veto].avg,2)}R`; say("risk","tartışma","Murat'ın kaydı açık, aynı hatayı tekrar etmiyoruz."); } }
    else say("audit","tartışma",`Kayıtlı hatalardan hiçbirine benzemiyor.${AUD.clean?` Temiz kurulumlarımız ${AUD.clean.n} işlemde ort. ${fx(AUD.clean.avg,2)}R.`:""}`); }
  /* ---- puan ---- */
  // Burak'ın elinde eşleşen aday ya da kaçınılacak kalıp yoksa çekimserdir: ağırlığı 0, puanı sulandırmaz
  const labIdle=!best&&!bad;
    const agents=DESK.map(d=>{ const a=ag[d.id]; const m=AUD&&AUD.mult[d.id]?AUD.mult[d.id].m:1; return {id:d.id,k:d.name+" · "+d.role.split(" ")[0],name:d.name,role:d.role,w:d.id==="audit"?au.w:d.id==="lab"&&labIdle?0:+(d.w*m).toFixed(2),v:+a.v.toFixed(2),c:+a.c.toFixed(2),txt:a.txt}; });
  let num=0,den=0,yes=0,no=0; for(const a of agents){ num+=a.w*a.v*a.c; den+=a.w; if(a.v>0.15) yes++; if(a.v<-0.15) no++; }
  let score=den?num/den:0;
  if(!veto&&score>=opts.threshold-0.06&&score<opts.threshold&&yes>=opts.minYes&&ag.mom.v>0){ say("mom","tartışma",`Eşiğin dibindeyiz (${fx(score,2)}), ${yes} evet var. Ben küçük boyla girerim; fırsatı kaçırmayalım.`); const m=agents.find(a=>a.id==="mom"); m.v=+Math.min(1,m.v+0.15).toFixed(2); num=0; for(const a of agents) num+=a.w*a.v*a.c; score=num/den; }
  score=+score.toFixed(3);
  /* ---- 3. tur: karar ---- */
  const px=A.px; const holdH=best&&isFinite(best.hold)&&best.sw>0?clamp(Math.round(best.hold*1.5),2,12):null;
  const plan=veto?null:{holdH,entry:px,sd,stop:isL?px*(1-sd):px*(1+sd),t1:isL?px*(1+1.5*sd):px*(1-1.5*sd),t2:isL?px*(1+runR*sd):px*(1-runR*sd),rr1:1.5,rr2:runR};
  const go=!veto&&score>=opts.threshold&&yes>=opts.minYes;
  const decision=veto?"veto":go?"giriş":score>=opts.threshold?"oy eksik":"bekle";
  say("risk","karar",veto?`Karar: veto. ${veto}.`:go?`Karar: ${D} giriş. Puan ${fx(score,2)}, ${yes}/${DESK.length} evet. Market ${fmtP(px)}, stop ${fmtP(plan.stop)} (${fx(sd*100,2)}%), 1,5R'de yarısı ${fmtP(plan.t1)} ve stop girişe, kalan ${runR}R ${fmtP(plan.t2)}. Zaman stopu ${holdH?holdH+" saat (Burak: liderlerin medyan tutuşu × 1,5)":"8 saat"}. Boy risk yüzdesinden, 20x.`:score>=opts.threshold?`Puan ${fx(score,2)} eşiği geçiyor ama ${yes} evet var, ${opts.minYes} gerekli. Bekliyoruz.`:`Puan ${fx(score,2)}, eşik ${fx(opts.threshold,2)}. Masa ikna olmadı, bekliyoruz.`);
  // ham girdiler: karar günlüğünde (headless JSONL) sonradan analiz için
  const r4=v=>isFinite(v)?+(+v).toFixed(4):null;
  const feat={px:A.px,c24:r4(c24),trend:A.trend,trendScore:A.trendScore,st:A.st,stage:r?r.stage:null,grade:r?r.grade:null,kz:r&&r.kz||null,pool:r&&r.pool?r.pool.name:null,poolW:r&&r.pool?r.pool.w:null,rsOk:!!(q&&q.rsOk),rsStage:q?q.stage:null,
    of,tk30:r4(A.tk30),oiCase:A.oiCase||null,oiBloat:!!A.oiBloat,noTaker:!!A.noTaker,btc:B?{ch4:r4(B.ch4),ch24:r4(B.ch24),bias:B.bias,agree:!!B.agree,ok:!!B.ok,dump:!!B.dump}:null,fund:r4(A.fund),crowd:crowd||null,
    ldV:r4(cv),ldN:cs?((cs.long&&cs.long.n)||0)+((cs.short&&cs.short.n)||0):0,k3n:n,k3sum:r4(sum),atrRel:r4(atrRel),sd:r4(sd),costR:r4(costR),wind:A.score,volRel:r4(A.volRel),climax:!!A.climax,capit:!!A.capit,distrib:!!A.distrib,accum:!!A.accum,runR,lab:best?best.key:null,labAvoid:bad?bad.key:null};
  return {dir,score,yes,no,n:agents.length,veto,agents,talk,plan,decision,changed:chg,feat};
}
/* ---------- Açık pozisyon yorumu: masa, elde tutulan pozisyonu kendi yönünde yeniden değerlendirir (tut / azalt / çık / stop sık) ---------- */
function positionReview(A, pos, orders, c24, opts){
  const dir=pos.dir; const isL=dir==="long"; c24=isFinite(c24)?c24:0;
  const c=committee(A,dir,c24,opts); const opp=committee(A,isL?"short":"long",c24,opts);
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
  add("lab",`${st(g("lab"))}: ${g("lab").txt}.`);
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
/* ---------- Masaya sor: kullanıcının elle girdiği plan ya da açık işlem (hesap bağlamadan) ----------
   t = {sym, dir, entry, liq?, tp?, sl?, margin:"cross"|"isolated", lev, open:bool, size? (teminat $), bal? (bakiye $)}.
   Plan: masa committee() ile o yönde oylar → GİR / BEKLE / GİRME. Açık: positionReview() → DEVAM ET / AZALT / ÇIK.
   Üstüne risk notları: R oranı, komisyon R'si, stop ATR'si, likidasyon uzaklığı, stop likidasyondan önce mi, botun kurallarıyla kıyas. */
function askDesk(A, t, c24, opts){
  const dir=t.dir==="short"?"short":"long"; const isL=dir==="long"; const sg=isL?1:-1; const px=A.px; c24=isFinite(c24)?c24:0;
  const entry=+t.entry>0?+t.entry:px; const lev=clamp(Math.round(+t.lev||BOT_CFG_DEF.lev),1,125); const iso=t.margin==="isolated";
  const sl=+t.sl>0?+t.sl:NaN, tp=+t.tp>0?+t.tp:NaN; const size=+t.size>0?+t.size:NaN, bal=+t.bal>0?+t.bal:NaN;
  const kb=A.src&&A.src.k15L&&A.src.k15L.length>20?A.src.k15L:(A.src&&A.src.k15); const atr=kb&&kb.length>20?atrAt(kb,kb.length):(A.med15||0.01)*px;
  const liqGiven=+t.liq>0; const liq=liqGiven?+t.liq:(isL?entry*(1-liqDist(lev)):entry*(1+liqDist(lev)));
  const pc=v=>"%"+fx(v*100,2); const red=[], warn=[], ok=[]; const fee=BOT_CFG_DEF.feeTaker*2+BOT_CFG_DEF.slip;
  if(isFinite(sl)&&(isL?sl>=entry:sl<=entry)){ red.push(`Stop girişin yanlış tarafında (${isL?"long için girişin altında":"short için girişin üstünde"} olmalı).`); }
  if(isFinite(tp)&&(isL?tp<=entry:tp>=entry)){ red.push(`Hedef girişin yanlış tarafında (${isL?"long için girişin üstünde":"short için girişin altında"} olmalı).`); }
  const slOk=isFinite(sl)&&!(isL?sl>=entry:sl<=entry), tpOk=isFinite(tp)&&!(isL?tp<=entry:tp>=entry);
  const stopPct=slOk?Math.abs(entry-sl)/entry:NaN, slAtr=slOk?Math.abs(entry-sl)/atr:NaN;
  const rr=slOk&&tpOk?Math.abs(tp-entry)/Math.abs(entry-sl):NaN; const costR=slOk?fee/stopPct:NaN;
  const liqPct=Math.abs(px-liq)/px, liqAtr=Math.abs(px-liq)/atr; const liqEntryPct=Math.abs(entry-liq)/entry;
  const liqPassed=isL?px<=liq:px>=liq;
  // stop likidasyondan önce gelmeli; arada en az 0,5 ATR pay olmalı (likidasyon fiyatı mark ile hesaplanır, fitil kayabilir)
  let slLiqAtr=NaN; if(slOk){ slLiqAtr=sg*(sl-liq)/atr; if(slLiqAtr<=0) red.push(`Likidasyon (${fmtP(liq)}) stoptan (${fmtP(sl)}) önce geliyor: stop hiç çalışmaz, pozisyon likide olur. Kaldıracı düşür ya da stopu ${fmtP(isL?liq+0.5*atr:liq-0.5*atr)} ${isL?"üstüne":"altına"} çek.`); else if(slLiqAtr<0.5) warn.push(`Stop ile likidasyon arasında yalnızca ${fx(slLiqAtr,2)} ATR var; sert bir fitil stopu atlayıp likidasyona gidebilir.`); }
  else if(!isFinite(sl)) warn.push(`Stop yok. Bu kaldıraçta tek koruma likidasyon (${fmtP(liq)}, girişten ${pc(liqEntryPct)} uzakta).`);
  if(t.open&&liqPassed) red.push("Girilen likidasyon fiyatı şu anki fiyatın ötesinde; değerleri kontrol et.");
  else if(liqAtr<1.5) red.push(`Likidasyon şu anki fiyattan ${fx(liqAtr,1)} ATR (${pc(liqPct)}) uzakta; sıradan bir 15 dk mumu yeter.`);
  else if(liqAtr<3) warn.push(`Likidasyon ${fx(liqAtr,1)} ATR uzakta; tek dalga yeter.`);
  if(slOk){
    if(stopPct<RS_CFG.floorStop) warn.push(`Stop %${fx(stopPct*100,2)}: testte %1,5 altı stoplar eksiydi (gürültü stopu); komisyon+kayma ${fx(costR,2)}R yer.`);
    else ok.push(`Stop %${fx(stopPct*100,2)}, %1,5 tabanının üstünde.`);
    if(slAtr<RS_CFG.stopAtr) warn.push(`Stop ${fx(slAtr,2)} ATR: 15 dk oynaklığının içinde, gürültüyle patlar.`);
    else if(slAtr>RS_CFG.maxStopAtr) warn.push(`Stop ${fx(slAtr,1)} ATR: bot 3 ATR'den geniş stopla girmez; boy küçük kalır, hedef uzak.`);
    else ok.push(`Stop ${fx(slAtr,2)} ATR, botun 0,8–3 ATR aralığında.`);
    if(t.open&&(isL?px<=sl:px>=sl)) red.push(`Fiyat (${fmtP(px)}) stopun ötesinde; stop emri çalışmadıysa pozisyon korumasız.`);
  }
  if(isFinite(rr)){ if(rr<1) red.push(`Ödül/risk ${fx(rr,2)}R: hedef stoptan yakın; komisyonla birlikte uzun vadede kaybettirir.`); else if(rr<1.5) warn.push(`Ödül/risk ${fx(rr,2)}R; bot en az 1,5R ister.`); else ok.push(`Ödül/risk ${fx(rr,2)}R (komisyon sonrası ≈ ${fx(rr-costR,2)}R).`);
    if(t.open&&(isL?px>=tp:px<=tp)) warn.push("Fiyat hedefi geçmiş; hedef emri dolmadıysa kârı al ya da stopu girişe çek."); }
  else if(!isFinite(tp)) warn.push("Hedef yok; bot 1,5R'de yarısını alıp stopu girişe çeker.");
  if(lev>BOT_CFG_DEF.maxLev) warn.push(`${lev}x botun üst sınırı ${BOT_CFG_DEF.maxLev}x'in üstünde; likidasyon girişten ${pc(liqDist(lev))} uzakta.`);
  if(!iso) warn.push(liqGiven?"Cross: likidasyon fiyatı cüzdandaki diğer pozisyonlarla ve bakiyeyle kayar; zarar tüm bakiyeye yayılır.":"Cross: likidasyonu girmedin, izole varsayımıyla tahmin edildi; gerçek değer bakiyeye göre daha uzak olabilir ama zarar tüm bakiyeye yayılır.");
  else if(!liqGiven) warn.push(`Likidasyon girilmedi; ${lev}x izole için tahmin ${fmtP(liq)}.`);
  let notional=NaN, lossUsd=NaN, riskPct=NaN; if(isFinite(size)){ notional=size*lev; if(slOk){ lossUsd=notional*(stopPct+fee); if(isFinite(bal)){ riskPct=lossUsd/bal; if(riskPct>BOT_CFG_DEF.risk*1.5) red.push(`Stop olursa ${fx(lossUsd,2)} $ gider, bakiyenin yüzde ${fx(riskPct*100,1)} kadarı; bot işlem başına yüzde ${fx(BOT_CFG_DEF.risk*100,0)} riske eder.`); else if(riskPct>BOT_CFG_DEF.risk) warn.push(`Stop olursa bakiyenin yüzde ${fx(riskPct*100,1)} kadarı gider; bot yüzde ${fx(BOT_CFG_DEF.risk*100,0)} ile sınırlar.`); else ok.push(`Stop olursa bakiyenin yüzde ${fx(riskPct*100,1)} kadarı gider (bot sınırı yüzde ${fx(BOT_CFG_DEF.risk*100,0)}).`); } } }
  const roeSl=slOk?-(stopPct+fee)*lev*100:NaN, roeTp=tpOk?(Math.abs(tp-entry)/entry-fee)*lev*100:NaN;
  const pnlPct=sg*(px/entry-1)*100; const be=isL?entry*(1+fee):entry*(1-fee);
  /* ---- masa ---- */
  let verdict, kind, score, oppScore, oppDecision, agents, talk, lines, deskStop, deskStopWhy, deskT1, deskT2, decision, veto=null, yes=null;
  if(t.open){
    const orders=[]; if(slOk) orders.push({sym:t.sym,ro:true,type:"STOP_MARKET",stop:sl}); if(tpOk) orders.push({sym:t.sym,ro:true,type:"TAKE_PROFIT_MARKET",px:tp});
    const rv=positionReview(A,{sym:t.sym,dir,entry,liq},orders,c24,opts);
    score=rv.score; oppScore=rv.oppScore; oppDecision=rv.oppDecision; agents=rv.agents; lines=rv.lines; talk=null; deskStop=rv.stopLv; deskStopWhy=rv.stopWhy; deskT1=rv.tp1; deskT2=rv.tp2; decision=rv.verdict;
    const VM={"tut":"DEVAM ET","tut, stop sık":"DEVAM ET · STOPU SIK","azalt":"AZALT","çık":"ÇIK"}; verdict=VM[rv.verdict]||"DEVAM ET"; kind=rv.verdict==="çık"?"down":rv.verdict==="tut"?"up":"warn";
    if(slOk&&(isL?px<=sl:px>=sl)){ verdict="ÇIK"; kind="down"; }
    else if(kind==="up"&&red.length){ verdict="DEVAM ET · ÖNCE DÜZELT"; kind="warn"; }
  } else {
    const c=committee(A,dir,c24,opts), opp=committee(A,isL?"short":"long",c24,opts);
    score=c.score; oppScore=opp.score; oppDecision=opp.decision; agents=c.agents; talk=c.talk; lines=null; decision=c.decision; veto=c.veto; yes=c.yes;
    if(c.plan){ deskStop=c.plan.stop; deskT1=c.plan.t1; deskT2=c.plan.t2; deskStopWhy=`%${fx(c.plan.sd*100,2)} uzakta: 1,2 ATR, en az %1,5`; }
    if(c.veto||oppDecision==="giriş"||c.score<0||red.length){ verdict="GİRME"; kind="down"; }
    else if(c.decision==="giriş"){ verdict=warn.length>2?"GİR · PLANI DÜZELT":"GİR"; kind=warn.length>2?"warn":"up"; }
    else { verdict="BEKLE"; kind="warn"; }
  }
  // Can'ın özeti: masanın kararı + kullanıcının planına bakış
  const why=[]; if(t.open){ why.push(decision==="çık"?"masa ters yöne dönmüş":decision==="azalt"?"masa ikna değil":decision==="tut"?"masa hâlâ bu yönde":"masa kararsız, stop sıkılsın"); }
  else { why.push(veto?`veto: ${veto}`:decision==="giriş"?`masa ${dir} için giriş diyor (puan ${fx(score,2)}, ${yes}/${DESK.length} evet)`:decision==="oy eksik"?`puan eşikte ama ${yes} evet var`:`puan ${fx(score,2)}, eşik ${fx(COM_DEF.threshold,2)}`); if(oppDecision==="giriş") why.push("masa ters yöne giriş diyor"); }
  if(red.length) why.push(red.length+" kırmızı risk notu");
  const canSay=`${verdict}. ${why.join(" · ")}.${isFinite(deskStop)?` Benim stopum ${fmtP(deskStop)} (${deskStopWhy})${slOk?`, seninki ${fmtP(sl)}`:""}.`:""}`;
  return {sym:t.sym,dir,open:!!t.open,verdict,kind,canSay,score,oppScore,oppDecision,decision,veto,yes,agents,talk,lines,red,warn,ok,
    px,entry,sl:slOk?sl:NaN,tp:tpOk?tp:NaN,lev,iso,liq,liqGiven,liqPct,liqAtr,slLiqAtr,stopPct,slAtr,rr,costR,roeSl,roeTp,pnlPct,roeNow:pnlPct*lev,be,atrPct:atr/px*100,notional,lossUsd,riskPct,deskStop,deskStopWhy,deskT1,deskT2,c24,t:Date.now()};
}
/* ---------- Kâğıt pozisyon için tek fiyat adımı (ui.js botOnPrice ve headless/ ortak) ----------
   p.hi/p.lo, p.stage ve p.stop'u günceller; uygulanacak kapanışları sırayla döndürür: {part,price,k,t,taker,final} ya da {k:"move",t}.
   İz süren stop ilk riskle (p.risk0) ölçülür: hedef 1'den sonra stop girişe çekildiği için |giriş−stop| sıfır olur, onunla ölçmek stopu tepeye yapıştırır. */
function paperStep(p, px, now, cfg){
  const isL=p.dir==="long"; const out=[]; p.hi=Math.max(p.hi,px); p.lo=Math.min(p.lo,px);
  const risk=p.risk0||Math.abs(p.entry-(p.stop0||p.stop));
  if(isL? px<=p.stop : px>=p.stop){ out.push({part:1,price:isL?p.stop*(1-cfg.slip):p.stop*(1+cfg.slip),k:"stop",t:p.stage==="open"?"Stop":"Kalan stop",taker:true,final:true}); return out; }
  if(p.stage==="open" && (isL? px>=p.t1 : px<=p.t1)){ out.push({part:0.5,price:p.t1,k:"tp1",t:"Hedef 1",taker:false}); p.stage="tp1"; p.stop=p.entry; out.push({k:"move",t:`Stop girişe çekildi (${fmtP(p.entry)}).`}); return out; }
  if(p.stage==="tp1"){ if(p.t2 && (isL? px>=p.t2 : px<=p.t2)){ out.push({part:0.6,price:p.t2,k:"tp2",t:"Hedef 2",taker:false}); p.stage="tp2"; }
    const trail = isL ? p.hi-1*risk : p.lo+1*risk; if(isL? trail>p.stop : trail<p.stop){ p.stop=trail; } }
  if(p.stage==="tp2"){ const trail = isL ? p.hi-0.7*risk : p.lo+0.7*risk; if(isL? trail>p.stop : trail<p.stop) p.stop=trail; }
  if(p.expiresAt && now>p.expiresAt){ out.push({part:1,price:isL?px*(1-cfg.slip):px*(1+cfg.slip),k:"time",t:"Zaman stopu",taker:true,final:true}); }
  return out;
}
