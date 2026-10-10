/* ---------- Masa: on dört kişilik, dört tur (Serkan · hacim: volume.js, Yusuf · strateji doğrulayıcı: tfcheck.js, Kaan · faktör analisti: factors.js, Ozan · sıralama modeli: rankmodel.js) ----------
   Analistler: Emre (trend), Kerem (likidite / ICT), Mert (emir akışı). Araştırmacılar: Arda (makro · BTC rejimi, kalabalık), Onur (kantitatif · kanıt, maliyet).
   Araştırma ekibi (research.js): Tolga (liderlerin coin uzlaşısı), Burak (liderlerin geçmişinden çıkan aday stratejiler ve kaçınılacak kalıplar). Denetçi: Murat.
   Traderlar: Baran (agresif, momentum), Can (baş trader · risk ve boy; veto hakkı).
   1. tur açılış: herkes verisine bakıp oy (v −1..+1) ve güven (c 0..1) verir. 2. tur itirazlar: kurallı karşılıklı itirazlar oyları ve güvenleri değiştirir, plan kısalabilir.
   3. tur ikna (comTally): en güçlü destekçi tezini, en güçlü karşı çıkan karşı tezini söyler; her üye diğerlerinin güvenle ağırlıklı görüşünü dinler ve güveni düşükse oyunu
   ona doğru çeker (kim ikna ettiyse söylenir). Verisi olmayan üye çekimserdir: puana da paydaya da girmez. 4. tur karar: Can veto eder ya da boyu ve planı yazar.
   Puan = Σ w·v·c / Σ w (yalnız oy kullananlar); ekranda 100 üzerinden (pts, SCORE_MAX), iç hesap ve ayarlar −1…+1 kesir. Bot: puan ≥ eşik ve evet ≥ asgari ve veto yok → market giriş; boy = masanın güveni (goal.js deskConf: puan payı × not; taban risk → riskMax).
   Katsayılar (w) geriye dönük testten: tests/backtest-masa.js, 24 coin × 6 ay, saatte bir toplantı; üyenin oy×güven'inin sonuçla bilgi katsayısı (IC) → w = 1 + 40·IC.
   Emre 1,8 · Baran 2,0 · Arda 1,3 · Can 1,1 · Kerem 0,9 · Mert 0,9; Onur/Tolga/Burak/Murat geçmişte ölçülemedi (çoğunlukla çekimser), yerinde kaldı. */
const DESK=[
  {id:"trend",name:"Emre",role:"Trend analisti",w:1.8},
  {id:"liq",name:"Kerem",role:"Likidite analisti",w:0.9},
  {id:"flow",name:"Mert",role:"Emir akışı analisti",w:0.9},
  {id:"macro",name:"Arda",role:"Makro araştırmacısı",w:1.3},
  {id:"quant",name:"Onur",role:"Kantitatif araştırmacı",w:0.8},
  {id:"mom",name:"Baran",role:"Trader · agresif",w:2},
  {id:"copy",name:"Tolga",role:"Kopya trader araştırmacısı",w:1},
  {id:"lab",name:"Burak",role:"Strateji araştırmacısı",w:0.9},
  {id:"audit",name:"Murat",role:"Denetçi · hatalardan ders",w:1},
  {id:"vol",name:"Serkan",role:"Hacim analisti",w:1.5},
  {id:"check",name:"Yusuf",role:"Strateji doğrulayıcı",w:1},
  {id:"fac",name:"Kaan",role:"Faktör analisti",w:1},
  {id:"rank",name:"Ozan",role:"Sıralama modeli",w:1},
  {id:"risk",name:"Can",role:"Baş trader · risk",w:1.1}];
const COM_W={}; for(const d of DESK) COM_W[d.name+" · "+d.role.split(" ")[0]]=d.w;
// eşik, asgari evet ve katsayılar tests/backtest-masa.js ile seçildi (6 Ekim 2026, 24 coin × 6 ay, 169 bin toplantı); v: ayar sürümü (comMigrate)
const COM_DEF={threshold:0.35,minYes:3,v:3,stopMult:2,btc200:false,lf:{longBtc24Max:null,r7dMin:0},l24:{holdH:24,btc24Max:0,rankMin:0.1}};
// 10 Ekim 2026 akşamı, 24 saatlik long (test #47; kullanıcı araştırma döngüsünün önerisiyle "devam edelim" dedi; arastirma/dongu/2026-10-10-test44-birlesim.md):
// long yalnız BTC son 24 saatte düşmüşken (btc24Max) ve Ozan coini evrenin en kötü onluğunda görmüyorsa (rankMin; gölgede olsa da veto); pozisyon hedefsiz,
// stop aynı, holdH saat sonra zaman çıkışı, masanın pozisyon kararları ve dinamik hedef/stop uygulanmaz (plan.h24 → pozisyon h24). Arşivde (2020-06 → 2026-10,
// stop 2 × sd, market giriş) bu longlar +0,027R (yarılar +0,017 / +0,039, son 12 ay +0,054); BTC kuralı olmadan aynı longlar −0,115R; Ozan süzgeciyle (2024-06'dan) +0,059R.
// Haftalık blok t 0,3: kanıt değil, kâğıt botta ileriye sınanıyor. Shortlar eski planla. l24:false kapatır (config.json → masa).
// 10 Ekim 2026, kayıp süzgeci (kullanıcı karar kartında "Kayıp süzgeci"; arastirma/kayip-suzgeci/kayip-suzgeci-2026-10-10.md): masa-archive örnekleri,
// 319 coin, 2020-06 → 2026-10, eşiği geçen 134 bin karar. lf.longBtc24Max = long yalnız BTC son 24 saatte bundan az yükseldiyse (0: BTC düşmüşken);
// BTC 24 sa yükselişteyken longlar −0,160R, düşüşteyken −0,076R (shortlarla aynı, −0,079R; her yıl daha iyi). Kullanıcı "long açmamak çok keskin" dedi, önceki
// "long yok" kuralının yerine geçti. lf.r7dMin = coinin 7 günlük getirisi (işlem yönünde) bundan küçükse girme (7 günlük trende karşı −0,15R, kalan −0,10R; her yıl iyi).
// İkisi birlikte, BTC 200 kapısı kapalı: −0,116R → −0,069R (yarılar +0,046 / +0,049, t 3,2 / 2,8; son 12 ay +0,015, t 1,2). Kalanlar hâlâ eksi:
// süzgeç kaybı azaltır, kenar yaratmaz. BTC 200 kapısı aynı veride kaybı azaltmadı (−0,009R, 7 yılın 5'inde kötü), varsayılanı kapandı. lf:false süzgeci kapatır.
// 10 Ekim 2026 akşamı: zaman stopu hatası düzeltilmiş simBot'la (PR #36; 24 coin, 6 ay, 30.646 giriş) BTC 24 sa kuralı yalnız ilk yarıda tuttu (−0,105R / +0,057R),
// Hyperliquid'de 35.928 başka trader işleminde ve canlı 71 işlemde de tutmadı → varsayılan kapalı (longBtc24Max:null). 7 gün kuralı düzeltilmiş simde iki yarıda kötü tarafta (−0,128 / −0,009R), açık kaldı.
function btc200Rel(){ const d=(typeof btcCache!=="undefined"&&btcCache)?btcCache.d:null; if(!d||d.length<202) return null; const now=Date.now(); const closed=d.filter(x=>x.t+864e5<=now); if(closed.length<200) return null; const sma=closed.slice(-200).reduce((a,x)=>a+x.c,0)/200; return d[d.length-1].c/sma-1; }
// stop uzaklığına göre en yüksek güvenli kaldıraç: stop, likidasyon mesafesinin %60'ını geçmesin (Can'ın vetosuyla aynı ölçü)
// coinin son 7 kapanmış günlük getirisi (log, yönsüz); masa-archive.js feats().r7d ile aynı ölçü. Veri yoksa null (süzgeç çalışmaz).
function r7dOf(A){ const d=A&&A.src&&A.src.k1d, k=A&&A.src&&A.src.k15L; if(!d||!k||!k.length) return null; const last=k[k.length-1], now=last.t+9e5, px=isFinite(A.px)?A.px:last.c;
  const day0=Math.floor(now/864e5)*864e5; const cl=d.filter(c=>c.t<day0); if(cl.length<8||!(px>0)||!(cl[cl.length-8].c>0)) return null; return Math.log(px/cl[cl.length-8].c); }
// BTC'nin son 24 saatlik getirisi (log), kapanmış 15 dk mumlarla; masa-archive.js feats().b24 ile aynı ölçü. Veri yoksa null.
function btc24Of(A){ const b=A&&A.src&&A.src.btc15, k=A&&A.src&&A.src.k15L; if(!b||!b.length) return null; const now=k&&k.length?k[k.length-1].t+9e5:Date.now();
  const cl=b.filter(c=>c.t+9e5<=now); if(cl.length<97) return null; const a=cl[cl.length-1].c, z=cl[cl.length-97].c; return a>0&&z>0?Math.log(a/z):null; }
function levFor(sd,max){ max=max||20; let l=max; while(l>1&&sd>liqDist(l)*0.6) l--; return l; }
/* ---------- İkna turu ----------
   Her üye, diğerlerinin güvenle ağırlıklı görüşünü (Σ w·c·v / Σ w·c) dinler. Güveni düşük olan çok, yüksek olan az değişir:
   v ← v + pull · (1 − c) · (diğerlerinin ortalama güveni) · (diğerlerinin görüşü − v), rounds tur. Çekimserler dinlemez, konuşmaz.
   Katsayılar ve pull/rounds tests/backtest-masa.js ile seçildi (bkz. COM_FIT). */
