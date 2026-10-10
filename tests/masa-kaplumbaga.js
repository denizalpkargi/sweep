// Masa, Kaplumbağa sinyallerinde süzgeç olabilir mi? (8 Ekim 2026; kullanıcı masanın neden kaybettiğini sordu)
// 15 dk masa kararlarının kendi kenarı yok (hata örneklemi: her puan diliminde ort. R eksi, isabet ~%50). Kenarı olan tek sistem
// Kaplumbağa 1 long + BTC > SMA200 (research-daily-wide.js). Burada her Kaplumbağa girişinde (gün açılışı) masa toplanır
// (giriş anından önce kapanmış 15 dk mumlarla, inputsAt), sonuç Kaplumbağa işleminin R'si. Soru: masanın evet dediği sinyaller
// hayır dediklerinden iki yarıda da iyi mi?
// Veri: node tests/fetch-archive.js && node tests/research-daily-wide.js (→ tests/data/arch/daily-wide-trades.json)
// Kullanım: node tests/masa-kaplumbaga.js [--sys T1] [--dir 1] → tests/masa-kaplumbaga-report.md
const fs=require('fs'), path=require('path');
const {loadEngine}=require('./engine-node.js'); const {inputsAt}=require('./backtest-masa.js');
const ARCH=path.join(__dirname,'data','arch'); const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const SYS=arg('sys','T1'), DIR=+arg('dir',1); const E=loadEngine(); const M15=9e5;
const csvK=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const lb=(a,t)=>{ let lo=0,hi=a.length-1,r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(a[m].t<=t){ r=m; lo=m+1; } else hi=m-1; } return r; };
const set=JSON.parse(fs.readFileSync(path.join(ARCH,'daily-wide-trades.json'),'utf8')).find(r=>r.name===SYS&&r.d===DIR&&!r.pyr&&r.filt);
const btc=E.K(csvK(path.join(ARCH,'15m','BTCUSDT.csv')));
const bySym={}; for(const x of set.tr) (bySym[x[0]]=bySym[x[0]]||[]).push(x);
const out=[]; let miss=0; const dir=DIR>0?'long':'short';
for(const s in bySym){ const f15=path.join(ARCH,'15m',s+'.csv'); if(!fs.existsSync(f15)){ miss+=bySym[s].length; continue; }
  const k=E.K(csvK(f15)), d1=E.K(csvK(path.join(ARCH,'1d',s+'.csv'))); if(E.setPoolCache) E.setPoolCache(new Map());
  for(const x of bySym[s]){ const i=lb(k,x[1]-M15); if(i<3500||k[i].t!==x[1]-M15){ miss++; continue; }
    try{ const inp=inputsAt(k,i,d1,btc,s); const A=E.analyze(inp.f,inp.s); const c=E.committee(A,dir,inp.c24,{sym:s,raw:true,lf:false});
      const ag=c.agents||c.pre; out.push({s,t:x[1],R:x[3],score:c.score,yes:c.yes,veto:c.veto?1:0,v:Object.fromEntries(ag.filter(a=>!a.abst).map(a=>[a.id,+a.v]))}); }catch(e){ miss++; } } }
out.sort((a,b)=>a.t-b.t); const MID=out[out.length>>1].t, L24=out[out.length-1].t-730*864e5;
const st=a=>a.length?{n:a.length,R:a.reduce((p,x)=>p+x.R,0)/a.length,win:a.filter(x=>x.R>0).length/a.length}:{n:0,R:NaN,win:NaN};
const fx=v=>Number.isFinite(v)?(v>=0?'+':'')+v.toFixed(2).replace('.',','):'—', pc=v=>Number.isFinite(v)?'%'+Math.round(100*v):'—';
const row=(name,f)=>{ const a=out.filter(f); const h1=st(a.filter(x=>x.t<MID)), h2=st(a.filter(x=>x.t>=MID)), y=st(a.filter(x=>x.t>=L24)), all=st(a);
  return `| ${name} | ${all.n} | ${fx(all.R)} | ${pc(all.win)} | ${fx(h1.R)} (${h1.n}) | ${fx(h2.R)} (${h2.n}) | ${fx(y.R)} (${y.n}) |`; };
const L=[`# Masa Kaplumbağa sinyallerinde (${SYS} ${dir}, BTC süzgeçli) · ${new Date().toISOString().slice(0,10)}\n`,
  `${set.tr.length} sinyalin ${out.length}'inde masa toplandı (${miss} sinyalde 15 dk veri yok; 15 dk yalnız ayda ilk 30 coin). Sonuç = Kaplumbağa işleminin R'si (masa yalnız al/alma der, çıkış Kaplumbağa'nın).\n`,
  '| Küme | İşlem | Ort. R | Kazanma | 1. yarı | 2. yarı | Son 24 ay |','|---|---|---|---|---|---|---|',
  row('Hepsi',()=>true), row('Masa gir (puan ≥ 35, evet ≥ 3, veto yok)',x=>x.score>=0.35&&x.yes>=3&&!x.veto), row('Masa girme',x=>!(x.score>=0.35&&x.yes>=3&&!x.veto)),
  row('Puan ≥ 20',x=>x.score>=0.2), row('Puan 0–20',x=>x.score>=0&&x.score<0.2), row('Puan < 0',x=>x.score<0), row('Veto',x=>x.veto)];
L.push('','Üye üye (oy > 0,15 evet, < −0,15 hayır):','','| Üye | Evet: işlem · R | Hayır: işlem · R | Evet 1./2. yarı | Hayır 1./2. yarı |','|---|---|---|---|---|');
const ids=[...new Set(out.flatMap(x=>Object.keys(x.v)))];
for(const id of ids){ const Y=out.filter(x=>x.v[id]>0.15), N=out.filter(x=>x.v[id]<-0.15); const h=(a,f)=>st(a.filter(f)).R;
  L.push(`| ${id} | ${Y.length} · ${fx(st(Y).R)} | ${N.length} · ${fx(st(N).R)} | ${fx(h(Y,x=>x.t<MID))} / ${fx(h(Y,x=>x.t>=MID))} | ${fx(h(N,x=>x.t<MID))} / ${fx(h(N,x=>x.t>=MID))} |`); }
fs.writeFileSync(path.join(__dirname,'masa-kaplumbaga-report.md'),L.join('\n')+'\n'); console.log(L.join('\n'));
