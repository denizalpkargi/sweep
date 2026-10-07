// Binance vadeli (USDⓈ-M) geçmiş arşivini indirir: data.binance.vision aylık zip'leri, listeden çıkarılmış coinler dahil.
// Binance REST'e (fapi) hiç istek atmaz; arşiv S3 üzerinden okunur (bulut konteynerinden de erişilebilir).
// Adımlar:
//   1) arşivdeki tüm USDT sembolleri (S3 listesi)
//   2) hepsi için 1g mumlar → tests/data/arch/1d/<SYM>.csv
//   3) her ay, önceki 30 günün dolar hacmine göre ilk N coin (o ayın evreni; hayatta kalma yanlılığı yok) → tests/data/arch/universe.json
//   4) evrene en az bir kez girmiş coinler için 1 sa (ilk --top) ve 15 dk (ilk --top15) mumlar + fonlama → tests/data/arch/<iv>/<SYM>.csv, arch/funding/<SYM>.csv
// CSV satırı Binance kline dizisiyle aynı: openTime,o,h,l,c,v,closeTime,q,n,tbv,tbq,ignore (başlıksız). Fonlama: time,rate.
// Ham zip'ler tests/data/arch/zip/ altında önbellekte; kesilirse yeniden çalıştır, indirilenler atlanır.
// Kullanım: node tests/fetch-archive.js [--from 2020-01] [--top 100] [--top15 30] [--iv 1h,15m] [--conc 12] [--no-funding] [--only 1d]
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const S3='https://s3-ap-northeast-1.amazonaws.com/data.binance.vision', VISION='https://data.binance.vision';
const OUT=path.join(__dirname,'data','arch'), ZIP=path.join(OUT,'zip');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:true); };
const FROM=String(arg('from','2020-01')), TOP=+arg('top',100), TOP15=+arg('top15',30), IVS=String(arg('iv','1h,15m')).split(','), CONC=+arg('conc',12), FUND=!arg('no-funding',false), ONLY=arg('only',null);
const DAY=864e5, T0=Date.UTC(+FROM.slice(0,4),+FROM.slice(5,7)-1,1);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const STABLE=/^(USDC|FDUSD|BUSD|TUSD|USDP|DAI|EUR|AEUR|USDE|BFUSD|XUSD|RLUSD|USD1)USDT$/;

function unzip(buf){
  let e=buf.length-22; while(e>=0&&buf.readUInt32LE(e)!==0x06054b50) e--; if(e<0) throw new Error('zip EOCD yok');
  const cd=buf.readUInt32LE(e+16); if(buf.readUInt32LE(cd)!==0x02014b50) throw new Error('zip CD yok');
  const method=buf.readUInt16LE(cd+10), csize=buf.readUInt32LE(cd+20), lho=buf.readUInt32LE(cd+42);
  const start=lho+30+buf.readUInt16LE(lho+26)+buf.readUInt16LE(lho+28); const raw=buf.subarray(start,start+csize);
  return (method===0?raw:zlib.inflateRawSync(raw)).toString('utf8');
}
let HOST=null; // önce S3, olmazsa data.binance.vision
async function get(url){ for(let a=0;a<5;a++){ try{ const r=await fetch(url); return r; }catch(e){ if(a===4) throw e; await sleep(1000*2**a); } } }
async function host(){ if(HOST) return HOST; for(const h of [S3,VISION]){ try{ const r=await get(h+'/data/futures/um/monthly/klines/BTCUSDT/1d/BTCUSDT-1d-2024-01.zip'); if(r.ok){ HOST=h; return h; } }catch(e){} } throw new Error('arşive erişilemiyor (S3 ve data.binance.vision)'); }
const FAILED=[];
// zip'i indir (404 → boş işaret dosyası), CSV metnini döndür
async function csv(rel){
  const f=path.join(ZIP,rel); const miss=f+'.404';
  if(fs.existsSync(miss)) return '';
  if(!fs.existsSync(f)){
    const h=await host(); let r;
    for(let a=0;a<5;a++){ try{ r=await get(h+'/data/futures/um/'+rel); if(r.status===404||r.ok) break; throw new Error('HTTP '+r.status); }catch(e){ if(a===4){ FAILED.push(rel+' '+e.message); return ''; } await sleep(1000*2**a); } }
    fs.mkdirSync(path.dirname(f),{recursive:true});
    if(r.status===404){ fs.writeFileSync(miss,''); return ''; }
    fs.writeFileSync(f,Buffer.from(await r.arrayBuffer()));
  }
  try{ return unzip(fs.readFileSync(f)); }catch(e){ fs.unlinkSync(f); FAILED.push(rel+' bozuk zip'); return ''; }
}
const rows=t=>t.split(/\r?\n/).filter(l=>/^[0-9]/.test(l));
async function pool(jobs,n,label){ let i=0,done=0; const t=Date.now();
  await Promise.all(Array.from({length:n},async()=>{ while(i<jobs.length){ const k=i++; await jobs[k](); done++; if(label&&(done%1000===0||done===jobs.length)) console.log(`  ${label}: ${done}/${jobs.length} (${((Date.now()-t)/1000).toFixed(0)} sn)`); } })); }

