// Hacim profili ve havuz birim testleri (engine.js: volProfile, sessionProfiles, poolsAt).
// Çalıştırma: node tests/vp-test.js  (çıktıda "errors []" beklenir)
const {loadEngine}=require('./engine-node.js'); const E=loadEngine();
const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); }; const near=(a,b,e)=>Math.abs(a-b)<=e;
const M=9e5, T0=Date.UTC(2026,0,5);
const bar=(i,o,h,l,c,q,tb)=>({t:T0+i*M,o,h,l,c,q:q||100,tb:tb==null?(q||100)/2:tb});
// 1. çoğu hacim 105'te: POC 105, değer alanı POC'yi içerir ve %70'i aşar
{ const k=[]; for(let i=0;i<40;i++) k.push(bar(i,105,105.5,104.5,105,i%4?300:50)); k.push(bar(40,100,101,100,100.5,20)); k.push(bar(41,109,110,109,109.5,20));
  const v=E.volProfile(k,0,k.length-1,{bins:20}); ok(near(v.poc,105,0.5),'POC 105 değil: '+v.poc); ok(v.val<=v.poc&&v.vah>=v.poc,'değer alanı POC içermiyor');
  const inVa=v.rows.filter(r=>r.p>=v.val&&r.p<=v.vah).reduce((a,r)=>a+r.v,0); ok(inVa/v.total>=0.7-1e-9,'değer alanı %70 altında: '+inVa/v.total);
  ok(v.vah-v.val<(v.hi-v.lo)*0.5,'değer alanı çok geniş'); ok(near(v.total,k.reduce((a,c)=>a+c.q,0),1e-6),'hacim kayboldu'); }
// 2. eşit hacimde POC ortaya en yakın satır
{ const k=[bar(0,100,110,100,105,100)]; const v=E.volProfile(k,0,0,{bins:10}); ok(near(v.poc,104.5,0.01)||near(v.poc,105.5,0.01),'eşitlikte POC ortada değil: '+v.poc); }
// 3. günlük profiller ve çıplak POC: gün 1 POC 50, gün 2 hep 60–61'de → gün 1 POC çıplak; gün 3 50'ye iner → artık değil
{ const k=[]; for(let i=0;i<96;i++) k.push(bar(i,50,50.5,49.5,50,200)); for(let i=96;i<192;i++) k.push(bar(i,60,61,60,60.5,200));
  let P=E.sessionProfiles(k,k.length); ok(P.length===2&&near(P[0].poc,50,0.3)&&P[0].naked===true,'gün 1 çıplak POC değil: '+JSON.stringify(P.map(p=>[p.day,p.poc,p.naked])));
  for(let i=192;i<200;i++) k.push(bar(i,51,51,49.8,50,200)); P=E.sessionProfiles(k,k.length); ok(P[0].naked===false,'POC test edilince çıplak kaldı'); }
// 4. havuzlar: alınmış swing dip havuz sayılmaz; önceki gün dibi süpürülebilir (oluştuğu mum indeksiyle)
{ const k=[]; for(let i=0;i<96;i++){ const c=100+Math.sin(i/5)*2; k.push(bar(i,c,c+0.3,c-0.3,c)); }
  for(let i=96;i<140;i++){ const c=101+Math.sin(i/4)*0.8; k.push(bar(i,c,c+0.2,c-0.2,c)); }
  const k1d=[{t:T0,o:100,h:Math.max(...k.slice(0,96).map(c=>c.h)),l:Math.min(...k.slice(0,96).map(c=>c.l)),c:100}];
  const P=E.poolsAt(k,k1d,0.004,140); const pdl=P.find(p=>p.name==="önceki gün dibi"); ok(pdl&&pdl.i<96&&k[pdl.i].l===k1d[0].l,'önceki gün dibi indeksi yanlış: '+JSON.stringify(pdl));
  for(const p of P){ for(let j=p.i+1;j<140;j++){ if(p.type==="low"?k[j].l<p.p*(1-0.0005):k[j].h>p.p*(1+0.0005)){ errors.push('alınmış havuz döndü: '+p.name+' '+p.p); break; } } }
  // Asya seansı bitmeden Asya havuzu yok
  const tAsia=E.poolsAt(k,[],0.004,20).filter(p=>/Asya/.test(p.name)); ok(tAsia.length===0,'Asya seansı içinde Asya havuzu var'); }
console.log('errors',JSON.stringify(errors)); process.exit(errors.length?1:0);
