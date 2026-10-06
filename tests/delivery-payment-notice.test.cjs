const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
function setup() {
  const values=[]; let cursor=0, refreshes=0;
  const react={...React,useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return[values[i],value=>{values[i]=value;}];}};
  const mod={exports:{}};
  const code=ts.transpileModule(fs.readFileSync('components/DeliveryStatusControl.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)(name=>name==='react'?react:name==='next/navigation'?{useRouter:()=>({refresh:()=>refreshes++})}:require(name),mod,mod.exports);
  return{render(status='DELIVERED'){cursor=0;return mod.exports.default({projectId:'project',currentStatus:status,compact:true});},refreshes:()=>refreshes};
}
function nodes(node,match){if(Array.isArray(node))return node.flatMap(n=>nodes(n,match));if(!React.isValidElement(node))return[];return[...(match(node)?[node]:[]),...nodes(node.props.children,match)];}
function text(node){if(Array.isArray(node))return node.map(text).join('');if(React.isValidElement(node))return text(node.props.children);return typeof node==='string'?node:'';}
test('the red locked notice requires explicit confirmation before marking a delivery paid',async()=>{
  const original=global.fetch,calls=[];const h=setup();
  global.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return{ok:true};};
  try{
    let tree=h.render();assert.match(tree.props.className,/bg-red-50/);
    nodes(tree,n=>n.type==='button'&&text(n).startsWith('Mark as paid'))[0].props.onClick();assert.equal(calls.length,0);
    tree=h.render();await nodes(tree,n=>n.type==='button'&&text(n)==='Confirm payment received')[0].props.onClick();
    assert.deepEqual(calls,[{url:'/api/projects/project',body:{deliveryStatus:'PAID'}}]);assert.equal(h.refreshes(),1);
    tree=h.render('PAID');assert.match(tree.props.className,/bg-emerald-50/);assert.match(text(tree),/unlocked because payment is confirmed/);assert.equal(nodes(tree,n=>n.type==='button').length,0);
  }finally{global.fetch=original;}
});
test('a rejected payment update keeps downloads locked and exposes the error',async()=>{
  const original=global.fetch,h=setup();global.fetch=async()=>({ok:false});
  try{let tree=h.render();nodes(tree,n=>n.type==='button'&&text(n).startsWith('Mark as paid'))[0].props.onClick();tree=h.render();await nodes(tree,n=>n.type==='button'&&text(n)==='Confirm payment received')[0].props.onClick();tree=h.render();assert.match(text(tree),/locked until/);assert.equal(nodes(tree,n=>n.props.role==='alert').length,1);assert.equal(h.refreshes(),0);}finally{global.fetch=original;}
});
