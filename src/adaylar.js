/* Aday gölgesi (16 Ekim 2026; kullanıcı #84–#92 testlerinden sonra karttan "Gölge kayıt"ı seçti). İşlem açmaz, masaya, Ozan'a ve sepetlere dokunmaz;
   arşivde izlemede kalan üç adayın canlıda ne yaptığını yazar:
   - negfund (#84): ayın ilk 30'unda (24 sa hacim, TradFi hariç) bir fonlama ödemesi ≤ −%0,05 → ödeme anındaki mark fiyattan long, 24 sa sonra ölçülür.
   - cap (#88): ilk 100'de Binance ödeme aralığını ≥ 4 sa'ten ≤ 1 sa'e indirince (fonlama tavanı) kalabalığın tersi yönde (oran < 0 → long), 24 / 72 sa.
   - corr (#91): 4 saatte bir ilk 30'un son 24 kapanmış 1 sa mumundaki ortalama ikili korelasyon; son 365 günün %90'ının üstündeyse bayrak.
     Her nokta BTC için kaydedilir (bayraklı ve bayraksız), 24 sa / 7 g sonraki BTC getirisi; Kaplumbağa ve masa işlemleri sonradan zamana göre eşlenir.
   Ölçü: yönde % (mark → mark, maliyetsiz). Vadesinden ufkun yarısından geç ölçülürse null. Durum localStorage["st-aday"]. */
const AD_DEF={negThr:-0.0005,top:30,capTop:100,hz:{negfund:[24],cap:[24,72],corr:[24,168]},corrThr:0.603,corrMinN:540,corrN:2190,max:3000,lateMax:0.5};
const AD_KEY="st-aday";
function adLoad(){ let s=null; try{ s=JSON.parse(localStorage.getItem(AD_KEY)||"null"); }catch(e){}
  if(!s||!Array.isArray(s.pend)) s={pend:[],done:[],fund:{},iv:{},corr:[],uni:{t:0,top:[],cap:[]},ivT:0,corrT:0}; return s; }
function adSave(s){ try{ localStorage.setItem(AD_KEY,JSON.stringify(s)); }catch(e){} }
const adR4=v=>isFinite(v)?Math.round(v*1e4)/1e4:null;
function adAdd(s,rec,now){ if(!(rec.px>0)) return; s.pend.push(Object.assign({t:now,r:{},d:{}},rec)); }
/* ortalama ikili korelasyon: closes = {sym:[kapanışlar]} aynı uzunlukta; sıfır oynaklık (donmuş fiyat) dışarıda; en az 20 coin */
function adCorr(closes){ const R=[]; for(const c of Object.values(closes)){ if(!c||c.length<25) continue; const r=[]; for(let i=1;i<c.length;i++) r.push(Math.log(c[i]/c[i-1]));
    if(!r.every(isFinite)) continue; const m=r.reduce((a,b)=>a+b,0)/r.length; const z=r.map(x=>x-m); const sd=Math.sqrt(z.reduce((a,b)=>a+b*b,0)); if(sd>0) R.push(z.map(x=>x/sd)); }
  if(R.length<20) return null; let s=0, n=0;
  for(let i=0;i<R.length;i++) for(let j=i+1;j<R.length;j++){ let d=0; for(let k=0;k<R[i].length;k++) d+=R[i][k]*R[j][k]; s+=d; n++; }
  return s/n; }
function adThr(s){ const v=s.corr.map(p=>p.c).filter(isFinite); if(v.length<AD_DEF.corrMinN) return {thr:AD_DEF.corrThr,src:"arşiv"};
  const w=v.slice(-AD_DEF.corrN).sort((a,b)=>a-b); return {thr:w[Math.floor(w.length*0.9)],src:"canlı"}; }
