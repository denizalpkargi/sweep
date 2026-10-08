// Ek arşiv verisi (8 Ekim 2026, öncü iz araştırması): vadeli prim endeksi (perp − endeks, 15 dk) ve spot 15 dk mumlar.
// Yalnız coinin ayın ilk --top coini olduğu aylar (+ önceki ay) indirilir; içinde bulunulan ay günlük zip'lerle tamamlanır.
// Çıktı: tests/data/arch/premium15m/<SYM>.csv (openTime,o,h,l,c, prim oranı), tests/data/arch/spot15m/<SYM>.csv (kline satırı)
// Kullanım: node tests/fetch-extra.js [--kind premium,spot] [--top 30] [--conc 32]
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const S3='https://s3-ap-northeast-1.amazonaws.com/data.binance.vision'; const ARCH=path.join(__dirname,'data','arch');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const KINDS=String(arg('kind','premium,spot')).split(','), TOP=+arg('top',30), CONC=+arg('conc',32);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function unzip(buf){ let e=buf.length-22; while(e>=0&&buf.readUInt32LE(e)!==0x06054b50) e--; if(e<0) throw new Error('zip');
  const cd=buf.readUInt32LE(e+16), method=buf.readUInt16LE(cd+10), csize=buf.readUInt32LE(cd+20), lho=buf.readUInt32LE(cd+42);
  const start=lho+30+buf.readUInt16LE(lho+26)+buf.readUInt16LE(lho+28); const raw=buf.subarray(start,start+csize); return (method===0?raw:zlib.inflateRawSync(raw)).toString('utf8'); }
async function get(url){ for(let a=0;a<5;a++){ try{ const r=await fetch(url); if(r.status===404) return null; if(r.ok) return Buffer.from(await r.arrayBuffer()); throw new Error('HTTP '+r.status); }catch(e){ if(a===4) return null; await sleep(1000*2**a); } } }
const PATH={premium:(s,per,tag)=>`futures/um/${per}/premiumIndexKlines/${s}/15m/${s}-15m-${tag}.zip`, spot:(s,per,tag)=>`spot/${per}/klines/${s}/15m/${s}-15m-${tag}.zip`};
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const cur=new Date().toISOString().slice(0,7);
const want={}; for(const m in U) for(const s of U[m].slice(0,TOP)){ const set=(want[s]=want[s]||new Set()); set.add(m); const d=new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7)-2,1)); set.add(d.toISOString().slice(0,7)); }
(async()=>{ for(const kind of KINDS){ const dir=path.join(ARCH,kind+'15m'); fs.mkdirSync(dir,{recursive:true}); const jobs=[]; const rows={};
  for(const s in want){ const f=path.join(dir,s+'.csv'); rows[s]=fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean):[]; const have=new Set(rows[s].map(l=>new Date(+l.split(',')[0]).toISOString().slice(0,7)));
    for(const m of want[s]){ if(m===cur){ const now=new Date(); for(let d=1;d<now.getUTCDate();d++) jobs.push([s,'daily',`${m}-${String(d).padStart(2,'0')}`]); } else if(!have.has(m)) jobs.push([s,'monthly',m]); } }
  console.log(kind,'coin',Object.keys(want).length,'dosya',jobs.length); let i=0,done=0,miss=0; const t0=Date.now();
  await Promise.all(Array.from({length:CONC},async()=>{ while(i<jobs.length){ const [s,per,tag]=jobs[i++]; const b=await get(`${S3}/data/${PATH[kind](s,per,tag)}`);
    if(!b) miss++; else for(const l of unzip(b).split(/\r?\n/)) if(/^[0-9]/.test(l)) rows[s].push(l);
    if(++done%2000===0) console.log(`  ${done}/${jobs.length} (${((Date.now()-t0)/1000).toFixed(0)} sn)`); } }));
  for(const s in rows){ const seen=new Set(); const a=rows[s].filter(l=>{ const t=l.slice(0,l.indexOf(',')); if(seen.has(t)) return false; seen.add(t); return true; }).sort((x,y)=>+x.split(',')[0]-+y.split(',')[0]); if(a.length) fs.writeFileSync(path.join(dir,s+'.csv'),a.join('\n')); }
  console.log(kind,'bitti · yok',miss); } })();
