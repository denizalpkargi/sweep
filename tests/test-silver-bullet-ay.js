// Silver Bullet · son 30 gün ve "pencereler yer değiştiriyor mu" (11 Ekim 2026).
// Girdi: test-silver-bullet.js --trades çıktıları (ana koşu ve --hours koşusu).
// Kullanım: node tests/test-silver-bullet-ay.js --main tests/data/sb-tr-main.jsonl --hours tests/data/sb-tr-hours.jsonl > tests/test-silver-bullet-ay-report.md
const fs=require('fs');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const rd=f=>fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const M=rd(arg('main','tests/data/sb-tr-main.jsonl')), H=rd(arg('hours','tests/data/sb-tr-hours.jsonl'));
const END=Math.max(...M.map(x=>x.t))+864e5, FROM=END-30*864e5;
const nyF=new Intl.DateTimeFormat('tr-TR',{timeZone:'America/New_York',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short'});
const nyMonth=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit'});
const f2=x=>(x>=0?'+':'')+x.toFixed(2).replace('.',','), f3=x=>(x>=0?'+':'')+x.toFixed(3).replace('.',',');
const agg=a=>{ const n=a.length; if(!n) return null; const m=a.reduce((s,x)=>s+x,0)/n; const sd=Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/Math.max(n-1,1)); return {n,m,t:sd>0?m/(sd/Math.sqrt(n)):0}; };
const cell=a=>{ const s=agg(a); return s?`${f3(s.m)} (n ${s.n}, t ${f2(s.t).replace('+','')})`:'–'; };
const out=[]; const w=s=>out.push(s);
const d0=new Date(FROM).toISOString().slice(0,10), d1=new Date(END-864e5).toISOString().slice(0,10);
w(`# Silver Bullet · son 30 gün ve saatlerin kayması (${d0} → ${d1})\n`);
// A) son 30 gün, üç pencere
const last=M.filter(x=>x.t>=FROM);
w('## A) Son 30 gün, üç Silver Bullet penceresi (ana kural, 10 coin, hafta içi)\n');
w('| Pencere | işlem | net R | brüt R | kazanma | plasebo (rastgele) | fark |'); w('|---|---|---|---|---|---|---|');
for(const wn of ['Londra','AM','PM','ALL']){ const a=wn==='ALL'?last:last.filter(x=>x.w===wn); if(!a.length){ w(`| ${wn} | 0 | – | – | – | – | – |`); continue; }
  const s=agg(a.map(x=>x.rn)), b=agg(a.map(x=>x.r)), p=agg(a.map(x=>x.p)), e=agg(a.map(x=>x.rn-x.p));
  w(`| ${wn==='ALL'?'Üçü birlikte':wn} | ${s.n} | ${f3(s.m)} (t ${f2(s.t)}) | ${f3(b.m)} | %${Math.round(100*a.filter(x=>x.rn>0).length/a.length)} | ${f3(p.m)} | ${f3(e.m)} (t ${f2(e.t)}) |`); }
w('\nİşlemler (NY saati; R net):\n'); w('| Pencere | NY zamanı (giriş) | Coin | Yön | Çıkış | R |'); w('|---|---|---|---|---|---|');
for(const x of last.sort((a,b)=>a.te-b.te)) w(`| ${x.w} | ${nyF.format(new Date(x.te))} | ${x.sym.replace('USDT','')} | ${x.dir>0?'long':'short'} | ${x.ex} | ${f2(x.rn)} |`);
w('');
// B) son 30 gün saat profili
const hl=H.filter(x=>x.t>=FROM); const hour=x=>+x.w.slice(1);
w('## B) Son 30 gün, aynı kural her saat başı penceresinde (NY saati, çıkış pencere sonundan 4 sa sonra)\n');
w('| NY saati | işlem | net R | brüt R | plasebo | fark (net − plasebo) |'); w('|---|---|---|---|---|---|');
const lastProf=[]; for(let h=0;h<24;h++){ const a=hl.filter(x=>hour(x)===h); const s=agg(a.map(x=>x.rn)); if(!s){ w(`| ${h}:00 | 0 | | | | |`); continue; } lastProf.push([h,s.m,s.n]);
  w(`| ${String(h).padStart(2,'0')}:00${[3,10,14].includes(h)?' **SB**':''} | ${s.n} | ${f3(s.m)} (t ${f2(s.t)}) | ${f3(agg(a.map(x=>x.r)).m)} | ${f3(agg(a.map(x=>x.p)).m)} | ${cell(a.map(x=>x.rn-x.p))} |`); }
const pos=lastProf.filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
w(`\nSon 30 günde net R'si artı saatler: ${pos.length?pos.map(x=>`${String(x[0]).padStart(2,'0')}:00 ${f3(x[1])} (n ${x[2]})`).join(', '):'yok'}.\n`);
// C) kayma: aylık saat profilleri
const byM={}; for(const x of H){ const m=nyMonth.format(new Date(x.t)); const h=hour(x); ((byM[m]=byM[m]||{})[h]=byM[m][h]||[]).push(x); }
const months=Object.keys(byM).sort();
const prof=(m,f)=>{ const o=new Array(24).fill(NaN); for(let h=0;h<24;h++){ const a=(byM[m]||{})[h]; if(a&&a.length>=3) o[h]=a.reduce((s,x)=>s+f(x),0)/a.length; } return o; };
const rank=a=>{ const idx=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]); const r=new Array(a.length); idx.forEach(([v,i],k)=>r[i]=k); return r; };
const spear=(a,b)=>{ const ok=a.map((v,i)=>isFinite(v)&&isFinite(b[i])); const A=a.filter((_,i)=>ok[i]), B=b.filter((_,i)=>ok[i]); if(A.length<10) return NaN;
  const ra=rank(A), rb=rank(B), n=A.length, ma=(n-1)/2; let s=0,sa=0,sb=0; for(let i=0;i<n;i++){ s+=(ra[i]-ma)*(rb[i]-ma); sa+=(ra[i]-ma)**2; sb+=(rb[i]-ma)**2; } return s/Math.sqrt(sa*sb); };
