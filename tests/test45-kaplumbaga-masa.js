// Test #45 (10 Ekim 2026, dongu/2026-10-10-r-kaldiraclari.md §10): Kaplumbağa girişini masanın son toplantısıyla süz.
// İşlemler: tests/research-daily-wide.js çıktısı tests/data/arch/daily-wide-trades.json (ayın ilk 50 coini, kapanışta sinyal, ertesi açılışta giriş,
// 2N kapanış stopu, 4N felaket, %0,08 + fonlama; R = getiri ÷ 2N). Masa: masa örnekleri (ayın ilk 30 coini, 4 saatte bir) içinde girişten
// (ertesi gün açılışı) önceki son long toplantı, en çok 8 sa önce. "gir" = veto yok, puan ≥ 35, evet ≥ 3. Ayrıca son 24 sa'te en az bir "gir".
// Rastgele taban: masa verisi olan işlemlerde "gir" etiketleri karıştırılır (10.000 kez) → farkın p değeri. Puan ile R'nin Spearman'ı.
// Kullanım: node tests/test45-kaplumbaga-masa.js → tests/test45-kaplumbaga-masa-report.md
const fs=require('fs'), path=require('path'), readline=require('readline');
const L=require('./test40-lib.js'); const {M15,H,DAY,mean,sdev,fx,ny,iso}=L;
async function loadLong(){ const by={};
  for(const f of fs.readdirSync(L.ARCH).filter(f=>/^samples-\d+\.jsonl$/.test(f)).sort()){
    const rl=readline.createInterface({input:fs.createReadStream(path.join(L.ARCH,f))});
    for await(const l of rl){ if(!l||l.indexOf('"dir":"long"')<0) continue; const s=JSON.parse(l); if(s.dir!=='long'||s.score==null) continue;
      (by[s.sym]=by[s.sym]||[]).push({t:s.t+M15,score:s.score,gir:!s.veto&&s.score>=0.35&&s.yes>=3}); } }
  for(const s in by) by[s].sort((a,b)=>a.t-b.t); return by; }
