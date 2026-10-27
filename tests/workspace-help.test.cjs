const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {load} = require('./helpers/load-typescript.cjs');
const {workspaceGuides,workspaceCategories,searchWorkspaceGuides} = load('lib/help/workspaceGuides.ts');
const Help = load('components/help/WorkspaceHelpCenter.tsx', {
  'next/link': {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},
  './WorkspaceHelpCenter.module.css': {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})},
}).default;
test('every help topic has complete, uniquely addressed guides and valid related links',()=>{
  const ids=new Set(workspaceGuides.map(guide=>guide.id));
  assert.equal(ids.size,workspaceGuides.length);
  for(const category of workspaceCategories) assert.ok(workspaceGuides.some(guide=>guide.category===category.id),category.id);
  for(const guide of workspaceGuides){
    assert.ok(workspaceCategories.some(category=>category.id===guide.category));
    assert.ok(guide.title && guide.description && guide.access && guide.outcome,guide.id);
    assert.ok(guide.steps.length>=4,guide.id);
    for(const step of guide.steps) assert.ok(step.trim().length>20,guide.id);
    for(const id of guide.related) assert.ok(ids.has(id),`${guide.id}: missing ${id}`);
  }
});
test('help search is case insensitive, matches steps and combines topic filters',()=>{
  assert.ok(searchWorkspaceGuides('  TIKTOK   consent  ').some(guide=>guide.id==='tiktok-publish'));
  assert.ok(searchWorkspaceGuides('PDF').some(guide=>guide.id==='upload-knowledge'));
  assert.ok(searchWorkspaceGuides('Apply platforms','analytics').some(guide=>guide.id==='report-filters'));
  assert.equal(searchWorkspaceGuides('Apply platforms','people').length,0);
  assert.equal(searchWorkspaceGuides('zzzz-no-such-topic').length,0);
  assert.equal(searchWorkspaceGuides('   ').length,workspaceGuides.length);
});
test('the help landing page renders public task navigation without fetching workspace data',()=>{
  const html=renderToStaticMarkup(React.createElement(Help,{}));
  assert.ok(html.includes('Search workspace help'));
  assert.ok(html.includes('Your first campaign'));
  for(const guide of workspaceGuides) assert.ok(html.includes(`?guide=${guide.id}`),guide.id);
  assert.ok(html.includes('Skip to guides'));
  assert.ok(html.includes('Browse topics'));
});
test('every deep-linked guide renders its numbered instructions and result before hydration',()=>{
  for(const guide of workspaceGuides){
    const html=renderToStaticMarkup(React.createElement(Help,{initialGuideId:guide.id}));
    assert.ok(html.includes('id="guide-title"'),guide.id);
    assert.ok(html.includes('id="guide-steps"'),guide.id);
    assert.ok(html.includes('id="guide-outcome"'),guide.id);
    assert.ok(html.includes('Before you begin'),guide.id);
    assert.ok(html.includes('Copy guide link'),guide.id);
    assert.ok(!html.includes('Your first campaign'),guide.id);
  }
});
test('invalid initial guide falls back to usable guide catalogue',()=>{
  const html=renderToStaticMarkup(React.createElement(Help,{initialGuideId:'unknown'}));
  assert.ok(html.includes('What would you like to do?'));
});
test('written handbook includes every guide link and key factual limitations',()=>{
  const text=require('node:fs').readFileSync('docs/help/marketing-workspace-handbook.md','utf8');
  for(const guide of workspaceGuides) assert.ok(text.includes(`/help/workspace?guide=${guide.id}`),guide.id);
  for(const phrase of ['up to four relevant pages','not zero','internal approval','per-post','entire workspace','PIN stays on the device']) assert.ok(text.includes(phrase),phrase);
});

test('help search, category selection and shareable guide navigation work together',()=>{
  let cursor=0;const cells=[];
  const hooks={...React,useEffect:()=>{},useMemo:fn=>fn(),useState:initial=>{const position=cursor++;if(!(position in cells))cells[position]=typeof initial==='function'?initial():initial;return[cells[position],value=>{cells[position]=typeof value==='function'?value(cells[position]):value;}];},useRef:initial=>({current:initial})};
  const InteractiveHelp=load('components/help/WorkspaceHelpCenter.tsx',{'react':hooks,'next/link':{__esModule:true,default:()=>null},'./WorkspaceHelpCenter.module.css':{__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})}}).default;
  function find(node,predicate){if(!node||typeof node!=='object')return[];if(Array.isArray(node))return node.flatMap(item=>find(item,predicate));return [...(predicate(node)?[node]:[]),...find(node.props?.children,predicate)];}
  const render=()=>{cursor=0;return InteractiveHelp({});};
  const originalWindow=global.window,originalRaf=global.requestAnimationFrame;
  let location=new URL('https://example.test/help/workspace');const urls=[];
  global.window={get location(){return location;},history:{pushState:(_state,_title,url)=>{urls.push(url);location=new URL(url,location);}}};
  global.requestAnimationFrame=fn=>fn();
  try{
    let tree=render();
    find(tree,node=>node.props?.id==='workspace-help-search')[0].props.onChange({target:{value:'TikTok consent'}});
    tree=render();
    assert.ok(find(tree,node=>node.props?.href==='?guide=tiktok-publish').length);
    find(tree,node=>node.props?.href==='?guide=tiktok-publish')[0].props.onClick({preventDefault(){}});
    tree=render();
    assert.ok(find(tree,node=>node.props?.id==='guide-title').length);
    assert.equal(urls.at(-1),'/help/workspace?guide=tiktok-publish');
    find(tree,node=>node.type==='button'&&node.props.children?.[1]?.props?.children==='People & permissions')[0].props.onClick();
    tree=render();
    assert.equal(urls.at(-1),'/help/workspace');
    assert.equal(find(tree,node=>node.props?.id==='guide-title').length,0);
  }finally{global.window=originalWindow;global.requestAnimationFrame=originalRaf;}
});
