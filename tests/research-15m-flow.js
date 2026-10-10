// 15 dk'da fiyattan önce gelen veri var mı? (8 Ekim 2026; kullanıcı "15 dakikalıkta doğru tahmin yapmanın yolunu bulmamız lazım")
// Girdi: arşivin 15 dk mumları + metrics (5 dk OI, büyük trader long/short, tüm hesaplar long/short, taker oranı) + fonlama.
// Her coin, ayın ilk --top coini olduğu aylarda, saatte bir (her 4. mum kapanışında) özellikler hesaplanır; sonuç ileri 1 sa ve 4 sa getiri.
// Ölçüler (iki yarı + son 12 ay ayrı):
//   IC     = özellik ile ileri getiri arasındaki sıra korelasyonu (havuzlanmış)
//   XS IC  = aynı saatte coinler arası sıra korelasyonunun ortalaması (piyasa yönünden bağımsız: "hangi coin diğerlerinden iyi")
//   Dilim  = özelliğin en üst / en alt %10'unda ileri getiri (%, yönsüz); maliyetle kıyas: maker gidiş-dönüş %0,04, taker+kayma %0,16
// Kullanım: node tests/research-15m-flow.js [--top 30] [--step 4] → tests/research-15m-flow-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'); const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',30), STEP=+arg('step',4), M15=9e5, M5=3e5;
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const monthsOf={}; for(const m in U) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const L=Math.log;
const FEATS={
  oi1:'OI değişimi 1 sa', oi4:'OI değişimi 4 sa', oi24:'OI değişimi 24 sa',
  oiUpPx:'OI 4 sa × fiyat 4 sa yönü (yeni para trendde mi)', oiDnPx:'OI düşerken fiyat 4 sa (pozisyon kapanışı yönü)',
  topPosZ:'büyük trader pozisyon long/short, 7 gün z', topAccZ:'büyük trader hesap long/short, 7 gün z', globZ:'tüm hesaplar long/short, 7 gün z',
  smartDiv:'büyük trader − tüm hesaplar (z farkı)', taker1:'taker alış/satış 1 sa (log)', taker4:'taker alış/satış 4 sa (log)',
  liqL:'long likidasyonu izi: OI 1 sa ≤ −%2 ve fiyat 1 sa düşüş', liqS:'short likidasyonu izi: OI 1 sa ≤ −%2 ve fiyat 1 sa yükseliş',
  fr:'fonlama', px1:'fiyat 1 sa (karşılaştırma)', px4:'fiyat 4 sa (karşılaştırma)', px24:'fiyat 24 sa (karşılaştırma)' };
