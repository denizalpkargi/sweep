// Süpürme denetimi: motorun "likidite süpürmesi" dediği yerler gerçekten dönüş getiriyor mu?
// Her süpürme (havuzun ötesine fitil + aynı/sonraki mumda içeri kapanış) için geri alım mumunun kapanışından 16 mum (4 sa): önce +1 ATR mi −1 ATR mi geldi (yön tahmini) ve süpürme ucuna stoplu 1,5R/1R işlemin sonucu. Taban: her 4 mumda bir aynı ölçü.
// fiyat dönüş yönünde 1 ATR gitti mi, yoksa önce süpürme ucunu kırdı mı (geçersiz)? Taban: her mumda aynı ölçü (son 2 mumun ucu = "uç").
// Havuzlar etiketlenir: daha önce alınmış (dokunulmuş) mı, Asya aralığı seans bitmeden mi, tekil küçük swing mi, havuz türü.
// Veri: tests/data/*.json (15 dk). Çalıştırma: node tests/audit-sweeps.js [--new]  (--new: motordaki güncel poolsAt; varsayılan da odur)
const {loadEngine}=require('./engine-node.js'); const {loadData}=require('./bt-lib.js');
const E=loadEngine(); const data=loadData().filter(d=>d&&d.k15);
const H=16, ATRN=14;
function atrSeries(k){ const a=new Array(k.length).fill(NaN); let s=0; for(let i=1;i<k.length;i++){ const tr=Math.max(k[i].h-k[i].l,Math.abs(k[i].h-k[i-1].c),Math.abs(k[i].l-k[i-1].c)); s+=tr; if(i>ATRN) s-=Math.max(k[i-ATRN].h-k[i-ATRN].l,Math.abs(k[i-ATRN].h-k[i-ATRN-1].c),Math.abs(k[i-ATRN].l-k[i-ATRN-1].c)); if(i>=ATRN) a[i]=s/ATRN; } return a; }
// yön tahmini: girişten (geri alım mumunun kapanışı) önce +1 ATR mi −1 ATR mi gelir (16 mum); aynı mumda ikisi = kötü.
// R testi: R = max(giriş − süpürme ucu, 0,3 ATR) + %0,15 pay; önce +1,5R mi −1R mi (maliyet hariç). ext yalnız R testinde.
function outcome(k,b,isL,ext,atr){ const e=k[b].c; const up=isL?e+atr:e-atr, dn=isL?e-atr:e+atr; let res=0.5, mfe=0;
  const R=Math.max(Math.abs(e-ext)+e*0.0015,0.3*atr); const tp=isL?e+1.5*R:e-1.5*R, sl=isL?e-R:e+R; let rr=null;
  for(let j=b+1;j<Math.min(k.length,b+1+H);j++){ const c=k[j]; mfe=Math.max(mfe,(isL?c.h-e:e-c.l)/atr);
    if(res===0.5){ if(isL? c.l<=dn : c.h>=dn) res=0; else if(isL? c.h>=up : c.l<=up) res=1; }
    if(rr===null){ if(isL? c.l<=sl : c.h>=sl) rr=-1; else if(isL? c.h>=tp : c.l<=tp) rr=1.5; }
    if(res!==0.5&&rr!==null) break; }
  if(rr===null){ const x=k[Math.min(k.length-1,b+H)].c; rr=(isL?x-e:e-x)/R; }
  return {res,mfe,rr}; }
