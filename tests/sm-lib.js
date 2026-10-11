// Sosyal medya stratejileri testi (11 Ekim 2026) · ortak kütüphane: veri, göstergeler, işlem simülatörü, rastgele kıyas, özet.
// Veri tests/data/sm/<iv>/<SYM>.csv (sm-fetch.js). Tüm sinyaller mum KAPANIŞINDA üretilir, giriş sonraki mumun açılışında + kayma.
// Maliyet: taker %0,05 + kayma %0,03 her tarafta (gidiş-dönüş %0,16, masa ile aynı), fonlama arşivden (8 saatte bir, pozisyon açıksa).
// Stop ve hedef mum içinde: açılış önce; aynı mumda ikisi birden → stop (kötümser). Sonuç R = net getiri ÷ ilk stop uzaklığı.
const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'data','sm');
const FEE=0.0005, SLIP=0.0003, SIDE=FEE+SLIP;

function load(sym,iv){ const f=path.join(DIR,iv,sym+'.csv'); if(!fs.existsSync(f)) return null;
  const L=fs.readFileSync(f,'utf8').trim().split('\n'); const n=L.length;
  const d={sym,iv,n,t:new Float64Array(n),o:new Float64Array(n),h:new Float64Array(n),l:new Float64Array(n),c:new Float64Array(n),v:new Float64Array(n),q:new Float64Array(n),tb:new Float64Array(n)};
  for(let i=0;i<n;i++){ const x=L[i].split(','); d.t[i]=+x[0]; d.o[i]=+x[1]; d.h[i]=+x[2]; d.l[i]=+x[3]; d.c[i]=+x[4]; d.v[i]=+x[5]; d.q[i]=+x[6]; d.tb[i]=+x[8]; }
  d.fund=loadFunding(sym); return d; }
function loadFunding(sym){ const f=path.join(DIR,'funding',sym+'.csv'); if(!fs.existsSync(f)) return {t:[],r:[]};
  const L=fs.readFileSync(f,'utf8').trim().split('\n'); return {t:L.map(x=>+x.split(',')[0]),r:L.map(x=>+x.split(',')[1])}; }
// [t0,t1) aralığındaki fonlama toplamı (long öder +)
function fundSum(F,t0,t1){ let lo=0,hi=F.t.length; while(lo<hi){ const m=(lo+hi)>>1; if(F.t[m]<=t0) lo=m+1; else hi=m; } let s=0; for(let i=lo;i<F.t.length&&F.t[i]<=t1;i++) s+=F.r[i]; return s; }

// ---------- göstergeler (Float64Array, ısınma NaN) ----------
const NA=NaN, A=n=>new Float64Array(n).fill(NaN);
function sma(x,p){ const n=x.length,o=A(n); let s=0; for(let i=0;i<n;i++){ s+=x[i]; if(i>=p) s-=x[i-p]; if(i>=p-1) o[i]=s/p; } return o; }
function ema(x,p){ const n=x.length,o=A(n),k=2/(p+1); let e=NaN,s=0,c=0; for(let i=0;i<n;i++){ const v=x[i]; if(isNaN(v)) continue; if(isNaN(e)){ s+=v; c++; if(c===p){ e=s/p; o[i]=e; } } else { e=v*k+e*(1-k); o[i]=e; } } return o; }
function rma(x,p){ const n=x.length,o=A(n); let e=NaN,s=0,c=0; for(let i=0;i<n;i++){ const v=x[i]; if(isNaN(v)) continue; if(isNaN(e)){ s+=v; c++; if(c===p){ e=s/p; o[i]=e; } } else { e=(e*(p-1)+v)/p; o[i]=e; } } return o; }
function wma(x,p){ const n=x.length,o=A(n),den=p*(p+1)/2; for(let i=p-1;i<n;i++){ let s=0; for(let j=0;j<p;j++) s+=x[i-j]*(p-j); o[i]=s/den; } return o; }
function hma(x,p){ const a=wma(x,Math.floor(p/2)),b=wma(x,p),d=new Float64Array(x.length); for(let i=0;i<x.length;i++) d[i]=2*a[i]-b[i]; return wma(d.map(v=>v),Math.round(Math.sqrt(p))); }
function stdev(x,p){ const n=x.length,o=A(n); for(let i=p-1;i<n;i++){ let s=0,s2=0; for(let j=i-p+1;j<=i;j++){ s+=x[j]; s2+=x[j]*x[j]; } const m=s/p; o[i]=Math.sqrt(Math.max(0,s2/p-m*m)); } return o; }
function tr(d){ const n=d.n,o=new Float64Array(n); for(let i=0;i<n;i++) o[i]=i?Math.max(d.h[i]-d.l[i],Math.abs(d.h[i]-d.c[i-1]),Math.abs(d.l[i]-d.c[i-1])):d.h[i]-d.l[i]; return o; }
function atr(d,p=14){ return rma(tr(d),p); }
function rsi(x,p=14){ const n=x.length,u=new Float64Array(n),dn=new Float64Array(n); for(let i=1;i<n;i++){ const ch=x[i]-x[i-1]; u[i]=ch>0?ch:0; dn[i]=ch<0?-ch:0; }
  const au=rma(u.subarray(1),p),ad=rma(dn.subarray(1),p),o=A(n); for(let i=1;i<n;i++){ const a=au[i-1],b=ad[i-1]; o[i]=isNaN(a)?NaN:(b===0?100:100-100/(1+a/b)); } return o; }
