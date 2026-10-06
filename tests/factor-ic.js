// Faktör IC testi (uzun dönem). Binance arşivinden (data.binance.vision) günlük veri indirir, her faktör için
// günlük kesitsel Spearman IC'yi (faktör t günü kapanışında → t..t+h getirisi) hesaplar.
// Kaynaklar: aylık 1g kline (fiyat, hacim, taker alış payı), aylık fonlama, aylık 1g premium endeksi (baz),
// günlük metrics (5 dk: OI, büyük trader L/S hesap/pozisyon, genel L/S; Binance'te 2021-12'den beri).
// Önbellek: tests/data/fic/ (repoya girmez). Kesilirse yeniden çalıştır, indirilenler atlanır.
// Kullanım: node tests/factor-ic.js [--from 2020-01] [--coins BTCUSDT,ETHUSDT,...] [--no-metrics] [--conc 16]
//          node tests/factor-ic.js --selftest   (ağsız; yapay veriyle IC/t hesabını doğrular)
const fs=require('fs'); const path=require('path'); const zlib=require('zlib');
const ARCH='https://data.binance.vision/data/futures/um'; const CACHE=path.join(__dirname,'data','fic');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:true); };
// 2021 başında vadelide işlem gören, bugün hâlâ listeli olması beklenen büyük coinler (hayatta kalma yanlılığı var, raporda not edilir)
const COINS_DEF='BTCUSDT,ETHUSDT,BNBUSDT,XRPUSDT,ADAUSDT,SOLUSDT,DOGEUSDT,DOTUSDT,LTCUSDT,LINKUSDT,BCHUSDT,TRXUSDT,AVAXUSDT,ATOMUSDT,ETCUSDT,XLMUSDT,FILUSDT,UNIUSDT,AAVEUSDT,NEARUSDT,ALGOUSDT,VETUSDT,SUSHIUSDT,CRVUSDT,SNXUSDT,COMPUSDT,ZECUSDT,DASHUSDT';
const COINS=String(arg('coins',COINS_DEF)).split(',');
const FROM=String(arg('from','2020-01')); const CONC=+arg('conc',16); const METRICS=!arg('no-metrics',false);
const DAY=864e5; const T0=Date.UTC(+FROM.slice(0,4),+FROM.slice(5,7)-1,1);
const now=new Date(); const TEND=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())-DAY; // dün (tam gün)
const ND=Math.round((TEND-T0)/DAY)+1; const dayOf=ms=>Math.floor((ms-T0)/DAY); const dstr=d=>new Date(T0+d*DAY).toISOString().slice(0,10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// --- zip (tek dosya) okuyucu: merkez dizinden boyutları alır, deflate'i açar ---
function unzip(buf){
  let e=buf.length-22; while(e>=0&&buf.readUInt32LE(e)!==0x06054b50) e--; if(e<0) throw new Error('zip EOCD yok');
  const cd=buf.readUInt32LE(e+16); if(buf.readUInt32LE(cd)!==0x02014b50) throw new Error('zip CD yok');
  const method=buf.readUInt16LE(cd+10), csize=buf.readUInt32LE(cd+20), lho=buf.readUInt32LE(cd+42);
  const start=lho+30+buf.readUInt16LE(lho+26)+buf.readUInt16LE(lho+28); const raw=buf.subarray(start,start+csize);
  return (method===0?raw:zlib.inflateRawSync(raw)).toString('utf8');
}
// --- indirme + önbellek (404 → boş dosya; yeniden denenmez) ---
async function getCsv(rel){
  const f=path.join(CACHE,rel.replace(/\.zip$/,'.csv'));
  if(fs.existsSync(f)) return fs.readFileSync(f,'utf8');
  for(let a=0;a<5;a++){
    try{
      const r=await fetch(ARCH+'/'+rel);
      if(r.status===404){ fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,''); return ''; }
      if(!r.ok) throw new Error('HTTP '+r.status);
      const txt=unzip(Buffer.from(await r.arrayBuffer())); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,txt); return txt;
    }catch(e){ if(a===4) throw new Error(rel+': '+e.message); await sleep(1000*2**a); }
  }
}
async function pool(jobs,n,label){
  let i=0, done=0; const t=Date.now();
  await Promise.all(Array.from({length:n},async()=>{ while(i<jobs.length){ const k=i++; await jobs[k](); done++;
    if(done%500===0||done===jobs.length) console.log(`  ${label}: ${done}/${jobs.length} (${((Date.now()-t)/1000).toFixed(0)} sn)`); } }));
}
const rows=txt=>txt.split(/\r?\n/).filter(l=>l&&/^[0-9-]/.test(l)).map(l=>l.split(',')); // başlık satırı atlanır
const months=()=>{ const out=[]; const d=new Date(T0); while(d.getTime()<=TEND){ out.push(d.toISOString().slice(0,7)); d.setUTCMonth(d.getUTCMonth()+1); } return out; };
const nanArr=()=>new Float64Array(ND).fill(NaN);

