// Test listesi #1: tam Kaplumbağa sistemi (Faith, "Way of the Turtle" kuralları), arşivin günlük mumlarıyla.
//   S1: 20 günlük kırılım, 10 günlük karşı kırılımda çık; son S1 kırılımı (alınsın alınmasın) kârlı bittiyse S1'i atla.
//   S2: 55 günlük kırılım (S1 atlandıysa da girer), 20 günlük karşı kırılımda çık.
//   N = 20 günlük ATR (Wilder). Birim = özsermayenin %1'i ÷ N (1 N hareket = %1). Stop: son birimin 2N gerisi (bütün birimler).
//   Piramit: son girişten +½N'de bir birim, coin başına en çok 4; kripto tek grup: aynı yönde toplam en çok 6 birim.
// İki uygulama:
//   gün içi (orijinal): kırılım, ekleme, stop ve çıkış seviyeleri gün içinde (boşlukta açılış). Aynı gün ekleme sonrası yeni stop
//     da görüldüyse stop sayılır (kötümser).
//   kapanış: sinyal, ekleme, stop ve kanal çıkışı gün kapanışında, işlem ertesi açılışta; gün içi 4N felaket stopu.
// Karşılaştırma: Donchian 20/10 (yalnız S1, atlama yok, piramit yok, coin başına 1 birim), aynı boyut ve maliyet.
// Ablasyon: tam − atlama, tam − piramit. Yön: long / long+short; süzgeç: yok / BTC SMA200 (long üstünde, short altında).
// Evren: 4 coin (BTC, ETH, SOL, BNB) ve geniş (her ay hacimce ilk 50, TradFi hariç, delist dahil; giriş yalnız evrendeyken).
// Maliyet: taraf başına %0,08 (taker + kayma) nominal üzerinden, fonlama arşivden günlük toplam (yoksa 3 × %0,01), long öder.
// Toplam nominal ≤ --lev × özsermaye (varsayılan 4); sığmayan birim alınmaz.
// R = işlemin $ sonucu ÷ ilk birimin riski (2N × birim = özsermayenin %2'si). Getiri basit, özsermaye günlük kapanışla.
// Kullanım: node tests/test01-tam-turtle.js [--lev 4] [--risk 0.01] → tests/test01-tam-turtle-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'); const DAY=864e5;
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const LEV=+arg('lev',4), URISK=+arg('risk',0.01), SIDE=0.0008, FDEF=0.0001;
const OUT=arg('out',path.join(__dirname,'test01-tam-turtle-report.md'));
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const mon=t=>new Date(t).toISOString().slice(0,7);
const inU={}; for(const m in U) inU[m]=new Set(U[m].slice(0,50));
const load=s=>{ const f=path.join(ARCH,'1d',s+'.csv'); if(!fs.existsSync(f)) return null;
  return fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); };
const loadF=s=>{ const f=path.join(ARCH,'funding',s+'.csv'); if(!fs.existsSync(f)) return null; const m=new Map();
  for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); const d=Math.floor(+t/DAY)*DAY; m.set(d,(m.get(d)||0)+(+r)); } return m; };
const WIDE=[...new Set(Object.values(U).flatMap(v=>v.slice(0,50)))].sort();
const FOUR=['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'];
const D={}, F={};
for(const s of new Set([...WIDE,...FOUR])){ const k=load(s); if(!k||k.length<80) continue;
  // Wilder ATR20 ve kanallar (önceki günlere göre: i günü için i−1'e kadar)
  const N=new Array(k.length).fill(NaN); let a=NaN;
  for(let i=1;i<k.length;i++){ const tr=Math.max(k[i].h-k[i].l,Math.abs(k[i].h-k[i-1].c),Math.abs(k[i].l-k[i-1].c));
    if(i<20){ a=isNaN(a)?tr:a+tr; if(i===19) a/=19; } else a=(a*19+tr)/20; if(i>=20) N[i]=a; }
  const ch=(n,f,key)=>{ const r=new Array(k.length).fill(NaN); for(let i=n;i<k.length;i++){ let m=k[i-1][key]; for(let j=i-n;j<i;j++) m=f(m,k[j][key]); r[i]=m; } return r; };
  k.N=N; k.H20=ch(20,Math.max,'h'); k.L20=ch(20,Math.min,'l'); k.H55=ch(55,Math.max,'h'); k.L55=ch(55,Math.min,'l'); k.H10=ch(10,Math.max,'h'); k.L10=ch(10,Math.min,'l');
  k.ix=new Map(k.map((b,i)=>[b.t,i])); D[s]=k; F[s]=loadF(s); }
