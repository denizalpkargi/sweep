// Kalite short sepeti (src/kshort.js) testi: JS ↔ Python model eşleşmesi, ksFeatX ↔ masa-archive.js (arşiv varsa), ksRow sırası, sepet mekaniği.
const path=require('path'), fs=require('fs');
const {loadEngine}=require('./engine-node.js');
const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const errors=[]; const ok=(c,m)=>{ if(!c){ errors.push(m); console.log('HATA',m); } };
const H=3600e3;
// 1) model eşleşmesi
const P=JSON.parse(fs.readFileSync(path.join(__dirname,'data','kshort-parity.json'),'utf8'));
ok(JSON.stringify(P.cols)===JSON.stringify(E.KS_MODEL.feats),'parite sütunları model değişkenleriyle aynı');
let md=0; P.rows.forEach((r,i)=>{ const p=E.ksPredict(r.map(v=>v==null?NaN:v)); md=Math.max(md,Math.abs(p-P.pred[i])); });
ok(md<1e-6,'JS ↔ Python tahmin farkı '+md); console.log('parite',P.rows.length,'satır, en büyük fark',md.toExponential(2));
// 2) ksRow: arşiv örneğinden aynı satır (sıra, çekimser → NaN, aşama kodu, short işareti örnekte zaten uygulanmış)
const smp={dir:'short',score:0.41,yes:5,sd:0.0213,a:{trend:[0.2,0.5,0],liq:[0,0,1],flow:[-0.3,0.8,0],macro:[0.5,0.9,0],quant:[0,0.5,1],mom:[0.6,0.7,0],vol:[0.1,0.5,0],check:[0.6,0.6,0],fac:[0.7,0.5,0],risk:[0.6,0.8,0],copy:[0,0.2,1]},
  x:{atrp:0.01,r1:0.002,r4:-0.01,r24:0.03,r7d:0.1,r30d:-0.2,s20:0.05,s50:0.06,s200:null,pos24:0.4,vq:1.2,tk:0.48,vol30:0.05,b4:0.001,b24:-0.02,bs200:-0.1,bs50:0.02,fr:-0.0001,hr:13,dow:2},stage:'noBias'};
const c0={score:smp.score,yes:smp.yes,plan:{sd:smp.sd},feat:{stage:smp.stage,kz:true},pre:Object.entries(smp.a).map(([id,[v,c,ab]])=>({id,v,c,abst:!!ab}))};
const x0=Object.fromEntries(Object.entries(smp.x).map(([k,v])=>[k,v==null?NaN:v])); const row=E.ksRow(c0,x0,'short');
const exp=E.KS_MODEL.feats.map(f=>f==='L'?0:f==='score'?0.41:f==='yes'?5:f==='sd'?0.0213:f==='kz'?1:f==='stage'?E.KS_MODEL.stages.indexOf('noBias'):f.startsWith('v_')?(smp.a[f.slice(2)][2]?NaN:smp.a[f.slice(2)][0]):f.startsWith('c_')?(smp.a[f.slice(2)][2]?NaN:smp.a[f.slice(2)][1]):x0[f]);
ok(row.length===exp.length&&row.every((v,i)=>Object.is(v,exp[i])),'ksRow örnekle aynı satır');
// 3) ksFeatX ↔ masa-archive.js feats (arşiv varsa)
const ARCH=path.join(__dirname,'data','arch'); const sf=fs.existsSync(ARCH)?fs.readdirSync(ARCH).filter(f=>/^samples-\d+\.jsonl$/.test(f)).sort():[];
if(sf.length&&fs.existsSync(path.join(ARCH,'15m','BTCUSDT.csv'))){
  const csvK=f=>fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number));
  const btc=E.K(csvK(path.join(ARCH,'15m','BTCUSDT.csv'))), btcD=E.K(csvK(path.join(ARCH,'1d','BTCUSDT.csv')));
  const lines=[]; { const fd=fs.openSync(path.join(ARCH,sf[0]),'r'); const buf=Buffer.alloc(4e6); const n=fs.readSync(fd,buf,0,buf.length,0); fs.closeSync(fd); const t=buf.toString('utf8',0,n).split('\n'); t.pop(); for(const l of t) lines.push(JSON.parse(l)); }
  const sym=lines[lines.length-1].sym; const S=lines.filter(z=>z.sym===sym).slice(-40);
  const k=E.K(csvK(path.join(ARCH,'15m',sym+'.csv'))), d1=E.K(csvK(path.join(ARCH,'1d',sym+'.csv'))); const fund=fs.existsSync(path.join(ARCH,'funding',sym+'.csv'))?csvK(path.join(ARCH,'funding',sym+'.csv')).map(r=>[+r[0],+r[1]]):[];
  const ix=new Map(k.map((b,i)=>[b.t,i])); let n=0, bad=0;
  for(const z of S){ const i=ix.get(z.t); if(i==null) continue; let fr=NaN; for(const f of fund){ if(f[0]<=z.t+9e5) fr=f[1]; else break; }
    const x=E.ksFeatX(k.slice(Math.max(0,i-120),i+1),d1,btc,btcD,fr,z.dir); n++;
    for(const key in z.x){ const a=z.x[key], b=x[key]; if(a==null&&!Number.isFinite(b)) continue; if(!(Math.abs(a-b)<=1.01e-4)){ bad++; if(bad<4) console.log('fark',sym,z.t,z.dir,key,a,b); } } }
  ok(n>=20&&bad===0,`ksFeatX arşiv örnekleriyle aynı (${n} örnek, ${bad} fark)`); console.log('ksFeatX',sym,n,'örnek, fark',bad);
} else console.log('arşiv yok, ksFeatX ↔ masa-archive karşılaştırması atlandı');
// 4) nötr girdiler
{ const [f2,s2]=E.ksNeutral({prem:{markPrice:'1',lastFundingRate:'0.001'},depth:{x:1},trades:[1],oi5:[{sumOpenInterestValue:'9'}],noOI:false,k15:[1]},{toppos:[{longShortRatio:'2'}],glob:[{longShortRatio:'3'}],fund:[1],oi1h:[1],k1d:[1]});
  ok(f2.prem.lastFundingRate==='0'&&f2.prem.markPrice==='1'&&f2.depth===null&&f2.trades===null&&f2.noOI&&f2.k15.length===1,'ksNeutral: fonlama/defter/akış/OI nötr, mumlar kalır');
  ok(s2.noCrowd&&s2.toppos[0].longShortRatio==='1'&&s2.glob[0].longShortRatio==='1'&&s2.fund.length===0&&s2.oi1h===null&&s2.k1d.length===1,'ksNeutral: kalabalık/fonlama geçmişi nötr'); }
