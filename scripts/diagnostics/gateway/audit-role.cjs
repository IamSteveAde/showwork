'use strict';
// Independent catalog audit. Does not import executor SQL, permission checks or
// column constants; evaluates effective ACLs including PUBLIC and column grants.
const allowed=['approvalStatus','id','instagramPublishStatus','isAiDraft','platform','postDate','publishStatus','publishWorkerStartedAt','tikTokPublishId','tikTokPublishStatus','updatedAt'].sort();
async function auditRole(admin,role,options={}){
  const inactive=options.expectedLogin===false;
  const staging=/^sw_gateway_stage_[a-f0-9]{12}$/.test(role);
  const production=options.productionAudit===true&&inactive&&/^sw_gateway_ro_\d{8}_[a-f0-9]{12}$/.test(role);
  if(!staging&&!production)throw new Error('RESTRICTED_AUDIT_TARGET');
  const result=await admin.$transaction(async tx=>{
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');await tx.$executeRawUnsafe("SET LOCAL statement_timeout='2000ms'");
    const q=sql=>tx.$queryRawUnsafe(sql,role);
    const attributes=await q(`SELECT rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolinherit,rolreplication,rolbypassrls,rolconnlimit,rolvaliduntil FROM pg_roles WHERE rolname=$1`);
    const schemas=await q(`SELECT nspname AS schema,has_schema_privilege($1,oid,'USAGE') AS usage,has_schema_privilege($1,oid,'CREATE') AS create FROM pg_namespace WHERE nspname NOT LIKE 'pg_temp%' AND nspname NOT LIKE 'pg_toast%' ORDER BY 1`);
    const columns=await q(`SELECT n.nspname AS schema,c.relname AS relation,a.attname AS column FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','p','v','m','f') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%' AND has_schema_privilege($1,n.oid,'USAGE') AND has_column_privilege($1,c.oid,a.attnum,'SELECT') ORDER BY 1,2,3`);
    const writes=await q(`SELECT n.nspname AS schema,c.relname AS relation FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p','v','m','f') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%' AND (has_table_privilege($1,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,MAINTAIN') OR EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped AND has_column_privilege($1,c.oid,a.attnum,'INSERT,UPDATE'))) ORDER BY 1,2`);
    const sequences=await q(`SELECT c.relname AS relation FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE CASE WHEN c.relkind='S' THEN has_sequence_privilege($1,c.oid,'SELECT,USAGE,UPDATE') ELSE false END AND has_schema_privilege($1,n.oid,'USAGE')`);
    const memberships=await q(`SELECT count(*)::int AS count FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=$1)`);
    const setRoleGrantees=await q(`SELECT r.rolname AS role FROM pg_roles r WHERE r.rolname<>$1 AND NOT r.rolsuper AND pg_has_role(r.oid,(SELECT oid FROM pg_roles WHERE rolname=$1),'SET') ORDER BY 1`);
    const privilegedRoles=await q(`SELECT rolname AS role,pg_has_role($1,oid,'USAGE') AS usage,pg_has_role($1,oid,'SET') AS can_set FROM pg_roles WHERE rolname IN ('pg_read_all_data','pg_write_all_data','pg_read_all_stats','pg_read_all_settings','pg_read_server_files','pg_write_server_files','pg_execute_server_program','pg_signal_backend','pg_create_subscription') ORDER BY 1`);
    const definers=await q(`SELECT n.nspname AS schema,p.proname AS function FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prosecdef AND has_schema_privilege($1,n.oid,'USAGE') AND has_function_privilege($1,p.oid,'EXECUTE')`);
    const publicBuiltins=await q(`SELECT p.proname AS function FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='pg_catalog' AND p.proname IN ('lo_create','lo_from_bytea','pg_notify','pg_advisory_lock') AND has_function_privilege($1,p.oid,'EXECUTE') ORDER BY 1`);
    const databases=await q(`SELECT datname AS database,has_database_privilege($1,oid,'CONNECT') AS connect,has_database_privilege($1,oid,'CREATE') AS create,has_database_privilege($1,oid,'TEMPORARY') AS temporary FROM pg_database WHERE datallowconn ORDER BY 1`);
    const rls=await q(`SELECT relrowsecurity AS enabled,relforcerowsecurity AS forced,relowner=(SELECT oid FROM pg_roles WHERE rolname=$1) AS owner,(SELECT count(*)::int FROM pg_policy WHERE polrelid=c.oid) AS policies FROM pg_class c WHERE oid='public."CalendarPost"'::regclass`);
    const ownership=await q(`SELECT (SELECT count(*)::int FROM pg_class WHERE relowner=(SELECT oid FROM pg_roles WHERE rolname=$1)) AS relations,(SELECT count(*)::int FROM pg_proc WHERE proowner=(SELECT oid FROM pg_roles WHERE rolname=$1)) AS functions,(SELECT count(*)::int FROM pg_namespace WHERE nspowner=(SELECT oid FROM pg_roles WHERE rolname=$1)) AS schemas`);
    const settings=await q(`SELECT unnest(s.setconfig) AS setting FROM pg_db_role_setting s JOIN pg_roles r ON r.oid=s.setrole WHERE r.rolname=$1`);
    const catalog=await q(`SELECT c.relname AS relation,has_table_privilege($1,c.oid,'SELECT') AS readable FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='pg_catalog' AND c.relname IN ('pg_proc','pg_authid','pg_user_mapping','pg_statistic','pg_subscription','pg_stat_activity','pg_settings') ORDER BY 1`);
    const credentialState=inactive?await q(`SELECT rolpassword IS NULL AS password_absent FROM pg_authid WHERE rolname=$1`):[];
    return {attributes,schemas,columns,writes,sequences,memberships,setRoleGrantees,privilegedRoles,definers,publicBuiltins,databases,rls,ownership,settings,catalog,credentialState};
  },{maxWait:1000,timeout:15000});
  const a=result.attributes[0],settings=result.settings.map(x=>x.setting);
  const validity=inactive?result.credentialState.length===1&&result.credentialState[0].password_absent:new Date(a?.rolvaliduntil).getTime()>Date.now()&&new Date(a?.rolvaliduntil).getTime()-Date.now()<=7200000;
  result.applicationScopePass=!!a&&a.rolcanlogin===!inactive&&!a.rolsuper&&!a.rolcreatedb&&!a.rolcreaterole&&!a.rolinherit&&!a.rolreplication&&!a.rolbypassrls&&a.rolconnlimit===1&&validity&&result.memberships[0].count===0&&result.columns.length===11&&result.columns.every(c=>c.schema==='public'&&c.relation==='CalendarPost')&&result.columns.map(c=>c.column).sort().join(',')===allowed.join(',')&&result.writes.length===0&&result.sequences.length===0&&result.definers.length===0&&!result.schemas.some(s=>s.create)&&!result.privilegedRoles.some(r=>r.usage||r.can_set)&&Object.values(result.ownership[0]).every(n=>n===0)&&settings.includes('default_transaction_read_only=on')&&settings.includes('row_security=on')&&!result.catalog.some(c=>['pg_authid','pg_user_mapping','pg_statistic','pg_subscription'].includes(c.relation)&&c.readable);
  result.applicationScopePass=result.applicationScopePass&&['statement_timeout=2s','lock_timeout=250ms','idle_in_transaction_session_timeout=5s','search_path=pg_catalog, public'].every(setting=>settings.includes(setting));
  // Any policy change requires review of its dependencies before a new audit can
  // certify the previously reviewed no-policy query path.
  result.applicationScopePass=result.applicationScopePass&&result.rls.length===1&&!result.rls[0].enabled&&!result.rls[0].forced&&!result.rls[0].owner&&result.rls[0].policies===0;
  result.applicationScopePass=result.applicationScopePass&&result.setRoleGrantees.length===0;
  result.rawCredentialStrictIsolation=false;
  result.residuals=['Inherited PUBLIC built-ins and catalog metadata','PUBLIC temporary objects and cross-database CONNECT','Read-only defaults can be overridden by a raw credential holder','CalendarPost has no row-level policy in the fixture; status columns span fixture tenants'];
  return result;
}
// This read-only helper requires an already-authorized local audit client. It
// neither obtains a connection nor creates/activates a production role.
async function auditInactiveProductionRole(admin,role){return auditRole(admin,role,{productionAudit:true,expectedLogin:false});}
module.exports={auditRole,auditInactiveProductionRole};
