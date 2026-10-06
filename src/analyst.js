/* ---------- Selim · LLM lider analisti (araştırma ekibinin dördüncü kişisi, 7 Ekim 2026) ----------
   Kullanıcı: "copy-trade liderlerini analiz eden arkadaşı otomasyona bağlayalım, bir LLM yapalım; en önemli başarılı strateji verisi orada."
   Sonra: "yerelde ücretsiz çalıştırabileceğimiz bir LLM" → varsayılan sağlayıcı Ollama (llm.js); Claude API isteğe bağlı.
   Akış (labTick içinde, dakikada bir kontrol; LLM koşusu günde bir):
     1. Tolga liderlerin kapanmış işlemlerini toplar (40 lider, saatte bir liste), labEnrich her işleme girişten önceki piyasa durumunu ve
        kopya ölçüsünü yazar (research.js: açılış saatinin kapanışında gir, liderin kapanış fiyatından çık; ortalama düşürme hariç).
     2. Burak sayısal taramayla aday kural ve kaçınılacak kalıp çıkarır (labAnalyze; ölçü tabana göre fark).
     3. Selim (LLM) aynı veriyi okur: işlem tablosu, faktör tablosu, Burak'ın adayları, lider stilleri ve kendi önceki hipotezlerinin sonuçları.
        Çıktısı makinece okunur JSON'dur: hipotez = yön + 1–3 koşul, yalnız LAB_FEATS sözlüğünden. Kod yazmaz, kod çalıştırmaz; sözlükte olmayan koşul atılır.
     4. Her hipotez Burak'ın kapılarıyla (labTest/labGate) liderlerin geçmişinde ölçülür. Tutmayan "elendi" olur ve masaya hiç gelmez.
        Tutan "aday" olur: canlı taramada eşleştikçe Onur gölge sinyal yazar (ileri test).
     5. Oy: Selim masada oturmaz. Hipotezi ileri testte onaylanınca (≥20 sonuç, ort > 0) Burak'ın adayları arasına girer ve Burak onunla oy verir.
     6. Kaan'ın faktör kütüphanesi: Burak'ın adayları/kaçınları ve Selim'in hipotezleri FACTORS'a "lab_*" faktörü olarak eklenir (dyn, ağırlık 0).
        Tahmin defteri her birini "f:lab_*" adıyla puanlar; tests/research-factors.js --lab <lab-rules.json> aynı kuralları geçmiş mumlarda ölçer.
     7. Açık pozisyonlar: liderler her yenilendiğinde (saatte bir) Tolga, bizim açık kâğıt pozisyonlarımızın coininde liderlerin açtığını/kapattığını
        not eder (labPosWatch); ldPosView(sym,dir) aynı görüşü pozisyon yönetimine verir.
   Maliyet: Ollama/yerel sunucu ücretsiz (bilgisayarın işlemcisi/ekran kartı). Claude API seçilirse bir koşu ≈ 25–35 bin girdi + 5–10 bin çıktı
   belirteci, Opus 5.5 ($4 / $20 milyon) ≈ 0,2–0,35 $, günde bir ≈ ayda 6–10 $.
   Uyarı: liderlerin kazandığı koşul bizim için kanıt değildir (hayatta kalma yanlılığı, stopsuz ortalama düşürme; bkz. arastirma/neden-kaybediyoruz).
   Selim'in hipotezi de böyledir; kanıt yalnızca ileri testtir. */
