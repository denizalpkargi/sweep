/* ---------- Liderler: Binance kopya trader lider portföyleri (herkese açık uç noktalar, salt okunur) ----------
   Kaynak: www.binance.com/bapi/futures/v1/friendly/future/copy-trade/ (liste, kapanmış pozisyonlar, emir geçmişi). Tarayıcı CORS'u izin vermez;
   masaüstü (Electron) uygulaması başlıkları düzeltir. Veri saatte bir yenilenir, localStorage["st-leaders"] içinde saklanır.
   Türetilenler: lider başına kazanma oranı, ortalama ROI, medyan tutuş, ekleme ve kısmi kapatma oranı; açık pozisyon tahmini (emir akışından net miktar);
   coin başına yön uzlaşısı (açık pozisyon ağırlık 2, son 72 saatte kapanan 1). Masada "Tolga · kopya trader araştırmacısı" bunu kullanır. */
const LD_BASE="https://www.binance.com/bapi/futures/v1/friendly/future/copy-trade/";
const ld={at:0,list:[],leaders:{},profile:null,sym:{},err:null,busy:false,prog:""};
try{ const sv=JSON.parse(localStorage.getItem("st-leaders")||"null"); if(sv&&sv.at){ ld.at=sv.at; ld.list=sv.list||[]; ld.leaders=sv.leaders||{}; ld.profile=sv.profile||null; ld.sym=sv.sym||{}; } }catch(e){}
function ldSave(){ try{ localStorage.setItem("st-leaders",JSON.stringify({at:ld.at,list:ld.list,leaders:ld.leaders,profile:ld.profile,sym:ld.sym})); }catch(e){} }
async function ldPost(path,body){
  let r; try{ r=await fetch(LD_BASE+path,{method:"POST",headers:{"Content-Type":"application/json","clienttype":"web","lang":"en"},body:JSON.stringify(body)}); }
  catch(e){ throw new Error("lider verisi tarayıcıdan çekilemiyor (CORS); masaüstü uygulamasında çalışır"); }
  if(!r.ok) throw new Error(path+" → HTTP "+r.status); const jj=await r.json(); if(jj.code!=="000000") throw new Error(path+" → "+(jj.message||jj.code)); return jj.data||{};
}
// bir liderin geçmişini sindir
function ldDigest(L,pos,orders){
  const closed=(pos||[]).filter(p=>p.closed&&p.opened).map(p=>({sym:p.symbol,dir:(p.side||"").toLowerCase()==="long"?"long":"short",open:+p.opened,close:+p.closed,hold:(+p.closed-+p.opened)/3.6e6,roi:+p.roi||0,pnl:+p.closingPnl||0,lev:+p.leverage||0,entry:+p.avgCost,exit:+p.avgClosePrice}));
  const n=closed.length; const wins=closed.filter(x=>x.pnl>0).length; const med=a=>{ if(!a.length) return NaN; const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
  // emirler: sembol+yön bazında koşan miktar → ekleme, kısmi kapatma, açık pozisyon tahmini
  const by={}; for(const o of [...(orders||[])].sort((a,b)=>+a.orderTime-+b.orderTime)){ const ps=(o.positionSide||"BOTH").toUpperCase(); const dir=ps==="SHORT"?"short":ps==="LONG"?"long":(o.side==="BUY"?"long":"short"); const opening=(dir==="long"&&o.side==="BUY")||(dir==="short"&&o.side==="SELL"); const k=o.symbol+"|"+dir; const g=by[k]=by[k]||{sym:o.symbol,dir,qty:0,cost:0,adds:0,partials:0,opens:0,last:0,since:0};
    const q=+o.executedQty||0; if(opening){ if(g.qty>1e-9) g.adds++; else { g.opens++; g.since=+o.orderTime; g.cost=0; } g.cost+=q*(+o.avgPrice||0); g.qty+=q; } else { const after=g.qty-q; if(after>1e-9*Math.max(1,g.qty)) g.partials++; g.qty=Math.max(0,after); if(g.qty<=1e-9){ g.qty=0; g.cost=0; } } g.last=+o.orderTime; }
  const groups=Object.values(by); const opensTot=groups.reduce((a,g)=>a+g.opens,0)||1; const addsTot=groups.reduce((a,g)=>a+g.adds,0), partTot=groups.reduce((a,g)=>a+g.partials,0);
  const open=groups.filter(g=>g.qty>0&&g.opens>0&&Date.now()-g.last<7*864e5).map(g=>({sym:g.sym,dir:g.dir,qty:g.qty,avg:g.qty?g.cost/g.qty:0,since:g.since||g.last,adds:g.adds}));
  return {id:L.id,nick:L.nick,n,wr:n?wins/n:NaN,avgRoi:n?closed.reduce((a,x)=>a+x.roi,0)/n:NaN,medHold:med(closed.map(x=>x.hold)),quick:n?closed.filter(x=>x.hold<1).length/n:NaN,avgLev:n?closed.reduce((a,x)=>a+x.lev,0)/n:NaN,shortShare:n?closed.filter(x=>x.dir==="short").length/n:NaN,addRate:addsTot/opensTot,partialRate:partTot/opensTot,recent:closed.filter(x=>Date.now()-x.close<72*3600e3).slice(0,20),open,at:Date.now()};
}
function ldProfile(){
  const L=Object.values(ld.leaders).filter(x=>x&&!x.err&&x.n>=5); if(!L.length) return null; const med=a=>{ const s=a.filter(isFinite).sort((x,y)=>x-y); return s.length?s[Math.floor(s.length/2)]:NaN; };
  return {n:L.length,medHold:med(L.map(x=>x.medHold)),wr:med(L.map(x=>x.wr)),avgRoi:med(L.map(x=>x.avgRoi)),addRate:med(L.map(x=>x.addRate)),partialRate:med(L.map(x=>x.partialRate)),quick:med(L.map(x=>x.quick)),avgLev:med(L.map(x=>x.avgLev)),shortShare:med(L.map(x=>x.shortShare))};
}
function ldSymbols(){
  const m={}; const bump=(sym,dir,w,nick)=>{ const s=m[sym]=m[sym]||{long:{n:0,w:0,leaders:[]},short:{n:0,w:0,leaders:[]}}; const g=s[dir]; g.n++; g.w+=w; if(nick&&!g.leaders.includes(nick)) g.leaders.push(nick); };
  for(const x of Object.values(ld.leaders)){ if(!x||x.err) continue;
    // hedge/grid tarzı (aynı coinde iki yön birden) uzlaşıya girmez
    const both=new Set(); const seen={}; for(const o of x.open||[]){ seen[o.sym]=seen[o.sym]||new Set(); seen[o.sym].add(o.dir); } for(const k in seen) if(seen[k].size>1) both.add(k);
    for(const o of x.open||[]) if(!both.has(o.sym)) bump(o.sym,o.dir,2,x.nick);
    for(const r of x.recent||[]) if(!both.has(r.sym)) bump(r.sym,r.dir,1,x.nick); }
  return m;
}
// yenile: en iyi 60 lider (90 gün ROI) → elek → 20 lider → geçmişleri
async function ldRefresh(force){
  if(ld.busy) return false; if(!force&&ld.at&&Date.now()-ld.at<3600e3) return false; ld.busy=true; ld.err=null; ld.prog="liste";
  try{
    let all=[]; for(let pg=1;pg<=3;pg++){ const d=await ldPost("home-page/query-list",{pageNumber:pg,pageSize:20,timeRange:"90D",dataType:"ROI",favoriteOnly:false,hideFull:false,nickname:"",order:"DESC",userAsset:0,portfolioType:"ALL"}); all=all.concat(d.list||[]); }
    const picked=all.filter(x=>+x.aum>=20000&&+x.currentCopyCount>=50&&+x.mdd<=60&&+x.winRate>=50).slice(0,20);
    ld.list=picked.map(x=>({id:String(x.leadPortfolioId),nick:x.nickname,roi:+x.roi,pnl:+x.pnl,aum:+x.aum,mdd:+x.mdd,wr:+x.winRate,copiers:+x.currentCopyCount,sharpe:x.sharpRatio!=null?+x.sharpRatio:null}));
    const keep={}; let i=0;
    for(const L of ld.list){ i++; ld.prog=`${i}/${ld.list.length} ${L.nick}`; if(typeof ldOnProgress==="function") ldOnProgress();
      try{ const [ph,oh]=await Promise.all([ldPost("lead-portfolio/position-history",{portfolioId:L.id,pageNumber:1,pageSize:50}),ldPost("lead-portfolio/order-history",{portfolioId:L.id,pageNumber:1,pageSize:100})]); keep[L.id]=ldDigest(L,ph.list||[],oh.list||[]); }
      catch(e){ keep[L.id]=ld.leaders[L.id]&&!ld.leaders[L.id].err?ld.leaders[L.id]:{id:L.id,nick:L.nick,err:e.message}; }
      await new Promise(r=>setTimeout(r,300)); }
    ld.leaders=keep; ld.profile=ldProfile(); ld.sym=ldSymbols(); ld.at=Date.now(); ld.prog=""; ldSave(); return true;
  }catch(e){ ld.err=e.message; ld.prog=""; return false; }
  finally{ ld.busy=false; if(typeof ldOnProgress==="function") ldOnProgress(); }
}
