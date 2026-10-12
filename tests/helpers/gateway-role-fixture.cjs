'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
async function provisionGatewayRole(cluster){
  const db=cluster.stage,role=cluster.role,suffix=role.slice('sw_gateway_stage_'.length),password=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+7190000).toISOString();
  await cluster.admin.$executeRawUnsafe(`CREATE ROLE "${role}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1 PASSWORD '${password}' VALID UNTIL '${expiresAt}'`);
  for(const sql of [`GRANT CONNECT ON DATABASE "${cluster.database}" TO "${role}"`,`GRANT USAGE ON SCHEMA public TO "${role}"`,`GRANT SELECT ("id","platform","postDate","approvalStatus","isAiDraft","instagramPublishStatus","tikTokPublishStatus","publishStatus","tikTokPublishId","publishWorkerStartedAt","updatedAt") ON "CalendarPost" TO "${role}"`,...['default_transaction_read_only=on',"statement_timeout='2s'","lock_timeout='250ms'","idle_in_transaction_session_timeout='5s'",'row_security=on','search_path=pg_catalog,public'].map(s=>`ALTER ROLE "${role}" SET ${s}`)])await db.$executeRawUnsafe(sql);
  const url=new URL(cluster.stageUrl);url.username=role;url.password=password;url.searchParams.set('connection_limit','1');url.searchParams.set('pool_timeout','1');
  const executorFile=path.join(cluster.directory,'executor.json');fs.writeFileSync(executorFile,JSON.stringify({mode:'isolated-staging',url:url.toString(),role,caFile:cluster.ca,caFingerprint:cluster.caFingerprint,expiresAt}),{mode:0o600});
  const controller='sw_revoke_stage_'+suffix,controllerPassword=randomBytes(32).toString('hex');
  await cluster.admin.$executeRawUnsafe(`CREATE ROLE "${controller}" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1 PASSWORD '${controllerPassword}' VALID UNTIL '${expiresAt}'`);
  await db.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${controller}"`);
  await db.$transaction(async tx=>{
  for(const sql of [
    `CREATE FUNCTION public."disable_gateway_${suffix}"() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN ALTER ROLE "${role}" NOLOGIN PASSWORD NULL; RETURN true; END $$`,
    `CREATE FUNCTION public."terminate_gateway_${suffix}"() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE item record; n integer:=0; BEGIN FOR item IN SELECT pid FROM pg_stat_activity WHERE usename='${role}' AND pid<>pg_backend_pid() LOOP IF pg_terminate_backend(item.pid,1000) THEN n:=n+1; END IF; END LOOP; RETURN n; END $$`,
    `CREATE FUNCTION public."verify_gateway_${suffix}"() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT (SELECT NOT rolcanlogin AND rolpassword IS NULL FROM pg_authid WHERE rolname='${role}') AND NOT EXISTS(SELECT 1 FROM pg_stat_activity WHERE usename='${role}') $$`,
  ])await tx.$executeRawUnsafe(sql);
  for(const prefix of ['disable','terminate','verify']){
    await tx.$executeRawUnsafe(`REVOKE ALL ON FUNCTION public."${prefix}_gateway_${suffix}"() FROM PUBLIC`);
    await tx.$executeRawUnsafe(`GRANT EXECUTE ON FUNCTION public."${prefix}_gateway_${suffix}"() TO "${controller}"`);
  }
  });
  for(const setting of ["statement_timeout='2s'","lock_timeout='250ms'",'search_path=pg_catalog,public'])await db.$executeRawUnsafe(`ALTER ROLE "${controller}" SET ${setting}`);
  const controllerUrl=new URL(url);controllerUrl.username=controller;controllerUrl.password=controllerPassword;
  async function controllerAudit(){
    const columns=await db.$queryRawUnsafe(`SELECT c.relname AS relation,a.attname AS column FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','v','p') AND n.nspname='public' AND has_column_privilege($1,c.oid,a.attnum,'SELECT,INSERT,UPDATE')`,controller);
    const functions=await db.$queryRawUnsafe(`SELECT p.proname AS name,has_function_privilege($1,p.oid,'EXECUTE') AS controller,has_function_privilege($2,p.oid,'EXECUTE') AS gateway,p.proconfig AS settings FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prosecdef AND n.nspname='public'`,controller,role);
    return {applicationColumns:columns,functions,scoped:columns.length===0&&functions.length===3&&functions.every(f=>f.controller&&!f.gateway&&f.settings.includes('search_path=pg_catalog'))};
  }
  function revokerFile(expiry){const file=path.join(cluster.directory,'revoker-'+randomBytes(4).toString('hex')+'.json'),receiptFile=file+'.receipt',stopFile=file+'.STOP';fs.writeFileSync(file,JSON.stringify({mode:'isolated-staging',url:controllerUrl.toString(),suffix,expiresAt:new Date(expiry).toISOString(),caFile:cluster.ca,caFingerprint:cluster.caFingerprint,receiptFile,stopFile}),{mode:0o600});return {file,receiptFile,stopFile};}
  async function cleanup(){
    for(const r of [role,controller]){await cluster.admin.$executeRawUnsafe(`ALTER ROLE "${r}" NOLOGIN PASSWORD NULL`);await cluster.admin.$queryRawUnsafe(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename=$1 AND pid<>pg_backend_pid()`,r);}
    for(const prefix of ['disable','terminate','verify'])await db.$executeRawUnsafe(`DROP FUNCTION public."${prefix}_gateway_${suffix}"()`);
    for(const r of [role,controller]){await db.$executeRawUnsafe(`DROP OWNED BY "${r}"`);await cluster.admin.$executeRawUnsafe(`DROP ROLE "${r}"`);}
  }
  return {role,suffix,executorFile,url:url.toString(),controllerAudit,revokerFile,cleanup};
}
module.exports={provisionGatewayRole};
