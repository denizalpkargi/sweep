// Sıralama modeli (Ozan, src/rankmodel.js): değişkenler, LightGBM ağaç değerlendirmesi (Python tahminiyle birebir), evren/dilim ve masadaki gölge oy.
const fs=require('fs'), path=require('path'); const {loadEngine}=require('./engine-node.js');
const E=loadEngine(); const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
// 1) ağaç: eksik değer kuralları (LightGBM NumericalDecision)
const T={s:[0,1],t:[0.5,2],m:[1|4,2],l:[1,-1],r:[-2,-3],v:[10,20,30]};
ok(E.rkTree(T,[0.4,1])===10,'sol-sol'); ok(E.rkTree(T,[0.6,0])===20,'sağ'); ok(E.rkTree(T,[NaN,3])===30,'NaN default_left → düğüm 1, 3>2 → sağ yaprak');
ok(E.rkTree({s:[0],t:[-1],m:[0],l:[-1],r:[-2],v:[1,2]},[NaN])===2,'missing None: NaN → 0 > −1 → sağ');
ok(E.rkTree({s:[0],t:[5],m:[2],l:[-1],r:[-2],v:[1,2]},[0])===2,'missing Zero, default_left yok: 0 → sağ');
// 2) yüzdelik dilim = pandas rank(pct, average)
ok(Math.abs(E.rkPct(2,[1,2,2,3])-0.625)<1e-12,'rkPct eşitlik'); ok(isNaN(E.rkPct(NaN,[1,2])),'rkPct NaN');
// 3) yapay mumlardan değişkenler: hepsi tanımlı, kapanmamış mum kullanılmaz
const now=Date.UTC(2026,9,9,12,7); const mk=(iv,n,seed,end)=>{ let p=100*seed, out=[]; for(let i=0;i<n;i++){ const t=end-(n-i)*iv; const o=p; p=p*(1+0.004*Math.sin(i*0.37*seed)+0.002*Math.cos(i*1.3)); out.push({t,o,h:Math.max(o,p)*1.002,l:Math.min(o,p)*0.998,c:p,v:1000+100*Math.sin(i),q:(1000+100*Math.sin(i))*p,tb:(500+80*Math.cos(i*seed))*p}); } return out; };
const end15=Math.floor(now/9e5)*9e5+9e5; // son mum açık
function fakeA(seed){ return {px:100,fund:0.0001*seed,src:{k15L:mk(9e5,100,seed,end15),k1h:mk(36e5,60,seed,Math.floor(now/36e5)*36e5+36e5),k4h:mk(144e5,60,seed,Math.floor(now/144e5)*144e5+144e5),k1d:mk(864e5,120,seed,Math.floor(now/864e5)*864e5+864e5),
  btc15:mk(9e5,1500,1.7,end15),oi5raw:Array.from({length:24},(_,i)=>({timestamp:now-(24-i)*3e5,sumOpenInterestValue:String(1e7*(1+0.001*i*seed))})),tp5:Array.from({length:8},(_,i)=>({timestamp:now-(8-i)*3e5,longShortRatio:String(1.2+0.01*i)})),gl5:Array.from({length:8},(_,i)=>({timestamp:now-(8-i)*3e5,longShortRatio:String(2-0.02*i*seed)})),fr:0.0001*seed}}; }
const f=E.rkFeatA(fakeA(1.1),now); ok(f&&f.length===E.RK_FEATS.length,'değişken sayısı'); const bad=f?E.RK_FEATS.filter((k,i)=>!isFinite(f[i])):['hepsi']; ok(!bad.length,'tanımsız değişken: '+bad.join(','));
const A2=fakeA(1.1); A2.src.k15L[A2.src.k15L.length-1].c*=5; const f2=E.rkFeatA(A2,now); ok(f2&&f2[0]===f[0],'açık mum değişkene girmemeli');
// 4) Python tahminiyle birebir (model dışa aktarıldıysa)
const M=E.RK_MODEL; const par=path.join(__dirname,'data','rank-parity.json');
if(M&&fs.existsSync(par)){ const P=JSON.parse(fs.readFileSync(par,'utf8')); let worst=0, n=0;
  for(const h of Object.keys(M.models)){ const MM=M.models[h]; const pred=P.pred[h]; if(!pred) continue;
    P.rows.forEach((r,i)=>{ const row=r.map(v=>v==null?NaN:v); const raw=E.RK_FEATS.map(k=>row[P.cols.indexOf(k)]); const xs={}; for(const k of E.RK_XS) xs['x_'+k]=row[P.cols.indexOf('x_'+k)];
      const js=E.rkPredict(MM,E.rkRow(MM,raw,xs)); worst=Math.max(worst,Math.abs(js-pred[i])); n++; }); }
  ok(n>0&&worst<1e-4,`Python ↔ JS tahmin farkı ${worst} (${n} satır)`); console.log('parite', n, 'satır, en büyük fark', worst.toExponential(2)); }
else console.log('model yok ya da parite dosyası yok; birebir sınama atlandı');
// 5) masa: evren dolmadan çekimser, dolunca oy (gölge: puana girmez), ledger için idle bayrağı
if(M){ for(const k in E.rkCache) delete E.rkCache[k];
  const one=E.rkMember(fakeA(1.3),'long',{sym:'S0USDT',now}); ok(one.abst&&one.idle,'tek coinle çekimser olmalı');
  for(let i=1;i<20;i++) E.rkScore('S'+i+'USDT',fakeA(1+i*0.07),now);
  const votes=[]; for(let i=0;i<20;i++){ const a=fakeA(1+i*0.07); const m=E.rkMember(a,'long',{sym:'S'+i+'USDT',now}); votes.push(m); ok(isFinite(m.p),'dilim tanımlı '+i); ok(m.abst,'gölge: puana girmemeli'); }
  ok(votes.some(v=>v.v<0)&&votes.some(v=>v.v>0),'en alt ve en üst dilimlerde oy'); ok(votes.filter(v=>v.shadow).every(v=>!v.idle),'gölge oy tahmin defterine yazılmalı');
  const c=E.committee({...fakeA(1.2),trendScore:0,st:0,trend:"flat",score:0,volRel:1,tk30:1,med15:0.004,px:100},'long',0,{sym:'S5USDT',now}); const oz=c.agents.find(a=>a.id==='rank'); ok(oz&&oz.abst&&oz.w===0,'Ozan masada, gölgede ağırlık 0'); }
console.log('errors', errors);
if(errors.length) process.exit(1);
