/* ---------- Tahmin defteri: Masa'nın her görüşü bir tahmindir (6 Ekim 2026) ----------
   İşlem açılsın açılmasın, taranan her coinde masanın long ve short görüşü (puan, her üyenin oyu, kurulumun özellikleri) kaydedilir;
   coin başına yön başına saatte bir. 16 mum (4 saat) sonra aynı ölçüyle puanlanır: kayıt anındaki fiyattan önce +1 ATR (15 dk, 14) mi
   −1 ATR mi geldi (aynı mumda ikisi = yanlış; ikisi de yoksa süre doldu, yarım). Bu, tests/audit-sweeps.js'deki ölçünün aynısıdır;
   rastgele mumda isabet ≈ %48–50.
   Öğrenme: (1) üye ağırlığı: oy × sonuç (+1/0/−1) ortalaması, en az 60 tahminde, 150 tahminlik büzme ile 0,6–1,4 kat (Murat'ın işlem
   ağırlığıyla çarpılır). (2) ders: masanın evet dediği (puan ≥ 15/100) tahminlerde bir özellik (havuz türü, kill zone, aşama, günlük trend)
   ≥30 tahminde tabandan 8 puan kötüyse ve iki yarıda da tabanın altındaysa Murat o kalıba karşı oy verir (−0,4).
   Durum localStorage["st-fc"]; ui.js ve headless aynı kodu kullanır (rowOf → fcObserve). Gerçek emir yok. */
const FC_DEF={horizon:16,gapMin:60,maxPend:3000,maxDone:6000,minAgent:60,shrink:150,minLesson:30,lessonGap:0.08,leanYes:0.15};
const FC_KEY="st-fc"; let FC=null;
function fcLoad(){ if(FC) return FC; try{ FC=JSON.parse(localStorage.getItem(FC_KEY)||"null"); }catch(e){} if(!FC||!Array.isArray(FC.pend)) FC={pend:[],done:[],last:{},learn:null}; return FC; }
function fcSave(){ try{ localStorage.setItem(FC_KEY,JSON.stringify(FC)); }catch(e){} }
function fcReset(){ FC={pend:[],done:[],last:{},learn:null}; fcSave(); return FC; }
function fcAtr(k,i,n){ n=n||14; if(i<n) return NaN; let s=0; for(let j=i-n+1;j<=i;j++) s+=Math.max(k[j].h-k[j].l,Math.abs(k[j].h-k[j-1].c),Math.abs(k[j].l-k[j-1].c)); return s/n; }
const fcPool=nm=>nm?String(nm).replace(/ ×\d+| \(\d+ mum\)/,""):"havuz yok";
function fcFeat(c){ const f=c&&c.feat||{}; return {havuz:fcPool(f.pool),kz:f.kz?"kill zone":"kill zone dışı",asama:f.stage||"yok",trend:f.trend||"?"}; }
// sonucu bul: k = 15 dk mumlar (son mum açık olabilir), now = şimdi
function fcOutcome(f,k,now){ const M=9e5, H=FC_DEF.horizon; let i0=-1; for(let i=0;i<k.length;i++){ if(k[i].t>=f.t){ i0=i; break; } } if(i0<0) return null;
  const isL=f.dir==="long", up=isL?f.px+f.atr:f.px-f.atr, dn=isL?f.px-f.atr:f.px+f.atr;
  for(let j=i0;j<i0+H;j++){ const c=k[j]; if(!c||c.t+M>now) return null; if(isL? c.l<=dn : c.h>=dn) return {y:0,at:c.t}; if(isL? c.h>=up : c.l<=up) return {y:1,at:c.t}; }
  return {y:0.5,at:k[i0+H-1].t}; }
function fcResolve(sym,k,now){ const F=fcLoad(); let n=0; now=now||Date.now();
  F.pend=F.pend.filter(f=>{ if(f.sym!==sym) return true; const o=fcOutcome(f,k,now); if(!o){ return now-f.t<3*864e5; } f.y=o.y; f.at=o.at; F.done.push(f); n++; return false; });
  if(F.done.length>FC_DEF.maxDone) F.done.splice(0,F.done.length-FC_DEF.maxDone);
  return n; }
