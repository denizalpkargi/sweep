// KoshkahFX "Mechanical SMC Fractal Strategy" testi (11 Ekim 2026, kullanıcı "koshkafx ödüller almış, işe yarar stratejisi var mı").
// Kaynak (TikTok @koshkahfx, video 7496909902032522501): 4 sa aralık + net yapı + inducement → 4 sa/1 sa POI'nin %50 fib geri çekilmesinde
// mitigasyonu → 15 dk BOS/CHoCH onayı → en uç POI'den giriş → stop 15 dk aralık dibinin/tepesinin ötesi → TP1 1:3, son hedef saatlik tepe/dip.
//
// Mekanik yorum (long; short aynası, fiyatlar −1 ile çevrilip aynı kodla):
//  1) 4 sa mumlar (15 dk'dan, UTC hizalı). Fraktal swing (2+2), sağdaki 2 mum kapanınca bilinir.
//  2) Aralık: yeni onaylı 4 sa swing tepesi H; ondan önceki son onaylı swing dibi L; H, L'den önceki son swing tepesini geçmiş olmalı (yükseliş BOS'u,
//     "net yapı"); H − L ≥ 2 × ATR14(4 sa).
//  3) Inducement: H'den sonra, %50 seviyesinin (EQ = L + 0,5·(H − L)) üstünde oluşmuş en az bir 1 sa swing dibi; fiyat EQ'ya inerken onu alır.
//     (`--noidm` kapatır.)
//  4) Mitigasyon: H onaylandıktan sonra ilk 15 dk mumunun dibi ≤ EQ. Öncesinde fiyat H'nin üstüne çıkarsa ya da L'nin altına inerse aralık iptal.
//  5) 15 dk CHoCH: mitigasyondan sonra, en düşük dibin (aralık dibi) öncesindeki son onaylı 15 dk swing tepesinin üstünde 15 dk kapanış.
//     Aralık dibi L'nin altına inerse iptal. Mitigasyondan sonra 3 gün içinde CHoCH yoksa iptal.
//  6) Giriş: "en uç POI" = aralık dibinde ya da hemen öncesinde (≤ 8 mum) son düşüş mumunun (kapanış < açılış) açılışı (order block üst kenarı);
//     limit emir CHoCH mumunun kapanışından sonra 32 mum (8 sa) açık. Stop = aralık dibi × (1 − %0,1). Dolum: fiyat limiti %0,05 geçmeli
//     (`--fill touch` değme, `--fill market` CHoCH sonrası mumun VWAP'ı). Dolumdan önce TP1'e gidilirse iptal.
//  7) Çıkış varyantları: "3R" hepsi 3R; "3R+H" %50 3R'de, stop girişe, kalan H'de (H 3R'den yakınsa hepsi 3R); "2R"; "H" hepsi H'de (H ≥ 1,5R değilse atla).
//     Zaman çıkışı 5 gün (480 mum), o mumun VWAP'ı. Aynı mumda stop ve hedef → stop.
//  Maliyet: limit giriş maker %0,02; stop/zaman/market taker %0,05 + kayma %0,03; hedef maker %0,02; arşiv fonlaması.
//  Plasebo: her işlem için aynı coinde ±30 günde rastgele 15 dk mumu, sonraki mumun VWAP'ından market giriş (taker + kayma), aynı stop yüzdesi,
//  aynı hedef R'leri ve süre; işlemin kendi yönü ve rastgele yön, işlem başına 20 çekiliş.
//  Evren: ayın ilk 30'u (universe.json); dönemler 1. yarı / 2. yarı / son 12 ay.
// Kullanım: node tests/test-koshkah-smc.js [--top 30] [--syms BTCUSDT,ETHUSDT] [--fill through|touch|market] [--noidm] [--synthetic]
//   → tests/test-koshkah-smc-report.md (+ tests/data/arch/koshkah-trades.json)
const fs=require('fs'), path=require('path');
const L=require('./test40-lib'); const {M15,DAY,FEE_T,FEE_M,SLIP,mean,sdev,fx,ny,iso}=L;
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:true); };
const TOP=+arg('top',30), FILL=String(arg('fill','through')), IDM=!arg('noidm',false), SYN=!!arg('synthetic',false), SYMS=arg('syms',null);
const H4=4*36e5, H1=36e5, HOLD=480, VALID=32, CHOCH_MAX=288, OBBACK=8, STOPBUF=0.001, THRU=0.0005;
const VARS=['3R','3R+H','2R','H'];

