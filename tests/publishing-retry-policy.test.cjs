const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');const {proposeRetryGeneration}=load('lib/publishing/retryPolicy.ts');
const base={attemptId:'old-attempt',generation:1,evidenceId:'verified-evidence',actorStopped:true};
test('verified no-send can propose a fresh generation without mutating prior evidence',()=>{
 const old=Object.freeze({...base,outcome:'NOT_SENT',verifiedNoSend:true});
 assert.deepEqual(proposeRetryGeneration(old),{decision:'PROPOSE_NEXT_GENERATION',generation:2,previousAttemptId:'old-attempt',evidenceId:'verified-evidence'});
 assert.equal(old.generation,1);
 for(const patch of [{actorStopped:false},{verifiedNoSend:false},{evidenceId:undefined}])assert.equal(proposeRetryGeneration({...old,...patch}).decision,'DENY');
});
test('provider rejection requires definitive retryable evidence and explicit approval',()=>{
 const old={...base,outcome:'REJECTED',definitiveProviderRejection:true,retryable:true,retryApproved:true};
 assert.equal(proposeRetryGeneration(old).decision,'PROPOSE_NEXT_GENERATION');
 for(const key of ['definitiveProviderRejection','retryable','retryApproved','actorStopped'])assert.equal(proposeRetryGeneration({...old,[key]:false}).decision,'DENY');
});
test('unknown/authorized/accepted never become a retry even with override flags',()=>{
 for(const outcome of ['UNKNOWN','AUTHORIZED','ACCEPTED'])assert.equal(proposeRetryGeneration({...base,outcome,verifiedNoSend:true,retryApproved:true,definitiveProviderRejection:true,retryable:true}).decision,'RECONCILE');
});
test('confirmed publication needs a new authorized intent; invalid generations fail closed',()=>{
 assert.equal(proposeRetryGeneration({...base,outcome:'CONFIRMED'}).decision,'NEW_AUTHORIZED_INTENT');
 for(const generation of [0,-1,NaN,Infinity,2147483647])assert.equal(proposeRetryGeneration({...base,outcome:'NOT_SENT',generation,verifiedNoSend:true}).decision,'DENY');
});
