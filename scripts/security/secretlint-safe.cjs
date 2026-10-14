'use strict';
// Never echo scanner messages/source: even a scanner's error message may contain a secret.
const {spawnSync,execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const allFiles=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(f=>f&&fs.existsSync(path.join(root,f))&&fs.lstatSync(path.join(root,f)).isFile());
const files=allFiles.filter(f=>! /\.(?:png|jpe?g|gif|webp|ico|mov|mp4|woff2?|ttf|pdf|gz)$/i.test(f));
// Supplemental byte-pattern scanner still covers binary assets.
const bin=path.join(root,'node_modules/secretlint/bin/secretlint.js');
if(!fs.existsSync(bin)){console.error('SECRET_SCANNER_NOT_INSTALLED: run npm ci after reviewing package scripts.');process.exit(2);}
const rules=JSON.stringify({rules:[{id:'@secretlint/secretlint-rule-preset-recommend'}]});
let findings=0;
for(let i=0;i<files.length;i+=20){
 const result=spawnSync(process.execPath,[bin,'--no-glob','--no-gitignore','--secretlintrcJSON',rules,'--format=json',...files.slice(i,i+20)],{cwd:root,encoding:'utf8',maxBuffer:128*1024*1024});
 if(result.error||![0,1].includes(result.status)){console.error(JSON.stringify({error:'SECRET_SCANNER_FAILED',batch:i,status:result.status,code:result.error?.code,signal:result.signal}));process.exit(2);}
 let report;try{report=JSON.parse(result.stdout);}catch{console.error('SECRET_SCANNER_INVALID_REPORT');process.exit(2);}
 for(const file of report)for(const m of file.messages||[]){findings++;console.log(JSON.stringify({file:path.relative(root,file.filePath),rule:m.ruleId,line:m.loc?.start?.line}));}
}
console.log(JSON.stringify({textFilesScanned:files.length,binaryFilesHandledBySupplementalScan:allFiles.length-files.length,findings,valuesPrinted:false}));process.exitCode=findings?1:0;
