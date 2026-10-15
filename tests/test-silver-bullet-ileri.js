// Silver Bullet ileriye dönük izleme (11 Ekim 2026; kullanıcı "izleyelim, veri toplamış oluruz").
// Kâğıt üstünde kayıt: para yok, bot yok. Haftada bir:
//   node tests/fetch-sb.js --since 2026-10-09            → tests/data/sb1m-ileri/ (başlangıçtan 3 gün önce, seviyeler için)
//   node tests/test-silver-bullet.js --dir tests/data/sb1m-ileri --trades tests/data/sb-tr-ileri.jsonl --out tests/data/sb-result-ileri.json
//   node tests/test-silver-bullet-ileri.js > silver-bullet-ileri.md
// Başlangıç 2026-10-12 (pazartesi): bu tarihten önceki işlemler kayda girmez. Kanıt eşiği: PM'de ≥100 işlem ve iki yarıda plasebodan iyi.
const fs=require('fs');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const START=Date.parse(arg('start','2026-10-12')+'T04:00Z');
const T=fs.readFileSync(arg('trades','tests/data/sb-tr-ileri.jsonl'),'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(x=>x.t>=START).sort((a,b)=>a.te-b.te);
const f2=x=>(x>=0?'+':'')+x.toFixed(2).replace('.',','), f3=x=>(x>=0?'+':'')+x.toFixed(3).replace('.',',');
const agg=a=>{ const n=a.length; if(!n) return null; const m=a.reduce((s,x)=>s+x,0)/n; const sd=Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/Math.max(n-1,1)); return {n,m,t:sd>0&&n>1?m/(sd/Math.sqrt(n)):0}; };
const nyF=new Intl.DateTimeFormat('tr-TR',{timeZone:'America/New_York',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short'});
const nyDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const last=T.length?nyDay.format(new Date(T[T.length-1].te)):'–';
const out=[]; const w=s=>out.push(s);
w(`# Silver Bullet · ileriye dönük kayıt (başlangıç ${arg('start','2026-10-12')}, son işlem ${last})\n`);
w('Kâğıt üstünde ölçüm: ana kural (süpürme → MSS → FVG limit, %0,05 geçmeli dolum), 10 coin, hafta içi, maliyet dahil. Plasebo: aynı pencerede rastgele dakika ve yön, aynı stop ve hedef. Kanıt eşiği: PM\'de ≥100 işlem, plasebodan iyi ve iki yarısında da iyi.\n');
w('| Pencere | işlem | net R | brüt R | kazanma | plasebo | fark (t) | toplam net R |'); w('|---|---|---|---|---|---|---|---|');
for(const wn of ['PM','AM','Londra','ALL']){ const a=wn==='ALL'?T:T.filter(x=>x.w===wn); if(!a.length){ w(`| ${wn} | 0 | – | – | – | – | – | – |`); continue; }
  const s=agg(a.map(x=>x.rn)), b=agg(a.map(x=>x.r)), p=agg(a.map(x=>x.p)), e=agg(a.map(x=>x.rn-x.p));
  w(`| ${wn==='ALL'?'Üçü':wn} | ${s.n} | ${f3(s.m)} | ${f3(b.m)} | %${Math.round(100*a.filter(x=>x.rn>0).length/a.length)} | ${f3(p.m)} | ${f3(e.m)} (${f2(e.t)}) | ${f2(s.m*s.n)} |`); }
const pm=T.filter(x=>x.w==='PM');
if(pm.length>=2){ const h=Math.floor(pm.length/2); const a=agg(pm.slice(0,h).map(x=>x.rn-x.p)), b=agg(pm.slice(h).map(x=>x.rn-x.p));
  w(`\nPM iki yarı (plasebo farkı): ilk ${a.n} işlem ${f3(a.m)}, son ${b.n} işlem ${f3(b.m)}.\n`); }
w('\nPM haftalık (NY pazartesi başlangıçlı):\n'); w('| Hafta | işlem | net R | plasebo farkı |'); w('|---|---|---|---|');
const wk={}; for(const x of pm){ const d=new Date(nyDay.format(new Date(x.te))+'T00:00Z'); const mon=new Date(d-((d.getUTCDay()+6)%7)*864e5).toISOString().slice(0,10); (wk[mon]=wk[mon]||[]).push(x); }
for(const k of Object.keys(wk).sort()){ const a=wk[k]; w(`| ${k} | ${a.length} | ${f3(agg(a.map(x=>x.rn)).m)} | ${f3(agg(a.map(x=>x.rn-x.p)).m)} |`); }
w('\nPM işlemleri:\n'); w('| NY zamanı | Coin | Yön | Çıkış | R |'); w('|---|---|---|---|---|');
for(const x of pm) w(`| ${nyF.format(new Date(x.te))} | ${x.sym.replace('USDT','')} | ${x.dir>0?'long':'short'} | ${x.ex} | ${f2(x.rn)} |`);
process.stdout.write(out.join('\n')+'\n');
