// Kendi makinende çalıştır (Binance bulut sunucularından 403 döner): lider listesi + kapanmış pozisyonlar + 1 sa mumlar → tests/data/leaders-real.json
//   node tests/record-leaders.js && node tests/research-node.js --real
// Uygulamadaki ldRefresh ile aynı elek: 90 gün ROI ilk 100 → AUM ≥ 20k, ≥ 50 kopyalayan, MDD ≤ 60, kazanma ≥ 50 → ilk 40. Lider başına 4 sayfa × 50 pozisyon.
const fs=require('fs'); const LD='https://www.binance.com/bapi/futures/v1/friendly/future/copy-trade/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function post(path,body){ const r=await fetch(LD+path,{method:'POST',headers:{'Content-Type':'application/json',clienttype:'web',lang:'en'},body:JSON.stringify(body)}); if(r.status===429||r.status===418){ console.log('Binance hız sınırı (HTTP '+r.status+'), retry-after '+r.headers.get('retry-after')+' sn; durdu'); process.exit(2); } if(!r.ok) throw new Error(path+' HTTP '+r.status); const j=await r.json(); if(j.code!=='000000') throw new Error(path+' '+(j.message||j.code)); return j.data||{}; }
(async()=>{
  let all=[]; for(let pg=1;pg<=5;pg++){ const d=await post('home-page/query-list',{pageNumber:pg,pageSize:20,timeRange:'90D',dataType:'ROI',favoriteOnly:false,hideFull:false,nickname:'',order:'DESC',userAsset:0,portfolioType:'ALL'}); all=all.concat(d.list||[]); }
  const leaders=all.filter(x=>+x.aum>=20000&&+x.currentCopyCount>=50&&+x.mdd<=60&&+x.winRate>=50).slice(0,40); console.log(all.length+' lider listelendi, elekten '+leaders.length+' geçti');
  const hist={}; const syms=new Set(['BTCUSDT']);
  for(const L of leaders){ const id=String(L.leadPortfolioId); hist[id]=[];
    for(let pg=1;pg<=4;pg++){ try{ const d=await post('lead-portfolio/position-history',{portfolioId:id,pageNumber:pg,pageSize:50}); const list=d.list||[]; hist[id]=hist[id].concat(list); list.forEach(p=>p.symbol&&syms.add(p.symbol)); if(list.length<50) break; }catch(e){ console.log('  '+L.nickname+': '+e.message); break; } await sleep(400); }
    console.log('  '+L.nickname+': '+hist[id].length+' pozisyon'); }
  const klines={}; for(const s of syms){ try{ const r=await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${s}&interval=1h&limit=1500`); if(r.status===429||r.status===418){ console.log('Binance hız sınırı (HTTP '+r.status+'), retry-after '+r.headers.get('retry-after')+' sn; durdu'); process.exit(2); } if(r.ok) klines[s]=await r.json(); const w=+r.headers.get('x-mbx-used-weight-1m'); if(w>1500) await sleep(61e3-Date.now()%6e4); }catch(e){} await sleep(500); }
  console.log(Object.keys(klines).length+'/'+syms.size+' coin için 1 sa mum');
  fs.mkdirSync(__dirname+'/data',{recursive:true}); fs.writeFileSync(__dirname+'/data/leaders-real.json',JSON.stringify({at:Date.now(),leaders,hist,klines}));
  console.log('yazıldı: tests/data/leaders-real.json');
})().catch(e=>{ console.error(e.message); process.exit(1); });
