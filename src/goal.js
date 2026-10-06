/* ---------- Usta trader katmanı: 200 $ hedefi, çok aşamalı giriş, teminat yönetimi, dinamik hedef/stop (6 Ekim 2026) ----------
   Ekransız bot (headless/bot.js), arayüzdeki kâğıt bot (ui.js) ve tekrar oynatma testi (tests/replay-goal.js) aynı fonksiyonları kullanır.
   Kurallı; hiçbir şey gerçek emir göndermez.
   1. goalState: özkaynak, zirve, zirveden düşüş ve 200 $'a uzaklıktan "mod" çıkar (normal / koru / yakın / tamam) → risk çarpanı ve eşik eki.
   2. entryStages: beş aşama → rejim (Arda) · kurulum kalitesi (Kerem, Mert) · risk ve teminat bütçesi (Can) ·
      korelasyon ve bekleme (Murat) · son oy (Can). Her aşama geçti / uyarı / kaldı ve gerekçe yazar; uyarılar boyu küçültür.
   3. freePlan: teminat ya da yer yetmiyorsa ve yeni kurulum açıktakilerden belirgin iyiyse, kârdaki ya da sönmüş pozisyondan kâr alıp yer açar.
   4. deskAdjust: açık pozisyonda hedef ve stopu günceller (başabaş, dirence göre hedef 1, koşucuyu uzat/kısalt, yapısal stop, hedefi 200 $'a taşıyan hedef 1'de tamamını al).
   Murat (auditor.js) her kararı sonradan puanlar; kötü çıkan kolu kapatır (AUD.off). */
const GOAL_DEF={goal:200,ddGuard:0.10,nearGoal:0.85,lockGoal:true,maxOpenRisk:1,maxSameDir:4,dirGapMin:15,lossGapMin:30,
  freeMargin:true,freeEdge:0.08,freeMinR:0.3,beR:0,shortRule:"warn",warnMult:0.75,maxWarn:2,dyn:true,riskMax:0.10,confSpan:0.35};
Object.assign(BOT_CFG_DEF,GOAL_DEF);
// kayıtlı eski ayar (riskMax yok): açık risk sınırı %9'du, tek bir %10'luk işleme yer kalmazdı → yeni varsayılana taşınır. Tam bütçe (6 Ekim gecesi): sınır 1 = özkaynağın tamamı, bütçeyi teminat sınırı (%95) belirler; maxSameDir 4, maxPos 6, günde 24/12 (comMigrate v3)
function cfgMigrate(saved,cfg){ if(saved&&saved.riskMax==null) cfg.maxOpenRisk=GOAL_DEF.maxOpenRisk; return cfg; }
/* Masanın güveni (6 Ekim 2026, kullanıcı: "risk %10'a kadar artabilir, önemli olan masanın işleme ne kadar güvendiği"):
   güven = puan payı (eşik → 0, eşik + confSpan 0,35 → 1) × not çarpanı (A 1, B 0,5, C 0);
   tahmin defterinde masanın "gir" dediklerinin isabeti (≥30 tahmin) %50 altındaysa güven ×0,5, %55 altındaysa ×0,75.
   risk = taban risk + (riskMax − taban) × güven; sonra mod çarpanı, uyarılar ve açık risk sınırı uygulanır.
   Bileşenler gerçek oylarla seçildi (tests/backtest-masa.js örnekleri, 8 May–6 Eki 2026, eşik 0,35, 11.701 sinyal): oy birliğinin bilgisi yok
   (oybirliğiyle alınan kararlar −0,07/−0,06R, bölünmüş masa −0,07/−0,10R, arası −0,14/−0,12R; sıralama yok, formülde değil), not A iki yarıda da
   daha az kaybediyor (A −0,09/−0,02R, B −0,10/−0,11R, C −0,14/−0,11R), puan payı yalnız ikinci yarıda biraz iyi. Hiçbir güven diliminde artı R yok;
   bu eşlemede ortalama risk %4,65 ve işlem başına bakiye kaybı −%0,45/−%0,36 (düz %3: −%0,31/−%0,29). Kanıt değil: tahmin defteri ve Murat ölçecek. */
