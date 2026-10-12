'use strict';
// This entry point cannot accept a production destination. No production entry
// point, deployment automation or role activation is supplied in this phase.
const fs=require('node:fs');
const {createGateway,createServer}=require('./ingress.cjs');
const {Supervisor}=require('./supervisor.cjs');
const [manifestPath,directory,executorConfig,tlsKey,tlsCertificate]=process.argv.slice(2);
if(!manifestPath||!directory||!executorConfig||!tlsKey||!tlsCertificate)throw new Error('Supply manifest, private ledger directory, staging executor config, TLS key and certificate paths');
const supervisor=new Supervisor(executorConfig),gateway=createGateway({manifest:JSON.parse(fs.readFileSync(manifestPath)),directory,executor:supervisor,emergencyFile:directory+'/STOP'});
const server=createServer(gateway,{tlsOptions:{key:fs.readFileSync(tlsKey),cert:fs.readFileSync(tlsCertificate),minVersion:'TLSv1.2'}});server.listen(0,'127.0.0.1',()=>process.stdout.write(JSON.stringify({loopbackOnly:true,tls:true,port:server.address().port})+'\n'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{await gateway.close();server.close();});
