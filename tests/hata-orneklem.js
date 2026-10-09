// Hata örneklemi: masanın "gir" dediği ama kaybettiği kararlardan örnek alır, her kararın tüm parametrelerini ayrı ayrı çıkarır,
// kaybedenlerle kazananları parametre parametre kıyaslar ve iki yarıda da tutan bir "karar deseni" (atla kuralları) kurar (8 Ekim 2026).
// Kullanıcı: "verdiğimiz karar başarıya ulaşmıyorsa gözden kaçırdığımız bir şey vardır; örneklemelerin tüm parametrelerini ayrı ayrı
// çıkarıp doğru bir karar patterni yaratmamız lazım."
// Girdi 1 (geçmiş, büyük): tests/masa-archive.js örnekleri (tests/data/arch/samples-*.jsonl): her toplantıda üyelerin oyları, puan,
//   evet sayısı, stop, aşama, kill zone, 20 ham özellik (yöne göre işaretli) ve botun planıyla sonuç R.
// Girdi 2 (canlı, küçük, isteğe bağlı): SWEEP kayıt yedeği (state.json ya da sweep-geri-yukle*.json): kâğıt botun kapanmış işlemleri
//   (R, girişteki oylar, puan) ve tahmin defterinin sonuçlanmış girişleri (y, oylar, havuz/kz/aşama/trend).
// Yöntem:
//   1) Karar kümesi: veto yok, puan ≥ eşik, evet ≥ asgari (bugünkü giriş kuralı). Başarısız = R ≤ 0.
//   2) Örnek kartları: tarihe göre tohumlanmış rastgele N başarısız + N başarılı karar; her parametre değeri ve karar kümesindeki yüzdelik dilimi.
//   3) Parametre taraması: her parametre beşe bölünür (sınırlar ilk yarıdan); dilim başına işlem, kazanma, ort. R ilk yarı / ikinci yarı / son 12 ay;
//      AUC (parametre başarısızı başarılıdan ne kadar ayırıyor) iki yarıda.
//   4) Desen: ilk yarıda açgözlü seçim ("parametre dilimdeyse atla"), her kural kalan işlemlerin ortalama R'sini ≥ minGain artırmalı,
//      kalan işlem payı ≥ %40; sonra ikinci yarı ve son 12 ayda sınanır. Geçme: iki dönemde de kalanların R'si tabandan iyi.
// Kullanım: node tests/hata-orneklem.js [--thr 0.35] [--yes 3] [--n 12] [--live <state.json>] [--out <klasör>] [--date YYYY-MM-DD]
//   → <out>/hata-orneklemi-<tarih>.md, karar-deseni-<tarih>.json, ornekler-<tarih>.csv
const fs=require('fs'), path=require('path'), readline=require('readline');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const ARCH=arg('arch',path.join(__dirname,'data','arch'));
const THR=+arg('thr',0.35), MINYES=+arg('yes',3), NCARD=+arg('n',8), LIVE=arg('live',null), DATE=String(arg('date',new Date().toISOString().slice(0,10)));
const OUT=arg('out',path.join(__dirname,'data','hata')); const MIN_GAIN=0.01, MIN_KEEP=0.4, MAX_RULES=5;
const NAMES={trend:'Emre',liq:'Kerem',flow:'Mert',macro:'Arda',quant:'Onur',mom:'Baran',copy:'Tolga',lab:'Burak',audit:'Murat',vol:'Serkan',check:'Yusuf',fac:'Kaan',rank:'Ozan',risk:'Can',llm:'Yapay zekâ'};
const XDESC={atrp:'ATR / fiyat (oynaklık)',r1:'son 1 sa getiri (yönde)',r4:'son 4 sa getiri (yönde)',r24:'son 24 sa getiri (yönde)',r7d:'son 7 gün getiri (yönde)',r30d:'son 30 gün getiri (yönde)',
  s20:'fiyat / SMA20 günlük (yönde)',s50:'fiyat / SMA50 günlük (yönde)',s200:'fiyat / SMA200 günlük (yönde)',pos24:'24 sa aralıkta yer (0 dip, 1 tepe)',vq:'son 1 sa hacim / 24 sa ortalama',tk:'son 1 sa taker alış payı',
  vol30:'30 günlük oynaklık',b4:'BTC 4 sa (yönde)',b24:'BTC 24 sa (yönde)',bs200:'BTC / SMA200 (yönde)',bs50:'BTC / SMA50 (yönde)',fr:'fonlama (yönde)',hr:'saat (UTC)',dow:'haftanın günü (0 Paz)'};
