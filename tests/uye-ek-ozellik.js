// Gelişmemiş üyelerin değişkenleri (11 Ekim 2026; kullanıcı "devam" dedi): Kerem (likidite), Yusuf (zaman dilimi uyumu), Onur (coinin kendi geçmişi).
// Ozan'ın satırlarıyla aynı saatler ve coinler (rank-ozellik.js döngüsü), çıktı (th, si) anahtarıyla → tests/data/arch/uyeek-<parça>.f32 + uyeek.json;
// tests/uye-ek-lambdarank.py bunları rank-*.f32 ile birleştirip aynı lambdarank yöntemiyle ölçer. Yalnız kapanmış mumlar; mesafeler 15 dk ATR (96 mum) cinsinden.
// Kerem ve Yusuf canlıyla aynı kodla: src/uyemodel.js ukFeat (11 Ekim 2026 gecesi; önceki sürüm Yusuf'un EMA'sını tüm geçmişten başlatıyordu, canlı 59/119 mumluk pencere görür).
// Kullanım: node tests/uye-ek-ozellik.js [parça] [parça sayısı] [--from 2022-01]
const fs=require('fs'), path=require('path');
const ARCH=process.env.ARCH_DIR||path.join(__dirname,'data','arch'); const M15=9e5,H=36e5,H4=144e5,DAY=864e5,T0=Date.UTC(2020,0,1),L=Math.log;
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i>0?process.argv[i+1]:d; };
const pos=process.argv.slice(2).filter(x=>!x.startsWith('--')&&isFinite(+x)).map(Number); const PART=pos[0]||0, NP=pos[1]||1;
const FROM=Date.parse(arg('from','2022-01')+'-01T00:00:00Z'), TOP=+arg('top',30);
const UK=new Function(fs.readFileSync(path.join(__dirname,'..','src','uyemodel.js'),'utf8')+'\nreturn {ukFeat,UK_FEATS,UK_KER,UK_YUS};')();
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const bars=rows=>rows.map(r=>({t:r[0],o:r[1],h:r[2],l:r[3],c:r[4],v:r[5],q:r[7],tb:r[10]}));
function agg(a,iv){ const out=[]; let cur=null; for(const b of a){ const t=Math.floor(b.t/iv)*iv; if(!cur||cur.t!==t){ cur={t,o:b.o,h:b.h,l:b.l,c:b.c,v:0,q:0,tb:0}; out.push(cur); } if(b.h>cur.h) cur.h=b.h; if(b.l<cur.l) cur.l=b.l; cur.c=b.c; cur.v+=b.v; cur.q+=b.q; cur.tb+=b.tb; } return out; }
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const monthsOf={}; for(const m in U) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const meta=JSON.parse(fs.readFileSync(path.join(ARCH,'rank.json'),'utf8')); const syms=meta.syms; // si Ozan'ınkiyle aynı
const mine=syms.filter((s,i)=>i%NP===PART);
const KER=UK.UK_KER, YUS=UK.UK_YUS;
const ONU=['o30','o90','o30h','o90h','o30l','oN30'];
const FE=[...KER,...YUS,...ONU]; const COLS=['th','si',...FE]; const NF=COLS.length;
if(PART===0) fs.writeFileSync(path.join(ARCH,'uyeek.json'),JSON.stringify({cols:COLS,ker:KER,yus:YUS,onu:ONU,t0:T0}));
const out=fs.openSync(path.join(ARCH,`uyeek-${PART}.f32`),'w'); let rows=0; const t0=Date.now();
for(const s of mine){
  const f15=path.join(ARCH,'15m',s+'.csv'); if(!fs.existsSync(f15)) continue;
  const a=bars(csv(f15)); if(a.length<3000) continue; const h1=agg(a,H), h4=agg(a,H4), d=bars(csv(path.join(ARCH,'1d',s+'.csv'))); const si=syms.indexOf(s);
  const n=a.length; const lr2=new Float64Array(n+1); for(let i=1;i<n;i++){ const r=L(a[i].c/a[i-1].c); lr2[i+1]=lr2[i]+(isFinite(r)?r*r:0); }
  const rng=new Float64Array(n+1); for(let i=0;i<n;i++) rng[i+1]=rng[i]+(a[i].h-a[i].l);
  const vw=j=>{ const b=a[j]; const x=b.v>0&&b.q>0?b.q/b.v:b.c; return x>=b.l*0.999&&x<=b.h*1.001?x:b.c; };
  const hist=[]; let hp=0; // Onur: coinin gerçekleşmiş geçmiş sonuçları [T bitişi, y4 norm, y12 norm, T]
  let p1=0,p4=0,pd=0; const buf=new Float32Array(NF*2000); let nb=0;
  for(let i=2880;i<n-17;i++){ const T=a[i].t+M15; if(T%H) continue;
    const sd=Math.sqrt((lr2[i+1]-lr2[i-2879])/2880);
    const e0=vw(i+1); const y=w=>i+w+1<n&&a[i+w+1].t===a[i+1].t+w*M15?L(vw(i+w+1)/e0):NaN; const r4=y(16), r12=y(48);
    if(sd>0) hist.push([T+48*M15+M15,r4/(sd*4),r12/(sd*Math.sqrt(48)),T]);
    if(T<FROM) continue; const mo=new Date(a[i].t).toISOString().slice(0,7); if(!monthsOf[s]||!monthsOf[s].has(mo)) continue;
    while(p1<h1.length&&h1[p1].t+H<=T) p1++; while(p4<h4.length&&h4[p4].t+H4<=T) p4++; while(pd<d.length&&d[pd].t+DAY<=T) pd++;
    const c=a[i].c, atr=(rng[i+1]-rng[i-95])/96; if(!(atr>0)||!(sd>0)) continue; const o={};
    // Kerem ve Yusuf: canlıyla aynı fonksiyon (src/uyemodel.js ukFeat), canlının çektiği pencerelerle (15 dk 200, 1 sa / 4 sa 59, günlük 119 kapanmış mum)
    const uk=UK.ukFeat({k15:a.slice(Math.max(0,i-199),i+1),k1h:h1.slice(Math.max(0,p1-59),p1),k4h:h4.slice(Math.max(0,p4-59),p4),k1d:d.slice(Math.max(0,pd-119),pd)},T);
    if(uk) UK.UK_FEATS.forEach((k,j)=>{ o[k]=uk[j]; });
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
