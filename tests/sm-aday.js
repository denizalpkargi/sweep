// Sosyal medya taramasından kalan iki aday için derin test (11 Ekim 2026): Data Trader Stoch + RSI + MACD ve Ichimoku, 4 sa.
// (1) hayatta kalan seçimi azaltılmış geniş evren: ayın ilk 50 coini (önceki 30 günün nominal hacmi, delist dahil, yalnız COIN perp'leri),
// (2) zaman dilimi komşuları 2/6/8/12 sa (1 sa mumlardan) ve 1 g, (3) maliyet ×2 ve bir mum gecikmeli giriş, (4) gösterge ayar komşuları,
// (5) long/short, yıl yıl, kayan 12 ay, coin payı, (6) portföy (%0,5 risk, en çok 10 pozisyon, nominal ≤ 2×), (7) çoklu deneme düzeltmesi.
// Veri: node tests/sm-fetch.js --iv 1d --symfile <liste> --no-funding, sonra evrene girenler için --iv 4h (fonlamayla).
// Kullanım: node tests/sm-aday.js [--top 50] → tests/sm-aday-report.md
const fs=require('fs'),path=require('path'); const L=require('./sm-lib'); const {S}=require('./sm-strategies');
const {rsi,macd,lowest,highest,ichimoku,cross}=L;
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
const TOP=+arg('top',50); const DIR=path.join(__dirname,'data','sm');
const MAIN='BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,ADAUSDT,DOGEUSDT,LINKUSDT,LTCUSDT,DOTUSDT,AVAXUSDT,BCHUSDT,ETCUSDT,TRXUSDT,XLMUSDT,ATOMUSDT,FILUSDT,UNIUSDT,NEARUSDT,AAVEUSDT'.split(',');
const rr=(d,i,dir,stop,R)=>({i,dir,stop,tp:d.c[i]+dir*R*Math.abs(d.c[i]-stop)});

// ---------- aylık evren ----------
const MON=t=>{ const x=new Date(t); return x.getUTCFullYear()*12+x.getUTCMonth(); };
function universe(){ const f=path.join(DIR,'universe-top'+TOP+'.json'); const all=fs.readdirSync(path.join(DIR,'1d')).map(x=>x.replace('.csv',''));
  const vol={}; // sym → Map(gün → q)
  for(const s of all){ const d=L.load(s,'1d'); if(!d) continue; const m=new Map(); for(let i=0;i<d.n;i++) m.set(Math.floor(d.t[i]/864e5),d.q[i]); vol[s]=m; }
  const U={}; const m0=MON(Date.UTC(2020,1,1)), m1=MON(Date.now());
  for(let m=m0;m<=m1;m++){ const t=Date.UTC(Math.floor(m/12),m%12,1), day=Math.floor(t/864e5); const sc=[];
    for(const s in vol){ let q=0,k=0; for(let dd=day-30;dd<day;dd++){ const v=vol[s].get(dd); if(v!=null){ q+=v; k++; } } if(k>=20) sc.push([s,q]); }
    sc.sort((a,b)=>b[1]-a[1]); U[m]=sc.slice(0,TOP).map(x=>x[0]); }
  fs.writeFileSync(f,JSON.stringify(U)); return U; }

// ---------- 1 sa → k sa birleştirme ----------
const cache=new Map();
function loadAgg(sym,iv){ const key=sym+iv; if(cache.has(key)) return cache.get(key); let d;
  const k={'2h':2,'6h':6,'8h':8,'12h':12}[iv];
  if(!k) d=L.load(sym,iv); else { const h=L.load(sym,'1h'); if(!h){ cache.set(key,null); return null; } const ms=k*36e5, g=[];
    for(let i=0;i<h.n;i++){ const b=Math.floor(h.t[i]/ms)*ms; const x=g[g.length-1]; if(!x||x.t!==b) g.push({t:b,o:h.o[i],h:h.h[i],l:h.l[i],c:h.c[i],v:h.v[i],q:h.q[i],tb:h.tb[i],m:1});
      else { x.h=Math.max(x.h,h.h[i]); x.l=Math.min(x.l,h.l[i]); x.c=h.c[i]; x.v+=h.v[i]; x.q+=h.q[i]; x.tb+=h.tb[i]; x.m++; } }
    const G=g.filter(x=>x.m===k), n=G.length; d={sym,iv,n,fund:h.fund}; for(const c of ['t','o','h','l','c','v','q','tb']){ d[c]=new Float64Array(n); for(let i=0;i<n;i++) d[c][i]=G[i][c]; } }
  cache.set(key,d); return d; }

