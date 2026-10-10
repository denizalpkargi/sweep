// Test listesi #28 (9 Ekim 2026, #17 ve #25'ten): dönüş kalıplarında girişi LİMİT emirle atmak.
// Sinyaller test25 ile aynı: seans açılış aralığı (ilk 30 dk) kırılımının tersi (ORB) ve Asya saatlerinde günün ilk PDH/PDL kırılımının tersi.
// Giriş türleri: market (sonraki mumun VWAP'ı, taker) · limit kırılım mumu kapanışı + 0,25 ATR · + 0,5 ATR · kırılım mumunun ucu (short için yüksek);
//   limit sonraki 4 mum (1 sa) içinde fiyat seviyeye %0,02 payla değerse dolar (maker), yoksa iptal. Dolmayanlar için kaçırılan = stopsuz +4 sa VWAP getirisi.
// Stop: dolum anına kadar görülen uç ± %0,15, en az 0,8 ATR(14) ("ATR") ya da en az %1,5 ("ATR+%1,5"), 3 ATR üstü işlem yok. Hedef 1,5R / 2R / yok; zaman stopu dolumdan 16 mum.
// Maliyet R cinsinden, çıkışa göre: giriş maker %0,02 (market: taker+kayma %0,08); stop/zaman çıkışı %0,08, hedef çıkışı (limit) %0,02.
// Kullanım: node --max-old-space-size=8000 tests/test28-limit-giris.js → tests/test28-limit-giris-report.md
const fs=require('fs'), path=require('path'); const ARCH=path.join(__dirname,'data','arch');
const DAY=864e5, MID=Date.parse('2023-06-01T00:00Z'), Y12=Date.now()-365*DAY, HOLD=16, WAIT=4, TOP=30;
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const monthsOf={}; for(const m in U) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const SESS=[['Asya',0,28],['Londra',28,20],['New York',48,36]];
const ENTRIES=['market','limit +0,25 ATR','limit +0,5 ATR','limit uç'], STOPS=['ATR','ATR+%1,5'], TPS=[1.5,2,0];
const ST={}, FILL={}, MISS={};
const bump=(key,r,rc,exit,sp,hold)=>{ const o=ST[key]||(ST[key]={n:0,s:0,sc:0,sc2:0,w:0,pos:0,neg:0,ex:{stop:0,hedef:0,zaman:0},sp:0,h:0}); o.n++; o.s+=r; o.sc+=rc; o.sc2+=rc*rc; if(rc>0){ o.w++; o.pos+=rc; } else o.neg+=rc; o.ex[exit]++; o.sp+=sp; o.h+=hold; };
const bfill=(key,filled,ref)=>{ const o=FILL[key]||(FILL[key]={n:0,f:0,rf:0,rf2:0,ru:0,ru2:0}); o.n++; if(filled){ o.f++; o.rf+=ref; o.rf2+=ref*ref; } else { o.ru+=ref; o.ru2+=ref*ref; } };
const perKeys=t=>[t<MID?'1':'2', ...(t>=Y12?['Y']:[]), 'y'+new Date(t).getUTCFullYear()];
let coins=0, nsig=0;
for(const s of Object.keys(monthsOf).sort()){ const k=csv(path.join(ARCH,'15m',s+'.csv')); if(k.length<4000) continue; coins++;
  const n=k.length, close=k.map(r=>r[4]); const vw=j=>k[j][5]>0?k[j][7]/k[j][5]:close[j];
  const atr=new Float64Array(n); { let acc=0; const q=[]; for(let i=1;i<n;i++){ const tr=Math.max(k[i][2]-k[i][3],Math.abs(k[i][2]-close[i-1]),Math.abs(k[i][3]-close[i-1])); q.push(tr); acc+=tr; if(q.length>14) acc-=q.shift(); atr[i]=q.length===14?acc/14:NaN; } }
  const days=[]; for(let i=0;i<n;i++) if(k[i][0]%DAY===0) days.push(i);
  // giriş: {f: dolum mumu, e: fiyat, ext: stop için uç, ce: giriş maliyeti} ya da null (dolmadı)
  const entry=(j,dir,type)=>{ const a=atr[j]; if(!(a>0)) return null; const extOf=f=>{ let x=dir>0?k[j][3]:k[j][2]; for(let i=j+1;i<f;i++) x=dir>0?Math.min(x,k[i][3]):Math.max(x,k[i][2]); return x; };
    if(type==='market'){ const e=vw(j+1); return e>0?{f:j+1,e,ext:extOf(j+1),ce:0.0008}:null; }
    const off=type==='limit +0,25 ATR'?0.25*a:type==='limit +0,5 ATR'?0.5*a:null; const lim=off!==null?(dir>0?close[j]-off:close[j]+off):(dir>0?k[j][3]:k[j][2]);
    for(let i=j+1;i<=j+WAIT&&i<n;i++){ const hit=dir>0?k[i][3]<=lim*(1-0.0002):k[i][2]>=lim*(1+0.0002); if(hit){ const ext=dir>0?Math.min(extOf(i),lim):Math.max(extOf(i),lim); return {f:i,e:lim,ext,ce:0.0002}; } }
    return null; };
  const sim=(j,dir,en,stopV,tp)=>{ const a=atr[j], e=en.e, f=en.f; const ext=dir>0?en.ext*(1-0.0015):en.ext*(1+0.0015);
    let d=dir>0?e-ext:ext-e; d=Math.max(d,0.8*a,(stopV==='ATR'?0:0.015)*e); if(d>3*a) return null;
    const stop=dir>0?e-d:e+d, tgt=tp?(dir>0?e+tp*d:e-tp*d):null, last=Math.min(f+HOLD,n-1);
    for(let i=f;i<=last;i++){ const hi=k[i][2],lo=k[i][3]; if(dir>0?lo<=stop:hi>=stop) return {r:-1,exit:'stop',hold:i-j,sp:d/e,cx:0.0008}; if(tgt!==null&&i>f&&(dir>0?hi>=tgt:lo<=tgt)) return {r:tp,exit:'hedef',hold:i-j,sp:d/e,cx:0.0002}; }
    const x=vw(last); return {r:dir*(x-e)/d,exit:'zaman',hold:last-j,sp:d/e,cx:0.0008}; };
  const signal=(sig,j,dir,t0)=>{ if(j+WAIT+HOLD+1>=n) return; nsig++; const pk=perKeys(t0); const e0=vw(j+1); const ref=e0>0&&vw(j+17)>0?dir*(vw(j+17)/e0-1):NaN;
    for(const et of ENTRIES){ const en=entry(j,dir,et); if(Number.isFinite(ref)) for(const p of pk) bfill(`${sig}|${et}|${p}`,!!en,ref); if(!en) continue;
      for(const sv of STOPS) for(const tp of TPS){ const o=sim(j,dir,en,sv,tp); if(!o) continue; const rc=o.r-(en.ce+o.cx)/o.sp; for(const p of pk) bump(`${sig}|${et}|${sv}|${tp}|${p}`,o.r,rc,o.exit,o.sp,o.hold); } } };
  for(let di=1;di<days.length-1;di++){ const ds=days[di], de=days[di+1]-1, ps=days[di-1]; if(de-ds!==95||ds-ps!==96) continue; const t0=k[ds][0]; if(!monthsOf[s].has(new Date(t0).toISOString().slice(0,7))) continue;
    let ph=-1e18,pl=1e18; for(let j=ps;j<ds;j++){ if(k[j][2]>ph) ph=k[j][2]; if(k[j][3]<pl) pl=k[j][3]; }
    for(const [nm,off,len] of SESS){ const ss=ds+off, se=ss+len-1; const oh=Math.max(k[ss][2],k[ss+1][2]), ol=Math.min(k[ss][3],k[ss+1][3]);
      for(let j=ss+2;j<=se-2;j++){ const d=close[j]>oh?1:close[j]<ol?-1:0; if(d){ signal('ORB '+nm, j, -d, t0); break; } } }
    if(ph>pl) for(let j=ds;j<=ds+27;j++){ const d=close[j]>ph?1:close[j]<pl?-1:0; if(d){ signal('PDH/PDL Asya', j, -d, t0); break; } } }
}
console.log('coin',coins,'sinyal',nsig);
const fx=(v,d=2)=>Number.isFinite(v)?(v>=0?'+':'')+v.toFixed(d).replace('.',','):'—', f0=(v,d=0)=>Number.isFinite(v)?v.toFixed(d).replace('.',','):'—';
const cell=o=>{ if(!o||!o.n) return '—'; const m=o.s/o.n, mc=o.sc/o.n; const sd=Math.sqrt(Math.max(0,o.sc2/o.n-mc*mc)); const t=sd>0?mc/sd*Math.sqrt(o.n):NaN; const pf=o.neg<0?o.pos/-o.neg:NaN;
  return `n ${o.n} · ${fx(m)} / **${fx(mc)}** R · t ${fx(t,1)} · PF ${f0(pf,2)} · kazanma %${f0(100*o.w/o.n)} · stop %${f0(100*o.ex.stop/o.n)} · stop %${f0(100*o.sp/o.n,2)}`; };