const COM_TALK={rounds:2,pull:0.5};
function comTally(pre, opts){
  opts=opts||{}; const W=opts.weights||{}; const R=opts.rounds!=null?opts.rounds:COM_TALK.rounds, P=opts.pull!=null?opts.pull:COM_TALK.pull;
  const L=pre.map(a=>({...a,v0:a.v,w:a.abst?0:+((W[a.id]!=null?W[a.id]:a.base)*(a.m!=null?a.m:1)).toFixed(3)})); const act=L.filter(a=>a.w>0);
  for(let r=0;r<R&&act.length>1;r++){
    const nv=act.map(a=>{ let sw=0,swc=0,num=0; for(const b of act){ if(b===a) continue; sw+=b.w; swc+=b.w*b.c; num+=b.w*b.c*b.v; } if(!(swc>0)) return a.v; return clamp(a.v+P*(1-a.c)*(swc/sw)*(num/swc-a.v),-1,1); });
    act.forEach((a,i)=>{ a.v=nv[i]; }); }
  const moves=[]; for(const a of act){ const d=a.v-a.v0; if(Math.abs(d)<0.1) continue; let by=null; for(const b of act){ if(b===a||Math.sign(b.v0-a.v0)!==Math.sign(d)) continue; const f=b.w*b.c*Math.abs(b.v0-a.v0); if(!by||f>by.f) by={id:b.id,f}; } moves.push({id:a.id,from:a.v0,to:a.v,by:by&&by.id}); }
  let yes=0,no=0,num=0,den=0; for(const a of act){ num+=a.w*a.v*a.c; den+=a.w; if(a.v>0.15) yes++; if(a.v<-0.15) no++; }
  return {L,act,moves,yes,no,nAct:act.length,score:den?num/den:0};
}
// tartışma dökümü: tez (en güçlü destek), karşı tez (en güçlü itiraz), ikna olanlar, ikna olmayanlar
const GEN={Emre:"Emre'nin",Kerem:"Kerem'in",Mert:"Mert'in",Arda:"Arda'nın",Onur:"Onur'un",Baran:"Baran'ın",Tolga:"Tolga'nın",Burak:"Burak'ın",Murat:"Murat'ın",Serkan:"Serkan'ın",Yusuf:"Yusuf'un",Kaan:"Kaan'ın",Ozan:"Ozan'ın",Can:"Can'ın"};
function comTalkLines(T, D){
  const out=[]; const nm=id=>(T.L.find(a=>a.id===id)||{}).name||id; const gen=id=>GEN[nm(id)]||nm(id)+"'in"; const f2=v=>(v>0?"+":"")+fx(v,2); const cap=t=>t?t.charAt(0).toUpperCase()+t.slice(1):t;
  const pro=[...T.act].filter(a=>a.v0>0.15).sort((a,b)=>b.w*b.c*b.v0-a.w*a.c*a.v0)[0], con=[...T.act].filter(a=>a.v0<-0.15).sort((a,b)=>a.w*a.c*a.v0-b.w*b.c*b.v0)[0];
  if(pro) out.push({id:pro.id,stage:"ikna",text:`Tez: ${D} için en güçlü gerekçe bende. ${cap(pro.txt)}. Güvenim %${Math.round(pro.c*100)}.`});
  if(con) out.push({id:con.id,stage:"ikna",text:`Karşı tez: ${cap(con.txt)}. ${pro?nm(pro.id)+", bu riski fiyatlamadan giremeyiz.":"Bu masadan bu haliyle işlem çıkmaz."}`});
  if(!pro&&!con) out.push({id:"risk",stage:"ikna",text:"Kimse güçlü bir tez getirmedi; herkes kararsız."});
  for(const m of T.moves){ const a=T.L.find(x=>x.id===m.id); const who=m.by?gen(m.by)+" argümanı":"masanın geneli"; const why=a.c>=0.7?`itirazımı kayda geçirip bir kademe yumuşatıyorum (güvenim %${Math.round(a.c*100)}, ikna olmuş değilim)`:`kendi verim zayıf (güven %${Math.round(a.c*100)}), ${m.by?"onun":"masanın"} okumasına yaklaşıyorum`;
    out.push({id:m.id,stage:"ikna",text:`${cap(who)} ağır bastı; ${why}. Oyum ${f2(m.from)} → ${f2(m.to)}.`}); }
  const hold=T.act.filter(a=>a.c>=0.75&&Math.abs(a.v0)>0.3&&!T.moves.some(m=>m.id===a.id)&&(pro&&con)&&Math.sign(a.v0)!==Math.sign(T.score)).slice(0,1);
  for(const a of hold) out.push({id:a.id,stage:"ikna",text:`Ben ikna olmadım, verim net: oyum ${f2(a.v0)} kalıyor.`});
  return out;
}

// kâğıt bot varsayılanları (ui.js ve ekransız çalıştırıcı headless/ ortak kullanır)
const BOT_CFG_DEF={mode:"komite",risk:0.03,lev:20,maxLev:20,maxPos:6,maxOpens:24,maxLosses:12,threshold:0.35,minYes:3,holdH:8,cooldownMin:90,strict:false,useBR:true,useRS:true,feeMaker:0.0002,feeTaker:0.0005,slip:0.0003};
// eski kayıtlı ayarlar: masa ayarı sürümü değişince eşik ve asgari oy yeni (geriye dönük testten seçilen) varsayılana taşınır
function comMigrate(cfg){ if(!cfg) return cfg; const v=cfg.comV||0; if(v>=COM_DEF.v) return cfg;
  if(v<2){ cfg.threshold=BOT_CFG_DEF.threshold; cfg.minYes=BOT_CFG_DEF.minYes; } // 6 Ekim 2026: eşik 0,30 → 0,35, asgari evet 4 → 3 (geriye dönük test); risk dokunulmaz (kullanıcı %3'te kalmayı seçti)
  if(v<3){ // 6 Ekim 2026 gecesi, tam bütçe (kullanıcı: "masa bütçenin tamamını aktif kullanmakta serbest, amaç mümkün olduğunca çok işlem"): eski varsayılanda kalan sınırlar yenisine, elle değiştirilmiş değer korunur
    const old={maxPos:3,maxOpens:12,maxLosses:6,maxSameDir:2}; for(const k in old) if(cfg[k]==null||cfg[k]===old[k]) cfg[k]=BOT_CFG_DEF[k];
    if(cfg.maxOpenRisk==null||Math.abs(cfg.maxOpenRisk-0.09)<1e-9||Math.abs(cfg.maxOpenRisk-0.15)<1e-9) cfg.maxOpenRisk=BOT_CFG_DEF.maxOpenRisk; }
  cfg.comV=COM_DEF.v; return cfg; }