function deskConf(x, thr, minYes, grade, cfg){
  cfg=cfg||{}; const s=clamp((x.score-thr)/(cfg.confSpan||0.35),0,1), g=grade==="A"?1:grade==="B"?0.5:0;
  let conf=s*g, fcm=1, fcTxt=""; let L=null; try{ L=typeof FC!=="undefined"&&FC&&FC.learn; }catch(e){}
  if(L&&L.go&&L.go.n>=30&&L.go.hit!=null){ fcm=L.go.hit<0.5?0.5:L.go.hit<0.55?0.75:1; fcTxt=`tahmin defteri "gir" isabeti %${Math.round(L.go.hit*100)} (${L.go.n})${fcm<1?` → güven ×${fx(fcm,2)}`:""}`; }
  conf=clamp(conf*fcm,0,1); const base=cfg.risk>0?cfg.risk:0, top=Math.max(base,cfg.riskMax>0?cfg.riskMax:base);
  return {conf,pct:base+(top-base)*conf,s,g,grade,fcm,fcTxt};
}
const DEC_KIND={free:"Yer açmak için kâr al",prune:"Sönmüş pozisyonu kapat",goal:"200 $ kilidi",t1full:"Hedefi 200 $'a taşıyan hedef 1'de tamamı",
  be:"Stop başabaşa",t1pull:"Hedef 1 dirençten önceye",t2ext:"Koşucuyu uzat",t2cut:"Koşucuyu kısalt",tight:"Yapısal stopa sık"};
const DEC_CLOSE={free:1,prune:1,goal:1};
/* --- 1. hedef durumu --- */
function goalState(b, cfg){
  cfg=cfg||BOT_CFG_DEF; const start=b.start||100; const goal=cfg.goal>start?cfg.goal:start*2; const eq=isFinite(b.eq)?b.eq:b.bal;
  const peak=Math.max(b.peak||start,eq,start); const dd=peak>0?Math.max(0,1-eq/peak):0; const prog=(eq-start)/(goal-start); const need=goal-eq;
  let mode="normal", riskMult=1, thrAdd=0, why=`200 $ hedefine ${fx(Math.max(0,need),2)} $ var (yol %${Math.round(clamp(prog,0,1)*100)})`;
  if(eq>=goal||b.goalHit){ mode="tamam"; riskMult=0.5; thrAdd=0.1; why=`hedef ${fx(goal,0)} $ tamam; kazancı korumak için risk yarıya, eşik +0,10`; }
  else if(dd>=cfg.ddGuard){ mode="koru"; riskMult=0.6; thrAdd=0.05; why=`zirveden (${fx(peak,2)} $) %${fx(dd*100,1)} geride: risk ×0,6, eşik +0,05; önce kaybı durdur`; }
  else if(prog>=cfg.nearGoal){ mode="yakın"; riskMult=0.7; why=`hedefe ${fx(need,2)} $ kaldı: elde edileni geri vermemek için risk ×0,7`; }
  return {goal,start,eq,peak,dd,prog,need,mode,riskMult,thrAdd,why};
}
// işlem başına risk ($): yüzde risk × mod çarpanı; hedefe az kaldıysa 1,5R'lik kazancın hedefi geçmesine yetecek kadarıyla sınırlı
function goalRisk(gs, bal, cfg, pct){ pct=pct!=null?pct:cfg.risk; let r=bal*pct*gs.riskMult; if(gs.mode!=="tamam"&&gs.need>0) r=Math.min(r,Math.max(gs.need/1.5,bal*cfg.risk*0.3)); return r; }
const openRiskOf=p=>{ const sg=p.dir==="long"?1:-1; const d=sg*(p.entry-p.stop); return d>0?d*p.qty:0; };
const posR=(p,px)=>{ const r0=p.risk0||Math.abs(p.entry-(p.stop0||p.stop)); return r0>0&&px>0?(p.dir==="long"?px-p.entry:p.entry-px)/r0:0; };
/* --- 2. çok aşamalı giriş ---
   x: {sym,dir,score,yes,veto,sd,feat,com?} · ctx: {cfg,bal,start,eq,peak,goalHit,positions,trades,now,thr,minYes,aud,lev}
   döner: {ok, need (teminat açığı $), slot (yer yok), stages:[{k,who,st:"ok"|"warn"|"fail",txt}], riskUsd, notional, margin, warn, grade, gs} */
