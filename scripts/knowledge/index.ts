/** Developer-operated CLI. Never called during generation; migrate before enabling. */
import { knowledgeSql, processIndexBatch } from "../../lib/knowledge/hybrid/store";
import { db } from "../../lib/db";
async function main() {
  if(process.env.KNOWLEDGE_INDEXING_ENABLED!=='true')throw Error('Set KNOWLEDGE_INDEXING_ENABLED=true after migration and data-handling review');
  const workspace=process.argv.find(a=>a.startsWith('--workspace='))?.slice('--workspace='.length);
  const batches=Number(process.argv.find(a=>a.startsWith('--batches='))?.slice('--batches='.length)||1);
  if(!Number.isInteger(batches)||batches<1||batches>1000)throw Error('Choose 1–1000 bounded batches');
  if(process.argv.includes('--retry-failed')) {
    if(!workspace)throw Error('--retry-failed requires --workspace=<id>');
    await knowledgeSql.query(`UPDATE "KnowledgeSourceIndex" SET status='PENDING',attempts=0,"nextAttemptAt"=CURRENT_TIMESTAMP WHERE "calendarId"=$1 AND status='FAILED' RETURNING "sourceId"`,[workspace]);
  }
  for(let i=0;i<batches;i++){
    const result=await processIndexBatch(knowledgeSql,undefined,workspace);console.log(JSON.stringify(result));
    if(!result.worked)break;
  }
}
main().catch(()=>{console.error('KNOWLEDGE_INDEX_FAILED: check configuration and migration');process.exitCode=1;}).finally(()=>db.$disconnect());
