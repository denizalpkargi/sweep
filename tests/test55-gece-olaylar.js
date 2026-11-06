// Test #55 (10–11 Ekim 2026 gecesi, kullanıcı: "sabaha kadar aklımıza gelmemiş R'ye etkisi olacak her türlü hızlı day-trading faktörünü test et").
// Denenmemiş 8 gün içi olay, kuralları ve eşikleri veriye bakmadan burada sabitlendi (değiştirilmedi):
//  E1 btcOnculuk   BTC 15 dk getirisi |r| ≥ %1,0 ve coinin aynı mum getirisi BTC yönünde r × 0,3'ten az → coinde BTC yönüne gir (yetişme).
//  E2 fonlamaOncesi fonlama saatinden 1 sa önce; bir önceki gerçekleşen oran ≥ +%0,05 → short, ≤ −%0,05 → long (ödeyen taraf kapatır).
//  E3 hacimSoku    15 dk hacim ≥ 5 × önceki 96 mumun medyanı ve |kapanış − açılış| < 0,3 ATR15 → taker alış payı ≥ 0,55 long, ≤ 0,45 short.
//  E4 fitilRet     kapanmış 1 sa mumu: aralık ≥ 3 × ATR(1 sa) ve tepeden kapanışa ≥ aralığın %60'ı (yukarı iğne) → short; ayna → long.
//  E5 fonlamaDonus fonlama saatinde oran < 0 ve önceki üç oranın ortalaması ≥ +%0,01 → long (kalabalık short'a döndü); ayna → short.
//  E6 takerYorgun  üst üste 3 mum taker alış payı ≥ 0,60 ve her biri yükselen kapanış, sonra payı ≤ 0,45 mum → short; ayna → long.
//  E7 tepe24Kirilim kapanış önceki 96 mumun tepesini geçer ve hacim ≥ 2 × medyan → long (gün içi kırılımı kovala); ayna → short.
//  E8 seansBasi    ABD nakit açılışı 13:30 UTC: 13:30–13:45 mumu |getiri| ≥ 1 ATR15 → yönünde (kaybolmayan açılış hareketi).
// Evren ayın ilk 30 coini (TradFi hariç, delist dahil), 15 dk arşiv, 2020-01 → 2026-10. Coin+olay başına 4 saatte en çok bir olay.
// Giriş: olay mumundan sonraki 15 dk mumun VWAP'ı. Çıkış: 1 / 4 / 24 sa sonraki mumun VWAP'ı. Maliyet taker gidiş-dönüş %0,16 (%0,05 + %0,03 kayma, iki taraf),
// maker satırı %0,04; fonlama arşivden, basit getiri. "Fazla": aynı anda evrendeki bütün coinlere aynı yönde girmenin brüt getirisi çıkarılmış hâli (piyasa ve zaman etkisi).
// Stoplu varyant: stop 1,5 × ATR(1 sa), giriş mumundan sonraki mumlardan itibaren gün içi; R = net ÷ (1,5 ATR / giriş).
// t: aynı UTC gününün olayları tek gözlem (gün ortalaması). Geçme (önceden): fazla ve taker sonrası net, iki yarıda ve son 12 ayda > 0 ve tümünde gün t ≥ 3
// (24 ana test: 8 olay × 3 ufuk; t 3 ≈ Bonferroni %5).
// Kullanım: node --max-old-space-size=6000 tests/test55-gece-olaylar.js → tests/test55-gece-olaylar-report.md, olaylar tests/data/arch/_t55-events.json
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'), M15=9e5, H=36e5, DAY=864e5;
const COST=0.0016, COSTM=0.0004, SLIP=0.0003, TOP=30, HZ=[4,16,96], HN=['1 sa','4 sa','24 sa'];
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months, mon=t=>new Date(t).toISOString().slice(0,7);
const inU={}; for(const m in U) inU[m]=new Set(U[m].slice(0,TOP));
const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)))].filter(s=>fs.existsSync(path.join(ARCH,'15m',s+'.csv'))).sort();
const T0=Date.UTC(2020,0,1), NB=Math.ceil((Date.now()-T0)/M15)+10;
const SUM=HZ.map(()=>new Float64Array(NB)), CNT=HZ.map(()=>new Uint16Array(NB));
function load(s){
  const raw=fs.readFileSync(path.join(ARCH,'15m',s+'.csv'),'utf8').split('\n'); const n=raw.length;
  const k={t:new Float64Array(n),o:new Float64Array(n),h:new Float64Array(n),l:new Float64Array(n),c:new Float64Array(n),v:new Float64Array(n),tb:new Float64Array(n),vw:new Float64Array(n)}; let m=0;
  for(const line of raw){ if(!line) continue; const a=line.split(','); const v=+a[5]; k.t[m]=+a[0]; k.o[m]=+a[1]; k.h[m]=+a[2]; k.l[m]=+a[3]; k.c[m]=+a[4]; k.v[m]=v; k.tb[m]=+a[9];
    let w=v>0?(+a[7])/v:NaN; if(!(w>=k.l[m]&&w<=k.h[m])) w=k.c[m]; k.vw[m]=w; m++; }
  for(const f in k) k[f]=k[f].subarray(0,m); k.n=m;
  const ff=path.join(ARCH,'funding',s+'.csv'); k.ft=[]; k.fr=[];
  if(fs.existsSync(ff)) for(const l of fs.readFileSync(ff,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); if(Number.isFinite(+r)){ k.ft.push(+t); k.fr.push(+r); } }
  k.fc=new Float64Array(k.fr.length+1); for(let i=0;i<k.fr.length;i++) k.fc[i+1]=k.fc[i]+k.fr[i];
  // 1 sa mumları ve ATR(14)
  const h1=[]; for(let i=0;i<m;i++){ const b=Math.floor(k.t[i]/H)*H, L=h1[h1.length-1]; if(L&&L.t===b){ L.h=Math.max(L.h,k.h[i]); L.l=Math.min(L.l,k.l[i]); L.c=k.c[i]; L.last=i; } else h1.push({t:b,o:k.o[i],h:k.h[i],l:k.l[i],c:k.c[i],last:i}); }
  for(let j=0;j<h1.length;j++){ if(j<15){ h1[j].atr=NaN; continue; } let s2=0; for(let q=j-13;q<=j;q++){ const p=h1[q-1].c; s2+=Math.max(h1[q].h-h1[q].l,Math.abs(h1[q].h-p),Math.abs(h1[q].l-p)); } h1[j].atr=s2/14; }
  k.h1=h1; k.h1i=new Int32Array(m).fill(-1); for(let j=0;j<h1.length;j++) k.h1i[h1[j].last]=j; // kapanan 1 sa mumunun son 15 dk indeksi → 1 sa sırası
  return k;
}
const lb=(a,x)=>{ let lo=0,hi=a.length; while(lo<hi){ const md=(lo+hi)>>1; if(a[md]<x) lo=md+1; else hi=md; } return lo; };
const fundSum=(k,t0,t1)=>{ const a=lb(k.ft,t0+1), b=lb(k.ft,t1+1); return k.fc[b]-k.fc[a]; }; // (t0, t1]
function atrH(k,i){ // i mumunun kapanışında bilinen son kapanmış 1 sa ATR'si
  const T=k.t[i]+M15; let lo=0,hi=k.h1.length; while(lo<hi){ const md=(lo+hi)>>1; if(k.h1[md].t+H<=T) lo=md+1; else hi=md; } return lo>0?k.h1[lo-1].atr:NaN; }
