// Binance USDⓈ-M geçmiş verisi indirir (geriye dönük karşılaştırma için). Çıktı: tests/data/<SYM>.json
// Kullanım: node tests/fetch-history.js [coinSayısı=24] [15dk sayfa=4]
const fs=require('fs'); const path=require('path');
const BASE='https://fapi.binance.com'; const OUT=path.join(__dirname,'data');
const N=+process.argv[2]||24, PAGES=+process.argv[3]||4;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function j(p){ for(let a=0;a<5;a++){ const r=await fetch(BASE+p); if(r.status===429||r.status===418){ const ra=+(r.headers.get('retry-after')||20); console.log('429, bekle',ra); await sleep(ra*1000+1000); continue; } if(!r.ok) throw new Error(p+' HTTP '+r.status); return r.json(); } throw new Error('rate limit '+p); }
async function klines(sym,iv,limit,endTime){ return j(`/fapi/v1/klines?symbol=${sym}&interval=${iv}&limit=${limit}`+(endTime?`&endTime=${endTime}`:'')); }
async function pages(sym,iv,pagesN){ let all=[], end=undefined; for(let p=0;p<pagesN;p++){ const k=await klines(sym,iv,1500,end); if(!k.length) break; all=k.concat(all); end=k[0][0]-1; await sleep(120); } const seen=new Set(); return all.filter(r=>{ if(seen.has(r[0])) return false; seen.add(r[0]); return true; }); }
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const info=await j('/fapi/v1/exchangeInfo'); const perps=new Set(info.symbols.filter(s=>s.contractType==='PERPETUAL'&&s.quoteAsset==='USDT'&&s.status==='TRADING').map(s=>s.symbol));
  const t24=await j('/fapi/v1/ticker/24hr'); const top=t24.filter(t=>perps.has(t.symbol)&&!/^(USDC|FDUSD|BUSD|TUSD|USDP)/.test(t.symbol)).sort((a,b)=>+b.quoteVolume-+a.quoteVolume).slice(0,N).map(t=>t.symbol);
  const syms=Array.from(new Set(['BTCUSDT',...top]));
  console.log('coinler:',syms.join(' '));
  for(const s of syms){
    const f=path.join(OUT,s+'.json'); if(fs.existsSync(f)){ console.log('var',s); continue; }
    const [k15,k1h,k1d]=[await pages(s,'15m',PAGES),await klines(s,'1h',1500),await klines(s,'1d',400)];
    fs.writeFileSync(f,JSON.stringify({sym:s,at:Date.now(),k15,k1h,k1d}));
    console.log(s,'15m',k15.length,'1h',k1h.length,'1d',k1d.length); await sleep(150);
  }
  console.log('bitti');
})().catch(e=>{ console.error(e); process.exit(1); });
