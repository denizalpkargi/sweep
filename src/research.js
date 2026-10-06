/* ---------- Araştırma ekibi (Lab): kopya trader liderlerinin stratejilerini arka planda inceler ----------
   Ekip: Tolga (veri: lider geçmişini toplar, kalıcı saklar), Burak (faktörler ve aday stratejiler), Onur (aday stratejilerin ileriye dönük testi).
   1. Toplama: liderlerin kapanmış pozisyonları (position-history, ilk seferde 4 sayfa, sonra 6 saatte bir 1 sayfa) localStorage["st-lab"] içinde birikir;
      listeden düşen liderin geçmişi silinmez. En fazla LAB_CFG.maxTrades işlem (en yeniler).
   2. Zenginleştirme: her işlemin açılış anındaki piyasa durumu coin ve BTC 1 saatlik mumlarından çıkarılır (labFeat): seans, 1 sa trend, 24 sa aralıktaki yer,
      24 sa hareket, BTC 4 sa, süpürme sonrası mı, hacim. Sonuç kaldıraçsız fiyat hareketi / ATR (mATR) olarak ölçülür; böylece kaldıraç ve boy farkı karışmaz.
   3. Analiz (labAnalyze): her faktör değerinde ağırlıklı ortalama mATR ve kazanma (çok işlem yapan lider ağırlığı 25 işleme kısılır), zaman sırasına göre iki yarı;
      tekli ve ikili koşullardan aday stratejiler (iki yarıda da artı, ≥ minN işlem, ≥ minLeaders lider) ve kaçınılacak kalıplar (iki yarıda da eksi).
   4. İleri test: canlı taramada bir aday eşleşince gölge sinyal yazılır; adayın medyan tutuşu kadar sonra 1 saatlik mumla sonucu ölçülür (labEvalShadows).
      Durum: aday → izlemede → onaylı (≥20 ileri işlem, ort > 0) / zayıf (≥20, ort ≤ 0).
   5. Masa: Burak (id "lab") eşleşen adayla oy verir, tartışmada Baran'ı kovalamaya karşı uyarır, Kerem'e süpürme kanıtı verir, zaman stopunu önerir.
   Lider verisi yalnızca masaüstü uygulamasında çekilir (CORS); mumlar her yerde çalışır. */
const LAB_CFG={maxTrades:4000,firstPages:4,pageSize:50,harvestEveryH:6,minN:20,minLeaders:4,minHalf:6,klTtl:6*3600e3,shadowGapH:4,maxShadows:400,promoteN:20,clip:5,minLift:0.15};
const LAB_FEATS=[
  {k:"ses",name:"Seans",vals:{asya:"Asya 00–07",londra:"Londra 07–12",ny:"New York 12–20",gec:"Geç 20–24"}},
  {k:"tr",name:"1 sa trend",vals:{with:"lehte",against:"karşı",flat:"yatay"}},
  {k:"yer",name:"24 sa aralıkta yer",vals:{geri:"geri çekilmede",orta:"ortada",kova:"kovalama"}},
  {k:"har",name:"Coin 24 sa",vals:{lehte:"lehte > %3",notr:"±%3",aleyhte:"aleyhte > %3"}},
  {k:"btc",name:"BTC 4 sa",vals:{lehte:"lehte",yatay:"yatay",aleyhte:"aleyhte"}},
  {k:"sw",name:"Süpürme (6 sa)",vals:{var:"süpürme sonrası",yok:"süpürme yok"}},
  {k:"vol",name:"Hacim (3 sa)",vals:{yuksek:"yüksek",normal:"normal"}}];
const lab={trades:[],snaps:{},harvestAt:{},styles:{},factors:null,cands:[],avoid:[],fwd:{},shadows:[],notes:[],base:null,at:0,dirty:false,busy:false,prog:"",err:null,kl:{}};
try{ const sv=JSON.parse(localStorage.getItem("st-lab")||"null"); if(sv&&sv.v===1){ for(const k of ["trades","snaps","harvestAt","fwd","shadows","notes"]) if(sv[k]) lab[k]=sv[k]; lab.dirty=true;
  for(const x of lab.trades) if(x.f&&typeof x.f==="object"&&!x.mc) x.f=null; } }catch(e){} // 7 Ekim 2026 öncesi kayıtlar kopya ölçüsüyle yeniden zenginleşir
