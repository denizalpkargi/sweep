// ICT Silver Bullet (Michael J. Huddleston) mekanik testi (11 Ekim 2026).
// Veri: tests/data/sb1m/<SYM>.csv.gz (tests/fetch-sb.js; t = epoch dakika, o,h,l,c,v,q).
// Kural (en yaygın kamuya açık yorum; ayrıntı raporda):
//   Pencereler New York saatiyle (yaz/kış saati dahil): Londra 03–04, AM 10–11, PM 14–15. Varsayılan yalnız hafta içi.
//   Likidite seviyeleri (pencere başlangıcı T'de bilinen ve T−30 dk'ya kadar alınmamış): önceki NY günü yüksek/düşük, Asya aralığı (20–24 NY),
//     Londra aralığı (02–05 NY; AM/PM için), NY sabah aralığı (09:30–12; PM için), 5 dk fraktal tepe/dipleri (2+2, son 6 sa).
//   Süpürme: T−30 dk ile pencere sonu arasında bir mum seviyenin ötesine fitil atar → ters yönde kurulum aranır.
//   MSS: süpürmeden sonra ≤30 dk içinde, süpürmeden önceki son kısa vadeli tepenin (fraktal 2+2, yoksa önceki 10 mumun tepesi) üstünde kapanış (short tersi).
//   FVG: süpürme ile MSS+2 mum arasında oluşan son boşluk (long: low[i] > high[i−2]); i pencere içinde olmalı.
//   Giriş: FVG'nin yakın kenarına limit (long: high[i−2]); emir pencere sonuna kadar açık; dolum = fiyat limiti %0,05 geçer ("touch" varyantında değmesi yeter).
//     Dolumdan önce hedef görülürse iptal. Pencere başına coin başına ilk kurulum.
//   Stop: süpürme ucu (varyant: FVG'nin ilk mumunun ucu). Hedef: girişten ≥1R uzaktaki en yakın karşı likidite (yoksa 2R; varyant sabit 1/2/3R).
//   Zaman çıkışı: AM/PM 16:00 NY, Londra 08:00 NY (o dakikanın açılışı). Aynı mumda stop+hedef → stop; dolum mumunda yalnız stop.
//   Maliyet R cinsinden: limit giriş maker %0,02; stop/zaman çıkışı taker %0,05 + kayma %0,03; hedef çıkışı maker %0,02.
//   Plasebo: her işlem için aynı pencerede rastgele dakikada market giriş (taker+kayma), aynı stop %'si ve aynı hedef R'si, aynı zaman çıkışı;
//     yön rastgele (P-rast) ve işlemin yönü (P-yön); işlem başına 20 çekiliş.
// Kullanım: node --max-old-space-size=8000 tests/test-silver-bullet.js [--bar 1|5] [--out dosya.json] [--hours] [--weekend]
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const DIR=arg('dir',path.join(__dirname,'data','sb1m'));
const BAR=+arg('bar',1), HOURS=process.argv.includes('--hours'), WEEKEND=process.argv.includes('--weekend');
const OUT=arg('out',path.join(__dirname,'data','sb-result-'+BAR+'m'+(HOURS?'-hours':'')+'.json'));
const MID=Date.parse('2023-06-01T00:00Z')/6e4, Y12=(Date.parse('2026-10-11T00:00Z')-365*864e5)/6e4;
const MAKER=0.0002, TAKER=0.0005+0.0003, THROUGH=0.0005;
const WINDOWS=HOURS?Array.from({length:24},(_,h)=>['h'+String(h).padStart(2,'0'),h,(h+5)%24]) // saat profili: her saat başı, çıkış +5 sa (yaklaşık)
  :[['Londra',3,8],['AM',10,16],['PM',14,16]];