function committee(A, dir, c24, opts){
  opts=Object.assign({},COM_DEF,opts||{}); const isL=dir==="long"; const sg=isL?1:-1; c24=isFinite(c24)?c24:0; const D=isL?"long":"short";
  const ag={}; const talk=[]; const say=(id,stage,text)=>{ const d=DESK.find(x=>x.id===id); talk.push({who:d.name,role:d.role,id,stage,text}); };
  const set=(id,v,c,txt)=>{ ag[id]={id,v:clamp(v,-1,1),c:clamp(c,0,1),txt}; };
  /* ---- 1. tur: açılış görüşleri ---- */
  const tv=sg*(clamp(A.trendScore/6,-1,1)*0.6+clamp(A.st/3,-1,1)*0.4);
  const trTxt=`günlük ${A.trend==="up"?"yukarı":A.trend==="down"?"aşağı":"yatay"} (${A.trendScore>0?"+":""}${A.trendScore}/6) · 1 sa yapı ${A.st>0?"+":""}${A.st}`;
  set("trend",tv,0.4+0.6*Math.abs(tv),trTxt);
  say("trend","açılış",tv>0.3?`Büyük resim ${D} tarafında: ${trTxt}. Yönle işlem yapıyoruz.`:tv<-0.3?`Günlük yön ${D} için karşı duruyor: ${trTxt}. Bu bir karşı-trend fikri olur.`:`Yön net değil: ${trTxt}. Trend bize yardım etmez, zarar da vermez.`);
  const r=A.amd&&A.amd[dir]; const q=A.rs&&A.rs[dir];
  const stv={entry:1,waitEntry:0.7,afterTouch:0.4,waitMSS:0.35,done:0.15,expired:0.1,noSweep:-0.3,noBias:-0.2,stopped:-0.5,failed:-0.6};
  let lv=r?(stv[r.stage]!=null?stv[r.stage]:0):-0.3; if(r&&r.grade==="A") lv+=0.15; if(q&&q.rsOk) lv+=0.25; if(r&&r.pool&&r.pool.w>=3) lv+=0.1;
  const stTR={entry:"fiyat OTE bölgesinde",waitEntry:"MSS oldu, bölgeye dönüş bekleniyor",afterTouch:"bölgeye dokundu ve çıktı",waitMSS:"süpürme var, yapı kırılımı yok",done:"hedefe gitmiş",expired:"süre dolmuş",noSweep:"süpürme yok",noBias:"yön yok",stopped:"stop yemiş",failed:"dizi bozulmuş"};
  set("liq",lv,r&&r.pool?0.9:0.5,r&&r.pool?`${r.pool.name} süpürüldü · ${stTR[r.stage]||r.stage}${r.kz?" · "+r.kz:""}${q&&q.rsOk?" · K3 kapıları tamam":""}`:"süpürme yok");
  say("liq","açılış",r&&r.pool?`${r.pool.name} süpürüldü, ${stTR[r.stage]||r.stage}${r.kz?", süpürme "+r.kz+" seansında":""}${q&&q.rsOk?". Kurulum 3 kapıları da tamam":""}${r.grade==="A"?". Kalite A":""}. ${lv>0.6?"Benim gözümde bu bir giriş.":lv>0.3?"Kurulum var ama fiyat henüz yerinde değil.":"Elimde giriş yok."}`:`Bu coinde ${D} için süpürülmüş havuz görmüyorum. Manipülasyon olmadan giriş istemem.`);
  const of=r&&r.ofScore!=null?r.ofScore:0; const tk=isL?(A.tk30-1):(1-A.tk30);
  let fv=clamp(of/3,0,1)*0.6+clamp(tk*3,-1,1)*0.4;
  const oiTR={newlong:"yeni long giriyor",shortcover:"shortlar kapanıyor",newshort:"yeni short giriyor",longclose:"longlar kapanıyor",flat:"OI yatay"};
  const oiGood=isL?(A.oiCase==="newlong"||A.oiCase==="shortcover"):(A.oiCase==="newshort"||A.oiCase==="longclose");
  const oiBad=isL?(A.oiCase==="newshort"||A.oiCase==="longclose"):(A.oiCase==="newlong"||A.oiCase==="shortcover");
  if(oiGood) fv+=0.2; if(oiBad) fv-=0.3; if(A.oiBloat) fv-=0.2;
  set("flow",fv,A.noTaker?0.3:0.8,`${of} süpürme teyidi · taker 30 dk ${fx(A.tk30,2)} · ${oiTR[A.oiCase]||A.oiCase}`);
  say("flow","açılış",`Süpürmede ${of} teyit${of>=2?" (emilim var)":of===1?" (zayıf)":" (emilim yok)"}, 30 dakikalık taker oranı ${fx(A.tk30,2)}, ${oiTR[A.oiCase]||A.oiCase}${A.oiBloat?", OI şişmiş":""}. ${fv>0.4?"Akış bizimle.":fv<0?"Akış karşı tarafta.":"Akış kararsız."}`);
  const B=A.btcReg&&A.btcReg[dir]; let bv=0,bc=0,btxt="BTC verisi yok";
  if(B){ bv=B.agree?1:B.ok?0.5:B.dump?-1:-0.6; bc=0.9; btxt=`BTC 4 sa ${pct(B.ch4*100)} · 24 sa ${pct(B.ch24*100)} · yapı ${B.bias==="up"?"yukarı":B.bias==="down"?"aşağı":"yatay"}`; }
  const crowd=isL?(A.fund>0.0005?"fonlama ısınmış":A.distrib?"büyükler dağıtıyor":""):(A.fund<-0.0005?"shortlar fonlamada eziliyor":A.accum?"büyükler topluyor":"");
  if(crowd){ bv-=0.2; }
  set("macro",bv,bc,btxt+(crowd?" · "+crowd:""));
  say("macro","açılış",B?`${btxt}. ${B.agree?"Piyasa geneli aynı yöne bakıyor, zemin sağlam.":B.ok?"BTC karşı değil ama destek de vermiyor.":B.dump?"BTC sert gidiyor; "+D+" için zemin kaygan.":"BTC yapısı karşı yöne bakıyor."}${crowd?" Ayrıca "+crowd+".":""}`:"BTC verisi elimde yok, rejim hakkında konuşamam.");
  const sym=opts.sym||null; const LD=(typeof ld!=="undefined")?ld:null; const cs=sym&&LD&&LD.sym?LD.sym[sym]:null;
  let cv=0,cc=0.2,ctxt=LD&&LD.at?"liderler bu coinde işlem yapmadı":"lider verisi yok (masaüstü uygulamasında saatte bir çekilir)";
  if(cs){ const me=cs[dir]||{n:0,w:0,leaders:[]}, ot=cs[isL?"short":"long"]||{n:0,w:0,leaders:[]}; const tot=me.w+ot.w; if(tot>0){ cv=(me.w-ot.w)/tot; cc=Math.min(0.9,0.4+0.1*(me.n+ot.n)); ctxt=`${me.n} lider ${D} (${(me.leaders||[]).slice(0,3).join(", ")||"—"}), ${ot.n} lider ters yönde`; } }
  set("copy",cv,cc,ctxt);
  say("copy","açılış",cs&&(cs.long.n||cs.short.n)?`En iyi liderlerden ${ctxt}. ${cv>0.3?"Büyük paralar bizimle.":cv<-0.3?"Büyük paralar ters tarafta; dikkat.":"Liderler bölünmüş."}`:(LD&&LD.at?`Liderler ${sym?sym.replace("USDT",""):"bu coin"} ile ilgilenmiyor; ne destek ne engel.`:"Lider verisi henüz yok, bu turda çekimserim."));
  const LM=(typeof labMatch==="function")?labMatch(A,dir,sym):null; const best=LM&&LM.hits.length?[...LM.hits].sort((a,b)=>b.sw*(b.tl??b.t)-a.sw*(a.tl??a.t))[0]:null; const bad=LM&&LM.avoid.length?LM.avoid[0]:null;
  let lbv=0,lbc=0.2,lbtxt=(typeof lab!=="undefined"&&lab.base)?"liderlerin kalıplarından biri eşleşmiyor":"araştırma henüz aday çıkarmadı";
  if(best){ lbv=clamp((0.3+0.4*Math.min(1,(best.tl??best.t)/4))*best.sw,0,0.9); lbc=0.3+0.5*Math.min(1,best.n/80); lbtxt=`aday eşleşti: ${best.name} (${best.n} işlem, ${best.leaders} lider, ort ${fx(best.mean,2)} ATR, ${best.status})`; }
  if(bad){ lbv-=0.5; lbc=Math.max(lbc,0.3+0.5*Math.min(1,bad.n/80)); lbtxt=(best?lbtxt+" · ":"")+`kaçınılacak kalıp: ${bad.name} (ort ${fx(bad.mean,2)} ATR)`; }
  set("lab",lbv,lbc,lbtxt+(!best&&!bad?" · çekimser, puana girmez":""));
  say("lab","açılış",best?`Liderlerin geçmişinde bu durum var: ${best.name}. ${best.n} işlem, ${best.leaders} farklı lider, kazanma %${Math.round(best.wr*100)}, ortalama ${fx(best.mean,2)} ATR; iki yarıda da artı. Medyan tutuş ${fx(best.hold,1)} saat. Durum: ${best.status}${best.status==="zayıf"?", bu yüzden oyum yok":""}.${bad?` Ama kaçınılacak bir kalıp da eşleşiyor: ${bad.name}.`:""}`:bad?`Liderler bu durumda kötü yapıyor: ${bad.name}, ${bad.n} işlemde ortalama ${fx(bad.mean,2)} ATR${isFinite(bad.lift)?`, aynı yöndeki tüm işlemlerinden ${fx(Math.abs(bad.lift),2)} ATR kötü`:""}. Karşıyım.`:LM?"Şu anki tablo liderlerin kanıtlı kalıplarından hiçbirine uymuyor; ne destek ne engel.":(typeof lab!=="undefined"&&lab.base?"Bu coin için 1 saatlik veri yetmiyor, çekimserim.":"Araştırma ekibi henüz yeterli lider işlemi toplamadı; çekimserim."));
  const S=A.rsStats&&A.rsStats[dir]; const n=S?S.A.n+S.B.n:0; const sum=S?(S.A.sum||0)+(S.B.sum||0):0;
  let qv=0,qc=0.5,qtxt="bu coinde kanıt yok"; if(n>=3){ qv=sum>0?0.35:sum<0?-0.35:0; qc=0.6+Math.min(0.3,n/30); qtxt=`K3 bu coinde ${n} işlem, toplam ${sum>=0?"+":""}${fx(sum,1)}R`; } else if(n>0){ qtxt=`K3 bu coinde ${n} işlem (az örnek)`; }
  const kb=A.src&&A.src.k15L; const atrRel=kb&&kb.length>20?atrAt(kb,kb.length)/A.px:A.med15; let sd=Math.max(0.012,1.2*(atrRel||0.01)); const costR=(0.0005+0.0005+0.0003)/sd;
  set("quant",qv,qc,qtxt+` · stop ${fx(sd*100,2)}% → komisyon+kayma ≈ ${fx(costR,2)}R`);
  say("quant","açılış",`${n>=3?`Bu coinde Kurulum 3 geçmişi: ${n} işlem, toplam ${sum>=0?"+":""}${fx(sum,1)}R.`:"Bu coinde istatistik yok; 24 coinlik ortak test +0,13R/işlem, iki yarıda da artı."} Stop ${fx(sd*100,2)}% olursa komisyon ve kayma işlem başına ${fx(costR,2)}R yer${costR>0.1?"; bu pahalı":""}. Unutmayın, 100 işlemden önce yargı yok.`);
  let mv=sg*clamp(A.score/40,-1,1); if(isL&&A.climax) mv-=0.5; if(!isL&&A.capit) mv-=0.5; if(A.volRel>=1.5) mv+=0.1*(mv>=0?1:-1);
  set("mom",mv,0.5+0.5*clamp(A.volRel/2,0,1),`rüzgâr ${A.score>0?"+":""}${A.score} · hacim ×${fx(A.volRel,1)}${A.climax&&isL?" · climax":""}${A.capit&&!isL?" · kapitülasyon":""}`);
  say("mom","açılış",`Rüzgâr puanı ${A.score>0?"+":""}${A.score}, hacim ×${fx(A.volRel,1)}. ${mv>0.4?"Hareket var, beklemeyelim.":mv>0?"Momentum ılık, ben yine de varım.":"Momentum karşı tarafta, kovalamam."}${A.climax&&isL?" Climax mumu gördüm, tepede alıcı olmak istemem.":""}${A.capit&&!isL?" Kapitülasyon mumu var, dipte satmam.":""}`);
  const cap=liqDist(20)*0.6; const pump=isL?c24>15:c24<-15; const fundBad=isL?A.fund>0.001:A.fund<-0.001;
  let veto=null; if(sd>cap) veto=`oynaklık 20x stopuna sığmıyor (${fx(sd*100,1)}%)`; else if(pump) veto=`24 saatte ${pct(c24)}: kovalama`; else if(fundBad) veto=`fonlama aşırı (${fx(A.fund*100,3)}%)`;
  const b200=opts.btc200?btc200Rel():null; if(!veto&&b200!=null&&(isL?b200<0:b200>0)){ veto=`Arda: BTC günlük 200 ortalamanın ${b200<0?"altında":"üstünde"} (${pct(b200*100)}), ${D} yok`; say("macro","açılış",`BTC 200 günlük ortalamanın ${b200<0?"altında":"üstünde"} (${pct(b200*100)}). Bu rejimde ${D} açmıyoruz; 6 aylık testte kapı iki yarıda da kaybı azalttı.`); }
  const lf=opts.lf; if(!veto&&lf){ const b24=isL&&lf.longBtc24Max!=null?btc24Of(A):null;
    if(b24!=null&&b24>lf.longBtc24Max){ veto=`kayıp süzgeci: BTC 24 saatte ${pct(b24*100)}, long yok`; say("risk","açılış",`BTC son 24 saatte ${pct(b24*100)}. BTC yükselirken açtığımız longlar 2020'den beri −0,16R yazdı, düştüğü günlerdeki longlar −0,08R; long için BTC'nin geri çekilmesini bekliyoruz.`); }
    if(!veto&&lf.r7dMin!=null){ const r7=r7dOf(A); if(r7!=null&&sg*r7<lf.r7dMin){ veto=`kayıp süzgeci: 7 günlük trend karşı (${pct(r7*100)})`; say("risk","açılış",`Coin 7 günde ${pct(r7*100)}; ${D} bu trende karşı. Geçmişte bu kararlar −0,15R yazdı, girmiyoruz.`); } } }
  let rv=veto?-1:0.6; if(!veto){ if(isL&&A.distrib) rv-=0.4; if(!isL&&A.accum) rv-=0.4; if(isL?A.fund>0.0005:A.fund<-0.0005) rv-=0.2; if(isL&&A.climax) rv-=0.2; if(!isL&&A.capit) rv-=0.2; }
  if(typeof AUD!=="undefined"&&AUD&&AUD.summary){ const S=AUD.summary; say("audit","açılış",`Kayıtta ${S.n} kapanmış işlem: kazanma %${Math.round(S.wr*100)}, ortalama ${S.avg>=0?"+":""}${fx(S.avg,2)}R.${AUD.lessons.length?" Çıkardığımız dersler: "+AUD.lessons.map(l=>l.t.toLowerCase()).join(", ")+".":" Henüz kesin bir ders yok."} Tartışmada kurulumu bunlarla karşılaştıracağım.`); }
  set("risk",rv,0.8,veto?"VETO: "+veto:`stop ${fx(sd*100,2)}% · 20x'e sığar · fonlama ${fx(A.fund*100,4)}%`);
  say("risk","açılış",veto?`Daha dinlemeden söyleyeyim: ${veto}. Bu masadan ${D} çıkmaz.`:`Stop ${fx(sd*100,2)}% ile 20x'e sığıyor, likidasyon uzak. Boyu risk yüzdesinden hesaplarım. Önce sizi dinleyeyim.`);
  /* ---- 2. tur: tartışma (oyları gerçekten değiştirir) ---- */
  let runR=3; const chg=[];
  if(!veto){
    if(ag.copy.v<-0.4&&ag.liq.v>0.5){ say("copy","tartışma","Kerem, liderlerin çoğu ters yönde; süpürme ikinci kez de gelebilir, güvenini biraz kıs."); ag.liq.c=Math.max(0,ag.liq.c-0.1); chg.push("liq"); }
    if(ag.copy.v>0.5&&ag.mom.v>0){ say("mom","tartışma","Liderler de bizim tarafta; boyu tam tutarım."); ag.mom.v=Math.min(1,ag.mom.v+0.1); chg.push("mom"); }
    if(ag.macro.v<-0.3&&ag.mom.v>0.3){ say("macro","tartışma",`Baran, BTC ${isL?"düşerken":"yükselirken"} momentum kovalamak son 15 günde en çok kaybettiren şey. Oyunu kıs.`); if(A.volRel>=1.8){ ag.mom.v-=0.1; say("mom","tartışma",`Hacim ×${fx(A.volRel,1)}, bu coin BTC'yi dinlemiyor. Biraz kısıyorum ama tutuyorum.`); } else { ag.mom.v-=0.3; say("mom","tartışma","Haklısın, hacim de sıradan. Oyumu düşürüyorum."); } chg.push("mom"); }
    if(ag.trend.v<-0.3&&ag.liq.v>0.5){ say("trend","tartışma","Kerem, süpürme güzel ama günlük yön karşı. Karşı-trend işlemde hedef kısa tutulur."); ag.liq.c-=0.2; runR=2; say("liq","tartışma","Kabul: süpürme + MSS karşı trendde de çalışır ama koşucuyu 2R'de keselim, güvenimi düşürüyorum."); chg.push("liq"); }
    else if(ag.trend.v>0.3&&ag.liq.v>0.5){ say("liq","tartışma","Trend de bizimle; süpürme trend yönünde olunca en iyi örnekler bunlar."); ag.liq.c=Math.min(1,ag.liq.c+0.1); chg.push("liq"); }
    if(ag.liq.v>0.5&&ag.flow.v<0){ say("flow","tartışma","Kerem, süpürmede emilim yok: CVD fiyatla birlikte dip yaptı. Satış gerçek olabilir, fiyat yeniden süpürebilir."); ag.liq.v-=0.2; say("liq","tartışma","Teyit zayıfsa ikinci süpürme riski var, oyumu bir kademe düşürüyorum."); chg.push("liq"); }
    if(bad&&LM.f.yer==="kova"&&ag.mom.v>0.3){ say("lab","tartışma",`Baran, liderler bu konumda kovaladığında ortalama ${fx(bad.mean,2)} ATR alıyor${isFinite(bad.lift)?`, tabanlarından ${fx(Math.abs(bad.lift),2)} ATR kötü`:""}. Fiyat 24 saatlik aralığın ucunda.`); ag.mom.v-=0.25; say("mom","tartışma","Veri bunu söylüyorsa oyumu kısıyorum."); chg.push("mom"); }
    if(best&&LM.f.sw==="var"&&ag.liq.v>0.5){ say("lab","tartışma","Kerem, liderlerin kazanan işlemleri de süpürmeden sonra geliyor; senin okumanı destekliyor."); ag.liq.c=Math.min(1,ag.liq.c+0.1); chg.push("liq"); }
    if(best&&best.conds.some(c=>c[0]==="btc")&&ag.macro.v>0){ say("macro","tartışma","Burak'ın adayı BTC yönüne bağlı; BTC tarafı da bizimle, güvenimi artırıyorum."); ag.macro.c=Math.min(1,ag.macro.c+0.1); chg.push("macro"); }
    if(n>=3&&sum<0){ say("quant","tartışma",`Bu coinde K3 geçmişi ${fx(sum,1)}R, yani eksi. Herkesin güvenini %15 kısıyorum; kanıtsız yere kalite A demeyelim.`); for(const k in ag) if(k!=="risk") ag[k].c*=0.85; chg.push("all"); }
    const sdMin=AUD&&AUD.sdMin>0.015?AUD.sdMin:0.015;
    if(sd<sdMin){ if(sdMin>0.015) say("audit","tartışma",`Kayıplarımızın çoğu gürültü stopu: fiyat lehimize gitmeden 45 dakikada stop oluyoruz. Stop tabanı %${fx(sdMin*100,1)}, boy ona göre küçülsün.`); else say("quant","tartışma",`Stop ${fx(sd*100,2)}% dar; testte %1,5 altı stoplar eksiydi. Stopu %1,5 tabanına çekelim, boy ona göre küçülür.`); sd=sdMin; say("risk","tartışma",`Tamam, stop %${fx(sdMin*100,1)}; pozisyon boyu buna göre.`); }
  }
  /* ---- hacim analisti (volume.js) ve strateji doğrulayıcı (tfcheck.js): son stopla (tartışmadan sonra) ---- */
  const vm=volMember(A,dir), tm=tfMember(A,dir,{r,lv:ag.liq.v,q,sd,costR:(BOT_CFG_DEF.feeTaker*2+BOT_CFG_DEF.slip)/sd});
  set("vol",vm.v,vm.c,vm.txt); say("vol","açılış",vm.say); set("check",tm.v,tm.c,tm.txt); say("check","açılış",tm.say);
  // faktör analisti Kaan (factors.js): araştırma ekibinin ölçülmüş kurallarından oy; izlemedeki faktörler yalnız kayda geçer
  const fm=facMember(A,dir,{now:opts.now}); set("fac",fm.v,fm.c,fm.txt); say("fac","açılış",fm.say);
  // sıralama modeli Ozan (rankmodel.js): coinin önümüzdeki 4/12 saatte evrendeki yeri; tahmin defterinde kanıtlanana kadar gölge oy (yazılır, puana girmez)
  const rk=typeof rkMember==='function'?rkMember(A,dir,{sym,now:opts.now}):{v:0,c:0,abst:true,idle:true,txt:"model yok",say:"Model yüklü değil, çekimserim."}; set("rank",rk.v,rk.c,rk.txt); say("rank","açılış",rk.say);
  // 24 saatlik long (#47): BTC 24 saatte yükseldiyse ya da Ozan coini en kötü onlukta görüyorsa long yok
  const l24=isL&&opts.l24?opts.l24:null; if(!veto&&l24){ const b24=l24.btc24Max!=null?btc24Of(A):null;
    if(b24!=null&&b24>l24.btc24Max){ veto=`24 saatlik long: BTC 24 saatte ${pct(b24*100)}, long yok`; say("risk","açılış",`BTC son 24 saatte ${pct(b24*100)}. 24 saat tutulan longlar arşivde yalnız BTC düşmüşken artıda kaldı (+0,03R, yükselirken −0,12R); bekliyoruz.`); }
    else if(l24.rankMin!=null&&isFinite(rk.p)&&rk.p<l24.rankMin){ veto=`24 saatlik long: Ozan coini evrenin en kötü %${Math.round(l24.rankMin*100)}'unda görüyor`; say("rank","tartışma",`Bu coin önümüzdeki saatlerde en zayıf onlukta (%${Math.round(rk.p*100)}). Arşivde bu dilimdeki longlar 24 saatte −0,14R yazdı; vetomu uyguluyorum.`); } }
  if(!veto&&tm.issues.length>=3&&ag.liq.v>0.5){ say("check","tartışma","Kerem, kurulumun üç şartı tutmuyor; bu kitaptaki süpürme değil. Güvenini kıs."); ag.liq.c=Math.max(0,ag.liq.c-0.2); chg.push("liq"); }
  /* ---- denetçi: kurulumu kapanmış işlemlerden çıkan derslerle karşılaştırır ---- */
  const au=audVoteFor(ag); ag.audit={id:"audit",v:au.v,c:au.c,txt:au.txt};
  // tahmin defteri (forecast.js): masanın evet dediği, sonradan tabandan kötü çıkan kalıplar
  const fcv=typeof fcVoteFor==='function'?fcVoteFor(dir,{pool:r&&r.pool?r.pool.name:null,kz:r&&r.kz,stage:r?r.stage:null,trend:A.trend}):{hits:[]};
  if(fcv.hits.length){ ag.audit.v=Math.min(ag.audit.v,fcv.v); ag.audit.c=Math.max(ag.audit.c,fcv.c); ag.audit.txt=(au.hits.length?ag.audit.txt+" · ":"")+"tahmin defteri: "+fcv.txt; au.w=Math.max(au.w||0,1); if(!veto) say("audit","tartışma",`Tahmin defterine göre bu kalıp tutmuyor: ${fcv.txt}. Oyum karşı.`); }
  if(!veto&&au.w){ if(au.hits.length){ say("audit","tartışma",`Bu kurulum daha önce kaybettiğimiz kalıba benziyor: ${au.txt}. ${au.veto?"Bu ders kesinleşti, veto istiyorum.":"Oyum karşı."}`); if(au.veto){ veto=`denetçi: ${AUD_TAGS[au.veto].t.toLowerCase()} kalıbı ${AUD.tags[au.veto].n} işlemde ort. ${fx(AUD.tags[au.veto].avg,2)}R`; say("risk","tartışma","Murat'ın kaydı açık, aynı hatayı tekrar etmiyoruz."); } }
    else say("audit","tartışma",`Kayıtlı hatalardan hiçbirine benzemiyor.${AUD.clean?` Temiz kurulumlarımız ${AUD.clean.n} işlemde ort. ${fx(AUD.clean.avg,2)}R.`:""}`); }
  /* ---- puan ---- */
  // Burak'ın elinde eşleşen aday ya da kaçınılacak kalıp yoksa çekimserdir: ağırlığı 0, puanı sulandırmaz
  const labIdle=!best&&!bad;
  // çekimserler: verisi olmayan üye puana girmez, ortalamayı sulandırmaz (Tolga: lider verisi yok; Burak: eşleşen kalıp yok; Onur: coinde K3 kanıtı yok; Arda: BTC verisi yok; Murat: kayıt yok)
  const abst={copy:!cs||!(((cs[dir]||{}).w||0)+((cs[isL?"short":"long"]||{}).w||0)>0),lab:labIdle,quant:n<3,macro:!B,audit:!au.w,vol:!!vm.abst,check:!!tm.abst,fac:!!fm.abst,rank:!!rk.abst};
  const pre=DESK.map(d=>{ const a=ag[d.id]; const m=clamp((AUD&&AUD.mult[d.id]?AUD.mult[d.id].m:1)*(typeof fcMult==='function'?fcMult(d.id):1),0.5,1.5); return {id:d.id,name:d.name,role:d.role,v:a.v,c:a.c,txt:a.txt,abst:!!abst[d.id],base:d.id==="audit"?(au.w?d.w:0):d.w,m,idle:d.id==="rank"&&!!rk.idle,shadow:d.id==="rank"&&!!rk.shadow}; });
  /* ---- 3. tur: ikna turu (fon toplantısı): tez, karşı tez, sonra kararsızlar en ikna edici argümana göre oyunu günceller ---- */
  const T=comTally(pre,opts);
  if(!veto) comTalkLines(T,D).forEach(x=>say(x.id,x.stage,x.text));
  const agents=T.L.map(a=>({id:a.id,k:a.name+" · "+a.role.split(" ")[0],name:a.name,role:a.role,w:a.w,v:+a.v.toFixed(2),v0:+a.v0.toFixed(2),c:+a.c.toFixed(2),abst:a.abst,txt:a.txt,...(a.idle?{idle:true}:{}),...(a.shadow?{shadow:true}:{})}));
  let num=0,den=0,yes=T.yes,no=T.no; for(const a of agents){ num+=a.w*a.v*a.c; den+=a.w; }
  let score=den?num/den:0;
  if(!veto&&score>=opts.threshold-0.04&&score<opts.threshold&&yes>=opts.minYes&&ag.mom.v>0&&!abst.mom){ say("mom","ikna",`Eşiğin dibindeyiz (${pts(score)}), ${yes} evet var. Ben küçük boyla girerim; fırsatı kaçırmayalım.`); const m=agents.find(a=>a.id==="mom"); m.v=+Math.min(1,m.v+0.15).toFixed(2); num=0; for(const a of agents) num+=a.w*a.v*a.c; score=num/den; }
  // yerel dil modeli (llm.js): yalnız ayarda açık ve tahmin defterinde becerisi kanıtlanmışsa (llmWeight > 0) küçük ağırlıkla puana girer
  const LV=typeof lmdVote==='function'&&sym?lmdVote(sym,dir,"giris"):null; if(LV&&LV.w>0){ score=(score*den+LV.w*LV.v*LV.c)/(den+LV.w); say("risk","ikna",`Yapay zekâ masası ${LV.act} diyor (oy ${LV.v>0?"+":""}${fx(LV.v,2)}, ağırlık ${fx(LV.w,2)}): ${LV.why}`); }
  score=+score.toFixed(3);
  /* ---- 4. tur: karar ---- */
  const px=A.px; const holdH=best&&isFinite(best.hold)&&best.sw>0?clamp(Math.round(best.hold*1.5),2,12):null;
  const gl=agents.find(a=>a.id==="liq"), gf=agents.find(a=>a.id==="flow"); const swp=!!(gl&&!gl.abst&&gl.v>0.3), ofk=!!(gf&&!gf.abst&&gf.v>0); const grade=score>=opts.threshold+0.15&&swp&&ofk?"A":(swp||ofk)?"B":"C"; // goal.js aşama 2 ile aynı not
  const cf=typeof deskConf==="function"?deskConf({score,yes},opts.threshold,opts.minYes,grade,{confSpan:opts.confSpan}):null; const conf=cf?+cf.conf.toFixed(2):0; // masanın güveni (puan payı × not): risk tabanla tavan arasında bu oranda (goal.js aşama 3)
  const sdP=sd*(opts.stopMult||1); const h24=!!l24; const plan=veto?null:{holdH:h24?l24.holdH:holdH,h24,conf,grade,entry:px,sd:sdP,sd0:sd,lev:levFor(sdP,BOT_CFG_DEF.lev),stop:isL?px*(1-sdP):px*(1+sdP),t1:isL?px*(1+1.5*sdP):px*(1-1.5*sdP),t2:isL?px*(1+runR*sdP):px*(1-runR*sdP),rr1:1.5,rr2:runR};
  const go=!veto&&score>=opts.threshold&&yes>=opts.minYes;
  const decision=veto?"veto":go?"giriş":score>=opts.threshold?"oy eksik":"bekle";
  say("risk","karar",veto?`Karar: veto. ${veto}.`:go?`Karar: ${D} giriş. Puan ${ptsT(score)}, ${yes}/${T.nAct} evet. Market ${fmtP(px)}, stop ${fmtP(plan.stop)} (${fx(sdP*100,2)}%${opts.stopMult>1?`, gürültünün ötesinde: hesaplanan stopun ${opts.stopMult} katı, boy o kadar küçük`:""}), 1,5R'de yarısı ${fmtP(plan.t1)} ve stop girişe, kalan ${runR}R ${fmtP(plan.t2)}. Zaman stopu ${holdH?holdH+" saat (Burak: liderlerin medyan tutuşu × 1,5)":"8 saat"}. Boy: masanın güveni %${Math.round(conf*100)} (puan eşiğin ${pts(score-opts.threshold)} üstünde, not ${grade}); risk tabandan tavana bu oranda, ${plan.lev}x.`:score>=opts.threshold?`Puan ${ptsT(score)} eşiği geçiyor ama ${yes} evet var, ${opts.minYes} gerekli. Bekliyoruz.`:`Puan ${ptsT(score)}, eşik ${pts(opts.threshold)}. Masa ikna olmadı, bekliyoruz.`);
  // ham girdiler: karar günlüğünde (headless JSONL) sonradan analiz için
  const r4=v=>isFinite(v)?+(+v).toFixed(4):null;
  const feat={px:A.px,c24:r4(c24),trend:A.trend,trendScore:A.trendScore,st:A.st,stage:r?r.stage:null,grade:r?r.grade:null,kz:r&&r.kz||null,pool:r&&r.pool?r.pool.name:null,poolW:r&&r.pool?r.pool.w:null,rsOk:!!(q&&q.rsOk),rsStage:q?q.stage:null,
    of,tk30:r4(A.tk30),oiCase:A.oiCase||null,oiBloat:!!A.oiBloat,noTaker:!!A.noTaker,btc:B?{ch4:r4(B.ch4),ch24:r4(B.ch24),bias:B.bias,agree:!!B.agree,ok:!!B.ok,dump:!!B.dump}:null,fund:r4(A.fund),crowd:crowd||null,
    ldV:r4(cv),ldN:cs?((cs.long&&cs.long.n)||0)+((cs.short&&cs.short.n)||0):0,k3n:n,k3sum:r4(sum),atrRel:r4(atrRel),sd:r4(sd),costR:r4(costR),wind:A.score,volRel:r4(A.volRel),climax:!!A.climax,capit:!!A.capit,distrib:!!A.distrib,accum:!!A.accum,runR,lab:best?best.key:null,labAvoid:bad?bad.key:null,
    fac:Object.fromEntries(Object.entries(fm.f).map(([id,x])=>[id,r4(x.v*x.c)]))}; // her faktörün görüşü (oy × güven): tahmin defteri "f:<id>" olarak puanlar
  return {dir,score,yes,no,n:T.nAct,veto,agents,talk,plan,decision,changed:chg,feat,pre:opts.raw?pre:undefined};
}
/* ---------- Açık pozisyon toplantısı: on üç üye elde tutulan pozisyonu kendi verisiyle yorumlar (7 Ekim 2026) ----------
   Önceden masa açık pozisyonu yeni girişmiş gibi oylardı (Kerem "süpürme yok" der, Can girişteki vetolarını uygulardı) ve yalnız sekiz üye konuşurdu.
   Şimdi her üye pozisyonun durumunu da bilir (R, en iyi gidiş, süre, hedef/stop, likidasyon) ve bir görüş verir: v = pozisyonu tutmaya destek (−1…+1),
   c = güven, eylem = tut / kâr al / stop sık / azalt / çık. Verisi olmayan çekimserdir. Tutma puanı = Σ w·v·c / Σ w (oy verenler);
   w = üyenin katsayısı × tahmin defterinde pozisyon görüşlerinin becerisi ("p:<id>", forecast.js fcPosNote).
   Karar: çık (ters yön giriş ve tutma < 0, ya da tutma ≤ −0,35, ya da "çık" diyenler ağırlığın ≥ %35'i ve tutma < 0) · azalt (ters yön giriş ya da tutma < −0,15) ·
   tut (tutma ≥ 0,10) · aksi halde tut, stop sık. "Kâr al" diyenler ağırlığın ≥ %40'ı ve pozisyon ≥ 0,8R kârdaysa yarısı alınır, stop girişe.
   Sınırlar: stop yalnız sıkılır, zarardaki pozisyona ekleme yok (ekleme yalnız hedef 1'den sonra, bir kez). */
