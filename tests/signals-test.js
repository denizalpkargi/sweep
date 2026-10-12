// Sinyal günlüğü birim testleri (src/signals.js): kayıt, giriş (sonraki mumun VWAP'ı), 4/12/24 sa sonuç, stop ve 1R sırası,
// aynı mumda ikisi = stop, mum boşluğu, stoplu R, isabet özeti ve gölge etiketler. Çalıştırma: node tests/signals-test.js ("errors []").
const {loadEngine}=require('./engine-node.js'); console.info=()=>{};
const mem={}; const localStorage={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}};
const E=loadEngine({localStorage}); const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
const M=9e5, T0=Date.UTC(2026,9,1);
const bar=(t,p,o={})=>({t,o:p,h:o.h??p*1.001,l:o.l??p*0.999,c:p,v:o.v??1,q:o.q??p,tb:0.5});
// 1. kayıt ve giriş: sinyal T0+5 dk → giriş T0+15 dk mumunun VWAP'ı
const t0=T0+5*6e4; let k=[bar(T0-M,100),bar(T0,100)];
E.sgAdd({sym:"XUSDT",dir:"long",kind:"zone",grade:"A",px:100,sig:{stop:98,tags:["quick","ozan"]}},t0);
E.sgAdd({sym:"XUSDT",dir:"short",kind:"sweep",px:100,sig:{stop:99,tags:[]}},t0); // stop yanlış tarafta → sd yok
let S=E.getSG(); ok(S.items.length===2,'kayıt yok'); ok(S.items[0].sd===0.02,'stop uzaklığı: '+S.items[0].sd); ok(S.items[1].sd===null,'yanlış taraftaki stop kabul edildi');
k.push(bar(T0+M,101,{q:100.95})); // VWAP 100,95 (mum içinde)
E.sgObserve("XUSDT",k,T0+M+1); ok(S.items[0].e==null,'kapanmamış mumla giriş');
E.sgObserve("XUSDT",k,T0+2*M); ok(Math.abs(S.items[0].e-100.95)<1e-9,'giriş VWAP değil: '+S.items[0].e);
// 2. yol: 5. mumda +1R (102,97), 16. mumda 4 sa, 96. mumda bitiş
for(let i=1;i<=96;i++){ const p=101; k.push(bar(T0+M+i*M,p,{h:i===5?103.1:p*1.001})); }
E.sgObserve("XUSDT",k,T0+M+97*M); const x=S.items[0];
ok(x.first==="1R"&&x.fi===5,'1R ilk gelmedi: '+x.first+' '+x.fi); ok(x.st==="done",'24 sa sonunda bitmedi: '+x.st);
ok(Math.abs(x.h4-(101/100.95-1))<1e-4,'4 sa getirisi: '+x.h4); ok(isFinite(x.h12)&&isFinite(x.h24),'12/24 sa yok');
ok(Math.abs(x.R-((101/100.95-1-0.0016)/0.02))<1e-3,'stoplu R: '+x.R);
// 3. aynı mumda stop ve 1R → stop, R = −1 − maliyet
E.resetSG(); for(const kk in mem) delete mem[kk];
const t1=T0+5*6e4; E.sgAdd({sym:"YUSDT",dir:"long",kind:"entry",grade:"B",px:100,sig:{stop:99,tags:[]}},t1);
let k2=[bar(T0,100),bar(T0+M,100,{q:100}),bar(T0+2*M,100,{h:101.5,l:98.5})]; for(let i=3;i<=98;i++) k2.push(bar(T0+i*M,100));
E.sgObserve("YUSDT",k2,T0+99*M); const y=E.getSG().items[0]; ok(y.first==="stop",'aynı mumda stop sayılmadı: '+y.first); ok(Math.abs(y.R-(-1-0.0016/0.01))<1e-6,'stop R: '+y.R);
// 4. mum boşluğu → gap
E.sgAdd({sym:"ZUSDT",dir:"short",kind:"zone",px:50,sig:{stop:51,tags:[]}},t1);
const k3=[bar(T0+M,50),bar(T0+2*M,50)]; E.sgObserve("ZUSDT",k3,T0+3*M); const k4=[bar(T0+10*M,50),bar(T0+11*M,50)]; E.sgObserve("ZUSDT",k4,T0+12*M);
ok(E.getSG().items.find(z=>z.sym==="ZUSDT").st==="gap",'boşluk yakalanmadı');
// 5. özet ve etiketler
const fake=[...Array(10)].map((_,i)=>({kind:"zone",grade:"A",st:"done",h4:0.01,h12:0.01,h24:i<4?0.02:-0.01,R:i<4?1:-1,first:i<4?"1R":"stop",sd:0.01,tags:i<4?[]:["tight"]}));
const st=E.sgStats(fake); ok(st.all.n===10&&Math.abs(st.all.win-0.4)<1e-9,'özet kazanma: '+JSON.stringify(st.all)); ok(Math.abs(st.all.R+0.2)<1e-9,'özet R: '+st.all.R);
const tg=st.tags.find(t=>t.tag==="tight"); ok(tg&&tg.n===6&&tg.R===-1&&tg.R0===1,'etiket ayrımı: '+JSON.stringify(tg));
ok(E.sgPick({amd:{stop:1,tags:["quick"]},com:["pump"]},"entry").tags.join()==="quick,pump,ote",'etiket birleşimi');
ok(E.sgPick({br:{stop:2,tags:[]},com:[]},"breakout").stop===2,'K2 stopu');
ok(JSON.parse(mem["st-sig"]).items.length>=1,'localStorage yazılmadı');
console.log('signals-test errors',JSON.stringify(errors)); if(errors.length) process.exit(1);
