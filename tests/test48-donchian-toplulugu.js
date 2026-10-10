// Test #48 (10 Ekim 2026): Donchian topluluğu + oynaklıkla boy (Zarattini, Pagani, Barbon 2025, "Catching Crypto Trends", SFI 25-80;
// oynaklık yönetimi: Grobys vd. 2025 FMPM). Parametreler makaleden ve önceden sabit; veride seçilmedi.
// Kural: her ay hacimce ilk --top coin (TradFi hariç, delist dahil; arşiv universe.json). Her coin için geri bakış L ∈ LBS gün:
//   model L, kapanış ≥ önceki L günün en yüksek kapanışı olunca long; iz stop = girişten beri (L günlük tepe + dip)/2'nin en yükseği,
//   kapanış iz stopun altına inince çıkar. Sinyal s = açık modellerin payı (0–1). Yalnız long.
//   Boy: w = s × min(CAP, TV ÷ σ60) ÷ top  (σ60 = 60 günlük günlük getiri std × √365). Brüt nominal ≤ LEV (orantılı küçültülür).
//   Gün kapanışında hedef hesaplanır, ertesi açılışta dengelenir; |hedef − mevcut| < BAND × hedef ise işlem yok (çıkış her zaman).
//   Maliyet taraf başına %0,08 (taker + kayma) işlem gören nominale; fonlama arşivden günlük toplam (long öder).
// Karşılaştırma aynı çerçevede: tek model L=20 (Kaplumbağa 20 giriş, kanal ortası iz stop), BTC SMA200 süzgeçli/süzgeçsiz, oynaklıklı/oynaklıksız.
// "İşlem başı R" yerine portföy ölçüsü: yıllık getiri, en büyük düşüş, Sharpe, yarılar, son 24 ay, yıl yıl; ayrıca model "bölümleri" (her modelin
// her girişi–çıkışı) için ortalama getiri ÷ girişteki kanal-ortası uzaklığı (R).
// Kullanım: node tests/test48-donchian-toplulugu.js [--top 20] [--tv 0.5] [--lev 2] → tests/test48-donchian-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'), DAY=864e5;
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',20), TV=+arg('tv',0.5), CAP=+arg('cap',2), LEV=+arg('lev',2), BAND=+arg('band',0.2), SIDE=0.0008, FDEF=0.0003;
const OUT=arg('out',path.join(__dirname,'test48-donchian-report.md'));
const LBS=[5,10,20,30,60,90,150,250,360];
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const mon=t=>new Date(t).toISOString().slice(0,7);
const inU={}; for(const m in U) inU[m]=new Set(U[m].slice(0,TOP));
const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)))].sort();
if(!syms.includes('BTCUSDT')) syms.push('BTCUSDT');
const load=s=>{ const f=path.join(ARCH,'1d',s+'.csv'); if(!fs.existsSync(f)) return null;
  return fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); };
const loadF=s=>{ const f=path.join(ARCH,'funding',s+'.csv'); if(!fs.existsSync(f)) return null; const m=new Map();
  for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); const d=Math.floor(+t/DAY)*DAY; m.set(d,(m.get(d)||0)+(+r)); } return m; };
const D={}, F={}; for(const s of syms){ const k=load(s); if(k&&k.length>30){ D[s]=k; F[s]=loadF(s); k.m=new Map(k.map((b,i)=>[b.t,i])); } }
const btc=D.BTCUSDT;
const btcAbove=t=>{ const i=btc.m.get(t); if(i==null||i<200) return null; let s=0; for(let k=i-199;k<=i;k++) s+=btc[k].c; return btc[i].c>s/200; };

// Her coin, her model için günlük pozisyon (0/1, gün kapanışındaki karar) ve bölümler
function models(s,lbs){
  const k=D[s], n=k.length, pos=lbs.map(()=>new Uint8Array(n)), eps=[];
  lbs.forEach((L,mi)=>{ let on=false, ts=0, e=null;
    for(let i=L;i<n;i++){ let hi=-Infinity, lo=Infinity; for(let j=i-L;j<i;j++){ if(k[j].c>hi) hi=k[j].c; if(k[j].c<lo) lo=k[j].c; }
      const mid=(hi+lo)/2;
      if(on){ ts=Math.max(ts,mid); if(k[i].c<ts){ on=false; if(e&&i+1<n){ e.x=k[i+1].o; e.to=k[i+1].t; eps.push(e); } e=null; } }
      else if(k[i].c>=hi){ on=true; ts=mid; if(i+1<n) e={s,L,ti:k[i+1].t,px:k[i+1].o,risk:(k[i].c-mid)/k[i].c}; }
      pos[mi][i]=on?1:0; } });
  return {pos,eps};
}
function sigma(k,i){ if(i<61) return NaN; let a=0,b=0; for(let j=i-59;j<=i;j++){ const r=k[j].c/k[j-1].c-1; a+=r; b+=r*r; } const m=a/60; return Math.sqrt(Math.max(b/60-m*m,0))*Math.sqrt(365); }

