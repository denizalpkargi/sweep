// Masaya sor gerçek işlem kalkanı (askShield): 10 Ekim 2026 USUSDT işlemine benzer bir durum kırmızı vermeli, sakin bir coin vermemeli.
const {loadEngine}=require('./engine-node.js');
const E=loadEngine(); const errors=[]; const chk=(c,m)=>{ if(!c) errors.push(m); };
const day=(i,o,h,l,c)=>({t:Date.UTC(2026,8,30)+i*864e5,o,h,l,c,v:1,q:1,tb:0.5});
// US: 11 günlük, günlük aralık %30–130, 9 Ekim'de %100 pompa
const us=[day(0,0.025,0.027,0.018,0.019),day(1,0.019,0.022,0.0181,0.020),day(2,0.020,0.024,0.0193,0.021),day(3,0.021,0.022,0.0132,0.014),
  day(4,0.014,0.0154,0.0100,0.0120),day(5,0.012,0.0154,0.0103,0.0145),day(6,0.0145,0.0160,0.0122,0.0150),day(7,0.0150,0.0158,0.0141,0.0155),
  day(8,0.0155,0.0150*1.05,0.0147,0.0152),day(9,0.0161,0.0364,0.0155,0.0325),day(10,0.0325,0.0349,0.0212,0.0216)];
const a=E.askShield(us,{isL:true,lev:10,liqPct:0.094,entry:0.0240758,sl:NaN,bal:360,fee:0.0013});
console.log('US:',a.red.length,'kırmızı', a.warn.length,'uyarı | dRange',a.dRange.toFixed(2),'pump3',a.pump3.toFixed(2)); a.red.forEach(x=>console.log('  -',x));
chk(a.red.some(x=>/günlük aralığı/.test(x)),'US: likidasyon günlük aralığın içinde kırmızı olmalı');
chk(a.red.some(x=>/Çok oynak/.test(x)),'US: çok oynak coin kırmızı olmalı');
chk(a.red.some(x=>/günlük; geçmişi kısa/.test(x)),'US: yeni coin kırmızı olmalı');
chk(a.red.some(x=>/pompadan sonra long/.test(x)),'US: pompa sonrası long kırmızı olmalı');
chk(!isFinite(a.sizeSug),'US: stop yokken boyut önerisi olmamalı');
// aynı işlem stoplu: boyut önerisi bakiyenin %3'ü riskle
const b=E.askShield(us,{isL:true,lev:10,liqPct:0.094,entry:0.0240758,sl:0.0225,bal:360,fee:0.0013});
chk(isFinite(b.sizeSug)&&Math.abs(b.sizeSug*(Math.abs(0.0240758-0.0225)/0.0240758+0.0013)-360*0.03)<0.01,'boyut: stopta bakiyenin %3ü gitmeli');
console.log('boyut önerisi:',b.ok.join(' '));
// sakin, eski coin: günlük aralık %3, 200 gün, 10x, likidasyon %9 → kalkan sessiz
const calm=[]; for(let i=0;i<200;i++) calm.push(day(i,100,101.5,98.5,100));
const c=E.askShield(calm,{isL:true,lev:10,liqPct:0.09,entry:100,sl:98,bal:1000,fee:0.0013});
chk(c.red.length===0&&c.warn.length===0,'sakin coin: kalkan not vermemeli → '+c.red.concat(c.warn).join(' / '));
console.log('errors', errors);
if(errors.length) process.exit(1);
