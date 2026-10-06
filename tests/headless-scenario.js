// Ekransız bot uçtan uca: sahte Binance ile bir tarama → masa girişleri → fiyat adımları (hedef 1, iz süren stop, stop) → yeniden başlatmada 1 dk mumlarla boşluk doldurma.
// Çalıştırma: node tests/headless-scenario.js  (çıktıda "errors []" beklenir)
const fs=require('fs'); const path=require('path'); const os=require('os');
const {main}=require('../headless/run.js'); const mock=require('./mock-binance.js');
const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
const readJsonl=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];

(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sweep-headless-')); const logs=path.join(dir,'logs');
  const opts={dir,minVol:1e6,every:300000,votes:'deep',once:true,quiet:true};
  // 1. tur: tarama ve giriş
  const r1=await main(opts,{fetch:mock.fetch,WebSocket:null}); const B=r1.B, bot=B.bot;
  const day=new Date().toISOString().slice(0,10);
  const votes=readJsonl(path.join(logs,`votes-${day}.jsonl`));
  ok(votes.length>=2,'oy satırı yok'); ok(votes.every(v=>v.feat&&v.agents&&isFinite(v.score)),'oy satırında özellik eksik');
  ok(bot.positions.length>=1,'masa giriş açmadı'); const p=bot.positions.find(x=>x.sym==='ENAUSDT'); ok(p&&p.dir==='long','ENA long yok');
  if(p){
    // yönetim: masa gözden geçirmesi JSONL'ye düşmeli
    p.lastMan=1; await B.manage(); ok(readJsonl(path.join(logs,`reviews-${day}.jsonl`)).some(x=>x.id===p.id),'gözden geçirme yazılmadı');
    if(bot.positions.includes(p)){
      // hedef 1 → stop girişe; hemen altındaki fiyat kalanı KAPATMAMALI (iz süren stop ilk riskle ölçülür)
      const R=p.risk0; B.onPrice('ENAUSDT',p.t1,Date.now()); ok(p.stage==='tp1'&&p.stop===p.entry,'hedef 1 sonrası stop girişte değil');
      B.onPrice('ENAUSDT',p.t1+0.2*R,Date.now()); B.onPrice('ENAUSDT',p.t1,Date.now());
      ok(bot.positions.includes(p),'hedef 1 sonrası kalan hemen kapandı (iz süren stop hatası)');
      ok(Math.abs(p.stop-(p.t1+0.2*R-R))<1e-12,'iz süren stop 1R geride değil');
      B.onPrice('ENAUSDT',p.t2,Date.now()); ok(p.stage==='tp2','hedef 2 alınmadı');
      B.onPrice('ENAUSDT',p.t2-0.8*R,Date.now()); ok(!bot.positions.includes(p),'iz süren stop kapatmadı');
    }
    const tr=readJsonl(path.join(logs,'trades.jsonl')).find(t=>t.id===p.id);
    ok(tr&&tr.r>1&&tr.exits.length===3&&tr.feat&&tr.agents,'ENA işlem kaydı eksik ya da yanlış: '+JSON.stringify(tr&&{r:tr.r,exits:tr.exits.length}));
  }
  const near=bot.positions.find(x=>x.sym==='NEARUSDT'); B.save(true);
  // 2. tur: yeniden başlatma; NEAR stopu kapalıyken 1 dk mumda vurulmuş olsun
  if(near){
    mock.ctl.k1m=(sym,u)=>{ if(sym!=='NEARUSDT') return []; const t=Math.floor(Date.now()/6e4)*6e4-5*6e4; const lo=near.stop*0.995;
      return [[t,String(near.entry),String(near.entry*1.001),String(lo),String(lo*1.001),"1",t+59999,"1","1","1","1","0"]]; };
    const r2=await main(opts,{fetch:mock.fetch,WebSocket:null});
    const tr=readJsonl(path.join(logs,'trades.jsonl')).find(t=>t.id===near.id);
    ok(tr&&tr.exits[0].k==='stop'&&tr.r<-0.9&&tr.r>-1.3,'boşluk doldurmada stop işlenmedi: '+JSON.stringify(tr&&{r:tr.r,ex:tr.exits}));
    ok(!r2.B.bot.positions.some(x=>x.id===near.id),'NEAR hâlâ açık');
  } else errors.push('NEAR pozisyonu yok (senaryo değişti mi?)');
  const ev=readJsonl(path.join(logs,`events-${day}.jsonl`)); ok(ev.some(e=>e.type==='scan')&&ev.some(e=>e.type==='fill')&&ev.some(e=>e.type==='close'),'olay günlüğü eksik');
  ok(fs.existsSync(path.join(dir,'status.json'))&&fs.existsSync(path.join(dir,'bot.json')),'durum dosyaları yok');
  console.log('votes',votes.length,'events',ev.length,'trades',readJsonl(path.join(logs,'trades.jsonl')).length);
  console.log('errors',JSON.stringify(errors));
  fs.rmSync(dir,{recursive:true,force:true});
  process.exit(errors.length?1:0);
})().catch(e=>{ console.error(e); console.log('errors',JSON.stringify([String(e)])); process.exit(1); });