let seed=12345; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
const spear=(x,y)=>{ const rk=a=>{ const o=a.map((v,i)=>[v,i]).sort((p,q)=>p[0]-q[0]); const r=new Array(a.length); o.forEach(([,i],j)=>r[i]=j); return r; }; const a=rk(x),b=rk(y), ma=mean(a), mb=mean(b); let s=0,sa=0,sb=0; for(let i=0;i<a.length;i++){ s+=(a[i]-ma)*(b[i]-mb); sa+=(a[i]-ma)**2; sb+=(b[i]-mb)**2; } return s/Math.sqrt(sa*sb); };
(async()=>{
  const M=await loadLong(); const W=JSON.parse(fs.readFileSync(path.join(L.ARCH,'daily-wide-trades.json'),'utf8'));
  const pick=[['T1',1,false,true,'Kaplumbağa 1 (20/10) long + BTC > SMA200 · sepetin kuralı'],['T1',1,false,false,'Kaplumbağa 1 long, süzgeçsiz'],['T2',1,false,true,'Kaplumbağa 2 (55/20) long + BTC süzgeci'],['B10',1,false,true,'10 g kırılım long + BTC süzgeci']];
  let md=`# Test #45 · Kaplumbağa girişi + masanın "gir" demesi (arşiv)\n\n10 Ekim 2026 · \`node tests/test45-kaplumbaga-masa.js\` · tanım \`dongu/2026-10-10-r-kaldiraclari.md\` §10\n\n`;
  md+=`İşlemler \`research-daily-wide.js\`'ten (ayın ilk 50 coini, delist dahil, kapanışta sinyal, ertesi açılışta giriş, %0,08 + fonlama, R = getiri ÷ 2N). Masa: girişten önceki son long toplantı (en çok 8 sa önce; masa yalnız ayın ilk 30 coininde ve 4 saatte bir toplanıyor). **gir** = veto yok, puan ≥ 35, evet ≥ 3. **24 sa** = girişten önceki 24 sa'te en az bir "gir". Rastgele taban: masa verisi olan işlemlerde etiketleri 10.000 kez karıştırıp "gir − girme" farkının bu kadar büyük çıkma olasılığı (p, tek yönlü). R ortalamaları kalın kuyruklu: medyan ve en iyi %5 hariç ortalama da verildi.\n\n`;
  for(const [nm,d,pyr,filt,ad] of pick){ const v=W.find(x=>x.name===nm&&x.d===d&&x.pyr===pyr&&x.filt===filt); if(!v) continue;
    const tr=v.tr.map(([s,ti,to,R,ret])=>{ const a=M[s]||[]; let lo=0,hi=a.length; while(lo<hi){ const m=(lo+hi)>>1; if(a[m].t<=ti) lo=m+1; else hi=m; } const last=lo>0&&a[lo-1].t>=ti-8*H?a[lo-1]:null;
      let any=false; for(let j=lo-1;j>=0&&a[j].t>=ti-DAY;j--) if(a[j].gir){ any=true; break; } return {s,t:ti,R,ret,has:!!last,gir:last?last.gir:null,score:last?last.score:NaN,any:last?any:null}; });
    const T0=Math.min(...tr.map(x=>x.t)), T1=Math.max(...tr.map(x=>x.t)); const P=L.periods(T0,T1); const PV=Object.values(P);
    const st=a=>{ if(!a.length) return '— (0)'; const r=a.map(x=>x.R).sort((p,q)=>p-q); const trim=r.slice(0,Math.max(1,Math.floor(r.length*0.95))); return `${fx(mean(r),2)} · med ${fx(r[Math.floor((r.length-1)/2)],2)} · %95'i ${fx(mean(trim),2)} (${ny(a.length)})`; };
    const sub=a=>[a,...PV.map(f=>a.filter(f))].map(b=>b.length?fx(mean(b.map(x=>x.R)),2):'—').join(' / ');
    const H_=tr.filter(x=>x.has); md+=`## ${ad}\n\n${ny(tr.length)} işlem (${iso(T0)} → ${iso(T1)}), masa verisi olan ${ny(H_.length)}.\n\n| grup | R (ort · medyan · en iyi %5 hariç) | R tümü / 1. yarı / 2. yarı / son 12 ay |\n|---|---|---|\n`;
    const G=[['hepsi',tr],['masa verisi yok',tr.filter(x=>!x.has)],['masa verisi var',H_],['**son toplantı gir**',H_.filter(x=>x.gir)],['son toplantı girme',H_.filter(x=>!x.gir)],['son 24 sa en az bir gir',H_.filter(x=>x.any)],['son 24 sa hiç gir yok',H_.filter(x=>!x.any)]];
    for(const [g,a] of G) md+=`| ${g} | ${st(a)} | ${sub(a)} |\n`;
    // karıştırma
    for(const key of ['gir','any']){ const lab=H_.map(x=>x[key]), r=H_.map(x=>x.R), k=lab.filter(Boolean).length; if(!k||k===lab.length) continue;
      const diff=lb=>{ let a=0,b=0; for(let i=0;i<r.length;i++){ if(lb[i]) a+=r[i]; else b+=r[i]; } return a/k-b/(r.length-k); }; const obs=diff(lab); let ge=0; const lb=lab.slice();
      for(let it=0;it<10000;it++){ for(let i=lb.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [lb[i],lb[j]]=[lb[j],lb[i]]; } if(diff(lb)>=obs) ge++; }
      // en iyi %5 hariç fark
      const cut=[...r].sort((p,q)=>p-q)[Math.floor(r.length*0.95)]; const ia=H_.filter((x,i)=>x[key]&&x.R<cut).map(x=>x.R), ib=H_.filter(x=>!x[key]&&x.R<cut).map(x=>x.R);
      md+=`\n${key==='gir'?'Son toplantı':'Son 24 sa'}: fark ${fx(obs,2)}R, karıştırma p = ${(ge/10000).toFixed(3).replace('.',',')}; en iyi %5 hariç fark ${fx(mean(ia)-mean(ib),2)}R.`; }
    md+=` Puan ile R Spearman ${fx(spear(H_.map(x=>x.score),H_.map(x=>x.R)),3)}.\n\n`;
    const yrs=[...new Set(tr.map(x=>new Date(x.t).getUTCFullYear()))].sort();
    md+=`| yıl | ${yrs.join(' | ')} |\n|---|${yrs.map(()=>'---:').join('|')}|\n`;
    for(const [g,a] of [['gir',H_.filter(x=>x.gir)],['girme',H_.filter(x=>!x.gir)],['veri yok',tr.filter(x=>!x.has)]]) md+=`| ${g} | ${yrs.map(y=>{ const b=a.filter(x=>new Date(x.t).getUTCFullYear()===y); return b.length?`${fx(mean(b.map(x=>x.R)),2)} (${b.length})`:'—'; }).join(' | ')} |\n`;
    md+='\n'; }
  fs.writeFileSync(path.join(__dirname,'test45-kaplumbaga-masa-report.md'),md); console.log(md);
})().catch(e=>{ console.error(e); process.exit(1); });
