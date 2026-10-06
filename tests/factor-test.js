// Faktör kütüphanesi (src/factors.js) ve faktör analisti Kaan: her faktörün sözleşmesi, çekimserlik, ağırlık, 100 üzerinden puan.
// Yeni faktör eklendiğinde bu test kendiliğinden onu da sınar. Çalıştırma: node tests/factor-test.js  (npm test içinde)
const assert=require('assert'); const {loadEngine}=require('./engine-node.js');
const E=loadEngine();
const errors=[]; const t=(name,fn)=>{ try{ fn(); }catch(e){ errors.push(name+': '+e.message); } };
const M=9e5, D=864e5;
// yapay veri: 600 × 15 dk yükselen seri, 260 günlük BTC yükselişi, 30 günlük coin günlüğü; "now" pazartesi 22:15 UTC (gece + pazartesi penceresi)
const now=Date.UTC(2026,8,7,22,15); // 7 Eylül 2026 pazartesi
function k15(n,slope){ const k=[]; let px=100; for(let i=0;i<n;i++){ const o=px; px*=1+slope+Math.sin(i/5)*0.001; k.push({t:now-(n-i)*M,o,h:Math.max(o,px)*1.001,l:Math.min(o,px)*0.999,c:px,v:1,q:1000,tb:500}); } return k; }
function daily(n,slope,end){ const k=[]; let px=100; for(let i=0;i<n;i++){ const o=px; px*=1+slope; const r=i===n-2?0.001:0.02; k.push({t:end-(n-i)*D,o,h:Math.max(o,px)*(1+r),l:Math.min(o,px)*(1-r),c:px,v:1,q:1,tb:0.5}); } return k; }
const day0=Math.floor(now/D)*D;
const k=k15(600,0.0008), b=k15(600,0.0008);
const d=daily(30,0.01,day0); d.push({t:day0,o:d[d.length-1].c,h:k[k.length-1].c*1.01,l:d[d.length-1].c*0.99,c:k[k.length-1].c,v:1,q:1,tb:0.5});
const x={k,d,btcD:daily(260,0.0005,day0),btc:b,now,px:k[k.length-1].c,fund:0.002,fundHist:[0.0001,0.0001,0.00012,0.00009,0.0001,0.00011,0.0001,0.0001],oi5:[100,100,100,100,100,100,93].map(v=>({sumOpenInterestValue:String(v)}))};
const SYM=new Set(["liqwave"]); // yönden bağımsız (giriş yasağı) faktörler
t('her faktör tek yerde tanımlı ve geçmiş ölçümü var',()=>{ const ids=E.FACTORS.map(f=>f.id); assert.strictEqual(new Set(ids).size,ids.length,'id tekil olmalı'); for(const f of E.FACTORS){ assert.ok(f.ad&&f.kaynak&&f.veri&&typeof f.fn==='function',f.id+' alanları'); assert.ok(E.FAC_FIT[f.id],f.id+' için FAC_FIT satırı yok (tests/research-factors.js çalıştır)'); } });
t('sözleşme: null ya da {v −1..1, c 0..1, txt}; long ve short ters',()=>{ for(const f of E.FACTORS){ const L=f.fn(x,"long"), S=f.fn(x,"short"); for(const r of [L,S]) if(r){ assert.ok(r.v>=-1&&r.v<=1&&r.c>=0&&r.c<=1&&typeof r.txt==='string'&&r.txt.length>5,f.id+' biçim'); }
    assert.strictEqual(!!L,!!S,f.id+': iki yönde de aynı koşul'); if(L&&!SYM.has(f.id)) assert.ok(Math.abs(L.v+S.v)<1e-9,f.id+': long ve short ters olmalı'); } });
t('bu yapay anda koşulda olanlar',()=>{ const R=E.facRead(x,"long"); for(const id of ["night","monday","hi10","btc200","liqwave","fundz"]) assert.ok(R[id],id+' koşulda olmalı'); assert.ok(R.btc200.v>0&&R.hi10.v>0,'yükselişte long lehte'); assert.ok(R.fundz.v<0,'aşırı artı fonlama long aleyhte'); assert.ok(R.liqwave.v<0,'OI %7 düştü: giriş yok'); });
t('veri yoksa çekimser',()=>{ const e={k:[],d:[],btcD:null,btc:null,now,px:100,fund:NaN,fundHist:[],oi5:null}; const R=E.facRead(e,"long"); assert.deepStrictEqual(Object.keys(R).filter(id=>!["night","monday"].includes(id)),[],'veri isteyen faktörler susmalı: '+Object.keys(R)); });
t('ağırlık: aktif = ölçüm, izlemede = 0',()=>{ for(const f of E.FACTORS){ const ft=E.FAC_FIT[f.id]; const w=E.facWeight(f.id); if(ft.st==="aktif") assert.strictEqual(w,ft.w,f.id); else assert.strictEqual(w,0,f.id); } });
t('Kaan: aktif faktör varsa oy, yoksa çekimser',()=>{ const A={src:{k15L:k,k1d:d,btc15:b},px:x.px,fund:x.fund,fundHist:x.fundHist,oi5:x.oi5}; const m=E.facMember(A,"long",{now,btcD:x.btcD}); assert.ok(!m.abst&&m.v>0,'long lehte oy: '+m.v+' '+m.txt); assert.ok(/izlemede/.test(m.txt),'izlemedekiler yazılmalı');
  const s=E.facMember(A,"short",{now,btcD:x.btcD}); assert.ok(s.v<0,'short karşı'); const e=E.facMember({src:{k15L:[],k1d:[]},px:100},"long",{now:Date.UTC(2026,8,9,12)}); assert.ok(e.abst,'koşul yok: çekimser'); });
t('tahmin defteri: izlemedeki faktör 200 canlı tahminde becerisi artıysa küçük ağırlıkla oya girer',()=>{ const id=E.FACTORS.find(f=>E.FAC_FIT[f.id].st!=="aktif").id; const F=E.fcLoad(); F.learn={agents:{["f:"+id]:{n:250,m:1.2}}};
  assert.ok(Math.abs(E.facWeight(id)-0.2)<1e-9,'ağırlık 0,2 olmalı: '+E.facWeight(id)); F.learn={agents:{["f:"+id]:{n:150,m:1.2}}}; assert.strictEqual(E.facWeight(id),0,'200 tahminden önce oy yok'); F.learn=null; });
t('puan 100 üzerinden gösterilir',()=>{ assert.strictEqual(E.SCORE_MAX,100); assert.strictEqual(E.pts(0.354),"35"); assert.strictEqual(E.pts(-0.12),"−12"); assert.strictEqual(E.ptsT(0.42),"42/100"); });
console.log('factor-test errors',JSON.stringify(errors)); if(errors.length) process.exit(1);
