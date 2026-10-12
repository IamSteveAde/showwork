'use strict';
const {performance}=require('node:perf_hooks');
// Wall-clock expiry plus a monotonic ceiling: a clock correction cannot extend
// an already-running diagnostic window beyond its original remaining lifetime.
function createExpiry(absolute,{wall=Date.now,monotonic=()=>performance.now(),maximumMs=7200000}={}){
  const end=typeof absolute==='number'?absolute:Date.parse(absolute);if(!Number.isFinite(end))throw new Error('INVALID_EXPIRY');
  const deadline=monotonic()+Math.min(maximumMs,Math.max(0,end-wall()));
  return {expired:()=>wall()>=end||monotonic()>=deadline,remainingMs:()=>Math.max(0,Math.min(end-wall(),deadline-monotonic()))};
}
module.exports={createExpiry};