async function listSymbols(){
  const h=await host(); if(h!==S3){ // data.binance.vision listeyi HTML'siz vermez; S3'e erişilemiyorsa önbellekteki listeyi kullan
    const f=path.join(OUT,'symbols.json'); if(fs.existsSync(f)) return JSON.parse(fs.readFileSync(f,'utf8')); throw new Error('sembol listesi için S3 gerekli'); }
  let out=[], m='';
  for(;;){ const r=await get(`${S3}?delimiter=/&prefix=data/futures/um/monthly/klines/${m?'&marker='+m:''}`); const x=await r.text();
    for(const g of x.matchAll(/<Prefix>data\/futures\/um\/monthly\/klines\/([^/<]+)\/<\/Prefix>/g)) out.push(g[1]);
    const n=x.match(/<NextMarker>([^<]+)<\/NextMarker>/); if(!n) break; m=n[1]; }
  out=out.filter(s=>/USDT$/.test(s)&&!STABLE.test(s)); fs.mkdirSync(OUT,{recursive:true}); fs.writeFileSync(path.join(OUT,'symbols.json'),JSON.stringify(out)); return out;
}
function months(){ const o=[]; const d=new Date(T0); const now=new Date(); while(d<now){ o.push(d.toISOString().slice(0,7)); d.setUTCMonth(d.getUTCMonth()+1); } return o; }
// içinde bulunulan ay aylık arşivde yok: günlük zip'lerle (dün dahil) tamamlanır
function curDays(){ const now=new Date(), o=[]; const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)); while(d.getTime()<Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())){ o.push(d.toISOString().slice(0,10)); d.setUTCDate(d.getUTCDate()+1); } return o; }
const curMonth=()=>new Date().toISOString().slice(0,7);

// bir sembolün bir zaman dilimindeki tüm mumları → sıralı, tekrarsız CSV
async function klines(s,iv,firstMonth){
  const M=months().filter(m=>m!==curMonth()&&(!firstMonth||m>=firstMonth)); const parts=new Array(M.length+1);
  await pool(M.map((m,i)=>async()=>{ parts[i]=rows(await csv(`monthly/klines/${s}/${iv}/${s}-${iv}-${m}.zip`)); }),4,'');
  const D=curDays(); const cur=[]; for(const d of D) cur.push(...rows(await csv(`daily/klines/${s}/${iv}/${s}-${iv}-${d}.zip`))); parts[M.length]=cur;
  const seen=new Set(), out=[]; for(const p of parts) for(const l of p||[]){ const t=l.slice(0,l.indexOf(',')); if(!seen.has(t)){ seen.add(t); out.push(l); } }
  out.sort((a,b)=>+a.slice(0,a.indexOf(','))-+b.slice(0,b.indexOf(','))); return out;
}

