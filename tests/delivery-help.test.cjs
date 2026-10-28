const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load}=require('./helpers/load-typescript.cjs');
const {deliveryGuides,deliveryCategories}=load('lib/help/deliveryGuides.ts');
const mocks={'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)}};
const Help=load('components/help/ProductHelpCenter.tsx',mocks).default;
test('delivery catalogue covers every topic with unique, actionable guides and valid related links',()=>{
 const ids=new Set(deliveryGuides.map(guide=>guide.id));assert.equal(ids.size,deliveryGuides.length);
 for(const topic of deliveryCategories)assert.ok(deliveryGuides.some(guide=>guide.category===topic.id),topic.id);
 for(const guide of deliveryGuides){assert.ok(deliveryCategories.some(topic=>topic.id===guide.category),guide.id);assert.ok(guide.title&&guide.description&&guide.access&&guide.outcome,guide.id);assert.ok(guide.steps.length>=4,guide.id);for(const id of guide.related)assert.ok(ids.has(id),`${guide.id}: ${id}`);}
});
test('delivery home shows its own quick start, catalogue, search and project return link',()=>{
 const html=renderToStaticMarkup(React.createElement(Help,{product:'delivery'}));
 for(const text of ['Project Delivery handbook','Your first delivery','/dashboard/projects','Search Project Delivery help','Browse topics'])assert.ok(html.includes(text),text);
 for(const guide of deliveryGuides)assert.ok(html.includes(`?guide=${guide.id}`),guide.id);
 assert.ok(!html.includes('?guide=connect-instagram'));
});
test('every delivery deep link renders instructions, prerequisites, result and related guides before hydration',()=>{
 for(const guide of deliveryGuides){const html=renderToStaticMarkup(React.createElement(Help,{product:'delivery',initialGuideId:guide.id}));for(const text of ['id="guide-title"','id="guide-steps"','id="guide-outcome"','Before you begin','Print guide','Copy guide link'])assert.ok(html.includes(text),`${guide.id}: ${text}`);assert.ok(!html.includes('Your first delivery,'));}
});
test('handbook includes all delivery guide links and realistic privacy/payment boundaries',()=>{
 const handbook=fs.readFileSync('docs/help/project-delivery-handbook.md','utf8');
 for(const guide of deliveryGuides)assert.ok(handbook.includes(`/help/project-delivery?guide=${guide.id}`),guide.id);
 for(const text of ['cannot reliably disable screenshots','not an automatic bank reconciliation','100 files and 1 GiB','not automatically released','local File objects','not automatically mean your client has paid'])assert.ok(handbook.includes(text),text);
});
test('delivery help link opens separately and keeps internal IDs out of the public help URL',()=>{
 const Link=load('components/help/DeliveryHelpLink.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Link,{guide:'upload-retry'}));
 assert.match(html,/href="\/help\/project-delivery\?guide=upload-retry"/);assert.match(html,/target="_blank"/);assert.match(html,/noopener noreferrer/);
});
test('delivery search and guide selection retain the delivery canonical route',()=>{
 let cursor=0;const cells=[];
 const hooks={...React,useEffect:()=>{},useMemo:fn=>fn(),useState:initial=>{const slot=cursor++;if(!(slot in cells))cells[slot]=typeof initial==='function'?initial():initial;return[cells[slot],value=>{cells[slot]=typeof value==='function'?value(cells[slot]):value;}];},useRef:initial=>({current:initial})};
 const Component=load('components/help/ProductHelpCenter.tsx',{'react':hooks,...mocks}).default;
 const find=(node,predicate)=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(item=>find(item,predicate)):[...(predicate(node)?[node]:[]),...find(node.props?.children,predicate)];
 const render=()=>{cursor=0;return Component({product:'delivery'});};
 const oldWindow=global.window,oldRaf=global.requestAnimationFrame;let location=new URL('https://example.test/help/project-delivery');const urls=[];
 global.window={get location(){return location;},history:{pushState:(_state,_title,url)=>{urls.push(url);location=new URL(url,location);}}};global.requestAnimationFrame=fn=>fn();
 try{let tree=render();find(tree,node=>node.props?.type==='search')[0].props.onChange({target:{value:'confirm payment'}});tree=render();const results=find(tree,node=>node.props?.href==='?guide=confirm-payment');assert.ok(results.length);results[0].props.onClick({preventDefault(){}});tree=render();assert.ok(find(tree,node=>node.props?.id==='guide-title').length);assert.equal(urls.at(-1),'/help/project-delivery?guide=confirm-payment');}finally{global.window=oldWindow;global.requestAnimationFrame=oldRaf;}
});