const fcell=o=>{ if(!o||!o.n) return '—'; const u=o.n-o.f; const mf=o.f?o.rf/o.f:NaN, mu=u?o.ru/u:NaN; return `dolum %${f0(100*o.f/o.n)} · dolan +4 sa ${fx(mf*100,3)} % · dolmayan ${fx(mu*100,3)} %`; };
const SIGS=['ORB Asya','PDH/PDL Asya','ORB Londra','ORB New York'];
const out=[`# Test #28 · Dönüş kalıplarında limit emirle giriş · ${new Date().toISOString().slice(0,10)}`,'',
  `Ayın ilk ${TOP} coini (${coins} coin), 15 dk mumlar, 2020-06 → bugün; ${nsig.toLocaleString('tr-TR')} sinyal (test25 ile aynı kalıplar). Giriş türleri: market = sonraki mumun VWAP'ı (taker+kayma %0,08); limit = kırılım mumu kapanışının 0,25 / 0,5 ATR gerisine ya da kırılım mumunun ucuna, sonraki 4 mumda (1 sa) fiyat seviyeye değerse dolum (maker %0,02), yoksa iptal. Stop: dolum anına kadar görülen uç ± %0,15, en az 0,8 ATR ("ATR") ya da en az %1,5 ("ATR+%1,5"), 3 ATR üstü işlem yok; hedef 1,5R / 2R / yok; zaman stopu dolumdan 4 sa. Çıkış maliyeti: stop ve zaman %0,08 (taker), hedef %0,02 (limit). Hücre: n · brüt / **maliyetli** R · t · PF · kazanma · stop payı · ortalama stop %. Dönemler: 1 = 2020-06 → 05/2023, 2 = 06/2023 → bugün, Y = son 12 ay.`,''];
