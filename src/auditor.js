/* ---------- Denetçi (Zeynep): kapanan işlemleri inceler, hataları etiketler, dersleri masaya geri verir (6 Ekim 2026) ----------
   Her kapanan kâğıt işlemde girişteki oylar (snap), stop mesafesi, en iyi/en kötü gidiş (mfe/mae, R) ve çıkış nedenleri saklanır.
   auditRun(trades): her işlemi etiketler (giriş anında görülebilen hatalar + sonradan görülen hatalar), etiket başına ortalama R'yi
   küçülterek (sum/(n+4)) hesaplar ve yeterli örnekte "ders" çıkarır. Dersler masaya kolla bağlanır:
   oy etiketleri → Zeynep o kalıba benzeyen kuruluma karşı oy verir (çok kötüyse veto); eşikte giriş → eşik +0,05/+0,10;
   tek başına çoğunluk → asgari oy +1; aynı yönde yığılma → aynı yönde en fazla 1 pozisyon; kayıp ardından giriş → 60 dk ara;
   gürültü stopu → stop tabanı %1,5 → %2; kârı geri verme → 1R görünce momentuma bakmadan yarısını al.
   Ajan ağırlıkları: oy ile sonuç R'si arasındaki ilişki (≥8 işlem) ağırlığı 0,6–1,4 arasında çarpar. Kanıt değil; örnek büyüdükçe güçlenir. */
let AUD=null;
const AUD_MIN=5;
const AUD_TAGS={
  nosweep:{t:"Süpürmesiz giriş",pre:"vote",why:"Kerem süpürülmüş havuz görmeden girildi; manipülasyon olmadan giriş rastgele girişe yakındır."},
  counter:{t:"Trende karşı",pre:"vote",why:"Emre günlük yönün ters olduğunu söylemişti."},
  btc:{t:"BTC'ye karşı",pre:"vote",why:"Arda BTC rejiminin karşı olduğunu söylemişti; altcoinler BTC'yi izler."},
  flow:{t:"Akış karşı",pre:"vote",why:"Mert emir akışının karşı tarafta olduğunu söylemişti."},
  thin:{t:"Eşikte giriş",pre:"lever",why:"Puan eşiğin hemen üstündeydi; masa ikna olmadan girdi."},
  lone:{t:"Dar çoğunluk",pre:"lever",why:"Evet oyu asgari sayıdaydı; masanın yarısı ikna değildi."},
  cluster:{t:"Aynı yönde yığılma",pre:"lever",why:"Aynı anda aynı yönde iki ya da daha fazla pozisyon vardı; tek bir BTC hareketi hepsini birden stop eder."},
  afterloss:{t:"Kayıp ardından giriş",pre:"lever",why:"Son 60 dakikada bir stop yenmişti; piyasa aynı yönü cezalandırırken yeniden girildi."},
  noise:{t:"Gürültü stopu",post:true,why:"Fiyat lehimize hiç gitmeden (≤0,3R) 45 dakika içinde stop oldu: stop normal dalgalanmanın içindeydi ya da giriş zamanlaması kötüydü."},
  giveback:{t:"Kârı geri verdi",post:true,why:"En az 1R kârı gördü ama başabaş ya da zararla kapandı."},
  deskcut:{t:"Masa zararla kesti",post:true,why:"Stop gelmeden masa kararıyla zararla kapatıldı."},
  timeout:{t:"Zaman stopu zararda",post:true,why:"Hareket gelmedi, süre dolunca zararda kapandı."},
  cost:{t:"Maliyet ağır",post:true,why:"Komisyon ve fonlama riskin %20'sini aştı."},
  offline:{t:"Uygulama kapalıyken",post:true,why:"Pozisyon açıkken uygulama kapandı; stop ve hedef izlenmedi, sonuç yeniden açılışta o anki fiyattan hesaplandı."}};
