'use strict';
const {fork}=require('node:child_process');
const path=require('node:path');
const {performance}=require('node:perf_hooks');
class Supervisor {
  constructor(configFile,{workMs=10000,killMs=12000,worker=path.join(__dirname,'executor-worker.cjs')}={}){this.configFile=configFile;this.workMs=workMs;this.killMs=killMs;this.worker=worker;this.child=null;this.active=false;this.stopped=false;this.uncertain=false;}
  async ready(){
    if(this.stopped||this.uncertain)throw new Error('DISABLED');
    if(this.child)return;
    const child=fork(this.worker,[],{env:{PATH:process.env.PATH,NODE_ENV:'production',SHOWWORK_EXECUTOR_CONFIG:this.configFile},stdio:['ignore','ignore','ignore','ipc'],execArgv:[]});this.child=child;
    child.once('exit',()=>{if(this.child===child)this.child=null;});
    try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('TIMEOUT')),4000);const fail=()=>{clearTimeout(timer);reject(new Error('EXECUTOR_UNAVAILABLE'));};child.once('exit',fail);child.once('error',fail);child.once('message',m=>{clearTimeout(timer);child.removeListener('exit',fail);child.removeListener('error',fail);if(m?.ready===true)resolve();else reject(new Error('EXECUTOR_UNAVAILABLE'));});});}
    catch(error){await this.terminate();throw error;}
  }
  async terminate(){
    const child=this.child;if(!child||child.exitCode!==null||child.signalCode!==null)return;this.uncertain=true;
    await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('UNCERTAIN_TERMINATION')),Math.max(50,this.killMs-this.workMs));child.once('exit',()=>{clearTimeout(timeout);this.uncertain=false;resolve();});child.kill('SIGKILL');});
  }
  async measure(task){
    if(this.active)throw new Error('BUSY');this.active=true;const started=performance.now();
    try{await this.ready();const child=this.child;
      return await new Promise((resolve,reject)=>{
        const done=(error,value)=>{clearTimeout(timer);child.removeListener('message',response);child.removeListener('exit',exit);child.removeListener('error',exit);error?reject(error):resolve(value);};
        const exit=()=>done(new Error('EXECUTOR_UNAVAILABLE'));
        const response=m=>m?.ok===true?done(null,m.value):done(new Error(m?.code==='PERMISSION_MISMATCH'?'PERMISSION_MISMATCH':'MEASUREMENT_FAILED'));
        const timer=setTimeout(async()=>{child.removeListener('message',response);child.removeListener('exit',exit);child.removeListener('error',exit);try{await this.terminate();done(new Error('TIMEOUT'));}catch{done(new Error('UNCERTAIN_TERMINATION'));}},Math.max(1,this.workMs-(performance.now()-started)));
        child.on('message',response);child.once('exit',exit);child.once('error',exit);child.send(task,error=>{if(error)done(new Error('EXECUTOR_UNAVAILABLE'));});
      });
    }finally{this.active=false;}
  }
  async stop(){this.stopped=true;await this.terminate();}
}
module.exports={Supervisor};
