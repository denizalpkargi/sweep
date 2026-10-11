// Sosyal medya stratejileri: hepsini çalıştır, sırala → tests/sm-report.md + tests/data/sm/sonuc.json
// Kullanım: node tests/sm-run.js [--only ema921,rsi200] [--iv 1h,4h] [--syms BTCUSDT,ETHUSDT] [--out tests/sm-report.md]
const fs=require('fs'),path=require('path'); const L=require('./sm-lib'); const {S}=require('./sm-strategies');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
const ALL='BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,ADAUSDT,DOGEUSDT,LINKUSDT,LTCUSDT,DOTUSDT,AVAXUSDT,BCHUSDT,ETCUSDT,TRXUSDT,XLMUSDT,ATOMUSDT,FILUSDT,UNIUSDT,NEARUSDT,AAVEUSDT';
const SYMS=String(arg('syms',ALL)).split(',').filter(s=>fs.existsSync(path.join(__dirname,'data','sm','1d',s+'.csv')));
// her stratejinin videoda önerilen zaman dilimleri
const PLAN=require('./sm-plan');
const only=arg('only',null)?String(arg('only')).split(','):null, ivOnly=arg('iv',null)?String(arg('iv')).split(','):null;
const rows=[]; const t0=Date.now();
for(const p of PLAN){ if(only&&!only.includes(p.id)) continue; if(!S[p.id]){ console.log('yok',p.id); continue; }
  for(const iv of p.iv){ if(ivOnly&&!ivOnly.includes(iv)) continue; const syms=iv==='5m'?SYMS.filter(s=>fs.existsSync(path.join(__dirname,'data','sm','5m',s+'.csv'))):SYMS;
    const r=L.runStrategy(p.ad,syms,iv,S[p.id],p.opt||{}); const s=L.summarize(r); s.id=p.id; s.kaynak=p.kaynak; s.iddia=p.iddia; s.nSym=syms.length; rows.push(s);
    console.log(`${p.id} ${iv} n=${s.n} R=${s.R?.toFixed(3)} h1=${s.h1?.toFixed(3)} h2=${s.h2?.toFixed(3)} l12=${s.l12?.toFixed(3)} rnd=${s.rnd?.toFixed(3)} fark=${s.diff?.toFixed(3)} (${((Date.now()-t0)/1000).toFixed(0)} sn)`); } }
fs.mkdirSync(path.join(__dirname,'data','sm'),{recursive:true}); fs.writeFileSync(path.join(__dirname,'data','sm','sonuc.json'),JSON.stringify(rows,null,1));
// sıralama: önce iki yarıda ve son 12 ayda net R > 0 olanlar, sonra rastgeleye göre farkın t'si
const ok=r=>r.n>=30&&r.h1>0&&r.h2>0&&r.l12>0; const ok2=r=>r.n>=30&&r.d1>0&&r.d2>0;
const lvl=r=>r.n<30?0:(r.h1>0&&r.h2>0&&r.l12>0&&r.d1>0&&r.d2>0)?3:(r.h1>0&&r.h2>0)?2:r.R>0?1:0;
const DUR=['elendi','elendi (bir yarıda eksi)','kısmen (iki yarıda artı, rastgeleyi ya da son 12 ayı geçemedi)','geçti'];
rows.sort((a,b)=>(lvl(b)-lvl(a))||(b.R-a.R));
const f=(x,k=3)=>x==null||isNaN(x)?'–':x.toFixed(k).replace('.',','), pc=x=>isNaN(x)?'–':(100*x).toFixed(0)+' %';
let md=`# Sosyal medya stratejileri · sıralama\n\nEvren: ${SYMS.length} uzun ömürlü likit Binance perp (${SYMS.map(s=>s.replace('USDT','')).join(', ')}), 2020-01 → 2026-10 (5 dk: 6 coin, 2022'den). Sinyal mum kapanışında, giriş sonraki mum açılışında; taker %0,05 + kayma %0,03 her tarafta, fonlama arşivden; stop ve hedef aynı mumda → stop. R = net getiri ÷ ilk stop uzaklığı. **Rastgele** = aynı coin ve yönde ±30 gün içinde rastgele mumda aynı stop/hedef uzaklığı ve aynı tutuş süresiyle 3 giriş; **fark** = işlem R − rastgele R. Yarılar 2023-05-15'te bölünür; son 12 ay 2025-10-11'den.\n\n`;
md+=`| # | Strateji | Zaman | İşlem | Kazanma | PF | Ort. R | t | 1. yarı | 2. yarı | Son 12 ay | Rastgele R | Fark | Fark 1. yarı | Fark 2. yarı | Fark t | Durum | Long R | Short R | Ort. getiri % | Ort. stop % | Ort. tutuş (mum) |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
rows.forEach((r,k)=>{ md+=`| ${k+1} | ${r.name} | ${r.iv} | ${r.n} | ${pc(r.win)} | ${f(r.pf,2)} | **${f(r.R)}** | ${f(r.tR,1)} | ${f(r.h1)} | ${f(r.h2)} | ${f(r.l12)} | ${f(r.rnd)} | ${f(r.diff)} | ${f(r.d1)} | ${f(r.d2)} | ${f(r.tDiff,1)} | ${DUR[lvl(r)]} | ${f(r.long)} | ${f(r.short)} | ${f(r.retPct,2)} | ${f(r.riskPct,2)} | ${f(r.bars,0)} |\n`; });
md+=`\n## Yıl yıl ortalama R\n\n| Strateji | Zaman | ${[2020,2021,2022,2023,2024,2025,2026].join(' | ')} |\n|---|---|${'---|'.repeat(7)}\n`;
for(const r of rows) md+=`| ${r.name} | ${r.iv} | ${[2020,2021,2022,2023,2024,2025,2026].map(y=>f(r.years[y],2)).join(' | ')} |\n`;
md+=`\n_${((Date.now()-t0)/1000).toFixed(0)} sn · node tests/sm-run.js_\n`;
fs.writeFileSync(arg('out',path.join(__dirname,'sm-report.md')),md); console.log('yazıldı');