function atr15(k,i){ let s=0; for(let j=i-13;j<=i;j++){ const p=k.c[j-1]; s+=Math.max(k.h[j]-k.l[j],Math.abs(k.h[j]-p),Math.abs(k.l[j]-p)); } return s/14; }
// i olay mumu; dönen: her ufuk için brüt long getiri, net (yönlü), stoplu R
function trade(k,i,d){
  const j=i+1; if(j>=k.n||!(k.v[j]>0)||k.t[j]!==k.t[i]+M15) return null; const e=k.vw[j], a=atrH(k,i); if(!(a>0)) return null;
  const sd=1.5*a/e, stop=e*(1-d*sd); const out={g:[],net:[],netM:[],R:[]}; let stopped=null;
  for(let h=0;h<HZ.length;h++){ const x=j+HZ[h]; if(x>=k.n||k.t[x]!==k.t[j]+HZ[h]*M15||!(k.v[x]>0)){ out.g.push(null); out.net.push(null); out.netM.push(null); out.R.push(null); continue; }
    const g=k.vw[x]/e-1, f=fundSum(k,k.t[j],k.t[x]); out.g.push(g); out.net.push(d*g-COST-d*f); out.netM.push(d*g-COSTM-d*f);
    if(stopped==null) for(let q=j+1;q<=x;q++){ if(d>0?k.l[q]<=stop:k.h[q]>=stop){ stopped=q; break; } }
    if(stopped!=null&&stopped<=x){ const px=(d>0?Math.min(k.o[stopped],stop):Math.max(k.o[stopped],stop))*(1-d*SLIP); const ff=fundSum(k,k.t[j],k.t[stopped]); out.R.push((d*(px/e-1)-COST-d*ff)/sd); }
    else out.R.push((d*g-COST-d*f)/sd); }
  return out;
}
const EV={E1:'BTC öncülüğü (yetişme)',E2:'fonlama saatinden önce ödeyen taraf kapatır',E3:'hareketsiz hacim şoku → taker yönü',E4:'1 sa iğne → ters',E5:'fonlama işaret dönüşü → yeni kalabalığın tersi',E6:'taker yorgunluğu → ters',E7:'24 sa tepe/dip kırılımını kovala (hacimli)',E8:'ABD açılış mumu yönünde'};
const events=[]; const btc=load('BTCUSDT'); const btcR=new Map(); for(let i=1;i<btc.n;i++) btcR.set(btc.t[i],btc.c[i]/btc.c[i-1]-1);
const t00=Date.now(); let si=0;
for(const s of syms){ si++; const k=s==='BTCUSDT'?btc:load(s); const last={};
  const ok=i=>inU[mon(k.t[i])]&&inU[mon(k.t[i])].has(s);
  const push=(id,i,d)=>{ const key=id+d; if(last[key]!=null&&k.t[i]-last[key]<4*H) return; const r=trade(k,i,d); if(!r) return; last[key]=k.t[i]; events.push({id,s,t:k.t[i],d,...r}); };
  // taban: evren saatlerinde her mum için brüt long getiri (zaman eşleşmesi)
  for(let i=100;i<k.n-1;i++){ if(!ok(i)) continue; const j=i+1; if(!(k.v[j]>0)) continue; const b=Math.round((k.t[i]-T0)/M15); if(b<0||b>=NB) continue;
    for(let h=0;h<HZ.length;h++){ const x=j+HZ[h]; if(x<k.n&&k.t[x]===k.t[j]+HZ[h]*M15&&k.v[x]>0){ SUM[h][b]+=k.vw[x]/k.vw[j]-1; CNT[h][b]++; } } }
  // medyan hacim (96) için kayan pencere yerine her 16 mumda bir yenilenen medyan (yaklaşık, ileriye bakmaz)
  let med=NaN;
  const fidx=new Map(); for(let q=0;q<k.ft.length;q++) fidx.set(k.ft[q],q);
  for(let i=100;i<k.n-2;i++){ if(!ok(i)) continue;
    if(i%16===0){ const w=Array.from(k.v.subarray(i-96,i)).sort((a,b)=>a-b); med=w[48]; }
    const r=k.c[i]/k.c[i-1]-1, at15=atr15(k,i), tsh=k.v[i]>0?k.tb[i]/k.v[i]:NaN;
    // E1
    if(s!=='BTCUSDT'){ const rb=btcR.get(k.t[i]); if(rb!=null&&Math.abs(rb)>=0.01&&Math.sign(rb)*r<0.3*Math.abs(rb)) push('E1',i,Math.sign(rb)); }
    // E2: bu mumun kapanışı fonlama saatinden tam 1 sa önce
    const T=k.t[i]+M15+H; if(fidx.has(T)){ const q=fidx.get(T); if(q>0){ const fp=k.fr[q-1]; if(fp>=0.0005) push('E2',i,-1); else if(fp<=-0.0005) push('E2',i,1); } }
    // E5: bu mumun kapanışı fonlama saati
    const T5=k.t[i]+M15; if(fidx.has(T5)){ const q=fidx.get(T5); if(q>=3){ const now=k.fr[q], pr=(k.fr[q-1]+k.fr[q-2]+k.fr[q-3])/3; if(now<0&&pr>=0.0001) push('E5',i,1); else if(now>0&&pr<=-0.0001) push('E5',i,-1); } }
    // E3
    if(med>0&&k.v[i]>=5*med&&Math.abs(k.c[i]-k.o[i])<0.3*at15&&Number.isFinite(tsh)){ if(tsh>=0.55) push('E3',i,1); else if(tsh<=0.45) push('E3',i,-1); }
    // E4: 1 sa mumu bu mumla kapandıysa
    const hj=k.h1i[i]; if(hj>15&&k.t[i]+M15===k.h1[hj].t+H){ const b=k.h1[hj], a=k.h1[hj-1].atr, rg=b.h-b.l; if(a>0&&rg>=3*a){ if(b.h-b.c>=0.6*rg&&b.h-b.o>=0.5*rg) push('E4',i,-1); else if(b.c-b.l>=0.6*rg&&b.o-b.l>=0.5*rg) push('E4',i,1); } }
    // E6
    if(i>=4&&k.v[i]>0){ const sh=q=>k.v[q]>0?k.tb[q]/k.v[q]:NaN; const a1=sh(i-3),a2=sh(i-2),a3=sh(i-1);
      if(a1>=0.6&&a2>=0.6&&a3>=0.6&&k.c[i-3]>k.c[i-4]&&k.c[i-2]>k.c[i-3]&&k.c[i-1]>k.c[i-2]&&tsh<=0.45) push('E6',i,-1);
      else if(a1<=0.4&&a2<=0.4&&a3<=0.4&&k.c[i-3]<k.c[i-4]&&k.c[i-2]<k.c[i-3]&&k.c[i-1]<k.c[i-2]&&tsh>=0.55) push('E6',i,1); }
    // E7
    if(med>0&&k.v[i]>=2*med){ let hi=-Infinity,lo=Infinity; for(let q=i-96;q<i;q++){ if(k.h[q]>hi) hi=k.h[q]; if(k.l[q]<lo) lo=k.l[q]; } if(k.c[i]>hi) push('E7',i,1); else if(k.c[i]<lo) push('E7',i,-1); }
    // E8: 13:30–13:45 UTC mumu
    const dd=new Date(k.t[i]); if(dd.getUTCHours()===13&&dd.getUTCMinutes()===30&&at15>0&&Math.abs(k.c[i]-k.o[i])>=at15) push('E8',i,Math.sign(k.c[i]-k.o[i]));
  }
  if(si%40===0) console.log(si,'/',syms.length,s,events.length,((Date.now()-t00)/1e3).toFixed(0)+' sn');
}
// fazla getiri
for(const e of events){ const b=Math.round((e.t-T0)/M15); e.x=e.g.map((g,h)=>g==null||!CNT[h][b]?null:e.d*(g-SUM[h][b]/CNT[h][b])); }
const tE=events.reduce((m,e)=>Math.max(m,e.t),0), tS=events.reduce((m,e)=>Math.min(m,e.t),Infinity), tM=(tS+tE)/2, t12=tE-365*DAY;
const fx=(x,d=3)=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(d).replace('.',','):'–';
function st(list,f){ const v=list.map(f).filter(Number.isFinite); if(!v.length) return {n:0}; const by=new Map(); list.forEach(e=>{ const y=f(e); if(!Number.isFinite(y)) return; const d=Math.floor(e.t/DAY); (by.get(d)||by.set(d,[]).get(d)).push(y); });
  const dm=[...by.values()].map(a=>a.reduce((p,q)=>p+q,0)/a.length), m=dm.reduce((a,b)=>a+b,0)/dm.length, sd=Math.sqrt(dm.reduce((a,b)=>a+(b-m)**2,0)/Math.max(1,dm.length-1));
  return {n:v.length,days:dm.length,m:v.reduce((a,b)=>a+b,0)/v.length,t:sd>0?m/sd*Math.sqrt(dm.length):NaN}; }
