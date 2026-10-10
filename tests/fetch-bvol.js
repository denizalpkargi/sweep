// Binance opsiyon arşivi: BVOL ima edilen oynaklık endeksi (9 Ekim 2026, kullanıcı "elimizde olmayan verileri bulalım" dedi).
// data.binance.vision/data/option/daily/BVOLIndex/<BTCBVOLUSDT|ETHBVOLUSDT>/ günlük zip (saniyede bir satır, 2023-06-20'den), S3 üzerinden (REST yok).
// Çıktı tests/data/arch/bvol/<SYM>.csv: t(saat başı ms),o,h,l,c,m (saatlik açılış/en yüksek/en düşük/kapanış/ortalama endeks değeri, % yıllık oynaklık).
// Var olan dosyaya yalnız eksik günler eklenir. Kullanım: node tests/fetch-bvol.js [--conc 12] [--from 2023-06-20]
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const S3='https://s3-ap-northeast-1.amazonaws.com/data.binance.vision'; const ARCH=path.join(__dirname,'data','arch'), OUT=path.join(ARCH,'bvol');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const CONC=+arg('conc',12), FROM=Date.parse(arg('from','2023-06-20')+'T00:00:00Z'), DAY=864e5, SYMS=['BTCBVOLUSDT','ETHBVOLUSDT'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function unzip(buf){ let e=buf.length-22; while(e>=0&&buf.readUInt32LE(e)!==0x06054b50) e--; if(e<0) throw new Error('zip');
  const cd=buf.readUInt32LE(e+16), method=buf.readUInt16LE(cd+10), csize=buf.readUInt32LE(cd+20), lho=buf.readUInt32LE(cd+42);
  const start=lho+30+buf.readUInt16LE(lho+26)+buf.readUInt16LE(lho+28); const raw=buf.subarray(start,start+csize); return (method===0?raw:zlib.inflateRawSync(raw)).toString('utf8'); }
async function get(url){ for(let a=0;a<5;a++){ try{ const r=await fetch(url); if(r.status===404) return null; if(r.ok) return Buffer.from(await r.arrayBuffer()); throw new Error('HTTP '+r.status); }catch(e){ if(a===4) throw e; await sleep(1000*2**a); } } }
function hourly(csv){ const H=new Map(); for(const l of csv.split('\n')){ if(!l||l.startsWith('calc_time')) continue; const c=l.split(','); const t=+c[0], v=+c[4]; if(!(t>0)||!(v>0)) continue;
    const h=Math.floor(t/36e5)*36e5; let r=H.get(h); if(!r){ r={o:v,h:v,l:v,c:v,s:0,n:0,t0:t,t1:t}; H.set(h,r); } if(t<r.t0){ r.o=v; r.t0=t; } if(t>=r.t1){ r.c=v; r.t1=t; } if(v>r.h) r.h=v; if(v<r.l) r.l=v; r.s+=v; r.n++; }
  return [...H.entries()].sort((a,b)=>a[0]-b[0]).map(([h,r])=>`${h},${r.o},${r.h},${r.l},${r.c},${(r.s/r.n).toFixed(4)}`); }
(async()=>{
  fs.mkdirSync(OUT,{recursive:true}); const t0=Date.now();
  for(const s of SYMS){ const f=path.join(OUT,s+'.csv'); const rows=new Map(); const have=new Set();
    if(fs.existsSync(f)) for(const l of fs.readFileSync(f,'utf8').split('\n')) if(l){ rows.set(+l.split(',')[0],l); have.add(new Date(+l.split(',')[0]).toISOString().slice(0,10)); }
    const days=[]; for(let t=FROM;t<Date.now()-DAY;t+=DAY){ const d=new Date(t).toISOString().slice(0,10); if(!have.has(d)) days.push(d); }
    console.log(s,'var olan gün',have.size,'indirilecek',days.length); let i=0, done=0, miss=0;
    await Promise.all(Array.from({length:CONC},async()=>{ while(i<days.length){ const d=days[i++];
      try{ const b=await get(`${S3}/data/option/daily/BVOLIndex/${s}/${s}-BVOLIndex-${d}.zip`); if(!b){ miss++; continue; } for(const l of hourly(unzip(b))) rows.set(+l.split(',')[0],l); done++; if(done%100===0) console.log(' ',s,done,'/',days.length,'eksik',miss,((Date.now()-t0)/1000|0)+' sn'); }
      catch(e){ console.log('  hata',s,d,e.message); } } }));
    fs.writeFileSync(f,[...rows.entries()].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join('\n')+'\n'); console.log(s,'yazıldı saat',rows.size,'eksik gün',miss); }
  console.log('bitti',((Date.now()-t0)/1000|0)+' sn');
})();
