'use strict';
// Synthetic sender only. Never imports native publishers, DB, credentials or HTTP.
const fs=require('node:fs');const c=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!c.effectFile.includes('sw-owner-'))throw Error('DISPOSABLE_FIXTURE_REQUIRED');
process.send({phase:'before-submission',pid:process.pid});
process.on('message',message=>{if(message==='synthetic-submit'){const fd=fs.openSync(c.effectFile,'w',0o600);fs.writeSync(fd,'synthetic external effect');fs.fsyncSync(fd);fs.closeSync(fd);process.send({phase:'after-submission'});}});
setInterval(()=>{},1000);
