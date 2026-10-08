// Öncü izler (8 Ekim 2026; kullanıcı: "her artış ve azalıştan önce sinyal veren bir ya da birden fazla gösterge olmalı, bakmadığımız
// veri varsa bakalım, kutunun dışında düşünelim"). Olay çalışması: en büyük 4 saatlik yükselişlerin ve düşüşlerin öncesindeki durum,
// rastgele anlardan ayrılıyor mu? Hareketi coinin kendi oynaklığına böleriz (z), üst %2 = büyük yükseliş, alt %2 = büyük düşüş.
// Veri (yalnız arşiv, bakış ileri yok): vadeli 15 dk mumlar (hacim, işlem sayısı → ortalama işlem büyüklüğü, taker), metrics (OI,
// büyük trader ve tüm hesaplar long/short), fonlama, prim endeksi (vadeli − endeks), spot 15 dk (spot hacim payı, spot önden mi), BTC.
// Ölçü: her özelliğin, olaylardan önceki ortalama yüzdelik sırası (taban 50) ve en üst/en alt %10'da olay olasılığının tabana oranı (lift),
// iki yarıda ayrı. "Hareket habercisi" = yükselişi de düşüşü de artırır (yön söylemez); "yön habercisi" = birini artırıp diğerini azaltır.
// Kullanım: node tests/research-oncu.js [--top 30] [--q 0.02] → tests/research-oncu-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'); const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',30), Q=+arg('q',0.02), M15=9e5, H=36e5, L=Math.log;
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const monthsOf={}; for(const m in U) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const FEATS={
  r1:'fiyat 1 sa (oynaklık biriminde)', r4:'fiyat 4 sa', r24:'fiyat 24 sa', r7d:'fiyat 7 gün',
  sq:'sıkışma: 24 sa oynaklık / 30 gün oynaklık', rng4:'son 4 sa aralık / 30 gün ort. 4 sa aralık',
  vq1:'hacim 1 sa / 30 gün ort.', vq24:'hacim 24 sa / 30 gün ort.', size1:'ort. işlem büyüklüğü 1 sa / 30 gün (balina izi)', size24:'ort. işlem büyüklüğü 24 sa / 30 gün', cnt1:'işlem sayısı 1 sa / 30 gün',
  tk1:'taker alış payı 1 sa', tk4:'taker alış payı 4 sa', uw:'üst fitil payı 4 sa', lw:'alt fitil payı 4 sa',
  pos24:'24 sa aralıkta yer', pos7:'7 gün aralıkta yer', hi7:'7 günlük tepeyi kırdı', lo7:'7 günlük dibi kırdı',
  oi1:'OI 1 sa', oi4:'OI 4 sa', oi24:'OI 24 sa', oiVsPx:'OI 24 sa − fiyat 24 sa (fiyatsız OI birikimi)',
  topPosZ:'büyük trader pozisyon long/short z', topAccZ:'büyük trader hesap long/short z', globZ:'tüm hesaplar long/short z', smartDiv:'büyük − küçük (z farkı)',
  fr:'fonlama', frCh:'fonlama değişimi (son − önceki)', prem:'prim (vadeli − endeks) son 1 sa', premZ:'prim, 7 gün z',
  spotShare:'spot hacim / vadeli hacim, 30 güne göre', spotTk:'spot taker alış payı 1 sa', spotLead:'spot 1 sa − vadeli 1 sa getiri',
  b1:'BTC 1 sa', b4:'BTC 4 sa', rel24:'coin 24 sa − BTC 24 sa', hr:'saat (UTC)', dow:'gün' };
