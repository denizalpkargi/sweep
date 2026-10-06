// Açık pozisyon toplantısı (13 üye) ve yerel dil modeli katmanı (src/llm.js) testi. Gerçek model yok: sahte bir Ollama/OpenAI sunucusu ayağa kalkar.
// Çalıştırma: node tests/llm-test.js  (npm test içinde; çıktıda "errors []" beklenir)
const http=require('http'); const {loadEngine}=require('./engine-node.js'); const mock=require('./mock-binance.js');
const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
const mem={}; const localStorage={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{ mem[k]=String(v); },removeItem:k=>{ delete mem[k]; }};
// sahte model: istemi okur, üyeleri sayar, şemaya uygun cevap (ya da senaryoya göre bozuk/yavaş) verir
let mode='good', seen=[];
const reply=(body)=>{ const user=JSON.parse(body.messages[1].content); seen.push({body,user});
  const uyeler=user.uyeler.filter(u=>!u.cekimser).map(u=>({id:u.id,oy:u.oy>0?0.4:-0.3,guven:0.6,soz:`${u.id} verisine göre ${u.oy>0?"destekliyorum":"karşıyım"}`}));
  uyeler.push({id:"hayalet",oy:1,guven:1,soz:"masada olmayan üye"});
  const pos=user.tur==="pozisyon"; const karar={oy:pos?-0.5:0.45,guven:0.7,eylem:pos?"kar_al":"gir",gerekce:"test gerekçesi"};
  const j={uyeler,tartisma:[{id:"macro",kime:"mom",soz:"BTC'ye dikkat"}],karar};
  if(mode==='fence') return "Tabii, işte cevap:\n```json\n"+JSON.stringify(j)+"\n```";
  if(mode==='bad') return "üzgünüm, JSON veremem";
  return JSON.stringify(j); };
const srv=http.createServer((req,res)=>{ let b=''; req.on('data',d=>b+=d); req.on('end',()=>{ const body=JSON.parse(b||'{}');
  if(mode==='down'){ res.writeHead(500); res.end('model yok'); return; }
  const send=()=>{ const text=reply(body); res.writeHead(200,{'Content-Type':'application/json'});
    if(req.url==='/api/chat') res.end(JSON.stringify({message:{role:'assistant',content:text},prompt_eval_count:900,eval_count:300}));
    else res.end(JSON.stringify({choices:[{message:{role:'assistant',content:text}}],usage:{prompt_tokens:900,completion_tokens:300}})); };
  if(mode==='slow') setTimeout(send,400); else send(); }); });