const SEL_CFG={everyH:24,minNew:40,minTrades:60,sample:{claude:800,local:250},maxHyps:40,maxTokens:16000,localOut:3000,minRows:30};
const sel={hyps:[],runs:[],at:0,lastN:0,summary:"",styleNotes:[],dataAsks:[],err:null,busy:false,posProvider:null,posSeen:{}};
try{ const sv=JSON.parse(localStorage.getItem("st-sel")||"null"); if(sv&&sv.v===1){ for(const k of ["hyps","runs","at","lastN","summary","styleNotes","dataAsks","posSeen"]) if(sv[k]!=null) sel[k]=sv[k]; } }catch(e){}
function selSave(){ try{ localStorage.setItem("st-sel",JSON.stringify({v:1,hyps:sel.hyps,runs:sel.runs.slice(-30),at:sel.at,lastN:sel.lastN,summary:sel.summary,styleNotes:sel.styleNotes,dataAsks:sel.dataAsks,posSeen:sel.posSeen})); }catch(e){} }
const selFeatTxt=()=>LAB_FEATS.map(F=>`${F.k} (${F.name}): `+Object.entries(F.vals).map(([v,t])=>`${v}=${t}`).join(", ")).join("\n");
const SEL_SYS=`Sen Selim'sin: bir kripto vadeli işlem araştırma ekibinde kopya trader liderlerinin işlem geçmişini inceleyen analistsin. Türkçe yazarsın.
Görevin: Binance kopya trading liderlerinin kapanmış işlemlerinden, bizim de kural olarak uygulayabileceğimiz, test edilebilir giriş koşulları çıkarmak.
Veri hakkında bilmen gerekenler:
- Her satır bir liderin kapanmış pozisyonudur. "m" = kaldıraçsız fiyat hareketi ÷ girişteki 1 saatlik ATR (±5'e kırpılır); artı = lider o yönde kazandı. "kazandi" lider PnL'inin işaretidir.
- Koşul sütunları girişten ÖNCE kapanmış 1 saatlik mumlardan hesaplanır (bakış ileri yok). Sözlük:
{FEATS}
- Liderler panodaki en iyi 20 kişidir: hayatta kalma yanlılığı var; çoğu stopsuz ortalama düşürür, bu yüzden kazanma oranı yüksek ama kayıpları büyüktür. Yüksek kazanma oranını değil ATR cinsinden ortalamayı ve iki zaman yarısında tutarlılığı önemse.
- Senin önerdiğin her hipotez kod tarafından aynı veride ölçülür: en az 20 işlem, en az 4 farklı lider, zaman sırasına göre iki yarıda da artı ortalama, t ≥ 1,5. Tutmayan elenir. Tutan, canlı piyasada 20 ileri sinyalle sınanır; ancak orada da artı kalırsa işlemde kullanılır.
- Bir önceki koşularındaki hipotezlerin ve sonuçları veride var; elenenleri tekrar önerme, tutanları geliştir.
Kurallar: koşullar yalnız sözlükteki anahtar=değer çiftleri olabilir, hipotez başına 1–3 koşul. Burak'ın (sayısal tarama) zaten bulduğu adayları aynen tekrar etme; ya farklı bir kombinasyon öner ya da neden işe yaradığını açıklayıp daralt. Çok sayıda koşul taranınca şans eseri tutan kalıplar çıkar; az ama mantığı olan hipotez öner (en çok 8 hipotez, en çok 4 kaçınılacak kalıp). Gerekçeyi liderlerin davranışıyla bağla (kim, hangi tarzda, neden).
"ozet": kullanıcıya 3–5 cümlelik sade Türkçe özet (yeni başlayan bir yatırımcıya, uyarı ve sorumluluk reddi cümlesi yazmadan). "veri_istekleri": sözlükte olmayan ama bakmak istediğin veri (ör. fonlama, açık pozisyon), en çok 3.`;
const SEL_HYP=()=>{ const F=LAB_FEATS.map(f=>f.k); const V=[...new Set(LAB_FEATS.flatMap(f=>Object.keys(f.vals)))];
  return {type:"object",additionalProperties:false,required:["ad","yon","kosullar","gerekce"],properties:{ad:{type:"string"},yon:{type:"string",enum:["long","short"]},
    kosullar:{type:"array",items:{type:"object",additionalProperties:false,required:["f","v"],properties:{f:{type:"string",enum:F},v:{type:"string",enum:V}}}},gerekce:{type:"string"}}}; };
const SEL_SCHEMA=()=>({type:"object",additionalProperties:false,required:["ozet","hipotezler","kacin","stil_notlari","veri_istekleri"],properties:{
  ozet:{type:"string"},hipotezler:{type:"array",items:SEL_HYP()},kacin:{type:"array",items:SEL_HYP()},stil_notlari:{type:"array",items:{type:"string"}},veri_istekleri:{type:"array",items:{type:"string"}}}});