function run({lbs,vol,filt}){
  const M={}; for(const s in D) M[s]=models(s,lbs);
  const t0=Date.UTC(2020,5,1), t1=btc[btc.length-1].t; let E=1, peak=1, mdd=0; const daily=[]; let w={}; let turn=0, fundPaid=0, costPaid=0;
  for(let t=t0;t<=t1;t+=DAY){
    // 1) bugün açılışta dünkü hedefe dengele (hedef dün kapanışta hesaplandı → `want`)
    // 2) gün boyu getiri: açılış → kapanış; önceki gece: dünkü kapanış → bugünkü açılış (mevcut ağırlıkla)
    let pnl=0;
    for(const s in w){ const k=D[s], i=k.m.get(t); if(i==null||i<1){ continue; } pnl+=w[s]*(k[i].o/k[i-1].c-1); }
    const want=run.want||{}; const all=new Set([...Object.keys(w),...Object.keys(want)]); const nw={};
    for(const s of all){ const k=D[s], i=k.m.get(t); const cur=w[s]||0, tg=want[s]||0;
      if(i==null){ // veri yok (delist): son kapanışta kapat
        if(cur){ const c=Math.abs(cur)*SIDE; E-=c*E; costPaid+=c; turn+=Math.abs(cur); } continue; }
      let nv=cur; if(tg===0||Math.abs(tg-cur)>=BAND*Math.max(tg,1e-9)) nv=tg;
      const tr=Math.abs(nv-cur); if(tr>0){ turn+=tr; pnl-=tr*SIDE; costPaid+=tr*SIDE; }
      if(nv) nw[s]=nv; }
    w=nw;
    for(const s in w){ const k=D[s], i=k.m.get(t); pnl+=w[s]*(k[i].c/k[i].o-1); const fr=F[s]&&F[s].has(t)?F[s].get(t):FDEF; pnl-=w[s]*fr; fundPaid+=w[s]*fr; }
    // not: ağırlıklar gün içinde fiyatla kaydırılmaz (günlük sabit ağırlık yaklaşımı)
    E*=1+pnl; if(E>peak) peak=E; mdd=Math.max(mdd,1-E/peak); daily.push({t,eq:E,r:pnl});
    // kapanışta yeni hedef
    const u=inU[mon(t)]||new Set(); const tg={}; let gross=0; const ok=!filt||btcAbove(t)===true;
    if(ok) for(const s of u){ const k=D[s]; if(!k) continue; const i=k.m.get(t); if(i==null) continue;
      const P=M[s].pos; let on=0; for(const p of P) on+=p[i]; const sg=on/P.length; if(!sg) continue;
      let x=sg/TOP; if(vol){ const sd=sigma(k,i); if(!(sd>0)) continue; x=sg*Math.min(CAP,TV/sd)/TOP; } tg[s]=x; gross+=x; }
    if(gross>LEV) for(const s in tg) tg[s]*=LEV/gross;
    run.want=tg;
  }
  run.want=null;
  const eps=[]; for(const s in M) for(const e of M[s].eps){ if(e.ti<t0) continue; if(!inU[mon(e.ti-DAY)]||!inU[mon(e.ti-DAY)].has(s)) continue; if(filt&&btcAbove(e.ti-DAY)!==true) continue;
    const fr=F[s]; let f=0; for(let t=e.ti;t<e.to;t+=DAY) f+=fr&&fr.has(t)?fr.get(t):FDEF; const ret=e.x/e.px-1-2*SIDE-f; eps.push({...e,ret,R:e.risk>0?ret/e.risk:NaN}); }
  return {daily,mdd,turn,fundPaid,costPaid,eps};
}
const yrs=(a,b)=>(b-a)/365/DAY;
function stats(daily,from,to){ const d=daily.filter(x=>x.t>=from&&x.t<to); if(d.length<30) return {}; let e=1; for(const x of d) e*=1+x.r;
  const m=d.reduce((a,x)=>a+x.r,0)/d.length, sd=Math.sqrt(d.reduce((a,x)=>a+(x.r-m)**2,0)/d.length); let pk=1,q=1,dd=0; for(const x of d){ q*=1+x.r; pk=Math.max(pk,q); dd=Math.max(dd,1-q/pk); }
  return {cagr:Math.pow(e,1/yrs(d[0].t,d[d.length-1].t+DAY))-1, sharpe:m/sd*Math.sqrt(365), vol:sd*Math.sqrt(365), dd}; }