// ---- NY saati → UTC dakika
const nyFmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit'});
const nyCache=new Map();
function nyUtcMin(y,m,d,hh){ const key=y*1e6+m*1e4+d*100+hh; if(nyCache.has(key)) return nyCache.get(key);
  for(const off of [4,5]){ const u=Date.UTC(y,m-1,d,hh+off); const p=Object.fromEntries(nyFmt.formatToParts(new Date(u)).map(x=>[x.type,x.value]));
    if(+p.hour===hh&&+p.day===d) { nyCache.set(key,u/6e4); return u/6e4; } }
  const u=Date.UTC(y,m-1,d,hh+5)/6e4; nyCache.set(key,u); return u; }
// ---- yardımcılar
let seed=12345; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
function load(sym){ const txt=zlib.gunzipSync(fs.readFileSync(path.join(DIR,sym+'.csv.gz'))).toString('utf8').split('\n');
  let t0=Infinity,t1=-Infinity; for(const L of txt){ if(!L) continue; const t=+L.slice(0,L.indexOf(',')); if(t<t0) t0=t; if(t>t1) t1=t; }
  t0=Math.floor(t0/BAR)*BAR; const n=Math.floor((t1-t0)/BAR)+1;
  const o=new Float64Array(n).fill(NaN),h=new Float64Array(n).fill(NaN),l=new Float64Array(n).fill(NaN),c=new Float64Array(n).fill(NaN);
  for(const L of txt){ if(!L) continue; const r=L.split(','); const i=Math.floor((+r[0]-t0)/BAR); const ro=+r[1],rh=+r[2],rl=+r[3],rc=+r[4]; if(!(rh>0)) continue;
    if(isNaN(o[i])){ o[i]=ro;h[i]=rh;l[i]=rl;c[i]=rc; } else { if(rh>h[i]) h[i]=rh; if(rl<l[i]) l[i]=rl; c[i]=rc; } }
  // boşlukları önceki kapanışla doldur (düz mum) — hacimsiz dakikalar
  for(let i=1;i<n;i++) if(isNaN(o[i])&&!isNaN(c[i-1])){ o[i]=h[i]=l[i]=c[i]=c[i-1]; }
  return {t0,n,o,h,l,c}; }
// blok min/maks (64) ile aralık sorgusu
function rmq(arr,isMax){ const B=64, nb=Math.ceil(arr.length/B), bl=new Float64Array(nb).fill(isMax?-Infinity:Infinity);
  for(let i=0;i<arr.length;i++){ const v=arr[i]; if(isNaN(v)) continue; const b=i>>6; if(isMax?v>bl[b]:v<bl[b]) bl[b]=v; }
  return (a,b)=>{ let r=isMax?-Infinity:Infinity; if(b<=a) return r; a=Math.max(0,a); b=Math.min(arr.length,b);
    while(a<b&&(a&63)){ const v=arr[a++]; if(isMax?v>r:v<r) r=v; } while(a+64<=b){ const v=bl[a>>6]; if(isMax?v>r:v<r) r=v; a+=64; } while(a<b){ const v=arr[a++]; if(isMax?v>r:v<r) r=v; } return r; }; }