const L=['# Test #55 · Gece taraması: 8 gün içi olay (arşiv)','',`10–11 Ekim 2026 gecesi · \`node tests/test55-gece-olaylar.js\` · ${syms.length} coin, ${new Date(tS).toISOString().slice(0,10)} → ${new Date(tE).toISOString().slice(0,10)}`,'',
 'Kurallar ve eşikler betiğin başında, veriye bakmadan sabitlendi. Giriş olaydan sonraki 15 dk mumun VWAP\'ı, çıkış ufuk sonundaki mumun VWAP\'ı. Net = yönlü getiri − taker %0,16 − fonlama; maker = − %0,04. Fazla = yönlü (coin − aynı anda evrendeki tüm coinlerin ortalaması), brüt. Stoplu R: 1,5 ATR(1 sa) stop. t gün kümeli. % değerler işlem başı yüzde.','',
 '| Olay | Ufuk | n | Gün | Fazla % (t) | 1. yarı / 2. yarı / son 12 ay fazla % | Net taker % (t) | Net yarılar / son 12 ay % | Net maker % | Stoplu R | Long net % (n) | Short net % (n) | Geçti |','|---|---|---:|---:|---|---|---|---|---:|---:|---|---|---|'];
const pass=[];
for(const id in EV) for(let h=0;h<HZ.length;h++){ const E=events.filter(e=>e.id===id&&e.net[h]!=null); if(!E.length){ L.push(`| ${id} ${EV[id]} | ${HN[h]} | 0 |`); continue; }
  const P=[e=>e.t<tM,e=>e.t>=tM,e=>e.t>=t12];
  const X=st(E,e=>e.x[h]), N=st(E,e=>e.net[h]), M=st(E,e=>e.netM[h]), R=st(E,e=>e.R[h]);
  const xp=P.map(p=>st(E.filter(p),e=>e.x[h]).m), np=P.map(p=>st(E.filter(p),e=>e.net[h]).m);
  const lo=st(E.filter(e=>e.d>0),e=>e.net[h]), sh=st(E.filter(e=>e.d<0),e=>e.net[h]);
  const ok=xp.every(v=>v>0)&&np.every(v=>v>0)&&X.t>=3&&N.t>=3; if(ok) pass.push(`${id} ${EV[id]} · ${HN[h]}`);
  L.push(`| ${id} ${EV[id]} | ${HN[h]} | ${E.length} | ${X.days} | ${fx(100*X.m)} (${fx(X.t,1)}) | ${xp.map(v=>fx(100*v)).join(' / ')} | ${fx(100*N.m)} (${fx(N.t,1)}) | ${np.map(v=>fx(100*v)).join(' / ')} | ${fx(100*M.m)} | ${fx(R.m,2)} | ${fx(100*lo.m)} (${lo.n||0}) | ${fx(100*sh.m)} (${sh.n||0}) | ${ok?'**evet**':'hayır'} |`);
  console.log(id,HN[h],E.length,'fazla',fx(100*X.m),fx(X.t,1),xp.map(v=>fx(100*v)).join('/'),'net',fx(100*N.m),fx(N.t,1),np.map(v=>fx(100*v)).join('/'),'R',fx(R.m,2)); }
L.push('','## Geçenler (fazla ve taker net iki yarıda ve son 12 ayda artı, ikisinde de gün t ≥ 3)','',...(pass.length?pass.map(x=>'- '+x):['- Geçen yok.']));
fs.writeFileSync(path.join(__dirname,'test55-gece-olaylar-report.md'),L.join('\n')+'\n');
fs.writeFileSync(path.join(ARCH,'_t55-events.json'),JSON.stringify(events.map(e=>[e.id,e.s,e.t,e.d,e.net.map(v=>v==null?null:+v.toFixed(5)),e.x.map(v=>v==null?null:+v.toFixed(5))])));
console.log('yazıldı',((Date.now()-t00)/1e3).toFixed(0)+' sn');
