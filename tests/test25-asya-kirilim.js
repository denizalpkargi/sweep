// Test listesi #25 (9 Ekim 2026): seans açılış kırılımını ve günün ilk PDH/PDL kırılımını SATMAK (ters yön), stoplu ve maliyetli simülasyon.
// Kaynak: seans-acilis.js (VWAP ölçüsüyle devam eksi, dönüş artı çıkmıştı). Burada gerçek bir işlem kuralı sınanır:
//   Sinyal: (a) seansın ilk 30 dk aralığından (2 mum) ilk dışarı kapanış → ters yön; (b) günün ilk kapanışı önceki UTC gün ucunun dışında → ters yön.
//   Giriş: sinyal mumundan sonraki mumun VWAP'ı. Stop: kırılım mumunun ucu ± %0,15, en az 0,8 ATR(14), (varyant) en az %1,5; 3 ATR'yi aşarsa işlem yok.
//   Hedef: 1R / 1,5R / 2R tam kapanış ya da hedefsiz; zaman stopu 16 mum (4 sa), çıkış o mumun VWAP'ı. Aynı mumda stop+hedef → stop; giriş mumunda yalnız stop sayılır.
//   Maliyet R cinsinden: taker+kayma gidiş-dönüş %0,16, maker %0,04 ÷ stop yüzdesi. Fonlama yok (≤4 sa).
//   Dönemler: 1 = 2020-06 → 05/2023, 2 = 06/2023 → bugün, Y = son 12 ay; yıl yıl ayrıca.
// Kullanım: node --max-old-space-size=8000 tests/test25-asya-kirilim.js → tests/test25-asya-kirilim-report.md
const fs=require('fs'), path=require('path'); const ARCH=path.join(__dirname,'data','arch');
const DAY=864e5, MID=Date.parse('2023-06-01T00:00Z'), Y12=Date.now()-365*DAY, HOLD=16, TOP=30;
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const monthsOf={}; for(const m in U) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const SESS=[['Asya',0,28],['Londra',28,20],['New York',48,36]];
const STOPS=['ATR','ATR+%1,5'], TPS=[1,1.5,2,0], CT=0.0016, CM=0.0004;
const ST={}; // anahtar sig|stop|tp|dönem → toplamlar
const bump=(key,r,rm,rt,exit,stopPct,hold)=>{ const o=ST[key]||(ST[key]={n:0,s:0,s2:0,sm:0,sm2:0,st:0,w:0,pos:0,neg:0,ex:{stop:0,hedef:0,zaman:0},sp:0,h:0});
  o.n++; o.s+=r; o.s2+=r*r; o.sm+=rm; o.sm2+=rm*rm; o.st+=rt; if(rm>0) o.w++; if(rm>0) o.pos+=rm; else o.neg+=rm; o.ex[exit]++; o.sp+=stopPct; o.h+=hold; };
