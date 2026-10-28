import {workspaceGuides} from './workspaceGuides';
import {deliveryGuides} from './deliveryGuides';
import {portfolioGuides} from './portfolioGuides';
import {HELP_PATHS,type HelpProduct} from './routes';
export type RandyGuide={id:string;product:HelpProduct;title:string;description:string;access:string;steps:string[];outcome:string;note?:string;troubleshooting?:string[]};
export type RandyTurn={role:'user'|'assistant';text:string};
export type RandyAnswer={answer:string;steps:string[];notes:string[];sources:{title:string;href:string;product:HelpProduct}[];needsHuman:boolean;clarifyingQuestion:string|null;mode:'ai'|'guide'};
import {RANDY_PRODUCTS} from './randyContext';
export {RANDY_PRODUCTS,randyProduct,humanSupportUrl} from './randyContext';
export const randyGuides:RandyGuide[]=[...workspaceGuides.map(guide=>({...guide,product:'workspace' as const})),...deliveryGuides.map(guide=>({...guide,product:'delivery' as const})),...portfolioGuides.map(guide=>({...guide,product:'portfolio' as const}))];
const stop=new Set('a an the i me my we our you your how do does can could would should to for of in on and or is it this that with please showwork help want need'.split(' '));
function tokens(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(term=>term.length>1&&!stop.has(term)).map(term=>term.length>4?term.replace(/(?:ing|ed|s)$/,''):term);}
function expand(value:string){return value.replace(/\b(pictures?|photos?)\b/gi,'image photo').replace(/\b(ai|artificial intelligence)\b/gi,'AI generate content replies').replace(/\b(human|person|agent)\b/gi,'human handoff person').replace(/\b(pay|paid|payments?)\b/gi,'payment paid').replace(/\b(reels?)\b/gi,'video reel').replace(/\b(password|passcode)\b/gi,'password access code');}
export function retrieveRandyGuides(question:string,product:HelpProduct,history:RandyTurn[]=[],guideId?:string):RandyGuide[]{
 const explicit=/\bportfolio\b/i.test(question)?'portfolio':/\b(?:project delivery|delivery project|managed project)\b/i.test(question)?'delivery':/\b(?:workspace|instagram|tiktok|inbox|research|AI studio)\b/i.test(question)?'workspace':null;
 const socialTarget=/\b(?:socials?(?:\s+media)?|platforms?|channels?|accounts?|instagram|facebook|tiktok|linkedin|whatsapp|twitter|x)\b/i.test(question);
 const connectTask=socialTarget&&/\b(?:connect|connecting|link|linking|authorize|authorise|add|integrate|set\s+up|reconnect)\b/i.test(question)&&!/\bdisconnect\b/i.test(question);
 const selected=connectTask&&explicit!=='portfolio'&&explicit!=='delivery'?'workspace':explicit||product;
 // A task match must outrank incidental words such as “platforms” in report guides.
 // Keep connection answers within the connection workflow, including the guide fallback.
 const connectionIds=['connect-instagram','connect-tiktok','connect-other-channels','channel-capabilities'];
 const namedConnection=/\binstagram\b/i.test(question)?'connect-instagram':/\btiktok\b/i.test(question)?'connect-tiktok':/\b(?:facebook|linkedin|whatsapp|twitter|x)\b/i.test(question)?'connect-other-channels':null;
 const terms=[...new Set(tokens(expand(question)))];
 const prior=history.filter(turn=>turn.role==='user').slice(-2).flatMap(turn=>tokens(expand(turn.text)));
 return randyGuides.map(guide=>{
  if(connectTask&&selected==='workspace'&&(guide.product!=='workspace'||!connectionIds.includes(guide.id)))return{guide,score:0};
  const title=tokens(guide.title),summary=tokens(guide.description),body=tokens([guide.access,...guide.steps,guide.note||''].join(' '));
  let score=terms.reduce((score,term)=>score+(title.includes(term)?6:0)+(summary.includes(term)?3:0)+(body.includes(term)?1:0),0);
  if(connectTask&&selected==='workspace'){score+=30;if(guide.id===(namedConnection||'connect-other-channels'))score+=100;}
  if(!score)return{guide,score:0};
  score+=prior.filter(term=>title.includes(term)).length*.7;
  if(guide.product===selected)score=score*1.5+3;
  if(guide.id===guideId&&guide.product===product)score+=4;
  return{guide,score};
 }).filter(item=>item.score>=5).sort((a,b)=>b.score-a.score).slice(0,6).map(item=>item.guide);
}
export function wantsHuman(question:string){return /\b(?:(?:speak|talk|chat|connect|contact).{0,25}(?:human|person|agent|support)|(?:human|live)\s+(?:support|agent)|real person)\b/i.test(question);}
export function guideAnswer(guides:RandyGuide[],question:string):RandyAnswer {
 if(wantsHuman(question))return{answer:'Of course. Choose “Speak to a human” to open WhatsApp with a draft message for the Showwork team. You can review it before sending.',steps:[],notes:['WhatsApp opens separately. This does not send a message automatically or guarantee an immediate response.'],sources:[],needsHuman:true,clarifyingQuestion:null,mode:'guide'};
 const guide=guides[0];
 if(!guide)return{answer:"I couldn't find a reliable guide for that yet. I can help with Showwork’s workspace, project delivery and portfolio tools.",steps:[],notes:[],sources:[],needsHuman:false,clarifyingQuestion:'Which tool are you using, and what would you like to do?',mode:'guide'};
 return{answer:`Here’s the documented guide: ${guide.title}.`,steps:guide.steps,notes:[`Before you begin: ${guide.access}`,...(guide.note?[guide.note]:[])],sources:[{title:guide.title,href:`${HELP_PATHS[guide.product]}?guide=${guide.id}`,product:guide.product}],needsHuman:false,clarifyingQuestion:null,mode:'guide'};
}
export function validateRandyResponse(value:unknown,guides:RandyGuide[]):RandyAnswer|null {
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 const stringArray=(input:unknown,limit:number,size:number):input is string[]=>Array.isArray(input)&&input.length<=limit&&input.every(item=>typeof item==='string'&&item.length<=size);
 if(typeof v.answer!=='string'||!v.answer.trim()||v.answer.length>1800||!stringArray(v.steps,10,900)||!stringArray(v.notes,5,900)||!stringArray(v.guideIds,6,100)||typeof v.needsHuman!=='boolean'||!(v.clarifyingQuestion===null||typeof v.clarifyingQuestion==='string'&&v.clarifyingQuestion.length<=500))return null;
 const cited=v.guideIds.map(id=>guides.find(guide=>`${guide.product}:${guide.id}`===id));
 if(cited.some(guide=>!guide)||(!cited.length&&!v.clarifyingQuestion&&!v.needsHuman))return null;
 return{answer:v.answer,steps:v.steps,notes:v.notes,sources:[...new Set(cited)].map(guide=>({title:guide!.title,href:`${HELP_PATHS[guide!.product]}?guide=${guide!.id}`,product:guide!.product})),needsHuman:v.needsHuman,clarifyingQuestion:v.clarifyingQuestion as string|null,mode:'ai'};
}
