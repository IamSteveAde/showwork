// Regenerate the written handbook from the same content used by /help/portfolio.
// No database, environment variables or external requests are used.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const mod = { exports: {} };
new Function('module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'lib/help/portfolioGuides.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports);
const {portfolioCategories:workspaceCategories,portfolioGuides:workspaceGuides} = mod.exports;
let text = '# Showwork Portfolio handbook\n\nReviewed: 27 October 2026.\n\nWeb version: `/help/portfolio`. Guides describe the implemented interface; options depend on your role, plan and connected-platform permissions. This document does not certify live provider integrations.\n\n';
for (const category of workspaceCategories) {
  text += `## ${category.title}\n\n${category.description}\n\n`;
  for (const guide of workspaceGuides.filter(item=>item.category===category.id)) {
    text += `### ${guide.title}\n\n${guide.description}\n\nGuide: /help/portfolio?guide=${guide.id}\n\n**Before you begin:** ${guide.access}\n\n`;
    text += guide.steps.map((step,index)=>`${index+1}. ${step}`).join('\n')+'\n\n';
    text += `**What happens next:** ${guide.outcome}\n\n`;
    if (guide.note) text += `**Good to know:** ${guide.note}\n\n`;
    if (guide.troubleshooting) text += '**Troubleshooting**\n\n'+guide.troubleshooting.map(item=>`- ${item}`).join('\n')+'\n\n';
    text += 'Related: '+guide.related.map(id=>workspaceGuides.find(item=>item.id===id)?.title || id).join('; ')+'.\n\n';
  }
}
fs.mkdirSync(path.join(root,'docs/help'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/help/portfolio-handbook.md'),text);
console.log(`Written ${workspaceGuides.length} guides across ${workspaceCategories.length} topics.`);
