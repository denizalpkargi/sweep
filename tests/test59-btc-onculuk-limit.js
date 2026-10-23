// Test #59 (11 Ekim 2026 gecesi, #55 E1'in devamı): BTC öncülüğü sinyali maker limit girişle, dürüst dolumla para eder mi?
// Sinyal #55 E1 ile aynı: BTC 15 dk getirisi |r| ≥ %1 ve coinin aynı mum getirisi BTC yönünde r × 0,3'ten az → BTC yönünde coine gir; coin+yön başına 4 sa'te bir.
// Kurallar veriye bakmadan (#55 sonucundan sonra, bu test için) sabitlendi:
//  Giriş: sinyal mumunun kapanışından x = %0 / %0,1 / %0,2 iyi limit, yalnız sonraki 15 dk mumda geçerli. Dolum yalnız fiyat limiti %0,05 geçerse (long: dip ≤ limit × 0,9995); dolum fiyatı limit.
//  Çıkış: dolum mumundan 4 / 16 mum sonra (1 / 4 sa) mumun VWAP'ı, taker. Maliyet: maker %0,02 + taker %0,05 + kayma %0,03 = %0,10; fonlama dahil.
//  Kıyas: aynı sinyallerin taker girişi (sonraki mum VWAP, %0,16) ve dolmayan sinyallerin taker sonucu (ters seçilim).
//  Geçme: net iki yarıda ve son 12 ayda > 0 ve gün kümeli t ≥ 3 (6 test).
// Kullanım: node --max-old-space-size=6000 tests/test59-btc-onculuk-limit.js → tests/test59-btc-onculuk-limit-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'), M15=9e5, H=36e5, DAY=864e5, TOP=30, HZ=[4,16], HN=['1 sa','4 sa'], XS=[0,0.001,0.002], THR=0.0005;
const C_LIM=0.0010, C_TAK=0.0016;
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months, mon=t=>new Date(t).toISOString().slice(0,7);
const inU={}; for(const m in U) inU[m]=new Set(U[m].slice(0,TOP));
const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)))].filter(s=>fs.existsSync(path.join(ARCH,'15m',s+'.csv'))).sort();
function load(s){
  const raw=fs.readFileSync(path.join(ARCH,'15m',s+'.csv'),'utf8').split('\n'); const n=raw.length;
  const k={t:new Float64Array(n),o:new Float64Array(n),h:new Float64Array(n),l:new Float64Array(n),c:new Float64Array(n),v:new Float64Array(n),vw:new Float64Array(n)}; let m=0;
  for(const line of raw){ if(!line) continue; const a=line.split(','); const v=+a[5]; k.t[m]=+a[0]; k.o[m]=+a[1]; k.h[m]=+a[2]; k.l[m]=+a[3]; k.c[m]=+a[4]; k.v[m]=v;
    let w=v>0?(+a[7])/v:NaN; if(!(w>=k.l[m]&&w<=k.h[m])) w=k.c[m]; k.vw[m]=w; m++; }
  for(const f in k) k[f]=k[f].subarray(0,m); k.n=m;
  const ff=path.join(ARCH,'funding',s+'.csv'); k.ft=[]; k.fr=[];
  if(fs.existsSync(ff)) for(const l of fs.readFileSync(ff,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); if(Number.isFinite(+r)){ k.ft.push(+t); k.fr.push(+r); } }
  k.fc=new Float64Array(k.fr.length+1); for(let i=0;i<k.fr.length;i++) k.fc[i+1]=k.fc[i]+k.fr[i];
  return k; }
const lb=(a,x)=>{ let lo=0,hi=a.length; while(lo<hi){ const md=(lo+hi)>>1; if(a[md]<x) lo=md+1; else hi=md; } return lo; };
const fundSum=(k,t0,t1)=>{ const a=lb(k.ft,t0+1), b=lb(k.ft,t1+1); return k.fc[b]-k.fc[a]; };
const btc=load('BTCUSDT'), btcR=new Map(); for(let i=1;i<btc.n;i++) btcR.set(btc.t[i],btc.c[i]/btc.c[i-1]-1);
const ev=[];
for(const s of syms){ if(s==='BTCUSDT') continue; const k=load(s), last={};
  for(let i=1;i<k.n-20;i++){ const u=inU[mon(k.t[i])]; if(!u||!u.has(s)) continue; const rb=btcR.get(k.t[i]); if(rb==null||Math.abs(rb)<0.01) continue;
    const r=k.c[i]/k.c[i-1]-1, d=Math.sign(rb); if(!(d*r<0.3*Math.abs(rb))) continue; if(last[d]!=null&&k.t[i]-last[d]<4*H) continue;
    const j=i+1; if(k.t[j]!==k.t[i]+M15||!(k.v[j]>0)) continue; last[d]=k.t[i];
    const e={s,t:k.t[i],d,tak:[],lim:XS.map(()=>[])};
    for(let h=0;h<HZ.length;h++){ const x=j+HZ[h]; if(k.t[x]!==k.t[j]+HZ[h]*M15||!(k.v[x]>0)){ e.tak.push(null); XS.forEach((_,q)=>e.lim[q].push(null)); continue; }
      const f=fundSum(k,k.t[j],k.t[x]); e.tak.push(d*(k.vw[x]/k.vw[j]-1)-C_TAK-d*f);
      XS.forEach((xx,q)=>{ const L=k.c[i]*(1-d*xx); const fill=d>0?k.l[j]<=L*(1-THR):k.h[j]>=L*(1+THR); e.lim[q].push(fill?d*(k.vw[x]/L-1)-C_LIM-d*f:null); }); }
    ev.push(e); } }
