const {test}=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load}=require('./helpers/load-typescript.cjs');
const {helpHref}=load('lib/help/routes.ts');
const HelpLink=load('components/help/HelpLink.tsx').default;
test('contextual help destinations have the right default product',()=>{
 assert.equal(helpHref(),'/help/workspace');
 assert.equal(helpHref('portfolio'),'/help/portfolio');
 assert.equal(helpHref('delivery'),'/help/project-delivery');
 assert.equal(helpHref('delivery','create-managed'),'/help/project-delivery?guide=create-managed');
});
test('canonical portfolio help escapes tenant subdomain routing',()=>{
 const old=process.env.NEXT_PUBLIC_APP_URL;
 try{process.env.NEXT_PUBLIC_APP_URL='https://useshowwork.com';assert.equal(helpHref('portfolio',undefined,true),'https://useshowwork.com/help/portfolio');process.env.NEXT_PUBLIC_APP_URL='http://localhost:3000';assert.equal(helpHref('portfolio',undefined,true),'http://localhost:3000/help/portfolio');}finally{if(old===undefined)delete process.env.NEXT_PUBLIC_APP_URL;else process.env.NEXT_PUBLIC_APP_URL=old;}
});
test('shared help links preserve current work and have accessible labels',()=>{
 for(const product of ['workspace','portfolio','delivery']){const html=renderToStaticMarkup(React.createElement(HelpLink,{product}));assert.ok(html.includes(`href="${helpHref(product)}"`));assert.match(html,/target="_blank"/);assert.match(html,/noopener noreferrer/);assert.ok(html.includes('Help &amp; guides'));assert.ok(html.includes('opens in a new tab'));}
});
test('general site footer offers workspace help including on the homepage',()=>{
 const Footer=load('components/landing/SiteFooter.tsx',{'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},'next/image':{__esModule:true,default:({fill,priority,...props})=>React.createElement('img',props)}}).default;
 for(const homepage of [false,true]){const html=renderToStaticMarkup(React.createElement(Footer,{homepage}));assert.match(html,/href="\/help\/workspace"/);assert.ok(html.includes('Help &amp; guides'));}
});
