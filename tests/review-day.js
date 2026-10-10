// Bir günün kâğıt işlemlerini tek tek inceler (1 dk mumlarla): ne oldu, bağlam neydi, plan çeşitleri ne verirdi.
// Kullanım: node tests/review-day.js 2026-10-07   (işlemler tests/review-<gün>.json, mumlar tests/data/day-<gün>/ — node tests/fetch-day.js)
const fs=require('fs'), path=require('path'); const {sim,VARIANTS}=require('./sim-lib.js');
const day=process.argv[2]||'2026-10-07'; const DIR=path.join(__dirname,'data','day-'+day);
const T=JSON.parse(fs.readFileSync(path.join(__dirname,`review-${day}.json`),'utf8'));
const K=k=>k.map(x=>({t:x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],q:+x[7],tb:+x[10]}));
const D={}; const load=s=>{ if(D[s]!==undefined) return D[s]; const f=path.join(DIR,s+'.json'); if(!fs.existsSync(f)) return D[s]=null; const r=JSON.parse(fs.readFileSync(f,'utf8')); return D[s]={m1:K(r.k1m),m15:K(r.k15),h1:K(r.k1h),d1:K(r.k1d)}; };
const f1=x=>x==null||!isFinite(x)?'–':(Math.round(x*100)/100).toLocaleString('tr-TR'); const pc=x=>x==null||!isFinite(x)?'–':(x>=0?'+':'')+(x*100).toFixed(1).replace('.',',')+'%';
const idx=(k,t)=>{ let lo=0,hi=k.length-1,r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(k[m].t<=t){ r=m; lo=m+1; } else hi=m-1; } return r; };
const atr=(k,n,len=14)=>{ let s=0,c=0; for(let i=Math.max(1,n-len+1);i<=n;i++){ const p=k[i-1].c; s+=Math.max(k[i].h-k[i].l,Math.abs(k[i].h-p),Math.abs(k[i].l-p)); c++; } return s/c; };
const sma=(a,n)=>a.length<n?NaN:a.slice(-n).reduce((x,y)=>x+y,0)/n;
function ctx(s,t){ const d=load(s); if(!d) return null; const m=d.m15, i=idx(m,t-9e5); if(i<200) return null; const mi=idx(d.m1,t-6e4); const px=mi>=0?d.m1[mi].c:m[i].c;
  const w24=m.slice(i-95,i+1), hi=Math.max(...w24.map(x=>x.h)), lo=Math.min(...w24.map(x=>x.l));
  const a15=atr(m,i)/px, h=idx(d.h1,t-36e5), a1h=atr(d.h1,h)/px;
  const dc=d.d1.filter(x=>x.t+864e5<=t).map(x=>x.c); const v1=m.slice(i-3,i+1).reduce((a,x)=>a+x.q,0), v24=w24.reduce((a,x)=>a+x.q,0)/24;
  return {px,c24:px/m[i-96].c-1,c4:px/m[i-16].c-1,c1:px/m[i-4].c-1,pos:(px-lo)/(hi-lo||1),a15,a1h,s20:px/sma(dc,20)-1,s50:px/sma(dc,50)-1,s200:px/sma(dc,200)-1,vr:v1/v24}; }
