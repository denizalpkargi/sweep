// Test #103: kâğıt sonuç beklenen aralıkta mı (12 Kasım taraması; Wiecki vd. 2016, Liu 2026 arXiv 2604.18821). Karar kuralı yok, yalnız rapor.
// Kâğıt kayıt: canli-kayit/state-*.json (Electron yedeği; data["st-trend"], data["st-turtle"]). Arşivde canlı kodla, kâğıttaki ayarlarla:
//   1) kâğıt süresiyle aynı uzunlukta bütün kayan pencerelerin getiri dağılımı (2020-06 →) → kâğıt sonucun yüzdeliği
//   2) aynı kâğıt dönemi arşivde tekrar oynatılır → kâğıtla fark (uygulama farkı: dolum, fonlama, kapalı kalma, gün içi zamanlama)
//   3) başlangıç rejimi: kâğıda alındığı gün ailenin son 12 ay getirisinin 2020'den beri yüzdeliği (sıcak / soğuk)
// Trend sepeti ve Kaplumbağa; Ichimoku (4 sa verisi bulutta yok), Kalite short (masa arşivi + model), Açılım short (DefiLlama takvimi),
// Geri çekilme, Kovner (işlem yok) ve masa bu sürümde yok. Kullanım: node tests/test103-kagit-aralik.js <state.json> → tests/test103-kagit-aralik-report.md
const fs=require('fs'), path=require('path'); const {loadEngine}=require('./engine-node.js');
const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const DAY=864e5, ARCH=path.join(__dirname,'data','arch');
const ST=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const P=k=>JSON.parse(ST.data[k]);
const load=s=>{ const f=path.join(ARCH,'1d',s+'.csv'); if(!fs.existsSync(f)) return null; return fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); };
const dstr=t=>new Date(t).toISOString().slice(0,10), day=t=>Math.floor(t/DAY)*DAY;
// ---- Trend: canlı döngü (test94), kâğıttaki cfg
function trendRun(cfg,from,to){ const SY=cfg.syms, D={}, ix={}; for(const s of SY){ D[s]=load(s); ix[s]=new Map(D[s].map((b,i)=>[b.t,i])); }
  const s=E.trendNew(cfg); const eq=new Map(); const T1=Math.min(to,D.BTCUSDT[D.BTCUSDT.length-1].t+DAY);
  for(let t=from;t<T1;t+=DAY){ const data={}, px={}, close={};
    for(const k of SY){ const a=D[k]; let i=ix[k].get(t); if(i==null){ i=a.findIndex(b=>b.t>=t); if(i<0) i=a.length; } data[k]=a.slice(Math.max(0,i-130),i); if(a[i]&&a[i].t===t){ px[k]=a[i].o; close[k]=a[i].c; } }
    E.trendMark(s,px,t,null); E.trendRebalance(s,E.trendTargets(data,s.cfg),px,t); E.trendMark(s,close,t+DAY-1,null); eq.set(t+DAY,E.trendEq(s,close)/s.start); }
  return eq; }
// ---- Kaplumbağa: turtle-test.js --replay döngüsü
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
let TD=null, TI=null;
function turtleRun(cfg,from,to){ if(!TD){ TD={}; TI={}; for(const sym of new Set(Object.values(U).flatMap(v=>v.slice(0,50)))){ const k=load(sym); if(k){ TD[sym]=k; TI[sym]=new Map(k.map((b,i)=>[b.t,i])); } } }
  const s=E.ttNew(cfg); const eq=new Map(); const t1=Math.min(to,TD.BTCUSDT[TD.BTCUSDT.length-1].t);
  for(let t=from;t<t1;t+=DAY){
    for(const k of Object.keys(s.pos)){ const i=TI[k]&&TI[k].get(t); if(i!=null) E.ttIntraday(s,k,TD[k][i],t); }
    const m=new Date(t).toISOString().slice(0,7); const univ=(U[m]||[]).slice(0,cfg.top||50).filter(k=>TI[k]&&TI[k].has(t));
    const need=new Set([...univ,...Object.keys(s.pos),'BTCUSDT']); const data={}, px={};
    for(const k of need){ const i=TI[k]&&TI[k].get(t); if(i==null||i<130) continue; data[k]=TD[k].slice(Math.max(0,i-215),i+1); const nx=TD[k][i+1]; if(nx) px[k]=nx.o; }
    for(const k of Object.keys(s.pos)){ const i=TI[k]&&TI[k].get(t); if(i!=null&&i===TD[k].length-1) E.ttExit(s,k,TD[k][i].c,'listeden çıktı',t); }
    E.ttClose(s,data,univ,px,t+DAY);
    for(const k of Object.keys(s.pos)){ const i=TI[k]&&TI[k].get(t); if(i!=null) s.pos[k].px=TD[k][i].c; }
    eq.set(t+DAY,E.ttEq(s,null)/s.start); }
  return {eq,s}; }
