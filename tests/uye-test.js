// Eğitilmiş üyeler (src/uyemodel.js): masada model oyu, evren dışında kural oyu, tartışmanın model oyuna dokunmaması, Python ↔ JS ağaç tahmini (model varsa).
const fs=require('fs'), path=require('path'); const {loadEngine}=require('./engine-node.js');
const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
const now=Date.UTC(2026,9,11,12,7); const mk=(iv,n,seed,end)=>{ let p=100*seed, out=[]; for(let i=0;i<n;i++){ const t=end-(n-i)*iv; const o=p; p=p*(1+0.004*Math.sin(i*0.37*seed)+0.002*Math.cos(i*1.3)); out.push({t,o,h:Math.max(o,p)*1.002,l:Math.min(o,p)*0.998,c:p,v:1000+100*Math.sin(i),q:(1000+100*Math.sin(i))*p*(1+seed),tb:(500+80*Math.cos(i*seed))*p}); } return out; };
const end15=Math.floor(now/9e5)*9e5+9e5;
function fakeA(seed){ return {px:100,fund:0.0001,trendScore:0,st:0,trend:"flat",score:0,volRel:1,tk30:1,med15:0.004,src:{k15L:mk(9e5,100,seed,end15),k1h:mk(36e5,60,seed,Math.floor(now/36e5)*36e5+36e5),k4h:mk(144e5,60,seed,Math.floor(now/144e5)*144e5+144e5),k1d:mk(864e5,120,seed,Math.floor(now/864e5)*864e5+864e5),
  btc15:mk(9e5,1500,1.7,end15),oi5raw:Array.from({length:24},(_,i)=>({timestamp:now-(24-i)*3e5,sumOpenInterestValue:String(1e7*(1+0.001*i*seed))})),tp5:Array.from({length:8},(_,i)=>({timestamp:now-(8-i)*3e5,longShortRatio:String(1.2+0.01*i)})),gl5:Array.from({length:8},(_,i)=>({timestamp:now-(8-i)*3e5,longShortRatio:String(2-0.02*i*seed)})),fr:0.0001}}; }
// 1) dosyadaki model (yer tutucu ya da bilgisayarda dışa aktarılmış)
const E0=loadEngine(); console.log('dosyadaki model', E0.uyeOn()?Object.keys(E0.UYE_MODEL.fams).join(','):'yok');
// 2) sahte model: Emre z30d, Baran z1 ile sıralar (tek bölmeli ağaç: büyük değer → yüksek puan)
const stump=f=>({feats:[f],trees:[{s:[0],t:[0],m:[4],l:[-1],r:[-2],v:[-1,1]},{s:[],t:[],m:[],l:[],r:[],v:[0]}]});
const fake={at:'test',fams:{trend:{models:{4:stump('z30d'),12:stump('x_z30d')}},mom:{models:{4:stump('z1'),12:stump('x_z1')}}}};
const E=loadEngine({patch:s=>s.replace(/const UYE_MODEL=[^\n]*;/,()=>'const UYE_MODEL='+JSON.stringify(fake)+';')}); ok(E.uyeOn(),'sahte model yüklenmeli');
for(let i=0;i<20;i++) E.rkScore('S'+i+'USDT',fakeA(1+i*0.07),now);
let seen=0, both=0;
for(let i=0;i<20;i++){ const a=fakeA(1+i*0.07), sym='S'+i+'USDT';
  const L=E.committee(a,'long',0,{sym,now,lf:false,l24:false}), S=E.committee(a,'short',0,{sym,now,lf:false,l24:false});
  const tl=L.agents.find(x=>x.id==='trend'), ts=S.agents.find(x=>x.id==='trend'), ml=L.agents.find(x=>x.id==='mom'), fl=L.agents.find(x=>x.id==='flow');
  ok(tl.model&&ml.model,'Emre ve Baran modelle oy vermeli '+sym); ok(!fl.model,'Mert modelde yok, kural oyu '+sym);
  ok(tl.w===E.UYE_CFG.w,'model oyunun katsayısı UYE_CFG.w'); ok(/^model \(trend\)/.test(tl.txt)&&/kural:/.test(tl.txt),'metinde model ve kural okuması');
  ok(Math.abs(tl.v0+ts.v0)<1e-9||(Math.abs(tl.v0)===1&&Math.abs(ts.v0)===1),'long ve short model oyu ters işaretli '+sym);
  if(tl.v0) seen++; if(tl.v0>0&&ml.v0<0||tl.v0<0&&ml.v0>0) both++;
  ok(L.feat.uye&&L.feat.uye.trend!=null,'karar kaydında model oyu'); }