// ---------- veri ----------
function synth(seed,n){ let s=seed; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  const g=()=>{ let u=0; for(let i=0;i<6;i++) u+=rnd(); return (u-3)/Math.sqrt(0.5); };
  const k={t:new Float64Array(n),o:new Float64Array(n),h:new Float64Array(n),l:new Float64Array(n),c:new Float64Array(n),v:new Float64Array(n),vw:new Float64Array(n),n};
  let p=100; const T0=Date.UTC(2020,0,1);
  for(let i=0;i<n;i++){ const o=p; let hi=o,lo=o,x=o; for(let z=0;z<15;z++){ x*=Math.exp(0.0012*g()); if(x>hi) hi=x; if(x<lo) lo=x; }
    k.t[i]=T0+i*M15; k.o[i]=o; k.h[i]=hi; k.l[i]=lo; k.c[i]=x; k.v[i]=1; k.vw[i]=Math.min(hi,Math.max(lo,(o+hi+lo+x)/4)); p=x; }
  k.idx=new Map(); for(let i=0;i<n;i++) k.idx.set(k.t[i],i); k.fund=[]; return k; }

// long uzayı: short için fiyatlar −1 ile çevrilir (tepe ↔ dip)
function space(k,dir){ if(dir==='long') return k; const n=k.n, m={t:k.t,n,v:k.v,idx:k.idx,fund:k.fund,o:new Float64Array(n),h:new Float64Array(n),l:new Float64Array(n),c:new Float64Array(n),vw:new Float64Array(n)};
  for(let i=0;i<n;i++){ m.o[i]=-k.o[i]; m.h[i]=-k.l[i]; m.l[i]=-k.h[i]; m.c[i]=-k.c[i]; m.vw[i]=-k.vw[i]; } return m; }

// 15 dk'dan üst zaman dilimi: {t,o,h,l,c,i0,i1} (i1 = son 15 dk mumu); yalnız tam mumlar
function agg(k,P){ const out=[]; let cur=null; for(let i=0;i<k.n;i++){ const b=Math.floor(k.t[i]/P)*P;
    if(!cur||cur.t!==b){ if(cur&&cur.i1-cur.i0+1===P/M15) out.push(cur); cur={t:b,o:k.o[i],h:k.h[i],l:k.l[i],c:k.c[i],i0:i,i1:i}; }
    else { if(k.h[i]>cur.h) cur.h=k.h[i]; if(k.l[i]<cur.l) cur.l=k.l[i]; cur.c=k.c[i]; cur.i1=i; } }
  if(cur&&cur.i1-cur.i0+1===P/M15) out.push(cur); return out; }
// fraktal swing (2+2): {i: bar, px, conf: onaylandığı 15 dk mumu indeksi}
function swings(B,hiSide,confIdx){ const out=[]; for(let b=2;b<B.length-2;b++){
    const x=hiSide?B[b].h:B[b].l; const ok=hiSide?(x>B[b-1].h&&x>B[b-2].h&&x>=B[b+1].h&&x>=B[b+2].h):(x<B[b-1].l&&x<B[b-2].l&&x<=B[b+1].l&&x<=B[b+2].l);
    if(ok) out.push({b,px:x,conf:confIdx(b+2),at:confIdx(b)}); } return out; }

