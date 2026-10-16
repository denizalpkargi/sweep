// REST hız koruması testi (src/build.js jRest): yasak / hız sınırı bitince bekleyen istekler aynı anda gitmez, 15 dk boyunca en az 1 sn arayla
// birer birer gider (15 Ekim 2026: 5,6 sa'lik 418 bitince 18 istek aynı saniyede gitti, hemen yeni 418, sonra 7 sa'lik 418).
const {loadEngine}=require('./engine-node.js');
const errors=[]; const ok=(c,m)=>{ if(!c){ errors.push(m); console.log('HATA',m); } };
const mem={}; const LS={getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}};
const calls=[]; let mode=200;
const fetch=async(u)=>{ calls.push(Date.now()); const st=mode; const h={'x-mbx-used-weight-1m':'10','retry-after':st===418?'120':null};
  return {ok:st===200,status:st,headers:{get:k=>h[k.toLowerCase()]??null},json:async()=>({u}),text:async()=>'{}'}; };
(async()=>{
  // 1) normalde paralel istekler bekletilmez
  let E=loadEngine({localStorage:LS,fetch}); calls.length=0; let t0=Date.now();
  await Promise.all([1,2,3,4,5].map(i=>E.j('/fapi/v1/time?a='+i)));
  ok(calls.length===5&&Math.max(...calls)-t0<300,'yasak yokken 5 istek beklemeden gider');
  // 2) bekleme bitince 15 dk boyunca birer birer, ≥1 sn arayla
  E=loadEngine({localStorage:LS,fetch}); calls.length=0; E.rest.cool=Date.now()+300; E.rest.pace=E.rest.cool+15*6e4;
  t0=Date.now(); await Promise.all([1,2,3,4].map(i=>E.j('/fapi/v1/time?b='+i)));
  const gaps=calls.slice(1).map((t,i)=>t-calls[i]); ok(calls[0]-t0>=280,'bekleme bitmeden istek yok');
  ok(gaps.length===3&&gaps.every(g=>g>=950),'bekleme bitince istekler ≥1 sn arayla ('+gaps.join(', ')+' ms)');
  // 3) 418 hem bekleme hem 15 dk'lık kademeli dönüş koyar; yeniden açılışta kayıttan okunur
  E=loadEngine({localStorage:LS,fetch}); mode=418; let err=null; const origWarn=console.warn; console.warn=()=>{};
  try{ await E.j('/fapi/v1/time?c=1'); }catch(e){ err=e; } console.warn=origWarn; mode=200;
  ok(err&&/418/.test(err.message),'418 hata verir');
  ok(E.rest.cool>Date.now()+100e3&&Math.abs(E.rest.pace-(E.rest.cool+15*6e4))<5,'418 → bekleme (Retry-After + 5 dk) ve ardından 15 dk kademeli dönüş');
  const E2=loadEngine({localStorage:LS,fetch}); ok(E2.rest.cool===E.rest.cool&&E2.rest.pace===E.rest.cool+15*6e4,'yeniden açılışta bekleme ve kademeli dönüş kayıttan okunur');
  console.log('rest-pace-test',errors.length?'HATA':'tamam'); console.log('errors',JSON.stringify(errors)); if(errors.length) process.exit(1);
})();
