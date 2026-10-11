// Sosyal medya stratejileri testi için veri (11 Ekim 2026): S3 arşivi buluttan 403 verdiğinde www.binance.com/fapi üzerinden
// sabit evren (uzun ömürlü 20 likit perp) için 1g / 4s / 1s / 15dk mumlar + fonlama → tests/data/sm/<iv>/<SYM>.csv (t,o,h,l,c,v,q,n,tb,tq)
// Kullanım: node tests/sm-fetch.js [--iv 1d,4h,1h,15m] [--from 2020-01-01] [--syms BTCUSDT,...]
const fs=require('fs'),path=require('path');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
const BASE=process.env.FAPI||'https://www.binance.com/fapi/v1';
const SYMS=String(arg('syms','BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,ADAUSDT,DOGEUSDT,LINKUSDT,LTCUSDT,DOTUSDT,AVAXUSDT,BCHUSDT,ETCUSDT,TRXUSDT,XLMUSDT,ATOMUSDT,FILUSDT,UNIUSDT,NEARUSDT,AAVEUSDT')).split(',');
const IVS=String(arg('iv','1d,4h,1h,15m')).split(','); const FROM=Date.parse(arg('from','2020-01-01')+'T00:00:00Z');
const MS={'5m':3e5,'15m':9e5,'1h':36e5,'4h':144e5,'1d':864e5};
const OUT=path.join(__dirname,'data','sm'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let used=0;
async function get(url){ for(let a=0;a<8;a++){ try{ const r=await fetch(url); used=+r.headers.get('x-mbx-used-weight-1m')||used;
  if(r.status===429||r.status===418){ const ra=+r.headers.get('retry-after')||60; console.log('limit',r.status,ra); if(r.status===418) throw new Error('418 yasak'); await sleep(ra*1000); continue; }
  if(!r.ok) throw new Error('HTTP '+r.status+' '+(await r.text()).slice(0,200)); if(used>1500) await sleep(20000); return await r.json(); }catch(e){ if(String(e.message).includes('418')) throw e; if(a===7) throw e; await sleep(1000*2**a); } } }
async function klines(s,iv){ const f=path.join(OUT,iv,s+'.csv'); fs.mkdirSync(path.dirname(f),{recursive:true});
  let start=FROM, rows=[]; if(fs.existsSync(f)){ rows=fs.readFileSync(f,'utf8').trim().split('\n'); if(rows.length) start=+rows[rows.length-1].split(',')[0]+MS[iv]; }
  const now=Date.now(); let n=0;
  while(start<now-MS[iv]){ const x=await get(`${BASE}/klines?symbol=${s}&interval=${iv}&startTime=${start}&limit=1000`); n++;
    if(!x.length){ start+=1000*MS[iv]; if(start>now) break; continue; }
    for(const k of x){ if(k[6]>now) break; rows.push([k[0],k[1],k[2],k[3],k[4],k[5],k[7],k[8],k[9],k[10]].join(',')); }
    start=x[x.length-1][0]+MS[iv]; await sleep(120); }
  fs.writeFileSync(f,rows.join('\n')+'\n'); return [rows.length,n]; }
async function funding(s){ const f=path.join(OUT,'funding',s+'.csv'); fs.mkdirSync(path.dirname(f),{recursive:true}); let start=FROM, rows=[];
  for(;;){ const x=await get(`${BASE}/fundingRate?symbol=${s}&startTime=${start}&limit=1000`); if(!x.length) break; for(const r of x) rows.push(r.fundingTime+','+r.fundingRate); start=x[x.length-1].fundingTime+1; if(x.length<1000) break; await sleep(300); }
  fs.writeFileSync(f,rows.join('\n')+'\n'); return rows.length; }
(async()=>{ for(const s of SYMS){ for(const iv of IVS){ const t=Date.now(); const [r,n]=await klines(s,iv); console.log(s,iv,r,'mum',n,'istek',((Date.now()-t)/1000).toFixed(0)+'sn','w',used); }
  if(!arg('no-funding')) console.log(s,'fonlama',await funding(s)); } })().catch(e=>{console.error(e);process.exit(1);});