const selKeyOf=(dir,conds)=>"sel|"+dir+"|"+conds.map(c=>c.join("=")).sort().join("&");
// LLM çıktısındaki koşulları sözlüğe göre temizle: bilinmeyen anahtar/değer, aynı anahtar iki kez, 3'ten fazla koşul → atılır
function selConds(list){ const out=[]; const seen=new Set(); for(const c of list||[]){ const F=LAB_FEATS.find(f=>f.k===c.f); if(!F||!(c.v in F.vals)||seen.has(c.f)) return null; seen.add(c.f); out.push([c.f,c.v]); } return out.length>=1&&out.length<=3?out:null; }
/* --- veri paketi: Selim'in okuduğu her şey (yalnız sayılar ve takma adlar; anahtar ya da hesap bilgisi yok) --- */
function selPayload(C){
  C=C||labCtx(); const T=C.T.slice(-SEL_CFG.sample[llm.cfg.provider==="claude"?"claude":"local"]); const nick={}; let li=0; const lidOf=x=>nick[x.lid]||(nick[x.lid]="L"+(++li));
  const fk=LAB_FEATS.map(f=>f.k); const sgn=v=>isFinite(v)?(+v).toFixed(2):"";
  const rows=["lider,coin,yon,acilis_utc,tutus_sa,kaldirac,m,kazandi,"+fk.join(",")].concat(T.map(x=>[lidOf(x),x.sym.replace("USDT",""),x.dir,new Date(x.open).toISOString().slice(0,13),sgn(x.hold),x.lev||"",sgn(x.m),x.pnl>0?1:0,...fk.map(k=>x.f[k])].join(",")));
  const B=lab.base; const st=s=>s?{n:s.n,lider:s.leaders,ort:s.mean,kazanma:s.wr,yari1:s.h1,yari2:s.h2,t:s.t,tutus_sa:s.hold}:null;
  const cand=c=>({kural:c.name,yon:c.dir,kosullar:c.conds.map(x=>x.join("=")),...st(c),ileri_test:lab.fwd[c.key]||null,durum:c.status});
  const styles=Object.entries(lab.styles||{}).map(([lid,s])=>({lider:nick[lid]||(nick[lid]="L"+(++li)),takma_ad:s.nick,n:s.n,kazanma:+s.wr.toFixed(2),ort:+s.mean.toFixed(2),tutus_sa:+(+s.hold).toFixed(1),kaldirac:s.lev,etiket:s.tags}));
  const prev=sel.hyps.map(h=>({ad:h.ad,yon:h.dir,kosullar:h.conds.map(x=>x.join("=")),kacin:!!h.avoid,durum:h.status,olcum:st(h.ins),ileri_test:lab.fwd[h.key]||null}));
  const fac=(lab.factors||[]).map(f=>`${f.dir},${f.f}=${f.v},n=${f.n},ort=${f.mean},kaz=${f.wr},y1=${f.h1},y2=${f.h2}`);
  const txt=`TABAN (tüm zenginleşmiş işlemler): ${JSON.stringify({tum:st(B&&B.all),long:st(B&&B.long),short:st(B&&B.short),lider:B&&B.leaders,islem:B&&B.featured,aralik:B?[new Date(B.from).toISOString().slice(0,10),new Date(B.to).toISOString().slice(0,10)]:null})}
FAKTÖR TABLOSU (yön, koşul, işlem, ort m, kazanma, yarı1, yarı2):
${fac.join("\n")}
BURAK'IN ADAYLARI: ${JSON.stringify(lab.cands.map(cand))}
BURAK'IN KAÇINILACAKLARI: ${JSON.stringify(lab.avoid.map(cand))}
LİDER STİLLERİ: ${JSON.stringify(styles)}
SENİN ÖNCEKİ HİPOTEZLERİN VE SONUÇLARI: ${JSON.stringify(prev)}
İŞLEMLER (son {N}, eskiden yeniye):
`;
  // yerel modelde bağlam dar (llm.cfg.ctx, varsayılan 8192): istem + çıktı sığsın diye en yeni işlemlerden başlayarak sığanı al (≈3 karakter/belirteç)
  let R=rows.slice(1); if(llm.cfg.provider!=="claude"){ const room=(llm.cfg.ctx-SEL_CFG.localOut-1500)*3-txt.length-SEL_SYS.length-rows[0].length; let used=0, k=R.length;
    while(k>0&&(R.length-k<SEL_CFG.minRows||used+R[k-1].length+1<=room)){ used+=R[k-1].length+1; k--; } R=R.slice(k); }
  return txt.replace("{N}",R.length)+[rows[0]].concat(R).join("\n");
}
/* --- LLM çağrısı (llm.js: Ollama / yerel OpenAI uyumlu sunucu / Claude API), yapılandırılmış JSON çıktısı --- */
async function selCall(payload){
  const r=await llmChat({system:SEL_SYS.replace("{FEATS}",selFeatTxt()),user:payload+"\n\nBu veriden hipotezlerini çıkar. Yalnız istenen JSON nesnesini döndür.",schema:SEL_SCHEMA(),maxTokens:llm.cfg.provider==="claude"?SEL_CFG.maxTokens:SEL_CFG.localOut,think:llm.cfg.provider==="claude"?undefined:false,name:"selim"});
  return {out:r.out,usage:r.usage,model:r.model,provider:r.provider};
}
/* --- hipotezleri liderlerin geçmişinde ölç (her analizde yeniden; veri büyüdükçe durum değişebilir) --- */
function selScore(h,C){ const s=labTest(h.dir,h.conds,C); const keep=["n","leaders","mean","wr","h1","h2","t","tl","n1","n2","hold","lev","lift"]; h.ins=Object.fromEntries(keep.map(k=>[k,s[k]]));
  for(const k of ["n","leaders","mean","wr","h1","h2","t","tl","lift","hold","lev"]) h[k]=s[k]; // labShadow/Burak aday alanlarıyla aynı adlar
  h.status=h.avoid?(s.bad?"aday":"elendi"):(s.good?"aday":"elendi"); return h; }
