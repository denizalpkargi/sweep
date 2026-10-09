// Dış veri indirici (9 Ekim 2026, kullanıcı "elimizde olmayan verileri bulmanın bir yolunu bulalım" dedi). Ücretsiz, anahtarsız kaynaklar;
// hepsi arşiv biçiminde CSV/JSONL yazar, var olan dosyaya ekler (yeniden koşmak ucuzdur). Bulut ortamının izinli alan adlarında ya da
// kullanıcının PC'sinde çalışır; çıktı klasörü proje dosyalarına kopyalanır (/mnt/project-files/veri-arsivi/dis-veri/).
// Kullanım: node tests/fetch-external.js [--out tests/data/ext] [--only fng,gdelt,llama,stooq,dvol,cot,chain,news] [--news-from 2024-06-01] [--gdelt-from 2020-01]
// Kaynaklar:
//   fng    api.alternative.me          korku-açgözlülük endeksi, günlük 2018-02'den                 → fng.csv (date,value,label)
//   gdelt  api.gdeltproject.org        haber hacmi ve tonu (DOC 2.0 timelinevol/timelinetone), ay ay → gdelt.csv (query,mode,date,value)
//   llama  stablecoins.llama.fi, api.llama.fi  stablecoin arzı (toplam, USDT, USDC), DeFi TVL, DEX hacmi → stablecoins.csv, defi.csv
//   stooq  stooq.com                   SPX, NDQ, VIX, altın, DXY, ABD 10 yıllık, USDTRY, petrol günlük → stooq-<sym>.csv
//   dvol   www.deribit.com             DVOL ima edilen oynaklık endeksi BTC/ETH saatlik 2021-03'ten   → dvol-<CUR>.csv (t,o,h,l,c)
//   cot    www.cftc.gov                CME Bitcoin / Micro Bitcoin / Ether vadeli pozisyonları (TFF) → cot.csv
//   chain  api.blockchain.info         BTC hash oranı, işlem sayısı, adres sayısı, ücretler, günlük   → onchain-btc.csv
//   news   min-api.cryptocompare.com   haber başlıkları (kaynak, kategori, oy), geriye doğru sayfalı → news.jsonl
// Her kaynak kendi try/catch'inde; sonunda özet tablo basılır (satır sayısı, ilk/son tarih, hata).
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const OUT=path.resolve(arg('out',path.join(__dirname,'data','ext'))); const ONLY=arg('only',null)?.split(','); const NEWS_FROM=Date.parse(arg('news-from','2024-06-01')+'T00:00:00Z'); const GDELT_FROM=arg('gdelt-from','2020-01');
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const UA={'User-Agent':'Mozilla/5.0 (sweep-research; +https://github.com/denizalpkargi/sweep)','Accept':'*/*'};
async function get(url,{json=true,retry=4,wait=800}={}){ let last; for(let a=0;a<=retry;a++){ try{ const r=await fetch(url,{headers:UA}); if(r.status===429){ await sleep(5000*(a+1)); continue; } if(r.status===403||r.status===404){ const e=new Error('HTTP '+r.status); e.final=true; throw e; } if(!r.ok) throw new Error('HTTP '+r.status); return json?await r.json():await r.text(); }catch(e){ last=e; if(e.final||/CONNECT tunnel|403/.test(e.cause?.message||'')) throw e; await sleep(wait*2**a); } } throw last; }
async function getBuf(url){ const r=await fetch(url,{headers:UA}); if(!r.ok) throw new Error('HTTP '+r.status); return Buffer.from(await r.arrayBuffer()); }
function unzipAll(buf){ const out={}; let e=buf.length-22; while(e>=0&&buf.readUInt32LE(e)!==0x06054b50) e--; if(e<0) throw new Error('zip'); let cd=buf.readUInt32LE(e+16); const n=buf.readUInt16LE(e+10);
  for(let k=0;k<n;k++){ const method=buf.readUInt16LE(cd+10), csize=buf.readUInt32LE(cd+20), nl=buf.readUInt16LE(cd+28), el=buf.readUInt16LE(cd+30), cl=buf.readUInt16LE(cd+32), lho=buf.readUInt32LE(cd+42); const name=buf.toString('utf8',cd+46,cd+46+nl);
    const start=lho+30+buf.readUInt16LE(lho+26)+buf.readUInt16LE(lho+28); const raw=buf.subarray(start,start+csize); out[name]=(method===0?raw:zlib.inflateRawSync(raw)).toString('utf8'); cd+=46+nl+el+cl; } return out; }