function macd(x,f=12,s=26,g=9){ const a=ema(x,f),b=ema(x,s),m=new Float64Array(x.length); for(let i=0;i<x.length;i++) m[i]=a[i]-b[i]; const sig=ema(m,g),h=new Float64Array(x.length); for(let i=0;i<x.length;i++) h[i]=m[i]-sig[i]; return {m,sig,h}; }
function hh(x,p){ const n=x.length,o=A(n); for(let i=p-1;i<n;i++){ let m=-Infinity; for(let j=i-p+1;j<=i;j++) if(x[j]>m) m=x[j]; o[i]=m; } return o; }
function ll(x,p){ const n=x.length,o=A(n); for(let i=p-1;i<n;i++){ let m=Infinity; for(let j=i-p+1;j<=i;j++) if(x[j]<m) m=x[j]; o[i]=m; } return o; }
function stoch(d,p=14){ const H=hh(d.h,p),L=ll(d.l,p),o=A(d.n); for(let i=0;i<d.n;i++) o[i]=H[i]>L[i]?100*(d.c[i]-L[i])/(H[i]-L[i]):50; return o; }
function stochRsi(x,rp=14,sp=14,k=3,dd=3){ const r=rsi(x,rp),H=hh(r,sp),L=ll(r,sp),s=A(x.length); for(let i=0;i<x.length;i++) s[i]=isNaN(H[i])?NaN:(H[i]>L[i]?100*(r[i]-L[i])/(H[i]-L[i]):50); const K=smaN(s,k),D=smaN(K,dd); return {k:K,d:D}; }
function smaN(x,p){ const n=x.length,o=A(n); for(let i=p-1;i<n;i++){ let s=0,ok=true; for(let j=i-p+1;j<=i;j++){ if(isNaN(x[j])){ok=false;break;} s+=x[j]; } if(ok) o[i]=s/p; } return o; }
function boll(x,p=20,k=2){ const m=sma(x,p),s=stdev(x,p),u=A(x.length),l=A(x.length); for(let i=0;i<x.length;i++){ u[i]=m[i]+k*s[i]; l[i]=m[i]-k*s[i]; } return {m,u,l,s}; }
function supertrend(d,p=10,mult=3){ const a=atr(d,p),n=d.n,dir=new Int8Array(n),line=A(n); let up=NaN,dn=NaN,t=1;
  for(let i=0;i<n;i++){ if(isNaN(a[i])) continue; const hl=(d.h[i]+d.l[i])/2; let bu=hl-mult*a[i], bd=hl+mult*a[i];
    if(!isNaN(up)&&d.c[i-1]>up) bu=Math.max(bu,up); if(!isNaN(dn)&&d.c[i-1]<dn) bd=Math.min(bd,dn);
    if(t===1&&d.c[i]<bu) t=-1; else if(t===-1&&d.c[i]>bd) t=1; up=bu; dn=bd; dir[i]=t; line[i]=t===1?bu:bd; }
  return {dir,line}; }
function adx(d,p=14){ const n=d.n,pdm=new Float64Array(n),mdm=new Float64Array(n); for(let i=1;i<n;i++){ const u=d.h[i]-d.h[i-1],w=d.l[i-1]-d.l[i]; pdm[i]=u>w&&u>0?u:0; mdm[i]=w>u&&w>0?w:0; }
  const T=rma(tr(d),p),P=rma(pdm,p),M=rma(mdm,p),pdi=A(n),mdi=A(n),dx=A(n); for(let i=0;i<n;i++){ pdi[i]=100*P[i]/T[i]; mdi[i]=100*M[i]/T[i]; dx[i]=100*Math.abs(pdi[i]-mdi[i])/(pdi[i]+mdi[i]||1); } return {pdi,mdi,adx:rma(dx,p)}; }