// ---------- parametreli kopyalar (varsayılanlar sm-strategies ile birebir) ----------
const DT=(o={})=>{ const lo=o.lo??20, hi=100-lo, rm=o.rm??50, w=o.w??3, R=o.R??1.5, lb=o.lb??10; return d=>{ const K=L.smaN(L.stoch(d,14),3),D=L.smaN(K,3),r=rsi(d.c,14),M=macd(d.c),out=[]; let lastL=-99,lastS=-99;
  for(let i=40;i<d.n;i++){ let sl=false,ss=false; for(let k=0;k<w;k++){ const j=i-k; if(K[j]<lo&&D[j]<lo) sl=true; if(K[j]>hi&&D[j]>hi) ss=true; }
    const a=sl&&r[i]>rm&&M.m[i]>M.sig[i], b=ss&&r[i]<100-rm&&M.m[i]<M.sig[i];
    if(a&&i-lastL>3) out.push(rr(d,i,1,lowest(d,i,lb),R)); if(a) lastL=i; if(b&&i-lastS>3) out.push(rr(d,i,-1,highest(d,i,lb),R)); if(b) lastS=i; } return out; }; };
const ICHI=(o={})=>{ const [a,b,c]=o.p||[9,26,52], R=o.R??2, kx=o.kx??true, chik=o.chik??true; return d=>{ const I=ichimoku(d,a,b,c),out=[]; for(let i=c+b+2;i<d.n;i++){ const top=Math.max(I.spanA[i],I.spanB[i]),bot=Math.min(I.spanA[i],I.spanB[i]);
  if(d.c[i]>top&&cross(I.ten,I.kij,i)&&(!chik||d.c[i]>d.c[i-b])){ const st=Math.min(I.kij[i],bot); if(st<d.c[i]) out.push({...rr(d,i,1,st,R),...(kx?{exit:j=>d.c[j]<I.kij[j]}:{})}); }
  if(d.c[i]<bot&&cross(I.kij,I.ten,i)&&(!chik||d.c[i]<d.c[i-b])){ const st=Math.max(I.kij[i],top); if(st>d.c[i]) out.push({...rr(d,i,-1,st,R),...(kx?{exit:j=>d.c[j]>I.kij[j]}:{})}); } } return out; }; };
const delay=(g,k)=>d=>g(d).map(s=>({...s,i:s.i+k})).filter(s=>s.i<d.n-1);
const longOnly=g=>d=>g(d).filter(s=>s.dir>0), shortOnly=g=>d=>g(d).filter(s=>s.dir<0);

// ---------- yardımcılar ----------
const f=(x,k=3)=>x==null||isNaN(x)?'–':x.toFixed(k).replace('.',','), pc=x=>x==null||isNaN(x)?'–':(100*x).toFixed(0)+' %';
const mean=a=>a.length?a.reduce((p,q)=>p+q,0)/a.length:NaN;
// normal yaklaşımla iki yönlü p
const pNorm=t=>{ const z=Math.abs(t), u=1/(1+0.2316419*z), dd=0.3989423*Math.exp(-z*z/2); const q=dd*u*(0.3193815+u*(-0.3565638+u*(1.781478+u*(-1.821256+u*1.330274)))); return 2*q; };
const tCrit=p=>{ let lo=0,hi=10; for(let k=0;k<60;k++){ const m=(lo+hi)/2; if(pNorm(m)>p) lo=m; else hi=m; } return lo; };
function portfolio(T,{risk=0.005,maxPos=10,lev=2}={}){ const ev=[]; T.forEach((t,k)=>{ ev.push([t.t,1,k]); ev.push([t.tx,0,k]); }); ev.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);
  let eq=1,peak=1,dd=0; const open=new Map(); let taken=0,skipped=0; const mon=new Map();
  for(const [tm,typ,k] of ev){ const t=T[k];
    if(typ===1){ const nom=[...open.values()].reduce((a,x)=>a+x.nom,0); const size=risk*eq, nm=size/t.risk;
      if(open.size>=maxPos||nom+nm>lev*eq){ skipped++; continue; } open.set(k,{size,nom:nm}); taken++; }
    else if(open.has(k)){ const x=open.get(k); open.delete(k); eq+=x.size*t.R; peak=Math.max(peak,eq); dd=Math.min(dd,eq/peak-1); const m=MON(tm); mon.set(m,eq); } }
  const yrs=(T.length?(Math.max(...T.map(t=>t.tx))-Math.min(...T.map(t=>t.t))):1)/(365.25*864e5);
  const ms=[...mon.keys()].sort((a,b)=>a-b); const mr=[]; let prev=1; for(const m of ms){ mr.push(mon.get(m)/prev-1); prev=mon.get(m); }
  const sh=mr.length>2?mean(mr)/Math.sqrt(mean(mr.map(x=>(x-mean(mr))**2)))*Math.sqrt(12):NaN;
  return {eq,cagr:eq>0?eq**(1/yrs)-1:-1,dd,taken,skipped,sharpe:sh,worstM:Math.min(...mr)}; }

