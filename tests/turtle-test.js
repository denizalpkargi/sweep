// Kaplumbağa sepeti (src/turtle.js) birim testi: giriş, kapanış stopu, 10 günlük dip çıkışı, felaket stopu, BTC süzgeci, en çok pozisyon.
// Arşiv varsa (tests/data/arch) canlı fonksiyonlarla 2020-06'dan bugüne tekrar oynatır ve araştırmayla (research-daily-wide.js) kıyaslar: --replay
const path=require('path'), fs=require('fs');
const {loadEngine}=require('./engine-node.js');
const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const errors=[]; const ok=(c,m)=>{ if(!c){ errors.push(m); console.log('HATA',m); } };
const DAY=864e5, T0=Date.UTC(2026,0,1);
const bar=(i,o,h,l,c)=>({t:T0+i*DAY,o,h,l,c,q:1e6});
// BTC: 260 gün yükselen → SMA200 üstünde
const btc=[]; for(let i=0;i<260;i++){ const c=100+i*0.5; btc.push(bar(i,c,c+1,c-1,c)); }
const btcDown=btc.map((b,i)=>({...b,c:200-i*0.5,o:200-i*0.5,h:201-i*0.5,l:199-i*0.5}));
// coin: 30 gün yatay (99–101), sonra 31. gün 105 kapanış (kırılım)
function coin(n){ const a=[]; for(let i=0;i<n;i++) a.push(bar(i,100,101,99,100)); return a; }
const A=coin(260-1); A.push(bar(259,100,106,99.5,105));
let s=E.ttNew({}); let px={X:105,BTCUSDT:230};
let ev=E.ttClose(s,{BTCUSDT:btc,X:A},['X'],px,T0+260*DAY);
ok(ev.length===1&&ev[0].type==='entry'&&s.pos.X,'kırılımda giriş');
const p=s.pos.X; ok(p&&Math.abs(p.e-105*(1+s.cfg.slip))<1e-9,'giriş fiyatı mark + kayma');
ok(p&&Math.abs(p.qty*p.e - Math.min(s.cfg.risk*100/p.risk0,s.cfg.lev*100))<1e-6,'boy: %0,5 risk / risk0, 2x sınırı');
ok(p&&p.stop<p.e&&p.cat<p.stop,'stop ve felaket sırası');
// BTC süzgeci: aşağıda giriş yok
let s2=E.ttNew({}); ev=E.ttClose(s2,{BTCUSDT:btcDown,X:A},['X'],px,T0+260*DAY); ok(!s2.pos.X&&ev.length===0,'BTC SMA200 altında giriş yok');
// evrende olmayan coin girmez
let s3=E.ttNew({}); E.ttClose(s3,{BTCUSDT:btc,X:A},[],px,T0+260*DAY); ok(!s3.pos.X,'evren dışı coin girmez');
// giriş günü kapanışında (aynı mum) çıkış kontrolü yok; ertesi gün kapanış stopu
const A2=A.concat([bar(260,105,105.5,104,104.5)]); E.ttClose(s,{BTCUSDT:btc,X:A2},['X'],{X:104.5},T0+261*DAY); ok(s.pos.X&&s.pos.X.age===1,'giriş günü kapanışında pozisyon sürer');
const A3=A2.concat([bar(261,104,104,90,p.stop-0.01)]); ev=E.ttClose(s,{BTCUSDT:btc,X:A3},['X'],{X:p.stop-0.5},T0+262*DAY);
ok(!s.pos.X&&s.trades.length===1&&/kapanış stopu/.test(s.trades[0].why),'kapanış stopu ertesi fiyattan');
ok(s.trades[0].R<-0.9&&s.trades[0].R>-1.4,'stop R ≈ −1 (maliyet dahil): '+s.trades[0].R);
// 10 günlük dip çıkışı (stop altına inmeden)
let s4=E.ttNew({stopN:6,catN:8}); E.ttClose(s4,{BTCUSDT:btc,X:A},['X'],px,T0+260*DAY);
const B=A.concat([bar(260,105,106,104,105.5),bar(261,105.5,106,98.5,98.6)]); ev=E.ttClose(s4,{BTCUSDT:btc,X:B},['X'],{X:98.6},T0+262*DAY);
ok(!s4.pos.X&&/dibin altında/.test(s4.trades[0].why),'10 günlük dibin altında kapanış → çık');
// felaket stopu gün içi
let s5=E.ttNew({}); E.ttClose(s5,{BTCUSDT:btc,X:A},['X'],px,T0+260*DAY); const cat=s5.pos.X.cat;
ev=E.ttIntraday(s5,'X',{o:104,l:cat-1},T0+260.5*DAY); ok(ev&&!s5.pos.X&&/felaket/.test(s5.trades[0].why),'felaket stopu');
ok(Math.abs(s5.trades[0].x-cat*(1-s5.cfg.slip))<1e-9,'felaket dolumu stop fiyatından (açılış üstündeyken)');
// en çok pozisyon
let s6=E.ttNew({maxPos:2}); const data={BTCUSDT:btc}; const syms=['A','B','C']; for(const k of syms) data[k]=A; E.ttClose(s6,data,syms,{A:105,B:105,C:105},T0+260*DAY);
ok(Object.keys(s6.pos).length===2,'en çok pozisyon sınırı');
// oynaklıkla boy (test #50): nominal = volTv × bakiye ÷ σ60
const Av=A.map((b,i)=>i<259?{...b,c:100+(i%2?1:-1)}:b); let s7=E.ttNew({size:'vol',volTv:0.04}); E.ttClose(s7,{BTCUSDT:btc,X:Av},['X'],px,T0+260*DAY);
{ const v=E.ttVol(Av,Av.length-1,60), q=s7.pos.X; ok(q&&v>0&&Math.abs(q.qty*q.e-Math.min(0.04*100/v,2*100))<1e-6,'oynaklıkla boy'); }
// TradFi listesi
ok(E.TT_TRADFI.has('NVDAUSDT')&&E.TT_TRADFI.has('XAUTUSDT')&&!E.TT_TRADFI.has('BTCUSDT'),'TradFi listesi');

