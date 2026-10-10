// Test #50 (10 Ekim 2026 gecesi, kullanıcı "kaldığımız yerlerden devam"): test listesinde "günlük sistem olarak hâlâ bekliyor" yazan iki aday.
//  #4  Williams volatilite kırılımı: gün içi alış stopu açılış + k × (önceki günün aralığı); stop giriş − 1 × önceki aralık (gün içi);
//      çıkış ilk kârlı açılışta (Williams "bailout"), yoksa 10 gün sonra açılışta. k = 0,5 Williams'ın değeri; 0,3 / 0,7 yalnız duyarlılık.
//      Günlük mumda sıra bilinmez: giriş günü dip stopa değdiyse stop sayılır (kötümser). Açılış seviyenin ötesindeyse açılıştan girilir.
//  #9  10 günlük kapanış zirvesi kırılımı, 5 günlük kapanış dibinde çık (ertesi açılış), stop giriş − 2N kapanışla, felaket − 4N gün içi.
//      Kıyas: aynı çerçevede Kaplumbağa 1 (20/10) ve 10/10.
// Hepsi long ve short, BTC SMA200 süzgeçli (long üstünde, short altında) ve süzgeçsiz. Evren her ay hacimce ilk --top coin (TradFi hariç, delist dahil).
// Maliyet taraf başına %0,08 (taker + kayma), fonlama arşivden (yoksa günde %0,03), basit getiri. R = getiri ÷ girişteki stop uzaklığı.
// Portföy: işlem başına %r risk, en çok K pozisyon, nominal ≤ L × özsermaye (research-daily-wide ile aynı).
// Kullanım: node tests/test50-gunluk-kirilim.js [--iyimser] [--top 50] [--risk 0.005] [--maxpos 10] [--lev 2] → tests/test50-gunluk-kirilim-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'), DAY=864e5;
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',50), RISK=+arg('risk',0.005), MAXPOS=+arg('maxpos',10), LEV=+arg('lev',2), SIDE=0.0008, FDEF=0.0003;
const OPT=process.argv.includes('--iyimser'), OUT=path.join(__dirname,OPT?'test50-gunluk-kirilim-iyimser-report.md':'test50-gunluk-kirilim-report.md');
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months, mon=t=>new Date(t).toISOString().slice(0,7);
const inU={}; for(const m in U) inU[m]=new Set(U[m].slice(0,TOP));
const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)).concat(['BTCUSDT']))].sort();
const load=s=>{ const f=path.join(ARCH,'1d',s+'.csv'); if(!fs.existsSync(f)) return null;
  return fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); };
const loadF=s=>{ const f=path.join(ARCH,'funding',s+'.csv'); if(!fs.existsSync(f)) return null; const m=new Map();
  for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); const d=Math.floor(+t/DAY)*DAY; m.set(d,(m.get(d)||0)+(+r)); } return m; };
const D={}, F={}; for(const s of syms){ const k=load(s); if(k&&k.length>60){ D[s]=k; F[s]=loadF(s); k.m=new Map(k.map((b,i)=>[b.t,i])); } }
const btc=D.BTCUSDT;
const btcAbove=t=>{ const i=btc.m.get(t); if(i==null||i<200) return null; let s=0; for(let k=i-199;k<=i;k++) s+=btc[k].c; return btc[i].c>s/200; };
function atrA(k){ const n=20, a=new Array(k.length).fill(NaN), tr=i=>Math.max(k[i].h-k[i].l,Math.abs(k[i].h-k[i-1].c),Math.abs(k[i].l-k[i-1].c)); let s=0;
  for(let i=1;i<k.length;i++){ s+=tr(i); if(i>n) s-=tr(i-n); if(i>=n) a[i]=s/n; } return a; }
