/* ---------- Yerel dil modeli (LLM) katmanı: masaya "bilinç" (7 Ekim 2026) ----------
   Kural tabanlı üyeler yerinde kalır ve ölçülebilir oylarını üretir (committee.js, positionReview). Bu katman her toplantının verisini ve
   üyelerin kural oylarını yerel bir dil modeline verir; model on üç karakteri kendi uzmanlıklarıyla konuşturur (görüş, itiraz, ikna) ve
   yapılandırılmış bir görüş döndürür: üye başına oy (−1…+1) ve güven, masanın ortak oyu ve eylemi (giriş: gir/bekle/girme; pozisyon:
   tut/kâr al/stop sık/azalt/çık). Bu görüş tahmin defterinde (forecast.js, kind "llm") kural masasından ayrı puanlanır.
   Oy: varsayılan olarak yalnız konuşur ve kayda geçer. Defterde ≥200 sonuçlanmış görüşte becerisi artıysa (fcMult > 1) ve ayarlarda
   "oy" açıksa (fcMult − 1) ağırlıkla puana girer (faktörlerdeki kuralın aynısı). Model yoksa, yavaşsa ya da saçmalarsa masa kuralla devam eder.
   Sağlayıcı: Ollama'nın kendi uç noktası (/api/chat, num_ctx ve keep_alive ayarlanabilir) ya da OpenAI uyumlu /v1/chat/completions
   (LM Studio, llama.cpp sunucusu, vLLM, OpenAI, OpenRouter). Anahtar yalnız bu cihazda (localStorage "st-llm").
   Bütçe: model tek iş yapar (kuyruk sırayla), saatte en çok perHour çağrı, pozisyonlar girişlerden önce. Kullanıcının PC'sinde (Core Ultra 7 155H,
   yalnız CPU) 7B Q4 model istemi ~30 tok/sn okur, ~5–7 tok/sn yazar: bir toplantı (~1200 tok istem, ~350 tok yanıt) ≈ 1,5–2 dk → 15 dk mumda en çok
   ~6 toplantı; varsayılan saatte 12. Gerçek emir yok: model yalnız kâğıt masada konuşur. */
const LLM_DEF={on:false,api:"ollama",base:"http://127.0.0.1:11434",model:"qwen2.5:7b-instruct",key:"",timeoutMs:240000,maxTokens:450,temp:0.4,ctx:4096,keepAlive:"30m",
  perHour:12,entryTop:1,minScore:0.2,askGapMin:30,posEveryMin:30,vote:false,minN:200};
const LLM_KEY="st-llm";
const LLM_ACT={giris:["gir","bekle","girme"],pozisyon:["tut","kâr al","stop sık","azalt","çık"]};
// karakterler: üyenin uzmanlığı ve mizacı (sistem istemi sabit kalır; Ollama aynı öneki önbellekten okur)
const LLM_PERSONA={trend:"günlük yön ve 1 saatlik yapıya bakar; sabırlı, trende karşı işlemi sevmez",liq:"likidite avcısı (ICT): havuz, süpürme, MSS, OTE; manipülasyon görmeden girmez",
  flow:"emir akışı: süpürmede emilim, taker oranı, açık pozisyon (OI); sayılara takıntılı",macro:"BTC rejimi, fonlama ve kalabalık; temkinli",
  quant:"istatistikçi: örnek sayısı, komisyon ve kayma maliyeti, süre; kanıtsız iddiaya şüpheyle bakar",mom:"agresif trader: momentum ve hacim; fırsat kaçırmaktan nefret eder",
  copy:"Binance kopya trader liderlerinin bu coindeki pozisyonlarını izler",lab:"liderlerin geçmiş işlemlerinden çıkan kalıpları test eder",
  audit:"denetçi: kapanmış işlemlerin hatalarıyla karşılaştırır, aynı hatayı tekrar ettirmez",vol:"hacim profili: POC, değer alanı, düşüşte artan hacim",
  check:"kural denetçisi: günlük ve 4 saatlik uyum, kurulum şartları, maliyet",fac:"ölçülmüş faktörler (10 günlük kapanış kırılımı, BTC 200 günlük ortalama)",
  risk:"baş trader: risk, likidasyon, stop; son kararı o verir, veto hakkı var"};