const AUD_VOTE={nosweep:a=>a.liq!=null&&a.liq<=0.3,counter:a=>a.trend!=null&&a.trend<-0.3,btc:a=>a.macro!=null&&a.macro<0,flow:a=>a.flow!=null&&a.flow<0};
/* eski kayıtlar: girişteki oylar karar günlüğündeki "DOLDU" satırından, çıkış nedenleri aynı coinin satırlarından okunur */
function audBackfill(trades, log){
  const byName={}; for(const d of DESK) byName[d.name]=d.id; Object.assign(byName,{"Ayşe":"trend","Elif":"macro","Selin":"quant"});
  const num=s=>+String(s).replace(",",".");
  for(const t of trades){
    if(!t.snap){ const f=(log||[]).find(l=>l.type==="fill"&&l.sym===t.sym&&Math.abs(l.t-t.openT)<10e3&&/Oylar:/.test(l.text));
      if(f){ const v={}; const m=f.text.split("Oylar:")[1]||""; for(const x of m.matchAll(/([A-Za-zÇĞİÖŞÜçğıöşü]+) ([+-]?\d+(?:,\d+)?)/g)){ const id=byName[x[1]]; if(id) v[id]=num(x[2]); }
        const sd=(f.text.match(/stop [^(]*\((\d+(?:,\d+)?)%\)/)||[])[1]; const sc=(f.text.match(/puan (-?\d+(?:,\d+)?)/)||[])[1]; const yes=(f.text.match(/(\d+)\/\d+ evet/)||[])[1];
        if(Object.keys(v).length) t.snap={v,sd:sd?num(sd)/100:NaN,score:sc?num(sc):t.score,yes:yes?+yes:Object.values(v).filter(x=>x>0.15).length,src:"log"}; } }
    if(!t.exits){ const ex=(log||[]).filter(l=>l.sym===t.sym&&l.t>=t.openT-1e3&&l.t<=(t.closeT||0)+1e3&&/^(stop|tp1|tp2|time|desk)$/.test(l.type)).map(l=>l.type); if(ex.length) t.exits=ex; }
  }
  return trades;
}
function audTagsOf(t, trades, opts){
  const thr=opts&&isFinite(opts.thr)?opts.thr:COM_DEF.threshold, minYes=opts&&opts.minYes||COM_DEF.minYes; const tags=[]; const s=t.snap; const a=s?s.v:null;
  if(a){ for(const k in AUD_VOTE) if(AUD_VOTE[k](a)) tags.push(k); }
  const sc=s&&isFinite(s.score)?s.score:t.score; if(isFinite(sc)&&sc<thr+0.05) tags.push("thin");
  if(s&&isFinite(s.yes)&&s.yes<=minYes) tags.push("lone");
  const same=trades.filter(o=>o!==t&&o.dir===t.dir&&o.openT<=t.openT+60e3&&o.closeT>t.openT).length; if(same>=2) tags.push("cluster");
  if(trades.some(o=>o!==t&&o.r<0&&o.closeT<=t.openT&&t.openT-o.closeT<=60*60e3)) tags.push("afterloss");
  const hold=(t.closeT-t.openT)/60e3; const ex=t.exits||[]; const last=ex[ex.length-1];
  if(t.r<0&&(last==="stop"||(!ex.length&&t.r<=-0.8))&&hold<=45&&!(isFinite(t.mfe)&&t.mfe>0.3)) tags.push("noise");
  if(isFinite(t.mfe)&&t.mfe>=1&&t.r<=0.1) tags.push("giveback");
  if(t.r<0&&last==="desk") tags.push("deskcut");
  if(t.r<0&&last==="time") tags.push("timeout");
  if(t.risk>0&&isFinite(t.fees)&&t.fees/t.risk>=0.2) tags.push("cost");
  if(t.offline) tags.push("offline");
  return tags;
}
function audCorr(xs,ys){ const n=xs.length; if(n<3) return 0; const mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n; let sxy=0,sxx=0,syy=0; for(let i=0;i<n;i++){ const dx=xs[i]-mx, dy=ys[i]-my; sxy+=dx*dy; sxx+=dx*dx; syy+=dy*dy; } return sxx>0&&syy>0?sxy/Math.sqrt(sxx*syy):0; }
function auditRun(trades, log, opts){
  trades=audBackfill((trades||[]).filter(t=>t&&isFinite(t.r)&&t.openT&&t.closeT),log);
  const out={n:trades.length,at:Date.now(),tags:{},lessons:[],mult:{},thrBump:0,minYesBump:0,maxSameDir:null,pauseMin:0,sdMin:0.015,lockEarly:false,veto:{},vote:{},findings:[],summary:null,clean:null};
  if(!trades.length) return out;
  const R=trades.map(t=>t.r), win=trades.filter(t=>t.r>0).length, sum=R.reduce((a,b)=>a+b,0);
  const losses=trades.filter(t=>t.r<0); const fees=trades.reduce((a,t)=>a+(t.risk>0&&isFinite(t.fees)?t.fees/t.risk:0),0);
  out.summary={n:trades.length,win,wr:win/trades.length,sum,avg:sum/trades.length,losses:losses.length,feeR:fees/trades.length,snap:trades.filter(t=>t.snap).length};
  const tagged=trades.map(t=>({t,tags:audTagsOf(t,trades,opts)}));
  for(const k in AUD_TAGS){ const has=tagged.filter(x=>x.tags.includes(k)), not=tagged.filter(x=>!x.tags.includes(k)&&(AUD_TAGS[k].pre!=="vote"||x.t.snap));
    const s=has.reduce((a,x)=>a+x.t.r,0), s2=not.reduce((a,x)=>a+x.t.r,0);
    out.tags[k]={n:has.length,sum:s,avg:has.length?s/has.length:0,shr:s/(has.length+4),nNot:not.length,avgNot:not.length?s2/not.length:0,lossShare:losses.length?has.filter(x=>x.t.r<0).length/losses.length:0}; }
  const T=out.tags; const bad=k=>T[k].n>=AUD_MIN&&T[k].shr<=-0.25&&T[k].avg<T[k].avgNot-0.25; const lesson=(k,lever)=>out.lessons.push({k,t:AUD_TAGS[k].t,why:AUD_TAGS[k].why,n:T[k].n,avg:T[k].avg,avgNot:T[k].avgNot,lever});
  for(const k in AUD_VOTE) if(bad(k)){ const strong=T[k].n>=10&&T[k].shr<=-0.5; out.vote[k]=clamp(T[k].shr*1.5,-1,-0.3); if(strong) out.veto[k]=true; lesson(k,strong?"Zeynep bu kalıba veto koyar":"Zeynep bu kalıba karşı oy verir"); }
  if(bad("thin")){ out.thrBump=T.thin.shr<=-0.5?0.1:0.05; lesson("thin",`eşik +${fx(out.thrBump,2)}`); }
  if(bad("lone")){ out.minYesBump=1; lesson("lone","asgari evet oyu +1"); }
  if(bad("cluster")){ out.maxSameDir=1; lesson("cluster","aynı yönde en fazla 1 pozisyon"); }
  if(bad("afterloss")){ out.pauseMin=60; lesson("afterloss","kayıptan sonra 60 dk yeni giriş yok"); }
  if(losses.length>=AUD_MIN&&T.noise.n>=3&&T.noise.lossShare>=0.4){ out.sdMin=0.02; lesson("noise",`stop tabanı %1,5 → %2 (kayıpların %${Math.round(T.noise.lossShare*100)}'i gürültü stopu)`); }
  const saw1=trades.filter(t=>isFinite(t.mfe)&&t.mfe>=1).length; if(T.giveback.n>=3&&saw1&&T.giveback.n/saw1>=0.25){ out.lockEarly=true; lesson("giveback","1R görüp 0,5R geri gelince momentuma bakmadan yarısı alınır"); }
  /* ajan ağırlıkları: oy (işlem yönünde) ile sonuç R'si arasındaki ilişki */
  const withSnap=trades.filter(t=>t.snap&&t.snap.v);
  for(const d of DESK){ const xs=[],ys=[]; for(const t of withSnap){ const v=t.snap.v[d.id]; if(isFinite(v)){ xs.push(v); ys.push(clamp(t.r,-1.5,3)); } }
    if(xs.length>=8){ const c=audCorr(xs,ys); out.mult[d.id]={m:+clamp(1+c*0.6*Math.min(1,xs.length/30),0.6,1.4).toFixed(2),corr:+c.toFixed(2),n:xs.length}; } }
  const cl=tagged.filter(x=>x.t.snap&&!x.tags.some(k=>out.vote[k]!=null)); if(cl.length>=AUD_MIN){ const s=cl.reduce((a,x)=>a+x.t.r,0); out.clean={n:cl.length,avg:s/cl.length,shr:s/(cl.length+4)}; }
  out.findings=tagged.filter(x=>x.t.r<0).slice(-12).reverse().map(x=>({sym:x.t.sym,dir:x.t.dir,r:x.t.r,openT:x.t.openT,closeT:x.t.closeT,tags:x.tags,exits:x.t.exits||[],mfe:x.t.mfe}));
  return out;
}
/* komite içinden: Zeynep'in oyu, kurulumu kayıtlı hatalarla karşılaştırarak */
function audVoteFor(ag){
  const a={}; for(const k in ag) a[k]=ag[k].v;
  if(!AUD||!AUD.summary||AUD.summary.snap<AUD_MIN) return {v:0,c:0,w:0,hits:[],veto:null,txt:AUD&&AUD.summary?`${AUD.summary.n} işlem kayıtlı, ders için en az ${AUD_MIN} oylu işlem gerekir`:"henüz kapanmış işlem yok"};
  const hits=Object.keys(AUD.vote).filter(k=>AUD_VOTE[k](a)); const veto=hits.find(k=>AUD.veto[k])||null;
  let v=0,c=0.4; if(hits.length){ v=Math.min(...hits.map(k=>AUD.vote[k])); c=Math.min(0.9,0.4+0.03*Math.max(...hits.map(k=>AUD.tags[k].n))); }
  else if(AUD.clean&&AUD.clean.shr>0.1){ v=clamp(AUD.clean.shr,0,0.6); c=Math.min(0.8,0.3+AUD.clean.n/40); }
  const txt=hits.length?hits.map(k=>`${AUD_TAGS[k].t}: ${AUD.tags[k].n} işlemde ort. ${fx(AUD.tags[k].avg,2)}R`).join(" · "):`kayıtlı hatalardan hiçbiri yok${AUD.clean?` · temiz kurulumlar ${AUD.clean.n} işlemde ort. ${fx(AUD.clean.avg,2)}R`:""}`;
  return {v,c,w:1,hits,veto,txt};
}
