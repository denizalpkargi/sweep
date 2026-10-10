/* ---------- Yapay zekâ masası: on üç karaktere yerel dil modeliyle "bilinç" (7 Ekim 2026) ----------
   Kural tabanlı üyeler yerinde kalır ve ölçülebilir oylarını üretir (committee.js, positionReview). Bu katman her toplantının verisini ve
   üyelerin kural oylarını dil modeline verir; model on üç karakteri kendi uzmanlıklarıyla konuşturur (görüş, itiraz, karar) ve
   yapılandırılmış bir görüş döndürür (JSON şeması): üye başına oy (−1…+1) ve güven, masanın ortak oyu ve eylemi (giriş: gir/bekle/girme;
   pozisyon: tut/kâr al/stop sık/azalt/çık). Bu görüş tahmin defterinde (forecast.js, kind "llm") kural masasından ayrı puanlanır.
   Oy: varsayılan olarak yalnız konuşur ve kayda geçer. Defterde ≥200 sonuçlanmış görüşte becerisi artıysa (fcMult > 1) ve ayarda "oy" açıksa
   (fcMult − 1) ağırlıkla puana girer (faktörlerdeki kuralın aynısı). Model yoksa, yavaşsa ya da saçmalarsa masa kuralla devam eder.
   İstemci ve model ayarı src/llm.js (Selim ile tek ayar: sağlayıcı, adres, model, bağlam); burada yalnız masanın bütçesi (localStorage "st-llmdesk").
   Ücretli sağlayıcı (Claude API) seçiliyse masa konuşmaz (allowPaid kapalı).
   Bütçe: model tek iş yapar (kuyruk sırayla), saatte en çok perHour çağrı, pozisyonlar girişlerden önce, 3 hatada 10 dk ara. Kullanıcının PC'si
   (Core Ultra 7 155H, 16 GB, yalnız CPU) 7–8B Q4 modelde istemi ~30 tok/sn okur, ~5–7 tok/sn yazar (6 Ekim ölçümü): bir toplantı (~1200 tok istem,
   ~400 tok yanıt) ≈ 1,5–2 dk → 15 dk mumda en çok ~6 toplantı; varsayılan saatte 8. Gerçek emir yok: model yalnız kâğıt masada konuşur. */
const LMD_DEF={on:true,maxTokens:700,perHour:8,entryTop:1,minScore:0.2,askGapMin:30,posEveryMin:30,vote:false,minN:200,allowPaid:false};
const LMD_KEY="st-llmdesk";
const LLM_ACT={giris:["gir","bekle","girme"],pozisyon:["tut","kâr al","stop sık","azalt","çık"]};
// karakterler: üyenin uzmanlığı ve mizacı (sistem istemi sabit kalır; Ollama aynı öneki önbellekten okur)
const LLM_PERSONA={trend:"günlük yön ve 1 saatlik yapıya bakar; sabırlı, trende karşı işlemi sevmez",liq:"likidite avcısı (ICT): havuz, süpürme, MSS, OTE; manipülasyon görmeden girmez",
  flow:"emir akışı: süpürmede emilim, taker oranı, açık pozisyon (OI); sayılara takıntılı",macro:"BTC rejimi, fonlama ve kalabalık; temkinli",
  quant:"istatistikçi: örnek sayısı, komisyon ve kayma maliyeti, süre; kanıtsız iddiaya şüpheyle bakar",mom:"agresif trader: momentum ve hacim; fırsat kaçırmaktan nefret eder",
  copy:"Binance kopya trader liderlerinin bu coindeki pozisyonlarını izler",lab:"liderlerin geçmiş işlemlerinden çıkan kalıpları test eder",
  audit:"denetçi: kapanmış işlemlerin hatalarıyla karşılaştırır, aynı hatayı tekrar ettirmez",vol:"hacim profili: POC, değer alanı, düşüşte artan hacim",
  check:"kural denetçisi: günlük ve 4 saatlik uyum, kurulum şartları, maliyet",fac:"ölçülmüş faktörler (10 günlük kapanış kırılımı, BTC 200 günlük ortalama)",
  rank:"sıralama modeli: coinin önümüzdeki 4/12 saatte en hacimli 30 coin içindeki yeri (LightGBM lambdarank); gölge oyken puana girmez",
  risk:"baş trader: risk, likidasyon, stop; son kararı o verir, veto hakkı var"};