const exc=x=>x.rn-x.p;
const rho=[]; for(let i=1;i<months.length;i++){ const r=spear(prof(months[i-1],exc),prof(months[i],exc)); if(isFinite(r)) rho.push([months[i],r]); }
w('## C) Saatler aydan aya yer değiştiriyor mu?\n');
const rs=agg(rho.map(x=>x[1]))||{m:NaN,t:NaN};
w(`Her ay için 24 saatin "net R − plasebo" sıralaması ile bir sonraki ayın sıralaması arasındaki Spearman korelasyonu (${rho.length} ay çifti): ortalama ${f3(rs.m)} (t ${f2(rs.t)}), artı olan ay çifti %${Math.round(100*rho.filter(x=>x[1]>0).length/rho.length)}. Son 12 ay çifti: ${rho.slice(-12).map(x=>f2(x[1])).join(' · ')}.\n`);
// geçen ayın / son 3 ayın en iyi 3 saati
w('Kural: geçen ayın (ya da son 3 ayın) en iyi 3 saatini seç, bu ay yalnız o saatlerde işlem aç. Kıyas: aynı ay tüm saatler.\n');
w('| Seçim | dönem | seçilen saatler net R | tüm saatler net R | seçilen − tümü |'); w('|---|---|---|---|---|');
const MID='2023-06', Y12=months[months.length-12];
for(const [nm,look,crit] of [['geçen ay, net R',1,x=>x.rn],['son 3 ay, net R',3,x=>x.rn],['geçen ay, net − plasebo',1,exc],['son 3 ay, net − plasebo',3,exc]]){
  const sel={all:[],H1:[],H2:[],Y:[]}, base={all:[],H1:[],H2:[],Y:[]};
  for(let i=look;i<months.length;i++){ const m=months[i]; const sc=new Array(24).fill(0).map((_,h)=>{ let s=0,n=0; for(let j=i-look;j<i;j++){ const a=(byM[months[j]]||{})[h]||[]; for(const x of a){ s+=crit(x); n++; } } return n>=5?s/n:-Infinity; });
    const top=sc.map((v,h)=>[v,h]).sort((a,b)=>b[0]-a[0]).slice(0,3).map(x=>x[1]);
    const ks=['all',m<MID?'H1':'H2',...(m>=Y12?['Y']:[])];
    for(let h=0;h<24;h++) for(const x of (byM[m][h]||[])){ for(const k of ks){ base[k].push(x.rn); if(top.includes(h)) sel[k].push(x.rn); } } }
  for(const [k,kn] of [['all','tümü'],['H1','1. yarı'],['H2','2. yarı'],['Y','son 12 ay']]){ const s=agg(sel[k]), b=agg(base[k]); w(`| ${nm} | ${kn} | ${cell(sel[k])} | ${f3(b.m)} | ${f3(s.m-b.m)} |`); } }
w('');
// yıl yıl en iyi 3 saat
w('Yıl yıl en iyi 3 saat (net R; hiçbiri artı olmak zorunda değil):\n'); w('| Yıl | 1. | 2. | 3. | SB saatleri (03 / 10 / 14) |'); w('|---|---|---|---|---|');
const years=[...new Set(H.map(x=>new Date(x.t).getUTCFullYear()))].sort();
for(const y of years){ const a=H.filter(x=>new Date(x.t).getUTCFullYear()===y); const pr=[]; for(let h=0;h<24;h++){ const b=a.filter(x=>hour(x)===h); if(b.length) pr.push([h,agg(b.map(x=>x.rn)).m]); }
  const top=pr.slice().sort((p,q)=>q[1]-p[1]).slice(0,3); const sb=[3,10,14].map(h=>{ const z=pr.find(p=>p[0]===h); return z?f3(z[1]):'–'; }).join(' / ');
  w(`| ${y} | ${top.map(x=>`${String(x[0]).padStart(2,'0')}:00 ${f3(x[1])}`).join(' | ')} | ${sb} |`); }
w('');
process.stdout.write(out.join('\n')+'\n');
