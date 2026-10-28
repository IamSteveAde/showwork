const {test}=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {load}=require('./helpers/load-typescript.cjs');
test('minimizing and reopening only change visibility, preserving the chat and draft',()=>{
 let state=0;const updates=[];
 const hooks={...React,useEffect(){},useRef(){return{current:null}},useState(initial){const index=state++;const value=index===1?true:index===3?[{id:'u',role:'user',text:'Saved conversation text'}]:index===4?'Unsent draft':typeof initial==='function'?initial():initial;return[value,next=>updates.push({index,next})];}};
 const Assistant=load('components/support/RandyAssistant.tsx',{'react':hooks,'next/navigation':{usePathname:()=>'/help/workspace'}}).default;
 const tree=Assistant();const buttons=[];
 function visit(element){if(!element||typeof element!=='object')return;if(element.type==='button')buttons.push(element);React.Children.forEach(element.props?.children,visit);}visit(tree);
 const minimize=buttons.find(button=>button.props['aria-label']==='Minimize Randy');assert.ok(minimize);minimize.props.onClick();assert.deepEqual(updates,[{index:0,next:false}]);
 const launcher=buttons.find(button=>button.props['data-randy-launcher']!==undefined);assert.ok(launcher);launcher.props.onClick();assert.deepEqual(updates,[{index:0,next:false},{index:0,next:true}]);
});
test('shared face avatar uses an optimized local asset with a circular crop',()=>{
 const {renderToStaticMarkup}=require('react-dom/server');const Avatar=load('components/support/RandyAvatar.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Avatar,{size:52}));assert.match(html,/src="\/images\/randy\/avatar.webp"/);assert.match(html,/border-radius:50%/);assert.match(html,/width="52"/);assert.match(html,/alt=""/);
});
