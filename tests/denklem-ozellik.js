// "Denklem" araştırması, 1. adım: özellik tablosu (8 Ekim 2026; kullanıcı: "yeterince derinlemesine bakmıyoruz; mutlaka bir ya da birden
// fazla gösterge vardır; günün belirli saatlerinde, üç seanstan birinde daha iyi çalışıyor olabilir; araştırmaya daha fazla değişken bağla").
// Her coin için saat başı (yalnız coinin ayın ilk --top coini olduğu aylar) ~100 özellik ve 1 sa / 4 sa / 24 sa ileri getiri yazar.
// Özellik aileleri: fiyat/oynaklık, hacim ve işlem büyüklüğü, taker, fitil/mum biçimi, gün ve hafta yapısı (gün açılışı, önceki gün
// ucu, Asya aralığı, VWAP, hafta açılışı), 30 günlük yapı, OI ve long/short (metrics), fonlama, prim endeksi, spot (baz, pay), BTC
// rejimi (günlük SMA50/200), coinler arası (sıra, genişlik, dağılım, ETH, ilk 10 medyanı), zaman (saat, seans, gün, fonlama
// saatine kalan, ay sonu, cuma vade). Bakış ileri yok: her özellik yalnız t anına kadarki veriyle.
// Çıktı: tests/data/arch/denklem.f32 (satır başına NF float32) + denklem.json (sütun adları, sembol listesi). Python modeli: tests/denklem-model.py
// Kullanım: node --max-old-space-size=12000 tests/denklem-ozellik.js [--top 30]
// 9 Ekim 2026 (kullanıcı: "parametre sayısını artıralım; seansın ilk iki 15 dk mumu önceki günün ucunun üstünde/altında kapandığında ne oldu"):
// +80 değişken: seans açılışı (ilk iki mum, açılış aralığı kırılımı, önceki seans), gün yapısı (önceki gün kapanış yeri, iç gün, gün ucu kırılımı,
// gün ucu üstünden geçen süre, önceki gün VWAP/POC, önceki hafta ucu, ay açılışı, CME boşluğu, yuvarlak sayı), mum kalıpları (yutan, iğne, iç mum,
// NR4), saatlik teknikler (SMA20/50, DX/DI, MACD, sıkışma, varyans oranı, çarpıklık/basıklık, sıçrama sayısı, gecikmeli saatlik getiriler),
// hacim 2 (saat mevsimselliğine göre hacim, hacim zirvesi, delta z, CVD uyumsuzluğu, haftalık VWAP), OI/fonlama 2, BTC 2 (7 g korelasyon/beta,
// 15 dk öncülük, ETH/BTC, BTC − alt medyanı), coinler arası hacim/15 dk sıra, takvim (FOMC/CPI/istihdam'a kalan ve geçen saat, olay penceresi,
// aylık/haftalık opsiyon vadesi, CME açılışı, yarılanmadan beri gün, zirveden düşüş).
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'); const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',30), M15=9e5, H=36e5, DAY=864e5, L=Math.log, T0=Date.UTC(2020,0,1);
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const monthsOf={}; for(const m in U) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const top10={}; for(const m in U) top10[m]=new Set(U[m].slice(0,10));
const fixT=t=>t>1e14?Math.floor(t/1000):t;
const COLS=['sym','th','y1','y4','y24','y1v','y4v','sd15',
  // fiyat / oynaklık
  'r15','r1','r4','r24','r7d','r30d','sq','sq7','rng4','rng1v24','ac1','rsi','bb','hi30','lo30','sinceHi30','sinceLo30','hi7','lo7','pos24','pos7',
  // hacim / işlem
  'vq15','vq1','vq24','vTrend','cnt15','cnt1','size15','size1','size24','tk15','tk1','tk4','tk24','tkTrend',
  // mum biçimi
  'body15','run','uw','lw','big4','sweepU','sweepD',
  // gün / hafta yapısı
  'dOpen','pdh','pdl','pdPos','asiaPos','asiaRng','vwapD','wkOpen','dRng',
  // OI / long-short
  'oi15','oi1','oi4','oi24','oiZ7','oiVsPx1','oiVsPx4','oiVsPx24','oiTurn','topPosZ','topAccZ','globZ','smartDiv','topPosCh4','globCh4','takerM',
  // fonlama / prim / spot
  'fr','frZ','frCh','frCrowd','prem','premZ','premCh','basis','basisCh','spotShare','spotShareCh','spotTk','spotLead',
  // emir defteri derinliği (bookDepth, 2023-06'dan): dengesizlik = (alış − satış) / (alış + satış) nominal
  'dImb02','dImb1','dImb2','dImb5','dImb1Ch','dImb1Z','dDepth1','dDepth5','dBid1Ch','dAsk1Ch',
  // BTC
  'b15','b1','b4','b24','bPrev1','bs50','bs200','bVol','bPos24','rel4','rel24',
  // coinler arası
  'xs1','xs4','xs24','breadth1','breadth4','disp4','eth4','top10m4','nCoins',
  // zaman
  'hr','dow','sess','minFund','dom','monthEnd','fri8','weekend','age',
  // --- 9 Ekim eklemeleri ---
  // seans açılışı
  'sessId','sinceSess','sOpen2','sOpenRet','sOpenPos','orBrk','orSize','prevSessRet','asiaRet','ldnRet',
  // gün / hafta / ay yapısı 2
  'pdRet','pdClosePos','pdRng','pdBrk','insideDay','dPos','sinceDH','sinceDL','trendDay','pdVwap','pdPoc','pwh','pwl','wkPos','moOpen','cmeGap','rnd',
  // mum kalıpları / saatlik teknikler
  'engulf','pin','inside15','nr4','sma2050','dx14','di14','macdH','sqz','vr','skew7','kurt7','jump24','r1l1','r1l2','r1l3','r1l4',
  // hacim 2
  'vqHr','vClimax','vClimaxDir','deltaZ','cvdDiv','vwapW',
  // OI / fonlama 2
  'oiDay','liqProxy','oiHi30','frSum7',
  // BTC / piyasa 2
  'bCorr7','bBeta7','bLead15','ethBtc24','bMinusAlt24','xsVol24','xsR15',
  // takvim
  'toFomc','fromFomc','toCpi','fromCpi','toNfp','fromNfp','evWin','toOptExp','toWkExp','cmeOpen','sinceHalving','ddAth','daysAth','bDdAth'];
