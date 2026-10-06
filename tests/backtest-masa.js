// Masa geriye dönük testi: committee() geçmiş 15 dk verisinde saatte bir, her coin ve her yön için çalıştırılır.
// 1. adım (örnekler): node tests/backtest-masa.js sample  → tests/data/_masa-samples.json
//    Her örnekte üyelerin açılış + kurallı tartışma sonrası oyları (v, güven c, çekimser mi), veto, stop ve iki sonuç saklanır:
//    R  = botun planı (market giriş taker+kayma, 1,5R'de yarısı + stop girişe, 3R'de %60 + iz, 8 sa zaman stopu; paperStep ile mum mum)
//    y  = tahmin defteri ölçüsü (16 mumda önce +1 ATR = 1, önce −1 ATR = 0, süre = 0,5)
// 2. adım (uydurma): node tests/backtest-masa.js fit → ilk yarıda katsayı + eşik seçer, ikinci yarıda sınar; tests/masa-fit.json
// Geçmişte olmayan canlı veri nötr: OI (yatay), fonlama 0, büyüklerin long/short oranı 1, liderler ve araştırma ekibi yok.
// Taker oranı 15 dk mumların taker alış hacminden (alış / satış). Bu yüzden Mert'in OI kısmı, Arda'nın kalabalık kısmı, Tolga, Burak ve
// Murat geçmişte ölçülemez; katsayıları yerinde kalır (bkz. fit çıktısı "ölçülemeyen").
const fs=require('fs'), path=require('path');
const {loadEngine}=require('./engine-node.js'); const {loadData}=require('./bt-lib.js');
const OUT=path.join(__dirname,'data','_masa-samples.json'), FIT=path.join(__dirname,'masa-fit.json');
const mode=process.argv[2]||'sample'; const E=loadEngine();
const M15=9e5;
function agg(k,n){ const out=[]; for(let i=0;i<k.length;i+=n){ const g=k.slice(i,i+n); if(g.length<n) break; out.push({t:g[0].t,o:g[0].o,h:Math.max(...g.map(x=>x.h)),l:Math.min(...g.map(x=>x.l)),c:g[g.length-1].c,v:g.reduce((a,x)=>a+x.v,0),q:g.reduce((a,x)=>a+x.q,0),tb:g.reduce((a,x)=>a+x.tb,0)}); } return out; }
const ratio=c=>{ const s=c.q-c.tb; return s>0?c.tb/s:1; };
// t anında (k[i] kapanmış) analyze girdileri; bakış ileri yok
function inputsAt(k,i,d1,btc,sym){
  const now=k[i].t+M15; const px=k[i].c;
  const k15L=k.slice(i-599,i+1);
  // 1 sa ve 4 sa: saat/4 saat sınırına hizalı, son (açık) mum dahil
  let h0=i-3400; while(k[h0].t%3600e3) h0++; const h1=agg(k.slice(h0,i+1),4); const r1=(i+1-h0)%4; if(r1) h1.push(agg(k.slice(i+1-r1,i+1),r1)[0]);
  let f0=i-3400; while(k[f0].t%14400e3) f0++; const h4=agg(k.slice(f0,i+1),16); const r4=(i+1-f0)%16; if(r4) h4.push(agg(k.slice(i+1-r4,i+1),r4)[0]);
  // günlük: kapanmış günler + bugünün 15 dk'dan kurulan mumu
  const day0=Math.floor(now/864e5-1e-9)*864e5; const dd=d1.filter(x=>x.t<day0).slice(-149); let j0=i; while(j0>0&&k[j0-1].t>=day0) j0--; const today=agg(k.slice(j0,i+1),i+1-j0)[0]; if(today) dd.push(today);
  const w96=k.slice(i-95,i+1); const t24={symbol:sym,lastPrice:px,highPrice:Math.max(...w96.map(x=>x.h)),lowPrice:Math.min(...w96.map(x=>x.l)),quoteVolume:w96.reduce((a,x)=>a+x.q,0),priceChangePercent:(px/w96[0].o-1)*100};
  const k15=k.slice(i-149,i+1); const k5=[]; for(const c of k.slice(i-19,i+1)) for(let z=0;z<3;z++) k5.push({...c,q:c.q/3,v:c.v/3,tb:c.tb/3});
  const tk=k.slice(i-7,i+1).map(c=>({buySellRatio:String(ratio(c))})); const taker5=[]; for(const x of tk.slice(-2)) for(let z=0;z<3;z++) taker5.push(x);
  const last4=agg(k.slice(i-3,i+1),4)[0];
  let lo=0,hi=btc.length-1,bi=0; while(lo<=hi){ const m=(lo+hi)>>1; if(btc[m].t<=k[i].t){ bi=m; lo=m+1; } else hi=m-1; } const btc15=btc.slice(Math.max(0,bi-1499),bi+1);
  const f={t24,prem:{markPrice:px,lastFundingRate:"0",nextFundingTime:now+3600e3},k5,k15,depth:null,trades:null,taker5,oi5:[{sumOpenInterestValue:"0"}],noTaker:false,noOI:true};
  const s={k1h:h1.slice(-200),k4h:h4.slice(-200),k1d:dd,oi1h:null,taker1h:[{buySellRatio:String(ratio(last4))}],toppos:[{longShortRatio:"1"}],topacc:null,glob:[{longShortRatio:"1"}],fund:[],noCrowd:true,k15L,oi15:null,taker15:null,toppos15:null,btc15};
  return {f,s,c24:t24.priceChangePercent};
}
// botun pozisyon adımı (paperStep) mum mum: önce ters uç, sonra lehte uç, sonra kapanış
function simBot(k,i,dir,plan,cfg){
  const isL=dir==="long"; const e0=k[i].c, entry=isL?e0*(1+cfg.slip):e0*(1-cfg.slip); const sd=plan.sd;
  const stop=isL?entry*(1-sd):entry*(1+sd), risk=Math.abs(entry-stop); const p={dir,entry,stop,t1:isL?entry+1.5*risk:entry-1.5*risk,t2:isL?entry+plan.rr2*risk:entry-plan.rr2*risk,risk0:risk,stop0:stop,stage:"open",hi:entry,lo:entry,expiresAt:k[i].t+M15+(plan.holdH||cfg.holdH)*3600e3};
  let qty=1, pnl=-entry*cfg.feeTaker; const hold=(plan.holdH||cfg.holdH)*4+1;
  for(let j=i+1;j<Math.min(k.length,i+1+hold);j++){ const c=k[j]; const seq=isL?[c.l,c.h,c.c]:[c.h,c.l,c.c];
    for(let z=0;z<3;z++){ const now=z===2?c.t+M15:c.t+1; const out=E.paperStep(p,seq[z],now,cfg);
      for(const o of out){ if(o.part==null) continue; const q=o.final?qty:Math.min(qty,qty*o.part); const px=o.price; pnl+=q*(isL?px-entry:entry-px)-q*px*(o.taker?cfg.feeTaker:cfg.feeMaker); qty-=q; if(o.final||qty<=1e-9) return {R:pnl/risk,end:j,how:o.k}; } } }
  const c=k[Math.min(k.length-1,i+hold)]; pnl+=qty*(isL?c.c-entry:entry-c.c)-qty*c.c*cfg.feeTaker; return {R:pnl/risk,end:i+hold,how:"son"}; }
