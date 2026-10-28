import {NextRequest,NextResponse} from 'next/server';
import {guideAnswer,retrieveRandyGuides,wantsHuman,type RandyTurn} from '@/lib/help/randy';
import {generateRandyAnswer} from '@/lib/help/randyProvider';
import {allowRandyAI} from '@/lib/help/randyLimit';
import type {HelpProduct} from '@/lib/help/routes';
export const runtime='nodejs';
export const maxDuration=30;
const headers={'Cache-Control':'no-store'};
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');
 if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:'Open Randy from Showwork to ask a question.'},{status:403,headers});
 if(!req.headers.get('content-type')?.includes('application/json'))return NextResponse.json({error:'Send a help question as JSON.'},{status:415,headers});
 // Read at most 16 KiB, even when Content-Length is absent or inaccurate.
 const reader=req.body?.getReader();if(!reader)return NextResponse.json({error:'Enter a question.'},{status:400,headers});
 let size=0,text='';const decoder=new TextDecoder();
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();return NextResponse.json({error:'Keep the question and recent chat shorter.'},{status:413,headers});}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}catch{return NextResponse.json({error:'Could not read this question.'},{status:400,headers});}
 let body:Record<string,unknown>;try{body=JSON.parse(text);if(!body||typeof body!=='object')throw Error();}catch{return NextResponse.json({error:'Enter a valid help question.'},{status:400,headers});}
 if(typeof body.question!=='string'||!body.question.trim()||body.question.length>2000)return NextResponse.json({error:'Ask a question between 1 and 2,000 characters.'},{status:400,headers});
 const product:HelpProduct=['workspace','delivery','portfolio'].includes(String(body.product))?body.product as HelpProduct:'workspace';
 const history:RandyTurn[]=Array.isArray(body.history)?body.history.slice(-6).filter((turn):turn is RandyTurn=>!!turn&&typeof turn==='object'&&['user','assistant'].includes(turn.role)&&typeof turn.text==='string'&&turn.text.length<=1200).map(turn=>({role:turn.role,text:turn.text})):[];
 const question=body.question.trim();const guides=retrieveRandyGuides(question,product,history,typeof body.guideId==='string'?body.guideId:undefined);
 let answer=guideAnswer(guides,question);
 if(process.env.RANDY_AI_ENABLED==='true'&&process.env.OPENAI_API_KEY&&guides.length&&!wantsHuman(question)){
  try{const identity=req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';if(await allowRandyAI(identity))answer=await generateRandyAnswer(question,product,guides,history);}catch{/* Keep the source guide available; never expose provider details or user text in logs. */}
 }
 return NextResponse.json(answer,{headers});
}