function selAfterAnalyze(C){ if(sel.hyps.length){ for(const h of sel.hyps) selScore(h,C); } facSyncDyn(); }
function selIngest(res,C){
  const o=res.out||{}; const now=Date.now(); const run={t:now,model:res.model,provider:res.provider,usage:res.usage,n:C.T.length,hyps:0,kept:0,dropped:0};
  const add=(arr,avoid)=>{ for(const x of (arr||[]).slice(0,avoid?4:8)){ const conds=selConds(x.kosullar); if(!conds||!(x.yon==="long"||x.yon==="short")){ run.dropped++; continue; }
      const key=selKeyOf(x.yon,conds); if(!avoid&&lab.cands.some(c=>c.dir===x.yon&&c.conds.map(z=>z.join("=")).sort().join("&")===conds.map(z=>z.join("=")).sort().join("&"))){ run.dropped++; continue; } // Burak'ta zaten var
      let h=sel.hyps.find(z=>z.key===key); if(!h){ h={key,dir:x.yon,conds,avoid,at:now}; sel.hyps.push(h); }
      h.ad=String(x.ad||"").slice(0,120); h.why=String(x.gerekce||"").slice(0,600); h.run=now; h.name="Selim · "+labCondTxt(conds); selScore(h,C); run.hyps++; if(h.status==="aday") run.kept++; } };
  add(o.hipotezler,false); add(o.kacin,true);
  // eskiler: elenmiş ve en eski olanlar düşer
  if(sel.hyps.length>SEL_CFG.maxHyps){ sel.hyps.sort((a,b)=>(a.status==="elendi")-(b.status==="elendi")||b.run-a.run); sel.hyps=sel.hyps.slice(0,SEL_CFG.maxHyps); }
  sel.summary=String(o.ozet||"").slice(0,1500); sel.styleNotes=(o.stil_notlari||[]).slice(0,8).map(s=>String(s).slice(0,300)); sel.dataAsks=(o.veri_istekleri||[]).slice(0,3).map(s=>String(s).slice(0,200));
  sel.runs.push(run); sel.at=now; sel.lastN=C.T.length; facSyncDyn(); selSave();
  labNote("Selim",`${run.hyps} hipotez (${run.kept} liderlerin geçmişinde tuttu, ileri teste girdi${run.dropped?`, ${run.dropped} geçersiz/tekrar atıldı`:""}) · ${res.model} · ${res.usage.in+res.usage.out} belirteç${res.usage.cost?` ≈ ${fx(res.usage.cost,2)} $`:", ücretsiz (yerel)"}.`);
  return run;
}
// force: süreyi beklemeden (UI düğmesi). Anahtar yoksa ya da veri azsa hiçbir şey yapmaz.
async function selTick(force){
  if(sel.busy||!llmReady()) return null; const C=labCtx(); if(C.T.length<SEL_CFG.minTrades) return null;
  const due=force||(!sel.at||Date.now()-sel.at>SEL_CFG.everyH*36e5)&&(!sel.lastN||C.T.length-sel.lastN>=SEL_CFG.minNew||Date.now()-sel.at>7*864e5);
  const lastErr=sel.runs.length&&sel.runs[sel.runs.length-1].err; if(!due||(!force&&lastErr&&Date.now()-sel.runs[sel.runs.length-1].t<3*36e5)) return null; // hata sonrası 3 saat bekle
  sel.busy=true; sel.err=null; if(typeof labOnProgress==="function") labOnProgress();
  try{ if(lab.dirty) labAnalyze(); const res=await selCall(selPayload(C)); return selIngest(res,labCtx()); }
  catch(e){ sel.err=e.message; sel.runs.push({t:Date.now(),err:e.message}); selSave(); labNote("Selim",`Çalışamadım: ${e.message}.`); return null; }
  finally{ sel.busy=false; if(typeof labOnProgress==="function") labOnProgress(); }
}
/* --- Kaan'ın kütüphanesine dinamik faktörler: Burak'ın aday/kaçınları ve Selim'in hipotezleri (oy vermez; tahmin defteri ölçer) --- */
function selHash(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(36); }
function facLabRules(){ const out=[]; const push=(r,who,avoid)=>out.push({key:r.key,dir:r.dir,conds:r.conds,name:r.name,who,avoid});
  for(const c of lab.cands) push(c,"Burak",false); for(const c of lab.avoid) push(c,"Burak",true); for(const h of sel.hyps) if(h.status==="aday") push(h,"Selim (LLM)",!!h.avoid); return out; }
