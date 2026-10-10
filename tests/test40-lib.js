// Test #40 / #41 ortak parçaları (10 Ekim 2026): masa kararlarını yükleme, coin verisi, genel işlem simülatörü, tablo yardımcıları.
// Giriş: karar mumunun (i) kapanışından sonraki mumun VWAP'ı (q/v, [low, high] içinde) + kayma %0,03, taker %0,05; fiyat yolu giriş mumundan
// sonraki mumdan başlar. Her mumda önce ters uç, sonra lehte uç, sonra kapanış (aynı mumda stop ve hedef → stop). Zaman çıkışı: süre dolunca
// o mumun VWAP'ı (taker + kayma). Felaket/stop: seviyeye değince seviyeden (mum seviyenin ötesinde açıldıysa açılıştan) + kayma, taker.
// Fonlama: her fonlama anında kalan miktar × o mumun açılışı × oran (long öder). R = kâr ÷ risk birimi (fiyat); % = kâr ÷ giriş.
const fs=require('fs'), path=require('path'), readline=require('readline');
const ARCH=path.join(__dirname,'data','arch'); const M15=9e5, H=36e5, DAY=864e5;
const FEE_T=0.0005, FEE_M=0.0002, SLIP=0.0003;
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];

async function loadDecisions(thr=0.35,minYes=3){
  const by={}; let all=0, n=0;
  for(const f of fs.readdirSync(ARCH).filter(f=>/^samples-\d+\.jsonl$/.test(f)).sort()){
    const rl=readline.createInterface({input:fs.createReadStream(path.join(ARCH,f))});
    for await(const l of rl){ if(!l) continue; all++; const s=JSON.parse(l); if(s.veto||s.score==null||s.score<thr||s.yes<minYes||s.R==null) continue;
      const rr2=(s.a.trend[0]<-0.3&&s.a.liq[0]>0.5)?2:3; (by[s.sym]=by[s.sym]||[]).push({sym:s.sym,t:s.t,dir:s.dir,score:s.score,yes:s.yes,sd:s.sd,rr2,R0:s.R}); n++; } }
  return {by,all,n};
}
function loadCoin(sym){
  const raw=csv(path.join(ARCH,'15m',sym+'.csv')); if(!raw.length) return null;
  const n=raw.length; const k={t:new Float64Array(n),o:new Float64Array(n),h:new Float64Array(n),l:new Float64Array(n),c:new Float64Array(n),v:new Float64Array(n),vw:new Float64Array(n)};
  raw.sort((a,b)=>a[0]-b[0]);
  for(let i=0;i<n;i++){ const r=raw[i]; k.t[i]=r[0]; k.o[i]=r[1]; k.h[i]=r[2]; k.l[i]=r[3]; k.c[i]=r[4]; k.v[i]=r[5]; let w=r[5]>0?r[7]/r[5]:NaN; if(!(w>=r[3]&&w<=r[2])) w=r[4]; k.vw[i]=w; }
  k.n=n; k.idx=new Map(); for(let i=0;i<n;i++) k.idx.set(k.t[i],i);
  // 1 sa mumları (kapanmış) ve ATR14
  const h1=[]; for(let i=0;i<n;i++){ const b=Math.floor(k.t[i]/H)*H; const L=h1[h1.length-1]; if(L&&L.t===b){ if(k.h[i]>L.h) L.h=k.h[i]; if(k.l[i]<L.l) L.l=k.l[i]; L.c=k.c[i]; } else h1.push({t:b,h:k.h[i],l:k.l[i],c:k.c[i]}); }
  k.h1=h1;
  k.fund=csv(path.join(ARCH,'funding',sym+'.csv')).map(r=>[r[0],r[1]]).filter(r=>Number.isFinite(r[1])).sort((a,b)=>a[0]-b[0]);
  return k;
}
// t anında (ms) kapanmış son 14 saatin ATR'si (basit ort. TR)
function atr1h(k,T){ const h=k.h1; let lo=0,hi=h.length; while(lo<hi){ const m=(lo+hi)>>1; if(h[m].t+H<=T) lo=m+1; else hi=m; } const n=lo; if(n<16) return NaN;
  let s=0; for(let i=n-14;i<n;i++){ const p=h[i-1].c; s+=Math.max(h[i].h-h[i].l,Math.abs(h[i].h-p),Math.abs(h[i].l-p)); } return s/14; }
function atr15(k,i,len=14){ let s=0,c=0; for(let j=Math.max(1,i-len+1);j<=i;j++){ const p=k.c[j-1]; s+=Math.max(k.h[j]-k.l[j],Math.abs(k.h[j]-p),Math.abs(k.l[j]-p)); c++; } return c?s/c:NaN; }