// ---------- kurulum bulma (long uzayında) ----------
function setups(k){
  const B4=agg(k,H4), B1=agg(k,H1);
  const sh4=swings(B4,true,b=>B4[b].i1), sl4=swings(B4,false,b=>B4[b].i1);
  const sl1=swings(B1,false,b=>B1[b].i1);
  // 15 dk swing tepeleri: onay indeksi i+2
  const sh15=[]; for(let i=2;i<k.n-2;i++){ const x=k.h[i]; if(x>k.h[i-1]&&x>k.h[i-2]&&x>=k.h[i+1]&&x>=k.h[i+2]) sh15.push(i); }
  // ATR14 (4 sa)
  const atr4=new Float64Array(B4.length); for(let b=1;b<B4.length;b++){ const tr=Math.max(B4[b].h-B4[b].l,Math.abs(B4[b].h-B4[b-1].c),Math.abs(B4[b].l-B4[b-1].c)); atr4[b]=b<15?NaN:0; }
  for(let b=15;b<B4.length;b++){ let s=0; for(let z=b-13;z<=b;z++) s+=Math.max(B4[z].h-B4[z].l,Math.abs(B4[z].h-B4[z-1].c),Math.abs(B4[z].l-B4[z-1].c)); atr4[b]=s/14; }
  const out=[]; let busyUntil=-1;
  for(let a=1;a<sh4.length;a++){
    const Hs=sh4[a]; const start=Hs.conf+1; if(start<=busyUntil||start>=k.n) continue;
    // H'den önceki son onaylı (H anında bilinen) swing dibi
    let Ls=null; for(let z=sl4.length-1;z>=0;z--){ if(sl4[z].b<Hs.b&&sl4[z].conf<=Hs.conf){ Ls=sl4[z]; break; } } if(!Ls) continue;
    let prevH=null; for(let z=a-1;z>=0;z--){ if(sh4[z].b<Ls.b){ prevH=sh4[z]; break; } } if(!prevH||!(Hs.px>prevH.px)) continue;
    const Hp=Hs.px, Lp=Ls.px; if(!(Hp-Lp>=2*atr4[Hs.b])) continue; const EQ=Lp+0.5*(Hp-Lp);
    // mitigasyon
    let mi=-1; for(let i=start;i<k.n;i++){ if(k.h[i]>Hp||k.l[i]<Lp){ mi=-2; break; } if(k.l[i]<=EQ){ mi=i; break; } } if(mi<0) continue;
    if(k.l[mi]<Lp) continue;
    // inducement: H ile mitigasyon arasında onaylanmış, EQ üstünde 1 sa swing dibi
    if(IDM){ let ok=false; for(const s of sl1){ if(s.at>B4[Hs.b].i1&&s.conf<mi&&s.px>EQ){ ok=true; break; } if(s.at>mi) break; } if(!ok) continue; }
    // CHoCH
    let lowI=mi, lowP=k.l[mi], ch=-1;
    for(let i=mi;i<Math.min(k.n,mi+CHOCH_MAX);i++){
      if(k.l[i]<lowP){ lowP=k.l[i]; lowI=i; } if(lowP<Lp) break;
      if(i===mi) continue;
      // aralık dibinden önceki, i anında onaylı son 15 dk swing tepesi (aralık başladıktan sonra)
      let ref=null; { let a=0,b=sh15.length; while(a<b){ const m=(a+b)>>1; if(sh15[m]<lowI) a=m+1; else b=m; }
        for(let z=a-1;z>=0;z--){ const j=sh15[z]; if(j<start) break; if(j+2<=i){ ref=j; break; } } }
      if(ref!=null&&k.c[i]>k.h[ref]){ ch=i; break; }
    }
    if(ch<0||lowP<Lp) { continue; }
    // en uç POI: aralık dibinde ya da öncesinde son düşüş mumu
    let ob=-1; for(let j=lowI;j>=Math.max(start,lowI-OBBACK);j--){ if(k.c[j]<k.o[j]){ ob=j; break; } } if(ob<0) continue;
    const entry=k.o[ob], stop=lowP-Math.abs(lowP)*STOPBUF; if(!(entry>stop)) continue;
    out.push({t:k.t[ch],ch,H:Hp,L:Lp,EQ,entry,stop,mi,lowI,ob}); busyUntil=ch+VALID+HOLD;
  }
  return out;
}