// 5) sepet mekaniği (eski yol: sepet kendi pozisyonunu açar, toBot kapalı)
const ksN=()=>{ const z=E.ksNew(); z.cfg.toBot=false; return z; };
const T0=Date.UTC(2026,9,1,4); const cand=sd=>[{dir:'short',c:{...c0,plan:{sd}},x:x0},{dir:'long',c:{...c0,plan:{sd}},x:x0}];
let s=ksN(); s.preds=Array.from({length:300},(_,i)=>[T0-i*H,1e9]); // eşik çok yüksek → giriş yok
let ev=E.ksDecide(s,'AUSDT',cand(0.02),100,T0); ok(!Object.keys(s.pos).length&&ev.some(e=>e.type==='skip'&&/eşiğin altında/.test(e.why)),'eşiğin altında giriş yok');
ok(s.preds.length===302,'long ve short tahminleri eşik defterine yazılır');
s=ksN(); s.preds=Array.from({length:300},(_,i)=>[T0-i*H,-1e9]); const th=E.ksThr(s,T0); ok(th.src==='canlı'&&th.thr===-1e9,'≥ 300 canlı tahminde eşik canlıdan');
ok(E.ksThr(ksN(),T0).thr===E.KS_MODEL.thr30&&E.ksThr(ksN(),T0).src==='arşiv','az canlı tahminde eşik arşivden (%30)');
ev=E.ksDecide(s,'AUSDT',cand(0.02),100,T0); const p=s.pos.AUSDT;
ok(p&&ev.some(e=>e.type==='fill'),'short açıldı');
ok(p&&Math.abs(p.e-100*(1-0.0003))<1e-9&&Math.abs(p.stop-p.e*1.04)<1e-9,'giriş kaymalı, stop 2 × sd üstünde');
ok(p&&Math.abs(p.qty*p.e*2*0.02-0.5)<1e-9,'risk bakiyenin %0,5i (0,5 $)');
ok(p&&Math.abs(p.until-(T0+72*H))<1,'72 saat');
E.ksDecide(s,'AUSDT',cand(0.02),101,T0+H); ok(Object.keys(s.pos).length===1,'aynı coinde ikinci short yok');
for(const k of ['B','C','D','E','F']) E.ksDecide(s,k+'USDT',cand(0.02),50,T0+2*H); ok(Object.keys(s.pos).length===5,'en çok 5 short');
const s2=ksN(); s2.preds=s.preds.slice(); s2.cfg.lev=0.1; ev=E.ksDecide(s2,'ZUSDT',cand(0.02),100,T0); ok(!s2.pos.ZUSDT&&ev.some(e=>/nominal/.test(e.why||'')),'nominal sınırı');
E.ksStep(s,{AUSDT:p.stop+0.01},T0+3*H,{}); const tA=s.trades.find(t=>t.sym==='AUSDT');
ok(!s.pos.AUSDT&&tA&&tA.why==='stop'&&tA.R<-1&&tA.R>-1.2,'stop: ≈ −1R (maliyet dahil) '+(tA&&tA.R));
const bf=s.bal; const all=v=>({BUSDT:v,CUSDT:v,DUSDT:v,EUSDT:v,FUSDT:v});
E.ksStep(s,all(50),s.fundT+8*H+1000,{BUSDT:0.001,CUSDT:0.001,DUSDT:0.001,EUSDT:0.001,FUSDT:0.001}); ok(s.bal>bf&&s.funding<0,'pozitif fonlamada short alır');
E.ksStep(s,all(49),T0+2*H+72*H,{}); ok(!Object.keys(s.pos).length&&s.trades.filter(t=>t.why==='72 sa').length===4,'72 saatte zaman çıkışı (A stopta, F 5 sınırına takıldı)');
ok(s.trades.filter(t=>t.why==='72 sa').every(t=>t.R>0),'fiyat düşünce short kârda');
const sm=E.ksSummary(s,{}); ok(sm.n===5&&sm.open===0&&Number.isFinite(sm.eq),'özet');
// 6) sinyal masanın hesabına (26 Ekim 2026): sepet pozisyon açmaz, "signal" olayı; bot ksBotPos ile açar
{ const sg=E.ksNew(); sg.preds=Array.from({length:300},(_,i)=>[T0-i*H,-1e9]); const ev6=E.ksDecide(sg,'AUSDT',cand(0.02),100,T0);
  const sig=ev6.find(e=>e.type==='signal'); ok(sig&&!Object.keys(sg.pos).length&&sig.dir==='short'&&sig.sd===0.02&&sig.px===100,'toBot: sinyal olayı, sepette pozisyon yok');
  const cfg={...E.BOT_CFG_DEF,ksMax:2,ksRisk:0.01}; const bot={bal:200,cfg,positions:[],orders:[]};
  const o=E.ksBotPos(sig,100,bot,T0); const p=o.p;
  ok(p&&p.side==='ks'&&p.model==='KALİTE'&&p.h24&&p.t1===null&&p.dir==='short','ksBotPos: hedefsiz yan pozisyon');
  ok(p&&Math.abs(p.stop-p.entry*1.04)<1e-9&&Math.abs(p.risk-2)<1e-9&&Math.abs(p.qty*(p.stop-p.entry)-2)<1e-9,'stop 2 × sd, risk bakiyenin %1i');
  ok(p&&p.expiresAt===T0+72*H&&p.holdH===72,'72 saat');
  ok(p&&p.lev===E.levFor(0.04,cfg.lev),'kaldıraç stopa göre');
  bot.positions.push(p); ok(/zaten pozisyon/.test(E.ksBotPos({...sig},100,bot,T0).why||''),'aynı coinde ikinci pozisyon yok');
  bot.positions.push(E.ksBotPos({...sig,sym:'BUSDT'},100,bot,T0).p); ok(/en çok 2/.test(E.ksBotPos({...sig,sym:'CUSDT'},100,bot,T0).why||''),'en çok ksMax kalite short');
  const st=E.paperStep(p,100,T0+73*H,cfg); ok(st.length===1&&st[0].k==='time'&&/72 saat/.test(st[0].t),'72 saatte zaman çıkışı');
  ok(E.paperStep(p,p.stop+0.01,T0+H,cfg)[0].k==='stop','stop');
  // masanın sayaçları yan pozisyonları saymaz: 2 kalite short + masa maxPos 2, aynı yönde 1 → masa short yine girebilir
  const X={sym:'ZUSDT',dir:'short',score:0.6,yes:8,veto:null,sd:0.02,feat:{pool:1,of:2},com:{agents:[{id:'liq',v:0.8},{id:'flow',v:0.5}],plan:{lev:20}}};
  const ctx={cfg:{...E.BOT_CFG_DEF,...E.GOAL_DEF,maxPos:2,maxSameDir:1},bal:200,start:100,eq:200,peak:200,positions:bot.positions,trades:[{sym:'BUSDT',dir:'short',side:'ks',r:-1,openT:T0,closeT:T0+60e3}],now:T0+120e3,thr:0.35,minYes:3,lev:20};
  const es=E.entryStages(X,ctx); ok(!es.slot&&!/aynı yönde|zaten|soğuma|dk önce/.test(es.stages.find(z=>z.k==='korelasyon').txt.replace('aynı yönde 0','')),'yan pozisyonlar masanın yer/aynı yön/soğuma sayacına girmez: '+E.stagesTxt(es));
  const es2=E.entryStages({...X,sym:'AUSDT'},ctx); ok(!es2.ok&&/bu coinde/.test(E.stagesTxt(es2)),'ama aynı coinde masa girmez');
  ok(E.auditRun([{sym:'BUSDT',dir:'short',side:'ks',r:-1,openT:T0,closeT:T0+H}],[]).n===0,'Murat yan işlemleri saymaz'); }
console.log('errors',errors);
if(errors.length) process.exit(1);