const pc=x=>Number.isFinite(x)?(x>=0?'+':'')+(100*x).toFixed(0)+'%':'–', fx=(x,d=2)=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(d):'–';
const T0=Date.UTC(2020,5,1), TEND=btc[btc.length-1].t+DAY, TMID=(T0+TEND)/2, T24=TEND-730*DAY;
const V=[]; for(const ens of [true,false]) for(const vol of [true,false]) for(const filt of [false,true]) V.push({ens,vol,filt,lbs:ens?LBS:[20]});
const L=['# Test #48 · Donchian topluluğu + oynaklıkla boy',`Evren: her ay hacimce ilk ${TOP} coin (TradFi hariç, delist dahil). 2020-06 → ${mon(TEND-DAY)}. Yalnız long. Maliyet taraf başı %0,08 + arşiv fonlaması. Oynaklıklı boy: w = s × min(${CAP}, ${TV} ÷ σ60) ÷ ${TOP}; brüt ≤ ${LEV}x; bant %${BAND*100}. Topluluk L = ${LBS.join(', ')}; tek model L = 20.`,'',
 '| Sinyal | Boy | BTC SMA200 | Yıllık | Oynaklık | Sharpe | En büyük düşüş | Calmar | 1. yarı yıllık / Sharpe | 2. yarı yıllık / Sharpe | Son 24 ay yıllık / Sharpe / düşüş | Yıllık devir | Fonlama/yıl | Bölüm | Bölüm ort. R | R yarılar | R son 24 ay |','|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
const Y=[2020,2021,2022,2023,2024,2025,2026], YR=[];
const rs=a=>{ const r=a.filter(x=>Number.isFinite(x.R)); return r.length?r.reduce((s,x)=>s+x.R,0)/r.length:NaN; };
for(const v of V){ const r=run(v); const a=stats(r.daily,T0,TEND), h1=stats(r.daily,T0,TMID), h2=stats(r.daily,TMID,TEND), l=stats(r.daily,T24,TEND); const y=yrs(T0,TEND);
  const ep=r.eps; const nm=`${v.ens?'topluluk':'tek L=20'} | ${v.vol?'oynaklık':'eşit'} | ${v.filt?'var':'yok'}`;
  L.push(`| ${nm} | ${pc(a.cagr)} | ${(100*a.vol).toFixed(0)}% | ${fx(a.sharpe)} | −${(100*a.dd).toFixed(0)}% | ${fx(a.cagr/a.dd)} | ${pc(h1.cagr)} / ${fx(h1.sharpe)} | ${pc(h2.cagr)} / ${fx(h2.sharpe)} | ${pc(l.cagr)} / ${fx(l.sharpe)} / −${(100*l.dd).toFixed(0)}% | ${(r.turn/y).toFixed(1)}x | ${(100*r.fundPaid/y).toFixed(1)}% | ${ep.length} | ${fx(rs(ep))} | ${fx(rs(ep.filter(x=>x.ti<TMID)))} / ${fx(rs(ep.filter(x=>x.ti>=TMID)))} | ${fx(rs(ep.filter(x=>x.ti>=T24)))} |`);
  const by={}; for(const x of r.daily){ const yy=new Date(x.t).getUTCFullYear(); by[yy]=(by[yy]||1)*(1+x.r); } YR.push(`| ${nm.replace(/ \| /g,' · ')} | `+Y.map(yy=>pc(by[yy]-1)).join(' | ')+' |');
  console.log(nm, pc(a.cagr), fx(a.sharpe), (100*a.dd).toFixed(0), 'h', fx(h1.sharpe), fx(h2.sharpe), 'l24', pc(l.cagr), fx(l.sharpe), 'R', fx(rs(ep)));
}
L.push('','## Yıl yıl','','| Varyant | '+Y.join(' | ')+' |','|---|'+'---|'.repeat(Y.length),...YR);
fs.writeFileSync(OUT,L.join('\n')+'\n'); console.log('yazıldı',OUT);
