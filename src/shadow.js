/* Gölge kural masası ve sonrası kaydı (13 Ekim 2026; kullanıcı "botta eğitilmiş modeller koşsun" dedi, kural masası paralel izlenir).
   Bot model oylu masayla işlem açar; aynı tarama satırında kural oylu masa (committee(…,{uye:false}), satırda comR) da hesaplanır, işlem açmaz.
   Giriş kapısını (plan, puan ≥ eşik, evet ≥ asgari, veto yok) geçen her karar coin+yön+masa başına 60 dk'da bir kaydedilir: "model", "rule";
   ikisi aynı anda geçtiyse kayıtta both. Botun açtığı işlemler "trade". Her kaydın 15 dk / 1 sa / 4 sa sonraki fiyatı yönde % olarak yazılır
   (r[h]; R = r ÷ plan stop uzaklığı sd, stopsuz tutulsaydı). Elde tutma/soğuma ve aşamalar (bütçe, korelasyon) kayda girmez: masanın yön bilgisi ölçülür.
   Fiyat: ekranlı uygulamada canlı akış, ekransızda tüm coin ticker; vade geçince ilk görülen fiyat alınır, gecikme (dk) kayıtta d[h]. */
const SH_DEF={hz:[15,60,240],gapMin:60,max:3000,lateMax:0.5};
const SH_KEY="st-shadow"; let SH=null;
function shLoad(){ if(SH) return SH; try{ SH=JSON.parse(localStorage.getItem(SH_KEY)||"null"); }catch(e){} if(!SH||!Array.isArray(SH.pend)) SH={pend:[],done:[],last:{}}; return SH; }
function shSave(){ try{ localStorage.setItem(SH_KEY,JSON.stringify(SH||shLoad())); }catch(e){} }
function shReset(){ SH={pend:[],done:[],last:{}}; shSave(); return SH; }
const shGate=(c,thr,minYes)=>!!(c&&c.plan&&!c.veto&&c.score>=thr&&c.yes>=minYes);
const shR4=v=>isFinite(v)?Math.round(v*1e4)/1e4:null;
function shAdd(rec,now,noSave){ const S=shLoad(); now=now||Date.now(); if(!(rec.px>0)) return false;
  S.pend.push({k:rec.k,sym:rec.sym,dir:rec.dir,t:now,px:rec.px,sd:shR4(rec.sd),score:shR4(rec.score),yes:rec.yes,both:rec.both?1:0,r:{},d:{}}); if(!noSave) shSave(); return true; }
/* rows: tarama satırları (com, comR, px). pxOf(sym): taze fiyat ya da NaN (vade ölçümü yalnız bununla; kayıtta yoksa satırın fiyatı). Dönüş: {add, res, fin: biten kayıtlar}. */
function shTick(rows,pxOf,now,thr,minYes){ const S=shLoad(); now=now||Date.now(); let add=0, res=0;
  for(const r of rows||[]){ if(!r||!r.com) continue; const px=pxOf(r.s)||r.px;
    for(const dir of ["long","short"]){ const m=r.com[dir], q=(r.comR||{})[dir]||m; const gm=shGate(m,thr,minYes), gr=shGate(q,thr,minYes); if(!(px>0)) continue;
      for(const [k,c,g] of [["model",m,gm],["rule",q,gr]]){ if(!g) continue; const lk=k+"|"+r.s+"|"+dir; if(S.last[lk]&&now-S.last[lk]<SH_DEF.gapMin*6e4) continue;
        S.last[lk]=now; shAdd({k,sym:r.s,dir,px,sd:c.plan.sd,score:c.score,yes:c.yes,both:gm&&gr},now,true); add++; } } }
  const keep=[], fin=[];
  for(const p of S.pend){ const px=pxOf(p.sym); let open=false;
    for(const h of SH_DEF.hz){ if(p.r[h]!==undefined) continue; const due=p.t+h*6e4; if(now<due){ open=true; continue; }
      const late=(now-due)/6e4; if(late>h*SH_DEF.lateMax){ p.r[h]=null; p.d[h]=Math.round(late); res++; continue; } // çok geç: ölçülmedi
      if(!(px>0)){ open=true; continue; } const mv=(p.dir==="long"?px/p.px-1:1-px/p.px)*100; p.r[h]=shR4(mv); p.d[h]=Math.round(late); res++; }
    if(open) keep.push(p); else { S.done.push(p); fin.push(p); } }
  S.pend=keep; if(S.done.length>SH_DEF.max) S.done=S.done.slice(-SH_DEF.max);
  for(const k in S.last) if(now-S.last[k]>SH_DEF.gapMin*6e4) delete S.last[k];
  if(add||res) shSave(); return {add,res,fin}; }
/* özet: masa (model, rule, both = ikisinin birlikte geçtiği kararlar, model·tek / rule·tek = yalnız o masanın geçtiği, yön kırılımı, trade) × ufuk: n, ort. yönde %, ort. R (stopsuz), isabet (yönde > 0) */
function shSum(S,since){ S=S||shLoad(); const out={}; const all=[...S.done,...S.pend].filter(p=>!since||p.t>=since);
  const add=(key,p)=>{ const o=out[key]||(out[key]={n:0}); o.n++; for(const h of SH_DEF.hz){ const v=p.r[h]; if(v==null) continue; const z=o["h"+h]||(o["h"+h]={n:0,s:0,sr:0,nr:0,w:0}); z.n++; z.s+=v; if(v>0) z.w++; if(p.sd>0){ z.sr+=v/100/p.sd; z.nr++; } } };
  for(const p of all){ add(p.k,p); if(p.both&&p.k==="model") add("both",p); if(p.k!=="trade"){ add(p.k+"·"+p.dir,p); if(!p.both) add(p.k+"·tek",p); } }
  for(const o of Object.values(out)) for(const h of SH_DEF.hz){ const z=o["h"+h]; if(!z) continue; o["h"+h]={n:z.n,pct:shR4(z.s/z.n),R:z.nr?shR4(z.sr/z.nr):null,hit:shR4(z.w/z.n)}; }
  return {pend:S.pend.length,done:S.done.length,by:out}; }