const REF={}; // sinyal → stopsuz +4 sa VWAP dönüş getirisi (dönem başına)
const bref=(key,v)=>{ const o=REF[key]||(REF[key]={n:0,s:0,s2:0}); o.n++; o.s+=v; o.s2+=v*v; };
const perKeys=t=>[t<MID?'1':'2', ...(t>=Y12?['Y']:[]), 'y'+new Date(t).getUTCFullYear()];
let coins=0, nsig=0;
for(const s of Object.keys(monthsOf).sort()){ const k=csv(path.join(ARCH,'15m',s+'.csv')); if(k.length<4000) continue; coins++;
  const n=k.length, close=k.map(r=>r[4]); const vw=j=>k[j][5]>0?k[j][7]/k[j][5]:close[j];
  const atr=new Float64Array(n); { let acc=0; const q=[]; for(let i=1;i<n;i++){ const tr=Math.max(k[i][2]-k[i][3],Math.abs(k[i][2]-close[i-1]),Math.abs(k[i][3]-close[i-1])); q.push(tr); acc+=tr; if(q.length>14) acc-=q.shift(); atr[i]=q.length===14?acc/14:NaN; } }
  const days=[]; for(let i=0;i<n;i++) if(k[i][0]%DAY===0) days.push(i);
  const sim=(j,dir,stopV,tp)=>{ const e=vw(j+1); const a=atr[j]; if(!(e>0&&a>0)) return null; const ext=dir>0?k[j][3]*(1-0.0015):k[j][2]*(1+0.0015);
    let d=dir>0?e-ext:ext-e; d=Math.max(d,0.8*a,(stopV==='ATR'?0:0.015)*e); if(d>3*a) return null;
    const stop=dir>0?e-d:e+d, tgt=tp?(dir>0?e+tp*d:e-tp*d):null, last=Math.min(j+1+HOLD,n-1);
    for(let i=j+1;i<=last;i++){ const hi=k[i][2],lo=k[i][3]; if(dir>0?lo<=stop:hi>=stop) return {r:-1,exit:'stop',hold:i-j,sp:d/e}; if(tgt!==null&&i>j+1&&(dir>0?hi>=tgt:lo<=tgt)) return {r:tp,exit:'hedef',hold:i-j,sp:d/e}; }
    const x=vw(last); return {r:dir*(x-e)/d,exit:'zaman',hold:last-j,sp:d/e}; };
  const signal=(sig,j,dir,t0)=>{ if(j+1+HOLD>=n) return; nsig++; const pk=perKeys(t0); const e=vw(j+1); if(e>0&&vw(j+17)>0) for(const p of pk) bref(sig+'|'+p, dir*(vw(j+17)/e-1));
    for(const sv of STOPS) for(const tp of TPS){ const o=sim(j,dir,sv,tp); if(!o) continue; const rm=o.r-CM/o.sp, rt=o.r-CT/o.sp; for(const p of pk) bump(`${sig}|${sv}|${tp}|${p}`,o.r,rm,rt,o.exit,o.sp,o.hold); } };
  for(let di=1;di<days.length-1;di++){ const ds=days[di], de=days[di+1]-1, ps=days[di-1]; if(de-ds!==95||ds-ps!==96) continue; const t0=k[ds][0]; if(!monthsOf[s].has(new Date(t0).toISOString().slice(0,7))) continue;
    let ph=-1e18,pl=1e18; for(let j=ps;j<ds;j++){ if(k[j][2]>ph) ph=k[j][2]; if(k[j][3]<pl) pl=k[j][3]; }
    for(const [nm,off,len] of SESS){ const ss=ds+off, se=ss+len-1; const oh=Math.max(k[ss][2],k[ss+1][2]), ol=Math.min(k[ss][3],k[ss+1][3]);
      for(let j=ss+2;j<=se-2;j++){ const d=close[j]>oh?1:close[j]<ol?-1:0; if(d){ signal('ORB '+nm, j, -d, t0); break; } } }
    if(ph>pl) for(let j=ds;j<=de-2;j++){ const d=close[j]>ph?1:close[j]<pl?-1:0; if(d){ const hr=new Date(k[j][0]).getUTCHours(); const band=hr<7?'Asya 00–07':hr<12?'Londra 07–12':hr<21?'New York 12–21':'Gece 21–24'; signal('PDH/PDL '+band, j, -d, t0); break; } } }
}
console.log('coin',coins,'sinyal',nsig);
const fx=(v,d=2)=>Number.isFinite(v)?(v>=0?'+':'')+v.toFixed(d).replace('.',','):'—', f0=(v,d=0)=>Number.isFinite(v)?v.toFixed(d).replace('.',','):'—';
const cell=o=>{ if(!o||!o.n) return '—'; const m=o.s/o.n, mm=o.sm/o.n, mt=o.st/o.n; const sd=Math.sqrt(Math.max(0,o.sm2/o.n-mm*mm)); const t=sd>0?mm/sd*Math.sqrt(o.n):NaN; const pf=o.neg<0?o.pos/-o.neg:NaN;
  return `n ${o.n} · ${fx(m)} / **${fx(mm)}** / ${fx(mt)} R · t ${fx(t,1)} · PF ${f0(pf,2)} · kazanma %${f0(100*o.w/o.n)} · stop %${f0(100*o.ex.stop/o.n)} hedef %${f0(100*o.ex.hedef/o.n)} · stop %${f0(100*o.sp/o.n,2)}`; };
