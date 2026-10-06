// Ekransız kâğıt bot çekirdeği: ui.js'teki Masa (komite) modunun DOM'suz karşılığı.
// Karar ve çıkış kuralları ui.js ile aynıdır (botCandidatesCommittee, botOpenMarket, botDecide, botOnPrice → paperStep, botManage, botClosePos).
// Fark: her karar JSONL'ye özellikleriyle yazılır; giriş fiyatı açılıştan hemen önce REST'ten taze alınır (UI tarama anındaki fiyatı kullanabilir).
const fs=require('fs'); const path=require('path'); const {atomicWrite}=require('./store.js');

const r4=v=>isFinite(v)?+(+v).toFixed(4):null;
const compactAgents=ag=>{ const o={}; for(const a of ag||[]) o[a.id]=[a.v,a.c]; return o; };

function createBot(E, opt){
  const {dir,write,say}=opt; const file=path.join(dir,'bot.json');
  const fmtP=E.fmtP, fx=E.fx, pts=E.pts, ptsT=E.ptsT, fmtB=v=>(isFinite(v)?(+v).toFixed(2):"—")+" $";
  const bot={bal:100,start:100,startT:Date.now(),positions:[],trades:[],day:{key:null,opens:0,losses:0},cool:{},eq:[],lastTick:0,goalHit:null,scanId:0,cfg:{...E.BOT_CFG_DEF}};
  try{ const sv=JSON.parse(fs.readFileSync(file,'utf8')); Object.assign(bot,sv); bot.cfg=E.cfgMigrate(sv.cfg,{...E.BOT_CFG_DEF,...(sv.cfg||{})}); E.comMigrate(bot.cfg); }catch(e){}
  if(opt.cfg) Object.assign(bot.cfg,opt.cfg);
  bot.cfg.mode="komite";
  const rt={px:{},mark:{},book:{},fund:{},lastTrade:{},lastMark:0,src:null,managing:false,saveT:null};
  /* --- denetçi (Murat): ui.js botAudit ile aynı; dersler eşik, asgari oy, aynı yön sınırı, kayıp sonrası ara ve erken kâr kilidine bağlı --- */
  const A0=()=>E.getAud(); const thr=()=>bot.cfg.threshold+(A0()?A0().thrBump:0); const minYes=()=>Math.min(E.DESK.length,bot.cfg.minYes+(A0()?A0().minYesBump:0));
  function audit(rec){
    const prev=A0()?A0().lessons.map(l=>l.k):[]; let A; try{ A=E.auditRun(bot.trades,[],{thr:bot.cfg.threshold,minYes:bot.cfg.minYes}); }catch(e){ console.error('denetim hatası',e.message); return; } E.setAud(A);
    if(rec){ const f=A.findings.find(x=>x.openT===rec.openT&&x.sym===rec.sym); if(f&&f.tags.length) log("audit",rec.sym,`Murat: ${fx(rec.r,2)}R · ${f.tags.map(k=>E.AUD_TAGS[k].t.toLowerCase()).join(", ")}.${isFinite(rec.mfe)?` En iyi gidiş +${fx(rec.mfe,1)}R.`:""}`,{tags:f.tags,r:r4(rec.r)}); }
    for(const l of A.lessons.filter(l=>!prev.includes(l.k))) log("audit","",`Murat yeni ders: ${l.t} · ${l.n} işlemde ort. ${fx(l.avg,2)}R (diğerleri ${fx(l.avgNot,2)}R) → ${l.lever}.`,{lesson:l.k,n:l.n,avg:r4(l.avg),lever:l.lever});
  }

  function save(now){ if(now){ clearTimeout(rt.saveT); rt.saveT=null; try{ atomicWrite(file,JSON.stringify({...bot,eq:bot.eq.slice(-5000)})); }catch(e){ console.error('durum yazılamadı',e.message); } return; } if(!rt.saveT) rt.saveT=setTimeout(()=>save(true),2000); }
  function log(type,sym,text,extra){ const t=Date.now(); say(`${new Date(t).toISOString().slice(11,19)} ${type.padEnd(6)} ${(sym||"").padEnd(12)} ${text}`); write('events',{t,type,sym:sym||"",text,...(extra||{})}); }
  function day(){ const k=E.dayKey(Date.now()); if(bot.day.key!==k) bot.day={key:k,opens:0,losses:0}; return bot.day; }
  const pnlOf=(p,px)=>(p.dir==="long"?(px-p.entry):(p.entry-px))*p.qty;
  const mk=sym=>rt.mark[sym]||rt.px[sym];
  function equity(){ let eq=bot.bal; for(const p of bot.positions){ const px=mk(p.sym); if(px) eq+=pnlOf(p,px); } return eq; }
  const has=sym=>bot.positions.some(p=>p.sym===sym);
  const marginUsed=()=>bot.positions.reduce((a,p)=>a+p.margin,0);
  const liqPx=p=>{ const d=1/p.lev-0.005; return p.dir==="long"?p.entry*(1-d):p.entry*(1+d); };
  /* --- hedef (200 $) ve aşamalı giriş: src/goal.js (ui.js ile ortak) --- */
  const ctxOf=()=>({cfg:bot.cfg,bal:bot.bal,start:bot.start,eq:equity(),peak:bot.peak,goalHit:bot.goalHit,positions:bot.positions,trades:bot.trades,now:Date.now(),thr:thr(),minYes:minYes(),aud:A0(),lev:bot.cfg.lev,px:mk});
  const gsNow=()=>E.goalState({...bot,eq:equity()},bot.cfg);
  function goalWatch(){ const eq=equity(); const g=E.goalTick(bot,eq,bot.cfg);
    if(g.gs.mode!==bot.goalMode){ if(bot.goalMode) log("goal","",`Hedef modu: ${bot.goalMode} → ${g.gs.mode}. ${g.gs.why}.`,{mode:g.gs.mode,eq:r4(eq),peak:r4(bot.peak)}); bot.goalMode=g.gs.mode; }
    if(!g.lock) return; const now=Date.now(); bot.goalHit=now;
    log("goal","",`Can: özkaynak ${fmtB(eq)}, ${fmtB(g.gs.goal)} hedefi tamam. Tüm pozisyonları kapatıp kârı kilitliyorum; bundan sonra risk yarıya iniyor.`,{eq:r4(eq),goal:g.gs.goal});
    for(const p of [...bot.positions]){ const px=mk(p.sym); if(!(px>0)) continue; E.deskNote(p,"goal",px,1,now); closeAt(p,1,p.dir==="long"?px*(1-bot.cfg.slip):px*(1+bot.cfg.slip),{k:"desk",dec:"goal",t:"Masa kararı · 200 $ kilidi"},true); }
    save(); }

  /* --- adaylar: botCandidatesCommittee ile aynı --- */
  function candidates(rows){
    const out=[]; const now=Date.now();
    for(const r of rows){ if(!r.com) continue;
      for(const d of ["long","short"]){ const c=r.com[d]; if(!c) continue;
        const held=has(r.s), cool=!!(bot.cool[r.s]&&now<bot.cool[r.s]);
        const go=!!c.plan&&c.score>=thr()&&c.yes>=minYes()&&!c.veto&&!held&&!cool;
        out.push({sym:r.s,dir:d,row:r,com:c,go,held,cool,score:c.score,yes:c.yes,veto:c.veto,sd:c.plan?c.plan.sd:NaN,grade:c.score>=0.5?"A":c.score>=bot.cfg.threshold?"B":"C"}); } }
    return out.sort((a,b)=>b.score-a.score);
  }
  // satırın coin düzeyindeki alanları (yöne bağlı olanlar committee.feat içinde)
  const rowFeat=r=>({qv:r.qv,score:r.score,delta:isFinite(r.delta)?r.delta:null,deep:r.deep,fund:r4(r.fund),oi1h:r4(r.oi1h),volRel:r4(r.volRel),distR:r4(r.distR),distS:r4(r.distS),bo:r.bo||null,setup:r.setup||null,setupS:r.setupS||null});
  function voteRec(x,t,scanId){ const c=x.com; return {t,scan:scanId,sym:x.sym,dir:x.dir,go:x.go,held:x.held,cool:x.cool,decision:c.decision,score:c.score,yes:c.yes,no:c.no,veto:c.veto||null,sd:c.plan?r4(c.plan.sd):null,rr2:c.plan?c.plan.rr2:null,changed:c.changed,agents:compactAgents(c.agents),feat:c.feat||null,deep:!!x.row.deep,oi1h:r4(x.row.oi1h)}; }

  /* --- market giriş: botOpenMarket ile aynı --- */
  function openMarket(x,px,es){
    const cfg=bot.cfg; const isL=x.dir==="long"; if(!(px>0)||!(x.sd>0)) return false;
    const sd=x.sd; const stop=isL?px*(1-sd):px*(1+sd), t1=isL?px*(1+1.5*sd):px*(1-1.5*sd), t2=isL?px*(1+3*sd):px*(1-3*sd);
    const lev=cfg.lev||20; const risk=es?es.riskUsd:bot.bal*cfg.risk; const notional=risk/sd; const margin=notional/lev;
    if(margin+marginUsed()>bot.bal*0.95){ log("skip",x.sym,`Teminat yetmiyor: ${fmtB(margin)} gerekli, kullanılabilir ${fmtB(Math.max(0,bot.bal*0.95-marginUsed()))}.`); return false; }
    const fill=isL?px*(1+cfg.slip):px*(1-cfg.slip); const qty=notional/fill; const fee=notional*cfg.feeTaker; bot.bal-=fee; day().opens++;
    const votes=x.com.agents.map(a=>`${a.name} ${a.v>0?"+":""}${fx(a.v,1)}`); const now=Date.now();
    const p={id:x.sym+"-"+now,sym:x.sym,dir:x.dir,model:"KOMİTE",grade:x.grade,entry:fill,entry0:fill,px0:px,stop,t1,t2,rr1:1.5,rr2:x.com.plan?x.com.plan.rr2:3,lev,notional,margin,risk,risk0:Math.abs(fill-stop),stop0:stop,qty,qty0:qty,fees:fee,openT:now,expiresAt:now+((x.com.plan&&x.com.plan.holdH)||cfg.holdH)*3600e3,stage:"open",hi:fill,lo:fill,realized:0,score:x.score,yes:x.yes,votes,
      scan:bot.scanId,agents:compactAgents(x.com.agents),feat:x.com.feat||null,row:rowFeat(x.row),talk:x.com.talk,exits:[],reviews:0,
      stages:es?es.stages:null,warn:es?es.warn:0,quality:es?es.grade:null,mode:es?es.gs.mode:null,freed:!!x.freed,decs:[],xs:[],labHold:!!(x.com.plan&&x.com.plan.holdH)};
    bot.positions.push(p);
    log("fill",x.sym,`MASA ${isL?"LONG":"SHORT"} · puan ${ptsT(x.score)} · ${x.yes}/${E.DESK.length} evet · not ${p.quality||"—"}${x.freed?" · yer açılarak":""} · market ${fmtP(fill)} · stop ${fmtP(stop)} (${fx(sd*100,2)}%) · 1,5R ${fmtP(t1)} · 3R ${fmtP(t2)} · ${lev}x · pozisyon ${fmtB(notional)} · risk ${fmtB(risk)}. Oylar: ${votes.join(", ")}.${es?" Aşamalar: "+E.stagesTxt(es):""}`,
      {id:p.id,dir:p.dir,px,fill,stop,t1,t2,sd:r4(sd),notional:r4(notional),margin:r4(margin),risk:r4(risk),score:x.score,yes:x.yes,agents:p.agents,feat:p.feat,stages:p.stages,warn:p.warn,quality:p.quality,mode:p.mode,freed:p.freed});
    save(); opt.onPositions&&opt.onPositions(); return true;
  }

  /* --- karar döngüsü: botDecide (komite) ile aynı; reason "scan" ise tüm oylar JSONL'ye --- */
  async function decide(rows,reason,freshPx){
    const d=day(); const now=Date.now(); const cfg=bot.cfg;
    const c=rows.length?candidates(rows):[];
    if(reason==="scan"&&opt.votes!=="none"){ for(const x of c) if(opt.votes==="all"||x.go||(opt.votes==="deep"&&(x.row.deep||x.score>=cfg.threshold-0.15))) write('votes',voteRec(x,now,bot.scanId)); }
    if(d.opens>=cfg.maxOpens){ if(reason==="scan") log("skip","",`Bugün ${d.opens}/${cfg.maxOpens} işlem açıldı: gün kapalı.`); return; }
    if(d.losses>=cfg.maxLosses){ if(reason==="scan") log("skip","",`Bugün ${d.losses}/${cfg.maxLosses} kayıp: gün kapalı.`); return; }
    if(!rows.length){ if(reason==="scan") log("skip","","Tarama boş: Binance'e ulaşılamıyor ya da ilk tur bitmedi."); return; }
    goalWatch(); const go=c.filter(x=>x.go);
    if(!go.length){ if(reason==="scan") log("skip","",`Komite ${rows.length} coin × 2 yön puanladı; eşik ${pts(thr())} ve ${minYes()}/${E.DESK.length} oyu sağlayan yok. En iyi: ${c.slice(0,3).map(x=>x.sym.replace("USDT","")+" "+(x.dir==="long"?"L":"S")+" "+pts(x.score)+(x.veto?" (veto)":"")).join(", ")||"—"}.`); save(); return; }
    // aşamalı giriş: rejim → kalite → bütçe → korelasyon → son oy; yer yoksa açıktakilerden kâr alıp yer açma
    let opened=0, shown=0; const seen=new Set(); const fails={};
    for(const x of go){ if(day().opens>=cfg.maxOpens) break; if(seen.has(x.sym)||has(x.sym)) continue; seen.add(x.sym);
      let es=E.entryStages(x,ctxOf());
      write('events',{t:Date.now(),type:'stages',sym:x.sym,dir:x.dir,score:x.score,ok:es.ok,need:r4(es.need),slot:es.slot,warn:es.warn,quality:es.grade,mode:es.gs.mode,risk:r4(es.riskUsd),stages:es.stages,scan:bot.scanId});
      if(!es.ok){ const f=es.stages.find(z=>z.st==="fail")||es.stages[es.stages.length-1]; fails[f.k]=(fails[f.k]||0)+1; if(reason==="scan"&&shown++<3) log("skip",x.sym,`${x.dir} · ${f.who}: ${f.txt}.`,{stage:f.k}); continue; }
      if(es.need>0||es.slot){ const fp=E.freePlan(x,es,ctxOf());
        if(!fp){ fails["teminat"]=(fails["teminat"]||0)+1; if(reason==="scan"&&shown++<3) log("skip",x.sym,`${x.dir} · Can: ${es.slot?`${bot.positions.length}/${cfg.maxPos} yer dolu`:`teminat ${fmtB(es.margin)} gerekli, boş ${fmtB(Math.max(0,es.free))}`}; yer açmaya değecek kârlı ya da sönmüş pozisyon yok (yeni kurulum puanı ${pts(x.score)}).`); continue; }
        for(const o of fp){ const p=o.p; const xp=mk(p.sym); if(!(xp>0)||!bot.positions.includes(p)) continue; E.deskNote(p,o.kind,xp,o.part,Date.now()); log("desk",p.sym,`Can: ${o.why}.`,{id:p.id,dec:o.kind,part:o.part,for:x.sym});
          closeAt(p,o.part,p.dir==="long"?xp*(1-cfg.slip):xp*(1+cfg.slip),{k:"desk",dec:o.kind,t:`Masa kararı · ${E.DEC_KIND[o.kind].toLowerCase()}`},true); }
        es=E.entryStages(x,ctxOf()); if(!es.ok||es.need>0||es.slot){ log("skip",x.sym,"Yer açıldı ama yine de sığmadı (fiyat oynadı)."); continue; } x.freed=true; }
      let px=rt.px[x.sym]; try{ const fp=await freshPx(x.sym); if(fp>0) px=fp; }catch(e){} if(!(px>0)) px=x.row.px;
      if(openMarket(x,px,es)) opened++; }
    if(!opened&&reason==="scan") log("skip","",`Komite ${go.length} kuruluma onay verdi; aşamalardan geçen olmadı (${Object.entries(fails).map(([k,n])=>k+" "+n).join(", ")||"—"}).`,{fails});
    save();
  }

  /* --- kapanışlar --- */
  function closePart(p,part,price,why,taker){
    const cfg=bot.cfg; const isL=p.dir==="long"; const q=p.qty*part; if(!(q>0)) return 0;
    const pnl=(isL?(price-p.entry):(p.entry-price))*q; const fee=q*price*(taker?cfg.feeTaker:cfg.feeMaker);
    bot.bal+=pnl-fee; p.realized+=pnl-fee; p.fees+=fee; p.qty-=q; p.notional=p.qty*p.entry; p.margin=p.notional/p.lev;
    p.exits.push({t:Date.now(),k:why.k,part,price,pnl:r4(pnl-fee),r:r4((pnl-fee)/p.risk)}); E.deskFill(p,why.dec||why.k,price,q,Date.now());
    log(why.k,p.sym,`${why.t} ${fmtP(price)} · %${Math.round(part*100)} kapandı · ${pnl-fee>=0?"+":""}${fmtB(pnl-fee)}.`,{id:p.id,price,part,pnl:r4(pnl-fee)});
    return pnl-fee;
  }
  function closePos(p){
    const now=Date.now(); const r=p.realized/p.risk; const risk0=p.risk0||1;
    const peakR=(p.dir==="long"?(p.hi-p.entry0):(p.entry0-p.lo))/risk0, maeR=(p.dir==="long"?(p.lo-p.entry0):(p.entry0-p.hi))/risk0;
    const rec={sym:p.sym,dir:p.dir,model:p.model,grade:p.grade,lev:p.lev,entry:p.entry,openT:p.openT,closeT:now,pnl:p.realized,fees:p.fees,risk:p.risk,r,score:p.score,
      exits:(p.exits||[]).map(x=>x.k),mfe:r4(peakR),mae:r4(-maeR),snap:p.agents?{v:Object.fromEntries(Object.entries(p.agents).map(([id,a])=>[id,a[0]])),sd:r4(p.risk0/p.entry0),score:p.score,yes:p.yes,warn:p.warn||0,quality:p.quality||null,mode:p.mode||null}:undefined,
      decs:p.decs&&p.decs.length?p.decs:undefined,xs:p.xs&&p.xs.length?p.xs:undefined,r0:p.risk0,freed:!!p.freed};
    bot.trades.push(rec); if(p.realized<0) day().losses++; bot.cool[p.sym]=now+bot.cfg.cooldownMin*60e3;
    write('trades',{t:now,id:p.id,sym:p.sym,dir:p.dir,openT:p.openT,closeT:now,holdH:r4((now-p.openT)/3600e3),entry0:p.entry0,entry:p.entry,stop0:p.stop0,t1:p.t1,t2:p.t2,sd:r4(p.risk0/p.entry0),lev:p.lev,
      pnl:r4(p.realized),fees:r4(p.fees),r:r4(r),peakR:r4(peakR),maeR:r4(maeR),stage:p.stage,added:!!p.added,reduced:!!p.reduced,locked:!!p.locked,reviews:p.reviews||0,exits:p.exits,
      score:p.score,yes:p.yes,scan:p.scan,agents:p.agents,feat:p.feat,row:p.row,talk:p.talk,bal:r4(bot.bal),stages:p.stages||null,warn:p.warn||0,quality:p.quality||null,mode:p.mode||null,freed:!!p.freed,decs:p.decs||[]},false);
    log("close",p.sym,`İşlem kapandı: ${p.realized>=0?"+":""}${fmtB(p.realized)} (${r>=0?"+":""}${fx(r,2)}R) · bakiye ${fmtB(bot.bal)} · ROI ${E.pct((bot.bal/bot.start-1)*100,1)}.`,{id:p.id,r:r4(r),pnl:r4(p.realized),bal:r4(bot.bal)});
    bot.positions=bot.positions.filter(x=>x!==p); bot.eq.push({t:now,v:bot.bal}); audit(rec);
    if(bot.bal>=E.goalState(bot,bot.cfg).goal&&!bot.goalHit){ bot.goalHit=now; log("goal","",`Hedef tamam: bakiye ${fmtB(bot.bal)}. Bot korumalı modda (risk yarıya) devam ediyor.`); }
    save(); opt.onPositions&&opt.onPositions(); opt.onClose&&opt.onClose();
  }
  function closeAt(p,part,price,why,taker){ const v=closePart(p,part,price,why,taker); if(p.qty<=1e-12||part>=1){ p.qty=0; closePos(p); } return v; }

  /* --- fiyat adımı: botOnPrice → paperStep --- */
  function onPrice(sym,px,T){
    if(!(px>0)) return; rt.px[sym]=px; const now=T||Date.now(); bot.lastTick=Date.now();
    for(const p of [...bot.positions]){ if(p.sym!==sym) continue;
      const acts=E.paperStep(p,px,now,bot.cfg); let fin=false;
      for(const a of acts){ if(a.k==="move"){ log("move",p.sym,a.t,{id:p.id}); continue; } closePart(p,a.part,a.price,{k:a.k,t:a.t},a.taker); if(a.final){ fin=true; break; } }
      if(fin){ p.qty=0; closePos(p); } else if(acts.length) save(); }
    if(bot.positions.length&&!bot.goalHit) goalWatch();
    const last=bot.eq[bot.eq.length-1]; if(!last||Date.now()-last.t>60e3) bot.eq.push({t:Date.now(),v:equity()});
  }
  function funding(sym,rate){ for(const p of bot.positions){ if(p.sym!==sym) continue; const fee=p.notional*rate*(p.dir==="long"?1:-1); bot.bal-=fee; p.fees+=fee; log("fund",p.sym,`Fonlama ${fx(rate*100,4)}% → ${fee>=0?"ödendi":"alındı"} ${fmtB(Math.abs(fee))}.`,{id:p.id,rate,fee:r4(fee)}); } save(); }

  /* --- traderların pozisyon yönetimi: botManage ile aynı; her gözden geçirme JSONL'ye --- */
  async function manage(){
    if(!bot.positions.length||rt.managing) return; rt.managing=true; const cfg=bot.cfg; const LD=E.ld;
    try{ for(const p of [...bot.positions]){ if(!bot.positions.includes(p)) continue; if(Date.now()-(p.lastMan||p.openT)<120e3) continue; p.lastMan=Date.now();
      let A,c24=0; try{ const [t24,prem]=await Promise.all([E.j(`/fapi/v1/ticker/24hr?symbol=${p.sym}`),E.j(`/fapi/v1/premiumIndex?symbol=${p.sym}`)]); const r=await E.scanOne({t24,prem}); if(!r) continue; A=E.analyze(r._f,r._s); c24=+t24.priceChangePercent; }catch(e){ continue; }
      if(!bot.positions.includes(p)) continue;
      const isL=p.dir==="long"; const px=mk(p.sym)||A.px; const risk0=p.risk0||Math.abs(p.entry-(p.stop0||p.stop)); if(!(risk0>0)) continue;
      const rv=E.positionReview(A,E.posCtx(p,liqPx(p)),[],c24,{sym:p.sym});
      const rNow=rv.rNow, peakR=rv.peakR, held=rv.held; const medHold=(LD&&LD.profile&&isFinite(LD.profile.medHold))?LD.profile.medHold:cfg.holdH/2;
      const against=rv.views.filter(a=>a.w&&a.v<-0.15).map(a=>a.name).join(", ")||"kimse"; const sayD=(who,t)=>log("desk",p.sym,`${who}: ${t}`,{id:p.id});
      p.lastReview={t:Date.now(),verdict:rv.verdict,hold:rv.hold,score:rv.score,oppScore:rv.oppScore,rNow:+rNow.toFixed(2),views:rv.views.map(x=>({id:x.id,name:x.name,v:x.v,c:x.c,act:x.act,abst:x.abst,txt:x.txt})),llm:p.lastReview&&p.lastReview.llm}; p.reviews=(p.reviews||0)+1;
      E.fcPosNote(p.id,p.sym,p.dir,A,rv); E.lmdPosAsk(p,rv,A,c24);
      const taker=isL?px*(1-cfg.slip):px*(1+cfg.slip);
      // dinamik hedef/stop (goal.js): başabaş, dirence göre hedef 1, koşucuyu uzat/kısalt, yapısal stop, 200 $'a taşıyan hedef 1'de tamamı
      const adj=E.deskAdjust(p,{cfg,px,rv,lvl:isL?(A.R&&A.R[0]):(A.S&&A.S[0]),thr:thr(),gs:gsNow(),aud:A0()});
      for(const a of adj){ const d=E.deskApply(p,a,px,Date.now()); sayD(a.who,a.txt); write('events',{t:Date.now(),type:'dyn',sym:p.sym,id:p.id,dec:a.k,from:d.from,to:d.to,rAt:d.rAt,who:a.who,text:a.txt}); }
      if(adj.length) save();
      const act=E.posAct(p,rv,{thr:thr(),medHold,lockEarly:!!(A0()&&A0().lockEarly)});
      write('reviews',{t:Date.now(),id:p.id,sym:p.sym,dir:p.dir,px,rNow:r4(rNow),peakR:r4(peakR),heldH:r4(held),stage:p.stage,verdict:rv.verdict,hold:rv.hold,score:rv.score,oppScore:rv.oppScore,act,adj:adj.map(a=>a.k),agents:compactAgents(rv.agents),views:Object.fromEntries(rv.views.map(x=>[x.id,x.abst?null:[x.v,x.c,x.act]])),tpShare:r4(rv.tpShare),exitShare:r4(rv.exitShare),liqAtr:r4(rv.liqAtr)});
      if(opt.onReview) opt.onReview(p,rv,A,c24);
      if(act==="exit"){ sayD("Can",`masa pozisyonu bırakıyor (tutma puanı ${pts(rv.hold)}, ters yön ${pts(rv.oppScore)}; karşı: ${against}). ${rNow>=0?"Kârla":"Zararla"} kapatıyorum, ${fx(rNow,2)}R.`); closeAt(p,1,taker,{k:"desk",t:"Masa kararı · çık"},true); continue; }
      if(act==="reduce"){ p.reduced=true; sayD("Can",`analistler ikna değil (karşı: ${against}); yarısını kapatıyorum${rNow>0.5?", stop girişe":""}.`); closeAt(p,0.5,taker,{k:"desk",t:"Masa kararı · azalt"},true); if(bot.positions.includes(p)&&rNow>0.5&&(isL?p.entry>p.stop:p.entry<p.stop)) p.stop=p.entry; save(); continue; }
      if(act==="time"){ sayD("Onur",`${fx(held,1)} saattir ${rNow>=0?"+":""}${fx(rNow,2)}R'de sürünüyor; liderlerin medyan tutuşu ${fx(medHold,1)} saat. Zaman maliyeti var.`); sayD("Can",`Kabul, süreç uzadı ve masa ikna değil (tutma ${pts(rv.hold)}); kapatıp sermayeyi boşa çıkarıyorum.`); closeAt(p,1,taker,{k:"desk",t:"Masa kararı · süre doldu"},true); continue; }
      if(act==="lock"){ p.locked=true; const tpBy=rv.views.filter(x=>x.w&&x.act==="kâr al"); if(rv.takeProfit) sayD(tpBy.map(x=>x.name).join(", "),`${fx(rNow,2)}R kârdayız, kâr al diyoruz: ${tpBy.map(x=>x.txt).join(" · ")}.`); else sayD("Baran",`${fx(peakR,1)}R görüp ${fx(rNow,1)}R'ye geri geldi, momentum söndü.`); sayD("Can","Yarısını alıyorum, stop girişe; kalan koşsun."); closeAt(p,0.5,taker,{k:"desk",t:"Masa kararı · kârı kilitle"},true); if(bot.positions.includes(p)){ p.stop=p.entry; p.stage="tp1"; } save(); continue; }
      if(act==="add"){ const addQty=p.qty0*0.5; const addNotional=addQty*px; const addMargin=addNotional/p.lev;
        if(addMargin+marginUsed()<=bot.bal*0.95){ p.added=true; const fill=isL?px*(1+cfg.slip):px*(1-cfg.slip); const fee=addNotional*cfg.feeTaker; bot.bal-=fee; p.fees+=fee;
          const newQty=p.qty+addQty; p.entry=(p.entry*p.qty+fill*addQty)/newQty; p.qty=newQty; p.notional=p.qty*p.entry; p.margin=p.notional/p.lev;
          sayD("Baran",`hedef 1 alındı, masa hâlâ tut diyor (puan ${pts(rv.score)}); yarım boy ekliyorum.`); sayD("Can",`Onay: ekleme bir kez, yarım boy. Ortalama giriş ${fmtP(p.entry)}, stop ${fmtP(p.stop)}.`);
          log("add",p.sym,`Ekleme ${fmtP(fill)} · ${fmtB(addNotional)} · toplam ${fmtB(p.notional)} · teminat ${fmtB(p.margin)}.`,{id:p.id,fill,addNotional:r4(addNotional)}); save(); continue; } }
      if(rv.verdict==="tut"&&!p.heldNoted){ p.heldNoted=true; sayD("Can",`masa tut diyor (tutma puanı ${pts(rv.hold)}, ${rv.views.filter(a=>a.w&&a.v>0.15).length}/${rv.views.filter(a=>a.w).length} destek). Plan aynen: stop ${fmtP(p.stop)}, hedef ${fmtP(p.t1)} / ${fmtP(p.t2)}.`); }
    } } finally{ rt.managing=false; save(); }
  }

  audit(null);
  return {bot,rt,log,save,audit,equity,goal:gsNow,goalWatch,decide,onPrice,funding,manage,openMarket,closeAt,candidates,syms:()=>Array.from(new Set(bot.positions.map(p=>p.sym))).sort()};
}
module.exports={createBot};
