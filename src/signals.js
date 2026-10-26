/* ---------- Tek sinyal ekranı (26 Ekim 2026) ----------
   Kullanıcı: "benim derdim sinyal yakalamayı sağlayacak bir uygulama, yanında muadillerine göre daha yüksek getiri sağlayacak bir bot";
   canlı birleşim incelemesinden sonra "senin tavsiyene göre ilerleyelim" (arastirma/birlesim-canli-2026-10-26.md, plan adım 2).
   Masanın, Kalite short'un ve sepetlerin aldığı sinyaller tek akışta; her kuralın canlı karnesi ve arşiv kanıtı yan yana.
   sigCollect saf: durumları okur, hiçbir şeyi değiştirmez. Arşiv satırları CLAUDE.md'deki sonuçların özeti; parametre değişince elle güncellenir. */
const SIG_RULES=[
  {k:"masa",ad:"Masa",yon:"iki yön",yer:"masanın hesabı",ufuk:"8 sa",arsiv:"arşivde (2024-06 → 2026-10, örneklem dışı) giriş başı −0,03R, rastgele girişten +0,02R iyi; kanıt yok"},
  {k:"ks",ad:"Kalite short",yon:"short",yer:"masanın hesabı",ufuk:"72 sa",arsiv:"2022-01 → 2026-10 örneklem dışı +0,064R/işlem (masanın bütün short'ları +0,030R), son 12 ay +0,081R; haftalık t 1,5"},
  {k:"tt",ad:"Kaplumbağa",yon:"long",yer:"ayrı sepet",ufuk:"günler–haftalar",arsiv:"2020-06'dan 362 işlem +1,49R, son 24 ay +0,46R; kazanç birkaç büyük trendden, medyan işlem eksi"},
  {k:"ic",ad:"Ichimoku",yon:"iki yön",yer:"ayrı sepet",ufuk:"4 sa mumlar",arsiv:"10.229 işlem +0,077R, son 12 ay +0,066R, 7 yılın 7'si artı"},
  {k:"ul",ad:"Açılım short",yon:"short",yer:"ayrı sepet",ufuk:"7 gün",arsiv:"2022'den 360 olay +3,16 %/işlem; aynı coinlerde rastgele hafta +1,25 %, açılıma özgü ≈ +1,9 %"},
  {k:"dip",ad:"Geri çekilme",yon:"long",yer:"ayrı sepet",ufuk:"en çok 20 gün",arsiv:"978 işlem, kazanma %83, +1,14 %/işlem; 2025 +0,16 %, 2026 +0,03 %"},
  {k:"kov",ad:"Sıkışma (Kovner)",yon:"long",yer:"ayrı sepet",ufuk:"günler",arsiv:"128 işlem +1,70R, son 2 yıl +0,51R; küçük coinlerde tutmadı"},
  {k:"trend",ad:"Trend sepeti",yon:"long",yer:"ayrı sepet",ufuk:"günlük ağırlık",arsiv:"Nis 2020 → Eyl 2026 yıllık %102, en büyük düşüş −%43 (tv 0,8); tek tek sinyal değil, ağırlık"}];
