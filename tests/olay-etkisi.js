// Olay etkisi ve geniş zaman dilimi (8 Ekim 2026; kullanıcı: "sosyal medya, haber, ekonomideki kanonik olaylar; hangi olay kriptoyu nasıl
// etkiledi; seans farkı; daha geniş zaman aralığı; daha çok örneklem"). Bulut ağı yalnız Binance arşivine ve GitHub'a açık; makro takvim
// (FOMC, CPI) ve kanonik olay listesi tests/data/events/ altında (federalreserve.gov, bls.gov, web + bellek).
// A) Planlı makro (FOMC 14:00 ET, CPI/NFP 08:30 ET; DST'ye göre UTC): BTC ve alt sepetinde pencereler [−4 sa,0] [0,15 dk] [0,1 sa] [1,4 sa] [4,24 sa]:
//    oynaklık taban gününe oranı; ilk 15 dk / 1 sa yönünden sonra 4 sa ve 24 sa devam mı dönüş mü (VWAP ile, maliyetsiz); alt sepeti BTC'yi izliyor mu.
// B) Kanonik olaylar: BTC ve alt medyanının olay anından +1 sa, +4 sa, +1 g, +3 g, +7 g, +30 g getirisi; oynaklık sonraki 7 gün / önceki 30 gün;
//    kötü/iyi haber gruplarının ortalaması; haber yönünü bilseydik ilk 1 sa'ten sonra girmek işe yarar mıydı.
// C) Seans/saat mevsimselliği: BTC ve alt sepeti UTC saatine ve haftanın gününe göre ortalama 1 sa getiri ve oynaklık payı, iki yarı;
//    Asya aralığı kırılımı (Londra 07–10 UTC'de Asya tepesi/dibi kırılınca 16:00 UTC'ye kadar devam mı?).
// D) Geniş zaman dilimi (günlük, ayın ilk 100 coini): 7/30/90 gün momentum, 1/3 gün dönüş, hacim patlaması, 30 gün tepeye uzaklık, BTC'ye göre
//    göreli güç → sonraki 7 gün; haftalık coinler arası IC iki yarı + son 12 ay, beşlik farkı (günlük maliyet %0,16 önemsiz).
// Kullanım: node --max-old-space-size=12000 tests/olay-etkisi.js [--top 30] → tests/olay-etkisi-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'), EV=path.join(__dirname,'data','events'); const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',30), M15=9e5, H=36e5, DAY=864e5, L=Math.log;
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const fx=(v,d=2)=>Number.isFinite(v)?v.toFixed(d).replace('.',','):'—'; const pc=(v,d=2)=>Number.isFinite(v)?(v*100).toFixed(d).replace('.',',')+'%':'—';
const avg=a=>a.length?a.reduce((p,x)=>p+x,0)/a.length:NaN, med=a=>{ if(!a.length) return NaN; const s=a.slice().sort((x,y)=>x-y); return s[s.length>>1]; };
const tstat=a=>{ if(a.length<3) return NaN; const m=avg(a); const sd=Math.sqrt(avg(a.map(x=>(x-m)**2))); return sd>0?m/sd*Math.sqrt(a.length):NaN; };
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const months=Object.keys(U).sort();
const macro=JSON.parse(fs.readFileSync(path.join(EV,'macro.json'),'utf8')), olay=JSON.parse(fs.readFileSync(path.join(EV,'olaylar.json'),'utf8')).events;
const out=[`# Olay etkisi, seans mevsimselliği ve geniş zaman dilimi · ${new Date().toISOString().slice(0,10)}\n`];
// ---------- veri ----------
const btc=csv(path.join(ARCH,'15m','BTCUSDT.csv')); const bIx=new Map(btc.map((r,i)=>[r[0],i]));
const vwap=k=>k.map(r=>r[5]>0?r[7]/r[5]:r[4]); const bVw=vwap(btc);
const monthsOf={}; for(const m of months) for(const s of U[m].slice(0,TOP)) if(s!=='BTCUSDT') (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const alts={}; for(const s in monthsOf){ const k=csv(path.join(ARCH,'15m',s+'.csv')); if(k.length>3000) alts[s]={k,ix:new Map(k.map((r,i)=>[r[0],i])),vw:vwap(k)}; }
console.log('BTC',btc.length,'alt',Object.keys(alts).length);
const inUni=(s,t)=>monthsOf[s].has(new Date(t).toISOString().slice(0,7));
// alt sepeti getirisi: t0→t1 (açılış zamanları), VWAP ile, evrendeki coinlerin ortalaması
function altRet(t0,t1,useVw=true){ const a=[]; for(const s in alts){ if(!inUni(s,t0)) continue; const A=alts[s]; const i=A.ix.get(t0), j=A.ix.get(t1); if(i==null||j==null) continue; a.push(useVw?L(A.vw[j]/A.vw[i]):L(A.k[j][4]/A.k[i][4])); } return a; }
const bRet=(t0,t1,useVw=true)=>{ const i=bIx.get(t0), j=bIx.get(t1); if(i==null||j==null) return NaN; return useVw?L(bVw[j]/bVw[i]):L(btc[j][4]/btc[i][4]); };
const bRange=(t0,t1)=>{ const i=bIx.get(t0), j=bIx.get(t1); if(i==null||j==null) return NaN; let h=-1e18,l=1e18; for(let x=i;x<j;x++){ if(btc[x][2]>h) h=btc[x][2]; if(btc[x][3]<l) l=btc[x][3]; } return L(h/l); };
// ABD yaz saati: Mart 2. Pazar 07:00 UTC → Kasım 1. Pazar 06:00 UTC
function isDST(t){ const d=new Date(t), y=d.getUTCFullYear(); const nth=(m,n)=>{ let x=new Date(Date.UTC(y,m,1)); let c=0; while(true){ if(x.getUTCDay()===0&&++c===n) return x.getTime(); x=new Date(x.getTime()+DAY); } }; return t>=nth(2,2)+7*H&&t<nth(10,1)+6*H; }
const etToUtc=(day,hET,mET)=>{ const t0=Date.parse(day+'T00:00:00Z'); return t0+((hET+(isDST(t0+12*H)?4:5))*60+mET)*60e3; };
const MID=Date.parse('2023-06-01T00:00Z');
// ---------- A) planlı makro ----------
out.push('## A) Planlı makro olaylar: FOMC, CPI, tarım dışı istihdam\n','Zamanlar ET → UTC (yaz/kış saati). Pencere oynaklığı = BTC o penceredeki yüksek/düşük aralığı; "taban" = aynı pencerenin olay olmayan günlerdeki ortalaması (yalnız hafta içi). Yön testi: açıklamadan sonraki ilk 15 dk (kapanıştan kapanışa) yönünde, sonraki mumun VWAP\'ından girip 4 sa / 24 sa sonra VWAP\'tan çıkınca ortalama getiri (maliyetsiz; taker %0,16).\n');
const nfp=[]; for(let y=2020;y<=2026;y++) for(let m=0;m<12;m++){ let d=new Date(Date.UTC(y,m,1)); while(d.getUTCDay()!==5) d=new Date(d.getTime()+DAY); if(d.getTime()<Date.now()) nfp.push(d.toISOString().slice(0,10)); }
const WIN=[['−4 sa→0',-16,0],['0→15 dk',0,1],['0→1 sa',0,4],['1→4 sa',4,16],['4→24 sa',16,96]];
const evSets=[['FOMC kararı (14:00 ET)',macro.fomc.map(d=>etToUtc(d,14,0))],['CPI (08:30 ET)',macro.cpi.map(d=>etToUtc(d,8,30))],['Tarım dışı istihdam (ayın ilk cuması 08:30 ET, kural)',nfp.map(d=>etToUtc(d,8,30))]];
const allEvT=new Set(evSets.flatMap(([,a])=>a.map(t=>Math.floor(t/DAY))));
out.push('| Olay | n | '+WIN.map(w=>w[0]+' oynaklık ÷ taban').join(' | ')+' | BTC ilk 15 dk sonra +4 sa (n, kazanma, ort. %, t) | +24 sa | Alt sepeti ilk 15 dk BTC yönünde +4 sa |','|---|---|'+WIN.map(()=>'---').join('|')+'|---|---|---|');
for(const [nm,ts] of evSets){ const ev=ts.filter(t=>bIx.has(t)&&bIx.has(t+96*M15)); const row=[nm,ev.length];
  for(const [,a,b] of WIN){ const e=ev.map(t=>bRange(t+a*M15,t+b*M15)).filter(Number.isFinite); const base=[]; for(const t of ev){ for(const off of [-7,-6,-5,-4,-3,-2,-1,1,2,3,4,5,6,7]){ const t2=t+off*DAY; if(allEvT.has(Math.floor(t2/DAY))) continue; const dw=new Date(t2).getUTCDay(); if(dw===0||dw===6) continue; const r=bRange(t2+a*M15,t2+b*M15); if(Number.isFinite(r)) base.push(r); } } row.push(fx(avg(e)/avg(base))); }
  const dirTest=(hold,alt)=>{ const r=[]; for(const t of ev){ const s=Math.sign(bRet(t,t+M15,false)); if(!s) continue; if(alt){ const a=altRet(t+M15,t+M15+hold*M15); if(a.length) r.push(s*avg(a)); } else { const x=bRet(t+M15,t+M15+hold*M15); if(Number.isFinite(x)) r.push(s*x); } } return r; };
  const f=r=>`${r.length}, %${fx(100*r.filter(x=>x>0).length/r.length,0)}, ${pc(avg(r))}, t ${fx(tstat(r),1)}`;
  row.push(f(dirTest(16,false)),f(dirTest(96,false)),f(dirTest(16,true))); out.push('| '+row.join(' | ')+' |'); }
// FOMC yönüyle ayrıntı: ilk 1 sa yönü → sonraki 23 sa, iki yarı
{ const ev=macro.fomc.map(d=>etToUtc(d,14,0)).filter(t=>bIx.has(t)&&bIx.has(t+96*M15)); const rows=[];
  for(const t of ev){ const s=Math.sign(bRet(t,t+4*M15,false)); if(!s) continue; rows.push({t,s,r1:bRet(t,t+4*M15,false),next:s*bRet(t+5*M15,t+96*M15),alt:s*avg(altRet(t+5*M15,t+96*M15))}); }
  const h1=rows.filter(r=>r.t<MID), h2=rows.filter(r=>r.t>=MID);
  out.push('',`FOMC ilk 1 sa yönünde sonraki 23 sa (BTC, VWAP): 2020–05/2023 ${h1.length} toplantı ort. ${pc(avg(h1.map(r=>r.next)))} (kazanma %${fx(100*h1.filter(r=>r.next>0).length/Math.max(1,h1.length),0)}); 06/2023–2026 ${h2.length} toplantı ${pc(avg(h2.map(r=>r.next)))} (%${fx(100*h2.filter(r=>r.next>0).length/Math.max(1,h2.length),0)}). Alt sepeti aynı: ${pc(avg(h1.map(r=>r.alt)))} / ${pc(avg(h2.map(r=>r.alt)))}.`,
    `Ortalama BTC |ilk 1 sa| FOMC'de ${pc(avg(rows.map(r=>Math.abs(r.r1))))}.`); }
// CPI ilk 15 dk yönü → +4 sa, iki yarı
{ const ev=macro.cpi.map(d=>etToUtc(d,8,30)).filter(t=>bIx.has(t)&&bIx.has(t+96*M15)); const rows=[];
  for(const t of ev){ const s=Math.sign(bRet(t,t+M15,false)); if(!s) continue; rows.push({t,r4:s*bRet(t+M15,t+17*M15),r24:s*bRet(t+M15,t+97*M15),a4:s*avg(altRet(t+M15,t+17*M15))}); }
  const f=(rs,k)=>`${rs.length} açıklama ort. ${pc(avg(rs.map(r=>r[k])))} (kazanma %${fx(100*rs.filter(r=>r[k]>0).length/Math.max(1,rs.length),0)}, t ${fx(tstat(rs.map(r=>r[k])),1)})`;
  const h1=rows.filter(r=>r.t<MID), h2=rows.filter(r=>r.t>=MID), y=rows.filter(r=>r.t>=Date.now()-365*DAY);
  out.push(`CPI ilk 15 dk yönünde +4 sa (BTC, VWAP): 2020–05/2023 ${f(h1,'r4')}; 06/2023–2026 ${f(h2,'r4')}; son 12 ay ${f(y,'r4')}. +24 sa: ${pc(avg(h1.map(r=>r.r24)))} / ${pc(avg(h2.map(r=>r.r24)))}. Alt sepeti +4 sa: ${pc(avg(h1.map(r=>r.a4)))} / ${pc(avg(h2.map(r=>r.a4)))}.`); }
// ---------- B) kanonik olaylar ----------
out.push('','## B) Kanonik olaylar\n','Olay anından (gün biliniyorsa 00:00 UTC) ileri getiriler, kapanıştan kapanışa. "Alt" = o ay ilk 30\'daki coinlerin medyanı. Oyn. = sonraki 7 günün 15 dk oynaklığı ÷ önceki 30 günün.\n','| Tarih | Olay | Yön | BTC +1 sa | +4 sa | +1 g | +3 g | +7 g | +30 g | Alt +1 g | Alt +7 g | Oyn. |','|---|---|---|---|---|---|---|---|---|---|---|---|');
const sdOf=(i0,i1)=>{ let s=0,c=0; for(let i=Math.max(1,i0);i<i1&&i<btc.length;i++){ const x=L(btc[i][4]/btc[i-1][4]); s+=x*x; c++; } return c?Math.sqrt(s/c):NaN; };
const grp={'-1':[],'1':[],'0':[]};
for(const e of olay){ const t=Date.parse(e.t); const t0=t-(t%M15); const i=bIx.get(t0); if(i==null) continue; const r=n=>i+n<btc.length?L(btc[i+n][4]/btc[i][4]):NaN;
  const altN=n=>{ const a=altRet(t0,t0+n*M15,false); return a.length?med(a):NaN; }; const vr=sdOf(i,i+672)/sdOf(i-2880,i);
  const row={r1:r(4),r4:r(16),d1:r(96),d3:r(288),d7:r(672),d30:r(2880),a1:altN(96),a7:altN(672),vr}; grp[String(e.yon)].push(row);
  out.push(`| ${e.t.slice(0,10)} | ${e.ad} | ${e.yon>0?'+':e.yon<0?'−':'0'} | ${pc(row.r1,1)} | ${pc(row.r4,1)} | ${pc(row.d1,1)} | ${pc(row.d3,1)} | ${pc(row.d7,1)} | ${pc(row.d30,1)} | ${pc(row.a1,1)} | ${pc(row.a7,1)} | ${fx(vr)} |`); }
out.push('','| Grup | n | BTC +1 g | +7 g | +30 g | Alt +1 g | Alt +7 g | Oyn. |','|---|---|---|---|---|---|---|---|');
for(const [k,nm] of [['-1','Kötü haber'],['1','İyi haber'],['0','Belirsiz']]){ const g=grp[k]; const m=f=>avg(g.map(f).filter(Number.isFinite)); out.push(`| ${nm} | ${g.length} | ${pc(m(x=>x.d1),1)} | ${pc(m(x=>x.d7),1)} | ${pc(m(x=>x.d30),1)} | ${pc(m(x=>x.a1),1)} | ${pc(m(x=>x.a7),1)} | ${fx(m(x=>x.vr))} |`); }
{ const g=grp['-1']; const after1h=g.map(x=>x.d1-x.r1).filter(Number.isFinite), after1d=g.map(x=>x.d7-x.d1).filter(Number.isFinite);
  out.push('',`Kötü haberde ilk 1 sa geçtikten sonra 1. güne kadar BTC ort. ${pc(avg(after1h),1)}; 1. günden 7. güne ${pc(avg(after1d),1)}. İyi haberde: ${pc(avg(grp['1'].map(x=>x.d1-x.r1).filter(Number.isFinite)),1)} / ${pc(avg(grp['1'].map(x=>x.d7-x.d1).filter(Number.isFinite)),1)}. (Olay listesi elle seçildi; büyük hareketler sonradan "olay" diye adlandırılır, bu yüzden günün getirisi önyargılı; sonraki günler daha dürüst.)`); }
// ---------- C) seans / saat mevsimselliği ----------
out.push('','## C) Seans ve saat mevsimselliği\n','BTC ve alt sepeti (ilk 30, eşit ağırlık): UTC saatine göre ortalama 1 sa getiri (baz puan) ve o saatin günlük oynaklıktaki payı; 2020–05/2023 ve 06/2023–2026.\n');
{ const acc={}; const add=(key,h,v,v2)=>{ const o=(acc[key]=acc[key]||{}); const q=(o[h]=o[h]||{r:[],v:0}); if(Number.isFinite(v)) q.r.push(v); if(Number.isFinite(v2)) q.v+=v2; };
  for(let i=4;i<btc.length-4;i+=4){ const t=btc[i][0]; if(t%H) continue; const h=new Date(t).getUTCHours(), half=t<MID?'1':'2'; const r=L(btc[i+4][4]/btc[i][4]); let v=0; for(let j=i+1;j<=i+4;j++) v+=L(btc[j][4]/btc[j-1][4])**2; add('btc'+half,h,r,v); add('btcD'+half,new Date(t).getUTCDay(),r,v); }
  // alt sepeti: her saatte evrendeki coinlerin ortalaması (hesap pahalı: 4 saatte bir örnekle)
  for(let i=4;i<btc.length-4;i+=16){ const t=btc[i][0]; if(t%H) continue; const h=new Date(t).getUTCHours(), half=t<MID?'1':'2'; const a=altRet(t,t+H,false); if(a.length<5) continue; let v=0,c=0; for(const s in alts){ if(!inUni(s,t)) continue; const A=alts[s]; const x=A.ix.get(t); if(x==null||x+4>=A.k.length) continue; for(let j=x+1;j<=x+4;j++) v+=L(A.k[j][4]/A.k[j-1][4])**2; c++; } add('alt'+half,h,avg(a),c?v/c:NaN); add('altD'+half,new Date(t).getUTCDay(),avg(a),c?v/c:NaN); }
  const line=(key)=>{ const o=acc[key]||{}; const tot=Object.values(o).reduce((p,q)=>p+q.v,0); return Array.from({length:24},(_,h)=>o[h]?`${String(h).padStart(2,'0')}: ${fx(1e4*avg(o[h].r),1)} bp (%${fx(100*o[h].v/tot,1)})`:'').join(' · '); };
  for(const [nm,key] of [['BTC 2020–05/2023','btc1'],['BTC 06/2023–2026','btc2'],['Alt sepeti 2020–05/2023','alt1'],['Alt sepeti 06/2023–2026','alt2']]) out.push(`**${nm}** (saat: ort. 1 sa getiri bp, oynaklık payı)\n`,line(key),'');
  const dl=key=>{ const o=acc[key]||{}; return ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((n,i)=>{ const d=(i+1)%7; return o[d]?`${n}: ${fx(1e4*avg(o[d].r),1)} bp/sa (t ${fx(tstat(o[d].r),1)})`:n; }).join(' · '); };
  out.push('**Haftanın günü** (ort. 1 sa getiri, bp):\n',`BTC 1. dönem: ${dl('btcD1')}`,`BTC 2. dönem: ${dl('btcD2')}`,`Alt 1. dönem: ${dl('altD1')}`,`Alt 2. dönem: ${dl('altD2')}`,''); }
// Asya aralığı kırılımı
{ const res={up:{1:[],2:[]},dn:{1:[],2:[]}}; let nDays=0;
  for(let i=0;i<btc.length;i++){ const t=btc[i][0]; if(t%DAY) continue; const j7=bIx.get(t+7*H), j10=bIx.get(t+10*H), j16=bIx.get(t+16*H); if(j7==null||j10==null||j16==null) continue; nDays++;
    let ah=-1e18,al=1e18; for(let x=i;x<j7;x++){ if(btc[x][2]>ah) ah=btc[x][2]; if(btc[x][3]<al) al=btc[x][3]; }
    let hit=null; for(let x=j7;x<j10;x++){ if(btc[x][2]>ah){ hit=['up',x]; break; } if(btc[x][3]<al){ hit=['dn',x]; break; } }
    if(!hit) continue; const [d,x]=hit; if(x+1>=j16) continue; const r=L(bVw[j16]/bVw[x+1])*(d==='up'?1:-1); res[d][t<MID?1:2].push(r); }
  const f=a=>`${a.length} gün, ort. ${pc(avg(a),2)}, kazanma %${fx(100*a.filter(x=>x>0).length/Math.max(1,a.length),0)}, t ${fx(tstat(a),1)}`;
  out.push(`**Asya aralığı kırılımı (BTC):** Londra 07–10 UTC'de Asya (00–07) tepesi kırılırsa long, dibi kırılırsa short; giriş kırılım mumundan sonraki mumun VWAP'ı, çıkış 16:00 UTC VWAP (maliyetsiz; taker %0,16). ${nDays} gün.`,`- Yukarı kırılım: 1. dönem ${f(res.up[1])} · 2. dönem ${f(res.up[2])}`,`- Aşağı kırılım: 1. dönem ${f(res.dn[1])} · 2. dönem ${f(res.dn[2])}`,''); }
// ---------- D) geniş zaman dilimi: günlük coinler arası ----------
out.push('## D) Geniş zaman dilimi: günlük coinler arası faktörler → sonraki 7 gün\n','Evren: ayın ilk 100 coini (delist dahil). Her hafta (pazartesi 00:00 UTC) coinler faktöre göre sıralanır; IC = Spearman(faktör, sonraki 7 gün getirisi), haftaların ortalaması. Beşlik farkı = en üst beşlik − en alt beşlik 7 günlük getiri (long−short, maliyetsiz; günlükte gidiş-dönüş %0,16 küçük). Dönemler: 2020-06 → 05/2023, 06/2023 → 2026, son 12 ay.\n');
{ const D1={}; const uni100={}; for(const m of months) for(const s of U[m].slice(0,100)) (uni100[s]=uni100[s]||new Set()).add(m);
  for(const s in uni100){ const k=csv(path.join(ARCH,'1d',s+'.csv')); if(k.length>120) D1[s]={k,ix:new Map(k.map((r,i)=>[r[0],i]))}; }
  const bD=D1.BTCUSDT; const FAC={ 'Momentum 7 g':(k,i)=>L(k[i][4]/k[i-7][4]), 'Momentum 30 g':(k,i)=>L(k[i][4]/k[i-30][4]), 'Momentum 90 g':(k,i)=>L(k[i][4]/k[i-90][4]), 'Momentum 30 g, son hafta hariç':(k,i)=>L(k[i-7][4]/k[i-30][4]),
    'Dönüş 1 g (ters)':(k,i)=>-L(k[i][4]/k[i-1][4]), 'Dönüş 3 g (ters)':(k,i)=>-L(k[i][4]/k[i-3][4]), 'Hacim 7 g / 30 g':(k,i)=>{ let a=0,b=0; for(let j=i-6;j<=i;j++) a+=k[j][7]; for(let j=i-29;j<=i;j++) b+=k[j][7]; return L((a/7)/Math.max(1,b/30)); },
    '30 g tepeye uzaklık':(k,i)=>{ let h=0; for(let j=i-29;j<=i;j++) h=Math.max(h,k[j][2]); return L(k[i][4]/h); }, 'Oynaklık 30 g (ters)':(k,i)=>{ let s=0; for(let j=i-29;j<=i;j++) s+=L(k[j][4]/k[j-1][4])**2; return -Math.sqrt(s/30); },
    'Oynaklık 7 g (ters)':(k,i)=>{ let s=0; for(let j=i-6;j<=i;j++) s+=L(k[j][4]/k[j-1][4])**2; return -Math.sqrt(s/7); }, 'Oynaklık 90 g (ters)':(k,i)=>{ let s=0; for(let j=i-89;j<=i;j++) s+=L(k[j][4]/k[j-1][4])**2; return -Math.sqrt(s/90); },
    'Günlük aralık 30 g (ters, (y−d)/k)':(k,i)=>{ let s=0; for(let j=i-29;j<=i;j++) s+=(k[j][2]-k[j][3])/k[j][4]; return -s/30; }, 'Bakiyeye göre işlem sayısı 7 g / 30 g':(k,i)=>{ let a=0,b=0; for(let j=i-6;j<=i;j++) a+=k[j][8]; for(let j=i-29;j<=i;j++) b+=k[j][8]; return L((a/7)/Math.max(1,b/30)); } };
  const weeks=[]; for(let t=Date.parse('2020-06-01T00:00Z');t<Date.now()-8*DAY;t+=DAY){ if(new Date(t).getUTCDay()===1) weeks.push(t); }
  const rank=a=>{ const ix=a.map((v,i)=>i).sort((x,y)=>a[x]-a[y]); const r=new Array(a.length); ix.forEach((k,j)=>r[k]=j); return r; };
  const spear=(x,y)=>{ const rx=rank(x), ry=rank(y); const n=x.length; const mx=(n-1)/2; let c=0,vx=0,vy=0; for(let i=0;i<n;i++){ c+=(rx[i]-mx)*(ry[i]-mx); vx+=(rx[i]-mx)**2; vy+=(ry[i]-mx)**2; } return c/Math.sqrt(vx*vy); };
  const Y12=Date.now()-365*DAY; out.push('| Faktör | Hafta | IC 1. dönem | t | IC 2. dönem | t | IC son 12 ay | Beşlik farkı 7 g (1. / 2. dönem / son 12 ay) |','|---|---|---|---|---|---|---|---|');
  for(const [nm,fn] of Object.entries(FAC)){ const ics={1:[],2:[],y:[]}, spr={1:[],2:[],y:[]};
    for(const t of weeks){ const mo=new Date(t).toISOString().slice(0,7); const xs=[],ys=[]; for(const s of (U[mo]||[]).slice(0,100)){ const D=D1[s]; if(!D||s==='BTCUSDT') continue; const i=D.ix.get(t); if(i==null||i<91||i+7>=D.k.length) continue; const v=fn(D.k,i,t); if(!Number.isFinite(v)) continue; xs.push(v); ys.push(L(D.k[i+7][4]/D.k[i][4])); }
      if(xs.length<20) continue; const ic=spear(xs,ys); const order=xs.map((v,i)=>i).sort((a,b)=>xs[a]-xs[b]); const q=Math.floor(xs.length/5); const top=avg(order.slice(-q).map(i=>ys[i])), bot=avg(order.slice(0,q).map(i=>ys[i]));
      const key=t<MID?1:2; ics[key].push(ic); spr[key].push(top-bot); if(t>=Y12){ ics.y.push(ic); spr.y.push(top-bot); } }
    out.push(`| ${nm} | ${ics[1].length+ics[2].length} | ${fx(avg(ics[1]),3)} | ${fx(tstat(ics[1]),1)} | ${fx(avg(ics[2]),3)} | ${fx(tstat(ics[2]),1)} | ${fx(avg(ics.y),3)} | ${pc(avg(spr[1]),2)} / ${pc(avg(spr[2]),2)} / ${pc(avg(spr.y),2)} |`); }
  out.push('','Okuma: IC 0,05 üstü ve t ≥ 3 iki dönemde de tutuyorsa gerçek; beşlik farkı haftalık long−short sepetin brüt getirisi. BTC\'ye göre momentum ayrı yazılmadı: aynı haftada BTC herkes için aynı olduğundan sıralaması momentumla birebir aynıdır.');
  // beşlik getirileri (long bacağı mı, short bacağı mı kazandırıyor?)
  out.push('','**Beşlik getirileri** (haftalık ort. sonraki 7 g getiri, en düşük beşlik → en yüksek; "evren" = o haftaki ortalama; Q5 − evren = yalnız long tutsan evrene göre fark; evren − Q1 = yalnız short):','| Faktör | Dönem | Q1 | Q2 | Q3 | Q4 | Q5 | Evren | Q5−evren | Evren−Q1 | Hafta artı (Q5−Q1) |','|---|---|---|---|---|---|---|---|---|---|---|');
  for(const nm of ['Oynaklık 30 g (ters)','30 g tepeye uzaklık','Momentum 7 g','Hacim 7 g / 30 g']){ const fn=FAC[nm]; const acc={1:[],2:[],y:[]};
    for(const t of weeks){ const mo=new Date(t).toISOString().slice(0,7); const xs=[],ys=[]; for(const s of (U[mo]||[]).slice(0,100)){ const D=D1[s]; if(!D||s==='BTCUSDT') continue; const i=D.ix.get(t); if(i==null||i<91||i+7>=D.k.length) continue; const v=fn(D.k,i,t); if(!Number.isFinite(v)) continue; xs.push(v); ys.push(L(D.k[i+7][4]/D.k[i][4])); }
      if(xs.length<20) continue; const order=xs.map((v,i)=>i).sort((a,b)=>xs[a]-xs[b]); const q=Math.floor(xs.length/5); const Q=[0,1,2,3,4].map(j=>avg(order.slice(j*q,j===4?order.length:(j+1)*q).map(i=>ys[i]))); const row={Q,m:avg(ys)};
      acc[t<MID?1:2].push(row); if(t>=Y12) acc.y.push(row); }
    for(const [key,lab] of [[1,'1. dönem'],[2,'2. dönem'],['y','son 12 ay']]){ const R=acc[key]; if(!R.length) continue; const Qm=[0,1,2,3,4].map(j=>avg(R.map(r=>r.Q[j]))), m=avg(R.map(r=>r.m));
      out.push(`| ${nm} | ${lab} (${R.length} hf) | ${Qm.map(v=>pc(v,2)).join(' | ')} | ${pc(m,2)} | ${pc(Qm[4]-m,2)} | ${pc(m-Qm[0],2)} | %${fx(100*R.filter(r=>r.Q[4]>r.Q[0]).length/R.length,0)} |`); } }
  // 30 günlük ufuk: düşük oynaklık ve tepeye yakınlık
  out.push('','**30 günlük ufuk** (aynı sıralama, sonraki 30 g getiri; haftalık örnekler çakışır, t bu yüzden iyimser):','| Faktör | IC 1. dönem | t | IC 2. dönem | t | IC son 12 ay | Q5−Q1 30 g (1. / 2. / son 12 ay) | Q5−evren (1. / 2. / son 12 ay) |','|---|---|---|---|---|---|---|---|');
  for(const nm of ['Oynaklık 30 g (ters)','30 g tepeye uzaklık','Momentum 30 g, son hafta hariç','Momentum 90 g']){ const fn=FAC[nm]; const ics={1:[],2:[],y:[]}, spr={1:[],2:[],y:[]}, lo={1:[],2:[],y:[]};
    for(const t of weeks){ if(t>Date.now()-31*DAY) continue; const mo=new Date(t).toISOString().slice(0,7); const xs=[],ys=[]; for(const s of (U[mo]||[]).slice(0,100)){ const D=D1[s]; if(!D||s==='BTCUSDT') continue; const i=D.ix.get(t); if(i==null||i<91||i+30>=D.k.length) continue; const v=fn(D.k,i,t); if(!Number.isFinite(v)) continue; xs.push(v); ys.push(L(D.k[i+30][4]/D.k[i][4])); }
      if(xs.length<20) continue; const ic=spear(xs,ys); const order=xs.map((v,i)=>i).sort((a,b)=>xs[a]-xs[b]); const q=Math.floor(xs.length/5); const top=avg(order.slice(-q).map(i=>ys[i])), bot=avg(order.slice(0,q).map(i=>ys[i])), m=avg(ys);
      const key=t<MID?1:2; ics[key].push(ic); spr[key].push(top-bot); lo[key].push(top-m); if(t>=Y12){ ics.y.push(ic); spr.y.push(top-bot); lo.y.push(top-m); } }
    out.push(`| ${nm} | ${fx(avg(ics[1]),3)} | ${fx(tstat(ics[1]),1)} | ${fx(avg(ics[2]),3)} | ${fx(tstat(ics[2]),1)} | ${fx(avg(ics.y),3)} | ${pc(avg(spr[1]),1)} / ${pc(avg(spr[2]),1)} / ${pc(avg(spr.y),1)} | ${pc(avg(lo[1]),1)} / ${pc(avg(lo[2]),1)} / ${pc(avg(lo.y),1)} |`); }
  // ---------- E) düşük oynaklık: basit getiri + fonlama + maliyetle haftalık simülasyon ----------
  out.push('','## E) Düşük oynaklık faktörü: gerçekçi haftalık simülasyon\n','Yukarıdaki IC ve beşlikler log getiriyle hesaplandı; log getiri yüksek oynaklıklı coini olduğundan kötü gösterir (oynaklık sürüklemesi −σ²/2). Short bacağı için basit getiri geçerlidir. Burada her pazartesi 00:00 UTC ayın ilk 100 coini 30 g oynaklığa göre sıralanır; en oynak beşlik (Q1) eşit ağırlıkla short, en durgun beşlik (Q5) eşit ağırlıkla long, 7 gün tutulur, basit getiri; fonlama arşivden (short alır, long öder); maliyet bacak başına gidiş-dönüş taker %0,16 (maker %0,04 ayrıca). 7 gün dolmadan listeden düşen coin atlanır (short bacağı için muhafazakâr). Bacak başı nominal = özkaynağın 1 katı.\n');
  { const FUND={}; const fundSum=(sym,t0,t1)=>{ if(!(sym in FUND)){ const f=csv(path.join(ARCH,'funding',sym+'.csv')); FUND[sym]=f.length?f:null; } const f=FUND[sym]; if(!f) return 0; let s=0; for(const r of f){ if(r[0]>=t0&&r[0]<t1) s+=r[1]; } return s; };
    const volFn=FAC['Oynaklık 30 g (ters)']; const rows=[];
    for(const t of weeks){ const mo=new Date(t).toISOString().slice(0,7); const xs=[],ys=[],fs_=[],nm_=[]; for(const sy of (U[mo]||[]).slice(0,100)){ const D=D1[sy]; if(!D||sy==='BTCUSDT') continue; const i=D.ix.get(t); if(i==null||i<91||i+7>=D.k.length) continue; const v=volFn(D.k,i,t); if(!Number.isFinite(v)) continue; xs.push(v); ys.push(D.k[i+7][4]/D.k[i][4]-1); fs_.push(fundSum(sy,t,t+7*DAY)); nm_.push(sy); }
      if(xs.length<20) continue; const order=xs.map((v,i)=>i).sort((a,b)=>xs[a]-xs[b]); const q=Math.floor(xs.length/5); const Q1=order.slice(0,q), Q5=order.slice(-q);
      const shortRet=avg(Q1.map(i=>-ys[i]+fs_[i])), longRet=avg(Q5.map(i=>ys[i]-fs_[i])); const worst=Q1.reduce((a,i)=>ys[i]>ys[a]?i:a,Q1[0]);
      rows.push({t,shortRet,longRet,shortF:avg(Q1.map(i=>fs_[i])),longF:avg(Q5.map(i=>fs_[i])),uni:avg(ys),q1:avg(Q1.map(i=>ys[i])),q5:avg(Q5.map(i=>ys[i])),worst:ys[worst],worstSym:nm_[worst],q1max:Math.max(...Q1.map(i=>ys[i]))}); }
    const periods=[['1. dönem (2020-06 → 05/2023)',r=>r.t<MID],['2. dönem (06/2023 → 2026)',r=>r.t>=MID],['son 12 ay',r=>r.t>=Y12],['son 6 ay',r=>r.t>=Date.now()-183*DAY]];
    const sim=(R,leg,cost)=>{ let eq=1,pk=1,dd=0; const ws=[]; for(const r of R){ const w=(leg==='short'?r.shortRet:leg==='long'?r.longRet:(r.shortRet+r.longRet))-cost*(leg==='ls'?2:1); ws.push(w); eq*=1+w; pk=Math.max(pk,eq); dd=Math.max(dd,1-eq/pk); } const yrs=R.length/52.18; return {ret:eq-1,ann:Math.pow(eq,1/Math.max(yrs,0.1))-1,dd,win:ws.filter(x=>x>0).length/Math.max(1,ws.length),mean:avg(ws),worst:Math.min(...ws),t:tstat(ws)}; };
    out.push('| Dönem | Hafta | Evren ort. basit 7 g | Q1 (en oynak) basit | Q5 (en durgun) basit | Q1 fonlama/hafta (short alır) | Q5 fonlama/hafta | En kötü tek coin-hafta (short için) |','|---|---|---|---|---|---|---|---|');
    for(const [lab,f] of periods){ const R=rows.filter(f); if(!R.length) continue; const w=R.reduce((a,r)=>r.worst>a.worst?r:a,R[0]); out.push(`| ${lab} | ${R.length} | ${pc(avg(R.map(r=>r.uni)),2)} | ${pc(avg(R.map(r=>r.q1)),2)} | ${pc(avg(R.map(r=>r.q5)),2)} | ${pc(avg(R.map(r=>r.shortF)),3)} | ${pc(avg(R.map(r=>r.longF)),3)} | ${w.worstSym} ${pc(w.worst,0)} (${new Date(w.t).toISOString().slice(0,10)}) |`); }
    out.push('','| Dönem | Bacak | Maliyet | Toplam | Yıllık | En büyük düşüş | Hafta kazanma | Ort. hafta | En kötü hafta | t |','|---|---|---|---|---|---|---|---|---|---|');
    for(const [lab,f] of periods){ const R=rows.filter(f); if(!R.length) continue; for(const [leg,ln] of [['short','Short Q1'],['long','Long Q5'],['ls','Long Q5 + Short Q1']]) for(const [cost,cn] of [[0.0016,'taker'],[0.0004,'maker']]){ const x=sim(R,leg,cost); out.push(`| ${lab} | ${ln} | ${cn} | ${pc(x.ret,0)} | ${pc(x.ann,0)} | ${pc(-x.dd,0)} | %${fx(100*x.win,0)} | ${pc(x.mean,2)} | ${pc(x.worst,1)} | ${fx(x.t,1)} |`); } }
    // tek coin patlaması riski: Q1 içinde haftada +%50'yi aşan coin oranı
    const blow=R=>avg(R.map(r=>r.q1max>0.5?1:0)); out.push('',`Q1 içinde haftada +%50'den çok yükselen en az bir coin olan haftaların payı: 1. dönem %${fx(100*blow(rows.filter(r=>r.t<MID)),0)}, 2. dönem %${fx(100*blow(rows.filter(r=>r.t>=MID)),0)} (eşit ağırlıklı 20 coinlik short bacağında tek coinin +%100'ü sepete −%5 getirir; tasfiye riski ancak kaldıraçla büyür).`);
    // basit getiriyle beşlik farkı artı haftalar (oynaklık sürüklemesinden arınmış)
    out.push(`Basit getiriyle Q5 − Q1 artı hafta payı: 1. dönem %${fx(100*avg(rows.filter(r=>r.t<MID).map(r=>r.q5>r.q1?1:0)),0)}, 2. dönem %${fx(100*avg(rows.filter(r=>r.t>=MID).map(r=>r.q5>r.q1?1:0)),0)}, son 12 ay %${fx(100*avg(rows.filter(r=>r.t>=Y12).map(r=>r.q5>r.q1?1:0)),0)}.`);
    fs.writeFileSync(path.join(ARCH,'lowvol-weeks.json'),JSON.stringify(rows)); } }
fs.writeFileSync(path.join(__dirname,'olay-etkisi-report.md'),out.join('\n')+'\n'); console.log(out.join('\n'));
