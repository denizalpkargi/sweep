// Motoru (yamalı engine + strat2 + strat3) DOM'suz Node ortamında yükler; geriye dönük test araçları bunu kullanır.
const {patchedEngine}=require('../src/build.js');
function loadEngine(){
  const src=patchedEngine()+`\nreturn {K,analyze,poolsAt,amdDetect,amdStats,breakoutRetest,breakoutStats,regimeSweep,regimeStats,simTrade,atrAt,btcRegimeAt,RS_CFG,SIM_FEE,liqDist,HC_MAX_LEV,consistencyOf,killZone,state,committee,ld,lab,LAB_CFG,LAB_FEATS,labIngest,labHarvest,labEnrich,labAnalyze,labMatch,labFeat,labTick,labEvalShadows,labAgg1h,setPoolCache:m=>{ _poolCache=m; }};`;
  const stub={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
  const doc={getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),addEventListener:()=>{}};
  const fn=new Function('window','document','localStorage','navigator','"use strict";\n'+src);
  return fn({},doc,stub,{});
}
module.exports={loadEngine};