const hc=(k,i,n)=>{ let m=-Infinity; for(let j=i-n+1;j<=i;j++) m=Math.max(m,k[j].c); return m; };
const lc=(k,i,n)=>{ let m=Infinity; for(let j=i-n+1;j<=i;j++) m=Math.min(m,k[j].c); return m; };
const fundD=(s,t)=>F[s]&&F[s].has(t)?F[s].get(t):FDEF;
const uOk=(s,t)=>inU[mon(t)]&&inU[mon(t)].has(s);

// Williams: gün j'de alış stopu o_j + k·(h_{j−1} − l_{j−1}); işlem günü j'den başlar.
function williams(s,d,K){
  const k=D[s], out=[];
  for(let j=21;j<k.length-1;j++){
    const p=k[j-1], b=k[j], R0=p.h-p.l; if(!(R0>0)||!uOk(s,p.t)) continue;
    const lvl=b.o+d*K*R0; const hit=d>0?b.h>=lvl:b.l<=lvl; if(!hit) continue;
    const e=d>0?Math.max(b.o,lvl):Math.min(b.o,lvl), stop=e-d*R0, risk0=R0/e; let x=null, xj=j, why='';
    if(OPT?(d>0?b.c<=stop:b.c>=stop):(d>0?b.l<=stop:b.h>=stop)){ x=stop; why='stop'; } // giriş günü: kötümser (--iyimser: yalnız kapanış stopun ötesindeyse)
    let fund=fundD(s,b.t);
    for(let q=j+1;x==null&&q<k.length;q++){ const c=k[q];
      if(d*(c.o-e)>0){ x=c.o; xj=q; why='kârlı açılış'; break; }
      if(q-j>=10){ x=c.o; xj=q; why='zaman'; break; }
      if(d>0?c.o<=stop:c.o>=stop){ x=c.o; xj=q; why='stop'; break; }
      if(d>0?c.l<=stop:c.h>=stop){ x=stop; xj=q; why='stop'; break; }
      fund+=fundD(s,c.t); if(q===k.length-1){ x=c.c; xj=q; why='son'; } }
    if(x==null) continue;
    const ret=d*(x/e-1)-2*SIDE-d*fund; out.push({s,d,ti:b.t,to:k[xj].t,ret,risk0,R:ret/risk0,why});
    j=xj; // coin başına tek pozisyon (çıkış günü yeni giriş olabilir değil; bir sonraki gün)
  }
  return out;
}
// Donchian kapanış kırılımı: kapanış > önceki nE kapanış tepesi → ertesi açılış; çıkış kapanış < önceki nX kapanış dibi; stop 2N kapanış, 4N felaket.
function donchian(s,d,nE,nX){
  const k=D[s], N=k._N||(k._N=atrA(k)), out=[];
  for(let i=Math.max(nE,21)+1;i<k.length-1;i++){
    if(!uOk(s,k[i].t)||!(N[i]>0)) continue;
    const ref=d>0?hc(k,i-1,nE):lc(k,i-1,nE); if(!(d>0?k[i].c>ref:k[i].c<ref)) continue;
    let j=i+1; const e=k[j].o, stopC=e-d*2*N[i], cat=e-d*4*N[i], risk0=2*N[i]/e; let x=null, why='', fund=0;
    for(;j<k.length;j++){ const b=k[j];
      if(d>0?b.l<=cat:b.h>=cat){ x=d>0?Math.min(b.o,cat):Math.max(b.o,cat); why='felaket'; break; }
      fund+=fundD(s,b.t); if(j===k.length-1){ x=b.c; why='son'; break; }
      const ex=d>0?b.c<lc(k,j-1,nX):b.c>hc(k,j-1,nX), st=d>0?b.c<stopC:b.c>stopC;
      if(ex||st){ j++; x=k[j].o; why=st?'stop':'çıkış'; break; } }
    const jj=Math.min(j,k.length-1); const ret=d*(x/e-1)-2*SIDE-d*fund; out.push({s,d,ti:k[i+1].t,to:k[jj].t,ret,risk0,R:ret/risk0,why}); i=jj;
  }
  return out;
}
function portfolio(tr){
  const byDay=new Map(); for(const x of tr) (byDay.get(x.ti)||byDay.set(x.ti,[]).get(x.ti)).push(x);
  const t0=Date.UTC(2020,5,1), t1=btc[btc.length-1].t; let E=1, peak=1, mdd=0; const open=[], daily=[]; let taken=0, skipped=0;
  for(let t=t0;t<=t1;t+=DAY){
    for(let q=open.length-1;q>=0;q--){ const p=open[q]; if(p.x.to<=t){ E+=p.size*p.x.ret; open.splice(q,1); } }
    for(const x of (byDay.get(t)||[]).slice().sort((a,b)=>a.s<b.s?-1:1)){ if(open.length>=MAXPOS){ skipped++; continue; }
      const used=open.reduce((a,p)=>a+p.size,0), room=LEV*E-used; if(room<=0){ skipped++; continue; } open.push({x,size:Math.min(RISK*E/x.risk0,room)}); taken++; }
    // gün içi değerleme yerine gerçekleşen özsermaye (kapanan işlemler): düşüş alt sınırdır
    if(E>peak) peak=E; mdd=Math.max(mdd,1-E/peak); daily.push({t,eq:E});
  }
  const yrs=(t1-t0)/365/DAY, mid=daily[Math.floor(daily.length/2)], end=daily[daily.length-1].eq;
  const byYear={}; let last=1; for(const x of daily){ const y=new Date(x.t).getUTCFullYear(); byYear[y]=byYear[y]||{s:last}; byYear[y].e=x.eq; last=x.eq; }
  return {cagr:Math.pow(Math.max(end,1e-9),1/yrs)-1,mdd,taken,skipped,h1:Math.pow(mid.eq,2/yrs)-1,h2:Math.pow(end/mid.eq,2/yrs)-1,years:Object.fromEntries(Object.entries(byYear).map(([y,v])=>[y,v.e/v.s-1]))};
}
const fx=(x,d=2)=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(d).replace('.',','):'–', pc=x=>Number.isFinite(x)?(x>=0?'+':'')+(100*x).toFixed(0)+'%':'–';
function rs(tr){ if(!tr.length) return {n:0}; const R=tr.map(x=>x.R), m=R.reduce((a,b)=>a+b,0)/R.length;
  const wk=new Map(); for(const x of tr){ const w=Math.floor(x.ti/(7*DAY)); wk.set(w,(wk.get(w)||0)+x.R); } const v=[...wk.values()], wm=v.reduce((a,b)=>a+b,0)/v.length, ws=Math.sqrt(v.reduce((a,b)=>a+(b-wm)**2,0)/Math.max(1,v.length-1));
  const srt=R.slice().sort((a,b)=>b-a), top=Math.ceil(R.length*0.05), ex=srt.slice(top);
  return {n:R.length,R:m,t:ws>0?wm/ws*Math.sqrt(v.length):NaN,win:tr.filter(x=>x.R>0).length/R.length,pct:tr.reduce((a,x)=>a+x.ret,0)/R.length,ex5:ex.reduce((a,b)=>a+b,0)/Math.max(1,ex.length)}; }