(async()=>{
  console.log('arşiv:',await host());
  const syms=await listSymbols(); console.log('USDT sembolü:',syms.length);
  // 2) 1g mumlar, hepsi
  fs.mkdirSync(path.join(OUT,'1d'),{recursive:true});
  const d1=syms.filter(s=>!fs.existsSync(path.join(OUT,'1d',s+'.csv'))||ONLY==='1d');
  console.log('1g indirilecek:',d1.length);
  await pool(d1.map(s=>async()=>{ const k=await klines(s,'1d'); fs.writeFileSync(path.join(OUT,'1d',s+'.csv'),k.join('\n')); }),Math.max(1,CONC>>2),'1g');
  // 3) aylık evren: ayın ilk gününden önceki 30 günün dolar hacmi, en az 20 gün verisi
  // TradFi vadelileri (hisse, emtia, endeks) evrene girmez: dayanakları hafta sonu kapalı olduğu için hafta sonu gün içi aralığı
  // hafta içinin %62'sinden küçük (kriptoda 0,65–0,9; hisse/altın/petrolde 0,2–0,6). Eşik 7 Ekim 2026'da arşivdeki dağılıma bakılarak seçildi.
  const vol={}, tradfi=[]; for(const s of syms){ const f=path.join(OUT,'1d',s+'.csv'); if(!fs.existsSync(f)) continue;
    const r=fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)); if(!r.length) continue;
    const we=[],wd=[]; for(const x of r){ const g=Math.log(x[2]/x[3]); if(!(g>=0)) continue; const d=new Date(x[0]).getUTCDay(); (d===0||d===6?we:wd).push(g); }
    const m=a=>a.reduce((p,q)=>p+q,0)/Math.max(1,a.length); if(we.length>=8&&m(we)/m(wd)<0.62){ tradfi.push(s); continue; }
    vol[s]=r.map(x=>[x[0],x[7]]); }
  console.log('TradFi sayılıp dışarıda:',tradfi.length,tradfi.slice(0,12).join(' '),'…');
  const U={}; for(const m of months()){ const t=Date.UTC(+m.slice(0,4),+m.slice(5,7)-1,1); const sc=[];
    for(const s in vol){ const w=vol[s].filter(([ts])=>ts>=t-30*DAY&&ts<t); if(w.length>=20) sc.push([s,w.reduce((a,[,q])=>a+q,0)]); }
    U[m]=sc.sort((a,b)=>b[1]-a[1]).slice(0,TOP).map(x=>x[0]); }
  fs.writeFileSync(path.join(OUT,'universe.json'),JSON.stringify({top:TOP,from:FROM,tradfi,months:U}));
  const pickN=n=>Array.from(new Set([].concat(...Object.values(U).map(a=>a.slice(0,n))))).sort(); const pick=pickN(TOP); console.log(`evren: ayda ilk ${TOP}, toplam ${pick.length} farklı coin; 15 dk için ilk ${TOP15}: ${pickN(TOP15).length}`);
  if(ONLY==='1d') return done();
  // 4) 1 sa / 15 dk + fonlama, yalnız evrene girmiş coinler, ilk girdiği aydan 3 ay önceden (göstergeler ısınsın)
  const firstIn={}; for(const m of Object.keys(U).sort()) for(const s of U[m]) if(!firstIn[s]){ const d=new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7)-1-3,1)); firstIn[s]=d.toISOString().slice(0,7); }
  for(const iv of IVS){ fs.mkdirSync(path.join(OUT,iv),{recursive:true});
    const todo=(iv==='15m'||iv==='5m'||iv==='1m'?pickN(TOP15):pick).filter(s=>!fs.existsSync(path.join(OUT,iv,s+'.csv')));
    let n=0; await pool(todo.map(s=>async()=>{ const f=path.join(OUT,iv,s+'.csv'); const k=await klines(s,iv,firstIn[s]<FROM?FROM:firstIn[s]); fs.writeFileSync(f,k.join('\n')); if(++n%25===0) console.log(`  ${iv}: ${n}/${todo.length} coin`); }),Math.max(1,CONC>>2),iv); }
  if(FUND){ fs.mkdirSync(path.join(OUT,'funding'),{recursive:true});
    await pool(pick.map(s=>async()=>{ const M=months().filter(m=>m!==curMonth()&&m>=(firstIn[s]<FROM?FROM:firstIn[s])); const o=[];
      for(const m of M) for(const l of rows(await csv(`monthly/fundingRate/${s}/${s}-fundingRate-${m}.zip`))){ const r=l.split(','); o.push(r[0]+','+r[r.length-1]); }
      fs.writeFileSync(path.join(OUT,'funding',s+'.csv'),o.join('\n')); }),Math.max(1,CONC>>2),'fonlama'); }
  done();
  function done(){ if(FAILED.length){ console.log('indirilemeyen',FAILED.length,'dosya (yeniden çalıştırınca denenir):'); console.log(FAILED.slice(0,20).join('\n')); } console.log('bitti'); }
})().catch(e=>{ console.error(e); process.exit(1); });