function labSave(){ try{ localStorage.setItem("st-lab",JSON.stringify({v:1,trades:lab.trades,snaps:lab.snaps,harvestAt:lab.harvestAt,fwd:lab.fwd,shadows:lab.shadows,notes:lab.notes.slice(-40)})); }catch(e){ lab.err="kayıt alanı doldu: "+e.message; } }
function labNote(who,text){ const last=lab.notes[lab.notes.length-1]; if(last&&last.text===text) return; lab.notes.push({t:Date.now(),who,text}); lab.notes=lab.notes.slice(-40); }
/* --- 1. toplama --- */
function labIngest(L,list){
  const have=new Set(lab.trades.map(x=>x.k)); let added=0;
  for(const p of list||[]){ if(!p||!p.closed||!p.opened||!p.symbol) continue; const dir=String(p.side||"").toLowerCase()==="long"?"long":"short"; const k=L.id+"|"+p.symbol+"|"+dir+"|"+(+p.opened);
    if(have.has(k)) continue; have.add(k); added++;
    lab.trades.push({k,lid:String(L.id),nick:L.nick,sym:p.symbol,dir,open:+p.opened,close:+p.closed,hold:(+p.closed-+p.opened)/3.6e6,lev:+p.leverage||0,roi:+p.roi||0,pnl:+p.closingPnl||0,entry:+p.avgCost||0,exit:+p.avgClosePrice||0,f:null}); }
  if(added){ lab.trades.sort((a,b)=>a.close-b.close); if(lab.trades.length>LAB_CFG.maxTrades) lab.trades=lab.trades.slice(-LAB_CFG.maxTrades); lab.dirty=true; }
  return added;
}
function labSnap(list){ const day=Math.floor(Date.now()/864e5); for(const L of list||[]){ const s=lab.snaps[L.id]=lab.snaps[L.id]||[]; if(s.length&&s[s.length-1].d===day) s.pop(); s.push({d:day,roi:L.roi,aum:L.aum,cop:L.copiers,mdd:L.mdd,nick:L.nick}); if(s.length>90) s.shift(); } }
async function labHarvest(maxLeaders){
  if(typeof ldPost!=="function"||typeof ld==="undefined"||!ld.list.length) return 0; let done=0,added=0;
  for(const L of ld.list){ if(done>=maxLeaders) break; const last=lab.harvestAt[L.id]||0; if(Date.now()-last<LAB_CFG.harvestEveryH*3600e3) continue;
    const pages=last?1:LAB_CFG.firstPages; done++; lab.prog=`geçmiş: ${L.nick}`;
    try{ for(let pg=1;pg<=pages;pg++){ const d=await ldPost("lead-portfolio/position-history",{portfolioId:L.id,pageNumber:pg,pageSize:LAB_CFG.pageSize}); const list=d.list||[]; added+=labIngest(L,list); if(list.length<LAB_CFG.pageSize) break; await new Promise(r=>setTimeout(r,400)); }
      lab.harvestAt[L.id]=Date.now(); }
    catch(e){ lab.err=e.message; break; } }
  return added;
}
/* --- 2. zenginleştirme: açılış anındaki piyasa (yalnızca açılıştan ÖNCE kapanmış mumlar) --- */
function labAgg1h(k15){ if(!k15||!k15.length) return null; const out=[]; let cur=null; for(const c of k15){ const t=Math.floor(c.t/36e5)*36e5; if(!cur||cur.t!==t){ if(cur) out.push(cur); cur={t,o:c.o,h:c.h,l:c.l,c:c.c,v:c.v,q:c.q,tb:c.tb,n:1}; } else { cur.h=Math.max(cur.h,c.h); cur.l=Math.min(cur.l,c.l); cur.c=c.c; cur.v+=c.v; cur.q+=c.q; cur.tb+=c.tb; cur.n++; } } if(cur) out.push(cur); return out; }
function labIdx(k,t){ let lo=0,hi=k.length-1,ans=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(k[m].t+36e5<=t){ ans=m; lo=m+1; } else hi=m-1; } return ans; }
function labFeat(k,b,t,dir){
  if(!k||k.length<60) return null; const i=labIdx(k,t); if(i<50) return null; if(t-k[i].t>3*36e5) return null; const isL=dir==="long"; const sg=isL?1:-1;
  const c=k[i].c; const atr=atrAt(k,i+1,14)/c; if(!(atr>0)) return null;
  const sma=(n)=>{ let s=0; for(let j=i-n+1;j<=i;j++) s+=k[j].c; return s/n; }; const s20=sma(20), s50=sma(50);
  const up=s20>s50&&c>s20, dn=s20<s50&&c<s20; const tr=up?(isL?"with":"against"):dn?(isL?"against":"with"):"flat";
  let hi=-Infinity,lo=Infinity; for(let j=i-23;j<=i;j++){ hi=Math.max(hi,k[j].h); lo=Math.min(lo,k[j].l); } const pos=hi>lo?(c-lo)/(hi-lo):0.5; const dp=isL?pos:1-pos;
  const yer=dp<0.34?"geri":dp>0.66?"kova":"orta";
  const ch=(c/k[i-24].c-1)*sg; const har=ch>0.03?"lehte":ch<-0.03?"aleyhte":"notr";
  let btc="yatay"; if(b&&b.length>10){ const bi=labIdx(b,t); if(bi>=4&&t-b[bi].t<=3*36e5){ const bc=(b[bi].c/b[bi-4].c-1)*sg; btc=bc>0.005?"lehte":bc<-0.005?"aleyhte":"yatay"; } }
  let sw="yok"; { let pe=isL?Infinity:-Infinity; for(let j=i-29;j<=i-6;j++) pe=isL?Math.min(pe,k[j].l):Math.max(pe,k[j].h); let ex=isL?Infinity:-Infinity; for(let j=i-5;j<=i;j++) ex=isL?Math.min(ex,k[j].l):Math.max(ex,k[j].h); if(isL?(ex<pe&&c>pe):(ex>pe&&c<pe)) sw="var"; }
  const qs=k.slice(i-47,i+1).map(x=>x.q).sort((x,y)=>x-y); const mq=qs[Math.floor(qs.length/2)]||0; const q3=(k[i].q+k[i-1].q+k[i-2].q)/3; const vol=mq>0&&q3/mq>1.5?"yuksek":"normal";
  const h=new Date(t).getUTCHours(); const ses=h<7?"asya":h<12?"londra":h<20?"ny":"gec";
  return {ses,tr,yer,har,btc,sw,vol,atr:+atr.toFixed(5)};
}
async function labKlines(sym){
  const c=lab.kl[sym]; if(c&&Date.now()-c.t<LAB_CFG.klTtl) return c.k;
  const raw=await opt(`/fapi/v1/klines?symbol=${sym}&interval=1h&limit=1500`,null); const k=raw&&raw.length?K(raw):null; lab.kl[sym]={t:Date.now(),k}; return k;
}
async function labEnrich(maxSyms){
  const todo={}; for(const x of lab.trades) if(x.f===null) (todo[x.sym]=todo[x.sym]||[]).push(x); const syms=Object.keys(todo); if(!syms.length) return 0;
  const b=await labKlines("BTCUSDT"); let n=0;
  for(const s of syms.slice(0,maxSyms)){ lab.prog=`mumlar: ${s}`; const k=await labKlines(s);
    for(const x of todo[s]){ if(!k){ x.f="x"; continue; } if(x.open<k[0].t+51*36e5){ x.f="old"; continue; } const f=labFeat(k,b,x.open,x.dir); x.f=f||"x"; if(f){ const sg=x.dir==="long"?1:-1; const cl=v=>isFinite(v)?+clamp(v/f.atr,-LAB_CFG.clip,LAB_CFG.clip).toFixed(3):NaN;
        // m: kopya ölçüsü = açılış saatinin kapanışında gir (bir saat içinde kopyala), liderin kapanış fiyatından çık. m0: liderin kendi sonucu (ortalama maliyetten; ortalama düşürme dahil)
        const ci=labIdx(k,x.open+36e5); const e1=ci>=0&&k[ci].t<=x.open?k[ci].c:NaN; x.m0=cl(x.entry>0&&x.exit>0?sg*(x.exit/x.entry-1):NaN); x.m=cl(e1>0&&x.exit>0?sg*(x.exit/e1-1):NaN); x.mc=1; n++; } } }
  if(n) lab.dirty=true; return n;
}
/* --- 3. analiz --- */
function labStat(rows,wOf){ let W=0,S=0,S2=0,win=0,n=0; const ls=new Set(); for(const x of rows){ const w=wOf(x); W+=w; S+=w*x.m; S2+=w*x.m*x.m; if(x.m>0) win+=w; n++; ls.add(x.lid); } const mean=W?S/W:NaN; const sd=W?Math.sqrt(Math.max(0,S2/W-mean*mean)):NaN; const neff=Math.min(n,W*1.5); const se=sd>0?sd/Math.sqrt(Math.max(1,neff)):NaN; return {n,w:+W.toFixed(1),leaders:ls.size,mean:+mean.toFixed(3),wr:W?+(win/W).toFixed(3):NaN,t:se>0?+(mean/se).toFixed(2):0,se}; }
function labCondTxt(conds){ return conds.map(([f,v])=>{ const F=LAB_FEATS.find(x=>x.k===f); return F.name+": "+F.vals[v]; }).join(" + "); }
function labMed(a){ const s=a.filter(isFinite).sort((x,y)=>x-y); return s.length?s[Math.floor(s.length/2)]:NaN; }
// ortak ölçü bağlamı: zenginleşmiş işlemler, lider ağırlığı, zaman ortası, istatistik (Burak ve Selim aynı ölçüyü kullanır)
function labCtx(){
  const T=lab.trades.filter(x=>x.f&&typeof x.f==="object"&&isFinite(x.m)); const perL={}; for(const x of T) perL[x.lid]=(perL[x.lid]||0)+1; const wOf=x=>Math.min(1,25/perL[x.lid]);
  const tMid=labMed(T.map(x=>x.open));
  const st=rows=>{ const s=labStat(rows,wOf); const a=rows.filter(x=>x.open<tMid), b=rows.filter(x=>x.open>=tMid); s.h1=a.length?labStat(a,wOf).mean:NaN; s.h2=b.length?labStat(b,wOf).mean:NaN; s.n1=a.length; s.n2=b.length; s.hold=+labMed(rows.map(x=>x.hold)).toFixed(2); s.lev=labMed(rows.map(x=>x.lev)); return s; };
  return {T,perL,wOf,tMid,st};
}
// bir kuralı (yön + koşullar) liderlerin geçmişinde ölç; aday kapıları labAnalyze ile aynı
function labTest(dir,conds,C){
  C=C||labCtx(); const rows=C.T.filter(x=>x.dir===dir&&conds.every(([f,v])=>x.f[f]===v)); if(!rows.length) return {n:0,leaders:0,mean:NaN,h1:NaN,h2:NaN,wr:NaN,t:0,tl:0,n1:0,n2:0,hold:NaN,lev:NaN,lift:NaN,good:false,bad:false};
  const s=C.st(rows); const base=C.st(C.T.filter(x=>x.dir===dir)); return labGate(s,base);
}
/* aday kapıları (7 Ekim 2026'dan beri tabana göre): liderlerin kapanmış işlemleri ortalama artıdır (hayatta kalma, ortalama düşürme), bu yüzden
   "artı mı" değil "aynı yöndeki tüm işlemlerden iyi mi" sorulur. İyi: ort > 0,1, taban üstü fark ≥ minLift, iki yarıda da kendi yarısının tabanı üstünde,
   farkın t'si ≥ 1,5, kopya kazanma ≥ %50. Kötü: fark ≤ −minLift, iki yarıda da taban altında, t ≤ −1,5. */
