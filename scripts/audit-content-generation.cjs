/* Live, read-only workspace audit. Calls the real generator; never saves posts or changes allowances.
 * Generated copy is written only to an explicitly supplied private local file.
 */
require('@next/env').loadEnvConfig(process.cwd(), true, {info(){}, error(){}});
const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const { load } = require('../tests/helpers/load-typescript.cjs');
const [calendarId, outputPath] = process.argv.slice(2);
if (!calendarId || !outputPath) throw Error('Usage: node scripts/audit-content-generation.cjs WORKSPACE_ID PRIVATE_OUTPUT_FILE');
let datasource;
if (process.env.SHOWWORK_CANONICAL_APPLICATION_ENABLED === 'true') {
  const url = new URL(process.env.PUBLISHING_DATABASE_URL);
  url.searchParams.set('schema', process.env.PUBLISHING_DATABASE_SCHEMA || 'public');
  datasource = url.toString();
}
const native = new PrismaClient({log:[], ...(datasource ? {datasources:{db:{url:datasource}}} : {})});
// Fail closed if retrieval or a future helper attempts a database mutation.
const readOnly = new Proxy(native, { get(target, key) {
  if (key === '$queryRaw' || key === '$queryRawUnsafe') return target[key].bind(target);
  if (String(key).startsWith('$')) throw Error('Database mutations are disabled in this audit');
  const delegate = target[key];
  if (!delegate || typeof delegate !== 'object') return delegate;
  return new Proxy(delegate, {get(model, method) {
    if (!['findUnique','findUniqueOrThrow','findFirst','findMany','count','aggregate','groupBy'].includes(String(method))) throw Error('Database mutations are disabled in this audit');
    return model[method].bind(model);
  }});
}});
(async () => {
  const workspace = await native.socialCalendar.findUnique({where:{id:calendarId},select:{clientName:true}});
  if (!workspace) throw Error('Workspace not found');
  const mocks = {'@/lib/db':{db:readOnly}};
  const context = load('lib/knowledge/context.ts', mocks);
  const api = load('lib/openai.ts', mocks);
  const {recentContentMemory} = load('lib/content/creativeGeneration.ts', mocks);
  const businessSummary = await context.getBusinessKnowledgeContext(calendarId, 'A distinctive Instagram campaign grounded in documented brand voice, real customer needs and supported business offerings', 'content', {platforms:['INSTAGRAM']});
  const posts = await api.generateContentCalendar({
    clientName:workspace.clientName, businessSummary,
    recentContent:await recentContentMemory(calendarId),
    startDate:'2026-10-26',endDate:'2026-11-25',postsPerWeek:3,platforms:['INSTAGRAM'],
    contentStrategy:'SAME_CONTENT',
  });
  const fields = ['hook','objective','targetAudience','caption','creativeDirection','suggestedCta','hashtags'];
  const checks = posts.map(post => ({
    complete: fields.every(key => typeof post.creativeBrief?.[key] === 'string' && (key === 'hashtags' || post.creativeBrief[key].trim())),
    noAutomaticScript:!post.script,
    copySynchronized:post.caption === post.creativeBrief?.caption && post.hook === post.creativeBrief?.hook && post.cta === post.creativeBrief?.suggestedCta && post.hashtags === post.creativeBrief?.hashtags,
    flexibleDirection: !/\b\d{1,2}:\d{2}\b|\bslide\s+\d+\s*:/i.test(post.creativeBrief?.creativeDirection || ''),
  }));
  fs.writeFileSync(outputPath, JSON.stringify({posts,checks},null,2), {mode:0o600,flag:'wx'});
  const result={posts:posts.length,expected:14,complete:checks.filter(c=>c.complete).length,noAutomaticScripts:checks.every(c=>c.noAutomaticScript),copySynchronized:checks.every(c=>c.copySynchronized),flexibleDirection:checks.every(c=>c.flexibleDirection),savedPosts:0};
  console.log(JSON.stringify(result));
  if(posts.length!==14 || checks.some(c=>Object.values(c).some(v=>!v))) process.exitCode=1;
})().catch(error=>{
  console.error(JSON.stringify({passed:false,errorType:error.name,code:error.code||null}));
  process.exitCode=1;
}).finally(()=>native.$disconnect());