async function load(){
  const M=months(); const D={}; for(const s of COINS) D[s]={close:nanArr(),qvol:nanArr(),tbuy:nanArr(),vol:nanArr(),fund:nanArr(),prem:nanArr(),oi:nanArr(),topPos:nanArr(),topAcc:nanArr(),glob:nanArr(),takerLs:nanArr()};
  const jobs=[];
  for(const s of COINS) for(const m of M){
    jobs.push(async()=>{ for(const r of rows(await getCsv(`monthly/klines/${s}/1d/${s}-1d-${m}.zip`))){ const d=dayOf(+r[0]); if(d<0||d>=ND) continue; const x=D[s]; x.close[d]=+r[4]; x.vol[d]=+r[5]; x.qvol[d]=+r[7]; x.tbuy[d]=+r[5]>0?+r[9]/+r[5]:NaN; } });
    jobs.push(async()=>{ for(const r of rows(await getCsv(`monthly/fundingRate/${s}/${s}-fundingRate-${m}.zip`))){ const d=dayOf(+r[0]-1); if(d<0||d>=ND) continue; const x=D[s].fund; x[d]=(isNaN(x[d])?0:x[d])+(+r[r.length-1]); } });
    jobs.push(async()=>{ for(const r of rows(await getCsv(`monthly/premiumIndexKlines/${s}/1d/${s}-1d-${m}.zip`))){ const d=dayOf(+r[0]); if(d<0||d>=ND) continue; D[s].prem[d]=+r[4]; } });
  }
  console.log(`aylık dosyalar: ${jobs.length} (${COINS.length} coin × ${M.length} ay × 3)`); await pool(jobs,CONC,'aylık');
  if(METRICS){
    const MSTART=Math.max(0,dayOf(Date.UTC(2021,11,1))); const mj=[];
    for(const s of COINS){ const first=D[s].close.findIndex(v=>!isNaN(v)); for(let d=Math.max(MSTART,first<0?ND:first);d<ND;d++) mj.push(async()=>{
      const rs=rows(await getCsv(`daily/metrics/${s}/${s}-metrics-${dstr(d)}.zip`)); if(!rs.length) return;
      // gün kapanışına en yakın (son) satır: create_time,symbol,sum_oi,sum_oi_value,count_top_ls,sum_top_ls,count_ls,sum_taker_ls
      const r=rs[rs.length-1]; const x=D[s]; const v=i=>r[i]===''?NaN:+r[i];
      x.oi[d]=v(2); x.topAcc[d]=v(4); x.topPos[d]=v(5); x.glob[d]=v(6); x.takerLs[d]=v(7);
    }); }
    console.log(`günlük metrics dosyaları: ${mj.length} (ilk çalıştırmada uzun sürer, önbelleğe alınır)`); await pool(mj,CONC,'metrics');
  }
  return D;
}