const SIG_BY=Object.fromEntries(SIG_RULES.map(r=>[r.k,r]));
// src: {bot, S:{tt,ic,ks,ul,dip,kov,trend}, ulEv (açılım takvimi), px: sym → fiyat ya da NaN, now}
function sigCollect(src){ const now=src.now||Date.now(), px=src.px||(()=>NaN), S=src.S||{}, bot=src.bot, rows=[];
  const add=o=>{ const x=px(o.sym); if(o.st==="açık"&&x>0){ o.px=x; o.pct=o.dir*(x/o.e-1); if(o.stop>0&&Math.abs(o.e-o.stop)>0) o.R=o.dir*(x-o.e)/Math.abs(o.e-o.stop); } rows.push(o); };
  if(bot){ for(const p of bot.positions||[]){ const k=p.side==="ks"?"ks":"masa"; add({k,t:p.openT,sym:p.sym,dir:p.dir==="long"?1:-1,e:p.entry0||p.entry,stop:p.stop,tp:p.t1||null,st:"açık",score:p.score,yes:p.yes,acct:"masa"}); }
    for(const t of bot.trades||[]){ const k=t.side==="ks"?"ks":"masa"; rows.push({k,t:t.openT,closeT:t.closeT,sym:t.sym,dir:t.dir==="long"?1:-1,e:t.entry,st:"kapandı",R:t.r,pnl:t.pnl,why:(t.exits||[]).slice(-1)[0]||"",score:t.score,acct:"masa"}); } }
  const dirOf=p=>p&&p.dir!=null?(p.dir>0||p.dir==="long"?1:-1):null;
  const sleeve=(k,s,dflt)=>{ if(!s) return; for(const sym in s.pos||{}){ const p=s.pos[sym]; add({k,t:p.t,sym,dir:dirOf(p)||dflt,e:p.e,stop:p.stop||null,tp:p.tp||null,st:"açık",acct:"sepet",until:p.until||null}); }
    for(const t of s.trades||[]) rows.push({k,t:t.t,closeT:t.closeT,sym:t.sym,dir:dirOf(t)||dflt,e:t.e,x:t.x,st:"kapandı",R:Number.isFinite(t.R)?t.R:null,pct:Number.isFinite(t.r)?t.r:(t.e>0&&t.x>0?(dirOf(t)||dflt)*(t.x/t.e-1):null),pnl:t.pnl,why:t.why||"",acct:"sepet"}); };
  sleeve("tt",S.tt,1); sleeve("ic",S.ic,1); sleeve("ks",S.ks,-1); sleeve("ul",S.ul,-1); sleeve("dip",S.dip,1); sleeve("kov",S.kov,1);
  // Kalite short sinyali geldi ama masanın hesabında açılmadı (bot kapalı, aynı coin, en çok 5, teminat)
  if(S.ks&&bot){ for(const l of S.ks.log||[]){ if(l.type!=="signal"||now-l.t>7*864e5) continue; const took=(bot.positions||[]).concat(bot.trades||[]).some(p=>p.side==="ks"&&p.sym===l.sym&&Math.abs((p.openT||0)-l.t)<10*60e3);
    if(!took) rows.push({k:"ks",t:l.t,sym:l.sym,dir:-1,e:l.px,st:"alınmadı",why:"masanın hesabında açılmadı (bot kapalı, aynı coinde pozisyon, en çok 5 ya da teminat)",acct:"masa"}); } }
  // yaklaşan açılımlar: giriş penceresi önümüzdeki 7 gün
  if(src.ulEv&&S.ul){ const c=S.ul.cfg||{}; for(const e of src.ulEv){ if(!(e.size>=(c.minSize||0.025)&&e.size<=(c.maxSize||1))) continue; const a=e.day-(c.preDays||7)*864e5;
    if(a>now&&a-now<=7*864e5&&!(S.ul.pos||{})[e.sym]) rows.push({k:"ul",t:a,sym:e.sym,dir:-1,st:"yaklaşan",why:`${e.name||""} açılımı ${new Date(e.day).toISOString().slice(0,10)}, serbest arzın %${(e.size*100).toFixed(1)}'i`,acct:"sepet"}); } }
  rows.sort((a,b)=>b.t-a.t);
  const cards=SIG_RULES.map(r=>{ const rs=rows.filter(x=>x.k===r.k); const cl=rs.filter(x=>x.st==="kapandı"), op=rs.filter(x=>x.st==="açık");
    const Rs=cl.filter(x=>Number.isFinite(x.R)).map(x=>x.R), Ps=cl.filter(x=>Number.isFinite(x.pct)).map(x=>x.pct); const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
    const live={open:op.length,n:cl.length,avgR:mean(Rs),avgPct:mean(Ps),win:cl.length?cl.filter(x=>(Number.isFinite(x.R)?x.R:x.pct||0)>0).length/cl.length:null,pnl:cl.reduce((s,x)=>s+(+x.pnl||0),0),last:rs.length?Math.max(...rs.filter(x=>x.t<=now).map(x=>x.t),0)||null:null,miss:rs.filter(x=>x.st==="alınmadı").length};
    if(r.k==="trend"&&S.trend){ live.eq=S.trend.bal; live.roi=S.trend.start>0?S.trend.bal/S.trend.start-1:null; }
    return Object.assign({},r,{live}); });
  return {rows,cards}; }
// yeni sinyaller: önceki anahtar kümesinde olmayan, açık ya da alınmamış satırlar (bildirim için)
function sigKey(x){ return x.k+"|"+x.sym+"|"+x.t; }
function sigFresh(rows,seen){ return rows.filter(x=>(x.st==="açık"||x.st==="alınmadı"||x.st==="yaklaşan")&&!seen.has(sigKey(x))); }