// ---- yardımcılar
const keysOf=m=>[...m.keys()].sort((a,b)=>a-b);
function windows(eq,n){ const k=keysOf(eq), out=[]; for(let i=n;i<k.length;i++) out.push(eq.get(k[i])/eq.get(k[i-n])-1); return out; }
const pct=(arr,x)=>arr.filter(v=>v<x).length/arr.length*100;
const q=(a,p)=>{ const s=[...a].sort((x,y)=>x-y); return s[Math.floor(p*(s.length-1))]; };
const f=(x,d=1)=>(x>=0?'+':'')+(x).toFixed(d).replace('.',',');
const L=['# Test #103: kâğıt sonuç beklenen aralıkta mı\n',`Kâğıt kayıt: \`${path.basename(process.argv[2])}\` (yedek zamanı ${new Date(ST.t).toISOString().slice(0,16)} UTC). Arşiv canlı kodla, kâğıttaki ayarlarla oynatıldı. Karar kuralı yok.\n`,
 '| Sepet | kâğıt dönemi | gün | kâğıt getiri | aynı dönem arşivde | uygulama farkı | aynı uzunlukta pencereler: %5 · medyan · %95 | kâğıdın yüzdeliği | başlangıçta son 12 ay getirisi (2021-06 sonrası yüzdelik) |','|---|---|---|---|---|---|---|---|---|'];
function row(nm,cfgEq,paperStart,paperEnd,paperRet){
  const n=Math.max(1,Math.round((day(paperEnd)-day(paperStart))/DAY)); const W=windows(cfgEq,n);
  const k=keysOf(cfgEq); const at=t=>{ let v=null; for(const x of k){ if(x<=t) v=cfgEq.get(x); else break; } return v; };
  const s0=day(paperStart)+DAY, s1=day(paperEnd); const archRet=at(s1)/at(s0)-1;
  const y12=k.filter(t=>t>=Date.UTC(2021,5,1)).map(t=>at(t)/at(t-365*DAY)-1); const cur=at(s0)/at(s0-365*DAY)-1;
  L.push(`| ${nm} | ${dstr(paperStart)} → ${dstr(paperEnd)} | ${n} | ${f(paperRet*100)} % | ${f(archRet*100)} % | ${f((paperRet-archRet)*100)} puan | ${f(q(W,0.05)*100)} · ${f(q(W,0.5)*100)} · ${f(q(W,0.95)*100)} % | %${pct(W,paperRet).toFixed(0)} | ${f(cur*100,0)} % (%${pct(y12,cur).toFixed(0)}) |`);
  return {n,archRet}; }
// Trend
{ const p=P('st-trend'); const eh=p.eqHist; const t0=eh[0][0], t1=eh[eh.length-1][0]; const ret=eh[eh.length-1][1]/p.start-1;
  const cfg=Object.assign({},p.cfg); const eq=trendRun(cfg,Date.UTC(2020,5,1),Infinity);
  row(`Trend sepeti (tv ${String(cfg.tv).replace('.',',')}, cap ${cfg.cap})`,eq,t0,t1,ret); console.log('trend'); }
// Kaplumbağa: kâğıt özkaynağı = bakiye + açık pozisyonların son fiyattaki kârı
{ const p=P('st-turtle'); const ts=p.log.map(e=>e.t).filter(Boolean); const t0=Math.min(...ts), t1=ST.t; const eqP=E.ttEq(p,null); const ret=eqP/p.start-1;
  const {eq}=turtleRun(Object.assign({},p.cfg),Date.UTC(2020,5,1),Infinity);
  row('Kaplumbağa',eq,t0,t1,ret); console.log('turtle');
  L.push('',`Kaplumbağa kâğıt: ${p.trades.length} kapanan işlem, ${Object.keys(p.pos).length} açık pozisyon (${Object.keys(p.pos).join(', ')}).`); }
L.push('','Okuma: yüzdelik %5–95 arasındaysa kâğıt sonuç arşivin aynı uzunluktaki pencereleriyle uyumlu; uygulama farkı arşivin aynı günlerdeki sonucundan sapmadır (canlıda gün içi saat, fonlama, kapalı kalma, evren farkı).');
fs.writeFileSync(path.join(__dirname,'test103-kagit-aralik-report.md'),L.join('\n')+'\n'); console.log(L.join('\n'));
