import {createHash} from 'node:crypto';
const local=new Map<string,{count:number;reset:number}>();
function increment(key:string,limit:number,windowMs:number){const now=Date.now();const old=local.get(key);const row=old&&old.reset>now?old:{count:0,reset:now+windowMs};row.count++;local.set(key,row);return row.count<=limit;}
export async function allowRandyAI(identity:string){
 const hash=createHash('sha256').update(identity).digest('hex');
 const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
 if(url&&token){
  // Atomic fixed-window counters: per visitor and shared spend cap across instances.
  const script="local a=redis.call('INCR',KEYS[1]); if a==1 then redis.call('EXPIRE',KEYS[1],600) end; local b=redis.call('INCR',KEYS[2]); if b==1 then redis.call('EXPIRE',KEYS[2],3600) end; if a>12 or b>300 then return 0 else return 1 end";
  const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(3000),body:JSON.stringify(['EVAL',script,'2',`randy:visitor:${hash}`,'randy:global'])});
  if(!response.ok)return false;const result=await response.json();return result.result===1;
 }
 if(process.env.NODE_ENV==='production')return false;
 if(local.size>2000)for(const [key,row] of local)if(row.reset<Date.now())local.delete(key);
 if(local.size>2000)return false;
 return increment(hash,12,600000)&&increment('global',300,3600000);
}
