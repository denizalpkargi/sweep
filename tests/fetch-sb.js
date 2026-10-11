// ICT Silver Bullet testi için 1 dk mumlar (11 Ekim 2026). Kaynak: data.binance.vision USDⓈ-M aylık 1m kline zip'leri (+ içinde bulunulan ay günlük).
// Çıktı: tests/data/sb1m/<SYM>.csv.gz  satır: t(dk, epoch/60000),o,h,l,c,v,q   (q = USDT hacmi, VWAP için)
// Kullanım: node tests/fetch-sb.js [--syms BTCUSDT,ETHUSDT,...] [--from 2020-01] [--conc 6]
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const S3='https://s3-ap-northeast-1.amazonaws.com/data.binance.vision', VISION='https://data.binance.vision';
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const SYMS=String(arg('syms','BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT,DOGEUSDT,ADAUSDT,AVAXUSDT,LINKUSDT,LTCUSDT')).split(',');
const FROM=String(arg('from','2020-01')), CONC=+arg('conc',6);
const OUT=path.join(__dirname,'data','sb1m'); fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function unzip(buf){
  let e=buf.length-22; while(e>=0&&buf.readUInt32LE(e)!==0x06054b50) e--; if(e<0) throw new Error('zip EOCD yok');
  const cd=buf.readUInt32LE(e+16); const method=buf.readUInt16LE(cd+10), csize=buf.readUInt32LE(cd+20), lho=buf.readUInt32LE(cd+42);
  const start=lho+30+buf.readUInt16LE(lho+26)+buf.readUInt16LE(lho+28); const raw=buf.subarray(start,start+csize);
  return (method===0?raw:zlib.inflateRawSync(raw)).toString('utf8');
}
async function get(url){ for(let a=0;a<5;a++){ try{ const r=await fetch(url); if(r.status===404||r.ok) return r; throw new Error('HTTP '+r.status); }catch(e){ if(a===4) throw e; await sleep(1000*2**a); } } }
let HOST=null;
async function host(){ if(HOST) return HOST; for(const h of [S3,VISION]){ try{ const r=await get(h+'/data/futures/um/monthly/klines/BTCUSDT/1d/BTCUSDT-1d-2024-01.zip'); if(r.ok){ HOST=h; return h; } }catch(e){} } throw new Error('arşive erişilemiyor'); }
async function rows(rel){ const h=await host(); const r=await get(h+'/data/futures/um/'+rel); if(r.status===404) return []; const t=unzip(Buffer.from(await r.arrayBuffer()));
  const o=[]; for(const l of t.split(/\r?\n/)){ if(!/^[0-9]/.test(l)) continue; const c=l.split(','); let ts=+c[0]; if(ts>1e14) ts=Math.floor(ts/1000); o.push([Math.floor(ts/60000),c[1],c[2],c[3],c[4],c[5],c[7]].join(',')); } return o; }
const months=[]; { const now=new Date(); let [y,m]=FROM.split('-').map(Number); while(y<now.getUTCFullYear()||(y===now.getUTCFullYear()&&m<now.getUTCMonth()+1)){ months.push(`${y}-${String(m).padStart(2,'0')}`); m++; if(m>12){m=1;y++;} } }
const today=new Date(); const days=[]; for(let d=1; d<today.getUTCDate(); d++) days.push(`${today.getUTCFullYear()}-${String(today.getUTCMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
async function pool(items,fn){ const res=new Array(items.length); let i=0; await Promise.all(Array.from({length:CONC},async()=>{ while(i<items.length){ const k=i++; res[k]=await fn(items[k]); } })); return res; }
(async()=>{ for(const s of SYMS){ const f=path.join(OUT,s+'.csv.gz'); if(fs.existsSync(f)){ console.log(s,'var, atlandı'); continue; }
  const t0=Date.now(); const parts=await pool([...months.map(m=>`monthly/klines/${s}/1m/${s}-1m-${m}.zip`),...days.map(d=>`daily/klines/${s}/1m/${s}-1m-${d}.zip`)],rows);
  const all=[].concat(...parts); fs.writeFileSync(f,zlib.gzipSync(all.join('\n')+'\n',{level:6}));
  console.log(s,all.length,'satır',((Date.now()-t0)/1000).toFixed(0)+' sn', (fs.statSync(f).size/1e6).toFixed(1)+' MB'); }
  console.log('bitti'); })().catch(e=>{ console.error(e); process.exit(1); });
