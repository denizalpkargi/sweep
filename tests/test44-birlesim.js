// Test #44 + #46 (10 Ekim 2026, kullanıcı "+ya geçmenin bir yolunu bulmalıyız"; tanım dongu/2026-10-10-r-kaldiraclari.md §10).
// #44: masa girişi + 24 sa zaman çıkışı (VWAP) + bugünkü stop (sd, gün içi) + karar mumunun kapanışına limit giriş + süzgeç
//      (2) coinin 7 g getirisi işlem yönüne karşıysa atla, (1) long ve BTC 24 sa > 0 ise atla. Arşivde 2020-06 → 2026-10.
// #46: Ozan'ın en kötü onluğu süzgeci (örneklem dışı tahminler 2024-06'dan; önce python3 tests/test46-ozan-dok.py).
// Girişler:  mkt   = sonraki 15 dk mumun VWAP'ı + kayma %0,03, taker %0,05 (test #40 ile aynı)
//            lim0  = karar mumunun kapanışına limit, 4 mum geçerli, fiyat limite değerse dolar (açılış limitin ötesindeyse açılıştan), maker %0,02, kaymasız
//            lim0s = aynı, ama fiyat limitin %0,05 ötesine geçmeli (kuyruk sırası için dürüst dolum)
//            lim3  = kapanışın %0,3 gerisine limit, 8 mum
// Dolum mumunda stop yalnız kapanışla (6 aylık çalışmayla aynı); sonraki mumlarda önce açılış boşluğu, sonra ters uç. Çıkış dolumdan 96 mum
// sonra o mumun VWAP'ı (taker + kayma). R birimi sd × giriş. Fonlama arşivden. Coin+yön başına tek açık işlem (dolmayan emir süresince bloklar).
// Tabanlar: ters yön (aynı giriş/çıkış; rastgele yön = ikisinin ortalaması), yalnız 7 g momentum (masa puanına bakmadan bütün toplantılar,
// süzgeç (2) ile = 7 g yönünde gir), bütün toplantılar süzgeçsiz (rastgele zaman + rastgele yön).
// Kullanım: node tests/test44-birlesim.js → tests/test44-birlesim-report.md, tests/test46-ozan-suzgec-report.md
const fs=require('fs'), path=require('path'), readline=require('readline');
const L=require('./test40-lib.js'); const {M15,H,DAY,FEE_T,FEE_M,SLIP,mean,sdev,fx,ny,iso}=L;
const ENT={mkt:{ad:'market (sonraki mum VWAP)'},lim0:{ad:'limit kapanış, 4 mum',off:0,bars:4},lim0s:{ad:'limit kapanış, 4 mum, %0,05 geçmeli',off:0,bars:4,thru:0.0005},lim3:{ad:'limit −%0,3, 8 mum',off:0.003,bars:8}};
const MULT=+(process.argv[process.argv.indexOf('--mult')+1]||0)||2; // bugünkü kod stopu 2 × sd (PR #27); --mult 1 eski stop
const SUF=MULT===2?'':'-x'+MULT; const SIX=Date.UTC(2026,3,2);
const PLAN=d=>({t1R:1.5,t1Part:0.5,t2R:d.rr2,t2Part:0.6,trail1:'risk0',be:true});

