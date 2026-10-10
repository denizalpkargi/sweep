// Denklem 4 / test #29 (9 Ekim 2026): 1 dk mumlardan 15 dk mum başına açılış ve mikro yapı özellikleri.
// Kaynak: data.binance.vision aylık (ve içinde bulunulan ay için günlük) 1 dk kline zip'leri; evren = ayın ilk --top coini (universe.json).
// Zip'ler diske yazılmaz (bellekte açılır). Çıktı: tests/data/arch/open1m/<SYM>.csv, başlıksız:
//   t, i1, i3, iL, iL3, vs1, vs3, r1m, r3m, rv, jmp, jmpSh, ns1, sz1, nUp, nmin
//   t 15 dk açılış zamanı; i1/i3 ilk 1/3 dakikanın taker dengesizliği (2·tbq−q)/q; iL/iL3 son 1/3 dakika; vs1/vs3 ilk 1/3 dakikanın hacim payı;
//   r1m/r3m ilk 1/3 dakikanın log getirisi; rv 1 dk log getiri kareleri toplamı; jmp en büyük |1 dk getiri|; jmpSh jmp²/rv;
//   ns1 ilk dakikanın işlem sayısı payı; sz1 ilk dakikanın ortalama işlem büyüklüğü ÷ mumun ortalaması; nUp yükselen dakika payı; nmin dakika sayısı.
// Kullanım: node tests/fetch-open1m.js [--from 2023-06] [--top 30] [--conc 8]
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const S3='https://s3-ap-northeast-1.amazonaws.com/data.binance.vision', VISION='https://data.binance.vision';
const ARCH=path.join(__dirname,'data','arch'), OUT=path.join(ARCH,'open1m'), PARTS=path.join(OUT,'parts');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const FROM=String(arg('from','2023-06')), TOP=+arg('top',30), CONC=+arg('conc',8);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function unzip(buf){
  let e=buf.length-22; while(e>=0&&buf.readUInt32LE(e)!==0x06054b50) e--; if(e<0) throw new Error('zip EOCD yok');
  const cd=buf.readUInt32LE(e+16); if(buf.readUInt32LE(cd)!==0x02014b50) throw new Error('zip CD yok');
  const method=buf.readUInt16LE(cd+10), csize=buf.readUInt32LE(cd+20), lho=buf.readUInt32LE(cd+42);
  const start=lho+30+buf.readUInt16LE(lho+26)+buf.readUInt16LE(lho+28); const raw=buf.subarray(start,start+csize);
  return (method===0?raw:zlib.inflateRawSync(raw)).toString('utf8');
}
let HOST=null;
async function get(url){ for(let a=0;a<5;a++){ try{ const r=await fetch(url); if(r.status===404||r.ok) return r; throw new Error('HTTP '+r.status); }catch(e){ if(a===4) throw e; await sleep(1000*2**a); } } }
async function host(){ if(HOST) return HOST; for(const h of [S3,VISION]){ try{ const r=await get(h+'/data/futures/um/monthly/klines/BTCUSDT/1d/BTCUSDT-1d-2024-01.zip'); if(r.ok){ HOST=h; return h; } }catch(e){} } throw new Error('arşive erişilemiyor'); }
async function csvText(rel){ const h=await host(); const r=await get(h+'/data/futures/um/'+rel); if(r.status===404) return ''; return unzip(Buffer.from(await r.arrayBuffer())); }
const fixT=t=>t>1e14?Math.floor(t/1000):t;
function feats(text){
  // 1 dk satırları 15 dk kovalara ayır
  const out=[]; let cur=-1, rows=[];
  const flush=()=>{ if(rows.length) out.push(line(cur,rows)); rows=[]; };
  for(const l of text.split(/\r?\n/)){ if(!/^[0-9]/.test(l)) continue; const c=l.split(','); const t=fixT(+c[0]); const b=Math.floor(t/9e5)*9e5; if(b!==cur){ flush(); cur=b; } rows.push([t,+c[1],+c[2],+c[3],+c[4],+c[7],+c[8],+c[10]]); }
  flush(); return out;
}
const imb=(rs)=>{ let q=0,tb=0; for(const r of rs){ q+=r[5]; tb+=r[7]; } return q>0?(2*tb-q)/q:NaN; };
function line(b,rs){
  rs.sort((x,y)=>x[0]-y[0]); const n=rs.length; const q=rs.reduce((a,r)=>a+r[5],0), nt=rs.reduce((a,r)=>a+r[6],0);
  const first=rs[0][0]===b, last=rs[n-1][0]===b+14*6e4;
  const f1=first?[rs[0]]:[], f3=first?rs.filter(r=>r[0]<b+3*6e4):[], l1=last?[rs[n-1]]:[], l3=last?rs.filter(r=>r[0]>=b+12*6e4):[];
  const i1=f1.length?imb(f1):NaN, i3=f3.length?imb(f3):NaN, iL=l1.length?imb(l1):NaN, iL3=l3.length?imb(l3):NaN;
  const vs1=f1.length&&q>0?f1[0][5]/q:NaN, vs3=f3.length&&q>0?f3.reduce((a,r)=>a+r[5],0)/q:NaN;
  const r1m=f1.length&&rs[0][1]>0?Math.log(rs[0][4]/rs[0][1]):NaN, r3m=f3.length&&rs[0][1]>0?Math.log(f3[f3.length-1][4]/rs[0][1]):NaN;
  let rv=0, jmp=0, up=0; for(const r of rs){ if(r[1]>0&&r[4]>0){ const x=Math.log(r[4]/r[1]); rv+=x*x; if(Math.abs(x)>jmp) jmp=Math.abs(x); if(x>0) up++; } }
  const jmpSh=rv>0?jmp*jmp/rv:NaN, ns1=f1.length&&nt>0?f1[0][6]/nt:NaN, sz1=f1.length&&f1[0][6]>0&&nt>0&&q>0?(f1[0][5]/f1[0][6])/(q/nt):NaN, nUp=up/n;
  const f=x=>Number.isFinite(x)?x.toPrecision(6):'';
  return [b,f(i1),f(i3),f(iL),f(iL3),f(vs1),f(vs3),f(r1m),f(r3m),f(rv),f(jmp),f(jmpSh),f(ns1),f(sz1),f(nUp),n].join(',');
}
function months(){ const o=[]; const d=new Date(Date.UTC(+FROM.slice(0,4),+FROM.slice(5,7)-1,1)); const now=new Date(); while(d<now){ o.push(d.toISOString().slice(0,7)); d.setUTCMonth(d.getUTCMonth()+1); } return o; }
function curDays(){ const now=new Date(), o=[]; const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)); while(d.getTime()<Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())){ o.push(d.toISOString().slice(0,10)); d.setUTCDate(d.getUTCDate()+1); } return o; }
async function pool(jobs,n,label){ let i=0,done=0; const t=Date.now();
  await Promise.all(Array.from({length:n},async()=>{ while(i<jobs.length){ const k=i++; await jobs[k](); done++; if(done%50===0||done===jobs.length) console.log(`  ${label}: ${done}/${jobs.length} (${((Date.now()-t)/1000).toFixed(0)} sn)`); } })); }
