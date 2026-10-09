// Binance vadeli aggTrades arşivinden saatlik işlem akışı (9 Ekim 2026): her işlemin fiyat, miktar, zaman ve taker yönü var; saat başına
// büyüklük kovalarına göre nominal hacim ve taker alış payı çıkarılır (kline'ların vermediği bilgi: büyük işlemlerin payı ve yönü).
// data.binance.vision/data/futures/um/daily/aggTrades/<SYM>/<SYM>-aggTrades-YYYY-MM-DD.zip (sütunlar: agg_trade_id,price,quantity,first_trade_id,last_trade_id,transact_time,is_buyer_maker)
// Çıktı tests/data/arch/aggflow/<SYM>.csv: t,n,q,qb,q1k,qb1k,q10k,qb10k,q100k,qb100k,mx,n100k
//   n işlem sayısı, q nominal (USDT), qb taker alış nominali, qXk ≥ X bin USDT büyüklüğündeki işlemlerin nominali ve taker alış kısmı, mx en büyük işlem, n100k ≥100k işlem sayısı.
// Yalnız coinin ayın ilk --top coini arasında olduğu günler. Kullanım: node tests/fetch-aggflow.js [--top 30] [--from 2024-06-01] [--conc 6] [--only DOGEUSDT] [--days 1] [--ckpt 150]
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const S3='https://s3-ap-northeast-1.amazonaws.com/data.binance.vision'; const ARCH=path.join(__dirname,'data','arch'), OUT=path.join(ARCH,'aggflow');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',30), CONC=+arg('conc',6), FROM=Date.parse(arg('from','2024-06-01')+'T00:00:00Z'), ONLY=arg('only',null), MAXD=+arg('days',1e9), DAY=864e5;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function unzip(buf){ let e=buf.length-22; while(e>=0&&buf.readUInt32LE(e)!==0x06054b50) e--; if(e<0) throw new Error('zip');
  const cd=buf.readUInt32LE(e+16), method=buf.readUInt16LE(cd+10), csize=buf.readUInt32LE(cd+20), lho=buf.readUInt32LE(cd+42);
  const start=lho+30+buf.readUInt16LE(lho+26)+buf.readUInt16LE(lho+28); const raw=buf.subarray(start,start+csize); return method===0?raw:zlib.inflateRawSync(raw); }
async function get(url){ for(let a=0;a<5;a++){ try{ const r=await fetch(url); if(r.status===404) return null; if(r.ok) return Buffer.from(await r.arrayBuffer()); throw new Error('HTTP '+r.status); }catch(e){ if(a===4) throw e; await sleep(1000*2**a); } } }
// Buffer üzerinde satır satır tarama (string'e çevirmeden; BTC günlük CSV ~100 MB)
function fold(buf){ const H=new Map(); const n=buf.length; let i=0;
  const field=()=>{ let s=i; while(i<n&&buf[i]!==44&&buf[i]!==10&&buf[i]!==13) i++; return s; };
  while(i<n){ const ls=i; // satır başı
    if(buf[ls]===97){ while(i<n&&buf[i]!==10) i++; i++; continue; } // 'agg_trade_id' başlığı
    let f=0, price=0, qty=0, t=0, bm=0, bad=false;
    while(i<n&&buf[i]!==10){ const s=field(); const str=buf.toString('latin1',s,i);
      if(f===1) price=+str; else if(f===2) qty=+str; else if(f===5) t=+str; else if(f===6) bm=(str[0]==='t'||str[0]==='T'||str==='1')?1:0;
      f++; if(buf[i]===44) i++; else break; }
    while(i<n&&buf[i]!==10) i++; i++;
    if(f<7||!(t>0)) continue; const v=price*qty; const h=Math.floor(t/36e5)*36e5; let r=H.get(h); if(!r){ r=new Float64Array(12); H.set(h,r); }
    r[0]++; r[1]+=v; if(!bm) r[2]+=v; if(v>=1e3){ r[3]+=v; if(!bm) r[4]+=v; } if(v>=1e4){ r[5]+=v; if(!bm) r[6]+=v; } if(v>=1e5){ r[7]+=v; if(!bm) r[8]+=v; r[11]++; } if(v>r[9]) r[9]=v; }
  return [...H.entries()].sort((a,b)=>a[0]-b[0]).map(([h,r])=>`${h},${r[0]},${r[1].toFixed(0)},${r[2].toFixed(0)},${r[3].toFixed(0)},${r[4].toFixed(0)},${r[5].toFixed(0)},${r[6].toFixed(0)},${r[7].toFixed(0)},${r[8].toFixed(0)},${r[9].toFixed(0)},${r[11]}`); }
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const want={}; for(const m in U){ const t0=Date.UTC(+m.slice(0,4),+m.slice(5,7)-1,1), t1=Date.UTC(+m.slice(0,4),+m.slice(5,7),1);
  for(const s of U[m].slice(0,TOP)){ if(ONLY&&s!==ONLY) continue; const set=(want[s]=want[s]||new Set()); for(let t=Math.max(FROM,t0);t<Math.min(t1,Date.now()-DAY);t+=DAY) set.add(new Date(t).toISOString().slice(0,10)); } }
(async()=>{
  fs.mkdirSync(OUT,{recursive:true}); const jobs=[]; const rows={}; let bytes=0, fail=0, miss=0;
  for(const s in want){ const f=path.join(OUT,s+'.csv'); const have=new Set(); rows[s]=new Map();
    if(fs.existsSync(f)) for(const l of fs.readFileSync(f,'utf8').split('\n')) if(l){ rows[s].set(+l.split(',')[0],l); have.add(new Date(+l.split(',')[0]).toISOString().slice(0,10)); }
    let k=0; for(const d of [...want[s]].sort()) if(!have.has(d)&&k++<MAXD) jobs.push([s,d]); }
  console.log('coin',Object.keys(want).length,'indirilecek gün',jobs.length); let i=0, done=0; const t0=Date.now();
  const CK=+arg('ckpt',150); const dirty=new Set(); // ara kayıt: her CK dosyada değişen coinlerin CSV'si yazılır (oturum yenilenirse inenler kalsın)
  const flush=()=>{ for(const s of dirty) if(rows[s].size) fs.writeFileSync(path.join(OUT,s+'.csv'),[...rows[s].entries()].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join('\n')+'\n'); dirty.clear(); };
  await Promise.all(Array.from({length:CONC},async()=>{ while(i<jobs.length){ const [s,d]=jobs[i++];
    try{ const b=await get(`${S3}/data/futures/um/daily/aggTrades/${s}/${s}-aggTrades-${d}.zip`); if(!b){ miss++; continue; } bytes+=b.length; const raw=unzip(b); for(const l of fold(raw)) rows[s].set(+l.split(',')[0],l); done++; dirty.add(s); if(done%CK===0) flush();
      if(done%50===0||jobs.length<=5) console.log(' ',done,'/',jobs.length,s,d,(b.length/1e6).toFixed(1)+' MB zip',(raw.length/1e6).toFixed(0)+' MB csv','eksik',miss,'hata',fail,((Date.now()-t0)/1000|0)+' sn',(bytes/1e6/((Date.now()-t0)/1000)).toFixed(1)+' MB/sn'); }
    catch(e){ fail++; console.log('  hata',s,d,e.message); } } }));
  for(const s in rows) dirty.add(s); flush();
  console.log('bitti gün',done,'eksik',miss,'hata',fail,(bytes/1e9).toFixed(2)+' GB',((Date.now()-t0)/1000|0)+' sn');
})();
