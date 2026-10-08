// Adım 3: günlük sistemler geniş evrende (masterplan). Veri: node tests/fetch-archive.js → tests/data/arch/1d, funding, universe.json.
// Evren: her ay, o ayın evren listesindeki (önceki 30 günün hacmine göre, TradFi hariç, delist dahil) ilk --top coin. Sinyal yalnız evrendeki coinde açılır;
// açık pozisyon coin evrenden düşse de kuralına göre kapanır. Veri biterse (delist) son kapanışta çıkılır.
// Sistemler (gün kapanışında sinyal, ertesi gün açılışında giriş; N = 20 günlük ATR):
//   T1   Kaplumbağa 1: kapanış > önceki 20 günün tepesi; çıkış kapanış < önceki 10 günün dibi.
//   T2   Kaplumbağa 2: 55 / 20.
//   B10  10 günlük kırılım: kapanış > önceki 10 günün tepesi; çıkış kapanış < önceki 10 günün dibi ya da 20 gün.
//   KOV  Kovner sıkışması: 15 günlük aralık / fiyat son 120 günün en dar %10'unda; aralığın kapanışla kırılması (5 gün içinde);
//        çıkış kapanış < 20 günün dibi; kapanış stopu aralığın ortası.
// Stoplar: kapanış stopu (T*, B10: giriş − 2N; kapanış altına inerse ertesi açılışta çık), uzak felaket stopu (giriş − 4N, gün içi; açılış ötesindeyse açılışta).
// Piramit (--pyr): +½N'de bir birim daha (en çok 4), tüm birimlerin stopu son girişin 2N altı. R = toplam kâr ÷ ilk birimin riski.
// Maliyet: taraf başına taker %0,05 + kayma %0,03; fonlama arşivden (yoksa 8 saatte %0,01), long öder / short alır.
// Rejim süzgeci: long yalnız BTC kapanışı > BTC SMA200 iken, short yalnız altındayken (her sistem süzgeçli ve süzgeçsiz).
// Portföy: işlem başına risk %r (özsermayenin), en çok K açık pozisyon, toplam nominal ≤ L × özsermaye; günlük kapanışla değerlenir.
// Kullanım: node tests/research-daily-wide.js [--top 50] [--risk 0.01] [--maxpos 10] [--lev 3] → tests/daily-wide-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'); const DAY=864e5;
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',50), RISK=+arg('risk',0.01), MAXPOS=+arg('maxpos',10), LEV=+arg('lev',3);
const OUT=arg('out',path.join(__dirname,'daily-wide-report.md'));
const SIDE=0.0008, FDEF=0.0001;
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const mon=t=>new Date(t).toISOString().slice(0,7);
const inU={}; for(const m in U) inU[m]=new Set(U[m].slice(0,TOP));
const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)))].sort();
const load=s=>{ const f=path.join(ARCH,'1d',s+'.csv'); if(!fs.existsSync(f)) return null;
  return fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); };
const loadF=s=>{ const f=path.join(ARCH,'funding',s+'.csv'); if(!fs.existsSync(f)) return null; const m=new Map();
  for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); const d=Math.floor(+t/DAY)*DAY; m.set(d,(m.get(d)||0)+(+r)); } return m; };
const D={}, F={}; for(const s of syms){ const k=load(s); if(k&&k.length>80){ D[s]=k; F[s]=loadF(s); } }
const btc=D.BTCUSDT; const btcIdx=new Map(btc.map((b,i)=>[b.t,i]));
const btcAbove=t=>{ const i=btcIdx.get(t); if(i==null||i<200) return null; let s=0; for(let k=i-199;k<=i;k++) s+=btc[k].c; return btc[i].c>s/200; };
function atrA(k){ const n=20, a=new Array(k.length).fill(NaN); let s=0; for(let i=1;i<k.length;i++){ const tr=Math.max(k[i].h-k[i].l,Math.abs(k[i].h-k[i-1].c),Math.abs(k[i].l-k[i-1].c)); s+=tr; if(i>n) s-=Math.max(k[i-n].h-k[i-n].l,Math.abs(k[i-n].h-k[i-n-1].c),Math.abs(k[i-n].l-k[i-n-1].c)); if(i>=n) a[i]=s/n; } return a; }
const hh=(k,i,n)=>{ let m=-Infinity; for(let j=i-n+1;j<=i;j++) m=Math.max(m,k[j].h); return m; };
const ll=(k,i,n)=>{ let m=Infinity; for(let j=i-n+1;j<=i;j++) m=Math.min(m,k[j].l); return m; };

