// Seans açılışı ve gün içi yapı kalıpları (9 Ekim 2026; kullanıcı: "seansların ilk iki 15 dk mumu önceki günün high/low'unun
// altında/üstünde kapandığında ne oldu gibi ilişkileri inceleyelim"). Arşiv 15 dk mumları, ayın ilk 30 coini (BTC/ETH dahil), 2020-06 → bugün.
// Kalıplar: (1) seansın ilk iki mumu önceki gün ucunun dışında kapanır → yönünde devam mı? (2) açılış aralığı (ilk 30 dk) kırılımı,
// (3) günün ilk kapanışı önceki gün ucunun dışında, (4) iç gün sonrası kırılım, (5) Asya → Londra → New York devam/dönüş,
// (6) CME hafta sonu boşluğu, (7) öğlene kadar trend günü → kapanışa devam. Giriş/çıkış VWAP (kapanış sıçramasından arınmış), maliyetsiz;
// taker gidiş-dönüş %0,16, maker %0,04 ayrıca düşülmeli. Dönemler: 2020-06 → 05/2023, 06/2023 → bugün, son 12 ay.
// Kullanım: node --max-old-space-size=8000 tests/seans-acilis.js   → tests/seans-acilis-report.md
const fs=require('fs'), path=require('path'); const ARCH=path.join(__dirname,'data','arch');
const M15=9e5,H=36e5,DAY=864e5,L=Math.log, MID=Date.parse('2023-06-01T00:00Z'), Y12=Date.now()-365*DAY;
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const TOP=30;
const monthsOf={}; for(const m in U) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN, tstat=a=>{ if(a.length<3) return NaN; const m=avg(a); const v=a.reduce((x,y)=>x+(y-m)**2,0)/(a.length-1); return v>0?m/Math.sqrt(v/a.length):NaN; };
const fx=(v,d=2)=>Number.isFinite(v)?v.toFixed(d).replace('.',','):'—', pc=(v,d=2)=>Number.isFinite(v)?(v*100).toFixed(d).replace('.',',')+'%':'—';
const R={}; const add=(key,t,r,extra)=>{ (R[key]=R[key]||[]).push({t,r,...extra}); };
const SESS=[['Asya 00–07',0,28],['Londra 07–12',28,20],['New York 12–21',48,36]];
let coins=0;
for(const s of Object.keys(monthsOf).sort()){ const k=csv(path.join(ARCH,'15m',s+'.csv')); if(k.length<4000) continue; coins++;
  const n=k.length, close=k.map(r=>r[4]); const vw=j=>k[j][5]>0?k[j][7]/k[j][5]:close[j]; const ix=new Map(k.map((r,i)=>[r[0],i]));
  const rg=new Float64Array(n); for(let i=0;i<n;i++) rg[i]=L(k[i][2]/k[i][3]); let rgC=new Float64Array(n+1); for(let i=0;i<n;i++) rgC[i+1]=rgC[i]+rg[i];
  const days=[]; for(let i=0;i<n;i++) if(k[i][0]%DAY===0) days.push(i);
  for(let di=1;di<days.length-1;di++){ const ds=days[di], de=days[di+1]-1, ps=days[di-1]; if(de-ds!==95||ds-ps!==96) continue; const t0=k[ds][0]; const mo=new Date(t0).toISOString().slice(0,7); if(!monthsOf[s].has(mo)) continue; if(ds<2880) continue;
    const rg30=(rgC[ds]-rgC[ds-2880])/2880; const atrD=rg30*Math.sqrt(96)*0.6; // günlük tipik aralık (log)
    let ph=-1e18,pl=1e18; for(let j=ps;j<ds;j++){ if(k[j][2]>ph) ph=k[j][2]; if(k[j][3]<pl) pl=k[j][3]; } const pIn=ph>pl;
    const retTo=(a,b)=>L(vw(b)/vw(a)); // a: giriş mumu (VWAP), b: çıkış mumu
    const nextDay=de+1; const seg=(a,len)=>Math.min(a+len,n-1);
    // (1) seansın ilk iki mumu önceki gün ucunun dışında
    for(const [nm,off,len] of SESS){ const ss=ds+off, se=ds+off+len-1; if(se+96>=n) continue; const c0=close[ss], c1=close[ss+1]; let dir=0; if(c0>ph&&c1>ph) dir=1; else if(c0<pl&&c1<pl) dir=-1;
      if(dir){ const e=ss+2; add('s2|'+nm, t0, dir*retTo(e,se), {dir, r4:dir*retTo(e,seg(e,16)), r24:dir*retTo(e,seg(e,96))}); }
      // ilk mum dışarıda, ikincisi içeri döndü (başarısız kırılım)
      let fd=0; if(c0>ph&&c1<=ph) fd=-1; else if(c0<pl&&c1>=pl) fd=1; if(fd){ const e=ss+2; add('s2fail|'+nm, t0, fd*retTo(e,se), {r4:fd*retTo(e,seg(e,16))}); }
      // (2) açılış aralığı kırılımı: ilk 30 dk, ilk dışarı kapanış
      const oh=Math.max(k[ss][2],k[ss+1][2]), ol=Math.min(k[ss][3],k[ss+1][3]); for(let j=ss+2;j<=se-2;j++){ const d=close[j]>oh?1:close[j]<ol?-1:0; if(d){ add('or|'+nm, t0, d*retTo(j+1,se), {r4:d*retTo(j+1,seg(j+1,16)), orSz:L(oh/ol)/(rg30*1.4), late:(j-ss)/4}); break; } }
      // seans getirisi (zincir için)
      if(nm.startsWith('Asya')){} }
    // (3) günün ilk kapanışı önceki gün ucunun dışında (hangi saatte olursa olsun) → gün sonuna
    if(pIn){ for(let j=ds;j<=de-2;j++){ const d=close[j]>ph?1:close[j]<pl?-1:0; if(d){ add('pdBrk', t0, d*retTo(j+1,de), {r4:d*retTo(j+1,seg(j+1,16)), hr:new Date(k[j][0]).getUTCHours()}); break; } } }
    // (4) iç gün sonrası kırılım
    if(di>=2){ const pps=days[di-2]; if(ps-pps===96){ let h2=-1e18,l2=1e18; for(let j=pps;j<ps;j++){ if(k[j][2]>h2) h2=k[j][2]; if(k[j][3]<l2) l2=k[j][3]; } if(ph<=h2&&pl>=l2){ for(let j=ds;j<=de-2;j++){ const d=close[j]>ph?1:close[j]<pl?-1:0; if(d){ add('inside', t0, d*retTo(j+1,de), {r4:d*retTo(j+1,seg(j+1,16))}); break; } } } } }
    // (5) seans zinciri: Asya getirisi → Londra, Londra → New York, (Asya+Londra) → NY
    { const a=L(close[ds+27]/k[ds][1])/(rg30*Math.sqrt(28)*0.6), ld=L(vw(ds+47)/vw(ds+28)), ny=L(vw(ds+83)/vw(ds+48)); const l_=L(close[ds+47]/close[ds+27])/(rg30*Math.sqrt(20)*0.6);
      add('chainAL', t0, ld, {x:a}); add('chainLN', t0, ny, {x:l_}); add('chainAN', t0, ny, {x:L(close[ds+47]/k[ds][1])/(rg30*Math.sqrt(48)*0.6)}); }
    // (6) CME boşluğu: cuma 21:00 kapanışı → pazartesi 00:00; pazartesi 21:00'e kadar dolma payı
    { const dow=new Date(t0).getUTCDay(); if(dow===1){ const fi=ix.get(t0-3*DAY+21*H-M15); if(fi!=null){ const gap=L(k[ds][1]/close[fi]); if(Math.abs(gap)>0.3*atrD){ const fillAt=j=>{ const m=L(close[j]/close[fi]); return 1-Math.max(0,Math.min(1,gap>0?m/gap:m/gap)); }; add('cme', t0, -Math.sign(gap)*retTo(ds+1,ds+83), {gap:gap/atrD, fill:fillAt(ds+83), fill2:fillAt(seg(ds,180))}); } } } }
    // (7) öğlene kadar trend günü: 12:00'de |gün açılışından değişim| ≥ 1,5 × yarım günlük tipik aralık → kapanışa devam
    { const m=L(close[ds+47]/k[ds][1]); const half=rg30*Math.sqrt(48)*0.6; if(Math.abs(m)>=1.5*half) add('trendDay', t0, Math.sign(m)*retTo(ds+48,de), {x:Math.abs(m)/half}); }
  } }
