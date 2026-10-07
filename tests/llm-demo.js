// Yapay zekâ masası uçtan uca deneme (gerçek Binance verisi + bilgisayardaki dil modeli). Bulutta çalışmaz (Binance 403).
// Çalıştırma: node tests/llm-demo.js [COIN] [--model qwen3:8b] [--url http://localhost:11434] [--provider ollama|openai] [--ctx 8192] [--offline]
// --offline: Binance'e hiç istek atmaz, tests/mock-binance.js'in yapay verisiyle (ENAUSDT: süpürme → MSS → OTE) yalnız modeli dener.
// Bir coini tarar, kural masasını toplar, (1) giriş toplantısını, (2) o an açılmış varsayılan bir long pozisyon için pozisyon toplantısını modele sorar;
// her toplantının süresini, belirteç sayılarını ve konuşmayı yazar. Hiçbir emir yok, hiçbir dosya yazmaz.
const {loadEngine}=require('./engine-node.js');
const a=process.argv.slice(2); const arg=(k,d)=>{ const i=a.indexOf(k); return i>=0?a[i+1]:d; };
const off=a.includes('--offline'); const sym=off?'ENAUSDT':((a[0]&&!a[0].startsWith('--'))?a[0]:'BTCUSDT').toUpperCase();
(async()=>{
  let fetchFn; if(off){ const mock=require('./mock-binance.js'); fetchFn=(u,o)=>/binance\.com|binance\.vision/.test(String(u))?mock.fetch(u,o):globalThis.fetch(u,o); }
  const E=loadEngine(fetchFn?{fetch:fetchFn}:{}); const lc={on:true}; if(arg('--model')) lc.model=arg('--model'); if(arg('--url')) lc.url=arg('--url'); if(arg('--provider')) lc.provider=arg('--provider'); if(arg('--ctx')) lc.ctx=+arg('--ctx');
  E.llmSetCfg(lc); E.lmdSetCfg({on:true,perHour:100});
  console.log(`model: ${E.llmLabel()} · bağlam ${E.llm.cfg.ctx}`);
  const p0=await E.lmdPing(); console.log(`ping: ${p0.ok?'tamam':'HATA '+p0.err} · ${(p0.ms/1000).toFixed(1)} sn (ilk çağrı modeli belleğe yükler)`); if(!p0.ok){ process.exitCode=1; return; }
  const [t24,prem]=await Promise.all([E.j(`/fapi/v1/ticker/24hr?symbol=${sym}`),E.j(`/fapi/v1/premiumIndex?symbol=${sym}`)]);
  const row=await E.scanOne({t24,prem}); const deep=await E.scanDeep(row).catch(()=>null); if(deep) Object.assign(row,deep);
  const A=E.analyze(row._f,row._s); const c24=+t24.priceChangePercent;
  const dir=row.com.long.score>=row.com.short.score?'long':'short'; const com=E.committee(A,dir,c24,{sym});
  console.log(`\n${sym} ${dir} · fiyat ${A.px} · kural masası puanı ${E.ptsT(com.score)} · ${com.decision}`);
  const show=(r)=>{ if(!r.ok){ console.log('  HATA:',r.err,r.text?'\n  '+r.text:''); return; } const v=r.view; console.log(`  ${(v.ms/1000).toFixed(0)} sn · istem ${v.tokIn} tok · yanıt ${v.tokOut} tok · ${v.tokOut&&v.ms?(v.tokOut/(v.ms/1000)).toFixed(1):'?'} tok/sn (toplam)`);
    for(const l of E.lmdLines(v)) console.log(`  ${l.who.padEnd(7)} ${l.text}`); };
  console.log('\n1) Giriş toplantısı'); show(await E.lmdMeet('giris',sym,dir,A,com,null,null));
  const now=Date.now(); const sd=com.plan?com.plan.sd:0.015; const isL=dir==='long';
  const p={id:sym+'-demo',sym,dir,entry:A.px*(isL?0.99:1.01),stop:A.px*(isL?0.99-sd:1.01+sd),t1:A.px*(isL?0.99+1.5*sd:1.01-1.5*sd),t2:A.px*(isL?0.99+3*sd:1.01-3*sd),hi:A.px*(isL?1.004:1.01),lo:A.px*(isL?0.99:0.996),openT:now-2*3600e3,expiresAt:now+6*3600e3,stage:'open'};
  p.stop0=p.stop; p.risk0=Math.abs(p.entry-p.stop);
  const rv=E.positionReview(A,E.posCtx(p,null),[],c24,{sym});
  console.log(`\n2) Açık pozisyon (varsayılan: 2 saat önce %1 iyi fiyattan ${dir}) · kural masası: ${rv.verdict} · tutma ${E.ptsT(rv.hold)} · ${rv.rNow.toFixed(2)}R`);
  for(const l of rv.lines) console.log(`  ${l.who.padEnd(7)} ${l.text}`);
  console.log('\n   Yapay zekâ masası:'); show(await E.lmdMeet('pozisyon',sym,dir,A,null,rv,{...E.posCtx(p,null),id:p.id}));
})().catch(e=>{ console.error(e.message||e); process.exitCode=1; });