const lmd={cfg:null,q:[],busy:false,calls:[],fails:0,downUntil:0,last:[],views:{},asked:{},stats:{n:0,ok:0,bad:0,ms:0,tokIn:0,tokOut:0},err:null,onView:null};
function lmdCfg(){ if(!lmd.cfg){ let sv=null; try{ sv=JSON.parse(localStorage.getItem(LMD_KEY)||"null"); }catch(e){} lmd.cfg={...LMD_DEF,...(sv||{})}; } return lmd.cfg; }
function lmdSetCfg(o){ lmd.cfg={...lmdCfg(),...(o||{})}; try{ localStorage.setItem(LMD_KEY,JSON.stringify(lmd.cfg)); }catch(e){} return lmd.cfg; }
// istemci (src/llm.js, Selim ile ortak): hata fırlatır; burada {ok,...} biçimine çevrilir
async function lmdCall(system, user, schema, maxTokens){ const t0=Date.now();
  try{ const r=await llmChat({system,user,schema,name:"masa",maxTokens,think:false}); return {ok:true,ms:Date.now()-t0,text:r.text,json:r.out,tokIn:r.usage.in,tokOut:r.usage.out,model:r.model}; }
  catch(e){ return {ok:false,ms:Date.now()-t0,err:String(e&&e.message||e)}; } }