function entryStages(x, ctx){
  const cfg=ctx.cfg, now=ctx.now||Date.now(), isL=x.dir==="long", f=x.feat||(x.com&&x.com.feat)||{}, au=ctx.aud||null; const st=[]; const add=(k,who,s,txt)=>st.push({k,who,st:s,txt});
  const gs=goalState(ctx,cfg); const off=au&&au.off||{};
  /* aşama 1: rejim. Faktör testindeki günlük süzgeçler (oynaklık, hacim patlaması, fonlama, kısa vadeli yükseliş) 15 dk süpürme işlemlerinde
     6 ayda fark yaratmadı (faktör thread'i, 6 Ekim 2026); bu yüzden burada yoklar. Kalanlar: BTC rejimi ve short kuralı. */
  const w1=[]; let f1=null; const B=f.btc;
  if(B&&B.dump) f1=`BTC ${isL?"sert düşüyor":"sert yükseliyor"} (4 sa ${pct(B.ch4*100)}, 24 sa ${pct(B.ch24*100)})`;
  else if(B&&!B.ok) w1.push("BTC yapısı karşı yöne bakıyor");
  // 6 aylık tekrar oynatmada (tests/replay-goal.js) K3 shortları iki yarıda da eksi: −0,16R / −0,15R, 452 işlem; longlar ≈ 0. Veriye bakılarak seçildi, kanıt değil.
  if(!isL&&cfg.shortRule==="fail") f1=f1||"short kapalı (ayar): geçmiş 6 ayda shortlar iki yarıda da eksi";
  else if(!isL&&cfg.shortRule==="warn") w1.push("short: geçmiş 6 ayda K3 shortları iki yarıda da eksi (−0,16R / −0,15R)");
  add("rejim","Arda",f1?"fail":w1.length?"warn":"ok",f1||(w1.length?w1.join(" · "):`rejim uygun${B?` (BTC 4 sa ${pct(B.ch4*100)}, yapı ${B.bias==="up"?"yukarı":B.bias==="down"?"aşağı":"yatay"})`:""}`));
  /* aşama 2: kurulum kalitesi */
  const thr=(ctx.thr!=null?ctx.thr:cfg.threshold)+gs.thrAdd, minYes=ctx.minYes||cfg.minYes; const ag=id=>(x.com&&x.com.agents||[]).find(a=>a.id===id);
  const liq=ag("liq"), flow=ag("flow"); const sweep=liq?liq.v>0.3:!!f.pool, of=flow?flow.v>0:(+f.of||0)>=1;
  const grade=x.score>=thr+0.15&&sweep&&of?"A":(sweep||of)?"B":"C";
  let f2=null; if(x.veto) f2="veto: "+x.veto; else if(!(x.score>=thr)) f2=`puan ${pts(x.score)} < eşik ${pts(thr)}${gs.thrAdd?` (mod "${gs.mode}" eşiği +${pts(gs.thrAdd)})`:""}`; else if(x.yes<minYes) f2=`${x.yes} evet, ${minYes} gerekli`;
  add("kalite","Kerem",f2?"fail":grade==="C"?"warn":"ok",f2||`not ${grade} · puan ${pts(x.score)} · ${x.yes} evet · ${sweep?"süpürme var":"süpürme yok"} · ${of?"akış teyitli":"akış teyitsiz"}`);
  /* aşama 4 (sayaçlar önce): korelasyon ve bekleme */
  const pos=ctx.positions||[]; const same=pos.filter(p=>p.dir===x.dir); const cap=Math.min(cfg.maxSameDir||9,au&&au.maxSameDir?au.maxSameDir:9);
  const opens=pos.map(p=>({t:p.openT,dir:p.dir})).concat((ctx.trades||[]).map(t=>({t:t.openT,dir:t.dir}))); const lastSame=Math.max(0,...opens.filter(o=>o.dir===x.dir).map(o=>o.t||0));
  const lastLoss=(ctx.trades||[]).filter(t=>t.r<0).reduce((a,t)=>Math.max(a,t.closeT||0),0); const gapLoss=Math.max(cfg.lossGapMin||0,au&&au.pauseMin||0);
  let f4=null; if(pos.some(p=>p.sym===x.sym)) f4="bu coinde zaten pozisyon var"; else if(same.length>=cap) f4=`zaten ${same.length} ${x.dir} açık (sınır ${cap}); hepsi BTC ile birlikte hareket eder`;
  else if(lastSame&&now-lastSame<cfg.dirGapMin*60e3) f4=`${Math.round((now-lastSame)/60e3)} dk önce aynı yönde giriş yapıldı; aynı bahsi ikinci kez oynamamak için ${cfg.dirGapMin} dk ara`;
  else if(lastLoss&&now-lastLoss<gapLoss*60e3) f4=`son kayıp ${Math.round((now-lastLoss)/60e3)} dk önce; ${gapLoss} dk soğuma`;
  /* aşama 3: risk ve teminat bütçesi */
  const warn=st.filter(s=>s.st==="warn").length; const cf=deskConf(x,thr,minYes,grade,cfg); let riskUsd=goalRisk(gs,ctx.bal,cfg,cf.pct)*Math.pow(cfg.warnMult,warn);
  const openRisk=pos.reduce((a,p)=>a+openRiskOf(p),0); const room=gs.eq*cfg.maxOpenRisk-openRisk; let f3=null, n3=[];
  if(riskUsd>room){ if(room<riskUsd*0.4) f3=`açık risk ${fx(openRisk,2)} $ (özkaynağın %${fx(openRisk/gs.eq*100,1)}); sınır %${fx(cfg.maxOpenRisk*100,0)}`; else { n3.push(`açık risk sınırı yüzünden risk ${fx(riskUsd,2)} → ${fx(room,2)} $`); riskUsd=room; } }
  const lev=ctx.lev||cfg.lev||20; const notional=x.sd>0?riskUsd/x.sd:0, margin=notional/lev; const used=pos.reduce((a,p)=>a+(p.margin||0),0)+(ctx.reserved||0); const free=ctx.bal*0.95-used;
  const need=Math.max(0,margin-free), slot=pos.length>=cfg.maxPos;
  n3.unshift(`masanın güveni %${Math.round(cf.conf*100)} (puan payı %${Math.round(cf.s*100)}, not ${grade}) → risk %${fx(cf.pct*100,1)} (taban %${fx(cfg.risk*100,1)}, üst %${fx(Math.max(cfg.risk,cfg.riskMax||0)*100,1)})${cf.fcTxt?" · "+cf.fcTxt:""}`);
  if(gs.mode!=="normal") n3.push(gs.why); if(warn) n3.push(`${warn} uyarı: boy ×${fx(Math.pow(cfg.warnMult,warn),2)}`);
  add("bütçe","Can",f3?"fail":(need>0||slot)?"warn":"ok",f3||`risk ${fx(riskUsd,2)} $ · pozisyon ${fx(notional,2)} $ · teminat ${fx(margin,2)} $ / boş ${fx(Math.max(0,free),2)} $${need>0?` · ${fx(need,2)} $ eksik`:""}${slot?` · ${pos.length}/${cfg.maxPos} yer dolu`:""}${n3.length?" · "+n3.join(" · "):""}`);
  add("korelasyon","Murat",f4?"fail":"ok",f4||`aynı yönde ${same.length}/${cap} · son ${x.dir} girişi ${lastSame?Math.round((now-lastSame)/60e3)+" dk önce":"yok"}`);
  const warnBlock=au&&au.warnBlock&&warn>0; const tooMany=warn>cfg.maxWarn;
  const fail=st.find(s=>s.st==="fail"); const ok=!fail&&!warnBlock&&!tooMany;
  add("karar","Can",ok?(need>0||slot?"warn":"ok"):"fail",fail?`girmiyoruz: ${fail.k} aşamasında kaldı`:tooMany?`${warn} uyarı fazla; temiz değil, girmiyoruz`:warnBlock?"Murat'ın dersi: uyarılı kurulumla girmiyoruz":(need>0||slot)?"kurulum iyi ama yer/teminat yok; açıktakilerden kâr alıp yer açılabilir mi bakıyorum":`giriyoruz: not ${grade}, risk ${fx(riskUsd,2)} $`);
  return {ok,need,slot,stages:st,riskUsd,notional,margin,free,warn,grade,gs,thr,conf:cf.conf,riskPct:cf.pct};
}
/* --- 3. yer açma: teminat/yer yoksa, yeni kurulum belirgin iyiyse açıktakilerden kâr alınır ya da sönmüş pozisyon kapanır.
   Zarardaki pozisyon (−0,25R altı) yer açmak için kesilmez. Döner: [{p,part,kind,why,margin}] ya da null --- */