(async()=>{
  fs.mkdirSync(PARTS,{recursive:true});
  const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const ms=months(); const cur=new Date().toISOString().slice(0,7); const FAILED=[];
  const jobs=[]; const symsAll=new Set();
  for(const m of ms){ const syms=(U[m]||[]).slice(0,TOP); for(const s of syms){ symsAll.add(s); const part=path.join(PARTS,`${s}-${m}.csv`); if(fs.existsSync(part)) continue;
    jobs.push(async()=>{ try{ let text='';
      if(m===cur){ for(const d of curDays()) text+=await csvText(`daily/klines/${s}/1m/${s}-1m-${d}.zip`); }
      else text=await csvText(`monthly/klines/${s}/1m/${s}-1m-${m}.zip`);
      fs.writeFileSync(part+'.tmp',feats(text).join('\n')+(text?'\n':'')); fs.renameSync(part+'.tmp',part);
    }catch(e){ FAILED.push(`${s} ${m} ${e.message}`); } }); } }
  console.log('ay',ms[0],'→',ms[ms.length-1],'coin',symsAll.size,'indirilecek',jobs.length);
  await pool(jobs,CONC,'1 dk');
  // parçaları birleştir
  for(const s of symsAll){ const parts=ms.map(m=>path.join(PARTS,`${s}-${m}.csv`)).filter(f=>fs.existsSync(f)); if(!parts.length) continue;
    const lines=[]; for(const f of parts) for(const l of fs.readFileSync(f,'utf8').split('\n')) if(l) lines.push(l);
    lines.sort((a,b)=>(+a.split(',')[0])-(+b.split(',')[0])); fs.writeFileSync(path.join(OUT,s+'.csv'),lines.join('\n')+'\n'); }
  if(FAILED.length){ console.log('HATA',FAILED.length); fs.writeFileSync(path.join(OUT,'failed.txt'),FAILED.join('\n')); }
  console.log('bitti');
})();