const T0=Date.UTC(2020,5,1), TEND=btc[btc.length-1].t, TMID=(T0+TEND)/2, T24=TEND-730*DAY;
const SYS=[['W0.5','Williams k = 0,5 (ilk kârlı açılış)',(s,d)=>williams(s,d,0.5)],['W0.3','Williams k = 0,3 (duyarlılık)',(s,d)=>williams(s,d,0.3)],['W0.7','Williams k = 0,7 (duyarlılık)',(s,d)=>williams(s,d,0.7)],
  ['B10/5','10 g kapanış kırılımı, 5 g dipte çık (#9)',(s,d)=>donchian(s,d,10,5)],['B10/10','10 g / 10 g',(s,d)=>donchian(s,d,10,10)],['T1','Kaplumbağa 1 · 20 / 10 (kıyas)',(s,d)=>donchian(s,d,20,10)]];
const L=['# Test #50 · Günlük kırılımlar: Williams (#4) ve 10/5 (#9)','',`10 Ekim 2026 · \`node tests/test50-gunluk-kirilim.js\``,'',
 `Evren her ay hacimce ilk ${TOP} coin (TradFi hariç, delist dahil), 2020-06 → ${mon(TEND)}. Maliyet taraf başı %0,08 + arşiv fonlaması, basit getiri. R = getiri ÷ girişteki stop uzaklığı (Williams: önceki günün aralığı; Donchian: 2N). Williams'ta giriş günü dip stopa değdiyse stop sayıldı (kötümser). Portföy %${RISK*100} risk, en çok ${MAXPOS} pozisyon, nominal ≤ ${LEV}x; özsermaye kapanan işlemlerle (düşüş alt sınır). "Haftalık t": haftalık R toplamları. "İlk %5 hariç": en iyi %5 işlem atılınca ort. R.`,'',
 '| Sistem | Yön | BTC SMA200 | İşlem | Ort. R | 1. yarı | 2. yarı | Son 24 ay | Haftalık t | Kazanma | % / işlem | İlk %5 hariç R | Yıllık | Düşüş | Yarılar yıllık |','|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|'];