const KEYS=Object.keys(FEATS), NF=KEYS.length;
const btcK=csv(path.join(ARCH,'15m','BTCUSDT.csv')); const btcIx=new Map(btcK.map((r,i)=>[r[0],i]));
const R=[]; // {t, s, z, f: Float32Array}
const syms=Object.keys(monthsOf).filter(s=>fs.existsSync(path.join(ARCH,'15m',s+'.csv')));
const t0=Date.now();
const fixT=t=>t>1e14?Math.floor(t/1000):t; // spot arşivi 2025'ten beri mikrosaniye
function idxBy(rows){ const m=new Map(); rows.forEach((r,i)=>m.set(fixT(r[0]),i)); return m; }
for(const s of syms){
  const k=csv(path.join(ARCH,'15m',s+'.csv')); if(k.length<4000) continue;
  const M=csv(path.join(ARCH,'metrics',s+'.csv')), F=csv(path.join(ARCH,'funding',s+'.csv')), P=csv(path.join(ARCH,'premium15m',s+'.csv')), S=csv(path.join(ARCH,'spot15m',s+'.csv'));
  const pIx=idxBy(P), sIx=idxBy(S);
  const n=k.length, lr=new Float64Array(n); for(let i=1;i<n;i++) lr[i]=L(k[i][4]/k[i-1][4]);
  // kümülatif toplamlar: hacim (q=7), işlem sayısı (8), taker (10), kare getiri, aralık
  const cs=c=>{ const a=new Float64Array(n+1); for(let i=0;i<n;i++) a[i+1]=a[i]+c(i); return a; };
  const Cq=cs(i=>k[i][7]), Cn=cs(i=>k[i][8]), Ctb=cs(i=>k[i][10]), Cr2=cs(i=>lr[i]*lr[i]), Crg=cs(i=>L(k[i][2]/k[i][3]));
  const sum=(C,a,b)=>C[b+1]-C[a]; // [a,b]
  let mj=0, fj=0; const zwin=7*288;
  const lM=c=>M.map(r=>r[c]>0?L(r[c]):NaN); const LP=lM(4), LA=lM(3), LG=lM(5);
  const z7=(a,j)=>{ if(j<500) return NaN; let s1=0,s2=0,c=0; for(let x=Math.max(0,j-zwin);x<j;x+=12){ if(Number.isFinite(a[x])){ s1+=a[x]; s2+=a[x]*a[x]; c++; } } if(c<50||!Number.isFinite(a[j])) return NaN; const m=s1/c, sd=Math.sqrt(Math.max(1e-12,s2/c-m*m)); return (a[j]-m)/sd; };
  for(let i=2900;i<n-97;i++){ const t=k[i][0]+M15; if(t%H) continue; const mo=new Date(k[i][0]).toISOString().slice(0,7); if(!monthsOf[s].has(mo)) continue;
    const sd15=Math.sqrt(sum(Cr2,i-2879,i)/2880); if(!(sd15>0)) continue; const sd4=sd15*4, px=k[i][4];
    const z=L(k[i+16][4]/px)/sd4; const f=new Float32Array(NF).fill(NaN); const set=(key,v)=>{ f[KEYS.indexOf(key)]=v; };
    const ret=b=>L(px/k[i-b][4]);
    set('r1',ret(4)/(sd15*2)); set('r4',ret(16)/sd4); set('r24',ret(96)/(sd15*Math.sqrt(96))); set('r7d',i>=672?ret(672)/(sd15*Math.sqrt(672)):NaN);
    set('sq',Math.sqrt(sum(Cr2,i-95,i)/96)/sd15); set('rng4',(sum(Crg,i-15,i)/16)/(sum(Crg,i-2879,i)/2880));
    const q30=sum(Cq,i-2879,i)/2880, n30=sum(Cn,i-2879,i)/2880;
    set('vq1',(sum(Cq,i-3,i)/4)/q30); set('vq24',(sum(Cq,i-95,i)/96)/q30);
    const sz30=q30/Math.max(1e-9,n30); set('size1',(sum(Cq,i-3,i)/Math.max(1,sum(Cn,i-3,i)))/sz30); set('size24',(sum(Cq,i-95,i)/Math.max(1,sum(Cn,i-95,i)))/sz30); set('cnt1',(sum(Cn,i-3,i)/4)/n30);
    set('tk1',sum(Ctb,i-3,i)/Math.max(1e-9,sum(Cq,i-3,i))); set('tk4',sum(Ctb,i-15,i)/Math.max(1e-9,sum(Cq,i-15,i)));
    let uw=0,lw=0,rg=0,h24=-1e18,l24=1e18,h7=-1e18,l7=1e18; for(let j=i-15;j<=i;j++){ const [,o,h,l,c]=k[j]; uw+=h-Math.max(o,c); lw+=Math.min(o,c)-l; rg+=h-l; }
    for(let j=i-95;j<=i;j++){ if(k[j][2]>h24) h24=k[j][2]; if(k[j][3]<l24) l24=k[j][3]; }
    for(let j=i-671;j<i-3;j++){ if(k[j][2]>h7) h7=k[j][2]; if(k[j][3]<l7) l7=k[j][3]; }
    set('uw',rg>0?uw/rg:NaN); set('lw',rg>0?lw/rg:NaN); set('pos24',(px-l24)/Math.max(1e-12,h24-l24)); set('pos7',(px-l7)/Math.max(1e-12,h7-l7)); set('hi7',px>h7?1:0); set('lo7',px<l7?1:0);
    if(M.length){ while(mj+1<M.length&&M[mj+1][0]<=t) mj++; if(M[mj][0]<=t&&t-M[mj][0]<=15*60e3&&mj>=300){ const oi=M[mj][1], at=b=>M[mj-b]&&M[mj-b][1]>0?L(oi/M[mj-b][1]):NaN;
      set('oi1',at(12)); set('oi4',at(48)); set('oi24',at(288)); set('oiVsPx',at(288)-ret(96)); const zP=z7(LP,mj), zA=z7(LA,mj), zG=z7(LG,mj); set('topPosZ',zP); set('topAccZ',zA); set('globZ',zG); set('smartDiv',zP-zG); } }
    if(F.length){ while(fj+1<F.length&&F[fj+1][0]<=t) fj++; if(F[fj][0]<=t){ set('fr',F[fj][1]); if(fj>0) set('frCh',F[fj][1]-F[fj-1][1]); } }
    const pj=pIx.get(k[i][0]); if(pj!=null&&pj>=672){ let a=0; for(let j=pj-3;j<=pj;j++) a+=P[j][4]; a/=4; set('prem',a); let s1=0,s2=0,c=0; for(let j=pj-672;j<pj;j+=4){ s1+=P[j][4]; s2+=P[j][4]**2; c++; } const m=s1/c, sd=Math.sqrt(Math.max(1e-14,s2/c-m*m)); set('premZ',(a-m)/sd); }
    const sj=sIx.get(k[i][0]); if(sj!=null&&sj>=2880&&sIx.get(k[i-2879][0])!=null){ let sq=0,sq30=0,stb=0; for(let j=sj-3;j<=sj;j++){ sq+=S[j][7]; stb+=S[j][10]; } for(let j=sj-2879;j<=sj;j+=4) sq30+=S[j][7]*4;
      set('spotShare',(sq/Math.max(1e-9,sum(Cq,i-3,i)))/(sq30/Math.max(1e-9,sum(Cq,i-2879,i)))); set('spotTk',sq>0?stb/sq:NaN); set('spotLead',L(S[sj][4]/S[sj-4][4])-ret(4)); }
    const bi=btcIx.get(k[i][0]); if(bi!=null&&bi>=96){ const b=x=>L(btcK[bi][4]/btcK[bi-x][4]); set('b1',b(4)); set('b4',b(16)); set('rel24',ret(96)-b(96)); }
    const d=new Date(t); set('hr',d.getUTCHours()); set('dow',d.getUTCDay());
    R.push({t,s,z,f,y4:L(k[i+16][4]/px),y24:L(k[i+96][4]/px)}); }
  if(R.length%50==0) process.stdout.write('');
}
console.log('gözlem',R.length,((Date.now()-t0)/1000).toFixed(0)+' sn');
R.sort((a,b)=>a.t-b.t); const MID=R[R.length>>1].t, Y12=R[R.length-1].t-365*864e5;
const zs=R.map(r=>r.z).sort((a,b)=>a-b); const UP=zs[Math.floor(zs.length*(1-Q))], DN=zs[Math.floor(zs.length*Q)];
// her özellik için yüzdelik sıra (tüm gözlemlerde)
const PCT=KEYS.map((k,fi)=>{ const ix=[]; for(let i=0;i<R.length;i++) if(Number.isFinite(R[i].f[fi])) ix.push(i); ix.sort((a,b)=>R[a].f[fi]-R[b].f[fi]); const p=new Float32Array(R.length).fill(NaN);
  for(let a=0;a<ix.length;){ let b=a; while(b<ix.length&&R[ix[b]].f[fi]===R[ix[a]].f[fi]) b++; const v=(a+b-1)/2/Math.max(1,ix.length-1); for(let c=a;c<b;c++) p[ix[c]]=v; a=b; } return p; });
