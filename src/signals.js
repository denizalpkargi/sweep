/* ---- sinyal günlüğü ve canlı isabet (12 Ekim 2026) ----
   Kullanıcı: "tarayıcının sinyallerini nasıl daha isabetli hale getireceğiz?" → karar kartında "Ölç + market + stop".
   Akış (st-feed) yalnız son 60 sinyali tutuyordu; gerçek işlemler sinyale bağlanamıyor, isabet ölçülemiyordu.
   Her yeni sinyal burada kalıcı kayda girer (localStorage["st-sig"], Electron'da logs/sinyal-*.jsonl) ve 15 dk mumlarla
   kendiliğinden sonuçlanır: giriş sinyalden sonraki ilk 15 dk mumun VWAP'ı (market giriş; kapanıştan kapanışa ölçülmez,
   bkz. Denklem araştırması), çıkış 4 / 12 / 24 sa sonraki mumun VWAP'ı, maliyet gidiş-dönüş %0,16 (taker + kayma).
   Stoplu sonuç: 24 saat içinde önce stop → −1R − maliyet, yoksa 24 sa getirisi ÷ stop uzaklığı. Aynı mumda stop ve +1R → stop.
   Gölge etiketler (sinyali silmez, isabet kartında etiketli/etiketsiz ayrı sayılır): arşivde (tarayici-isabet 2026-10-12,
   40 coin, 1 yıl) iki yarıda da kötü çıkan AMD dilimleri — plan stopu < %0,91, süpürme MSS'ten ≤ 5 mum önce,
   fiyat 24 sa aralığın alt %21'inde, OTE dolumu MSS'ten > 11 mum sonra — ve masanın bulguları: Ozan'ın en kötü %30'u,
   pompa sonrası long (24 sa ≥ +%15), 7 günlük trende karşı giriş. 48 denemeden seçildiler; kanıt değil, burada ileriye sınanır. */