// --- faktörler (t günü kapanışında bilinen veriyle) ---
const lag=(a,d,k)=>d-k>=0?a[d-k]:NaN;
function mean(a,d,n){ let s=0,c=0; for(let i=d-n+1;i<=d;i++){ if(i<0||isNaN(a[i])) continue; s+=a[i]; c++; } return c>=Math.ceil(n*0.7)?s/c:NaN; }
function zs(a,d,n,f=x=>x){ let s=0,q=0,c=0; for(let i=d-n+1;i<=d;i++){ if(i<0||isNaN(a[i])) continue; const v=f(a[i]); s+=v; q+=v*v; c++; } if(c<Math.ceil(n*0.7)||isNaN(a[d])) return NaN; const m=s/c, sd=Math.sqrt(Math.max(q/c-m*m,0)); return sd>0?(f(a[d])-m)/sd:NaN; }
function rv(c,d,n){ const r=[]; for(let i=d-n+1;i<=d;i++){ const a=lag(c,i,1), b=c[i]; if(a>0&&b>0) r.push(Math.log(b/a)); } if(r.length<n*0.7) return NaN; const m=r.reduce((x,y)=>x+y,0)/r.length; return Math.sqrt(r.reduce((x,y)=>x+(y-m)**2,0)/r.length); }
const ret=(c,d,k)=>c[d]>0&&lag(c,d,k)>0?c[d]/lag(c,d,k)-1:NaN;
const FACTORS={
  mom_1:      x=>d=>ret(x.close,d,1),
  mom_7:      x=>d=>ret(x.close,d,7),
  mom_30:     x=>d=>ret(x.close,d,30),
  mom_90:     x=>d=>ret(x.close,d,90),
  vol_30:     x=>d=>rv(x.close,d,30),
  qvol_z30:   x=>d=>zs(x.qvol,d,30,Math.log),
  taker_7:    x=>d=>mean(x.tbuy,d,7),
  taker_z30:  x=>d=>zs(x.tbuy,d,30),
  fund_1:     x=>d=>x.fund[d],
  fund_7:     x=>d=>mean(x.fund,d,7),
  fund_z30:   x=>d=>zs(x.fund,d,30),
  basis_1:    x=>d=>x.prem[d],
  basis_7:    x=>d=>mean(x.prem,d,7),
  oi_chg_1:   x=>d=>ret(x.oi,d,1),
  oi_chg_7:   x=>d=>ret(x.oi,d,7),
  oi_px_div7: x=>d=>ret(x.oi,d,7)-ret(x.close,d,7),           // OI artıyor fiyat artmıyor
  whale_ls_z: x=>d=>zs(x.topPos,d,30,Math.log),                 // büyük trader pozisyon L/S z-skoru (Eylül testindeki faktörün yeniden kurulumu)
  whale_acc_z:x=>d=>zs(x.topAcc,d,30,Math.log),
  retail_ls_z:x=>d=>zs(x.glob,d,30,Math.log),
  whale_minus_retail: x=>d=>Math.log(x.topPos[d])-Math.log(x.glob[d]),
  taker_ls_5m:x=>d=>x.takerLs[d],
};

// --- istatistik ---
function rank(a){ const ix=a.map((v,i)=>i).sort((i,j)=>a[i]-a[j]); const r=new Array(a.length); for(let k=0;k<ix.length;){ let e=k; while(e+1<ix.length&&a[ix[e+1]]===a[ix[k]]) e++; for(let q=k;q<=e;q++) r[ix[q]]=(k+e)/2; k=e+1; } return r; }
function spearman(x,y){ const rx=rank(x), ry=rank(y), n=x.length; const mx=rx.reduce((a,b)=>a+b,0)/n, my=ry.reduce((a,b)=>a+b,0)/n; let s=0,a=0,b=0; for(let i=0;i<n;i++){ s+=(rx[i]-mx)*(ry[i]-my); a+=(rx[i]-mx)**2; b+=(ry[i]-my)**2; } return a>0&&b>0?s/Math.sqrt(a*b):NaN; }
// h günlük ileri getiri örtüşür → t için yalnız her h'inci gün kullanılır (bağımsız örnek)
function tstat(ics,h,minN=20){ const v=ics.filter((_,i)=>i%h===0).map(o=>o.ic); const n=v.length; if(n<minN) return {ic:NaN,t:NaN,n}; const m=v.reduce((a,b)=>a+b,0)/n; const sd=Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/(n-1)); return {ic:m,t:m/(sd/Math.sqrt(n)),n}; }
function icSeries(D,fname,h,minN=10){
  const fs_=COINS.map(s=>FACTORS[fname](D[s])); const out=[];
  for(let d=0;d+h<ND;d++){ const xs=[], ys=[];
    for(let k=0;k<COINS.length;k++){ const c=D[COINS[k]].close; const f=fs_[k](d); const r=c[d]>0&&c[d+h]>0?c[d+h]/c[d]-1:NaN; if(isFinite(f)&&isFinite(r)){ xs.push(f); ys.push(r); } }
    if(xs.length>=minN){ const ic=spearman(xs,ys); if(isFinite(ic)) out.push({d,ic,n:xs.length}); } }
  return out;
}
function evaluate(D,horizons){
  const res=[];
  for(const f of Object.keys(FACTORS)) for(const h of horizons){
    const s=icSeries(D,f,h); if(s.length<60){ res.push({f,h,days:s.length}); continue; }
    const all=tstat(s,h), half=Math.floor(s.length/2), A=tstat(s.slice(0,half),h), B=tstat(s.slice(half),h), last=tstat(s.slice(-120),h,10);
    const yrs={}; for(const o of s){ const y=dstr(o.d).slice(0,4); (yrs[y]=yrs[y]||[]).push(o); } const byYear={}; for(const y in yrs) byYear[y]=tstat(yrs[y],h).ic;
    const hit=s.filter(o=>o.ic>0).length/s.length;
    const strong=Math.abs(all.t)>=3, survive=Math.abs(all.t)>=2&&Math.abs(all.ic)>=0.02&&Math.sign(A.ic)===Math.sign(all.ic)&&Math.sign(B.ic)===Math.sign(all.ic)&&Math.abs(A.t)>=1&&Math.abs(B.t)>=1;
    res.push({f,h,days:s.length,from:dstr(s[0].d),to:dstr(s[s.length-1].d),coins:Math.round(s.reduce((a,o)=>a+o.n,0)/s.length),ic:all.ic,t:all.t,n:all.n,icA:A.ic,tA:A.t,icB:B.ic,tB:B.t,ic120:last.ic,t120:last.t,hit,byYear,survive,strong});
  }
  return res;
}
const fx=(v,k=3)=>isFinite(v)?(v>=0?' ':'')+v.toFixed(k):'   —  ';
function report(res){
  const L=[]; L.push('faktör               h   gün   coin  IC     t      | 1.yarı IC  t    | 2.yarı IC  t    | son120 IC  t    | IC>0  | sonuç');
  for(const r of res){ if(r.ic===undefined){ L.push(`${r.f.padEnd(20)} ${String(r.h).padStart(2)}  ${String(r.days).padStart(4)}  veri yetersiz`); continue; }
    L.push(`${r.f.padEnd(20)} ${String(r.h).padStart(2)}  ${String(r.days).padStart(4)}  ${String(r.coins).padStart(3)}  ${fx(r.ic)} ${fx(r.t,2).padStart(6)} | ${fx(r.icA)} ${fx(r.tA,2).padStart(6)} | ${fx(r.icB)} ${fx(r.tB,2).padStart(6)} | ${fx(r.ic120)} ${fx(r.t120,2).padStart(6)} | ${(r.hit*100).toFixed(0).padStart(3)}%  | ${r.survive?(r.strong?'GEÇTİ':'zayıf'):''}`); }
  return L.join('\n');
}

