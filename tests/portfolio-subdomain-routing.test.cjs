const {test}=require('node:test');const assert=require('node:assert/strict');
const {NextRequest}=require('next/server');const {load}=require('./helpers/load-typescript.cjs');
const {middleware}=load('middleware.ts');
const route=(host,path='/')=>middleware(new NextRequest('https://'+host+path,{headers:{host}}));
for(const slug of ['nkechi-chukwulo','the-creative-rexxie','a-custom-slug'])test(slug+' resolves to the same portfolio route without changing public host or query',()=>{
 const r=route(slug+'.useshowwork.com','/?ref=shared');const url=new URL(r.headers.get('x-middleware-rewrite'));
 assert.equal(url.hostname,slug+'.useshowwork.com');assert.equal(url.pathname,'/portfolio/'+slug);assert.equal(url.search,'?ref=shared');
});
test('already resolved portfolio paths are not rewritten a second time',()=>{
 assert.equal(route('nkechi-chukwulo.useshowwork.com','/portfolio/nkechi-chukwulo').headers.get('x-middleware-next'),'1');
});
test('main website login dashboard APIs assets and localhost remain at their routes',()=>{
 for(const host of ['useshowwork.com','www.useshowwork.com','localhost:3000','127.0.0.1:3000'])for(const path of ['/','/login','/dashboard','/api/portfolio'])assert.equal(route(host,path).headers.get('x-middleware-next'),'1');
 for(const path of ['/_next/static/chunk.js','/api/portfolio','/images/logo.png','/fonts/brand.woff2','/favicon.ico'])assert.equal(route('nkechi-chukwulo.useshowwork.com',path).headers.get('x-middleware-next'),'1');
});
test('local subdomains and hostname case resolve consistently',()=>{
 assert.equal(new URL(route('NKECHI-CHUKWULO.localhost:3000').headers.get('x-middleware-rewrite')).pathname,'/portfolio/nkechi-chukwulo');
});
test('unknown single-label portfolio reaches existing not-found lookup, foreign and nested hosts are ignored',()=>{
 assert.equal(new URL(route('portfolio-does-not-exist.useshowwork.com').headers.get('x-middleware-rewrite')).pathname,'/portfolio/portfolio-does-not-exist');
 for(const host of ['a.b.useshowwork.com','useshowwork.com.attacker.example','foo.vercel.app','-bad.useshowwork.com'])assert.equal(route(host).headers.get('x-middleware-next'),'1');
});
