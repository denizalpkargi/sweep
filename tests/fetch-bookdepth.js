// Emir defteri derinliği arşivi (8 Ekim 2026, kullanıcı "ona da bakalım"): data.binance.vision günlük bookDepth zip'leri
// (~30 sn'de bir, ±1…5 % (2025'ten ±0,2 % de) bantlarında toplam miktar ve nominal; 2023 başından, ilk aylar seyrek).
// Ham veri saklanmaz: her gün indirilir, 15 dk mumlara toplanır (banttaki nominalin mum içindeki ortalaması, USDT) ve atılır.
// Yalnız coinin ayın ilk --top coini olduğu aylar. Çıktı tests/data/arch/depth15m/<SYM>.csv:
//   t(ms, mum açılışı), n(snapshot sayısı), b02,a02,b1,a1,b2,a2,b3,a3,b5,a5  (b = alış/bid tarafı, a = satış/ask; ±0,2 yoksa boş)
// Kullanım: node tests/fetch-bookdepth.js [--top 30] [--conc 24] [--from 2023-06]
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const S3='https://s3-ap-northeast-1.amazonaws.com/data.binance.vision'; const ARCH=path.join(__dirname,'data','arch'), OUT=path.join(ARCH,'depth15m');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',30), CONC=+arg('conc',24), FROM=String(arg('from','2023-06')), DAY=864e5, M15=9e5;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function unzip(buf){ let e=buf.length-22; while(e>=0&&buf.readUInt32LE(e)!==0x06054b50) e--; if(e<0) throw new Error('zip');
  const cd=buf.readUInt32LE(e+16), method=buf.readUInt16LE(cd+10), csize=buf.readUInt32LE(cd+20), lho=buf.readUInt32LE(cd+42);
  const start=lho+30+buf.readUInt16LE(lho+26)+buf.readUInt16LE(lho+28); const raw=buf.subarray(start,start+csize); return (method===0?raw:zlib.inflateRawSync(raw)).toString('utf8'); }
async function get(url){ for(let a=0;a<5;a++){ try{ const r=await fetch(url); if(r.status===404) return null; if(r.ok) return Buffer.from(await r.arrayBuffer()); throw new Error('HTTP '+r.status); }catch(e){ if(a===4) throw e; await sleep(1000*2**a); } } }
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const want={}; for(const m in U){ if(m<FROM) continue; const t0=Date.UTC(+m.slice(0,4),+m.slice(5,7)-1,1), t1=Date.UTC(+m.slice(0,4),+m.slice(5,7),1);
  for(const s of U[m].slice(0,TOP)){ const set=(want[s]=want[s]||new Set()); for(let t=t0;t<Math.min(t1,Date.now()-DAY);t+=DAY) set.add(new Date(t).toISOString().slice(0,10)); } }
const BANDS=['0.2','1','2','3','5'];
function fold(text){ // gün metni → Map(mum açılışı → toplamlar)
  const acc=new Map(); for(const l of text.split(/\r?\n/)){ if(!/^\d{4}-/.test(l)) continue; const r=l.split(','); const t=Date.parse(r[0].replace(' ','T')+'Z'); const bar=t-(t%M15);
    const p=parseFloat(r[1]); const key=(p<0?'b':'a')+String(Math.abs(p)).replace(/\.0+$/,''); if(!BANDS.includes(key.slice(1))) continue;
    let o=acc.get(bar); if(!o){ o={n:{}, s:{}}; acc.set(bar,o); } o.n[key]=(o.n[key]||0)+1; o.s[key]=(o.s[key]||0)+parseFloat(r[3]); }
  const rows=[]; for(const [bar,o] of acc){ const n=Math.max(...Object.values(o.n)); rows.push([bar,n,...['b0.2','a0.2','b1','a1','b2','a2','b3','a3','b5','a5'].map(k=>o.n[k]?(o.s[k]/o.n[k]).toFixed(0):'')].join(',')); } return rows; }
(async()=>{
  fs.mkdirSync(OUT,{recursive:true}); const jobs=[]; const rows={}; let miss=0, fail=0;
  for(const s in want){ const f=path.join(OUT,s+'.csv'); const have=new Set(); rows[s]=[];
    if(fs.existsSync(f)) for(const l of fs.readFileSync(f,'utf8').split('\n')) if(l){ rows[s].push(l); have.add(new Date(+l.split(',')[0]).toISOString().slice(0,10)); }
    for(const d of want[s]) if(!have.has(d)) jobs.push([s,d]); }
  console.log('coin',Object.keys(want).length,'indirilecek gün',jobs.length); let i=0, done=0; const t0=Date.now();
  await Promise.all(Array.from({length:CONC},async()=>{ while(i<jobs.length){ const [s,d]=jobs[i++];
    try{ const b=await get(`${S3}/data/futures/um/daily/bookDepth/${s}/${s}-bookDepth-${d}.zip`); if(!b) miss++; else for(const r of fold(unzip(b))) rows[s].push(r); }catch(e){ fail++; }
    if(++done%2000===0){ console.log(`  ${done}/${jobs.length} (${((Date.now()-t0)/1000).toFixed(0)} sn)`); flush(); } } }));
  function flush(){ for(const s in rows){ const seen=new Set(); const a=rows[s].filter(l=>{ const t=l.slice(0,l.indexOf(',')); if(seen.has(t)) return false; seen.add(t); return true; }).sort((x,y)=>+x.split(',')[0]-+y.split(',')[0]); rows[s]=a; if(a.length) fs.writeFileSync(path.join(OUT,s+'.csv'),a.join('\n')); } }
  flush(); console.log('bitti · arşivde olmayan gün',miss,'· hata',fail,((Date.now()-t0)/1000).toFixed(0)+' sn');
})().catch(e=>{ console.error(e); process.exit(1); });