async function lmdPing(){ const r=await lmdCall("Kısa cevap ver.","Tek kelimeyle cevap ver: hazır mısın?",null,16); lmd.err=r.ok?null:r.err; return r; }
// bütçe: kapalı, ulaşılamıyor (3 hatadan sonra 10 dk ara), saatlik sınır
function lmdReady(){ const C=lmdCfg(); if(!C.on) return "kapalı"; if(typeof llm==="undefined"||(llm.cfg.provider==="claude"&&!C.allowPaid)) return "ücretli sağlayıcı (Claude API) seçili; masa yalnız yerel modelle konuşur"; if(typeof llmReady!=="function"||!llmReady()) return "dil modeli ayarı kapalı (Araştırma sekmesi)"; if(Date.now()<lmd.downUntil) return "ulaşılamıyor ("+(lmd.err||"hata")+"), "+Math.ceil((lmd.downUntil-Date.now())/60e3)+" dk sonra yeniden"; const h=Date.now()-36e5; lmd.calls=lmd.calls.filter(t=>t>h); if(lmd.calls.length>=C.perHour) return `saatlik bütçe doldu (${C.perHour})`; return null; }
/* ---------- toplantı istemi ---------- */
const r3=v=>isFinite(v)?Math.round(v*1000)/1000:null;
function lmdSystem(kind){
  const who=DESK.map(d=>`${d.id} = ${d.name} (${d.role}): ${LLM_PERSONA[d.id]||""}`).join("\n");
  return `Bir kripto vadeli işlem masasının toplantısını yürütüyorsun. Masada on üç kişi var, hepsi erkek; her biri yalnız kendi uzmanlığına bakar ve kendi mizacıyla konuşur:
${who}
Sana JSON olarak piyasa verisi ve her üyenin kural tabanlı ölçümü (oy −1…+1, güven 0…1, not) verilir. "cekimser": true olan üyenin verisi yoktur; konuşturma.
Görev: her üye veriyi kendi gözüyle yorumlar (en çok 20 kelime), en güçlü iki itiraz söylenir, sonra Can masanın ortak kararını verir.
Kurallar: yalnız verilen sayılara dayan, sayı uydurma; kural oyundan farklı düşünebilirsin ama gerekçesini söyle; oy masanın gerçekten ne düşündüğü olsun, kural oyunun kopyası değil.
"soz" üyenin "not" alanını tekrar etmez: ölçümün bu işlem için ne anlama geldiğini ve görüşünü neyin değiştireceğini kendi cümlesiyle söyler.
Can'ın "karar" oyu ve güveni sabit bir değer değildir: üyelerin oylarını, güvenlerini ve itirazların gücünü tartarak bu toplantıya özgü belirlenir.
Türkçe yaz. Yalnız JSON döndür, başka metin yok. Şema (<...> yerine kendi değerini yaz):
{"uyeler":[{"id":"<üye id>","oy":<-1…1>,"guven":<0…1>,"soz":"<yorum>"}],"tartisma":[{"id":"<itiraz eden>","kime":"<itiraz edilen>","soz":"<itiraz>"}],"karar":{"oy":<-1…1>,"guven":<0…1>,"eylem":"<eylem>","gerekce":"<gerekçe>"}}
"oy": ${kind==="pozisyon"?"pozisyonu tutmaya destek (+1 kesin tut, −1 hemen çık)":"bu yönde işleme destek (+1 kesin gir, −1 kesin karşı)"}. "eylem": ${(kind==="pozisyon"?LLM_ACT.pozisyon:LLM_ACT.giris).map(x=>'"'+x+'"').join(" | ")}.`;
}
// toplantının verisi: kısa anahtarlar, yuvarlanmış sayılar (istem ~1000–1300 token)
function lmdBrief(kind, sym, dir, A, com, rv, pos){
  const B=A.btcReg&&A.btcReg[dir]; const list=kind==="pozisyon"&&rv&&rv.views?rv.views:(com&&com.agents)||[];
  const uyeler=list.map(a=>a.abst?{id:a.id,cekimser:true}:{id:a.id,oy:r3(a.v),guven:r3(a.c),not:String(a.txt||"").slice(0,160),...(a.act?{eylem:a.act}:{})});
  const piyasa={fiyat:A.px,gunluk_trend:A.trend,trend_puani:A.trendScore,saatlik_yapi:A.st,ruzgar:A.score,hacim_orani:r3(A.volRel),fonlama:r3(A.fund*100),taker_30dk:r3(A.tk30),oi:A.oiCase||null,
    btc:B?{deg_4sa:r3(B.ch4*100),deg_24sa:r3(B.ch24*100),yapi:B.bias}:null};
  const d={tur:kind,coin:sym,yon:dir,piyasa,uyeler};
  if(kind==="pozisyon"&&rv){ d.pozisyon={giris:pos&&pos.entry,stop:pos&&pos.stop,hedef1:pos&&pos.t1,hedef2:pos&&pos.t2,asama:pos&&pos.stage,R:r3(rv.rNow),en_iyi_R:r3(rv.peakR),sure_sa:r3(rv.held),likidasyon_ATR:r3(rv.liqAtr)};
    d.kural_masasi={tutma_puani:pts(rv.hold),karar:rv.verdict,ters_yon_puani:pts(rv.oppScore),kar_al_payi:r3(rv.tpShare)}; }
  else if(com){ d.kural_masasi={puan:pts(com.score),esik:pts(COM_DEF.threshold),evet:com.yes,karar:com.decision,veto:com.veto||null,stop_yuzde:com.plan?r3(com.plan.sd*100):null}; }
  return d;
}
// çıktı şeması (Ollama "format", OpenAI uyumlu json_schema strict): küçük modeller bununla bozuk JSON üretmez
function lmdSchema(kind){ const acts=kind==="pozisyon"?LLM_ACT.pozisyon:LLM_ACT.giris; const ids=DESK.map(d=>d.id); const S=(props)=>({type:"object",properties:props,required:Object.keys(props),additionalProperties:false});
  return S({uyeler:{type:"array",items:S({id:{type:"string",enum:ids},oy:{type:"number"},guven:{type:"number"},soz:{type:"string"}})},
    tartisma:{type:"array",items:S({id:{type:"string",enum:ids},kime:{type:"string",enum:ids},soz:{type:"string"}})},
    karar:S({oy:{type:"number"},guven:{type:"number"},eylem:{type:"string",enum:acts},gerekce:{type:"string"}})}); }
