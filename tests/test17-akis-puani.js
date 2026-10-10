// Test listesi #17 (9 Ekim 2026, kullanıcı 8 Ekim'de öncelik verdi): 15 dk akış puanı.
// Puan = kalabalığın tersi (tüm hesaplar long/short 7 gün z, ters) + büyük trader − tüm hesaplar (z farkı) + OI düşerken fiyatın tersi
//        + 1 sa ve 4 sa geri dönüş (fiyatın tersi). Bileşenler her saatte coinler arası z'ye çevrilir (±3 kırpılır).
// Portföy: her 4 saatte (ve ayrıca her saatte) coinler arası üst beşte bir long / alt beşte bir short, eşit ağırlık, 4 sa (1 sa) tut.
// Ölçü: giriş sonraki 15 dk mumun VWAP'ı, çıkış tutuş sonundaki 15 dk mumun VWAP'ı (kapanış sıçraması yok); basit getiri; short bacağına fonlama.
// Ağırlıklar: eşit ve ilk yarıda en küçük kareler (coinler arası ortalaması alınmış 4 sa getiriye); ikinci yarı ve son 12/24 ay sınav.
// Maliyet: gidiş-dönüş maker %0,04, taker+kayma %0,16 (pozisyon başına; L−S portföyünde sermaye başına aynı).
// Kullanım: node --max-old-space-size=12000 tests/test17-akis-puani.js [--top 30] → tests/test17-akis-puani-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'); const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',30), M15=9e5, H1=36e5, H4=144e5, L=Math.log;
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const monthsOf={}; for(const m in U) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const COMPS=['crowd','smart','oiRev','rev1','rev4','taker'];
const CN={crowd:'kalabalığın tersi (tüm hesaplar L/S z)',smart:'büyük trader − tüm hesaplar',oiRev:'OI düşerken fiyatın tersi',rev1:'1 sa geri dönüş',rev4:'4 sa geri dönüş',taker:'taker alış/satış 1 sa (ek)'};
const CAP=1<<21; let N=0; const T=new Float64Array(CAP), SY=new Uint16Array(CAP), Y1=new Float32Array(CAP), Y4=new Float32Array(CAP), F1=new Float32Array(CAP), F4=new Float32Array(CAP);
const X={}; for(const c of COMPS) X[c]=new Float32Array(CAP);
const syms=Object.keys(monthsOf).filter(s=>fs.existsSync(path.join(ARCH,'metrics',s+'.csv'))&&fs.existsSync(path.join(ARCH,'15m',s+'.csv'))).sort();
const t0=Date.now();
syms.forEach((s,si)=>{
  const k=csv(path.join(ARCH,'15m',s+'.csv')), M=csv(path.join(ARCH,'metrics',s+'.csv')), F=csv(path.join(ARCH,'funding',s+'.csv'));
  if(k.length<200||M.length<300) return;
  const vw=i=>k[i][5]>0?k[i][7]/k[i][5]:k[i][4];
  const zwin=7*288, lr=c=>M.map(r=>r[c]>0?L(r[c]):NaN); const LP=lr(4), LG=lr(5);
  const roll=a=>{ const m=new Float64Array(a.length), sd=new Float64Array(a.length); let s1=0,s2=0,n=0;
    for(let i=0;i<a.length;i++){ if(Number.isFinite(a[i])){ s1+=a[i]; s2+=a[i]*a[i]; n++; } const o=i-zwin; if(o>=0&&Number.isFinite(a[o])){ s1-=a[o]; s2-=a[o]*a[o]; n--; }
      m[i]=n>100?s1/n:NaN; sd[i]=n>100?Math.sqrt(Math.max(1e-12,s2/n-(s1/n)**2)):NaN; } return {m,sd}; };
  const RP=roll(LP), RG=roll(LG); let mj=0, fj=0;
  for(let i=100;i<k.length-18;i++){ const t=k[i][0]+M15; if(t%H1) continue; const mo=new Date(k[i][0]).toISOString().slice(0,7); if(!monthsOf[s].has(mo)) continue;
    while(mj+1<M.length&&M[mj+1][0]<=t) mj++; if(M[mj][0]>t||t-M[mj][0]>15*60e3||mj<300) continue;
    while(fj<F.length&&F[fj][0]<=t) fj++; // fj: t'den sonraki ilk fonlama
    const px=k[i][4], oi=M[mj][1]; const oiAt=n=>M[mj-n]&&M[mj-n][1]>0?L(oi/M[mj-n][1]):NaN;
    const p1=L(px/k[i-4][4]), p4=L(px/k[i-16][4]), o4=oiAt(48);
    const z=(a,R)=>Number.isFinite(a[mj])&&R.sd[mj]>0?(a[mj]-R.m[mj])/R.sd[mj]:NaN;
    let tk=0,n1=0; for(let j=0;j<12;j++){ const r=M[mj-j]; if(r&&r[6]>0){ tk+=L(r[6]); n1++; } }
    const zP=z(LP,RP), zG=z(LG,RG); if(!Number.isFinite(zG)) continue;
    const e=vw(i+1); if(!(e>0)) continue; const x1=vw(i+5), x4=vw(i+17); if(!(x1>0&&x4>0)) continue;
    let f1=0,f4=0; for(let j=fj;j<F.length&&F[j][0]<=t+H4;j++){ f4+=F[j][1]; if(F[j][0]<=t+H1) f1+=F[j][1]; }
    if(N>=CAP) throw new Error('CAP');
    T[N]=t; SY[N]=si; Y1[N]=x1/e-1; Y4[N]=x4/e-1; F1[N]=f1; F4[N]=f4;
    X.crowd[N]=-zG; X.smart[N]=Number.isFinite(zP)?zP-zG:NaN; X.oiRev[N]=Number.isFinite(o4)?(o4<0?-p4:0):NaN; X.rev1[N]=-p1; X.rev4[N]=-p4; X.taker[N]=n1?tk/n1:NaN; N++; }
  if(si%25===0) console.log(si+'/'+syms.length, s, N, ((Date.now()-t0)/1000).toFixed(0)+' sn');
});
console.log('gözlem', N, 'coin', syms.length);
// zaman grupları (saat başı)
const order=Array.from({length:N},(_,i)=>i).sort((a,b)=>T[a]-T[b]); const groups=[]; for(let a=0;a<N;){ let b=a; while(b<N&&T[order[b]]===T[order[a]]) b++; groups.push(order.slice(a,b)); a=b; }
// coinler arası z (±3) her bileşen için
const Z={}; for(const c of COMPS){ const z=new Float32Array(N).fill(NaN); for(const g of groups){ let s1=0,s2=0,n=0; for(const i of g){ const v=X[c][i]; if(Number.isFinite(v)){ s1+=v; s2+=v*v; n++; } } if(n<10) continue; const m=s1/n, sd=Math.sqrt(Math.max(1e-12,s2/n-m*m)); if(!(sd>0)) continue; for(const i of g){ const v=X[c][i]; if(Number.isFinite(v)) z[i]=Math.max(-3,Math.min(3,(v-m)/sd)); } } Z[c]=z; }
const MID=T[order[N>>1]], TEND=T[order[N-1]], Y12=TEND-365*864e5, Y24=TEND-730*864e5;
const PERT={'1. yarı':t=>t<MID,'2. yarı':t=>t>=MID,'son 12 ay':t=>t>=Y12,'son 24 ay':t=>t>=Y24}; const PER={}; for(const p in PERT) PER[p]=i=>PERT[p](T[i]);
// coinler arası ortalaması alınmış 4 sa getiri (uydurma hedefi)
const Y4d=new Float32Array(N); for(const g of groups){ let s=0; for(const i of g) s+=Y4[i]; const m=s/g.length; for(const i of g) Y4d[i]=Y4[i]-m; }
function ols(comps, sel){ const p=comps.length; const A=Array.from({length:p},()=>new Float64Array(p)), b=new Float64Array(p);
  for(let i=0;i<N;i++){ if(!sel(i)) continue; const x=comps.map(c=>Number.isFinite(Z[c][i])?Z[c][i]:0); for(let r=0;r<p;r++){ b[r]+=x[r]*Y4d[i]; for(let q=0;q<p;q++) A[r][q]+=x[r]*x[q]; } }
  // Gauss
  const M=A.map((r,i)=>[...r,b[i]]); for(let c=0;c<p;c++){ let piv=c; for(let r=c+1;r<p;r++) if(Math.abs(M[r][c])>Math.abs(M[piv][c])) piv=r; [M[c],M[piv]]=[M[piv],M[c]]; for(let r=0;r<p;r++){ if(r===c) continue; const f=M[r][c]/M[c][c]; for(let q=c;q<=p;q++) M[r][q]-=f*M[c][q]; } }
  return M.map((r,i)=>r[p]/r[i]); }
