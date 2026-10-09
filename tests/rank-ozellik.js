// Sıralama modeli (Ozan, src/rankmodel.js) eğitim satırları: arşivden saat başı, canlıyla AYNI rkFeat fonksiyonuyla.
// Evren: ayın ilk 30 coini (universe.json), 2022-01'den (metrics arşivi 2021-12'de başlıyor). Hedef Denklem 4 ile aynı: giriş sonraki 15 dk mumun VWAP'ı,
// çıkış 4 sa / 12 sa sonraki mumun VWAP'ı; log getiri ÷ (30 günlük 15 dk oynaklık × √mum). Ham log getiri de yazılır (işlem simülasyonu için).
// Canlıyla farklar: fonlama arşivde son ödenen oran, canlıda premiumIndex lastFundingRate (anlık tahmin); metrics T'den önceki son 5 dk kayıt.
// Kullanım: node tests/rank-ozellik.js [parça] [parça sayısı] [--from 2022-01] → tests/data/arch/rank-<parça>.f32 + rank.json
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'); const M15=9e5,H=36e5,H4=144e5,DAY=864e5,T0=Date.UTC(2020,0,1),L=Math.log;
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i>0?process.argv[i+1]:d; };
const pos=process.argv.slice(2).filter(x=>!x.startsWith('--')&&isFinite(+x)).map(Number); const PART=pos[0]||0, NP=pos[1]||1;
const FROM=Date.parse(arg('from','2022-01')+'-01T00:00:00Z'), TOP=+arg('top',30);
const RK=new Function(fs.readFileSync(path.join(__dirname,'..','src','rankmodel.js'),'utf8')+'\nreturn {rkFeat,RK_FEATS,RK_XS};')();
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const bars=rows=>rows.map(r=>({t:r[0],o:r[1],h:r[2],l:r[3],c:r[4],v:r[5],q:r[7],tb:r[10]}));
function agg(a,iv){ const out=[]; let cur=null; for(const b of a){ const t=Math.floor(b.t/iv)*iv; if(!cur||cur.t!==t){ cur={t,o:b.o,h:b.h,l:b.l,c:b.c,v:0,q:0,tb:0}; out.push(cur); } if(b.h>cur.h) cur.h=b.h; if(b.l<cur.l) cur.l=b.l; cur.c=b.c; cur.v+=b.v; cur.q+=b.q; cur.tb+=b.tb; } return out; }
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const monthsOf={}; for(const m in U) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const syms=Object.keys(monthsOf).filter(s=>fs.existsSync(path.join(ARCH,'15m',s+'.csv'))).sort(); const mine=syms.filter((s,i)=>i%NP===PART);
const COLS=['th','si',...RK.RK_FEATS,'y4v','y12v','p4','p12']; const NF=COLS.length;
if(PART===0) fs.writeFileSync(path.join(ARCH,'rank.json'),JSON.stringify({cols:COLS,feats:RK.RK_FEATS,xs:RK.RK_XS,syms,t0:T0,from:arg('from','2022-01'),top:TOP}));
const btc=bars(csv(path.join(ARCH,'15m','BTCUSDT.csv'))); const out=fs.openSync(path.join(ARCH,`rank-${PART}.f32`),'w'); let rows=0; const t0=Date.now();
for(const s of mine){
  const a=bars(csv(path.join(ARCH,'15m',s+'.csv'))); if(a.length<3000) continue; const h1=agg(a,H), h4=agg(a,H4), d=bars(csv(path.join(ARCH,'1d',s+'.csv')));
  const Mt=csv(path.join(ARCH,'metrics',s+'.csv')), F=csv(path.join(ARCH,'funding',s+'.csv')); const si=syms.indexOf(s);
  const n=a.length; const lr2=new Float64Array(n+1); for(let i=1;i<n;i++){ const r=L(a[i].c/a[i-1].c); lr2[i+1]=lr2[i]+(isFinite(r)?r*r:0); }
  const vw=j=>{ const b=a[j]; const x=b.v>0&&b.q>0?b.q/b.v:b.c; return x>=b.l*0.999&&x<=b.h*1.001?x:b.c; };
  let p1=0,p4=0,pd=0,pb=0,pm=0,pf=0; const buf=new Float32Array(NF*2000); let nb=0;
  for(let i=2880;i<n-17;i++){ const T=a[i].t+M15; if(T%H||T<FROM) continue; const mo=new Date(a[i].t).toISOString().slice(0,7); if(!monthsOf[s].has(mo)) continue;
    while(p1<h1.length&&h1[p1].t+H<=T) p1++; while(p4<h4.length&&h4[p4].t+H4<=T) p4++; while(pd<d.length&&d[pd].t+DAY<=T) pd++; while(pb<btc.length&&btc[pb].t+M15<=T) pb++; while(pm<Mt.length&&Mt[pm][0]<T) pm++; while(pf<F.length&&F[pf][0]<=T) pf++;
    const fresh=pm>0&&Mt[pm-1][0]>=T-30*6e4; const sl=(c,k)=>fresh?Mt.slice(Math.max(0,pm-k),pm).map(r=>r[c]):[];
    const f=RK.rkFeat({k15:a,e15:i+1,k1h:h1,e1h:p1,k4h:h4,e4h:p4,k1d:d,e1d:pd,btc,eb:pb,oi:sl(2,24),tp:sl(4,8),gl:sl(5,8),fr:pf>0?F[pf-1][1]:NaN}); if(!f) continue;
    const sd=Math.sqrt((lr2[i+1]-lr2[i-2879])/2880); if(!(sd>0)) continue;
    const o=nb*NF; buf[o]=(T-T0)/H; buf[o+1]=si; for(let k=0;k<f.length;k++) buf[o+2+k]=f[k];
    const e0=vw(i+1); const y=w=>i+w+1<n&&a[i+w+1].t===a[i+1].t+w*M15?L(vw(i+w+1)/e0):NaN; const r4=y(16), r12=y(48);
    buf[o+NF-4]=r4/(sd*4); buf[o+NF-3]=r12/(sd*Math.sqrt(48)); buf[o+NF-2]=r4; buf[o+NF-1]=r12; nb++; rows++;
    if(nb===2000){ fs.writeSync(out,Buffer.from(buf.buffer)); nb=0; } }
  if(nb) fs.writeSync(out,Buffer.from(buf.buffer,0,nb*NF*4));
  console.log(`${PART}: ${s} toplam ${rows} satır ${((Date.now()-t0)/1e3).toFixed(0)} sn`); }
fs.closeSync(out); console.log('bitti', PART, rows);