// ---------- işlem simülasyonu (long uzayında; dir yalnız fonlama işareti için) ----------
function fundIdx(F,T){ let a=0,b=F.length; while(a<b){ const m=(a+b)>>1; if(F[m][0]<T) a=m+1; else b=m; } return a; }
function run(k,dir,j0,e,stop,legs,feeIn,hold){ // legs: [{px,part}] hedefler; j0 = ilk fiyat yolu mumu
  const sg=dir==='long'?-1:1; const ru=e-stop; if(!(ru>0)) return null;
  let qty=1, pnl=-Math.abs(e)*feeIn, fp=0, st=stop, li=0; const F=k.fund; let fi=fundIdx(F,k.t[j0]); const end=Math.min(k.n-1,j0+hold);
  const close=(q,px,fee)=>{ pnl+=q*(px-e)-q*Math.abs(px)*fee; qty-=q; };
  for(let j=j0;j<=end;j++){
    while(fi<F.length&&F[fi][0]<k.t[j]+M15){ if(F[fi][0]>=k.t[j]) fp+=sg*qty*Math.abs(k.o[j])*F[fi][1]; fi++; }
    if(k.o[j]<=st){ close(qty,k.o[j]-Math.abs(k.o[j])*SLIP,FEE_T); return {R:(pnl+fp)/ru,how:li?'stop2':'stop',end:j}; }
    if(k.l[j]<=st){ close(qty,st-Math.abs(st)*SLIP,FEE_T); return {R:(pnl+fp)/ru,how:li?'stop2':'stop',end:j}; }
    while(li<legs.length&&k.h[j]>=legs[li].px){ const q=li===legs.length-1?qty:legs[li].part; close(q,legs[li].px,FEE_M); li++; if(st<e) st=e; if(qty<=1e-9) return {R:(pnl+fp)/ru,how:'hedef',end:j}; }
    if(j===end){ close(qty,k.vw[j]-Math.abs(k.vw[j])*SLIP,FEE_T); return {R:(pnl+fp)/ru,how:'zaman',end:j}; }
  }
  return null;
}
function legsFor(v,e,stop,H){ const r=e-stop, t3=e+3*r;
  if(v==='3R') return [{px:t3,part:1}]; if(v==='2R') return [{px:e+2*r,part:1}];
  if(v==='3R+H') return H>t3?[{px:t3,part:0.5},{px:H,part:0.5}]:[{px:t3,part:1}];
  if(v==='H') return H>=e+1.5*r?[{px:H,part:1}]:null; }

function trade(k,dir,s,v){
  const legs=legsFor(v,s.entry,s.stop,s.H); if(!legs) return null;
  let j0=s.ch+1; if(j0>=k.n) return null; let e=s.entry, feeIn=FEE_M, stop=s.stop;
  if(FILL==='market'){ e=k.vw[j0]+Math.abs(k.vw[j0])*SLIP; feeIn=FEE_T; if(!(e>stop)) return null; const r0=s.entry-s.stop; // aynı stop, hedefler R'yle yeniden
    const L2=legsFor(v,e,stop,s.H); if(!L2) return null; const res=run(k,dir,j0+1,e,stop,L2,feeIn,HOLD); return res&&{...res,e,stop,fillI:j0,legsR:L2.map(x=>(x.px-e)/(e-stop))}; }
  const thr=FILL==='touch'?e:e-Math.abs(e)*THRU; const tp1=legs[0].px;
  for(let j=j0;j<Math.min(k.n,j0+VALID);j++){
    if(k.l[j]<=thr){ // dolum (aynı mumda hedef görülse de sayılmaz: fiyat yolu sonraki mumdan başlar)
      let res;
      if(k.l[j]<=stop){ const px=stop-Math.abs(stop)*SLIP; res={R:((px-e)-Math.abs(e)*FEE_M-Math.abs(px)*FEE_T)/(e-stop),how:'stop',end:j}; }
      else res=run(k,dir,j+1,e,stop,legs,FEE_M,HOLD);
      return res&&{...res,e,stop,fillI:j,legsR:legs.map(x=>(x.px-e)/(e-stop))};
    }
    if(k.h[j]>=tp1) return null; // dolumdan önce hedef → iptal
  }
  return null;
}