const KEYS=Object.keys(FEATS);
const rows=[]; // {t,s,f:{},y1,y4}
const syms=Object.keys(monthsOf).filter(s=>fs.existsSync(path.join(ARCH,'metrics',s+'.csv'))&&fs.existsSync(path.join(ARCH,'15m',s+'.csv')));
let t0=Date.now();
for(const s of syms){
  const k=csv(path.join(ARCH,'15m',s+'.csv')), M=csv(path.join(ARCH,'metrics',s+'.csv')), F=csv(path.join(ARCH,'funding',s+'.csv'));
  if(k.length<200||M.length<300) continue;
  let mj=0, fj=0; const zwin=7*288;
  // log oranlar için kayan ortalama/sapma (7 gün, 5 dk satırlar)
  const lr=c=>M.map(r=>r[c]>0?L(r[c]):NaN); const LP=lr(4), LA=lr(3), LG=lr(5);
  const roll=a=>{ const m=new Float64Array(a.length), sd=new Float64Array(a.length); let s1=0,s2=0,n=0;
    for(let i=0;i<a.length;i++){ if(Number.isFinite(a[i])){ s1+=a[i]; s2+=a[i]*a[i]; n++; } const o=i-zwin; if(o>=0&&Number.isFinite(a[o])){ s1-=a[o]; s2-=a[o]*a[o]; n--; }
      m[i]=n>100?s1/n:NaN; sd[i]=n>100?Math.sqrt(Math.max(1e-12,s2/n-(s1/n)**2)):NaN; } return {m,sd}; };
  const RP=roll(LP), RA=roll(LA), RG=roll(LG);
  for(let i=100;i<k.length-17;i++){ const t=k[i][0]+M15; if(t%(STEP*M15)) continue; // saat başı hizalı: coinler aynı anda kıyaslansın const mo=new Date(k[i][0]).toISOString().slice(0,7); if(!monthsOf[s].has(mo)) continue;
    while(mj+1<M.length&&M[mj+1][0]<=t) mj++; if(M[mj][0]>t||t-M[mj][0]>15*60e3||mj<300) continue;
    while(fj+1<F.length&&F[fj+1][0]<=t) fj++;
    const px=k[i][4], oi=M[mj][1]; const oiAt=n=>M[mj-n]&&M[mj-n][1]>0?L(oi/M[mj-n][1]):NaN;
    const p1=L(px/k[i-4][4]), p4=L(px/k[i-16][4]), p24=L(px/k[i-96][4]);
    const o1=oiAt(12), o4=oiAt(48), o24=oiAt(288);
    const z=(a,R)=>Number.isFinite(a[mj])&&R.sd[mj]>0?(a[mj]-R.m[mj])/R.sd[mj]:NaN;
    let tk1=0,tk4=0,n1=0,n4=0; for(let j=0;j<48;j++){ const r=M[mj-j]; if(!r||!(r[6]>0)) continue; const v=L(r[6]); tk4+=v; n4++; if(j<12){ tk1+=v; n1++; } }
    const zP=z(LP,RP), zA=z(LA,RA), zG=z(LG,RG);
    const f={oi1:o1,oi4:o4,oi24:o24,oiUpPx:o4*Math.sign(p4),oiDnPx:o4<0?p4:0,topPosZ:zP,topAccZ:zA,globZ:zG,smartDiv:zP-zG,taker1:n1?tk1/n1:NaN,taker4:n4?tk4/n4:NaN,
      liqL:o1<=-0.02&&p1<0?1:0,liqS:o1<=-0.02&&p1>0?1:0,fr:F.length&&F[fj][0]<=t?F[fj][1]:NaN,px1:p1,px4:p4,px24:p24};
    rows.push({t,s,f,y1:L(k[i+4][4]/px),y4:L(k[i+16][4]/px)}); }
  console.log(s,rows.length,((Date.now()-t0)/1000).toFixed(0)+' sn');
}
rows.sort((a,b)=>a.t-b.t); const MID=rows[rows.length>>1].t, Y12=rows[rows.length-1].t-365*864e5;
function rank(a){ const ix=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]); const r=new Float64Array(a.length); for(let i=0;i<ix.length;){ let j=i; while(j<ix.length&&ix[j][0]===ix[i][0]) j++; for(let z=i;z<j;z++) r[ix[z][1]]=(i+j-1)/2; i=j; } return r; }
function corr(x,y){ const n=x.length; if(n<30) return NaN; let mx=0,my=0; for(let i=0;i<n;i++){ mx+=x[i]; my+=y[i]; } mx/=n; my/=n; let sxy=0,sx=0,sy=0; for(let i=0;i<n;i++){ const a=x[i]-mx,b=y[i]-my; sxy+=a*b; sx+=a*a; sy+=b*b; } return sxy/Math.sqrt(sx*sy); }
const ic=(R,k,y)=>{ const a=R.filter(r=>Number.isFinite(r.f[k])); return corr(rank(a.map(r=>r.f[k])),rank(a.map(r=>r[y]))); };
// coinler arası: saat başına sıra korelasyonu ve en üst beşte bir − en alt beşte bir getiri farkı (%, ortalama)
function xs(R,k,y){ const by={}; for(const r of R) if(Number.isFinite(r.f[k])) (by[r.t]=by[r.t]||[]).push(r); let s=0,n=0,d=0,nd=0;
  for(const t in by){ const a=by[t]; if(a.length<10) continue; const c=corr(rank(a.map(r=>r.f[k])),rank(a.map(r=>r[y]))); if(Number.isFinite(c)){ s+=c; n++; }
    const b=a.slice().sort((p,q)=>p.f[k]-q.f[k]); const q=Math.floor(b.length/5); if(b[0].f[k]===b[b.length-1].f[k]) continue; const m=x=>x.reduce((p,r)=>p+r[y],0)/x.length; d+=m(b.slice(-q))-m(b.slice(0,q)); nd++; }
  return [n?s/n:NaN,nd?d/nd*100:NaN]; }
