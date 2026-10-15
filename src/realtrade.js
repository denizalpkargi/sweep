/* ---------- Gerçek hesap: kâğıt masanın pozisyonlarını Binance'e yansıtır (15 Ekim 2026) ----------
   Karar yine kâğıt botta (bot.positions). Bu katman 5 sn'de bir uzlaştırır: masa yeni pozisyon açtıysa gerçek hesapta da açar
   (boyut, kaldıraç, stop ana süreçte, electron/trade.js), masa kısmi kâr aldıysa aynı oranda azaltır, stopu taşıdıysa borsadaki stopu taşır,
   masa kapattıysa kapatır. Yalnız katman açıldıktan sonra açılan ve 3 dk'dan taze pozisyonlar kopyalanır; eklemeler kopyalanmaz.
   Mod trade.json'dadır (kapali / kuru / canli); sayfa modu değiştiremez. Web sürümünde (window.sweepTrade yok) hiçbir şey yapmaz. */
const rt={st:null,busy:false,err:null,lv:(()=>{ try{ return JSON.parse(localStorage.getItem("st-live"))||null; }catch(e){ return null; } })()||{mode:"kapali",since:0,map:{}}};
function rtSave(){ try{ localStorage.setItem("st-live",JSON.stringify(rt.lv)); }catch(e){} }
const RT_FRESH=180e3;
// saf uzlaştırma: kâğıt pozisyonlar + gerçek görüntü → yapılacaklar (test edilebilir)
function rtPlan(lv,paper,st,now,botOn){
  const acts=[], real={}; for(const p of st.pos||[]) real[p.sym]=p;
  for(const [sym,m] of Object.entries(lv.map)){
    const p=paper.find(x=>x.sym===sym&&x.openT===m.openT);
    if(!p){ if(!m.skip&&!m.done&&real[sym]) acts.push({k:"close",sym,why:"masa kapattı"}); acts.push({k:"forget",sym}); }
  }
  for(const p of paper){
    const m=lv.map[p.sym]; const live=m&&m.openT===p.openT;
    if(!live){ if(botOn&&p.openT>=lv.since&&now-p.openT<RT_FRESH) acts.push({k:"open",sym:p.sym,dir:p.dir,stop:p.stop,openT:p.openT}); else acts.push({k:"skip",sym:p.sym,openT:p.openT,why:p.openT<lv.since?"katman açılmadan önce açılmış":"taze değil"}); continue; }
    if(m.skip||m.done) continue;
    const r=real[p.sym]; if(!r){ acts.push({k:"gone",sym:p.sym}); continue; }
    const frac=p.qty0>0?Math.max(0,Math.min(1,p.qty/p.qty0)):1, target=m.q0*frac;
    if(r.qty-target>m.q0*0.05) acts.push({k:"reduce",sym:p.sym,qty:r.qty-target,why:"masa %"+Math.round((1-frac)*100)+" kapattı"});
    if(p.stop>0&&Math.abs(p.stop-m.stop)/p.stop>5e-4) acts.push({k:"stop",sym:p.sym,stop:p.stop});
  }
  return acts;
}
async function rtTick(){
  const T=window.sweepTrade; if(!T||rt.busy) return; rt.busy=true;
  try{
    const st=await T.state(); rt.st=st; rt.err=st&&st.err||null;
    if(!st||st.mode==="kapali"){ if(rt.lv.mode!=="kapali"){ rt.lv={mode:"kapali",since:0,map:{}}; rtSave(); } return; }
    if(rt.lv.mode!==st.mode){ rt.lv={mode:st.mode,since:Date.now(),map:{}}; rtSave(); }
    if(st.killed) return;
    const acts=rtPlan(rt.lv,bot.positions,st,Date.now(),bot.on); const M=rt.lv.map, tag=st.mode==="canli"?"GERÇEK":"KURU";
    for(const a of acts){
      if(a.k==="forget"){ delete M[a.sym]; continue; }
      if(a.k==="skip"){ M[a.sym]={openT:a.openT,skip:true,why:a.why}; continue; }
      if(a.k==="gone"){ M[a.sym].done=true; botLog("sys",a.sym,`${tag}: pozisyon borsada kapanmış (stop ya da elle).`); continue; }
      if(a.k==="open"){ const r=await T.open({sym:a.sym,dir:a.dir,stop:a.stop});
        M[a.sym]=r&&r.ok?{openT:a.openT,dir:a.dir,q0:r.qty,stop:r.stop}:{openT:a.openT,skip:true,why:r&&r.err||"?"};
        botLog(r&&r.ok?"fill":"skip",a.sym,r&&r.ok?`${tag}: ${a.dir==="long"?"LONG":"SHORT"} ${r.qty} @ ${fmtP(r.avg)} · stop ${fmtP(r.stop)} · risk ≈ ${fmtB(r.riskUsd)} · ${r.lev}x izole.`:`${tag}: açılmadı (${r&&r.err||"?"}).`);
        if(r&&r.ok) toast(`<b>${tag}</b> ${a.sym.replace("USDT","")} ${a.dir==="long"?"long":"short"} açıldı`); continue; }
      if(a.k==="reduce"){ const r=await T.reduce({sym:a.sym,qty:a.qty,why:a.why}); botLog(r&&r.ok?"tp1":"skip",a.sym,`${tag}: ${r&&r.ok?"azaltıldı "+r.qty:"azaltılamadı ("+(r&&r.err)+")"} · ${a.why}.`); continue; }
      if(a.k==="stop"){ const r=await T.setStop({sym:a.sym,stop:a.stop}); if(r&&r.ok){ M[a.sym].stop=a.stop; if(r.closed) M[a.sym].done=true; botLog("move",a.sym,`${tag}: borsadaki stop ${fmtP(r.stop||a.stop)}.`); } else botLog("skip",a.sym,`${tag}: stop taşınamadı (${r&&r.err}).`); continue; }
      if(a.k==="close"){ const r=await T.close({sym:a.sym,why:a.why}); botLog(r&&r.ok?"close":"skip",a.sym,`${tag}: ${r&&r.ok?"kapatıldı":"kapatılamadı ("+(r&&r.err)+")"} · ${a.why}.`); continue; }
    }
    rtSave();
  }catch(e){ rt.err=e.message; }
  finally{ rt.busy=false; }
}
function rtHtml(){
  if(!window.sweepTrade) return "";
  const s=rt.st; const mode=s?s.mode:"…"; const c=s&&s.caps||{};
  const badge={kapali:'<span class="muted">● kapalı</span>',kuru:'<span class="warn">● kuru çalışma (emir yok)</span>',canli:'<span class="down">● CANLI · gerçek emir</span>'}[mode]||mode;
  const pos=(s&&s.pos||[]).map(p=>`<tr><td><b>${p.sym.replace("USDT","")}</b> ${chip(p.dir==="long"?"up sm":"down sm",p.dir==="long"?"L":"S")}</td><td class="num">${p.qty}</td><td class="num">${fmtP(p.entry)}</td><td class="num">${fmtP(p.mark)}</td><td class="num down">${p.stop?fmtP(p.stop):'<span class="down">yok</span>'}</td><td class="num">${p.liq?fmtP(p.liq):"—"}</td><td class="num ${p.upnl>=0?"up":"down"}">${p.upnl>=0?"+":""}${fx(p.upnl,2)} $</td></tr>`).join("");
  const ev=(s&&s.events||[]).slice(0,8).map(e=>`<div class="muted" style="font-size:11.5px">${new Date(e.t).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})} · <span class="${e.kind==="error"?"down":e.kind==="warn"?"warn":""}">${esc(e.txt)}</span></div>`).join("");
  const ck=s&&s.checks; const warn=[s&&s.killed?`<b class="down">Acil durdurma açık</b> (${esc(s.killed.why)}). Yeni emir gitmez.`:"",s&&s.block?`<b class="warn">${esc(s.block)}</b>: bugün yeni giriş yok.`:"",mode==="canli"&&ck&&!ck.ok?`<b class="down">Canlı denetim geçmedi:</b> ${esc(ck.why.join("; "))}`:"",s&&s.err?`<span class="down">${esc(s.err)}</span>`:"",s&&s.cool?`Binance bekleme süresi ${new Date(s.cool).toLocaleTimeString("tr-TR")}'e kadar.`:""].filter(Boolean).map(x=>`<div style="font-size:12px;margin:4px 0">${x}</div>`).join("");
  return `<details class="card" style="margin-bottom:10px;padding:10px" ${mode!=="kapali"?"open":""}><summary style="cursor:pointer"><b>Gerçek hesap</b> <span class="muted" style="font-size:12px">· masanın işlemlerini Binance'e yansıtır · ${badge}</span></summary>
  <p class="muted" style="font-size:12px;margin:6px 0">Mod ve sınırlar <code>%APPDATA%\\SWEEP\\trade.json</code> dosyasında (sayfadan değiştirilemez). Masa yeni pozisyon açınca burada da açılır: boyut özkaynağın en çok ${fmtB(c.maxUsd)}'ı üzerinden, işlem başı %${fx((c.riskPct||0)*100,1)} risk, ${c.maxLev}x izole, en çok ${c.maxPos} pozisyon; stop borsaya hemen yazılır (yazılamazsa pozisyon kapanır). Kısmi kâr, stop taşıma ve kapanış masayı izler; eklemeler kopyalanmaz. Gün başından %${fx((c.dayLossPct||0)*100,1)} düşüşte o gün yeni giriş yok; özkaynak ${fmtB(c.floorUsd)} altına inerse her şey kapanır. Acil durdurma: düğme ya da <code>%APPDATA%\\SWEEP\\DUR</code> dosyası.</p>
  ${warn}
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:8px 0"><button type="button" id="rtKill" style="background:var(--short);color:#fff;border-color:transparent" ${mode==="kapali"?"disabled":""}>ACİL DURDUR · hepsini kapat</button>${s&&s.killed?'<button type="button" class="ghost" id="rtRearm">Yeniden kur</button>':""}
    <span class="muted" style="font-size:11.5px">${s&&s.eq!=null?`özkaynak ${fmtB(s.eq)} · kullanılabilir ${fmtB(s.avail)}${s.day0?` · gün başı ${fmtB(s.day0)}`:""}`:mode==="kapali"?"Kapalı: trade.json'da \"mode\": \"kuru\" ile emirsiz deneme başlar.":""}${mode==="canli"&&!(s&&s.hasKey)?' · <span class="down">anahtar yok</span>':""}</span></div>
  ${pos?`<table class="t" style="margin-bottom:8px"><thead><tr><th>Coin</th><th>Miktar</th><th>Giriş</th><th>Mark</th><th>Stop</th><th>Likid.</th><th>PnL</th></tr></thead><tbody>${pos}</tbody></table>`:""}${ev}</details>`;
}
function rtBind(){
  const k=$("rtKill"); if(k) k.addEventListener("click",async()=>{ if(!confirm("Bütün gerçek emirler iptal edilip bütün pozisyonlar market fiyatla kapatılsın mı?")) return; const r=await window.sweepTrade.kill({why:"arayüzden"}); toast(r&&r.ok?"Acil durdurma: pozisyonlar kapatıldı.":"Acil durdurma hatası: "+esc(r&&r.err||"")); await rtTick(); renderBot(); });
  const a=$("rtRearm"); if(a) a.addEventListener("click",async()=>{ if(!confirm("Acil durdurma kaldırılsın mı? Masa yeni işlem açınca gerçek hesapta da açılır.")) return; await window.sweepTrade.rearm(); await rtTick(); renderBot(); });
}
if(typeof window!=="undefined"&&window.sweepTrade){ setTimeout(rtTick,15e3); setInterval(rtTick,5e3); }