const PD_CFG={exit:-0.35,reduce:-0.15,hold:0.1,exitShare:0.35,tpShare:0.4,tpMinR:0.8};
const PD_ACT={"tut":0,"kâr al":1,"stop sık":2,"azalt":3,"çık":4};
function positionReview(A, pos, orders, c24, opts){
  const dir=pos.dir; const isL=dir==="long"; const sg=isL?1:-1; c24=isFinite(c24)?c24:0;
  const o2=Object.assign({},opts,{l24:false}); const c=committee(A,dir,c24,o2); const opp=committee(A,isL?"short":"long",c24,o2); // pozisyon toplantısı giriş süzgecine bakmaz
  const kb=A.src&&A.src.k15L; const atr=kb&&kb.length>20?atrAt(kb,kb.length):A.med15*A.px; const atrRel=atr/A.px;
  const px=A.px; const pnlPct=(isL?(px/pos.entry-1):(1-px/pos.entry))*100; const liqAtr=pos.liq>0?Math.abs(px-pos.liq)/atr:NaN;
  const so=(orders||[]).filter(o=>o.sym===pos.sym&&(o.ro||o.cp)); const hasStop=so.some(o=>/STOP/.test(o.type))||pos.stop>0; const hasTp=so.some(o=>/TAKE_PROFIT/.test(o.type)||(o.px>0&&!/STOP/.test(o.type)))||pos.t1>0;
  const sd=Math.max(0.012,1.2*atrRel); const r=A.amd&&A.amd[dir];
  let stopLv=isL?px*(1-sd):px*(1+sd), stopWhy="1,2 ATR arkası";
  if(r&&isFinite(r.stop)&&(isL?r.stop<px:r.stop>px)){ const d=Math.abs(px-r.stop)/atr; if(d>=0.6&&d<=3){ stopLv=r.stop; stopWhy="süpürme ucunun arkası"; } }
  const sup=isL?(A.S&&A.S[0]):(A.R&&A.R[0]); if(sup&&Math.abs(px-sup)/atr<=3&&Math.abs(px-sup)/atr>=0.6){ const lv=isL?sup*(1-0.0025):sup*(1+0.0025); if(isL?lv>stopLv:lv<stopLv){ stopLv=lv; stopWhy="en yakın "+(isL?"desteğin altı":"direncin üstü"); } }
  const risk=Math.abs(pos.entry-stopLv); const tp1=isL?pos.entry+1.5*risk:pos.entry-1.5*risk, tp2=isL?pos.entry+3*risk:pos.entry-3*risk;
  const be=isL?pos.entry*(1+0.0013):pos.entry*(1-0.0013);
  // pozisyonun durumu (bot pozisyonunda tam, Masaya sor / hesapta kısmen bilinir)
  const r0=pos.risk0||(pos.stop0>0?Math.abs(pos.entry-pos.stop0):0)||(pos.stop>0?Math.abs(pos.entry-pos.stop):0)||risk;
  const rNow=r0>0?sg*(px-pos.entry)/r0:0; const ext=isL?(pos.hi||px):(pos.lo||px); const peakR=r0>0?Math.max(rNow,sg*(ext-pos.entry)/r0):rNow;
  const now=(opts&&opts.now)||Date.now(); const held=pos.openT?(now-pos.openT)/3600e3:0; const holdH=pos.holdH||BOT_CFG_DEF.holdH; const tf=held/holdH;
  const f2=v=>(v>=0?"+":"")+fx(v,2);
  const g=id=>c.agents.find(a=>a.id===id)||{v:0,c:0,abst:true,txt:""}, go=id=>opp.agents.find(a=>a.id===id)||{v:0,c:0,abst:true,txt:""};
  const st=a=>a.v>0.15?"destekliyor":a.v<-0.15?"karşı":"kararsız";
  const V={}; const put=(id,v,cf,act,txt,abst)=>{ V[id]={v:clamp(v,-1,1),c:clamp(cf,0,1),act,txt,abst:!!abst}; };
  // Emre: günlük yön ve 1 sa yapı hâlâ pozisyonun tarafında mı
  const t=g("trend"); put("trend",t.v,t.c,t.v<-0.3?"azalt":"tut",t.v<-0.3?`trend pozisyona karşı döndü (${t.txt})`:t.v>0.3?`trend hâlâ bizimle (${t.txt})`:`trend nötr (${t.txt})`);
  // Kerem: karşı yönde süpürme kurulumu var mı, karşı seviye hemen önümüzde mi
  const ol=go("liq"); const oppSetup=!ol.abst&&ol.v>0.6; const lvl=isL?(A.R&&A.R[0]):(A.S&&A.S[0]); const lvlAtr=lvl>0?sg*(lvl-px)/atr:NaN; const nearLv=isFinite(lvlAtr)&&lvlAtr>0&&lvlAtr<0.5&&rNow>=0.5;
  put("liq",oppSetup?-0.7:nearLv?-0.1:0.25,oppSetup?0.8:nearLv?0.6:0.4,oppSetup?"çık":nearLv?"kâr al":"tut",
    oppSetup?`ters yönde süpürme kurulumu oluştu: ${ol.txt}`:nearLv?`${isL?"direnç":"destek"} ${fmtP(lvl)} ${fx(lvlAtr,2)} ATR önümüzde; fiyat oradan dönebilir, kârın bir kısmını alalım`:`ters yönde süpürme yok${lvl>0&&lvlAtr>0?`; önümüzdeki ${isL?"direnç":"destek"} ${fmtP(lvl)} (${fx(lvlAtr,1)} ATR)`:""}; doğal stop ${stopWhy} (${fmtP(stopLv)})`);
  // Mert: akış
  const fl=g("flow"); put("flow",fl.v,fl.c,fl.v<-0.3?"azalt":"tut",`akış ${st(fl)}: ${fl.txt}`);
  // Arda: BTC rejimi
  const mc=g("macro"); const B=A.btcReg&&A.btcReg[dir]; put("macro",mc.v,mc.c,B&&B.dump?"çık":mc.v<-0.3?"azalt":"tut",B&&B.dump?`BTC sert ters gidiyor (${mc.txt}); altcoin pozisyonu bunu taşıyamaz`:`${st(mc)}: ${mc.txt}${opp.decision==="giriş"?"; masa ters yöne giriş diyor, pozisyon rüzgâra karşı":""}`,mc.abst);
  // Onur: süre, maliyet, başabaş
  const slow=tf>=0.75&&rNow<0.3, mid=tf>=0.5&&rNow<0;
  put("quant",slow?-0.5:mid?-0.25:0.1,0.6,slow?"azalt":"tut",`${held?fx(held,1)+" / "+holdH+" saat, ":""}${f2(rNow)}R${peakR>rNow+0.05?` (en iyi ${f2(peakR)}R)`:""}; başabaş ${fmtP(be)}, 1,5R ${fmtP(tp1)}, 3R ${fmtP(tp2)}${slow?"; süre dolmak üzere ve hareket gelmedi, zaman maliyeti var":mid?"; sürenin yarısı geçti, hâlâ zararda":""}`);
  // Baran: momentum ve kârı geri verme
  const mo=g("mom"); const give=peakR>=1&&peakR-rNow>=0.5;
  put("mom",give?Math.min(mo.v,-0.2):mo.v,mo.c,give?"kâr al":mo.v<-0.4?"azalt":"tut",give?`${fx(peakR,1)}R görüp ${fx(rNow,1)}R'ye geri geldi; ${mo.v<0?"momentum söndü, ":""}kârın yarısını alalım`:`${st(mo)}: ${mo.txt}${rNow>0&&mo.v>0.3?"; hareket sürüyor, kârı erken kesme":""}`);
  // Tolga: liderler bu coinde hangi tarafta
  const cp=g("copy"); put("copy",cp.v,cp.c,cp.v<-0.4?"azalt":"tut",cp.abst?`lider verisi yok, çekimserim`:`liderler ${cp.v>0.3?"bizim tarafta":cp.v<-0.3?"ters tarafta":"bölünmüş"}: ${cp.txt}`,cp.abst);
  // Burak: liderlerin geçmişinden aday; tutuşu aşıldı mı
  const lb=g("lab"); const labOver=pos.holdH&&pos.labHold&&held>pos.holdH;
  put("lab",labOver?-0.3:lb.v,labOver?0.6:lb.c,labOver?"kâr al":lb.v<-0.3?"azalt":"tut",labOver?`adayın tutuşu (${fx(pos.holdH,1)} sa) aşıldı; liderler bu noktada çıkıyor`:lb.txt,lb.abst&&!labOver);
  // Murat: kayıttaki dersler (kârı geri verme, gürültü stopu)
  const AU=(typeof AUD!=="undefined"&&AUD)?AUD:null; const lock=AU&&AU.lockEarly&&rNow>=1;
  put("audit",lock?-0.1:0.1,lock?0.6:0.3,lock?"kâr al":"tut",lock?`kayıtta "kârı geri verdi" dersi var (${AU.tags.giveback?AU.tags.giveback.n:0} işlem); 1R'yi geçtik, yarısını alalım`:AU&&AU.summary?`kayıttaki hatalardan hiçbirine şu an benzemiyor`:`kayıt yok, çekimserim`,!lock&&!(AU&&AU.summary));
  // Serkan, Yusuf, Kaan: kendi okumaları pozisyon yönünde
  for(const id of ["vol","check","fac","rank"]){ const a=g(id); put(id,a.v,a.c,a.v<-0.4?"azalt":"tut",`${st(a)}: ${a.txt}`,a.abst); if(a.shadow) V[id].sh=true; }
  // Can: likidasyon uzaklığı, stop/hedef emri; tutma puanını o toplar
  const liqBad=isFinite(liqAtr)&&liqAtr<1.5; put("risk",liqBad?-0.5:0.2,liqBad?0.9:0.5,liqBad?"azalt":"tut",liqBad?`likidasyon ${fx(liqAtr,1)} ATR uzakta, boyu küçültelim`:`${isFinite(liqAtr)?`likidasyon ${fx(liqAtr,1)} ATR uzakta, `:""}${hasStop?"stop yerinde":"stop emri yok"}`);
  // tutma puanı ve eylem payları
  const mul=id=>clamp(typeof fcMult==='function'?fcMult("p:"+id):1,0.5,1.5);
  const views=DESK.map(d=>{ const x=V[d.id]; const w=x.abst?0:+(d.w*mul(d.id)).toFixed(3); return {id:d.id,name:d.name,role:d.role,v:+x.v.toFixed(2),c:+x.c.toFixed(2),w,act:x.act,txt:x.txt,abst:x.abst,...(x.sh?{sh:true}:{})}; });
  const LP=typeof lmdVote==='function'&&pos.sym?lmdVote(pos.sym,dir,"pozisyon"):null; if(LP&&LP.w>0) views.push({id:"llm",name:"Yapay zekâ",role:"Yerel dil modeli",v:+LP.v.toFixed(2),c:+LP.c.toFixed(2),w:LP.w,act:LP.act,txt:LP.why,abst:false});
  let num=0,den=0; const share={}; for(const x of views){ if(!x.w) continue; num+=x.w*x.v*x.c; den+=x.w; share[x.act]=(share[x.act]||0)+x.w; } for(const k in share) share[k]=den?share[k]/den:0;
  const hold=den?+(num/den).toFixed(3):0; const exitShare=share["çık"]||0, tpShare=share["kâr al"]||0;
  let verdict; if((opp.decision==="giriş"&&hold<0)||hold<=PD_CFG.exit||(exitShare>=PD_CFG.exitShare&&hold<0)) verdict="çık"; else if(opp.decision==="giriş"||hold<PD_CFG.reduce) verdict="azalt"; else if(hold>=PD_CFG.hold) verdict="tut"; else verdict="tut, stop sık";
  if(liqBad&&verdict==="tut") verdict="tut, stop sık";
  const takeProfit=tpShare>=PD_CFG.tpShare&&rNow>=PD_CFG.tpMinR&&verdict!=="çık";
  const lines=[]; const nameOf=id=>(DESK.find(x=>x.id===id)||{}).name;
  for(const x of views){ if(x.id==="risk") continue; lines.push({who:x.name,role:x.role,id:x.id,act:x.act,text:`${x.abst?"Çekimser":x.act==="tut"?"Tut":x.act.charAt(0).toUpperCase()+x.act.slice(1)}: ${x.txt}.`}); }
  const canParts=[`tutma puanı ${pts(hold)} (${views.filter(x=>x.w&&x.v>0.15).length} destek, ${views.filter(x=>x.w&&x.v<-0.15).length} karşı, ${views.filter(x=>!x.w).length} çekimser)`];
  if(isFinite(liqAtr)) canParts.push(liqBad?`likidasyon ${fx(liqAtr,1)} ATR uzakta, tehlikeli: boyu küçült, teminat ekleme`:liqAtr<3?`likidasyon ${fx(liqAtr,1)} ATR uzakta, tek dalga yeter`:`likidasyon ${fx(liqAtr,1)} ATR uzakta`);
  canParts.push(hasStop?"stop emri var":`stop emri YOK; ${fmtP(stopLv)} (${stopWhy}) koy`);
  if(takeProfit) canParts.push(`kâr al diyenler ağırlığın %${Math.round(tpShare*100)}'i (${views.filter(x=>x.w&&x.act==="kâr al").map(x=>x.name).join(", ")}): yarısını al, stop girişe`);
  else if(pnlPct>=1.5*risk/pos.entry*100&&!hasTp) canParts.push("1,5R geçildi: yarısını al, stopu girişe çek");
  else if(pnlPct>0&&!hasTp) canParts.push(`hedef ${fmtP(tp1)} için emir yok`);
  if(verdict==="çık") canParts.push(exitShare>=PD_CFG.exitShare?`çık diyenler: ${views.filter(x=>x.w&&x.act==="çık").map(x=>x.name).join(", ")}`:"masa karşı yöne dönmüş: çık"); else if(verdict==="azalt") canParts.push("masa ikna değil: boyu azalt"); else canParts.push("tut");
  lines.push({who:nameOf("risk"),role:"Baş trader · risk",id:"risk",act:verdict,text:`Karar: ${verdict.toUpperCase()}. ${canParts.join(" · ")}.`});
  return {verdict,score:c.score,hold,oppScore:opp.score,oppDecision:opp.decision,agents:c.agents,views,share,tpShare,exitShare,takeProfit,lines,stopLv,stopWhy,tp1,tp2,be,liqAtr,pnlPct,rNow:+rNow.toFixed(3),peakR:+peakR.toFixed(3),held:+held.toFixed(2),hasStop,hasTp,atrRel,t:Date.now()};
}
// bot pozisyonunun durumu positionReview için (ui.js botManage ve headless/bot.js manage ortak)
const posCtx=(p,liq)=>({sym:p.sym,dir:p.dir,entry:p.entry,liq,stop:p.stop,t1:p.t1,t2:p.t2,stop0:p.stop0,risk0:p.risk0,hi:p.hi,lo:p.lo,openT:p.openT,stage:p.stage,holdH:p.expiresAt&&p.openT?+((p.expiresAt-p.openT)/3600e3).toFixed(2):null,labHold:!!p.labHold});
/* masanın açık pozisyon kararından botun eylemi (ui.js ve headless ortak): exit · reduce (bir kez yarısı) · time (süre doldu, masa ikna değil) ·
   lock (kâr al: üyelerin %40'ı ya da 1R görüp 0,5R geri verme) · add (hedef 1'den sonra, kârda, bir kez yarım boy) · none */