const NF=COLS.length, IX={}; COLS.forEach((c,i)=>IX[c]=i);
// takvim: FOMC/CPI (tests/data/events/macro.json), istihdam = ayın ilk cuması; ET → UTC yaz/kış saatiyle
function isDST(t){ const d=new Date(t), y=d.getUTCFullYear(); const nth=(m,n)=>{ let x=new Date(Date.UTC(y,m,1)); let c=0; while(true){ if(x.getUTCDay()===0&&++c===n) return x.getTime(); x=new Date(x.getTime()+DAY); } }; return t>=nth(2,2)+7*H&&t<nth(10,1)+6*H; }
const etToUtc=(day,hET,mET)=>{ const t0=Date.parse(day+'T00:00:00Z'); return t0+((hET+(isDST(t0+12*H)?4:5))*60+mET)*60e3; };
const macro=JSON.parse(fs.readFileSync(path.join(__dirname,'data','events','macro.json'),'utf8'));
const nfpD=[]; for(let y=2020;y<=2027;y++) for(let m=0;m<12;m++){ let d=new Date(Date.UTC(y,m,1)); while(d.getUTCDay()!==5) d=new Date(d.getTime()+DAY); nfpD.push(d.toISOString().slice(0,10)); }
const EVT={fomc:macro.fomc.map(d=>etToUtc(d,14,0)).sort((a,b)=>a-b), cpi:macro.cpi.map(d=>etToUtc(d,8,30)).sort((a,b)=>a-b), nfp:nfpD.map(d=>etToUtc(d,8,30)).sort((a,b)=>a-b)};
const evNear=(arr,t)=>{ let lo=0,hi=arr.length; while(lo<hi){ const m=(lo+hi)>>1; if(arr[m]<=t) lo=m+1; else hi=m; } return {to:lo<arr.length?Math.min(240,(arr[lo]-t)/H):240, from:lo>0?Math.min(240,(t-arr[lo-1])/H):240}; };
const lastFriExp=(t)=>{ const d=new Date(t); let y=d.getUTCFullYear(), m=d.getUTCMonth(); for(let k=0;k<2;k++){ let x=new Date(Date.UTC(y,m+1,0)); while(x.getUTCDay()!==5) x=new Date(x.getTime()-DAY); const e=x.getTime()+8*H; if(e>=t) return (e-t)/H; m++; } return 744; };
const HALV=Date.UTC(2024,3,20);
const syms=Object.keys(monthsOf).filter(s=>fs.existsSync(path.join(ARCH,'15m',s+'.csv'))).sort();
const btcK=csv(path.join(ARCH,'15m','BTCUSDT.csv')); const btcIx=new Map(btcK.map((r,i)=>[r[0],i]));
const bRunMax=new Float64Array(btcK.length); { let m=0; for(let i=0;i<btcK.length;i++){ if(btcK[i][4]>m) m=btcK[i][4]; bRunMax[i]=m; } }
const btcD=csv(path.join(ARCH,'1d','BTCUSDT.csv')); const ethK=csv(path.join(ARCH,'15m','ETHUSDT.csv')); const ethIx=new Map(ethK.map((r,i)=>[r[0],i]));
// BTC günlük: kapanış / SMA50, SMA200 (gün t'nin önceki kapanışlarıyla, bakış ileri yok)
const bsm={}; { const c=btcD.map(r=>r[4]); for(let i=0;i<btcD.length;i++){ const sma=n=>i>=n?c.slice(i-n,i).reduce((a,b)=>a+b,0)/n:NaN; bsm[btcD[i][0]]={s50:sma(50),s200:sma(200)}; } }
const t0=Date.now();
// 1. geçiş: coinler arası özellikler için her saatteki 1/4/24 sa getiriler
const XS=new Map(); // th -> {r1:[],r4:[],r24:[],eth,top10:[]}
const kl={};
for(const s of syms){ const k=csv(path.join(ARCH,'15m',s+'.csv')); if(k.length<4000) continue; kl[s]=k;
  for(let i=96;i<k.length;i++){ const t=k[i][0]+M15; if(t%H) continue; const mo=new Date(k[i][0]).toISOString().slice(0,7); if(!monthsOf[s].has(mo)) continue;
    const th=(t-T0)/H; let o=XS.get(th); if(!o){ o={r1:[],r4:[],r24:[],t10:[],v24:[],r15:[]}; XS.set(th,o); }
    const r1=L(k[i][4]/k[i-4][4]), r4=L(k[i][4]/k[i-16][4]), r24=L(k[i][4]/k[i-96][4]); o.r1.push(r1); o.r4.push(r4); o.r24.push(r24); if(top10[mo]&&top10[mo].has(s)) o.t10.push(r4); o.r15.push(L(k[i][4]/k[i-1][4])); if(i>=2880){ let a=0,b=0; for(let j=i-95;j<=i;j++) a+=k[j][7]; for(let j=i-2879;j<=i;j+=30) b+=k[j][7]; o.v24.push((a/96)/Math.max(1e-9,b/96)); } } }