console.log('coin',coins);
const out=[`# Seans açılışı ve gün içi kalıplar · ${new Date().toISOString().slice(0,10)}`,'',`Ayın ilk ${TOP} coini (${coins} coin, 2020-06 → bugün), 15 dk mumlar. Giriş = kurulumun oluştuğu mumdan sonraki mumun VWAP'ı, çıkış = seans/gün sonu mumunun VWAP'ı (ya da +4 sa / +24 sa), maliyetsiz. Taker gidiş-dönüş %0,16, maker %0,04 düşülecek. Dönemler: 1 = 2020-06 → 05/2023, 2 = 06/2023 → bugün, Y = son 12 ay. t ≥ 3 ve iki dönemde aynı işaret = gerçek; önceki gün ucu = önceki UTC günün yüksek/düşüğü.`,''];
const per=(rows,f=r=>r.r)=>{ const P=[['1',rows.filter(r=>r.t<MID)],['2',rows.filter(r=>r.t>=MID)],['Y',rows.filter(r=>r.t>=Y12)]]; return P.map(([nm,a])=>{ const v=a.map(f).filter(Number.isFinite); return `${nm}: n ${v.length}, ort. ${pc(avg(v))}, kazanma %${fx(100*v.filter(x=>x>0).length/Math.max(1,v.length),0)}, t ${fx(tstat(v),1)}`; }).join(' · '); };
out.push('## 1) Seansın ilk iki 15 dk mumu önceki gün ucunun dışında kapanıyor','', 'İki mum da önceki gün yükseğinin üstünde → long (altında → short); giriş 3. mumun VWAP\'ı; çıkış seans sonu / +4 sa / +24 sa.','');
for(const [nm] of SESS){ const rows=R['s2|'+nm]||[]; out.push(`- **${nm}** · seans sonuna: ${per(rows)}`); out.push(`  - +4 sa: ${per(rows,r=>r.r4)}`); out.push(`  - +24 sa: ${per(rows,r=>r.r24)}`);
  out.push(`  - yalnız long (üstte): ${per(rows.filter(r=>r.dir>0))}`); out.push(`  - yalnız short (altta): ${per(rows.filter(r=>r.dir<0))}`); }
