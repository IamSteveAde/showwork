const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load}=require('./helpers/load-typescript.cjs');
const {portfolioCategories,portfolioGuides}=load('lib/help/portfolioGuides.ts');
const mocks={'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)}};
const Help=load('components/help/ProductHelpCenter.tsx',mocks).default;
test('portfolio topics contain complete unique guides and valid related links',()=>{
 const ids=new Set(portfolioGuides.map(guide=>guide.id));assert.equal(ids.size,portfolioGuides.length);
 for(const topic of portfolioCategories)assert.ok(portfolioGuides.some(guide=>guide.category===topic.id),topic.id);
 for(const guide of portfolioGuides){assert.ok(portfolioCategories.some(topic=>topic.id===guide.category));assert.ok(guide.title&&guide.description&&guide.access&&guide.outcome,guide.id);assert.ok(guide.steps.length>=4,guide.id);for(const id of guide.related)assert.ok(ids.has(id),`${guide.id}: ${id}`);}
});
test('portfolio home renders its own catalogue and all three product links',()=>{
 const html=renderToStaticMarkup(React.createElement(Help,{product:'portfolio'}));
 for(const text of ['Portfolio handbook','Your first portfolio','/dashboard/portfolio','Search Portfolio help','/help/workspace','/help/project-delivery','/help/portfolio'])assert.ok(html.includes(text),text);
 for(const guide of portfolioGuides)assert.ok(html.includes(`?guide=${guide.id}`),guide.id);
 assert.ok(!html.includes('?guide=confirm-payment'));assert.ok(!html.includes('?guide=connect-instagram'));
});
test('all portfolio deep links render numbered steps, prerequisites and outcomes before hydration',()=>{
 for(const guide of portfolioGuides){const html=renderToStaticMarkup(React.createElement(Help,{product:'portfolio',initialGuideId:guide.id}));for(const text of ['id="guide-title"','id="guide-steps"','id="guide-outcome"','Before you begin','Print guide','Copy guide link'])assert.ok(html.includes(text),`${guide.id}: ${text}`);assert.ok(!html.includes('Your first portfolio,'));}
});
test('portfolio handbook includes every guide and truthful visibility/media distinctions',()=>{
 const text=fs.readFileSync('docs/help/portfolio-handbook.md','utf8');for(const guide of portfolioGuides)assert.ok(text.includes(`/help/portfolio?guide=${guide.id}`));
 for(const phrase of ['not a private project delivery','not the same as changing the public URL slug','may already be published by default','awaiting approval','do not connect Marketing Workspace messaging','There is no manual poster-replacement control'])assert.ok(text.includes(phrase),phrase);
});
test('portfolio help links preserve the editing tab',()=>{
 const Link=load('components/help/PortfolioHelpLink.tsx').default;const html=renderToStaticMarkup(React.createElement(Link,{}));assert.match(html,/href="\/help\/portfolio"/);assert.match(html,/target="_blank"/);assert.match(html,/noopener noreferrer/);
});
test('portfolio search opens guides on the portfolio canonical route',()=>{
 let cursor=0;const cells=[];const hooks={...React,useEffect:()=>{},useMemo:fn=>fn(),useState:initial=>{const slot=cursor++;if(!(slot in cells))cells[slot]=typeof initial==='function'?initial():initial;return[cells[slot],value=>{cells[slot]=typeof value==='function'?value(cells[slot]):value;}];},useRef:initial=>({current:initial})};
 const Component=load('components/help/ProductHelpCenter.tsx',{'react':hooks,...mocks}).default;const find=(node,predicate)=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(item=>find(item,predicate)):[...(predicate(node)?[node]:[]),...find(node.props?.children,predicate)];const render=()=>{cursor=0;return Component({product:'portfolio'});};
 const oldWindow=global.window,oldRaf=global.requestAnimationFrame;let location=new URL('https://example.test/help/portfolio');const urls=[];global.window={get location(){return location;},history:{pushState:(_s,_t,url)=>{urls.push(url);location=new URL(url,location);}}};global.requestAnimationFrame=fn=>fn();
 try{let tree=render();find(tree,node=>node.props?.type==='search')[0].props.onChange({target:{value:'desktop mobile banners'}});tree=render();const result=find(tree,node=>node.props?.href==='?guide=portfolio-banners');assert.ok(result.length);result[0].props.onClick({preventDefault(){}});assert.equal(urls.at(-1),'/help/portfolio?guide=portfolio-banners');assert.ok(find(render(),node=>node.props?.id==='guide-title').length);}finally{global.window=oldWindow;global.requestAnimationFrame=oldRaf;}
});