// plasebo: rastgele mum, aynı stop %, aynı R hedefleri, aynı süre
let SEED=12345; const rnd=()=>{ SEED=(SEED*1664525+1013904223)>>>0; return SEED/4294967296; };
function placebo(kL,kS,dir,tr,sameDir){ const out=[]; const k0=kL; const span=30*DAY/M15;
  for(let d=0;d<20;d++){ const i=Math.floor(tr.fillI-span+rnd()*2*span); if(i<300||i>=k0.n-2||!(k0.v[i+1]>0)) continue;
    const dd=sameDir?dir:(rnd()<0.5?'long':'short'); const k=dd==='long'?kL:kS; const e=k.vw[i+1]+Math.abs(k.vw[i+1])*SLIP;
    const sp=(tr.e-tr.stop)/Math.abs(tr.e); const stop=e-Math.abs(e)*sp; const r=e-stop; const legs=tr.legsR.map((R,z)=>({px:e+R*r,part:tr.legsR.length>1&&z===0?0.5:1}));
    const res=run(k,dd,i+2,e,stop,legs,FEE_T,HOLD); if(res) out.push(res.R); }
  return out; }

// ---------- ana döngü ----------
function coins(){
  if(SYN) return Array.from({length:12},(_,z)=>({sym:'SYN'+z,months:null,k:()=>synth(1000+z,230000)}));
  const U=JSON.parse(fs.readFileSync(path.join(L.ARCH,'universe.json'),'utf8')).months; const mo={};
  for(const m in U) for(const s of U[m].slice(0,TOP)) (mo[s]=mo[s]||new Set()).add(m);
  let list=Object.keys(mo).filter(s=>fs.existsSync(path.join(L.ARCH,'15m',s+'.csv'))); if(SYMS) list=list.filter(s=>String(SYMS).split(',').includes(s));
  return list.sort().map(sym=>({sym,months:mo[sym],k:()=>L.loadCoin(sym)}));
}
const T=[]; const P={}; for(const v of VARS) P[v]={same:[],rand:[]};
const t0=Date.now(); let nc=0;
for(const c of coins()){
  const k=c.k(); if(!k||k.n<3000) continue; nc++; const kS=space(k,'short');
  for(const dir of ['long','short']){ const kk=dir==='long'?k:kS; const S=setups(kk);
    for(const s of S){ const mon=new Date(s.t).toISOString().slice(0,7); if(c.months&&!c.months.has(mon)) continue;
      for(const v of VARS){ const tr=trade(kk,dir,s,v); if(!tr) continue;
        const sp=(tr.e-tr.stop)/Math.abs(tr.e);
        T.push({sym:c.sym,dir,v,t:s.t,R:tr.R,how:tr.how,sp,hR:(s.H-tr.e)/(tr.e-tr.stop)});
        const pS=placebo(k,kS,dir,tr,true), pR=placebo(k,kS,dir,tr,false); P[v].same.push({t:s.t,R:mean(pS)}); P[v].rand.push({t:s.t,R:mean(pR)}); } } }
  if(nc%20===0) console.log(nc,'coin',((Date.now()-t0)/1000|0)+' sn', 'işlem',T.length);
}
// ---------- rapor ----------
const tAll=T.map(x=>x.t), T0=Math.min(...tAll), T1=Math.max(...tAll), MID=SYN?(T0+T1)/2:Date.UTC(2023,5,1), L12=T1-365*DAY;
const PER={'tümü':()=>true,'1. yarı':x=>x.t<MID,'2. yarı':x=>x.t>=MID,'son 12 ay':x=>x.t>=L12};
const st=a=>{ const R=a.map(x=>x.R).filter(Number.isFinite); const m=mean(R); return {n:R.length,m,t:R.length>2?m/(sdev(R)/Math.sqrt(R.length)):NaN,w:R.filter(x=>x>0).length/Math.max(1,R.length)}; };
const cell=a=>{ const s=st(a); return s.n?`${fx(s.m)} (n ${ny(s.n)}, t ${fx(s.t,1)})`:'—'; };
let md=`# KoshkahFX "Mechanical SMC Fractal Strategy" testi · ${new Date().toISOString().slice(0,10)}\n\n`;
md+=`Veri: ${SYN?'yapay rastgele yürüyüş (sağlama)':'arşiv 15 dk, ayın ilk '+TOP+'\'u'}, ${nc} coin, ${iso(T0)} → ${iso(T1)}. Dolum: ${FILL}${IDM?'':', inducement kapalı'}. Yarı sınırı ${iso(MID)}.\n\n`;
md+=`## Ortalama R (maliyet + fonlama dahil)\n\n| Varyant | Dönem | Strateji | Plasebo aynı yön | Plasebo rastgele yön | Kazanma |\n|---|---|---|---|---|---|\n`;
for(const v of VARS) for(const p in PER){ const a=T.filter(x=>x.v===v&&PER[p](x)); md+=`| ${v} | ${p} | ${cell(a)} | ${cell(P[v].same.filter(PER[p]))} | ${cell(P[v].rand.filter(PER[p]))} | ${(st(a).w*100).toFixed(0)} % |\n`; }
md+=`\n## Kırılımlar (3R varyantı)\n\n| Grup | R |\n|---|---|\n`;
const b3=T.filter(x=>x.v==='3R');
for(const d of ['long','short']) md+=`| ${d} | ${cell(b3.filter(x=>x.dir===d))} |\n`;
for(const [a,b] of [[0,0.003],[0.003,0.006],[0.006,0.01],[0.01,0.02],[0.02,1]]) md+=`| stop ${(a*100).toFixed(1)}–${(b*100).toFixed(1)} % | ${cell(b3.filter(x=>x.sp>=a&&x.sp<b))} |\n`;
const yrs=[...new Set(b3.map(x=>new Date(x.t).getUTCFullYear()))].sort(); for(const y of yrs) md+=`| ${y} | ${cell(b3.filter(x=>new Date(x.t).getUTCFullYear()===y))} |\n`;
const hows={}; for(const x of b3) hows[x.how]=(hows[x.how]||0)+1; md+=`\nÇıkışlar (3R): ${Object.entries(hows).map(([h,n])=>h+' '+ny(n)).join(', ')}. Medyan stop ${(b3.map(x=>x.sp).sort((a,b)=>a-b)[b3.length>>1]*100||0).toFixed(2)} %.\n`;
const cs={}; for(const x of b3) (cs[x.sym]=cs[x.sym]||[]).push(x); const cl=Object.entries(cs).filter(([,a])=>a.length>=20).map(([s,a])=>[s,st(a).m]);
md+=`\nCoin (≥20 işlem): ${cl.length}, artı olan ${cl.filter(x=>x[1]>0).length}.\n`;
const out=path.join(__dirname,SYN?'test-koshkah-smc-synthetic-report.md':'test-koshkah-smc-report.md'); fs.writeFileSync(out,md); console.log(md);
if(!SYN) fs.writeFileSync(path.join(L.ARCH,'koshkah-trades.json'),JSON.stringify(T));
