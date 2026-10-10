// 7 Ekim 2026 kâğıt işlemlerinden çıkan dersleri 6 aylık 15 dk veride sınar.
// Masa (bugünkü committee(), güncel kod) 24 coinde saatte bir iki yön için toplanır; eşiği geçen her sinyal için
// giriş bağlamı (coin ve BTC hareketi, günlük ortalamalar, 24 sa aralıkta yer, stop/ATR, saat) ve plan çeşitlerinin sonucu (sim-lib.js) saklanır.
// Sonra: (1) giriş süzgeçleri tek tek, iki yarı; (2) çıkış/stop çeşitleri; (3) portföy: aynı yönde en çok N pozisyon, düşüşte boy kısma (Kaplumbağa), %3 risk.
// Kullanım (kendi makinende; veri tests/data/*.json ya da SWEEP_DATA=<klasör>, node tests/fetch-history.js):
//   node tests/research-lessons.js all        → 4 parça paralel örnekleme + rapor (tests/data/_lessons.json, tests/lessons-report.txt)
//   node tests/research-lessons.js report     → yalnız rapor
const fs=require('fs'), path=require('path'), {spawn}=require('child_process');
const OUT=path.join(__dirname,'_lessons.json'), REP=path.join(__dirname,'lessons-report.txt');
const mode=process.argv[2]||'all';
const M15=9e5, H=36e5;
const sma=(a,n)=>a.length<n?NaN:a.slice(-n).reduce((x,y)=>x+y,0)/n;
const idx=(k,t)=>{ let lo=0,hi=k.length-1,r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(k[m].t<=t){ r=m; lo=m+1; } else hi=m-1; } return r; };

function sample(sh,nsh){
  const {loadEngine}=require('./engine-node.js'); const {loadData}=require('./bt-lib.js'); const {inputsAt}=require('./backtest-masa.js'); const {sim,VARIANTS}=require('./sim-lib.js');
  const E=loadEngine(); const all=loadData().filter(d=>d&&d.k15); const data=all.filter((d,i)=>i%nsh===sh);
  const bD=all.find(d=>d.sym==="BTCUSDT"); const btc=E.K(bD.k15), btcD=E.K(bD.k1d);
  const S=[]; const t0=Date.now();
  for(const d of data){ const k=E.K(d.k15), d1=E.K(d.k1d); let n=0;
    for(let i=3500;i<k.length-40;i+=4){ let inp; try{ inp=inputsAt(k,i,d1,btc,d.sym); }catch(e){ continue; }
      let A; try{ A=E.analyze(inp.f,inp.s); }catch(e){ continue; }
      const t=k[i].t+M15, px=k[i].c; let ctx=null;
      for(const dir of ["long","short"]){ let c; try{ c=E.committee(A,dir,inp.c24,{sym:d.sym,raw:true,lf:false}); }catch(e){ continue; }
        if(c.veto||!c.plan||c.score<0.30) continue;
        if(!ctx){ const w=k.slice(i-95,i+1), hi=Math.max(...w.map(x=>x.h)), lo=Math.min(...w.map(x=>x.l)); const dc=d1.filter(x=>x.t+864e5<=t).map(x=>x.c);
          const bi=idx(btc,k[i].t), bc=btc[bi].c, bdc=btcD.filter(x=>x.t+864e5<=t).map(x=>x.c); const a15=E.atrAt(k,i+1,14)/px;
          const v4=k.slice(i-3,i+1).reduce((a,x)=>a+x.q,0), v96=w.reduce((a,x)=>a+x.q,0)/24;
          ctx={c1:px/k[i-4].c-1,c4:px/k[i-16].c-1,c24:px/k[i-96].c-1,pos:(px-lo)/(hi-lo||1),a15,vr:v4/(v96||1),s20:px/sma(dc,20)-1,s50:px/sma(dc,50)-1,
            b4:bc/btc[bi-16].c-1,b24:bc/btc[bi-96].c-1,bs50:bc/sma(bdc,50)-1,bs200:bc/sma(bdc,200)-1,hr:new Date(t).getUTCHours(),dow:new Date(t).getUTCDay()}; }
        const sd=c.plan.sd; const V={}; for(const nm in VARIANTS){ const r=sim(k,i,dir,Object.assign({sd,bar:M15},VARIANTS[nm])); V[nm]=r.fill?[+r.R.toFixed(3),r.end]:null; }
        const a={}; for(const x of (c.agents||[])) a[x.id]=x.abst?null:+((+x.v)*(+x.c)).toFixed(2);
        S.push({sym:d.sym,t,dir,score:+c.score.toFixed(3),yes:c.yes,sd:+sd.toFixed(4),grade:c.plan.grade||null,trend:c.feat&&c.feat.trend,stage:c.feat&&c.feat.stage,kz:c.feat&&c.feat.kz?1:0,a,...ctx,V}); }
      n++; }
    console.log(d.sym,n,'mum',((Date.now()-t0)/1000).toFixed(0)+' sn'); }
  fs.writeFileSync(OUT.replace('.json','-'+sh+'.json'),JSON.stringify(S)); console.log('parça',sh,S.length,'sinyal');
}

