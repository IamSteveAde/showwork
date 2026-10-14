'use strict';
const fs=require('node:fs');
let readDenied=false,writeDenied=false;
try{fs.readFileSync(process.argv[2]);}catch{readDenied=true;}
try{fs.writeFileSync(process.argv[2]+'.write-probe','synthetic');}catch{writeDenied=true;}
if(readDenied&&writeDenied)process.stdout.write('SECRET_ACCESS_DENIED\n');else{process.stderr.write('ISOLATION_UNEXPECTED\n');process.exitCode=1;}