const fx=(v,d=2)=>v==null||!Number.isFinite(v)?'—':v.toLocaleString('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d});
const pc=v=>v==null||!Number.isFinite(v)?'—':'%'+fx(100*v,0);
const sgn=v=>v==null||!Number.isFinite(v)?'—':(v>=0?'+':'')+fx(v,2);
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const stat=a=>({n:a.length,win:a.length?a.filter(d=>d.R>0).length/a.length:NaN,R:mean(a.map(d=>d.R))});

// ---- 1) geçmiş karar kümesi ----
async function loadArchive(){
  const files=fs.existsSync(ARCH)?fs.readdirSync(ARCH).filter(f=>/^samples-\d+\.jsonl$/.test(f)):[]; const D=[]; let all=0;
  for(const f of files){ const rl=readline.createInterface({input:fs.createReadStream(path.join(ARCH,f))});
    for await(const l of rl){ if(!l) continue; all++; const s=JSON.parse(l); if(s.veto||s.score<THR||s.yes<MINYES||s.R==null) continue; D.push(row(s)); } }
  D.sort((a,b)=>a.t-b.t); return {D,all,files:files.length};
}
// tek karar → düz parametre sözlüğü (sayısal p, kategorik c)
function row(s){
  const p={puan:s.score,evet:s.yes,stop:s.sd}; for(const k in s.x) p[k]=s.x[k];
  for(const id in s.a){ const [v,c,ab]=s.a[id]; if(!ab){ p['oy:'+id]=v; p['güven:'+id]=c; } }
  return {sym:s.sym,t:s.t,dir:s.dir,R:s.R,y:s.y,p,c:{yön:s.dir,aşama:s.stage||'yok',kz:s.kz?'kill zone':'dışı',...(s.x&&s.x.dow!=null?{gün:['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'][s.x.dow]}:{})}};
}
const pname=k=>k.startsWith('oy:')?NAMES[k.slice(3)]+' oyu':k.startsWith('güven:')?NAMES[k.slice(6)]+' güveni':XDESC[k]||({puan:'masa puanı',evet:'evet sayısı',stop:'stop mesafesi (fiyatın payı)'})[k]||k;

// ---- yardımcılar ----
function qEdges(vals,n){ const a=vals.filter(Number.isFinite).sort((x,y)=>x-y); if(a.length<n*20) return null; const e=[]; for(let i=1;i<n;i++) e.push(a[Math.floor(a.length*i/n)]); return e; }
const binOf=(v,e)=>{ if(!Number.isFinite(v)) return -1; let b=0; while(b<e.length&&v>e[b]) b++; return b; };
function auc(D,k){ // P(başarısızın değeri > başarılının değeri); 0,5 = ayırmıyor
  const a=D.filter(d=>Number.isFinite(d.p[k])).map(d=>[d.p[k],d.R<=0?1:0]); const nf=a.filter(x=>x[1]).length, ns=a.length-nf; if(nf<20||ns<20) return NaN;
  a.sort((x,y)=>x[0]-y[0]); let rank=0,sum=0; for(let i=0;i<a.length;){ let j=i; while(j<a.length&&a[j][0]===a[i][0]) j++; const r=(i+j+1)/2; for(let z=i;z<j;z++) if(a[z][1]) sum+=r; i=j; }
  return (sum-nf*(nf+1)/2)/(nf*ns); }
const pctOf=(sorted,v)=>{ if(!Number.isFinite(v)||!sorted.length) return NaN; let lo=0,hi=sorted.length; while(lo<hi){ const m=(lo+hi)>>1; if(sorted[m]<v) lo=m+1; else hi=m; } return lo/sorted.length; };
const pctTxt=q=>!Number.isFinite(q)?'':q<0.2?'çok düşük':q<0.4?'düşük':q<0.6?'orta':q<0.8?'yüksek':'çok yüksek';
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }

