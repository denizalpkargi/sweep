// Test listesi #39: ilgi verisi. Bulutta kapalı kaynakları kullanıcının bilgisayarından çeker (Node 18+, ek paket yok).
//   Wikipedia sayfa görüntüleme (wikimedia REST, günlük, 2020-01'den; insan trafiği "user")
//   Google Trends (resmî API yok; trends.google.com'un kendi arayüz uçları: explore → widget jetonu → multiline), haftalık, dünya geneli
// Çıktı: <out>/wiki/<SYM>.csv (tarih,görüntüleme) ve <out>/trends/<SYM>.csv (tarih,değer 0–100; her coin kendi serisi).
// Var olan dosyaya dokunmaz (--force ile yeniden çeker). Google 429 verirse artan bekleme, 3 denemede o coini atlar.
// Kullanım: node tests/fetch-interest.js [--out tests/data/interest] [--only wiki,trends] [--force]
const fs=require('fs'), path=require('path');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const OUT=arg('out',path.join(__dirname,'data','interest')), ONLY=(arg('only','wiki,trends')).split(','), FORCE=process.argv.includes('--force');
const UA='SWEEP-research/1.0 (https://github.com/denizalpkargi/sweep)';
// sembol → [Wikipedia makalesi (en), Google Trends arama terimi]
const COINS={
  BTCUSDT:['Bitcoin','bitcoin'], ETHUSDT:['Ethereum','ethereum'], SOLUSDT:['Solana_(blockchain_platform)','solana'], BNBUSDT:['Binance','bnb'],
  XRPUSDT:['Ripple_Labs','xrp'], DOGEUSDT:['Dogecoin','dogecoin'], ADAUSDT:['Cardano_(blockchain_platform)','cardano'], AVAXUSDT:['Avalanche_(blockchain_platform)','avalanche crypto'],
  DOTUSDT:['Polkadot_(blockchain_platform)','polkadot'], LINKUSDT:['Chainlink_(blockchain)','chainlink'], LTCUSDT:['Litecoin','litecoin'], TRXUSDT:['Tron_(cryptocurrency)','tron crypto'],
  SHIBUSDT:['Shiba_Inu_(cryptocurrency)','shiba inu'], ['1000SHIBUSDT']:['Shiba_Inu_(cryptocurrency)','shiba inu'], BCHUSDT:['Bitcoin_Cash','bitcoin cash'], ETCUSDT:['Ethereum_Classic','ethereum classic'],
  XLMUSDT:['Stellar_(payment_network)','stellar lumens'], UNIUSDT:['Uniswap','uniswap'], FILUSDT:['Filecoin','filecoin'], ATOMUSDT:['Cosmos_(blockchain)','cosmos crypto'],
  NEARUSDT:['NEAR_Protocol','near protocol'], APTUSDT:['Aptos_(blockchain)','aptos'], ARBUSDT:['Arbitrum','arbitrum'], OPUSDT:['Optimism_(blockchain)','optimism crypto'],
  SUIUSDT:['Sui_(blockchain)','sui crypto'], PEPEUSDT:['Pepe_(cryptocurrency)','pepe coin'], ['1000PEPEUSDT']:['Pepe_(cryptocurrency)','pepe coin'], TONUSDT:['Toncoin','toncoin'],
  WIFUSDT:['Dogwifhat','dogwifhat'], HBARUSDT:['Hedera_(distributed_ledger)','hedera'], ICPUSDT:['Internet_Computer','internet computer crypto'], XMRUSDT:['Monero','monero'],
  AAVEUSDT:['Aave','aave'], MATICUSDT:['Polygon_(blockchain)','polygon matic'], ENAUSDT:['Ethena','ethena'], TAOUSDT:['Bittensor','bittensor'], WLDUSDT:['Worldcoin','worldcoin'],
  FETUSDT:['Fetch.ai','fetch.ai'], INJUSDT:['Injective_Protocol','injective'], SEIUSDT:['Sei_Network','sei crypto'], TIAUSDT:['Celestia_(blockchain)','celestia'],
  FARTCOINUSDT:[null,'fartcoin'], TRUMPUSDT:['$Trump','trump coin'], HYPEUSDT:['Hyperliquid','hyperliquid'], ONDOUSDT:['Ondo_Finance','ondo'], PENGUUSDT:['Pudgy_Penguins','pudgy penguins'],
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ymd=d=>d.toISOString().slice(0,10).replace(/-/g,'');
async function wiki(sym,art){
  const f=path.join(OUT,'wiki',sym+'.csv'); if(!art||(!FORCE&&fs.existsSync(f))) return 'atlandı';
  const u=`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(art)}/daily/20200101/${ymd(new Date())}`;
  const r=await fetch(u,{headers:{'User-Agent':UA}}); if(!r.ok) return 'HTTP '+r.status;
  const j=await r.json(); const rows=(j.items||[]).map(x=>`${x.timestamp.slice(0,4)}-${x.timestamp.slice(4,6)}-${x.timestamp.slice(6,8)},${x.views}`);
  fs.writeFileSync(f,'tarih,goruntuleme\n'+rows.join('\n')+'\n'); return rows.length+' gün';
}
let cookie='';
async function gt(url,opt={}){
  for(let k=0;k<3;k++){
    const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept-Language':'en-US',...(cookie?{Cookie:cookie}:{})},...opt});
    const sc=r.headers.get('set-cookie'); if(sc) cookie=sc.split(';')[0];
    if(r.status===429){ await sleep(30000*(k+1)); continue; }
    if(!r.ok) throw new Error('HTTP '+r.status);
    const t=await r.text(); return JSON.parse(t.slice(t.indexOf('{')));
  }
  throw new Error('429 sürüyor');
}
async function trends(sym,kw){
  const f=path.join(OUT,'trends',sym+'.csv'); if(!kw||(!FORCE&&fs.existsSync(f))) return 'atlandı';
  if(!cookie){ try{ await gt('https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req='+encodeURIComponent(JSON.stringify({comparisonItem:[{keyword:'bitcoin',geo:'',time:'today 12-m'}],category:0,property:''}))); }catch(e){} }
  // 5 yıldan uzun aralık aylık döner; haftalık için iki pencere (örtüşen 2022-01 → 2024-12) çekilir, ikincisi örtüşmenin ortalamasıyla birinciye ölçeklenir
  const today=new Date().toISOString().slice(0,10), wins=['2020-01-01 2024-12-31',`2022-01-01 ${today}`], parts=[];
  for(const time of wins){
    const ex=await gt('https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req='+encodeURIComponent(JSON.stringify({comparisonItem:[{keyword:kw,geo:'',time}],category:0,property:''})));
    const w=(ex.widgets||[]).find(x=>x.id==='TIMESERIES'); if(!w) return 'widget yok';
    const d=await gt('https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0&req='+encodeURIComponent(JSON.stringify(w.request))+'&token='+w.token);
    parts.push(new Map((d.default&&d.default.timelineData||[]).map(x=>[new Date(+x.time*1000).toISOString().slice(0,10),+x.value[0]])));
    await sleep(4000);
  }
  const [a,b]=parts; let sa=0,sb=0; for(const [k,v] of b) if(a.has(k)){ sa+=a.get(k); sb+=v; }
  const sc=sb>0?sa/sb:1, all=new Map(a); for(const [k,v] of b) if(!all.has(k)||k>'2024-12-31') all.set(k,+(v*sc).toFixed(2));
  const rows=[...all].sort((x,y)=>x[0]<y[0]?-1:1).map(([k,v])=>`${k},${v}`);
  fs.writeFileSync(f,'tarih,deger\n'+rows.join('\n')+'\n'); return rows.length+' hafta, ölçek '+sc.toFixed(2);
}
(async()=>{
  for(const d of ['wiki','trends']) fs.mkdirSync(path.join(OUT,d),{recursive:true});
  for(const [sym,[art,kw]] of Object.entries(COINS)){
    const out=[sym];
    if(ONLY.includes('wiki')){ try{ out.push('wiki '+await wiki(sym,art)); }catch(e){ out.push('wiki hata '+e.message); } await sleep(300); }
    if(ONLY.includes('trends')){ try{ out.push('trends '+await trends(sym,kw)); }catch(e){ out.push('trends hata '+e.message); } await sleep(6000); }
    console.log(out.join(' · '));
  }
  console.log('bitti →',OUT);
})();