function selftest(){
  // yapay: 30 coin, faktör = gelecek getirinin gürültülü hali (IC ≈ +0,1 beklenir) ve saf gürültü (IC ≈ 0)
  let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; }; const g=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
  const N=600, K=30; let sig=[], noise=[];
  for(let d=0;d<N;d++){ const r=Array.from({length:K},g); const f=r.map(v=>0.1*v+g()); sig.push(spearman(f,r)); noise.push(spearman(Array.from({length:K},g),r)); }
  const T=a=>tstat(a.map(ic=>({ic})),1);
  const a=T(sig), b=T(noise); console.log('sinyal IC',a.ic.toFixed(3),'t',a.t.toFixed(1),'| gürültü IC',b.ic.toFixed(3),'t',b.t.toFixed(1));
  if(!(a.ic>0.05&&a.t>5&&Math.abs(b.t)<3)) { console.error('SELFTEST BAŞARISIZ'); process.exit(1); }
  console.log('spearman bağ', spearman([1,2,2,3],[1,2,3,4]).toFixed(3), '(0,949 beklenir)'); console.log('selftest tamam');
}

(async()=>{
  if(arg('selftest',false)) return selftest();
  console.log(`dönem ${dstr(0)} → ${dstr(ND-1)} (${ND} gün), ${COINS.length} coin, metrics ${METRICS?'açık':'kapalı'}`);
  const D=await load();
  for(const s of COINS){ const c=D[s].close, o=D[s].oi; const n=c.filter(v=>!isNaN(v)).length, m=o.filter(v=>!isNaN(v)).length; const f=c.findIndex(v=>!isNaN(v)); console.log(`  ${s.padEnd(10)} fiyat ${n} gün (ilk ${f<0?'—':dstr(f)}), metrics ${m} gün`); }
  const res=evaluate(D,[1,3,7]); const txt=report(res);
  console.log('\nKesitsel Spearman IC (faktör t kapanışı → t..t+h getiri). t: örtüşmeyen günlerle. zayıf: |t|≥2, |IC|≥0,02, iki yarıda aynı işaret ve |t|≥1; GEÇTİ: ayrıca |t|≥3 (63 test yapıldığı için 2 tek başına yetmez, saf gürültüde ~3 faktör |t|≥2 çıkar).\n'); console.log(txt);
  const out=path.join(__dirname,'data','factor-ic-result.json'); fs.writeFileSync(out,JSON.stringify({at:new Date().toISOString(),coins:COINS,from:dstr(0),to:dstr(ND-1),res},null,1));
  fs.writeFileSync(path.join(__dirname,'data','factor-ic-result.txt'),txt); console.log('\nkaydedildi:',out);
})().catch(e=>{ console.error(e); process.exit(1); });