function facLabFeat(x,dir){ x._lab=x._lab||{}; if(dir in x._lab) return x._lab[dir]; const k=labAgg1h(x.k); const b=x.btc?labAgg1h(x.btc):null; let f=null;
  if(k&&k.length>=60) f=labFeat(k,b,k[k.length-1].t+36e5,dir); return (x._lab[dir]=f); }
// rules: verilmezse canlı durumdan (Burak + Selim); tests/research-factors.js --lab dosyasından verir
function facSyncDyn(rules){
  rules=rules||facLabRules(); for(let i=FACTORS.length-1;i>=0;i--) if(FACTORS[i].dyn) FACTORS.splice(i,1); const seen=new Set();
  for(const r of rules){ const id="lab_"+selHash(r.key); if(seen.has(id)) continue; seen.add(id); const s=r.avoid?-1:1; const D=r.dir; const conds=r.conds;
    FACTORS.push({id,ad:`${r.avoid?"Kaçın":"Lider kuralı"}: ${D==="long"?"LONG":"SHORT"} · ${r.name.replace(/^Selim · /,"")}`,kaynak:`${r.who}, kopya trader liderlerinin geçmişi`,veri:"1 sa (15 dk'dan)",dyn:true,rule:{key:r.key,dir:D,conds,avoid:!!r.avoid},
      fn(x,dir){ const f=facLabFeat(x,D); if(!f||!conds.every(([k,v])=>f[k]===v)) return null; const v=(dir===D?1:-1)*s*0.6; return {v,c:0.5,txt:`${r.avoid?"liderlerin kaybettiği":"liderlerin kazandığı"} koşul: ${D==="long"?"long":"short"} · ${r.name.replace(/^Selim · /,"")}`}; }}); }
  return FACTORS.filter(f=>f.dyn).length;
}
/* --- günlük rapor (Markdown): ekransız bot research/rapor-YYYY-MM-DD.md yazar, uygulama indirir --- */
function labReport(){
  const B=lab.base; const d=t=>new Date(t).toISOString().slice(0,10); const sg=v=>isFinite(v)?(v>0?"+":"")+(+v).toFixed(2):"—"; const pc=v=>isFinite(v)?"%"+Math.round(v*100):"—";
  const fw=k=>{ const f=lab.fwd[k]; return f&&f.n?`${f.n} sinyal, ${sg(f.sum/f.n)} ATR, %${Math.round(f.win/f.n*100)}`:"henüz yok"; };
  const row=c=>`| ${c.dir.toUpperCase()} | ${c.name.replace(/^Selim · /,"")} | ${c.n} | ${c.leaders} | ${pc(c.wr)} | ${sg(c.mean)} | ${sg(c.lift)} | ${sg(c.h1)} / ${sg(c.h2)} | ${isFinite(c.tl)?(+c.tl).toFixed(1):"—"} | ${isFinite(c.hold)?(+c.hold).toFixed(1)+" sa":"—"} | ${fw(c.key)} | ${c.status||"aday"} |`;
  const head="| Yön | Kural | İşlem | Lider | Kazanma | Ort ATR | Tabana göre | 1. / 2. yarı | t (fark) | Tutuş | İleri test | Durum |\n|---|---|---|---|---|---|---|---|---|---|---|---|";
  const L=[`# Lider araştırması · ${d(Date.now())}`,"",
    B?`${B.leaders} lider, ${B.featured} zenginleşmiş işlem (toplam ${B.total}), ${d(B.from)} – ${d(B.to)}. Taban: long ${sg(B.long.mean)} ATR (kazanma ${pc(B.long.wr)}, ${B.long.n} işlem), short ${sg(B.short.mean)} ATR (kazanma ${pc(B.short.wr)}, ${B.short.n} işlem).`:`Analiz için yeterli işlem yok (${lab.trades.length} saklı, en az ${LAB_CFG.minN} zenginleşmiş gerekir).`,"",
    "Ölçü (kopya ölçüsü): liderin açtığı saatin kapanışında girip liderin kapanış fiyatından çıksaydık kaldıraçsız hareket ÷ girişteki 1 saatlik ATR; ortalama düşürme hariç. Kazanma bu ölçüyle. Kural kapısı tabana göredir: aynı yöndeki tüm işlemlerden en az +0,15 ATR iyi, iki yarıda da, farkın t değeri ≥ 1,5. Liderler panodaki en iyiler (hayatta kalma yanlılığı, çoğu stopsuz ortalama düşürür); burada tutan kural kanıt değil, ileri testte sınanır.","",
    "## Burak · aday kurallar",lab.cands.length?head+"\n"+lab.cands.map(row).join("\n"):"Aday yok.","",
    "## Burak · kaçınılacak kalıplar",lab.avoid.length?head+"\n"+lab.avoid.map(row).join("\n"):"Kaçınılacak kalıp yok.",""];
  const H=sel.hyps; const lr=sel.runs.filter(r=>!r.err).slice(-1)[0];
  L.push("## Selim · LLM analisti",llmReady()||H.length?(lr?`Son koşu ${new Date(lr.t).toISOString().slice(0,16).replace("T"," ")} UTC · ${lr.model} · ${lr.usage.in+lr.usage.out} belirteç${lr.usage.cost?` ≈ ${lr.usage.cost.toFixed(2)} $`:lr.provider==="manual"?"":" (yerel, ücretsiz)"} · ${lr.hyps} hipotez, ${lr.kept} tuttu.`:`Henüz koşu yok (${llmLabel()}).`):"LLM kapalı ya da ayarlanmadı; Selim çalışmıyor.","");
  if(sel.err) L.push(`Son hata: ${sel.err}`,"");
  if(sel.summary) L.push(sel.summary,"");
  const hk=H.filter(h=>!h.avoid), ha=H.filter(h=>h.avoid);
  if(hk.length) L.push("### Hipotezler",head,...hk.map(h=>row({...h,name:h.ad?`${h.ad} (${h.name.replace(/^Selim · /,"")})`:h.name})),"",...hk.filter(h=>h.why).map(h=>`- **${h.ad||h.name}**: ${h.why}`),"");
  if(ha.length) L.push("### Kaçınılacaklar",head,...ha.map(h=>row({...h,name:h.ad?`${h.ad} (${h.name.replace(/^Selim · /,"")})`:h.name})),"");
  if(sel.styleNotes.length) L.push("### Lider stilleri üzerine",...sel.styleNotes.map(s=>"- "+s),"");
  if(sel.dataAsks.length) L.push("### Selim'in istediği ek veri",...sel.dataAsks.map(s=>"- "+s),"");
  const sty=Object.values(lab.styles||{}).sort((a,b)=>b.mean-a.mean);
  if(sty.length) L.push("## Lider stilleri","| Lider | İşlem | Kazanma | Ort ATR | Tutuş | Kaldıraç | Etiketler |","|---|---|---|---|---|---|---|",...sty.map(s=>`| ${s.nick} | ${s.n} | ${pc(s.wr)} | ${sg(s.mean)} | ${(+s.hold).toFixed(1)} sa | ${isFinite(s.lev)?s.lev+"x":"—"} | ${s.tags.join(", ")} |`),"");
  const dyn=FACTORS.filter(f=>f.dyn); if(dyn.length) L.push("## Kaan'ın kütüphanesine eklenen lider kuralları",`${dyn.length} kural tahmin defterinde izlemede (oy vermez): `+dyn.map(f=>"`"+f.id+"` "+f.ad).join("; "),"");
  if(lab.notes.length) L.push("## Ekip notları",...lab.notes.slice(-15).map(n=>`- ${new Date(n.t).toISOString().slice(0,16).replace("T"," ")} **${n.who}**: ${n.text}`),"");
  return L.join("\n");
}
// tests/research-factors.js --lab için: kuralların dışa aktarımı
function labRulesExport(){ return {at:Date.now(),rules:facLabRules()}; }
/* --- açık pozisyonlar: liderler bu coinde ne yapıyor (Tolga, saatte bir) --- */
// ldPosView: bizim pozisyonumuzun coininde liderlerin açık pozisyonları (emir akışından tahmin) ve son 6 saatte kapattıkları
function ldPosView(sym,dir){
  const same=[],opp=[],closed=[]; const now=Date.now();
  for(const x of Object.values((typeof ld!=="undefined"&&ld.leaders)||{})){ if(!x||x.err) continue;
    for(const o of x.open||[]) if(o.sym===sym) (o.dir===dir?same:opp).push({nick:x.nick,avg:o.avg,since:o.since,adds:o.adds});
    for(const r of x.recent||[]) if(r.sym===sym&&now-r.close<6*36e5) closed.push({nick:x.nick,dir:r.dir,roi:r.roi,close:r.close}); }
  const D=dir==="long"?"long":"short"; const nm=a=>a.slice(0,3).map(z=>z.nick).join(", ");
  let txt=same.length||opp.length?`${same.length} lider aynı yönde açık${same.length?" ("+nm(same)+")":""}, ${opp.length} lider ters yönde${opp.length?" ("+nm(opp)+")":""}`:"liderlerin bu coinde açık pozisyonu yok";
  const cs=closed.filter(c=>c.dir===dir); if(cs.length) txt+=` · son 6 saatte ${cs.length} lider ${D} kapattı (${cs.slice(0,3).map(c=>c.nick+" "+(c.roi>0?"+":"")+fx(c.roi,0)+"%").join(", ")})`;
  const v=same.length+opp.length?(same.length-opp.length)/(same.length+opp.length):0; return {sym,dir,same,opp,closed,v,txt};
}
// labPosWatch: ldRefresh sonrası; pozisyonlarımızın coininde liderlerin görüşü değiştiyse Tolga not düşer (sel.posProvider → [{sym,dir}])
function labPosWatch(){
  const P=typeof sel.posProvider==="function"?(sel.posProvider()||[]):[]; const seen={}; const out=[];
  for(const p of P){ const k=p.sym+"|"+p.dir; const w=ldPosView(p.sym,p.dir); out.push(w); const sig=w.same.length+"/"+w.opp.length+"/"+w.closed.filter(c=>c.dir===p.dir).length; seen[k]=sig;
    if(sel.posSeen[k]!==undefined&&sel.posSeen[k]!==sig) labNote("Tolga",`Açık ${p.dir==="long"?"LONG":"SHORT"} ${p.sym.replace("USDT","")}: ${w.txt}.`); }
  sel.posSeen=seen; selSave(); return out;
}