function stats(fi,flt){ let nu=0,nd=0,su=0,sd=0,N=0,tU=0,tD=0,bU=0,bD=0,nT=0,nB=0;
  for(let i=0;i<R.length;i++){ if(!flt(R[i])) continue; const p=PCT[fi][i]; if(!Number.isFinite(p)) continue; N++; const up=R[i].z>=UP, dn=R[i].z<=DN;
    if(up){ nu++; su+=p; } if(dn){ nd++; sd+=p; } if(p>=0.9){ nT++; if(up) tU++; if(dn) tD++; } if(p<=0.1){ nB++; if(up) bU++; if(dn) bD++; } }
  const pu=nu/N, pd=nd/N; return {N,up:nu?100*su/nu:NaN,dn:nd?100*sd/nd:NaN,topU:nT?(tU/nT)/pu:NaN,topD:nT?(tD/nT)/pd:NaN,botU:nB?(bU/nB)/pu:NaN,botD:nB?(bD/nB)/pd:NaN}; }
const fx=(v,d=2)=>Number.isFinite(v)?v.toFixed(d).replace('.',','):'—';
const per={h1:r=>r.t<MID,h2:r=>r.t>=MID,y:r=>r.t>=Y12};
const res=KEYS.map((k,fi)=>({k,fi,h1:stats(fi,per.h1),h2:stats(fi,per.h2),y:stats(fi,per.y)}));
// sınıflama: iki yarıda da aynı yönde ve ≥ 1,3 kat lift
const cons=(a,b,c)=>[a,b,c].every(Number.isFinite)&&((a>=1.3&&b>=1.3&&c>=1.2)||(a<=0.77&&b<=0.77&&c<=0.83));
const out=[`# Öncü izler · büyük 4 saatlik hareketlerden önce ne oluyor · ${new Date().toISOString().slice(0,10)}\n`,
  `${syms.length} coin (ayın ilk ${TOP}'u), ${R.length.toLocaleString('tr-TR')} saatlik gözlem, ${new Date(R[0].t).toISOString().slice(0,7)} → ${new Date(R[R.length-1].t).toISOString().slice(0,7)}. Hareket = sonraki 4 saatin getirisi ÷ coinin son 30 günlük oynaklığı. Büyük yükseliş: en üst %${Q*100} (z ≥ ${fx(UP)}), büyük düşüş: en alt %${Q*100} (z ≤ ${fx(DN)}).\n`,
  `**Lift**: özellik en üst (ya da en alt) %10'dayken olayın olma olasılığı ÷ her zamanki olasılık. 1,00 = fark yok, 2,00 = iki kat. Üç sayı: ilk yarı / ikinci yarı / son 12 ay. Kalın = üç dönemde de aynı yönde güçlü.\n`,
  '| Özellik | Olaydan önce ort. sıra (yükseliş · düşüş, taban 50) | En üst %10 → yükseliş lift | En üst %10 → düşüş lift | En alt %10 → yükseliş lift | En alt %10 → düşüş lift |','|---|---|---|---|---|---|'];