(async()=>{
  await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const port=srv.address().port; const base=`http://127.0.0.1:${port}`;
  const fetchFn=(u,o)=>String(u).startsWith(base)?globalThis.fetch(u,o):mock.fetch(u,o);
  const E=loadEngine({localStorage,fetch:fetchFn});
  // gerçek görünümlü analiz (sahte Binance: süpürme → MSS → OTE)
  const [t24,prem]=await Promise.all([E.j('/fapi/v1/ticker/24hr?symbol=ENAUSDT'),E.j('/fapi/v1/premiumIndex?symbol=ENAUSDT')]); const row=await E.scanOne({t24,prem}); const A=E.analyze(row._f,row._s);
  /* --- 1. açık pozisyon toplantısı: 13 üyenin hepsi pozisyonu görür --- */
  const now=Date.now(); const p={id:"ENAUSDT-1",sym:"ENAUSDT",dir:"long",entry:A.px*0.985,stop:A.px*0.97,stop0:A.px*0.97,t1:A.px*1.01,t2:A.px*1.03,risk0:A.px*0.015,hi:A.px*1.012,lo:A.px*0.98,openT:now-3*3600e3,expiresAt:now+5*3600e3,stage:"open",qty:100,qty0:100};
  const rv=E.positionReview(A,E.posCtx(p,A.px*0.9),[],2,{sym:p.sym});
  ok(rv.views.length===E.DESK.length,'her üyenin pozisyon görüşü yok: '+rv.views.length);
  ok(rv.lines.length===E.DESK.length,'konuşmada 13 satır yok: '+rv.lines.length);
  for(const x of rv.views) ok(['tut','kâr al','stop sık','azalt','çık'].includes(x.act),'geçersiz eylem '+x.id+' '+x.act);
  ok(Math.abs(rv.rNow-1)<0.01,'R yanlış: '+rv.rNow); ok(rv.peakR>=rv.rNow,'en iyi R yanlış');
  ok(Math.abs(rv.held-3)<0.05,'süre yanlış: '+rv.held); ok(isFinite(rv.hold)&&rv.hold>=-1&&rv.hold<=1,'tutma puanı yok');
  ok(['tut','tut, stop sık','azalt','çık'].includes(rv.verdict),'karar: '+rv.verdict);
  // Baran: 1,8R görüp 1R'ye döndü → kâr al
  { const q={...p,hi:A.px*1.012+A.px*0.012}; const r2=E.positionReview(A,E.posCtx(q,null),[],2,{sym:p.sym}); const m=r2.views.find(x=>x.id==="mom"); ok(m.act==="kâr al",'Baran kârı geri verirken kâr al demedi: '+m.act+' peak '+r2.peakR); }
  // Onur: süre dolmak üzere ve kâr yok → azalt
  { const q={...p,entry:A.px,hi:A.px,openT:now-7*3600e3,expiresAt:now+1*3600e3}; const r3=E.positionReview(A,E.posCtx(q,null),[],2,{sym:p.sym}); const o=r3.views.find(x=>x.id==="quant"); ok(o.act==="azalt"&&o.v<0,'Onur süre dolarken azalt demedi: '+o.act); }
  // posAct: kâr al çoğunluğu → lock; zarardayken ekleme yok
  { const fake={verdict:"tut",rNow:1,peakR:1.1,held:1,hold:0.3,score:0.6,takeProfit:true,views:[{id:"mom",v:0.5}]}; ok(E.posAct({stage:"open"},fake,{thr:0.35,medHold:4})==="lock",'kâr al çoğunluğu kilit açmadı');
    const add={...fake,takeProfit:false,rNow:-0.2}; ok(E.posAct({stage:"tp1"},add,{thr:0.35,medHold:4})!=="add",'zarardaki pozisyona ekleme önerildi');
    ok(E.posAct({stage:"open"},{...fake,verdict:"çık"},{thr:0.35,medHold:4})==="exit",'çık kararı çıkış değil'); }
  // tahmin defteri: pozisyon görüşü ayrı tür olarak, saatte bir
  E.fcReset(); ok(E.fcPosNote(p.id,p.sym,p.dir,A,rv,now),'pozisyon görüşü deftere yazılmadı'); ok(!E.fcPosNote(p.id,p.sym,p.dir,A,rv,now+60e3),'saatte bir sınırı yok');
  { const F=E.getFC(); const f=F.pend.find(x=>x.kind==="pos"); ok(f&&f.v["p:masa"]===rv.hold&&Object.keys(f.v).some(k=>k.startsWith("p:")&&k!=="p:masa"),'pozisyon anahtarları yok');
    const L=E.fcLearn([{...f,y:1},{sym:"X",dir:"long",t:now,score:0.4,go:true,v:{trend:0.5},f:{},y:0}]); ok(L.n===1,'pozisyon kaydı giriş istatistiğine karıştı: n='+L.n); ok(L.kinds.pos.n===1&&L.agents["p:masa"],'pozisyon becerisi ölçülmedi'); }
  /* --- 2. dil modeli: kapalıyken hiç çağrı yok --- */
  ok(E.llmReady()==="kapalı",'varsayılan kapalı değil'); ok(!E.llmPosAsk(p,rv,A,2),'kapalıyken kuyruğa girdi'); ok(seen.length===0,'kapalıyken model çağrıldı');
  /* --- 3. Ollama uç noktası: toplantı, doğrulama, kayıt --- */
  E.llmSetCfg({on:true,api:"ollama",base,model:"test:7b",timeoutMs:5000,perHour:50});
  const ping=await E.llmPing(); ok(ping.ok,'ping başarısız: '+ping.err);
  seen=[]; const out=await E.llmMeet("pozisyon",p.sym,p.dir,A,null,rv,{...E.posCtx(p,null),id:p.id});
  ok(out.ok,'toplantı başarısız: '+(out.err||'')); const v=out.view||{members:{},dec:{},talk:[]};
  ok(seen[0]&&seen[0].body.format==="json"&&seen[0].body.options&&seen[0].body.options.num_ctx===4096,'Ollama gövdesi yanlış');
  ok(seen[0]&&seen[0].body.messages[0].content.includes("Kerem")&&seen[0].user.pozisyon&&seen[0].user.kural_masasi.karar===rv.verdict,'istemde karakterler / pozisyon / kural kararı yok');
  ok(seen[0]&&seen[0].body.messages[1].content.length<6000,'istem çok uzun: '+(seen[0]&&seen[0].body.messages[1].content.length));
  ok(!v.members.hayalet,'masada olmayan üye kabul edildi'); ok(Object.keys(v.members).length>=5,'üye görüşleri alınmadı');
  ok(v.dec.act==="kâr al",'eylem normalize edilmedi: '+v.dec.act); ok(v.talk.length===1&&v.talk[0].to==="mom",'tartışma alınmadı');
  ok(E.llmLines(v).length>=3,'döküm boş');
  { const F=E.getFC(); const f=F.pend.find(x=>x.kind==="llm"); ok(f&&f.v["llm:pos"]===-0.5&&Object.keys(f.v).some(k=>k.startsWith("lp:")),'dil modeli görüşü deftere yazılmadı'); }
  /* --- 4. OpenAI uyumlu uç, kod çitli cevap, giriş toplantısı --- */
  E.llmSetCfg({api:"openai",base:base+"/v1"}); mode='fence'; seen=[];
  const com=row.com.long; const o2=await E.llmMeet("giris","ENAUSDT","long",A,com,null,null);
  ok(o2.ok&&o2.view.dec.act==="gir",'kod çitli JSON okunamadı: '+(o2.err||JSON.stringify(o2.view&&o2.view.dec)));
  ok(seen[0]&&seen[0].body.response_format&&seen[0].body.response_format.type==="json_object",'OpenAI gövdesi yanlış');
  /* --- 5. oy: kanıt yokken ağırlık 0; kanıt (≥200 görüş, beceri artı) ve ayar açıkken ağırlık > 0 --- */
  ok(E.llmWeight("llm")===0,'kanıtsız ağırlık'); { const vt=E.llmVote("ENAUSDT","long","giris"); ok(vt&&vt.w===0,'taze görüş okunamadı'); }
  { const D=[]; for(let i=0;i<260;i++){ const y=i%5===0?0:1; D.push({sym:"X",dir:"long",t:now+i,score:0.4,kind:"llm",v:{llm:y?0.6:-0.4},f:{},y}); } E.getFC().learn=E.fcLearn(D); }
  ok(E.llmWeight("llm")===0,'ayar kapalıyken oy verdi'); E.llmSetCfg({vote:true}); ok(E.llmWeight("llm")>0,'kanıtlı ve açıkken ağırlık 0');
  { const c1=E.committee(A,"long",2,{sym:"ENAUSDT"}); ok(c1.talk.some(t=>/Yapay zekâ masası/.test(t.text)),'kanıtlı görüş masada konuşmadı'); }
  E.llmSetCfg({vote:false});
  /* --- 6. bozuk cevap ve çöküş: masa kuralla devam, 3 hatada 10 dk ara, bütçe --- */
  mode='bad'; const o3=await E.llmMeet("giris","ENAUSDT","long",A,com,null,null); ok(!o3.ok&&/JSON/.test(o3.err),'bozuk cevap kabul edildi');
  mode='down'; for(let i=0;i<3;i++) await E.llmMeet("giris","ENAUSDT","long",A,com,null,null); ok(/ulaşılamıyor/.test(E.llmReady()||''),'3 hatadan sonra ara verilmedi: '+E.llmReady());
  { const c2=E.committee(A,"long",2,{sym:"ENAUSDT"}); ok(isFinite(c2.score)&&c2.agents.length===E.DESK.length,'model yokken masa çalışmadı'); }
  E.llm.downUntil=0; mode='slow'; E.llmSetCfg({timeoutMs:100}); const o4=await E.llmMeet("giris","ENAUSDT","long",A,com,null,null); ok(!o4.ok&&o4.err==="zaman aşımı",'zaman aşımı yakalanmadı: '+o4.err);
  E.llm.downUntil=0; E.llm.fails=0; E.llmSetCfg({perHour:2,timeoutMs:5000}); mode='good'; E.llm.calls=[Date.now(),Date.now()]; ok(/bütçe/.test(E.llmReady()||''),'saatlik bütçe çalışmadı');
  /* --- 7. kuyruk: tarama sonrası en iyi aday, coin+yön başına bir kez --- */
  E.llm.calls=[]; E.llmSetCfg({perHour:10,minScore:-1}); seen=[]; const n1=E.llmScanAsk([row]); const n2=E.llmScanAsk([row]); ok(n1===1&&n2===0,'tarama kuyruğu: '+n1+'/'+n2);
  for(let i=0;i<50&&(E.llm.busy||E.llm.q.length);i++) await new Promise(r=>setTimeout(r,20)); ok(seen.length===1&&E.llm.views["giris|ENAUSDT|"+seen[0].user.yon],'kuyruktaki toplantı çalışmadı');
  srv.close(); console.log('llm-test errors',JSON.stringify(errors)); if(errors.length) process.exit(1);
})().catch(e=>{ console.error(e); srv.close(); process.exit(1); });