ok(seen>5,'model oyları sıfırdan farklı olmalı'); 
// 3) evren dışındaki coin: kural oyu
for(let i=20;i<32;i++) E.rkScore('S'+i+'USDT',fakeA(1+i*0.07),now); // evren 30 coinle dolsun
const far=fakeA(9); far.src.k15L=far.src.k15L.map(x=>({...x,q:x.q*1e-6})); const C=E.committee(far,'long',0,{sym:'FARUSDT',now,lf:false,l24:false}); ok(!C.agents.find(x=>x.id==='trend').model,'evren dışında kural oyu');
// 3b) evren genişliği (12 Ekim 2026): top 100 ailesi hacimce 31–100. coinde de oy verir, top 30 ailesi vermez; sıra kendi evreninde
const fake100={at:'test',fams:{trend:{top:100,models:{4:stump('z30d'),12:stump('x_z30d')}},mom:{models:{4:stump('z1'),12:stump('x_z1')}}}};
const E2=loadEngine({patch:s=>s.replace(/const UYE_MODEL=[^\n]*;/,()=>'const UYE_MODEL='+JSON.stringify(fake100)+';')});
ok(E2.uyeTop('trend')===100&&E2.uyeTop('mom')===30,'aile evren genişliği');
for(let i=0;i<40;i++) E2.rkScore('S'+i+'USDT',fakeA(1+i*0.07),now); // hacim tohumla artar: S10–S39 ilk 30, S0–S9 31–40.
{ const a=fakeA(1+2*0.07), L=E2.committee(a,'long',0,{sym:'S2USDT',now,lf:false,l24:false}); const tl=L.agents.find(x=>x.id==='trend'), ml=L.agents.find(x=>x.id==='mom');
  ok(tl.model,'top 100 ailesi 31–100. coinde modelle oy vermeli'); ok(!ml.model,'top 30 ailesi 31–100. coinde kural oyu'); ok(/40 coin içinde/.test(tl.txt),'top 100 ailesi 40 coin içinde sıralar: '+tl.txt);
  const R=E2.rkScore('S2USDT',a,now); ok(R&&R.out&&R.fam&&R.fam.trend&&!R.fam.mom,'Ozan evren dışında, aile sonucu yine döner'); }
{ const a=fakeA(1+20*0.07), L=E2.committee(a,'long',0,{sym:'S20USDT',now,lf:false,l24:false}); ok(L.agents.find(x=>x.id==='trend').model&&L.agents.find(x=>x.id==='mom').model,'ilk 30 coinde iki aile de modelle'); }
// 4) Python ↔ JS (bilgisayarda dışa aktarıldıysa); ilk 100 ailesi kendi satırlarıyla (P.rows100)
const M=E0.UYE_MODEL; const par=path.join(__dirname,'data','uye-parity.json');
if(M&&fs.existsSync(par)){ const P=JSON.parse(fs.readFileSync(par,'utf8')); let worst=0,n=0;
  for(const id of Object.keys(M.fams)) for(const h of Object.keys(M.fams[id].models)){ const MM=M.fams[id].models[h]; const pred=(P.pred[id]||{})[h]; if(!pred) continue;
    (M.fams[id].top===100&&P.rows100?P.rows100:P.rows).forEach((r,i)=>{ const row=r.map(v=>v==null?NaN:v); const raw=E0.RK_FEATS.map(k=>row[P.cols.indexOf(k)]); const xs={}; for(const k of E0.RK_XS) xs['x_'+k]=row[P.cols.indexOf('x_'+k)];
      worst=Math.max(worst,Math.abs(E0.rkPredict(MM,E0.rkRow(MM,raw,xs))-pred[i])); n++; }); }
  ok(n>0&&worst<1e-4,`Python ↔ JS tahmin farkı ${worst} (${n} satır)`); console.log('parite', n, 'satır, en büyük fark', worst.toExponential(2)); }
else console.log('üye modeli dışa aktarılmamış; birebir sınama atlandı');
console.log('errors', errors);
if(errors.length) process.exit(1);
