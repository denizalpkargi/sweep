// Serkan (hacim analisti) ve Yusuf (strateji doğrulayıcı) birim testi. Çalıştırma: node tests/desk-new-test.js  (npm test içinde)
const assert=require('assert'); const {loadEngine}=require('./engine-node.js'); const E=loadEngine();
const errors=[]; const t=(name,fn)=>{ try{ fn(); }catch(e){ errors.push(name+': '+e.message); } };
const T0=Date.UTC(2026,8,1); const M=9e5;
// 200 mum: önce yatay, son 24 mumda düşüş ve artan hacim (kapitülasyon) → long lehine
function series(drop,volUp){ const k=[]; let px=100; for(let i=0;i<200;i++){ const late=i>=176; const d=late?(drop?-0.25:0.25):Math.sin(i/7)*0.1; const o=px; px=px+d; const q=late&&volUp?1000*(1+(i-175)*0.15):1000; k.push({t:T0+i*M,o,h:Math.max(o,px)+0.2,l:Math.min(o,px)-0.2,c:px,v:q/px,q,tb:q/2}); } return k; }
const now=T0+200*M;
t('düşüş + artan hacim long lehine',()=>{ const R=E.volRead(series(true,true),now); assert.ok(R&&R.slope>0.5,'hacim eğilimi artmalı: '+(R&&R.slope)); assert.ok(R.cap>0,'kapitülasyon okuması artı olmalı: '+R.cap); assert.ok(R.s>0,'long puanı artı olmalı: '+R.s); });
t('düşüş + yatay hacim: kapitülasyon yok',()=>{ const R=E.volRead(series(true,false),now); assert.ok(Math.abs(R.cap)<0.05,'cap ≈ 0 olmalı: '+R.cap); });
t('açık mum sayılmaz',()=>{ const k=series(true,true); const a=E.volRead(k,now), b=E.volRead(k,now-1); assert.ok(b.px!==a.px,'son mum açıkken bir önceki kapanış kullanılmalı'); });
t('az veri: çekimser',()=>{ const m=E.volMember({src:{k15L:series(true,true).slice(-30)}},"long"); assert.ok(m.abst,'çekimser olmalı'); });
// Yusuf: günlük yön
const daily=(up,n)=>{ const k=[]; let px=100; for(let i=0;i<n;i++){ const o=px; px*=up?1.01:0.99; k.push({t:T0-(n-i)*864e5,o,h:Math.max(o,px)*1.005,l:Math.min(o,px)*0.995,c:px,v:1,q:1,tb:0.5}); } return k; };
const A0=(up,n)=>({trend:up?"up":"down",src:{k1d:daily(up,n),k1h:[],k15L:[{t:now-M,o:1,h:1,l:1,c:1,q:1,tb:0.5}]}});
t('günlük yönle uyumlu long artı, short eksi',()=>{ const L=E.tfMember(A0(true,60),"long",{}), S=E.tfMember(A0(true,60),"short",{}); assert.ok(!L.abst&&L.v>0.3,'long artı: '+L.v); assert.ok(S.v<-0.3,'short eksi: '+S.v); assert.ok(/günlük yukarı/.test(L.txt)); });
t('günlük veri yoksa çekimser',()=>{ const m=E.tfMember(A0(true,10),"long",{}); assert.ok(m.abst); });
t('kurulum kuralları denetlenir',()=>{ const r={kz:null,ofScore:0,rr1:1.2,stage:"entry"}; const m=E.tfMember({...A0(true,60),trend:"flat"},"long",{r,lv:0.9,costR:0.2}); assert.ok(m.issues.length>=4,'en az dört hata: '+m.issues.join(' | ')); assert.ok(m.v<0,'hatalı kurulumda oy eksi: '+m.v); });
t('masada on dört üye (Kaan ve Ozan dahil), yeni üyeler oyda',()=>{ assert.strictEqual(E.DESK.length,14); const ids=E.DESK.map(d=>d.id); assert.ok(ids.includes('vol')&&ids.includes('check')&&ids.includes('fac')&&ids.includes('rank')); assert.strictEqual(ids[ids.length-1],'risk','Can son söz'); });
console.log('desk-new-test errors',JSON.stringify(errors)); if(errors.length) process.exit(1);
