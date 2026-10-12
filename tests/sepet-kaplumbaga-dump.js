// Sepetlere model süzgeci (12 Ekim 2026; kullanıcı "ikisi" dedi): Kaplumbağa'nın canlı koduyla (src/turtle.js) arşivde BÜTÜN sinyalleri çıkarır.
// turtle-test.js --replay döngüsünün aynısı, ama pozisyon ve nominal sınırı yok (maxPos, lev çok büyük): 10 pozisyon sınırının hangi sinyalleri
// atladığı sonucu etkiliyor, model seçici olabilir mi sorusu için hepsi gerekir. Çıktı tests/data/arch/tt-trades-all.json:
// [{sym, t: giriş günü (ms, UTC 00:00), closeT, R, why, days}]; tests/sepet-suzgec.py bunu üyelerin örneklem dışı sırasıyla eşleştirir.
// Kullanım: node tests/sepet-kaplumbaga-dump.js [--from 2023-06]
const fs=require('fs'), path=require('path'); const {loadEngine}=require('./engine-node.js'); const E=loadEngine(); const DAY=864e5;
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i>0?process.argv[i+1]:d; };
const ARCH=path.join(__dirname,'data','arch'); const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const TOP=50;
const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)).concat(['BTCUSDT']))];
const D={}; for(const sym of syms){ const f=path.join(ARCH,'1d',sym+'.csv'); if(!fs.existsSync(f)) continue; D[sym]=fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); }
const idx={}; for(const k in D) idx[k]=new Map(D[k].map((b,i)=>[b.t,i]));
const s=E.ttNew({fee:0.0005,slip:0.0003,maxPos:1e9,lev:1e9}); const t0=Date.parse(arg('from','2023-06')+'-01T00:00:00Z'), t1=D.BTCUSDT[D.BTCUSDT.length-1].t; const all=[];
for(let t=t0;t<t1;t+=DAY){
  for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) E.ttIntraday(s,k,D[k][i],t); }
  const m=new Date(t).toISOString().slice(0,7); const univ=(U[m]||[]).slice(0,TOP).filter(k=>idx[k]&&idx[k].has(t));
  const need=new Set([...univ,...Object.keys(s.pos),'BTCUSDT']); const data={}, px={};
  for(const k of need){ const i=idx[k]&&idx[k].get(t); if(i==null||i<130) continue; data[k]=D[k].slice(Math.max(0,i-215),i+1); const nx=D[k][i+1]; if(nx) px[k]=nx.o; }
  for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null&&i===D[k].length-1) E.ttExit(s,k,D[k][i].c,'listeden çıktı',t); }
  E.ttClose(s,data,univ,px,t+DAY);
  for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) s.pos[k].px=D[k][i].c; }
  all.push(...s.trades.splice(0));
}
const out=all.map(x=>({sym:x.sym,t:x.t,closeT:x.closeT,R:+x.R.toFixed(4),why:x.why,days:x.days}));
fs.writeFileSync(path.join(ARCH,'tt-trades-all.json'),JSON.stringify(out));
console.log('kaplumbağa sinyalleri (sınırsız):',out.length,'işlem, ort.',(out.reduce((a,x)=>a+x.R,0)/out.length).toFixed(3),'R');
