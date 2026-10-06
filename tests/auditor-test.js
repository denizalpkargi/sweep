// Denetçi (Murat) birim testi: yapay kapanmış işlemlerle etiketler, dersler, kollar, oy ve eski kayıtların günlükten okunması.
// Çalıştırma: npm run build && node tests/auditor-test.js
const {loadEngine}=require('./engine-node.js'); const E=loadEngine(); const assert=require('assert');
const H=3600e3, M=60e3; let t0=Date.UTC(2026,9,5,18); const trades=[];
const v=o=>Object.assign({trend:0.4,liq:0.8,flow:0.3,macro:0.5,quant:0,mom:0.3,copy:0,audit:0,risk:0.6},o);
const mk=o=>{ const tr=Object.assign({sym:"XUSDT",dir:"long",model:"KOMİTE",openT:t0,risk:3,fees:0.3,score:0.45,mfe:1.2,exits:["tp1","stop"]},o); tr.closeT=tr.openT+(o.hold||2*H); t0+=3*H; trades.push(tr); return tr; };
// 10 süpürmesiz, 30 dakikada stop olan kayıp; 8 temiz kazanç
for(let i=0;i<10;i++) mk({r:-1.05,mfe:0.1,exits:["stop"],hold:30*M,snap:{v:v({liq:-0.3}),score:0.33,yes:5,sd:0.015}});
for(let i=0;i<8;i++) mk({r:1.1,snap:{v:v({}),score:0.5,yes:7,sd:0.015}});
const A=E.auditRun(trades,[],{thr:0.3,minYes:4});
console.log('dersler',A.lessons.map(l=>l.k+' → '+l.lever));
assert.strictEqual(A.summary.n,18);
assert.ok(A.tags.nosweep.n===10&&A.tags.nosweep.avg<-1,'süpürmesiz etiketi');
assert.ok(A.vote.nosweep<0&&A.veto.nosweep,'süpürmesiz → oy ve veto');
assert.ok(A.lessons.some(l=>l.k==="noise")&&A.sdMin===0.02,'gürültü stopu → stop tabanı %2');
assert.ok(A.lessons.some(l=>l.k==="thin")&&A.thrBump>0,'eşikte giriş → eşik artışı');
assert.ok(!A.maxSameDir,'yığılma yok');
assert.ok(A.mult.liq&&A.mult.liq.m>1,'Kerem\'in oyu sonuçla uyumlu → ağırlık artar');
E.setAud(A);
const ag=o=>Object.fromEntries(Object.entries(v(o)).map(([id,x])=>[id,{v:x,c:0.8}]));
const bad=E.audVoteFor(ag({liq:-0.3})); assert.ok(bad.v<0&&bad.veto==="nosweep",'süpürmesiz kuruluma veto');
const good=E.audVoteFor(ag({})); assert.ok(good.v>0&&!good.veto,'temiz kurulum destek');
console.log('oy · kötü',bad.v,bad.txt,'| iyi',good.v,good.txt);
// aynı saniyede üç long (5–6 Ekim gecesindeki gibi) tekrar tekrar kaybederse → aynı yönde en fazla 1
const T2=[]; let t=Date.UTC(2026,9,6,0);
for(let i=0;i<6;i++){ for(let j=0;j<3;j++) T2.push({sym:"C"+j+"USDT",dir:"long",openT:t+j*10,closeT:t+40*M+j*M,r:-1,risk:3,fees:0.3,exits:["stop"]}); t+=3*H; }
for(let i=0;i<6;i++){ T2.push({sym:"DUSDT",dir:"short",openT:t,closeT:t+3*H,r:0.8,risk:3,fees:0.3,exits:["tp1","stop"]}); t+=4*H; }
const B=E.auditRun(T2,[],{}); console.log('dersler 2',B.lessons.map(l=>l.k+' → '+l.lever));
assert.strictEqual(B.maxSameDir,1,'yığılma → aynı yönde 1');
// eski kayıt: girişteki oylar ve çıkış karar günlüğünden okunur
const L=[{t:1000,type:"fill",sym:"OLDUSDT",text:"MASA LONG · Can'ın kararı · puan 0,34 · 5/8 evet · market 1,00 · stop 0,985 (1,50%) · 1,5R 1,02 · 3R 1,05 · 20x · pozisyon 200 $ · teminat 10 $ · risk 3 $. Oylar: Emre +0,3, Kerem -0,3, Mert +0,5, Arda -0,6, Onur 0,0, Baran +0,4, Tolga 0,0, Can +0,6."},{t:5000,type:"stop",sym:"OLDUSDT",text:"Stop"}];
const old=[{sym:"OLDUSDT",dir:"long",openT:1500,closeT:5000,r:-1,risk:3,fees:0.3,score:0.34}]; E.audBackfill(old,L);
assert.ok(old[0].snap&&old[0].snap.v.liq===-0.3&&old[0].snap.v.macro===-0.6&&Math.abs(old[0].snap.sd-0.015)<1e-9&&old[0].snap.yes===5,'günlükten oylar');
assert.deepStrictEqual(old[0].exits,["stop"]);
const tg=E.audTagsOf(old[0],old,{thr:0.3,minYes:4}); console.log('eski kayıt etiketleri',tg);
assert.ok(tg.includes("nosweep")&&tg.includes("btc")&&tg.includes("thin")&&tg.includes("noise"));
// boş ve az veri: masaya etkisi olmamalı
const Z=E.auditRun([],[],{}); assert.ok(!Z.summary&&!Z.lessons.length); E.setAud(Z); assert.strictEqual(E.audVoteFor(ag({})).w,0);
console.log('auditor ok');