const BASE=['crowd','smart','oiRev','rev1','rev4'];
const wFit=ols(BASE,PER['1. yarı']), wFitT=ols([...BASE,'taker'],PER['1. yarı']);
const score=(comps,w)=>{ const s=new Float32Array(N).fill(NaN); for(let i=0;i<N;i++){ let v=0,n=0; for(let c=0;c<comps.length;c++){ const z=Z[comps[c]][i]; if(Number.isFinite(z)){ v+=w[c]*z; n++; } } if(n>=Math.min(3,comps.length)) s[i]=v; } return s; };
const SC={'eşit ağırlık (5 bileşen)':score(BASE,BASE.map(()=>1)),'ilk yarıda uydurulmuş':score(BASE,wFit),'uydurulmuş + taker':score([...BASE,'taker'],wFitT)};
for(const c of COMPS) SC['yalnız: '+CN[c]]=Z[c];
function rank(a){ const ix=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]); const r=new Float64Array(a.length); for(let i=0;i<ix.length;){ let j=i; while(j<ix.length&&ix[j][0]===ix[i][0]) j++; for(let z=i;z<j;z++) r[ix[z][1]]=(i+j-1)/2; i=j; } return r; }
function corr(x,y){ const n=x.length; if(n<10) return NaN; let mx=0,my=0; for(let i=0;i<n;i++){ mx+=x[i]; my+=y[i]; } mx/=n; my/=n; let sxy=0,sx=0,sy=0; for(let i=0;i<n;i++){ const a=x[i]-mx,b=y[i]-my; sxy+=a*b; sx+=a*a; sy+=b*b; } return sxy/Math.sqrt(sx*sy); }
// portföy: her period (4 sa: t%H4==0; 1 sa: her saat), üst/alt dilim
function port(sc, hor, frac){ const Y=hor===4?Y4:Y1, FR=hor===4?F4:F1, out=[]; // {t,long,short,ls}
  for(const g of groups){ const t=T[g[0]]; if(hor===4&&t%H4) continue; const a=g.filter(i=>Number.isFinite(sc[i])); if(a.length<10) continue;
    a.sort((p,q)=>sc[p]-sc[q]); const q=Math.max(1,Math.floor(a.length*frac)); const lo=a.slice(0,q), hi=a.slice(-q);
    const m=(arr,f)=>arr.reduce((p,i)=>p+f(i),0)/arr.length; const lg=m(hi,i=>Y[i]-FR[i]), sh=m(lo,i=>-Y[i]+FR[i]); out.push({t,long:lg,short:sh,ls:(lg+sh)/2}); }
  return out; }