// modelin cevabını doğrula: bilinmeyen üye, aralık dışı sayı, izinsiz eylem atılır; karar yoksa geçersiz
function lmdParse(j, kind){
  if(!j||typeof j!=="object") return null; const ids=new Set(DESK.map(d=>d.id)); const num=(v,a,b)=>{ const x=+v; return isFinite(x)?clamp(x,a,b):null; };
  const acts=kind==="pozisyon"?LLM_ACT.pozisyon:LLM_ACT.giris; const normAct=a=>{ const s=String(a||"").toLowerCase().replace(/_/g," ").trim(); return acts.find(x=>x===s)||acts.find(x=>s.startsWith(x))||(s==="kar al"?"kâr al":s==="cik"?"çık":s==="giris"||s==="gir"?(acts.includes("gir")?"gir":null):null); };
  const members={}; for(const m of Array.isArray(j.uyeler)?j.uyeler:[]){ if(!m||!ids.has(m.id)) continue; const v=num(m.oy,-1,1), c=num(m.guven,0,1); if(v==null) continue; members[m.id]={v,c:c==null?0.5:c,say:String(m.soz||"").slice(0,240)}; }
  const talk=(Array.isArray(j.tartisma)?j.tartisma:[]).filter(x=>x&&ids.has(x.id)&&x.soz).slice(0,4).map(x=>({id:x.id,to:ids.has(x.kime)?x.kime:null,say:String(x.soz).slice(0,240)}));
  const k=j.karar||{}; const v=num(k.oy,-1,1); if(v==null) return null; const act=normAct(k.eylem)||(kind==="pozisyon"?(v>=0.1?"tut":v<=-0.35?"çık":"azalt"):(v>=0.35?"gir":v<=-0.2?"girme":"bekle"));
  return {members,talk,dec:{v,c:num(k.guven,0,1)??0.5,act,why:String(k.gerekce||"").slice(0,300)}};
}
/* ---------- kuyruk: model tek iş yapar; pozisyonlar (öncelik 0) girişlerden (1) önce, aynı anahtar bir kez ---------- */
function lmdEnqueue(job){ if(lmdReady()) return false; if(lmd.q.some(x=>x.key===job.key)) return false; lmd.q.push(job); lmd.q.sort((a,b)=>a.prio-b.prio); if(lmd.q.length>6) lmd.q.length=6; lmdPump(); return true; }
async function lmdPump(){ if(lmd.busy) return; const job=lmd.q.shift(); if(!job) return; if(lmdReady()){ lmd.q.length=0; return; } lmd.busy=true; lmd.calls.push(Date.now());
  try{ await job.run(); }catch(e){ lmd.err=String(e&&e.message||e); } finally{ lmd.busy=false; setTimeout(lmdPump,0); } }
// bir toplantı: istem → model → doğrulama → kayıt (tahmin defteri) → bildirim
async function lmdMeet(kind, sym, dir, A, com, rv, pos){
  const C=lmdCfg(); const brief=lmdBrief(kind,sym,dir,A,com,rv,pos);
  const r=await lmdCall(lmdSystem(kind),JSON.stringify(brief),lmdSchema(kind),C.maxTokens); lmd.stats.n++;
  if(!r.ok){ lmd.fails++; lmd.err=r.err; if(lmd.fails>=3){ lmd.downUntil=Date.now()+10*60e3; lmd.fails=0; } return {ok:false,err:r.err,ms:r.ms}; }
  lmd.fails=0; lmd.err=null; lmd.stats.ms+=r.ms; lmd.stats.tokIn+=r.tokIn; lmd.stats.tokOut+=r.tokOut;
  const P=lmdParse(r.json,kind); if(!P){ lmd.stats.bad++; return {ok:false,err:"model geçerli JSON döndürmedi",ms:r.ms,text:String(r.text||"").slice(0,300)}; } lmd.stats.ok++;
  const view={t:Date.now(),kind,sym,dir,model:r.model||llm.cfg.model,ms:r.ms,tokIn:r.tokIn,tokOut:r.tokOut,...P,rule:kind==="pozisyon"?{hold:rv&&rv.hold,verdict:rv&&rv.verdict}:{score:com&&com.score,decision:com&&com.decision}};
  lmd.views[kind+"|"+sym+"|"+dir]=view; lmd.last.unshift(view); if(lmd.last.length>12) lmd.last.length=12;
  if(typeof fcNote==='function'){ const v={}; v[kind==="pozisyon"?"llm:pos":"llm"]=P.dec.v; for(const id in P.members) v[(kind==="pozisyon"?"lp:":"l:")+id]=P.members[id].v; fcNote("llm",kind+"|"+(pos&&pos.id||sym)+"|"+dir,sym,dir,A,v,P.dec.v,view.t,{eylem:P.dec.act}); }
  try{ lmd.onView&&lmd.onView(view); }catch(e){}
  return {ok:true,view};
}
// tarama sonrası: eşiğe en yakın adaylar (puan ≥ minScore), coin+yön başına askGapMin dakikada bir
function lmdScanAsk(rows){ const C=lmdCfg(); if(lmdReady()) return 0; const now=Date.now(); let n=0;
  const c=[]; for(const r of rows||[]) for(const d of ["long","short"]){ const x=r.com&&r.com[d]; if(x&&!x.veto&&x.score>=C.minScore&&r._f&&r._s) c.push({r,d,x}); }
  c.sort((a,b)=>b.x.score-a.x.score);
  for(const {r,d,x} of c){ if(n>=C.entryTop) break; const key="giris|"+r.s+"|"+d; if(lmd.asked[key]&&now-lmd.asked[key]<C.askGapMin*6e4) continue; lmd.asked[key]=now;
    if(lmdEnqueue({key,prio:1,run:async()=>{ const A=analyze(r._f,r._s); return lmdMeet("giris",r.s,d,A,x,null,null); }})) n++; }
  return n; }