out.push('','**Başarısız kırılım** (ilk mum dışarıda, ikinci mum içeri kapanış → ters yön), seans sonuna / +4 sa:','');
for(const [nm] of SESS){ const rows=R['s2fail|'+nm]||[]; out.push(`- ${nm}: ${per(rows)} · +4 sa: ${per(rows,r=>r.r4)}`); }
out.push('','## 2) Açılış aralığı kırılımı (seansın ilk 30 dk)','','İlk 30 dakikanın yüksek/düşüğü; seans içinde ilk dışarı kapanış yönünde giriş (sonraki mumun VWAP\'ı), çıkış seans sonu VWAP. Crabel (1990) ve Zarattini–Aziz–Barbon (2023, QQQ 5 dk ORB) kalıbı.','');
for(const [nm] of SESS){ const rows=R['or|'+nm]||[]; out.push(`- **${nm}**: ${per(rows)} · +4 sa: ${per(rows,r=>r.r4)}`);
  const narrow=rows.filter(r=>r.orSz<0.7), wide=rows.filter(r=>r.orSz>=1.3), early=rows.filter(r=>r.late<=1); out.push(`  - dar aralık (<0,7×): ${per(narrow)}`); out.push(`  - geniş aralık (≥1,3×): ${per(wide)}`); out.push(`  - ilk 1 saatte kırılan: ${per(early)}`); }