// kural: {k, op:'<'|'>'|'=', v, dir?}  → karar bu kurala uyuyorsa ATLA
const hit=(r,d)=>(!r.dir||d.dir===r.dir)&&(r.op==='='?d.c[r.k]===r.v:Number.isFinite(d.p[r.k])&&(r.op==='<'?d.p[r.k]<r.v:d.p[r.k]>r.v));
const rTxt=r=>(r.dir?r.dir+' · ':'')+(r.op==='='?`${r.k} = ${r.v}`:`${pname(r.k)} ${r.op==='<'?'<':'>'} ${fx(r.v,r.k==='hr'||r.k==='dow'||r.k==='evet'?0:4)}`);
function candidates(T,numKeys,catKeys){
  const C=[]; for(const k of numKeys){ const e=qEdges(T.map(d=>d.p[k]),5); if(!e) continue;
    for(const dir of [null,'long','short']){ C.push({k,op:'<',v:e[0],dir},{k,op:'<',v:e[1],dir},{k,op:'>',v:e[2],dir},{k,op:'>',v:e[3],dir}); } }
  for(const k of catKeys){ const vs=[...new Set(T.map(d=>d.c[k]))]; for(const v of vs) for(const dir of [null,'long','short']) if(k!=='yön'||!dir) C.push({k,op:'=',v,dir}); }
  return C;
}
function greedy(T,C){
  let keep=T.slice(); const rules=[], base=stat(T);
  for(let step=0;step<MAX_RULES;step++){ const cur=stat(keep); let best=null;
    for(const r of C){ if(rules.includes(r)) continue; const k2=keep.filter(d=>!hit(r,d)); if(k2.length<MIN_KEEP*T.length||keep.length-k2.length<0.03*keep.length) continue;
      const g=stat(k2).R-cur.R; if(g>=MIN_GAIN&&(!best||g>best.g)) best={r,g,k2}; }
    if(!best) break; rules.push(best.r); keep=best.k2; }
  return {rules,base,kept:stat(keep)};
}
const apply=(rules,A)=>A.filter(d=>!rules.some(r=>hit(r,d)));