// Bir coinde bir sistemin işlemleri (yön d = 1 long, −1 short). Her işlem: giriş/çıkış zamanı, birimler, R, getiri (nominal oranı), fonlama.
const SYS={
  T1:{entryN:20,exitN:10}, T2:{entryN:55,exitN:20}, B10:{entryN:10,exitN:10,maxDays:20}, KOV:{kov:true,exitN:20},
};
function trades(s,name,d,pyr){
  const k=D[s], N=k._N||(k._N=atrA(k)), cfg=SYS[name], fm=F[s], out=[]; let box=null;
  if(cfg.kov&&!k._W){ k._W=k.map((b,x)=>x>=14?(hh(k,x,15)-ll(k,x,15))/b.c:NaN); }
  for(let i=130;i<k.length-1;i++){
    if(!inU[mon(k[i].t)]||!inU[mon(k[i].t)].has(s)||!(N[i]>0)) { box=null; continue; }
    let sig=false, cstop=null;
    if(cfg.kov){
      // sıkışma: 15 günlük aralık/fiyat son 120 günün en dar %10'unda → kutu 5 gün geçerli
      const W=k._W, cur=W[i-1]; let below=0; for(let j=i-120;j<i-1;j++) if(W[j]<=cur) below++;
      if(below<=12) box={hi:hh(k,i-1,15),lo:ll(k,i-1,15),until:i+5};
      if(box&&i<=box.until){ if(d>0?k[i].c>box.hi:k[i].c<box.lo){ sig=true; cstop=(box.hi+box.lo)/2; box=null; } } else box=null;
    } else { const ref=d>0?hh(k,i-1,cfg.entryN):ll(k,i-1,cfg.entryN); sig=d>0?k[i].c>ref:k[i].c<ref; }
    if(!sig) continue;
    // giriş ertesi açılışta
    let j=i+1; const e0=k[j].o, n0=N[i]; const units=[{px:e0,t:k[j].t}]; let stopC=cstop!=null?cstop:e0-d*2*n0, cat=e0-d*4*n0;
    if(d*(e0-stopC)<=0){ continue; } // açılış zaten kapanış stopunun ötesinde
    const risk0=d*(e0-stopC)/e0; let fund=0, exitPx=null, why='';
    for(;j<k.length;j++){
      const b=k[j];
      // felaket stopu gün içi
      if(d>0?b.l<=cat:b.h>=cat){ exitPx=d>0?Math.min(b.o,cat):Math.max(b.o,cat); why='felaket'; break; }
      fund+=(fm&&fm.has(b.t)?fm.get(b.t):FDEF*3)*units.length; // birim başına (yaklaşık: her birim aynı nominal)
      if(j===k.length-1){ exitPx=b.c; why='veri bitti'; break; }
      // piramit: kapanış son girişin ½N ötesinde → ertesi açılışta bir birim
      if(pyr&&units.length<4&&d*(b.c-units[units.length-1].px)>=0.5*n0){ const px=k[j+1].o; units.push({px,t:k[j+1].t}); const ns=px-d*2*n0; if(d*(ns-stopC)>0) stopC=ns; cat=px-d*4*n0; }
      const ex=cfg.exitN&&j>=cfg.exitN?(d>0?b.c<ll(k,j-1,cfg.exitN):b.c>hh(k,j-1,cfg.exitN)):false;
      const st=d>0?b.c<stopC:b.c>stopC; const tm=cfg.maxDays&&j-(i+1)>=cfg.maxDays;
      if(ex||st||tm){ exitPx=k[j+1].o; why=st?'stop':ex?'çıkış':'zaman'; j++; break; }
    }
    if(exitPx==null) continue;
    let ret=0; for(const u of units) ret+=d*(exitPx-u.px)/u.px - 2*SIDE; ret-=d*fund; // birim başına nominal getiri toplamı
    out.push({s,d,ti:k[i+1].t,to:k[Math.min(j,k.length-1)].t,ii:i+1,jo:Math.min(j,k.length-1),e0,exitPx,n:units.length,risk0,ret,R:ret/risk0,why,units});
    i=Math.min(j,k.length-1); // aynı coinde üst üste pozisyon yok
  }
  return out;
}
// Portföy: aynı anda en çok MAXPOS pozisyon; her yeni pozisyon (ilk birim) özsermayenin RISK'i kadar risk; birim nominali = RISK·E / risk0.
// Toplam nominal LEV × E'yi aşarsa yeni giriş küçültülür. Günlük değerleme kapanışla.
function portfolio(tr){
  const byDay=new Map(); for(const x of tr){ (byDay.get(x.ti)||byDay.set(x.ti,[]).get(x.ti)).push(x); }
  const t0=Date.UTC(2020,5,1), t1=btc[btc.length-1].t; let E=1, peak=1, mdd=0; const open=[]; const daily=[]; let prevE=1;
  const idxOf=s=>{ if(!D[s]._m) D[s]._m=new Map(D[s].map((b,i)=>[b.t,i])); return D[s]._m; };
  let taken=0, skipped=0;
  for(let t=t0;t<=t1;t+=DAY){
    // çıkışlar: bugün kapanan pozisyonlar gerçekleşir
    for(let q=open.length-1;q>=0;q--){ const p=open[q]; if(p.x.to<=t){ E+=p.size*p.x.ret - 0; open.splice(q,1); } }
    const cand=(byDay.get(t)||[]).slice().sort((a,b)=>b.risk0-a.risk0===0?0:a.s<b.s?-1:1);
    for(const x of cand){ if(open.length>=MAXPOS){ skipped++; continue; }
      const used=open.reduce((a,p)=>a+p.size*p.x.n,0); let size=RISK*E/x.risk0; const room=LEV*E-used; if(room<=0){ skipped++; continue; } size=Math.min(size,room/x.n); open.push({x,size}); taken++; }
    // değerleme: açık pozisyonlar bugünkü kapanışla (birimlerin bugüne kadar eklenenleri)
    let mtm=0; for(const p of open){ const m=idxOf(p.x.s), i=m.get(t); if(i==null) continue; const c=D[p.x.s][i].c; for(const u of p.x.units) if(u.t<=t) mtm+=p.size*(p.x.d*(c-u.px)/u.px); }
    const eq=E+mtm; if(eq>peak) peak=eq; mdd=Math.max(mdd,1-eq/peak); daily.push({t,eq,r:eq/prevE-1}); prevE=eq;
  }
  const yrs=(t1-t0)/365/DAY, rs=daily.map(x=>x.r), m=rs.reduce((a,b)=>a+b,0)/rs.length, sd=Math.sqrt(rs.reduce((a,b)=>a+(b-m)**2,0)/rs.length);
  const byYear={}; let last=1; for(const x of daily){ const y=new Date(x.t).getUTCFullYear(); byYear[y]=byYear[y]||{s:last}; byYear[y].e=x.eq; last=x.eq; }
  const mid=daily[Math.floor(daily.length/2)];
  return {cagr:Math.pow(daily[daily.length-1].eq,1/yrs)-1,mdd,sharpe:m/sd*Math.sqrt(365),end:daily[daily.length-1].eq,taken,skipped,
    h1:Math.pow(mid.eq,1/(yrs/2))-1, h2:Math.pow(daily[daily.length-1].eq/mid.eq,1/(yrs/2))-1, years:Object.fromEntries(Object.entries(byYear).map(([y,v])=>[y,v.e/v.s-1]))};
}
const fx=(x,d=2)=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(d):'–', pc=x=>Number.isFinite(x)?(x>=0?'+':'')+(100*x).toFixed(0)+'%':'–';
function rstats(tr){ if(!tr.length) return {n:0}; const R=tr.map(x=>x.R), m=R.reduce((a,b)=>a+b,0)/R.length, sd=Math.sqrt(R.reduce((a,b)=>a+(b-m)**2,0)/R.length);
  return {n:tr.length,R:m,t:m/sd*Math.sqrt(R.length),win:tr.filter(x=>x.R>0).length/tr.length}; }