const tE=Math.max(...ev.map(e=>e.t)), tS=Math.min(...ev.map(e=>e.t)), tM=(tS+tE)/2, t12=tE-365*DAY;
const fx=(x,d=3)=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(d).replace('.',','):'–';
function st(list){ const v=list.filter(z=>Number.isFinite(z.y)); if(!v.length) return {n:0,m:NaN,t:NaN}; const by=new Map(); for(const z of v){ const d=Math.floor(z.t/DAY); (by.get(d)||by.set(d,[]).get(d)).push(z.y); }
  const dm=[...by.values()].map(a=>a.reduce((p,q)=>p+q,0)/a.length), mm=dm.reduce((a,b)=>a+b,0)/dm.length, sd=Math.sqrt(dm.reduce((a,b)=>a+(b-mm)**2,0)/Math.max(1,dm.length-1));
  return {n:v.length,m:v.reduce((a,b)=>a+b.y,0)/v.length,t:sd>0?mm/sd*Math.sqrt(dm.length):NaN}; }
const P=[z=>z.t<tM,z=>z.t>=tM,z=>z.t>=t12];
const L=['# Test #59 · BTC öncülüğü, maker limit giriş, dürüst dolum (arşiv)','',`11 Ekim 2026 gecesi · \`node tests/test59-btc-onculuk-limit.js\` · ${ev.length} sinyal, ${new Date(tS).toISOString().slice(0,10)} → ${new Date(tE).toISOString().slice(0,10)}`,'',
 'Sinyal #55 E1. Limit sinyal mumunun kapanışından x kadar iyi, yalnız sonraki 15 dk; dolum fiyatın limiti %0,05 geçmesiyle. Çıkış ufuk sonu mum VWAP, taker. Net %: maker+taker+kayma %0,10 (taker giriş %0,16) ve fonlama. t gün kümeli.','',
 '| Giriş | Yön | Ufuk | n | Dolum % | Net % (t) | 1. yarı / 2. yarı / son 12 ay | Dolmayanların taker neti % | Geçti |','|---|---|---|---:|---:|---|---|---:|---|'];
const pass=[];
for(const dn of [['her iki',0],['long',1],['short',-1]]) for(let h=0;h<HZ.length;h++){ const E=ev.filter(e=>!dn[1]||e.d===dn[1]);
  const row=(name,get,missed)=>{ const A=E.map(e=>({t:e.t,y:get(e)})), S=st(A), pp=P.map(p=>st(A.filter(p)).m), nf=E.filter(e=>e.tak[h]!=null).length, fr=S.n/Math.max(1,nf);
    const M=missed?st(E.filter(e=>missed(e)==null&&e.tak[h]!=null).map(e=>({t:e.t,y:e.tak[h]}))):null;
    const ok=pp.every(v=>v>0)&&S.t>=3; if(ok) pass.push(`${name} · ${dn[0]} · ${HN[h]}`);
    L.push(`| ${name} | ${dn[0]} | ${HN[h]} | ${S.n} | ${(100*fr).toFixed(0)} | ${fx(100*S.m)} (${fx(S.t,1)}) | ${pp.map(v=>fx(100*v)).join(' / ')} | ${M?fx(100*M.m):'–'} | ${ok?'**evet**':'hayır'} |`); };
  row('taker (sonraki mum VWAP)',e=>e.tak[h],null);
  XS.forEach((xx,q)=>row(`limit kapanış ${xx?'−%'+(100*xx).toFixed(1).replace('.',','):''}`.trim(),e=>e.lim[q][h],e=>e.lim[q][h])); }
L.push('','## Geçenler','',...(pass.length?pass.map(x=>'- '+x):['- Geçen yok.']));
fs.writeFileSync(path.join(__dirname,'test59-btc-onculuk-limit-report.md'),L.join('\n')+'\n'); console.log(L.slice(6).join('\n'));