function heikin(d){ const n=d.n,o=new Float64Array(n),c=new Float64Array(n),h=new Float64Array(n),l=new Float64Array(n); for(let i=0;i<n;i++){ c[i]=(d.o[i]+d.h[i]+d.l[i]+d.c[i])/4; o[i]=i?(o[i-1]+c[i-1])/2:(d.o[i]+d.c[i])/2; h[i]=Math.max(d.h[i],o[i],c[i]); l[i]=Math.min(d.l[i],o[i],c[i]); } return {o,h,l,c}; }
function psar(d,st=0.02,inc=0.02,mx=0.2){ const n=d.n,o=A(n),dir=new Int8Array(n); let up=true,af=st,ep=d.h[0],s=d.l[0];
  for(let i=1;i<n;i++){ s=s+af*(ep-s); if(up){ s=Math.min(s,d.l[i-1],i>1?d.l[i-2]:d.l[i-1]); if(d.l[i]<s){ up=false; s=ep; ep=d.l[i]; af=st; } else if(d.h[i]>ep){ ep=d.h[i]; af=Math.min(mx,af+inc); } }
    else { s=Math.max(s,d.h[i-1],i>1?d.h[i-2]:d.h[i-1]); if(d.h[i]>s){ up=true; s=ep; ep=d.h[i]; af=st; } else if(d.l[i]<ep){ ep=d.l[i]; af=Math.min(mx,af+inc); } }
    o[i]=s; dir[i]=up?1:-1; } return {sar:o,dir}; }
function cci(d,p=20){ const n=d.n,tp=new Float64Array(n); for(let i=0;i<n;i++) tp[i]=(d.h[i]+d.l[i]+d.c[i])/3; const m=sma(tp,p),o=A(n); for(let i=p-1;i<n;i++){ let md=0; for(let j=i-p+1;j<=i;j++) md+=Math.abs(tp[j]-m[i]); md/=p; o[i]=md?(tp[i]-m[i])/(0.015*md):0; } return o; }
// günlük (UTC) VWAP, gün başında sıfırlanır
function vwapDay(d){ const n=d.n,o=new Float64Array(n); let pv=0,vv=0,day=-1; for(let i=0;i<n;i++){ const dd=Math.floor(d.t[i]/864e5); if(dd!==day){ day=dd; pv=0; vv=0; } const tp=(d.h[i]+d.l[i]+d.c[i])/3; pv+=tp*d.v[i]; vv+=d.v[i]; o[i]=vv?pv/vv:tp; } return o; }
// Williams fraktalları (2 mum sol/sağ): onay i+2'de bilinir → fr[i+2]=1 (tepe) / -1 (dip) işaretlenir, seviye frLv
function fractals(d,k=2){ const n=d.n,up=A(n),dn=A(n); for(let i=k;i<n-k;i++){ let isH=true,isL=true; for(let j=1;j<=k;j++){ if(!(d.h[i]>d.h[i-j]&&d.h[i]>d.h[i+j])) isH=false; if(!(d.l[i]<d.l[i-j]&&d.l[i]<d.l[i+j])) isL=false; } if(isH) up[i+k]=d.h[i]; if(isL) dn[i+k]=d.l[i]; } return {up,dn}; }
function smma(x,p){ return rma(x,p); }
function ichimoku(d){ const mid=(p)=>{ const H=hh(d.h,p),L=ll(d.l,p),o=A(d.n); for(let i=0;i<d.n;i++) o[i]=(H[i]+L[i])/2; return o; };
  const ten=mid(9),kij=mid(26),sb=mid(52),n=d.n,spanA=A(n),spanB=A(n); // bulut 26 mum ileri: i anındaki bulut = i-26'da hesaplanan
  for(let i=26;i<n;i++){ spanA[i]=(ten[i-26]+kij[i-26])/2; spanB[i]=sb[i-26]; } return {ten,kij,spanA,spanB}; }
function cross(a,b,i){ return a[i-1]<=b[i-1]&&a[i]>b[i]; }  // a, b'yi yukarı keser
function crossV(a,v,i){ return a[i-1]<=v&&a[i]>v; }
// son k mumdaki en düşük dip / en yüksek tepe (i dahil)
function lowest(d,i,k){ let m=Infinity; for(let j=Math.max(0,i-k+1);j<=i;j++) if(d.l[j]<m) m=d.l[j]; return m; }
function highest(d,i,k){ let m=-Infinity; for(let j=Math.max(0,i-k+1);j<=i;j++) if(d.h[j]>m) m=d.h[j]; return m; }