function posAct(p, rv, o){
  const rNow=rv.rNow, peakR=rv.peakR, held=rv.held; const mom=(rv.views&&rv.views.find(x=>x.id==="mom")||{v:0}).v;
  if(p.h24) return "none"; // 24 saatlik long: yalnız stop ve zaman çıkışı (test #47)
  if(rv.verdict==="çık") return "exit";
  if(rv.verdict==="azalt"&&!p.reduced) return "reduce";
  if(held>Math.max(2,o.medHold*1.5)&&rNow>-0.3&&rNow<0.5&&rv.hold<PD_CFG.hold) return "time";
  if(p.stage==="open"&&!p.locked&&(rv.takeProfit||(peakR>=1&&peakR-rNow>=0.5&&(mom<0||o.lockEarly)))) return "lock";
  if(p.stage==="tp1"&&!p.added&&rv.verdict==="tut"&&rNow>0&&mom>0.3&&rv.score>=o.thr+0.1) return "add";
  return "none";
}
/* ---------- Masaya sor: kullanıcının elle girdiği plan ya da açık işlem (hesap bağlamadan) ----------
   t = {sym, dir, entry, liq?, tp?, sl?, margin:"cross"|"isolated", lev, open:bool, size? (teminat $), bal? (bakiye $)}.
   Plan: masa committee() ile o yönde oylar → GİR / BEKLE / GİRME. Açık: positionReview() → DEVAM ET / AZALT / ÇIK.
   Üstüne risk notları: R oranı, komisyon R'si, stop ATR'si, likidasyon uzaklığı, stop likidasyondan önce mi, botun kurallarıyla kıyas. */