// tarama satırı (rowOf) her oluştuğunda: önce bu coinin bekleyen tahminlerini çöz, sonra yeni görüşü kaydet
function fcObserve(sym,A,com,now){
  try{ const F=fcLoad(); now=now||Date.now(); const k=A&&A.src&&A.src.k15L; if(!k||k.length<30||!com) return;
    const got=fcResolve(sym,k,now); let add=0; const li=k[k.length-1].t+9e5<=now?k.length-1:k.length-2; const atr=fcAtr(k,li); const px=A.px;
    if(isFinite(atr)&&atr>0&&px>0) for(const dir of ["long","short"]){ const c=com[dir]; if(!c) continue; const key=sym+"|"+dir; if(F.last[key]&&now-F.last[key]<FC_DEF.gapMin*6e4) continue;
      const v={}; for(const a of c.agents||[]) v[a.id]=a.v; const fa=c.feat&&c.feat.fac; if(fa) for(const id in fa) v["f:"+id]=fa[id]; /* faktörler (factors.js), yalnız koşuldayken */ F.pend.push({sym,dir,t:now,px,atr,score:c.score,go:c.decision==="giriş",yes:c.yes,v,f:fcFeat(c)}); F.last[key]=now; add++; }
    if(F.pend.length>FC_DEF.maxPend) F.pend.splice(0,F.pend.length-FC_DEF.maxPend);
    if(got) F.learn=fcLearn(F.done); if(got||add) fcSave(); }
  catch(e){}
}
const fcHit=a=>a.length?a.reduce((s,f)=>s+f.y,0)/a.length:null; // süre dolan yarım sayılır
function fcLearn(done){
  const D=done.filter(f=>f.y!=null); const out={n:D.length,at:Date.now(),base:fcHit(D),buckets:[],go:null,agents:{},lessons:[],dir:{}};
  if(!D.length) return out;
  for(const d of ["long","short"]){ const a=D.filter(f=>f.dir===d); out.dir[d]={n:a.length,hit:fcHit(a)}; }
  // puan kovaları 100 üzerinden 10'ar puan (eşik çevresinde ince): masanın puanı ile isabet arasındaki ilişki (kalibrasyon)
  const B=[[-9,-0.2,"< −20"],[-0.2,-0.1,"−20 … −10"],[-0.1,0,"−10 … 0"],[0,0.1,"0 … 10"],[0.1,0.2,"10 … 20"],[0.2,0.3,"20 … 30"],[0.3,0.4,"30 … 40"],[0.4,0.5,"40 … 50"],[0.5,9,"≥ 50"]];
  for(const [lo,hi,t] of B){ const a=D.filter(f=>f.score>=lo&&f.score<hi); out.buckets.push({t,n:a.length,hit:fcHit(a)}); }
  const G=D.filter(f=>f.go); out.go={n:G.length,hit:fcHit(G)};
  const ids=new Set(); for(const f of D) for(const id in f.v) ids.add(id);
  for(const id of ids){ let s=0,n=0; const yes=[],no=[]; for(const f of D){ const v=f.v[id]; if(!isFinite(v)) continue; s+=v*(2*f.y-1); n++; if(v>0.3) yes.push(f); else if(v<-0.3) no.push(f); }
    const skill=n?s/n:0; const sk=skill*n/(n+FC_DEF.shrink); out.agents[id]={n,skill:+skill.toFixed(3),yesN:yes.length,yesHit:fcHit(yes),noN:no.length,noHit:fcHit(no),m:n>=FC_DEF.minAgent?+clamp(1+3*sk,0.6,1.4).toFixed(2):1}; }
  // dersler: masanın evet dediği tahminlerde kötü çıkan özellikler (yön ayrı); iki yarı da tabanın altında olmalı
  const L=D.filter(f=>f.score>=FC_DEF.leanYes); const T=D.map(f=>f.t).sort((a,b)=>a-b); const MID=T[T.length>>1];
  for(const d of ["long","short"]){ const Ld=L.filter(f=>f.dir===d); const bd=out.dir[d].hit; if(bd==null) continue; const groups={};
    for(const f of Ld) for(const k in f.f){ const g=k+"="+f.f[k]; (groups[g]=groups[g]||[]).push(f); }
    for(const g in groups){ const a=groups[g]; if(a.length<FC_DEF.minLesson) continue; const h=fcHit(a), h1=fcHit(a.filter(f=>f.t<MID)), h2=fcHit(a.filter(f=>f.t>=MID));
      if(h<=bd-FC_DEF.lessonGap&&h1!=null&&h2!=null&&h1<bd&&h2<bd){ const [k,v]=g.split("="); out.lessons.push({dir:d,k,v,n:a.length,hit:h,base:bd}); } } }
  return out;
}
function fcMult(id){ const L=FC&&FC.learn; return L&&L.agents[id]?L.agents[id].m:1; }
// komite içinden: kurulum, tahmin defterindeki kötü kalıplardan birine uyuyor mu (Murat'ın oyu)
function fcVoteFor(dir,feat){ const L=(FC||fcLoad()).learn; if(!L||!L.lessons.length) return {hits:[],v:0,c:0};
  const f={havuz:fcPool(feat.pool),kz:feat.kz?"kill zone":"kill zone dışı",asama:feat.stage||"yok",trend:feat.trend||"?"};
  const hits=L.lessons.filter(l=>l.dir===dir&&f[l.k]===l.v); if(!hits.length) return {hits:[],v:0,c:0};
  return {hits,v:-0.4,c:Math.min(0.8,0.4+Math.max(...hits.map(h=>h.n))/200),txt:hits.map(h=>`${h.k} ${h.v}: ${h.n} tahminde isabet %${Math.round(h.hit*100)} (taban %${Math.round(h.base*100)})`).join(" · ")}; }