// ---------- simülatör ----------
// sinyal: {i, dir:+1/-1, stop:fiyat (zorunlu, ilk risk), tp:fiyat|null, maxBars, exit:(i,pos)→bool (kapanışta çık, sonraki açılışta), trail:(i,pos)→yeni stop|null}
// Giriş i+1 açılışı. Aynı coinde açık pozisyon varken yeni sinyal atlanır (stratejilerin çoğu tek pozisyon varsayar).
function simulate(d,sigs,opt={}){ const out=[]; let busyUntil=-1; sigs.sort((a,b)=>a.i-b.i);
  for(const s of sigs){ if(s.i<=busyUntil||s.i+1>=d.n) continue; const r=runTrade(d,s,s.i+1,opt); if(!r) continue; out.push(r); busyUntil=r.xi; }
  return out; }
function runTrade(d,s,ei,opt={}){ const dir=s.dir; const lim=s.fixEntry!=null; const raw=lim?s.fixEntry:d.o[ei]; const entry=lim?raw:raw*(1+dir*SLIP); const entFee=lim?0.0002:FEE; let stop=s.stop;
  // giriş açılışı stopun ötesindeyse (boşluk) işlem yok sayılır
  if(dir>0?!(stop<raw):!(stop>raw)) return null; const risk=Math.abs(raw-stop)/raw; if(risk<0.0005) return null;
  const tp=s.tp??null, maxBars=s.maxBars||1e9; let xi=-1,px=0,why='';
  const pos={entry:raw,dir,stop,risk0:Math.abs(raw-stop),ei,tp};
  for(let j=ei;j<d.n;j++){
    const o=d.o[j],h=d.h[j],l=d.l[j];
    if(j>ei){ // açılış boşluğu
      if(dir>0&&o<=pos.stop){ xi=j; px=o; why='stop'; break; } if(dir<0&&o>=pos.stop){ xi=j; px=o; why='stop'; break; }
      if(tp!==null&&(dir>0?o>=tp:o<=tp)){ xi=j; px=o; why='tp'; break; } }
    const hitS=dir>0?l<=pos.stop:h>=pos.stop, hitT=tp!==null&&(dir>0?h>=tp:l<=tp);
    if(hitS){ xi=j; px=pos.stop; why='stop'; break; }
    if(hitT){ xi=j; px=tp; why='tp'; break; }
    if(j-ei+1>=maxBars){ if(j+1<d.n){ xi=j+1; px=d.o[j+1]; why='zaman'; } else { xi=j; px=d.c[j]; why='son'; } break; }
    if(s.exit&&s.exit(j,pos)){ if(j+1<d.n){ xi=j+1; px=d.o[j+1]; why='kural'; } else { xi=j; px=d.c[j]; why='son'; } break; }
    if(s.trail){ const ns=s.trail(j,pos); if(ns!=null&&!isNaN(ns)&&(dir>0?ns>pos.stop:ns<pos.stop)) pos.stop=ns; }
    if(j===d.n-1){ xi=j; px=d.c[j]; why='son'; }
  }
  if(xi<0) return null;
  const exitPx=px*(1-dir*(why==='tp'&&opt.makerTp?0:SLIP)); const exitFee=why==='tp'&&opt.makerTp?0.0002:FEE;
  const g=dir*(exitPx-entry)/entry - entFee - exitFee; const f=dir*fundSum(d.fund,d.t[ei],d.t[xi]);
  const net=g-f; const R=net/(pos.risk0/raw);
  return {sym:d.sym,t:d.t[ei],ei,xi,dir,R,ret:net,risk:risk,why,bars:xi-ei};
}
// rastgele kıyas: aynı coin ve yön, ±30 gün içinde rastgele mum, AYNI stop/hedef uzaklığı (%) ve aynı süre sınırı; çıkış kuralı yerine işlemin kendi süresi kadar tutuş üst sınırı
function rng(seed){ let s=seed>>>0||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
function randomTwin(d,tr0,sig,R,k=3){ const res=[]; const span=Math.round(30*864e5/(d.t[1]-d.t[0]));
  for(let a=0;a<k;a++){ for(let tries=0;tries<10;tries++){ const i=Math.max(60,Math.min(d.n-3,tr0.ei-1+Math.round((R()*2-1)*span))); const raw=d.o[i+1]; const sd=Math.abs(sig.entryRef-sig.stop)/sig.entryRef;
      const tpd=sig.tp!=null?Math.abs(sig.tp-sig.entryRef)/sig.entryRef:null; const s={i,dir:tr0.dir,stop:raw*(1-tr0.dir*sd),tp:tpd!=null?raw*(1+tr0.dir*tpd):null,maxBars:Math.max(1,tr0.bars+1)};
      const r=runTrade(d,s,i+1); if(r){ res.push(r.R); break; } } }
  return res; }
// strateji koşusu: sinyal üretici gen(d) → [{i,dir,stop,tp,...}], her sinyale entryRef = sinyal mumu kapanışı
function runStrategy(name,syms,iv,gen,opt={}){ const trades=[]; const R=rng(12345);
  for(const sym of syms){ const d=load(sym,iv); if(!d||d.n<300) continue; const sigs=gen(d).filter(s=>s&&s.i>=50); for(const s of sigs) s.entryRef=s.fixEntry??d.c[s.i];
    const tt=simulate(d,sigs,opt); const bySig=new Map(sigs.map(s=>[s.i,s]));
    for(const t of tt){ const s=bySig.get(t.ei-1); const rr=randomTwin(d,t,s,R,opt.k||3); t.rnd=rr.length?rr.reduce((a,b)=>a+b,0)/rr.length:NaN; trades.push(t); } }
  return {name,iv,trades}; }
// özet
const SPLIT=Date.UTC(2023,4,15), LAST12=Date.UTC(2025,9,11);
function stats(ts,key='R'){ const x=ts.map(t=>t[key]).filter(v=>!isNaN(v)); const n=x.length; if(!n) return {n:0,m:NaN,t:NaN};
  // t: aylık ortalamalardan
  const by=new Map(); for(const t of ts){ if(isNaN(t[key])) continue; const m=Math.floor(t.t/(30.44*864e5)); if(!by.has(m)) by.set(m,[]); by.get(m).push(t[key]); }
  const mm=[...by.values()].map(a=>a.reduce((p,q)=>p+q,0)/a.length); const mu=mm.reduce((a,b)=>a+b,0)/mm.length, sd=Math.sqrt(mm.reduce((a,b)=>a+(b-mu)**2,0)/Math.max(1,mm.length-1));
  return {n,m:x.reduce((a,b)=>a+b,0)/n,t:mm.length>2&&sd>0?mu/(sd/Math.sqrt(mm.length)):NaN}; }
function summarize(run){ const T=run.trades; const all=stats(T),h1=stats(T.filter(t=>t.t<SPLIT)),h2=stats(T.filter(t=>t.t>=SPLIT)),l12=stats(T.filter(t=>t.t>=LAST12));
  const diff=T.map(t=>({t:t.t,R:t.R-t.rnd})); const dAll=stats(diff),d1=stats(diff.filter(t=>t.t<SPLIT)),d2=stats(diff.filter(t=>t.t>=SPLIT));
  const win=T.filter(t=>t.R>0).length/(T.length||1); const gp=T.filter(t=>t.R>0).reduce((a,t)=>a+t.R,0), gl=-T.filter(t=>t.R<0).reduce((a,t)=>a+t.R,0);
  const rnd=stats(T,'rnd'); const L=stats(T.filter(t=>t.dir>0)),S=stats(T.filter(t=>t.dir<0));
  const gross=T.length?T.reduce((a,t)=>a+t.ret,0)/T.length:NaN; const bars=T.length?T.reduce((a,t)=>a+t.bars,0)/T.length:NaN; const risk=T.length?T.reduce((a,t)=>a+t.risk,0)/T.length:NaN;
  // yıl yıl
  const years={}; for(const t of T){ const y=new Date(t.t).getUTCFullYear(); (years[y]=years[y]||[]).push(t.R); } const yr={}; for(const y in years) yr[y]=years[y].reduce((a,b)=>a+b,0)/years[y].length;
  return {name:run.name,iv:run.iv,n:T.length,win,pf:gl?gp/gl:NaN,R:all.m,tR:all.t,h1:h1.m,h2:h2.m,l12:l12.m,n12:l12.n,rnd:rnd.m,diff:dAll.m,tDiff:dAll.t,d1:d1.m,d2:d2.m,long:L.m,short:S.m,nL:L.n,nS:S.n,retPct:gross*100,bars,riskPct:risk*100,years:yr}; }
module.exports={load,smaN,sma,ema,rma,wma,hma,stdev,tr,atr,rsi,macd,hh,ll,stoch,stochRsi,boll,supertrend,adx,heikin,psar,cci,vwapDay,fractals,smma,ichimoku,cross,crossV,lowest,highest,simulate,runTrade,runStrategy,summarize,stats,SPLIT,LAST12,SIDE};