for(const sig of SIGS){ out.push(`## ${sig}`,'','Dolum oranı ve seçilim (stopsuz +4 sa VWAP getirisi, ters yön; dolan ile dolmayan sinyaller ayrı):','','| Giriş | 1. dönem | 2. dönem | Son 12 ay |','|---|---|---|---|');
  for(const et of ENTRIES) out.push(`| ${et} | ${fcell(FILL[`${sig}|${et}|1`])} | ${fcell(FILL[`${sig}|${et}|2`])} | ${fcell(FILL[`${sig}|${et}|Y`])} |`);
  out.push('','| Giriş | Stop | Hedef | 1. dönem | 2. dönem | Son 12 ay |','|---|---|---|---|---|---|');
  for(const et of ENTRIES) for(const sv of STOPS) for(const tp of TPS) out.push(`| ${et} | ${sv} | ${tp?fx(tp,1).replace('+','')+'R':'yok'} | ${cell(ST[`${sig}|${et}|${sv}|${tp}|1`])} | ${cell(ST[`${sig}|${et}|${sv}|${tp}|2`])} | ${cell(ST[`${sig}|${et}|${sv}|${tp}|Y`])} |`); out.push(''); }
out.push('## Yıl yıl · ORB Asya, ATR+%1,5, hedefsiz · maliyetli R','','| Giriş | '+[2020,2021,2022,2023,2024,2025,2026].join(' | ')+' |','|---|'+'---|'.repeat(7));
for(const et of ENTRIES) out.push(`| ${et} | `+[2020,2021,2022,2023,2024,2025,2026].map(y=>{ const o=ST[`ORB Asya|${et}|ATR+%1,5|0|y${y}`]; return o?`${o.n} · ${fx(o.sc/o.n)} R`:'—'; }).join(' | ')+' |');
out.push('');
fs.writeFileSync(path.join(__dirname,'test28-limit-giris-report.md'),out.join('\n')+'\n'); console.log(out.join('\n'));