const xsic=(R,k,y)=>xs(R,k,y)[0];
function tails(R,k,y){ const a=R.filter(r=>Number.isFinite(r.f[k])).sort((p,q)=>p.f[k]-q.f[k]); const n=Math.floor(a.length/10); if(n<50) return [NaN,NaN];
  const m=b=>b.reduce((p,r)=>p+r[y],0)/b.length*100; if(k==='liqL'||k==='liqS'){ const on=a.filter(r=>r.f[k]===1); return [NaN,on.length>=50?m(on):NaN]; } return [m(a.slice(0,n)),m(a.slice(-n))]; }
const fx=(v,d=3)=>Number.isFinite(v)?(v>=0?'+':'')+v.toFixed(d).replace('.',','):'—';
const P={h1:rows.filter(r=>r.t<MID),h2:rows.filter(r=>r.t>=MID),y:rows.filter(r=>r.t>=Y12)};
const out=[`# 15 dk'da fiyattan önce gelen veri · ${new Date().toISOString().slice(0,10)}\n`,
  `${syms.length} coin, ${rows.length.toLocaleString('tr-TR')} gözlem (ayın ilk ${TOP} coini, saatte bir), ${new Date(rows[0].t).toISOString().slice(0,7)} → ${new Date(rows[rows.length-1].t).toISOString().slice(0,7)}; ilk yarı ${new Date(MID).toISOString().slice(0,7)}'e kadar.\n`,
  `IC: havuzlanmış sıra korelasyonu; XS IC: aynı saatte coinler arası ortalama (piyasa yönünden bağımsız). 0,02 üstü bu ölçekte anlamlı sayılır ama maliyeti geçmek için en uç dilimlerin farkı gerekir. Uç dilim: özelliğin en alt / en üst %10'unda ileri getiri (%); maker gidiş-dönüş %0,04, taker+kayma %0,16.\n`];
for(const y of ['y1','y4']){
  out.push(`## İleri ${y==='y1'?'1 saat':'4 saat'}\n`,'| Özellik | IC 1. / 2. yarı / son 12 ay | XS IC 1. / 2. yarı / son 12 ay | En alt %10 · en üst %10 (%, 2. yarı) | XS üst−alt beşte bir (%, 1. / 2. yarı / son 12 ay) |','|---|---|---|---|---|');
  for(const k of KEYS){ const t=tails(P.h2,k,y); out.push(`| ${FEATS[k]} | ${fx(ic(P.h1,k,y))} / ${fx(ic(P.h2,k,y))} / ${fx(ic(P.y,k,y))} | ${fx(xsic(P.h1,k,y))} / ${fx(xsic(P.h2,k,y))} / ${fx(xsic(P.y,k,y))} | ${fx(t[0],3)} · ${fx(t[1],3)} | ${['h1','h2','y'].map(p=>fx(xs(P[p],k,y)[1])).join(' / ')} |`); }
  out.push(''); }
out.push(`Taban: ileri 1 sa ort. ${fx(rows.reduce((p,r)=>p+r.y1,0)/rows.length*100)}%, 4 sa ${fx(rows.reduce((p,r)=>p+r.y4,0)/rows.length*100)}%.`);
fs.writeFileSync(path.join(__dirname,'research-15m-flow-report.md'),out.join('\n')+'\n'); console.log(out.join('\n'));
