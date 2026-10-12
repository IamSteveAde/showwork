'use strict';
// Client-safe contract: no SQL templates, database destinations or dependencies.
module.exports=Object.freeze({
  QUOTAS:Object.freeze({transport:10,'fresh-connection':10,'warm-roundtrip':10,'warm-transaction':10,'scheduler-select-plan':20}),
  queryHash:'c13e2048de5a281df17dd2da6327a9b7a1b799f3f115018671e42db2c9358dfe',
});
