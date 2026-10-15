// test-silver-bullet.js çıktılarından Markdown rapor (11 Ekim 2026).
// Kullanım: node tests/test-silver-bullet-report.js > tests/test-silver-bullet-report.md
const fs=require('fs'), path=require('path'); const D=path.join(__dirname,'data');
const ld=f=>fs.existsSync(path.join(D,f))?JSON.parse(fs.readFileSync(path.join(D,f),'utf8')):null;
const r1=ld('sb-result-1m.json'), r5=ld('sb-result-5m.json'), rh=ld('sb-result-1m-hours.json'), rw=ld('sb-result-1m-weekend.json');
const f2=x=>x.toFixed(2).replace('.',','), f3=x=>(x>=0?'+':'')+x.toFixed(3).replace('.',',');
const st=(R,k)=>{ const o=R.ST[k]; if(!o||!o.n) return null; const m=o.s/o.n, sd=Math.sqrt(Math.max(o.s2/o.n-m*m,0)); return {n:o.n,m,t:sd>0?m/(sd/Math.sqrt(o.n)):0,w:o.w/o.n}; };
const cell=(R,k)=>{ const s=st(R,k); return s?`${f3(s.m)} (n ${s.n}, t ${f2(s.t)})`:'–'; };
const P=['all','H1','H2','Y12'], PN={all:'Tümü',H1:'1. yarı (2020-01 → 05/2023)',H2:'2. yarı (06/2023 → 10/2026)',Y12:'Son 12 ay'};
const WIN=['Londra','AM','PM','ALL'], WN={Londra:'Londra 03–04',AM:'AM 10–11',PM:'PM 14–15',ALL:'Üçü birlikte'};
const out=[]; const w=s=>out.push(s);
function main(R,tag){
  const M='sweep|liq|through';
  w(`### ${tag}: ana kural (süpürme stopu, likidite hedefi, %0,05 geçmeli limit dolumu)\n`);
  w('Net R/işlem (maker giriş, stop/zaman taker+kayma, hedef maker). Plasebo: aynı pencere, rastgele dakika, market giriş, aynı stop % ve hedef R.\n');
  w('| Pencere | Dönem | Silver Bullet | brüt | P-rastgele yön | P-aynı yön | kazanma |'); w('|---|---|---|---|---|---|---|');
  for(const wn of WIN) for(const p of P){ const s=st(R,`${M}|${wn}|${p}`); const b=st(R,`${M}|${wn}|${p}|brut`);
    w(`| ${WN[wn]} | ${PN[p]} | ${cell(R,`${M}|${wn}|${p}`)} | ${b?f3(b.m):'–'} | ${cell(R,`P-rast|${wn}|${p}`)} | ${cell(R,`P-yon|${wn}|${p}`)} | ${s?'%'+Math.round(s.w*100):'–'} |`); }
  w('');
  w('Kurulum, dolum ve çıkışlar (Tümü):\n'); w('| Pencere | kurulum | dolmayan | işlem | stop | hedef | zaman | ort. stop % | ort. hedef R |'); w('|---|---|---|---|---|---|---|---|---|');
  for(const wn of ['Londra','AM','PM']){ const x=R.EXTRA[`${wn}|all`]||{}; const n=x.n||0;
    w(`| ${WN[wn]} | ${x.setup||0} | ${x.nofill||0} | ${n} | ${x.stop||0} | ${x.hedef||0} | ${x.zaman||0} | ${n?f2(100*x.sp/n):'–'} | ${n?f2(x.R/n):'–'} |`); }
  w('');
}
function variants(R,tag){
  w(`### ${tag}: varyantlar (üç pencere birlikte, net R)\n`); w('| stop | hedef | dolum | Tümü | 1. yarı | 2. yarı | Son 12 ay |'); w('|---|---|---|---|---|---|---|');
  for(const sv of ['sweep','fvg']) for(const tv of ['liq',1,2,3]) for(const fv of ['through','touch','market']){ const id=`${sv}|${tv}|${fv}`;
    w(`| ${sv==='sweep'?'süpürme ucu':'FVG 1. mum'} | ${tv==='liq'?'likidite':tv+'R'} | ${fv==='through'?'limit, %0,05 geçmeli':fv==='touch'?'limit, değme':'market (FVG sonrası ilk mum açılışı)'} | ${P.map(p=>cell(R,`${id}|ALL|${p}`)).join(' | ')} |`); }
  w('');
}
function splits(R,tag){
  w(`### ${tag}: kırılımlar (ana kural)\n`);
  w('| Kırılım | '+P.map(p=>PN[p]).join(' | ')+' |'); w('|---|---|---|---|---|');
  for(const d of ['long','short']) for(const wn of ['Londra','AM','PM']) w(`| ${d} · ${WN[wn]} | ${P.map(p=>cell(R,`MAIN|${d}|${wn}|${p}`)).join(' | ')} |`);
  for(const b of ['<0,2','0,2–0,4','0,4–0,8','≥0,8']) w(`| stop ${b} % | ${P.map(p=>cell(R,`MAIN|stop${b}|${p}`)).join(' | ')} |`);
  const syms=[...new Set(Object.keys(R.ST).filter(k=>k.startsWith('MAIN|sym:')).map(k=>k.split('|')[1]))].sort();
  for(const s of syms) w(`| ${s.slice(4)} | ${P.map(p=>cell(R,`MAIN|${s}|${p}`)).join(' | ')} |`);
  w('');
  const years=[...new Set(Object.keys(R.ST).map(k=>k.split('|').pop()).filter(x=>/^y\d{4}$/.test(x)))].sort();
  w('Yıl yıl (üç pencere, net R · plasebo rastgele yön):\n'); w('| Yıl | Silver Bullet | P-rastgele | P-aynı yön |'); w('|---|---|---|---|');
  for(const y of years) w(`| ${y.slice(1)} | ${cell(R,`sweep|liq|through|ALL|${y}`)} | ${cell(R,`P-rast|ALL|${y}`)} | ${cell(R,`P-yon|ALL|${y}`)} |`);
  w('');
}
if(r1){ main(r1,'1 dk'); variants(r1,'1 dk'); splits(r1,'1 dk'); }
if(r5){ main(r5,'5 dk'); variants(r5,'5 dk'); }
if(rw){ w('### Hafta sonu dahil (1 dk, ana kural)\n'); w('| Pencere | '+P.map(p=>PN[p]).join(' | ')+' |'); w('|---|---|---|---|---|');
  for(const wn of WIN) w(`| ${WN[wn]} | ${P.map(p=>cell(rw,`sweep|liq|through|${wn}|${p}`)).join(' | ')} |`); w(''); }
if(rh){ w('### Saat profili: aynı kural her saat başı penceresinde (1 dk, NY saati, çıkış pencere sonundan 4 sa sonra)\n');
  w('| NY saati | '+P.map(p=>PN[p]).join(' | ')+' |'); w('|---|---|---|---|---|');
  for(let h=0;h<24;h++){ const wn='h'+String(h).padStart(2,'0'); w(`| ${String(h).padStart(2,'0')}:00${[3,10,14].includes(h)?' **SB**':''} | ${P.map(p=>cell(rh,`sweep|liq|through|${wn}|${p}`)).join(' | ')} |`); } w(''); }
process.stdout.write(out.join('\n')+'\n');