function simE(k,i,dir,sd,ent,hold=96){
  const isL=dir==='long', sgn=isL?1:-1; let jf, e, feeIn;
  if(!ent.bars){ jf=i+1; if(jf>=k.n||!(k.v[jf]>0)) return null; e=k.vw[jf]*(1+sgn*SLIP); feeIn=FEE_T; }
  else { const lim=k.c[i]*(1-sgn*ent.off), th=lim*(1-sgn*(ent.thru||0));
    for(let j=i+1;j<=Math.min(k.n-1,i+ent.bars);j++){ if(!(k.v[j]>0)) continue; if(isL?k.l[j]<=th:k.h[j]>=th){ jf=j; e=isL?Math.min(k.o[j],lim):Math.max(k.o[j],lim); feeIn=FEE_M; break; } }
    if(jf==null) return {nofill:true,endT:k.t[Math.min(k.n-1,i+ent.bars)]+M15}; }
  const stop=e*(1-sgn*sd*MULT), ru=sd*MULT*e; let pnl=-e*feeIn, fp=0; const end=Math.min(k.n-1,jf+hold);
  const fin=(px,j,how)=>{ pnl+=sgn*(px-e)-px*FEE_T; return {R:(pnl+fp)/ru,pct:(pnl+fp)/e,endT:k.t[j]+M15,how,fillT:k.t[jf]}; };
  if(ent.bars&&(isL?k.c[jf]<=stop:k.c[jf]>=stop)) return fin(k.c[jf]*(1-sgn*SLIP),jf,'stop');
  const F=k.fund; let fi; { let a=0,b=F.length; const T=ent.bars?k.t[jf]+M15:k.t[jf]+M15; while(a<b){ const m=(a+b)>>1; if(F[m][0]<T) a=m+1; else b=m; } fi=a; }
  for(let j=jf+1;j<=end;j++){
    while(fi<F.length&&F[fi][0]<k.t[j]+M15){ if(F[fi][0]>=k.t[j]) fp-=sgn*k.o[j]*F[fi][1]; fi++; }
    if(!(k.v[j]>0)){ if(j===end) return fin(k.c[j]*(1-sgn*SLIP),j,'son'); continue; }
    if(isL?k.o[j]<=stop:k.o[j]>=stop) return fin(k.o[j]*(1-sgn*SLIP),j,'stop');
    if(isL?k.l[j]<=stop:k.h[j]>=stop) return fin(stop*(1-sgn*SLIP),j,'stop');
    if(j===end) return fin(k.vw[j]*(1-sgn*SLIP),j,'zaman');
  }
  return fin(k.c[end]*(1-sgn*SLIP),end,'son');
}
// coin+yön başına tek açık işlem
function seq(list,k,run){ const last={long:-Infinity,short:-Infinity}, out=[];
  for(const d of list){ const i=k.idx.get(d.t); if(i==null||i<300) continue; if(k.t[i]+M15<last[d.dir]) continue; const r=run(d,i); if(!r) continue; last[d.dir]=r.endT; if(!r.nofill) out.push({d,i,r}); }
  return out; }
async function loadAll(){ const by={}; let n=0;
  for(const f of fs.readdirSync(L.ARCH).filter(f=>/^samples-\d+\.jsonl$/.test(f)).sort()){
    const rl=readline.createInterface({input:fs.createReadStream(path.join(L.ARCH,f))});
    for await(const l of rl){ if(!l) continue; const s=JSON.parse(l); if(s.score==null) continue; const x=s.x||{};
      const pass=!s.veto&&s.score>=0.35&&s.yes>=3; const rr2=(s.a.trend[0]<-0.3&&s.a.liq[0]>0.5)?2:3;
      (by[s.sym]=by[s.sym]||[]).push({sym:s.sym,t:s.t,dir:s.dir,score:s.score,yes:s.yes,sd:s.sd,rr2,pass,r7d:x.r7d,b24:x.b24,veto:s.veto}); n++; } }
  for(const s in by) by[s].sort((a,b)=>a.t-b.t); return {by,n}; }
const F2=d=>Number.isFinite(d.r7d)&&d.r7d>0, F1=d=>!(d.dir==='long'&&Number.isFinite(d.b24)&&d.b24>0);
const SETS={
  m_none:{ad:'masa · süzgeçsiz',f:d=>d.pass,ents:['mkt','lim0','lim0s','lim3']},
  m_f2:{ad:'masa · (2) 7 g yönünde',f:d=>d.pass&&F2(d),ents:['mkt','lim0','lim0s','lim3']},
  m_f12:{ad:'masa · (1)+(2)',f:d=>d.pass&&F2(d)&&F1(d),ents:['mkt','lim0','lim0s','lim3']},
  b_f2:{ad:'taban · yalnız 7 g momentum (masa yok)',f:d=>F2(d),ents:['mkt','lim0']},
  b_f12:{ad:'taban · 7 g momentum + (1) (masa yok)',f:d=>F2(d)&&F1(d),ents:['mkt','lim0']},
  m_f2_ozp:{ad:'masa · (2) · Ozan verisi olan saatler',f:d=>d.pass&&F2(d)&&Number.isFinite(d.oq),ents:['mkt','lim0','lim0s']},
  m_f2_oz:{ad:'masa · (2) + Ozan en kötü %10 değil',f:d=>d.pass&&F2(d)&&d.oq>=0.1,ents:['mkt','lim0','lim0s']},
  m_f12_ozp:{ad:'masa · (1)+(2) · Ozan verisi olan saatler',f:d=>d.pass&&F2(d)&&F1(d)&&Number.isFinite(d.oq),ents:['mkt','lim0','lim0s']},
  m_f12_oz:{ad:'masa · (1)+(2) + Ozan en kötü %10 değil',f:d=>d.pass&&F2(d)&&F1(d)&&d.oq>=0.1,ents:['mkt','lim0','lim0s']},
  b_all:{ad:'taban · bütün toplantılar (rastgele)',f:d=>true,ents:['mkt','lim0']},
};
function loadOzan(){ const f=path.join(L.ARCH,'_t46-ozan.csv'); const oz={}; if(!fs.existsSync(f)) return oz;
  for(const l of fs.readFileSync(f,'utf8').split('\n').slice(1)){ if(!l) continue; const [t,s,q4,q12]=l.split(','); (oz[s]=oz[s]||new Map()).set(+t,[+q4,+q12]); } return oz; }