// ---------- koşu ----------
const rows=[]; const t0=Date.now(); const TR={};
function run(grp,ad,syms,iv,gen,opt={}){ const r=L.runStrategy(ad,syms,iv,gen,{loader:loadAgg,...opt}); const s=L.summarize(r); s.grp=grp; s.T=r.trades;
  const by={}; for(const t of r.trades){ (by[t.sym]=by[t.sym]||[]).push(t.R); } const cs=Object.values(by).filter(a=>a.length>=5); s.coinPos=cs.length?cs.filter(a=>mean(a)>0).length/cs.length:NaN; s.nCoin=cs.length;
  s.pDiff=pNorm(s.tDiff); rows.push(s); console.log(grp,'|',ad,iv,s.n,f(s.R),f(s.h1),f(s.h2),f(s.l12),'fark',f(s.diff),'t',f(s.tDiff,1),((Date.now()-t0)/1000).toFixed(0)+'sn'); return s; }

const U=universe(); const inU=(d,s)=>{ const m=MON(d.t[s.i]); return (U[m]||[]).includes(d.sym); };
const WIDE=[...new Set(Object.values(U).flat())].filter(s=>fs.existsSync(path.join(DIR,'4h',s+'.csv')));
const missing=[...new Set(Object.values(U).flat())].filter(s=>!fs.existsSync(path.join(DIR,'4h',s+'.csv')));
console.log('evren',WIDE.length,'coin, 4 sa verisi eksik',missing.length);
if(process.argv.includes('--universe-only')){ fs.writeFileSync(arg('miss','/dev/null'),missing.join(',')); process.exit(0); }

const C=[['Data Trader Stoch + RSI + MACD',DT()],['Ichimoku',ICHI()]];
for(const [ad,g] of C){
  const base=run('1. Taban (ana 20, 4 sa)',ad,MAIN,'4h',g); TR[ad]=base.T;
  run(`2. Geniş evren (ayın ilk ${TOP}'ü, delist dahil)`,ad,WIDE,'4h',g,{keep:inU});
  run(`2. Geniş evren (ayın ilk ${TOP}'ü, delist dahil)`,ad+' · ana 20 dışı',WIDE.filter(s=>!MAIN.includes(s)),'4h',g,{keep:inU});
  for(const iv of ['2h','6h','8h','12h','1d']) run('3. Zaman dilimi (ana 20)',ad,MAIN,iv,g);
  run('4. Stres (ana 20, 4 sa)',ad+' · maliyet ×2',MAIN,'4h',g,{cost:2});
  run('4. Stres (ana 20, 4 sa)',ad+' · bir mum geç giriş',MAIN,'4h',delay(g,1));
  run('4. Stres (ana 20, 4 sa)',ad+' · yalnız long',MAIN,'4h',longOnly(g));
  run('4. Stres (ana 20, 4 sa)',ad+' · yalnız short',MAIN,'4h',shortOnly(g));
}
for(const lo of [10,15,25,30]) run('5. Gösterge komşuları (ana 20, 4 sa)',`Data Trader · Stoch ${lo}/${100-lo}`,MAIN,'4h',DT({lo}));
for(const rm of [45,55]) run('5. Gösterge komşuları (ana 20, 4 sa)',`Data Trader · RSI ${rm}`,MAIN,'4h',DT({rm}));
for(const w of [1,5]) run('5. Gösterge komşuları (ana 20, 4 sa)',`Data Trader · Stoch penceresi ${w} mum`,MAIN,'4h',DT({w}));
for(const p of [[7,22,44],[10,30,60],[20,60,120]]) run('5. Gösterge komşuları (ana 20, 4 sa)',`Ichimoku · ${p.join('/')}`,MAIN,'4h',ICHI({p}));
run('5. Gösterge komşuları (ana 20, 4 sa)','Ichimoku · Chikou şartı yok',MAIN,'4h',ICHI({chik:false}));