out.push('','## 3) Günün ilk kapanışı önceki gün ucunun dışında → gün sonuna','', `Tümü: ${per(R.pdBrk||[])}`,'');
for(const [nm,a,b] of [['Asya saatleri (00–07)',0,7],['Londra (07–12)',7,12],['New York (12–21)',12,21],['Gece (21–24)',21,24]]){ const rows=(R.pdBrk||[]).filter(r=>r.hr>=a&&r.hr<b); out.push(`- kırılım ${nm}: ${per(rows)} · +4 sa: ${per(rows,r=>r.r4)}`); }
out.push('','## 4) İç gün sonrası kırılım','',`Önceki gün bir önceki günün aralığı içinde kaldıysa (iç gün), ertesi gün ilk dışarı kapanış yönünde, gün sonuna: ${per(R.inside||[])} · +4 sa: ${per(R.inside||[],r=>r.r4)}`,'');
out.push('## 5) Seans zinciri: önceki seansın hareketi sonrakini söylüyor mu?','','x = önceki seansın getirisi ÷ o seansın tipik aralığı; satırlar x beşliği; hücre = sonraki seansın VWAP→VWAP getirisi (işaretsiz, long yönünde). Devam = x artıyken artı, dönüş = x artıyken eksi.','');
for(const [key,nm] of [['chainAL','Asya → Londra'],['chainLN','Londra → New York'],['chainAN','Asya+Londra → New York']]){ const rows=R[key]||[]; const P=[['1',rows.filter(r=>r.t<MID)],['2',rows.filter(r=>r.t>=MID)]];
  out.push(`**${nm}**`,'','| x beşliği | 1. dönem ort. | n | 2. dönem ort. | n |','|---|---|---|---|---|');
  const xs=rows.map(r=>r.x).filter(Number.isFinite).sort((a,b)=>a-b); const q=[0.2,0.4,0.6,0.8].map(p=>xs[Math.floor(p*xs.length)]); out.push(`(x sınırları: ${q.map(v=>fx(v,2)).join(' / ')}; sonlu x ${xs.length}/${rows.length})`,''); const bk=x=>x<q[0]?0:x<q[1]?1:x<q[2]?2:x<q[3]?3:4; const lab=['en düşük (sert düşüş)','2','3','4','en yüksek (sert yükseliş)'];
  for(let b=0;b<5;b++){ const c=P.map(([,a])=>a.filter(r=>Number.isFinite(r.x)&&bk(r.x)===b)); out.push(`| ${lab[b]} | ${pc(avg(c[0].map(r=>r.r)))} | ${c[0].length} | ${pc(avg(c[1].map(r=>r.r)))} | ${c[1].length} |`); } out.push(''); }
out.push('## 6) CME hafta sonu boşluğu','',`Cuma 21:00 UTC kapanışı ile pazartesi 00:00 açılışı arasındaki fark ≥ 0,3 günlük tipik aralıksa, boşluğun tersine (dolma yönünde) pazartesi 21:00'e kadar: ${per(R.cme||[])}. Pazartesi 21:00'e kadar dolan pay ort. ${fx(avg((R.cme||[]).map(r=>r.fill)),2)}, çarşamba sabahına kadar ${fx(avg((R.cme||[]).map(r=>r.fill2)),2)} (1 = tamamen doldu). (CME vadelisi BTC'ye özgüdür; burada her coin kendi cuma kapanışıyla.)`,'');
out.push('## 7) Öğlene kadar trend günü','',`12:00 UTC'de gün açılışından değişim ≥ 1,5 × yarım günlük tipik aralıksa, yönünde 21:00'e... gün sonuna: ${per(R.trendDay||[])}`,'');
out.push('## Okuma','','Bir kalıbın işe yaraması için: iki dönemde de aynı işaret, t ≥ 3, maliyet (%0,04–0,16) düşüldükten sonra artı. Bu tabloda VWAP ile ölçüldüğü için kapanış sıçraması yoktur.');
fs.writeFileSync(path.join(__dirname,'seans-acilis-report.md'),out.join('\n')+'\n'); console.log(out.join('\n'));