const btc=D.BTCUSDT;
const btcAbove=t=>{ const i=btc.ix.get(t); if(i==null||i<200) return null; let s=0; for(let k=i-199;k<=i;k++) s+=btc[k].c; return btc[i].c>s/200; };
const T0=Date.UTC(2020,5,1), TEND=btc[btc.length-1].t, TMID=(T0+TEND)/2, T24=TEND-730*DAY, T12=TEND-365*DAY;

function run(cfg){
  const syms=(cfg.univ==='4'?FOUR:WIDE).filter(s=>D[s]);
  const eligible=(s,t)=>cfg.univ==='4'||(inU[mon(t)]&&inU[mon(t)].has(s));
  let cash=1; const pos={}, trk={}, trades=[]; const daily=[]; let peak=1, mdd=0;
  const units=d=>{ let n=0; for(const s in pos) if(pos[s].d===d) n+=pos[s].u.length; return n; };
  const notional=t=>{ let n=0; for(const s in pos){ const k=D[s], i=k.ix.get(t); const c=i!=null?k[i].c:pos[s].u[0].px; for(const u of pos[s].u) n+=u.q*c; } return n; };
  const equity=t=>{ let e=cash; for(const s in pos){ const k=D[s], i=k.ix.get(t); if(i==null) continue; for(const u of pos[s].u) e+=pos[s].d*u.q*(k[i].c-u.px); } return e; };
  const filtOk=(d,t)=>{ if(!cfg.filt) return true; const a=btcAbove(t-DAY); return a!=null&&(d>0?a:!a); };
  const close=(s,px,t,why)=>{ const p=pos[s]; let pnl=0; for(const u of p.u){ pnl+=p.d*u.q*(px-u.px)-SIDE*u.q*px; } cash+=pnl; p.pnl+=pnl;
    trades.push({s,d:p.d,sys:p.sys,ti:p.ti,to:t,n:p.u.length,R:p.pnl/p.r0,why}); delete pos[s]; };
  const addUnit=(s,px,t,E,N)=>{ const p=pos[s]; const q=URISK*E/N; if(notional(t)+q*px>LEV*E) return false; cash-=SIDE*q*px; p.pnl-=SIDE*q*px; p.u.push({px,q}); p.last=px; p.stop=px-p.d*2*N; p.cat=px-p.d*4*N; return true; };
  for(let t=T0-60*DAY;t<=TEND;t+=DAY){
    const live=t>=T0; let E=equity(t-DAY); if(!(E>0)) E=cash;
    for(const s in pos){ const k=D[s]; if(t>k[k.length-1].t) close(s,k[k.length-1].c,t,'veri bitti'); }
    for(const s of syms){ const k=D[s], i=k.ix.get(t); if(i==null||i<60) continue; const b=k[i], N=k.N[i-1]; if(!(N>0)) continue;
      // fonlama (günlük toplam, açık birimler önceki kapanış nominaliyle)
      if(pos[s]){ const p=pos[s], fr=F[s]&&F[s].has(t)?F[s].get(t):FDEF*3; let nom=0; for(const u of p.u) nom+=u.q*k[i-1].c; const f=p.d*fr*nom; cash-=f; p.pnl-=f; }
      // kapanış uygulaması: dün kapanışta verilen kararlar bugün açılışta
      if(cfg.mode==='close'){
        const p=pos[s];
        if(p&&p.pend==='exit'){ close(s,b.o,t,p.why); }
        else if(p&&p.pend==='add'){ p.pend=null; addUnit(s,b.o,t,E,p.N); }
        if(!pos[s]&&trk[s]&&trk[s].pend){ const g=trk[s].pend; trk[s].pend=null;
          if(live&&eligible(s,t)&&units(g.d)<6){ const q=URISK*E/g.N; if(notional(t)+q*b.o<=LEV*E){ pos[s]={d:g.d,sys:g.sys,u:[],ti:t,pnl:0,r0:2*URISK*E,N:g.N}; addUnit(s,b.o,t,E,g.N); } } }
        const p2=pos[s]; if(p2&&(p2.d>0?b.l<=p2.cat:b.h>=p2.cat)){ close(s,p2.d>0?Math.min(b.o,p2.cat):Math.max(b.o,p2.cat),t,'felaket'); }
      }
      // gün içi uygulama
      if(cfg.mode==='intra'&&pos[s]){ const p=pos[s];
        const ex=p.sys==='S1'?(p.d>0?k.L10[i]:k.H10[i]):(p.d>0?k.L20[i]:k.H20[i]);
        const lvl=p.d>0?Math.max(p.stop,ex):Math.min(p.stop,ex);
        if(p.d>0?b.l<=lvl:b.h>=lvl){ close(s,p.d>0?Math.min(b.o,lvl):Math.max(b.o,lvl),t,lvl===p.stop?'stop':'çıkış'); }
        else if(cfg.pyr){ let added=false;
          while(pos[s].u.length<4&&units(p.d)<6){ const lv=p.last+p.d*0.5*p.N; if(!(p.d>0?b.h>=lv:b.l<=lv)) break; const px=p.d>0?Math.max(b.o,lv):Math.min(b.o,lv); if(!addUnit(s,px,t,E,p.N)) break; added=true; }
          if(added&&(p.d>0?b.l<=p.stop:b.h>=p.stop)) close(s,p.stop,t,'stop'); }
      }
      // S1 izleyicisi (atlama kuralı): kırılım olunca başlar; 2N ters ya da 10 günlük çıkışla biter
      const T=trk[s]||(trk[s]={act:null,lastWin:false});
      if(T.act){ const a=T.act; const ex=a.d>0?k.L10[i]:k.H10[i]; const lvl=a.d>0?Math.max(a.stop,ex):Math.min(a.stop,ex);
        if(a.d>0?b.l<=lvl:b.h>=lvl){ const px=a.d>0?Math.min(b.o,lvl):Math.max(b.o,lvl); T.lastWin=a.d*(px-a.px)>0; T.act=null; } }
      // yeni giriş sinyalleri
      const upS1=cfg.mode==='intra'?b.h>k.H20[i]:b.c>k.H20[i], dnS1=cfg.mode==='intra'?b.l<k.L20[i]:b.c<k.L20[i];
      const upS2=cfg.mode==='intra'?b.h>k.H55[i]:b.c>k.H55[i], dnS2=cfg.mode==='intra'?b.l<k.L55[i]:b.c<k.L55[i];
      let trkStart=null; if(!T.act&&(upS1!==dnS1)) trkStart=upS1?1:-1;
      if(!pos[s]&&!(T.pend)){
        for(const d of cfg.short?[1,-1]:[1]){ if(pos[s]) break;
          const s1=d>0?upS1&&!dnS1:dnS1&&!upS1, s2=cfg.s2&&(d>0?upS2&&!dnS2:dnS2&&!upS2);
          let sys=null; if(s1&&trkStart===d&&!(cfg.skip&&T.lastWin)) sys='S1'; else if(s2) sys='S2';
          if(!sys||!live||!eligible(s,t)||!filtOk(d,t)||units(d)>=6) continue;
          if(cfg.mode==='intra'){ const lv=sys==='S1'?(d>0?k.H20[i]:k.L20[i]):(d>0?k.H55[i]:k.L55[i]); const px=d>0?Math.max(b.o,lv):Math.min(b.o,lv);
            const q=URISK*E/N; if(notional(t)+q*px>LEV*E) continue; pos[s]={d,sys,u:[],ti:t,pnl:0,r0:2*URISK*E,N}; addUnit(s,px,t,E,N);
            if(d>0?b.l<=pos[s].stop&&b.c<pos[s].stop:b.h>=pos[s].stop&&b.c>pos[s].stop) close(s,pos[s].stop,t,'stop'); }
          else T.pend={d,sys,N}; } }
      if(trkStart){ const px=cfg.mode==='intra'?(trkStart>0?Math.max(b.o,k.H20[i]):Math.min(b.o,k.L20[i])):b.c; T.act={d:trkStart,px,stop:px-trkStart*2*N}; }
      // kapanış uygulaması: kapanışta stop / kanal çıkışı / ekleme kararı
      if(cfg.mode==='close'&&pos[s]&&!pos[s].pend){ const p=pos[s];
        const ex=p.sys==='S1'?(p.d>0?b.c<k.L10[i]:b.c>k.H10[i]):(p.d>0?b.c<k.L20[i]:b.c>k.H20[i]);
        const st=p.d>0?b.c<p.stop:b.c>p.stop;
        if(st||ex){ p.pend='exit'; p.why=st?'stop':'çıkış'; }
        else if(cfg.pyr&&p.u.length<4&&units(p.d)<6&&p.d*(b.c-p.last)>=0.5*p.N) p.pend='add'; }
    }
    if(live){ const eq=equity(t); if(eq>peak) peak=eq; mdd=Math.max(mdd,1-eq/peak); daily.push({t,eq}); }
  }
  for(const s in pos){ const k=D[s]; close(s,k[k.length-1].c,TEND,'veri bitti'); }
  const tr=trades.filter(x=>x.ti>=T0), yrs=(TEND-T0)/365/DAY, end=daily[daily.length-1].eq;
  const mid=daily.find(x=>x.t>=TMID), d24=daily.find(x=>x.t>=T24), d12=daily.find(x=>x.t>=T12);
  const ann=(a,b,y)=>Math.pow(Math.max(b,1e-9)/a,1/y)-1;
  const years={}; let last=1; for(const x of daily){ const y=new Date(x.t).getUTCFullYear(); years[y]=years[y]||{s:last}; years[y].e=x.eq; last=x.eq; }
  return {cfg,tr,end,mdd,cagr:ann(1,end,yrs),h1:ann(1,mid.eq,(TMID-T0)/365/DAY),h2:ann(mid.eq,end,(TEND-TMID)/365/DAY),l24:ann(d24.eq,end,2),l12:d12.eq?end/d12.eq-1:NaN,
    years:Object.fromEntries(Object.entries(years).map(([y,v])=>[y,v.e/v.s-1]))};
}
const rs=tr=>{ if(!tr.length) return {n:0,R:NaN}; const R=tr.map(x=>x.R), m=R.reduce((a,b)=>a+b,0)/R.length, sd=Math.sqrt(R.reduce((a,b)=>a+(b-m)**2,0)/R.length)||1;
  const so=R.slice().sort((a,b)=>a-b), cut=so.slice(0,Math.floor(so.length*0.95));
  return {n:tr.length,R:m,t:m/sd*Math.sqrt(R.length),win:R.filter(x=>x>0).length/R.length,med:so[Math.floor(so.length/2)],x5:cut.reduce((a,b)=>a+b,0)/Math.max(1,cut.length)}; };