// plasebo: aynı coin ve yönde, sinyalin ±30 gün içinde rastgele mumda AYNI kural stopu / hedefi / çıkış kuralı (yalnız giriş zamanlaması rastgele)
const placebo=(g,mk,seed)=>d=>{ const R=rngP(seed+d.sym.length*7919+Math.round(d.t[0]/864e5)); const span=Math.round(30*864e5/(d.t[1]-d.t[0])); const out=[];
  for(const s of g(d)){ for(let k=0;k<20;k++){ const j=s.i+Math.round((R()*2-1)*span); if(j<130||j>=d.n-1) continue; const x=mk(d,j,s.dir); if(x){ out.push(x); break; } } } return out; };
function rngP(seed){ let x=seed>>>0||1; return ()=>{ x^=x<<13; x>>>=0; x^=x>>>17; x^=x<<5; x>>>=0; return x/4294967296; }; }
const ichiCache=new WeakMap(); const ichiOf=d=>{ if(!ichiCache.has(d)) ichiCache.set(d,ichimoku(d)); return ichiCache.get(d); };
const mkIchi=(d,j,dir)=>{ const I=ichiOf(d),top=Math.max(I.spanA[j],I.spanB[j]),bot=Math.min(I.spanA[j],I.spanB[j]); if(isNaN(top)) return null;
  const st=dir>0?Math.min(I.kij[j],bot):Math.max(I.kij[j],top); if(dir>0?!(st<d.c[j]):!(st>d.c[j])) return null; return {...rr(d,j,dir,st,2),exit:dir>0?(q=>d.c[q]<I.kij[q]):(q=>d.c[q]>I.kij[q])}; };
const mkDT=(d,j,dir)=>{ const st=dir>0?lowest(d,j,10):highest(d,j,10); if(dir>0?!(st<d.c[j]):!(st>d.c[j])) return null; return rr(d,j,dir,st,1.5); };
for(const [ad,g,mk] of [['Data Trader Stoch + RSI + MACD',DT(),mkDT],['Ichimoku',ICHI(),mkIchi]]) for(const [ev,syms,opt] of [['ana 20',MAIN,{}],['geniş',WIDE,{keep:inU}]]) for(const sd of [1,2,3])
  run('6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman)',`${ad} · ${ev} · tohum ${sd}`,syms,'4h',placebo(g,mk,sd),opt);

