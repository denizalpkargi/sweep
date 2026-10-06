// Hacim profili doğruluğu: günlük (UTC) POC/VAH/VAL 15 dk mumlardan mı, 1 dk mumlardan mı? 1 dk, borsadaki tik verisine en yakın olanı.
// Binance'ten indirir (bulut IP'lerine 403 döner, kendi bilgisayarında çalıştır): node tests/audit-vp-1m.js [gün=7]
// Çıktı: coin başına medyan fark (gün aralığının yüzdesi) ve satır genişliğinin kaçı (48 satır → bir satır ≈ %2,1).
const {loadEngine}=require('./engine-node.js'); const E=loadEngine();
const SYMS=["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","DOGEUSDT"]; const DAYS=+(process.argv[2]||7);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function kl(sym,iv,start,end){ const out=[]; let t=start; const step={"1m":6e4,"15m":9e5}[iv];
  while(t<end){ const u=`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=${iv}&startTime=${t}&limit=1500`; const r=await fetch(u); if(!r.ok) throw new Error(sym+' '+r.status); const a=await r.json(); if(!a.length) break;
    for(const x of a) if(x[0]<end) out.push(x); t=a[a.length-1][0]+step; await sleep(250); }
  return E.K(out); }
(async()=>{
  const end=Math.floor(Date.now()/864e5)*864e5, start=end-DAYS*864e5; const all=[];
  for(const s of SYMS){ const k1=await kl(s,"1m",start,end), k15=await kl(s,"15m",start,end);
    const P1=E.sessionProfiles(k1,k1.length,{bins:48}), P15=E.sessionProfiles(k15,k15.length,{bins:48}); const by=Object.fromEntries(P1.map(p=>[p.day,p])); const d=[];
    for(const p of P15){ const q=by[p.day]; if(!q) continue; const rng=Math.max(...k1.slice(q.s0,q.s1+1).map(c=>c.h))-Math.min(...k1.slice(q.s0,q.s1+1).map(c=>c.l)); d.push({poc:Math.abs(p.poc-q.poc)/rng,vah:Math.abs(p.vah-q.vah)/rng,val:Math.abs(p.val-q.val)/rng}); }
    const med=k=>{ const a=d.map(x=>x[k]).sort((x,y)=>x-y); return a[a.length>>1]; }; all.push(...d);
    console.log(s.padEnd(10),'gün',d.length,'· POC farkı yüzde',(med('poc')*100).toFixed(1),'· VAH',(med('vah')*100).toFixed(1),'· VAL',(med('val')*100).toFixed(1)); }
  const med=k=>{ const a=all.map(x=>x[k]).sort((x,y)=>x-y); return a[a.length>>1]; }; const p90=k=>{ const a=all.map(x=>x[k]).sort((x,y)=>x-y); return a[Math.floor(a.length*0.9)]; };
  console.log('HEPSİ medyan · POC yüzde',(med('poc')*100).toFixed(1),'VAH',(med('vah')*100).toFixed(1),'VAL',(med('val')*100).toFixed(1),'· p90 POC',(p90('poc')*100).toFixed(1));
})().catch(e=>{ console.error(e.message); process.exit(1); });
