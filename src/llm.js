/* ---------- LLM istemcisi (sağlayıcıdan bağımsız, 7 Ekim 2026) ----------
   Tek giriş noktası: llmChat({system, user, schema, maxTokens, think}) → {out (şema verildiyse ayrıştırılmış JSON), text, usage:{in,out,cost}, model, provider}.
   Sağlayıcılar (llm.cfg.provider):
     "ollama"  (varsayılan, ücretsiz, yerel) → http://localhost:11434/api/chat; şema "format" ile zorlanır, bağlam num_ctx ile açılır;
              think:false düşünen modellerde (qwen3) düşünmeyi kapatır (CPU'da yüzlerce düşünme belirteci dakikalar demek).
     "openai"  herhangi bir OpenAI uyumlu yerel sunucu (LM Studio, llama.cpp server, vLLM) → <url>/v1/chat/completions, response_format json_schema.
     "claude"  Anthropic Claude API (ücretli, isteğe bağlı) → api.anthropic.com/v1/messages, output_config.format json_schema.
   Ayarlar localStorage["st-llm"] (anahtar hariç); Claude anahtarı yalnız "hatırla" seçilirse localStorage["st-llm-key"], ekransız botta ANTHROPIC_API_KEY
   (bellekte kalır). Depoya hiçbir anahtar yazılmaz. Masanın yerel LLM üyeleri de bu modülü kullanabilir (tek istemci, tek ayar). */
const LLM_DEF={v:2,on:true,provider:"ollama",url:"http://localhost:11434",model:"qwen3:8b",ctx:8192,temp:0.2,claudeModel:"claude-opus-5-5",effort:"high",timeoutMs:600e3};
const LLM_PRICE={"claude-opus-5-5":{in:4,out:20}};
const llm={cfg:{...LLM_DEF},envKey:null,last:null,err:null,models:null};
// ctx: kullanıcının PC'si (16 GB RAM, ayrık GPU yok, Ollama CPU'da) 8B modelde 32768 bağlamın KV önbelleğini (~5 GB) boş belleğe sığdıramıyor → 8192.
// Ollama'da num_ctx değişince model yeniden yüklenir; masa (llmdesk.js) ve Selim aynı ctx'i kullanır. Eski varsayılanla (32768) kayıtlı ayar taşınır (v2).
try{ const sv=JSON.parse(localStorage.getItem("st-llm")||"null"); if(sv&&typeof sv==="object"){ if(!(sv.v>=2)&&sv.ctx===32768) delete sv.ctx; Object.assign(llm.cfg,sv); llm.cfg.v=2; } }catch(e){}
function llmSave(){ try{ localStorage.setItem("st-llm",JSON.stringify({...llm.cfg,v:2})); }catch(e){} }
function llmKey(){ if(llm.envKey) return llm.envKey; try{ return localStorage.getItem("st-llm-key")||null; }catch(e){ return null; } }
// Claude anahtarı: remember=false → yalnız bu oturumda bellekte
function llmSetKey(k,remember){ k=String(k||"").trim()||null; llm.envKey=k; try{ if(remember&&k) localStorage.setItem("st-llm-key",k); else localStorage.removeItem("st-llm-key"); }catch(e){} }
function llmSetCfg(p){ Object.assign(llm.cfg,p||{}); llmSave(); }
function llmReady(){ const c=llm.cfg; if(!c.on) return false; return c.provider==="claude"?!!llmKey():!!(c.url&&c.model); }
function llmLabel(){ const c=llm.cfg; return c.provider==="claude"?`Claude API · ${c.claudeModel}`:`${c.provider==="ollama"?"Ollama":"yerel sunucu"} · ${c.model}`; }
// yerel modellerin bir kısmı JSON'u ```json ... ``` ya da <think> bloğu içinde döndürür
function llmJson(t){ let s=String(t||"").replace(/<think>[\s\S]*?<\/think>/g,"").trim(); const f=s.match(/```(?:json)?\s*([\s\S]*?)```/); if(f) s=f[1]; const a=s.indexOf("{"), b=s.lastIndexOf("}"); if(a<0||b<a) throw new Error("yanıt JSON değil"); return JSON.parse(s.slice(a,b+1)); }
async function llmFetch(url,opt,what){ let r; const ac=typeof AbortController!=="undefined"?new AbortController():null; const to=ac?setTimeout(()=>ac.abort(),llm.cfg.timeoutMs):null;
  try{ r=await fetch(url,{...opt,signal:ac?ac.signal:undefined}); }catch(e){ throw new Error(`${what} bağlanılamadı (${e.name==="AbortError"?"zaman aşımı":e.message})`); } finally{ if(to) clearTimeout(to); }
  let jj=null; try{ jj=await r.json(); }catch(e){} if(!r.ok){ const m=jj&&(jj.error&&(jj.error.message||jj.error))||""; throw new Error(`${what} HTTP ${r.status}${r.status===401?" (anahtar geçersiz)":""}${m?" · "+String(m).slice(0,160):""}`); } return jj; }
