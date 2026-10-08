/* Canlı panel: telefondan bakılan salt okunur bot sayfası (8 Ekim 2026, kullanıcı "uzaktan anlık bot performansı").
   - 127.0.0.1:8787'de küçük HTTP sunucusu; yalnız gizli yol (/<32 hex>) cevap verir, gerisi 404.
   - Veri sayfadan (ui.js window.sweepLive) okunur: bakiye, pozisyonlar, son işlemler, 24 sa eğri. Emir, ayar, anahtar yok; yalnız GET.
   - cloudflared kuruluysa "quick tunnel" açılır (https://<rastgele>.trycloudflare.com); adres her açılışta değişir,
     %APPDATA%/SWEEP/logs/live-url.txt dosyasına ve günlüğe yazılır. Gizli anahtar %APPDATA%/SWEEP/live.json'da kalır. */
const http=require('http'), crypto=require('crypto'), fs=require('fs'), path=require('path'), {spawn}=require('child_process');
const PORT=8787;

module.exports=function startLive({app,getWin,log,logErr}){
  const ud=app.getPath('userData'), cfgF=path.join(ud,'live.json'), urlF=path.join(ud,'logs','live-url.txt');
  let cfg={}; try{ cfg=JSON.parse(fs.readFileSync(cfgF,'utf8'))||{}; }catch(e){}
  if(!/^[0-9a-f]{32}$/.test(cfg.secret||'')){ cfg.secret=crypto.randomBytes(16).toString('hex'); try{ fs.writeFileSync(cfgF,JSON.stringify(cfg)); }catch(e){ logErr('live.json',e); } }
  if(cfg.off){ log('canlı panel kapalı (live.json off)'); return {stop(){}}; }
  const base='/'+cfg.secret;

  let cache=null, cacheT=0;
  async function snapshot(){
    if(cache&&Date.now()-cacheT<1500) return cache;
    const w=getWin(); if(!w||w.isDestroyed()) return null;
    const js='(()=>{ try{ return window.sweepLive?JSON.stringify(window.sweepLive()):null; }catch(e){ return JSON.stringify({err:String(e&&e.message||e)}); } })()';
    let out=await Promise.race([w.webContents.executeJavaScript(js,true),new Promise(r=>setTimeout(()=>r(null),4000))]).catch(()=>null);
    if(out&&typeof out!=='string') out=JSON.stringify(out);
    if(out){ cache=out; cacheT=Date.now(); } return out;
  }
  const srv=http.createServer(async(req,res)=>{ try{
    const u=(req.url||'').split('?')[0];
    const send=(code,type,body)=>{ res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer'}); res.end(body); };
    if(req.method!=='GET') return send(405,'text/plain','');
    if(u===base||u===base+'/') return send(200,'text/html; charset=utf-8',PAGE);
    if(u===base+'/api'){ const s=await snapshot(); return s?send(200,'application/json',s):send(503,'application/json','{"err":"SWEEP sayfası yanıt vermiyor"}'); }
    return send(404,'text/plain','');
  }catch(e){ logErr('canlı panel',e); try{ res.writeHead(500); res.end(); }catch(_){} } });
  srv.on('error',e=>logErr('canlı panel sunucusu',e));
  srv.listen(PORT,'127.0.0.1',()=>log('canlı panel: http://127.0.0.1:'+PORT+'/<gizli>'));

  // cloudflared quick tunnel
  let cf=null, stopped=false, wait=30e3;
  const exe=()=>{ const c=[path.join(ud,'cloudflared.exe'),'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe','C:\\Program Files\\cloudflared\\cloudflared.exe'];
    try{ const la=process.env.LOCALAPPDATA; if(la) c.push(path.join(la,'Microsoft','WinGet','Links','cloudflared.exe')); }catch(e){}
    for(const p of c) try{ if(fs.existsSync(p)) return p; }catch(e){}
    return process.platform==='win32'?null:'cloudflared'; };
  function tunnel(){
    if(stopped) return; const bin=exe(); if(!bin){ log('canlı panel: cloudflared bulunamadı, yalnız yerelde açık'); try{ fs.writeFileSync(urlF,'cloudflared yok\n'); }catch(e){} return; }
    let found=false;
    try{ cf=spawn(bin,['tunnel','--no-autoupdate','--url','http://127.0.0.1:'+PORT],{windowsHide:true,stdio:['ignore','pipe','pipe']}); }catch(e){ logErr('cloudflared',e); return; }
    const scan=b=>{ const m=String(b).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/); if(m&&!found){ found=true; wait=30e3; const url=m[0]+base; log('canlı panel adresi hazır (live-url.txt)'); try{ fs.mkdirSync(path.dirname(urlF),{recursive:true}); fs.writeFileSync(urlF,url+'\n'+new Date().toISOString()+'\n'); }catch(e){} } };
    cf.stdout.on('data',scan); cf.stderr.on('data',scan);
    cf.on('error',e=>logErr('cloudflared',e));
    cf.on('exit',code=>{ cf=null; if(stopped) return; log('cloudflared kapandı (',code,'); '+Math.round(wait/1e3)+' sn sonra yeniden'); try{ fs.writeFileSync(urlF,'tünel kapalı, yeniden deneniyor\n'); }catch(e){} setTimeout(tunnel,wait); wait=Math.min(wait*2,10*60e3); });
  }
  setTimeout(tunnel,5e3);
  return {stop(){ stopped=true; try{ cf&&cf.kill(); }catch(e){} try{ srv.close(); }catch(e){} }};
};