// Genel simülatör. i = karar mumu (kapanışında karar). spec:
//  riskU: R birimi (fiyat oranı, ör. sd) · stop: ilk stop uzaklığı (oran) ya da null · cat: felaket stop uzaklığı (fiyat) ya da null
//  plan: {t1R:1.5, t1Part:0.5, t2R, t2Part:0.6, trail1:'risk0'|null, be:true} ya da null · trailD: baştan iz uzaklığı (fiyat) ya da null
//  holdBars: süre (mum) · exit 'vwap'
function sim(k,i,dir,spec){
  const isL=dir==='long'; const j0=i+1; if(j0>=k.n) return null; if(!(k.v[j0]>0)) return null;
  const e=isL?k.vw[j0]*(1+SLIP):k.vw[j0]*(1-SLIP); const ru=spec.riskU*e; const sgn=isL?1:-1;
  let stop=spec.stop!=null?(isL?e*(1-spec.stop):e*(1+spec.stop)):null; const risk0=spec.stop!=null?spec.stop*e:ru;
  if(spec.cat!=null){ const cs=isL?e-spec.cat:e+spec.cat; stop=stop==null?cs:(isL?Math.max(stop,cs):Math.min(stop,cs)); }
  const P=spec.plan; let stage='open'; const t1=P?(isL?e+P.t1R*risk0:e-P.t1R*risk0):null, t2=P&&P.t2R?(isL?e+P.t2R*risk0:e-P.t2R*risk0):null;
  let qty=1, pnl=-e*FEE_T, fp=0, hi=e, lo=e; const end=Math.min(k.n-1,j0+spec.holdBars);
  let fi=0; const F=k.fund; { let a=0,b=F.length; while(a<b){ const m=(a+b)>>1; if(F[m][0]<k.t[j0]+M15) a=m+1; else b=m; } fi=a; }
  const close=(q,px,taker)=>{ pnl+=q*sgn*(px-e)-q*px*(taker?FEE_T:FEE_M); qty-=q; };
  const fin=(j,how)=>({R:(pnl+fp)/ru,pct:(pnl+fp)/e,end:j,endT:k.t[j]+M15,how,stage});
  for(let j=j0+1;j<=end;j++){
    while(fi<F.length&&F[fi][0]<k.t[j]+M15){ if(F[fi][0]>=k.t[j]) fp-=sgn*qty*k.o[j]*F[fi][1]; fi++; }
    if(j===end){ if(!(k.v[j]>0)) { close(qty,k.c[j]*(1-sgn*SLIP),true); return fin(j,'son'); } }
    // açılış boşluğu stopun ötesinde
    if(stop!=null&&(isL?k.o[j]<=stop:k.o[j]>=stop)){ close(qty,k.o[j]*(1-sgn*SLIP),true); return fin(j,stage==='open'?'stop':'stop2'); }
    const seq=isL?[k.l[j],k.h[j]]:[k.h[j],k.l[j]];
    for(let z=0;z<2;z++){ const px=seq[z]; if(px>hi) hi=px; if(px<lo) lo=px;
      if(stop!=null&&(isL?px<=stop:px>=stop)){ close(qty,stop*(1-sgn*SLIP),true); return fin(j,stage==='open'?'stop':'stop2'); }
      if(P){
        if(stage==='open'&&(isL?px>=t1:px<=t1)){ close(qty*P.t1Part,t1,false); stage='tp1'; if(P.be&&(isL?e>stop:e<stop)) stop=e; continue; }
        if(stage==='tp1'&&t2&&(isL?px>=t2:px<=t2)){ close(qty*P.t2Part,t2,false); stage='tp2'; }
        if(P.trail1==='risk0'){ const d=stage==='tp1'?1*risk0:stage==='tp2'?0.7*risk0:null; if(d!=null){ const tr=isL?hi-d:lo+d; if(isL?tr>stop:tr<stop) stop=tr; } }
      }
      if(spec.trailD!=null){ const tr=isL?hi-spec.trailD:lo+spec.trailD; if(stop==null||(isL?tr>stop:tr<stop)) stop=tr; }
    }
    if(j===end){ close(qty,k.vw[j]*(1-sgn*SLIP),true); return fin(j,'zaman'); }
  }
  close(qty,k.c[end]*(1-sgn*SLIP),true); return fin(end,'son');
}
// coin+yön başına tek açık işlem: kararlar zaman sıralı; önceki işlem bitmeden gelen alınmaz
function takeSeq(list,k,specFn,simFn=sim){
  const last={long:-Infinity,short:-Infinity}; const out=[];
  for(const d of list){ const i=k.idx.get(d.t); if(i==null||i<300) continue; const T=k.t[i]+M15; if(T<last[d.dir]) continue;
    const spec=specFn(d,i); if(!spec) continue; const r=simFn(k,i,d.dir,spec); if(!r) continue; last[d.dir]=r.endT; out.push({d,i,r,spec}); }
  return out;
}
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const sdev=a=>{ const m=mean(a); return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/Math.max(1,a.length-1)); };
const fx=(v,d=3)=>!Number.isFinite(v)?'—':(v>=0?'+':'')+v.toLocaleString('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d});
const ny=n=>n.toLocaleString('tr-TR');
const iso=t=>new Date(t).toISOString().slice(0,10);
function periods(T0,T1){ const MID=(T0+T1)/2, L12=T1-365*DAY; return {'1. yarı':x=>x.t<MID,'2. yarı':x=>x.t>=MID,'son 12 ay':x=>x.t>=L12}; }
module.exports={ARCH,M15,H,DAY,FEE_T,FEE_M,SLIP,csv,loadDecisions,loadCoin,atr1h,atr15,sim,takeSeq,mean,sdev,fx,ny,iso,periods};