const cell=(a,b,c)=>{ const s=`${fx(a)} / ${fx(b)} / ${fx(c)}`; return cons(a,b,c)?`**${s}**`:s; };
const sorted=res.slice().sort((a,b)=>{ const sc=r=>Math.max(...['topU','topD','botU','botD'].map(x=>Math.min(Math.abs(L(r.h1[x]||1)),Math.abs(L(r.h2[x]||1))))); return sc(b)-sc(a); });
for(const r of sorted) out.push(`| ${FEATS[r.k]} | ${fx(r.h2.up,0)} · ${fx(r.h2.dn,0)} | ${cell(r.h1.topU,r.h2.topU,r.y.topU)} | ${cell(r.h1.topD,r.h2.topD,r.y.topD)} | ${cell(r.h1.botU,r.h2.botU,r.y.botU)} | ${cell(r.h1.botD,r.h2.botD,r.y.botD)} |`);
// yön habercileri: en üst %10'da yükseliş lift / düşüş lift oranı üç dönemde de aynı tarafta
out.push('','## Yön söyleyenler','Aynı uçta yükseliş ve düşüş liftleri farklıysa özellik yön söylüyor; ikisi birlikte yükseliyorsa yalnız "büyük hareket geliyor" diyor.\n','| Özellik | Uç | Yükseliş ÷ düşüş lift (1. / 2. yarı / son 12 ay) |','|---|---|---|');
for(const r of res) for(const [u,d,nm] of [['topU','topD','en üst %10'],['botU','botD','en alt %10']]){ const v=['h1','h2','y'].map(p=>r[p][u]/r[p][d]); if(v.every(x=>Number.isFinite(x))&&(v.every(x=>x>=1.25)||v.every(x=>x<=0.8))) out.push(`| ${FEATS[r.k]} | ${nm} | ${v.map(x=>fx(x)).join(' / ')} |`); }
// birleşik kurallar: gerçek getiri (%), taker gidiş-dönüş %0,16 ve maker %0,04 düşülmüş, iki yarı ve son 12 ay
const pc=(key,i)=>PCT[KEYS.indexOf(key)][i]; const F_=(key,i)=>R[i].f[KEYS.indexOf(key)];
const RULES=[
  ['Haftalık tepede + hacim patlaması → long',1,i=>pc('pos7',i)>=0.9&&pc('vq1',i)>=0.8],
  ['… + kalabalık short (tüm hesaplar z alt %30) → long',1,i=>pc('pos7',i)>=0.9&&pc('vq1',i)>=0.8&&pc('globZ',i)<=0.3],
  ['Haftalık dipte + hacim patlaması → short',-1,i=>pc('pos7',i)<=0.1&&pc('vq1',i)>=0.8],
  ['… + kalabalık long (z üst %30) → short',-1,i=>pc('pos7',i)<=0.1&&pc('vq1',i)>=0.8&&pc('globZ',i)>=0.7],
  ['7 günlük tepe kırılımı + geniş aralık → long',1,i=>F_('hi7',i)===1&&pc('rng4',i)>=0.8],
  ['7 günlük dip kırılımı + geniş aralık → short',-1,i=>F_('lo7',i)===1&&pc('rng4',i)>=0.8],
  ['Büyük long, küçük short (fark üst %10) → long',1,i=>pc('smartDiv',i)>=0.9],
  ['Kalabalık short (hesaplar z alt %10) → long',1,i=>pc('globZ',i)<=0.1],
  ['Haftalık tepe + BTC 4 sa üst %20 + hacim → long',1,i=>pc('pos7',i)>=0.9&&pc('b4',i)>=0.8&&pc('vq1',i)>=0.8]];
