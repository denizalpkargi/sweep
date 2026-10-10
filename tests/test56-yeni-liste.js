// Test #56 (11 Ekim 2026 gecesi, gece taraması): yeni listelenen vadeli coinler ilk günlerde düşer mi (short)? Kural veriye bakmadan sabitlendi:
// coinin 1g arşivindeki ilk mum = listeleme günü (2020-07'den sonra, TradFi hariç; src/turtle.js TT_TRADFI). Giriş 2. günün açılışı (ilk 24 sa atlanır),
// çıkış 1 / 3 / 7 gün sonraki açılış; ayrıca 8. günden 1 gün (geç giriş). Short net = −getiri − %0,16 − fonlama (short alır). Fazla = coin − aynı günlerde
// ayın ilk 50 coininin ortalaması (brüt). Kümeleme: aynı hafta listelenenler tek gözlem (haftalık t). Geçme: fazla ve net iki yarıda ve son 12 ayda short yönünde
// artı ve haftalık t ≥ 3 (8 test). Gerçek işlem notu: yeni coinlerde makas ve kayma %0,03'ten büyüktür; geçen olursa ayrıca ele alınır.
// Kullanım: node tests/test56-yeni-liste.js → tests/test56-yeni-liste-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'), DAY=864e5, COST=0.0016;
const src=fs.readFileSync(path.join(__dirname,'..','src','turtle.js'),'utf8'); const TR=new Set(src.match(/TT_TRADFI=new Set\("([^"]+)"/)[1].split(' ').map(s=>s+'USDT'));
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months, mon=t=>new Date(t).toISOString().slice(0,7);
const top50={}; for(const m in U) top50[m]=U[m].slice(0,50);
const load=s=>{ const f=path.join(ARCH,'1d',s+'.csv'); if(!fs.existsSync(f)) return null; const k=fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0&&b.o>0); k.m=new Map(k.map((b,i)=>[b.t,i])); return k; };
const loadF=s=>{ const f=path.join(ARCH,'funding',s+'.csv'); const m=new Map(); if(!fs.existsSync(f)) return m; for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); const d=Math.floor(+t/DAY)*DAY; m.set(d,(m.get(d)||0)+(+r)); } return m; };
const all=fs.readdirSync(path.join(ARCH,'1d')).filter(f=>f.endsWith('USDT.csv')).map(f=>f.slice(0,-4)).filter(s=>!TR.has(s));
const D={}; for(const s of all){ const k=load(s); if(k&&k.length>10) D[s]=k; }
// piyasa: ayın ilk 50 coininin günlük açılıştan açılışa ortalaması
const mk=new Map(); const mret=(t0,t1)=>{ const key=t0+'|'+t1; if(mk.has(key)) return mk.get(key); const U5=top50[mon(t0)]||[]; let s=0,n=0; for(const c of U5){ const k=D[c]; if(!k) continue; const a=k.m.get(t0), b=k.m.get(t1); if(a==null||b==null) continue; s+=k[b].o/k[a].o-1; n++; } const r=n?s/n:null; mk.set(key,r); return r; };
const HS=[[1,1],[1,3],[1,7],[8,1]], HN=['2. gün, 1 gün','2. gün, 3 gün','2. gün, 7 gün','9. gün, 1 gün (geç)'];
const ev=[]; const TS=Date.UTC(2020,6,1);
for(const s in D){ const k=D[s]; if(k[0].t<TS) continue; const F=loadF(s);
  for(let h=0;h<HS.length;h++){ const [a,n]=HS[h]; if(k.length<=a+n) continue; const e=k[a], x=k[a+n]; if(x.t!==e.t+n*DAY) continue;
    let f=0; for(let t=e.t;t<x.t;t+=DAY) f+=F.get(t)||0.0003; const g=x.o/e.o-1, m=mret(e.t,x.t);
    // felaket stopu (sonuç görüldükten sonra eklendi, kanıt değil): gün içi tepe girişin %30 üstüne çıkarsa orada kapat
    let gs=g, fs2=f; for(let q=a;q<a+n;q++){ if(k[q].h>=e.o*1.3){ gs=0.3+0.003; fs2=0; for(let t=e.t;t<=k[q].t;t+=DAY) fs2+=F.get(t)||0.0003; break; } }
    ev.push({s,t:k[0].t,h,g,net:-g-COST+f,x:m==null?null:-(g-m),netS:-gs-COST+fs2}); } }
