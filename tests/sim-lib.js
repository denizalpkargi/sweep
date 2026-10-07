// Ortak pozisyon simülatörü (inceleme ve filtre araştırması için): masanın planı ve çeşitleri, mum mum.
// k: {t,o,h,l,c} dizisi (1 dk ya da 15 dk), bar: mum süresi (ms). Giriş i. mumun kapanışında (market) ya da sonraki mumlarda limitle.
// Seçenekler (varsayılan = bugünkü masa planı):
//   sd: stop uzaklığı (oran), stopMult: stopu genişlet (boy küçülür, $ risk aynı), stopMode: "wick" (gün içi) | kapanış süresi ms (ör. 36e5 = 1 sa kapanışı)
//   cat: kapanış stopunda gün içi felaket stopu (stop uzaklığının katı), tp1R 1,5 / tp1Part 0,5 / be (stop girişe), tp2R 3 / tp2Part 0,6, iz 1R / 0,7R
//   holdMs: zaman stopu, entry: "market" | "limit" (limOff: stop uzaklığının kaçı kadar iyi fiyat, limMs: bekleme), fees
// Dönüş: {R (kendi riskine göre, maliyet dahil), how, end (çıkış zamanı), mfe, mae (ilk risk cinsinden, ilk 8 saat), fill:false}
const FEES={taker:0.0005,maker:0.0002,slip:0.0003};
function sim(k,i,dir,o){
  o=Object.assign({stopMult:1,stopMode:"wick",cat:2,tp1R:1.5,tp1Part:0.5,be:true,tp2R:3,tp2Part:0.6,trail1:1,trail2:0.7,holdMs:8*36e5,entry:"market",limOff:0.5,limMs:2*36e5,bar:9e5,fees:FEES},o);
  const isL=dir==="long", sg=isL?1:-1, f=o.fees, bar=o.bar;
  let j0=i, entry, feeIn;
  if(o.entry==="limit"){ const lp=k[i].c*(1-sg*o.limOff*o.sd); let got=-1; for(let j=i+1;j<k.length&&k[j].t<k[i].t+bar+o.limMs;j++){ if(isL?k[j].l<=lp:k[j].h>=lp){ got=j; break; } } if(got<0) return {fill:false}; j0=got; entry=lp; feeIn=f.maker; }
  else { entry=k[i].c*(1+sg*f.slip); feeIn=f.taker; }
  const dist=entry*o.sd*o.stopMult; let stop=entry-sg*dist; const cat=entry-sg*dist*o.cat; const t1=entry+sg*dist*o.tp1R, t2=entry+sg*dist*o.tp2R;
  const tEnd=k[j0].t+bar+o.holdMs, t8=k[j0].t+bar+8*36e5; let qty=1, pnl=-entry*feeIn, stage=0, hi=entry, lo=entry, mfe=0, mae=0, wick=o.stopMode==="wick";
  const close=(q,px,fee)=>{ pnl+=q*sg*(px-entry)-q*px*fee; qty-=q; };
  // limitle dolan mumda: dolumdan sonra yalnız kapanış değerlendirilir (sıra bilinmiyor)
  for(let j=j0+(o.entry==="limit"?0:1);j<k.length;j++){ const c=k[j]; const seq=(o.entry==="limit"&&j===j0)?[c.c]:(isL?[c.l,c.h,c.c]:[c.h,c.l,c.c]);
    for(let z=0;z<seq.length;z++){ const px=seq[z], isClose=z===seq.length-1; hi=Math.max(hi,px); lo=Math.min(lo,px);
      if(c.t<t8){ mfe=Math.max(mfe,sg*(px-entry)/dist); mae=Math.min(mae,sg*(px-entry)/dist); }
      // stop: gün içi ya da kapanış (kapanış modunda felaket stopu gün içi)
      const hitW=isL?px<=stop:px>=stop;
      if(wick||stage>0){ if(hitW){ close(qty,stop*(1-sg*f.slip),f.taker); return {R:pnl/dist,how:stage?"kalan stop":"stop",end:c.t,mfe,mae,fill:true,entry,t:k[j0].t}; } }
      else { if(isL?px<=cat:px>=cat){ close(qty,cat*(1-sg*f.slip),f.taker); return {R:pnl/dist,how:"felaket",end:c.t,mfe,mae,fill:true,entry,t:k[j0].t}; }
        if(isClose&&((c.t+bar)%o.stopMode===0)&&hitW){ close(qty,px*(1-sg*f.slip),f.taker); return {R:pnl/dist,how:"kapanış stop",end:c.t+bar,mfe,mae,fill:true,entry,t:k[j0].t}; } }
      if(stage===0&&(isL?px>=t1:px<=t1)){ close(qty*o.tp1Part,t1,f.maker); stage=1; if(o.be) stop=entry; if(qty<=1e-9) return {R:pnl/dist,how:"tp1",end:c.t,mfe,mae,fill:true,entry,t:k[j0].t}; }
      if(stage===1){ if(isL?px>=t2:px<=t2){ close(qty*o.tp2Part,t2,f.maker); stage=2; } const tr=isL?hi-o.trail1*dist:lo+o.trail1*dist; if(isL?tr>stop:tr<stop) stop=tr; }
      if(stage===2){ const tr=isL?hi-o.trail2*dist:lo+o.trail2*dist; if(isL?tr>stop:tr<stop) stop=tr; }
    }
    if(c.t+bar>=tEnd){ close(qty,c.c*(1-sg*f.slip),f.taker); return {R:pnl/dist,how:"zaman",end:c.t+bar,mfe,mae,fill:true,entry,t:k[j0].t}; }
  }
  return {R:(pnl+qty*sg*(k[k.length-1].c-entry))/dist,how:"açık",end:k[k.length-1].t,mfe,mae,fill:true,open:true,entry,t:k[j0].t};
}
const VARIANTS={
  "bugünkü plan":{},
  "stop ×2 (aynı $ risk)":{stopMult:2},
  "stop ×3 (aynı $ risk)":{stopMult:3},
  "1 sa kapanış stopu (felaket 2×)":{stopMode:36e5},
  "stop ×2 + 1 sa kapanış":{stopMult:2,stopMode:36e5},
  "15 dk kapanış stopu":{stopMode:9e5},
  "zaman stopu 24 sa":{holdMs:24*36e5},
  "kâr alma yok (stop ya da 8 sa)":{tp1R:99},
  "limit giriş (stopun yarısı kadar geri)":{entry:"limit"},
};
module.exports={sim,VARIANTS,FEES};
