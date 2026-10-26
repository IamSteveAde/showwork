import { build } from 'esbuild';
await build({entryPoints:['scripts/knowledge/index.ts'],bundle:true,platform:'node',target:'node22',format:'cjs',packages:'external',outfile:'dist-knowledge/index.cjs',tsconfig:'tsconfig.json'});
console.log('KNOWLEDGE_INDEX_BUILD_OK');