const out=[]; const lines=[];
for(const x of T){ const d=load(x.sym); if(!d){ lines.push(`${x.sym}: veri yok`); continue; }
  const t=Date.parse(x.t), i=idx(d.m1,t-60e3); if(i<0) continue; const sd=Math.abs(x.px-x.stop)/x.px;
  const C=ctx(x.sym,t), B=ctx('BTCUSDT',t);
  const sameDir=T.filter(y=>y!==x&&y.dir===x.dir&&Date.parse(y.t)<t&&(!y.close||Date.parse(y.close)>t)).length;
  const V={}; for(const n in VARIANTS){ const r=sim(d.m1,i,x.dir,Object.assign({sd,bar:6e4},VARIANTS[n])); V[n]=r.fill?{R:+r.R.toFixed(2),how:r.how,open:!!r.open}:{R:0,how:"dolmadı"}; }
  const base=sim(d.m1,i,x.dir,{sd,bar:6e4});
  // stop sonrası: stoptan sonraki 8 saatte fiyat hedef 1'e (1,5R) ulaştı mı
  let after=null; if(base.how==="stop"){ const k=idx(d.m1,base.end); const sg=x.dir==="long"?1:-1; const t1=base.entry*(1+sg*1.5*sd); after=false; for(let z=k+1;z<d.m1.length&&d.m1[z].t<base.end+8*36e5;z++){ if(sg>0?d.m1[z].h>=t1:d.m1[z].l<=t1){ after=true; break; } } }
  const r={sym:x.sym,dir:x.dir,t:x.t,score:x.score,yes:x.yes,R:x.R??null,best:x.best??null,exit:x.exit||'açık',tags:x.tags||'',sd,sameDir,ctx:C,btc:B,mfe8:+base.mfe.toFixed(2),mae8:+base.mae.toFixed(2),stopThenT1:after,V};
  out.push(r);
}
fs.writeFileSync(path.join(DIR,'_review.json'),JSON.stringify(out,null,1));
// --- ekran: işlem tablosu ---
console.log(`\n== İşlemler (${day}) ==`);
console.log('Gerçek R ile simülasyonun bugünkü planı (doğrulama): '+out.filter(r=>r.R!=null).map(r=>r.sym.replace('USDT','')+' '+f1(r.R)+'/'+f1(r.V['bugünkü plan'].R)).join(', '));
console.log(['saat','coin','yön','puan','R','en iyi','1 sa','4 sa','24 sa','24s aralıkta yer','stop/ATR15','stop/ATR1s','günlük SMA50','BTC 4 sa','BTC 24 sa','BTC SMA50g','BTC SMA200g','aynı yönde açık','8 sa en iyi/en kötü R','stop sonrası 1,5R'].join(' | '));
for(const r of out){ const C=r.ctx||{}, B=r.btc||{};
  console.log([r.t.slice(5,16).replace('T',' '),r.sym.replace('USDT',''),r.dir,f1(r.score*100),r.R==null?'açık':f1(r.R),f1(r.best),pc(C.c1),pc(C.c4),pc(C.c24),f1(C.pos),f1(r.sd/C.a15),f1(r.sd/C.a1h),pc(C.s50),pc(B.c4),pc(B.c24),pc(B.s50),pc(B.s200),r.sameDir,f1(r.mfe8)+' / '+f1(r.mae8),r.stopThenT1==null?'–':r.stopThenT1?'evet':'hayır'].join(' | ')); }
// --- plan çeşitleri ---
console.log(`\n== Plan çeşitleri (aynı girişler, 1 dk mumlarla; R kendi riskine göre, maliyet dahil; açık işlemler şimdiki fiyatla) ==`);
const names=Object.keys(VARIANTS); console.log(['çeşit','toplam R','ort.','kazanan','long R','short R'].join(' | '));
for(const n of names){ const a=out.map(r=>r.V[n]); const L=out.filter(r=>r.dir==='long').map(r=>r.V[n].R), S=out.filter(r=>r.dir==='short').map(r=>r.V[n].R); const sum=a.reduce((p,v)=>p+v.R,0);
  console.log([n,f1(sum),f1(sum/a.length),a.filter(v=>v.R>0).length+'/'+a.length,f1(L.reduce((p,v)=>p+v,0)),f1(S.reduce((p,v)=>p+v,0))].join(' | ')); }
console.log('\n== Çeşit × işlem (R) ==');
console.log(['coin',...names].join(' | ')); for(const r of out) console.log([r.t.slice(11,16)+' '+r.sym.replace('USDT','')+' '+r.dir[0].toUpperCase(),...names.map(n=>f1(r.V[n].R)+(r.V[n].open?'*':''))].join(' | '));
// BTC saatlik yol
const b=load('BTCUSDT'); if(b){ console.log('\n== BTC saatlik (UTC) =='); const h=b.h1.filter(x=>x.t>=Date.parse(day+'T00:00:00Z')-6*36e5); console.log(h.map(x=>new Date(x.t).toISOString().slice(11,13)+' '+Math.round(x.c)).join(' · ')); }