async function main(){
  const t0=Date.now(); const {by,n}=await loadAll(); const oz=loadOzan(); console.log('toplantı',n,'ozan coin',Object.keys(oz).length);
  const R={}; for(const s in SETS) for(const e of SETS[s].ents) R[s+'|'+e]=[];
  const OZ=[]; const syms=Object.keys(by).sort(); let si=0;
  for(const s of syms){ si++; const k=L.loadCoin(s); if(!k) continue; const all=by[s];
    for(const d of all){ const qq=oz[s]&&oz[s].get(Math.floor((d.t+M15)/H)*H); d.oq=qq?(d.dir==='long'?qq[0]:1-qq[0]):NaN; }
    for(const sk in SETS){ const S=SETS[sk]; const list=all.filter(S.f);
      for(const ek of S.ents){ const ent=ENT[ek];
        for(const x of seq(list,k,(d,i)=>simE(k,i,d.dir,d.sd,ent))){ const o=simE(k,x.i,x.d.dir==='long'?'short':'long',x.d.sd,ent);
          R[sk+'|'+ek].push({t:x.d.t,dir:x.d.dir,R:x.r.R,pct:x.r.pct,how:x.r.how,oR:o&&!o.nofill?o.R:NaN}); } } }
    // #46: geçen masa kararları, Ozan tahmini olan saatler; iki çıkış (24 sa mkt + stop, bugünkü plan), süzgeçsiz sırayla
    if(oz[s]){ const M=oz[s]; const list=all.filter(d=>d.pass);
      const q=d=>{ const T=d.t+M15; return M.get(Math.floor(T/H)*H); };
      const a=seq(list,k,(d,i)=>simE(k,i,d.dir,d.sd,ENT.mkt)); const b=L.takeSeq(list.filter(d=>d.t+M15>=1717200000000),k,(d,i)=>({riskU:d.sd*MULT,stop:d.sd*MULT,cat:null,plan:PLAN(d),holdBars:32}));
      const bm=new Map(b.map(x=>[x.d.t+x.d.dir,x.r.R]));
      for(const x of a){ const qq=q(x.d); if(!qq) continue; OZ.push({t:x.d.t,dir:x.d.dir,f2:F2(x.d),q4:x.d.dir==='long'?qq[0]:1-qq[0],q12:x.d.dir==='long'?qq[1]:1-qq[1],R24:x.r.R,Rp:bm.has(x.d.t+x.d.dir)?bm.get(x.d.t+x.d.dir):NaN}); }
      const as=new Set(a.map(y=>y.d.t+y.d.dir)); for(const x of b){ if(as.has(x.d.t+x.d.dir)) continue; const qq=q(x.d); if(!qq) continue; OZ.push({t:x.d.t,dir:x.d.dir,f2:F2(x.d),q4:x.d.dir==='long'?qq[0]:1-qq[0],q12:x.d.dir==='long'?qq[1]:1-qq[1],R24:NaN,Rp:x.r.R}); } }
    if(si%25===0) console.log(si,'/',syms.length,s,((Date.now()-t0)/1e3).toFixed(0)+' sn');
  }
  fs.writeFileSync(path.join(L.ARCH,'_t44-sonuc'+SUF+'.json'),JSON.stringify({R,OZ}));
  report(R); reportOz(OZ);
}
const cellR=(a,f='R')=>{ const v=a.map(x=>x[f]).filter(Number.isFinite); return v.length?fx(mean(v)):'—'; };
const tw=a=>{ const g={}; for(const x of a){ const w=Math.floor(x.t/(7*DAY)); (g[w]=g[w]||[]).push(x.R); } const v=Object.values(g).map(mean); return fx(mean(v)/sdev(v)*Math.sqrt(v.length),1); };
function report(R){
  const any=R['m_none|mkt']; const T0=Math.min(...any.map(x=>x.t)), T1=Math.max(...any.map(x=>x.t)); const P=L.periods(T0,T1); const PV=Object.values(P);
  const yrs=[...new Set(any.map(x=>new Date(x.t).getUTCFullYear()))].sort();
  let md=`# Test #44 · Birleşim: masa + 24 sa çıkış + limit giriş + 7 g süzgeci (arşiv)\n\n10 Ekim 2026 · \`node tests/test44-birlesim.js\` · tanım \`dongu/2026-10-10-r-kaldiraclari.md\` §10\n\n`;
  md+=`Masa örnekleri (ayın ilk 30 coini, 4 saatte bir iki yön, ${iso(T0)} → ${iso(T1)}). Masa = bugünkü giriş kuralı (veto yok, puan ≥ 35, evet ≥ 3). Çıkış: dolumdan 24 sa sonraki 15 dk mumun VWAP'ı ya da stop ${MULT} × sd (${MULT===2?'bugünkü kod, PR #27':'eski kod'}; gün içi, dolum mumunda yalnız kapanışla). Hedef/iz yok. Maliyet: market taker %0,05 + kayma %0,03, limit maker %0,02; çıkış taker + kayma; fonlama arşivden. R birimi stop uzaklığı (${MULT} × sd × giriş). Coin+yön başına tek açık işlem. Süzgeç (2): coinin 7 g getirisi işlem yönüne karşıysa atla; (1): long ve BTC 24 sa > 0 ise atla.\n\n`;
  md+=`Düzeltilmiş simülatör: bu test kendi yolunu yürütür (açılış → ters uç → çıkış mumunun VWAP'ı), \`simBot\`'u kullanmaz; PR #36'daki yanlılık burada yok.\n\n`;
  md+=`## Ortalama R (maliyet + fonlama dahil)\n\n| küme · giriş | işlem | tümü | 1. yarı | 2. yarı | son 12 ay | 6 ay (2 Nis → 6 Eki 2026) | t (haftalık) | % / işlem | stop | rastgele yön R (tümü / son 12 ay) | yön bilgisi R (tümü / 1. / 2. / son 12) |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|\n`;
  for(const sk in SETS) for(const ek of SETS[sk].ents){ const a=R[sk+'|'+ek]; if(!a.length) continue; const ao=a.filter(x=>Number.isFinite(x.oR)); const g=[ao,...PV.map(f=>ao.filter(f))];
    md+=`| ${SETS[sk].ad} · ${ENT[ek].ad} | ${ny(a.length)} | ${cellR(a)} | ${PV.map(f=>cellR(a.filter(f))).join(' | ')} | ${cellR(a.filter(x=>x.t>=SIX))} | ${tw(a)} | ${fx(100*mean(a.map(x=>x.pct)),3)} % | %${(100*a.filter(x=>x.how==='stop').length/a.length).toFixed(0)} | ${fx(mean(ao.map(x=>(x.R+x.oR)/2)))} / ${fx(mean(ao.filter(P['son 12 ay']).map(x=>(x.R+x.oR)/2)))} | ${g.map(b=>fx(mean(b.map(x=>(x.R-x.oR)/2)))).join(' / ')} |\n`; }
  md+=`\n"Yön bilgisi" = (yön − ters yön) ÷ 2: aynı anda ters yöne girmeye göre kazanç. Taban kümeleri masanın puanına bakmaz.\n\n## Long / short (R; tümü / 1. yarı / 2. yarı / son 12 ay)\n\n| küme · giriş | long | short |\n|---|---|---|\n`;
  for(const sk in SETS) for(const ek of SETS[sk].ents){ const a=R[sk+'|'+ek]; md+=`| ${SETS[sk].ad} · ${ENT[ek].ad} | ${['long','short'].map(dr=>{ const b=a.filter(x=>x.dir===dr); return [b,...PV.map(f=>b.filter(f))].map(c=>cellR(c)).join(' / ')+` (${ny(b.length)})`; }).join(' | ')} |\n`; }
  md+=`\n## Yıl yıl (R)\n\n| küme · giriş | ${yrs.join(' | ')} |\n|---|${yrs.map(()=>'---:').join('|')}|\n`;
  for(const sk in SETS) for(const ek of SETS[sk].ents){ const a=R[sk+'|'+ek]; md+=`| ${SETS[sk].ad} · ${ENT[ek].ad} | ${yrs.map(y=>cellR(a.filter(x=>new Date(x.t).getUTCFullYear()===y))).join(' | ')} |\n`; }
  md=md.replace(/%(\d+)\.(\d)/g,'%$1,$2'); fs.writeFileSync(path.join(__dirname,'test44-birlesim'+SUF+'-report.md'),md); console.log(md);
}
function reportOz(OZ){
  if(!OZ.length) return; const T0=Math.min(...OZ.map(x=>x.t)), T1=Math.max(...OZ.map(x=>x.t)); const P=L.periods(T0,T1); const PV=Object.values(P);
  const c=(a,f)=>{ const g=[a,...PV.map(p=>a.filter(p))]; return g.map(b=>cellR(b,f)).join(' / ')+` (${ny(a.filter(x=>Number.isFinite(x[f])).length)})`; };
  let md=`# Test #46 · Ozan'ın en kötü onluğu süzgeci (arşiv, örneklem dışı)\n\n10 Ekim 2026 · \`python3 tests/test46-ozan-dok.py && node tests/test44-birlesim.js\`\n\n`;
  md+=`Bugünkü giriş kuralını geçen masa kararları, Ozan'ın örneklem dışı tahmini olan saatler (${iso(T0)} → ${iso(T1)}). Ozan sırası: karar saatinde ayın ilk 30 coini içinde yüzdelik (yön için çevrilmiş: 0 = işlem yönüne en kötü). İki çıkış: **24 sa** = sonraki mum VWAP market giriş + stop ${MULT} × sd + 24 sa VWAP çıkış; **plan** = bugünkü plan (stop ${MULT} × sd, 1,5R'de %50 + başabaş, 3R/2R %60, iz, 8 sa; test #41 a). Hücre: tümü / 1. yarı / 2. yarı / son 12 ay (n).\n\n`;
  for(const h of ['q4','q12']){ md+=`## Ozan ${h==='q4'?'4':'12'} sa modeli\n\n| Ozan dilimi (yön için) | 24 sa R | plan R |\n|---|---|---|\n`;
    const bins=[[0,0.1,'en kötü %10 (süzgecin atacağı)'],[0.1,0.2,'%10–20'],[0.2,0.8,'%20–80'],[0.8,0.9,'%80–90'],[0.9,1.01,'en iyi %10']];
    for(const [lo,hi,nm] of bins){ const b=OZ.filter(x=>x[h]>=lo&&x[h]<hi); md+=`| ${nm} | ${c(b,'R24')} | ${c(b,'Rp')} |\n`; }
    const keep=OZ.filter(x=>x[h]>=0.1); md+=`| **süzgeçten sonra kalan** | ${c(keep,'R24')} | ${c(keep,'Rp')} |\n| süzgeçsiz hepsi | ${c(OZ,'R24')} | ${c(OZ,'Rp')} |\n`;
    for(const dr of ['long','short']){ const a=OZ.filter(x=>x.dir===dr); md+=`| ${dr}: en kötü %10 / kalan | ${c(a.filter(x=>x[h]<0.1),'R24')} ↔ ${c(a.filter(x=>x[h]>=0.1),'R24')} | ${c(a.filter(x=>x[h]<0.1),'Rp')} ↔ ${c(a.filter(x=>x[h]>=0.1),'Rp')} |\n`; }
    const f2=OZ.filter(x=>x.f2); md+=`| süzgeç (2) ile: en kötü %10 / kalan | ${c(f2.filter(x=>x[h]<0.1),'R24')} ↔ ${c(f2.filter(x=>x[h]>=0.1),'R24')} | ${c(f2.filter(x=>x[h]<0.1),'Rp')} ↔ ${c(f2.filter(x=>x[h]>=0.1),'Rp')} |\n\n`; }
  md+=`Rastgele taban: aynı kararlardan rastgele %10 atmak ortalamayı beklenen değerde değiştirmez; süzgecin değeri = "kalan" − "hepsi".\n`;
  md=md.replace(/%(\d+)\.(\d)/g,'%$1,$2'); fs.writeFileSync(path.join(__dirname,'test46-ozan-suzgec'+SUF+'-report.md'),md); console.log(md);
}
if(require.main===module) main().catch(e=>{ console.error(e); process.exit(1); });
module.exports={ENT,seq,loadAll,loadOzan,F1,F2};
