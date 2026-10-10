// Araştırma verisini sıfırdan indirir (kendi makinende): hacimce ilk 24 coin + BTC için 15 dk × 18000 (≈6 ay), 1 sa × 1500, 1 g × 400 → tests/data/<SYM>.json
// ve BTC·ETH·SOL·BNB için 2020'den bugüne günlük → tests/data/daily/<SYM>.csv. İstekler 1 sn arayla; 429/418'de durur (çalışan uygulamanın IP'sini yakmamak için).
// Kullanım: node tests/fetch-research.js [coin=24] [15dk sayfa=12]
const fs=require('fs'), path=require('path');
const BASE='https://fapi.binance.com'; const OUT=path.join(__dirname,'data'); const N=+process.argv[2]||24, PAGES=+process.argv[3]||12;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function j(p){ await sleep(1000); let r; for(let a=0;;a++){ try{ r=await fetch(BASE+p); break; }catch(e){ if(a>=5) throw e; console.log('bağlantı hatası, bekleyip yeniden:',e.cause&&e.cause.code||e.message); await sleep(5000*(a+1)); } } if(r.status===429||r.status===418){ console.error('hız sınırı',r.status,'— duruyorum'); process.exit(2); } if(!r.ok) throw new Error(p+' HTTP '+r.status); return r.json(); }
const kl=(s,iv,lim,q='')=>j(`/fapi/v1/klines?symbol=${s}&interval=${iv}&limit=${lim}${q}`);
async function back(s,iv,pages){ let all=[],end; for(let p=0;p<pages;p++){ const k=await kl(s,iv,1500,end?`&endTime=${end}`:''); if(!k.length) break; all=k.concat(all); end=k[0][0]-1; if(k.length<1500) break; } const seen=new Set(); return all.filter(r=>!seen.has(r[0])&&seen.add(r[0])); }
(async()=>{ fs.mkdirSync(path.join(OUT,'daily'),{recursive:true});
  for(const s of ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT']){ const f=path.join(OUT,'daily',s+'.csv'); if(fs.existsSync(f)) continue; let all=[],st=Date.UTC(2019,11,1);
    for(;;){ const k=await kl(s,'1d',1500,`&startTime=${st}`); all=all.concat(k); if(k.length<1500) break; st=k[k.length-1][0]+1; }
    fs.writeFileSync(f,all.map(r=>[r[0],r[1],r[2],r[3],r[4],r[7]].join(',')).join('\n')); console.log('günlük',s,all.length); }
  const info=await j('/fapi/v1/exchangeInfo'); const perps=new Set(info.symbols.filter(s=>s.contractType==='PERPETUAL'&&s.quoteAsset==='USDT'&&s.status==='TRADING').map(s=>s.symbol));
  const t24=await j('/fapi/v1/ticker/24hr'); const top=t24.filter(t=>perps.has(t.symbol)&&!/^(USDC|FDUSD|BUSD|TUSD|USDP)/.test(t.symbol)).sort((a,b)=>+b.quoteVolume-+a.quoteVolume).slice(0,N).map(t=>t.symbol);
  for(const s of Array.from(new Set(['BTCUSDT',...top]))){ const f=path.join(OUT,s+'.json'); if(fs.existsSync(f)){ console.log('var',s); continue; }
    try{ const k15=await back(s,'15m',PAGES), k1h=await kl(s,'1h',1500), k1d=await kl(s,'1d',400); fs.writeFileSync(f,JSON.stringify({sym:s,at:Date.now(),k15,k1h,k1d})); console.log(s,'15m',k15.length,'1h',k1h.length,'1d',k1d.length); }catch(e){ console.error(s,e.message); } }
  console.log('bitti'); })();