async function llmChat(o){
  const c=llm.cfg; if(!c.on) throw new Error("LLM kapalı"); const sys=o.system||"", user=o.user||""; let text="", usage={in:0,out:0,cost:0}, model=c.model;
  if(c.provider==="claude"){ const key=llmKey(); if(!key) throw new Error("Claude API anahtarı yok");
    // Uygulama tek dosya ve harici paket yok: SDK yerine doğrudan HTTP. Uyumlu modelde reddedilen istek sunucu tarafında yedek modele düşer (fallbacks).
    const body={model:c.claudeModel,max_tokens:o.maxTokens||16000,thinking:{type:"adaptive"},output_config:{effort:c.effort,...(o.schema?{format:{type:"json_schema",schema:o.schema}}:{})},fallbacks:"default",system:sys,messages:[{role:"user",content:user}]};
    const jj=await llmFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-beta":"server-side-fallback-2026-07-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify(body)},"Claude API");
    if(jj.stop_reason==="refusal") throw new Error("model isteği reddetti"); if(jj.stop_reason==="max_tokens") throw new Error("yanıt belirteç sınırında kesildi");
    text=(jj.content||[]).filter(b=>b.type==="text").map(b=>b.text).join(""); model=jj.model||c.claudeModel; const u=jj.usage||{}; const P=LLM_PRICE[c.claudeModel]||LLM_PRICE["claude-opus-5-5"];
    usage={in:u.input_tokens||0,out:u.output_tokens||0,cost:+(((u.input_tokens||0)*P.in+(u.output_tokens||0)*P.out)/1e6).toFixed(4)}; }
  else if(c.provider==="ollama"){ const url=c.url.replace(/\/+$/,"")+"/api/chat";
    const jj=await llmFetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({model:c.model,stream:false,messages:[{role:"system",content:sys},{role:"user",content:user}],...(o.schema?{format:o.schema}:{}),...(o.think!==undefined?{think:!!o.think}:{}),options:{num_ctx:c.ctx,temperature:c.temp,num_predict:o.maxTokens||8000}})},"Ollama ("+c.url+")");
    text=jj.message&&jj.message.content||""; usage={in:jj.prompt_eval_count||0,out:jj.eval_count||0,cost:0}; }
  else { const url=c.url.replace(/\/+$/,"")+"/v1/chat/completions";
    const jj=await llmFetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({model:c.model,temperature:c.temp,max_tokens:o.maxTokens||8000,messages:[{role:"system",content:sys},{role:"user",content:user}],...(o.schema?{response_format:{type:"json_schema",json_schema:{name:o.name||"cikti",schema:o.schema,strict:true}}}:{})})},"Yerel LLM sunucusu ("+c.url+")");
    text=jj.choices&&jj.choices[0]&&jj.choices[0].message&&jj.choices[0].message.content||""; const u=jj.usage||{}; usage={in:u.prompt_tokens||0,out:u.completion_tokens||0,cost:0}; model=jj.model||c.model; }
  const out=o.schema?llmJson(text):null; llm.last={t:Date.now(),model,provider:c.provider,usage}; return {out,text,usage,model,provider:c.provider};
}
// yerel sunucudaki modeller (Ollama /api/tags, OpenAI uyumlu /v1/models); ayar ekranı ve "bağlantıyı sına" için
async function llmModels(){ const c=llm.cfg; if(c.provider==="claude") return [c.claudeModel];
  const u=c.url.replace(/\/+$/,"")+(c.provider==="ollama"?"/api/tags":"/v1/models"); const jj=await llmFetch(u,{method:"GET"},c.provider==="ollama"?"Ollama":"Yerel LLM sunucusu");
  llm.models=c.provider==="ollama"?(jj.models||[]).map(m=>m.name):(jj.data||[]).map(m=>m.id); return llm.models; }