const tE=Math.max(...ev.map(e=>e.t)), tS=Math.min(...ev.map(e=>e.t)), tM=(tS+tE)/2, t12=tE-365*DAY;
const fx=(x,d=2)=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(d).replace('.',','):'–';
function st(list,f){ const by=new Map(); for(const e of list){ const y=f(e); if(!Number.isFinite(y)) continue; const w=Math.floor(e.t/(7*DAY)); (by.get(w)||by.set(w,[]).get(w)).push(y); }
  const wm=[...by.values()].map(a=>a.reduce((p,q)=>p+q,0)/a.length); if(!wm.length) return {n:0}; const m=wm.reduce((a,b)=>a+b,0)/wm.length, sd=Math.sqrt(wm.reduce((a,b)=>a+(b-m)**2,0)/Math.max(1,wm.length-1));
  const v=list.map(f).filter(Number.isFinite); const srt=v.slice().sort((a,b)=>a-b);
  return {n:v.length,w:wm.length,m:v.reduce((a,b)=>a+b,0)/v.length,med:srt[Math.floor(srt.length/2)],worst:srt[0],t:sd>0?m/sd*Math.sqrt(wm.length):NaN,win:v.filter(x=>x>0).length/v.length}; }
const L=['# Test #56 · Yeni listelenen coinlerde short (arşiv)','',`11 Ekim 2026 gecesi · \`node tests/test56-yeni-liste.js\` · ${new Set(ev.map(e=>e.s)).size} coin, listeleme ${new Date(tS).toISOString().slice(0,10)} → ${new Date(tE).toISOString().slice(0,10)}`,'',
 'Short yönünde: net = −getiri − %0,16 − fonlama (short alır, yoksa günde %0,03 varsayılır). Fazla = −(coin − aynı günlerde ayın ilk 50 coininin ortalaması). t: listeleme haftası kümeli. Yeni coinlerde gerçek makas varsayımdan büyüktür.','',
 '| Pencere | n | Fazla % (t) | Fazla yarılar / son 12 ay % | Net % (t) | Net yarılar / son 12 ay % | Medyan net % | Kazanma | En kötü % | Geçti |','|---|---:|---|---|---|---|---:|---:|---:|---|'];
const pass=[];
for(let h=0;h<HS.length;h++){ const E=ev.filter(e=>e.h===h); const P=[e=>e.t<tM,e=>e.t>=tM,e=>e.t>=t12];
  const X=st(E,e=>e.x), N=st(E,e=>e.net), S2=st(E,e=>e.netS), sp=[e=>e.t<tM,e=>e.t>=tM,e=>e.t>=t12].map(p=>st(E.filter(p),e=>e.netS).m), xp=P.map(p=>st(E.filter(p),e=>e.x).m), np=P.map(p=>st(E.filter(p),e=>e.net).m);
  const ok=xp.every(v=>v>0)&&np.every(v=>v>0)&&X.t>=3&&N.t>=3; if(ok) pass.push(HN[h]);
  L.push(`| ${HN[h]} | ${E.length} | ${fx(100*X.m)} (${fx(X.t,1)}) | ${xp.map(v=>fx(100*v)).join(' / ')} | ${fx(100*N.m)} (${fx(N.t,1)}) | ${np.map(v=>fx(100*v)).join(' / ')} | ${fx(100*N.med)} | %${(100*N.win).toFixed(0)} | ${fx(100*N.worst,0)} | ${ok?'**evet**':'hayır'} |`);
  L.push(`|  ↳ %30 felaket stoplu (sonradan) | ${E.length} | | | ${fx(100*S2.m)} (${fx(S2.t,1)}) | ${sp.map(v=>fx(100*v)).join(' / ')} | ${fx(100*S2.med)} | %${(100*S2.win).toFixed(0)} | ${fx(100*S2.worst,0)} | – |`); console.log('stop',fx(100*S2.m),fx(S2.t,1),sp.map(v=>fx(100*v)).join('/'));
  console.log(HN[h],E.length,'fazla',fx(100*X.m),fx(X.t,1),xp.map(v=>fx(100*v)).join('/'),'net',fx(100*N.m),fx(N.t,1),np.map(v=>fx(100*v)).join('/'),'en kötü',fx(100*N.worst,0)); }
const ys=[2020,2021,2022,2023,2024,2025,2026]; L.push('','## Yıl yıl, 2. gün 7 gün short net % (n)','','| '+ys.join(' | ')+' |','|'+'---|'.repeat(ys.length),'| '+ys.map(y=>{ const E=ev.filter(e=>e.h===2&&new Date(e.t).getUTCFullYear()===y); return E.length?fx(100*E.reduce((a,e)=>a+e.net,0)/E.length)+` (${E.length})`:'–'; }).join(' | ')+' |');
L.push('','## Geçenler','',...(pass.length?pass.map(x=>'- '+x):['- Geçen yok.']));
fs.writeFileSync(path.join(__dirname,'test56-yeni-liste-report.md'),L.join('\n')+'\n'); console.log('yazıldı');
