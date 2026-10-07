// Tek günün işlemlerini incelemek için mum indirir (kendi makinende; Binance bulut IP'lerine 403 döner).
// Kullanım: node tests/fetch-day.js 2026-10-07 SYM1 SYM2 ...  → tests/data/day-<gün>/<SYM>.json
// Her coin: 15 dk × 4500 (≈47 gün, masayı o ana kadar yeniden oynatmak için), 1 dk (önceki gün 18:00'den şimdiye), 1 sa × 1000, 1 g × 400.
// İstekler 600 ms arayla sıradadır; 429/418'de durur (çalışan uygulamanın IP'sini yakmamak için).
const fs=require('fs'), path=require('path');
const BASE='https://fapi.binance.com'; const day=process.argv[2]; const syms=process.argv.slice(3);
const OUT=path.join(__dirname,'data','day-'+day); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function j(p){ await sleep(600); const r=await fetch(BASE+p); if(r.status===429||r.status===418){ console.error('hız sınırı',r.status,'— duruyorum'); process.exit(2); } if(!r.ok) throw new Error(p+' HTTP '+r.status); return r.json(); }
const kl=(s,iv,lim,q='')=>j(`/fapi/v1/klines?symbol=${s}&interval=${iv}&limit=${lim}${q}`);
async function back(s,iv,n){ let all=[],end; while(all.length<n){ const k=await kl(s,iv,1500,end?`&endTime=${end}`:''); if(!k.length) break; all=k.concat(all); end=k[0][0]-1; if(k.length<1500) break; } const seen=new Set(); return all.filter(r=>!seen.has(r[0])&&seen.add(r[0])); }
async function fwd(s,iv,start){ let all=[],st=start; for(;;){ const k=await kl(s,iv,1500,`&startTime=${st}`); all=all.concat(k); if(k.length<1500) break; st=k[k.length-1][0]+1; } return all; }
(async()=>{ fs.mkdirSync(OUT,{recursive:true}); const t1m=Date.parse(day+'T00:00:00Z')-30*3600e3;
  for(const s of syms){ const f=path.join(OUT,s+'.json'); if(fs.existsSync(f)){ console.log('var',s); continue; }
    try{ const k15=await back(s,'15m',4500), k1m=await fwd(s,'1m',t1m), k1h=await kl(s,'1h',1000), k1d=await kl(s,'1d',400);
      fs.writeFileSync(f,JSON.stringify({sym:s,at:Date.now(),k15,k1m,k1h,k1d})); console.log(s,'15m',k15.length,'1m',k1m.length,'1h',k1h.length,'1d',k1d.length);
    }catch(e){ console.error(s,e.message); } }
  console.log('bitti'); })();
