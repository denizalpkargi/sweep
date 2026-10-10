// Test #40 (10 Ekim 2026): ufuk. Bugünkü giriş kuralını geçen masa kararlarında aynı girişle 12 / 24 / 72 sa sonra VWAP ile çık,
// yalnız felaket stopu 3 ve 4 × ATR(1 sa) (ve kıyas için stopsuz). Coin+yön başına tek açık işlem. Fonlama arşivden.
// R birimi masanın stop uzaklığı (sd × giriş): boy bugünkü gibi sd ile ayarlanırsa kâr/zarar. Ayrıca işlem başı % getiri.
// Kıyas: aynı coin ve saatlerde ters yön (rastgele yön = iki yönün ortalaması); Ozan sırası (tests/data/arch/rank-oos-tam-12.pkl,
// 2024-06'dan, saat içi alt onda bir short / üst onda bir long; tests/data/arch/_t40-ozan.csv'ye python ile dökülür), aynı ufuk ve stoplarla,
// R birimi max(%1,5; 1,2 × ATR15).
// Kullanım: node tests/test40-ufuk.js → tests/test40-ufuk-report.md
const fs=require('fs'), path=require('path');
const L=require('./test40-lib.js'); const {M15,DAY,mean,sdev,fx,ny,iso}=L;
const HS=[12,24,72], KS=[3,4,null]; const vk=(h,k)=>h+'_'+(k||'x');
async function main(){
  const t0=Date.now(); const {by,all,n}=await L.loadDecisions(); console.log('karar',n);
  const ozF=path.join(L.ARCH,'_t40-ozan.csv'); const oz={}; if(fs.existsSync(ozF)) for(const l of fs.readFileSync(ozF,'utf8').split('\n').slice(1).filter(Boolean)){ const [t,sym,dir]=l.split(','); (oz[sym]=oz[sym]||[]).push({t:+t-M15,sym,dir}); }
  const R={}, O={}; for(const h of HS) for(const k of KS){ R[vk(h,k)]=[]; O[vk(h,k)]=[]; }
  const syms=[...new Set([...Object.keys(by),...Object.keys(oz)])].sort(); let si=0;
  for(const s of syms){ si++; const k=L.loadCoin(s); if(!k) continue;
    const list=(by[s]||[]).sort((a,b)=>a.t-b.t);
    for(const h of HS) for(const K of KS){
      const spec=(d,i)=>{ const a=L.atr1h(k,k.t[i]+M15); if(K&&!Number.isFinite(a)) return null; return {riskU:d.sd,stop:null,cat:K?K*a:null,plan:null,holdBars:h*4}; };
      for(const x of L.takeSeq(list,k,spec)){ const opp=L.sim(k,x.i,x.d.dir==='long'?'short':'long',x.spec);
        R[vk(h,K)].push({t:x.d.t,dir:x.d.dir,score:x.d.score,R:x.r.R,pct:x.r.pct,how:x.r.how,oR:opp?opp.R:NaN,opct:opp?opp.pct:NaN}); }
      if(oz[s]){ const ospec=(d,i)=>{ const a=L.atr1h(k,k.t[i]+M15); if(K&&!Number.isFinite(a)) return null; const ru=Math.max(0.015,1.2*L.atr15(k,i)/k.c[i]); return {riskU:ru,stop:null,cat:K?K*a:null,plan:null,holdBars:h*4}; };
        for(const x of L.takeSeq(oz[s],k,ospec)) O[vk(h,K)].push({t:x.d.t,dir:x.d.dir,R:x.r.R,pct:x.r.pct,how:x.r.how}); }
    }
    if(si%25===0) console.log(si,'/',syms.length,s,((Date.now()-t0)/1e3).toFixed(0)+' sn');
  }
  report(R,O,{all,n});
}
function report(R,O,meta){
  const any=R[vk(12,4)]; const T0=Math.min(...any.map(x=>x.t)), T1=Math.max(...any.map(x=>x.t)); const P=L.periods(T0,T1);
  const cell=(a,f='R')=>{ const v=a.map(x=>x[f]).filter(Number.isFinite); return fx(mean(v)); };
  const tst=a=>{ const v=a.map(x=>x.R); return fx(mean(v)/sdev(v)*Math.sqrt(v.length),1); };
  // haftalık blok t: işlemler giriş haftasına göre toplanır (aynı anda açık, birbirine bağlı işlemler tek gözlem sayılır)
  const tw=a=>{ const g={}; for(const x of a){ const w=Math.floor(x.t/(7*DAY)); (g[w]=g[w]||[]).push(x.R); } const v=Object.values(g).map(mean); return fx(mean(v)/sdev(v)*Math.sqrt(v.length),1); };
  const kn=K=>K?K+' × ATR(1 sa)':'stopsuz';
  let md=`# Test #40 · Ufuk: masa girişleri 12 / 24 / 72 sa tutulursa\n\n10 Ekim 2026 · \`node tests/test40-ufuk.js\` (Ozan kıyası için önce \`tests/data/arch/_t40-ozan.csv\`)\n\n`;
  md+=`## Ne yapıldı\n\nMasa örneklerinde (\`samples-*.jsonl\`, ${ny(meta.all)} toplantı, ayın ilk 30 coini, 4 saatte bir iki yön) bugünkü giriş kuralını geçen ${ny(meta.n)} karar (${iso(T0)} → ${iso(T1)}). Giriş karar mumundan sonraki 15 dk mumun VWAP'ı + kayma %0,03, taker %0,05; çıkış 12 / 24 / 72 sa sonraki mumun VWAP'ı (taker + kayma) ya da felaket stopu (girişten 3 ya da 4 × ATR(14, 1 sa); değince seviyeden, mum ötesinde açıldıysa açılıştan). Hedef, iz, kısmi kapanış yok. Fonlama arşivden. Coin+yön başına tek açık işlem: önceki işlem bitmeden gelen karar alınmaz (bu yüzden ufuk uzadıkça işlem sayısı düşer).\n\nR birimi = masanın stop uzaklığı (\`sd\`, çoğunlukla %1,5): boy bugünkü gibi bu uzaklıkla ayarlanırsa $ sonucu. Felaket stopunda kayıp 1R'yi aşabilir. % = işlem başı getiri (nominal üzerinden). Rastgele yön tabanı = aynı coin ve saatte iki yönün ortalaması; "masa − rastgele" = (yön − ters yön) ÷ 2.\n\n`;
  md+=`## Bütün işlemler, ortalama R (maliyet + fonlama dahil)\n\n| ufuk · stop | işlem | tümü | 1. yarı | 2. yarı | son 12 ay | t (işlem) | t (haftalık blok) | % / işlem | kazanma | felaket stopu |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
  for(const h of HS) for(const K of KS){ const a=R[vk(h,K)]; md+=`| ${h} sa · ${kn(K)} | ${ny(a.length)} | ${cell(a)} | ${Object.values(P).map(f=>cell(a.filter(f))).join(' | ')} | ${tst(a)} | ${tw(a)} | ${fx(100*mean(a.map(x=>x.pct)),3)} % | %${(100*a.filter(x=>x.R>0).length/a.length).toFixed(1)} | %${(100*a.filter(x=>x.how==='stop').length/a.length).toFixed(1)} |\n`; }
  md+=`\nReferans: aynı kararların örnekteki bot R'si (kapanışta market giriş, 1,5R'de yarısı, 3R, iz, 8 sa; fonlamasız) ortalama −0,108; test #41'de aynı VWAP girişiyle bugünkü plan.\n\n`;
  md+=`## Long / short ayrı\n\n| ufuk · stop | yön | işlem | tümü | 1. yarı | 2. yarı | son 12 ay | % / işlem |\n|---|---|---:|---:|---:|---:|---:|---:|\n`;
  for(const h of HS) for(const K of KS) for(const dir of ['long','short']){ const a=R[vk(h,K)].filter(x=>x.dir===dir); md+=`| ${h} sa · ${kn(K)} | ${dir} | ${ny(a.length)} | ${cell(a)} | ${Object.values(P).map(f=>cell(a.filter(f))).join(' | ')} | ${fx(100*mean(a.map(x=>x.pct)),3)} % |\n`; }
  md+=`\n## Rastgele yön tabanı ve masanın yön bilgisi\n\n| ufuk · stop | rastgele yön R (tümü / 1. / 2. / son 12) | masa − rastgele R (tümü / 1. / 2. / son 12) | masa − rastgele % / işlem (tümü / 1. / 2. / son 12) |\n|---|---|---|---|\n`;
  for(const h of HS) for(const K of KS){ const a=R[vk(h,K)].filter(x=>Number.isFinite(x.oR)); const g=[a,...Object.values(P).map(f=>a.filter(f))];
    md+=`| ${h} sa · ${kn(K)} | ${g.map(b=>fx(mean(b.map(x=>(x.R+x.oR)/2)))).join(' / ')} | ${g.map(b=>fx(mean(b.map(x=>(x.R-x.oR)/2)))).join(' / ')} | ${g.map(b=>fx(100*mean(b.map(x=>(x.pct-x.opct)/2)),3)).join(' / ')} |\n`; }
  md+=`\n## Puan dilimleri (bütün işlemler, R; tümü / 1. yarı / 2. yarı / son 12 ay)\n\n| ufuk · stop | 35–45 | 45–55 | 55+ |\n|---|---|---|---|\n`;
  const bins=[[0.35,0.45],[0.45,0.55],[0.55,9]];
  for(const h of HS) for(const K of [4,null]){ const a=R[vk(h,K)]; md+=`| ${h} sa · ${kn(K)} | ${bins.map(([lo,hi])=>{ const b=a.filter(x=>x.score>=lo&&x.score<hi); return [b,...Object.values(P).map(f=>b.filter(f))].map(c=>cell(c)).join(' / ')+` (${ny(b.length)})`; }).join(' | ')} |\n`; }
  // yıl yıl
  const yrs=[...new Set(any.map(x=>new Date(x.t).getUTCFullYear()))].sort();
  md+=`\n## Yıl yıl (R)\n\n| ufuk · stop | ${yrs.join(' | ')} |\n|---|${yrs.map(()=>'---:').join('|')}|\n`;
  for(const h of HS) for(const K of KS){ const a=R[vk(h,K)]; md+=`| ${h} sa · ${kn(K)} | ${yrs.map(y=>cell(a.filter(x=>new Date(x.t).getUTCFullYear()===y))).join(' | ')} |\n`; }
  md+=`\n## 72 sa stopsuz: dağılım\n\n`; { const a=R[vk(72,null)].map(x=>x.R).sort((p,q)=>p-q); const q=f=>fx(a[Math.floor(f*(a.length-1))],2);
    md+=`Medyan ${q(0.5)}R, %5 ${q(0.05)}R, %95 ${q(0.95)}R, en kötü ${fx(a[0],1)}R, en iyi ${fx(a[a.length-1],1)}R; en iyi %1 hariç ortalama ${fx(mean(a.slice(0,Math.floor(a.length*0.99))))}R, en kötü %1 hariç ${fx(mean(a.slice(Math.ceil(a.length*0.01))))}R.\n`; }
  // Ozan
  if(O[vk(12,4)].length){ const oa=O[vk(12,4)]; const S0=Math.min(...oa.map(x=>x.t)), S1=Math.max(...oa.map(x=>x.t)); const Q=L.periods(S0,S1);
    md+=`\n## Ozan sırasıyla kıyas (${iso(S0)} → ${iso(S1)}, örneklem dışı tahminler)\n\nOzan (lambdarank, 12 sa modeli): her saat evrenin alt onda biri short, üst onda biri long; aynı giriş/çıkış/stop ve coin+yön başına tek işlem kuralı. R birimi max(%1,5; 1,2 × ATR15) (masanın stop formülü). Masa aynı dönemle sınırlandı. Hücre: tümü / 1. yarı / 2. yarı / son 12 ay (dönem bu pencerenin içinde).\n\n| ufuk · stop | Ozan işlem | Ozan R | Ozan % / işlem | Ozan long R | Ozan short R | masa işlem | masa R | masa % / işlem |\n|---|---:|---|---|---|---|---:|---|---|\n`;
    for(const h of HS) for(const K of KS){ const o=O[vk(h,K)], m=R[vk(h,K)].filter(x=>x.t>=S0); const g=b=>[b,...Object.values(Q).map(f=>b.filter(f))];
      md+=`| ${h} sa · ${kn(K)} | ${ny(o.length)} | ${g(o).map(b=>cell(b)).join(' / ')} | ${g(o).map(b=>fx(100*mean(b.map(x=>x.pct)),3)).join(' / ')} | ${g(o.filter(x=>x.dir==='long')).map(b=>cell(b)).join(' / ')} | ${g(o.filter(x=>x.dir==='short')).map(b=>cell(b)).join(' / ')} | ${ny(m.length)} | ${g(m).map(b=>cell(b)).join(' / ')} | ${g(m).map(b=>fx(100*mean(b.map(x=>x.pct)),3)).join(' / ')} |\n`; }
  }
  md=md.replace(/%(\d+)\.(\d)/g,'%$1,$2');
  fs.writeFileSync(path.join(__dirname,'test40-ufuk-report.md'),md); console.log(md);
}
main().catch(e=>{ console.error(e); process.exit(1); });