const SG_KEY="st-sig";
const SG_CFG={max:4000,keepD:45,hz:{h4:16,h12:48,h24:96},cost:0.0016,gapMs:45*6e4};
const SG_TAGS={tight:"dar stop",quick:"hızlı MSS",low24:"24 sa dipte",late:"geç dolum",ozan:"Ozan alt %30",pump:"pompa sonrası long",trend:"7 g trende karşı",ote:"OTE dönüşü"};
let SG=null;
function sgLoad(){ if(SG) return SG; try{ SG=JSON.parse(localStorage.getItem(SG_KEY)||"null"); }catch(e){} if(!SG||!Array.isArray(SG.items)) SG={items:[]}; return SG; }
function sgSave(){ try{ localStorage.setItem(SG_KEY,JSON.stringify(SG)); }catch(e){} }
function sgLog(ev,x){ try{ console.info("SWEEP · sinyal "+JSON.stringify({ev,...x})); }catch(e){} }
const sgVwap=c=>{ const v=c.v>0&&c.q>0?c.q/c.v:c.c; return v>=c.l&&v<=c.h?v:c.c; }; // bozuk hacimde kapanış (arşiv notu)
// satır başına bir kez: her kaynağın stopu ve gölge etiketleri
function sgFeat(A,dir,c24,sym){
  if(!A||!A.src||!A.src.k15L) return null; const isL=dir==="long", k=A.src.k15L, n=k.length; const out={};
  const com=[]; // tüm türlere ortak etiketler
  try{ const R=typeof rkScore==="function"&&sym?rkScore(sym,A):null; if(R&&isFinite(R.p)){ const p=isL?R.p:1-R.p; out.rk=+p.toFixed(3); if(p<0.3) com.push("ozan"); } }catch(e){}
  if(isL&&isFinite(c24)&&c24>=15) com.push("pump");
  try{ const r7=typeof r7dOf==="function"?r7dOf(A):null; if(isFinite(r7)){ out.r7=+((isL?1:-1)*r7).toFixed(4); if(out.r7<0) com.push("trend"); } }catch(e){}
  if(n>=96){ const w=k.slice(n-96); const hi=Math.max(...w.map(x=>x.h)), lo=Math.min(...w.map(x=>x.l)); if(hi>lo){ out.pos24=+((k[n-1].c-lo)/(hi-lo)).toFixed(2); } }
  out.com=com;
  const a=A.amd&&A.amd[dir];
  if(a&&a.sw!=null){ const tags=[]; let stop=a.stop; if(stop==null&&isFinite(a.ext)) stop=isL?a.ext*(1-0.0015):a.ext*(1+0.0015); if(stop==null&&isFinite(a.swPx)) stop=isL?a.swPx*(1-0.0015):a.swPx*(1+0.0015);
    if(a.mss!=null&&isFinite(a.entry)&&isFinite(a.stop)){ const sd0=Math.abs(a.entry-a.stop)/a.entry; if(sd0<0.0091) tags.push("tight"); if(a.mss-a.sw<=5) tags.push("quick"); if(a.touched!=null&&a.touched-a.mss>11) tags.push("late"); }
    if(isFinite(out.pos24)&&out.pos24<0.21) tags.push("low24");
    out.amd={stop:isFinite(stop)?stop:null,tags}; }
  const b=A.br&&A.br[dir]; if(b&&isFinite(b.stop)) out.br={stop:b.stop,tags:[]};
  const q=A.rs&&A.rs[dir]; if(q&&isFinite(q.stop)) out.rs={stop:q.stop,tags:[]};
  return out;
}
// tür → kaynak: breakout = Kurulum 2 kutusu, rejim = Kurulum 3, geri kalanı AMD dizisi
function sgPick(f,kind){ if(!f) return null; const src=kind==="breakout"?f.br:kind==="rejim"?f.rs:f.amd; const tags=[...(src?src.tags:[]),...(f.com||[])]; if(kind==="entry") tags.push("ote");
  return {stop:src?src.stop:null,tags:[...new Set(tags)],rk:f.rk,r7:f.r7,pos24:f.pos24}; }