// ---------- rapor ----------
const sonuc=JSON.parse(fs.readFileSync(path.join(DIR,'sonuc.json'),'utf8')); const nConf=sonuc.length+31; // ilk süzgeç + önceki sağlamlık koşuları
const tAll=sonuc.map(r=>r.tDiff).filter(x=>!isNaN(x)).sort((a,b)=>b-a);
let md=`# İki aday için derin test · Data Trader Stoch + RSI + MACD ve Ichimoku\n\n11 Ekim 2026. Aynı simülatör (\`tests/sm-lib.js\`): sinyal kapanışta, giriş sonraki açılışta, taker %0,05 + kayma %0,03 her tarafta, gerçek fonlama, aynı mumda stop + hedef → stop; **rastgele** = aynı coin ve yönde ±30 gün içinde aynı stop/hedef uzaklığı ve tutuşla 3 giriş, **fark** = R − rastgele. Yarılar 2023-05-15'te, son 12 ay 2025-10-11'den. Geniş evren: her ayın başında önceki 30 günün nominal hacmine göre ilk ${TOP} COIN perp'i (TradFi yok), Binance'in bugün listede tuttuğu ${fs.readdirSync(path.join(DIR,'1d')).length} sembol + elle eklenen delist coinler (MATIC, LUNA, SRM, FTM, OCEAN, WAVES …); sinyal yalnız coin o ay evrendeyse alınır. Evrene giren ${WIDE.length} coin${missing.length?`, 4 sa verisi alınamayan ${missing.length}: ${missing.join(', ')}`:''}.\n\n`;
md+=`| Grup | Strateji | Zaman | İşlem | Kazanma | Ort. R | t | 1. yarı | 2. yarı | Son 12 ay | Rastgele | Fark | Fark 1. yarı | Fark 2. yarı | Fark t | Artı coin payı | Long R | Short R |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for(const s of rows) md+=`| ${s.grp} | ${s.name} | ${s.iv} | ${s.n} | ${pc(s.win)} | **${f(s.R)}** | ${f(s.tR,1)} | ${f(s.h1)} | ${f(s.h2)} | ${f(s.l12)} | ${f(s.rnd)} | ${f(s.diff)} | ${f(s.d1)} | ${f(s.d2)} | ${f(s.tDiff,1)} | ${pc(s.coinPos)} (${s.nCoin}) | ${f(s.long)} | ${f(s.short)} |\n`;
const Y=[2020,2021,2022,2023,2024,2025,2026];
md+=`\n## Yıl yıl ortalama R\n\n| Grup | Strateji | Zaman | ${Y.join(' | ')} |\n|---|---|---|${'---|'.repeat(Y.length)}\n`;
for(const s of rows) md+=`| ${s.grp} | ${s.name} | ${s.iv} | ${Y.map(y=>f(s.years[y],2)).join(' | ')} |\n`;
// kayan 12 ay (taban ve geniş evren)
md+=`\n## Kayan 12 ay ortalama R (çeyrek sonları)\n\n`; const roll=rows.filter(s=>/^1\.|^2\./.test(s.grp)&&!/ana 20 dışı/.test(s.name));
const qs=[]; for(let y=2021;y<=2026;y++) for(const m of [2,5,8,11]){ const t=Date.UTC(y,m+1,1); if(t<=Date.now()) qs.push(t); }
md+=`| Çeyrek sonu | ${roll.map(s=>s.name+' · '+(s.grp.startsWith('1')?'ana 20':'geniş')).join(' | ')} |\n|---|${'---|'.repeat(roll.length)}\n`;
for(const t of qs) md+=`| ${new Date(t-864e5).toISOString().slice(0,7)} | ${roll.map(s=>{ const x=s.T.filter(z=>z.t<t&&z.t>=t-365.25*864e5).map(z=>z.R); return f(mean(x),2)+` (${x.length})`; }).join(' | ')} |\n`;
// portföy
md+=`\n## Portföy (işlem başına özkaynağın %0,5'i risk, en çok 10 pozisyon, toplam nominal ≤ 2× özkaynak; gerçekleşen kâr/zararla)\n\n| Strateji | Evren | Alınan / atlanan | Yıllık | En büyük düşüş | Sharpe (aylık) | En kötü ay |\n|---|---|---|---|---|---|---|\n`;
for(const s of rows.filter(s=>/^1\.|^2\./.test(s.grp))) for(const o of [{risk:0.005},{risk:0.01}]){ const P=portfolio(s.T,o); md+=`| ${s.name} (risk %${o.risk*100}) | ${s.grp.startsWith('1')?'ana 20':'geniş'} | ${P.taken} / ${P.skipped} | ${pc(P.cagr)} | ${pc(P.dd)} | ${f(P.sharpe,2)} | ${pc(P.worstM)} |\n`; }
// ikisinin aylık ilişkisi
const monR=T=>{ const m=new Map(); for(const t of T){ const k=MON(t.t); if(!m.has(k)) m.set(k,[]); m.get(k).push(t.R); } return new Map([...m].map(([k,v])=>[k,mean(v)])); };
const a=monR(TR[C[0][0]]),b=monR(TR[C[1][0]]); const ks=[...a.keys()].filter(k=>b.has(k)); const xa=ks.map(k=>a.get(k)),xb=ks.map(k=>b.get(k)); const ma=mean(xa),mb=mean(xb);
const corr=xa.reduce((p,_,i)=>p+(xa[i]-ma)*(xb[i]-mb),0)/Math.sqrt(xa.reduce((p,x)=>p+(x-ma)**2,0)*xb.reduce((p,x)=>p+(x-mb)**2,0));
md+=`\nİki adayın aylık ortalama R'si arasındaki korelasyon (ana 20, 4 sa): ${f(corr,2)} (${ks.length} ay).\n`;
// çoklu deneme
const bonf=0.05/nConf; md+=`\n## Çoklu deneme\n\nSosyal medya taramasında ve bu testte toplam yaklaşık ${nConf+rows.length} ayar denendi. İlk süzgeçteki ${tAll.length} ayarın "fark t"leri: en yüksek ${tAll.slice(0,5).map(x=>f(x,1)).join(', ')}; medyan ${f(tAll[Math.floor(tAll.length/2)],1)}; t > 2 olan ${tAll.filter(x=>x>2).length}. Bonferroni ile %5 için gereken iki yönlü p < ${bonf.toExponential(1)} (t ≈ ${f(tCrit(bonf),1)}). Tabanın fark p'leri: ${rows.filter(s=>s.grp.startsWith('1')).map(s=>s.name+' '+pNorm(s.tDiff).toExponential(1)+' (t '+f(s.tDiff,1)+')').join(' · ')}.\n`;
md+=`\n_${((Date.now()-t0)/1000).toFixed(0)} sn · node tests/sm-aday.js_\n`;
fs.writeFileSync(path.join(__dirname,'sm-aday-report.md'),md); console.log('yazıldı');
