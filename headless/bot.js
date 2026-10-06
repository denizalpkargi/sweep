// Ekransız kâğıt bot çekirdeği: ui.js'teki Masa (komite) modunun DOM'suz karşılığı.
// Karar ve çıkış kuralları ui.js ile aynıdır (botCandidatesCommittee, botOpenMarket, botDecide, botOnPrice → paperStep, botManage, botClosePos).
// Fark: her karar JSONL'ye özellikleriyle yazılır; giriş fiyatı açılıştan hemen önce REST'ten taze alınır (UI tarama anındaki fiyatı kullanabilir).
const fs=require('fs'); const path=require('path'); const {atomicWrite}=require('./store.js');

const r4=v=>isFinite(v)?+(+v).toFixed(4):null;
const compactAgents=ag=>{ const o={}; for(const a of ag||[]) o[a.id]=[a.v,a.c]; return o; };

function createBot(E, opt){
  const {dir,write,say}=opt; const file=path.join(dir,'bot.json');
  const fmtP=E.fmtP, fx=E.fx, fmtB=v=>(isFinite(v)?(+v).toFixed(2):"—")+" $";
  const bot={bal:100,start:100,startT:Date.now(),positions:[],trades:[],day:{key:null,opens:0,losses:0},cool:{},eq:[],lastTick:0,goalHit:null,scanId:0,cfg:{...E.BOT_CFG_DEF}};
  try{ const sv=JSON.parse(fs.readFileSync(file,'utf8')); Object.assign(bot,sv); bot.cfg={...E.BOT_CFG_DEF,...(sv.cfg||{})}; }catch(e){}
  if(opt.cfg) Object.assign(bot.cfg,opt.cfg);
  bot.cfg.mode="komite";
  const rt={px:{},mark:{},book:{},fund:{},lastTrade:{},lastMark:0,src:null,managing:false,saveT:null};

  function save(now){ if(now){ clearTimeout(rt.saveT); rt.saveT=null; try{ atomicWrite(file,JSON.stringify({...bot,eq:bot.eq.slice(-5000)})); }catch(e){ console.error('durum yazılamadı',e.message); } return; } if(!rt.saveT) rt.saveT=setTimeout(()=>save(true),2000); }
  function log(type,sym,text,extra){ const t=Date.now(); say(`${new Date(t).toISOString().slice(11,19)} ${type.padEnd(6)} ${(sym||"").padEnd(12)} ${text}`); write('events',{t,type,sym:sym||"",text,...(extra||{})}); }
  function day(){ const k=E.dayKey(Date.now()); if(bot.day.key!==k) bot.day={key:k,opens:0,losses:0}; return bot.day; }
  const pnlOf=(p,px)=>(p.dir==="long"?(px-p.entry):(p.entry-px))*p.qty;
  const mk=sym=>rt.mark[sym]||rt.px[sym];
  function equity(){ let eq=bot.bal; for(const p of bot.positions){ const px=mk(p.sym); if(px) eq+=pnlOf(p,px); } return eq; }
  const has=sym=>bot.positions.some(p=>p.sym===sym);
  const marginUsed=()=>bot.positions.reduce((a,p)=>a+p.margin,0);
  const liqPx=p=>{ const d=1/p.lev-0.005; return p.dir==="long"?p.entry*(1-d):p.entry*(1+d); };

  /* --- adaylar: botCandidatesCommittee ile aynı --- */
  function candidates(rows){
    const out=[]; const now=Date.now();
    for(const r of rows){ if(!r.com) continue;
      for(const d of ["long","short"]){ const c=r.com[d]; if(!c) continue;
        const held=has(r.s), cool=!!(bot.cool[r.s]&&now<bot.cool[r.s]);
        const go=!!c.plan&&c.score>=bot.cfg.threshold&&c.yes>=bot.cfg.minYes&&!c.veto&&!held&&!cool;
        out.push({sym:r.s,dir:d,row:r,com:c,go,held,cool,score:c.score,yes:c.yes,veto:c.veto,sd:c.plan?c.plan.sd:NaN,grade:c.score>=0.5?"A":c.score>=bot.cfg.threshold?"B":"C"}); } }
    return out.sort((a,b)=>b.score-a.score);
  }
  // satırın coin düzeyindeki alanları (yöne bağlı olanlar committee.feat içinde)
  const rowFeat=r=>({qv:r.qv,score:r.score,delta:isFinite(r.delta)?r.delta:null,deep:r.deep,fund:r4(r.fund),oi1h:r4(r.oi1h),volRel:r4(r.volRel),distR:r4(r.distR),distS:r4(r.distS),bo:r.bo||null,setup:r.setup||null,setupS:r.setupS||null});
  function voteRec(x,t,scanId){ const c=x.com; return {t,scan:scanId,sym:x.sym,dir:x.dir,go:x.go,held:x.held,cool:x.cool,decision:c.decision,score:c.score,yes:c.yes,no:c.no,veto:c.veto||null,sd:c.plan?r4(c.plan.sd):null,rr2:c.plan?c.plan.rr2:null,changed:c.changed,agents:compactAgents(c.agents),feat:c.feat||null,deep:!!x.row.deep,oi1h:r4(x.row.oi1h)}; }

  /* --- market giriş: botOpenMarket ile aynı --- */
  function openMarket(x,px){
    const cfg=bot.cfg; const isL=x.dir==="long"; if(!(px>0)||!(x.sd>0)) return false;
    const sd=x.sd; const stop=isL?px*(1-sd):px*(1+sd), t1=isL?px*(1+1.5*sd):px*(1-1.5*sd), t2=isL?px*(1+3*sd):px*(1-3*sd);
    const lev=cfg.lev||20; const risk=bot.bal*cfg.risk; const notional=risk/sd; const margin=notional/lev;
    if(margin+marginUsed()>bot.bal*0.95){ log("skip",x.sym,`Teminat yetmiyor: ${fmtB(margin)} gerekli, kullanılabilir ${fmtB(Math.max(0,bot.bal*0.95-marginUsed()))}.`); return false; }
    const fill=isL?px*(1+cfg.slip):px*(1-cfg.slip); const qty=notional/fill; const fee=notional*cfg.feeTaker; bot.bal-=fee; day().opens++;
    const votes=x.com.agents.map(a=>`${a.name} ${a.v>0?"+":""}${fx(a.v,1)}`); const now=Date.now();
    const p={id:x.sym+"-"+now,sym:x.sym,dir:x.dir,model:"KOMİTE",grade:x.grade,entry:fill,entry0:fill,px0:px,stop,t1,t2,rr1:1.5,rr2:x.com.plan?x.com.plan.rr2:3,lev,notional,margin,risk,risk0:Math.abs(fill-stop),stop0:stop,qty,qty0:qty,fees:fee,openT:now,expiresAt:now+cfg.holdH*3600e3,stage:"open",hi:fill,lo:fill,realized:0,score:x.score,yes:x.yes,votes,
      scan:bot.scanId,agents:compactAgents(x.com.agents),feat:x.com.feat||null,row:rowFeat(x.row),talk:x.com.talk,exits:[],reviews:0};
    bot.positions.push(p);
    log("fill",x.sym,`MASA ${isL?"LONG":"SHORT"} · puan ${fx(x.score,2)} · ${x.yes}/8 evet · market ${fmtP(fill)} · stop ${fmtP(stop)} (${fx(sd*100,2)}%) · 1,5R ${fmtP(t1)} · 3R ${fmtP(t2)} · ${lev}x · pozisyon ${fmtB(notional)} · risk ${fmtB(risk)}. Oylar: ${votes.join(", ")}.`,
      {id:p.id,dir:p.dir,px,fill,stop,t1,t2,sd:r4(sd),notional:r4(notional),margin:r4(margin),risk:r4(risk),score:x.score,yes:x.yes,agents:p.agents,feat:p.feat});
    save(); opt.onPositions&&opt.onPositions(); return true;
  }

  /* --- karar döngüsü: botDecide (komite) ile aynı; reason "scan" ise tüm oylar JSONL'ye --- */
  async function decide(rows,reason,freshPx){
    const d=day(); const now=Date.now(); const cfg=bot.cfg;
    const c=rows.length?candidates(rows):[];
    if(reason==="scan"&&opt.votes!=="none"){ for(const x of c) if(opt.votes==="all"||x.go||(opt.votes==="deep"&&(x.row.deep||x.score>=cfg.threshold-0.15))) write('votes',voteRec(x,now,bot.scanId)); }
    if(d.opens>=cfg.maxOpens){ if(reason==="scan") log("skip","",`Bugün ${d.opens}/${cfg.maxOpens} işlem açıldı: gün kapalı.`); return; }
    if(d.losses>=cfg.maxLosses){ if(reason==="scan") log("skip","",`Bugün ${d.losses}/${cfg.maxLosses} kayıp: gün kapalı.`); return; }
    const slots=cfg.maxPos-bot.positions.length; if(slots<=0) return;
    if(!rows.length){ if(reason==="scan") log("skip","","Tarama boş: Binance'e ulaşılamıyor ya da ilk tur bitmedi."); return; }
    const go=c.filter(x=>x.go);
    if(!go.length){ if(reason==="scan") log("skip","",`Komite ${rows.length} coin × 2 yön puanladı; eşik ${fx(cfg.threshold,2)} ve ${cfg.minYes}/8 oyu sağlayan yok. En iyi: ${c.slice(0,3).map(x=>x.sym.replace("USDT","")+" "+(x.dir==="long"?"L":"S")+" "+fx(x.score,2)+(x.veto?" (veto)":"")).join(", ")||"—"}.`); save(); return; }
    let opened=0; const seen=new Set();
    for(const x of go){ if(opened>=slots) break; if(seen.has(x.sym)||has(x.sym)) continue; seen.add(x.sym);
      let px=rt.px[x.sym]; try{ const fp=await freshPx(x.sym); if(fp>0) px=fp; }catch(e){} if(!(px>0)) px=x.row.px;
      if(openMarket(x,px)) opened++; }
    if(!opened&&reason==="scan") log("skip","",`Komite ${go.length} giriş onayladı ama teminat/slot yetmedi.`);
    save();
  }

  /* --- kapanışlar --- */
  function closePart(p,part,price,why,taker){
    const cfg=bot.cfg; const isL=p.dir==="long"; const q=p.qty*part; if(!(q>0)) return 0;
    const pnl=(isL?(price-p.entry):(p.entry-price))*q; const fee=q*price*(taker?cfg.feeTaker:cfg.feeMaker);
    bot.bal+=pnl-fee; p.realized+=pnl-fee; p.fees+=fee; p.qty-=q; p.notional=p.qty*p.entry; p.margin=p.notional/p.lev;
    p.exits.push({t:Date.now(),k:why.k,part,price,pnl:r4(pnl-fee),r:r4((pnl-fee)/p.risk)});
    log(why.k,p.sym,`${why.t} ${fmtP(price)} · %${Math.round(part*100)} kapandı · ${pnl-fee>=0?"+":""}${fmtB(pnl-fee)}.`,{id:p.id,price,part,pnl:r4(pnl-fee)});
    return pnl-fee;
  }
  function closePos(p){
    const now=Date.now(); const r=p.realized/p.risk; const risk0=p.risk0||1;
    const peakR=(p.dir==="long"?(p.hi-p.entry0):(p.entry0-p.lo))/risk0, maeR=(p.dir==="long"?(p.lo-p.entry0):(p.entry0-p.hi))/risk0;
    const rec={sym:p.sym,dir:p.dir,model:p.model,grade:p.grade,lev:p.lev,entry:p.entry,openT:p.openT,closeT:now,pnl:p.realized,fees:p.fees,r,score:p.score};
    bot.trades.push(rec); if(p.realized<0) day().losses++; bot.cool[p.sym]=now+bot.cfg.cooldownMin*60e3;
    write('trades',{t:now,id:p.id,sym:p.sym,dir:p.dir,openT:p.openT,closeT:now,holdH:r4((now-p.openT)/3600e3),entry0:p.entry0,entry:p.entry,stop0:p.stop0,t1:p.t1,t2:p.t2,sd:r4(p.risk0/p.entry0),lev:p.lev,
      pnl:r4(p.realized),fees:r4(p.fees),r:r4(r),peakR:r4(peakR),maeR:r4(maeR),stage:p.stage,added:!!p.added,reduced:!!p.reduced,locked:!!p.locked,reviews:p.reviews||0,exits:p.exits,
      score:p.score,yes:p.yes,scan:p.scan,agents:p.agents,feat:p.feat,row:p.row,talk:p.talk,bal:r4(bot.bal)},false);
    log("close",p.sym,`İşlem kapandı: ${p.realized>=0?"+":""}${fmtB(p.realized)} (${r>=0?"+":""}${fx(r,2)}R) · bakiye ${fmtB(bot.bal)} · ROI ${E.pct((bot.bal/bot.start-1)*100,1)}.`,{id:p.id,r:r4(r),pnl:r4(p.realized),bal:r4(bot.bal)});
    bot.positions=bot.positions.filter(x=>x!==p); bot.eq.push({t:now,v:bot.bal});
    if(bot.bal>=bot.start*2&&!bot.goalHit){ bot.goalHit=now; log("sys","",`Hedef tamam: bakiye ikiye katlandı (${fmtB(bot.bal)}). Bot devam ediyor.`); }
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
      const rv=E.positionReview(A,{sym:p.sym,dir:p.dir,entry:p.entry,liq:liqPx(p)},[],c24,{sym:p.sym});
      const rNow=(isL?(px-p.entry):(p.entry-px))/risk0; const peakR=(isL?(p.hi-p.entry):(p.entry-p.lo))/risk0; const held=(Date.now()-p.openT)/3600e3; const medHold=(LD&&LD.profile&&isFinite(LD.profile.medHold))?LD.profile.medHold:cfg.holdH/2;
      const ag=id=>rv.agents.find(a=>a.id===id)||{v:0}; const against=rv.agents.filter(a=>a.v<-0.15).map(a=>a.name).join(", ")||"kimse"; const sayD=(who,t)=>log("desk",p.sym,`${who}: ${t}`,{id:p.id});
      p.lastReview={t:Date.now(),verdict:rv.verdict,score:rv.score,oppScore:rv.oppScore,rNow:+rNow.toFixed(2)}; p.reviews=(p.reviews||0)+1;
      const taker=isL?px*(1-cfg.slip):px*(1+cfg.slip);
      let act="none";
      if(rv.verdict==="çık"){ act="exit"; }
      else if(rv.verdict==="azalt"&&!p.reduced){ act="reduce"; }
      else if(held>Math.max(2,medHold*1.5)&&rNow>-0.3&&rNow<0.5&&rv.score<cfg.threshold){ act="time"; }
      else if(p.stage==="open"&&peakR>=1&&peakR-rNow>=0.5&&ag("mom").v<0&&!p.locked){ act="lock"; }
      else if(p.stage==="tp1"&&!p.added&&rv.verdict==="tut"&&ag("mom").v>0.3&&rv.score>=cfg.threshold+0.1){ act="add"; }
      write('reviews',{t:Date.now(),id:p.id,sym:p.sym,dir:p.dir,px,rNow:r4(rNow),peakR:r4(peakR),heldH:r4(held),stage:p.stage,verdict:rv.verdict,score:rv.score,oppScore:rv.oppScore,act,agents:compactAgents(rv.agents),liqAtr:r4(rv.liqAtr)});
      if(act==="exit"){ sayD("Can",`masa karşı yöne döndü (puan ${fx(rv.score,2)}, ters yön ${fx(rv.oppScore,2)}; karşı: ${against}). ${rNow>=0?"Kârla":"Zararla"} kapatıyorum, ${fx(rNow,2)}R.`); closeAt(p,1,taker,{k:"desk",t:"Masa kararı · çık"},true); continue; }
      if(act==="reduce"){ p.reduced=true; sayD("Can",`analistler ikna değil (karşı: ${against}); yarısını kapatıyorum${rNow>0.5?", stop girişe":""}.`); closeAt(p,0.5,taker,{k:"desk",t:"Masa kararı · azalt"},true); if(bot.positions.includes(p)&&rNow>0.5&&(isL?p.entry>p.stop:p.entry<p.stop)) p.stop=p.entry; save(); continue; }
      if(act==="time"){ sayD("Onur",`${fx(held,1)} saattir ${rNow>=0?"+":""}${fx(rNow,2)}R'de sürünüyor; liderlerin medyan tutuşu ${fx(medHold,1)} saat. Zaman maliyeti var.`); sayD("Can",`Kabul, süreç uzadı ve masa ikna değil (${fx(rv.score,2)}); kapatıp sermayeyi boşa çıkarıyorum.`); closeAt(p,1,taker,{k:"desk",t:"Masa kararı · süre doldu"},true); continue; }
      if(act==="lock"){ p.locked=true; sayD("Baran",`${fx(peakR,1)}R görüp ${fx(rNow,1)}R'ye geri geldi, momentum söndü.`); sayD("Can","Yarısını alıyorum, stop girişe; kalan koşsun."); closeAt(p,0.5,taker,{k:"desk",t:"Masa kararı · kârı kilitle"},true); if(bot.positions.includes(p)){ p.stop=p.entry; p.stage="tp1"; } save(); continue; }
      if(act==="add"){ const addQty=p.qty0*0.5; const addNotional=addQty*px; const addMargin=addNotional/p.lev;
        if(addMargin+marginUsed()<=bot.bal*0.95){ p.added=true; const fill=isL?px*(1+cfg.slip):px*(1-cfg.slip); const fee=addNotional*cfg.feeTaker; bot.bal-=fee; p.fees+=fee;
          const newQty=p.qty+addQty; p.entry=(p.entry*p.qty+fill*addQty)/newQty; p.qty=newQty; p.notional=p.qty*p.entry; p.margin=p.notional/p.lev;
          sayD("Baran",`hedef 1 alındı, masa hâlâ tut diyor (puan ${fx(rv.score,2)}); yarım boy ekliyorum.`); sayD("Can",`Onay: ekleme bir kez, yarım boy. Ortalama giriş ${fmtP(p.entry)}, stop ${fmtP(p.stop)}.`);
          log("add",p.sym,`Ekleme ${fmtP(fill)} · ${fmtB(addNotional)} · toplam ${fmtB(p.notional)} · teminat ${fmtB(p.margin)}.`,{id:p.id,fill,addNotional:r4(addNotional)}); save(); continue; } }
      if(rv.verdict==="tut"&&!p.heldNoted){ p.heldNoted=true; sayD("Can",`masa tut diyor (puan ${fx(rv.score,2)}, ${rv.agents.filter(a=>a.v>0.15).length}/${rv.agents.length} evet). Plan aynen: stop ${fmtP(p.stop)}, hedef ${fmtP(p.t1)} / ${fmtP(p.t2)}.`); }
    } } finally{ rt.managing=false; save(); }
  }

  return {bot,rt,log,save,equity,decide,onPrice,funding,manage,openMarket,closeAt,candidates,syms:()=>Array.from(new Set(bot.positions.map(p=>p.sym))).sort()};
}
module.exports={createBot};