function askDesk(A, t, c24, opts){
  const dir=t.dir==="short"?"short":"long"; const isL=dir==="long"; const sg=isL?1:-1; const px=A.px; c24=isFinite(c24)?c24:0;
  const entry=+t.entry>0?+t.entry:px; const lev=clamp(Math.round(+t.lev||BOT_CFG_DEF.lev),1,125); const iso=t.margin==="isolated";
  const sl=+t.sl>0?+t.sl:NaN, tp=+t.tp>0?+t.tp:NaN; const size=+t.size>0?+t.size:NaN, bal=+t.bal>0?+t.bal:NaN;
  const kb=A.src&&A.src.k15L&&A.src.k15L.length>20?A.src.k15L:(A.src&&A.src.k15); const atr=kb&&kb.length>20?atrAt(kb,kb.length):(A.med15||0.01)*px;
  const liqGiven=+t.liq>0; const liq=liqGiven?+t.liq:(isL?entry*(1-liqDist(lev)):entry*(1+liqDist(lev)));
  const pc=v=>"%"+fx(v*100,2); const red=[], warn=[], ok=[]; const fee=BOT_CFG_DEF.feeTaker*2+BOT_CFG_DEF.slip;
  if(isFinite(sl)&&(isL?sl>=entry:sl<=entry)){ red.push(`Stop girişin yanlış tarafında (${isL?"long için girişin altında":"short için girişin üstünde"} olmalı).`); }
  if(isFinite(tp)&&(isL?tp<=entry:tp>=entry)){ red.push(`Hedef girişin yanlış tarafında (${isL?"long için girişin üstünde":"short için girişin altında"} olmalı).`); }
  const slOk=isFinite(sl)&&!(isL?sl>=entry:sl<=entry), tpOk=isFinite(tp)&&!(isL?tp<=entry:tp>=entry);
  const stopPct=slOk?Math.abs(entry-sl)/entry:NaN, slAtr=slOk?Math.abs(entry-sl)/atr:NaN;
  const rr=slOk&&tpOk?Math.abs(tp-entry)/Math.abs(entry-sl):NaN; const costR=slOk?fee/stopPct:NaN;
  const liqPct=Math.abs(px-liq)/px, liqAtr=Math.abs(px-liq)/atr; const liqEntryPct=Math.abs(entry-liq)/entry;
  const liqPassed=isL?px<=liq:px>=liq;
  // stop likidasyondan önce gelmeli; arada en az 0,5 ATR pay olmalı (likidasyon fiyatı mark ile hesaplanır, fitil kayabilir)
  let slLiqAtr=NaN; if(slOk){ slLiqAtr=sg*(sl-liq)/atr; if(slLiqAtr<=0) red.push(`Likidasyon (${fmtP(liq)}) stoptan (${fmtP(sl)}) önce geliyor: stop hiç çalışmaz, pozisyon likide olur. Kaldıracı düşür ya da stopu ${fmtP(isL?liq+0.5*atr:liq-0.5*atr)} ${isL?"üstüne":"altına"} çek.`); else if(slLiqAtr<0.5) warn.push(`Stop ile likidasyon arasında yalnızca ${fx(slLiqAtr,2)} ATR var; sert bir fitil stopu atlayıp likidasyona gidebilir.`); }
  else if(!isFinite(sl)) warn.push(`Stop yok. Bu kaldıraçta tek koruma likidasyon (${fmtP(liq)}, girişten ${pc(liqEntryPct)} uzakta).`);
  if(t.open&&liqPassed) red.push("Girilen likidasyon fiyatı şu anki fiyatın ötesinde; değerleri kontrol et.");
  else if(liqAtr<1.5) red.push(`Likidasyon şu anki fiyattan ${fx(liqAtr,1)} ATR (${pc(liqPct)}) uzakta; sıradan bir 15 dk mumu yeter.`);
  else if(liqAtr<3) warn.push(`Likidasyon ${fx(liqAtr,1)} ATR uzakta; tek dalga yeter.`);
  if(slOk){
    if(stopPct<RS_CFG.floorStop) warn.push(`Stop %${fx(stopPct*100,2)}: testte %1,5 altı stoplar eksiydi (gürültü stopu); komisyon+kayma ${fx(costR,2)}R yer.`);
    else ok.push(`Stop %${fx(stopPct*100,2)}, %1,5 tabanının üstünde.`);
    if(slAtr<RS_CFG.stopAtr) warn.push(`Stop ${fx(slAtr,2)} ATR: 15 dk oynaklığının içinde, gürültüyle patlar.`);
    else if(slAtr>RS_CFG.maxStopAtr) warn.push(`Stop ${fx(slAtr,1)} ATR: bot 3 ATR'den geniş stopla girmez; boy küçük kalır, hedef uzak.`);
    else ok.push(`Stop ${fx(slAtr,2)} ATR, botun 0,8–3 ATR aralığında.`);
    if(t.open&&(isL?px<=sl:px>=sl)) red.push(`Fiyat (${fmtP(px)}) stopun ötesinde; stop emri çalışmadıysa pozisyon korumasız.`);
  }
  if(isFinite(rr)){ if(rr<1) red.push(`Ödül/risk ${fx(rr,2)}R: hedef stoptan yakın; komisyonla birlikte uzun vadede kaybettirir.`); else if(rr<1.5) warn.push(`Ödül/risk ${fx(rr,2)}R; bot en az 1,5R ister.`); else ok.push(`Ödül/risk ${fx(rr,2)}R (komisyon sonrası ≈ ${fx(rr-costR,2)}R).`);
    if(t.open&&(isL?px>=tp:px<=tp)) warn.push("Fiyat hedefi geçmiş; hedef emri dolmadıysa kârı al ya da stopu girişe çek."); }
  else if(!isFinite(tp)) warn.push("Hedef yok; bot 1,5R'de yarısını alıp stopu girişe çeker.");
  if(lev>BOT_CFG_DEF.maxLev) warn.push(`${lev}x botun üst sınırı ${BOT_CFG_DEF.maxLev}x'in üstünde; likidasyon girişten ${pc(liqDist(lev))} uzakta.`);
  if(!iso) warn.push(liqGiven?"Cross: likidasyon fiyatı cüzdandaki diğer pozisyonlarla ve bakiyeyle kayar; zarar tüm bakiyeye yayılır.":"Cross: likidasyonu girmedin, izole varsayımıyla tahmin edildi; gerçek değer bakiyeye göre daha uzak olabilir ama zarar tüm bakiyeye yayılır.");
  else if(!liqGiven) warn.push(`Likidasyon girilmedi; ${lev}x izole için tahmin ${fmtP(liq)}.`);
  let notional=NaN, lossUsd=NaN, riskPct=NaN; if(isFinite(size)){ notional=size*lev; if(slOk){ lossUsd=notional*(stopPct+fee); if(isFinite(bal)){ riskPct=lossUsd/bal; if(riskPct>BOT_CFG_DEF.risk*1.5) red.push(`Stop olursa ${fx(lossUsd,2)} $ gider, bakiyenin yüzde ${fx(riskPct*100,1)} kadarı; bot işlem başına yüzde ${fx(BOT_CFG_DEF.risk*100,0)} riske eder.`); else if(riskPct>BOT_CFG_DEF.risk) warn.push(`Stop olursa bakiyenin yüzde ${fx(riskPct*100,1)} kadarı gider; bot yüzde ${fx(BOT_CFG_DEF.risk*100,0)} ile sınırlar.`); else ok.push(`Stop olursa bakiyenin yüzde ${fx(riskPct*100,1)} kadarı gider (bot sınırı yüzde ${fx(BOT_CFG_DEF.risk*100,0)}).`); } } }
  const roeSl=slOk?-(stopPct+fee)*lev*100:NaN, roeTp=tpOk?(Math.abs(tp-entry)/entry-fee)*lev*100:NaN;
  const pnlPct=sg*(px/entry-1)*100; const be=isL?entry*(1+fee):entry*(1-fee);
  /* ---- masa ---- */
  let verdict, kind, score, oppScore, oppDecision, agents, talk, lines, deskStop, deskStopWhy, deskT1, deskT2, decision, veto=null, yes=null;
  if(t.open){
    const orders=[]; if(slOk) orders.push({sym:t.sym,ro:true,type:"STOP_MARKET",stop:sl}); if(tpOk) orders.push({sym:t.sym,ro:true,type:"TAKE_PROFIT_MARKET",px:tp});
    const rv=positionReview(A,{sym:t.sym,dir,entry,liq},orders,c24,opts);
    score=rv.score; oppScore=rv.oppScore; oppDecision=rv.oppDecision; agents=rv.agents; lines=rv.lines; talk=null; deskStop=rv.stopLv; deskStopWhy=rv.stopWhy; deskT1=rv.tp1; deskT2=rv.tp2; decision=rv.verdict;
    const VM={"tut":"DEVAM ET","tut, stop sık":"DEVAM ET · STOPU SIK","azalt":"AZALT","çık":"ÇIK"}; verdict=VM[rv.verdict]||"DEVAM ET"; kind=rv.verdict==="çık"?"down":rv.verdict==="tut"?"up":"warn";
    if(slOk&&(isL?px<=sl:px>=sl)){ verdict="ÇIK"; kind="down"; }
    else if(kind==="up"&&red.length){ verdict="DEVAM ET · ÖNCE DÜZELT"; kind="warn"; }
  } else {
    const c=committee(A,dir,c24,opts), opp=committee(A,isL?"short":"long",c24,opts);
    score=c.score; oppScore=opp.score; oppDecision=opp.decision; agents=c.agents; talk=c.talk; lines=null; decision=c.decision; veto=c.veto; yes=c.yes;
    if(c.plan){ deskStop=c.plan.stop; deskT1=c.plan.t1; deskT2=c.plan.t2; deskStopWhy=`%${fx(c.plan.sd*100,2)} uzakta: 1,2 ATR, en az %1,5`; }
    if(c.veto||oppDecision==="giriş"||c.score<0||red.length){ verdict="GİRME"; kind="down"; }
    else if(c.decision==="giriş"){ verdict=warn.length>2?"GİR · PLANI DÜZELT":"GİR"; kind=warn.length>2?"warn":"up"; }
    else { verdict="BEKLE"; kind="warn"; }
  }
  // Can'ın özeti: masanın kararı + kullanıcının planına bakış
  const why=[]; if(t.open){ why.push(decision==="çık"?"masa ters yöne dönmüş":decision==="azalt"?"masa ikna değil":decision==="tut"?"masa hâlâ bu yönde":"masa kararsız, stop sıkılsın"); }
  else { why.push(veto?`veto: ${veto}`:decision==="giriş"?`masa ${dir} için giriş diyor (puan ${ptsT(score)}, ${yes}/${DESK.length} evet)`:decision==="oy eksik"?`puan eşikte ama ${yes} evet var`:`puan ${ptsT(score)}, eşik ${pts(COM_DEF.threshold)}`); if(oppDecision==="giriş") why.push("masa ters yöne giriş diyor"); }
  if(red.length) why.push(red.length+" kırmızı risk notu");
  const canSay=`${verdict}. ${why.join(" · ")}.${isFinite(deskStop)?` Benim stopum ${fmtP(deskStop)} (${deskStopWhy})${slOk?`, seninki ${fmtP(sl)}`:""}.`:""}`;
  return {sym:t.sym,dir,open:!!t.open,verdict,kind,canSay,score,oppScore,oppDecision,decision,veto,yes,agents,talk,lines,red,warn,ok,
    px,entry,sl:slOk?sl:NaN,tp:tpOk?tp:NaN,lev,iso,liq,liqGiven,liqPct,liqAtr,slLiqAtr,stopPct,slAtr,rr,costR,roeSl,roeTp,pnlPct,roeNow:pnlPct*lev,be,atrPct:atr/px*100,notional,lossUsd,riskPct,deskStop,deskStopWhy,deskT1,deskT2,c24,t:Date.now()};
}
/* ---------- Kâğıt pozisyon için tek fiyat adımı (ui.js botOnPrice ve headless/ ortak) ----------
   p.hi/p.lo, p.stage ve p.stop'u günceller; uygulanacak kapanışları sırayla döndürür: {part,price,k,t,taker,final} ya da {k:"move",t}.
   İz süren stop ilk riskle (p.risk0) ölçülür: hedef 1'den sonra stop girişe çekildiği için |giriş−stop| sıfır olur, onunla ölçmek stopu tepeye yapıştırır. */