const PAGE=`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>SWEEP canlı</title><style>
:root{--bg:#0b0f14;--card:#121821;--ink:#e6edf3;--ink2:#8b98a5;--line:#1f2a36;--up:#2ecc71;--down:#ff5c5c;--acc:#4da3ff}
@media (prefers-color-scheme:light){:root{--bg:#f5f7fa;--card:#fff;--ink:#14202b;--ink2:#5b6b7a;--line:#e3e8ee;--up:#14883e;--down:#d0312d;--acc:#1d6fd6}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:12px 16px 40px}
h1{font-size:16px;margin:0 0 2px}small,.mut{color:var(--ink2)}.row{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0}
.k{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px}.k b{display:block;font-size:11px;color:var(--ink2);font-weight:500}.k span{font-size:20px;font-variant-numeric:tabular-nums}
.up{color:var(--up)}.down{color:var(--down)}section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px;margin:10px 0}
h2{font-size:13px;margin:0 0 6px;color:var(--ink2);font-weight:600}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}td{padding:6px 2px;border-top:1px solid var(--line);vertical-align:top}
tr:first-child td{border-top:0}.r{text-align:right;white-space:nowrap}.tag{font-size:11px;padding:1px 5px;border-radius:4px;border:1px solid var(--line)}svg{width:100%;height:70px;display:block}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}.log{font-size:12px;color:var(--ink2)}.log div{padding:3px 0;border-top:1px solid var(--line)}
</style></head><body>
<h1>SWEEP · canlı</h1><div class="mut" id="st">yükleniyor…</div>
<div class="row"><div class="k"><b>Bakiye</b><span id="bal">—</span></div><div class="k"><b>Özkaynak</b><span id="eq">—</span></div>
<div class="k"><b>Son 24 sa</b><span id="d24">—</span></div><div class="k"><b>Bugün</b><span id="day">—</span></div></div>
<section><h2>Özkaynak · 24 sa</h2><svg id="cv" viewBox="0 0 300 70" preserveAspectRatio="none"></svg></section>
<section><h2 id="ph">Açık pozisyonlar</h2><table id="pos"></table></section>
<section><h2>Son kapananlar</h2><table id="cl"></table></section>
<section><h2>Son olaylar</h2><div class="log" id="lg"></div></section>
<script>
const $=id=>document.getElementById(id), f=(v,d=2)=>v==null?"—":Number(v).toLocaleString("tr-TR",{minimumFractionDigits:d,maximumFractionDigits:d});
const sg=v=>v==null?"":(v>0?"up":v<0?"down":""), pm=(v,d=2)=>v==null?"—":(v>0?"+":"")+f(v,d), esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const hm=t=>new Date(t).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}), age=m=>m>=60?Math.floor(m/60)+" sa "+(m%60)+" dk":m+" dk";
const px=v=>v==null?"—":Number(v).toLocaleString("tr-TR",{maximumSignificantDigits:6});
let last=0;
async function tick(){ try{ const r=await fetch("api",{cache:"no-store"}); const d=await r.json(); if(d.err) throw new Error(d.err); last=Date.now(); draw(d); }
  catch(e){ $("st").innerHTML='<span class="down">bağlantı yok</span> · '+esc(e.message||e)+(last?" · son veri "+hm(last):""); } }
function draw(d){
  $("st").innerHTML='<span class="dot" style="background:'+(d.on?"var(--up)":"var(--down)")+'"></span>'+(d.on?"bot açık":"bot kapalı")+" · "+hm(d.t)+" · mod "+esc(d.goalMode||"—")+(d.aggr?" · agresif":"")+" · tarama "+(d.scanMin!=null?d.scanMin+" dk önce":"—")+" · veri "+(d.feed&&d.feed.ok?"canlı":'<span class="down">kesik</span>');
  $("bal").textContent=f(d.bal)+" $"; $("eq").innerHTML='<span class="'+sg(d.eq-d.bal)+'">'+f(d.eq)+" $</span>";
  $("d24").innerHTML='<span class="'+sg(d.d24.pnl)+'">'+pm(d.d24.pnl)+" $</span> <small>"+d.d24.n+" işlem · "+d.d24.win+" kazanç · "+pm(d.d24.R)+"R</small>";
  $("day").innerHTML=(d.day?d.day.opens:0)+' <small>giriş · '+(d.day?d.day.losses:0)+" kayıp</small>";
  const c=d.curve||[]; if(c.length>1){ const vs=c.map(x=>x[1]), lo=Math.min(...vs), hi=Math.max(...vs), t0=c[0][0], t1=c[c.length-1][0]; const X=t=>(t-t0)/(t1-t0||1)*300, Y=v=>66-(v-lo)/((hi-lo)||1)*62;
    $("cv").innerHTML='<polyline fill="none" stroke="var(--acc)" stroke-width="1.5" vector-effect="non-scaling-stroke" points="'+c.map(x=>X(x[0]).toFixed(1)+","+Y(x[1]).toFixed(1)).join(" ")+'"/>'; }
  $("ph").textContent="Açık pozisyonlar ("+d.pos.length+")";
  $("pos").innerHTML=d.pos.map(p=>'<tr><td><b>'+esc(p.sym.replace("USDT",""))+'</b> <span class="tag '+(p.dir==="long"?"up":"down")+'">'+(p.dir==="long"?"L":"S")+'</span><br><small>'+age(p.ageMin)+(p.rev?" · masa: "+esc(p.rev.v):"")+(p.stage&&p.stage!=="open"?" · "+esc(p.stage):"")+'</small></td><td class="r"><span class="'+sg(p.r)+'">'+pm(p.r)+'R</span><br><small class="'+sg(p.pnl)+'">'+pm(p.pnl)+' $</small></td><td class="r"><small>giriş '+px(p.entry)+'<br>şimdi '+px(p.px)+'<br>stop '+px(p.stop)+'</small></td></tr>').join("")||'<tr><td class="mut">açık pozisyon yok</td></tr>';
  $("cl").innerHTML=d.closed.map(t=>'<tr><td>'+esc(t.sym.replace("USDT",""))+' <span class="tag">'+(t.dir==="long"?"L":"S")+'</span><br><small>'+hm(t.closeT)+" · "+esc((t.exits||[]).join(", "))+'</small></td><td class="r"><span class="'+sg(t.r)+'">'+pm(t.r)+'R</span><br><small class="'+sg(t.pnl)+'">'+pm(t.pnl)+' $</small></td></tr>').join("")||'<tr><td class="mut">henüz yok</td></tr>';
  $("lg").innerHTML=(d.log||[]).map(l=>"<div>"+hm(l.t)+" · <b>"+esc(l.sym.replace("USDT",""))+"</b> "+esc(l.text)+"</div>").join("");
}
tick(); setInterval(tick,5000);
</script></body></html>`;
