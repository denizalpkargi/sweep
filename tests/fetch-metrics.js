// Binance vadeli "metrics" arşivi (8 Ekim 2026): 5 dk'da bir açık pozisyon (OI), büyük traderların long/short oranı (hesap ve pozisyon),
// tüm hesapların long/short oranı, taker alış/satış hacim oranı. data.binance.vision günlük zip'leri (2020-09'dan), fapi REST'e istek yok.
// Yalnız coinin ayın ilk --top coini arasında olduğu aylar (+ önceki ayın son 3 günü, değişimler ısınsın) indirilir.
// Çıktı tests/data/arch/metrics/<SYM>.csv: t,oi,oiv,topAcc,topPos,glob,taker (başlıksız, t ms). Var olan dosyaya yalnız eksik günler eklenir.
// Kullanım: node tests/fetch-metrics.js [--top 30] [--conc 32]
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const S3='https://s3-ap-northeast-1.amazonaws.com/data.binance.vision'; const ARCH=path.join(__dirname,'data','arch'), OUT=path.join(ARCH,'metrics');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',30), CONC=+arg('conc',32), DAY=864e5, FIRST=Date.UTC(2020,8,1);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function unzip(buf){ let e=buf.length-22; while(e>=0&&buf.readUInt32LE(e)!==0x06054b50) e--; if(e<0) throw new Error('zip');
  const cd=buf.readUInt32LE(e+16), method=buf.readUInt16LE(cd+10), csize=buf.readUInt32LE(cd+20), lho=buf.readUInt32LE(cd+42);
  const start=lho+30+buf.readUInt16LE(lho+26)+buf.readUInt16LE(lho+28); const raw=buf.subarray(start,start+csize); return (method===0?raw:zlib.inflateRawSync(raw)).toString('utf8'); }
async function get(url){ for(let a=0;a<5;a++){ try{ const r=await fetch(url); if(r.status===404) return null; if(r.ok) return Buffer.from(await r.arrayBuffer()); throw new Error('HTTP '+r.status); }catch(e){ if(a===4) throw e; await sleep(1000*2**a); } } }
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const want={}; for(const m in U){ const t0=Date.UTC(+m.slice(0,4),+m.slice(5,7)-1,1), t1=Date.UTC(+m.slice(0,4),+m.slice(5,7),1);
  for(const s of U[m].slice(0,TOP)){ const set=(want[s]=want[s]||new Set()); for(let t=Math.max(FIRST,t0-3*DAY);t<Math.min(t1,Date.now()-DAY);t+=DAY) set.add(new Date(t).toISOString().slice(0,10)); } }
(async()=>{
  fs.mkdirSync(OUT,{recursive:true}); const jobs=[]; const rows={}; let fail=0, miss=0;
  for(const s in want){ const f=path.join(OUT,s+'.csv'); const have=new Set(); rows[s]=[];
    if(fs.existsSync(f)) for(const l of fs.readFileSync(f,'utf8').split('\n')) if(l){ rows[s].push(l); have.add(new Date(+l.split(',')[0]).toISOString().slice(0,10)); }
    for(const d of want[s]) if(!have.has(d)) jobs.push([s,d]); }
  console.log('coin',Object.keys(want).length,'indirilecek gün',jobs.length); let i=0, done=0; const t0=Date.now();
  await Promise.all(Array.from({length:CONC},async()=>{ while(i<jobs.length){ const [s,d]=jobs[i++];
    try{ const b=await get(`${S3}/data/futures/um/daily/metrics/${s}/${s}-metrics-${d}.zip`); if(!b){ miss++; }
      else for(const l of unzip(b).split(/\r?\n/)){ const r=l.split(','); if(!/^\d{4}-/.test(r[0])) continue; const t=Date.parse(r[0].replace(' ','T')+'Z');
        rows[s].push([t,r[2],r[3],r[4],r[5],r[6],r[7]].map(x=>x===''?'':x).join(',')); } }catch(e){ fail++; }
    if(++done%5000===0) console.log(`  ${done}/${jobs.length} (${((Date.now()-t0)/1000).toFixed(0)} sn)`); } }));
  for(const s in rows){ const seen=new Set(); const a=rows[s].filter(l=>{ const t=l.slice(0,l.indexOf(',')); if(seen.has(t)) return false; seen.add(t); return true; }).sort((x,y)=>+x.split(',')[0]-+y.split(',')[0]);
    if(a.length) fs.writeFileSync(path.join(OUT,s+'.csv'),a.join('\n')); }
  console.log('bitti · arşivde olmayan gün',miss,'· hata',fail);
})().catch(e=>{ console.error(e); process.exit(1); });