console.log('1. geçiş', Object.keys(kl).length,'coin', XS.size,'saat', ((Date.now()-t0)/1000).toFixed(0)+' sn');
for(const o of XS.values()){ for(const key of ['r1','r4','r24','v24','r15']) o[key].sort((a,b)=>a-b); o.med24=o.r24.length?o.r24[o.r24.length>>1]:NaN; const a=o.r4; const m=a.reduce((p,x)=>p+x,0)/a.length; o.disp=Math.sqrt(a.reduce((p,x)=>p+(x-m)**2,0)/a.length); o.br1=o.r1.filter(x=>x>0).length/o.r1.length; o.br4=o.r4.filter(x=>x>0).length/o.r4.length; const t=o.t10.sort((a,b)=>a-b); o.t10m=t.length?t[t.length>>1]:NaN; }
const pctIn=(a,v)=>{ let lo=0,hi=a.length; while(lo<hi){ const m=(lo+hi)>>1; if(a[m]<v) lo=m+1; else hi=m; } return a.length>1?lo/(a.length-1):0.5; };
// 2. geçiş
const out=fs.createWriteStream(path.join(ARCH,'denklem.f32')); let rows=0; const symList=[];
const rsiOf=(c,i)=>{ let g=0,l=0; for(let j=i-13;j<=i;j++){ const d=c[j]-c[j-1]; if(d>0) g+=d; else l-=d; } return g+l>0?100*g/(g+l):50; };
for(const s of Object.keys(kl)){ const k=kl[s]; delete kl[s]; const si=symList.push(s)-1;
  const M=csv(path.join(ARCH,'metrics',s+'.csv')), F=csv(path.join(ARCH,'funding',s+'.csv')), P=csv(path.join(ARCH,'premium15m',s+'.csv')), S=csv(path.join(ARCH,'spot15m',s+'.csv'));
  const pIx=new Map(P.map((r,i)=>[fixT(r[0]),i])), sIx=new Map(S.map((r,i)=>[fixT(r[0]),i]));
  const DP=csv(path.join(ARCH,'depth15m',s+'.csv')); const dIx=new Map(DP.map((r,i)=>[r[0],i])); const imbOf=(r,b,a)=>r[b]>0&&r[a]>0?(r[b]-r[a])/(r[b]+r[a]):NaN; // sütunlar: 0 t,1 n,2 b02,3 a02,4 b1,5 a1,6 b2,7 a2,8 b3,9 a3,10 b5,11 a5
  const n=k.length, lr=new Float64Array(n); for(let i=1;i<n;i++) lr[i]=L(k[i][4]/k[i-1][4]);
  const cs=c=>{ const a=new Float64Array(n+1); for(let i=0;i<n;i++) a[i+1]=a[i]+c(i); return a; }; const sum=(C,a,b)=>C[b+1]-C[a];
  const Cq=cs(i=>k[i][7]), Cb=cs(i=>k[i][5]), Cn=cs(i=>k[i][8]), Ctb=cs(i=>k[i][10]), Cr2=cs(i=>lr[i]*lr[i]), Crg=cs(i=>L(k[i][2]/k[i][3]));
  const close=k.map(r=>r[4]); const Cd=cs(i=>2*k[i][10]-k[i][7]); // taker delta birikimi
  const runMax=new Float64Array(n), runMaxI=new Int32Array(n); { let m=0,mi=0; for(let i=0;i<n;i++){ if(close[i]>m){ m=close[i]; mi=i; } runMax[i]=m; runMaxI[i]=mi; } }
  const wkCache={}; // hafta başlangıcı → önceki haftanın ucu
  // günlük yapı: gün başlangıç indeksleri
  const dayStart=new Map(); for(let i=0;i<n;i++){ if(k[i][0]%DAY===0) dayStart.set(k[i][0],i); }
  const lM=c=>M.map(r=>r[c]>0?L(r[c]):NaN); const LO=lM(1), LP=lM(4), LA=lM(3), LG=lM(5); let mj=0, fj=0;
  const z7=(a,j,step=12)=>{ if(j<500||!Number.isFinite(a[j])) return NaN; let s1=0,s2=0,c=0; for(let x=Math.max(0,j-2016);x<j;x+=step) if(Number.isFinite(a[x])){ s1+=a[x]; s2+=a[x]*a[x]; c++; } if(c<50) return NaN; const m=s1/c; return (a[j]-m)/Math.sqrt(Math.max(1e-12,s2/c-m*m)); };
  const buf=new Float32Array(NF);
  for(let i=2900;i<n-97;i++){ const t=k[i][0]+M15; if(t%H) continue; const mo=new Date(k[i][0]).toISOString().slice(0,7); if(!monthsOf[s].has(mo)) continue;
    const sd15=Math.sqrt(sum(Cr2,i-2879,i)/2880); if(!(sd15>0)) continue; const px=close[i], sd4=sd15*2, sd24=sd15*Math.sqrt(96), sd7=sd15*Math.sqrt(672);
    buf.fill(NaN); const set=(c,v)=>{ buf[IX[c]]=v; }; const ret=b=>L(px/close[i-b]);
    set('sym',si); set('th',(t-T0)/H); set('y1',L(close[i+4]/px)/(sd15*2)); set('y4',L(close[i+16]/px)/(sd15*4)); set('y24',L(close[i+96]/px)/sd24); set('sd15',sd15);
    { const vw=j=>k[j][5]>0?k[j][7]/k[j][5]:close[j]; set('y1v',L(vw(i+5)/vw(i+1))/(sd15*2)); set('y4v',L(vw(i+17)/vw(i+1))/(sd15*4)); }
    // fiyat / oynaklık
    set('r15',lr[i]/sd15); set('r1',ret(4)/(sd15*2)); set('r4',ret(16)/(sd15*4)); set('r24',ret(96)/sd24); set('r7d',ret(672)/sd7); set('r30d',ret(2879)/(sd15*Math.sqrt(2880)));
    set('sq',Math.sqrt(sum(Cr2,i-95,i)/96)/sd15); set('sq7',Math.sqrt(sum(Cr2,i-671,i)/672)/sd15);
    const rg30=sum(Crg,i-2879,i)/2880; set('rng4',(sum(Crg,i-15,i)/16)/rg30); set('rng1v24',(sum(Crg,i-3,i)/4)/Math.max(1e-12,sum(Crg,i-95,i)/96));
    { let a=[]; for(let j=i-668;j<=i;j+=4) a.push(L(close[j]/close[j-4])); let m=0; for(const x of a) m+=x; m/=a.length; let c0=0,c1=0; for(let j=0;j<a.length;j++){ c0+=(a[j]-m)**2; if(j) c1+=(a[j]-m)*(a[j-1]-m); } set('ac1',c0>0?c1/c0:NaN); }
    set('rsi',rsiOf(close,i)); { let m=0; for(let j=i-19;j<=i;j++) m+=close[j]; m/=20; let v=0; for(let j=i-19;j<=i;j++) v+=(close[j]-m)**2; const sd=Math.sqrt(v/20); set('bb',sd>0?(px-m)/(2*sd):0); }
    { let h30=-1e18,l30=1e18,hi=0,li=0; for(let j=i-2879;j<=i;j++){ if(k[j][2]>h30){ h30=k[j][2]; hi=j; } if(k[j][3]<l30){ l30=k[j][3]; li=j; } } set('hi30',L(px/h30)/sd24); set('lo30',L(px/l30)/sd24); set('sinceHi30',(i-hi)/2880); set('sinceLo30',(i-li)/2880); }
    let h7=-1e18,l7=1e18,h24=-1e18,l24=1e18; for(let j=i-671;j<i-3;j++){ if(k[j][2]>h7) h7=k[j][2]; if(k[j][3]<l7) l7=k[j][3]; } for(let j=i-95;j<=i;j++){ if(k[j][2]>h24) h24=k[j][2]; if(k[j][3]<l24) l24=k[j][3]; }
    set('hi7',px>h7?1:0); set('lo7',px<l7?1:0); set('pos24',(px-l24)/Math.max(1e-12,h24-l24)); set('pos7',(px-l7)/Math.max(1e-12,h7-l7));
    // hacim / işlem
    const q30=sum(Cq,i-2879,i)/2880, n30=sum(Cn,i-2879,i)/2880, sz30=q30/Math.max(1e-9,n30);
    set('vq15',k[i][7]/q30); set('vq1',(sum(Cq,i-3,i)/4)/q30); set('vq24',(sum(Cq,i-95,i)/96)/q30); set('vTrend',(sum(Cq,i-671,i)/672)/q30);
    set('cnt15',k[i][8]/n30); set('cnt1',(sum(Cn,i-3,i)/4)/n30); set('size15',(k[i][7]/Math.max(1,k[i][8]))/sz30); set('size1',(sum(Cq,i-3,i)/Math.max(1,sum(Cn,i-3,i)))/sz30); set('size24',(sum(Cq,i-95,i)/Math.max(1,sum(Cn,i-95,i)))/sz30);
    const tkr=(a,b)=>sum(Ctb,a,b)/Math.max(1e-9,sum(Cq,a,b)); set('tk15',k[i][10]/Math.max(1e-9,k[i][7])); set('tk1',tkr(i-3,i)); set('tk4',tkr(i-15,i)); set('tk24',tkr(i-95,i)); set('tkTrend',tkr(i-15,i)-tkr(i-95,i));
    // mum biçimi
    { const [,o,h,l,c]=k[i]; set('body15',h>l?(c-o)/(h-l):0); let r=0; const sg=Math.sign(k[i][4]-k[i][1]); for(let j=i;j>=i-15&&Math.sign(k[j][4]-k[j][1])===sg&&sg!==0;j--) r++; set('run',sg*r);
      let uw=0,lw=0,rg=0,big=0; for(let j=i-15;j<=i;j++){ const [,o2,h2,l2,c2]=k[j]; uw+=h2-Math.max(o2,c2); lw+=Math.min(o2,c2)-l2; rg+=h2-l2; if(L(h2/l2)>3*rg30) big++; } set('uw',rg>0?uw/rg:NaN); set('lw',rg>0?lw/rg:NaN); set('big4',big);
      let hh=-1e18,ll=1e18; for(let j=i-3;j<=i;j++){ if(k[j][2]>hh) hh=k[j][2]; if(k[j][3]<ll) ll=k[j][3]; } let h24b=-1e18,l24b=1e18; for(let j=i-99;j<=i-4;j++){ if(k[j][2]>h24b) h24b=k[j][2]; if(k[j][3]<l24b) l24b=k[j][3]; }
      set('sweepU',hh>h24b&&px<h24b?1:0); set('sweepD',ll<l24b&&px>l24b?1:0); }
    // gün / hafta yapısı
    { const d0=t-(t%DAY); const ps=dayStart.get(d0-DAY); const nowDayStart=dayStart.get(d0);
      if(nowDayStart!=null&&i>=nowDayStart){ set('dOpen',L(px/k[nowDayStart][1])/sd24); const bq=sum(Cb,nowDayStart,i), qq=sum(Cq,nowDayStart,i); if(bq>0) set('vwapD',L(px/(qq/bq))/sd24); let dh=-1e18,dl=1e18; for(let j=nowDayStart;j<=i;j++){ if(k[j][2]>dh) dh=k[j][2]; if(k[j][3]<dl) dl=k[j][3]; } set('dRng',L(dh/dl)/(rg30*Math.sqrt(96)*0.6)); }
      if(ps!=null){ const pe=(nowDayStart!=null?nowDayStart:i+1)-1; let ph=-1e18,pl=1e18; for(let j=ps;j<=Math.min(pe,i);j++){ if(k[j][2]>ph) ph=k[j][2]; if(k[j][3]<pl) pl=k[j][3]; } set('pdh',L(px/ph)/sd24); set('pdl',L(px/pl)/sd24); set('pdPos',(px-pl)/Math.max(1e-12,ph-pl)); }
      const hr=new Date(t).getUTCHours(); if(nowDayStart!=null&&hr>=7){ let ah=-1e18,al=1e18; for(let j=nowDayStart;j<nowDayStart+28&&j<=i;j++){ if(k[j][2]>ah) ah=k[j][2]; if(k[j][3]<al) al=k[j][3]; } set('asiaPos',(px-al)/Math.max(1e-12,ah-al)); set('asiaRng',L(ah/al)/(rg30*Math.sqrt(28)*0.6)); }
      const dow=new Date(t).getUTCDay(); const wk0=d0-((dow+6)%7)*DAY; const ws=dayStart.get(wk0); if(ws!=null&&ws<=i) set('wkOpen',L(px/k[ws][1])/sd7); }
    // OI / long-short
    if(M.length){ while(mj+1<M.length&&M[mj+1][0]<=t) mj++; if(M[mj][0]<=t&&t-M[mj][0]<=M15&&mj>=300){ const at=b=>M[mj-b]&&M[mj-b][1]>0&&M[mj][1]>0?L(M[mj][1]/M[mj-b][1]):NaN;
      set('oi15',at(3)); set('oi1',at(12)); set('oi4',at(48)); set('oi24',at(288)); set('oiZ7',z7(LO,mj)); set('oiVsPx1',at(12)-ret(4)); set('oiVsPx4',at(48)-ret(16)); set('oiVsPx24',at(288)-ret(96));
      if(M[mj][2]>0) set('oiTurn',L(M[mj][2]/Math.max(1,sum(Cq,i-95,i)))); const zP=z7(LP,mj), zA=z7(LA,mj), zG=z7(LG,mj); set('topPosZ',zP); set('topAccZ',zA); set('globZ',zG); set('smartDiv',zP-zG);
      if(M[mj-48]){ set('topPosCh4',LP[mj]-LP[mj-48]); set('globCh4',LG[mj]-LG[mj-48]); } if(M[mj][6]>0) set('takerM',L(M[mj][6])); } }
    if(F.length){ while(fj+1<F.length&&F[fj+1][0]<=t) fj++; if(F[fj][0]<=t){ set('fr',F[fj][1]); if(fj>0) set('frCh',F[fj][1]-F[fj-1][1]); if(fj>=90){ let s1=0,s2=0; for(let j=fj-90;j<fj;j++){ s1+=F[j][1]; s2+=F[j][1]**2; } const m=s1/90, sd=Math.sqrt(Math.max(1e-14,s2/90-m*m)); set('frZ',(F[fj][1]-m)/sd); } const g=buf[IX.globZ]; if(Number.isFinite(g)) set('frCrowd',F[fj][1]*1e4*g); } }
    const pj=pIx.get(k[i][0]); if(pj!=null&&pj>=676){ let a=0,b=0; for(let j=pj-3;j<=pj;j++) a+=P[j][4]; for(let j=pj-7;j<=pj-4;j++) b+=P[j][4]; a/=4; b/=4; set('prem',a*1e4); set('premCh',(a-b)*1e4); let s1=0,s2=0,c=0; for(let j=pj-672;j<pj;j+=4){ s1+=P[j][4]; s2+=P[j][4]**2; c++; } const m=s1/c, sd=Math.sqrt(Math.max(1e-14,s2/c-m*m)); set('premZ',(a-m)/sd); }
    const sj=sIx.get(k[i][0]); if(sj!=null&&sj>=2880&&sIx.get(k[i-2879][0])!=null&&sIx.get(k[i-4][0])===sj-4&&sIx.get(k[i-99][0])===sj-99){ let sq=0,stb=0,sq24=0,sq30=0; for(let j=sj-3;j<=sj;j++){ sq+=S[j][7]; stb+=S[j][10]; } for(let j=sj-99;j<=sj-4;j++) sq24+=S[j][7]; for(let j=sj-2879;j<=sj;j+=4) sq30+=S[j][7]*4;
      const sh1=sq/Math.max(1e-9,sum(Cq,i-3,i)), sh24=sq24/Math.max(1e-9,sum(Cq,i-99,i-4)), sh30=sq30/Math.max(1e-9,sum(Cq,i-2879,i));
      set('spotShare',sh1/sh30); set('spotShareCh',L(Math.max(1e-9,sh1)/Math.max(1e-9,sh24))); set('spotTk',sq>0?stb/sq:NaN); set('spotLead',(L(S[sj][4]/S[sj-4][4])-ret(4))/(sd15*2));
      set('basis',L(px/S[sj][4])*1e4); set('basisCh',(L(px/S[sj][4])-L(close[i-4]/S[sj-4][4]))*1e4); }
    // emir defteri derinliği
    { const dj=dIx.get(k[i][0]); if(dj!=null){ const r=DP[dj]; set('dImb02',imbOf(r,2,3)); set('dImb1',imbOf(r,4,5)); set('dImb2',imbOf(r,6,7)); set('dImb5',imbOf(r,10,11));
        if(r[4]>0&&r[5]>0){ set('dDepth1',L((r[4]+r[5])/Math.max(1,q30*4))); } if(r[10]>0&&r[11]>0) set('dDepth5',L((r[10]+r[11])/Math.max(1,q30*4)));
        const d4=dIx.get(k[i-4][0]); if(d4!=null){ const r4=DP[d4]; set('dImb1Ch',imbOf(r,4,5)-imbOf(r4,4,5)); if(r4[4]>0&&r[4]>0) set('dBid1Ch',L(r[4]/r4[4])); if(r4[5]>0&&r[5]>0) set('dAsk1Ch',L(r[5]/r4[5])); }
        let s1=0,s2=0,c=0; for(let j=dj-672;j<dj;j+=4){ if(j<0) break; const v=imbOf(DP[j],4,5); if(Number.isFinite(v)&&DP[j][0]>=k[i][0]-7*DAY){ s1+=v; s2+=v*v; c++; } } if(c>=50){ const m=s1/c, sd=Math.sqrt(Math.max(1e-9,s2/c-m*m)); set('dImb1Z',(imbOf(r,4,5)-m)/sd); } } }
    // BTC
    const bi=btcIx.get(k[i][0]); if(bi!=null&&bi>=2880){ const b=(x,y=0)=>L(btcK[bi-y][4]/btcK[bi-x][4]); let bsd=0; for(let j=bi-2879;j<=bi;j++){ const x=L(btcK[j][4]/btcK[j-1][4]); bsd+=x*x; } bsd=Math.sqrt(bsd/2880); let bsd24=0; for(let j=bi-95;j<=bi;j++){ const x=L(btcK[j][4]/btcK[j-1][4]); bsd24+=x*x; } bsd24=Math.sqrt(bsd24/96);
      set('b15',L(btcK[bi][4]/btcK[bi-1][4])/bsd); set('b1',b(4)/(bsd*2)); set('b4',b(16)/(bsd*4)); set('b24',b(96)/(bsd*Math.sqrt(96))); set('bPrev1',b(8,4)/(bsd*2)); set('bVol',bsd24/bsd);
      let bh=-1e18,bl=1e18; for(let j=bi-95;j<=bi;j++){ if(btcK[j][2]>bh) bh=btcK[j][2]; if(btcK[j][3]<bl) bl=btcK[j][3]; } set('bPos24',(btcK[bi][4]-bl)/Math.max(1e-12,bh-bl));
      set('rel4',(ret(16)-b(16))/(sd15*4)); set('rel24',(ret(96)-b(96))/sd24); const bd=bsm[t-(t%DAY)-DAY]; if(bd){ set('bs50',btcK[bi][4]/bd.s50-1); set('bs200',btcK[bi][4]/bd.s200-1); } }
    // coinler arası
    { const o=XS.get((t-T0)/H); if(o){ set('xs1',pctIn(o.r1,ret(4))); set('xs4',pctIn(o.r4,ret(16))); set('xs24',pctIn(o.r24,ret(96))); set('breadth1',o.br1); set('breadth4',o.br4); set('disp4',o.disp/(sd15*4)); set('top10m4',o.t10m/(sd15*4)); set('nCoins',o.r4.length); }
      const ei=ethIx.get(k[i][0]); if(ei!=null&&ei>=16) set('eth4',L(ethK[ei][4]/ethK[ei-16][4])/(sd15*4)); }
    // --- 9 Ekim eklemeleri ---
    { const d=new Date(t); const hr=d.getUTCHours(), dow=d.getUTCDay(); const d0=t-(t%DAY); const ds=dayStart.get(d0); const ps=dayStart.get(d0-DAY); const pe=ds!=null?ds-1:null;
      let ph=NaN,pl=NaN; if(ps!=null&&pe!=null&&pe>ps){ ph=-1e18; pl=1e18; for(let j=ps;j<=pe;j++){ if(k[j][2]>ph) ph=k[j][2]; if(k[j][3]<pl) pl=k[j][3]; } }
      // seans açılışı: Asya 00, Londra 07, New York 12 (UTC); gece 21–24 seanssız
      if(ds!=null){ const sid=hr<7?0:hr<12?1:hr<21?2:3; set('sessId',sid); const off=sid===0?0:sid===1?28:sid===2?48:84; const ss=ds+off; const sLen=sid===0?28:sid===1?20:sid===2?36:12;
        if(i>=ss){ set('sinceSess',(i-ss+1)/4);
          if(i>=ss+1&&Number.isFinite(ph)){ const c0=close[ss], c1=close[ss+1]; set('sOpen2',c0>ph&&c1>ph?1:c0<pl&&c1<pl?-1:0); set('sOpenRet',L(c1/k[ss][1])/(sd15*Math.SQRT2)); set('sOpenPos',(k[ss][1]-pl)/Math.max(1e-12,ph-pl)); }
          if(i>=ss+2){ const oh=Math.max(k[ss][2],k[ss+1][2]), ol=Math.min(k[ss][3],k[ss+1][3]); set('orBrk',px>oh?1:px<ol?-1:0); set('orSize',L(oh/ol)/(rg30*1.4)); }
          // önceki seans getirisi
          const pss=sid===0?(ps!=null?ps+84:null):ds+(sid===1?0:sid===2?28:48); const pLen=sid===0?12:sid===1?28:sid===2?20:36; if(pss!=null&&pss<ss) set('prevSessRet',L(k[ss][1]/k[pss][1])/(sd15*Math.sqrt(pLen))); }
        if(hr>=7&&ds+27<=i) set('asiaRet',L(close[ds+27]/k[ds][1])/(sd15*Math.sqrt(28))); if(hr>=12&&ds+47<=i) set('ldnRet',L(close[ds+47]/close[ds+27])/(sd15*Math.sqrt(20))); }
      // gün yapısı 2
      if(Number.isFinite(ph)){ set('pdRet',L(close[pe]/k[ps][1])/sd24); set('pdClosePos',(close[pe]-pl)/Math.max(1e-12,ph-pl)); set('pdRng',L(ph/pl)/(rg30*Math.sqrt(96)*0.6));
        const bq=sum(Cb,ps,pe), qq=sum(Cq,ps,pe); if(bq>0) set('pdVwap',L(px/(qq/bq))/sd24);
        { const NB=24, bins=new Float64Array(NB); const w=(ph-pl)/NB; if(w>0){ for(let j=ps;j<=pe;j++){ const b=Math.min(NB-1,Math.floor((close[j]-pl)/w)); bins[b]+=k[j][7]; } let bi=0; for(let b=1;b<NB;b++) if(bins[b]>bins[bi]) bi=b; set('pdPoc',L(px/(pl+(bi+0.5)*w))/sd24); } } }
      if(ds!=null&&i>=ds){ let dh=-1e18,dl=1e18,hi=ds,li=ds; for(let j=ds;j<=i;j++){ if(k[j][2]>dh){ dh=k[j][2]; hi=j; } if(k[j][3]<dl){ dl=k[j][3]; li=j; } }
        set('dPos',(px-dl)/Math.max(1e-12,dh-dl)); set('sinceDH',(i-hi)/4); set('sinceDL',(i-li)/4); set('trendDay',Math.abs(L(px/k[ds][1]))/Math.max(1e-9,L(dh/dl)));
        if(Number.isFinite(ph)){ const up=dh>ph, dn=dl<pl; set('pdBrk',up&&dn?2:up?1:dn?-1:0); set('insideDay',!up&&!dn?1:0); } }
      // önceki hafta ucu, haftalık yer, ay açılışı
      { const wk0=d0-((dow+6)%7)*DAY; let w=wkCache[wk0]; if(w===undefined){ const a=dayStart.get(wk0-7*DAY), b=dayStart.get(wk0); if(a!=null&&b!=null){ let h=-1e18,l=1e18; for(let j=a;j<b;j++){ if(k[j][2]>h) h=k[j][2]; if(k[j][3]<l) l=k[j][3]; } w={h,l}; } else w=null; wkCache[wk0]=w; }
        if(w){ set('pwh',L(px/w.h)/sd7); set('pwl',L(px/w.l)/sd7); set('wkPos',(px-w.l)/Math.max(1e-12,w.h-w.l)); }
        const ms=dayStart.get(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)); if(ms!=null&&ms<=i) set('moOpen',L(px/k[ms][1])/(sd15*Math.sqrt(2880)));
        if(dow===0||dow===6||dow===1){ const fri=d0-((dow+2)%7)*DAY; const fs_=dayStart.get(fri); if(fs_!=null&&fs_+84<=i) set('cmeGap',L(px/close[fs_+83])/sd24); } }
      { const step=Math.pow(10,Math.floor(Math.log10(px))-1); const fr_=(px/step)%1; set('rnd',fr_-0.5); }
      // mum kalıpları (15 dk)
      { const [,o,h,l,c]=k[i], [,o1,h1,l1,c1]=k[i-1]; const bo=Math.min(o,c), bc=Math.max(o,c), b1o=Math.min(o1,c1), b1c=Math.max(o1,c1); const bull=c>o, bear=c<o;
        set('engulf',bull&&c1<o1&&bo<=b1o&&bc>=b1c?1:bear&&c1>o1&&bo<=b1o&&bc>=b1c?-1:0);
        const rg=h-l; set('pin',rg>0&&(bc-bo)<=0.3*rg?((Math.min(o,c)-l)>=0.6*rg?1:(h-Math.max(o,c))>=0.6*rg?-1:0):0);
        set('inside15',h<=h1&&l>=l1?1:0); let nr=1; for(let j=i-3;j<i;j++) if(k[j][2]-k[j][3]<=rg) nr=0; set('nr4',nr); }
      // saatlik teknikler (15 dk'dan toplanmış)
      { const hc=j=>close[i-4*j]; let s20=0,s50=0; for(let j=0;j<50;j++){ const c=hc(j); if(j<20) s20+=c; s50+=c; } set('sma2050',L((s20/20)/(s50/50))/(sd15*Math.sqrt(80)));
        const hH=j=>{ let m=-1e18; for(let x=i-4*j-3;x<=i-4*j;x++) if(k[x][2]>m) m=k[x][2]; return m; }, hL=j=>{ let m=1e18; for(let x=i-4*j-3;x<=i-4*j;x++) if(k[x][3]<m) m=k[x][3]; return m; };
        let pdm=0,ndm=0,tr=0; let H1=hH(0),L1=hL(0); for(let j=1;j<=14;j++){ const H2=hH(j),L2=hL(j); const up=H1-H2, dn=L2-L1; if(up>dn&&up>0) pdm+=up; if(dn>up&&dn>0) ndm+=dn; tr+=Math.max(H1-L1,Math.abs(H1-hc(j)),Math.abs(L1-hc(j))); H1=H2; L1=L2; }
        if(tr>0){ const dip=pdm/tr, dim=ndm/tr; set('dx14',dip+dim>0?(Math.abs(dip-dim)/(dip+dim)):0); set('di14',dip-dim); }
        let e12=0,e26=0,sig=0; { const N=60; let a12=0,a26=0; for(let j=N;j>=0;j--){ const c=hc(j); if(j===N){ a12=c; a26=c; } else { a12+=(c-a12)*2/13; a26+=(c-a26)*2/27; } const m=a12-a26; if(j===N) sig=m; else sig+=(m-sig)*2/10; if(j===0){ e12=a12; e26=a26; } } set('macdH',((e12-e26)-sig)/px/(sd15*2)); }
        { let m=0; for(let j=0;j<20;j++) m+=hc(j); m/=20; let v=0,atr=0; for(let j=0;j<20;j++){ v+=(hc(j)-m)**2; atr+=hH(j)-hL(j); } set('sqz',(4*Math.sqrt(v/20))/Math.max(1e-12,3*atr/20)); }
        { let s1=0,s2=0,s4=0,s3=0,s4m=0; const rs=[]; for(let j=0;j<168;j++){ const r=L(hc(j)/hc(j+1)); rs.push(r); s1+=r; s2+=r*r; } const m=s1/168, v=s2/168-m*m; for(const r of rs){ s3+=(r-m)**3; s4m+=(r-m)**4; } if(v>0){ set('skew7',(s3/168)/Math.pow(v,1.5)); set('kurt7',(s4m/168)/(v*v)-3); }
          let v4=0; for(let j=0;j<42;j++){ const r=L(hc(4*j)/hc(4*j+4)); v4+=(r-4*m)**2; } v4/=42; set('vr',v>0?v4/(4*v):NaN); }
        let jc=0; for(let j=i-95;j<=i;j++) if(Math.abs(lr[j])>3*sd15) jc++; set('jump24',jc);
        set('r1l1',L(close[i-4]/close[i-8])/(sd15*2)); set('r1l2',L(close[i-8]/close[i-12])/(sd15*2)); set('r1l3',L(close[i-12]/close[i-16])/(sd15*2)); set('r1l4',L(close[i-16]/close[i-20])/(sd15*2)); }
      // hacim 2
      { let hs=0; for(let j=1;j<=30;j++) hs+=sum(Cq,i-96*j-3,i-96*j); set('vqHr',(sum(Cq,i-3,i))/Math.max(1e-9,hs/30));
        let mx=0,mi=i; for(let j=i-95;j<=i;j++) if(k[j][7]>mx){ mx=k[j][7]; mi=j; } set('vClimax',mx/q30); set('vClimaxDir',Math.sign(k[mi][4]-k[mi][1]));
        { let s1=0,s2=0; for(let j=1;j<=168;j++){ const dlt=sum(Cd,i-4*j-3,i-4*j); s1+=dlt; s2+=dlt*dlt; } const m=s1/168, sd=Math.sqrt(Math.max(1e-9,s2/168-m*m)); set('deltaZ',(sum(Cd,i-3,i)-m)/sd); }
        set('cvdDiv',Math.sign(ret(16))*Math.sign(sum(Cd,i-15,i)));
        const wk0=d0-((dow+6)%7)*DAY; const ws=dayStart.get(wk0); if(ws!=null&&ws<=i){ const bq=sum(Cb,ws,i), qq=sum(Cq,ws,i); if(bq>0) set('vwapW',L(px/(qq/bq))/sd7); } }
      // OI / fonlama 2
      if(M.length&&M[mj]&&M[mj][0]<=t&&t-M[mj][0]<=M15&&mj>=300){ const kd=Math.round((t-d0)/3e5); if(mj-kd>=0&&M[mj-kd]&&Math.abs(M[mj-kd][0]-d0)<=6e5&&M[mj-kd][1]>0) set('oiDay',L(M[mj][1]/M[mj-kd][1]));
        const o1=buf[IX.oi1], r1v=buf[IX.r1]; set('liqProxy',Number.isFinite(o1)&&o1<-0.01&&Math.abs(r1v)>2?Math.sign(r1v):0);
        let mo=0; for(let j=mj;j>=Math.max(0,mj-8640);j-=12) if(M[j][1]>mo) mo=M[j][1]; if(mo>0) set('oiHi30',L(M[mj][1]/mo)); }
      if(F.length&&fj>=21){ let s1=0; for(let j=fj-20;j<=fj;j++) s1+=F[j][1]; set('frSum7',s1*1e4); }
      // BTC / piyasa 2
      if(bi!=null&&bi>=700){ let sx=0,sy=0,sxx=0,syy=0,sxy=0; for(let j=1;j<=168;j++){ const x=L(btcK[bi-4*j+4][4]/btcK[bi-4*j][4]), y=L(close[i-4*j+4]/close[i-4*j]); sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y; }
        const n_=168, cov=sxy/n_-sx/n_*sy/n_, vx=sxx/n_-(sx/n_)**2, vy=syy/n_-(sy/n_)**2; if(vx>0&&vy>0){ set('bCorr7',cov/Math.sqrt(vx*vy)); set('bBeta7',cov/vx); }
        set('bLead15',buf[IX.b15]-buf[IX.r15]); const ei=ethIx.get(k[i][0]); if(ei!=null&&ei>=96) set('ethBtc24',(L(ethK[ei][4]/ethK[ei-96][4])-L(btcK[bi][4]/btcK[bi-96][4]))*100);
        set('bDdAth',L(btcK[bi][4]/bRunMax[bi])); }
      { const o=XS.get((t-T0)/H); if(o){ if(Number.isFinite(o.med24)&&bi!=null) set('bMinusAlt24',(L(btcK[bi][4]/btcK[bi-96][4])-o.med24)*100); if(o.v24.length>5){ let a=0,b=0; for(let j=i-95;j<=i;j++) a+=k[j][7]; for(let j=i-2879;j<=i;j+=30) b+=k[j][7]; set('xsVol24',pctIn(o.v24,(a/96)/Math.max(1e-9,b/96))); } set('xsR15',pctIn(o.r15,lr[i])); } }
      // takvim
      { const f=evNear(EVT.fomc,t), c=evNear(EVT.cpi,t), nf=evNear(EVT.nfp,t); set('toFomc',f.to); set('fromFomc',f.from); set('toCpi',c.to); set('fromCpi',c.from); set('toNfp',nf.to); set('fromNfp',nf.from);
        set('evWin',[f,c,nf].some(e=>e.to<=1||e.from<=4)?1:0); set('toOptExp',lastFriExp(t)); { let x=((5-dow+7)%7)*24+8-hr; if(x<=0) x+=168; set('toWkExp',x); }
        set('cmeOpen',(dow===0&&hr>=22)||(dow===1&&hr<1)?1:0); set('sinceHalving',(t-HALV)/DAY/1460); set('ddAth',L(px/runMax[i])); set('daysAth',Math.min(365,(i-runMaxI[i])/96)/365); } }
    // zaman
    { const d=new Date(t); const hr=d.getUTCHours(), dow=d.getUTCDay(); set('hr',hr); set('dow',dow); set('sess',hr<7?0:hr<12?1:hr<21?2:3); set('minFund',(480-((t/6e4)%480))%480); set('dom',d.getUTCDate()); set('monthEnd',d.getUTCDate()>=28?1:0); set('fri8',dow===5&&hr>=6&&hr<=9?1:0); set('weekend',dow===0||dow===6?1:0); set('age',i/2880); }
    out.write(Buffer.from(buf.buffer.slice(0))); rows++; }
  if(symList.length%20===0) console.log(' ',symList.length,'coin',rows.toLocaleString('tr-TR'),'satır',((Date.now()-t0)/1000).toFixed(0)+' sn');
}
out.end(()=>{ fs.writeFileSync(path.join(ARCH,'denklem.json'),JSON.stringify({cols:COLS,syms:symList,rows,t0:T0})); console.log('bitti', rows.toLocaleString('tr-TR'),'satır ×',NF,'sütun',((Date.now()-t0)/1000).toFixed(0)+' sn'); });