// açık pozisyon toplantısından sonra: pozisyon başına posEveryMin dakikada bir; sonuç p.lastReview.llm'e yazılır
function lmdPosAsk(p, rv, A, c24){ const C=lmdCfg(); if(lmdReady()) return false; const key="pozisyon|"+p.id; const now=Date.now(); if(lmd.asked[key]&&now-lmd.asked[key]<C.posEveryMin*6e4) return false; lmd.asked[key]=now;
  return lmdEnqueue({key,prio:0,run:async()=>{ const out=await lmdMeet("pozisyon",p.sym,p.dir,A,null,rv,{...posCtx(p,null),id:p.id}); if(out.ok&&p.lastReview) p.lastReview.llm=out.view; return out; }}); }
/* oya giriş: ayarda açık ve tahmin defterinde ≥ minN görüşte becerisi artı (fcMult > 1) → ağırlık fcMult − 1 (en çok 0,4); taze (≤ askGapMin) görüş gerekir */
function lmdWeight(key){ const C=lmdCfg(); if(!C.vote) return 0; const L=(typeof FC!=="undefined"&&FC&&FC.learn)?FC.learn.agents[key]:null; return L&&L.n>=C.minN&&L.m>1?+(L.m-1).toFixed(3):0; }
function lmdVote(sym, dir, kind){ kind=kind||"giris"; const v=lmd.views[kind+"|"+sym+"|"+dir]; if(!v||Date.now()-v.t>lmdCfg().askGapMin*6e4*2) return null; const w=lmdWeight(kind==="pozisyon"?"llm:pos":"llm"); return {v:v.dec.v,c:v.dec.c,act:v.dec.act,w,why:v.dec.why,t:v.t}; }
// okunur döküm (günlük, JSONL, ekran)
function lmdLines(view){ const nm=id=>(DESK.find(d=>d.id===id)||{}).name||id; const out=[]; for(const id of DESK.map(d=>d.id)){ const m=view.members[id]; if(m&&m.say) out.push({id,who:nm(id),text:`${m.say} (${m.v>0?"+":""}${fx(m.v,1)})`}); }
  for(const t of view.talk) out.push({id:t.id,who:nm(t.id),text:(t.to?nm(t.to)+", ":"")+t.say,stage:"itiraz"}); out.push({id:"risk",who:nm("risk"),text:`Karar: ${view.dec.act.toUpperCase()} (oy ${view.dec.v>0?"+":""}${fx(view.dec.v,2)}, güven %${Math.round(view.dec.c*100)}). ${view.dec.why}`,stage:"karar"}); return out; }