const EV=[]; const {dailyBiasAt}=require('./bt-lib.js');
for(const d of data){
  const k=E.K(d.k15), k1d=E.K(d.k1d); const rng=k.map(c=>(c.h-c.l)/c.c).sort((a,b)=>a-b); const med15=rng[rng.length>>1]; const atr=atrSeries(k);
  E.setPoolCache(new Map()); let bc={i:-99,v:"flat"};
  for(let i=250;i<k.length-H-2;i++){
    if(!(atr[i]>0)) continue;
    if(i-bc.i>=4) bc={i,v:dailyBiasAt(k1d,k[i-1].t,k[i-1].c)};
    const pools=E.poolsAt(k,k1d,med15,i);
    for(const dir of ["long","short"]){ const isL=dir==="long";
      if(i%4===0){ const ext=isL?Math.min(k[i].l,k[i-1].l):Math.max(k[i].h,k[i-1].h); EV.push({base:1,dir,t:k[i].t,o:outcome(k,i,isL,ext,atr[i])}); }
      let best=null;
      for(const p of pools){ if(p.type!==(isL?"low":"high")||!(p.i<i-1)) continue; const beyond=isL?k[i].l<p.p*(1-0.0005):k[i].h>p.p*(1+0.0005); if(!beyond) continue;
        if(isL? k[i-1].l<p.p*(1-0.0005) : k[i-1].h>p.p*(1+0.0005)) continue;
        let back=-1; for(let j=i;j<=i+1;j++){ if(isL? k[j].c>p.p : k[j].c<p.p){ back=j; break; } } if(back<0) continue;
        let tapped=false; for(let j=Math.max(0,p.i+1);j<i;j++){ if(isL? k[j].l<p.p*(1-0.0005) : k[j].h>p.p*(1+0.0005)){ tapped=true; break; } }
        const asiaRun=/Asya/.test(p.name)&&new Date(k[i].t).getUTCHours()<7;
        const cand={p,back,tapped,asiaRun}; if(!best||p.w>best.p.w) best=cand; }
      if(!best) continue;
      let ext=isL?k[i].l:k[i].h; for(let j=i+1;j<=best.back;j++) ext=isL?Math.min(ext,k[j].l):Math.max(ext,k[j].h);
      const b=k[best.back]; const rngB=b.h-b.l||1e-12; const closePos=isL?(b.c-b.l)/rngB:(b.h-b.c)/rngB;
      const vm=k.slice(i-96,i).map(c=>c.q).sort((x,y)=>x-y)[48]||1;
      EV.push({dir,t:k[i].t,typ:best.p.name.replace(/ ×\d+| \(\d+ mum\)/,""),tapped:best.tapped,asiaRun:best.asiaRun,
        depth:Math.abs(ext-best.p.p)/atr[i],closePos,vol:k[i].q/vm,kz:!!E.killZone(k[i].t),bias:bc.v===(isL?"up":"down")?"aynı":bc.v==="flat"?"yatay":"ters",o:outcome(k,best.back,isL,ext,atr[i])});
    }
  }
  E.setPoolCache(null);
}
const T=EV.map(e=>e.t).sort((a,b)=>a-b); const MID=T[T.length>>1];
const summ=a=>{ const n=a.length; if(!n) return null; const w=a.filter(e=>e.o.res===1).length, f=a.filter(e=>e.o.res===0).length; return {n,donus:+(w/n*100).toFixed(1),bozuldu:+(f/n*100).toFixed(1),mfe:+(a.reduce((x,e)=>x+e.o.mfe,0)/n).toFixed(2),R:+(a.reduce((x,e)=>x+e.o.rr,0)/n).toFixed(3)}; };
const base={}; for(const dir of ["long","short"]) base[dir]=summ(EV.filter(e=>e.base&&e.dir===dir));
const rows=[]; const grp=(name,f)=>{ for(const dir of ["long","short"]){ const a=EV.filter(e=>!e.base&&e.dir===dir&&f(e)); const s=summ(a); if(!s||s.n<100) continue; const h1=summ(a.filter(e=>e.t<MID)), h2=summ(a.filter(e=>e.t>=MID));
  rows.push({grup:name,dir,n:s.n,'+1ATR önce %':s.donus,fark:+(s.donus-base[dir].donus).toFixed(1),y1:h1?h1.donus:null,y2:h2?h2.donus:null,R:s.R,R_y1:h1?h1.R:null,R_y2:h2?h2.R:null}); } };
grp("hepsi",()=>true);
grp("dokunulmuş havuz",e=>e.tapped); grp("taze havuz",e=>!e.tapped);
for(const t of [...new Set(EV.filter(e=>!e.base).map(e=>e.typ))]) grp("tür: "+t,e=>e.typ===t);
grp("derinlik <0,25 ATR",e=>e.depth<0.25); grp("derinlik 0,25–0,75",e=>e.depth>=0.25&&e.depth<0.75); grp("derinlik ≥0,75",e=>e.depth>=0.75);
grp("kapanış güçlü (≥%60)",e=>e.closePos>=0.6); grp("kapanış zayıf (<%40)",e=>e.closePos<0.4);
grp("hacim ≥1,5× medyan",e=>e.vol>=1.5); grp("hacim <1×",e=>e.vol<1);
grp("kill zone",e=>e.kz); grp("kill zone dışı",e=>!e.kz);
grp("günlük yön aynı",e=>e.bias==="aynı"); grp("günlük yön ters",e=>e.bias==="ters"); grp("günlük yatay",e=>e.bias==="yatay");
grp("eşit/gün/Asya/kutu + güçlü kapanış",e=>e.typ!=="swing dip"&&e.typ!=="swing tepe"&&e.closePos>=0.6);
grp("eşit/gün/Asya/kutu + güçlü kapanış + hacim≥1,5",e=>e.typ!=="swing dip"&&e.typ!=="swing tepe"&&e.closePos>=0.6&&e.vol>=1.5);
console.log('taban',JSON.stringify(base)); console.table(rows);
require('fs').writeFileSync(require('path').join(__dirname,'audit-sweeps.json'),JSON.stringify({base,rows},null,1));