const refCell=o=>{ if(!o||!o.n) return '—'; const m=o.s/o.n, sd=Math.sqrt(Math.max(0,o.s2/o.n-m*m)); return `n ${o.n} · ${fx(m*100,3)} % · t ${fx(sd>0?m/sd*Math.sqrt(o.n):NaN,1)}`; };
const SIGS=['ORB Asya','ORB Londra','ORB New York','PDH/PDL Asya 00–07','PDH/PDL Londra 07–12','PDH/PDL New York 12–21','PDH/PDL Gece 21–24'];
const out=[`# Test #25 · Asya kırılımını satmak, stoplu simülasyon · ${new Date().toISOString().slice(0,10)}`,'',
  `Ayın ilk ${TOP} coini (${coins} coin), 15 dk mumlar, 2020-06 → bugün; ${nsig.toLocaleString('tr-TR')} sinyal. Kural: kırılım yönünün tersine giriş (sonraki mumun VWAP'ı), stop kırılım mumunun ucu ± %0,15 (en az 0,8 ATR(14); "ATR+%1,5" varyantında en az %1,5; 3 ATR'yi aşarsa işlem yok), hedef 1R / 1,5R / 2R tam kapanış ya da hedefsiz, zaman stopu 4 sa (çıkış o mumun VWAP'ı). Aynı mumda stop ve hedef → stop; giriş mumunda yalnız stop sayılır. Hücre: n · brüt / **maker** / taker R (gidiş-dönüş %0,04 / %0,16 ÷ stop) · t (maker) · PF (maker) · kazanma (maker) · çıkış payları · ortalama stop %. Dönemler: 1 = 2020-06 → 05/2023, 2 = 06/2023 → bugün, Y = son 12 ay. Önceden seçilen ana varyant: ATR stop, hedef 1,5R.`,''];
for(const sig of SIGS){ out.push(`## ${sig}`,'',`Stopsuz karşılaştırma (giriş VWAP → +4 sa VWAP, ters yön, maliyetsiz): 1: ${refCell(REF[sig+'|1'])} · 2: ${refCell(REF[sig+'|2'])} · Y: ${refCell(REF[sig+'|Y'])}`,'',
  '| Stop | Hedef | 1. dönem | 2. dönem | Son 12 ay |','|---|---|---|---|---|');
  for(const sv of STOPS) for(const tp of TPS) out.push(`| ${sv} | ${tp?fx(tp,1).replace('+','')+'R':'yok (4 sa)'} | ${cell(ST[`${sig}|${sv}|${tp}|1`])} | ${cell(ST[`${sig}|${sv}|${tp}|2`])} | ${cell(ST[`${sig}|${sv}|${tp}|Y`])} |`); out.push(''); }
out.push('## Yıl yıl · ana varyant (ATR stop, hedef 1,5R)','','| Sinyal | '+[2020,2021,2022,2023,2024,2025,2026].join(' | ')+' |','|---|'+'---|'.repeat(7));
for(const sig of ['ORB Asya','PDH/PDL Asya 00–07','ORB Londra','ORB New York']){ out.push(`| ${sig} | `+[2020,2021,2022,2023,2024,2025,2026].map(y=>{ const o=ST[`${sig}|ATR|1.5|y${y}`]; return o?`${o.n} · ${fx(o.sm/o.n)} R`:'—'; }).join(' | ')+' |'); }
out.push('');
fs.writeFileSync(path.join(__dirname,'test25-asya-kirilim-report.md'),out.join('\n')+'\n'); console.log(out.join('\n'));