// ---- 4) canlı kayıt ----
function loadLive(f){
  if(!f||!fs.existsSync(f)) return null; const o=JSON.parse(fs.readFileSync(f,'utf8')); const d=o.data||o; const J=k=>{ try{ return d[k]?JSON.parse(d[k]):null; }catch(e){ return null; } };
  const bot=J('st-bot')||{}, fc=J('st-fc')||{}; const at=o.t||null;
  const T=(bot.trades||[]).filter(t=>Number.isFinite(t.r)).map(t=>({sym:t.sym,dir:t.dir,t:t.openT,R:t.r,score:t.score,v:t.snap&&t.snap.v||{},sd:t.snap&&t.snap.sd,yes:t.snap&&t.snap.yes,exits:t.exits||[],mfe:t.mfe,mae:t.mae,offline:t.offline,quality:t.snap&&t.snap.quality}));
  const F=(fc.done||[]).filter(x=>!x.kind&&x.y!=null).map(x=>({sym:x.sym,dir:x.dir,t:x.t,y:x.y,score:x.score,go:!!x.go,v:x.v||{},f:x.f||{}}));
  return {at,T,F,bal:bot.bal};
}
function liveSection(L,rules){
  const o=[]; o.push(`## Canlı kayıt (kâğıt bot ve tahmin defteri)\n`);
  if(!L){ o.push('Bu çalışmada canlı kayıt yoktu (bilgisayar kapalıydı ya da yedek alınamadı). Geçmiş verideki desen yine de güncellendi.\n'); return o.join('\n'); }
  o.push(`Kayıt zamanı: ${L.at?new Date(L.at).toISOString().replace('T',' ').slice(0,16)+' UTC':'bilinmiyor'} · bakiye ${fx(L.bal,2)} $ · ${L.T.length} kapanmış işlem · ${L.F.length} sonuçlanmış tahmin.\n`);
  const lost=L.T.filter(t=>t.R<=0), won=L.T.filter(t=>t.R>0);
  if(L.T.length){
    o.push(`**İşlemler:** ${L.T.length} işlem, kazanma ${pc(won.length/L.T.length)}, ort. ${sgn(mean(L.T.map(t=>t.R)))}R. Kaybedenlerin ${pc(mean(lost.map(t=>t.mfe>=1?1:0)))}'ü önce ≥1R kâr görmüştü, ${pc(mean(lost.map(t=>t.mfe<0.25?1:0)))}'ü hiç 0,25R'ye çıkmadı.\n`);
    // üye üye: kaybeden ve kazanan işlemlerde girişteki ortalama oy
    const ids=[...new Set(L.T.flatMap(t=>Object.keys(t.v)))];
    o.push('| Üye | Kaybedenlerde ort. oy | Kazananlarda ort. oy | Fark | Okuma |','|---|---|---|---|---|');
    for(const id of ids){ const a=mean(lost.map(t=>t.v[id]).filter(Number.isFinite)), b=mean(won.map(t=>t.v[id]).filter(Number.isFinite)); const df=b-a;
      o.push(`| ${NAMES[id]||id} | ${sgn(a)} | ${sgn(b)} | ${sgn(df)} | ${!Number.isFinite(df)?'':df>0.15?'kazananlarda daha çok evet (iyi işaret)':df<-0.15?'kaybedenlerde daha çok evet (yanıltıcı)':'ayırmıyor'} |`); }
    o.push(`\nÜye satırları ${L.T.length} işlemden; 100 işlemin altında bu farklar rastlantı olabilir.\n`);
    const ex={}; for(const t of lost) for(const e of t.exits) ex[e]=(ex[e]||0)+1; const top=Object.entries(ex).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if(top.length) o.push(`Kaybedenlerin çıkış nedenleri: ${top.map(([k,n])=>`${k} ${n}`).join(' · ')}.\n`);
    const deskOnly=rules.filter(r=>/^(oy|güven):|^puan$|^evet$|^stop$/.test(r.k)||r.k==='yön');
    if(deskOnly.length){ const P=L.T.map(t=>({dir:t.dir,R:t.R,p:{puan:t.score,evet:t.yes,stop:t.sd,...Object.fromEntries(Object.entries(t.v).map(([k,v])=>['oy:'+k,v]))},c:{yön:t.dir}})); const k2=apply(deskOnly,P);
      o.push(`Desenin canlıda ölçülebilen kuralları (oy/puan/stop) uygulansaydı: ${P.length} işlemden ${k2.length} kalırdı, ort. ${sgn(stat(P).R)}R → ${sgn(stat(k2).R)}R.\n`); }
  }
  if(L.F.length){ const go=L.F.filter(x=>x.go), h=a=>a.length?mean(a.map(x=>x.y)):NaN;
    o.push(`**Tahmin defteri:** ${L.F.length} sonuç, isabet ${pc(h(L.F))}; masanın "gir" dediklerinde ${pc(h(go))} (${go.length}).`);
    const groups={}; for(const x of L.F.filter(x=>x.score>=THR)) for(const k in x.f){ const g=x.dir+' · '+k+' = '+x.f[k]; (groups[g]=groups[g]||[]).push(x); }
    const rows=Object.entries(groups).filter(([,a])=>a.length>=8).map(([g,a])=>[g,a.length,h(a)]).sort((a,b)=>a[2]-b[2]).slice(0,6);
    if(rows.length){ o.push('\nEşiği geçen tahminlerde en kötü koşullar:\n','| Koşul | Tahmin | İsabet |','|---|---|---|'); for(const [g,n,v] of rows) o.push(`| ${g} | ${n} | ${pc(v)} |`); }
    o.push(''); }
  return o.join('\n');
}

