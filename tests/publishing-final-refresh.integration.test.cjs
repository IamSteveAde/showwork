'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {startOwnershipCluster}=require('./helpers/ownership-cluster.cjs'),{acceleratedFixture}=require('./helpers/accelerated-fixture.cjs');
test('refresh rotation remains transactional and destination-fenced',async t=>{
 const cluster=await startOwnershipCluster();let number=10000;
 try {
  for(const race of ['none','rotation','disconnect'])await t.test(race,()=>acceleratedFixture(cluster,++number,async h=>{
   await h.q(`ALTER TABLE "SocialConnection" ADD COLUMN "refreshToken" text, ADD COLUMN "refreshTokenExpiresAt" timestamptz`);await h.q(`UPDATE "SocialConnection" SET "refreshToken"='original' WHERE id='connection'`);
   const scheduled=await h.actions.publishing(h.request(),'schedule'),target=await h.target(scheduled.jobId);
   const service=h.shared('lib/publishing/tokenRefreshFence.ts').createFencedTokenRefresh({database:h.db,validation:h.v,coordination:h.coordination,refresh:async input=>{
    assert.equal(input.refreshToken,'original');
    if(race==='rotation')await h.q(`UPDATE "SocialConnection" SET "refreshToken"='other-rotation' WHERE id='connection'`);
    if(race==='disconnect')await h.q(`UPDATE "SocialConnection" SET status='DISCONNECTED' WHERE id='connection'`);
    return {accessToken:'new-access',expiresAt:new Date(Date.now()+60000),scopes:'tweet.write',accountId:target.providerAccountId,refreshToken:'new-refresh',refreshTokenExpiresAt:new Date(Date.now()+3600000)};
   }});
   if(race==='none'){assert.equal((await service.refresh(target)).maySend,false);const row=(await h.q(`SELECT "accessToken","refreshToken" FROM "SocialConnection" WHERE id='connection'`)).rows[0];assert.equal(row.accessToken,'new-access');assert.equal(row.refreshToken,'new-refresh');}
   else {await assert.rejects(service.refresh(target),/FENCED/);assert.notEqual((await h.q(`SELECT "accessToken" FROM "SocialConnection" WHERE id='connection'`)).rows[0].accessToken,'new-access');}
   assert.equal((await h.q('SELECT count(*)::int n FROM "PublishingSendCapability"')).rows[0].n,0);
  }));
 }finally{await cluster.close();}
});
