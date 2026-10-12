'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { QUOTAS } = require('./contract.cjs');
class Ledger {
  constructor(directory,manifest) {
    this.directory = directory; this.runId = manifest.runId; this.lock = path.join(directory,'owner.lock'); this.file = path.join(directory,'ledger.json');
    if (!fs.existsSync(directory)) fs.mkdirSync(directory,{mode:0o700,recursive:true});
    const stat = fs.lstatSync(directory); if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw new Error('INSECURE_LEDGER');
    this.owner = fs.openSync(this.lock,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
    try {
      if (fs.existsSync(this.file)) {
        const fd=fs.openSync(this.file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW); try { this.state=JSON.parse(fs.readFileSync(fd,'utf8')); } finally { fs.closeSync(fd); }
        this.validate();
        if (this.state.active) { this.state.disabled=true; this.write(); }
      } else { this.state={version:1,runId:this.runId,total:0,counts:Object.fromEntries(Object.keys(QUOTAS).map(p=>[p,0])),nonces:[],recent:[],active:false,disabled:false,failures:0}; this.write(); }
    } catch(error) { this.close(); throw error; }
  }
  validate() {
    const s=this.state;
    if (!s || s.version!==1 || s.runId!==this.runId || !Number.isInteger(s.total) || s.total<0 || s.total>60 || !Array.isArray(s.nonces) || s.nonces.length!==s.total || new Set(s.nonces).size!==s.total || s.nonces.some(n=>!/^[a-f0-9]{48}$/.test(n)) || !Array.isArray(s.recent) || s.recent.some(t=>!Number.isFinite(t)) || typeof s.active!=='boolean' || typeof s.disabled!=='boolean' || !Number.isInteger(s.failures) || s.failures<0 || Object.keys(s.counts||{}).sort().join(',')!==Object.keys(QUOTAS).sort().join(',') || Object.entries(QUOTAS).some(([p,max])=>!Number.isInteger(s.counts[p])||s.counts[p]<0||s.counts[p]>max) || Object.values(s.counts).reduce((n,v)=>n+v,0)!==s.total) throw new Error('CORRUPT_LEDGER');
  }
  write() {
    const temporary=path.join(this.directory,`ledger-${process.pid}.tmp`);
    const fd=fs.openSync(temporary,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
    try { fs.writeFileSync(fd,JSON.stringify(this.state)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temporary,this.file);
    const dir=fs.openSync(this.directory,fs.constants.O_RDONLY); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
  }
  reserve(profile,nonce,now) {
    if (this.state.disabled) throw new Error('DISABLED');
    if (this.state.nonces.includes(nonce)) throw new Error('REPLAY');
    if (this.state.active) throw new Error('BUSY');
    if (this.state.total>=60 || this.state.counts[profile]>=QUOTAS[profile]) throw new Error('BUDGET');
    this.state.recent=this.state.recent.filter(t=>t>now-60000);
    if (this.state.recent.length>=6) throw new Error('RATE_LIMIT');
    const ordinal=this.state.counts[profile]++;
    this.state.total++; this.state.nonces.push(nonce); this.state.recent.push(now); this.state.active=true; this.write();
    return ordinal;
  }
  complete(success) { this.state.active=false; this.state.failures=success?0:this.state.failures+1; if(this.state.failures>=2)this.state.disabled=true; this.write(); }
  disable() { this.state.disabled=true; this.write(); }
  close() { if(this.owner!==undefined){fs.closeSync(this.owner);fs.unlinkSync(this.lock);this.owner=undefined;} }
}
module.exports={Ledger};