const stat=(arr,key,cost)=>{ const v=arr.map(r=>r[key]-cost); const n=v.length; if(!n) return null; const m=v.reduce((a,b)=>a+b,0)/n; const sd=Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/Math.max(1,n-1)); const hit=v.filter(x=>x>0).length/n; const yrs=(arr[n-1].t-arr[0].t)/(365*864e5)||1; return {n,m,t:m/sd*Math.sqrt(n),hit,sum:v.reduce((a,b)=>a+b,0),yrs}; };
const fx=(v,d=3)=>Number.isFinite(v)?(v>=0?'+':'')+v.toFixed(d).replace('.',','):'—';
const pct=(v,d=3)=>fx(v*100,d);
const out=[`# Test #17 · 15 dk akış puanı, coinler arası long/short · ${new Date().toISOString().slice(0,10)}\n`,
  `${syms.length} coin (ayın ilk ${TOP}'u), ${N.toLocaleString('tr-TR')} saatlik gözlem, ${new Date(T[order[0]]).toISOString().slice(0,7)} → ${new Date(TEND).toISOString().slice(0,7)}; ilk yarı ${new Date(MID).toISOString().slice(0,7)}'e kadar. Getiri VWAP→VWAP basit; short bacağına fonlama eklendi. Maliyet gidiş-dönüş maker %0,04, taker %0,16.\n`,
  `Bileşenler coinler arası z (±3). İlk yarıda uydurulmuş ağırlıklar (4 sa, coinler arası ortalaması alınmış getiriye en küçük kareler): ${BASE.map((c,i)=>`${CN[c]} ${fx(wFit[i]*1e4,2)}`).join(' · ')} (×10⁻⁴). Taker'lı: ${[...BASE,'taker'].map((c,i)=>`${c} ${fx(wFitT[i]*1e4,2)}`).join(' · ')}.\n`];
