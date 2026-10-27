const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
function harness() {
  const effects=[], observers=[];
  const video={src:'',preload:'none',loads:0,plays:0,pauses:0,getAttribute(){return this.src;},load(){this.loads++;},play(){this.plays++;return Promise.resolve();},pause(){this.pauses++;}};
  let refIndex=0;
  const module=load('components/portfolio/PortfolioAutoplayVideo.tsx',{'react':{useRef:initial=>({current:refIndex++===0?video:initial}),useEffect:fn=>effects.push(fn)}});
  return {module,video,effects,observers};
}
test('previews defer bytes, warm nearby metadata, then play only when visible',()=>{
  const oldObserver=global.IntersectionObserver,oldWindow=global.window;
  const h=harness();
  global.IntersectionObserver=class{constructor(callback,options){this.callback=callback;this.options=options;h.observers.push(this);}observe(){}disconnect(){this.disconnected=true;}};
  global.window={matchMedia:()=>({matches:true})};
  try {
    const element=h.module.default({src:'https://media.test/clip.mp4'});
    assert.equal(element.props.src,undefined);
    assert.equal(element.props.preload,'none');
    const cleanup=h.effects[0]();
    assert.equal(h.video.loads,0);
    h.observers[0].callback([{isIntersecting:false}]);
    assert.equal(h.video.loads,0);
    h.observers[0].callback([{isIntersecting:true}]);
    assert.equal(h.video.src,'https://media.test/clip.mp4');
    assert.equal(h.video.preload,'metadata');
    assert.equal(h.video.loads,1);
    assert.equal(h.video.plays,0);
    h.observers[0].callback([{isIntersecting:true}]);
    assert.equal(h.video.loads,1);
    h.observers[1].callback([{isIntersecting:true,intersectionRatio:0.8}]);
    assert.equal(h.video.plays,1);
    cleanup();
    assert.ok(h.observers.every(observer=>observer.disconnected));
    assert.ok(h.video.pauses>0);
  } finally { global.IntersectionObserver=oldObserver;global.window=oldWindow; }
});
test('opened player retains immediate source and reports real video dimensions',()=>{
  const h=harness();let ratio;
  const element=h.module.default({src:'https://media.test/clip.mp4',controls:true,onAspectRatio:value=>ratio=value});
  assert.equal(element.props.src,'https://media.test/clip.mp4');
  element.props.onLoadedMetadata({currentTarget:{videoWidth:1920,videoHeight:1080}});
  assert.equal(ratio,1920/1080);
});
test('saved posters are present before video loads and prevent speculative metadata downloads',()=>{
  const oldObserver=global.IntersectionObserver;
  const h=harness();
  global.IntersectionObserver=class{constructor(callback){this.callback=callback;h.observers.push(this);}observe(){}disconnect(){}};
  try {
    const element=h.module.default({src:'https://media.test/clip.mp4',poster:'https://media.test/poster.jpg'});
    assert.equal(element.props.poster,'https://media.test/poster.jpg');
    assert.equal(element.props.src,undefined);
    const cleanup=h.effects[0]();
    h.observers[0].callback([{isIntersecting:true}]);
    assert.equal(h.video.loads,0);
    cleanup();
  } finally {global.IntersectionObserver=oldObserver;}
});
