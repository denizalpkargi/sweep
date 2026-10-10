// Kaplumbağa sepeti ay ay: turtle-test.js --replay ile aynı tekrar oynatma (canlı kod, TT_DEF ayarları), başlangıç 1000 $.
// Her ay sonu özkaynağı (açık pozisyonlar kapanışla değerlenir) → aylık $ ve %, yıl yıl özet.
// Veri: tests/data/arch (node tests/fetch-archive.js --only 1d --no-funding yeter). Fonlama yok (turtle-test ile aynı).
// Kullanım: node tests/turtle-monthly.js [--bal 1000] [--out tests/turtle-monthly-report.md]
const path=require('path'), fs=require('fs');
const {loadEngine}=require('./engine-node.js');
const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const BAL=+arg('bal',1000), OUT=arg('out',path.join(__dirname,'turtle-monthly-report.md'));
const DAY=864e5, ARCH=arg('arch',path.join(__dirname,'data','arch'));
if(!fs.existsSync(path.join(ARCH,'universe.json'))){ console.log('arşiv yok: önce node tests/fetch-archive.js --only 1d --no-funding'); process.exit(1); }
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const TOP=50;
const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)))];
const D={}; for(const sym of syms){ const f=path.join(ARCH,'1d',sym+'.csv'); if(!fs.existsSync(f)) continue; D[sym]=fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); }
const idx={}; for(const k in D) idx[k]=new Map(D[k].map((b,i)=>[b.t,i]));
const s=E.ttNew({fee:0.0005,slip:0.0003,bal0:BAL}); const t0=Date.UTC(2020,5,1), t1=D.BTCUSDT[D.BTCUSDT.length-1].t;
const months=[]; let cur=null, mEq0=BAL, peak=BAL, mdd=0;
for(let t=t0;t<t1;t+=DAY){
  for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) E.ttIntraday(s,k,D[k][i],t); }
  const m=new Date(t).toISOString().slice(0,7); const univ=(U[m]||[]).slice(0,TOP).filter(k=>idx[k]&&idx[k].has(t));
  const need=new Set([...univ,...Object.keys(s.pos),'BTCUSDT']); const data={}, px={};
  for(const k of need){ const i=idx[k]&&idx[k].get(t); if(i==null||i<130) continue; data[k]=D[k].slice(Math.max(0,i-215),i+1); const nx=D[k][i+1]; if(nx) px[k]=nx.o; }
  for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null&&i===D[k].length-1) E.ttExit(s,k,D[k][i].c,'listeden çıktı',t); }
  const nT=s.trades.length; E.ttClose(s,data,univ,px,t+DAY);
  for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) s.pos[k].px=D[k][i].c; }
  const eq=E.ttEq(s,null); peak=Math.max(peak,eq); mdd=Math.max(mdd,1-eq/peak);
  if(!cur||cur.m!==m){ cur={m,eq0:mEq0,eq:eq,n:0,open:0}; months.push(cur); }
  cur.eq=eq; cur.n+=s.trades.length-nT; cur.open=Object.keys(s.pos).length; mEq0=eq;
  // ay sonu: sonraki gün yeni ayda ise bu ayın kapanışı
  if(new Date(t+DAY).toISOString().slice(0,7)!==m){ cur.eq=eq; mEq0=eq; }
}
// ay başı özkaynağı = önceki ayın sonu
for(let i=0;i<months.length;i++){ months[i].eq0=i?months[i-1].eq:BAL; months[i].d=months[i].eq-months[i].eq0; months[i].p=months[i].d/months[i].eq0; }
const last=months[months.length-1]; const full=new Date(t1+DAY).getUTCDate()===1; const M=full?months:months.slice(0,-1); // yarım ayı istatistikten çıkar
const tr=n=>n.toLocaleString('tr-TR',{maximumFractionDigits:0}), pc=x=>(x>=0?'+':'−')+'%'+Math.abs(x*100).toLocaleString('tr-TR',{maximumFractionDigits:1}), dl=x=>(x>=0?'+':'−')+tr(Math.abs(x))+' $';
const med=a=>{ const b=[...a].sort((x,y)=>x-y), h=b.length>>1; return b.length%2?b[h]:(b[h-1]+b[h])/2; };
const sum=(a)=>a.reduce((x,y)=>x+y,0);
const P=M.map(x=>x.p), geo=Math.pow(M[M.length-1].eq/BAL,1/M.length)-1;
const best=M.reduce((a,b)=>b.p>a.p?b:a), worst=M.reduce((a,b)=>b.p<a.p?b:a);
const flat=M.filter(x=>Math.abs(x.p)<0.0005).length;
// sabit 1000 $ ile (her ay 1000 $'dan başlasa): $ = % × 1000
const L=[];
L.push(`# Kaplumbağa sepeti ay ay · ${BAL} $ başlangıç`,'');
L.push(`Canlı kod (src/turtle.js, TT_DEF: %0,5 risk, 10 pozisyon, 2x nominal, 20/10, BTC > SMA200), arşivde ${new Date(t0).toISOString().slice(0,7)} → ${last.m}. Komisyon + kayma var, fonlama yok. Toplam ${s.trades.length} işlem, en büyük düşüş −%${(mdd*100).toFixed(0)}, son özkaynak ${tr(last.eq)} $.`,'');
L.push(`## Özet (${M.length} tam ay)`,'');
L.push('| | Değer |','|---|---|');
L.push(`| Bileşik aylık (geometrik) | ${pc(geo)} |`);
L.push(`| Ortalama ay (aritmetik) | ${pc(sum(P)/P.length)} · 1000 $'da ${dl(1000*sum(P)/P.length)} |`);
L.push(`| Medyan ay | ${pc(med(P))} · 1000 $'da ${dl(1000*med(P))} |`);
L.push(`| Kayıplı ay | ${M.filter(x=>x.p<0).length} / ${M.length} (%${(100*M.filter(x=>x.p<0).length/M.length).toFixed(0)}) |`);
L.push(`| İşlemsiz/düz ay (±%0,05) | ${flat} |`);
L.push(`| En iyi ay | ${best.m} ${pc(best.p)} |`);
L.push(`| En kötü ay | ${worst.m} ${pc(worst.p)} |`);
const l24=M.slice(-24).map(x=>x.p);
L.push(`| Son 24 ay: ortalama / medyan / kayıplı | ${pc(sum(l24)/l24.length)} / ${pc(med(l24))} / ${l24.filter(x=>x<0).length} ay |`,'');
L.push('## Yıl yıl','','| Yıl | Ay | Yıl getirisi | Yıla 1000 $'la başlasa → | Ortalama ay | Medyan ay | Kayıplı ay | En iyi | En kötü | İşlem |','|---|---|---|---|---|---|---|---|---|---|');
for(const y of [...new Set(M.map(x=>x.m.slice(0,4)))]){
  const a=M.filter(x=>x.m.startsWith(y)), g=a.reduce((e,x)=>e*(1+x.p),1)-1, p=a.map(x=>x.p);
  L.push(`| ${y} | ${a.length} | ${pc(g)} | ${tr(1000*(1+g))} $ | ${pc(sum(p)/p.length)} | ${pc(med(p))} | ${p.filter(x=>x<0).length} | ${pc(Math.max(...p))} | ${pc(Math.min(...p))} | ${sum(a.map(x=>x.n))} |`);
}
L.push('','## Ay ay','','| Ay | Ay başı $ | Ay sonu $ | $ | % | Kapanan işlem | Ay sonu açık |','|---|---|---|---|---|---|---|');
for(const x of months) L.push(`| ${x.m}${x===last&&!full?' (yarım)':''} | ${tr(x.eq0)} | ${tr(x.eq)} | ${dl(x.d)} | ${pc(x.p)} | ${x.n} | ${x.open} |`);
fs.writeFileSync(OUT,L.join('\n')+'\n'); console.log(L.slice(0,40).join('\n')); console.log('→',OUT);
