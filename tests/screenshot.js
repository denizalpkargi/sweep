const {chromium}=require('playwright'); const fs=require('fs');
const STEP=9e5;
// crafted 15m series: flat zigzag, equal highs at 0.106 (×2), equal lows at 0.099 (×2), sweep, displacement (MSS+FVG), pullback into OTE at the last candle
function k15(n){
  const now=Date.now(); const sweepT=new Date(); sweepT.setUTCHours(13,0,0,0); // sweep candle inside the New York kill zone
  const t0=sweepT.getTime()-(n-10)*STEP;
  const out=[]; const row=(i,o,h,l,c,tbShare=0.5)=>{ const q=100000; out.push([t0+i*STEP,String(o),String(h),String(l),String(c),"1000",t0+(i+1)*STEP-1,String(q),"50",String(q*tbShare),String(q*tbShare),"0"]); };
  for(let i=0;i<n;i++){
    const z=(i%2?1:-1)*0.0003; let o=0.1-z, c=0.1+z, h=Math.max(o,c)+0.0002, l=Math.min(o,c)-0.0002, tb=0.5;
    if(i===n-60||i===n-50){ h=0.106; }
    if(i===n-30||i===n-24){ l=0.099; }
    if(i===n-10){ o=0.0998; l=0.0984; c=0.1000; h=0.1001; tb=0.6; }
    if(i===n-9){ o=0.1000; c=0.1012; l=0.0999; h=0.1013; tb=0.65; }
    if(i===n-8){ o=0.1012; c=0.1026; l=0.1012; h=0.1028; tb=0.65; }
    if(i===n-7){ o=0.1026; c=0.1040; l=0.1025; h=0.1045; tb=0.6; }
    if(i===n-6){ o=0.1040; c=0.1032; l=0.1030; h=0.1041; }
    if(i===n-5){ o=0.1032; c=0.1024; l=0.1022; h=0.1033; }
    if(i===n-4){ o=0.1024; c=0.1016; l=0.1014; h=0.1025; }
    if(i===n-3){ o=0.1016; c=0.1011; l=0.1010; h=0.1017; }
    if(i===n-2){ o=0.1011; c=0.1009; l=0.1008; h=0.1012; }
    if(i===n-1){ o=0.1009; c=0.1006; l=0.1005; h=0.1010; tb=0.55; }
    row(i,o,h,l,c,tb);
  }
  return out;
}
function klDaily(n){ const out=[]; let p=0.1/Math.pow(1.003,n)*0.995, t=Date.now()-n*864e5; for(let i=0;i<n;i++){ const o=p, c=p*1.003*(1+(i%3-1)*0.002), h=Math.max(o,c)*1.01, l=Math.min(o,c)*0.99; out.push([t+i*864e5,String(o),String(h),String(l),String(c),"1000",t+(i+1)*864e5-1,"5000000","100","2500000","2500000","0"]); p=c; } return out; }
function klGen(n,step){ const out=[]; let p=0.1, t=Date.now()-n*step; for(let i=0;i<n;i++){ const o=p, c=p*(1+Math.sin(i/5)*0.002), h=Math.max(o,c)*1.001, l=Math.min(o,c)*0.999; out.push([t+i*step,String(o),String(h),String(l),String(c),"1000",t+(i+1)*step-1,"100000","50","50000","50000","0"]); p=c; } return out; }

const SYMS=['ENAUSDT','NEARUSDT','UNIUSDT','WLDUSDT'];
function data(p){ const sym=(p.match(/symbol=(\w+)/)||[])[1];
  if(p.startsWith('/futures/data/')){ const n=+(p.match(/limit=(\d+)/)[1]); const per=p.includes('period=15m')?9e5:3e5; return Array.from({length:n},(_,i)=>({buySellRatio:String(1.05+Math.sin(i/3)*0.2),longShortRatio:String(2+Math.cos(i/4)*0.3),sumOpenInterestValue:String(4e6+Math.sin(i/5)*2e5),timestamp:Date.now()-(n-i)*per})); }
  if(p.startsWith('/fapi/v1/klines')){ const m=p.match(/interval=(\w+)&limit=(\d+)/); const n=+m[2]; if(m[1]==='15m') return k15(n); if(m[1]==='1d') return klDaily(n); return klGen(n,{'5m':3e5,'1h':36e5,'4h':144e5}[m[1]]); }
  if(p.startsWith('/fapi/v1/exchangeInfo')) return {symbols:SYMS.map(s=>({symbol:s,contractType:'PERPETUAL',quoteAsset:'USDT',status:'TRADING'}))};
  if(p.startsWith('/fapi/v1/ticker/24hr')){ const one=s=>({symbol:s,lastPrice:'0.1006',priceChangePercent:'2.1',highPrice:'0.1045',lowPrice:'0.0984',quoteVolume:'60000000'}); return sym?one(sym):SYMS.map(one); }
  if(p.startsWith('/fapi/v1/premiumIndex')){ const one=s=>({symbol:s,markPrice:'0.1006',lastFundingRate:'0.00005',nextFundingTime:String(Date.now()+3600e3)}); return sym?one(sym):SYMS.map(one); }
  if(p.startsWith('/fapi/v1/depth')) return {bids:[['0.1005','1000000'],['0.1','2000000']],asks:[['0.1007','1000000'],['0.102','2000000']]};
  if(p.startsWith('/fapi/v1/aggTrades')) return [{p:'0.1006',q:'1000',m:false,T:Date.now()},{p:'0.1006',q:'800',m:true,T:Date.now()}];
  if(p.startsWith('/fapi/v1/fundingRate')) return [{fundingRate:'0.00005',fundingTime:Date.now()-3600e3},{fundingRate:'0.00008',fundingTime:Date.now()-7200e3},{fundingRate:'0.00002',fundingTime:Date.now()-10800e3}];
  return null; }
