// Sahte Binance REST (tests/dom-scenario.js ile aynı yapay veri): yapay süpürme → MSS → OTE dizisi, liderler, hesap uçları.
// tests/headless-scenario.js kullanır; px(sym) ile ticker/price ve 1 dk mumlar test içinden yönlendirilebilir.
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
const resp=(obj,ok=true,status=200)=>Promise.resolve({ok,status,json:()=>Promise.resolve(obj),text:()=>Promise.resolve(JSON.stringify(obj))});
const SYMS=['ENAUSDT','NEARUSDT'];
const ctl={px:{},k1m:null};
function mockFetch(u){ if(u.startsWith('https://www.binance.com/bapi/')){ const now=Date.now(); if(u.includes('query-list')) return resp({code:"000000",data:{list:[{leadPortfolioId:"1",nickname:"Lider1",roi:120,pnl:5000,aum:50000,mdd:20,winRate:70,currentCopyCount:200,sharpRatio:2},{leadPortfolioId:"2",nickname:"Lider2",roi:80,pnl:3000,aum:30000,mdd:30,winRate:60,currentCopyCount:90,sharpRatio:1.2}]}});
      if(u.includes('position-history')) return resp({code:"000000",data:{list:[{symbol:'ENAUSDT',side:'Long',opened:now-6*3600e3,closed:now-3600e3,avgCost:0.098,avgClosePrice:0.1,closingPnl:120,leverage:'20',roi:'0.4'},{symbol:'NEARUSDT',side:'Short',opened:now-30*3600e3,closed:now-20*3600e3,avgCost:0.11,avgClosePrice:0.1,closingPnl:50,leverage:'10',roi:'0.2'}]}});
      if(u.includes('order-history')) return resp({code:"000000",data:{list:[{symbol:'ENAUSDT',side:'BUY',positionSide:'LONG',executedQty:1000,avgPrice:0.098,orderTime:now-6*3600e3},{symbol:'ENAUSDT',side:'BUY',positionSide:'LONG',executedQty:500,avgPrice:0.099,orderTime:now-5*3600e3},{symbol:'ENAUSDT',side:'SELL',positionSide:'LONG',executedQty:1500,avgPrice:0.1,orderTime:now-3600e3},{symbol:'UNIUSDT',side:'BUY',positionSide:'LONG',executedQty:200,avgPrice:0.1,orderTime:now-1800e3}]}});
      return resp({code:"000000",data:{}}); }
    const p=u.replace('https://fapi.binance.com',''); const sym=(p.match(/symbol=(\w+)/)||[])[1];
    if(p.startsWith('/futures/data/')){ const n=+(p.match(/limit=(\d+)/)[1]); const per=p.includes('period=15m')?9e5:3e5; return resp(Array.from({length:n},(_,i)=>({buySellRatio:String(1.1),longShortRatio:String(2),sumOpenInterestValue:String(4e6-i*1e3),timestamp:Date.now()-(n-i)*per}))); }
    if(p.startsWith('/fapi/v1/klines')){ const m=p.match(/interval=(\w+)&limit=(\d+)/); const n=+m[2]; if(m[1]==='15m') return resp(k15(n)); if(m[1]==='1d') return resp(klDaily(n)); return resp(klGen(n,{'5m':3e5,'1h':36e5,'4h':144e5}[m[1]])); }
    if(p.startsWith('/fapi/v1/exchangeInfo')) return resp({symbols:SYMS.map(s=>({symbol:s,contractType:'PERPETUAL',quoteAsset:'USDT',status:'TRADING'}))});
    if(p.startsWith('/fapi/v1/ticker/24hr')){ const one=s=>({symbol:s,lastPrice:'0.1006',priceChangePercent:'2.1',highPrice:'0.1045',lowPrice:'0.0984',quoteVolume:'60000000'}); return resp(sym?one(sym):SYMS.map(one)); }
    if(p.startsWith('/fapi/v1/premiumIndex')){ const one=s=>({symbol:s,markPrice:'0.1006',lastFundingRate:'0.00005',nextFundingTime:String(Date.now()+3600e3)}); return resp(sym?one(sym):SYMS.map(one)); }
    if(p.startsWith('/fapi/v1/depth')) return resp({bids:[['0.1005','100000'],['0.1','200000']],asks:[['0.1007','100000'],['0.102','200000']]});
    if(p.startsWith('/fapi/v1/aggTrades')) return resp([{p:'0.1006',q:'1000',m:false,T:Date.now()},{p:'0.1006',q:'800',m:true,T:Date.now()}]);
    if(p.startsWith('/fapi/v1/fundingRate')) return resp([{fundingRate:'0.00005',fundingTime:Date.now()-3600e3}]);
    if(p.startsWith('/fapi/v1/time')) return resp({serverTime:Date.now()});
    if(p.startsWith('/fapi/v2/balance')) return resp([{asset:'USDT',balance:'250.5',availableBalance:'190.2',crossUnPnl:'-3.1'}]);
    if(p.startsWith('/fapi/v2/positionRisk')) return resp([{symbol:'DASHUSDT',positionAmt:'28.34',entryPrice:'60',markPrice:'59.04',liquidationPrice:'57.33',leverage:'20',marginType:'cross',isolatedMargin:'0',unRealizedProfit:'-27.2',updateTime:Date.now()}]);
    if(p.startsWith('/fapi/v1/openOrders')) return resp([{symbol:'DASHUSDT',side:'SELL',type:'STOP_MARKET',price:'0',stopPrice:'58.2',origQty:'28.34',executedQty:'0',reduceOnly:true,closePosition:true,time:Date.now()}]);
    if(p.startsWith('/fapi/v1/listenKey')) return resp({listenKey:'abc'});
    return resp({},false,404);
}
function routed(u){ const p=u.replace('https://fapi.binance.com',''); const sym=(p.match(/symbol=(\w+)/)||[])[1];
  if(p.startsWith('/fapi/v1/ticker/price')){ const one=s=>({symbol:s,price:String(ctl.px[s]||0.1006)}); return resp(sym?one(sym):SYMS.map(one)); }
  if(p.startsWith('/fapi/v1/klines')&&p.includes('interval=1m')) return resp(ctl.k1m?ctl.k1m(sym,p):[]);
  return mockFetch(u); }
module.exports={fetch:routed,ctl,SYMS};
