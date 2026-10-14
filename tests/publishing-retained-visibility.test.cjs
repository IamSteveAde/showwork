'use strict';const {test}=require('node:test'),assert=require('node:assert/strict'),{load}=require('./helpers/load-typescript.cjs');
test('canonical read facade hides deleted parents and nested posts without granting reconciliation authority',async()=>{
 const {retainedPublishingModel}=load('lib/publishing/retainedVisibility.ts');let where;
 const database={$queryRawUnsafe:async()=>[{resourceType:'POST',resourceId:'deleted'},{resourceType:'WORKSPACE',resourceId:'deleted-calendar'}]};
 const model=retainedPublishingModel(database,'socialCalendar',{findMany:async a=>{where=a;return [{id:'calendar',posts:[{id:'deleted'},{id:'visible'}]},{id:'deleted-calendar'}];}});
 assert.deepEqual(await model.findMany({include:{posts:true}}),[{id:'calendar',posts:[{id:'visible'}]}]);assert.deepEqual(where.where.NOT,[{id:{in:['deleted-calendar']}}]);assert.deepEqual(where.include.posts.where.NOT,[{id:{in:['deleted']}}]);const membership=retainedPublishingModel(database,'calendarCollaborator',{findMany:async()=>[{id:'member',calendar:{id:'deleted-calendar'}},{id:'visible-member',calendar:{id:'calendar'}}]});assert.deepEqual(await membership.findMany(),[{id:'visible-member',calendar:{id:'calendar'}}]);
});