const T0=Date.UTC(2020,5,1), TEND=btc[btc.length-1].t, TMID=(T0+TEND)/2, T24=TEND-730*DAY;
const lines=['# Günlük sistemler · geniş evren',`Evren: her ay hacimce ilk ${TOP} coin (TradFi hariç, delist dahil), ${Object.keys(D).length} coin. Dönem 2020-06 → ${mon(TEND)}. Maliyet taraf başına %0,08 + fonlama. Portföy: işlem başına risk %${(RISK*100).toFixed(1)}, en çok ${MAXPOS} pozisyon, toplam nominal ≤ ${LEV}x.`,'',
  '| Sistem | Yön | Süzgeç | Piramit | İşlem | Ort. R | t | Kazanma | 1. yarı R | 2. yarı R | Son 24 ay R | Yıllık | En büyük düşüş | Sharpe | 1. yarı yıllık | 2. yarı yıllık |','|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
const res=[];
for(const name of Object.keys(SYS)) for(const d of [1,-1]) for(const pyr of (name==='KOV'?[false]:[false,true])){
  let all=[]; for(const s of Object.keys(D)) all=all.concat(trades(s,name,d,pyr)); all=all.filter(x=>x.ti>=T0);
  for(const filt of [false,true]){
    const tr=filt?all.filter(x=>{ const a=btcAbove(x.ti-DAY); return a!=null&&(d>0?a:!a); }):all;
    const st=rstats(tr), h1=rstats(tr.filter(x=>x.ti<TMID)), h2=rstats(tr.filter(x=>x.ti>=TMID)), l24=rstats(tr.filter(x=>x.ti>=T24)); const pf=portfolio(tr);
    res.push({name,d,pyr,filt,st,h1,h2,l24,pf,tr});
    lines.push(`| ${name} | ${d>0?'long':'short'} | ${filt?'BTC SMA200':'yok'} | ${pyr?'var':'yok'} | ${st.n} | ${fx(st.R)} | ${fx(st.t,1)} | %${(100*st.win).toFixed(0)} | ${fx(h1.R)} | ${fx(h2.R)} | ${fx(l24.R)} | ${pc(pf.cagr)} | −${(100*pf.mdd).toFixed(0)}% | ${fx(pf.sharpe)} | ${pc(pf.h1)} | ${pc(pf.h2)} |`);
    console.log(name,d>0?"L":"S",pyr?"pyr":"",filt?"filt":"","alındı",pf.taken,"atlandı",pf.skipped,st.n,fx(st.R),fx(h1.R),fx(h2.R),fx(l24.R),pc(pf.cagr),(100*pf.mdd).toFixed(0));
  }
}
lines.push('','## Yıl yıl (portföy getirisi)','','| Sistem | '+[2020,2021,2022,2023,2024,2025,2026].join(' | ')+' |','|---|'+'---|'.repeat(7));
for(const r of res) lines.push(`| ${r.name} ${r.d>0?'long':'short'}${r.filt?' · süzgeç':''}${r.pyr?' · piramit':''} | `+[2020,2021,2022,2023,2024,2025,2026].map(y=>pc(r.pf.years[y])).join(' | ')+' |');
const ok=r=>r.st.n>=100&&r.h1.R>0&&r.h2.R>0&&r.l24.R>0&&r.pf.mdd<=0.35;
lines.push('','## Geçme (≥100 işlem, iki yarıda ve son 24 ayda ort. R > 0, portföy en büyük düşüş ≤ %35)','',...res.filter(ok).map(r=>`- ${r.name} ${r.d>0?'long':'short'}${r.filt?' · BTC süzgeci':''}${r.pyr?' · piramit':''}: ${r.st.n} işlem, ${fx(r.st.R)}R, yıllık ${pc(r.pf.cagr)}, düşüş −${(100*r.pf.mdd).toFixed(0)}%`));
if(!res.some(ok)) lines.push('- Geçen yok.');
fs.writeFileSync(OUT,lines.join('\n')+'\n'); fs.writeFileSync(path.join(ARCH,'daily-wide-trades.json'),JSON.stringify(res.map(r=>({name:r.name,d:r.d,pyr:r.pyr,filt:r.filt,tr:r.tr.map(x=>[x.s,x.ti,x.to,+x.R.toFixed(3),+x.ret.toFixed(4),x.n,x.why])}))));
console.log('yazıldı',OUT);