out.push('','## Birleşik kurallar gerçek getiriyle','Her saat başı kural uyuyorsa sinyal; aynı coinde üst üste sinyaller ayrı sayılır (gerçek bot 4 sa bekler). Getiri yönde, % olarak; maliyet düşülmüş.\n',
  '| Kural | Sinyal | 4 sa kazanma | 4 sa ort. (taker / maker) 1. · 2. yarı · son 12 ay | 24 sa ort. (taker) 1. · 2. yarı · son 12 ay |','|---|---|---|---|---|');
for(const [nm,d,fn] of RULES){ const idx=[]; for(let i=0;i<R.length;i++){ try{ if(fn(i)) idx.push(i); }catch(e){} }
  const m=(f,y,c)=>{ const a=idx.filter(i=>f(R[i])); return a.length?(a.reduce((p,i)=>p+d*R[i][y],0)/a.length*100-c):NaN; };
  const w=idx.length?idx.filter(i=>d*R[i].y4>0).length/idx.length:NaN;
  out.push(`| ${nm} | ${idx.length} | %${fx(100*w,0)} | ${['h1','h2','y'].map(p=>fx(m(per[p],'y4',0.16))+' / '+fx(m(per[p],'y4',0.04))).join(' · ')} | ${['h1','h2','y'].map(p=>fx(m(per[p],'y24',0.16))).join(' · ')} |`); }
const base=(y,flt)=>{ const a=R.filter(flt); return a.reduce((p,r)=>p+r[y],0)/a.length*100; };
out.push('',`Taban (her saat long, maliyetsiz): 4 sa ${['h1','h2','y'].map(p=>fx(base('y4',per[p]),3)).join(' · ')}%, 24 sa ${['h1','h2','y'].map(p=>fx(base('y24',per[p]),3)).join(' · ')}%.`);
fs.writeFileSync(path.join(__dirname,'research-oncu-report.md'),out.join('\n')+'\n'); console.log(out.join('\n'));