if(process.argv.includes('--replay')){
  const ARCH=path.join(__dirname,'data','arch'); if(!fs.existsSync(path.join(ARCH,'universe.json'))){ console.log('arşiv yok, tekrar oynatma atlandı'); }
  else {
    const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const TOP=50;
    const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)))];
    const D={}; for(const sym of syms){ const f=path.join(ARCH,'1d',sym+'.csv'); if(!fs.existsSync(f)) continue; D[sym]=fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); }
    const idx={}; for(const k in D) idx[k]=new Map(D[k].map((b,i)=>[b.t,i]));
    const t0=Date.UTC(2020,5,1), t1=D.BTCUSDT[D.BTCUSDT.length-1].t;
    function replay(cfg){
    const s=E.ttNew(Object.assign({fee:0.0005,slip:0.0003},cfg)); let peak=100, mdd=0; const daily=[]; let prev=100;
    for(let t=t0;t<t1;t+=DAY){
      // gün içi felaket (bugünün mumu), sonra gün kapanışı; işlemler ertesi günün açılışından
      for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) E.ttIntraday(s,k,D[k][i],t); }
      const m=new Date(t).toISOString().slice(0,7); const univ=(U[m]||[]).slice(0,TOP).filter(k=>idx[k]&&idx[k].has(t));
      const need=new Set([...univ,...Object.keys(s.pos),'BTCUSDT']); const data={}, px={};
      for(const k of need){ const i=idx[k]&&idx[k].get(t); if(i==null||i<130) continue; data[k]=D[k].slice(Math.max(0,i-215),i+1); const nx=D[k][i+1]; if(nx) px[k]=nx.o; }
      // veri biten (delist) pozisyon: son kapanışta çık
      for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null&&i===D[k].length-1) E.ttExit(s,k,D[k][i].c,'listeden çıktı',t); }
      E.ttClose(s,data,univ,px,t+DAY);
      for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) s.pos[k].px=D[k][i].c; }
      const eq=E.ttEq(s,null); peak=Math.max(peak,eq); mdd=Math.max(mdd,1-eq/peak); daily.push({t,eq,r:eq/prev-1}); prev=eq;
    }
    const tr=s.trades, n=tr.length, R=tr.reduce((a,x)=>a+x.R,0)/n, mid=(t0+t1)/2;
    const h=f=>{ const a=tr.filter(f); return a.length?(a.reduce((x,y)=>x+y.R,0)/a.length).toFixed(2):'–'; };
    const yrs=(t1-t0)/365/DAY, eq=E.ttEq(s,null);
    const st=(f)=>{ const d=daily.filter(f); if(d.length<30) return {}; const g=d.reduce((a,x)=>a*(1+x.r),1), m=d.reduce((a,x)=>a+x.r,0)/d.length, sd=Math.sqrt(d.reduce((a,x)=>a+(x.r-m)**2,0)/d.length);
      let pk=1,q=1,dd=0; for(const x of d){ q*=1+x.r; pk=Math.max(pk,q); dd=Math.max(dd,1-q/pk); } return {cagr:Math.pow(g,365/d.length)-1,sh:m/sd*Math.sqrt(365),dd}; };
    const by={}; for(const x of daily){ const y=new Date(x.t).getUTCFullYear(); by[y]=(by[y]||1)*(1+x.r); }
    const gross=[]; // ortalama açık nominal / özkaynak (tahmini, işlem kayıtlarından değil): atlandı
    return {n,R,h1:h(x=>x.t<mid),h2:h(x=>x.t>=mid),l24:h(x=>x.t>=t1-730*DAY),eq,cagr:Math.pow(eq/100,1/yrs)-1,mdd,all:st(()=>true),a:st(x=>x.t<mid),b:st(x=>x.t>=mid),l:st(x=>x.t>=t1-730*DAY),by};
    }
    const pc=x=>Number.isFinite(x)?(x>=0?'+':'')+(100*x).toFixed(0)+'%':'–', fx=x=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(2):'–';
    const V=process.argv.includes('--variants')?[['bugünkü (risk %0,5 ÷ 2N)',{}],['oynaklık 0,03',{size:'vol',volTv:0.03}],['oynaklık 0,04',{size:'vol',volTv:0.04}],['oynaklık 0,06',{size:'vol',volTv:0.06}],['bugünkü, risk %0,75',{risk:0.0075}]]:[['bugünkü',{}]];
    const Y=[2020,2021,2022,2023,2024,2025,2026]; const L=['| Boy | İşlem | Ort. R | R yarılar | R son 24 ay | Yıllık | Sharpe | En büyük düşüş | Calmar | 1. yarı yıllık / Sharpe / düşüş | 2. yarı yıllık / Sharpe / düşüş | Son 24 ay yıllık / Sharpe / düşüş |','|---|---|---|---|---|---|---|---|---|---|---|---|'], LY=['| Boy | '+Y.join(' | ')+' |','|---|'+'---|'.repeat(Y.length)];
    for(const [nm,cfg] of V){ const r=replay(cfg);
      console.log(`tekrar oynatma (canlı kod) ${nm}: ${r.n} işlem, ort. ${r.R.toFixed(2)}R, 1. yarı ${r.h1}, 2. yarı ${r.h2}, son 24 ay ${r.l24}, 100 $ → ${r.eq.toFixed(0)} $, yıllık %${(r.cagr*100).toFixed(0)}, en büyük düşüş %${(r.mdd*100).toFixed(0)}, Sharpe ${fx(r.all.sh)}`);
      L.push(`| ${nm} | ${r.n} | ${fx(r.R)} | ${r.h1} / ${r.h2} | ${r.l24} | ${pc(r.cagr)} | ${fx(r.all.sh)} | −${(100*r.mdd).toFixed(0)}% | ${fx(r.cagr/r.mdd)} | ${pc(r.a.cagr)} / ${fx(r.a.sh)} / −${(100*r.a.dd).toFixed(0)}% | ${pc(r.b.cagr)} / ${fx(r.b.sh)} / −${(100*r.b.dd).toFixed(0)}% | ${pc(r.l.cagr)} / ${fx(r.l.sh)} / −${(100*r.l.dd).toFixed(0)}% |`);
      LY.push(`| ${nm} | `+Y.map(y=>pc(r.by[y]-1)).join(' | ')+' |'); }
    if(process.argv.includes('--variants')) fs.writeFileSync(path.join(__dirname,'test50-kaplumbaga-boy-report.md'),['# Test #50 · Kaplumbağa sepeti: oynaklıkla boy (canlı kod, arşiv)',`Evren her ay hacimce ilk ${TOP} (TradFi hariç, delist dahil), 2020-06 → ${new Date(t1).toISOString().slice(0,10)}, en çok 10 pozisyon, nominal ≤ 2x, maliyet taker %0,05 + kayma %0,03 + fonlama. "oynaklık x": nominal = x × özkaynak ÷ σ60 (yıllık); 0,04 ≈ bugünkü ortalama boy. Stoplar ve çıkışlar aynı; R her işlemde 2N stopa göre.`,'',...L,'','## Yıl yıl','',...LY].join('\n')+'\n');
    console.log('araştırma (research-daily-wide.js, %0,5/10/2x): 801 işlem, +0,94R, yarılar +1,52 / +0,54, son 24 ay +0,36, yıllık +%25, düşüş −%31');
  }
}
console.log('turtle-test errors',JSON.stringify(errors));
if(errors.length) process.exitCode=1;