/* Kayma ölçümü (10 Ekim 2026, arastirma/dongu/2026-10-10-r-kaldiraclari.md test C): market dolumda o anki bookTicker yarı makası (kesir) ve
   işlem fiyatının orta fiyattan uzaklığı; kâğıt botun %0,03 kayma varsayımını gerçek defterle kıyaslamak için işlem kaydına yazılır. */
const bookHalf=b=>b&&b.a>0&&b.b>0&&b.a>=b.b?+((b.a-b.b)/(b.a+b.b)).toFixed(6):null;
const bookRec=(b,px)=>{ const hs=bookHalf(b); if(hs==null) return null; const mid=(b.a+b.b)/2; return {hs,dm:px>0?+((px-mid)/mid).toFixed(6):null}; };
function paperStep(p, px, now, cfg){
  const isL=p.dir==="long"; const out=[]; p.hi=Math.max(p.hi,px); p.lo=Math.min(p.lo,px);
  const risk=p.risk0||Math.abs(p.entry-(p.stop0||p.stop));
  if(isL? px<=p.stop : px>=p.stop){ out.push({part:1,price:isL?p.stop*(1-cfg.slip):p.stop*(1+cfg.slip),k:"stop",t:p.stage==="open"?"Stop":"Kalan stop",taker:true,final:true}); return out; }
  if(p.h24){ if(p.expiresAt && now>p.expiresAt) out.push({part:1,price:isL?px*(1-cfg.slip):px*(1+cfg.slip),k:"time",t:"24 saat doldu",taker:true,final:true}); return out; } // hedefsiz 24 saatlik long
  // erken kısmi kâr (varsayılan kapalı): hedef 1'den önce preR'de prePart kadarı kapanır, stop yerinde kalır
  if(cfg.preR>0&&p.stage==="open"&&!p.preDone&&risk>0&&(isL?px-p.entry:p.entry-px)>=cfg.preR*risk){ p.preDone=true; out.push({part:cfg.prePart||0.3,price:isL?p.entry+cfg.preR*risk:p.entry-cfg.preR*risk,k:"pre",t:`Erken kâr ${fx(cfg.preR,2)}R`,taker:false}); return out; }
  if(p.stage==="open" && (isL? px>=p.t1 : px<=p.t1)){ if(p.t1Part>=1){ out.push({part:1,price:p.t1,k:"tp1",t:"Hedef 1 (tamamı: 200 $ hedefi)",taker:false,final:true}); return out; }
    out.push({part:p.t1Part||0.5,price:p.t1,k:"tp1",t:"Hedef 1",taker:false}); p.stage="tp1"; if(isL? p.entry>p.stop : p.entry<p.stop) p.stop=p.entry; out.push({k:"move",t:`Stop girişe çekildi (${fmtP(p.entry)}).`}); return out; }
  if(p.stage==="tp1"){ if(p.t2 && (isL? px>=p.t2 : px<=p.t2)){ out.push({part:0.6,price:p.t2,k:"tp2",t:"Hedef 2",taker:false}); p.stage="tp2"; }
    const trail = isL ? p.hi-1*risk : p.lo+1*risk; if(isL? trail>p.stop : trail<p.stop){ p.stop=trail; } }
  if(p.stage==="tp2"){ const trail = isL ? p.hi-0.7*risk : p.lo+0.7*risk; if(isL? trail>p.stop : trail<p.stop) p.stop=trail; }
  if(p.expiresAt && now>p.expiresAt){ out.push({part:1,price:isL?px*(1-cfg.slip):px*(1+cfg.slip),k:"time",t:"Zaman stopu",taker:true,final:true}); }
  return out;
}
