'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
const bridge=load('lib/publishing/eligibilityPolicy.ts');
const existing=load('lib/contentWorkspaceUsage.ts',{'@/lib/db':{db:{}}});
const {effectiveTeamPermissions}=load('lib/calendarTeamPolicy.ts');
test('pure bridge matches existing paid/trial/projected/cached/legacy entitlement rules',()=>{
 const now=new Date(),past=new Date(0),future=new Date('2100-01-01');
 const base={id:'owner',isDeactivated:false,contentWorkspacePlan:'CREATOR',contentWorkspaceBillingStatus:'ACTIVE',contentWorkspaceTrialEndsAt:null,isComped:false,compedUntil:null};
 const variants=[{}, {contentWorkspaceBillingStatus:'OFFLINE'}, {contentWorkspaceBillingStatus:'TRIAL',contentWorkspaceTrialEndsAt:future}, {contentWorkspaceBillingStatus:'TRIAL',contentWorkspaceTrialEndsAt:past},
  {contentWorkspaceBillingStatus:'ACTIVE',contentWorkspaceTrialEndsAt:future}, {contentWorkspacePlan:null},
  {contentWorkspaceBillingStatus:'OFFLINE',isComped:true}, {contentWorkspaceBillingStatus:'OFFLINE',isComped:true,compedUntil:past},
  {contentWorkspaceBillingStatus:'OFFLINE',workspaceCompedPlan:'STUDIO',workspaceCompedUntil:future},
  {contentWorkspaceBillingStatus:'OFFLINE',billingComplimentaryGrants:[{product:'CONTENT_WORKSPACE',plan:'UNLIMITED',endsAt:future.toISOString()}]},
  {contentWorkspaceBillingStatus:'OFFLINE',billingComplimentaryGrants:[{product:'CONTENT_WORKSPACE',plan:'UNLIMITED',endsAt:past.toISOString()}]}];
 for(const v of variants){const owner={...base,...v},b=bridge.workspaceEligibility(owner,1,now);assert.equal(b.plan,existing.getContentWorkspacePlan(owner));assert.equal(b.allowed,existing.canAccessContentWorkspace(owner)&&!!b.plan);}
 assert.equal(bridge.workspaceEligibility(base,6,now).allowed,false);
});
test('existing legacy role aliases and permission dependencies are preserved',()=>{
 assert.ok(effectiveTeamPermissions('EDIT_CALENDAR').includes('publishing.manage'));
 assert.equal(effectiveTeamPermissions('ADD_CONTENT').includes('publishing.manage'),false);
 assert.equal(effectiveTeamPermissions('VIEW_ONLY').includes('publishing.manage'),false);
 assert.equal(effectiveTeamPermissions('SOCIAL_MEDIA_MANAGER',['publishing.manage'],true).includes('publishing.manage'),false);
});
test('account grant hash is order independent and excludes token rotation; content hash excludes timestamps',()=>{
 const c={id:'connection',platform:'X',platformAccountId:'account',tokenScopes:'tweet.write users.read'};
 assert.equal(bridge.accountAuthorizationHash(c),bridge.accountAuthorizationHash({...c,tokenScopes:'users.read,tweet.write,tweet.write',accessToken:'new-token'}));
 assert.notEqual(bridge.accountAuthorizationHash(c),bridge.accountAuthorizationHash({...c,platformAccountId:'replacement'}));
 const p={platform:'X',caption:'caption',postType:null,updatedAt:new Date(0)};
 assert.equal(bridge.publishingContentHash(p,[]),bridge.publishingContentHash({...p,updatedAt:new Date()},[]));
 assert.notEqual(bridge.publishingContentHash(p,[]),bridge.publishingContentHash({...p,caption:'changed'},[]));
});