/* saf adım: pi = premiumIndex dizisi, iv = {sym: saat} (fundingInfo; listede olmayan 8), top/cap evrenleri. Dönüş: yeni kayıtlar ve biten ölçümler */
function adStep(s,pi,iv,now){ const ev=[], top=new Set(s.uni.top), cap=new Set(s.uni.cap), mark={};
  for(const z of pi||[]){ const sym=z.symbol, px=+z.markPrice, nft=+z.nextFundingTime, r=+z.lastFundingRate; if(!(px>0)) continue; mark[sym]=px;
    const f=s.fund[sym];
    if(f&&nft>f.nft&&now-f.nft<30*6e4&&top.has(sym)&&f.r<=AD_DEF.negThr){ const rec={k:"negfund",sym,dir:"long",px,fr:adR4(f.r*100),deep:f.r<=-0.001?1:0}; adAdd(s,rec,now); ev.push(rec); }
    if(isFinite(nft)&&isFinite(r)) s.fund[sym]={nft,r}; }
  if(iv){ for(const sym of cap){ const h=iv[sym]||8, h0=s.iv[sym]; const f=s.fund[sym];
      if(h0!=null&&h0>=4&&h<=1&&f&&mark[sym]>0){ const rec={k:"cap",sym,dir:f.r<0?"long":"short",px:mark[sym],fr:adR4(f.r*100)}; adAdd(s,rec,now); ev.push(rec); }
      s.iv[sym]=h; } }
  const keep=[], fin=[];
  for(const p of s.pend){ let open=false; const px=mark[p.sym];
    for(const h of AD_DEF.hz[p.k]){ if(p.r[h]!==undefined) continue; const due=p.t+h*36e5; if(now<due){ open=true; continue; }
      const late=(now-due)/36e5; if(late>h*AD_DEF.lateMax){ p.r[h]=null; p.d[h]=Math.round(late*60); continue; }
      if(!(px>0)){ open=true; continue; } p.r[h]=adR4((p.dir==="long"?px/p.px-1:1-px/p.px)*100); p.d[h]=Math.round(late*60); }
    if(open) keep.push(p); else { s.done.push(p); fin.push(p); } }
  s.pend=keep; if(s.done.length>AD_DEF.max) s.done=s.done.slice(-AD_DEF.max);
  return {ev,fin,mark}; }
/* canlı tur (dakikada bir): premiumIndex her turda, evren ve fundingInfo 30 dk'da bir, korelasyon 4 saatlik sınırdan sonraki ilk turda (30 istek, ağırlık 1) */
async function adTick(s,now){ now=now||Date.now();
  if(now-s.uni.t>30*6e4){ const a=await opt(`/fapi/v1/ticker/24hr`,null);
    if(Array.isArray(a)){ const l=a.filter(x=>/USDT$/.test(x.symbol)&&!TT_TRADFI.has(x.symbol.replace(/USDT$/,""))&&+x.count>0).sort((x,y)=>+y.quoteVolume-+x.quoteVolume).map(x=>x.symbol);
      s.uni={t:now,top:l.slice(0,AD_DEF.top),cap:l.slice(0,AD_DEF.capTop)}; } }
  let iv=null; if(now-s.ivT>30*6e4){ const a=await opt(`/fapi/v1/fundingInfo`,null); if(Array.isArray(a)){ iv={}; for(const x of a) iv[x.symbol]=+x.fundingIntervalHours; s.ivT=now; } }
  const pi=await opt(`/fapi/v1/premiumIndex`,null); const r=adStep(s,Array.isArray(pi)?pi:[],iv,now);
  const slot=Math.floor(now/(4*36e5))*4*36e5;
  if(slot>s.corrT&&now-slot<36e5&&s.uni.top.length>=20&&r.mark.BTCUSDT>0){ s.corrT=slot; const cl={};
    for(const sym of s.uni.top){ const k=await opt(`/fapi/v1/klines?symbol=${sym}&interval=1h&limit=26&endTime=${slot-1}`,null);
      if(Array.isArray(k)&&k.length>=25) cl[sym]=k.slice(-25).map(x=>+x[4]); }
    const c=adCorr(cl); if(c!=null){ const th=adThr(s); const flag=c>th.thr?1:0; s.corr.push({t:slot,c:adR4(c),flag}); if(s.corr.length>AD_DEF.corrN) s.corr=s.corr.slice(-AD_DEF.corrN);
      const rec={k:"corr",sym:"BTCUSDT",dir:"long",px:r.mark.BTCUSDT,c:adR4(c),thr:adR4(th.thr),flag}; adAdd(s,rec,now); r.ev.push(rec); } }
  return r; }
/* özet: aday × ufuk (corr bayraklı / bayraksız ayrı): n, ort. yönde %, isabet */
function adSummary(s){ const out={}; const all=[...s.done,...s.pend];
  for(const p of all){ const key=p.k==="corr"?(p.flag?"corr·bayrak":"corr·yok"):p.k; const o=out[key]||(out[key]={n:0}); o.n++;
    for(const h of AD_DEF.hz[p.k]){ const v=p.r[h]; if(v==null) continue; const z=o["h"+h]||(o["h"+h]={n:0,s:0,w:0}); z.n++; z.s+=v; if(v>0) z.w++; } }
  for(const o of Object.values(out)) for(const k of Object.keys(o)) if(k[0]==="h"){ const z=o[k]; o[k]={n:z.n,pct:adR4(z.s/z.n),hit:adR4(z.w/z.n)}; }
  const L=s.corr[s.corr.length-1]; return {pend:s.pend.length,done:s.done.length,by:out,corr:L||null,thr:adThr(s)}; }