(async()=>{
  const {D,all,files}=await loadArchive(); fs.mkdirSync(OUT,{recursive:true});
  const L=loadLive(LIVE); const md=[];
  md.push(`# Hata örneklemi · ${DATE}\n`);
  if(!D.length){ md.push('Geçmiş örnek yok (tests/data/arch/samples-*.jsonl). Önce `node tests/fetch-archive.js` ve `node tests/masa-archive.js`.\n'); md.push(liveSection(L,[])); fs.writeFileSync(path.join(OUT,`hata-orneklemi-${DATE}.md`),md.join('\n')); console.log('örnek yok'); return; }
  const MID=D[D.length>>1].t, LAST12=D[D.length-1].t-365*864e5; const H1=D.filter(d=>d.t<MID), H2=D.filter(d=>d.t>=MID), Y1=D.filter(d=>d.t>=LAST12);
  const numKeys=[...new Set(D.flatMap(d=>Object.keys(d.p)))].filter(k=>D.filter(d=>Number.isFinite(d.p[k])).length>=D.length*0.3&&new Set(D.slice(0,5000).map(d=>d.p[k])).size>3);
  const catKeys=['yön','aşama','kz','gün'];
  const fail=D.filter(d=>d.R<=0), win=D.filter(d=>d.R>0); const base=stat(D);
  // 3) parametre taraması
  const scan=[]; for(const k of numKeys){ const e=qEdges(H1.map(d=>d.p[k]),5); if(!e) continue;
    const bins=[0,1,2,3,4].map(b=>{ const f=a=>stat(a.filter(d=>binOf(d.p[k],e)===b)); return {b,h1:f(H1),h2:f(H2),y1:f(Y1)}; });
    const a1=auc(H1,k), a2=auc(H2,k); const same=Number.isFinite(a1)&&Number.isFinite(a2)&&(a1-0.5)*(a2-0.5)>0; scan.push({k,e,bins,a1,a2,sep:same?Math.min(Math.abs(a1-0.5),Math.abs(a2-0.5)):0}); }
  scan.sort((a,b)=>b.sep-a.sep);
  // 4) desen: ilk yarıda seç, ikinci yarı ve son 12 ayda sına
  const C=candidates(H1,numKeys,catKeys); const G0=greedy(H1,C);
  // her kural sınav dönemlerinde de kendini kanıtlamalı: atladığı kararların R'si ikinci yarıda ve son 12 ayda o dönemin ortalamasından ≥0,02R kötü
  const okRule=r=>[H2,Y1].every(A=>{ const s=A.filter(d=>hit(r,d)); return s.length>=30&&stat(s).R<=stat(A).R-0.02; });
  const G={rules:G0.rules.filter(okRule),dropped:G0.rules.filter(r=>!okRule(r))};
  const ev=(A)=>({all:stat(A),kept:stat(apply(G.rules,A))});
  const e1=ev(H1), e2=ev(H2), e3=ev(Y1); const pass=G.rules.length&&e2.kept.R>e2.all.R&&e3.kept.R>e3.all.R;
  const perRule=G.rules.map(r=>{ const f=A=>{ const s=A.filter(d=>hit(r,d)); return {n:s.length,share:s.length/A.length,R:stat(s).R,lost:s.filter(d=>d.R<=0).length/Math.max(1,s.length)}; }; return {r,h1:f(H1),h2:f(H2),y1:f(Y1)}; });
  // 2) örnek kartları
  const rnd=rng(+DATE.replace(/-/g,'')); const pick=(A,n)=>{ const a=A.slice(), o=[]; while(o.length<n&&a.length) o.push(a.splice(Math.floor(rnd()*a.length),1)[0]); return o.sort((x,y)=>x.t-y.t); };
  const cardsF=pick(fail.filter(d=>d.t>=LAST12),NCARD), cardsW=pick(win.filter(d=>d.t>=LAST12),Math.max(4,NCARD>>1));
  const sorted={}; for(const k of numKeys) sorted[k]=D.map(d=>d.p[k]).filter(Number.isFinite).sort((a,b)=>a-b);
  const cardKeys=scan.slice(0,14).map(s=>s.k);

  md.push(`**Kısa sonuç.** ${files} örnek dosyasında ${all.toLocaleString('tr-TR')} toplantı; bugünkü giriş kuralını (puan ≥ ${fx(THR*100,0)}, evet ≥ ${MINYES}, veto yok) geçen ${D.length.toLocaleString('tr-TR')} karar, ${fail.length.toLocaleString('tr-TR')}'i başarısız (R ≤ 0, ${pc(fail.length/D.length)}). Ortalama ${sgn(base.R)}R. `+
    (pass?`Bulunan desen ${G.rules.length} kural: ilk yarıda seçildi, ikinci yarıda kalanların R'si ${sgn(e2.all.R)} → ${sgn(e2.kept.R)}, son 12 ayda ${sgn(e3.all.R)} → ${sgn(e3.kept.R)} (işlemlerin ${pc(e2.kept.n/e2.all.n)}'i kalıyor). `+(e2.kept.R>0&&e3.kept.R>0?'Kalanlar iki dönemde de artı.':'Kayıp azalıyor ama kalanlar hâlâ artı değil; desen süzgeç, kenar değil.'):
      G.rules.length?`İlk yarıda ${G.rules.length} kural bulundu ama ikinci yarıda ya da son 12 ayda tutmadı; desen geçmedi.`:'İlk yarıda kayda değer kural bulunmadı.')+'\n');
  md.push(`Dönemler: ilk yarı ${new Date(D[0].t).toISOString().slice(0,7)} → ${new Date(MID).toISOString().slice(0,7)}, ikinci yarı → ${new Date(D[D.length-1].t).toISOString().slice(0,7)}, son 12 ay ayrıca. Geçmişte ölçülemeyen girdiler nötr (OI, kalabalık, liderler, araştırma ekibi; bkz. masa-archive.js).\n`);

  md.push(`## Karar deseni (atla kuralları)\n`);
  if(G.rules.length||G.dropped.length){ md.push('| # | Kural (uyarsa girme) | İlk yarı: atlanan / R / kayıp payı | İkinci yarı | Son 12 ay |','|---|---|---|---|---|');
    perRule.forEach((x,i)=>md.push(`| ${i+1} | ${rTxt(x.r)} | ${pc(x.h1.share)} · ${sgn(x.h1.R)}R · ${pc(x.h1.lost)} | ${pc(x.h2.share)} · ${sgn(x.h2.R)}R · ${pc(x.h2.lost)} | ${pc(x.y1.share)} · ${sgn(x.y1.R)}R · ${pc(x.y1.lost)} |`));
    md.push('','| Dönem | Tüm kararlar | Desenle kalan |','|---|---|---|');
    for(const [n,e] of [['İlk yarı (seçim)',e1],['İkinci yarı (sınav)',e2],['Son 12 ay (sınav)',e3]]) md.push(`| ${n} | ${e.all.n} · kazanma ${pc(e.all.win)} · ${sgn(e.all.R)}R | ${e.kept.n} · kazanma ${pc(e.kept.win)} · ${sgn(e.kept.R)}R |`);
    if(G.dropped.length) md.push(`\nİlk yarıda seçilip sınavda tutmadığı için desenden çıkan kurallar: ${G.dropped.map(rTxt).join(' · ')}.`);
    md.push(`\nDurum: **${pass?'geçti':'geçmedi'}**. ${pass?'Desen tahmin defterinde ve kâğıt botta ileri testten geçmeden puana girmez.':''}\n`); }
  else md.push('Kural yok.\n');

  md.push(`## Parametreler tek tek (başarısızı başarılıdan ayıran ilk 12)\n`,`AUC: başarısız kararın değeri başarılınınkinden büyük olma olasılığı; 0,50 ayırmıyor, 0,55 üstü ya da 0,45 altı ayırıyor. İki yarıda aynı tarafta olmayan parametrenin ayrımı 0 sayılır.\n`,
    '| Parametre | AUC 1. / 2. yarı | Dilim (beşte) ort. R, ilk yarı | İkinci yarı | Son 12 ay |','|---|---|---|---|---|');
  for(const s of scan.slice(0,12)) md.push(`| ${pname(s.k)} | ${fx(s.a1,3)} / ${fx(s.a2,3)} | ${s.bins.map(b=>sgn(b.h1.R)).join(' · ')} | ${s.bins.map(b=>sgn(b.h2.R)).join(' · ')} | ${s.bins.map(b=>sgn(b.y1.R)).join(' · ')} |`);
  md.push('\nDilimler soldan sağa düşükten yükseğe (sınırlar ilk yarıdan). Ayırmayanlar: '+scan.filter(s=>s.sep<0.005).map(s=>pname(s.k)).join(', ')+'.\n');

  md.push(`## Örnek kartları (son 12 aydan rastgele ${cardsF.length} başarısız, ${cardsW.length} başarılı)\n`,'Her sütun bir karar; değerin yanında karar kümesindeki yeri (çok düşük … çok yüksek). Satırlar ayrımı en güçlü parametreler.\n');
  const cards=[...cardsF,...cardsW]; const head=cards.map((d,i)=>`${i<cardsF.length?'✗':'✓'} ${d.sym.replace('USDT','')} ${d.dir==='long'?'L':'S'} ${new Date(d.t).toISOString().slice(5,13).replace('T',' ')}`);
  md.push('| Parametre | '+head.join(' | ')+' |','|---|'+cards.map(()=>'---').join('|')+'|');
  md.push('| Sonuç R | '+cards.map(d=>sgn(d.R)).join(' | ')+' |');
  for(const k of cardKeys) md.push(`| ${pname(k)} | `+cards.map(d=>{ const q=pctOf(sorted[k],d.p[k]); return Number.isFinite(d.p[k])?`${fx(d.p[k],k==='hr'||k==='dow'||k==='evet'?0:3)} (${pctTxt(q)})`:(/^(oy|güven):/.test(k)?'çekimser':'veri yok'); }).join(' | ')+' |');
  md.push('| aşama · kz | '+cards.map(d=>`${d.c.aşama} · ${d.c.kz}`).join(' | ')+' |');
  md.push('| desen | '+cards.map(d=>G.rules.some(r=>hit(r,d))?'atlardı':'girerdi').join(' | ')+' |');
  const cf=cardsF.filter(d=>G.rules.some(r=>hit(r,d))).length, cw=cardsW.filter(d=>G.rules.some(r=>hit(r,d))).length;
  md.push(`\nDesen bu başarısız örneklerin ${cf}/${cardsF.length}'ini, başarılıların ${cw}/${cardsW.length}'ini atlardı. Tüm parametreler: ornekler-${DATE}.csv.\n`);

  md.push(liveSection(L,G.rules));
  fs.writeFileSync(path.join(OUT,`hata-orneklemi-${DATE}.md`),md.join('\n'));
  fs.writeFileSync(path.join(OUT,`karar-deseni-${DATE}.json`),JSON.stringify({date:DATE,thr:THR,minYes:MINYES,n:D.length,base,pass:!!pass,rules:G.rules,dropped:G.dropped,eval:{h1:e1,h2:e2,y1:e3},top:scan.slice(0,12).map(s=>({k:s.k,a1:s.a1,a2:s.a2,edges:s.e}))},null,1));
  const keys=['sym','dir','t','R',...numKeys,...catKeys]; const csv=[keys.join(',')].concat([...cardsF,...cardsW].map(d=>keys.map(k=>k==='t'?new Date(d.t).toISOString():d[k]!=null&&typeof d[k]!=='object'?d[k]:d.p[k]!=null?d.p[k]:d.c[k]!=null?d.c[k]:'').join(',')));
  fs.writeFileSync(path.join(OUT,`ornekler-${DATE}.csv`),csv.join('\n'));
  console.log(md.slice(0,4).join('\n')); console.log('→',OUT);
})();