const day=ts=>new Date(ts).toISOString().slice(0,10); const S={};
function csvMerge(file,header,rows,key=0){ // var olan satırlarla anahtara göre birleştir, sıralı yaz
  const f=path.join(OUT,file); const M=new Map(); if(fs.existsSync(f)) for(const l of fs.readFileSync(f,'utf8').split('\n').slice(1)) if(l) M.set(l.split(',')[key],l);
  for(const r of rows) M.set(String(r[key]),r.join(',')); const all=[...M.values()].sort((a,b)=>a.split(',')[key]<b.split(',')[key]?-1:1); fs.writeFileSync(f,header+'\n'+all.join('\n')+'\n');
  return {n:all.length,first:all[0]?.split(',')[key],last:all[all.length-1]?.split(',')[key]}; }
const run=async(name,fn)=>{ if(ONLY&&!ONLY.includes(name)) return; const t0=Date.now(); try{ S[name]=await fn(); S[name].sn=((Date.now()-t0)/1000)|0; console.log(name,'tamam',JSON.stringify(S[name])); }catch(e){ S[name]={hata:e.message}; console.log(name,'HATA',e.message); } };

const SRC={
  fng: async()=>{ const j=await get('https://api.alternative.me/fng/?limit=0&format=json'); const rows=j.data.map(x=>[day(+x.timestamp*1000),+x.value,x.value_classification.replace(/,/g,' ')]); return csvMerge('fng.csv','date,value,label',rows); },
  gdelt: async()=>{ // DOC 2.0: ay ay pencere, günlük çözünürlük; sorgu başına hacim (timelinevol, tüm haberlerin %'si) ve ton (timelinetone)
    const Q=[['bitcoin','bitcoin'],['crypto','(crypto OR cryptocurrency OR cryptocurrencies)'],['ethereum','ethereum'],['binance','binance']]; const rows=[]; let err=0;
    const [y0,m0]=GDELT_FROM.split('-').map(Number); const now=new Date(); const months=[]; for(let y=y0,m=m0;y<now.getUTCFullYear()||(y===now.getUTCFullYear()&&m<=now.getUTCMonth()+1);m++){ if(m>12){ m=1; y++; } months.push([y,m]); }
    const f=path.join(OUT,'gdelt.csv'); const have=new Set(); if(fs.existsSync(f)) for(const l of fs.readFileSync(f,'utf8').split('\n').slice(1)) if(l){ const c=l.split(','); have.add(c[0]+'|'+c[1]+'|'+c[2].slice(0,7)); }
    for(const [y,m] of months){ const a=`${y}${String(m).padStart(2,'0')}01000000`; const e1=new Date(Date.UTC(y,m,1)-1); const b=`${e1.getUTCFullYear()}${String(e1.getUTCMonth()+1).padStart(2,'0')}${String(e1.getUTCDate()).padStart(2,'0')}235959`; const ym=`${y}-${String(m).padStart(2,'0')}`;
      for(const [name,q] of Q) for(const mode of ['timelinevol','timelinetone']){ if(have.has(name+'|'+mode+'|'+ym)&&ym<day(Date.now()).slice(0,7)) continue;
        try{ const j=await get(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=${mode}&startdatetime=${a}&enddatetime=${b}&format=json&timelinesmooth=0`,{retry:2}); const tl=j.timeline?.[0]?.data||[]; for(const p of tl){ const d=p.date; rows.push([name,mode,`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`,+p.value]); } }
        catch(e){ err++; } await sleep(1500); } }
    const r=csvMerge('gdelt.csv','query,mode,date,value',rows.map(x=>[x[0]+'|'+x[1]+'|'+x[2],...x]),0); // anahtar sorgu|mod|gün
    const lines=fs.readFileSync(path.join(OUT,'gdelt.csv'),'utf8').split('\n'); fs.writeFileSync(path.join(OUT,'gdelt.csv'),[lines[0]].concat(lines.slice(1).filter(Boolean).map(l=>l.split(',').slice(1).join(','))).join('\n')+'\n'); return {...r,istekHatasi:err}; },
  llama: async()=>{ const all=await get('https://stablecoins.llama.fi/stablecoincharts/all'); const usdt=await get('https://stablecoins.llama.fi/stablecoincharts/all?stablecoin=1'); const usdc=await get('https://stablecoins.llama.fi/stablecoincharts/all?stablecoin=2');
    const pick=(j)=>{ const M=new Map(); for(const x of j){ const v=x.totalCirculatingUSD?.peggedUSD??x.totalCirculating?.peggedUSD; if(v!=null) M.set(day(+x.date*1000),v); } return M; }; const A=pick(all), T=pick(usdt), C=pick(usdc);
    const r1=csvMerge('stablecoins.csv','date,total,usdt,usdc',[...A.keys()].map(d=>[d,Math.round(A.get(d)),Math.round(T.get(d)||0),Math.round(C.get(d)||0)]));
    const tvl=await get('https://api.llama.fi/v2/historicalChainTvl'); const TV=new Map(tvl.map(x=>[day(+x.date*1000),Math.round(x.tvl)])); let DX=new Map();
    try{ const dex=await get('https://api.llama.fi/overview/dexs?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=true&dataType=dailyVolume'); DX=new Map((dex.totalDataChart||[]).map(x=>[day(+x[0]*1000),Math.round(x[1])])); }catch(e){ console.log('  dex hacmi alınamadı',e.message); }
    const r2=csvMerge('defi.csv','date,tvl,dexVol',[...TV.keys()].map(d=>[d,TV.get(d),DX.get(d)??''])); return {stablecoins:r1,defi:r2}; },
  stooq: async()=>{ const SYM={spx:'^spx',ndq:'^ndq',vix:'^vix',gold:'xauusd',dxy:'dx.f',us10y:'10usy.b',usdtry:'usdtry',oil:'cl.f'}; const out={};
    for(const k in SYM){ try{ const t=await get(`https://stooq.com/q/d/l/?s=${encodeURIComponent(SYM[k])}&i=d`,{json:false}); const L=t.trim().split('\n'); if(L.length<10||!/^Date/.test(L[0])) throw new Error('veri yok: '+L[0].slice(0,40)); const rows=L.slice(1).map(l=>l.split(',')).filter(c=>c.length>=5&&c[4]).map(c=>[c[0],c[1],c[2],c[3],c[4],c[5]||'']); out[k]=csvMerge(`stooq-${k}.csv`,'date,open,high,low,close,volume',rows); }catch(e){ out[k]={hata:e.message}; } await sleep(1200); } return out; },
  dvol: async()=>{ const out={}; for(const cur of ['BTC','ETH']){ const f=path.join(OUT,`dvol-${cur}.csv`); let start=Date.UTC(2021,2,24); if(fs.existsSync(f)){ const L=fs.readFileSync(f,'utf8').trim().split('\n'); const last=L[L.length-1]; if(last&&!/^t,/.test(last)) start=+last.split(',')[0]+36e5; }
      const rows=[]; let end=Date.now(); let guard=0; while(start<end&&guard++<400){ const j=await get(`https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=${cur}&start_timestamp=${start}&end_timestamp=${end}&resolution=3600`); const d=j.result?.data||[]; for(const p of d) rows.push([p[0],p[1],p[2],p[3],p[4]]); if(!j.result?.continuation||!d.length) break; end=j.result.continuation; await sleep(300); }
      out[cur]=csvMerge(`dvol-${cur}.csv`,'t,o,h,l,c',rows); } return out; },
  cot: async()=>{ const rows=[]; const y1=new Date().getUTCFullYear(); for(let y=2018;y<=y1;y++){ try{ const files=unzipAll(await getBuf(`https://www.cftc.gov/files/dea/history/fut_fin_txt_${y}.zip`)); const txt=Object.values(files)[0]; const L=txt.split('\n'); const H=L[0].split(',').map(s=>s.replace(/"/g,'').trim()); const ix=n=>H.findIndex(h=>h.toLowerCase()===n.toLowerCase());
        const I={name:ix('Market_and_Exchange_Names'),date:ix('Report_Date_as_YYYY-MM-DD'),oi:ix('Open_Interest_All'),dL:ix('Dealer_Positions_Long_All'),dS:ix('Dealer_Positions_Short_All'),aL:ix('Asset_Mgr_Positions_Long_All'),aS:ix('Asset_Mgr_Positions_Short_All'),lL:ix('Lev_Money_Positions_Long_All'),lS:ix('Lev_Money_Positions_Short_All'),oL:ix('Other_Rept_Positions_Long_All'),oS:ix('Other_Rept_Positions_Short_All'),nL:ix('NonRept_Positions_Long_All'),nS:ix('NonRept_Positions_Short_All')};
        for(const l of L.slice(1)){ if(!l) continue; const c=l.match(/("[^"]*"|[^,]*)(,|$)/g).map(s=>s.replace(/,$/,'').replace(/^"|"$/g,'').trim()); const nm=c[I.name]||''; if(!/BITCOIN|ETHER/i.test(nm)||!/CHICAGO MERCANTILE/i.test(nm)) continue;
          const mk=/MICRO BITCOIN/i.test(nm)?'MBT':/NANO BITCOIN/i.test(nm)?'NBT':/BITCOIN/i.test(nm)?'BTC':/MICRO ETHER/i.test(nm)?'MET':'ETH'; rows.push([c[I.date]+'|'+mk,c[I.date],mk,c[I.oi],c[I.dL],c[I.dS],c[I.aL],c[I.aS],c[I.lL],c[I.lS],c[I.oL],c[I.oS],c[I.nL],c[I.nS]]); } }catch(e){ console.log('  cot',y,e.message); } await sleep(500); }
    const r=csvMerge('cot.csv','key,date,market,oi,dealerL,dealerS,assetMgrL,assetMgrS,levL,levS,otherL,otherS,nonRepL,nonRepS',rows,0); return r; },
  chain: async()=>{ const CH={hashrate:'hash-rate',ntx:'n-transactions',addrs:'n-unique-addresses',feesUsd:'transaction-fees-usd',mempool:'mempool-size'}; const M=new Map(); const got=[];
    for(const k in CH){ try{ const j=await get(`https://api.blockchain.info/charts/${CH[k]}?timespan=all&format=json&sampled=false`); for(const p of j.values||[]){ const d=day(p.x*1000); const r=M.get(d)||{}; r[k]=p.y; M.set(d,r); } got.push(k); }catch(e){ console.log('  chain',k,e.message); } await sleep(800); }
    const K=Object.keys(CH); return {...csvMerge('onchain-btc.csv','date,'+K.join(','),[...M.keys()].map(d=>[d,...K.map(k=>M.get(d)[k]??'')])),alanlar:got}; },
  news: async()=>{ const f=path.join(OUT,'news.jsonl'); const seen=new Set(); let oldest=Date.now()/1000|0; if(fs.existsSync(f)) for(const l of fs.readFileSync(f,'utf8').split('\n')) if(l){ try{ const x=JSON.parse(l); seen.add(x.id); if(x.t<oldest) oldest=x.t; }catch{} }
    const w=fs.createWriteStream(f,{flags:'a'}); let n=0, lTs=Math.floor(Date.now()/1000), calls=0, empty=0; const minTs=NEWS_FROM/1000; const toTs=seen.size?oldest:minTs; // ilk koşu: bugünden NEWS_FROM'a; sonraki: en eskiden geriye değil, yeni haberler için baştan (görülenler atlanır)
    while(lTs>minTs&&calls<20000){ let j; try{ j=await get(`https://min-api.cryptocompare.com/data/v2/news/?lang=EN&lTs=${lTs}`); }catch(e){ if(!calls){ w.end(); throw new Error(e.message+(/401/.test(e.message)?' (CryptoCompare artık API anahtarı istiyor)':'')); } console.log('  news',e.message); break; } calls++; const D=j.Data||[]; if(!D.length){ if(++empty>3) break; lTs-=3600; continue; } empty=0;
      let minSeen=lTs; for(const x of D){ const t=+x.published_on; if(t<minSeen) minSeen=t; if(seen.has(x.id)) continue; seen.add(x.id); n++; w.write(JSON.stringify({id:x.id,t,src:x.source,title:x.title,cats:x.categories,up:+x.upvotes||0,down:+x.downvotes||0,url:x.url})+'\n'); }
      if(seen.size&&D.every(x=>seen.has(x.id))&&minSeen<=toTs) break; // eski kayıtlara ulaşıldı
      lTs=minSeen-1; if(calls%100===0) console.log('  news',calls,'istek',n,'yeni',day(lTs*1000)); await sleep(400); }
    w.end(); return {yeni:n,toplam:seen.size,istek:calls,enEski:day(Math.min(oldest,lTs)*1000)}; },
};
(async()=>{ fs.mkdirSync(OUT,{recursive:true}); console.log('çıktı',OUT); for(const k of Object.keys(SRC)) await run(k,SRC[k]);
  const OZ=path.join(OUT,'_ozet.json'); let prev={}; try{ prev=JSON.parse(fs.readFileSync(OZ,'utf8')).sources||{}; }catch{} fs.writeFileSync(OZ,JSON.stringify({at:new Date().toISOString(),sources:{...prev,...S}},null,1)); /* --only koşuları birbirini silmesin */ console.log('\nÖZET'); for(const k in S) console.log(' ',k.padEnd(6),JSON.stringify(S[k]).slice(0,200)); })();