const fx=(x,d=2)=>Number.isFinite(x)?(x>=0?'+':'−')+Math.abs(x).toFixed(d).replace('.',','):'–';
const pc=x=>Number.isFinite(x)?(x>=0?'+':'−')+Math.abs(100*x).toFixed(0)+'%':'–';
const SYSV={tam:{s2:true,skip:true,pyr:true}, 'tam−atlama':{s2:true,skip:false,pyr:true}, 'tam−piramit':{s2:true,skip:true,pyr:false}, 'D20/10':{s2:false,skip:false,pyr:false,one:true}};
const res=[];
for(const univ of ['4','50']) for(const mode of ['intra','close']) for(const short of [false,true]) for(const filt of [false,true]) for(const name in SYSV){
  const cfg={univ,mode,short,filt,name,...SYSV[name]}; if(cfg.one) cfg.pyr=false;
  const r=run(cfg); const st=rs(r.tr), h1=rs(r.tr.filter(x=>x.ti<TMID)), h2=rs(r.tr.filter(x=>x.ti>=TMID)), l24=rs(r.tr.filter(x=>x.ti>=T24));
  const lo=rs(r.tr.filter(x=>x.d>0)), sh=rs(r.tr.filter(x=>x.d<0));
  res.push({...r,st,h1r:h1,h2r:h2,l24r:l24,lo,sh});
  console.log(univ,mode,short?'L+S':'L',filt?'süz':'',name,st.n,fx(st.R),fx(h1.R),fx(h2.R),fx(l24.R),pc(r.cagr),'−'+(100*r.mdd).toFixed(0)+'%',pc(r.h1),pc(r.h2),pc(r.l24));
}
const lab=r=>`${r.cfg.univ==='4'?'4 coin':'ilk 50'} · ${r.cfg.mode==='intra'?'gün içi':'kapanış'} · ${r.cfg.short?'long+short':'long'} · ${r.cfg.filt?'BTC SMA200':'süzgeçsiz'} · ${r.cfg.name}`;
const L=['# Test #1 · Tam Kaplumbağa sistemi','',`Arşiv günlük mumları, 2020-06 → ${mon(TEND)}. Birim = özsermayenin %${(URISK*100).toFixed(0)}'i ÷ N, stop 2N (birim başına %2 risk), coin başına 4, aynı yönde toplam 6 birim, nominal ≤ ${LEV}x. Maliyet taraf başına %0,08 + arşiv fonlaması. R = işlem sonucu ÷ ilk birimin riski. "1. yarı / 2. yarı / son 24 ay" sütunları portföyün yıllık getirisi; R sütunları işlem ortalaması. Kural: \`node tests/test01-tam-turtle.js\`.`,'',
  '| Kurulum | İşlem | Ort. R | t | Kazanma | Medyan R | En iyi %5 hariç | R 1. yarı | R 2. yarı | R son 24 ay | Yıllık | Düşüş | Yıllık 1. yarı | Yıllık 2. yarı | Yıllık son 24 ay | Son 12 ay |','|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
for(const r of res) L.push(`| ${lab(r)} | ${r.st.n} | ${fx(r.st.R)} | ${fx(r.st.t,1)} | %${(100*r.st.win).toFixed(0)} | ${fx(r.st.med)} | ${fx(r.st.x5)} | ${fx(r.h1r.R)} | ${fx(r.h2r.R)} | ${fx(r.l24r.R)} | ${pc(r.cagr)} | −${(100*r.mdd).toFixed(0)}% | ${pc(r.h1)} | ${pc(r.h2)} | ${pc(r.l24)} | ${pc(r.l12)} |`);
L.push('','## Long ve short bacağı (long+short kurulumlarında)','','| Kurulum | Long işlem | Long R | Short işlem | Short R |','|---|---|---|---|---|');
for(const r of res.filter(r=>r.cfg.short)) L.push(`| ${lab(r)} | ${r.lo.n} | ${fx(r.lo.R)} | ${r.sh.n} | ${fx(r.sh.R)} |`);
const YS=[2020,2021,2022,2023,2024,2025,2026];
L.push('','## Yıl yıl portföy getirisi','','| Kurulum | '+YS.join(' | ')+' |','|---|'+'---|'.repeat(YS.length));
for(const r of res) L.push(`| ${lab(r)} | `+YS.map(y=>pc(r.years[y])).join(' | ')+' |');
const ok=r=>r.st.n>=100&&r.h1r.R>0&&r.h2r.R>0&&r.l24r.R>0&&r.h1>0&&r.h2>0&&r.l24>0;
L.push('','## Geçenler (≥100 işlem; R ve portföy getirisi iki yarıda ve son 24 ayda artı)','',...(res.filter(ok).map(r=>`- ${lab(r)}: ${r.st.n} işlem, ${fx(r.st.R)}R, yıllık ${pc(r.cagr)}, düşüş −${(100*r.mdd).toFixed(0)}%, son 24 ay yıllık ${pc(r.l24)}`)));
if(!res.some(ok)) L.push('- Geçen yok.');
fs.writeFileSync(OUT,L.join('\n')+'\n'); console.log('yazıldı',OUT);