// IC tablosu
out.push('## Coinler arası IC (saat başı sıra korelasyonu ortalaması)\n','| Puan | 4 sa: 1. yarı / 2. yarı / son 12 ay / son 24 ay | 1 sa: 1. yarı / 2. yarı / son 12 ay / son 24 ay |','|---|---|---|');
for(const name in SC){ const sc=SC[name]; const cells=[]; for(const Y of [Y4,Y1]){ const res=[]; for(const p in PER){ let s=0,n=0; for(const g of groups){ if(!PER[p](g[0])) continue; const a=g.filter(i=>Number.isFinite(sc[i])); if(a.length<10) continue; const c=corr(rank(a.map(i=>sc[i])),rank(a.map(i=>Y[i]))); if(Number.isFinite(c)){ s+=c; n++; } } res.push(fx(n?s/n:NaN)); } cells.push(res.join(' / ')); } out.push(`| ${name} | ${cells.join(' | ')} |`); }
out.push('');
// portföy tabloları
for(const [hor,label] of [[4,'4 saat (her 4 saatte dengeleme)'],[1,'1 saat (her saat dengeleme)']]){
  out.push(`## Portföy · ${label}\n`);
  for(const frac of [0.2,0.1]){ out.push(`### ${frac===0.2?'Üst / alt beşte bir':'Üst / alt onda bir'}\n`,'| Puan | Dönem | n | long brüt % | short brüt % (fonlamalı) | L−S brüt % | L−S maker % | L−S taker % | t (maker) | kazanma % | yıllık maker % |','|---|---|---|---|---|---|---|---|---|---|---|');
    for(const name in SC){ if(name.startsWith('yalnız') && frac===0.1) continue; const P=port(SC[name],hor,frac);
      for(const p in PER){ const arr=P.filter(r=>PERT[p](r.t)); if(!arr.length) continue;
        const g0=stat(arr,'ls',0), gm=stat(arr,'ls',0.0004), gt=stat(arr,'ls',0.0016), lg=stat(arr,'long',0), sh=stat(arr,'short',0);
        out.push(`| ${name} | ${p} | ${g0.n} | ${pct(lg.m)} | ${pct(sh.m)} | ${pct(g0.m)} | ${pct(gm.m)} | ${pct(gt.m)} | ${fx(gm.t,1)} | ${fx(gm.hit*100,0)} | ${pct(gm.sum/gm.yrs,1)} |`); } }
    out.push(''); } }
// yıl yıl: eşit ağırlık, 4 sa, beşte bir, maker
{ const P=port(SC['eşit ağırlık (5 bileşen)'],4,0.2); const by={}; for(const r of P){ const y=new Date(r.t).getUTCFullYear(); (by[y]=by[y]||[]).push(r); }
  out.push('## Yıl yıl · eşit ağırlık, 4 sa, beşte bir\n','| Yıl | n | long brüt % | short brüt % | L−S maker % / period | t | kazanma % | toplam maker % |','|---|---|---|---|---|---|---|---|');
  for(const y of Object.keys(by).sort()){ const a=by[y]; const gm=stat(a,'ls',0.0004), lg=stat(a,'long',0), sh=stat(a,'short',0); out.push(`| ${y} | ${gm.n} | ${pct(lg.m)} | ${pct(sh.m)} | ${pct(gm.m)} | ${fx(gm.t,1)} | ${fx(gm.hit*100,0)} | ${pct(gm.sum,1)} |`); } out.push(''); }
// taban
{ let s1=0,s4=0; for(let i=0;i<N;i++){ s1+=Y1[i]; s4+=Y4[i]; } out.push(`Taban (tüm gözlemler, VWAP→VWAP): 1 sa ${pct(s1/N)} %, 4 sa ${pct(s4/N)} %.`); }
fs.writeFileSync(path.join(__dirname,'test17-akis-puani-report.md'),out.join('\n')+'\n'); console.log(out.join('\n'));