const llm={cfg:null,q:[],busy:false,calls:[],fails:0,downUntil:0,last:[],views:{},asked:{},stats:{n:0,ok:0,bad:0,ms:0,tokIn:0,tokOut:0},err:null,onView:null};
function llmCfg(){ if(!llm.cfg){ let sv=null; try{ sv=JSON.parse(localStorage.getItem(LLM_KEY)||"null"); }catch(e){} llm.cfg={...LLM_DEF,...(sv||{})}; } return llm.cfg; }
function llmSetCfg(o){ llm.cfg={...llmCfg(),...(o||{})}; try{ localStorage.setItem(LLM_KEY,JSON.stringify(llm.cfg)); }catch(e){} return llm.cfg; }
// modelin metninden JSON: kod çiti, baştaki/sondaki açıklama, sondaki virgül
function llmJson(t){ if(!t) return null; let s=String(t).replace(/```(?:json)?/gi,"").trim(); try{ return JSON.parse(s); }catch(e){}
  const a=s.indexOf("{"), b=s.lastIndexOf("}"); if(a<0||b<=a) return null; s=s.slice(a,b+1).replace(/,\s*([}\]])/g,"$1"); try{ return JSON.parse(s); }catch(e){ return null; } }
/* tek çağrı: messages = [{role,content}], o = {json, maxTokens, temp, timeoutMs, model} → {ok, text, json, ms, tokIn, tokOut, err} */
async function llmChat(messages, o){
  o=o||{}; const C=llmCfg(); const base=String(C.base||"").replace(/\/+$/,""); const native=C.api==="ollama"; const t0=Date.now();
  const ctl=typeof AbortController!=="undefined"?new AbortController():null; const to=setTimeout(()=>{ try{ ctl&&ctl.abort(); }catch(e){} },o.timeoutMs||C.timeoutMs);
  try{ const h={"Content-Type":"application/json"}; if(C.key) h.Authorization="Bearer "+C.key; const model=o.model||C.model; const temp=o.temp!=null?o.temp:C.temp, max=o.maxTokens||C.maxTokens;
    const url=native?base+"/api/chat":base.replace(/\/v1$/,"")+"/v1/chat/completions";
    const body=native?{model,messages,stream:false,keep_alive:C.keepAlive,options:{temperature:temp,num_predict:max,num_ctx:C.ctx}}:{model,messages,temperature:temp,max_tokens:max,stream:false};
    if(o.json){ if(native) body.format="json"; else body.response_format={type:"json_object"}; }
    const r=await fetch(url,{method:"POST",headers:h,body:JSON.stringify(body),signal:ctl?ctl.signal:undefined}); const ms=Date.now()-t0;
    if(!r.ok){ let tx=""; try{ tx=(await r.text()).slice(0,200); }catch(e){} return {ok:false,ms,err:`HTTP ${r.status}${tx?" · "+tx:""}`}; }
    const d=await r.json(); const text=native?String(d&&d.message&&d.message.content||""):String(d&&d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content||"");
    const tokIn=native?(d.prompt_eval_count||0):((d.usage&&d.usage.prompt_tokens)||0), tokOut=native?(d.eval_count||0):((d.usage&&d.usage.completion_tokens)||0);
    return {ok:true,ms,text,json:o.json?llmJson(text):null,tokIn,tokOut}; }
  catch(e){ return {ok:false,ms:Date.now()-t0,err:e&&e.name==="AbortError"?"zaman aşımı":String(e&&e.message||e)}; }
  finally{ clearTimeout(to); }
}
// sağlık: model yüklü mü, ne kadar sürede cevap veriyor
async function llmPing(){ const r=await llmChat([{role:"user",content:"Tek kelimeyle cevap ver: hazır mısın?"}],{maxTokens:8,timeoutMs:Math.max(60000,llmCfg().timeoutMs/2)}); llm.err=r.ok?null:r.err; return r; }
// bütçe: kapalı, ulaşılamıyor (3 hatadan sonra 10 dk ara), saatlik sınır
function llmReady(){ const C=llmCfg(); if(!C.on) return "kapalı"; if(Date.now()<llm.downUntil) return "ulaşılamıyor ("+(llm.err||"hata")+"), "+Math.ceil((llm.downUntil-Date.now())/60e3)+" dk sonra yeniden"; const h=Date.now()-36e5; llm.calls=llm.calls.filter(t=>t>h); if(llm.calls.length>=C.perHour) return `saatlik bütçe doldu (${C.perHour})`; return null; }
/* ---------- toplantı istemi ---------- */
const r3=v=>isFinite(v)?Math.round(v*1000)/1000:null;
function llmSystem(kind){
  const who=DESK.map(d=>`${d.id} = ${d.name} (${d.role}): ${LLM_PERSONA[d.id]||""}`).join("\n");
  return `Bir kripto vadeli işlem masasının toplantısını yürütüyorsun. Masada on üç kişi var, hepsi erkek; her biri yalnız kendi uzmanlığına bakar ve kendi mizacıyla konuşur:
${who}
Sana JSON olarak piyasa verisi ve her üyenin kural tabanlı ölçümü (oy −1…+1, güven 0…1, not) verilir. "cekimser": true olan üyenin verisi yoktur; konuşturma.
Görev: her üye veriyi kendi gözüyle yorumlar (en çok 20 kelime), en güçlü iki itiraz söylenir, sonra Can masanın ortak kararını verir.
Kurallar: yalnız verilen sayılara dayan, sayı uydurma; kural oyundan farklı düşünebilirsin ama gerekçesini söyle; oy masanın gerçekten ne düşündüğü olsun, kural oyunun kopyası değil.
Türkçe yaz. Yalnız JSON döndür, başka metin yok. Şema:
{"uyeler":[{"id":"trend","oy":0.3,"guven":0.6,"soz":"..."}],"tartisma":[{"id":"macro","kime":"mom","soz":"..."}],"karar":{"oy":0.1,"guven":0.5,"eylem":"...","gerekce":"..."}}
"oy": ${kind==="pozisyon"?"pozisyonu tutmaya destek (+1 kesin tut, −1 hemen çık)":"bu yönde işleme destek (+1 kesin gir, −1 kesin karşı)"}. "eylem": ${(kind==="pozisyon"?LLM_ACT.pozisyon:LLM_ACT.giris).map(x=>'"'+x+'"').join(" | ")}.`;
}
// toplantının verisi: kısa anahtarlar, yuvarlanmış sayılar (istem ~1000–1300 token)
function llmBrief(kind, sym, dir, A, com, rv, pos){
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
// modelin cevabını doğrula: bilinmeyen üye, aralık dışı sayı, izinsiz eylem atılır; karar yoksa geçersiz
function llmParse(j, kind){
  if(!j||typeof j!=="object") return null; const ids=new Set(DESK.map(d=>d.id)); const num=(v,a,b)=>{ const x=+v; return isFinite(x)?clamp(x,a,b):null; };
  const acts=kind==="pozisyon"?LLM_ACT.pozisyon:LLM_ACT.giris; const normAct=a=>{ const s=String(a||"").toLowerCase().replace(/_/g," ").trim(); return acts.find(x=>x===s)||acts.find(x=>s.startsWith(x))||(s==="kar al"?"kâr al":s==="cik"?"çık":s==="giris"||s==="gir"?(acts.includes("gir")?"gir":null):null); };
  const members={}; for(const m of Array.isArray(j.uyeler)?j.uyeler:[]){ if(!m||!ids.has(m.id)) continue; const v=num(m.oy,-1,1), c=num(m.guven,0,1); if(v==null) continue; members[m.id]={v,c:c==null?0.5:c,say:String(m.soz||"").slice(0,240)}; }
  const talk=(Array.isArray(j.tartisma)?j.tartisma:[]).filter(x=>x&&ids.has(x.id)&&x.soz).slice(0,4).map(x=>({id:x.id,to:ids.has(x.kime)?x.kime:null,say:String(x.soz).slice(0,240)}));
  const k=j.karar||{}; const v=num(k.oy,-1,1); if(v==null) return null; const act=normAct(k.eylem)||(kind==="pozisyon"?(v>=0.1?"tut":v<=-0.35?"çık":"azalt"):(v>=0.35?"gir":v<=-0.2?"girme":"bekle"));
  return {members,talk,dec:{v,c:num(k.guven,0,1)??0.5,act,why:String(k.gerekce||"").slice(0,300)}};
}
/* ---------- kuyruk: model tek iş yapar; pozisyonlar (öncelik 0) girişlerden (1) önce, aynı anahtar bir kez ---------- */
function llmEnqueue(job){ if(llmReady()) return false; if(llm.q.some(x=>x.key===job.key)) return false; llm.q.push(job); llm.q.sort((a,b)=>a.prio-b.prio); if(llm.q.length>6) llm.q.length=6; llmPump(); return true; }
async function llmPump(){ if(llm.busy) return; const job=llm.q.shift(); if(!job) return; if(llmReady()){ llm.q.length=0; return; } llm.busy=true; llm.calls.push(Date.now());
  try{ await job.run(); }catch(e){ llm.err=String(e&&e.message||e); } finally{ llm.busy=false; setTimeout(llmPump,0); } }
// bir toplantı: istem → model → doğrulama → kayıt (tahmin defteri) → bildirim
async function llmMeet(kind, sym, dir, A, com, rv, pos){
  const C=llmCfg(); const brief=llmBrief(kind,sym,dir,A,com,rv,pos);
  const r=await llmChat([{role:"system",content:llmSystem(kind)},{role:"user",content:JSON.stringify(brief)}],{json:true}); llm.stats.n++;
  if(!r.ok){ llm.fails++; llm.err=r.err; if(llm.fails>=3){ llm.downUntil=Date.now()+10*60e3; llm.fails=0; } return {ok:false,err:r.err,ms:r.ms}; }
  llm.fails=0; llm.err=null; llm.stats.ms+=r.ms; llm.stats.tokIn+=r.tokIn; llm.stats.tokOut+=r.tokOut;
  const P=llmParse(r.json,kind); if(!P){ llm.stats.bad++; return {ok:false,err:"model geçerli JSON döndürmedi",ms:r.ms,text:r.text.slice(0,300)}; } llm.stats.ok++;
  const view={t:Date.now(),kind,sym,dir,model:C.model,ms:r.ms,tokIn:r.tokIn,tokOut:r.tokOut,...P,rule:kind==="pozisyon"?{hold:rv&&rv.hold,verdict:rv&&rv.verdict}:{score:com&&com.score,decision:com&&com.decision}};
  llm.views[kind+"|"+sym+"|"+dir]=view; llm.last.unshift(view); if(llm.last.length>12) llm.last.length=12;
  if(typeof fcNote==='function'){ const v={}; v[kind==="pozisyon"?"llm:pos":"llm"]=P.dec.v; for(const id in P.members) v[(kind==="pozisyon"?"lp:":"l:")+id]=P.members[id].v; fcNote("llm",kind+"|"+(pos&&pos.id||sym)+"|"+dir,sym,dir,A,v,P.dec.v,view.t,{eylem:P.dec.act}); }
  try{ llm.onView&&llm.onView(view); }catch(e){}
  return {ok:true,view};
}
// tarama sonrası: eşiğe en yakın adaylar (puan ≥ minScore), coin+yön başına askGapMin dakikada bir
function llmScanAsk(rows){ const C=llmCfg(); if(llmReady()) return 0; const now=Date.now(); let n=0;
  const c=[]; for(const r of rows||[]) for(const d of ["long","short"]){ const x=r.com&&r.com[d]; if(x&&!x.veto&&x.score>=C.minScore&&r._f&&r._s) c.push({r,d,x}); }
  c.sort((a,b)=>b.x.score-a.x.score);
  for(const {r,d,x} of c){ if(n>=C.entryTop) break; const key="giris|"+r.s+"|"+d; if(llm.asked[key]&&now-llm.asked[key]<C.askGapMin*6e4) continue; llm.asked[key]=now;
    if(llmEnqueue({key,prio:1,run:async()=>{ const A=analyze(r._f,r._s); return llmMeet("giris",r.s,d,A,x,null,null); }})) n++; }
  return n; }
// açık pozisyon toplantısından sonra: pozisyon başına posEveryMin dakikada bir; sonuç p.lastReview.llm'e yazılır
function llmPosAsk(p, rv, A, c24){ const C=llmCfg(); if(llmReady()) return false; const key="pozisyon|"+p.id; const now=Date.now(); if(llm.asked[key]&&now-llm.asked[key]<C.posEveryMin*6e4) return false; llm.asked[key]=now;
  return llmEnqueue({key,prio:0,run:async()=>{ const out=await llmMeet("pozisyon",p.sym,p.dir,A,null,rv,{...posCtx(p,null),id:p.id}); if(out.ok&&p.lastReview) p.lastReview.llm=out.view; return out; }}); }
/* oya giriş: ayarda açık ve tahmin defterinde ≥ minN görüşte becerisi artı (fcMult > 1) → ağırlık fcMult − 1 (en çok 0,4); taze (≤ askGapMin) görüş gerekir */
function llmWeight(key){ const C=llmCfg(); if(!C.vote) return 0; const L=(typeof FC!=="undefined"&&FC&&FC.learn)?FC.learn.agents[key]:null; return L&&L.n>=C.minN&&L.m>1?+(L.m-1).toFixed(3):0; }
function llmVote(sym, dir, kind){ kind=kind||"giris"; const v=llm.views[kind+"|"+sym+"|"+dir]; if(!v||Date.now()-v.t>llmCfg().askGapMin*6e4*2) return null; const w=llmWeight(kind==="pozisyon"?"llm:pos":"llm"); return {v:v.dec.v,c:v.dec.c,act:v.dec.act,w,why:v.dec.why,t:v.t}; }
// okunur döküm (günlük, JSONL, ekran)
function llmLines(view){ const nm=id=>(DESK.find(d=>d.id===id)||{}).name||id; const out=[]; for(const id of DESK.map(d=>d.id)){ const m=view.members[id]; if(m&&m.say) out.push({id,who:nm(id),text:`${m.say} (${m.v>0?"+":""}${fx(m.v,1)})`}); }
  for(const t of view.talk) out.push({id:t.id,who:nm(t.id),text:(t.to?nm(t.to)+", ":"")+t.say,stage:"itiraz"}); out.push({id:"risk",who:nm("risk"),text:`Karar: ${view.dec.act.toUpperCase()} (oy ${view.dec.v>0?"+":""}${fx(view.dec.v,2)}, güven %${Math.round(view.dec.c*100)}). ${view.dec.why}`,stage:"karar"}); return out; }