// ---- istatistik
const ST={}; const add=(key,v)=>{ const o=ST[key]||(ST[key]={n:0,s:0,s2:0,w:0}); o.n++; o.s+=v; o.s2+=v*v; if(v>0) o.w++; };
const EXTRA={}; const addx=(key,f,v)=>{ const o=EXTRA[key]||(EXTRA[key]={}); o[f]=(o[f]||0)+v; };
const VARIANTS=[]; for(const stopV of ['sweep','fvg']) for(const tgtV of ['liq',1,2,3]) for(const fillV of ['through','touch','market']) VARIANTS.push({stopV,tgtV,fillV,id:`${stopV}|${tgtV}|${fillV}`});
const MAIN='sweep|liq|through';
const periods=t=>{ const y=new Date(t*6e4).getUTCFullYear(); return ['all',t<MID?'H1':'H2',...(t>=Y12?['Y12']:[]),'y'+y]; };
// ---- ana döngü
const syms=fs.readdirSync(DIR).filter(f=>f.endsWith('.csv.gz')).map(f=>f.replace('.csv.gz','')).sort();
let nWin=0, nSetup=0;
for(const sym of syms){ const D=load(sym); const {t0,n,o,h,l,c}=D; const ix=t=>Math.round((t-t0)/BAR);
  const qMax=rmq(h,true), qMin=rmq(l,false);
  // 5 dk fraktallar (BAR'dan bağımsız, 1 dk'dan değil BAR serisinden 5 dk'ya toplanır)
  const F=5/BAR>=1?Math.round(5/BAR):1; const n5=Math.floor(n/F); const h5=new Float64Array(n5), l5=new Float64Array(n5);
  for(let b=0;b<n5;b++){ let hh=-Infinity,ll=Infinity; for(let k=b*F;k<b*F+F;k++){ if(h[k]>hh) hh=h[k]; if(l[k]<ll) ll=l[k]; } h5[b]=hh; l5[b]=ll; }
  const fr=[]; for(let b=2;b<n5-2;b++){ if(h5[b]>h5[b-1]&&h5[b]>h5[b-2]&&h5[b]>=h5[b+1]&&h5[b]>=h5[b+2]) fr.push([b,1,h5[b]]); if(l5[b]<l5[b-1]&&l5[b]<l5[b-2]&&l5[b]<=l5[b+1]&&l5[b]<=l5[b+2]) fr.push([b,-1,l5[b]]); }
  let fp=0; // fraktal göstergesi
  // bar düzeyinde kısa vadeli fraktal tepe/dip (2+2) son indeksleri
  const isFH=i=>i>=2&&i<n-2&&h[i]>h[i-1]&&h[i]>h[i-2]&&h[i]>=h[i+1]&&h[i]>=h[i+2];
  const isFL=i=>i>=2&&i<n-2&&l[i]<l[i-1]&&l[i]<l[i-2]&&l[i]<=l[i+1]&&l[i]<=l[i+2];
  const day0=Math.ceil(t0/1440)+2, day1=Math.floor((t0+n*BAR)/1440)-1;
  for(let dd=day0; dd<day1; dd++){ const dt=new Date(dd*864e5); const Y=dt.getUTCFullYear(),M=dt.getUTCMonth()+1,Dd=dt.getUTCDate(); const wd=dt.getUTCDay();
    if(!WEEKEND&&(wd===0||wd===6)) continue;
    const prev=new Date((dd-1)*864e5); const pY=prev.getUTCFullYear(),pM=prev.getUTCMonth()+1,pD=prev.getUTCDate();
    const mid=ix(nyUtcMin(Y,M,Dd,0)), pmid=ix(nyUtcMin(pY,pM,pD,0)), a20=ix(nyUtcMin(pY,pM,pD,20));
    if(pmid<10||mid+1440/BAR>=n) continue;
    const base=[]; // [px, side(+1 tepe / −1 dip), oluştuğu son indeks (bilinme), ad]
    base.push([qMax(pmid,mid),1,mid,'PDH'],[qMin(pmid,mid),-1,mid,'PDL'],[qMax(a20,mid),1,mid,'AsyaH'],[qMin(a20,mid),-1,mid,'AsyaL']);
    const l02=ix(nyUtcMin(Y,M,Dd,2)), l05=ix(nyUtcMin(Y,M,Dd,5)), n930=ix(nyUtcMin(Y,M,Dd,9))+30/BAR, n12=ix(nyUtcMin(Y,M,Dd,12));
    for(const [wname,wh,xh] of WINDOWS){
      const T=ix(nyUtcMin(Y,M,Dd,wh)); const E=T+60/BAR; let X=ix(nyUtcMin(Y,M,Dd,xh)); if(X<=E) X+=1440/BAR; if(X>=n-2||T<400) continue;
      if(HOURS) X=E+240/BAR; // saat profili: pencere sonundan 4 sa sonra
      const S0=T-30/BAR; nWin++;
      const lv=base.slice(); if(T>=l05) lv.push([qMax(l02,l05),1,l05,'LonH'],[qMin(l02,l05),-1,l05,'LonL']); if(T>=n12) lv.push([qMax(n930,n12),1,n12,'NYamH'],[qMin(n930,n12),-1,n12,'NYamL']);
      // 5 dk fraktallar: son 6 saatte oluşmuş, T−30'a kadar onaylanmış
      const fLo=Math.floor((S0-360/BAR)/F), fHi=Math.floor(S0/F)-2; while(fp<fr.length&&fr[fp][0]<fLo) fp++;
      for(let q=fp;q<fr.length&&fr[q][0]<fHi;q++){ const [b,s,px]=fr[q]; lv.push([px,s,(b+3)*F,'frak']); }
      // T−30'a kadar alınmamış olanlar
      const live=lv.filter(([px,s,fe])=>fe<=S0&&(s>0?qMax(fe,S0)<=px:qMin(fe,S0)>=px)&&isFinite(px));
      // tarama
      let setup=null; let cand={1:null,[-1]:null}; const swept=new Set();
      for(let j=S0;j<E&&!setup;j++){
        for(let q=0;q<live.length;q++){ if(swept.has(q)) continue; const [px,s]=live[q];
          if(s<0&&l[j]<px){ swept.add(q); // satış tarafı alındı → long kurulumu
            let ref=NaN; for(let k=j-3;k>=Math.max(j-60/BAR,2);k--) if(isFH(k)&&k+2<j){ ref=h[k]; break; } if(!isFinite(ref)) ref=qMax(j-10,j);
            cand[1]={s:j,ext:l[j],ref}; }
          if(s>0&&h[j]>px){ swept.add(q);
            let ref=NaN; for(let k=j-3;k>=Math.max(j-60/BAR,2);k--) if(isFL(k)&&k+2<j){ ref=l[k]; break; } if(!isFinite(ref)) ref=qMin(j-10,j);
            cand[-1]={s:j,ext:h[j],ref}; } }
        for(const dir of [1,-1]){ const cd=cand[dir]; if(!cd) continue;
          if(j>cd.s){ if(dir>0?l[j]<cd.ext:h[j]>cd.ext) cd.ext=dir>0?l[j]:h[j]; }
          if(j-cd.s>30/BAR){ cand[dir]=null; continue; }
          if(j>cd.s&&(dir>0?c[j]>cd.ref:c[j]<cd.ref)){ // MSS
            // FVG: süpürme ile MSS+2 arası; MSS sonrası 2 mum için ileriye bakmak gerekir → oluşum indeksi i ≤ j+2, emir i+1'den
            let fv=-1; for(let i=Math.min(j+2,E-1);i>=cd.s+2;i--){ if(i<T) break; if(dir>0?l[i]>h[i-2]:h[i]<l[i-2]){ fv=i; break; } }
            if(fv<0){ cand[dir]=null; continue; }
            const ext=dir>0?qMin(cd.s,fv+1):qMax(cd.s,fv+1);
            setup={dir,s:cd.s,mss:j,fv,start:Math.max(fv,j)+1,ext,entry:dir>0?h[fv-2]:l[fv-2],c1:dir>0?l[fv-2]:h[fv-2]}; break; } } }
      if(!setup) continue; nSetup++;
      const {dir,fv,entry,start}=setup; const per=periods(t0+T*BAR);
      for(const p of per){ addx(`${wname}|${p}`,'setup',1); }
      for(const V of VARIANTS){
        let stop=V.stopV==='sweep'?setup.ext*(1-dir*0.0001):setup.c1*(1-dir*0.0001); const d=dir*(entry-stop); if(!(d>0)) continue; const sp=d/entry;
        // hedef
        let tgt; if(V.tgtV==='liq'){ const minT=entry+dir*d; let best=Infinity;
            for(const [px,s,fe] of lv){ if(s!==dir||fe>fv) continue; if(dir>0?px>=minT:px<=minT){ const dist=Math.abs(px-entry); if(dist<best) best=dist; } }
            tgt=isFinite(best)&&best<=10*d?entry+dir*best:entry+dir*2*d; }
          else tgt=entry+dir*V.tgtV*d;
        // dolum
        let k=-1; const lim=V.fillV==='through'?entry*(1-dir*THROUGH):entry;
        if(V.fillV==='market'){ k=start; } else for(let i=start;i<E;i++){ if(dir>0?l[i]<=lim:h[i]>=lim){ k=i; break; } if(dir>0?h[i]>=tgt:l[i]<=tgt) break; }
        if(k<0){ if(V.id===MAIN) for(const p of per) addx(`${wname}|${p}`,'nofill',1); continue; }
        let r, ex; let ent=entry, dd=d, spp=sp, entCost=MAKER;
        if(V.fillV==='market'){ ent=o[k]; dd=dir*(ent-stop); if(!(dd>0)||(dir>0?ent>=tgt:ent<=tgt)) continue; spp=dd/ent; entCost=TAKER; }
        if(dir>0?l[k]<=stop:h[k]>=stop){ r=-1; ex='stop'; }
        else { for(let i=k+1;i<X;i++){ if(dir>0?l[i]<=stop:h[i]>=stop){ r=-1; ex='stop'; break; } if(dir>0?h[i]>=tgt:l[i]<=tgt){ r=Math.abs(tgt-ent)/dd; ex='hedef'; break; } }
          if(!ex){ r=dir*(o[X]-ent)/dd; ex='zaman'; } }
        const cost=entCost+(ex==='hedef'?MAKER:TAKER); const rn=r-cost/spp; const R=Math.abs(tgt-entry)/d;
        for(const p of per){ add(`${V.id}|${wname}|${p}`,rn); add(`${V.id}|${wname}|${p}|brut`,r); add(`${V.id}|ALL|${p}`,rn); add(`${V.id}|ALL|${p}|brut`,r);
          if(V.id===MAIN){ addx(`${wname}|${p}`,ex,1); addx(`${wname}|${p}`,'sp',sp); addx(`${wname}|${p}`,'R',R); addx(`${wname}|${p}`,'n',1); add(`MAIN|${dir>0?'long':'short'}|${wname}|${p}`,rn);
            const b=sp<0.002?'<0,2':sp<0.004?'0,2–0,4':sp<0.008?'0,4–0,8':'≥0,8'; add(`MAIN|stop${b}|${p}`,rn); add(`MAIN|sym:${sym}|${p}`,rn); } }
        // plasebo (ana varyant)
        if(V.id===MAIN&&!HOURS) for(let z=0;z<20;z++) for(const pv of ['rast','yon']){ const pd=pv==='rast'?(rnd()<0.5?1:-1):dir; const rr=T+Math.floor(rnd()*(E-T)); const e=o[rr]; const dd2=sp*e;
            const st=e-pd*dd2, tg=e+pd*R*dd2; let pr,pe; for(let i=rr;i<X;i++){ if(pd>0?l[i]<=st:h[i]>=st){ pr=-1; pe='stop'; break; } if(i>rr&&(pd>0?h[i]>=tg:l[i]<=tg)){ pr=R; pe='hedef'; break; } }
            if(pr===undefined){ pr=pd*(o[X]-e)/dd2; pe='zaman'; } const pc=TAKER+(pe==='hedef'?MAKER:TAKER);
            for(const p of per){ add(`P-${pv}|${wname}|${p}`,pr-pc/sp); add(`P-${pv}|ALL|${p}`,pr-pc/sp); add(`P-${pv}|${wname}|${p}|brut`,pr); } }
      } } }
  console.error(sym,'tamam', 'pencere',nWin,'kurulum',nSetup);
}
fs.writeFileSync(OUT,JSON.stringify({bar:BAR,hours:HOURS,weekend:WEEKEND,ST,EXTRA,nWin,nSetup}));
console.error('yazıldı',OUT);