// ---------------- rapor ----------------
function report(){
  const S=JSON.parse(fs.readFileSync(OUT,'utf8')).sort((a,b)=>a.t-b.t); const VN=Object.keys(S[0].V);
  const L=[]; const say=(...a)=>{ const s=a.join(' '); L.push(s); console.log(s); };
  const f2=x=>!isFinite(x)?'–':(x>=0?'+':'')+x.toFixed(3).replace('.',','); const pc=x=>(x*100).toFixed(0)+'%';
  const T0=S[0].t, T1=S[S.length-1].t, MID=(T0+T1)/2;
  say(`Veri: ${new Date(T0).toISOString().slice(0,10)} – ${new Date(T1).toISOString().slice(0,10)}, ${new Set(S.map(x=>x.sym)).size} coin, eşiğe yakın (puan ≥30, vetosuz) ${S.length} toplantı. Orta nokta ${new Date(MID).toISOString().slice(0,10)}.`);
  const gate=x=>x.score>=0.35&&x.yes>=3;
  // coin+yön başına 4 saatte bir (aynı kurulumun saat saat tekrarını saymamak için)
  const dedupe=arr=>{ const last={}; return arr.filter(x=>{ const k=x.sym+x.dir; if(last[k]!=null&&x.t-last[k]<4*H) return false; last[k]=x.t; return true; }); };
  const st=(arr,vn='bugünkü plan')=>{ const r=arr.map(x=>x.V[vn]).filter(Boolean).map(v=>v[0]); const h1=arr.filter(x=>x.t<MID&&x.V[vn]).map(x=>x.V[vn][0]), h2=arr.filter(x=>x.t>=MID&&x.V[vn]).map(x=>x.V[vn][0]);
    const m=a=>a.length?a.reduce((p,v)=>p+v,0)/a.length:NaN; const sdv=a=>{ const mu=m(a); return Math.sqrt(a.reduce((p,v)=>p+(v-mu)**2,0)/Math.max(1,a.length-1)); };
    return {n:r.length,avg:m(r),h1:m(h1),h2:m(h2),win:r.filter(v=>v>0).length/Math.max(1,r.length),t:m(r)/(sdv(r)/Math.sqrt(r.length||1)),nh1:h1.length,nh2:h2.length}; };
  const base=dedupe(S.filter(gate)); const B=st(base);
  say(`\n== 1. Taban: masanın bugünkü kararı (puan ≥35, ≥3 evet), coin+yön başına 4 saatte bir ==`);
  say(`${B.n} sinyal · ort. ${f2(B.avg)}R · 1. yarı ${f2(B.h1)} (${B.nh1}) · 2. yarı ${f2(B.h2)} (${B.nh2}) · kazanan ${pc(B.win)}`);
  for(const dir of ['long','short']){ const b=st(base.filter(x=>x.dir===dir)); say(`  ${dir}: ${b.n} · ${f2(b.avg)} · ${f2(b.h1)} / ${f2(b.h2)}`); }
  // süzgeçler
  const sg=x=>x.dir==='long'?1:-1;
  const F={
    "Günlük trend yönünde (masanın trend okuması)":x=>x.trend===(x.dir==='long'?'up':'down'),
    "Coin günlük SMA50'nin doğru tarafında":x=>sg(x)*x.s50>0,
    "BTC 4 sa lehte":x=>sg(x)*x.b4>0,
    "BTC 4 sa karşı değil (karşı yönde <%1)":x=>sg(x)*x.b4>-0.01,
    "BTC 24 sa lehte":x=>sg(x)*x.b24>0,
    "BTC SMA50g doğru tarafta":x=>sg(x)*x.bs50>0,
    "BTC SMA200g kapısı (Jones; long üstte, short altta)":x=>sg(x)*x.bs200>0,
    "Kovalamama: son 4 sa yönde hareket <%3":x=>sg(x)*x.c4<0.03,
    "Kovalamama: son 4 sa yönde hareket <%2":x=>sg(x)*x.c4<0.02,
    "Kovalamama: son 24 sa yönde hareket <%5":x=>sg(x)*x.c24<0.05,
    "Lider kalıbı: short >%3 düşüş sonrası değil (24 sa)":x=>x.dir==='long'||x.c24>-0.03,
    "Lider kalıbı: long hacim patlamasında aralık tepesinde değil":x=>x.dir==='short'||!(x.pos>0.8&&x.vr>2),
    "Ucuz yerden: long 24 sa aralığın alt yarısı, short üst yarısı":x=>x.dir==='long'?x.pos<0.5:x.pos>0.5,
    "Kırılımdan: long aralığın üst %20'si, short alt %20'si":x=>x.dir==='long'?x.pos>0.8:x.pos<0.2,
    "Stop ≥ 1,5 ATR (15 dk)":x=>x.sd>=1.5*x.a15,
    "Stop ≥ 2,5 ATR (15 dk)":x=>x.sd>=2.5*x.a15,
    "Puan ≥ 45":x=>x.score>=0.45,
    "Asya dışı (07–24 UTC)":x=>x.hr>=7,
    "Hafta içi":x=>x.dow>0&&x.dow<6,
    "Kerem süpürme görüyor (oy×güven >0,3)":x=>(x.a.liq??0)>0.3,
    "Emre ve Baran ikisi de evet":x=>(x.a.trend??0)>0.1&&(x.a.mom??0)>0.1,
    "Yalnız short":x=>x.dir==='short',
    "Yalnız long":x=>x.dir==='long',
  };
  say(`\n== 2. Giriş süzgeçleri (bugünkü planla; tabanla aynı sinyallerin alt kümesi) ==`);
  say(['süzgeç','n','ort. R','1. yarı','2. yarı','kazanan','fark (iki yarı)','iki yarıda da iyi'].join(' | '));
  const FR={};
  for(const nm in F){ const sub=dedupe(S.filter(x=>gate(x)&&F[nm](x))); const r=st(sub); FR[nm]=r; const ok=r.h1>B.h1&&r.h2>B.h2;
    say([nm,r.n,f2(r.avg),f2(r.h1),f2(r.h2),pc(r.win),f2(r.h1-B.h1)+' / '+f2(r.h2-B.h2),ok?'EVET':'hayır'].join(' | ')); }
  say(`\n== 3. Plan çeşitleri (taban sinyalleri) ==`); say(['çeşit','n','ort. R','1. yarı','2. yarı','kazanan','long','short'].join(' | '));
  for(const vn of VN){ const r=st(base,vn), l=st(base.filter(x=>x.dir==='long'),vn), s=st(base.filter(x=>x.dir==='short'),vn); say([vn,r.n,f2(r.avg),f2(r.h1),f2(r.h2),pc(r.win),f2(l.avg),f2(s.avg)].join(' | ')); }
  // portföy
  function port(sig,{vn='bugünkü plan',risk=0.03,maxPos=6,maxSame=99,ddCut=false,skipWin=false}={}){
    let eq=100, peak=100, dd=0, n=0; const open=[]; const lastRes={}; const rs=[];
    for(const x of sig){ const v=x.V[vn]; if(!v) continue;
      for(let z=open.length-1;z>=0;z--) if(open[z].end<=x.t){ eq+=open[z].pnl; peak=Math.max(peak,eq); dd=Math.max(dd,1-eq/peak); lastRes[open[z].k]=open[z].R; open.splice(z,1); }
      if(open.length>=maxPos||open.some(o=>o.sym===x.sym)) continue; if(open.filter(o=>o.dir===x.dir).length>=maxSame) continue;
      const key=x.sym+x.dir; if(skipWin&&lastRes[key]>0){ lastRes[key]=null; continue; }
      let r=risk; if(ddCut){ const d=1-eq/peak; r*=Math.pow(0.8,Math.floor(d/0.1)); }
      const pnl=eq*r*v[0]; open.push({sym:x.sym,dir:x.dir,end:v[1],pnl,R:v[0],k:key}); n++; rs.push(v[0]); if(eq<=1) break; }
    for(const o of open){ eq+=o.pnl; } peak=Math.max(peak,eq); dd=Math.max(dd,1-eq/peak);
    return {n,eq,dd,avg:rs.reduce((a,v)=>a+v,0)/Math.max(1,rs.length)}; }
  const allSig=S.filter(gate);
  const P=(lbl,sig,o)=>{ const h1=port(sig.filter(x=>x.t<MID),o), h2=port(sig.filter(x=>x.t>=MID),o), a=port(sig,o);
    say([lbl,a.n,f2(a.avg),a.eq.toFixed(0)+' $',pc(a.dd),h1.eq.toFixed(0)+' $ / '+h2.eq.toFixed(0)+' $'].join(' | ')); };
  say(`\n== 4. Portföy: 100 $, işlem başı %3 risk, en çok 6 pozisyon, coin başına 1 (her yarı ayrıca 100 $'dan) ==`);
  say(['kural','işlem','ort. R','son bakiye','en büyük düşüş','1. yarı / 2. yarı'].join(' | '));
  for(const m of [99,4,2,1]) P(`aynı yönde en çok ${m===99?'sınırsız (6)':m}`,allSig,{maxSame:m});
  P('aynı yönde en çok 2 + düşüşte boy kısma (her %10 → ×0,8)',allSig,{maxSame:2,ddCut:true});
  P('aynı yönde en çok 2 + Kaplumbağa: son işlem kazandıysa atla',allSig,{maxSame:2,skipWin:true});
  P('aynı yönde en çok 2, risk %1',allSig,{maxSame:2,risk:0.01});
  // en iyi süzgeçler (iki yarıda da iyi olanlar) birleşik
  const good=Object.keys(F).filter(nm=>FR[nm].h1>B.h1&&FR[nm].h2>B.h2&&FR[nm].n>=150&&!/^Yalnız/.test(nm));
  say(`\nİki yarıda da tabandan iyi ve ≥150 sinyalli süzgeçler: ${good.join('; ')||'yok'}`);
  if(good.length){ const top=good.sort((a,b)=>Math.min(FR[b].h1-B.h1,FR[b].h2-B.h2)-Math.min(FR[a].h1-B.h1,FR[a].h2-B.h2)).slice(0,3);
    for(let z=1;z<=top.length;z++){ const fs_=top.slice(0,z); const sig=allSig.filter(x=>fs_.every(nm=>F[nm](x))); const r=st(dedupe(sig)); say(`Birleşik [${fs_.join(' + ')}]: ${r.n} sinyal, ${f2(r.avg)}R, ${f2(r.h1)} / ${f2(r.h2)}`);
      for(const vn of VN){ const rv=st(dedupe(sig),vn); if(vn!=='bugünkü plan') say(`   ${vn}: ${f2(rv.avg)} (${f2(rv.h1)} / ${f2(rv.h2)})`); }
      P(`   portföy, aynı yönde 2`,sig,{maxSame:2}); }
  }
  fs.writeFileSync(REP,L.join('\n')+'\n'); console.log('\nyazıldı',REP);
}

if(mode==='sample') sample(+process.argv[3]||0,+process.argv[4]||1);
else if(mode==='report') report();
else if(mode==='all'){ const n=+process.argv[3]||4; let done=0;
  for(let s=0;s<n;s++){ const p=spawn(process.execPath,[__filename,'sample',String(s),String(n)],{stdio:'inherit'}); p.on('exit',code=>{ if(code) console.error('parça',s,'hata',code); if(++done===n){ let S=[]; for(let z=0;z<n;z++){ const f=OUT.replace('.json','-'+z+'.json'); if(fs.existsSync(f)){ S=S.concat(JSON.parse(fs.readFileSync(f,'utf8'))); fs.unlinkSync(f); } } fs.writeFileSync(OUT,JSON.stringify(S)); console.log('birleşti',S.length); report(); } }); } }