function freePlan(x, es, ctx){
  const cfg=ctx.cfg, au=ctx.aud||{}; if(!cfg.freeMargin||(au.off&&au.off.free&&au.off.prune)) return null; if(es.grade==="C"||x.score<es.thr+cfg.freeEdge) return null;
  const now=ctx.now||Date.now(); const px=ctx.px||(()=>NaN); const opts=[];
  for(const p of ctx.positions||[]){ const r=posR(p,px(p.sym)); const rev=p.lastReview&&isFinite(p.lastReview.score)?p.lastReview.score:p.score; const held=(now-p.openT)/60e3;
    if(r>=cfg.freeMinR&&!(au.off&&au.off.free)){ const part=p.stage==="open"?0.5:1; opts.push({p,part,kind:"free",r,why:`${fx(r,2)}R kârda; ${part<1?"yarısı":"kalanı"} alınıyor, ${x.sym.replace("USDT","")} için yer açılıyor (puan ${pts(x.score)} > ${pts(rev)})`,margin:p.margin*part,rank:2+r}); }
    else if(r>-0.25&&held>=30&&isFinite(rev)&&rev<x.score-cfg.freeEdge&&rev<es.thr&&!(au.off&&au.off.prune)) opts.push({p,part:1,kind:"prune",r,why:`${fx(r,2)}R'de duruyor, masa artık ikna değil (${pts(rev)}); ${x.sym.replace("USDT","")} daha iyi (${pts(x.score)})`,margin:p.margin,rank:1-rev}); }
  opts.sort((a,b)=>b.rank-a.rank); const out=[]; let got=0, slotFree=!es.slot;
  for(const o of opts){ if(got>=es.need&&slotFree) break; out.push(o); got+=o.margin; if(o.part>=1) slotFree=true; }
  return got>=es.need&&slotFree&&out.length?out:null;
}
/* --- 4. açık pozisyonda dinamik hedef/stop ---
   ctx: {cfg,px,rv (positionReview sonucu ya da null),lvl (karşı taraftaki en yakın seviye),thr,gs,aud}. Döner: [{k,who,txt,stop?,t1?,t2?,t1Part?}] --- */
