'use strict';
const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process');
const {PrismaClient}=require('@prisma/client');
exports.startPooler=async function(cluster,options={}){
  const source=new URL(cluster.stageUrl);
  if(source.hostname!=='127.0.0.1'||source.port!==String(cluster.port)||source.pathname!=='/'+cluster.database||!/^showwork_gateway_stage_[a-f0-9]{12}$/.test(cluster.database)||source.searchParams.get('sslaccept')!=='strict')throw new Error('Disposable localhost staging cluster required');
  const binary=process.env.SHOWWORK_PGBOUNCER_BINARY||'/tmp/showwork-pgbouncer-build/install/bin/pgbouncer';
  // Synthetic non-superuser backends also carry a PostgreSQL role cap. This
  // prevents reconnect churn from bypassing the pooler's nominal pool size.
  const role='sw_publish_pool_'+cluster.database.slice(-12);
  await cluster.stage.$executeRawUnsafe(`CREATE ROLE "${role}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5`);
  await cluster.stage.$executeRawUnsafe(`ALTER ROLE "${role}" SET statement_timeout='2s'`);
  await cluster.stage.$executeRawUnsafe(`GRANT CONNECT ON DATABASE "${cluster.database}" TO "${role}"`);
  await cluster.stage.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${role}"`);
  await cluster.stage.$executeRawUnsafe(`GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE ON "CalendarPost","PublishingLeader","PublishingBudget","PublishingAdmission","PublishingJob","PublishingAccountLease" TO "${role}"`);
  await cluster.stage.$executeRawUnsafe(`GRANT SELECT,UPDATE ON "PublishingConsumerLease","PublishingWake" TO "${role}"`);
  if(options.nativePublishing){
    await cluster.stage.$executeRawUnsafe(`GRANT SELECT ON "Creator","CalendarCollaborator","CalendarPostAsset","SocialCalendar" TO "${role}"`);
    await cluster.stage.$executeRawUnsafe(`GRANT SELECT,INSERT,UPDATE,DELETE ON "SocialConnection","PublishedSocialPost","TikTokAccountRuntime" TO "${role}"`);
    await cluster.stage.$executeRawUnsafe(`GRANT UPDATE ("tikTokAccessToken","tikTokAccessTokenExpiresAt","tikTokRefreshToken","updatedAt") ON "SocialCalendar" TO "${role}"`);
  }
  const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
  const config=path.join(cluster.directory,'pgbouncer.ini'),auth=path.join(cluster.directory,'pooler-users.txt');
  fs.writeFileSync(auth,'"gateway_stage_admin" ""\n',{mode:0o600});
  fs.writeFileSync(config,`[databases]\n${cluster.database} = host=127.0.0.1 port=${cluster.port} dbname=${cluster.database} user=${role}\n[pgbouncer]\nlisten_addr=127.0.0.1\nlisten_port=${port}\nunix_socket_dir=${cluster.directory}\nauth_type=trust\nauth_file=${auth}\npool_mode=transaction\ndefault_pool_size=5\nmin_pool_size=0\nreserve_pool_size=0\nmax_db_connections=5\nmax_user_connections=5\nmax_client_conn=100\nmax_prepared_statements=0\nserver_tls_sslmode=verify-full\nserver_tls_ca_file=${cluster.ca}\nclient_tls_sslmode=require\nclient_tls_key_file=${cluster.key}\nclient_tls_cert_file=${cluster.cert}\nlog_connections=0\nlog_disconnections=0\nquery_wait_timeout=5\n`,{mode:0o600});
  const log=fs.openSync(path.join(cluster.directory,'pooler.log'),'a');const processHandle=spawn(binary,[config],{stdio:['ignore',log,log]});fs.closeSync(log);
  const url=new URL(cluster.stageUrl);url.port=String(port);url.searchParams.set('pgbouncer','true');url.searchParams.set('connection_limit','5');
  const clients=[];const client=()=>{const clientIndex=clients.length;const db=new PrismaClient({datasources:{db:{url:url.toString()}},log:options.onQuery?[{emit:'event',level:'query'}]:[]});if(options.onQuery)db.$on('query',event=>options.onQuery({query:event.query,duration:event.duration,clientIndex}));clients.push(db);return db;};
  const db=client();
  try {for(let i=0;;i++){try{await db.$queryRaw`SELECT 1`;break;}catch{if(i>50||processHandle.exitCode!==null)throw new Error('Isolated pooler unavailable');await new Promise(r=>setTimeout(r,100));}}}
  catch(error){processHandle.kill('SIGTERM');throw error;}
  return {db,client,port,url:url.toString(),async close(){await Promise.all(clients.map(c=>c.$disconnect()));if(processHandle.exitCode===null){const exited=new Promise(r=>processHandle.once('exit',r));processHandle.kill('SIGTERM');await exited;}}};
};
