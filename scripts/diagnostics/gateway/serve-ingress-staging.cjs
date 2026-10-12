'use strict';
const fs=require('node:fs');
const {createServer}=require('./ingress.cjs'),{createUnixRelay}=require('./unix-relay.cjs');
const [manifestFile,socketFile,tlsKey,tlsCertificate]=process.argv.slice(2);
if(!manifestFile||!socketFile||!tlsKey||!tlsCertificate)throw new Error('Supply public manifest, private socket path and ingress TLS paths');
const relay=createUnixRelay({manifest:JSON.parse(fs.readFileSync(manifestFile)),socketPath:socketFile});
const server=createServer(relay,{tlsOptions:{key:fs.readFileSync(tlsKey),cert:fs.readFileSync(tlsCertificate),minVersion:'TLSv1.2'}});
server.listen(0,'127.0.0.1',()=>process.stdout.write(JSON.stringify({loopbackOnly:true,tls:true,port:server.address().port})+'\n'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close());
