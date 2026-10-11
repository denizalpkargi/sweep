// Gelişmemiş üyelerin değişkenleri (11 Ekim 2026; kullanıcı "devam" dedi): Kerem (likidite), Yusuf (zaman dilimi uyumu), Onur (coinin kendi geçmişi).
// Ozan'ın satırlarıyla aynı saatler ve coinler (rank-ozellik.js döngüsü), çıktı (th, si) anahtarıyla → tests/data/arch/uyeek-<parça>.f32 + uyeek.json;
// tests/uye-ek-lambdarank.py bunları rank-*.f32 ile birleştirip aynı lambdarank yöntemiyle ölçer. Yalnız kapanmış mumlar; mesafeler 15 dk ATR (96 mum) cinsinden.
// Kerem'in değişkenleri canlıdaki AMD dizisinin (engine.js amdDetect) yaklaşığı: süpürme = fitil son 96 mumun ucunu ≥%0,05 geçip aynı mumda içeri kapanış;
// MSS = süpürmeden sonra gövdenin süpürmeden önceki 12 mumun karşı ucunu geçmesi; eşit tepe/dip = iki 3'lü swing ucu tolerans içinde ve henüz alınmamış.
// Kullanım: node tests/uye-ek-ozellik.js [parça] [parça sayısı] [--from 2022-01]
const fs=require('fs'), path=require('path');
const ARCH=process.env.ARCH_DIR||path.join(__dirname,'data','arch'); const M15=9e5,H=36e5,H4=144e5,DAY=864e5,T0=Date.UTC(2020,0,1),L=Math.log;
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i>0?process.argv[i+1]:d; };
const pos=process.argv.slice(2).filter(x=>!x.startsWith('--')&&isFinite(+x)).map(Number); const PART=pos[0]||0, NP=pos[1]||1;
const FROM=Date.parse(arg('from','2022-01')+'-01T00:00:00Z'), TOP=+arg('top',30);
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const bars=rows=>rows.map(r=>({t:r[0],o:r[1],h:r[2],l:r[3],c:r[4],v:r[5],q:r[7],tb:r[10]}));
function agg(a,iv){ const out=[]; let cur=null; for(const b of a){ const t=Math.floor(b.t/iv)*iv; if(!cur||cur.t!==t){ cur={t,o:b.o,h:b.h,l:b.l,c:b.c,v:0,q:0,tb:0}; out.push(cur); } if(b.h>cur.h) cur.h=b.h; if(b.l<cur.l) cur.l=b.l; cur.c=b.c; cur.v+=b.v; cur.q+=b.q; cur.tb+=b.tb; } return out; }
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const monthsOf={}; for(const m in U) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const meta=JSON.parse(fs.readFileSync(path.join(ARCH,'rank.json'),'utf8')); const syms=meta.syms; // si Ozan'ınkiyle aynı
const mine=syms.filter((s,i)=>i%NP===PART);
const KER=['kPdh','kPdl','kPosD','kAsH','kAsL','kAsW','kSwUp','kSwDn','kMssUp','kMssDn','kEqH','kEqL','kSwNet'];
const YUS=['yD','yDs','y4','y4s','y1','y1s','yAlign','yAlign2','yD4'];
const ONU=['o30','o90','o30h','o90h','o30l','oN30'];
const FE=[...KER,...YUS,...ONU]; const COLS=['th','si',...FE]; const NF=COLS.length;
if(PART===0) fs.writeFileSync(path.join(ARCH,'uyeek.json'),JSON.stringify({cols:COLS,ker:KER,yus:YUS,onu:ONU,t0:T0}));
function emaArr(x,p){ const k=2/(p+1); const o=new Float64Array(x.length); let e=NaN; for(let i=0;i<x.length;i++){ e=isFinite(e)?e+k*(x[i].c-e):x[i].c; o[i]=e; } return o; }
const out=fs.openSync(path.join(ARCH,`uyeek-${PART}.f32`),'w'); let rows=0; const t0=Date.now();
for(const s of mine){
  const f15=path.join(ARCH,'15m',s+'.csv'); if(!fs.existsSync(f15)) continue;
  const a=bars(csv(f15)); if(a.length<3000) continue; const h1=agg(a,H), h4=agg(a,H4), d=bars(csv(path.join(ARCH,'1d',s+'.csv'))); const si=syms.indexOf(s);
  const e1=emaArr(h1,20), e4=emaArr(h4,20), ed=emaArr(d,20);
  const n=a.length; const lr2=new Float64Array(n+1); for(let i=1;i<n;i++){ const r=L(a[i].c/a[i-1].c); lr2[i+1]=lr2[i]+(isFinite(r)?r*r:0); }
  const rng=new Float64Array(n+1); for(let i=0;i<n;i++) rng[i+1]=rng[i]+(a[i].h-a[i].l);
  const vw=j=>{ const b=a[j]; const x=b.v>0&&b.q>0?b.q/b.v:b.c; return x>=b.l*0.999&&x<=b.h*1.001?x:b.c; };
  // süpürme işaretleri: mum j son 96 mumun tepesini/dibini ≥%0,05 geçip içeri kapandı mı (j için önceden)
  const swU=new Int8Array(n), swD=new Int8Array(n);
  { for(let j=97;j<n;j++){ let hh=-Infinity,ll=Infinity; for(let k=j-96;k<j;k++){ if(a[k].h>hh) hh=a[k].h; if(a[k].l<ll) ll=a[k].l; } if(a[j].h>=hh*1.0005&&a[j].c<hh) swU[j]=1; if(a[j].l<=ll*0.9995&&a[j].c>ll) swD[j]=1; } }
  const hist=[]; let hp=0; // Onur: coinin gerçekleşmiş geçmiş sonuçları [T bitişi, y4 norm, y12 norm, T]
  let p1=0,p4=0,pd=0; const buf=new Float32Array(NF*2000); let nb=0;
  for(let i=2880;i<n-17;i++){ const T=a[i].t+M15; if(T%H) continue;
    const sd=Math.sqrt((lr2[i+1]-lr2[i-2879])/2880);
    const e0=vw(i+1); const y=w=>i+w+1<n&&a[i+w+1].t===a[i+1].t+w*M15?L(vw(i+w+1)/e0):NaN; const r4=y(16), r12=y(48);
    if(sd>0) hist.push([T+48*M15+M15,r4/(sd*4),r12/(sd*Math.sqrt(48)),T]);
    if(T<FROM) continue; const mo=new Date(a[i].t).toISOString().slice(0,7); if(!monthsOf[s]||!monthsOf[s].has(mo)) continue;
    while(p1<h1.length&&h1[p1].t+H<=T) p1++; while(p4<h4.length&&h4[p4].t+H4<=T) p4++; while(pd<d.length&&d[pd].t+DAY<=T) pd++;
    const c=a[i].c, atr=(rng[i+1]-rng[i-95])/96; if(!(atr>0)||!(sd>0)) continue; const o={};
    // Kerem
    if(pd>=1){ const pdh=d[pd-1].h, pdl=d[pd-1].l; o.kPdh=(c-pdh)/atr; o.kPdl=(c-pdl)/atr; o.kPosD=pdh>pdl?(c-pdl)/(pdh-pdl):0.5; }
    const day0=Math.floor(T/DAY)*DAY; if(T>=day0+7*H){ let ah=-Infinity,al=Infinity; for(let k=i;k>=0&&a[k].t>=day0;k--) if(a[k].t<day0+7*H){ if(a[k].h>ah) ah=a[k].h; if(a[k].l<al) al=a[k].l; } if(ah>al){ o.kAsH=(c-ah)/atr; o.kAsL=(c-al)/atr; o.kAsW=(ah-al)/atr; } }
    let up=99,dn=99; for(let k=0;k<48;k++){ if(up===99&&swU[i-k]) up=k; if(dn===99&&swD[i-k]) dn=k; } o.kSwUp=up; o.kSwDn=dn; o.kSwNet=(dn<99?1-dn/48:0)-(up<99?1-up/48:0);
    const mss=(j,isUp)=>{ if(j>=99) return 0; const js=i-j; let lv=isUp?-Infinity:Infinity; for(let k=js-12;k<js;k++) lv=isUp?Math.max(lv,a[k].h):Math.min(lv,a[k].l); for(let k=js+1;k<=i;k++) if(isUp?a[k].c>lv:a[k].c<lv) return 1; return 0; };
    o.kMssUp=mss(dn,true); o.kMssDn=mss(up,false);
    const tol=Math.max(c*0.001,0.25*atr); const swH=[],swL=[]; for(let k=i-190;k<i-1;k++){ if(a[k].h>a[k-1].h&&a[k].h>=a[k+1].h) swH.push(k); if(a[k].l<a[k-1].l&&a[k].l<=a[k+1].l) swL.push(k); }
    let eqH=NaN,eqL=NaN; for(let x=0;x<swH.length;x++) for(let z=x+1;z<swH.length;z++){ const p=a[swH[x]].h, q=a[swH[z]].h; if(Math.abs(p-q)>tol) continue; const lv=Math.max(p,q); let taken=false; for(let k=swH[z]+1;k<=i;k++) if(a[k].h>lv*1.0005){ taken=true; break; } if(!taken&&lv>c){ const dd=(lv-c)/atr; if(!(dd>=eqH)) eqH=dd; } }
    for(let x=0;x<swL.length;x++) for(let z=x+1;z<swL.length;z++){ const p=a[swL[x]].l, q=a[swL[z]].l; if(Math.abs(p-q)>tol) continue; const lv=Math.min(p,q); let taken=false; for(let k=swL[z]+1;k<=i;k++) if(a[k].l<lv*0.9995){ taken=true; break; } if(!taken&&lv<c){ const dd=(c-lv)/atr; if(!(dd>=eqL)) eqL=dd; } }
    o.kEqH=eqH; o.kEqL=eqL;
    // Yusuf: günlük, 4 sa, 1 sa EMA20'ye göre yer ve eğim; yön uyumu
    const sg=x=>x>0?1:x<0?-1:0;
    if(pd>=26){ o.yD=L(c/ed[pd-1]); o.yDs=L(ed[pd-1]/ed[pd-6]); }
    if(p4>=26){ o.y4=L(c/e4[p4-1]); o.y4s=L(e4[p4-1]/e4[p4-6]); }
    if(p1>=26){ o.y1=L(c/e1[p1-1]); o.y1s=L(e1[p1-1]/e1[p1-6]); }
    if(isFinite(o.yD)&&isFinite(o.y4)&&isFinite(o.y1)){ o.yAlign=sg(o.yD)+sg(o.y4)+sg(o.y1); o.yAlign2=sg(o.yDs)+sg(o.y4s)+sg(o.y1s); o.yD4=sg(o.yD)===sg(o.y4)?sg(o.yD):0; }
    // Onur: coinin son 30 / 90 günde gerçekleşmiş (bitişi T'den önce) normalize sonuçları
    const done=hist.filter(h=>h[0]<=T); const m30=done.filter(h=>h[3]>=T-30*DAY), m90=done.filter(h=>h[3]>=T-90*DAY);
    const mean=(arr,k)=>{ let s=0,c2=0; for(const h of arr) if(isFinite(h[k])){ s+=h[k]; c2++; } return c2>=50?s/c2:NaN; };
    const hit=(arr,k)=>{ let s=0,c2=0; for(const h of arr) if(isFinite(h[k])){ s+=h[k]>0?1:0; c2++; } return c2>=50?s/c2:NaN; };
    o.o30=mean(m30,1); o.o90=mean(m90,1); o.o30h=hit(m30,1); o.o90h=hit(m90,1); o.o30l=mean(m30,2); o.oN30=m30.length;
    while(hist.length&&hist[0][3]<T-91*DAY) hist.shift();
    const b=nb*NF; buf[b]=(T-T0)/H; buf[b+1]=si; FE.forEach((k,j)=>{ buf[b+2+j]=isFinite(o[k])?o[k]:NaN; }); nb++; rows++;
    if(nb===2000){ fs.writeSync(out,Buffer.from(buf.buffer)); nb=0; } }
  if(nb) fs.writeSync(out,Buffer.from(buf.buffer,0,nb*NF*4));
  console.log(`${PART}: ${s} toplam ${rows} satır ${((Date.now()-t0)/1e3).toFixed(0)} sn`); }
fs.closeSync(out); console.log('bitti', PART, rows);