function labGate(s,base){
  s.lift=+(s.mean-base.mean).toFixed(3); s.l1=s.h1-base.h1; s.l2=s.h2-base.h2; s.tl=s.se>0?+(s.lift/s.se).toFixed(2):0;
  const enough=s.n>=LAB_CFG.minN&&s.leaders>=LAB_CFG.minLeaders&&s.n1>=LAB_CFG.minHalf&&s.n2>=LAB_CFG.minHalf;
  s.good=enough&&s.mean>0.1&&s.h1>0&&s.h2>0&&s.wr>=0.5&&s.lift>=LAB_CFG.minLift&&s.l1>0&&s.l2>0&&s.tl>=1.5;
  s.bad=enough&&s.lift<=-LAB_CFG.minLift&&s.l1<0&&s.l2<0&&s.tl<=-1.5; return s;
}
function labAnalyze(){
  const C=labCtx(); const {T,perL,st}=C; lab.at=Date.now(); lab.dirty=false;
  if(T.length<LAB_CFG.minN){ lab.base=null; lab.factors=null; lab.cands=[]; lab.avoid=[]; lab.styles={}; if(typeof selAfterAnalyze==="function") selAfterAnalyze(C); return; }
  lab.base={all:st(T),long:st(T.filter(x=>x.dir==="long")),short:st(T.filter(x=>x.dir==="short")),total:lab.trades.length,featured:T.length,leaders:Object.keys(perL).length,from:Math.min(...T.map(x=>x.open)),to:Math.max(...T.map(x=>x.close))};
  // faktör tablosu
  const factors=[]; for(const F of LAB_FEATS) for(const v of Object.keys(F.vals)) for(const d of ["long","short"]){ const rows=T.filter(x=>x.dir===d&&x.f[F.k]===v); if(rows.length) factors.push({f:F.k,v,dir:d,...st(rows)}); }
  lab.factors=factors;
  // aday stratejiler: tekli ve ikili koşullar, yön başına
  const conds=[]; for(const F of LAB_FEATS) for(const v of Object.keys(F.vals)) conds.push([F.k,v]);
  const evals=[]; const m={};
  for(const d of ["long","short"]){ const D=T.filter(x=>x.dir===d); const base=lab.base[d];
    const test=cs=>{ const rows=D.filter(x=>cs.every(([f,v])=>x.f[f]===v)); if(rows.length<LAB_CFG.minN) return null; const s=labGate(st(rows),base); if(s.leaders<LAB_CFG.minLeaders||s.n1<LAB_CFG.minHalf||s.n2<LAB_CFG.minHalf) return null; return {key:d+"|"+cs.map(c=>c.join("=")).join("&"),dir:d,conds:cs,name:labCondTxt(cs),...s}; };
    for(const c of conds){ const r=test([c]); if(r){ evals.push(r); m[r.key]=r; } }
    for(let i=0;i<conds.length;i++) for(let j=i+1;j<conds.length;j++){ if(conds[i][0]===conds[j][0]) continue; const r=test([conds[i],conds[j]]); if(!r) continue; const a=m[d+"|"+conds[i].join("=")], b=m[d+"|"+conds[j].join("=")];
      // ikili koşul yalnızca iki tekliden de belirgin iyiyse (ya da kötüyse) tutulur
      const better=(!a||r.mean>a.mean+0.1)&&(!b||r.mean>b.mean+0.1), worse=(!a||r.mean<a.mean-0.1)&&(!b||r.mean<b.mean-0.1); if(better||worse) evals.push(r); } }
  const good=evals.filter(r=>r.good).sort((a,b)=>b.tl-a.tl);
  const bad=evals.filter(r=>r.bad).sort((a,b)=>a.tl-b.tl);
  const pick=(arr,max)=>{ const out=[]; for(const r of arr){ if(out.length>=max) break; if(out.some(o=>o.dir===r.dir&&o.conds.length===1&&r.conds.some(c=>c.join("=")===o.conds[0].join("="))&&Math.abs(o.mean-r.mean)<0.15)) continue; out.push(r); } return out; };
  const prevTop=lab.cands[0]&&lab.cands[0].key; lab.cands=pick(good,8); lab.avoid=pick(bad,6);
  for(const c of lab.cands.concat(lab.avoid)) c.status=labStatus(c.key);
  // lider stilleri
  const styles={}; for(const lid of Object.keys(perL)){ const R=T.filter(x=>x.lid===lid); if(R.length<5) continue; const sh=(fn)=>R.filter(fn).length/R.length;
    const s={nick:R[R.length-1].nick,n:R.length,wr:R.filter(x=>x.pnl>0).length/R.length,mean:R.reduce((a,x)=>a+x.m,0)/R.length,hold:labMed(R.map(x=>x.hold)),lev:labMed(R.map(x=>x.lev)),longSh:sh(x=>x.dir==="long"),trendSh:sh(x=>x.f.tr==="with"),counterSh:sh(x=>x.f.tr==="against"),dipSh:sh(x=>x.f.yer==="geri"),chaseSh:sh(x=>x.f.yer==="kova"),swSh:sh(x=>x.f.sw==="var"),btcSh:sh(x=>x.f.btc==="lehte")};
    const tags=[]; tags.push(s.hold<1?"skalper":s.hold<12?"gün içi":"swing"); if(s.trendSh>=0.55) tags.push("trendci"); else if(s.counterSh>=0.45) tags.push("karşı-trend"); if(s.dipSh>=0.5) tags.push("geri çekilme alıcısı"); else if(s.chaseSh>=0.5) tags.push("kırılım/kovalama"); if(s.swSh>=0.3) tags.push("süpürme avcısı"); if(s.longSh>=0.75) tags.push("long ağırlıklı"); else if(s.longSh<=0.25) tags.push("short ağırlıklı"); if(s.btcSh>=0.6) tags.push("BTC'yi izler");
    s.tags=tags; styles[lid]=s; }
  lab.styles=styles;
  const top=lab.cands[0]; if(top&&top.key!==prevTop) labNote("Burak",`Yeni en güçlü aday: ${top.dir==="long"?"LONG":"SHORT"} · ${top.name} → ${top.n} işlem, ${top.leaders} lider, kazanma %${Math.round(top.wr*100)}, ort ${fx(top.mean,2)} ATR (yarılar ${fx(top.h1,2)} / ${fx(top.h2,2)}).`);
  if(lab.avoid[0]) labNote("Burak",`Kaçınılacak: ${lab.avoid[0].dir==="long"?"LONG":"SHORT"} · ${lab.avoid[0].name} → liderler burada ort ${fx(lab.avoid[0].mean,2)} ATR kaybediyor (${lab.avoid[0].n} işlem).`);
  if(typeof selAfterAnalyze==="function") selAfterAnalyze(C); // Selim'in hipotezleri yeni veriyle yeniden ölçülür, Kaan'ın kütüphanesi güncellenir
}
/* --- 4. ileri test --- */
function labStatus(key){ const f=lab.fwd[key]; if(!f||!f.n) return "aday"; if(f.n<LAB_CFG.promoteN) return "izlemede"; return f.sum/f.n>0?"onaylı":"zayıf"; }
const LAB_SW={aday:0.6,izlemede:0.7,"onaylı":1,"zayıf":0};
function labShadow(c,sym,dir,px,atr){
  const key=c.key; const now=Date.now(); if(lab.shadows.some(s=>s.key===key&&s.sym===sym&&now-s.t<LAB_CFG.shadowGapH*3600e3)) return;
  if(lab.shadows.length>=LAB_CFG.maxShadows) return; const h=clamp(Math.round(isFinite(c.hold)?c.hold:4),1,24);
  lab.shadows.push({key,sym,dir,t:now,px,atr,h,cand:c.name});
}
async function labEvalShadows(max){
  const now=Date.now(); const due=lab.shadows.filter(s=>now>s.t+s.h*36e5+10*60e3).slice(0,max); let n=0;
  for(const s of due){ const raw=await opt(`/fapi/v1/klines?symbol=${s.sym}&interval=1h&startTime=${Math.floor(s.t/36e5)*36e5}&limit=${s.h+2}`,null);
    lab.shadows=lab.shadows.filter(x=>x!==s); if(!raw||!raw.length) continue; const k=K(raw); const end=s.t+s.h*36e5; const bar=k.filter(c=>c.t+36e5<=end+36e5).pop()||k[k.length-1];
    const sg=s.dir==="long"?1:-1; const m=clamp(sg*(bar.c/s.px-1)/s.atr,-LAB_CFG.clip,LAB_CFG.clip); const f=lab.fwd[s.key]=lab.fwd[s.key]||{n:0,sum:0,win:0,last:[]};
    const before=labStatus(s.key); f.n++; f.sum+=m; if(m>0) f.win++; f.last.push({sym:s.sym,t:s.t,m:+m.toFixed(2)}); f.last=f.last.slice(-12); n++;
    const after=labStatus(s.key); if(after!==before&&(after==="onaylı"||after==="zayıf")) labNote("Onur",`${s.cand} (${s.dir==="long"?"LONG":"SHORT"}) ileri testte ${f.n} sinyal, ort ${fx(f.sum/f.n,2)} ATR → ${after==="onaylı"?"ONAYLI: masada tam ağırlık":"ZAYIF: masada artık oy vermiyor"}.`); }
  if(n){ for(const c of lab.cands.concat(lab.avoid)) c.status=labStatus(c.key); labSave(); } return n;
}
/* --- canlı eşleşme: masanın kullandığı içgörü --- */
function labMatch(A,dir,sym){
  if(!lab.cands.length&&!lab.avoid.length&&!(typeof sel!=="undefined"&&sel.hyps.some(h=>h.status==="aday"))) return null; const k=A&&A.src&&A.src.k1h; if(!k||k.length<60) return null;
  const b=A.src.btc15?labAgg1h(A.src.btc15):null; const t=k[k.length-1].t+36e5; // son kapanmış mumdan hemen sonra
  const f=labFeat(k,b,t,dir); if(!f) return null; const ok=c=>c.dir===dir&&c.conds.every(([ff,v])=>f[ff]===v);
  const hits=lab.cands.filter(ok).map(c=>({...c,sw:LAB_SW[c.status]??0.6})); const avoid=lab.avoid.filter(ok);
  if(sym) for(const c of hits) labShadow(c,sym,dir,A.px,f.atr);
  // Selim'in (LLM) geçmişte tutan hipotezleri: eşleşince yalnız ileri teste yazılır; ancak Onur'un ileri testinde onaylanınca Burak'ın oyuna girer
  if(typeof sel!=="undefined") for(const h of sel.hyps){ if(h.status!=="aday"||!ok(h)) continue; if(sym) labShadow(h,sym,dir,A.px,f.atr); if(labStatus(h.key)==="onaylı") hits.push({...h,sw:LAB_SW["onaylı"],sel:true}); }
  return {f,hits,avoid};
}
/* --- arka plan turu (ui.js dakikada bir çağırır) --- */
async function labTick(force){
  if(lab.busy) return false; lab.busy=true; lab.err=null;
  try{
    if(typeof ld!=="undefined"&&ld.list&&ld.list.length) labSnap(ld.list);
    await labHarvest(force?20:3);
    await labEnrich(force?12:4);
    await labEvalShadows(force?10:4);
    if(lab.dirty&&(force||Date.now()-lab.at>5*60e3)){ lab.prog="analiz"; labAnalyze(); }
    labSave();
    if(typeof selTick==="function"){ lab.prog="Selim"; await selTick(false); } // günde bir LLM analizi (anahtar yoksa hiçbir şey yapmaz)
    return true;
  }catch(e){ lab.err=e.message; return false; }
  finally{ lab.busy=false; lab.prog=""; if(typeof labOnProgress==="function") labOnProgress(); }
}