(async()=>{
  const br=await chromium.launch();
  for(const [name,vp,full] of [['desktop',{width:1366,height:800},false],['mobile',{width:390,height:844},true]]){
    const ctx=await br.newContext({viewport:vp,deviceScaleFactor:1,locale:'tr-TR',timezoneId:'Europe/Istanbul'}); const page=await ctx.newPage();
    page.on('pageerror',e=>console.log('PAGEERROR',e.message)); page.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE',m.text().slice(0,200)); });
    
    await page.addInitScript(()=>{
      class MockWS{ constructor(url){ this.url=url; this.readyState=0; setTimeout(()=>{ this.readyState=1; this.onopen&&this.onopen(); this._run(); },300); }
        _send(stream,data){ this.onmessage&&this.onmessage({data:JSON.stringify({stream,data})}); }
        _run(){ const s=this.url.split('streams=')[1].split('/')[0].split('@')[0]; const S=s.toUpperCase(); let px=0.1012, i=0;
          this._iv=setInterval(()=>{ i++; px=0.1012-Math.min(0.0008,i*0.00004); const big=i%7===0; this._send(`${s}@trade`,{p:String(px),q:String(big?400000:3000),m:i%3===0,T:Date.now()});
            if(i%5===0) this._send(`${s}@markPrice@1s`,{p:String(px+0.00001),r:"0.00012",T:Date.now()+3600e3});
            if(i%4===0) this._send(`${s}@kline_15m`,{k:{t:Math.floor(Date.now()/9e5)*9e5,o:"0.1009",h:"0.1013",l:String(px),c:String(px),q:"120000"}});
            if(i%6===0) this._send(`${s}@depth20@500ms`,{E:Date.now(),b:[[String(px-0.0001),"900000"],[String(px-0.0002),"500000"]],a:[[String(px+0.0001),"300000"],[String(px+0.0002),"200000"]]});
            if(i===8) this._send(`${s}@forceOrder`,{o:{s:S,S:"SELL",ap:String(px),q:"600000",T:Date.now()}});
            if(i>=10&&i<=13) this._send("!forceOrder@arr",{o:{s:"NEARUSDT",S:"SELL",ap:"0.1",q:"900000",T:Date.now()}});
          },200); }
        close(){ clearInterval(this._iv); this.readyState=3; this.onclose&&this.onclose(); } }
      window.WebSocket=MockWS; });
    await page.route('**/*',route=>{ const u=route.request().url();
      if(u.startsWith('https://fapi.binance.com')){ const d=data(u.replace('https://fapi.binance.com','')); return d?route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)}):route.fulfill({status:404,body:'{}'}); }
      if(u.includes('lightweight-charts')) return route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(__dirname+'/../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js')});
      if(u.includes('fonts.g')) return route.abort();
      return route.continue(); });
    await page.goto('file://'+__dirname+'/../site/index.html');
    await page.waitForTimeout(8000); console.log(name,'feed:',(await page.textContent('#feed')).replace(/\s+/g,' ').slice(0,900)); console.log(name,'tape:',(await page.textContent('#tapeHead')).replace(/\s+/g,' ')); console.log(name,'tape rows:',await page.locator('#tape .tp').count(),'| ws:',await page.textContent('#wsTxt'),'| permit:',(await page.textContent('#permit')).replace(/\s+/g,' '),'| px:',await page.textContent('#hPx'));
    if(name==='desktop'){ await page.click('#drawer .bar [data-t="scan"]'); await page.waitForTimeout(800); }
    await page.screenshot({path:__dirname+`/shot-${name}.png`,fullPage:full});
    await ctx.close();
  }
  await br.close();
})();