function deskAdjust(p, ctx){
  const cfg=ctx.cfg, px=ctx.px, out=[]; if(!cfg.dyn||!(px>0)) return out; const off=ctx.aud&&ctx.aud.off||{}; const isL=p.dir==="long", sg=isL?1:-1;
  const r0=p.risk0||Math.abs(p.entry-(p.stop0||p.stop)); if(!(r0>0)) return out; const rNow=sg*(px-p.entry)/r0; const lv=R=>p.entry+sg*R*r0; const better=(a,b)=>sg*(a-b)>0;
  const rv=ctx.rv, thr=ctx.thr!=null?ctx.thr:cfg.threshold, gs=ctx.gs; const mom=rv&&rv.agents?(rv.agents.find(a=>a.id==="mom")||{v:0}).v:0;
  // hedef 1'de tamamını al: o fiyattaki kâr özkaynağı 200 $'a taşıyorsa
  if(gs&&gs.mode!=="tamam"&&p.stage==="open"&&!p.t1Part&&!off.t1full){ const gain=sg*(p.t1-px)*p.qty; if(gs.eq+gain>=gs.goal) out.push({k:"t1full",who:"Can",t1Part:1,txt:`hedef 1 (${fmtP(p.t1)}) özkaynağı ${fx(gs.eq+gain,2)} $'a taşıyor, 200 $ hedefi tamam olur: orada yarısı değil tamamı kapanacak`}); }
  // başabaş: beR > 0 ise ve o kadar R görüldüyse
  if(cfg.beR>0&&!off.be&&p.stage==="open"&&rNow>=cfg.beR&&better(p.entry,p.stop)){ const be=p.entry*(1+sg*0.0013); out.push({k:"be",who:"Can",stop:be,txt:`${fx(rNow,2)}R kârda; stop başabaşa (${fmtP(be)}, komisyon dahil), risk sıfır`}); }
  // hedef 1'i karşıdaki dirence/desteğe göre çek: seviye girişten ≥0,8R ve hedef 1'den önce
  const L=ctx.lvl; if(p.stage==="open"&&!p.t1Pulled&&!off.t1pull&&L>0&&sg*(L-px)>0&&sg*(p.t1-L)>0){ const t=L*(1-sg*0.001); const rr=sg*(t-p.entry)/r0; if(rr>=0.8) out.push({k:"t1pull",who:"Kerem",t1:t,txt:`hedef 1'in önünde ${isL?"direnç":"destek"} var (${fmtP(L)}); hedef 1 ${fmtP(p.t1)} → ${fmtP(t)} (${fx(rr,2)}R), fiyat oradan dönebilir`}); }
  if(rv&&p.stage==="tp1"&&p.t2){ const t2R=sg*(p.t2-p.entry)/r0;
    if(!p.t2Ext&&!off.t2ext&&rv.score>=thr+0.1&&mom>0.3&&t2R<4){ const t=lv(Math.min(4,t2R+1)); out.push({k:"t2ext",who:"Baran",t2:t,txt:`masa güçlü (puan ${pts(rv.score)}), momentum sürüyor; koşucu ${fx(t2R,1)}R → ${fx(Math.min(4,t2R+1),1)}R (${fmtP(t)})`}); }
    else if(!p.t2Cut&&!off.t2cut&&rv.score<0&&t2R>2&&sg*(lv(2)-px)>0){ const t=lv(2); out.push({k:"t2cut",who:"Emre",t2:t,txt:`masa bu yönden çekildi (puan ${pts(rv.score)}); koşucu ${fx(t2R,1)}R → 2R (${fmtP(t)})`}); } }
  // yapısal stop: masa "stop sık" diyorsa ve öneri mevcut stoptan iyi, fiyattan en az 0,6 ATR uzaksa
  if(rv&&rv.verdict==="tut, stop sık"&&!off.tight&&rNow>=0.5&&isFinite(rv.stopLv)&&better(rv.stopLv,p.stop)&&sg*(px-rv.stopLv)>0){ out.push({k:"tight",who:"Kerem",stop:rv.stopLv,txt:`masa stop sıkılsın diyor; stop ${fmtP(p.stop)} → ${fmtP(rv.stopLv)} (${rv.stopWhy})`}); }
  return out;
}
// deskAdjust kararını pozisyona uygular ve Murat'ın puanlaması için kaydeder
function deskApply(p, a, px, now){
  const r0=p.risk0||Math.abs(p.entry-(p.stop0||p.stop)); const sg=p.dir==="long"?1:-1; const rAt=r0>0?+(sg*(px-p.entry)/r0).toFixed(3):0;
  const d={k:a.k,t:now||Date.now(),px,rAt,who:a.who}; if(a.stop!=null){ d.from=p.stop; p.stop=a.stop; d.to=a.stop; } if(a.t1!=null){ d.from=p.t1; p.t1=a.t1; p.t1Pulled=true; d.to=a.t1; } if(a.t2!=null){ d.from=p.t2; p.t2=a.t2; d.to=a.t2; if(a.k==="t2ext") p.t2Ext=true; else p.t2Cut=true; } if(a.t1Part!=null) p.t1Part=a.t1Part;
  (p.decs=p.decs||[]).push(d); return d;
}
// kapanış kararlarını (yer aç, sönmüş, 200 $ kilidi) kaydeder; kapanışın kendisi botun closeAt'iyle yapılır
function deskNote(p, k, px, part, now, who){ const r0=p.risk0||Math.abs(p.entry-(p.stop0||p.stop)); const sg=p.dir==="long"?1:-1; const d={k,t:now||Date.now(),px,part,who:who||"Can",rAt:r0>0?+(sg*(px-p.entry)/r0).toFixed(3):0}; (p.decs=p.decs||[]).push(d); return d; }
// her kapanış (kısmi ya da tam) fiyat ve miktarıyla: kararların sonradan puanlanması için
function deskFill(p, k, px, q, now){ (p.xs=p.xs||[]).push({k,t:now||Date.now(),px,q}); }
// özkaynak zirvesini izler; 200 $'a ulaşınca kilit kararı döner
function goalTick(b, eq, cfg){ b.peak=Math.max(b.peak||b.start||100,eq); const gs=goalState({...b,eq},cfg); return {gs,lock:cfg.lockGoal&&!b.goalHit&&eq>=gs.goal}; }
// karar ve aşamaları tek satırlık günlük metnine
const stagesTxt=es=>es.stages.map(s=>`${s.st==="ok"?"✓":s.st==="warn"?"!":"✗"} ${s.k} (${s.who}): ${s.txt}`).join(" | ");