function fcY(k,i,dir){ const atr=E.atrAt(k,i+1,14); const px=k[i].c, isL=dir==="long"; const up=isL?px+atr:px-atr, dn=isL?px-atr:px+atr;
  for(let j=i+1;j<=i+16&&j<k.length;j++){ const c=k[j]; if(isL?c.l<=dn:c.h>=dn) return 0; if(isL?c.h>=up:c.l<=up) return 1; } return 0.5; }

if(require.main===module&&mode==='sample'){
  const step=+(process.argv[3]||4), sh=+(process.argv[4]||0), nsh=+(process.argv[5]||1); const all=loadData().filter(d=>d&&d.k15); const data=all.filter((d,i)=>i%nsh===sh); const btcD=all.find(d=>d.sym==="BTCUSDT"); const btc=E.K(btcD.k15);
  const cfg=E.BOT_CFG_DEF; const S=[]; const t0=Date.now();
  for(const d of data){ const k=E.K(d.k15), d1=E.K(d.k1d); let n=0;
    for(let i=3500;i<k.length-40;i+=step){ let inp; try{ inp=inputsAt(k,i,d1,btc,d.sym); }catch(e){ continue; }
      let A; try{ A=E.analyze(inp.f,inp.s); }catch(e){ if(!n) console.error(d.sym,e.message); continue; }
      for(const dir of ["long","short"]){ const c=E.committee(A,dir,inp.c24,{sym:d.sym,raw:true}); const pre=c.pre||c.agents;
        const plan=c.plan||{sd:c.feat.sd,rr2:c.feat.runR,holdH:null}; const sim=simBot(k,i,dir,plan,cfg);
        S.push({sym:d.sym,t:k[i].t,dir,veto:c.veto?1:0,sd:+plan.sd.toFixed(4),rr2:plan.rr2,score:c.score,yes:c.yes,dec:c.decision,
          a:Object.fromEntries(pre.map(x=>[x.id,[+(+x.v).toFixed(3),+(+x.c).toFixed(3),x.abst?1:0]])),R:+sim.R.toFixed(3),how:sim.how,y:fcY(k,i,dir),stage:c.feat.stage,kz:c.feat.kz?1:0,trend:c.feat.trend}); }
      n++; }
    console.log(d.sym,n,'örnek',((Date.now()-t0)/1000).toFixed(0)+' sn'); }
  const o=nsh>1?OUT.replace('.json','-'+sh+'.json'):OUT; fs.writeFileSync(o,JSON.stringify(S)); console.log('yazıldı',S.length,'örnek →',o);
}
if(require.main===module&&mode==='merge'){ const n=+(process.argv[3]||4); let S=[]; for(let i=0;i<n;i++){ const f=OUT.replace('.json','-'+i+'.json'); S=S.concat(JSON.parse(fs.readFileSync(f,'utf8'))); fs.unlinkSync(f); } fs.writeFileSync(OUT,JSON.stringify(S)); console.log('birleşti',S.length); }
module.exports={inputsAt,simBot,fcY};
if(require.main===module&&mode==='fit'){
  const S=JSON.parse(fs.readFileSync(OUT,'utf8')).filter(x=>!x.veto); const MEAS=["trend","liq","flow","macro","quant","mom","risk","vol","check","fac"]; const DESKB=Object.fromEntries(E.DESK.map(d=>[d.id,d.w]));
  const T=S.map(x=>x.t).sort((a,b)=>a-b), MID=T[T.length>>1], H1=S.filter(x=>x.t<MID), H2=S.filter(x=>x.t>=MID); const days=a=>{ if(!a.length) return 1; let lo=Infinity,hi=-Infinity; for(const x of a){ if(x.t<lo) lo=x.t; if(x.t>hi) hi=x.t; } return Math.max(1,(hi-lo)/864e5); };
  const xOf=(x,id)=>{ const a=x.a[id]; return !a||a[2]?0:a[0]*a[1]; };
  const corr=(a,b)=>{ const n=a.length; const ma=a.reduce((s,v)=>s+v,0)/n, mb=b.reduce((s,v)=>s+v,0)/n; let sab=0,saa=0,sbb=0; for(let i=0;i<n;i++){ sab+=(a[i]-ma)*(b[i]-mb); saa+=(a[i]-ma)**2; sbb+=(b[i]-mb)**2; } return saa&&sbb?sab/Math.sqrt(saa*sbb):0; };
  const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:NaN;
  console.log('örnek',S.length,'(veto hariç) · ilk yarı',H1.length,'· ikinci yarı',H2.length,'· gün',days(S).toFixed(0),'· taban isabet',mean(S.map(x=>x.y)).toFixed(3),'· taban R',mean(S.map(x=>x.R)).toFixed(3));
  // 1. üye başına: oy × güven ile sonuç ilişkisi (bilgi katsayısı), iki yarı
  const diag=[]; for(const id of MEAS){ const row={üye:id}; for(const [nm,H] of [["1",H1],["2",H2]]){ const xs=H.map(x=>xOf(x,id)); row['IC_y'+nm]=+corr(xs,H.map(x=>2*x.y-1)).toFixed(3); row['IC_R'+nm]=+corr(xs,H.map(x=>Math.max(-1.5,Math.min(3,x.R)))).toFixed(3); const yes=H.filter(x=>{ const a=x.a[id]; return a&&!a[2]&&a[0]>0.3; }); row['evet_n'+nm]=yes.length; row['evet_y'+nm]=+mean(yes.map(x=>x.y)).toFixed(3); row['evet_R'+nm]=+mean(yes.map(x=>x.R)).toFixed(3); } row.çekimser=+(S.filter(x=>x.a[id]&&x.a[id][2]).length/S.length).toFixed(2); diag.push(row); }
  console.table(diag);
  // 2. katsayılar: w = 1 + k · IC (IC = ilk yarıda isabet ve R ile bilgi katsayılarının ortalaması), 0,25–2 aralığı.
  //    k, ilk yarıda masa puanının sonuçla ilişkisini en yükseltecek şekilde seçilir. Onur (quant) çoğunlukla çekimser (K3 kanıtı ≥600 mum ister) → ölçülemez.
  const ICa={}; for(const r of diag) ICa[r.üye]=(r.IC_y1+r.IC_R1)/2; const FITM=MEAS.filter(id=>id!=="quant");
  const Wk=k=>{ const W={}; for(const id in DESKB) W[id]=DESKB[id]; for(const id of FITM) W[id]=+Math.max(0.25,Math.min(2,1+k*ICa[id])).toFixed(2); return W; };
  const scoreIC=(H,W,pull)=>{ const sc=[],yy=[]; for(const x of H){ const pre=E.DESK.map(d=>{ const a=x.a[d.id]||[0,0,1]; return {id:d.id,name:d.name,role:d.role,v:a[0],c:a[1],abst:!!a[2],base:d.w,m:1,txt:""}; }); sc.push(E.comTally(pre,{weights:W,pull,rounds:2}).score); yy.push((2*x.y-1+Math.max(-1.5,Math.min(3,x.R)))/2); } return corr(sc,yy); };
  const kRows=[]; for(const k of [0,10,20,40,80]){ const W=Wk(k); kRows.push({k,IC1:+scoreIC(H1,W,0.5).toFixed(4),IC2:+scoreIC(H2,W,0.5).toFixed(4),W:JSON.stringify(Object.fromEntries(FITM.map(id=>[id,W[id]])))}); }
  console.table(kRows); const kBest=[...kRows].sort((a,b)=>b.IC1-a.IC1)[0].k; const W=Wk(kBest); const b=FITM.map(id=>ICa[id]);
  console.log('seçilen k',kBest,'· ağırlıklar',JSON.stringify(W));
  // 3. eşik, asgari evet, ikna gücü: ilk yarıda seçilir; cesaret şartı: günde en az MINDAY sinyal (coin+yön başına 4 saatte bir)
  const MINDAY=+(process.argv[3]||12);
  function run(H,o){ const sig=[]; const last={}; for(const x of H){ const pre=E.DESK.map(d=>{ const a=x.a[d.id]||[0,0,1]; return {id:d.id,name:d.name,role:d.role,v:a[0],c:a[1],abst:!!a[2],base:d.w,m:1,txt:""}; });
      const t=E.comTally(pre,{weights:o.W,pull:o.pull,rounds:2}); if(!(t.score>=o.thr&&t.yes>=o.minYes)) continue; const key=x.sym+x.dir; if(last[key]&&x.t-last[key]<4*3600e3) continue; last[key]=x.t; sig.push(x); }
    return {n:sig.length,perDay:sig.length/days(H),R:mean(sig.map(x=>x.R)),y:mean(sig.map(x=>x.y)),win:mean(sig.map(x=>x.R>0?1:0)),long:sig.filter(x=>x.dir==="long").length}; }
  const grid=[]; const WS={eski:DESKB,yeni:W};
  for(const wn in WS) for(const pull of [0,0.5,1]) for(const minYes of [2,3,4]) for(let thr=0;thr<=0.6001;thr+=0.025){ const o={W:WS[wn],pull,minYes,thr:+thr.toFixed(3)}; const r1=run(H1,o); if(r1.n<30) continue; grid.push({w:wn,pull,minYes,thr:o.thr,n1:r1.n,gün1:+r1.perDay.toFixed(1),R1:+r1.R.toFixed(3),y1:+r1.y.toFixed(3),o}); }
  const okG=grid.filter(g=>g.gün1>=MINDAY); okG.sort((a,b)=>b.R1-a.R1); const best={}; for(const wn in WS) best[wn]=okG.find(g=>g.w===wn);
  const cur=run(H1,{W:DESKB,pull:0,minYes:4,thr:0.3}), cur2=run(H2,{W:DESKB,pull:0,minYes:4,thr:0.3});
  console.log('bugünkü masa (eşik 0,30, 4 evet, ikna yok): ilk yarı',JSON.stringify(cur),'· ikinci yarı',JSON.stringify(cur2));
  const rows=[]; for(const g of okG.slice(0,12)){ const r2=run(H2,g.o); rows.push({w:g.w,pull:g.pull,minYes:g.minYes,thr:g.thr,n1:g.n1,gün1:g.gün1,R1:g.R1,y1:g.y1,n2:r2.n,gün2:+r2.perDay.toFixed(1),R2:+r2.R.toFixed(3),y2:+r2.y.toFixed(3)}); }
  console.table(rows);
  const res={at:Date.now(),n:S.length,MID,minDay:MINDAY,diag,ICa,k:kBest,kRows,W,cur:{h1:cur,h2:cur2},best:{}};
  for(const wn in best){ const g=best[wn]; if(!g) continue; res.best[wn]={...g,o:undefined,pull:g.pull,minYes:g.minYes,thr:g.thr,h2:run(H2,g.o)}; }
  console.log('seçilen',JSON.stringify(res.best,null,1)); fs.writeFileSync(FIT,JSON.stringify(res,null,1));
}