const YR=[], ys=[2020,2021,2022,2023,2024,2025,2026], pass=[];
for(const [id,ad,fn] of SYS) for(const d of [1,-1]){
  let all=[]; for(const s in D) all=all.concat(fn(s,d)); all=all.filter(x=>x.ti>=T0);
  for(const filt of [false,true]){ const tr=filt?all.filter(x=>{ const a=btcAbove(x.ti-DAY); return a!=null&&(d>0?a:!a); }):all;
    const a=rs(tr), h1=rs(tr.filter(x=>x.ti<TMID)), h2=rs(tr.filter(x=>x.ti>=TMID)), l=rs(tr.filter(x=>x.ti>=T24)), pf=portfolio(tr);
    L.push(`| ${ad} | ${d>0?'long':'short'} | ${filt?'var':'yok'} | ${a.n} | ${fx(a.R)} | ${fx(h1.R)} | ${fx(h2.R)} | ${fx(l.R)} | ${fx(a.t,1)} | %${(100*a.win).toFixed(0)} | ${fx(100*a.pct)}% | ${fx(a.ex5)} | ${pc(pf.cagr)} | −${(100*pf.mdd).toFixed(0)}% | ${pc(pf.h1)} / ${pc(pf.h2)} |`);
    YR.push(`| ${ad} · ${d>0?'long':'short'}${filt?' · süzgeç':''} | `+ys.map(y=>pc(pf.years[y])).join(' | ')+' |');
    if(a.n>=100&&h1.R>0&&h2.R>0&&l.R>0&&a.t>=2&&pf.mdd<=0.35) pass.push(`${ad} ${d>0?'long':'short'}${filt?' · BTC süzgeci':''}: ${a.n} işlem, ${fx(a.R)}R, haftalık t ${fx(a.t,1)}, yıllık ${pc(pf.cagr)}, düşüş −${(100*pf.mdd).toFixed(0)}%`);
    console.log(id,d,filt,a.n,fx(a.R),fx(h1.R),fx(h2.R),fx(l.R),'t',fx(a.t,1),pc(pf.cagr),(100*pf.mdd).toFixed(0)); } }
L.push('','## Yıl yıl (portföy)','','| Sistem | '+ys.join(' | ')+' |','|---|'+'---:|'.repeat(ys.length),...YR,'','## Geçme (≥100 işlem, iki yarıda ve son 24 ayda R > 0, haftalık t ≥ 2, düşüş ≤ %35)','',...(pass.length?pass.map(x=>'- '+x):['- Geçen yok.']));
fs.writeFileSync(OUT,L.join('\n')+'\n'); console.log('yazıldı',OUT);
