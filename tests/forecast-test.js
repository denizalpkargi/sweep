// Tahmin defteri birim testleri (src/forecast.js): kayıt, saatte bir sınırı, çözüm (+1/−1 ATR, aynı mumda ikisi, süre), öğrenme (üye ağırlığı, ders), Murat'ın oyu.
// Çalıştırma: node tests/forecast-test.js  (çıktıda "errors []" beklenir)
const {loadEngine}=require('./engine-node.js');
const mem={}; const localStorage={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}};
const E=loadEngine({localStorage}); const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
const M=9e5, T0=Date.UTC(2026,5,1);
const flat=(n,p)=>Array.from({length:n},(_,i)=>({t:T0+i*M,o:p,h:p*1.002,l:p*0.998,c:p,q:1,tb:0.5}));
const com=(sl,ss,vl)=>({long:{score:sl,decision:sl>=0.3?"giriş":"bekle",yes:5,agents:[{id:"liq",v:vl},{id:"trend",v:0}],feat:{pool:"eşit dipler ×2",kz:"Londra",stage:"waitEntry",trend:"up"}},short:{score:ss,decision:"bekle",yes:1,agents:[{id:"liq",v:-vl},{id:"trend",v:0}],feat:{pool:null,kz:null,stage:"none",trend:"up"}}});
E.fcReset();
// 1. kayıt: 60 mum, şimdi = son mumun kapanışı
let k=flat(60,100); let now=k[59].t+M; E.fcObserve("XUSDT",{px:100,src:{k15L:k}},com(0.4,-0.2,0.8),now);
let F=E.getFC(); ok(F.pend.length===2,'iki yön kaydedilmedi: '+F.pend.length); const atr=F.pend[0].atr; ok(atr>0.35&&atr<0.45,'ATR yanlış: '+atr);
E.fcObserve("XUSDT",{px:100,src:{k15L:k}},com(0.4,-0.2,0.8),now+30*6e4); ok(E.getFC().pend.length===2,'saatte bir sınırı yok');
// 2. çözüm: sonraki 3. mumda +1 ATR (long doğru, short yanlış)
for(let i=0;i<16;i++){ const p=i===2?100.6:100; k.push({t:now+i*M,o:100,h:p,l:99.9,c:100,q:1,tb:0.5}); }
E.fcObserve("XUSDT",{px:100,src:{k15L:k}},com(0.4,-0.2,0.8),now+2*M+1); F=E.getFC(); ok(F.done.length===0,'mum kapanmadan çözüldü');
E.fcObserve("XUSDT",{px:100,src:{k15L:k}},com(0.4,-0.2,0.8),now+3*M); F=E.getFC();
const L=F.done.find(f=>f.dir==="long"), S=F.done.find(f=>f.dir==="short"); ok(L&&L.y===1,'long isabet değil: '+JSON.stringify(L)); ok(S&&S.y===0,'short yanlış değil');
// 3. aynı mumda ikisi = yanlış, hiçbiri = yarım
{ const f={dir:"long",t:T0,px:100,atr:1}; const kk=[{t:T0,o:100,h:101.5,l:98.5,c:100}]; ok(E.fcOutcome(f,kk,T0+M).y===0,'aynı mumda ikisi yanlış sayılmadı');
  const k2=flat(16,100).map(c=>({...c,t:c.t})); ok(E.fcOutcome(f,k2,T0+17*M).y===0.5,'süre dolunca yarım değil'); }
// 4. öğrenme: Kerem (liq) oyları sonuca uyuyor, Emre (trend) rastgele → Kerem ağırlığı artar; kill zone dışı long kötü → ders
{ const D=[]; let s=7; const rnd=()=>{ s=(s*16807)%2147483647; return s/2147483647; };
  for(let i=0;i<400;i++){ const y=rnd()<0.5?1:0; const bad=i%2===0; const yy=bad?(rnd()<0.25?1:0):y; D.push({sym:"X",dir:"long",t:T0+i*36e5,score:0.35,go:true,v:{liq:yy?0.8:-0.6,trend:rnd()*2-1},f:{havuz:"eşit dipler",kz:bad?"kill zone dışı":"kill zone",asama:"waitEntry",trend:"up"},y:yy}); }
  const Lr=E.fcLearn(D); ok(Lr.agents.liq.m>1.1,'doğru üye ağırlık kazanmadı: '+JSON.stringify(Lr.agents.liq)); ok(Math.abs(Lr.agents.trend.m-1)<0.15,'rastgele üye ağırlığı çok oynadı: '+Lr.agents.trend.m);
  ok(Lr.lessons.some(l=>l.k==="kz"&&l.v==="kill zone dışı"&&l.dir==="long"),'ders çıkmadı: '+JSON.stringify(Lr.lessons));
  E.getFC().learn=Lr; const fv=E.fcVoteFor("long",{pool:"eşit dipler ×3",kz:null,stage:"waitEntry",trend:"up"}); ok(fv.hits.length>=1&&fv.v<0,'Murat kalıba karşı oy vermedi');
  ok(E.fcMult("liq")===Lr.agents.liq.m,'fcMult okunmadı'); }
// 5. kalıcılık
ok(JSON.parse(mem["st-fc"]).done.length>=2,'localStorage yazılmadı');
// 6. en yüksek puanlı tahminler (fcTop): pozisyon notları ve faktör anahtarları karışmaz
{ const T=E.fcTop({done:[{sym:"AUSDT",dir:"long",t:1,score:0.55,y:1,go:true,v:{trend:1,liq:-0.2,"f:x":1}},{sym:"B",dir:"short",t:2,score:0.2,y:0,v:{}},{sym:"C",dir:"long",t:3,score:0.9,y:1,kind:"pos",v:{}}]},5);
  ok(T.length===2&&T[0].sym==="AUSDT"&&T[0].yes.join()==="trend",'fcTop yanlış'); }
console.log('errors',JSON.stringify(errors)); process.exit(errors.length?1:0);