function sgAdd(s,now){
  sgLoad(); now=now||Date.now(); const sig=s.sig||{}; const px=+s.px;
  const sd=isFinite(px)&&px>0&&isFinite(sig.stop)&&(s.dir==="long"?sig.stop<px:sig.stop>px)?Math.abs(px-sig.stop)/px:null;
  const x={id:s.sym+"|"+s.dir+"|"+s.kind+"|"+now,t:now,sym:s.sym,dir:s.dir,kind:s.kind,grade:s.grade||null,kz:s.kz||null,cons:s.cons||null,px:isFinite(px)?px:null,stop:sd?sig.stop:null,sd:sd?+sd.toFixed(5):null,tags:sig.tags||[],rk:sig.rk,r7:sig.r7,pos24:sig.pos24,st:"open"};
  SG.items.push(x); sgPrune(now); sgSave(); sgLog("new",x); return x;
}
function sgPrune(now){ const cut=now-SG_CFG.keepD*864e5; for(const x of SG.items) if(x.st==="open"&&now-x.t>3*864e5) x.st="gap"; /* coin bir daha taranmadı */ SG.items=SG.items.filter(x=>x.t>=cut); if(SG.items.length>SG_CFG.max) SG.items=SG.items.slice(-SG_CFG.max); }
// tarama satırı her geldiğinde: o coinin açık sinyallerini kapanmış 15 dk mumlarla ilerletir
function sgObserve(sym,k,now){
  sgLoad(); if(!k||!k.length) return 0; now=now||Date.now(); let ch=0;
  const closed=k.filter(c=>c.t+9e5<=now); if(!closed.length) return 0; const byT=new Map(closed.map(c=>[c.t,c]));
  for(const x of SG.items){ if(x.sym!==sym||x.st!=="open") continue; const sg=x.dir==="long"?1:-1;
    if(x.e==null){ const c=closed.find(c=>c.t>=x.t); if(!c){ if(now-x.t>864e5){ x.st="gap"; ch++; } continue; }
      if(c.t-x.t>SG_CFG.gapMs){ x.st="gap"; ch++; continue; } x.e=sgVwap(c); x.ei=c.t; x.last=c.t; x.mfe=0; x.mae=0; ch++; }
    for(let t=x.last+9e5;;t+=9e5){ const c=byT.get(t); if(!c){ if(closed[closed.length-1].t>t){ x.st="gap"; ch++; } break; }
      const i=(t-x.ei)/9e5; const hi=sg*(sg>0?c.h:c.l)/x.e-sg, lo=sg*(sg>0?c.l:c.h)/x.e-sg;
      if(i<=SG_CFG.hz.h24){ x.mfe=Math.max(x.mfe,hi); x.mae=Math.min(x.mae,lo);
        if(x.sd&&!x.first){ if(lo<=-x.sd) { x.first="stop"; x.fi=i; } else if(hi>=x.sd){ x.first="1R"; x.fi=i; } } }
      for(const [h,m] of Object.entries(SG_CFG.hz)) if(i===m) x[h]=+(sg*(sgVwap(c)/x.e-1)).toFixed(5);
      x.last=t; ch++;
      if(i>=SG_CFG.hz.h24){ x.st="done"; x.mfe=+x.mfe.toFixed(5); x.mae=+x.mae.toFixed(5); x.R=sgR(x); sgLog("done",x); break; } }
  }
  if(ch) sgSave(); return ch;
}
// market giriş + stop + 24 sa zaman çıkışı, maliyet dahil (R)
function sgR(x){ if(!x.sd||!isFinite(x.h24)) return null; if(x.first==="stop") return +(-1-SG_CFG.cost/x.sd).toFixed(3); return +((x.h24-SG_CFG.cost)/x.sd).toFixed(3); }
// isabet kartı için özet: {rows:[{key,kind,grade,n,win,h4,h12,h24,R,nR,hit1}], tags:[{tag,n,R,n0,R0}], open, gap}
function sgStats(items){
  items=items||sgLoad().items; const done=items.filter(x=>x.st==="done");
  const agg=a=>{ const m=f=>{ const v=a.map(f).filter(isFinite); return v.length?v.reduce((s,y)=>s+y,0)/v.length:NaN; }; const rr=a.filter(x=>isFinite(x.R));
    return {n:a.length,win:a.length?a.filter(x=>x.h24-SG_CFG.cost>0).length/a.length:NaN,h4:m(x=>x.h4-SG_CFG.cost),h12:m(x=>x.h12-SG_CFG.cost),h24:m(x=>x.h24-SG_CFG.cost),R:rr.length?rr.reduce((s,x)=>s+x.R,0)/rr.length:NaN,nR:rr.length,hit1:rr.length?rr.filter(x=>x.first==="1R").length/rr.length:NaN}; };
  const g={}; for(const x of done){ const k=x.kind+"|"+(x.grade||"-"); (g[k]=g[k]||[]).push(x); }
  const rows=Object.entries(g).map(([k,a])=>({key:k,kind:k.split("|")[0],grade:k.split("|")[1],...agg(a)})).sort((p,q)=>q.n-p.n);
  const tags=Object.keys(SG_TAGS).map(t=>{ const w=done.filter(x=>(x.tags||[]).includes(t)), wo=done.filter(x=>!(x.tags||[]).includes(t)); const A1=agg(w), A0=agg(wo); return {tag:t,n:A1.nR,R:A1.R,n0:A0.nR,R0:A0.R}; }).filter(x=>x.n);
  return {rows,tags,all:agg(done),open:items.filter(x=>x.st==="open").length,gap:items.filter(x=>x.st==="gap").length,first:items.length?items[0].t:null};
}
